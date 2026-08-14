---
title: Limit
description: Metering, and knowing when to stop talking about it.
---

```luau
local allowance = Limit.PerPlayer(10)

if not allowance:Take(player) then
	return
end
```

## Token buckets

A bucket refills at its rate and never holds more than its burst.

**A rate below one is how you spell a cooldown.** `Limit.new(0.25)` permits one
call every four seconds.

The burst never falls below a single token, so the first call is allowed however
slow the refill is. A refused call costs nothing, so a caller being turned away
does not push their own recovery further out.

## Throttling the log

The path that refuses a flood is the path a flood runs down. A line written per
refusal turns the limiter into an amplifier for the traffic it is rejecting.

`Throttle` answers that. It says how many were refused since it last spoke, and
nothing at all in between. Writing the line stays with the caller.

```luau
local speak = Limit.Throttle(5)

local refused = speak(player, packetName)
if refused then
	logger:Warn(`{player.Name} was refused {refused} time(s)`)
end
```

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

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `rate` | `number` | Units earned back per second, per player. Must be above zero. |
| `burst` | `number?` | The most one player's allowance will hold. The rate itself when left out, and never less than one. |

**Returns**

`Allowance` - An allowance covering every player, created per player on first
use.

Throws when the rate is not a number above zero.

### `Limit.Throttle`

`[Server]` | `[Client]`

Creates a reporter that speaks at most once per interval and counts the rest.

```luau
function Limit.Throttle(interval: number): Throttle

export type Throttle = (key: any, subKey: any?) -> number?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number` | Seconds of quiet between one report and the next. Must be above zero. |

**Returns**

`Throttle` - Answers how many went unreported, or `nil` to stay quiet.

Throws when the interval is not a number above zero.

Deciding when there is a line to write is all this does. Writing it stays with
the caller. A throttle keyed by a player forgets that player when they leave.

### `Bucket:Take`

`[Server]` | `[Client]`

Spends from the allowance, first crediting whatever the time since the last call
has earned back.

```luau
export type Bucket = {
	Take: (self: Bucket, amount: number?) -> boolean,
}
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `amount` | `number?` | How much to spend. One when left out. |

**Returns**

`boolean` - False when there was not enough left to spend.

### `Allowance:Take`

`[Server]` | `[Client]`

Spends one unit of a player's allowance.

```luau
export type Allowance = {
	Take: (self: Allowance, player: Player, key: any?) -> boolean,
}
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Whose allowance to spend. |
| `key` | `any?` | What they are spending it on. A shared one when left out. |

**Returns**

`boolean` - False when that player has nothing left to spend on that key.

Each key gets its own separate standing, so someone exhausting one action has not
exhausted the others.

```luau
allowance:Take(player, "Emote")
allowance:Take(player, "Chat")
```

## Lifetime

Buckets and throttles keyed by a player forget that player when they leave.

**Build them once, where the system lives, not once per caller.** A bucket
created inside the function it guards is a fresh bucket every call, and refuses
nothing.

```luau title="Do this"
local allowance = Limit.PerPlayer(10)

local function onFire(player)
	if not allowance:Take(player) then return end
end
```

```luau title="Not this"
local function onFire(player)
	local allowance = Limit.PerPlayer(10)
	if not allowance:Take(player) then return end
end
```

The second builds a new bucket, full, on every call, and therefore refuses
nothing.

## Already applied for you

Every remote served through [`Net.Handle`](/reference/net/#rate) is metered
through this module whether or not you pass a `Rate`. You only need `Limit`
directly for things that are not remotes.
