---
title: Format
description: Turning values into the text a player reads
---

```luau
local Format = require("@game/ReplicatedStorage/Twill").Format

Format.Time(90)              --> "01:30"
Format.Duration(5400)        --> "1 hour 30 minutes"
Format.Comma(1234567)        --> "1,234,567"
Format.Abbreviate(1234567)   --> "1.23M"
Format.Ordinal(21)           --> "21st"
Format.Plural(1, "user")     --> "1 user"
```

Every function here is pure, none of them yield, and this module depends on
nothing. It is safe to reach for from anywhere, including a render step.

That last part is deliberate. A formatter that drags a big number library into
the boot path of a game that never counts that high has cost more than it gave.
A [`BigNumber`](/reference/bignumber/) has its own `BigNumber.Format`, which
defers to the suffixes here, so a currency reads the same however large it grows
and there is only ever one list to keep.

Naming a user is not here either, because that has to ask Roblox for a name it
does not hold, and nothing else in this file waits for anything.

## Tier names

`Abbreviate` and `Digits` shorten a number to a few digits and a tier suffix.

| Tier | Named |
| :--- | :--- |
| 1 to 10 | `K`, `M`, `B`, `T`, `Qa`, `Qi`, `Sx`, `Sp`, `Oc`, `No` |
| 11 to 999 | Composed from ones, tens, and hundreds parts: `UDc`, `TVg`, and so on. |
| Past 999 | No name. The value falls back to exponent notation. |

A tier is a group of three digits, so tier 999 covers numbers up to 3000 digits
long.

## Refusals

`Time`, `Duration`, `Comma`, `Abbreviate`, `Ordinal`, and `Plural` throw when
given a value that is not a number, or a number that is NaN or infinite.

`Abbreviate` and `Digits` throw when `places` is present and is not a whole
number of zero or more.

## API

### `Format.Time`

`[Server]` | `[Client]`

Writes a length of time as a clock.

```luau
function Format.Time(seconds: number): string
```

**Returns**

`string` - `MM:SS`, or `H:MM:SS` once there is an hour to show.

Fractions are dropped and a negative length reads as `00:00`, which is what a
timer that has run out should show. Minutes and seconds are padded to two
digits; hours are not, so a long session reads as `100:00:00` rather than being
cut.

### `Format.Duration`

`[Server]` | `[Client]`

Writes a length of time in words.

```luau
function Format.Duration(seconds: number): string
```

**Returns**

`string` - Something like `1 hour 30 minutes`. Zero reads as `no time at all`.

Only the two largest units that apply are shown, so `1 day 2 hours` never grows
a minutes part. Units that do not apply are left out rather than shown as none.

A year is 31556926 seconds and a month is 2629744, the average lengths rather
than calendar ones, so this is for a span of time and not for a date.

### `Format.Comma`

`[Server]` | `[Client]`

Groups the digits of a number so a long one can be read without counting.

```luau
function Format.Comma(value: number): string
```

**Returns**

`string` - The same number, grouped, and exact.

Anything after the decimal point is kept as it stands.

### `Format.Abbreviate`

`[Server]` | `[Client]`

Shortens a number to a few digits and a suffix, for counters that must fit a
fixed space however large they grow.

```luau
function Format.Abbreviate(value: number, places: number?): string
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `number` | The number to shorten. |
| `places` | `number?` | Digits kept after the point. Two when left out. |

**Returns**

`string` - The shortened number, such as `1.23M`.

Below 1000 a whole number is left alone, so a count of a few does not read as a
decimal, and a fraction is written to `places`.

### `Format.Digits`

`[Server]` | `[Client]`

Shortens a number that is already written out as digits.

```luau
function Format.Digits(digits: string, places: number?): string
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `digits` | `string` | Every digit of the number, with a leading sign when negative. |
| `places` | `number?` | Digits kept after the point. Two when left out. |

**Returns**

`string` - The shortened number, in the same form `Abbreviate` produces.

This is the one to reach for past the range a Luau number holds exactly. Working
from the digits themselves keeps the tier correct however large the value grows,
which is why [`BigNumber.Format`](/reference/bignumber/) is a call to this.

Three digits or fewer are returned unchanged.

```luau
Format.Abbreviate(1234567)                  --> "1.23M"
Format.Digits("1234567")                    --> "1.23M"
Format.Digits("120000000000000000000000")   --> "120.00Sx"
```

Past the last tier that has a name it falls back to exponent notation rather
than inventing a suffix.

### `Format.Ordinal`

`[Server]` | `[Client]`

Writes a number as a place in a ranking.

```luau
function Format.Ordinal(value: number): string
```

**Returns**

`string` - `1st`, `2nd`, `3rd`, `11th`, `21st`. The English teens are handled.

Fractions are dropped.

### `Format.Plural`

`[Server]` | `[Client]`

Counts something in words, so exactly one of them does not read as a bracketed
plural.

```luau
function Format.Plural(count: number, word: string): string
```

**Returns**

`string` - The count and the word, agreeing with each other.

An `s` is added for any count but one. Only regular English plurals are handled,
so an irregular word is written out by the caller.

## Limits

| Limit | Value |
| :--- | ---: |
| Named tiers | 10 |
| Composed tiers | up to 999 |
| Decimal places when none is given | 2 |
| Units `Duration` shows | 2 |
