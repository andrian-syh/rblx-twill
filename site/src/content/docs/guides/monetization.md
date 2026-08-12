---
title: Sell products and passes
description: Grant a developer product exactly once, and check a pass without burning web quota.
---

Selling things is the one part of a Roblox game where a bug costs real money in
both directions. Grant too eagerly and a redelivered receipt pays twice. Report
success too early and a server that dies mid-save takes the reward with it, while
the player has already been charged.

Both failures come from the same place: the reward, the record that it happened,
and the answer given to Roblox must agree with each other. Twill keeps them in
step, and the shape of your code is what lets it.

## Handle a developer product

Register what a product gives during `Init`. The handler writes the reward and
nothing else.

```luau
function ShopService.Init()
	-- One handler per product. A second registration for the same id is
	-- refused rather than replacing the first, because a silently replaced
	-- handler stops paying without telling anyone.
	Twill.Monetization.HandleProduct(1234567, function(player, data)
		-- Mutate the live profile. Saving it, recording the purchase, and
		-- answering the receipt are not this function's concern.
		data.Coins += 1000
	end)

	Twill.Monetization.HandleProduct(1234568, function(player, data)
		table.insert(data.Inventory, "starter_pack")
	end)
end
```

The reward and the record of the purchase are written together, and Roblox is
told the purchase succeeded only after that write is confirmed.

That ordering is the whole point. ProfileStore's save does not wait, so reporting
success first would lose the reward if the server died in between, and the player
would have paid for nothing.

## What you no longer have to write

**Do not assign `ProcessReceipt` yourself.** It can only be assigned once per
server, and two systems that both want it silently overwrite one another. Twill
owns the one assignment and routes each receipt to its registered handler.

**Do not write your own duplicate check.** Roblox redelivers a receipt until it
is told the purchase was granted, so the same purchase can arrive more than once.
Granted purchase ids are recorded in the player's own saved data, in the same
write as the reward, and a receipt already on that list is answered without
paying again.

**Do not answer `PurchaseGranted` yourself.** Anything that goes wrong answers
`NotProcessedYet` instead, which asks Roblox to retry. The record above is what
makes that retry safe.

## Handlers may fail

A handler that throws results in `NotProcessedYet`, so the purchase is retried
rather than lost. Failing loudly is the correct behaviour here, and an `assert`
is a reasonable way to reach it.

```luau
Twill.Monetization.HandleProduct(1234569, function(player, data)
	local pet = Catalog.Pets[currentOffer]

	-- Better to refuse the receipt and have Roblox bring it back than to
	-- grant a nil pet and record the purchase as honoured.
	assert(pet, "no offer active")

	table.insert(data.Pets, pet.Id)
end)
```

:::caution[Keep handlers free of anything that can hang]
A handler that yields on something slow holds up the receipt. Write the reward
into `data` and return. Anything else that has to happen belongs elsewhere,
started from a hook that is allowed to take its time.
:::

## Check a pass

```luau
if Twill.Monetization.OwnsPass(player, 7654321) then
	multiplier *= 2
end
```

The answer is remembered for the rest of the player's session, because the
underlying call spends web quota. The first call per player and pass yields; the
rest do not.

A failed check reads as not owned and is **not** remembered, so it is asked again
rather than settled wrongly against the player.

### A pass bought during play

Nothing to write. Twill listens for the purchase prompt closing and updates what
it remembers, so a pass bought mid-session turns on without a rejoin.

`ForgetPasses` exists only for the case that listener cannot see, such as
ownership granted from outside the running server:

```luau
-- Forget one pass, or every pass for that player when the id is left out.
Twill.Monetization.ForgetPasses(player, 7654321)
```

## Test it

Purchases cannot be simulated in Studio. Publish to a private test place, buy the
product with a real account, and confirm two things:

1. The reward landed and survived a rejoin.
2. Buying twice grants twice, and a **redelivered** receipt grants once.

The second is the one that costs money to get wrong, and the one this module
exists for.

:::tip[Force a redelivery to test it]
Buy the product, then stop the server before the save is confirmed. Roblox brings
the receipt back on the next join, and a correct setup grants nothing the second
time while the player keeps what they paid for.
:::

## Data is required

This module needs [`Data`](/reference/data/). Idempotency is only worth anything
if the record of what was granted outlives the server that wrote it.
