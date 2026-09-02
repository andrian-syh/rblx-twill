---
title: Define and serve remotes
description: Declare a remote once, serve it with metering and validation, and reply safely
---

## Declare

Both sides declare the same remote, in either order, and both get the same
handle.

```luau title="ReplicatedStorage/YourGame/Remotes.luau"
local Net = require("@game/ReplicatedStorage/Twill/Net")
local Types = Net.Types

return {
	Emote = Net.Declare("Emote", { Types.String(32) }),
	BuyItem = Net.Declare("BuyItem", { Types.String(32) }, { Types.Boolean, Types.String(64) }),
	Aim = Net.DeclareUnreliable("Aim", { Types.Vector3F32 }),
}
```

The second array lets a client `Ask` and wait for the reply.

Declaring the same name with different types is refused loudly, which is what
stops one caller from encoding through another's types.

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
local bought, message = Remotes.BuyItem:Ask("sword")

Remotes.Emote:Fire("wave")
Remotes.Aim:Fire(camera.CFrame.LookVector)
```

`Ask` always ends: with the answer, with the `Reject`, or with nothing when the
wait runs out. It never leaves the calling thread waiting forever.

A call made before the server's numbering has reached the client is held and
sent once it does, so there is no boot-order trap. Wait explicitly only when you
want to:

```luau
Net.OnReady(function()
	Remotes.Emote:Fire("wave")
end)
```

## The four layers of screening

Each one catches what the layer above cannot express. Use the highest one that
can answer the question.

### 1. Wire types

The declaration enforces them. A client that sends a number where a string was
declared never reaches your handler, and a string longer than the ceiling you
declared is refused.

Types are free. Declare them precisely: `Types.String(32)` rather than
`Types.String`, `Types.NumberVarU` rather than a float.

### 2. Rate

Always applied, whether or not you pass it.

```luau
Rate = 4          -- four calls a second
Rate = 0.25       -- one call every four seconds
```

Below one, it is a cooldown. Pick a number a real player cannot exceed and no
higher. A separate budget weighs everything a player sends across every remote,
so batching is not a way around it.

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

**An `Instance` sent by a client belongs here.** The decoder proves it exists and
is the class you declared. It cannot prove the caller is allowed to touch it.

## Two things a client cannot say

**A player.** `Types.Player` is refused in an argument list, because a player
named on the wire is a player the sender chose. The caller arrives as your
handler's first argument, from the engine.

**An answer nobody asked for.** Only the client asks; the server never waits on a
reply from a client. If you need something only a client knows, send it as an
ordinary event and treat it as a claim rather than a fact.

## Reject is mandatory for replies

A remote that replies must have a `Reject`, or the `Handle` itself is refused:

```text
'BuyItem' replies to the caller, so it needs a Reject option
```

Without one, a refused call leaves its caller waiting.

Return the same shape as a normal reply, so the caller has one thing to check:

```luau
Reject = function()
	return false, "slow down"
end
```

A remote that does not reply may omit it. Refused calls there are dropped.

## Use unreliable for what a newer message replaces

```luau
Aim = Net.DeclareUnreliable("Aim", { Types.Vector3F32 })
```

Aim directions, cosmetic effects, footsteps. Never anything transactional. There
is no `response` parameter on `DeclareUnreliable`, so a reply cannot be attached
to one by mistake.

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
