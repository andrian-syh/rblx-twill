---
title: Navigation
description: Agents that walk somewhere, and one loop driving all of them.
---

```luau
local agent = Twill.Navigation.new(npc, nil, bag)

agent.Arrived:Connect(function(partial)
	print("there", partial)
end)

agent:GoTo(workspace.Target)
```

`PathfindingService` supplies the route. What it does not supply is anything that
keeps a hundred agents from costing a hundred times as much, and that is what
this module is: one loop advancing every agent, one budget bounding how many
routes are worked out at once, and a request that happens when something changes
rather than on a timer.

## Asking is not waiting

`GoTo` does not yield. It records the goal, takes its turn in the queue, and
answers through a signal.

```luau
agent:GoTo(target)          -- returns immediately

agent.Arrived:Connect(onThere)
agent.Failed:Connect(onGaveUp)
```

Asking again replaces whatever was asked before, however far along it was. The
abandoned request is dropped when it comes back rather than being allowed to race
the new one, so exactly one of the two ever reports.

## One budget for every agent

Working out a route costs more the more of them are already under way, which is
why a crowd of agents all wanting one at the same moment is the failure this
module exists to prevent.

Requests wait in a queue. At most four are worked out at once until you say
otherwise:

```luau
Twill.Navigation.SetBudget(8)
```

Nothing is dropped by the queue. A waiting agent keeps walking whatever route it
already had.

## A goal is answered against the ground

:::caution[The point you name is not the point that is routed to]
`PathfindingService` answers against the nearest place an agent can stand, so a
goal in the air or under the floor is reached on the ground beneath it rather
than refused.

`"unreachable"` therefore means no route to anywhere near the goal, **not** that
the point you named was unstandable. A goal five hundred studs below the map is
usually a perfectly ordinary walk to the floor above it.
:::

## Moving something that is not a humanoid

A model with a `Humanoid` needs no configuration. Anything else supplies its own
movement:

```luau
local drone = Twill.Navigation.new(model, {
	Move = function(position)
		alignPosition.Position = position
	end,
})
```

`Move` is called **repeatedly** while a waypoint is being approached, so it
states a destination rather than starting a journey. Nothing has to report back
that it finished, and there is no signal to fire: arrival is decided here, from
how near the agent actually is.

That is the whole contract. `Jump` is optional and only called for a waypoint
that asks for one.

## When an agent gives up

| Reason | What happened |
| --- | --- |
| `unreachable` | No route to anywhere near the goal. |
| `too far` | The goal is further than a route can be worked out to, so none was attempted. |
| `stuck` | It stopped getting nearer to the waypoint it was heading for. |
| `gone` | The model left the world mid-journey. |

**Stuck is measured as a lack of progress**, not as a clock against an expected
speed. An agent that has not closed the distance by half a stud for its whole
`Patience` has stopped travelling whatever it looks like, and that works the same
for a humanoid, a drone, and a rolling boulder without any of them being asked
how fast they are.

## Blocked routes answer themselves

A route is asked for again on its own when something appears across the part of
it still ahead.

Two guards keep that from becoming a flood: a blockage already **behind** the
agent is nothing to answer, and one that keeps appearing is answered no more
often than `Repath` allows.

Nothing is reported when this happens. A repath that succeeds is not an event
worth waking anybody for, and one that fails arrives as `Failed` like any other.

## Seeing a route

```luau
Twill.Navigation.new(npc, { Visualize = true })
```

Markers appear under a `TwillNavigation` folder, coloured for ordinary steps,
jumps, and the goal. They are taken down when the route ends.

The folder is made on the first ask, so a game that never visualizes anything has
nothing added to its world.

## API

### `Navigation.new`

`[Server]` | `[Client]`

Creates an agent that walks a model somewhere.

```luau
function Navigation.new(model: Model, options: Options?, owner: Scope.Bag?): Agent
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `model` | `Model` | What is being walked. No `PrimaryPart` is required. |
| `options` | `Options?` | Pathfinding parameters, custom movement, and the patience to spend on a waypoint. |
| `owner` | `Scope.Bag?` | The bag the agent belongs to. Nothing owns it when left out. |

**Returns**

`Agent` - An agent standing still, waiting for a goal.

Throws when given something other than a `Model`, when the model has no
`Humanoid` and no `Move` was given, and on an `Arrival`, `Repath`, or `Patience`
that is not a sensible number.

On a server the model's parts are taken into the server's own simulation, so
where it went is decided there rather than on somebody's machine. **A player's
own character is left alone**, since taking that would take their control with
it.

### Options

```luau
export type Options = {
	Agent: { [string]: any }?,
	Move: ((position: Vector3) -> ())?,
	Jump: (() -> ())?,
	Arrival: number?,
	Repath: number?,
	Patience: number?,
	Visualize: boolean?,
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `Agent` | none | Passed to `CreatePath` unchanged: `AgentRadius`, `AgentHeight`, `AgentCanJump`, `AgentCanClimb`, `WaypointSpacing`, `Costs`, `PathSettings`. |
| `Move` | the humanoid's | Called with where to go, repeatedly, while heading there. |
| `Jump` | the humanoid's | Called once for a waypoint that asks for a jump. |
| `Arrival` | 3 | How near, in studs, counts as having reached a waypoint. Keep it below `WaypointSpacing`. |
| `Repath` | 0.5 | Seconds between answering one blockage and the next. |
| `Patience` | 3 | Seconds without getting nearer before giving up. |
| `Visualize` | false | Whether to show the route. |

`PathfindingModifier` and `PathfindingLink` work as they always do; name them in
`Agent.Costs` and Roblox does the rest.

### `Agent:GoTo`

`[Server]` | `[Client]`

Sends the agent to a place.

```luau
function Agent:GoTo(target: Target)

export type Target = Vector3 | BasePart | Model
```

**Returns**

`()` - Nothing, and it does not yield. The outcome arrives through `Arrived` or
`Failed`.

Throws on a destroyed agent, and on a target that is none of the accepted shapes.

### `Agent:Stop`

`[Server]` | `[Client]`

Stops the agent where it stands and drops the route it was following.

```luau
function Agent:Stop()
```

**Returns**

`()` - Nothing.

Neither `Arrived` nor `Failed` follows, because nothing happened to the agent:
stopping is something the caller did. `Cancelled` fires, which is what a custom
`Move` listens to if it needs to unwind anything.

### `Agent:Destroy`

`[Server]` | `[Client]`

Releases everything the agent holds.

```luau
function Agent:Destroy()
```

**Returns**

`()` - Nothing. Safe to call more than once, and safe to leave to a
[`Scope`](/reference/scope/) bag, which is the usual way.

### Agent readings

| Field | Type | Meaning |
| --- | --- | --- |
| `Model` | `Model` | What is being walked. |
| `Goal` | `Target?` | What was last asked for. |
| `Route` | `{ PathWaypoint }` | The waypoints being followed. |
| `Index` | `number` | Which one it is heading for. Zero while standing still. |
| `Moving` | `boolean` | Whether it is travelling. |
| `Partial` | `boolean` | Whether the route stops short of the goal. |

:::caution[These are readings, not settings]
`Route` is the held list, not a copy. Writing into any of these changes what the
agent believes without changing where it goes. Steer with `GoTo` and `Stop`.
:::

`Partial` follows what the engine reports, and the engine only reports a route
that stops short where one was asked for through `Agent.PathSettings`. Where it
never reports one, `Partial` is simply always false and `Arrived` always carries
false with it.

A route is read as refused when the engine names one of the ways a search can
fail, and as usable otherwise. Testing it that way round means a route arriving
under some status this module was never told about is still walked, while an
empty one is still refused whatever it was called.

### Agent signals

```luau
Arrived: Signal<(partial: boolean) -> ()>
Failed: Signal<(reason: Reason) -> ()>
Cancelled: Signal<() -> ()>
```

| Signal | Fires when |
| --- | --- |
| `Arrived` | The last waypoint was reached. `partial` is true when the route stopped short of the goal. |
| `Failed` | The journey ended without arriving. See [the reasons](#when-an-agent-gives-up). |
| `Cancelled` | A goal was replaced, the agent was stopped, or it was destroyed. |

### `Navigation.SetBudget`

`[Server]` | `[Client]`

Sets how many routes may be worked out at once across every agent.

```luau
function Navigation.SetBudget(limit: number)
```

**Returns**

`()` - Nothing.

Throws when the limit is not a whole number of one or more. Four when never set.

### `Navigation.GetStats`

`[Server]` | `[Client]`

Returns what has been worked out and what is still waiting.

```luau
function Navigation.GetStats(): Stats

export type Stats = {
	Computed: number,
	Refused: number,
	Waiting: number,
	Working: number,
	Listed: number,
}
```

**Returns**

`Stats` - A snapshot, safe to keep. It does not follow later counting.

`Computed` and `Refused` are running totals for the life of the session.
`Waiting`, `Working`, and `Listed` are the queue, the requests under way, and the
agents in the loop right now. Read it twice a few seconds apart rather than once,
and set the budget against what you see.

## What this does not do

**No sharing of one route between units.** Fifty agents chasing the same player
work out fifty routes, bounded by the budget rather than combined. That is the
next thing to add if a wave-defence game needs it.

**No turning agents off by distance.** Whether an agent far from every player
should still be walking is a decision about your game, not about pathfinding.
Call `Stop` on it.

**No pooling of models, and no replication of its own.** What a client is told about an NPC
is [`Replication`](/reference/replication/)'s job, and sending a route id with a
progress number costs far less than sending positions.
