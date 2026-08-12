---
title: Build interfaces from data
description: Describe a screen as a table, build it in one pass, and follow state without a view layer.
---

Building UI by hand produces the same forty lines every time: create, set six
properties, parent, repeat, then hunt for the label again later with a chain of
`FindFirstChild`.

[`Tree`](/reference/tree/) takes the description instead. You write what the
screen **is**, get back the pieces you named, and bind them to state yourself.

This is deliberately not a view layer. Twill has no reconciliation and no state
binding of its own; what it has is a builder and a subscription, which together
cover most of a HUD without bringing in a framework.

## Describe it

```luau
local root, refs = Twill.Tree.Build({
	ClassName = "Frame",
	Name = "CoinCounter",
	Size = UDim2.fromOffset(200, 44),
	BackgroundTransparency = 0.3,

	Children = {
		{
			ClassName = "UICorner",
			CornerRadius = UDim.new(0, 8),
		},
		{
			ClassName = "TextLabel",
			-- Named, so it can be reached later without searching for it.
			Ref = "Amount",
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			Text = "0",
		},
	},
}, playerGui)

refs.Amount.Text = "ready"
```

Any key that is not one of the six reserved names is written as a property, so a
spec reads like the instance it becomes.

## Follow state

A `Ref` plus a subscription is the whole binding.

```luau title="ReplicatedStorage/Client/HudController"
local Twill = require("@game/ReplicatedStorage/Twill")

local HudController = {}

function HudController.Start()
	local root, refs = Twill.Tree.Build(HUD_SPEC, playerGui)

	-- Fires once immediately if the value is already known, so there is no
	-- separate "draw the initial state" step.
	Twill.Replication.Subscribe("Data.Coins", function(coins)
		refs.Amount.Text = Twill.Format.Comma(coins or 0)
	end)
end

return HudController
```

Nothing publishes coins here. A field named in `Data.Configure` does it, and the
label follows the server's own write.

## Handle input

`Events` connects signals by name, after the properties are written.

```luau
{
	ClassName = "TextButton",
	Text = "Buy",
	Events = {
		Activated = function()
			local bought, message = Remotes.BuyItem:Fire("sword")

			if not bought then
				showToast(message)
			end
		end,
	},
}
```

:::note[Initial writes never fire your handlers]
Properties and attributes are set before anything is connected, so a
`GetPropertyChangedSignal` handler passed through `Events` hears only the changes
you make afterwards, not the ones the build itself performed.

Children are built after the events connect, so a handler that could fire
immediately should not assume the rest of the tree exists yet.
:::

## Reuse a spec

A spec is data, so it can be a function of its input and built as many times as
you need.

```luau
local function slotSpec(index: number)
	return {
		ClassName = "Frame",
		Name = `Slot{index}`,
		LayoutOrder = index,
		Size = UDim2.fromOffset(64, 64),

		Children = {
			{ ClassName = "TextLabel", Ref = `Label{index}`, Text = "" },
		},
	}
end

for index = 1, 9 do
	Twill.Tree.Build(slotSpec(index), inventoryFrame)
end
```

:::tip[Refs come from the whole tree, so keep them unique]
`Build` collects every `Ref` at any depth into one flat table. Two instances
asking for the same name means the later one wins and the earlier one becomes
unreachable. Where a spec is built repeatedly, put the index in the name, as
above.
:::

## Clean up

`Events` connections are not owned by a bag. Destroying the root disconnects
them, which for UI under a `PlayerGui` is enough, because Roblox removes it with
the player.

Anything longer-lived, or anything parented into the world, belongs in a
[`Scope`](/reference/scope/) bag:

```luau
local root = Twill.Tree.Build(spec, workspace)

-- Goes when the player does, connections and all.
trove:Add(root)
```

Subscriptions are separate and need the same treatment:

```luau
trove:Add(Twill.Replication.Subscribe("Data.Coins", onCoins))
```

## When to bring a UI library

`Tree` builds once. It does not re-render when your state moves, and it keeps no
view state.

That is fine for a HUD, where a handful of labels follow a handful of values. It
stops being fine when the **shape** of the screen depends on state: a list whose
length changes, a panel that swaps layouts, anything you would otherwise rebuild
by destroying and recreating.

At that point reach for a reactive library. Twill has no opinion and no
integration to get in the way, and you can keep using it for everything that is
not the view.
