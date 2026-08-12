---
title: Run a draw a player can audit
description: Use a cryptographic generator for anything valuable, and publish a commitment so an outcome can be checked afterwards.
---

The moment a draw decides something a player paid for, two claims are being made:
that the odds are what you said, and that you did not reroll a result you did not
like. Neither is visible from the outside, and "trust us" stops working at exactly
the point it starts mattering.

A commitment turns the second claim into something anyone can check, without
seeing your code and without taking your word for it.

## Use the right generator

```luau
local prize = Twill.Random.Pick(lootTable)
local code = Twill.Random.Id(16)
```

Every draw comes from a cryptographic generator, so knowing every earlier result
says nothing about the next one.

`math.random` does not have that property. A player who watches enough outcomes
can predict the rest, and for a crate opening that is worth real money, some of
them will.

Reach for `Twill.Random` for anything a player would care about the outcome of.
`math.random` is fine for cosmetic variety.

**Server only**, because an outcome a client can draw is an outcome it can
choose.

## Publish a commitment first

A commitment proves the result was fixed before it was announced.

```luau
function CrateService.OpenCrate(player)
	local round = Twill.Random.Commit()

	-- Published before anything is drawn. This is the whole proof: the seed
	-- behind it already existed, so the outcome cannot be chosen afterwards.
	Twill.Replication.SetFor(player, "Crate", {
		Commitment = round.Commitment,
	})

	local prize = round:Pick(lootTable)
	grant(player, prize)

	-- Only now is the seed safe to publish. Revealing it any earlier tells
	-- the player what is coming.
	Twill.Replication.SetFor(player, "Crate", {
		Commitment = round.Commitment,
		Prize = prize,
		Seed = round:Reveal(),
	})
end
```

The player receives the commitment before anything is drawn, and the seed
afterwards. Anyone can then check that the seed produces that commitment, and
replay the draw.

## Let them check it

```luau
local matches = Twill.Random.Verify(commitment, seed)

local replay = Twill.Random.Replay(seed)
local prize = replay:Pick(lootTable)
```

Draws are keyed Blake3 over the seed, so **any implementation of Blake3
reproduces them**. A player does not have to trust your code, or run it.

:::caution[Replay in the same order]
The stream is ordered. If the original round drew an integer and then picked from
a list, the replay must do the same, in the same order, with the same arguments.

A mismatched replay fails for a reason that has nothing to do with honesty.
:::

## Publish the loot table too

A commitment proves the draw was not rerolled. It proves nothing about what was
in the list.

If the point is to be auditable, the table has to be visible and stable. Publish
it, version it, and do not change it mid-round.

:::caution[`Random.Shuffle` reorders in place]
Shuffling the loot table itself permanently rearranges it for every later reader,
and a published table that quietly changes order is no longer the table you
published. Shuffle a copy:

```luau
local order = Twill.Random.Shuffle(table.clone(lootTable))
```
:::

## Generate a secret

```luau
Twill.Token.Configure({ Secret = Twill.Random.Id(64) })
```

:::danger[Do not generate the secret at startup]
A secret generated at boot is different on every server and after every restart,
which invalidates every token already issued.

Generate it **once**, by hand, and paste it into a server-side module. See
[`Token`](/reference/token/#the-secret).
:::

## Ranges

```luau
local roll = Twill.Random.Int(1, 100)
```

Inclusive at both ends. `Random.Int(5, 5)` is legal and returns 5.

The span must fit in 32 bits. That is far past any loot table, and it is what
keeps the draw unbiased, which a wider span could not be from a single word.

## Weighted odds

`Packages.WeightedRandom` is bundled for tables with weights rather than equal
odds. It uses `math.random`, so use it where the distribution matters and the
unpredictability does not.

For a weighted draw that also has to be unpredictable, build the selection on top
of `Random.Number`:

```luau
local roll = Twill.Random.Number(0, totalWeight)
local seen = 0

for _, entry in lootTable do
	seen += entry.Weight
	if roll <= seen then
		return entry
	end
end
```
