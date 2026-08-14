---
title: Chance
description: Weighted draws, and the odds behind them.
---

```luau
local pool = Twill.Chance.new()

pool:AddItem("common", 100)
pool:AddItem("legendary", 1, 2)

local prize = pool:Next(playerLuck)
```

A weight is how often an entry should come up against the others, so nothing has
to add up to anything in particular. Weights of `75` and `25` and weights of
`3` and `1` describe the same table.

## Luck is an exponent, not a multiplier

Each entry carries an exponent deciding how far it moves when luck is applied.

```text
effective weight = weight * (1 + luck) ^ exponent
```

The default exponent is zero, which leaves an entry deaf to luck however high it
goes. A positive one makes the entry likelier as luck rises, and a negative one
makes it rarer.

That is what lets a single number shift a whole table. Give the common bulk an
exponent of zero, give the rare tail a positive one, and one `luckFactor`
expresses every luck potion, gamepass, and event bonus in the game without a
second table of odds to keep in step.

| Entry | Weight | Exponent | At luck 0 | At luck 3 |
| --- | --- | --- | --- | --- |
| `common` | 100 | 0 | 100 | 100 |
| `lucky` | 10 | 1 | 10 | 40 |
| `unlucky` | 10 | -1 | 10 | 2.5 |

## The odds are computed, not kept

`GetProbabilities` answers what a table actually pays out, at any luck.

```luau
for item, probability in pool:GetProbabilities(playerLuck) do
	print(item, `{probability * 100}%`)
end
```

Reading them from the pool rather than writing them into the interface means the
odds shown to a player cannot drift from the odds being drawn. A table rebalanced
without the display being updated is otherwise a silent, permanent lie.

:::caution[A sold draw has to disclose its odds]
Roblox requires the possible outcomes and their numerical odds to be shown before
a player spends Robux, or currency bought with Robux, on a random result.
**Anything sold that improves those odds has to state its effect in numbers too**,
which is what reading the same pool at two luck factors gives you.

Read the [paid random items
policy](https://create.roblox.com/docs/production/monetization/paid-random-items)
rather than relying on this paragraph, since the wording is Roblox's and it
changes.
:::

## Where the draw comes from

The default source is the ordinary generator. That is right for variety nobody
would contest, and wrong for anything sold.

```luau
-- Cosmetic. Which idle animation, which ambient sound.
local flavour = Twill.Chance.new()
```

For a draw a player would argue about, pass a [`Random`](/reference/random/)
round. The pool then draws from that round's stream, so revealing the seed
afterwards lets anyone replay the outcome.

```luau
local round = Twill.Random.Commit()
announce(round.Commitment)

local pool = Twill.Chance.new(round)
pool:AddItem("common", 100)
pool:AddItem("legendary", 1, 2)

local prize = pool:Next(playerLuck)

announce(round:Reveal())
```

See [Run a draw a player can audit](/guides/provably-fair-draws/) for the full
flow. Replaying requires the draws to be taken in the same order.

## API

### `Chance.new`

`[Server]` | `[Client]`

Creates an empty pool that draws from the given source.

```luau
function Chance.new<T>(source: Source?): Pool<T>

export type Source = Random | { NextNumber: (self: any) -> number }
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `source` | `Source?` | Where draws come from. An ordinary `Random` when left out, which is not cryptographic. |

**Returns**

`Pool<T>` - An empty pool.

Throws when given something that cannot be drawn from. A [`Random`](/reference/random/)
round is accepted, which is how a draw becomes auditable.

### `Pool:AddItem`

`[Server]` | `[Client]`

Adds an entry, or replaces the one already held under it.

```luau
function Pool:AddItem(item: T, weight: number, luckExponent: number?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `item` | `T` | What to hand back when this entry is drawn. Anything but `nil`. |
| `weight` | `number` | How often it should come up against the others. Zero or more. |
| `luckExponent` | `number?` | How far luck moves it. Zero when left out, which leaves it deaf to luck. |

**Returns**

`()` - Nothing.

Throws on a `nil` item, and on a weight or exponent that is not a finite number.
**A negative weight is refused**, because a table holding one reports odds above
one for everything else.

An entry added twice keeps only the second weight, so re-adding is how an entry
is retuned.

### `Pool:RemoveItem`

`[Server]` | `[Client]`

Takes an entry out of the pool.

```luau
function Pool:RemoveItem(item: T)
```

**Returns**

`()` - Nothing. Removing something that was never there does nothing rather than
failing.

### `Pool:Contains`

`[Server]` | `[Client]`

Reports whether the pool holds an entry.

```luau
function Pool:Contains(item: T): boolean
```

**Returns**

`boolean` - True when the pool holds it.

### `Pool:Clear`

`[Server]` | `[Client]`

Takes every entry out, leaving the pool ready to be filled again.

```luau
function Pool:Clear()
```

**Returns**

`()` - Nothing.

### `Pool:IsEmpty`

`[Server]` | `[Client]`

Reports whether the pool holds nothing at all.

```luau
function Pool:IsEmpty(): boolean
```

**Returns**

`boolean` - True when there is nothing to draw.

A pool holding entries that all weigh nothing is **not** empty, and still draws
nothing.

### `Pool:GetWeight`

`[Server]` | `[Client]`

Returns what one entry is worth at the given luck.

```luau
function Pool:GetWeight(item: T, luckFactor: number?): number?
```

**Returns**

`number?` - What it is worth, or `nil` when the pool does not hold it.

### `Pool:GetWeights`

`[Server]` | `[Client]`

Returns what every entry is worth at the given luck.

```luau
function Pool:GetWeights(luckFactor: number?): { [T]: number }
```

**Returns**

`{ [T]: number }` - A fresh table, safe to keep.

### `Pool:GetTotalWeight`

`[Server]` | `[Client]`

Returns what the whole pool is worth at the given luck.

```luau
function Pool:GetTotalWeight(luckFactor: number?): number
```

**Returns**

`number` - What the pool is worth altogether. Zero for an empty pool.

Throws when the entries together are too large to draw from, which an extreme
exponent can reach.

### `Pool:GetProbability`

`[Server]` | `[Client]`

Returns how likely one entry is at the given luck, as a fraction of one.

```luau
function Pool:GetProbability(item: T, luckFactor: number?): number?
```

**Returns**

`number?` - How likely it is, or `nil` when the pool does not hold it. Zero when
the pool is worth nothing.

### `Pool:GetProbabilities`

`[Server]` | `[Client]`

Returns how likely every entry is at the given luck.

```luau
function Pool:GetProbabilities(luckFactor: number?): { [T]: number }
```

**Returns**

`{ [T]: number }` - A fresh table, empty when there is nothing to draw.

This is the reading to show a player, and the one to disclose where the draw is
sold. Taking it at two luck factors is how the effect of something that improves
the odds is stated in numbers.

### `Pool:Next`

`[Server]` | `[Client]`

Draws one entry, each as likely as its share of the pool.

```luau
function Pool:Next(luckFactor: number?): T?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `luckFactor` | `number?` | How much luck to apply. None when left out. **Must be above -1.** |

**Returns**

`T?` - The entry drawn, or `nil` when there was nothing to draw.

An empty pool and a pool whose entries all weigh nothing both answer with
nothing. An entry weighing nothing is never drawn.

## Luck below -1 is refused

Every function taking a `luckFactor` refuses one at or below `-1`.

At `-1` the base of the exponent is zero, and below it the base is negative.
Either produces a weight that is infinite or not a number at all, which no
comparison catches: the draw would then answer with the same entry every time,
without an error and without a warning.

Bad luck is spelled with a factor between `-1` and `0`.

## What this does not do

**No pity, and no guarantee after so many draws.** That needs a counter per
player that survives a session, which is [`Data`](/reference/data/)'s job rather
than this module's. It is a handful of lines where the draw happens:

```luau
data.SinceLegendary += 1

if data.SinceLegendary >= 90 then
	data.SinceLegendary = 0
	return "legendary"
end

return pool:Next(playerLuck)
```

**No multi-draw.** Ten pulls is a loop. Drawing without replacement is
`RemoveItem` inside one.

**No weighting of its own for `Random.Pick`.** That draws evenly by design; this
module is the weighted counterpart.
