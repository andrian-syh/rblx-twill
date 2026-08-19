---
title: Net
description: One shared list of remotes, and the way in to serving them.
---

`Twill.Net` holds the declaration of every remote in your game, the transport
those remotes travel on, and the entry point for serving them. Only declaration
lives in `ReplicatedStorage`, because only declaration has to run on both sides.
Metering, screening, and every player's current allowance stay in the server
half, which is never replicated.

The wire format is Twill's own. Nothing describing a type is ever sent, because
both sides compiled the same declaration; what travels is the value and nothing
else.

## Declaring

```luau
local Net = require("@game/ReplicatedStorage/Twill/Net")
local Types = Net.Types

local emote = Net.Declare("Emote", { Types.String(32) })
local buy = Net.Declare("BuyItem", { Types.String(32) }, { Types.Boolean, Types.String(64) })
```

Declaring the same name twice hands back the same remote. Two scripts that need
the same remote each declare it, neither has to know the other exists, and the
load order does not matter.

The types must agree exactly. A clashing redeclaration is refused loudly:

```text
'BuyItem' was already declared as (String) and cannot be redeclared as (NumberVarU)
```

The alternative is one caller encoding through another's types and reading the
payload back as something else with nothing reported, which is why this is an
error and not a warning. The comparison follows nesting and ignores the order
keys were written in, so two spellings of the same struct are the same
declaration.

### Why types are arrays

`Declare` takes its types as arrays so one guard can cover the arguments and the
reply together, and an array cannot carry a type pack.

## Types

Every argument is declared with a token from `Net.Types`. A token says what a
value is, so the wire never has to.

### Numbers

| Token | Bytes | Range |
| --- | --- | --- |
| `NumberU8` `NumberU16` `NumberU32` | 1, 2, 4 | whole, not negative |
| `NumberI8` `NumberI16` `NumberI32` | 1, 2, 4 | whole, either sign |
| `NumberVarU` | 1-5 | whole, not negative, small ones cost less |
| `NumberVarI` | 1-5 | whole, either sign, small ones cost less |
| `NumberF16` `NumberF32` `NumberF64` | 2, 4, 8 | fractional |

`NumberVarU` and `NumberVarI` are the ones to reach for when you do not want to
think about width. They cost one byte for values under 128 and grow only as the
value does, which removes the choice that overflow bugs come from.

`NumberF16` is a real half, including the very small values a naive
implementation drops to zero, both infinities, and a NaN that stays a NaN.

### Text and bytes

| Token | Notes |
| --- | --- |
| `String` | `Types.String(maximum)` sets the ceiling; unset it is 65536 bytes |
| `Buffer` | Same, for a `buffer` |

The ceiling is enforced **on the sender**, naming the field:

```text
Twill.Net: BuyItem argument 1 is 300 bytes, past its ceiling of 32
```

A sender's own mistake surfaces at the sender rather than arriving as a value
the receiver quietly reads back wrong. Every string carries its length, so any
byte is safe to send, including a zero byte.

### Positions and rotations

| Token | Bytes | Keeps |
| --- | --- | --- |
| `Vector2F16` `Vector2F32` | 4, 8 | |
| `Vector3F16` `Vector3F32` | 6, 12 | |
| `Vector3Fixed(scale)` | 6 | whole steps of the scale you declare |
| `CFrame` | 48 | everything, including skew and reflection |
| `CFrameRot` | 16 | rigid transforms only |
| `CFrameRotF16` | 10 | rigid, at lower positional precision |

`CFrameRot` and `CFrameRotF16` **check on the way out**. A transform that scales,
skews, or mirrors is refused rather than silently flattened:

```text
Twill.Net: a CFrameRot is not a plain rotation, so it needs the full CFrame type
```

### Everything else

`Boolean`, `Nil`, `Color3` (three bytes), `Color3F32`, `BrickColor`, `UDim`,
`UDim2`, `Rect`, `Region3`, `NumberRange`, `TweenInfo`, `DateTime`,
`NumberSequence`, `ColorSequence`.

### Compound

| Constructor | Meaning |
| --- | --- |
| `Types.Array(element, maximum?)` | A run of one repeated element |
| `Types.Struct({ Field = token })` | Fixed named fields, whose **names never reach the wire** |
| `Types.Map(key, value, maximum?)` | Keys and values whose count is only known when sent |
| `Types.Optional(token)` | A value that may be absent, one byte to say which |
| `Types.Union(a, b, ...)` | One of a closed set of shapes |
| `Types.Enum(Enum.KeyCode)` | One item of one enum, sent as its place in it |
| `Types.Static({ "alpha", "beta" })` | One of a closed set of constants |
| `Types.Any` | A value of a shape nobody declared |

An array of booleans, of one fixed-width number type, or of strings takes a path
that sends the whole run at once. A thousand booleans is a hundred and
twenty-five bytes.

A struct sends only its values. Both sides already know the names and the order,
so neither is transmitted.

`Union` and `Static` are closed at declaration. A tag naming a member the union
was not declared with is refused on arrival, and a constant nobody listed is
refused on the way out.

### `Types.Any`

For a payload whose shape nobody can declare. Every value carries a tag, so it
costs more than a declared type, and it is bounded rather than open-ended: a
maximum depth, a maximum number of parts, and a maximum size, applied identically
on both sides.

A table that reaches itself is refused rather than encoded. A value no format
carries — a function, a thread — is refused with the path to it:

```text
Twill.Net: value.Inventory[3].onClick is a function, which Any cannot carry
```

Pass `Types.Any({ OnUnencodable = "skip" })` to leave such a field out instead.

### Instances and players

`Types.Instance` sends a reference beside the payload. `Types.Instance("Model")`
makes the receiver check the class as well.

**A decoded instance may be `nil`.** The engine delivers nothing for an instance
that is not replicated to that side or has streamed out, and pretending otherwise
produces errors that appear only sometimes.

**An instance from a client is the client's choice.** The decoder guarantees the
*shape* — that it exists, that it is an instance, that it is the class you named.
It does not guarantee that the caller is allowed to touch it. Ownership and
reach belong in [`Validate`](#validate).

`Types.Player` may not appear in an argument list at all:

```text
'Trade' argument 1 names a player, which only the server may say;
the caller is given to the handler already
```

A player named on the wire is a player the sender chose. The caller arrives as
the handler's first argument, from the engine, and cannot be forged. For a
server-to-client message about somebody else, use `Types.Instance("Player")`.

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

Cheapest first, so a caller flooding one remote is turned away before their
arguments are read at all.

1. **Bytes.** The whole message is weighed before a single call is opened.
2. **Still here.** A player who has left is dropped without a word.
3. **Declared and served.** A call naming a remote nothing serves goes no further.
4. **`MinimumRank`.** Refused before spending any of their allowance.
5. **`Rate`.** Always applied, whether or not you asked for it.
6. **`Schema`.** Each rule against the argument in the same position.
7. **`Validate`.** Your own test, last, because only you know what it costs.

Steps 1 to 5 run **before the arguments are decoded**. Each call carries the
length of its own body, so a refused one is stepped over rather than read — which
is also why a corrupt call costs only itself, and every call behind it in the
same message still arrives.

Refusals are reported to the output at most once every few seconds per player and
remote, with a count of how many went unreported. The path that refuses a flood
is the path a flood runs down, so a line per refusal would turn the log into an
amplifier for the traffic it is rejecting.

## Calling

```luau
-- client
emote:Fire("wave")
local ok, message = buy:Ask("sword")

-- server
emote:FireClient(player, "wave")
emote:FireClients({ a, b }, "wave")
emote:FireAllClients("wave")
emote:FireAllExcept(player, "wave")

-- either side, for what the other side sends
local connection = emote:Connect(function(text) end, trove)
```

Calls made in the same frame leave together as one message. A remote that
replies, and its reply, are sent without waiting for the frame to end.

`Ask` is client to server only. The server never waits on an answer from a
client, so there is no server thread a client's message can reach. If a game
needs to ask a client something, it composes two events and its own correlation
id, in game code, where the fact that the answer is untrusted is visible.

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
| `response` | `{ any }?` | The reply types. Passing this lets a client `Ask`, which then requires a `Reject` on the server. |

**Returns**

`Remote` - The handle to fire, or to hand to `Handle`.

Throws when this name was already declared with different types, and when an
argument names a player.

### `Net.DeclareUnreliable`

`[Server]` | `[Client]`

Declares a remote whose calls may be dropped rather than delayed.

```luau
function Net.DeclareUnreliable(name: string, args: { any }?): Remote
```

There is no `response` parameter, so attaching a reply to an unreliable remote is
not a mistake to be caught — it cannot be written. Use it for state a newer
message supersedes: aim direction, cosmetic effects, footsteps. Never for
anything transactional.

An unreliable message is capped at what one such send carries. A call larger than
that is dropped with a line naming the remote, never truncated and never dropped
in silence.

### `Net.Get`

`[Server]` | `[Client]`

Returns a remote somebody already declared.

```luau
function Net.Get(name: string): Remote
```

**Returns**

`Remote` - The handle declared under that name.

Throws when nothing has declared that name yet. Use this rather than a second
`Declare` when you would rather fail loudly than quietly create a second remote
under a name you misspelled.

### `Net.List`

`[Server]` | `[Client]`

Reports every remote declared so far, mapped to its number and type signature.

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
	print(`{name} {signature}`)
end
```

### `Net.IsReady`

`[Server]` | `[Client]`

Reports whether this side knows the number for every remote it declared.

```luau
function Net.IsReady(): boolean
```

The server is ready as soon as it has declared, because it is the side handing
out the numbers. A client becomes ready once the server's numbering has reached
it.

### `Net.OnReady`

`[Server]` | `[Client]`

Runs a callback once this side can send, at once when it already can.

```luau
function Net.OnReady(callback: () -> (), trove: any?)
```

Pass a `Scope` bag as the second argument and the wait is given up with it.

### `Net.AwaitReady`

`[Server]` | `[Client]` | `[Yields]`

Waits until this side can send, giving up after a while rather than never.

```luau
function Net.AwaitReady(timeout: number?): boolean
```

**Returns**

`boolean` - True when the network came up in time.

### `Net.Handle`

`[Server]`

Answers a remote, metered and screened before the handler ever runs.

```luau
function Net.Handle(
	remote: Remote,
	handler: (player: Player, ...any) -> ...any,
	options: Options?
)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `remote` | `Remote` | The remote to serve. |
| `handler` | `(player: Player, ...any) -> ...any` | Receives the calling player first, then their arguments. A remote that replies returns its reply from here. |
| `options` | `Options?` | Rate ceiling, rank, argument screening, and the reply used on refusal. See [Options](#options). |

**Returns**

`()` - Nothing.

Throws when the remote already has a handler, and when a remote that replies is
given no `Reject`.

:::caution[A handler that throws is treated as a refusal]
The error is reported, and a remote that replies answers with its `Reject` rather
than leaving the caller waiting. A remote that does not reply simply drops the
call. Either way the failure never reaches the calls behind it in the same
message.
:::

A handler that never returns is answered for. After a deadline the caller is sent
the `Reject` and the request is settled, so an `Ask` cannot be left hanging by a
handler that hangs.

### `Net.IsHandled`

`[Server]`

Reports whether a remote already has a handler.

```luau
function Net.IsHandled(remote: Remote): boolean
```

**Returns**

`boolean` - True when something already serves it.

Use it so a module can leave a remote alone rather than claiming it and being
refused.

## The remote handle

### `remote:Fire`

`[Client]`

Sends a call to the server.

```luau
function remote:Fire(...: any)
```

### `remote:FireClient` · `FireClients` · `FireAllClients` · `FireAllExcept`

`[Server]`

```luau
function remote:FireClient(player: Player, ...: any)
function remote:FireClients(players: { Player }, ...: any)
function remote:FireAllClients(...: any)
function remote:FireAllExcept(except: Player, ...: any)
```

### `remote:Ask`

`[Client]` | `[Yields]`

Asks the server, and always ends: with the answer, with the `Reject`, or with
nothing when the wait runs out.

```luau
function remote:Ask(...: any): ...any
```

Throws when the remote was not declared with a reply.

The number identifying a question is the asker's own and is only ever looked up
in the asker's own table, so nothing arriving from the far side can reach a
thread waiting on an answer.

### `remote:Connect` · `Once`

`[Server]` | `[Client]`

```luau
function remote:Connect(callback: (...any) -> (), trove: any?): Connection
function remote:Once(callback: (...any) -> (), trove: any?): Connection
```

On the client the callback receives the call's arguments. On the server, use
`Handle` instead: a listener has no metering, and metering is not optional.

The returned connection carries `Disconnect` and `Destroy`, so a `Scope` bag
holds it like anything else. Listeners run from a copy of the list, so giving one
up from inside another is ordinary rather than dangerous.

### `remote:Wait`

`[Server]` | `[Client]` | `[Yields]`

```luau
function remote:Wait(timeout: number?): ...any
```

Waits for the next call on this remote, giving up after a while rather than
never.

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

Calls per second, per player, per remote. **Always applied**, whether or not you
pass it, so a rate limit is not something you can forget to switch on. Left out,
a remote is metered at twenty calls a second.

Below one it is a cooldown. `Rate = 0.25` permits one call every four seconds.
The burst never falls below a single token, so the first call is allowed however
slow the refill. A rate of zero or less is refused at `Handle`.

A separate budget weighs the **bytes** a player sends, across every remote,
before any of their calls are opened. Batching many calls into one message
therefore costs what those calls actually weigh rather than what one message
costs.

Metering lives in [`Twill.Limit`](/reference/limit/), which creates a player's
standing the moment it is needed and forgets it when they leave. There is no
window in which a caller is unmetered.

### MinimumRank

Refuses anyone whose [`Authorization`](/reference/authorization/) rank falls
short. Checked on the server, where the client cannot reach it, and checked
before the caller spends any of their allowance.

### Schema

A list of [`Schema`](/reference/schema/) rules applied positionally to the
arguments. Use it for shapes and ranges that a wire type cannot express.

The wire type already guarantees the argument **types**. `Schema` is for
everything after that: a string that must be between 1 and 40 characters, a
number that must fall in a range, a table that must have a particular shape. A
rule that says only a type name repeats what the declaration already promised;
leave the entry `nil` to skip an argument.

### Validate

```luau
Validate = function(player, itemId)
	return owns(player, itemId)
end
```

For what neither types nor schemas can express: ownership, game state, cooldowns
you track yourself. **An `Instance` argument from a client belongs here** — the
decoder proved its shape, not the caller's right to it.

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
handler itself throws or hangs.

**A remote that replies must have a `Reject`.** Without one, a refused call
leaves its caller waiting, so Twill refuses the `Handle` instead:

```text
'BuyItem' replies to the caller, so it needs a Reject option
```

A remote that does not reply may omit it. A refused call there is simply dropped.

## Firing before the network is up

A remote declared on the client is given its number by the server, and that
arrives a moment later. Declaring never waits for it, and neither do you: a call
made before the number arrives is **held and sent once it does**, so boot order
is not load bearing.

```luau
Net.OnReady(function()
	-- everything declared here knows its number
end)
```

An unreliable call is not held. A message that arrives late is worse than one
that never arrives.

A name declared on a client that the server never declares is reported once, and
calls on it are dropped locally rather than reaching the wire.

## What a hostile client cannot do

Everything a peer sends is read under the same rules on both sides, because the
decoder on a player's machine and the decoder on the server are the same code.

- A length that reaches past the message it arrived in is refused before anything
  is allocated for it.
- A corrupt call costs its own frame. The calls behind it in the same message
  still arrive.
- A call naming a remote nobody declared, or nobody serves, is stepped over
  unread.
- An answer to a question the server never asked reaches nothing.
- A message claiming more calls than one message carries is cut off.
- A payload larger than a message is allowed to be is dropped before it is read.
