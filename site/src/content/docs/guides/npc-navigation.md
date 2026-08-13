---
title: Walk NPCs around the world
description: Drive one agent, then chase a moving target, then do it for a hundred without the server noticing.
---

## One agent

An agent wraps a model. Give it a bag and its cleanup is somebody else's problem.

```luau title="ServerScriptService/Services/GuardService"
local Twill = require("@game/ReplicatedStorage/Twill")

local GuardService = {}

function GuardService.Start()
	local guard = workspace.Guard

	local agent = Twill.Navigation.new(guard, nil, Twill.Scope.Framework())

	agent.Arrived:Connect(function()
		agent:GoTo(pickAPost())
	end)

	agent.Failed:Connect(function(reason)
		Twill.Log.new("Guard"):Warn(`gave up: {reason}`)
		agent:GoTo(pickAPost())
	end)

	agent:GoTo(pickAPost())
end

return GuardService
```

A model with a `Humanoid` needs no configuration at all. The agent uses its
walking and its jumping.

## Chase something that moves

The wrong way is to ask for a route every frame. Working one out is expensive,
and a target that shifted two studs does not need a new one.

Ask again when the goal has actually moved:

```luau
local REPLAN_DISTANCE = 12

local function chase(agent, target: Model, trove)
	local asked = nil

	Twill.Loop.Every(0.5, function()
		local at = target:GetPivot().Position

		if asked and (at - asked).Magnitude < REPLAN_DISTANCE then
			return
		end

		asked = at
		agent:GoTo(at)
	end, trove)
end
```

Half a second, not every frame, and only when the target has left the area the
last route was aimed at. A hundred agents doing this is a hundred cheap distance
checks and very few routes.

:::tip[A moving target can be given directly]
`GoTo` accepts a `Model` or a `BasePart`, and reads its position at the moment
the route is worked out. That is enough for a target that strolls. The pattern
above is for one that runs.
:::

## Clean up by giving it a bag

```luau
function CombatService.OnPlayerReady(player, data, trove)
	local pet = spawnPet(player)

	-- Closes when they leave, which takes the agent with it.
	Twill.Navigation.new(pet, nil, trove)
end
```

An agent in a bag is destroyed when the bag closes: its loop entry, its
connections, its `Path`, and any markers it was showing. There is no teardown to
write.

For an NPC that belongs to a round rather than a player, use the round's own
trove. For one that lives as long as the server, use
[`Scope.Framework()`](/reference/scope/#scopeframework).

## Something that is not a humanoid

Supply a `Move`. It is called with a destination, repeatedly, while the agent is
heading there, so it states where to go rather than starting a journey.

```luau
local mover = Instance.new("AlignPosition")
mover.Mode = Enum.PositionAlignmentMode.OneAttachment
mover.Attachment0 = drone.PrimaryPart.Attachment
mover.Parent = drone.PrimaryPart

Twill.Navigation.new(drone, {
	Agent = { AgentCanJump = false },
	Move = function(position)
		mover.Position = position
	end,
}, trove)
```

Nothing has to report that a move finished. Arrival is decided from how near the
model actually is, which is the same test for every kind of agent.

## Cross ground you would rather avoid

Pathfinding costs are passed straight through. Label the parts, price the labels,
and routes bend around them.

```luau
Twill.Navigation.new(npc, {
	Agent = {
		AgentRadius = 3,
		AgentCanClimb = true,
		Costs = {
			Water = 20,
			Lava = math.huge,
			SafePath = 0.5,
		},
	},
})
```

`Water` and `Lava` are materials. `SafePath` is whatever you named a
`PathfindingModifier`. A cost of `math.huge` is avoided unless there is no other
way at all.

## A hundred of them

Two numbers matter, and both are read rather than guessed.

```luau
local stats = Twill.Navigation.GetStats()
print(stats.Waiting, stats.Working, stats.Listed)
```

`Waiting` climbing and staying high means agents are asking for routes faster
than the budget allows. Either raise it:

```luau
Twill.Navigation.SetBudget(8)
```

or, better, ask for fewer: widen the replan distance, lengthen the interval, and
stop agents nobody is near.

```luau
-- Whether a far-away NPC should still be walking is a decision about your
-- game, so the module does not make it for you.
if (npcAt - nearestPlayer).Magnitude > 250 then
	agent:Stop()
end
```

Raising the budget makes the server work harder. Asking for fewer routes makes it
work less. Reach for the second one first.

## What the client should be told

Nothing, by default. The server walks the model and Roblox replicates the parts.

Where a client needs to know something about the journey rather than the body,
publish that rather than positions:

```luau
Twill.Replication.SetFor(player, "Pet", {
	State = "following",
	Distance = math.floor(distance),
})
```

Sending a state and a number costs a fraction of sending a position every frame,
and it is the thing the interface actually wanted.

## Next

- [`Navigation`](/reference/navigation/) carries every option and signal.
- [Spread work across frames](/guides/frame-budget/) is the same problem for work
  that is not pathfinding.
- [Clean up connections and instances](/core-guides/cleanup-and-lifetimes/)
  covers the bags an agent belongs in.
