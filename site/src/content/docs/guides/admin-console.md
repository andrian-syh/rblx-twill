---
title: Add an admin console
description: Open Cmdr behind a rank gate, and add commands of your own.
---

An in-game console is the fastest way to inspect and repair a live game, and the
fastest way to lose one. Cmdr supplies the console; what it deliberately does not
supply is the decision about who may open it. That decision is yours, and getting
it wrong hands your game to whoever notices.

Twill owns that gate so it cannot be forgotten. The console refuses everybody
until you have said who may use it, and it refuses again on the server after the
client has already said yes.

## Two requires

The console needs one require on each side. Neither does the other's job.

```luau title="ServerScriptService/Main"
local Twill = require("@game/ReplicatedStorage/Twill")
local Ranks = require(ReplicatedStorage.Shared.Ranks)

-- Moves Cmdr's client half into ReplicatedStorage, and opens the gate.
Twill.Admin.Configure({
	MinimumRank = Ranks.Moderator,
})
```

```luau title="ReplicatedStorage/Client/AdminController"
-- Installs the GUI and binds F2. Requiring is the whole job.
require("@game/ReplicatedStorage/Twill/Admin")
```

:::caution[Require the path directly on the client]
`Twill.Admin` reached through the root table on a client fails with
`attempt to yield across metamethod/C-call boundary`. The module waits for
Cmdr's client half to replicate, and the lazy accessor on the root table is not
allowed to wait.

Once it is loaded, `Twill.Admin` works normally.
:::

If F2 does nothing, one of the two requires is missing. That is the cause almost
every time.

## Set who may run what

```luau
Twill.Admin.Configure({
	-- The floor for opening the console at all.
	MinimumRank = Ranks.Moderator,

	-- Per-command overrides, above or below that floor.
	Commands = {
		ban = Ranks.Admin,
		announce = Ranks.Moderator,
		playerdata = Ranks.Owner,
	},

	-- true for all of Cmdr's built-ins, false for none, or a list.
	DefaultCommands = { "kick", "teleport", "respawn" },
})
```

`MinimumRank` has no default on purpose. A permission gate that guesses is a gate
that eventually guesses wrong, in the direction nobody notices until it matters.

:::danger[Until `Configure` runs, everything is refused]
Callers are told `Admin commands are closed`. Forgetting to configure closes the
console rather than opening it, which is the only safe direction for this
particular mistake.
:::

## What the gate already does for you

Three things happen before a command line is even parsed, and none of them are
yours to write:

- **Rank.** Anyone below the lowest rank any command requires is turned away.
- **Rate.** Submissions are metered per player, so the console cannot be used to
  hammer the server.
- **Length.** Absurdly long input is rejected outright.

That ordering matters more than it looks. Cmdr validates arguments before running
a command, and validation is allowed to reach outward: the built-in player types
resolve usernames through Roblox. Left as Cmdr ships it, any player at all could
spend the server's web quota by submitting command lines that were always going
to be refused.

Every command that does run is logged with who ran it, so a privileged action
always leaves a trace naming somebody.

## Add your own command

Cmdr's own format applies. A command is a definition, optionally paired with a
server-side implementation that never leaves the server.

```luau title="ServerScriptService/AdminCommands/givecoins"
return {
	Name = "givecoins",
	Aliases = { "give" },
	Description = "Add coins to a player.",
	Group = "Admin",
	Args = {
		{ Type = "player", Name = "target" },
		{ Type = "integer", Name = "amount" },
	},
}
```

```luau title="ServerScriptService/AdminCommands/givecoinsServer"
local Twill = require("@game/ReplicatedStorage/Twill")

return function(context, target, amount)
	-- "main" is the scope name for the primary profile. A branch is named by
	-- its own name. This reaches the player wherever they are, and returns
	-- what actually happened rather than a boolean.
	local outcome = Twill.Data.Edit(target.UserId, "main", "Coins", amount)

	return `{outcome}: {target.Name}`
end
```

Register the container once, during `Init`:

```luau
Twill.Admin.Register(script.Parent.AdminCommands)
```

Custom argument types go through `Twill.Admin.RegisterTypes`, and must be
registered **before** the commands that use them.

:::tip[Name the pair, not the file]
The definition replicates to clients so the console can autocomplete it. The
`Server` half never does. Keeping the implementation in the paired file is what
keeps your privileged logic off every player's machine.
:::

## Built-in Twill commands

Twill adds two families on top of Cmdr's own, and both respect the rank gate.

**`moderation`** kicks, bans, and unbans, in this place or across the whole
experience. Roblox keeps the ban record itself, so nothing is stored here to fall
out of step. What Twill adds is the part the platform will not do for you:
refusing to let a moderator remove themselves or anyone ranking as high as they
do, and reporting exactly who was acted on.

**`playerdata`** reads and writes through
[`Data.Edit`](/reference/data/#writing-to-anybody), so it reaches players who are
not on this server. A write aimed elsewhere reports back as queued rather than
applied, because that is the truth.

:::note[Durations are read exactly]
`moderation` uses its own duration type, so `7d` is seven days and `1h30m` is
ninety minutes. Anything it does not recognise is refused rather than guessed.

Cmdr's own built-in `duration` type resolves units by fuzzy match, which can read
`7d` as seven **seconds**. If you write a command that takes one, check which
type you declared.
:::

## Run a command as the server

```luau
Twill.Admin.Run("announce Round starting")
```

This answers to no rank, because there is no player to rank. Use it for scheduled
upkeep so automation and people share one set of commands.

:::danger[Never route player input into `Run`]
It is the one path with nothing standing in front of it. Text that came from a
player must go through the console, where the gate is.
:::

## Change the activation key

```luau
Twill.Admin.Cmdr:SetActivationKeys({ Enum.KeyCode.F4 })
```

`Twill.Admin.Cmdr` is Cmdr itself, on both sides, so anything Cmdr offers is
reachable there.

## Client checks are a courtesy

Each command's required rank reaches the client through
[`Replication`](/reference/replication/), so the console can refuse early and say
why instead of leaving someone waiting on a round trip.

The server runs the same check again before anything happens. A command with a
server half is never decided anywhere else, and a client answering yes changes
nothing.
