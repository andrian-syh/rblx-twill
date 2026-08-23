---
title: Tween
description: Values moved over time, every one of them on a single loop.
---

```luau
Twill.Tween.Play(gui, { Position = UDim2.fromScale(0.5, 0.5) }, { Time = 0.4 })

local door = Twill.Tween.new(model, { Pivot = openCFrame }, { Time = 1 }, bag)
door:Play()
```

A tween here is a table, not an `Instance`. Every tween in the game shares one
connection that exists only while something is playing, so a frame costs the
writes it makes and nothing else, and a place that tweens nothing pays nothing.

## What it moves

`TweenService` reaches properties. This reaches four things:

| Written as | Moves |
| --- | --- |
| `Transparency = 1` | A property of the instance. |
| `["@Charge"] = 100` | An attribute, named with a leading `@`. |
| `Pivot = cframe` | A `PVInstance`, through `PivotTo`. |
| `Scale = 2` | A `Model`, through `ScaleTo`. |

A plain table works as a target too, which is what makes a tween testable without
a DataModel and what lets you drive a number nothing on screen owns yet.

```luau
local counter = { Coins = 0 }

Twill.Tween.Play(counter, { Coins = 500 }, { Time = 2 })
```

## Curves the engine cannot draw

A destination given as an array of two or three values is a curve through control
points rather than a straight line.

```luau
Twill.Tween.Play(part, {
	Position = { finish, controlOne, controlTwo },
}, { Time = 1.5 })
```

The first entry is where it ends and the rest are leaned towards on the way, a
quadratic Bezier with one and a cubic with two. `Vector2`, `Vector3`, `UDim2` and
`CFrame` can be curved; everything else travels straight.

## Colour crosses where the eye reads it

A `Color3` is interpolated through Oklab rather than through raw RGB channels, so
a blue reaching a yellow passes through the greens a person expects instead of
sagging through grey. Nothing is asked of you for this.

## A property belongs to one tween

Starting a tween takes every property it moves away from whoever held it, and the
older tween is cancelled rather than left fighting for the same field.

```luau
local slow = Twill.Tween.new(gui, { Position = there }, { Time = 4 })
local fast = Twill.Tween.new(gui, { Position = elsewhere }, { Time = 0.2 })

slow:Play()
fast:Play()   -- slow is cancelled, and Position is now fast's
```

This is per property and per target, so two tweens moving different fields of the
same instance never disturb each other.

## The server replicates every frame

Tweening an `Instance` on the server sends every frame of it to every client, and
Twill refuses it rather than letting that cost arrive unannounced.

```luau
Twill.Tween.Play(part, { Transparency = 1 }, { AllowServer = true })
```

Tween on the client where you can. Pass `AllowServer` when the replication is the
point, which it is for a door every player has to agree about.

:::note[A plain table is never refused]
The guard is about replication, so tweening a table on the server is ordinary.
:::

## Cleanup

A tween belongs to the bag given as its last argument, and to the framework's own
bag when that is left out, so nothing here is ever left running with no owner.

```luau
Twill.Tween.new(gui, { Position = there }, { Time = 1 }, Twill.Scope.Player(player))
```

A tween whose target instance is destroyed ends itself and reports `gone`.
`Tween.Play` tidies itself away once it stops, which is what makes it safe to
call and forget.

## API

### `Tween.new`

`[Server]` | `[Client]`

Builds a tween and leaves it standing, ready to be played.

```luau
function Tween.new(target: Instance | Values, values: Values, options: Options?, owner: Scope.Bag?): Tween
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `target` | `Instance \| { [string]: any }` | What holds the values that are to move. |
| `values` | `Values` | What each name should reach. An array of two or three curves it. |
| `options` | `Options?` | How long it takes and how it is shaped. |
| `owner` | `Scope.Bag?` | The bag it belongs to. The framework's own when left out. |

**Returns**

`Tween` - The tween, not yet playing.

Throws when the target is neither an `Instance` nor a table, when a name is
unknown, unwritable, or given the wrong type, and when a server was asked to
tween an `Instance` without `AllowServer`.

### `Tween.Play`

`[Server]` | `[Client]`

Builds a tween, plays it at once, and tidies it away when it stops.

```luau
function Tween.Play(target: Instance | Values, values: Values, options: Options?, owner: Scope.Bag?): Tween
```

**Returns**

`Tween` - The tween, already playing, and gone once it is over.

Takes and refuses exactly what `Tween.new` does.

### Options

```luau
export type Options = {
	Time: number?,
	EasingStyle: (string | Easing.Curve)?,
	EasingDirection: string?,
	DelayTime: number?,
	RepeatCount: number?,
	Reverses: boolean?,
	FPS: number?,
	AllowServer: boolean?,
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `Time` | 1 | Seconds one round takes. Must be above zero. |
| `EasingStyle` | `"Quad"` | A style name, or a curve of your own taking and returning a number. |
| `EasingDirection` | `"Out"` | `In`, `Out`, `InOut`, or `OutIn`. |
| `DelayTime` | 0 | Seconds to wait before the first move. |
| `RepeatCount` | 0 | Extra rounds after the first. Below zero repeats forever. |
| `Reverses` | false | Whether a round travels back before it counts as done. |
| `FPS` | every frame | Write no more often than this many times a second. |
| `AllowServer` | false | Whether an `Instance` may be tweened on a server. |

Eleven easing styles are available: `Linear`, `Quad`, `Cubic`, `Quart`, `Quint`,
`Sine`, `Exponential`, `Circular`, `Back`, `Elastic`, and `Bounce`. Each is
written once as its `In` curve and the other three directions are derived from
it, so a family is right or wrong in one place rather than in four.

A curve of your own is sampled when it is given and refused there if it answers
with anything but a finite number, rather than failing mid-flight.

```luau
Twill.Tween.Play(gui, { Position = there }, {
	EasingStyle = function(alpha: number)
		return alpha * alpha
	end,
})
```

**`FPS` is for the deliberately stepped look**, a health bar ticking rather than
sliding, and for cutting the cost of a tween nobody is looking closely at. The
final write always lands whatever the rate.

### `Tween:Play`

`[Server]` | `[Client]`

Starts the tween, picking up where a pause left it, and starting over after an
arrival. Throws when the tween has been destroyed.

### `Tween:Pause`

`[Server]` | `[Client]`

Holds the tween where it is, so playing again carries on from there. `Stopped`
does not fire, since the caller already knows.

### `Tween:Cancel`

`[Server]` | `[Client]`

Stops the tween and forgets how far it got, leaving the values where they are.
`Stopped` fires with `cancelled`.

### `Tween:Reset`

`[Server]` | `[Client]`

Stops the tween and puts every value back where it started.

### `Tween:IsPlaying`

`[Server]` | `[Client]`

Answers whether the tween is on the loop right now.

### `Tween:Destroy`

`[Server]` | `[Client]`

Ends the tween for good and lets go of everything it held. Does nothing the
second time.

### `Tween.Completed`

`[Server]` | `[Client]`

A [Signal](/reference/signal/) firing when the tween reaches the far end of its
last round. It does not fire for a cancel, a pause, or a failure.

### `Tween.Stopped`

`[Server]` | `[Client]`

A [Signal](/reference/signal/) carrying why a tween stopped when the stop was not
the caller's doing.

| Reason | Means |
| --- | --- |
| `cancelled` | `Cancel` or `Reset` ran, or a newer tween claimed a property. |
| `gone` | The target instance left the world. |
| `faulted` | A write failed, and the tween was stopped so the rest keep running. |

### `Tween.Active`

`[Server]` | `[Client]`

```luau
function Tween.Active(): number
```

How many tweens are playing right now across the whole game, which is the number
to watch when you suspect something is being left running.

### `Tween.Is`

`[Server]` | `[Client]`

```luau
function Tween.Is(value: any): boolean
```

Answers whether a value is one of these tweens.

## What this is not

It does not replicate. A tween played on one client is that client's, and making
every player agree about a moving door is a job for [Net](/reference/net/) and
[Replication](/reference/replication/), which do it by sending the decision
rather than the frames.

It does not sequence. Chaining is `Completed:Connect`, and that stays explicit
rather than becoming a timeline format to learn.
