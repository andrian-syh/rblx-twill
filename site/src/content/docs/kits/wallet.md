---
title: Wallet
description: Currencies a player holds, which never go below zero or past their ceiling
---

```luau
local Wallet = require("@game/ServerScriptService/Twill").Kits.Wallet

Wallet.Configure({ Currencies = { Coins = {}, Gems = { Max = 100000 } } })
local paid, reason = Wallet.Spend(player, "Coins", 250, "Shop")
```

Wallet is a kit: a part of Twill for one kind of game feature rather than for
every game. It ships inside Twill and loads only when you name it. It needs
`Data` configured, and keeps each player's balances in their saved data.

## Where it lives

| Half | Holds |
| :--- | :--- |
| `ReplicatedStorage.Twill.Kits.Wallet` | The client's reads of its own balances. |
| `ServerScriptService.Twill.Kits.Wallet` | Every change, with `Balances` inside it. |

The kit declares no remotes. A client asks through a remote of your own, your
handler decides whether the player may, and then calls the kit.

## Changes are whole or refused

Every change checks itself against the player's live data before it is made. A
change that cannot be made in full returns `false` and a reason, and the balance
is left as it was.

| Asked for | Result |
| :--- | :--- |
| Spending more than the balance | Refused. The balance never goes below zero. |
| Adding past the currency's ceiling | Refused. Nothing is added, so nothing is dropped unseen. |
| An amount that is zero, negative, fractional, or not a number | Refused. |
| A currency that was not configured | Refused. |

No call yields. To spend and grant together, make both inside
[`Data.Transact`](/reference/data/#datatransact). A grant that fails undoes the
spend:

```luau
local bought, reason = Data.Transact(player, function()
	assert(Wallet.Spend(player, "Coins", 250, "Shop"))
	assert(Inventory.Add(player, "Sword"))
end)
```

## Ordinary and big currencies

| Currency | Balance is | Ceiling | Amounts taken |
| :--- | :--- | :--- | :--- |
| Ordinary | A whole number. | `Max`, or 2^53 when left out. | A whole number. |
| `Big = true` | A [`BigNumber`](/reference/bignumber/), exact at any size. | `Max`, or none when left out. | A whole number, a string of digits, or a `BigNumber`. |

2^53 is the largest whole number Luau holds exactly. Past it, adding 1 changes
nothing, which is why an ordinary currency stops there. Use `Big` for a currency
that grows without limit, and see
[Unbounded currency](/guides/unbounded-currency/) for showing one.

A number already saved under a currency that is later marked `Big` is still
read, and becomes a `BigNumber` on its next change.

## What is saved

Balances are kept in the player's data under `Wallet`, one field per currency.
A starting balance belongs in the template, which fills in whatever a returning
player lacks:

```luau
Data.Configure({
	Store = "PlayerData",
	Template = { Wallet = { Coins = 100 } },
	Replicate = { "Wallet" },
	Validate = Wallet.Check,
})
```

List `Wallet` under `Replicate` to show a player their own balances. A currency
that is no longer configured stays in the data untouched.

## Reasons and the economy dashboard

`Add` and `Spend` take a reason. A currency marked `Track` reports each earn and
spend that stays to the Roblox economy dashboard, as a source or a sink, with
the reason as its transaction type. The dashboard groups by that type, so use
the same few reasons throughout: `IAP`, `Shop`, `Gameplay`,
`ContextualPurchase`, `TimedReward`, `Onboarding`, or text of your own. A change
with no reason is reported as `Gameplay`.

`Set` is never reported, and a change undone by `Data.Transact` is never
reported. The dashboard takes up to 5 currencies, and receives events only from
a published place.

## Trading a currency

`Wallet.Kind` describes a currency to the [Trade kit](/kits/trade/). A trade
made through it keeps to the currency's ceiling, and a currency with
`Tradeable = false` is never covered.

```luau
Trade.Configure({
	Kinds = { Coins = Wallet.Kind("Coins") },
})
```

## The client

```luau
local Wallet = require(ReplicatedStorage.Twill).Kits.Wallet

Wallet.Observe("Coins", function(balance)
	label.Text = tostring(balance)
end, bag)
```

The client half reads the copy that arrives with the player's replicated data.
It changes nothing.

## API

### `Wallet.Configure`

`[Server]`

Sets up the currencies. Call it once, after `Data.Configure`.

```luau
function Wallet.Configure(config: Config)
```

`Currencies` is required and names each currency. Each takes:

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `Max` | `Amount?` | 2^53, or none for `Big` | The most a player may hold. |
| `Big` | `boolean?` | `false` | Keeps the balance as a `BigNumber`. |
| `Tradeable` | `boolean?` | `true` | Whether the trade kind covers it. |
| `Track` | `boolean?` | `false` | Reports earns and spends to the economy dashboard. |

Throws on a second call, before `Data` is configured, on more than 5 tracked
currencies, and on a config that does not fit the table above. Nothing is
changed by a config that throws.

### `Wallet.Add`

`[Server]`

Adds to a player's balance.

```luau
function Wallet.Add(player: Player, currency: string, amount: Amount, reason: string?): (boolean, string?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Who earns it. |
| `currency` | `string` | The currency, as it was configured. |
| `amount` | `Amount` | How much. |
| `reason` | `string?` | Where it came from. |

**Returns**

`boolean` - `true` when it was added. `string?` - why it was not.

Throws when `reason` is neither text nor left out.

### `Wallet.Spend`

`[Server]`

Spends from a player's balance.

```luau
function Wallet.Spend(player: Player, currency: string, amount: Amount, reason: string?): (boolean, string?)
```

**Returns**

`boolean` - `true` when it was spent. `string?` - why it was not.

Throws when `reason` is neither text nor left out.

### `Wallet.Set`

`[Server]`

Sets a player's balance outright.

```luau
function Wallet.Set(player: Player, currency: string, balance: Amount): (boolean, string?)
```

**Returns**

`boolean` - `true` when it was set. `string?` - why it was not.

Zero is allowed. Use it for tools and migrations. A handler that passes a
client's number to `Set` lets that client choose its own balance.

### `Wallet.Transfer`

`[Server]`

Moves a currency from one player to another on this server.

```luau
function Wallet.Transfer(from: Player, to: Player, currency: string, amount: Amount): (boolean, string?)
```

**Returns**

`boolean` - `true` when it moved. `string?` - why it did not.

Both balances change in one step, or neither does. The move is in memory until
each player's data saves; call [`Data.SaveNow`](/reference/data/#datasavenow)
for both where it must outlive a crash.

### `Wallet.Get`

`[Server]`

Returns a player's balance of a currency.

```luau
function Wallet.Get(player: Player, currency: string): Balance
```

**Returns**

`Balance` - a number, or a `BigNumber` for a big currency. 0 while their data is
not loaded, and for a currency that was not configured.

### `Wallet.Has`

`[Server]`

Reports whether a player's balance covers an amount.

```luau
function Wallet.Has(player: Player, currency: string, amount: Amount): boolean
```

### `Wallet.Check`

`[Server]`

Reports whether saved balances are well formed.

```luau
function Wallet.Check(data: { [string]: any }): (boolean, string?)
```

**Returns**

`boolean` - `true` when every balance is a whole number, zero or more.
`string?` - the first thing wrong.

Pass it as `Validate` to `Data.Configure`, or call it from your own check.

### `Wallet.Kind`

`[Server]`

Describes a currency to the Trade kit.

```luau
function Wallet.Kind(currency: string): Kind
```

Throws before `Configure`, and for a currency that was not configured.

### `Wallet.OnChanged`

`[Server]`

Fires for each change that stays.

```luau
Wallet.OnChanged: Signal<(player: Player, change: Change) -> ()>
```

| Field | Meaning |
| :--- | :--- |
| `Action` | `added`, `spent` or `set`. |
| `Currency` | The currency that changed. |
| `Amount` | How much, as it was passed in. |
| `Balance` | The balance afterwards. |
| `Reason` | The reason given, or `Transfer` for a transfer. |

A change made inside `Data.Transact` is announced once the transaction is kept,
and never when it is undone. A trade made through the kind announces nothing.

### Client calls

`[Client]`

| Call | Returns |
| :--- | :--- |
| `Wallet.Get(currency)` | This player's balance. 0 before anything arrived. |
| `Wallet.Observe(currency, callback, owner?)` | A subscription. The callback runs on every change. |

Each is refused on the server, where `Twill.Kits.Wallet` is the server half.

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Largest ordinary balance or amount | 2^53 | Exact numbers |
| Digits in a big amount passed as text | 1000 | Fixed |
| Tracked currencies | 5 | Economy dashboard |
| Currency name | 64 characters, no dot | Fixed |
