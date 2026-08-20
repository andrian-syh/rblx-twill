---
title: Lifecycle
description: Service discovery, boot order, and the player pipeline.
---

`Twill.Lifecycle` finds your service modules, boots them in a defined order, and
announces each player once their data exists. It runs on both sides. The client
gets discovery, ordering, and the two boot phases. It does not get the player
pipeline, because there `PlayerAdded` means somebody else joined. Each side keeps
its own boot list.

This is the only module in Twill that is a framework in the strict sense. The
rest are libraries you call.

## Services

A service is any `ModuleScript` that returns a table. Every field is optional, so
a module with none of them is still a legal service.

```luau
local ShopService = {}

ShopService.Priority = 10
ShopService.Critical = true

function ShopService.Init() end
function ShopService.Start() end
function ShopService.OnPlayerReady(player, data, bag) end
function ShopService.OnPlayerRemoving(player) end

return ShopService
```

Hooks are called dot-style, so they never receive `self`.

```luau
export type Service = {
	Priority: number?,
	Critical: boolean?,
	Init: (() -> ())?,
	Start: (() -> ())?,
	OnPlayerReady: ((player: Player, data: any, bag: Scope.Bag) -> ())?,
	OnPlayerRemoving: ((player: Player) -> ())?,
}
```

### Priority

Lower boots first. Services with the same priority break the tie by name, so the
order is stable across runs rather than dependent on how Roblox happened to
enumerate the folder.

A service that does not set one boots at **100**. That is the number to measure
against: below it runs before everything that never asked, above it runs after.

### Critical

A `Critical` service whose `Init` or `Start` throws locks the server and refuses
every player, rather than serving a game that is missing a system nobody notices
until it is needed. Everyone present is kicked, everyone arriving afterwards is
kicked on sight, and the reason reaches both the kick message and
[`GetFailure`](#lifecyclegetfailure).

Only the first failure counts, so a cascade reports the cause rather than
whatever fell over last. On the client there is nobody to kick, so a failure is
reported to the output and the boot stops there.

A non-critical failure is logged. The rest of the boot continues.

## What gets discovered

A service must be a **direct child** of a folder passed to `Start`, must be a
`ModuleScript`, and must return a table. Everything else is skipped, and the
noisier cases say so:

| Case | What happens |
| --- | --- |
| A nested `Folder` | Warned. Nesting looks like organisation and behaves like exclusion, so pass the inner folder to `Start` as well. |
| A name already registered | Warned and skipped. Services are looked up by name, so names are unique across every folder. |
| A module that fails to load | Reported with the error. The rest of the boot continues. |
| A module returning something other than a table | Skipped silently. This is what keeps a helper module sitting beside a service from booting as one. |

## The two phases

The phases exist to remove boot-order guesswork.

| Phase | When | What belongs here |
| --- | --- | --- |
| `Init` | Sequentially, for every service, in boot order. | Your own state only. Do not call another service. |
| `Start` | After every `Init` has finished. | Connect events, start loops, call other services freely. |

A service that reads another service during `Init` is reading it before that
service has set itself up. Move the call to `Start` and the problem disappears.

:::caution[`Start` hooks run apart from each other]
Each `Start` runs on its own thread, so a service that yields there does not hold
up the rest. Boot order decides when a `Start` is *begun*, not the order in which
they finish. Do not write a `Start` that depends on another service's `Start`
having already returned.

A `Critical` service that fails in `Start` still refuses everybody, but it does
so when the failure happens rather than before anyone was let in.
:::

## The player pipeline

`OnPlayerReady` waits for the gate, so no service sees a player before their data
is loaded. Each service receives the player, whatever the gate released, and a
[`Scope.Player`](/reference/scope/) bag already opened for it.

```luau
function ShopService.OnPlayerReady(player, data, bag)
	data.Visits += 1
	bag:Connect(player.Chatted, onChatted)
end
```

Without a gate, `OnPlayerReady` fires as soon as the player joins. Players who
were already in the server when `Start` ran are put through the same pipeline, so
it does not matter how early or late you boot.

`OnPlayerRemoving` fires in **reverse** boot order, so a service still sees the
ones it was allowed to depend on. The player's bag closes only once every service
has had its say, which is why `Lifecycle` claims player closing from
[`Scope`](/reference/scope/#scopeownplayerclosing) on the server.

A player who left while still waiting at the gate never reached ready, and is not
announced as leaving.

## API

### `Lifecycle.Start`

`[Server]` | `[Client]`

Discovers services in the given folders, sorts them, and runs both phases.

```luau
function Lifecycle.Start(folders: Instance | { Instance })
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `folders` | `Instance \| { Instance }` | One container, or a list of them. Only direct `ModuleScript` children are taken. |

**Returns**

`()` - Nothing.

Call this once per side. Calling it again is warned about and ignored.

**Example**

```luau
-- ServerScriptService/YourGame/init.server.luau
local ServerScriptService = game:GetService("ServerScriptService")

local Twill = require("@game/ReplicatedStorage/Twill")

-- Init runs for every service before any Start does, so configuration
-- belongs here rather than inside a service.
Twill.Data.Configure({ Store = "PlayerData", Template = { Coins = 0 } })
Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)

Twill.Lifecycle.Start({
	ServerScriptService.YourGame.Services,
	ServerScriptService.YourGame.Systems,
})
```

### `Lifecycle.SetPlayerGate`

`[Server]`

Installs the gate that holds joining players until whatever they need exists.

```luau
function Lifecycle.SetPlayerGate(gate: PlayerGate?)

export type PlayerGate = (player: Player, release: (data: any) -> ()) -> ()
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `gate` | `PlayerGate?` | Receives the player and a `release` callback. Whatever it passes to `release` becomes the `data` argument every `OnPlayerReady` sees. Pass `nil` to remove the gate. |

**Returns**

`()` - Nothing.

Throws when called on the client. Only the first `release` counts, so a gate that
calls it twice announces the player once.

Install the gate during `Init`, before `Start`. Calling it afterwards is warned
about, because players who already joined were never held.

:::danger[A gate that throws costs that player their session]
The player is kicked and asked to rejoin rather than let in without whatever the
gate was fetching. That is the safe direction: a player let in without their data
looks to them exactly like losing everything.
:::

In practice the gate is [`Data.Gate`](/reference/data/#datagate):

```luau
Lifecycle.SetPlayerGate(Twill.Data.Gate)
```

### `Lifecycle.Get`

`[Server]` | `[Client]`

Returns a booted service by module name.

```luau
function Lifecycle.Get<T>(name: string): T
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The name the service module was discovered under. |

**Returns**

`T` - The service table itself, not a copy.

Throws when no service was discovered under that name, which is what you want: a
typo becomes a boot-time error rather than a `nil` index somewhere later.

Safe from `Start` onwards. During `Init` a service may be registered but not yet
initialised.

**Example**

```luau
function CombatService.Start()
	-- Safe here. The same call inside Init would reach a service
	-- that has not set itself up yet.
	local shop = Lifecycle.Get("ShopService")

	shop.RegisterCategory("Weapons")
end
```

### `Lifecycle.GetBootOrder`

`[Server]` | `[Client]`

Returns every service name currently registered, in the order they boot.

```luau
function Lifecycle.GetBootOrder(): { string }
```

**Returns**

`{ string }` - A fresh list, safe to keep or reorder.

Useful when a priority number is not doing what you expected.

### `Lifecycle.GetFailure`

`[Server]` | `[Client]`

Returns why this side refused to boot.

```luau
function Lifecycle.GetFailure(): string?
```

**Returns**

`string?` - The first failure reported, or `nil` while this side is healthy.

## Notes

Both sides run the same `Lifecycle` module, but each keeps its own list. A
service folder given to the server is not visible to the client, and neither
side's boot order affects the other.
