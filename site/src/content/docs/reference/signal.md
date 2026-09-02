---
title: Signal
description: Every listener runs, and none of them can stop the rest
---

```luau
local Signal = require("@game/ReplicatedStorage/Twill").Signal

local roundEnded = Signal.new<(winner: Player, score: number) -> ()>()

roundEnded:Connect(function(winner, score)
	announce(winner, score)
end)

roundEnded:Fire(player, 12)
```

## Typed signals

The type argument to `Signal.new` declares what the signal carries. `Fire` is
checked against it, and listeners are typed without annotation.

```luau
local hit = Signal.new<(target: Model, damage: number) -> ()>()

hit:Fire(dummy, 25)
hit:Fire(dummy)          -- refused by the type checker
```

Left out, the signal carries anything.

## Firing

Listeners run in the order they connected.

Each one runs inside its own `xpcall`. A listener that raises is reported with
its traceback and stepped over, so the listeners behind it still run.

Two rules govern changes made during a firing, and both match how engine signals
behave:

- A listener connected during a firing does not run in that firing. It runs in
  the next one.
- A listener disconnected during a firing does not run, even if it had not been
  reached yet.

Firing a signal from inside one of its own listeners runs the new firing there
and then.

## Waiting

`Wait` parks the calling thread until the signal fires, and hands back what it
was fired with.

A timeout is a number of seconds. When it runs out, `Wait` returns nothing rather
than staying parked.

`Destroy` and `DisconnectAll` wake every parked thread with nothing. A thread
waiting on a signal is never stranded by that signal going away.

## API

### `Signal.new`

`[Server]` | `[Client]`

Makes a signal with nothing listening to it yet.

```luau
function Signal.new<Called>(): Signal<Called>
```

`Called` is a function type describing what the signal carries.

### `Signal.wrap`

`[Server]` | `[Client]`

Makes a signal that fires whenever an engine signal does, passing on its
arguments.

```luau
function Signal.wrap<Called>(source: RBXScriptSignal): Signal<Called>
```

Destroying the wrapper disconnects it from the source. Throws when the value is
not an `RBXScriptSignal`.

### `Signal.Is`

`[Server]` | `[Client]`

Answers whether a value is one of these signals.

```luau
function Signal.Is(value: any): boolean
```

### `Signal:Connect`

`[Server]` | `[Client]`

Calls a function every time the signal fires, until the connection is let go.

```luau
function Signal:Connect(callback: Called): Connection
```

Throws on a destroyed signal, and when there is nothing callable to connect.

### `Signal:Once`

`[Server]` | `[Client]`

Calls a function on the next firing only, letting the connection go as it runs.

```luau
function Signal:Once(callback: Called): Connection
```

Throws on a destroyed signal, and when there is nothing callable to connect.

### `Signal:Wait`

`[Server]` | `[Client]`

Parks the calling thread until the signal fires, or until it gives up waiting.

```luau
function Signal:Wait(timeout: number?): ...any
```

**Returns**

`...any` - What the signal fired with, or nothing when the wait ran out. Yields.

Throws on a destroyed signal, and when the timeout is not a number.

### `Signal:Fire`

`[Server]` | `[Client]`

Calls every listener in the order they connected.

```luau
function Signal:Fire(...: any)
```

Throws on a destroyed signal.

### `Signal:Count`

`[Server]` | `[Client]`

Returns how many listeners the signal would call were it fired now.

```luau
function Signal:Count(): number
```

Useful in tests: a count that grows across rounds is a leak.

### `Signal:IsEmpty`

`[Server]` | `[Client]`

Answers whether nothing at all is listening.

```luau
function Signal:IsEmpty(): boolean
```

### `Signal:IsDestroyed`

`[Server]` | `[Client]`

Answers whether the signal has been destroyed and can no longer be used.

```luau
function Signal:IsDestroyed(): boolean
```

### `Signal:DisconnectAll`

`[Server]` | `[Client]`

Lets every listener go, and wakes anything waiting with nothing.

```luau
function Signal:DisconnectAll()
```

The signal stays usable.

### `Signal:Destroy`

`[Server]` | `[Client]`

Lets everything go and makes the signal unusable.

```luau
function Signal:Destroy()
```

Does nothing the second time.

## Connection

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `Connected` | `boolean` | Whether the signal would still call this listener. |
| `Signal` | `Signal` | The signal it belongs to. |

### `Connection:Disconnect`

`[Server]` | `[Client]`

Lets the listener go, so the signal stops calling it.

```luau
function Connection:Disconnect()
```

Does nothing the second time.

### `Connection:Reconnect`

`[Server]` | `[Client]`

Takes a let-go listener back on, at the end of the line.

```luau
function Connection:Reconnect()
```

Reconnecting puts the listener last, not back where it was. Throws when the
signal has been destroyed.
