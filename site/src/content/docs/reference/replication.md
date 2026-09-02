---
title: Replication
description: The server publishes state, the client reads a local copy of it
---

```luau
-- Server
Replication.SetFor(player, "Wallet", { Coins = 250 })

-- Client
Replication.Subscribe("Wallet.Coins", function(coins)
	coinLabel.Text = tostring(coins)
end, bag)
```

## Two halves, one require

`Twill.Replication` resolves to a different module on each side. The server gets
the publisher; the client gets the local view.

The publisher lives outside `ReplicatedStorage`, so its source never reaches a
player. A client cannot ask the server for state and cannot write any. Reads on
the client answer from what has already arrived, so they never yield and answer
`nil` for anything that has not.

Where a client has a real question, [`Net`](/reference/net/) answers it with a
remote that replies.

## Shared keys and player keys

A key set with `Set` reaches every player. A key set with `SetFor` reaches one.

Both can use the same name. A player who has a value of their own under a key
sees that value; everyone else sees the shared one. This is how a scoreboard and
a private balance can share a key name without the private one leaking.

Anything after the first dot is a path inside the key, so a key name cannot
contain a dot.

## Sending

Writes are collected and sent on an interval rather than per write. Setting one
key several times in a frame costs one message.

What is sent is a difference, not the whole value. Each player has a private
record of what they were last sent, and only the fields that moved travel. A
first message carries everything the player can see.

Three controls sit on top of that:

| Control | Effect |
| :--- | :--- |
| `SetThrottle` | Holds a key to at most one message per interval. Nothing is lost, only delayed. |
| `Freeze` | Stops sending a key while it is rearranged. Writes still land. |
| `Unfreeze` | Resumes, and everything the key missed goes out together. |

## Guards

`SetValidator` refuses writes to a key unless a test passes. One guard per key.

Every way of writing a key answers to it: `Set` and `SetFor`, and the path forms
`SetPath`, `SetPathFor`, `Increment` and `IncrementFor`. A path write is tried on
a copy first, so a refusal leaves nothing behind.

Clearing a key is always allowed. A guard that raises counts as a refusal and is
reported.

## API

### Server: shared keys

#### `Replication.Set`

`[Server]`

Publishes a value every player can see.

```luau
function Replication.Set(key: string, value: any)
```

Nothing is sent at once. Pass `nil` to clear the key.

Throws when the key is empty.

#### `Replication.SetPath`

`[Server]`

Writes one field inside a shared key, building the tables along the way.

```luau
function Replication.SetPath(key: string, path: string, value: any): boolean
```

**Returns**

`boolean` - `false` when a step along the path is blocked by something that is
not a table, or when the guard refused.

#### `Replication.Increment`

`[Server]`

Adds to a number inside a shared key, starting from zero when there is none.

```luau
function Replication.Increment(key: string, path: string, amount: number): number?
```

**Returns**

`number?` - The new value, or `nil` when the field holds something that is not a
number, or the write was refused.

#### `Replication.Mutate`

`[Server]`

Replaces a shared key with whatever the given function returns.

```luau
function Replication.Mutate<T>(key: string, transform: (current: T?) -> T)
```

### Server: player keys

#### `Replication.SetFor`

`[Server]`

Publishes a value only one player receives.

```luau
function Replication.SetFor(player: Player, key: string, value: any)
```

Does nothing for a player who is not on this server.

#### `Replication.SetPathFor`

`[Server]`

Writes one field inside a player's own key.

```luau
function Replication.SetPathFor(player: Player, key: string, path: string, value: any): boolean
```

**Returns**

`boolean` - `false` when the player is not here, the path is blocked, or the
guard refused.

#### `Replication.IncrementFor`

`[Server]`

Adds to a number inside a player's own key.

```luau
function Replication.IncrementFor(player: Player, key: string, path: string, amount: number): number?
```

#### `Replication.MutateFor`

`[Server]`

Replaces one player's own key with whatever the given function returns.

```luau
function Replication.MutateFor<T>(player: Player, key: string, transform: (current: T?) -> T)
```

#### `Replication.GetFor`

`[Server]`

Returns what one player sees under a key.

```luau
function Replication.GetFor<T>(player: Player, full: string): T?
```

The published value itself, not a copy. Treat it as read only.

### Server: control

#### `Replication.SetValidator`

`[Server]`

Refuses writes to a key unless the given test passes.

```luau
function Replication.SetValidator(key: string, validator: ((value: any) -> boolean)?)
```

Pass `nil` to remove the guard.

#### `Replication.SetThrottle`

`[Server]`

Holds one key to at most one message per interval.

```luau
function Replication.SetThrottle(key: string, interval: number?)
```

Pass `nil` to remove the limit.

#### `Replication.Freeze`

`[Server]`

Stops sending a key while it is rearranged.

```luau
function Replication.Freeze(key: string)
```

#### `Replication.Unfreeze`

`[Server]`

Resumes a key that was held back.

```luau
function Replication.Unfreeze(key: string)
```

#### `Replication.OnChanged`

`[Server]`

Returns a signal fired whenever a key is written.

```luau
function Replication.OnChanged(key: string): Signal<(value: any, player: Player?) -> ()>
```

Fires on every write, which is not the same as every change. The second argument
is the owning player for a player key, and `nil` for a shared one.

#### `Replication.GetStats`

`[Server]`

Returns how much has gone out since this server started.

```luau
function Replication.GetStats(): { Messages: number, Keys: number }
```

A snapshot, safe to keep. It does not follow later counting.

### Either side

#### `Replication.Get`

`[Server]` | `[Client]`

Returns what this side holds for a key, or one field inside it.

```luau
function Replication.Get<T>(full: string): T?
```

The held value itself, not a copy. On the client this reads the local view and
never asks the server.

### Client

#### `Replication.Subscribe`

`[Client]`

Calls back whenever a key, or one field inside it, moves.

```luau
function Replication.Subscribe<T>(full: string, callback: (value: T?) -> (), owner: Bag?): Subscription
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `full` | `string` | A key, optionally followed by a dot separated path. |
| `callback` | `(value: T?) -> ()` | Receives the new value, or `nil` when it is cleared. |
| `owner` | `Bag?` | A bag to put the subscription in. The caller keeps it when left out. |

**Returns**

`Subscription` - Carries `Disconnect` and `Destroy`, so a bag holds it like
anything else.

The current value arrives once at the moment of subscribing, if there already is
one. A subscription to a path is woken only when that path actually moved, not
whenever anything in the key did.

Throws when the key is empty or no callback is given.

#### `Replication.WaitFor`

`[Client]`

Yields until a key, or a field inside it, holds a value.

```luau
function Replication.WaitFor<T>(full: string, timeout: number?): (T?, boolean)
```

**Returns**

`T?` - The value, or `nil` when the wait ran out.

`boolean` - `false` when the wait ran out. Yields.

Giving up is reported through the second return, never raised.

## Limits

| Limit | Value |
| :--- | ---: |
| Time between messages | 0.1 seconds |
| `WaitFor` default timeout | 10 seconds |
| Wait for the server to register | 30 seconds |
| Requests for a full view | 2 per second, per player |
