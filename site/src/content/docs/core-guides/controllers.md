---
title: Write a controller
description: The client-side unit, what it may assume, and how it receives state without asking for it.
---

A **controller** is a client-side `ModuleScript` that returns a table. It is the
same shape as a [service](/core-guides/services/), booted by the same
[`Lifecycle`](/reference/lifecycle/), and the two words exist only so it is
always clear which side a module runs on.

```luau title="ReplicatedStorage/Client/HudController"
local HudController = {}

function HudController.Start()
	print("client booted")
end

return HudController
```

## Booting the client

The client needs its own `Start` call, pointed at its own folder. One
`LocalScript` does it.

```luau title="StarterPlayerScripts/Client"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Lifecycle.Start(ReplicatedStorage.Client)
```

Controllers live where a client can reach them, which means `ReplicatedStorage`
or `StarterPlayerScripts`. Nothing a controller can read is private, so treat
everything in it as published.

## What the client gets, and what it does not

`Lifecycle` behaves the same on both sides with one exception.

| | Service (server) | Controller (client) |
| --- | --- | --- |
| Discovery, `Priority`, `Critical` | Yes | Yes |
| `Init` then `Start` | Yes | Yes |
| `OnPlayerReady` / `OnPlayerRemoving` | Yes | **No** |

The player pipeline is server-only on purpose. On a client, `PlayerAdded` means
somebody *else* joined, so a per-player hook there would mean something entirely
different from what it means on the server. Each side also keeps its own boot
list, so a folder given to one is invisible to the other.

For the local player, use `Players.LocalPlayer` in `Start`, and wait on state
rather than on the player.

## Receiving state

A controller never asks the server for anything. There is no such call. Values
arrive because the server decided to publish them, and
[`Replication`](/reference/replication/) delivers them.

```luau title="ReplicatedStorage/Client/HudController"
local Twill = require("@game/ReplicatedStorage/Twill")

local HudController = {}

function HudController.Start()
	local coinLabel = getCoinLabel()

	-- Runs once immediately if the value is already known, then on every
	-- change. There is no separate "read the current value" step.
	Twill.Replication.Subscribe("Data.Coins", function(coins)
		coinLabel.Text = Twill.Format.Comma(coins or 0)
	end)
end

return HudController
```

Nothing in the shop code publishes coins. A field named once in `Data.Configure`
is doing it, following the server's `data.Coins -= price` on its own.

:::note[Require Replication somewhere on the client]
The client announces itself the first time its half of the module is required.
If no client module ever requires it, the server has nothing to send to and the
controller waits forever for a value that was never addressed to it.
:::

### Waiting instead of subscribing

Where a controller cannot draw anything until a value exists, wait for it. This
yields, so it belongs in `Start`, never at the top level of a module.

```luau
function HudController.Start()
	local loadout, arrived = Twill.Replication.WaitFor("Data.Loadout", 15)

	if not arrived then
		Twill.Log.new("Hud"):Warn("loadout never arrived; drawing the empty state")
		return
	end

	draw(loadout)
end
```

## Cleaning up

A controller has no player bag handed to it, because on the client there is only
ever one player and their lifetime is the session's.

Use [`Scope`](/reference/scope/) directly. For anything tied to the character,
the choice of bag is the whole decision:

```luau
local Twill = require("@game/ReplicatedStorage/Twill")

local function onCharacterAdded(character: Model)
	-- Stops the instant they die.
	Twill.Scope.Alive(character):Connect(RunService.RenderStepped, updateCrosshair)

	-- Survives the death, so a ragdoll effect can still finish.
	Twill.Scope.Character(character):Add(spawnDeathEffect)
end
```

Long-lived work that belongs to the session goes in `Scope.Framework()`.

## Calling the server

Declare the packet in a module both sides require, then fire it from a
controller.

```luau title="ReplicatedStorage/Shared/Remotes"
local Net = require("@game/ReplicatedStorage/Twill/Net")
local Packet = require("@game/ReplicatedStorage/Twill/Packages/Packet")

return {
	BuyItem = Net.Declare("BuyItem", { Packet.String }, { Packet.Boolean8, Packet.String }),
}
```

```luau title="ReplicatedStorage/Client/ShopController"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Shared.Remotes)

local ShopController = {}

function ShopController.Start()
	buyButton.Activated:Connect(function()
		-- The packet replies, so this waits for the server's answer.
		local bought, message = Remotes.BuyItem:Fire("sword")

		if not bought then
			showToast(message)
		end
	end)
end

return ShopController
```

:::caution[Never fire while a module is still loading]
A packet declared on the client is given its wire id by the server, and that
arrives a moment later. Fire from a callback or from `Start`, never at the top
level of a module.
:::

## What a controller must never decide

The client renders and requests. It does not rule.

Reading a rank on the client is fine, and it is the right way to avoid showing a
button that would only be refused:

```luau
if Twill.Authorization.AtLeast(player, Ranks.Moderator) then
	moderatorPanel.Visible = true
end
```

That decides what is **shown**. What is **allowed** is decided again on the
server, by `MinimumRank` on the handler, because a hidden button is not a closed
door. Anyone can fire the packet directly.

## Next

- [Replicate state to clients](/core-guides/replicating-state/) is the server
  side of everything above.
- [Define and serve remotes](/core-guides/networking/) covers what happens to a
  call after it leaves a controller.
- [Clean up connections and instances](/core-guides/cleanup-and-lifetimes/) is
  the one to read before your first long-lived system.
