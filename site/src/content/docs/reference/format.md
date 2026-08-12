---
title: Format
description: Turning values into the text a player reads.
---

```luau
Format.Time(90)              --> "01:30"
Format.Duration(5400)        --> "1 hour 30 minutes"
Format.Comma(1234567)        --> "1,234,567"
Format.Abbreviate(1234567)   --> "1.23M"
Format.Ordinal(21)           --> "21st"
Format.Plural(1, "user")     --> "1 user"
```

Every function here is pure, none of them yield, and **this module depends on
nothing**. It is safe to reach for from anywhere, including a render step.

That last part is deliberate. A formatter that drags a big number library into
the boot path of a game that never counts that high has cost more than it gave.
A [`BigNumber`](/reference/bignumber/) has its own `BigNumber.Format`, which
defers to the suffixes here, so a currency reads the same however large it grows
and there is only ever one list to keep.

Naming a user is not here either, because that has to ask Roblox for a name it
does not hold, and nothing else in this file waits for anything.

## API

### `Format.Time`

`[Server]` | `[Client]`

Writes a length of time as a clock.

```luau
function Format.Time(seconds: number): string
```

**Returns**

`string` - `MM:SS`, or `HH:MM:SS` once there is an hour to show.

Fractions are dropped, and a negative length reads as none, which is what a timer
that has run out should show.

### `Format.Duration`

`[Server]` | `[Client]`

Writes a length of time in words, keeping only the largest units that apply.

```luau
function Format.Duration(seconds: number): string
```

**Returns**

`string` - Something like `1 hour 30 minutes`. Zero reads as `no time at all`.

Units that do not apply are left out rather than shown as none. Use it where a
player reads a length rather than watches it count down.

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

Small whole numbers are left alone, so a count of a few does not read as a
decimal.

### `Format.Digits`

`[Server]` | `[Client]`

Shortens a number that is already written out as digits, rather than held as a
number.

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

Beyond the largest tier that has a composed name, it falls back to exponent
notation rather than inventing a suffix.

```luau
-- Both read the same way, but only one of them is still exact here.
Format.Abbreviate(1234567)          --> "1.23M"
Format.Digits("1234567")            --> "1.23M"
Format.Digits("120000000000000000000000")   --> "120.00Sx"
```

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

Only regular English plurals are handled. An irregular word has to be written out
by the caller.
