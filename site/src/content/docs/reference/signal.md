---
title: Signal
description: Events of your own, with named arguments.
---

`Twill.Signal` is an event you own: something to fire, and something for other
code to listen to, without a `BindableEvent` and without the round trip through
the engine that one costs.

```luau
local Signal = require("@game/ReplicatedStorage/Twill/Signal")

local Died = Signal.new()

Died:Connect(function(who: Player)
	print(who.Name, "died")
end)

Died:Fire(player)
```

Twill hands these out already.
[`Replication.OnChanged`](/reference/replication/#replicationonchanged) returns
one, and [`Navigation`](/reference/navigation/) gives every journey three.

## Naming what a signal carries

The type argument names the arguments the signal carries, and it names them
literally:

```luau
local Died = Signal.new<(who: Player, cause: string) -> ()>()

Died:Connect(function(who, cause) end)   -- both typed, both named
Died:Fire(player, "fell")                -- checked
Died:Fire(player)                        -- refused, at the call
```

Left off, a signal carries `...any` and nothing is checked. The names appear in
autocomplete at the `Connect`, so they are worth writing once.

## How firing behaves

Three rules govern every firing, and they follow the engine's own signals so
there is one set to remember rather than one per library.

**Listeners run in the order they connected**, each inside its own `xpcall`. One
that raises is reported through [`Log`](/reference/log/) at `Error` — carrying
the traceback from where it broke, not from the dispatcher — and stepped over.
The listeners behind it still run.

**A listener connected mid-fire sits that firing out** and runs the next one. A
listener released mid-fire is not called again, even if the run has not reached
it yet.

**Firing from inside a listener runs there and then**, nested, the way a
`BindableEvent` does. A listener that yields does not hold up the ones behind
it: the run moves on, and that listener finishes on its own.

## Waits always end

A [`Wait`](#signalwait) can be given a number of seconds to give up after.
Beyond that, destroying a signal or releasing all its listeners **wakes
everything parked on it**, handing each of them nothing.

```luau
local ready = Signal.new()

task.spawn(function()
	ready:Wait()
	print("this line is always reached")
end)

ready:Destroy()
```

A thread that can never be resumed is a leak no `Destroy` reaches and no
profiler names, so waking it with nothing is the only ending that always
arrives.

## API

### `Signal.new`

`[Server]` | `[Client]`

Creates a signal with nothing listening to it yet.

```luau
function Signal.new<Called>(): Signal<Called>
```

**Returns**

`Signal` - A signal of its own, ready to be connected to.

### `Signal.wrap`

`[Server]` | `[Client]`

Creates a signal that fires whenever an engine signal does, passing on its
arguments.

```luau
function Signal.wrap<Called>(source: RBXScriptSignal): Signal<Called>
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `source` | `RBXScriptSignal` | The engine signal to stand in for. |

**Returns**

`Signal` - A signal that fires along with it, until it is destroyed.

Throws when the value is not an engine signal.

Useful for giving one engine signal several independent lifetimes, or for
handing out something callers may `Destroy` without touching the original.
Destroying the wrapper unhooks it from the engine signal.

### `Signal.Is`

`[Server]` | `[Client]`

Reports whether a value is one of these signals.

```luau
function Signal.Is(value: any): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `any` | The value to examine. |

**Returns**

`boolean` - True when it is a signal.

### `signal:Connect`

`[Server]` | `[Client]`

Calls a function every time the signal fires, until the connection is released.

```luau
function signal:Connect(callback: Called): Connection
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `callback` | `Called` | What to call when the signal fires. |

**Returns**

`Connection` - The connection standing for that listener.

Throws when the signal has been destroyed, and when the callback is not a
function.

### `signal:Once`

`[Server]` | `[Client]`

Calls a function on the next firing only, releasing the connection as it runs.

```luau
function signal:Once(callback: Called): Connection
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `callback` | `Called` | What to call on that one firing. |

**Returns**

`Connection` - The connection, standing only until it fires.

Throws when the signal has been destroyed, and when the callback is not a
function.

### `signal:Wait`

`[Server]` | `[Client]`

Parks the calling thread until the signal fires, or until it gives up waiting.

```luau
function signal:Wait(timeout: number?): Called...
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `timeout` | `number?` | Seconds to wait before giving up. Waits indefinitely when left out. |

**Returns**

Whatever the signal was fired with, or nothing when it gave up. Yields.

Throws when the signal has been destroyed, and when the timeout is not a number.

```luau
local value = door:Wait(5)

if value == nil then
	-- gave up, or the signal was destroyed
end
```

:::caution[A wait cannot tell you why it ended]
Timing out and being destroyed both return nothing. Where the difference
matters, `Connect` and decide for yourself rather than reading it out of a
`Wait`.
:::

### `signal:Fire`

`[Server]` | `[Client]`

Calls every listener in the order they connected, with whatever it was given.

```luau
function signal:Fire(...: Called...)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `...` | `Called...` | What to hand each listener. |

**Returns**

`()` - Nothing.

Throws when the signal has been destroyed.

### `signal:Count`

`[Server]` | `[Client]`

Returns how many listeners the signal would call were it fired now.

```luau
function signal:Count(): number
```

**Returns**

`number` - The count of listeners connected.

### `signal:IsEmpty`

`[Server]` | `[Client]`

Reports whether nothing at all is listening.

```luau
function signal:IsEmpty(): boolean
```

**Returns**

`boolean` - True when the signal has no listeners left.

`Count` and `IsEmpty` make a listener that outlived its owner something a test
can assert against:

```luau
Scope.Close(player)
assert(events.Died:Count() == 0, "a listener outlived the player")
```

### `signal:IsDestroyed`

`[Server]` | `[Client]`

Reports whether `Destroy` has run.

```luau
function signal:IsDestroyed(): boolean
```

**Returns**

`boolean` - True once the signal has been destroyed.

### `signal:DisconnectAll`

`[Server]` | `[Client]`

Releases every listener at once, and wakes anything waiting with nothing.

```luau
function signal:DisconnectAll()
```

**Returns**

`()` - Nothing.

The signal stays usable, so this is how a signal is reset rather than replaced.

### `signal:Destroy`

`[Server]` | `[Client]`

Releases everything and makes the signal unusable.

```luau
function signal:Destroy()
```

**Returns**

`()` - Nothing.

Does nothing the second time. After this, `Connect`, `Fire`, and `Wait` raise,
naming what happened; the signal keeps its methods rather than being emptied, so
a late call gets a sentence rather than `attempt to index nil`.

`Destroy` is also what lets a signal be held by a [`Bag`](/reference/bag/):

```luau
local Died = bag:Add(Signal.new())                     -- destroyed with the bag
local Kept = bag:Add(Signal.new(), "DisconnectAll")    -- only emptied
```

## The connection

### `connection:Disconnect`

`[Server]` | `[Client]`

Releases the listener, so the signal stops calling it.

```luau
function connection:Disconnect()
```

**Returns**

`()` - Nothing.

Does nothing the second time.

### `connection:Reconnect`

`[Server]` | `[Client]`

Takes a released listener back on, at the end of the line.

```luau
function connection:Reconnect()
```

**Returns**

`()` - Nothing.

Throws when the signal it belongs to has been destroyed. Does nothing when the
listener never left. Cheaper than connecting again where a listener is switched
on and off repeatedly, because nothing new is allocated.

### `connection.Connected`

A plain field, `true` while the signal would still call it.

## Behaviour in detail

| Situation | What happens |
| --- | --- |
| A listener throws | Reported with its own traceback, stepped over, the rest still run. |
| A listener yields | The run moves on; that listener finishes on its own later. |
| Connecting mid-fire | Sits that firing out, runs the next one. |
| Disconnecting mid-fire | Not called again, even if the run had not reached it. |
| Disconnecting the last listener mid-fire | The run still finishes; nothing is cut short. |
| Firing from inside a listener | Runs there and then, nested. |
| `DisconnectAll` mid-fire | The rest of that firing is silenced. |
| Disconnecting twice | Does nothing the second time. |
| Reconnecting something already connected | Does nothing. |
| `Wait` when the signal is destroyed | Wakes with nothing, rather than parking forever. |
| `Wait` that fires before its timeout | The timeout is cancelled and cannot wake it twice. |
| Destroying twice | Does nothing the second time. |
| Connecting, firing, or waiting after `Destroy` | Raises, naming what happened. |
| Connecting something that is not a function | Raises at the `Connect`. |

## Notes on cost

A signal with nothing on it is two integer fields, and a signal that is never
waited on never allocates a waiter table.

Listeners are called from pooled threads, and several listeners share one thread
until one of them yields, so the cost of a thread is paid only by listeners that
actually suspend. A thread cancelled from outside is checked before reuse rather
than resumed blind.

Listeners run in the order they connected, which is the order the engine uses.
Where ordering matters, put it in one listener that calls things in the order it
wants, so the order is written down rather than implied.
