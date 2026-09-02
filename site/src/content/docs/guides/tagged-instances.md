---
title: Bind behaviour to tagged instances
description: Attach code to instances by tag, so moving or renaming a folder cannot break it
---

A killbrick needs code. So does every door, every checkpoint, every vendor. The
usual way to find them is to walk a folder, which quietly makes your folder
structure part of your game logic. Rename `Workspace.Map.Hazards` and something
stops working, in a place nowhere near the rename.

Tags remove that coupling. [`Watch`](/reference/watch/) follows a set of tagged
instances as it changes and hands each one its own cleanup bag, so behaviour
binds to *what a thing is* rather than to where somebody filed it.

## Follow a tag

```luau
function HazardService.Start()
	Twill.Watch.Tagged("Killbrick", function(part, bag)
		-- Runs once per tagged instance, including everything already tagged
		-- before this line ran.
		bag:Connect(part.Touched, function(hit)
			local humanoid = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")

			if humanoid then
				humanoid.Health = 0
			end
		end)
	end)
end
```

The second argument is a bag belonging to that instance. It closes the moment
the instance loses the tag or leaves the game, so nothing bound to it has to be
unbound by hand.

Add the tag in Studio's Tag Editor, or from code:

```luau
CollectionService:AddTag(part, "Killbrick")
```

## Why not sweep the folder yourself

`Watch` guarantees one thing that is easy to get wrong:

> connect first, then sweep what is already there, and never call twice

Sweeping first misses anything that arrives while the sweep runs. Connecting
first without remembering what was seen calls twice for anything that arrives
during it. Neither failure shows up in a quiet test place; both show up on a
full server.

`PlayerAdded` is a deferred event, which makes that window wide enough to hit
rather than theoretical. Twill has already shipped that bug once, which is why
the guarantee is written into the module rather than left to each caller.

## The three sets

All three take the same callback and give the same guarantee.

| Call | Follows |
| --- | --- |
| `Watch.Tagged(tag, onAdded, owner?)` | Everything carrying a tag. |
| `Watch.Players(onAdded, owner?)` | Everyone on the server. |
| `Watch.Children(parent, onAdded, owner?)` | Direct children of one instance. |

`Watch.Players` is for systems that are not services and therefore never receive
`OnPlayerReady`. Inside a service, prefer the hook: it waits for the player's
data, which `Watch.Players` does not.

## Configure per instance with attributes

Tags say what something is. Attributes say how that particular one behaves. The
pair covers most of what a configuration folder used to do, and travels with the
instance.

```luau
Twill.Watch.Tagged("Vendor", function(vendor, bag)
	-- Read once, with a sensible default when the builder did not set one.
	local stock = vendor:GetAttribute("Stock") or "general"

	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = `Browse {stock}`
	prompt.Parent = vendor

	-- Put it in the bag so the prompt goes when the vendor does.
	bag:Add(prompt)
	bag:Connect(prompt.Triggered, function(player)
		openShop(player, stock)
	end)

	-- Follow the attribute if a live edit should take effect.
	bag:Connect(vendor:GetAttributeChangedSignal("Stock"), function()
		stock = vendor:GetAttribute("Stock") or "general"
	end)
end)
```

## Who owns the binding

The binding itself is a thing that must be cleaned up, separately from the
per-instance bags.

```luau
-- Belongs to the session. Correct for a system that runs for the whole game.
Twill.Watch.Tagged("Killbrick", onKillbrick)

-- Belongs to one player. Ends when they leave, and closes every bag it opened.
function ArenaService.OnPlayerReady(player, data, bag)
	Twill.Watch.Tagged("ArenaDoor", onDoor, bag)
end
```

Left out, the binding goes to `Scope.Framework()`, because nothing in Twill
starts a connection nobody owns.

A tag binding set up inside `OnPlayerReady` runs its callback again for every
player, so ten players means ten `Touched` connections on the same killbrick.
Bind server-wide behaviour in `Start`, and use the player bag only for bindings
that genuinely belong to one player.

## Untagging is the off switch

Because the bag closes when the tag goes, removing a tag disables that instance
completely, with no bookkeeping of your own:

```luau
-- Every connection made for this part is released.
CollectionService:RemoveTag(part, "Killbrick")
```

That makes tags a reasonable way to disable hazards between rounds, or to hand a
builder a switch they can flip without touching code.
