---
title: Random
description: Draws a player cannot predict, and rolls they can check.
---

**Server only**, because an outcome a client can draw is an outcome it can
choose.

```luau
local prize = Random.Pick(lootTable)
local code = Random.Id(16)
```

Every draw comes from a cryptographic generator rather than from `math.random`,
so knowing every earlier result says nothing about the next one.

## Rounds

A round makes an outcome auditable. Publish its commitment before anything is
drawn, reveal the seed afterwards, and the result is provably older than the
announcement.

```luau
local round = Random.Commit()
announce(round.Commitment)

local prize = round:Pick(lootTable)

announce(round:Reveal())
```

Anyone checks it with `Random.Verify(commitment, seed)` and then replays the same
draws with `Random.Replay(seed)`.

Draws are keyed Blake3 over the seed, so **any implementation of Blake3
reproduces them** and nothing has to be taken on trust.

:::caution[Replay in the same order]
The stream is ordered. Replaying a different sequence of calls produces a
different sequence of results, and the audit fails for a reason that has nothing
to do with honesty.
:::

For the full flow, see
[Run a draw a player can audit](/guides/provably-fair-draws/).

## API

### `Random.Bytes`

`[Server]`

Returns the requested number of bytes that nobody can predict.

```luau
function Random.Bytes(count: number): buffer
```

**Returns**

`buffer` - That many unpredictable bytes.

### `Random.Int`

`[Server]`

Returns a whole number between the bounds, both of them reachable.

```luau
function Random.Int(min: number, max: number): number
```

**Returns**

`number` - A value between the bounds, every one equally likely.

Throws on fractional bounds, an inverted pair, or a span wider than 32 bits.
`min == max` is legal and returns that value.

Values that do not divide evenly into the generator's word are drawn again rather
than folded, because folding would make the low outcomes fractionally likelier
than the high ones. That is exactly the bias a loot table must not have, and it is
why the span is bounded.

### `Random.Number`

`[Server]`

Returns a fraction between the bounds.

```luau
function Random.Number(min: number?, max: number?): number
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `min` | `number?` | Lowest value that may come back. Zero when left out. |
| `max` | `number?` | Highest value that may come back. One when left out. |

**Returns**

`number` - A value between the bounds.

### `Random.Pick`

`[Server]`

Returns one entry of a list, every entry equally likely.

```luau
function Random.Pick<T>(list: { T }): T
```

**Returns**

`T` - One of them.

Throws when there is nothing to choose between.

Weighting is not done here. A list where some entries appear more often, or a
weighted draw, is the caller's own arrangement.

### `Random.Shuffle`

`[Server]`

Reorders a list, every ordering equally likely.

```luau
function Random.Shuffle<T>(list: { T }): { T }
```

**Returns**

`{ T }` - That same list, reordered.

:::danger[This reorders in place]
The list handed in is the list handed back, so anything else holding it sees the
new order too. Shuffling a shared loot table permanently rearranges it for every
later reader. Copy it first when the original order matters:

```luau
local order = Random.Shuffle(table.clone(LOOT))
```
:::

### `Random.Id`

`[Server]`

Returns text of the given length that nobody can guess ahead of time.

```luau
function Random.Id(length: number): string
```

**Returns**

`string` - Text of that length, drawn from letters and digits.

Throws when the length is not a whole number above zero.

Length is the only thing that decides how hard it is to guess, so ask for enough
of it. Use it for redeem codes, session ids, and the
[`Token`](/reference/token/) secret.

```luau
Twill.Token.Configure({ Secret = Random.Id(64) })
```

### `Random.Commit`

`[Server]`

Opens a round whose commitment can be published before anything is drawn.

```luau
function Random.Commit(): Round

export type Round = {
	Commitment: string,
	Int: (self: Round, min: number, max: number) -> number,
	NextNumber: (self: Round) -> number,
	Pick: <T>(self: Round, list: { T }) -> T,
	Reveal: (self: Round) -> string,
}
```

**Returns**

`Round` - A round, with its `Commitment` ready to publish.

Publish the commitment first, draw, then reveal. In that order it proves
something; in any other order it proves nothing.

### `Random.Replay`

`[Server]`

Reopens a revealed round so its draws can be taken again.

```luau
function Random.Replay(seed: string): Round
```

**Returns**

`Round` - A round that draws exactly what the original drew.

Throws when the seed is not one a round could have revealed.

### `Random.Verify`

`[Server]`

Reports whether a revealed seed is the one a commitment was made to.

```luau
function Random.Verify(commitment: string, seed: string): boolean
```

**Returns**

`boolean` - True only when the seed matches the commitment.

Anything malformed answers `false` rather than raising, because this reads
untrusted input: the whole point is that a player can hand you a seed to check.

The [`verifyroll` command](/reference/admin/#built-in-commands) puts this in the
admin console, so a moderator can settle a dispute in front of the player without
either of them having to trust the other.

### `Round:Int`

`[Server]`

Returns a whole number between the bounds, taken from this round's stream.

```luau
function round:Int(min: number, max: number): number
```

**Returns**

`number` - A value between the bounds, both reachable.

Throws on the same bounds `Random.Int` refuses.

### `Round:NextNumber`

`[Server]`

Returns a fraction of one, taken from this round's stream.

```luau
function round:NextNumber(): number
```

**Returns**

`number` - A value from zero, up to but never reaching one.

Named to match the method an ordinary `Random` carries, so anything that draws
from one draws from a round without knowing which it was handed.
[`Chance`](/reference/chance/) is what this exists for.

Two words of the stream are taken per call rather than one, so the fraction is as
fine as an ordinary generator's. That matters when replaying: a round drawing
fractions consumes its stream twice as fast as one drawing whole numbers, which
is invisible unless you interleave the two and expect a particular sequence.

### `Round:Pick`

`[Server]`

Returns one entry of a list, taken from this round's stream.

```luau
function round:Pick<T>(list: { T }): T
```

**Returns**

`T` - One of them, every entry equally likely.

Throws when there is nothing to choose between.

### `Round:Reveal`

`[Server]`

Hands back the seed so anyone can check the commitment and replay the draws.

```luau
function round:Reveal(): string
```

**Returns**

`string` - The seed, in a form safe to publish as text.

:::danger[Only after the round is over]
Revealing it earlier tells everybody what is coming, because the stream is fixed
by the seed.
:::

## Weighted draws

`Pick` and `Shuffle` treat every entry as equally likely. For a table where some
entries should come up more often than others, use
[`Chance`](/reference/chance/), which takes a round from here and draws from its
stream, so a weighted outcome is as auditable as an even one.
