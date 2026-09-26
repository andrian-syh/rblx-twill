---
title: Trade
description: Trades between two players on one server that cannot duplicate or lose an item
---

```luau
local Trade = require("@game/ServerScriptService/Twill").Kits.Trade

Trade.Configure({
	Kinds = { Coins = Trade.Currency("Coins"), Pets = Trade.Unique("Pets") },
})
```

Trade is a kit: a part of Twill for one kind of game feature rather than for
every game. It ships inside Twill and loads only when you name it, so a game
that never trades pays nothing for it. It needs `Data` configured, and takes
nothing else from your game but the shape of what can be traded.

Added in v2.0.0.

## Where it lives

The kit has a half in each Twill module, and `Twill.Kits.Trade` reaches the
right one on each side:

| Half | Holds |
| :--- | :--- |
| `ReplicatedStorage.Twill.Kits.Trade` | The remotes both sides agree on, and the client's calls. |
| `ServerScriptService.Twill.Kits.Trade` | Every decision, with `Ledger` and `Session` inside it. |

Leave both where they are. The server half finds the client half by path.

## How a trade runs

1. One player invites another with `Request`. The invite waits 30 seconds.
2. The other accepts with `Respond`, which opens the trade.
3. Each player sets their whole offer with `Offer`. Every item is checked
   against their live data before the offer is taken.
4. Each player locks in with `Ready`. Any change to either offer clears both.
5. Once both are ready, and 3 seconds after the last change, each player
   agrees with `Confirm`.
6. Once both agree, the server makes the swap and saves both players.

The server decides every step. A client only asks, and sees the result in its
trade view. An ask the server turns down comes back as a notice in the view,
not as an error.

The quiet moment in step 5 is there for the player being traded with. Whatever
changed last is on screen for a while before it can be agreed to, so an item
cannot be swapped out at the last second.

## What stops duplication

- **Every item is checked twice.** Once when it is offered, and again at the
  moment of the swap, against live data. Anything that changed in between is
  caught.
- **Neither side pays with what the other brings.** Both offers are checked
  before either moves.
- **The swap is tried on copies first.** Each copy must pass the store's own
  [`Validate`](/reference/data/#refusing-data-that-should-never-be-saved)
  check through [`Data.Check`](/reference/data/#datacheck). A trade that fails
  is refused, and neither player's data is touched.
- **Nothing yields during the swap.** Both players' data change in one step.
  If the real run fails part way, both are put back exactly as they were.
- **Both players are saved before the trade lets go.** Neither can start
  another trade until both saves have landed or timed out.
- **A player who leaves cancels the trade**, unless the swap has already been
  made.

A trade changes two data store keys, and no platform write covers two keys at
once. Both saves start together, so only a server crash between the two writes
could split a trade. Each player's data keeps a record of their last 20 trades,
with who they traded with and what moved each way, so support can settle such
a case by hand.

## Kinds

A kind says how one sort of item is held in a player's data. Three shapes are
built in:

| Kind | Data shape | Id | Amount |
| :--- | :--- | :--- | :--- |
| `Trade.Currency(field)` | `data[field]` is a number. | Always `""`. | Any whole number. |
| `Trade.Stack(field)` | `data[field][id]` is a count. | The item id. | Any whole number. |
| `Trade.Unique(field)` | `data[field][id]` is one value, such as a pet with its own stats. | The item id. | Always 1. |

A total that would pass 2^53 is refused, since it would no longer be stored
exactly. A unique item the receiver already holds under the same id is refused.

For any other shape, pass a table of your own:

```luau
Trade.Configure({
	Kinds = {
		Skins = {
			Has = function(data, id)
				return data.Skins ~= nil and data.Skins[id] == true
			end,
			Take = function(data, id)
				data.Skins[id] = nil
			end,
			Give = function(data, id)
				data.Skins = data.Skins or {}
				data.Skins[id] = true
			end,
			Single = true,
		},
	},
})
```

`Has`, `Take` and `Give` must not yield, and must do the same thing each time
they run on the same data. The swap is tried on copies first, and that trial
only proves anything when the real run repeats it. `Named = false` makes the
kind take no id, and `Single = true` limits each id to one.

## The client

```luau
local Trade = require(ReplicatedStorage.Twill).Kits.Trade

Trade.Observe(function(view)
	render(view)
end)

Trade.Request(other.UserId)
```

The view is the only thing the client needs to draw a trade window:

| Field | Meaning |
| :--- | :--- |
| `Invites` | Invites waiting for this player, each with `From` and `Expires`. |
| `Notice` | Why the last ask was turned down, until the next one is taken. |
| `Session` | The open trade: `Id`, `With`, `Mine` and `Theirs`, and `ConfirmAt`. |
| `Last` | How the last trade ended: `Outcome`, `Reason`, and `Saved`. |

`Mine` and `Theirs` each hold `Entries`, `Ready` and `Confirmed`. `Expires` and
`ConfirmAt` are on the server clock, so compare them with
`workspace:GetServerTimeNow()`.

`Outcome` is one of `completed`, `declined`, `cancelled`, `refused` or
`failed`.

## API

### `Trade.Configure`

`[Server]`

Sets up trading. Call it once, after `Data.Configure`.

```luau
function Trade.Configure(config: Config)
```

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `Kinds` | `{ [string]: Kind }` | Required | What may be traded, by name. |
| `MaxEntries` | `number?` | 32 | The most items one offer holds, up to 32. |
| `ConfirmDelay` | `number?` | 3 | Seconds after any change before confirming opens. |
| `InviteSeconds` | `number?` | 30 | How long an invite waits. |
| `LogField` | `(string \| false)?` | `"TradeLog"` | Where each player's trade record is kept, or `false` for none. |
| `CanTrade` | `((first: Player, second: Player) -> (boolean, string?))?` | None | Your own rule, checked at the invite, the accept and the swap. |

Throws on a second call, before `Data` is configured, and on a config that
does not fit the table above. Nothing is changed by a config that throws.

### `Trade.Cancel`

`[Server]`

Cancels a player's open trade from game code, such as when they enter combat.

```luau
function Trade.Cancel(player: Player, reason: string?): boolean
```

Returns `true` when a trade was cancelled. A trade already being completed is
left to finish.

### `Trade.IsTrading`

`[Server]`

Reports whether a player has a trade open, including one being completed.

```luau
function Trade.IsTrading(player: Player): boolean
```

### `Trade.OnCompleted`

`[Server]`

Fires once for each trade made.

```luau
Trade.OnCompleted: Signal<(record: Completed) -> ()>
```

`Completed` holds `Id`, `First` and `Second` as user ids, `FirstGave` and
`SecondGave`, and `Saved`, which is `false` when a save had not landed in time.
The data still saves with the next write.

### Client calls

`[Client]`

| Call | Asks the server to |
| :--- | :--- |
| `Trade.Request(userId)` | Invite a player on this server. |
| `Trade.Respond(userId, accept)` | Accept or decline an invite. |
| `Trade.Offer(entries)` | Replace this player's whole offer. Each entry is `{ Kind, Id, Amount }`. |
| `Trade.Ready(ready)` | Lock this player's offer in, or out. |
| `Trade.Confirm()` | Agree to the trade as it stands. |
| `Trade.Cancel()` | Walk away from the open trade. |
| `Trade.Get()` | Nothing; returns this player's view. |
| `Trade.Observe(callback, owner?)` | Nothing; runs the callback on every change to the view. |

Each is refused on the server, where `Twill.Kits.Trade` is the server half.

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Items per offer | 32 | Wire format |
| Kind name | 32 characters | Wire format |
| Item id | 64 characters | Wire format |
| Largest amount or total | 2^53 | Exact numbers |
| Invites waiting per player | 10 | Fixed |
| Trades kept in each player's record | 20 | Fixed |
| Wait for both saves | 20 seconds | Fixed |
| Asks per player, per remote | 4 per second, 8 for offers | Fixed |
