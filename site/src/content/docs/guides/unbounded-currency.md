---
title: Count past the number limit
description: Hold a currency that grows without ceiling, and keep it exact through a save.
---

A Luau number holds whole values exactly to about nine quadrillion. Past that it
starts rounding, and a DataStore round trip rounds again. For most games this
never comes up. For an idle or simulator game it comes up on a Tuesday, when a
player reports that their coins stopped going up.

[`BigNumber`](/reference/bignumber/) holds the value as plain data a DataStore
accepts, so one coin still means one coin at `1e100`.

## Decide before you ship

Migrating a live currency from a number to a `BigNumber` means touching every
place that reads it, and doing it while players hold both shapes. Deciding at the
start costs nothing.

Ask one question: **can this value compound?** A currency with multipliers,
rebirths, or offline earnings compounds. A wins counter does not.

## Store it

```luau
Twill.Data.Configure({
	Store = "PlayerData",
	Template = {
		-- Plain data: a list of limbs and a sign. No metatable, which is
		-- exactly why it survives a save.
		Coins = Twill.BigNumber.new(0),
		Wins = 0,
	},
})
```

## Spend and earn

Every operation is a function call, and each returns a fresh value.

```luau
local function tryBuy(data, price)
	-- Not `<`. Comparison operators do not read these as amounts.
	if Twill.BigNumber.LessThan(data.Coins, price) then
		return false
	end

	data.Coins = Twill.BigNumber.Subtract(data.Coins, price)

	return true
end
```

:::danger[Guard the spend before making it]
`Subtract` is allowed to go below zero and gives a negative value. There is no
error and no clamp, so a missing check produces a player with minus four million
coins and a support ticket.
:::

## Why not operators

A stored value has no metatable. Metatables do not survive a DataStore round
trip, so `a + b` fails on the first read after a join, and works perfectly in
Studio where the value was never saved.

That is the worst shape a bug can take: correct in testing, broken only for
returning players. Calling functions is the shape that works in every case.

## Show it

```luau
-- Client, following the replicated field.
Twill.Replication.Subscribe("Data.Coins", function(coins)
	if not coins then
		return
	end

	-- Reads the same as every other shortened number in the game, because
	-- both go through the same suffix list.
	label.Text = Twill.BigNumber.Format(coins)
end)
```

`Format` abbreviates for display. `ToString` gives every digit, which is what you
want when a value has to be written somewhere as text and read back.

:::caution[`ToNumber` is a display tool, not a storage one]
It is lossy above the range that made you reach for this module, and returns
infinity well past it. Use it for ratios and progress bars. Never write the
result back into saved data.
:::

## Ranking it

The Roblox player list sorts `IntValue` and `NumberValue` only, so a big number
shows correctly and ranks nowhere.

Where ranking matters more than exactness, keep a clamped plain number beside the
exact one and bind that:

```luau
-- The exact value stays the source of truth. This exists only to sort.
data.Stats.CoinsRank = math.min(Twill.BigNumber.ToNumber(data.Coins), 2^53)
```

The same applies to an OrderedDataStore leaderboard, which also takes numbers
only.

## Migrating a live currency

If it is already shipped as a plain number, a migration handles it, and
`BigNumber.is` is how you tell the two shapes apart afterwards.

```luau
Migrations = {
	[2] = function(data)
		-- Runs once per profile, on load, before any service sees it.
		if not Twill.BigNumber.is(data.Coins) then
			data.Coins = Twill.BigNumber.new(data.Coins or 0)
		end
	end,
}
```

Raise `Version` alongside it. A profile already at the target version is left
untouched, so this is safe to leave in place forever.

## Bound anything a player influences

```luau
-- An exponent taken from client input is a way to ask the server to
-- allocate without limit.
local power = math.clamp(requested, 1, 8)

data.Coins = Twill.BigNumber.Power(data.Coins, Twill.BigNumber.new(power))
```

`Power` grows the result in memory as well as in magnitude. Everything else here
is proportional to the size of its operands, which players grow slowly. An
exponent is the one place they can grow it quickly.
