---
title: Limit
description: Token bucket metering, per caller or per player, with reporting that does not flood
---

```luau
local Limit = require("@game/ReplicatedStorage/Twill").Limit

local allowance = Limit.PerPlayer(10)

if not allowance:Take(player) then
	return
end
```

## Token buckets

A bucket refills at its rate and never holds more than its burst. It starts full,
so the first call always passes.

A rate below one is a cooldown. `Limit.new(0.25)` permits one call every four
seconds.

The burst never falls below one token however slow the refill, so a slow bucket
still admits a single call rather than none. A refused call spends nothing, so
being turned away does not push a caller's own recovery further out.

`Take` credits what the time since the last call earned back, then spends. There
is no timer and no per-bucket work between calls.

## Per player, per key

`PerPlayer` keeps a separate bucket for every player, and a separate one for
every key of theirs.

```luau
local allowance = Limit.PerPlayer(4)

allowance:Take(player, "BuyItem")
allowance:Take(player, "Emote")
```

Both spend from their own bucket at the same rate. Leaving the key out uses one
shared bucket per player.

A player's buckets are created the moment they are first needed and forgotten
when that player leaves. There is no window in which a caller is unmetered, and
nothing accumulates for players who are gone.

## Reporting a flood

Logging once per refusal makes the log the flood. `Throttle` counts refusals
instead, and answers with the count at most once per interval. Writing the line
stays with the caller.

```luau
local speak = Limit.Throttle(5)

local refused = speak(player, remoteName)
if refused then
	logger:Warn(`{player.Name} was refused {refused} time(s)`)
end
```

The count covers everything since the last time it spoke, including the call that
is speaking now. Between reports it answers `nil`.

Records are keyed the same way allowances are, so a player and a remote each get
their own quiet period. A player's records are forgotten when they leave.

## API

### `Limit.new`

`[Server]` | `[Client]`

Creates one allowance that refills at the given rate.

```luau
function Limit.new(rate: number, burst: number?): Bucket
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `rate` | `number` | Units earned back per second. Must be above zero. |
| `burst` | `number?` | The most it will ever hold. The rate itself when left out, and never less than one. |

**Returns**

`Bucket` - An allowance for one caller.

Throws when the rate is not a number above zero.

Not keyed by anything. Use it for a global budget: an outward call, a shared
resource, a server-wide announcement.

### `Limit.PerPlayer`

`[Server]` | `[Client]`

Creates an allowance per player, forgotten when that player leaves.

```luau
function Limit.PerPlayer(rate: number, burst: number?): Allowance
```

**Returns**

`Allowance` - An allowance covering every player.

Throws when the rate is not a number above zero.

### `Limit.Throttle`

`[Server]` | `[Client]`

Creates a reporter that speaks at most once per interval and counts the rest.

```luau
function Limit.Throttle(interval: number): Throttle
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number` | Seconds of quiet between one report and the next. Must be above zero. |

**Returns**

`Throttle` - A function answering how many went unreported, or `nil` to stay
quiet.

Throws when the interval is not a number above zero.

### `Bucket:Take`

`[Server]` | `[Client]`

Spends from the allowance, crediting what the time since the last call earned
back.

```luau
function Bucket:Take(amount: number?): boolean
```

**Returns**

`boolean` - `false` when there was not enough left to spend. One unit when the
amount is left out.

A cost larger than the burst can never be met.

### `Allowance:Take`

`[Server]` | `[Client]`

Spends one unit of a player's allowance, with each key kept apart.

```luau
function Allowance:Take(player: Player, key: any?): boolean
```

**Returns**

`boolean` - `false` when that player has nothing left to spend on that key.

### `Throttle`

`[Server]` | `[Client]`

```luau
type Throttle = (key: any, subKey: any?) -> number?
```

Answers the number of calls since it last spoke, or `nil` while it is staying
quiet.

## Where Twill uses this

| Caller | What it meters |
| :--- | :--- |
| [`Net`](/reference/net/) | Calls per player per remote, and total bytes per player. |
| `Net` | Refusal reports, once per five seconds per player and remote. |
| [`Store`](/reference/store/) | Reports of a peer sending something unreadable. |
