---
title: Signal
description: Every listener runs, and none of them can stop the rest.
---

`Twill.Signal` is an event of your own: something to fire, and something for
other code to listen to, without a `BindableEvent` and without the round trip
through the engine that one costs.

```luau
local Signal = require("@game/ReplicatedStorage/Twill/Signal")

local Died = Signal.new()

Died:Connect(function(who: Player)
	print(who.Name, "died")
end)

Died:Fire(player)
```

Twill hands you these already. [`Replication.OnChanged`](/reference/replication/#replicationonchanged)
returns one, and [`Navigation`](/reference/navigation/) gives every journey three.

## The three promises

Everything else on this page is detail. These are the reasons the module exists.

### Every listener runs

Each listener is called inside its own `xpcall`. One that throws is reported and
stepped over; the ones behind it still run, and the signal is untouched
afterwards.

```luau
signal:Connect(function() print("one") end)
signal:Connect(function() error("something went wrong") end)
signal:Connect(function() print("three") end)

signal:Fire()
-- prints one, reports the failure, prints three
```

The report goes through [`Log`](/reference/log/) at `Error`, carrying the
traceback from where the listener broke rather than from the dispatcher.

### No wait is forever

A [`Wait`](#signalwait) can be given a number of seconds to give up after. More
importantly, destroying a signal, or letting all its listeners go, **wakes
everything parked on it** rather than leaving those threads suspended for the
rest of the session.

```luau
local ready = Signal.new()

task.spawn(function()
	ready:Wait()
	print("this line is always reached")
end)

ready:Destroy()
```

A thread that can never be resumed is a leak that no `Destroy` reaches and no
profiler names. Waking it with nothing is the only ending that always arrives.

### Connecting and disconnecting mid-fire behave

A listener connected while the signal is firing sits that firing out and runs the
next one. A listener let go while the signal is firing is not called again, even
if the run has not reached it yet.

```luau
local seen = {}
local second

signal:Connect(function() second:Disconnect() ; table.insert(seen, 1) end)
second = signal:Connect(function() table.insert(seen, 2) end)
signal:Connect(function() table.insert(seen, 3) end)

signal:Fire()
-- seen is {1, 3}
```

These are the engine's own rules. Matching them means the answer to "what happens
if I disconnect here" is one you already know.

## Making one

### `Signal.new`

`[Server]` | `[Client]`

Makes a signal with nothing listening to it yet.

```luau
function Signal.new<Called>(): Signal<Called>
```

**Returns**

`Signal` - A signal of its own, ready to be connected to.

The type argument names the arguments the signal carries, and it names them
literally:

```luau
local Died = Signal.new<(who: Player, cause: string) -> ()>()

Died:Connect(function(who, cause) end)   -- both typed, both named
Died:Fire(player, "fell")                -- checked
Died:Fire(player)                        -- refused, at the call
```

Left off, a signal carries `...any` and nothing is checked. The names are what
show up in autocomplete at the `Connect`, so they are worth writing once.

### `Signal.wrap`

`[Server]` | `[Client]`

Makes a signal that fires whenever an engine signal does, passing on its
arguments.

```luau
function Signal.wrap<Called>(source: RBXScriptSignal): Signal<Called>
```

Useful for giving one engine signal several independent lifetimes, or for
handing out something callers may `Destroy` without touching the original.
Destroying the wrapper unhooks it from the engine signal.

### `Signal.Is`

`[Server]` | `[Client]`

Answers whether a value is one of these signals.

```luau
function Signal.Is(value: any): boolean
```

## Listening

### `signal:Connect`

`[Server]` | `[Client]`

Calls a function every time the signal fires, until the connection is let go.

```luau
function signal:Connect(callback: Called): Connection
```

Listeners run in the order they connected.

### `signal:Once`

`[Server]` | `[Client]`

Calls a function on the next firing only, letting the connection go as it runs.

```luau
function signal:Once(callback: Called): Connection
```

### `signal:Wait`

`[Server]` | `[Client]`

Parks the calling thread until the signal fires, or until it gives up waiting.

```luau
function signal:Wait(timeout: number?): Called...
```

**Parameters**

`timeout: number?` - How long to wait before giving up. Left out, it waits until
the signal fires, is destroyed, or lets its listeners go.

**Returns**

Whatever the signal was fired with, or nothing when it gave up.

```luau
local value = door:Wait(5)

if value == nil then
	-- gave up, or the signal was destroyed
end
```

:::caution[A wait cannot tell you why it ended]
Timing out and being destroyed both return nothing. When the difference matters,
`Connect` and decide for yourself rather than reading it out of a `Wait`.
:::

### `connection:Disconnect`

`[Server]` | `[Client]`

Lets the listener go, so the signal stops calling it. Does nothing twice.

```luau
function connection:Disconnect()
```

### `connection:Reconnect`

`[Server]` | `[Client]`

Takes a let-go listener back on, at the end of the line.

```luau
function connection:Reconnect()
```

Cheaper than connecting again when a listener is switched on and off repeatedly,
because nothing new is allocated. Raises if the signal has been destroyed.

### `connection.Connected`

A plain field, `true` while the signal would still call it.

## Firing

### `signal:Fire`

`[Server]` | `[Client]`

Calls every listener in the order they connected, with whatever it was given.

```luau
function signal:Fire(...: Called...)
```

Firing from inside a listener runs there and then, nested, the way a
`BindableEvent` does. A listener that yields does not hold up the ones behind
it — the run moves on and that listener finishes on its own.

## Asking

### `signal:Count`

Returns how many listeners the signal would call were it fired right now.

### `signal:IsEmpty`

Answers whether nothing at all is listening.

### `signal:IsDestroyed`

Answers whether `Destroy` has run.

`Count` and `IsEmpty` exist mostly for tests. A leak you can assert against is a
leak you find before a player does:

```luau
Scope.Close(player)
assert(events.Died:Count() == 0, "a listener outlived the player")
```

## Closing

### `signal:DisconnectAll`

`[Server]` | `[Client]`

Lets every listener go at once, and wakes anything waiting with nothing.

```luau
function signal:DisconnectAll()
```

The signal stays usable, so this is how a signal is reset rather than replaced.

### `signal:Destroy`

`[Server]` | `[Client]`

Lets everything go and makes the signal unusable. Does nothing the second time.

```luau
function signal:Destroy()
```

After this, `Connect`, `Fire`, and `Wait` raise, naming what happened. The signal
keeps its methods rather than being emptied, so a late call gets a sentence you
can act on instead of `attempt to index nil`.

`Destroy` is also what makes a signal holdable by a [`Bag`](/reference/bag/):

```luau
local Died = bag:Add(Signal.new())          -- destroyed with the bag
local Kept = bag:Add(Signal.new(), "DisconnectAll")   -- only emptied
```

## Edge cases, and what each one does

Each row is covered by a check in the framework's self test.

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

## What it does not do

**No priorities.** Listeners run in the order they connected, like every signal
in the engine. Ordering that matters belongs in one listener that calls things in
the order it wants, where the order is written down.

**No deferred mode.** `Fire` calls listeners now. Code that wants a listener on
the next frame can ask for one, and code that does not should not have to pay for
someone else's setting.

**No queued disconnect.** There is one `Disconnect` and it takes effect
immediately. A container with two disconnect semantics makes every reader check
which one they are looking at.

**No global registry.** Signals are values. A signal you cannot reach is a signal
that gets collected, which is not true of anything a module holds by name.

## Performance

A signal with nothing on it is two integer fields; a signal that is never waited
on never allocates a waiter table.

Listeners are called from pooled threads, and **several listeners share one
thread** until one of them yields, so the cost of a thread is paid only by
listeners that actually suspend. A thread that was cancelled from outside is
checked before reuse rather than resumed blind.

Measured in this place, best of five:

| | Twill.Signal | NamedSignal |
| --- | --- | --- |
| Fire 1 listener, 20 000 times | **7.6 ms** | 14.0 ms |
| Fire 100 listeners, 200 times | 2.0 ms | **0.9 ms** |
| Connect and disconnect 2 000 | 0.9 ms | **0.7 ms** |

The middle row is the price of the first promise on this page. Wrapping each
listener in `xpcall` costs roughly ten nanoseconds per call, which is visible
only when one firing reaches a hundred listeners. Both numbers are far below the
cost of anything a listener is likely to do, and the first row is where ordinary
signals live.
