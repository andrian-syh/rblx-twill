---
title: Write a service
description: The shape of a service, what belongs in each boot phase, and how a player reaches it.
---

A **service** is a server-side `ModuleScript` that returns a table. That is the
whole contract. [`Lifecycle`](/reference/lifecycle/) finds it, boots it in an
order you control, and hands it each player once their data exists.

Its client-side counterpart is a [controller](/core-guides/controllers/). The
module shape is identical and the same `Lifecycle` boots both; the two words
exist so it is always clear which side a module runs on.

Every field is optional, so this is already a complete service:

```luau title="ServerScriptService/Services/WelcomeService"
local WelcomeService = {}

function WelcomeService.OnPlayerReady(player, data)
	print(`{player.Name} arrived`)
end

return WelcomeService
```

## Where services live

`Lifecycle.Start` takes the folder to search. Only **direct children** are taken,
and each must be a `ModuleScript` returning a table.

```text
ServerScriptService
├── TwillServer
├── Services
│   ├── ShopService
│   ├── CombatService
│   └── shopCatalog        (a plain data module, ignored: returns no service)
└── Main
```

Nesting a folder inside `Services` does not extend the search. Twill warns rather
than boot what it never found, so pass the inner folder to `Start` as well:

```luau
Twill.Lifecycle.Start({
	ServerScriptService.Services,
	ServerScriptService.Systems,
})
```

## The full shape

```luau
local ShopService = {}

ShopService.Priority = 10        -- lower boots first; ties break by name
ShopService.Critical = true      -- a failed boot here refuses every player

function ShopService.Init() end
function ShopService.Start() end
function ShopService.OnPlayerReady(player, data, trove) end
function ShopService.OnPlayerRemoving(player) end

return ShopService
```

Hooks are called dot-style, so none of them receives `self`. Write
`function ShopService.Start()`, not `function ShopService:Start()`.

## Init or Start

This is the one distinction worth learning properly, because getting it wrong
produces a bug that only appears when boot order changes.

| | `Init` | `Start` |
| --- | --- | --- |
| Runs | Sequentially, for every service | After **every** `Init` has finished |
| Put here | Your own state, your own configuration | Connections, loops, calls to other services |
| Reaching another service | Not safe. It may not be set up yet | Safe |

```luau
function ShopService.Init()
	-- Only this service's own state.
	ShopService.stock = {}
end

function ShopService.Start()
	-- Everything that reaches outward waits until here.
	Twill.Net.Handle(Remotes.BuyItem, onBuy, { Rate = 2, Reject = refuse })

	local combat = Twill.Lifecycle.Get("CombatService")
	combat.RegisterShop(ShopService)
end
```

:::caution[`Start` hooks run apart from each other]
Each one runs on its own thread, so a service that yields in `Start` does not
hold up the rest. Boot order decides when a `Start` **begins**, never the order
in which they finish. Do not write a `Start` that assumes another service's
`Start` has already returned; if you need that guarantee, have the later one ask
for what it needs rather than assume it exists.
:::

## Configuration comes before `Start`

`Start` is what begins letting players through, so anything the framework itself
needs must already be set.

```luau title="ServerScriptService/Main"
local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Data.Configure({ Store = "PlayerData", Template = { Coins = 100 } })
Twill.Authorization.Configure({ Default = 10, Users = { [1] = 100 } })
Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)

Twill.Lifecycle.Start(script.Parent.Services)
```

## Receiving a player

`OnPlayerReady` runs once per player, after the gate has released them. It
receives three things:

```luau
function ShopService.OnPlayerReady(player, data, trove)
	-- 1. the player
	-- 2. whatever the gate released, which with Data.Gate is their live profile
	data.Visits += 1

	-- 3. a bag that closes when they leave, so this is never left behind
	trove:Connect(player.Chatted, onChatted)
end
```

The third argument is why most services never touch [`Scope`](/reference/scope/)
directly. Anything you put in that bag is released when the player leaves,
whether they left cleanly or the server is shutting down.

`OnPlayerRemoving` runs in **reverse** boot order, so a service still sees the
ones it was allowed to depend on. The bag closes only after every service has had
its say, which means you can still read your own state there.

:::note[A player who never arrived never leaves]
`OnPlayerRemoving` fires only for players who reached ready. Someone who
disconnected while still waiting at the gate was never announced, so no service
has state to unwind for them.
:::

## A service that guards a remote

Putting it together. The handler is a plain local function, and `Start` is where
it gets served.

```luau title="ServerScriptService/Services/ShopService"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Twill = require("@game/ReplicatedStorage/Twill")
local Remotes = require(ReplicatedStorage.Shared.Remotes)

local ShopService = {}

local CATALOG = {
	sword = 50,
	shield = 75,
	potion = 10,
}

-- Receives the firing player first. By the time this runs, the call has already
-- cleared the rate limit and the schema, so what is left is the game's own rules.
local function onBuy(player: Player, itemId: string): (boolean, string)
	local price = CATALOG[itemId]
	if not price then
		return false, "no such item"
	end

	-- Nil means their session is not open, which is every moment before they
	-- are released and after they leave.
	local data = Twill.Data.Get(player)
	if not data then
		return false, "not ready"
	end

	if data.Coins < price then
		return false, "not enough coins"
	end

	-- Mutating the live profile is the whole write. There is no commit step.
	data.Coins -= price
	table.insert(data.Inventory, itemId)

	return true, `bought {itemId}`
end

function ShopService.Start()
	Twill.Net.Handle(Remotes.BuyItem, onBuy, {
		-- Two calls a second per player. Metering applies whether or not this
		-- line is here, so it is a choice of number, not a choice to have one.
		Rate = 2,

		-- Packet already guarantees the type. This bounds the length, which a
		-- wire type cannot express.
		Schema = { { "string", 1, 20 } },

		-- Required, because the packet replies. Without it a refused caller
		-- would wait forever, so Twill refuses to serve the packet at all.
		Reject = function()
			return false, "slow down"
		end,
	})
end

return ShopService
```

## Failing loudly

Mark a service `Critical` when the game is not worth playing without it.

```luau
ShopService.Critical = true
```

A critical service that throws in `Init` or `Start` locks the server: everyone
present is kicked, everyone arriving afterwards is kicked on sight, and the
reason reaches both the kick message and `Lifecycle.GetFailure()`.

A service that is not critical is logged and the boot carries on. Choose
deliberately. A shop that fails to boot is an annoyance; a data layer that fails
to boot is a save file about to be overwritten with a fresh template.

## Next

- [Write a controller](/core-guides/controllers/) is the same module shape on the
  client.
- [Define and serve remotes](/core-guides/networking/) covers validation, rank
  gating, and auditing what a client can send.
- [Store and save player data](/core-guides/player-data/) covers migrations,
  branches, and writing to players who are not here.
