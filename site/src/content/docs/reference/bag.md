---
title: Bag
description: Holds what a system made and closes all of it, newest first
---

```luau
local Bag = require("@game/ReplicatedStorage/Twill").Bag

local bag = Bag.new()

bag:Connect(part.Touched, onTouched)
bag:Add(model)
bag:Destroy()
```

## Closing order and failure

A bag closes newest first. Anything added later is closed before what it was
built on.

Every cleanup runs inside its own `pcall`. One that raises is collected and the
drain continues, so a single failure cannot strand the entries queued behind it.
Failures are reported through the log after the bag is empty, one line each.

Adding to a bag from inside one of its own cleanups is allowed. The addition is
closed in the same pass.

`Destroy` on a bag that is already destroyed does nothing.

## What a bag can close

`Add` works out how to close most things on its own.

| Given | Closed by |
| :--- | :--- |
| `Instance` | `Destroy` |
| `RBXScriptConnection` | `Disconnect` |
| `function` | Calling it |
| `thread` | `task.cancel`, skipped when the thread is already dead |
| `table` | The first of `Destroy`, `Disconnect`, `destroy`, `disconnect` it carries |

Anything else needs the closing method named. Pass the method name as the second
argument, or `true` for a function or thread.

A thread cancelling itself is deferred rather than cancelled in place.

## Naming an entry

The third argument to `Add` is a key. Adding again under the same key closes
whatever held it before.

```luau
bag:Add(track, nil, "walk")
bag:Add(otherTrack, nil, "walk")
```

The first track is closed when the second takes the name. `Get` reads what a key
holds without letting it out.

## Attaching to an instance

`AttachTo` turns ownership the other way round: the instance going closes the
bag, rather than the bag closing the instance.

An instance that is not in `game` closes the bag immediately, and `AttachTo`
answers `nil`. A bag can be attached to one instance at a time; attaching again
detaches first.

## API

### `Bag.new`

`[Server]` | `[Client]`

Makes an empty bag.

```luau
function Bag.new(): Bag
```

### `Bag.Is`

`[Server]` | `[Client]`

Answers whether a value is one of these bags.

```luau
function Bag.Is(value: any): boolean
```

### `Bag:Add`

`[Server]` | `[Client]`

Holds an object until the bag closes, and hands it straight back.

```luau
function Bag:Add<T>(object: T, method: (string | boolean)?, key: any?): T
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `object` | `T` | An instance, connection, function, thread, or object. |
| `method` | `(string \| boolean)?` | The name of the method that closes it, or `true` for a function or thread. Worked out when left out. |
| `key` | `any?` | A name for it. Closes whatever held that name before. |

**Returns**

`T` - The object that was passed in.

Throws when the bag has been destroyed, when nothing was passed, when the bag is
passed to itself, and when nothing says how the object closes.

### `Bag:Connect`

`[Server]` | `[Client]`

Connects a signal and holds the connection.

```luau
function Bag:Connect(signal: any, callback: (...any) -> ()): any
```

Takes an `RBXScriptSignal` or any object carrying `Connect`, which includes
[`Signal`](/reference/signal/). Throws on anything else.

### `Bag:Once`

`[Server]` | `[Client]`

Connects a signal for one firing, letting the entry go the moment it fires.

```luau
function Bag:Once(signal: any, callback: (...any) -> ()): any
```

The entry leaves the bag when it fires, so a bag holding many one-shot listeners
does not grow.

### `Bag:Task`

`[Server]` | `[Client]`

Runs a callback on its own thread, cancelled if it is still going when the bag
closes.

```luau
function Bag:Task(callback: (...any) -> (), ...: any): thread
```

### `Bag:Delay`

`[Server]` | `[Client]`

Runs a callback later, cancelled outright if the bag closes first.

```luau
function Bag:Delay(seconds: number, callback: (...any) -> (), ...: any): thread
```

### `Bag:Bind`

`[Client]`

Binds a callback to render step, unbound by name when the bag closes.

```luau
function Bag:Bind(name: string, priority: number, callback: (delta: number) -> ())
```

Throws on the server.

### `Bag:Clone`

`[Server]` | `[Client]`

Clones an instance and holds the copy. The original is left alone.

```luau
function Bag:Clone<T>(instance: T & Instance): T
```

### `Bag:Extend`

`[Server]` | `[Client]`

Makes a bag inside this one, closing when this one does.

```luau
function Bag:Extend(): Bag
```

### `Bag:Get`

`[Server]` | `[Client]`

Returns what is held under a name, without letting it out.

```luau
function Bag:Get(key: any): any
```

### `Bag:Remove`

`[Server]` | `[Client]`

Closes one entry now and lets it out, leaving the rest of the bag alone.

```luau
function Bag:Remove(what: any): boolean
```

Takes the key it was named with, or the object itself. Answers `false` when the
bag was not holding it.

### `Bag:Release`

`[Server]` | `[Client]`

Lets one entry out without closing it, handing ownership back to the caller.

```luau
function Bag:Release(what: any): boolean
```

### `Bag:Count`

`[Server]` | `[Client]`

Returns how many things the bag is holding.

```luau
function Bag:Count(): number
```

### `Bag:IsEmpty`

`[Server]` | `[Client]`

Answers whether the bag is holding nothing at all.

```luau
function Bag:IsEmpty(): boolean
```

### `Bag:IsDestroyed`

`[Server]` | `[Client]`

Answers whether the bag has been destroyed and can no longer be added to.

```luau
function Bag:IsDestroyed(): boolean
```

### `Bag:AttachTo`

`[Server]` | `[Client]`

Closes the bag when an instance goes.

```luau
function Bag:AttachTo(instance: Instance): any
```

**Returns**

`any` - The connection watching the instance, or `nil` when the bag closed at
once because the instance is not in `game`.

Throws when the value is not an instance.

### `Bag:Detach`

`[Server]` | `[Client]`

Stops watching whatever instance the bag was attached to, leaving the bag open.

```luau
function Bag:Detach()
```

### `Bag:Clean`

`[Server]` | `[Client]`

Closes everything held and leaves the bag ready to be used again.

```luau
function Bag:Clean()
```

### `Bag:Destroy`

`[Server]` | `[Client]`

Closes everything held and makes the bag unusable.

```luau
function Bag:Destroy()
```
