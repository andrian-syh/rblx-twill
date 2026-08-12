---
title: Net
description: One shared list of remotes, and the way in to serving them.
---

`Twill.Net` holds the declaration of every remote in your game, and the entry
point for serving them. Only declaration lives in `ReplicatedStorage`, because
only declaration has to run on both sides. Metering, screening, and every
player's current allowance stay in the server half, which is never replicated.

Wire encoding is [Packet](/reference/bundled-packages/), which guarantees
argument types at the wire level.

## Declaring

```luau
local Net = require("@game/ReplicatedStorage/Twill/Net")
local Packet = require("@game/ReplicatedStorage/Twill/Packages/Packet")

local emote = Net.Declare("Emote", { Packet.String })
local buy = Net.Declare("BuyItem", { Packet.String }, { Packet.Boolean8, Packet.String })
```

Declaring the same name twice hands back the same packet. Two scripts that need
the same remote each declare it, neither has to know the other exists, and the
load order does not matter.

The types must agree exactly. A clashing redeclaration is refused loudly:

```text
'BuyItem' was already declared as (String) and cannot be redeclared as (Number)
```

The alternative is one caller serialising through another's types and corrupting
the payload with nothing reported, which is why this is an error and not a
warning.

### Why types are arrays

`Declare` takes its types as arrays so one guard can cover the arguments and the
reply together, and an array cannot carry a type pack. The result is a packet
with loose argument types, which is what Packet itself gives when it is not
parameterised.

If per-argument checking on `Fire` matters more to you than the clash guard,
declare that one packet with Packet directly and hand the result to `Handle`:

```luau
local buy = Packet("BuyItem", Packet.String):Response(Packet.Boolean8)
```

`Handle` does not care where a packet came from. What you give up is the refusal
when two scripts declare the same name differently.

## Serving

`Handle` and `IsHandled` exist on the server only. Reach them through `Twill.Net`
rather than requiring the server module directly.

```luau
Twill.Net.Handle(buy, function(player, itemId)
	return grant(player, itemId)
end, {
	Rate = 4,
	MinimumRank = Ranks.Player,
	Schema = { { "string", 1, 40 } },
	Reject = function()
		return false, "slow down"
	end,
})
```

### The order the checks run in

Cheapest first, so a caller flooding one packet is turned away before anything
expensive runs for them.

1. **Still here.** A player who has left is dropped without a word.
2. **`MinimumRank`.** Refused before spending any of their allowance.
3. **`Rate`.** Always applied, whether or not you asked for it.
4. **`Schema`.** Each rule against the argument in the same position.
5. **`Validate`.** Your own test, last, because only you know what it costs.

Refusals are reported to the output at most once every few seconds per player and
packet, with a count of how many went unreported. The path that refuses a flood
is the path a flood runs down, so a line per refusal would turn the log into an
amplifier for the traffic it is rejecting.

## API

### `Net.Declare`

`[Server]` | `[Client]`

Declares a remote, or hands back the matching one already declared.

```luau
function Net.Declare(name: string, args: { any }?, response: { any }?): Remote
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The remote's name, shared by both sides. Must not be empty. |
| `args` | `{ any }?` | The argument types, in order. No arguments when left out. |
| `response` | `{ any }?` | The reply types. Passing this makes the packet reply to the caller, which then requires a `Reject` on the server. |

**Returns**

`Remote` - The packet to fire, or to hand to `Handle`.

Throws when this name was already declared with different types.

### `Net.Get`

`[Server]` | `[Client]`

Returns a remote somebody already declared.

```luau
function Net.Get(name: string): Remote
```

**Returns**

`Remote` - The packet declared under that name.

Throws when nothing has declared that name yet. Use this rather than a second
`Declare` when you would rather fail loudly than quietly create a second remote
under a name you misspelled.

### `Net.List`

`[Server]` | `[Client]`

Reports every remote declared so far, mapped to its type signature.

```luau
function Net.List(): { [string]: string }
```

**Returns**

`{ [string]: string }` - Remote names mapped to their rendered signature.

This is the audit of what a client is able to send. Read it once everything has
finished declaring, rather than while modules are still loading.

**Example**

```luau
-- In a service's Start, once every module has declared what it needs.
for name, signature in Net.List() do
	print(`{name}({signature})`)
end
```

### `Net.Handle`

`[Server]`

Answers a packet, metered and screened before the handler ever runs.

```luau
function Net.Handle(
	packet: Remote,
	handler: (player: Player, ...any) -> ...any,
	options: Options?
)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `packet` | `Remote` | The packet to serve. |
| `handler` | `(player: Player, ...any) -> ...any` | Receives the firing player first, then their arguments. A packet that replies returns its reply from here. |
| `options` | `Options?` | Rate ceiling, rank, argument screening, and the reply used on refusal. See [Options](#options). |

**Returns**

`()` - Nothing.

Throws when the packet already has a handler, and when a packet that replies is
given no `Reject`.

:::caution[A handler that throws is treated as a refusal]
The error is reported, and a packet that replies answers with its `Reject` rather
than leaving the caller waiting. A packet that does not reply simply drops the
call. Either way the failure never reaches the delivery of the packets behind it.
:::

### `Net.IsHandled`

`[Server]`

Reports whether a packet already has a handler.

```luau
function Net.IsHandled(packet: Remote): boolean
```

**Returns**

`boolean` - True when something already serves it.

Use it so a module can leave a packet alone rather than claiming it and being
refused.

## Options

```luau
export type Options = {
	Rate: number?,
	MinimumRank: number?,
	Schema: { Rewrite }?,
	Validate: ((player: Player, ...any) -> boolean)?,
	Reject: ((player: Player, ...any) -> ...any)?,
}
```

### Rate

Calls per second, per player. **Always applied**, whether or not you pass it, so
a rate limit is not something you can forget to switch on. Left out, a packet is
metered at twenty calls a second.

Below one it is a cooldown. `Rate = 0.25` permits one call every four seconds.
The burst never falls below a single token, so the first call is allowed however
slow the refill. A rate of zero or less is refused at `Handle`.

Metering lives in [`Twill.Limit`](/reference/limit/), which forgets a player when
they leave.

### MinimumRank

Refuses anyone whose [`Authorization`](/reference/authorization/) rank falls
short. Checked on the server, where the client cannot reach it, and checked
before the caller spends any of their allowance.

### Schema

A list of [`Schema`](/reference/schema/) rules applied positionally to the
arguments. Use it for shapes and ranges that a wire type cannot express.

Packet already guarantees the argument **types**. `Schema` is for everything
after that: a string that must be between 1 and 40 characters, a number that must
fall in a range, a table that must have a particular shape.

### Validate

```luau
Validate = function(player, itemId)
	return owns(player, itemId)
end
```

For what neither types nor schemas can express: ownership, game state, cooldowns
you track yourself.

Return exactly `true` to admit the call. Anything else refuses it, and a
validator that throws refuses it too, because a test that cannot decide must not
be read as consent.

### Reject

```luau
Reject = function(player, itemId)
	return false, "not allowed"
end
```

What to reply with when a call is refused by any of the checks above, or when the
handler itself throws.

**A packet that replies must have a `Reject`.** Without one, a refused call
leaves its caller waiting forever, so Twill refuses the `Handle` instead:

```text
'BuyItem' replies to the caller, so it needs a Reject option
```

A packet that does not reply may omit it. A refused call there is simply dropped.

## Firing from the client at startup

A packet declared on the client is given its wire id by the server, and that
arrives a moment later. Fire from `Start` onwards rather than while a module is
still loading.

If you need to wait explicitly:

```luau
Loop.Until(function()
	return remote.Id ~= nil
end, 30)
```

## Byte budget

Packet applies a byte budget of its own. The rate limit here is per packet and
stricter, so in practice it is the one that speaks first.
