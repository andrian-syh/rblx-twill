---
title: Lifecycle
description: Service discovery, boot order, and the pipeline a joining player passes through
---

```luau
local MyService = {}

MyService.Priority = 50

function MyService.Init() end
function MyService.Start() end
function MyService.OnPlayerReady(player, data, bag) end
function MyService.OnPlayerRemoving(player) end

return MyService
```

```luau
-- Main
Lifecycle.Start(ServerScriptService.Services)
```

Hooks are called dot style and never receive `self`.

## Discovery

Every direct `ModuleScript` child of a folder passed to `Start` becomes a
service. A module is discovered by being there, so adding one is adding a file.

Three cases are reported and skipped rather than raised:

| Case | What happens |
| :--- | :--- |
| A nested folder | Warned, with a note to pass it to `Start` as well. |
| A duplicate service name | Warned, and the second one is skipped. |
| A module that fails to load | Reported with its error. |

A module returning anything but a table is ignored without a word.

## Boot order

Services boot by `Priority` ascending, ties broken by name. A service without a
`Priority` gets 100, so anything that must go first takes a lower number and
anything that must go last takes a higher one.

Every `Init` finishes before any `Start` begins. `Init` runs in order on the
calling thread; `Start` runs on its own thread per service, so one that yields
does not hold up the rest.

Read another service in `Start` and after, not in `Init`. During `Init` the other
service exists but has not set itself up.

## Critical services

A service marked `Critical` that raises in `Init` or `Start` locks the side.

On the server this means refusing everybody: every player present is kicked, and
so is everyone who joins afterwards.

```text
This server failed to start.

Critical service 'DataService' failed Init.

Please rejoin.
```

Only the first failure counts, and it is reported once. A service without
`Critical` that raises is reported and stepped over, and the boot continues.

## The player pipeline

The pipeline is server only. On a client, `PlayerAdded` means somebody else
joined, so there is nothing to hold.

A joining player waits behind the gate. When the gate releases them, every
service is told in boot order, and each receives the player, whatever the gate
released, and the bag that closes when they leave.

```luau
function MyService.OnPlayerReady(player, data, bag)
	bag:Connect(player.CharacterAdded, onSpawn)
end
```

Leaving runs in reverse boot order, so a service reads what it depends on before
that dependency has unwound. A player still held by the gate is skipped, though
their bag still closes.

`Start` calls [`Scope.OwnPlayerClosing`](/reference/scope/), so player bags close
after the last `OnPlayerRemoving` rather than the moment the engine fires.

## The gate

```luau
Lifecycle.SetPlayerGate(Data.Gate)
```

A gate receives the player and a release callback. Nothing sees the player until
release is called, and calling it twice does nothing.

A gate that raises kicks the player rather than announcing them with no data:

```text
This server failed to load your session. Please rejoin.
```

Install the gate during `Init`. Set after `Start`, it warns, and players who
already joined were never held.

## API

### `Lifecycle.Start`

`[Server]` | `[Client]`

Discovers services in the given folders and runs the boot sequence.

```luau
function Lifecycle.Start(folders: Instance | { Instance })
```

Takes one folder or a list. Calling it a second time warns and does nothing.

Throws when given anything but instances.

### `Lifecycle.SetPlayerGate`

`[Server]`

Installs the gate that holds joining players until whatever they need exists.

```luau
function Lifecycle.SetPlayerGate(gate: PlayerGate?)
```

```luau
type PlayerGate = (player: Player, release: (data: any) -> ()) -> ()
```

Pass `nil` to remove the gate. Throws on a client.

### `Lifecycle.Get`

`[Server]` | `[Client]`

Returns a booted service by name.

```luau
function Lifecycle.Get<T>(name: string): T
```

The service table itself, not a copy. Safe from `Start` onwards, not before.

Throws when no service was discovered under that name.

### `Lifecycle.GetBootOrder`

`[Server]` | `[Client]`

Returns every registered service name, in the order they boot.

```luau
function Lifecycle.GetBootOrder(): { string }
```

A fresh list, safe to keep or reorder. The console reads this through
[`twill boot`](/reference/admin/).

### `Lifecycle.GetFailure`

`[Server]` | `[Client]`

Returns why this side refused to boot.

```luau
function Lifecycle.GetFailure(): string?
```

`nil` while the side is healthy.

## Service

Every field is optional. A module with none of them still counts as a service.

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `Priority` | `number?` | Boot position, ascending. 100 when left out. |
| `Critical` | `boolean?` | Whether failing to boot locks the side. |
| `Init` | `(() -> ())?` | Set up. Every `Init` finishes before any `Start`. |
| `Start` | `(() -> ())?` | Run. Each on its own thread. |
| `OnPlayerReady` | `((player, data, bag) -> ())?` | Server only. Called in boot order once the gate releases. |
| `OnPlayerRemoving` | `((player) -> ())?` | Server only. Called in reverse boot order. |
