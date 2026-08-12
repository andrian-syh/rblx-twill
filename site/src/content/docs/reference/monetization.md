---
title: Monetization
description: Developer products and passes, handled once and safely.
---

**Server only.** Requires [`Data`](/reference/data/).

```luau
Twill.Monetization.HandleProduct(1234567, function(player, data)
	data.Coins += 1000
end)

if Twill.Monetization.OwnsPass(player, 7654321) then
	-- ...
end
```

For the workflow and how to test it, see
[Sell products and passes](/guides/monetization/).

## Why this belongs in the framework

Three problems, none of them optional, all of them easy to get wrong once.

**`ProcessReceipt` can only be assigned once per server.** Two systems that both
want purchases silently overwrite one another, and the loser simply stops being
paid. This module owns the one assignment and routes each receipt to the handler
registered for its product.

**Roblox redelivers a receipt until it is told the purchase was granted.** The
same purchase can arrive more than once. Granted purchase ids are recorded in the
player's own saved data, **in the same write as the reward**, and a receipt
already on that list is answered without granting anything a second time.

**`PurchaseGranted` is returned only once the write is confirmed.**
ProfileStore's `Save` does not wait, so reporting success before the data lands
would lose the reward if the server died in between, and the player would have
paid for nothing.

Anything that goes wrong answers `NotProcessedYet` instead, which asks Roblox to
try again later. The record above is what makes that retry safe.

## API

### `Monetization.HandleProduct`

`[Server]`

Registers what a developer product gives.

```luau
function Monetization.HandleProduct(productId: number, grant: Grant)

export type Grant = (player: Player, data: any, receipt: any) -> ()
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `productId` | `number` | The product's id. |
| `grant` | `Grant` | Receives the player, their live data table, and the raw receipt. |

**Returns**

`()` - Nothing.

Throws when that product already has a handler. A second registration is refused
rather than replacing the first, since a silently replaced handler stops paying
without saying so.

The handler writes the reward into `data` and nothing else. Saving it, recording
it, and answering the receipt are not its concern. A handler that throws results
in `NotProcessedYet`, so the purchase is retried rather than lost.

### `Monetization.Process`

`[Server]`

Answers one receipt.

```luau
function Monetization.Process(receipt: any): Enum.ProductPurchaseDecision
```

**Returns**

`Enum.ProductPurchaseDecision` - Granted once the reward is saved, otherwise not
yet. Yields.

This module already receives receipts, so you do not normally call this. It exists
for tests and for replaying a receipt by hand, and it grants at most once just the
same.

### `Monetization.OwnsPass`

`[Server]`

Reports whether a player owns a pass.

```luau
function Monetization.OwnsPass(player: Player, passId: number): boolean
```

**Returns**

`boolean` - True when they own it. Yields on the first call per player and pass.

The answer is remembered for the rest of their session, because the underlying
call spends web quota. A failed check reads as **not owned** and is not
remembered, so it is asked again rather than settled wrongly against the player.

A pass bought while they are playing is noticed, so the answer does not go stale
in the direction that would cost them what they paid for.

### `Monetization.ForgetPasses`

`[Server]`

Forgets what was remembered about a player's passes.

```luau
function Monetization.ForgetPasses(player: Player, passId: number?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | The player to forget. |
| `passId` | `number?` | One pass, or every pass for that player when left out. |

**Returns**

`()` - Nothing.

The next `OwnsPass` puts the question to the platform again.

## Passes bought mid-session

Nothing to write. This module listens for the purchase prompt closing and updates
what it remembers, so a pass bought during play turns on without a rejoin.

`ForgetPasses` exists for the case that listener cannot see, such as ownership
granted from outside the running server.

## Reserved storage

The record of granted purchases lives in the player's profile under a name
beginning `__twill`, alongside Twill's other bookkeeping. Do not use that prefix
for your own fields, and do not clear it: it is what stops a redelivered receipt
from paying twice.
