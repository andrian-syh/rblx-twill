---
title: BigNumber
description: Exact whole numbers with no ceiling
---

```luau
local BigNumber = require("@game/ReplicatedStorage/Twill").BigNumber

data.Coins = BigNumber.new(1500)
data.Coins = BigNumber.Add(data.Coins, BigNumber.new(250))

print(BigNumber.Format(data.Coins))     --> 1.75K
print(BigNumber.ToString(data.Coins))   --> 1750
```

Luau holds whole numbers exactly to about `9e15`. Past that it rounds, and a
DataStore round-trip rounds again, so a currency that grows without limit cannot
be a plain number. Every value here is exact at any size.

## Storage

A stored value is a plain table, which a DataStore accepts as it is.

```luau
export type BigNumber = {
	limbs: { number },
	signum: number,
}
```

The engine underneath is [AptInt](/reference/bundled-packages/). Nothing outside
this module should reach for it directly, because the facade owns two details
that make an arbitrary-precision integer survive a DataStore:

1. The metatable is reattached for each operation. A metatable does not survive a
   DataStore round-trip, and a value loaded back would otherwise be inert.
2. Results are copied into fresh tables. AptInt pools limb arrays, and a pooled
   array reused underneath saved player data would corrupt it in a way nothing
   reports.

These are functions, not operators. A stored value has no metatable, so `a + b`
fails on anything loaded from a DataStore. Calling functions is the shape that
works in every case, including the first read after a join.

## Reading and writing one from the console

The [`playerdata` command](/reference/admin/#playerdata) prints a big number as
`big:` followed by every digit, and takes the same form back:

```text
playerdata set Someone main Stats.Coins big:1500
```

The mark is what keeps the field a big number. Writing a plain `1500` over one
stores an ordinary number, and the game's next `BigNumber.Add` then reaches for
`limbs` on something that has none. Digits too long for an ordinary number are
promoted without the mark, since nothing else could have been meant.

## API

No function changes its operands. Each returns a fresh value.

Every function taking one or two amounts throws when handed anything that is not
shaped like one, naming itself and the offending type.

### `BigNumber.new`

`[Server]` | `[Client]`

Builds a value from a number, a string of digits, or nothing at all.

```luau
function BigNumber.new(value: (number | string)?): BigNumber
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `(number \| string)?` | A number, a string of digits, or `nil` for zero. |

**Returns**

`BigNumber` - Plain data, safe to store as it is.

Throws when given anything but a number, a string, or nothing.

Pass digits as a string for anything a Luau number could not hold exactly. By
the time it is a number literal, the rounding has already happened.

### `BigNumber.is`

`[Server]` | `[Client]`

Reports whether a value is shaped like one of these.

```luau
function BigNumber.is(value: any): boolean
```

**Returns**

`boolean` - `true` when it carries a table of limbs and a numeric sign.

This is how data loaded from storage is told apart from an ordinary number in
the same field, which matters during a migration from one to the other.

### `BigNumber.Add`

`[Server]` | `[Client]`

Adds two values, exactly and at any size.

```luau
function BigNumber.Add(left: BigNumber, right: BigNumber): BigNumber
```

**Returns**

`BigNumber` - Their sum.

### `BigNumber.Subtract`

`[Server]` | `[Client]`

Subtracts one value from another.

```luau
function BigNumber.Subtract(left: BigNumber, right: BigNumber): BigNumber
```

**Returns**

`BigNumber` - What is left.

Going below zero is allowed and gives a negative value, so guard a spend before
making it rather than after.

### `BigNumber.Multiply`

`[Server]` | `[Client]`

Multiplies two values.

```luau
function BigNumber.Multiply(left: BigNumber, right: BigNumber): BigNumber
```

**Returns**

`BigNumber` - Their product.

### `BigNumber.Divide`

`[Server]` | `[Client]`

Divides one value by another, keeping the remainder.

```luau
function BigNumber.Divide(left: BigNumber, right: BigNumber): (BigNumber, BigNumber)
```

**Returns**

`BigNumber` - The whole part of the division.

`BigNumber` - What was left over.

The division is whole, and the remainder is handed back alongside rather than
dropped.

### `BigNumber.Modulo`

`[Server]` | `[Client]`

Returns what is left after dividing one value by another.

```luau
function BigNumber.Modulo(left: BigNumber, right: BigNumber): BigNumber
```

**Returns**

`BigNumber` - The remainder alone, for callers that do not want the division.

### `BigNumber.Power`

`[Server]` | `[Client]`

Raises a value to a power.

```luau
function BigNumber.Power(value: BigNumber, power: BigNumber): BigNumber
```

**Returns**

`BigNumber` - The result.

Bound a power that came from a player. The result grows with the power in memory
as well as in size, so an exponent taken from client input is a way to ask the
server to allocate without limit.

### `BigNumber.LessThan`

`[Server]` | `[Client]`

Reports whether one value is smaller than another.

```luau
function BigNumber.LessThan(left: BigNumber, right: BigNumber): boolean
```

**Returns**

`boolean` - `true` when the first is the smaller.

Use this rather than `<`, which does not read these as amounts.

### `BigNumber.Equals`

`[Server]` | `[Client]`

Reports whether two values stand for the same amount.

```luau
function BigNumber.Equals(left: BigNumber, right: BigNumber): boolean
```

**Returns**

`boolean` - `true` when they stand for the same amount.

Two separate values of the same amount are equal here, which comparing the
tables themselves would not report.

### `BigNumber.Compare`

`[Server]` | `[Client]`

Orders two values, in the form a sort comparator wants.

```luau
function BigNumber.Compare(left: BigNumber, right: BigNumber): number
```

**Returns**

`number` - `-1`, `0`, or `1` as the first sorts before, with, or after the
second.

This is what `table.sort` wants, so a leaderboard of these is ordered in one
pass rather than compared twice per pair.

### `BigNumber.ToString`

`[Server]` | `[Client]`

Returns every digit, exactly, however many there are.

```luau
function BigNumber.ToString(value: BigNumber): string
```

**Returns**

`string` - Every digit, with a leading sign when negative.

This is the form to use when a value has to survive being written somewhere as
text and read back.

### `BigNumber.ToNumber`

`[Server]` | `[Client]`

Returns an ordinary number, for arithmetic that does not need to be exact.

```luau
function BigNumber.ToNumber(value: BigNumber): number
```

**Returns**

`number` - The nearest ordinary number.

Lossy above the range that made you reach for this module. Use it for ratios and
progress bars, never for the value of record, and never send the result back
into storage.

### `BigNumber.Format`

`[Server]` | `[Client]`

Renders a value the way a player expects to read it.

```luau
function BigNumber.Format(value: BigNumber, places: number?): string
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `BigNumber` | The value to render. |
| `places` | `number?` | Decimal places to keep. Two when left out. |

**Returns**

`string` - The value, shortened to be read at a glance.

This is a call to [`Format.Digits`](/reference/format/#formatdigits), so a
currency reads the same as every other number the game shortens, and does not
change appearance the day it grows large enough to need this module.

## Leaderstats

A big number shows correctly in the player list and ranks nowhere. The list
sorts by `IntValue` and `NumberValue` only, and no value object holds a big
number as a number. [`Leaderstats`](/reference/leaderstats/) displays it
formatted, which is the only way to show one at all.
