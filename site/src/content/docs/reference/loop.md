---
title: Loop
description: Work that repeats, waits, or is spread out.
---

```luau
Loop.Every(1, onTick, Scope.Player(player))
Loop.After(5, onTimeout, trove)
Loop.Stagger(pets, 20, updateOnePet)

if not Loop.Until(function() return remote.Id ~= nil end, 30) then
	logger:Warn("remote never arrived")
end
```

Everything here hands back a handle carrying `Destroy`, so a
[Trove](/reference/scope/) holds it like anything else.

```luau
export type Handle = {
	Destroy: (self: Handle) -> (),
}
```

## Ownership

The last argument is the bag the work belongs to. Leave it out and it goes to
`Scope.Framework()`, because nothing in Twill is allowed to start a connection
nobody owns.

Passing the right bag is how a loop belonging to a player stops when that player
leaves, without you writing the teardown.

## API

### `Loop.Every`

`[Server]` | `[Client]`

Runs a callback on an interval for as long as its bag stays open.

```luau
function Loop.Every(
	interval: number,
	callback: (elapsed: number) -> (),
	owner: Scope.Trove?
): Handle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number` | Seconds between runs. Must be above zero. |
| `callback` | `(elapsed: number) -> ()` | Receives how long actually passed, which will not be exactly the interval. |
| `owner` | `Scope.Trove?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Handle` - Stops the repeating early.

Throws when the interval is not a number above zero.

:::note[Missed runs are not made up]
A frame that overshoots the interval reports the time that actually passed rather
than firing twice to catch up. Work rates out of `elapsed` rather than assuming
the interval, and a stuttering server produces correct totals instead of a burst
of catch-up work.
:::

### `Loop.After`

`[Server]` | `[Client]`

Runs a callback once, later, unless its bag closes first.

```luau
function Loop.After(delay: number, callback: () -> (), owner: Scope.Trove?): Handle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `delay` | `number` | Seconds to wait. Zero or more. |
| `callback` | `() -> ()` | What to run when the wait is over. |
| `owner` | `Scope.Trove?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Handle` - Cancels the wait early.

Throws when the delay is not a number of zero or more.

A bag that closes during the wait cancels it, which is what makes this safe to
start for a player who may leave before it comes due. That is the reason to reach
for this over `task.delay` for anything tied to a lifetime.

### `Loop.Stagger`

`[Server]` | `[Client]`

Walks an array a few entries per frame, over and over, so no single frame carries
the whole set.

```luau
function Loop.Stagger<T>(
	items: { T },
	perFrame: number,
	step: (item: T, index: number) -> (),
	owner: Scope.Trove?
): Handle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `items` | `{ T }` | The array to walk. Read live, so entries may be added or removed while it runs. |
| `perFrame` | `number` | How many entries one frame may carry. At least one. |
| `step` | `(item: T, index: number) -> ()` | Receives one entry and where it sat. |
| `owner` | `Scope.Trove?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Handle` - Stops the walk early.

Throws when given something other than an array, or fewer than one entry per
frame.

Every entry is touched once per lap. This is the one worth reading twice: a
hundred pets updated in one frame is a hundred times the work in that frame. The
same hundred at twenty a frame is five frames of a fifth of it, and no player can
tell the difference.

**Example**

```luau
local pets: { Model } = {}

-- Twenty a frame, so a hundred pets each update every five frames. Pick the
-- number from how stale an entry may be, not from how many there are.
Loop.Stagger(pets, 20, function(pet)
	followOwner(pet)
end)
```

### `Loop.Until`

`[Server]` | `[Client]`

Yields until something becomes true, or until waiting for it stops being worth
it.

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

`boolean` - True when it came true, false when the time ran out. Yields.

Throws when the predicate is not a function.

This takes no bag, because it yields the calling thread rather than owning a
connection.

:::caution[The last resort, not a fallback]
This is for state that offers no signal to wait on. Where there is a signal, wait
on that instead: an attribute has `GetAttributeChangedSignal`, a property has
`GetPropertyChangedSignal`, a tag has its own signals, and replicated state has
[`Replication.WaitFor`](/reference/replication/#replicationwaitfor). Each of those
costs nothing while it waits, and this costs a check per poll.
:::
