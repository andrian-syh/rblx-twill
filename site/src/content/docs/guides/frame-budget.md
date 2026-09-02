---
title: Spread work across frames
description: Repeat work on an interval, defer it, and walk a large list without stalling a frame
---

A hundred pets updated in one frame is a hundred times the work in that frame.
The same hundred at twenty a frame is five frames of a fifth of the work, and no
player can tell the difference. The total is identical; only the shape of the
spike changes, and the spike is what players feel.

[`Loop`](/reference/loop/) covers the three shapes this takes: work that
repeats, work that happens later, and work that is too big for one frame.

## Everything here has an owner

Each call returns a handle carrying `Destroy`, and takes the bag it belongs to
as its last argument.

```luau
-- Ends when the player leaves.
Loop.Every(1, onTick, Twill.Scope.Player(player))

-- Ends when the session does, because nothing in Twill starts a connection
-- nobody owns.
Loop.Every(1, onTick)
```

Passing the right bag is the whole of cleanup. A loop started for a player and
owned by the framework keeps running after they leave, and the only symptom is a
server that gets slower the longer it stays up.

## Repeat on an interval

```luau
function AutosaveService.Start()
	-- The callback receives how long actually passed, not the interval you
	-- asked for.
	Loop.Every(60, function(elapsed)
		for _, player in Players:GetPlayers() do
			Twill.Data.Save(player)
		end
	end)
end
```

A frame that overshoots the interval reports the time that actually passed
rather than firing twice to catch up. Work out rates from `elapsed` instead of
assuming the interval, and a stuttering server produces correct totals rather
than a burst of catch-up work at the worst possible moment.

## Do something later

```luau
function RoundService.Start()
	-- Cancelled if the bag closes first, so this is safe to start for a player
	-- who may leave before it comes due.
	Loop.After(5, function()
		beginRound()
	end, Twill.Scope.Framework())
end
```

## Walk a large list

`Stagger` is the one worth reading twice. It walks an array a few entries per
frame, over and over, so every entry is touched once per lap and no single frame
carries the whole set.

```luau
local pets: { Model } = {}

function PetService.Start()
	-- Twenty a frame. With a hundred pets, each one updates every five frames.
	Loop.Stagger(pets, 20, function(pet, index)
		followOwner(pet)
	end)
end
```

The array is read live each frame, so entries may be added or removed while it
runs. There is no need to stop and restart the walk when the set changes.

Choosing the number is a trade between smoothness and latency:

| Per frame | Effect |
| --- | --- |
| Higher | Each entry updates sooner, each frame costs more. |
| Lower | Cheaper frames, longer until an entry is revisited. |

Pick from how stale an entry may be, not from how many there are. Something that
must react within about a tenth of a second needs the whole set covered in a
handful of frames; a background hum can take a second.

Position updates, distance checks, and idle animations tolerate it well.
Anything a player triggers directly does not, and belongs on the event that
triggered it.

## Wait for something with no signal

`Until` is the last resort, and the reference says so plainly. Where a signal
exists, wait on the signal.

```luau
-- Asked once before any waiting, so an already-true condition costs nothing.
local ready = Loop.Until(function()
	return roundHasStarted
end, 30)

if not ready then
	logger:Warn("the round never started")
	return
end
```

Waiting for the network is not one of these cases. `Net` reports readiness
directly, and a call made before then is held rather than lost:

```luau
Net.OnReady(function()
	remote:Fire("ready")
end)
```

It answers `false` when the time runs out rather than yielding forever, which is
what makes it safe to put in a boot path.

:::caution[Polling is a cost, not a fallback]
Reach for `Until` only when the state genuinely offers nothing to wait on. An
attribute has `GetAttributeChangedSignal`, a property has
`GetPropertyChangedSignal`, a tag has its own signals, and replicated state has
`Replication.WaitFor`. Each of those costs nothing while it waits.
:::

## Which one to reach for

| Situation | Use |
| --- | --- |
| Something on a schedule | `Loop.Every` |
| Something once, later, cancellable | `Loop.After` |
| A set too large for one frame | `Loop.Stagger` |
| A condition with a signal | The signal |
| A condition with no signal at all | `Loop.Until` |
| A per-frame reaction to state | The event that changed the state |
