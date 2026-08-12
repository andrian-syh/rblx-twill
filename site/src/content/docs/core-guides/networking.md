---
title: Define and serve remotes
description: Declare a remote once, serve it with metering and validation, and reply safely.
---

## Declare

Both sides declare the same remote, in either order, and both get the same
packet.

```luau title="ReplicatedStorage/YourGame/Remotes.luau"
local Net = require("@game/ReplicatedStorage/Twill/Net")
local Packet = require("@game/ReplicatedStorage/Twill/Packages/Packet")

return {
	Emote = Net.Declare("Emote", { Packet.String }),
	BuyItem = Net.Declare("BuyItem", { Packet.String }, { Packet.Boolean8, Packet.String }),
}
```

The second array makes the packet reply to its caller.

Declaring the same name with different types is refused loudly, which is what
stops one caller from serialising through another's types.

## Serve

```luau title="server"
local Remotes = require(ReplicatedStorage.YourGame.Remotes)

function ShopService.Start()
	Twill.Net.Handle(Remotes.BuyItem, function(player, itemId)
		local data = Twill.Data.Get(player)
		if not data then
			return false, "not ready"
		end

		local price = Catalog[itemId].Price
		if data.Coins < price then
			return false, "not enough coins"
		end

		data.Coins -= price
		table.insert(data.Inventory, itemId)
		return true, "bought"
	end, {
		Rate = 4,
		Schema = { { "enum", table.unpack(Catalog.Ids) } },
		Reject = function()
			return false, "slow down"
		end,
	})
end
```

## Call

```luau title="client"
local bought, message = Remotes.BuyItem:Fire("sword")
```

:::caution[Do not fire while a module is still loading]
A client-declared packet receives its wire id from the server a moment later.
Fire from `Start` onwards.
:::

## The four layers of screening

Each one catches what the layer above cannot express. Use the highest one that
can answer the question.

### 1. Wire types

Packet enforces them at the wire level. A client that sends a number where a
string was declared never reaches your handler.

Types are free. Declare them precisely.

### 2. Rate

Always applied, whether or not you pass it.

```luau
Rate = 4          -- four calls a second
Rate = 0.25       -- one call every four seconds
```

Below one, it is a cooldown. Pick a number a real player cannot exceed and no
higher.

### 3. Schema

Ranges, lengths, and shapes, applied positionally to the arguments.

```luau
Schema = {
	{ "string", 1, 40 },
	{ "integer", 1, 99 },
}
```

See [`Schema`](/reference/schema/) for the rule language.

### 4. Validate

Everything else: ownership, game state, whether the shop is even open.

```luau
Validate = function(player, itemId)
	return Catalog[itemId] ~= nil and roundIsRunning
end
```

## Reject is mandatory for replies

A packet that replies must have a `Reject`, or the `Handle` itself is refused:

```text
'BuyItem' replies to the caller, so it needs a Reject option
```

Without one, a refused call leaves its caller waiting forever.

Return the same shape as a normal reply, so the caller has one thing to check:

```luau
Reject = function()
	return false, "slow down"
end
```

A packet that does not reply may omit it. Refused calls there are dropped.

## Restrict by rank

```luau
Twill.Net.Handle(Remotes.StartRound, onStartRound, {
	MinimumRank = Ranks.Moderator,
	Reject = function() return false end,
})
```

Checked on the server. Hiding the button on the client is a courtesy, and
[`Authorization`](/reference/authorization/) is safe to read there for exactly
that purpose.

## Audit what a client can send

```luau
for name, signature in Twill.Net.List() do
	print(name, signature)
end
```

Every declared remote is reachable by any client. This is the list of your
game's attack surface, and it is worth reading occasionally.

## Do not send state over remotes

A remote is for an action a client is asking to take. For server state a client
should see, use [`Replication`](/reference/replication/), which diffs and
batches, and which a client cannot request from.
