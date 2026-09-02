---
title: Loop
description: Work that repeats, waits, or is spread out
---

```luau
local Loop = require("@game/ReplicatedStorage/Twill").Loop

Loop.Every(1, onTick, Scope.Player(player))
Loop.After(5, onTimeout, bag)
Loop.Stagger(pets, 20, updateOnePet)
```

Every function here hands back a handle carrying `Destroy`, so a
[bag](/reference/bag/) holds it like anything else.

```luau
export type Handle = {
	Destroy: (self: Handle) -> (),
}
```

## Ownership

The last argument is the bag the work belongs to. Left out, it goes to
`Scope.Framework()`, because nothing in Twill starts a connection nobody owns.

Passing the right bag is what makes a loop belonging to a player stop when that
player leaves, with no teardown written by hand.

## Missed runs are not made up

`Every` accumulates the time since the last run and fires once when that passes
the interval, reporting what actually passed. A frame that overshoots does not
fire twice to catch up.

Rate work out of `elapsed` rather than assuming the interval, and a stuttering
server produces correct totals instead of a burst of catch-up work.

## API

### `Loop.Every`

`[Server]` | `[Client]`

Runs a callback on an interval for as long as its bag stays open.

```luau
function Loop.Every(
	interval: number,
	callback: (elapsed: number) -> (),
	owner: Scope.Bag?
): Handle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number` | Seconds between runs. Above zero. |
| `callback` | `(elapsed: number) -> ()` | Receives how long actually passed, which is not exactly the interval. |
| `owner` | `Scope.Bag?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Handle` - Stops the repeating early.

Throws when the interval is not a number above zero, or the callback is not a
function.

Runs on `Heartbeat`, so the callback runs after physics rather than before.

### `Loop.After`

`[Server]` | `[Client]`

Runs a callback once, later, unless its bag closes first.

```luau
function Loop.After(delay: number, callback: () -> (), owner: Scope.Bag?): Handle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `delay` | `number` | Seconds to wait. Zero or more. |
| `callback` | `() -> ()` | What to run when the wait is over. |
| `owner` | `Scope.Bag?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Handle` - Cancels the wait early.

Throws when the delay is not a number of zero or more, or the callback is not a
function.

A bag that closes during the wait cancels it, which is what makes this safe to
start for a player who may leave before it comes due. Use it over `task.delay`
for anything tied to a lifetime.

### `Loop.Stagger`

`[Server]` | `[Client]`

Walks an array a few entries per frame, wrapping around forever.

```luau
function Loop.Stagger<T>(
	items: { T },
	perFrame: number,
	step: (item: T, index: number) -> (),
	owner: Scope.Bag?
): Handle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `items` | `{ T }` | The array to walk. Read live, so entries may be added or removed while it runs. |
| `perFrame` | `number` | How many entries one frame may carry. At least one. |
| `step` | `(item: T, index: number) -> ()` | Receives one entry and where it sat. |
| `owner` | `Scope.Bag?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Handle` - Stops the walk early.

Throws when given a non-table, fewer than one entry per frame, or no step
function.

A hundred pets updated in one frame is a hundred times the work in that frame.
The same hundred at twenty a frame is five frames of a fifth of it. Pick
`perFrame` from how stale an entry may be, not from how many there are.

An empty array costs a frame check and nothing else. A frame never carries more
entries than the array holds, so a short array is not walked twice in one frame.

### `Loop.Until`

`[Server]` | `[Client]`

Yields until a predicate comes true, or until the waiting runs out.

```luau
function Loop.Until(predicate: () -> boolean, timeout: number?, poll: number?): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `predicate` | `() -> boolean` | Asked repeatedly, and once before any waiting. |
| `timeout` | `number?` | Seconds to keep asking before giving up. Ten when left out. |
| `poll` | `number?` | Seconds between asks. A tenth of a second when left out. |

**Returns**

`boolean` - `true` when it came true, `false` when the time ran out. Yields.

Throws when the predicate is not a function.

This takes no bag, because it yields the calling thread rather than owning a
connection.

Reach for it only where the state offers no signal to wait on. An attribute has
`GetAttributeChangedSignal`, a property has `GetPropertyChangedSignal`, a tag
has its own signals, and replicated state has
[`Replication.WaitFor`](/reference/replication/#replicationwaitfor). Each of
those costs nothing while it waits, and this costs a check per poll.

## Limits

| Limit | Value |
| :--- | ---: |
| Default `Until` timeout | 10 seconds |
| Default `Until` poll | 0.1 seconds |
| Smallest `Stagger` batch | 1 entry per frame |
