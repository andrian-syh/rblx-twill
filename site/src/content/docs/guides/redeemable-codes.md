---
title: Issue redeemable codes
description: Hand out codes that prove their own contents, and make sure each one is spent once
---

The obvious way to build a promo code is a DataStore of valid codes. It works,
and it costs you a read on every attempt, including every attempt by someone
typing rubbish into the box.

[`Token`](/reference/token/) inverts that. A code carries its own payload and
its own proof, so checking one touches no storage at all. What you still owe is
a record of the codes that were spent, because a signature proves where a code
came from, never whether it has been used.

## Install the secret

Once, during `Init`, from a module only the server can reach.

```luau
Twill.Token.Configure({
	Secret = require(ServerScriptService.Secrets).TokenSecret,
})
```

:::danger[Never generate the secret at boot]
`Random.Id(64)` is the right way to make one, but run it once, by hand, and
paste the result into a server-side module.

A secret generated at startup differs on every server and after every restart,
so a code issued on one machine is refused everywhere else, and every code ever
issued dies at the next deploy.
:::

## Issue a code

```luau
-- The audience is signed in, so a promo code cannot be replayed as an invite.
local code = Twill.Token.Issue("promo", {
	Grant = "starter_pack",
	Coins = 500,
}, 7 * 86400)
```

The payload travels inside the code, which is what removes the lookup. Two
consequences follow, and both matter:

- **It is signed, not hidden.** Anyone holding the code can read what is in it.
  Put in what a player may see, and nothing else.
- **It goes through [`Compress`](/reference/compress/)**, which is lossy for
  Roblox values. Carry an id and resolve it server-side rather than carrying a
  `Color3` you need exactly.

Leave the lifetime out for a code that never expires. Prefer giving one, because
an unbounded code outlives every reason you had for issuing it.

## Redeem it once

This is the half `Token` deliberately does not do for you.

```luau
local REDEEMED_FIELD = "RedeemedCodes"

local function onRedeem(player: Player, code: string): (boolean, string)
	local payload, reason = Twill.Token.Read("promo", code)

	-- Read the reason, never the payload. The payload is only trustworthy
	-- when there is no reason beside it.
	if reason then
		return false, reason
	end

	local data = Twill.Data.Get(player)
	if not data then
		return false, "not ready"
	end

	local redeemed = data[REDEEMED_FIELD]

	-- The signature says the code is genuine. Only this record says it is
	-- still unspent.
	if table.find(redeemed, code) then
		return false, "already redeemed"
	end

	table.insert(redeemed, code)
	data.Coins += payload.Coins

	return true, "redeemed"
end
```

Serve it with the usual screening, and be strict with the rate: a redemption
endpoint is a guessing endpoint if you let it be.

```luau
Twill.Net.Handle(Remotes.Redeem, onRedeem, {
	-- One attempt every four seconds. Guessing a signed code is infeasible,
	-- but there is no reason to help.
	Rate = 0.25,
	Schema = { { "string", 1, 400 } },
	Reject = function()
		return false, "slow down"
	end,
})
```

## What the reasons mean

`Read` answers one of four, and telling them apart is worth doing because they
call for different replies.

| Reason | Say to the player | What it usually means |
| --- | --- | --- |
| `malformed` | "That is not a code." | A typo, or something pasted from the wrong place. |
| `forged` | "That is not a code." | Someone edited a real code. Worth logging. |
| `expired` | "That code has expired." | Genuine, and they may be annoyed. Be clear. |
| `wrong audience` | "That is not a code." | A code from another feature. Worth logging. |

`forged` and `wrong audience` mean somebody is experimenting. Answer them
exactly as you answer `malformed`, and put the detail in your log rather than in
the reply.

## Per-player codes

Signing the recipient into the payload gives a code that only one account can
use, without any storage on your side.

```luau
local code = Twill.Token.Issue("invite", {
	For = player.UserId,
	Grant = "founder_badge",
}, 30 * 86400)
```

```luau
-- Cheap, and it happens before the redemption record is even consulted.
if payload.For ~= player.UserId then
	return false, "that code is not yours"
end
```

## When a DataStore is still the right answer

Tokens win where codes are handed out in bulk and checked often. They lose where
you need to revoke one, count redemptions, or change what a code grants after
issuing it. A signed code cannot be recalled: once issued it is valid until it
expires, and the only lever you have left is the secret, which invalidates every
code at once.

For a campaign that needs revocation or live tuning, keep the codes in
[`Data`](/reference/data/) and accept the read.
