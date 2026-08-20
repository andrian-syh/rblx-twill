---
title: Bag
description: Cleanup that finishes, whatever goes wrong on the way.
---

`Twill.Bag` is the container every other Twill module hands you when it hands you
somewhere to put a connection. [`Scope`](/reference/scope/) returns bags,
[`OnPlayerReady`](/reference/lifecycle/#the-player-pipeline) receives one,
[`Watch`](/reference/watch/) gives each member its own.

```luau
local Bag = require("@game/ReplicatedStorage/Twill/Bag")

local bag = Bag.new()

bag:Connect(part.Touched, onTouched)
bag:Add(model)
bag:Destroy()
```

Most code never calls `Bag.new` at all. Reach for it when you are building
something with a lifetime of its own that nothing in `Scope` describes.

## The three promises

Everything else on this page is detail. These are the reasons the module exists.

### Closing runs newest first

The last thing added is the first thing closed, so nothing is ever torn down
after the thing it leans on has already gone.

```luau
local bag = Bag.new()

bag:Add(connectionPool)
bag:Add(connectionPool:Open())   -- closed first, while the pool still exists
```

Reverse order is the only order that is correct when entries depend on each
other, and it costs nothing to provide.

### Closing always finishes

Every cleanup runs inside its own `pcall`. One that throws is reported and
stepped over; the ones queued behind it still run, and the bag ends empty and
usable.

```luau
local bag = Bag.new()

bag:Add(function() print("one") end)
bag:Add(function() error("something went wrong") end)
bag:Add(function() print("three") end)

bag:Clean()
-- prints three, reports the failure, prints one
-- bag:IsEmpty() == true
```

The failure is reported through [`Log`](/reference/log/) at `Error`, naming what
threw. Nothing is swallowed and nothing is stranded.

:::caution[This is the bug that motivated the module]
A cleanup container that lets an error escape its loop leaves the remaining
entries permanently held and, if it guards re-entry with a flag, leaves that flag
raised forever. Player bags are shared between systems, so one service's bad
`Destroy` would take every other service's cleanup down with it.
:::

### Adding from inside a cleanup is allowed

An entry added while the bag is closing is closed in that same pass.

```luau
bag:Add(function()
	bag:Add(function()
		print("this runs too")
	end)
end)
```

This matters for teardown that has to allocate in order to unwind — releasing a
lock, sending one last message.

## Holding things

### `Bag.new`

`[Server]` | `[Client]`

Makes an empty bag, owned by whoever asked for it.

```luau
function Bag.new(): Bag
```

**Returns**

`Bag` - A bag holding nothing yet.

### `bag:Add`

`[Server]` | `[Client]`

Holds an object until the bag closes, and hands it straight back.

```luau
function bag:Add<T>(object: T, method: (string | boolean)?, key: any?): T
```

**Parameters**

`object: T` - An instance, connection, function, thread, or object.

`method: (string | boolean)?` - What closes it, or `true` for a function or
thread. Worked out from the type when left out.

`key: any?` - A name for the entry. Adding under a name that is already taken
closes whatever held it first.

**Returns**

`T` - The very object that was passed in, so a bag fits mid-expression.

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

That third line is why there is no `AddPromise`. A promise carries `cancel`, so
naming it is the whole feature, and Twill does not have to depend on a promise
library to offer it. The same is true of anything you write yourself: **the
method name is the extension point**, and nothing has to be registered.

:::note[It refuses rather than warns]
An object with no way to close raises an error at the `Add` that offered it, with
the line that offered it named. A container that accepts it and warns has
accepted a leak.
:::

### `bag:Connect`

`[Server]` | `[Client]`

Connects a signal and holds the connection in the one call.

```luau
function bag:Connect(signal: any, callback: (...any) -> ()): any
```

Takes an `RBXScriptSignal` or any object carrying `Connect`, so Twill's own
signals and third-party ones both work.

### `bag:Once`

`[Server]` | `[Client]`

Connects a signal for one firing, letting the entry out the moment it fires.

```luau
function bag:Once(signal: any, callback: (...any) -> ()): any
```

The entry is registered **before** the signal is connected, so a signal that
fires during the connect still finds its entry to release. Registering after is a
real and subtle bug: it leaves a dead connection in the bag until the bag closes.

### `bag:Task`

`[Server]` | `[Client]`

Runs a callback on its own thread, cancelled if it is still going when the bag
closes.

```luau
function bag:Task(callback: (...any) -> (), ...: any): thread
```

### `bag:Delay`

`[Server]` | `[Client]`

Runs a callback later, cancelled outright if the bag closes before it comes due.

```luau
function bag:Delay(seconds: number, callback: (...any) -> (), ...: any): thread
```

### `bag:Bind`

`[Client]`

Binds a callback to render step, unbound by name when the bag closes.

```luau
function bag:Bind(name: string, priority: number, callback: (delta: number) -> ())
```

Raises on the server, where render step does not exist.

### `bag:Clone`

`[Server]` | `[Client]`

Clones an instance and holds the copy, leaving the original alone.

```luau
function bag:Clone<T>(instance: T & Instance): T
```

### `bag:Extend`

`[Server]` | `[Client]`

Makes a bag inside this one, closing when this one does.

```luau
function bag:Extend(): Bag
```

Useful when part of a system needs to be torn down and rebuilt without
disturbing the rest.

## Letting things out

### `bag:Remove`

`[Server]` | `[Client]`

Closes one entry now and lets it out, leaving the rest of the bag alone.

```luau
function bag:Remove(what: any): boolean
```

Takes the name it was held under, or the object itself. Answers `false` when the
bag was not holding it.

### `bag:Release`

`[Server]` | `[Client]`

Lets one entry out **without** closing it, handing ownership back to the caller.

```luau
function bag:Release(what: any): boolean
```

### `bag:Get`

`[Server]` | `[Client]`

Returns what is held under a name, without letting it out.

```luau
function bag:Get(key: any): any
```

## Names

A name makes an entry replaceable, which is the tidy way to hold one thing at a
time.

```luau
local function retarget(model: Model)
	-- The previous tween is cancelled by being replaced.
	bag:Add(makeTween(model), "Cancel", "aim")
end
```

Without a name, the same call would stack a new tween on every retarget and
cancel all of them at once when the bag finally closed.

## Closing

### `bag:Clean`

`[Server]` | `[Client]`

Closes everything held, newest first, and leaves the bag ready to be used again.

```luau
function bag:Clean()
```

### `bag:Destroy`

`[Server]` | `[Client]`

Closes everything held and makes the bag unusable. Does nothing the second time.

```luau
function bag:Destroy()
```

After this, `Add` raises. A bag that quietly accepts entries it will never close
is a leak wearing a friendly face.

`Destroy` is also what makes a bag holdable by another bag, so `Extend` needs no
special handling.

## Asking

### `bag:Count`

Returns how many entries are still to be closed.

### `bag:IsEmpty`

Answers whether the bag is holding nothing at all.

### `bag:IsDestroyed`

Answers whether `Destroy` has finished.

### `Bag.Is`

Answers whether a value is one of these bags.

```luau
function Bag.Is(value: any): boolean
```

`Count` and `IsEmpty` exist mostly for tests. A leak you can assert against is a
leak you find before a player does:

```luau
Scope.Close(player)
assert(bagFor(player):Count() == 0, "something outlived the player")
```

## Attaching to an instance

### `bag:AttachTo`

`[Server]` | `[Client]`

Closes the bag when an instance goes, turning ownership the other way round.

```luau
function bag:AttachTo(instance: Instance): any
```

Normally the bag decides when its instances die. This inverts that: the instance
decides when the bag closes. Use it only when the instance genuinely outranks the
bag.

An instance that is already outside the data model closes the bag **at once**
rather than raising, because the thing you were waiting for has already happened.

Attaching a second time replaces the first attachment rather than stacking.

### `bag:Detach`

`[Server]` | `[Client]`

Stops watching whatever instance the bag was attached to, leaving the bag open.

```luau
function bag:Detach()
```

## Edge cases, and what each one does

Each row is covered by a check in the framework's self test.

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
| The same object added twice | Two entries, closed twice. Give it a name if you meant one. |
| `Once` firing during the connect | Its entry already exists, so it is released cleanly. |

## What it does not do

**No weak references.** A bag holds what it was given, strongly. A container that
lets entries be collected without closing them trades a visible leak for an
invisible one.

**No finalizers.** Nothing here runs on garbage collection, because Luau makes no
promise about when that is. A bag closes because something closed it.

**No `Construct`.** `bag:Add(Class.new(...))` is already one line.

**No promise integration.** See [`bag:Add`](#bagadd).

## Performance

Entries are stored in one flat array, two slots per entry, so holding something
allocates nothing. The type is worked out once at `Add` and recorded as a marker,
so closing compares markers rather than looking up strings.

Closing is linear in the number of entries. That is worth stating plainly because
the obvious way to support adding-during-cleanup — rescanning for the next entry
after each one — is quadratic, and quadratic teardown is invisible until the
frame a hundred players leave at once.

Measured in Studio, closing a bag of functions:

| Entries | Time |
| --- | --- |
| 100 | 0.015 ms |
| 1 000 | 0.105 ms |
| 5 000 | 0.544 ms |

`Remove`, `Release`, and replacing a name each scan the array, so they are linear
in the size of the bag. Bags hold tens of entries in practice and this has never
mattered; if you find yourself removing by name in a hot loop, hold a smaller bag.
