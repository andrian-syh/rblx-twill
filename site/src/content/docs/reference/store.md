---
title: Store
description: A DataStore key held by one server at a time, saved while it is held
---

**Server only.** Requiring this from a client fails at the require, naming the
module.

`Twill.Store` is what [`Data`](/reference/data/) is built on. Reach for it
directly only for keys that are not player data: a guild, a shared world, a
leaderboard snapshot.

```luau
local Store = require("@game/ServerScriptService/TwillServer/Store")

local guilds = Store.New("Guilds", { Members = {}, Level = 1 })
local keep = guilds:StartSessionAsync("guild-4812")

keep.Data.Level += 1
```

## Who may write

A key records the server holding it and a load count. A write is accepted only
when both still match the handle making it.

The count is what protects a key from a server that stalled. That server still
carries the right mark, so the mark alone would let it write over whoever took
the key while it was gone. The count moved when the key changed hands, so the
write is refused and the handle is told it lost the key.

A handle that lost the key fires `OnSessionEnd` and answers `false` to every
later `Save`.

## Taking a key somebody holds

`StartSessionAsync` does not fail when another server holds the key. It waits,
and takes the key if the wait runs out.

| Stage | What happens |
| :--- | :--- |
| First attempt | Registers a claim on the key and asks the holder to release it. |
| While waiting | Re-reads the key every `LoadRepeat` seconds. |
| After `StealAfter` | Takes the key, if the claim registered first is still standing. |
| Any time | Takes the key at once if the holder has not written for `AssumeDead`. |
| After `StartTimeout` | Gives up and answers `nil`. |

A claim that another server replaced does not take the key. That server waited
too, and taking it would mean two servers reading the same wait as their turn.

`Steal = true` skips all of it and takes the key immediately. It exists for
recovery, not for ordinary use, and it can cost the holder unsaved changes.

## Mail

`MessageAsync` writes a change into the key itself rather than sending it to a
server. It lands whether or not any server is holding the key, and the server
that next holds it receives it.

The holder receives mail through `MessageHandler`, and only on a save. Call
`done` inside the handler to mark a letter dealt with, or it arrives again on the
next save.

## Keys that hold something else

Reading a key that holds a value this store did not write, or one whose data
cannot be unpacked, is refused. The key is left exactly as it was,
`Store.OnOverwrite` fires, and `StartSessionAsync` answers `nil` without
retrying.

## API

### `Store.New`

`[Server]`

Opens a store, with what a key holds before anything is written to it.

```luau
function Store.New(name: string, template: { [string]: any }?, config: Config?): Store
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The DataStore name. |
| `template` | `{ [string]: any }?` | What a key that was never written starts out holding. Copied, never held. |
| `config` | `Config?` | What to change about how this store behaves. |

**Returns**

`Store` - The store. `Store.Mock` on it is the same store backed by memory that
is forgotten when the server stops.

Throws when the name is empty or is not text.

### `Config`

Every field is optional and falls back to the default.

| Field | Default | Meaning |
| :--- | ---: | :--- |
| `AutoSave` | `180` | Seconds between saves of a held key. |
| `LoadRepeat` | `10` | Seconds between re-reads while waiting for a key. |
| `FirstRepeat` | `5` | Seconds before the second read. |
| `StealAfter` | `40` | Seconds of waiting before a standing claim takes the key. |
| `AssumeDead` | `630` | Seconds of silence after which a holder is assumed gone. |
| `StartTimeout` | `120` | Seconds before `StartSessionAsync` gives up. |
| `MaxMail` | `1000` | Letters a key holds before the oldest are dropped. |
| `Attempts` | `4` | Tries per storage call before it is reported failed. |
| `Compress` | `false` | Whether the data travels packed. |
| `Messaging` | `true` | Whether a holder listens for a request to release. |

Packing multiplies what fits under the key size ceiling and makes the stored
value unreadable in the DataStore browser and in Open Cloud.

### `Store:StartSessionAsync`

`[Server]`

Takes a key, waiting out or taking over whoever holds it.

```luau
function Store:StartSessionAsync(key: string, params: Params?): Keep?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `key` | `string` | The key to take. At most 50 characters. |
| `params.Cancel` | `(() -> boolean)?` | Asked before each attempt. Stops waiting when it answers `true`. |
| `params.Steal` | `boolean?` | Takes the key at once, whoever holds it. |

**Returns**

`Keep?` - The handle to work the key through, or `nil` when it could not be
taken. Yields.

Throws when the key is empty, too long, or is not text.

### `Store:GetAsync`

`[Server]`

Reads a key without taking it.

```luau
function Store:GetAsync(key: string): Keep?
```

**Returns**

`Keep?` - A handle over what the key holds, or `nil` when there was nothing to
read. Yields.

Nothing read this way saves on its own. `Save` refuses on it; `SetAsync` writes
it back and gives up whatever session was on the key.

### `Store:VersionQuery`

`[Server]`

Walks back through what a key held before, newest first.

```luau
function Store:VersionQuery(key: string, direction: Enum.SortDirection?, from: DateTime?, until_: DateTime?): Query
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `key` | `string` | The key to walk back through. |
| `direction` | `Enum.SortDirection?` | `Descending` when left out. |
| `from` | `DateTime?` | The earliest version to include. |
| `until_` | `DateTime?` | The latest version to include. |

**Returns**

`Query` - A walk. `Query:NextAsync` answers one version at a time as a read-only
`Keep`, then `nil`. Yields.

A stand-in store keeps no versions, so a walk on one answers `nil` at once.

### `Store:MessageAsync`

`[Server]`

Writes a change into a key, to be applied wherever the server holding it is.

```luau
function Store:MessageAsync(key: string, body: { [string]: any }): boolean
```

**Returns**

`boolean` - Whether the change was left waiting on the key. Yields.

Answers `false` when the key holds nothing, and when the server is closing.

Costs two storage requests and one message. Sending one per player action will
exhaust the request budget.

### `Store:RemoveAsync`

`[Server]`

Forgets a key. There is no way back from this.

```luau
function Store:RemoveAsync(key: string): boolean
```

**Returns**

`boolean` - Whether it was forgotten. Yields.

Ends any handle this server holds on the key first, so nothing writes it back.

### `Store.Reach`

`[Server]`

Reports how far storage can be reached from this server.

```luau
function Store.Reach(): "NotReady" | "NoInternet" | "NoAccess" | "Access"
```

Only Studio has to work this out. A live server answers `Access`.

### `Store.IsStrained`

`[Server]`

Reports whether storage has been failing often enough to stop leaning on it.

```luau
function Store.IsStrained(): boolean
```

True once five calls have failed within two minutes, and for two minutes after
the last of them.

### `Store.IsClosing`

`[Server]`

Reports whether this server is on its way down and taking no new keys.

```luau
function Store.IsClosing(): boolean
```

### Signals

| Signal | Fires with | When |
| :--- | :--- | :--- |
| `Store.OnTrouble` | `message`, `store`, `key` | A storage call failed. |
| `Store.OnStrained` | `strained` | Repeated failure started or stopped. |
| `Store.OnOverwrite` | `store`, `key` | A key held something this store cannot read. |

## Keep

The handle a taken key is worked through.

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `Data` | `{ [string]: any }` | The live table. Write to it directly. |
| `LastSaved` | `{ [string]: any }` | A copy of what last reached storage. |
| `Key` | `string` | The key this handle holds. |
| `Users` | `{ number }` | Users associated with the key. |
| `Marks` | `{ [string]: any }` | Key metadata, at most 300 characters in total. |
| `Created` | `number` | When the key was first written. |
| `Updated` | `number` | When the key was last written, or `0`. |
| `Loads` | `number` | The load count this handle took the key at. |
| `Holder` | `{ Place, Job, Id }?` | Who held the key when this handle was made. |

| Signal | Fires with | When |
| :--- | :--- | :--- |
| `OnSave` | nothing | Before every write. |
| `OnLastSave` | `"Manual"`, `"External"` or `"Shutdown"` | Before the write that gives the key up. |
| `OnAfterSave` | `LastSaved` | After a write lands. |
| `OnSessionEnd` | nothing | Once the key is no longer this handle's. |

### `Keep:IsActive`

Reports whether writing to this key still reaches storage.

```luau
function Keep:IsActive(): boolean
```

The answer is only good until the next yield.

### `Keep:Save`

Saves now, rather than waiting for when the key would be saved anyway.

```luau
function Keep:Save(): boolean
```

Answers `false` when the handle is no longer active, and when the write was
refused. Yields. Throws on a key that was only read.

### `Keep:EndSession`

Saves one last time and gives the key up, so the next server does not wait.

```luau
function Keep:EndSession(): boolean
```

A second call answers `false` rather than writing again. Yields. Throws on a key
that was only read.

### `Keep:SetAsync`

Writes back a key that was only read, giving up whatever session was on it.

```luau
function Keep:SetAsync(): boolean
```

Yields. Throws on a key that was taken rather than read.

### `Keep:Reconcile`

Fills in whatever the template gained since the key was last written.

```luau
function Keep:Reconcile()
```

Existing values are left alone.

### `Keep:AddUserId`

Associates a user with the key, which a request to be forgotten matches on.

```luau
function Keep:AddUserId(userId: number)
```

### `Keep:RemoveUserId`

Takes that association away again.

```luau
function Keep:RemoveUserId(userId: number)
```

### `Keep:MessageHandler`

Sets what deals with changes sent to the key from somewhere else.

```luau
function Keep:MessageHandler(handler: (body: { [string]: any }, done: () -> ()) -> ())
```

Letters waiting on the key are handed over as soon as the handler is set, and
again after every save. Call `done` to mark one dealt with.

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Key length | 50 characters | Roblox |
| Key size | 4 MB | Roblox |
| Metadata size | 300 characters | Roblox |
| Letters per key | 1000 | `MaxMail` |
| Tries per call | 4 | `Attempts` |
| Tries per call while closing | 2 | Fixed |
| Wait for writes while closing | 25 seconds | Fixed |
