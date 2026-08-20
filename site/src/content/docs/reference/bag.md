---
title: Bag
description: The cleanup container everything else hands you.
---

`Twill.Bag` holds whatever a system made — connections, instances, threads,
objects of your own — and closes all of it in one call. It is the container
behind every bag [`Scope`](/reference/scope/) hands out, and the one
[`Watch`](/reference/watch/) gives each member of a set.

```luau
local Bag = require("@game/ReplicatedStorage/Twill/Bag")

local bag = Bag.new()

bag:Connect(part.Touched, onTouched)
bag:Add(model)
bag:Destroy()
```

Most code never calls `Bag.new`. Reach for it when you are building something
with a lifetime of its own that nothing in `Scope` describes.

## How closing behaves

Three rules govern every close, and they are worth knowing before the API.

**The newest entry closes first.** Reverse order is the only order that is
correct when one entry depends on another, so a connection taken from a pool is
released before the pool it came from.

```luau
bag:Add(connectionPool)
bag:Add(connectionPool:Open())   -- closed first, while the pool still exists
```

**Closing runs to the end.** Every cleanup runs in its own `pcall`. One that
raises is reported through [`Log`](/reference/log/) at `Error` and stepped over;
the entries behind it still close, and the bag ends empty and usable.

**Adding during a close is allowed.** An entry added while the bag is closing is
closed in that same pass, which matters for teardown that has to allocate in
order to unwind — releasing a lock, sending one last message.

## Naming an entry

A name makes an entry replaceable, which is how a bag holds one thing at a time.

```luau
local function retarget(model: Model)
	-- The previous tween is cancelled by being replaced.
	bag:Add(makeTween(model), "Cancel", "aim")
end
```

Without a name the same call stacks a new tween on every retarget and cancels
all of them at once when the bag finally closes.

## API

### `Bag.new`

`[Server]` | `[Client]`

Creates an empty bag.

```luau
function Bag.new(): Bag
```

**Returns**

`Bag` - A bag holding nothing yet.

### `Bag.Is`

`[Server]` | `[Client]`

Reports whether a value is one of these bags.

```luau
function Bag.Is(value: any): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `any` | The value to examine. |

**Returns**

`boolean` - True when it is a bag.

### `bag:Add`

`[Server]` | `[Client]`

Holds an object until the bag closes, and returns it unchanged.

```luau
function bag:Add<T>(object: T, method: (string | boolean)?, key: any?): T
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `object` | `T` | An instance, connection, function, thread, or object. |
| `method` | `(string \| boolean)?` | What closes it, or `true` for a function or thread. Worked out from the type when left out. |
| `key` | `any?` | A name for the entry. Adding under a name already taken closes whatever held it first. |

**Returns**

`T` - The object that was passed in, so a bag fits mid-expression.

Throws when the bag has been destroyed, and when nothing says how the object
closes.

Left to work it out, a bag closes each type this way:

| Type | Closed with |
| --- | --- |
| `Instance` | `object:Destroy()` |
| `RBXScriptConnection` | `object:Disconnect()` |
| `function` | `object()` |
| `thread` | `task.cancel(object)`, skipped if it already finished |
| `table` | The first of `Destroy`, `Disconnect`, `destroy`, `disconnect` it carries |

Anything else needs the method named:

```luau
bag:Add(tween, "Cancel")
bag:Add(sound, "Stop")
bag:Add(promise, "cancel")
```

The method name is the extension point, so anything you write yourself is
supported the day you write it and nothing has to be registered.

:::note[Refused rather than warned]
An object with no way to close raises at the `Add` that offered it, naming the
line. A container that accepts it and warns has accepted a leak.
:::

### `bag:Connect`

`[Server]` | `[Client]`

Connects a signal and holds the connection in one call.

```luau
function bag:Connect(signal: any, callback: (...any) -> ()): Connection
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `signal` | `any` | An `RBXScriptSignal`, or any object carrying `Connect`. |
| `callback` | `(...any) -> ()` | What to run when it fires. |

**Returns**

`Connection` - The connection, already held.

Throws when the value cannot be connected to.

### `bag:Once`

`[Server]` | `[Client]`

Connects a signal for one firing, releasing the entry the moment it fires.

```luau
function bag:Once(signal: any, callback: (...any) -> ()): Connection
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `signal` | `any` | An `RBXScriptSignal`, or any object carrying `Once`. |
| `callback` | `(...any) -> ()` | What to run on that one firing. |

**Returns**

`Connection` - The connection, held until it fires or the bag closes.

Throws when the value cannot be connected to.

The entry is registered before the signal is connected, so a signal that fires
during the connect still finds its entry to release.

### `bag:Task`

`[Server]` | `[Client]`

Runs a callback on its own thread, cancelled if it is still running when the bag
closes.

```luau
function bag:Task(callback: (...any) -> (), ...: any): thread
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `callback` | `(...any) -> ()` | What to run. |
| `...` | `any` | What to run it with. |

**Returns**

`thread` - The thread, already held.

### `bag:Delay`

`[Server]` | `[Client]`

Runs a callback later, cancelled outright if the bag closes before it comes due.

```luau
function bag:Delay(seconds: number, callback: (...any) -> (), ...: any): thread
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `seconds` | `number` | How long to wait first. |
| `callback` | `(...any) -> ()` | What to run then. |
| `...` | `any` | What to run it with. |

**Returns**

`thread` - The waiting thread, already held.

### `bag:Bind`

`[Client]`

Binds a callback to render step, unbound by name when the bag closes.

```luau
function bag:Bind(name: string, priority: number, callback: (delta: number) -> ())
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The name to bind under, and to unbind by. |
| `priority` | `number` | Where in the step it runs. |
| `callback` | `(delta: number) -> ()` | What to run each frame. |

**Returns**

`()` - Nothing.

Throws when called on the server, where render step does not exist.

### `bag:Clone`

`[Server]` | `[Client]`

Clones an instance and holds the copy, leaving the original alone.

```luau
function bag:Clone<T>(instance: T & Instance): T
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `instance` | `Instance` | What to copy. |

**Returns**

`Instance` - The copy, already held.

### `bag:Extend`

`[Server]` | `[Client]`

Creates a bag inside this one, closing when this one does.

```luau
function bag:Extend(): Bag
```

**Returns**

`Bag` - A bag of its own, already held.

Useful when part of a system has to be torn down and rebuilt without disturbing
the rest.

### `bag:Get`

`[Server]` | `[Client]`

Returns what is held under a name, without releasing it.

```luau
function bag:Get(key: any): any
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `key` | `any` | The name it was held under. |

**Returns**

`any` - What is held there, or nil when nothing is.

### `bag:Remove`

`[Server]` | `[Client]`

Closes one entry now and releases it, leaving the rest of the bag alone.

```luau
function bag:Remove(what: any): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `what` | `any` | The name it was held under, or the object itself. |

**Returns**

`boolean` - False when the bag was not holding it.

### `bag:Release`

`[Server]` | `[Client]`

Releases one entry without closing it, handing ownership back to the caller.

```luau
function bag:Release(what: any): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `what` | `any` | The name it was held under, or the object itself. |

**Returns**

`boolean` - False when the bag was not holding it.

### `bag:Count`

`[Server]` | `[Client]`

Returns how many entries are still to be closed.

```luau
function bag:Count(): number
```

**Returns**

`number` - The count of entries held.

### `bag:IsEmpty`

`[Server]` | `[Client]`

Reports whether the bag is holding nothing at all.

```luau
function bag:IsEmpty(): boolean
```

**Returns**

`boolean` - True when there is nothing left to close.

`Count` and `IsEmpty` make a leak something a test can assert against:

```luau
Scope.Close(player)
assert(bagFor(player):Count() == 0, "something outlived the player")
```

### `bag:IsDestroyed`

`[Server]` | `[Client]`

Reports whether `Destroy` has finished.

```luau
function bag:IsDestroyed(): boolean
```

**Returns**

`boolean` - True once the bag has been destroyed.

### `bag:AttachTo`

`[Server]` | `[Client]`

Closes the bag when an instance goes away, inverting who owns whom.

```luau
function bag:AttachTo(instance: Instance): Connection?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `instance` | `Instance` | The instance whose removal should close the bag. |

**Returns**

`Connection?` - The connection watching it, or nil when the bag closed at once.

Throws when the value is not an instance.

Normally the bag decides when its instances die. This reverses that, so use it
only when the instance genuinely outranks the bag. An instance already outside
the data model closes the bag at once rather than raising, because the thing
being waited for has already happened. Attaching a second time replaces the
first attachment rather than stacking.

### `bag:Detach`

`[Server]` | `[Client]`

Stops watching whatever instance the bag was attached to, leaving the bag open.

```luau
function bag:Detach()
```

**Returns**

`()` - Nothing.

### `bag:Clean`

`[Server]` | `[Client]`

Closes everything held, newest first, and leaves the bag ready to use again.

```luau
function bag:Clean()
```

**Returns**

`()` - Nothing.

### `bag:Destroy`

`[Server]` | `[Client]`

Closes everything held and makes the bag unusable.

```luau
function bag:Destroy()
```

**Returns**

`()` - Nothing.

Does nothing the second time. After this, `Add` raises, because a bag that
quietly accepts entries it will never close is a leak wearing a friendly face.
`Destroy` is also what lets one bag be held by another, so `Extend` needs no
special handling.

## Behaviour in detail

| Situation | What happens |
| --- | --- |
| A cleanup raises | Reported, stepped over, the rest still close. |
| `Add` from inside a cleanup | Closed in the same pass. |
| `Destroy` from inside a cleanup | Settles once the pass finishes; no recursion. |
| A bag added to itself | Refused at `Add`. |
| Bag A holds B, B holds A | The second visit does nothing. |
| `Add` after `Destroy` | Raises. |
| `Clean` after `Destroy` | Does nothing. |
| A named method the object lacks | Raises at `Add`. |
| A thread cancelling itself | Deferred, rather than failing silently. |
| A thread that already finished | Skipped. |
| An instance already destroyed | Harmless; a locked one is caught. |
| The same object added twice | Two entries, closed twice. Give it a name to mean one. |
| `Once` firing during the connect | Its entry already exists, so it is released cleanly. |

## Notes on cost

Entries are stored in one flat array, two slots per entry, so holding something
allocates nothing. The type is worked out once at `Add` and recorded as a
marker, so closing compares markers rather than looking up strings.

`Remove`, `Release`, and replacing a name each scan the array, so they cost
time in proportion to the size of the bag. Bags hold tens of entries in
practice; if you find yourself removing by name in a hot loop, hold a smaller
bag.

A bag holds what it was given strongly, and nothing here runs on garbage
collection. A bag closes because something closed it.
