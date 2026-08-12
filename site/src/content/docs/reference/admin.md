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
}
```

| Field | Meaning |
| --- | --- |
| `MinimumRank` | The floor for opening the console at all. Required, with no default. |
| `Commands` | Per-command overrides, above or below the floor. |
| `DefaultCommands` | `true` for all of Cmdr's built-ins, `false` for none, or a list of names. |

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

Twill adds two command families of its own on top of Cmdr's built-ins, and both
respect the rank gate.

**`moderation`** kicks, bans, and unbans, in this place or across the whole
experience. Roblox keeps the ban record itself, enforces the duration, and answers
rejoin attempts, so nothing is stored here to fall out of step. What Twill adds is
the part the platform will not do: refusing to let a moderator act on themselves
or on anyone ranking as high as they do, and naming exactly who was acted on.

**`playerdata`** reads and writes through
[`Data.Edit`](/reference/data/#writing-to-anybody), so it reaches players who are
not on this server. It works one user at a time on purpose.

:::note[`moderation` reads durations exactly]
It uses a duration type of its own, so `7d` is seven days and `1h30m` is ninety
minutes. Anything unrecognised is refused rather than guessed.

Cmdr's own built-in `duration` type resolves units by fuzzy match, which can read
`7d` as seven **seconds**. If you write a command that takes one, check which type
you declared.
:::
