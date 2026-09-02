---
title: Token
description: Short text that carries a payload and proves nobody edited it
---

```luau
local Token = require("@game/ServerScriptService/TwillServer/Token")

Token.Configure({ Secret = secretYouKeep })

local code = Token.Issue("promo", { Grant = "starter_pack" }, 7 * 86400)

local payload, reason = Token.Read("promo", code)
```

Server only.

## What it is for

The point is not the signature. It is the lookup that no longer has to happen.

A token proves its own contents, so a redeem code is handed out in bulk and
checked without touching a DataStore, and a payload that travels through
somewhere untrusted comes back provably unchanged.

## Audiences

The audience is signed along with the payload and checked on the way back, so a
token minted for one purpose is refused by every other.

Pass the same string on both sides and pick a fresh one per purpose: `"promo"`,
`"invite"`, `"transfer"`.

## The secret

The secret is the whole of the security.

- Keep it server side. It belongs in `ServerScriptService`, never in
  `ReplicatedStorage`.
- Never send it anywhere.
- Make it with [`Random.Id(64)`](/reference/random/#randomid).
- Changing it invalidates every token already issued.

## What this does not do

Signing proves origin, not novelty. A valid token stays valid until it expires,
so it can be redeemed twice.

Anything that must happen once still needs a record of having happened. Keep the
redeemed codes in [`Data`](/reference/data/) and check the record, the way
[`Monetization`](/reference/monetization/) does for receipts.

## API

### `Token.Configure`

`[Server]`

Installs the secret every token is signed with.

```luau
function Token.Configure(config: Config)

export type Config = {
	Secret: string,
}
```

Call once, during the first boot phase. Throws on a second call, because
changing the secret invalidates every token already issued, and throws when the
secret is not a string of at least 32 characters.

### `Token.IsConfigured`

`[Server]`

Reports whether a secret has been installed yet.

```luau
function Token.IsConfigured(): boolean
```

**Returns**

`boolean` - `true` once a secret is installed.

For callers that would rather skip a feature than fail on the first token they
try to issue.

### `Token.Issue`

`[Server]`

Mints a token carrying a payload that nobody without the secret could have
signed.

```luau
function Token.Issue(audience: string, payload: any, lifetime: number?): string
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `audience` | `string` | What the token is for. The reader names the same one. Not empty. |
| `payload` | `any` | Anything storable, carried inside the token itself. |
| `lifetime` | `number?` | Seconds the token stays good for. Never expires when left out. |

**Returns**

`string` - The token, safe to send as text.

Throws when used before `Configure`, on an empty audience, or on a lifetime that
is not a number.

The payload is signed, not hidden. Anyone holding the token reads what is in it.
Sign what may be seen, and keep secrets out of it.

The payload travels through [`Compress`](/reference/compress/), so Roblox values
survive without a separate encoding step, but they survive lossily: colours
quantise, `CFrame` components drop to f32, and functions and cyclic branches
become `nil`. Carry an identifier rather than a value where exactness matters.

An expiry is recorded as `os.time()` plus the lifetime, so it is whole seconds
of Unix time and is read back against the reading server's own clock.

### `Token.Read`

`[Server]`

Reads a token, answering with a reason whenever it should not be honoured.

```luau
function Token.Read(audience: string, token: string): (any, Reason?)

export type Reason = "malformed" | "forged" | "expired" | "wrong audience"
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `audience` | `string` | The purpose the caller expects it to have been minted for. |
| `token` | `string` | The text that was issued. Anything else reads as malformed. |

**Returns**

`any` - The payload, meaningful only when no reason came back with it.

`Reason?` - Why to refuse it, or `nil` when it is good.

Throws when used before `Configure`.

Check `reason`, never the payload. It is `nil` only when the token was genuine,
unexpired, and meant for this audience.

| Reason | Meaning |
| :--- | :--- |
| `malformed` | Not a token at all, or its claims are not a table. |
| `forged` | The tag does not match. Someone edited it. |
| `expired` | Genuine, but past its lifetime. |
| `wrong audience` | Genuine, but minted for something else. |

The tag is checked before the payload is decoded, so a forged token is never
parsed.

## Under the hood

A token is the encoded body, a full stop, and the tag: HMAC-SHA256 over the
body, truncated to 32 hexadecimal characters. Tags are compared in constant
time, so a comparison cannot be timed to recover the correct one character at a
time.

## Limits

| Limit | Value |
| :--- | ---: |
| Shortest secret | 32 characters |
| Tag | 32 hexadecimal characters |
| Expiry resolution | 1 second |
