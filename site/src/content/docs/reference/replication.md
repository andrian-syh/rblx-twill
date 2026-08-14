---
title: Replication
description: Publishing server state to clients, and reading it on the other side.
---

One require path, two very different jobs. On the server `Twill.Replication` is
the publisher. On the client it is the local view.

The server half lives outside `ReplicatedStorage`, so its source never reaches a
player. **A client has no way to ask for replicated state.** Everything a client
holds here arrived because the server decided to send it.

Asking the server a question is a different job, and [`Net`](/reference/net/)
does it: declare a remote with reply types and the client gets an answer, metered
and screened like every other call.

## Keys and paths

Everything is addressed as a key, then a path inside it.

```luau
Replication.SetPathFor(player, "Data", "Stats.Coins", 250)
--                             ^key    ^path
Replication.Subscribe("Data.Stats.Coins", onCoins)
--                     ^key  ^path
```

:::caution[Key names cannot contain dots]
The first dot separates the key from the path. A key named `"Player.Data"` can
never be matched by a subscription, because the subscription reads it as key
`Player`, path `Data`.
:::

## Shared keys and player keys

Every publisher function has a `For` twin.

| Form | Who receives it |
| --- | --- |
| `Set("RoundEndsAt", t)` | Everybody. |
| `SetFor(player, "Data", profile)` | That player, and nobody else, ever. |

A player key is never sent to anyone but its owner. This is what makes it safe to
replicate a player's own inventory without leaking it to the lobby.

Where a player has a key of their own, it takes precedence over the shared key of
the same name for that player alone.

## How little travels

Replication keeps a private copy of what each player was last sent and diffs
against it, so touching one field deep inside a large table sends that field
rather than the table. That copy is the memory price of small messages.

Writes are collected and sent on an interval, so setting the same key several
times in one frame costs one message.

## Reading is not copying

`Get`, `GetFor`, and the value handed to a `Subscribe` callback are the held
value itself, not a copy. Readings are therefore free however often they are
taken.

:::danger[Treat what you read as read only]
Writing into a value you read from this module changes what that side believes
without any of it reaching anybody. On the server the published state and the
clients quietly stop agreeing; on the client, the next thing to arrive overwrites
your change without warning. Publish through the functions below instead.
:::

## Server API

### `Replication.Set`

`[Server]`

Publishes a whole value under a key.

```luau
function Replication.Set(key: string, value: any)
function Replication.SetFor(player: Player, key: string, value: any)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | `For` twin only. The only player who will receive it. A player who is not here is quietly dropped, so a write racing someone's departure needs no guard. |
| `key` | `string` | The key to publish under. Must not be empty, and must not contain a dot. |
| `value` | `any` | The value to publish. `nil` clears the key. |

**Returns**

`()` - Nothing.

Publishing does not send anything at once. What actually leaves is worked out on
the next interval, and only the parts that moved.

### `Replication.SetPath`

`[Server]`

Writes one field inside a key.

```luau
function Replication.SetPath(key: string, path: string, value: any): boolean
function Replication.SetPathFor(player: Player, key: string, path: string, value: any): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | `For` twin only. The owner of the key. |
| `key` | `string` | The key holding the table. A key holding something that cannot be descended into is replaced with a fresh table. |
| `path` | `string` | Dot separated, such as `"Stats.Coins"`. |
| `value` | `any` | What to write. `nil` clears the field. |

**Returns**

`boolean` - False when a step along the path is blocked by something that is not
a table, or, for the `For` twin, when the player is not here.

Tables along the path are **built as needed**, so a field can be published before
its parents exist.

**Example**

```luau
-- Neither Stats nor Coins has to exist first.
Replication.SetPathFor(player, "Data", "Stats.Coins", 250)
```

### `Replication.Increment`

`[Server]`

Adds to a number inside a key.

```luau
function Replication.Increment(key: string, path: string, amount: number): number?
function Replication.IncrementFor(player: Player, key: string, path: string, amount: number): number?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | `For` twin only. The owner of the key. |
| `key` | `string` | The key holding the table. |
| `path` | `string` | Dot separated path to the number. |
| `amount` | `number` | How much to add. Negative subtracts. |

**Returns**

`number?` - The new value, or `nil` when it could not be applied.

Counting starts from zero when there is nothing at the path yet, so a counter
needs no setting up. A field already holding something that is not a number is
refused rather than overwritten.

### `Replication.Mutate`

`[Server]`

Replaces a key with whatever the given function returns.

```luau
function Replication.Mutate<T>(key: string, transform: (current: T?) -> T)
function Replication.MutateFor<T>(player: Player, key: string, transform: (current: T?) -> T)
```

**Returns**

`()` - Nothing.

Use it when the new value depends on the old one in a way `SetPath` and
`Increment` cannot express. The `For` twin does not run the transform at all for
a player who is not here.

### `Replication.SetValidator`

`[Server]`

Refuses writes to a key unless the given test passes.

```luau
function Replication.SetValidator(key: string, validator: ((value: any) -> boolean)?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `key` | `string` | The key to guard. |
| `validator` | `((value: any) -> boolean)?` | Receives the offered value. Pass `nil` to remove the guard. |

**Returns**

`()` - Nothing.

This guards against your own mistakes, not against a client, which cannot publish
anything at all. One guard per key, and installing a second replaces the first.

A validator that throws is read as a refusal, since a test that cannot decide
must not be read as consent. Clearing a key is always allowed: a guard describes
what may be published, not what may be withdrawn.

### `Replication.SetThrottle`

`[Server]`

Holds one key to at most one message per interval.

```luau
function Replication.SetThrottle(key: string, interval: number?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `key` | `string` | The key to slow down. |
| `interval` | `number?` | Seconds between messages. Pass `nil` to remove the limit. |

**Returns**

`()` - Nothing.

Writes still land here at full speed. Only what leaves is slowed, and nothing is
lost, merely delayed. Useful for a key that changes far more often than a player
could notice.

### `Replication.Freeze`

`[Server]`

Stops sending a key while it is being rearranged.

```luau
function Replication.Freeze(key: string)
function Replication.Unfreeze(key: string)
```

**Returns**

`()` - Nothing.

Writes still land while a key is frozen. Only sending stops, so a half finished
rearrangement is never seen. `Unfreeze` sends everything that changed meanwhile
as one change rather than as the steps it was made in.

### `Replication.OnChanged`

`[Server]`

Returns a signal that fires whenever a key is written here.

```luau
function Replication.OnChanged(key: string): ChangedSignal

export type ChangedSignal = Signal.Signal<(value: any, player: Player?) -> ()>
```

**Returns**

`ChangedSignal` - Carries the new value, and the owning player when the key
belongs to one.

Fires on the **server**, as the write happens, ahead of anything leaving for a
client. `player` is set for a player key and `nil` for a shared one.

This is how one system reacts to another's state without the two naming each
other. The publisher does not know who is listening, and a listener needs only
the key.

This reports publishes, not differences. A key republished on an interval fires
on that interval even when nothing moved. To hear real changes, subscribe from
the client.

### `Replication.GetStats`

`[Server]`

Returns how much has gone out since this server started.

```luau
function Replication.GetStats(): Stats

export type Stats = {
	Messages: number,
	Keys: number,
}
```

**Returns**

`Stats` - A snapshot, safe to keep. It does not follow later counting.

Both numbers are running totals for the lifetime of the server: messages sent,
and keys carried across all of them. Worth watching while you tune throttles, and
worth reading twice a few seconds apart rather than once.

### `Replication.GetFor`

`[Server]`

Returns what one player currently sees under a key, or a field inside it.

```luau
function Replication.GetFor<T>(player: Player, full: string): T?
```

**Returns**

`T?` - The value, or `nil` when they see nothing there.

This is their own value where they have one and the shared value otherwise, which
is the reading that matches what actually reached them.

## Client API

### `Replication.Subscribe`

`[Client]`

Calls back whenever a key, or one field inside it, moves.

```luau
function Replication.Subscribe<T>(
	full: string,
	callback: (value: T?) -> (),
	owner: Scope.Trove?
): Subscription
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `full` | `string` | A key, optionally followed by a dot separated path. |
| `callback` | `(value: T?) -> ()` | Receives the new value, or `nil` when it is cleared. |
| `owner` | `Scope.Trove?` | A bag to put the subscription in. The caller keeps it when left out. |

**Returns**

`Subscription` - Carries `Disconnect` and `Destroy`, so a
[`Scope`](/reference/scope/) bag holds it like anything else.

A subscription to a path is only woken when something at or below that path
actually moved, so a label bound to one field is not woken by every unrelated
write. The current value is delivered once if there already is one, so the
callback may run before anything changes.

```luau
Replication.Subscribe("Data.Stats.Coins", function(coins)
	label.Text = Format.Comma(coins or 0)
end, trove)
```

Pass `owner` **or** bag the return value, never both: two bags holding one
subscription is two things trying to close it.

A subscription with no bag at all lives until the session ends. That is right for
a controller's own HUD, which lives just as long, and wrong for anything built
per player or per character — those close a closure that holds the whole tree it
was drawing into.

### `Replication.WaitFor`

`[Client]`

Yields until a key, or a field inside it, holds a value.

```luau
function Replication.WaitFor<T>(full: string, timeout: number?): (T?, boolean)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `full` | `string` | A key, optionally followed by a dot separated path. |
| `timeout` | `number?` | Seconds to wait before giving up. Ten when left out. |

**Returns**

`T?` - The value, or `nil` when the wait ran out.

`boolean` - False when the wait ran out.

Returns at once when a value is already held. Giving up is reported rather than
raised, so the caller decides for itself whether waiting longer was worth it.

## Both sides

### `Replication.Get`

`[Server]` | `[Client]`

Returns what this side currently holds for a key, or for one field inside it.

```luau
function Replication.Get<T>(full: string): T?
```

**Returns**

`T?` - The value, or `nil` when nothing is held there.

On the server this reads the shared value alone, and what one particular player
sees may differ: use [`GetFor`](#replicationgetfor) for that. On the client it
reads the local view and never asks the server, so it answers at once and answers
`nil` for anything that has not arrived yet.

## Client readiness

The client sends one readiness signal the first time its half of the module is
required. If no client code ever requires `Twill.Replication`, the server has
nothing to send to and the client receives nothing.

Requiring it once anywhere in your client boot is enough. Asking twice does
nothing, so a client cannot make the server rebuild and resend its whole view.

:::note[A patch that arrives before its value is dropped]
The client refuses to apply a change to part of a key it has never held, and
reports it, because applying it would build a value the server never published.
In practice this means the readiness signal was missed, not that a message was
lost.
:::
