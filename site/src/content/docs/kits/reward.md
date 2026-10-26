---
title: Reward
description: Daily claims, streaks and time away, each kept in the same write as its reward
---

```luau
local Reward = require("@game/ServerScriptService/Twill").Kits.Reward

Reward.Configure({ Tracks = { Daily = { Rewards = { 100, 200, 400 } } }, Grant = grant })
local claimed, reason, claim = Reward.Claim(player, "Daily")
```

Reward is a kit: a part of Twill for one kind of game feature rather than for
every game. It ships inside Twill and loads only when you name it. It needs
`Data` configured, and keeps each player's tracks in their saved data.

The kit decides when a player may be rewarded. What the reward is, and how it
is given, stays with your game: the kit hands each claim to a `Grant` function
of your own.

## Where it lives

| Half | Holds |
| :--- | :--- |
| `ReplicatedStorage.Twill.Kits.Reward` | The client's reads of its own tracks, with `Calendar` inside it. |
| `ServerScriptService.Twill.Kits.Reward` | Every claim, mend and collection. |

`Calendar` holds the day rules both halves use, so a client shows the status
the server will decide. The kit declares no remotes. A client asks through a
remote of your own, and your handler calls the kit.

## Days are numbered in UTC

Every day has a number, counted from `ResetHour` in UTC:

```luau
local today = math.floor((os.time() - ResetHour * 3600) / 86400)
```

The server's clock decides, and the same hour turns the day over on every
server. A player's own clock and time zone are never read, so moving either
opens nothing. UTC has no daylight saving time, so the reset never moves; only
the local hour it falls on does.

A track saves the number of the day it was last claimed, and a claim is open
only on a later day. A server whose clock runs behind finds the day already
claimed, so it cannot open a second claim.

## One claim per day, kept with its reward

`Claim` runs your `Grant` and saves the claim inside one
[`Data.Transact`](/reference/data/#datatransact). The day is spent only when
the grant lands:

| `Grant` | Result |
| :--- | :--- |
| Returns `true` | The reward stays and the day is claimed. |
| Returns `false` and a reason | Everything is undone, and `Claim` returns that reason. The day stays open. |
| Raises or yields | Everything is undone. The day stays open. |
| Leaves data the store's `Validate` refuses | Everything is undone. The day stays open. |

A player whose bag is full can claim again the same day, once there is room:

```luau
Grant = function(player, claim)
	local reward = claim.Reward
	assert(Wallet.Add(player, "Coins", reward.Coins, "TimedReward"))
	return Inventory.Add(player, reward.Item)
end,
```

Asking again on a claimed day returns `false` and changes nothing, however
often it is asked. Session locking keeps a player's data on one server at a
time, so a second server cannot grant the same day.

Called inside a `Data.Transact` of your own, `Claim` returns `false` when it is
refused. Raise on that return to undo the rest of the transaction.

## Streaks and the cycle

A track's `Rewards` list is one cycle. Each claim takes the next reward, and
after the last one the cycle starts over while the streak and the total keep
growing.

| `Miss` | A missed day |
| :--- | :--- |
| `"Keep"` | Costs nothing. The cycle moves on by every claim made, and the streak starts again at 1. |
| `"Reset"` | Breaks the streak. The cycle moves on by the streak, so the next claim brings the first reward. |

`Grace` is the number of days a player may miss without breaking the streak.
With `Grace = 1`, claiming on Monday and again on Wednesday keeps the streak.

A streak breaks only when the next claim is made, so nothing is written at
midnight. `claim.Broke` is `true` on the claim that broke one. A reward for a
milestone, such as the 30th claim, belongs in `Grant`, which receives
`claim.Streak` and `claim.Total`.

## Mending a streak

`Mend` repairs a broken streak between the break and the next claim. It fills
the missed days, so the next claim keeps the streak. Your `Mend` function sets
the price, and refuses a mend by returning `false` and a reason:

```luau
Mend = function(player, mend)
	if mend.Missed > 3 then
		return false, "too late to mend"
	end
	return Wallet.Spend(player, "Gems", 50 * mend.Missed)
end,
```

The mend and its price are made in one transaction, so a price the player
cannot pay mends nothing. Once a player claims after a break, the old streak
is gone and there is nothing left to mend.

## Time away

`Reward.Offline` hands your `Offline.Grant` the seconds a player was away,
once per session. The kit counts the time; your game turns it into a reward,
at its own rate:

```luau
Offline = {
	Cap = 8 * 3600,
	Grant = function(player, away)
		return Wallet.Add(player, "Coins", away.Seconds * 2, "TimedReward")
	end,
},
```

| Case | Seconds |
| :--- | :--- |
| A player never seen before | 0, and `Offline.Grant` is not called. |
| Away longer than `Cap` | `Cap`. `away.Raw` holds the time that passed. |
| A last sighting later than the server's clock | 0. The sighting is not moved back. |

Collect it as soon as the player's data is ready, before time spent playing
counts as time away. After a collection the kit stamps the player's last
sighting every 60 seconds and when they leave, so a server that crashes pays at
most that much play as time away. A grant that is refused keeps the window, and
the next call pays it.

`Wallet.Add` refuses an amount of 0, so return `true` for an absence too short
to earn anything.

## What is saved

```luau
data.Reward = {
	Seen = 1792886400,
	Tracks = { Daily = { Last = 20751, Streak = 4, Total = 37 } },
}
```

`Last` is the number of the day last claimed. `Seen` is written only when
`Offline` is configured. The kit creates the field on first use, so leave
`Reward` out of the template. List it under `Replicate` to show a player their
own tracks, and call `Reward.Check` from `Validate`:

```luau
Data.Configure({
	Store = "PlayerData",
	Template = { Wallet = { Coins = 0 } },
	Replicate = { "Wallet", "Reward" },
	Validate = function(data)
		local valid, problem = Wallet.Check(data)
		if not valid then
			return false, problem
		end
		return Reward.Check(data)
	end,
})
```

A track that is no longer configured stays in the data untouched. In a released
game, moving `ResetHour` earlier opens one extra claim, and changing the length
of `Rewards` moves every player's place in the cycle.

## Claiming from a client

The remote carries no arguments. The server knows the player and the day:

```luau
local claimDaily = Net.Declare("ClaimDaily", {}, { Types.Boolean })

Net.Handle(claimDaily, function(player)
	return (Reward.Claim(player, "Daily"))
end, { Rate = 2, Reject = function() return false end })
```

To claim without a button, call `Reward.Claim` from your own code, such as once
the player has played for a few minutes.

## The client

```luau
local Reward = require(ReplicatedStorage.Twill).Kits.Reward

Reward.Observe("Daily", function(status)
	button.Visible = status ~= nil and status.Claimable
end, bag)
```

The client half works out a track's status from the rules the server publishes
under the replicated key `TwillReward` and the player's replicated data, by the
server's clock. A new day changes no data, so `Observe` does not run at
midnight; count down to `status.NextAt` for that.

## API

### `Reward.Configure`

`[Server]`

Sets up the tracks and time away. Call it once, after `Data.Configure`.

```luau
function Reward.Configure(config: Config)
```

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `ResetHour` | `number?` | `0` | The hour in UTC, from 0 to 23, when the day turns over. |
| `Tracks` | `{ [string]: Track }?` | none | The tracks, by name. |
| `Grant` | `(player, claim) -> (boolean, string?)` | none | Gives a claim's reward. Required with `Tracks`. |
| `Mend` | `((player, mend) -> (boolean, string?))?` | none | Takes the price of a mend. Without it, `Mend` is refused. |
| `Offline` | `{ Cap: number, Grant: (player, away) -> (boolean, string?) }?` | none | Time away, with its cap in whole seconds. |
| `Clock` | `(() -> number)?` | `os.time` | The server's clock, in seconds since the Unix epoch. |

Each track takes:

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `Rewards` | `{ any }` | none | The cycle, as a list of at least one reward. Each is passed to `Grant` unchanged. |
| `Miss` | `"Keep" \| "Reset"` | `"Keep"` | What a missed day costs. |
| `Grace` | `number?` | `0` | Days a player may miss without breaking the streak. |

`Configure` needs `Tracks`, `Offline`, or both. It throws on a second call,
before `Data` is configured, and on a config that does not fit the tables
above. Nothing is changed by a config that throws. `Grant`, `Mend` and
`Offline.Grant` run inside a transaction and must not yield.

`Clock` exists for tests, which move the clock by whole days. The client half
always uses the server's real clock.

### `Reward.Claim`

`[Server]`

Claims today's reward on a track.

```luau
function Reward.Claim(player: Player, track: string): (boolean, string?, Claim?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Who claims. |
| `track` | `string` | The track, as it was configured. |

**Returns**

`boolean` - `true` when the reward was granted. `string?` - why it was not.
`Claim?` - the claim, when it was granted.

| Field | Meaning |
| :--- | :--- |
| `Track` | The track claimed. |
| `Reward` | The reward from `Rewards`. |
| `Day` | Its place in the cycle, from 1. |
| `Streak` | The streak this claim leaves. |
| `Total` | Every claim made on the track, this one included. |
| `Today` | The number of the day claimed. |
| `Broke` | `true` when this claim broke a streak. |

`Grant` receives the same table. Throws before `Configure`.

### `Reward.Mend`

`[Server]`

Mends a broken streak before the next claim.

```luau
function Reward.Mend(player: Player, track: string): (boolean, string?, Mend?)
```

**Returns**

`boolean` - `true` when the streak was mended. `string?` - why it was not.
`Mend?` - `Track`, `Missed`, the days missed, and `Streak`, the streak it
keeps.

The `Mend` function receives the same table. Throws before `Configure`.

### `Reward.Offline`

`[Server]`

Hands the game a player's time away, once per session.

```luau
function Reward.Offline(player: Player): (boolean, string?, number?)
```

**Returns**

`boolean` - `true` when it was collected, 0 seconds included. `string?` - why
it was not. `number?` - the seconds that counted.

`Offline.Grant` receives `Seconds`, `Raw`, the seconds before the cap, and
`From` and `To`, the last sighting and now. Throws before `Configure`.

### `Reward.Status`

`[Server]`

Describes one of a player's tracks, changing nothing.

```luau
function Reward.Status(player: Player, track: string): Status?
```

**Returns**

`Status?` - `nil` while their data is not loaded, and for a track that was not
configured.

| Field | Meaning |
| :--- | :--- |
| `Claimable` | `true` when a claim is open today. |
| `Day` | The place in the cycle the next claim brings. |
| `Streak` | The current streak, 0 once it has broken. |
| `Total` | Every claim made on the track. |
| `NextAt` | When the next claim opens, in seconds since the Unix epoch. |
| `BreaksAt` | When the streak breaks without a claim. `nil` for a track never claimed. |

Throws before `Configure`.

### `Reward.Today`

`[Server]`

Returns today's number.

```luau
function Reward.Today(): number
```

Throws before `Configure`.

### `Reward.NextReset`

`[Server]`

Returns when the next day starts, in seconds since the Unix epoch.

```luau
function Reward.NextReset(): number
```

Throws before `Configure`.

### `Reward.Check`

`[Server]`

Reports whether saved reward state is well formed.

```luau
function Reward.Check(data: { [string]: any }): (boolean, string?)
```

**Returns**

`boolean` - `true` when every track holds whole numbers, with a streak of 1 or
more and a total no smaller than the streak. `string?` - the first thing wrong.

### `Reward.OnChanged`

`[Server]`

Fires for each claim, mend and collection that stays.

```luau
Reward.OnChanged: Signal<(player: Player, change: Change) -> ()>
```

| `Action` | Other fields |
| :--- | :--- |
| `claimed` | `Track`, `Day`, `Streak`, `Total`, `Broke` |
| `mended` | `Track`, `Missed`, `Streak` |
| `collected` | `Seconds` |

A change made inside `Data.Transact` is announced once the transaction is kept,
and never when it is undone.

### Client calls

`[Client]`

| Call | Returns |
| :--- | :--- |
| `Reward.Status(track)` | The track's `Status`. `nil` before the rules and this player's data arrive. |
| `Reward.Observe(track, callback, owner?)` | A subscription. The callback runs with the status when the track's saved state changes. |
| `Reward.NextReset()` | When the next day starts. `nil` before the rules arrive. |

Each is refused on the server, where `Twill.Kits.Reward` is the server half.

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| `ResetHour` | 0 to 23 | Fixed |
| Track name | 64 characters, no dot | Fixed |
| Last sighting stamped | Every 60 seconds | Fixed |
| Time away collected | Once per session | Fixed |
