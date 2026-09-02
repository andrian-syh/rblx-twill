---
title: Show stats in the player list
description: Bind the Roblox player list to replicated state, and understand what it can and cannot sort
---

The Roblox player list is the one piece of interface every player sees and none
of them opened deliberately. It is also a shared surface: what you write there
replicates to everyone in the server, not only to the player it describes.

That makes it worth binding rather than driving. Name the state a stat should
follow, and let the write that already reaches the client update the list on its
way past.

## Bind

```luau
function StatsService.Start()
	Twill.Leaderstats.Bind({
		-- Key is what is published; Path is the field inside it.
		{ Name = "Coins", Key = "Data", Path = "Stats.Coins" },
		{ Name = "Wins",  Key = "Data", Path = "Stats.Wins" },

		-- No Path, so this reads the whole key. Shared, so it updates for
		-- everyone at once.
		{ Name = "Wave",  Key = "Wave" },
	})
end
```

Nothing else has to be called. Each entry watches one
[replication](/reference/replication/) key and writes what it finds into a value
object under the player.

Binding ten stats to one key costs one listener, not ten. Calling `Bind` again
later adds to what is already bound, so a system can register its own stat
without knowing what else exists. A stat name already in use is refused.

## Make the values exist

An entry watching `"Data"` needs `Data` to be replicated. Name the fields in
[`Data.Configure`](/reference/data/):

```luau
Twill.Data.Configure({
	Store = "PlayerData",
	Template = { Stats = { Coins = 0, Wins = 0 } },

	-- Without this the stat has nothing to follow and stays empty.
	Replicate = { "Stats" },
})
```

A shared key is published directly:

```luau
Twill.Replication.Set("Wave", 1)
```

## What it can sort

:::caution[`IntValue` and `NumberValue` only]
Text is displayed but never sorted. This is a Roblox constraint, not a Twill
one.
:::

The value object is chosen from the value itself, and replaced if the value
later needs a different one, so a stat that outgrows its holder keeps showing
rather than silently stopping.

| Value | Object | Sorts |
| --- | --- | --- |
| Whole number | `IntValue` | Yes |
| Fractional number | `NumberValue` | Yes |
| String | `StringValue` | No |
| Boolean | `BoolValue` | No |
| [`BigNumber`](/reference/bignumber/) | `StringValue`, formatted | No |

A big number reads correctly and ranks nowhere, because no value object can hold
one as a number. Where ranking matters more than exactness, keep a clamped plain
number alongside it and bind that instead:

```luau
-- The exact value stays the source of truth; this one exists only to sort.
data.Stats.CoinsRank = math.min(Twill.BigNumber.ToNumber(data.Coins), 2^53)
```

## Decimals

```luau
{ Name = "Rating", Key = "Data", Path = "Stats.Rating", Places = 2 }
```

`Places` applies to values shortened into text, which in practice means big
numbers. An ordinary number is written into its value object as it stands.

## Bind keys that change at human pace

This is the one rule worth taking seriously here. A key written every frame
writes the player list every frame, and the player list replicates to everyone.
The cost is multiplied by the server population, and it is paid by players who
are not even looking at it.

For a value that moves continuously, slow what leaves rather than what is
written:

```luau
Twill.Replication.SetThrottle("Position", 1)
```

Or publish a separate, coarser key for the list and keep the precise one for
whatever actually needs precision. A stat nobody can read changing twice a
second does not need to change sixty times a second.

## Force a refresh

```luau
Twill.Leaderstats.Refresh(player)
```

Rarely needed, since bound stats follow their keys on their own. It exists for
state that moved without the keys noticing.
