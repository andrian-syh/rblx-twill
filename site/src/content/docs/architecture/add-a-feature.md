---
title: Add a feature
description: Build one feature in a Weave project, from the state it owns to a two-client playtest
---

This guide builds a Shop feature: a player
walks up to a counter, triggers a prompt, and buys an item with coins. Follow
the same eight steps for any feature.

It applies to a project that already has the [folder map](/architecture/folder-map/)
and Twill installed.

## 1. Name the state and its owner

Write down what the feature saves, and which entry writes it.

| Field | Owner | Why |
| :--- | :--- | :--- |
| `Coins` | `CoinService` | Other features spend coins too, so coins have their own owner. |
| `Items` | `ShopService` | Only the shop grants items. |

If a field already has an owner, the feature calls that owner and does not write
the field. That is [R6](/architecture/rules/#r6-one-owner-writes-each-piece-of-saved-state).

## 2. Declare what a client may ask

One module per feature, in `Shared/Remotes`. Use the narrowest type that fits.

```luau title="ReplicatedStorage/Shared/Remotes/Shop"
--[[
	Everything a client may ask of the shop. Both sides require this module.
]]
local Net = require("@game/ReplicatedStorage/Twill/Net")
local Types = Net.Types

return {
	BuyItem = Net.Declare("BuyItem", { Types.String(32) }, { Types.Boolean, Types.String(64) }),
}
```

The client sends an item id of at most 32 characters. The server answers with a
boolean and a message of at most 64. The client names what it wants and nothing
about the price.

## 3. Add the public definitions

```luau title="ReplicatedStorage/Shared/ShopCatalog"
--[[
	The items the shop sells, by id. Clients read this, so nothing here is secret.
]]
return {
	Potion = { Price = 10 },
	Shield = { Price = 40 },
	Sword = { Price = 50 },
}
```

Adding an item to the game is one line here, and no script changes.

## 4. Add the saved fields

```luau title="ServerScriptService/Modules/PlayerData"
--[[
	The saved shape of a player and the fields their own client may see.
	Each field has one owner, and only the owner writes it.

	Coins is owned by CoinService. Items is owned by ShopService.
]]
return {
	Store = "PlayerData",
	Version = 1,
	Template = {
		Coins = 100,
		Items = {},
	},
	Replicate = { "Coins", "Items" },
}
```

`Replicate` lists the fields a player's own client receives. `Main` passes this
table to `Data.Configure`, in place of the table the quick start wrote inline:

```luau title="ServerScriptService/Main"
-- // VARIABLES // --

-- [ Services ] --
local ServerScriptService = game:GetService("ServerScriptService")

-- [ Modules ] --
local Twill = require("@game/ServerScriptService/Twill")
local PlayerData = require(ServerScriptService.Modules.PlayerData)

-- // INITIALIZATION // --

Twill.Data.Configure(PlayerData)
Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)
Twill.Lifecycle.Start(ServerScriptService.Services)
```

## 5. Write the owner of the coins

```luau title="ServerScriptService/Services/CoinService"
-- // VARIABLES // --

-- [ Modules ] --
local Twill = require("@game/ServerScriptService/Twill")

local CoinService = {}

-- // FUNCTIONS // --

--[[
	Takes coins from a player. Nothing changes when the player cannot pay.

	@param player Player -- The player who pays
	@param amount number -- A whole number of coins, zero or more
	@return boolean -- True when the coins were taken
]]
function CoinService.Spend(player: Player, amount: number): boolean
	if amount ~= amount or amount < 0 or amount % 1 ~= 0 then
		return false
	end

	local data = Twill.Data.Get(player)
	if not data or data.Coins < amount then
		return false
	end

	data.Coins -= amount
	return true
end

-- // INITIALIZATION // --

return CoinService
```

`Spend` is the only function in the project that lowers `Coins`. It refuses an
amount that is negative, fractional, or not a number, so no caller can turn a
purchase into a grant.

## 6. Write the shop

The price rule is private to the server. A client that could read it could
compute the cheapest order to buy in, so it lives under `Modules`.

```luau title="ServerScriptService/Modules/Shop/Pricing"
-- // VARIABLES // --

-- [ Configuration ] --
local REPEAT_GROWTH = 0.1

local Pricing = {}

-- // FUNCTIONS // --

--[[
	Returns what the next copy of an item costs a player who holds the given items.

	@param basePrice number -- The catalogue price of the item
	@param held {string} -- The item ids the player holds
	@param itemId string -- The item being priced
	@return number -- The whole price to charge
]]
function Pricing.Quote(basePrice: number, held: { string }, itemId: string): number
	local copies = 0
	for _, heldId in held do
		if heldId == itemId then
			copies += 1
		end
	end

	return math.floor(basePrice * (1 + copies * REPEAT_GROWTH))
end

-- // INITIALIZATION // --

return Pricing
```

`Pricing.Quote` takes plain values and returns a number. It calls no service, so
it can be tested with a table and an assertion.

```luau title="ServerScriptService/Services/ShopService"
-- // VARIABLES // --

-- [ Services ] --
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

-- [ Modules ] --
local Twill = require("@game/ServerScriptService/Twill")
local Pricing = require(ServerScriptService.Modules.Shop.Pricing)
local Remotes = require(ReplicatedStorage.Shared.Remotes.Shop)
local ShopCatalog = require(ReplicatedStorage.Shared.ShopCatalog)

-- [ Configuration ] --
local MAX_ITEMS = 200
local BUYS_PER_SECOND = 2

-- [ State Management ] --
local CoinService: typeof(require(script.Parent.CoinService))

local ShopService = {}

-- // FUNCTIONS // --

--[[
	Answers a caller who was refused before the purchase was looked at.

	@return boolean -- Always false
	@return string -- The reason shown to the player
]]
local function refuse(): (boolean, string)
	return false, "slow down"
end

--[[
	Sells one item to a player who asked for it.

	@param player Player -- The player who asked
	@param itemId string -- The item they named
	@return boolean -- True when the item was sold
	@return string -- What happened, for the player to read
]]
local function onBuy(player: Player, itemId: string): (boolean, string)
	local item = ShopCatalog[itemId]
	if not item then
		return false, "no such item"
	end

	local data = Twill.Data.Get(player)
	if not data then
		return false, "not ready"
	end

	if #data.Items >= MAX_ITEMS then
		return false, "no room"
	end

	local price = Pricing.Quote(item.Price, data.Items, itemId)
	if not CoinService.Spend(player, price) then
		return false, "not enough coins"
	end

	table.insert(data.Items, itemId)
	return true, `bought {itemId} for {price}`
end

--[[
	Opens the shop to requests from clients.
]]
function ShopService.Start()
	CoinService = Twill.Lifecycle.Get("CoinService")

	Twill.Net.Handle(Remotes.BuyItem, onBuy, {
		Rate = BUYS_PER_SECOND,
		Schema = { { "string", 1, 32 } },
		Reject = refuse,
	})
end

-- // INITIALIZATION // --

return ShopService
```

What the entry shows:

- `CoinService` is fetched in `Start`, with its type declared above. That is
  [R5](/architecture/rules/#r5-entries-never-require-each-other).
- The handler checks the item, the session, and the room before it spends.
  Nothing yields between `Spend` and the insert, so the two stay together.
- `Rate` and `Schema` refuse a flood and an empty id before the handler runs.

## 7. Write the controller

```luau title="ReplicatedStorage/Client/Modules/Shop/ShopView"
-- // VARIABLES // --

local ShopView = {}

-- // FUNCTIONS // --

--[[
	Returns the line that tells a player how many coins they hold.

	@param coins number? -- The player's coins, or nil before they arrive
	@return string -- The line to show
]]
function ShopView.Describe(coins: number?): string
	return `Coins: {coins or 0}`
end

-- // INITIALIZATION // --

return ShopView
```

```luau title="ReplicatedStorage/Client/Controllers/ShopController"
-- // VARIABLES // --

-- [ Services ] --
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- [ Modules ] --
local Twill = require("@game/ReplicatedStorage/Twill")
local Remotes = require(ReplicatedStorage.Shared.Remotes.Shop)
local ShopView = require(ReplicatedStorage.Client.Modules.Shop.ShopView)

-- [ Configuration ] --
local PROMPT_TAG = "ShopPrompt"
local ITEM_ATTRIBUTE = "ItemId"

local ShopController = {}

-- // FUNCTIONS // --

--[[
	Shows the player's coins each time the server sends a different amount.

	@param coins number? -- The amount the server sent
]]
local function onCoinsChanged(coins: number?)
	print(ShopView.Describe(coins))
end

--[[
	Asks the server to sell one item to this player, then shows the answer.

	@param itemId string -- An id from the shop catalogue
]]
local function buy(itemId: string)
	local _, message = Remotes.BuyItem:Ask(itemId)
	print(message or "the shop did not answer")
end

--[[
	Makes one prompt in the world ask for the item it names.

	@param prompt Instance -- The tagged instance
	@param bag any -- Closes when the instance leaves or loses its tag
]]
local function onPromptAdded(prompt: Instance, bag: any)
	local itemId = prompt:GetAttribute(ITEM_ATTRIBUTE)
	if not prompt:IsA("ProximityPrompt") or type(itemId) ~= "string" then
		return
	end

	bag:Connect(prompt.Triggered, function()
		buy(itemId)
	end)
end

--[[
	Begins following the state the shop shows and the prompts that sell.
]]
function ShopController.Start()
	Twill.Replication.Subscribe("Data.Coins", onCoinsChanged)
	Twill.Watch.Tagged(PROMPT_TAG, onPromptAdded)
end

-- // INITIALIZATION // --

return ShopController
```

The controller decides nothing. It shows the coins the server publishes and
sends the id written on the prompt. A player who edits that id sends an id the
server looks up for itself.

The connection to `Triggered` goes into the bag `Watch.Tagged` supplies, so it
ends when the prompt leaves the game or loses its tag.

## 8. Bind the world, check, and play

1. Add a `ProximityPrompt` to a part in `Workspace`.
2. Give the prompt the tag `ShopPrompt` and a string attribute `ItemId` with the
   value `Potion`.
3. Add the tag and the attribute to the world contract in `README`.
4. Run the [check](/architecture/check-a-project/). It reports no findings.
5. In the **Test** tab, start a local server with two players.

Each client prints its own coins, then the answer when its player triggers the
prompt:

```text
Coins: 100
bought Potion for 10
Coins: 90
bought Potion for 11
Coins: 79
```

The second potion costs more because `Pricing` counts the copies held. One
player buying does not change what the other player sees.

## What was not edited

`Client`, and every file of every other feature. `Main` changed once, to read
the data shape from `PlayerData`, and stays as it is for every later feature.
`PlayerData` is the one shared file a feature with saved state adds lines to.
