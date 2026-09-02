---
title: Admin
description: In-game admin commands behind a rank gate, on top of Cmdr
---

```luau
-- a Script, server
Twill.Admin.Configure({
	MinimumRank = Ranks.Moderator,
	Commands = { moderation = Ranks.Admin },
})
```

```luau
-- a controller, during Init
local Admin = require("@game/ReplicatedStorage/Twill/Admin")
```

`Twill.Admin` wraps [Cmdr](/reference/bundled-packages/) with a rank gate, so who
may run what is decided by [`Authorization`](/reference/authorization/) rather
than by a list Cmdr keeps of its own.

For setting one up and writing commands, see
[Add an admin console](/guides/admin-console/).

## Two requires, one console

The console needs two requires: one on the server, one on the client. The server
require moves Cmdr's client half into `ReplicatedStorage`. The client require
installs the GUI and its activation key. Neither does the other's job.

Missing one is the usual reason F2 does nothing.

On the client, require the path directly rather than reaching it as
`Twill.Admin`:

```text
attempt to yield across metamethod/C-call boundary
```

The module waits for Cmdr's client half to replicate, and the root table resolves
its modules inside a metamethod, which cannot wait. Once it is loaded,
`Twill.Admin` works like every other module.

## What the gate does before parsing

Three screens run before a command line is parsed: a ceiling on input length, the
caller's rank, and a per-player rate.

Cmdr validates arguments before running a command, and validation reaches
outward: the built-in player types resolve usernames through Roblox. Parsing
first would let anyone who can open the console spend the server's web quota on
lines that were always going to be refused.

Refusals are reported at most once every five seconds per player, with a count of
how many went unreported.

A second gate runs per command, against the rank that command needs. Every
command that does run is recorded afterwards with who ran it, so a privileged
action always leaves a trace naming somebody.

The gate refuses everything until `Configure` is called:

```text
Admin commands are closed
```

`MinimumRank` has no default. A permission gate with a default is one that can be
left at its default.

## Client-side checks are a courtesy

The rank needed for each command reaches the client through
[`Replication`](/reference/replication/), so the console can refuse early and say
why.

That is a courtesy, not a defence. The server runs the same check again before
anything happens, and a command with a server half is never decided anywhere
else.

## Writing a command

A command is a pair of module scripts named `X` and `XServer`: the definition,
which reaches clients so they can be offered it, and the server half that does
the work and never leaves the server.

A command whose first argument is an action usually needs different arguments
after each one. `Twill.Admin.Arguments` builds them, and is what Twill's own
`moderation`, `playerdata`, `repl`, `rank`, and `pass` use.

```luau
local Arguments = require("@game/ReplicatedStorage/Twill/Admin/Arguments")

local FOLLOWING = {
	kick = { REASON },
	ban = { REASON, DURATION },
}

local following = Arguments.Following(FOLLOWING)

-- in the definition
Args = { action, target, following(1), following(2) }
```

Cmdr allows an argument to be a function of the command so far, and reads `nil`
from one as the end of the list, so an action offers only the arguments it can
use.

`Arguments` lives in `ReplicatedStorage` because Cmdr moves a command's
definition next to its own before running it, on the client as well as the
server. A path under `TwillServer` would not survive that move.

## API

### `Admin.Configure`

`[Server]`

Sets who may run which command, and opens the console.

```luau
function Admin.Configure(config: Config)
```

**Config**

| Field | Type | Description |
| :--- | :--- | :--- |
| `MinimumRank` | `number` | The floor for opening the console. Required. |
| `Commands` | `{ [string]: number }?` | Per-command ranks, above or below the floor. |
| `DefaultCommands` | `(boolean \| { string })?` | `true` for all of Cmdr's built-ins, `false` for none, or a list of names. |
| `TwillCommands` | `(boolean \| { string })?` | The same three shapes, for Twill's own. `true` when left out. |

Call once, during `Init`. Throws on a second call, rather than letting who is
privileged change while the server runs, and throws when no `MinimumRank` is
given.

Twill's commands register when `Configure` runs, not when the module loads. A
game that never calls `Configure` has no console and none of them.

A command left out of `TwillCommands` is not registered, and an unregistered
command is never moved into `ReplicatedStorage`. Turning one off removes it from
the client rather than hiding it there.

```luau
TwillCommands = { "twill", "loglevel" },
```

### `Admin.Register`

`[Server]`

Registers every command in a container.

```luau
function Admin.Register(container: Instance)
```

### `Admin.RegisterTypes`

`[Server]`

Registers every argument type in a container.

```luau
function Admin.RegisterTypes(container: Instance)
```

Register types before the commands that use them, so a command can ask for one by
name and be handed something already parsed and checked.

### `Admin.Run`

`[Server]`

Runs a command line as the server itself, answering to no rank.

```luau
function Admin.Run(text: string): string
```

**Returns**

`string` - Whatever the command replied. Yields.

Throws when given something other than text.

This is what lets automated upkeep use the same commands people do.

Never pass player input into it. It is the one path with nothing standing in
front of it. Text that came from a player goes through the console, where the
gate is.

### `Admin.Cmdr`

`[Server]` | `[Client]`

Cmdr itself, on both sides.

```luau
Admin.Cmdr
```

Press F2 to open the console, or change that with `Cmdr:SetActivationKeys`.

## Built-in commands

Twill adds nine commands of its own, all of them behind the rank gate. Some act
on players; the rest report on framework state a game cannot read without
reaching into internals.

None of them are gameplay commands. There is no `fly`, no `speed`, no `godmode`.
Those depend on a game's own character rules and are a few lines each in Cmdr.

### `moderation`

Kicks, bans, and unbans, in this place or across the experience. Roblox keeps the
ban record, enforces the duration, and answers rejoin attempts, so nothing is
stored here to fall out of step.

What Twill adds is the part the platform does not do: refusing to let a moderator
act on themselves or on anyone present who ranks as high as they do, and naming
exactly who was acted on. Lifting a ban answers to the same check as applying
one.

Durations are read exactly. `7d` is seven days and `1h30m` is ninety minutes.
Anything unrecognised is refused rather than guessed. Cmdr's own `duration` type
resolves units by fuzzy match and can read `7d` as seven seconds, so check which
type a command declares.

### `playerdata`

Reads and writes through [`Data.Edit`](/reference/data/#writing-to-anybody), so
it reaches players who are not on this server. It works one user at a time.

| Action | Answers |
| :--- | :--- |
| `get` | What a scope holds, or one field of it. |
| `set` | Writes one field, here or wherever the user is. |
| `reset` | Puts a field or a scope back to the template. |
| `versions` | Up to five earlier versions of a scope, newest first. |
| `status` | Who holds each scope, and what storage is doing. |
| `save` | Writes a user now, for somebody on this server. |

Reading prints one aligned row per stored value. Past forty values it switches to
an indented JSON block, which keeps a deep tree readable rather than flattening
it into hundreds of dotted paths. Past two hundred it asks for a path instead of
answering. In Studio it also prints the whole value to the output; a live server
does not, because that would write somebody's saved data into its own logs.

`status` answers the question a report of lost progress asks. It names the server
holding each scope, how many sessions the key has had, how long since it was
written, and whether storage is reachable and failing.

`versions` reads what the scope held before. Reading changes nothing; write a
value back with `set`.

#### Writing a value

`set` reads what was typed the way it was written. JSON where the text is JSON,
so `500` is a number, `true` is a boolean, and `{"Owned":true}` is a table.
Anything JSON cannot read stays the text it already was, which is what makes
`gold` mean gold rather than a syntax error.

[Big numbers](/reference/bignumber/) come first, before JSON is tried:

| Typed | Stored |
| :--- | :--- |
| `big:1500` | A big number, whatever its size |
| `123456789012345678901234567890` | A big number, because no ordinary number holds those digits |
| `1500` | An ordinary number |

The mark matters for small values. A field holding a big number is a table of
limbs, and writing a plain `1500` over it leaves the game's own arithmetic
reaching for `limbs` on a number. Write `big:1500` and the field keeps its shape.

Unmarked digits are promoted only when an ordinary number provably cannot hold
them. The digits are compared against what a `number` reproduces, so
`9007199254740992` stays ordinary and `9007199254740993` does not.

A big number is shown by `get` as `big:` followed by every digit, never
shortened, so a value copied out of `get` goes straight back into `set`.

### `twill`

Reports what this server is running. It changes nothing.

| Topic | What it shows |
| :--- | :--- |
| `version` | The installed version, from `Twill.Version`. |
| `services` | Every service that booted, in boot order, and the failure if boot failed. |
| `net` | Every declared remote, its signature, and whether the server serves it. |
| `data` | Whether a store is configured, and the branches it knows. |
| `replication` | How many keys replication holds and how many messages it has sent. |
| `all` | Each of the above in turn. The default. |

A remote marked `UNSERVED` was declared and never handed to
[`Net.Handle`](/reference/net/), which otherwise shows up as a client firing into
silence.

### `loglevel`

Reports the [log level](/reference/log/) this server is running at, or sets it
for the rest of the session. Named with no level, it reads.

This can silence the audit trail. The console records who ran what at `Info`, so
raising the level above that stops those records along with everything else. Give
`loglevel` a rank trusted with the log itself.

### `repl`

Reads [replicated state](/reference/replication/) and paces it.

| Action | What it does |
| :--- | :--- |
| `get <key>` | Shows what everybody sees at that key, with a dot path allowed inside it. |
| `getfor <user> <key>` | Shows one player's copy, for keys written with `SetFor`. |
| `freeze <key>` | Stops anything more about that key being sent. |
| `unfreeze <key>` | Lets it send again, starting from what it holds now. |
| `throttle <key> [interval]` | Paces it, or sends on every change when the interval is left out. |

`freeze` is the incident tool. A key changing faster than anyone needs can be
held from the console without shutting the server down.

`freeze`, `unfreeze` and `throttle` name a whole key, so a dotted path is refused
rather than quietly acting on a key nobody set.

### `rank`

Reads a player's [rank](/reference/authorization/), or overrides it for the rest
of their session on this server. The override is an attribute, so it is not
remembered and no other server sees it. It is for seeing what a rank sees, not
for granting one.

This is the command that can hand out authority, so it refuses three things:

- Changing your own rank, at all.
- Changing the rank of anyone who already ranks as high as you.
- Granting a rank at or above your own.

The most a moderator can do is create someone strictly below themselves. All
three refusals are asserted in the test suite.

### `pass`

Asks whether a player owns a game pass, or forgets what was remembered about one
so [`Monetization`](/reference/monetization/) asks the platform again.

A pass bought during the session is already remembered as owned, so `forget` is
for ownership that changed where this server could not see it.

### `saveall`

Asks every open [data](/reference/data/) session on this server to write now. It
returns before any of the writes land, which is what makes it usable on a full
server. `playerdata save` waits, for one player.

### `verifyroll`

Checks a revealed seed against the commitment published before a draw, using
[`Random.Verify`](/reference/random/#randomverify).

A moderator can run it in front of the player disputing the roll. It proves the
seed was fixed before the draw. It does not prove what the draw was then used
for.

## Limits

| Limit | Value |
| :--- | ---: |
| Command line length | 8000 characters |
| Submissions per player | 4 per second |
| Refusal reports | 1 per 5 seconds, per player |
| Rows before `playerdata get` switches to JSON | 40 |
| Rows before it asks for a path | 200 |
| Versions `playerdata versions` reads | 5 |
