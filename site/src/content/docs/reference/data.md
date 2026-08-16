---
title: Data
description: Player data on top of ProfileStore, with versioning, branches, and offline writes.
---

**Server only.** Requiring this from a client fails at the require, naming the
module.

`Twill.Data` wraps [ProfileStore](/reference/bundled-packages/) with a template,
a version number, migrations, and a gate that holds a joining player until their
data exists.

## Configure

Call once during `Init`, then wire the gate.

```luau
local Data = require("@game/ReplicatedStorage/Twill").Data

Data.Configure({
	Store = "PlayerData",
	Version = 2,
	Template = { Coins = 0, Inventory = {} },
	Migrations = {
		[2] = function(data)
			data.Coins = data.Money or 0
			data.Money = nil
		end,
	},
})

Lifecycle.SetPlayerGate(Data.Gate)
```

```luau
export type Config = {
	Store: string,
	Template: { [string]: any },
	Version: number?,
	Migrations: { [number]: (data: { [string]: any }) -> () }?,
	Branches: { [string]: Branch }?,
	Replicate: { string }?,
}
```

| Field | Meaning |
| --- | --- |
| `Store` | The DataStore name. |
| `Template` | The shape a new profile starts as. Missing fields are filled in on load. |
| `Version` | The version a loaded profile should end up at. |
| `Migrations` | Keyed by the version they produce. |
| `Branches` | Separate stores that are not loaded on join. |
| `Replicate` | Field names the owning player should see on their client. |

Configuring twice is refused rather than allowed to change the shape underneath a
running server.

:::note[Reserved field names]
Twill keeps its own bookkeeping in the profile under names beginning `__twill`:
the schema version, the queued-edit marker, and the record of granted purchases.
Do not use that prefix for your own fields.
:::

## Migrations

A migration is keyed by the version it **produces**, so `[2]` upgrades a version
1 profile to version 2. They run in ascending order, and only on profiles that
already hold data. A brand new profile starts at the current version and skips
them all.

```luau
Migrations = {
	[2] = function(data) data.Coins = data.Money or 0 end,
	[3] = function(data) data.Inventory = data.Inventory or {} end,
}
```

A player returning after several updates arrives through every step rather than
the latest one. A migration that throws prevents the session from opening, and
the player is kicked rather than served a profile that is half-upgraded.

## Reading and writing

`Data.Get` returns the live table. Mutate it directly and it saves on its own.

```luau
function ShopService.OnPlayerReady(player, data)
	data.Coins += 100
end
```

There is no `Set` and no commit step. ProfileStore already flushes everything on
shutdown, so **no save call belongs in `BindToClose`**. Where the platform offers
warning of a scheduled restart, `Configure` also asks for an early save on it.

## Replication

`Replicate` names the fields a player should see on their own client. They arrive
under the `Data` key, and follow direct mutation, so nothing has to be mirrored
by hand.

```luau
Data.Configure({
	-- ...
	Replicate = { "Coins", "Stats" },
})
```

```luau
-- client
Replication.Subscribe("Data.Coins", function(coins)
	label.Text = Format.Comma(coins or 0)
end)
```

Only the named fields travel, and only to their owner. The view is rebuilt on an
interval, so `Replication.OnChanged("Data")` reports that interval rather than a
real change. A message is only sent to the client when something actually moved.

:::caution[`Data` here is a replication key, not a scope name]
The key the client subscribes to is `"Data"`. The scope name used by
[`Edit`](#dataedit), [`Reset`](#datareset), and the admin console is `"main"`.
They are different words for different things.
:::

## API

### `Data.Configure`

`[Server]`

Prepares the store, the template, and the upgrade path.

```luau
function Data.Configure(newConfig: Config)
```

**Returns**

`()` - Nothing.

Call once, during `Init`, before anything can ask for a player's data. Throws on
a second call, on a missing `Store` or `Template`, and on a branch named `main`.

Each branch gets its own DataStore, named for the main store and the branch
together, so a branch is visible separately in the DataStore console.

### `Data.Gate`

`[Server]`

The [`Lifecycle`](/reference/lifecycle/) player gate. Loads the profile and
releases the player once it exists.

```luau
function Data.Gate<T>(player: Player, ready: (data: T) -> ())
```

**Returns**

`()` - Nothing. Yields.

A profile that cannot be loaded results in a kick, rather than a session that
would silently discard progress. Calling this before `Configure` throws.

### `Data.Get`

`[Server]`

Returns a player's live data.

```luau
function Data.Get<T>(player: Player): T?
```

**Returns**

`T?` - Their live data, or `nil` when no session is open.

Write to it directly and the change is saved on its own. `nil` covers every
moment before the player is released and after they leave.

### `Data.IsReady`

`[Server]`

Reports whether a player's data is loaded and their session still holds.

```luau
function Data.IsReady(player: Player): boolean
```

**Returns**

`boolean` - True while their data is live and writable.

A session can be lost mid play, so this answers more than whether they have
finished loading. Check it after any yield, because a player can leave while you
were waiting.

### `Data.IsConfigured`

`[Server]`

Reports whether a store has been configured, which everything else here needs.

```luau
function Data.IsConfigured(): boolean
```

**Returns**

`boolean` - True once `Configure` has run.

A game that never calls `Configure` is a normal game, not a broken one, so this
answers rather than raising. It exists because an empty branch list reads the
same whether the store has no branches or no store was ever opened.

### `Data.GetOffline`

`[Server]`

Reads any user's data, whether or not they are on this server.

```luau
function Data.GetOffline(userId: number, branch: string?): { [string]: any }?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `userId` | `number` | The user to read. |
| `branch` | `string?` | A branch name, or `nil` for the main store. |

**Returns**

`{ [string]: any }?` - Their data, or `nil` when there is none or it could not be
read. Yields.

Someone on this server is read live, and everyone else is read from storage
**without taking their session** from the server they are playing on.

:::caution[Only the live reading may be written to]
For a player on this server you get their live table, and writing to it writes
their data. For everyone else you get a copy, and writing to it changes nothing
anywhere. If you do not know which you have, do not write to it: use
[`Edit`](#dataedit), which routes correctly either way.
:::

Throws when no branch answers to the name given.

### `Data.Save`

`[Server]`

Requests an early save for one player.

```luau
function Data.Save(player: Player)
```

**Returns**

`()` - Nothing.

Returns before the write lands. Routine play does not need this: data is saved on
its own and on the way out.

### `Data.SaveNow`

`[Server]`

Saves a player and waits until the write is confirmed.

```luau
function Data.SaveNow(
	player: Player,
	verify: ((saved: { [string]: any }) -> boolean)?,
	timeout: number?
): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | The player whose data should be written. |
| `verify` | `((saved: { [string]: any }) -> boolean)?` | Given the data that landed. Return true when it holds the change you were waiting for. Any save counts when left out. |
| `timeout` | `number?` | Seconds to wait before giving up. Thirty when left out. |

**Returns**

`boolean` - True when the write landed and was accepted. Yields.

For the few moments worth waiting on, such as granting something bought with real
money. This is what [`Monetization`](/reference/monetization/) uses before telling
Roblox a purchase was granted.

**Example**

```luau
data.Gems += 500

-- Do not report success until the gems are actually in storage.
local landed = Data.SaveNow(player, function(saved)
	return saved.Gems >= 500
end)
```

### `Data.SaveAll`

`[Server]`

Requests an early save for every open session, branches included.

```luau
function Data.SaveAll()
```

**Returns**

`()` - Nothing. Returns before the writes land, so this is a nudge and not a
flush.

The [`saveall` command](/reference/admin/#built-in-commands) calls it from the
console, for the moment before something risky. Shutdown already flushes on its
own, so this does not belong in `BindToClose`.

## Branches

A branch is a separate store for data that does not need to be loaded every
time: a settings blob, a large collection, a rarely-read history.

```luau
Branches = {
	Pets = {
		Template = { Owned = {} },
		Version = 1,
	},
}
```

```luau
export type Branch = {
	Template: { [string]: any },
	Version: number?,
	Migrations: { [number]: (data: { [string]: any }) -> () }?,
}
```

A branch is a full session of its own, with its own template, version, and
migrations. It is released when the player leaves, alongside the main one.

### `Data.LoadBranch`

`[Server]`

Opens a branch for a player, or hands back the one already open.

```luau
function Data.LoadBranch<T>(player: Player, name: string): T?
```

**Returns**

`T?` - The branch's live data, or `nil` when it could not be opened. Yields.

Callers that arrive while a load is still running wait for that one rather than
starting a second, and every one of them is answered even when the load fails.
Throws when no branch answers to the name given.

### `Data.GetBranch`

`[Server]`

Returns an already open branch without loading anything.

```luau
function Data.GetBranch<T>(player: Player, name: string): T?
```

**Returns**

`T?` - The branch's live data, or `nil` when it is not open. Does not yield.

### `Data.IsBranchLoaded`

`[Server]`

Reports whether a branch is open for a player and its session still holds.

```luau
function Data.IsBranchLoaded(player: Player, name: string): boolean
```

**Returns**

`boolean` - True while that branch is live and writable.

### `Data.UnloadBranch`

`[Server]`

Closes a branch early, for data only needed during part of a session.

```luau
function Data.UnloadBranch(player: Player, name: string)
```

**Returns**

`()` - Nothing.

The session is not free the instant this returns, so reopening the same branch
immediately may find it still held.

### `Data.ListBranches`

`[Server]`

Lists the branch names this store was configured with.

```luau
function Data.ListBranches(): { string }
```

**Returns**

`{ string }` - A fresh list in a settled order, safe to keep or reorder.

## Writing to anybody

`Data.Edit` and `Data.Reset` write to any user id at all, online or not.

```luau
Data.Edit(userId, "main", "Stats.Coins", 500)
Data.Reset(userId, "Pets", "Owned")
```

`scope` is `"main"` for the main profile, or a branch name.

Three routes, chosen automatically:

1. **This server holds the session.** The write is applied directly and saved.
2. **Another server holds it.** The write is sent as a message that server
   applies.
3. **Nobody holds it.** The write waits in their saved data until they next log
   in.

**Nothing ever writes over a session it does not own.**

### `Data.Edit`

`[Server]`

Writes one field of a user's data, wherever in the experience that user is.

```luau
function Data.Edit(userId: number, scope: string, path: string, value: any): Outcome
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `userId` | `number` | Whose data to edit. |
| `scope` | `string` | `"main"`, or the name of a branch. |
| `path` | `string` | Dot separated, such as `"Stats.Coins"`. Must not be empty. |
| `value` | `any` | What to write. `nil` removes the field. |

**Returns**

`Outcome` - Where the write ended up, or why it went nowhere. Yields.

Tables along the path are built as needed. Delivery to another server is not
immediate and is not confirmed here.

### `Data.Reset`

`[Server]`

Puts a user's data back to the template it was built from.

```luau
function Data.Reset(userId: number, scope: string, path: string?): Outcome
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `userId` | `number` | Whose data to restore. |
| `scope` | `string` | `"main"`, or the name of a branch. |
| `path` | `string?` | One field to restore, or `nil` for everything in that scope. |

**Returns**

`Outcome` - Where the reset ended up, or why it went nowhere. Yields.

:::danger[There is no confirmation step and no undo]
Put this behind something that has already asked whether the caller meant it.
Restoring a whole scope rewrites the live table in place, so anything holding it
keeps working and sees the template. ProfileStore keeps version history if you
need the old data back.
:::

### Outcome

```luau
export type Outcome = "applied" | "queued" | "blocked" | "unknown" | "unsupported" | "failed"
```

| Value | Meaning |
| --- | --- |
| `applied` | Written on this server and saved. |
| `queued` | Handed to the owning server, or left for next login. |
| `blocked` | A step along the path is held by something that is not a table. |
| `unknown` | No scope answers to that name. |
| `unsupported` | The value cannot survive a DataStore. See below. |
| `failed` | The edit could not be sent onward. |

`unsupported` means [`Serialize.FindUnstorable`](/reference/serialize/) refused
the value. Encode it first, or fix the shape of its keys. Data does not encode it
for you, because it would then have to guess on the way back out, and a save that
quietly rewrites what you handed it is worse than one that refuses.

### `Data.Migrate`

`[Server]`

Raises stored data to a version by applying each upgrade in turn.

```luau
function Data.Migrate(
	stored: { [string]: any },
	version: number,
	steps: { [number]: (data: { [string]: any }) -> () }
)
```

**Returns**

`()` - Nothing. The table is changed in place.

The migration runner, exposed so it can be tested directly. You do not normally
call this: `Configure` runs it for every profile that loads. Data already at the
version is left untouched, and a step that throws stops the whole thing and
raises, naming the version it was reaching.

## Failure messages

| Kick message | Cause |
| --- | --- |
| `Your saved data could not be loaded.` | The session would not open, or a migration threw. |
| `Your data session was claimed by another server.` | The player moved servers faster than the old session was released. Normal. |
