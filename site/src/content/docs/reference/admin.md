---
title: Admin
description: In-game admin commands, on top of Cmdr.
---

`Twill.Admin` wraps [Cmdr](/reference/bundled-packages/) with a rank gate, so who
may run what is decided by [`Authorization`](/reference/authorization/) rather
than by a list Cmdr keeps of its own.

For setting one up and writing commands, see
[Add an admin console](/guides/admin-console/).

## Two requires, one console

:::caution[This is the usual reason F2 does nothing]
The console needs **two** requires: one on the server, one on the client.

The server require moves Cmdr's client half into `ReplicatedStorage`. The client
require installs the GUI and its activation key. Neither one does the other's
job.
:::

```luau
-- a Script, server
Twill.Admin.Configure({
	MinimumRank = Ranks.Moderator,
})
```

```luau
-- a controller, during Init
local Admin = require("@game/ReplicatedStorage/Twill/Admin")
```

### Require it directly on the client

Reaching it as `Twill.Admin` from a client fails:

```text
attempt to yield across metamethod/C-call boundary
```

The module has to wait for Cmdr's client half to replicate, and the root table
resolves its modules inside a metamethod, which is not allowed to wait. Require
the path directly instead. Once it is loaded, `Twill.Admin` works like every
other module.

## Configure

```luau
Twill.Admin.Configure({
	MinimumRank = Ranks.Moderator,
	Commands = { ban = Ranks.Admin },
	DefaultCommands = false,
})
```

```luau
export type Config = {
	MinimumRank: number,
	Commands: { [string]: number }?,
	DefaultCommands: (boolean | { string })?,
	TwillCommands: (boolean | { string })?,
}
```

| Field | Meaning |
| --- | --- |
| `MinimumRank` | The floor for opening the console at all. Required, with no default. |
| `Commands` | Per-command overrides, above or below the floor. |
| `DefaultCommands` | `true` for all of Cmdr's built-ins, `false` for none, or a list of names. |
| `TwillCommands` | The same three shapes, for Twill's own commands. Defaults to `true`. |

A command left out of `TwillCommands` is not registered, and a command that is
not registered is never moved into `ReplicatedStorage`. Turning one off removes
it from the client rather than hiding it there.

```luau
TwillCommands = { "twill", "loglevel" },
```

**Twill's commands register when `Configure` runs**, not when the module loads.
A game that never calls `Configure` has no console, so it has none of them
either.

**The gate refuses everything until `Configure` is called.** A console that
defaults to open is a console that ships open.

```text
Admin commands are closed
```

`MinimumRank` has no default on purpose. A permission gate that guesses is a gate
that eventually guesses wrong, in the direction nobody notices until it matters.

## What the gate does before parsing

Three screens run before a command line is parsed at all: the caller's rank, a
per-player rate, and a ceiling on input length. Refusals are reported sparingly,
with a count of how many went unreported, so somebody hammering the console
cannot make the log write itself.

That ordering is not a detail. Cmdr validates arguments before running a command,
and validation is allowed to reach outward: the built-in player types resolve
usernames through Roblox. Parsing first would let anyone who can open the console
spend the server's web quota on command lines that were always going to be
refused.

Every command that does run is recorded afterwards with who ran it, so a
privileged action always leaves a trace naming somebody.

## Client-side checks are a courtesy

The rank needed for each command reaches the client through
[`Replication`](/reference/replication/), so the console can refuse early and say
why.

That is a courtesy, not a defence. The server runs the same check again before
anything happens, and a command with a server half is never decided anywhere
else.

## API

### `Admin.Configure`

`[Server]`

Sets who may run which command, and opens the console.

```luau
function Admin.Configure(config: Config)
```

**Returns**

`()` - Nothing.

Call once, during the first boot phase. Throws on a second call, rather than
allowing who is privileged to change while the server is running, and throws when
no `MinimumRank` is given.

### `Admin.Register`

`[Server]`

Registers every command in a container.

```luau
function Admin.Register(container: Instance)
```

**Returns**

`()` - Nothing.

A command is written as a pair of module scripts named `X` and `XServer`: the
definition, which reaches clients so they can be offered it, and the server half
that does the work and never leaves the server.

#### One command, several shapes of argument

A command whose first argument is an action usually needs different arguments
after each one. `Twill.Admin.Arguments` builds them, and is what Twill's own
`moderation`, `playerdata`, `repl`, `rank`, and `pass` are written with.

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

It lives in `ReplicatedStorage` rather than beside the commands because Cmdr
moves a command's definition next to its own before running it, on the client as
well as the server. A path under `TwillServer` would not survive that move.

### `Admin.RegisterTypes`

`[Server]`

Registers every argument type in a container.

```luau
function Admin.RegisterTypes(container: Instance)
```

**Returns**

`()` - Nothing.

Register types **before** the commands that use them, so a command can ask for one
by name and be handed something already parsed and checked.

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

:::danger[Never pass player input into this]
It is the one path with nothing standing in front of it. Text that came from a
player must go through the console, where the gate is.
:::

### `Admin.Cmdr`

`[Server]` | `[Client]`

Cmdr itself, on both sides.

```luau
Admin.Cmdr
```

Everything Cmdr offers is reachable here. Press **F2** to open the console, or
change that with `Cmdr:SetActivationKeys`.

## Built-in commands

Twill adds nine commands of its own on top of Cmdr's built-ins, and all of them
respect the rank gate. Some act on players; the rest report on the framework
itself, and exist because that state is private to Twill: a game cannot write
them without reaching into internals.

None of them are gameplay commands. There is no `fly`, no `speed`, no `godmode`.
Those depend on your own character rules and are a few lines each in Cmdr, so
they stay yours.

**`moderation`** kicks, bans, and unbans, in this place or across the whole
experience. Roblox keeps the ban record itself, enforces the duration, and answers
rejoin attempts, so nothing is stored here to fall out of step. What Twill adds is
the part the platform will not do: refusing to let a moderator act on themselves
or on anyone present who ranks as high as they do, and naming exactly who was
acted on. Lifting a ban answers to the same check as applying one.

**`playerdata`** reads and writes through
[`Data.Edit`](/reference/data/#writing-to-anybody), so it reaches players who are
not on this server. It works one user at a time on purpose.

Reading prints one aligned row per stored value. Past forty values it switches to
an indented JSON block instead, which keeps a deep tree readable rather than
flattening it into hundreds of dotted paths. Past two hundred it asks for a path
instead of answering.

**`twill`** reports what this server is running. It changes nothing.

| Topic | What it shows |
| --- | --- |
| `version` | The installed version, from `Twill.Version`. |
| `services` | Every service that booted, in boot order, and the failure if boot failed. |
| `net` | Every declared remote, its signature, and whether the server serves it. |
| `data` | Whether a store is configured, and the branches it knows. |
| `replication` | How many keys replication holds and how many messages it has sent. |
| `all` | Each of the above in turn. This is the default. |

The `net` topic is the one that earns its place. A remote marked `UNSERVED` was
declared and never handed to [`Net.Handle`](/reference/net/), which is a bug that
otherwise shows up as a client firing into silence.

**`loglevel`** reports the [log level](/reference/log/) this server is running
at, or sets it for the rest of the session. Named with no level, it reads.

:::caution[This can silence the audit trail]
The console records who ran what at `Info`. Raising the level above that stops
those records along with everything else, so give `loglevel` a rank you would
trust with the log itself.
:::

**`repl`** reads [replicated state](/reference/replication/) and paces it.

| Action | What it does |
| --- | --- |
| `get <key>` | Shows what everybody sees at that key, with a dot path allowed inside it. |
| `getfor <user> <key>` | Shows one player's copy, for keys written with `SetFor`. |
| `freeze <key>` | Stops anything more about that key being sent. |
| `unfreeze <key>` | Lets it send again, starting from what it holds now. |
| `throttle <key> [interval]` | Paces it, or sends on every change when the interval is left out. |

`freeze` is the incident tool. A key changing faster than anyone needs can be
held from the console without shutting the server down.

`freeze`, `unfreeze`, and `throttle` name a whole key, so a dotted path is
refused rather than quietly acting on a key nobody set.

**`rank`** reads a player's [rank](/reference/authorization/), or overrides it
for the rest of their session on this server. The override is an attribute, so
it is not remembered and no other server sees it. It is for seeing what a rank
sees, not for granting one.

:::caution[This is the command that can hand out authority]
The console decides who may run what by rank, so `rank set` is the shortest path
from moderator to owner if it is not guarded. It refuses three things, and the
refusals are asserted in the test suite:

- Changing your own rank, at all.
- Changing the rank of anyone who already ranks as high as you.
- Granting a rank at or above your own.

The most a moderator can do is create someone strictly below themselves.
:::

**`pass`** asks whether a player owns a game pass, or forgets what was
remembered about one so [`Monetization`](/reference/monetization/) asks the
platform again. A pass bought during the session is already remembered as owned,
so `forget` is for ownership that changed where this server could not see it.

**`saveall`** asks every open [data](/reference/data/) session on this server to
write now. It returns before any of the writes land, which is what makes it
usable on a full server. `playerdata save` waits, for one player.

**`verifyroll`** checks a revealed seed against the commitment published before
a draw, using [`Random.Verify`](/reference/random/#randomverify).

A moderator can run it in front of the player disputing the roll. Nothing about
the answer depends on trusting whoever ran it — but it proves the seed was fixed
before the draw, not what the draw was then used for.

:::note[`moderation` reads durations exactly]
It uses a duration type of its own, so `7d` is seven days and `1h30m` is ninety
minutes. Anything unrecognised is refused rather than guessed.

Cmdr's own built-in `duration` type resolves units by fuzzy match, which can read
`7d` as seven **seconds**. If you write a command that takes one, check which type
you declared.
:::
