---
title: Data
description: Player data with versioning, branches, and writes that reach any user
---

**Server only.** Requiring this from a client fails at the require, naming the
module.

```luau
local Data = require("@game/ReplicatedStorage/Twill").Data

Data.Configure({
	Store = "PlayerData",
	Version = 1,
	Template = { Coins = 0, Stats = { Wins = 0 } },
})

Lifecycle.SetPlayerGate(Data.Gate)
```

`Data` puts a template, a version number, migrations, and a joining gate over
[`Store`](/reference/store/). `Store` holds the key; `Data` decides what the key
contains and who waits for it.

## Configure and the gate

`Configure` runs once, during `Init`. Calling it twice throws.

`Data.Gate` holds a joining player until their data exists. Wire it into
[`Lifecycle`](/reference/lifecycle/) and no service sees a player before their
data is there.

A load that fails after its retries kicks the player rather than handing back the
template. Data that could not be read is not data that should be overwritten.

```text
Your saved data could not be loaded.

You have not lost anything. Please rejoin.
```

A session claimed by another server kicks as well, with a different message.
Nothing is lost either way: the other server holds the data.

## Versions and migrations

`Version` is the shape the running server expects. `Migrations` are keyed by the
version each one produces.

```luau
Data.Configure({
	Store = "PlayerData",
	Version = 3,
	Template = { Coins = 0, Level = 1 },
	Migrations = {
		[2] = function(data) data.Coins = data.Money or 0 end,
		[3] = function(data) data.Level = 1 end,
	},
})
```

Steps run in ascending order, from the version the data carries to the version
the server wants. A missing step is skipped. A step that raises stops the load,
and the player is kicked rather than saved with a half migrated shape.

Data already at a version past the server's own is left exactly as it is, and
reported once. This is what stops a rollback running every migration a second
time on data that has already had them.

After migration, anything the template gained and the data lacks is filled in.
Existing values are left alone.

## Branches

A branch is a separate store under the same user, with its own template, its own
version, and its own migrations. Use one for data that is large, rarely read, or
both.

```luau
Data.Configure({
	Store = "PlayerData",
	Template = { Coins = 0 },
	Branches = {
		pets = { Version = 1, Template = { Owned = {}, Slots = 3 } },
	},
})

local pets = Data.LoadBranch(player, "pets")
```

Branches are not loaded with the player. `LoadBranch` opens one, and two callers
asking at once both wait on the same load rather than starting two.

`UnloadBranch` closes one early, for data only needed during part of a session.
Anything still open closes when the player leaves.

A branch cannot be named `main`.

## Writing to anybody

`Edit` and `Reset` work on any user, wherever they are. When this server holds
the data, the change lands here. When it does not, the change is written into the
key itself and applied by whichever server next holds it.

That difference is what `Outcome` reports.

| Outcome | Meaning |
| :--- | :--- |
| `applied` | Written here and saved. |
| `queued` | Left on the key. It lands when a server holds them. |
| `blocked` | Something along that path is not a table. |
| `unknown` | No scope by that name. |
| `unsupported` | The value would not survive being saved. |
| `failed` | The change could not be sent. |

`queued` is not `applied`. For a user who never returns, it never lands.

## API

### `Data.Configure`

`[Server]`

Prepares the store, the template, and the upgrade path.

```luau
function Data.Configure(config: Config)
```

**Config**

| Field | Type | Description |
| :--- | :--- | :--- |
| `Store` | `string` | The DataStore name. |
| `Template` | `{ [string]: any }` | What a player starts with. |
| `Version` | `number?` | The shape this server expects. `1` when left out. |
| `Migrations` | `{ [number]: (data) -> () }?` | Keyed by the version each step produces. |
| `Branches` | `{ [string]: Branch }?` | Separate stores under the same user. |
| `Replicate` | `{ string }?` | Field names the player's own client should see. |

Throws on a second call, on a missing or empty `Store`, on a `Template` that is
not a table, and on a branch named `main`.

### `Data.IsConfigured`

`[Server]`

Reports whether a store has been configured.

```luau
function Data.IsConfigured(): boolean
```

### `Data.Gate`

`[Server]`

Holds a joining player until their data exists, then releases them with it.

```luau
function Data.Gate<T>(player: Player, ready: (data: T) -> ())
```

Kicks the player when the session could not be opened. Yields. Throws when used
before `Configure`.

### `Data.Get`

`[Server]`

Returns a player's live data.

```luau
function Data.Get<T>(player: Player): T?
```

Write to it directly. There is no `Set` and no commit step.

Answers `nil` when no session is open. Throws when given anything but a `Player`.

### `Data.IsReady`

`[Server]`

Reports whether a player's data is loaded and their session still holds.

```luau
function Data.IsReady(player: Player): boolean
```

### `Data.GetOffline`

`[Server]`

Reads any user's data, whether or not they are on this server.

```luau
function Data.GetOffline(userId: number, branch: string?): { [string]: any }?
```

Answers the live table for a user this server holds, and a read-only copy for
anyone else. Migrations and template filling are applied to the copy, so it has
the shape this server expects.

Yields. Throws when used before `Configure` and when no branch answers to that
name.

### `Data.Save`

`[Server]`

Requests an early save for one player.

```luau
function Data.Save(player: Player)
```

Returns before the write lands.

### `Data.SaveNow`

`[Server]`

Saves a player and waits until the write is confirmed.

```luau
function Data.SaveNow(player: Player, verify: ((saved: { [string]: any }) -> boolean)?, timeout: number?): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Whose data to write. |
| `verify` | `((saved) -> boolean)?` | Given the data that landed. Answer `true` when it holds the change. |
| `timeout` | `number?` | Seconds to wait. 30 when left out. |

**Returns**

`boolean` - `true` when the write landed and `verify` accepted it. Yields.

This is what a Developer Product grant waits on. Granting in memory and
answering `PurchaseGranted` before the write lands loses the purchase if the
server stops in between.

### `Data.SaveAll`

`[Server]`

Requests an early save for every open session, branches included.

```luau
function Data.SaveAll()
```

Returns before the writes land. Everything open is flushed on shutdown anyway,
so no save call belongs in `BindToClose`. Where the platform gives warning of a
scheduled restart, `Configure` asks for an early save on it.

### `Data.LoadBranch`

`[Server]`

Opens a branch for a player, or hands back the one already open.

```luau
function Data.LoadBranch<T>(player: Player, name: string): T?
```

Two callers asking at once wait on the same load. Yields. Throws when no branch
answers to that name, and when given anything but a `Player`.

### `Data.GetBranch`

`[Server]`

Returns an already open branch without loading anything.

```luau
function Data.GetBranch<T>(player: Player, name: string): T?
```

### `Data.IsBranchLoaded`

`[Server]`

Reports whether a branch is open and its session still holds.

```luau
function Data.IsBranchLoaded(player: Player, name: string): boolean
```

### `Data.UnloadBranch`

`[Server]`

Closes a branch early.

```luau
function Data.UnloadBranch(player: Player, name: string)
```

### `Data.ListBranches`

`[Server]`

Lists the branch names this store was configured with.

```luau
function Data.ListBranches(): { string }
```

A fresh list in a settled order, safe to keep or reorder.

### `Data.Edit`

`[Server]`

Writes one field of a user's data, wherever that user is.

```luau
function Data.Edit(userId: number, scope: string, path: string, value: any): Outcome
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `userId` | `number` | Whose data to edit. |
| `scope` | `string` | `"main"`, or a branch name. |
| `path` | `string` | Dot separated, such as `Stats.Coins`. |
| `value` | `any` | What to write. `nil` removes the field. |

A value storage would refuse is refused here instead, and answers `unsupported`.
Run it through [`Serialize.Encode`](/reference/serialize/) first.

Yields. Throws when used before `Configure`, and on a missing user id or path.

### `Data.Reset`

`[Server]`

Puts a field, or a whole scope, back to its template.

```luau
function Data.Reset(userId: number, scope: string, path: string?): Outcome
```

Leave `path` out to restore the whole scope.

There is no confirmation step and no undo. Restoring a scope rewrites the live
table in place, so anything holding it keeps working and sees the template.
`Data.Versions` reads earlier versions if the old data is needed back.

### `Data.Inspect`

`[Server]`

Reports who holds a user's scope and what the key records about it.

```luau
function Data.Inspect(userId: number, scope: string): { [string]: any }?
```

**Returns**

`{ [string]: any }?` - `Holder`, `Created`, `Updated`, `Loads` and `Users`, or
`nil` when the key holds nothing or no scope answers to that name. Yields.

`Holder` is `nil` when no server holds the key. `Created` and `Updated` are
`os.time` readings, and `Updated` is `0` on a key that was never written.

### `Data.Versions`

`[Server]`

Walks back through what a user's scope held before.

```luau
function Data.Versions(userId: number, scope: string): any
```

**Returns**

`any` - A walk, or `nil` when no scope answers to that name. `NextAsync` on it
answers one version at a time, newest first, then `nil`.

```luau
local walk = Data.Versions(userId, "main")

while true do
	local older = walk:NextAsync()
	if not older then
		break
	end

	print(older.Updated, older.Data.Coins)
end
```

Reading a version changes nothing. Write a value back with `Data.Edit`.

### `Data.Migrate`

`[Server]`

Raises stored data to a version by applying each upgrade in turn.

```luau
function Data.Migrate(stored: { [string]: any }, version: number, steps: { [number]: (data) -> () })
```

Changes `stored` in place. Data already current is left untouched, and data past
that version is left as it is rather than marked back down to it.

Throws when a step raises, naming the version it was reaching.

### `Outcome`

```luau
export type Outcome = "applied" | "queued" | "blocked" | "unknown" | "unsupported" | "failed"
```

## Replication

`Replicate` names the fields a player's own client should see. Those fields are
published to that player alone, under the key `Data`, and brought back in line
on an interval.

```luau
Data.Configure({
	Store = "PlayerData",
	Template = { Coins = 0, Secret = "" },
	Replicate = { "Coins" },
})
```

```luau
-- Client
Replication.Subscribe("Data.Coins", function(coins)
	label.Text = tostring(coins)
end, bag)
```

A field left out of `Replicate` never leaves the server.

## Limits

| Limit | Value |
| :--- | ---: |
| Time between replication refreshes | 0.1 seconds |
| `SaveNow` default timeout | 30 seconds |
| Key size | 4 MB |
| Autosave, set by `Store` | 180 seconds |
