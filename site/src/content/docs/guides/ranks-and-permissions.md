---
title: Gate actions by rank
description: Name your own permission levels, decide them on the server, and read them safely on both sides.
---

Sooner or later something in your game must be available to some players and not
others: a moderator command, a tester-only door, an owner's panel. The mistake
that follows is almost always the same one, which is deciding who may do it in
the same place that draws the button.

Twill splits those two questions. A rank is decided once on the server and
published as a read-only attribute. The client may read it to decide what to
**show**. The server decides what is **allowed**, again, every time.

## Name the levels

Twill ships no rank names, because the levels a game needs are the game's own.
Put yours in a shared module.

```luau title="ReplicatedStorage/Shared/Ranks"
return table.freeze({
	Guest = 0,
	Player = 10,
	Tester = 50,
	Moderator = 70,
	Admin = 90,
	Owner = 100,
})
```

Higher means more.

:::tip[Leave gaps between the numbers]
Numbering by tens costs nothing now and means a level can be inserted later
without renumbering the ones around it, and without a stored rank suddenly
meaning something else.
:::

## Decide them

Once, on the server, during `Init`. Configuring twice is refused rather than
allowed to change who is privileged while the server is running.

```luau
local Ranks = require(ReplicatedStorage.Shared.Ranks)

Twill.Authorization.Configure({
	-- What everybody gets before anything else is known about them.
	Default = Ranks.Player,

	-- Answered immediately, with no web call, so these players hold their
	-- rank from the moment they arrive.
	Users = {
		[123456] = Ranks.Owner,
		[789012] = Ranks.Admin,
	},
})
```

## Decide them from a group

`Resolve` covers what a table cannot. It runs once per player, and it may yield,
so the player holds the default rank until it returns.

```luau
Twill.Authorization.Configure({
	Default = Ranks.Player,
	Users = { [123456] = Ranks.Owner },

	Resolve = function(player)
		if Twill.Authorization.InGroup(player, 1234567, 200) then
			return Ranks.Moderator
		end

		if Twill.Authorization.InGroup(player, 1234567) then
			return Ranks.Tester
		end

		-- Nil means "no opinion", so the answer falls back to Users and then
		-- Default. Returning Ranks.Player here instead would override the
		-- Users table and quietly demote your owner.
		return nil
	end,
})
```

:::caution[Distinguish "not a member" from "could not ask"]
`GetGroupStanding` answers `nil` when the group could not be reached, which is
not the same as not being in it. A failed lookup is not remembered, so it is
retried rather than settled wrongly. If a group outage should not silently
demote your moderators, check for `nil` explicitly rather than treating it as a
refusal.
:::

## Enforce on the server

This is the only place enforcement counts.

```luau
Twill.Net.Handle(Remotes.StartRound, onStartRound, {
	-- Checked before the caller spends any of their rate allowance, so
	-- someone without the rank cannot use the packet to exhaust anything.
	MinimumRank = Ranks.Moderator,

	Reject = function()
		return false, "not allowed"
	end,
})
```

For anything that is not a remote, ask directly:

```luau
if not Twill.Authorization.AtLeast(player, Ranks.Moderator) then
	return
end
```

:::tip[Read the rank, do not store it]
`GetRank` reads an attribute, so it is cheap enough to call at the point of the
decision. Capturing a rank into a variable at the start of a long operation means
acting on a rank the player may no longer hold.
:::

## Read on the client

The rank travels as a **player attribute**, so a controller reads it without a
remote and without waiting.

```luau title="ReplicatedStorage/Client/AdminController"
local Players = game:GetService("Players")

local Twill = require("@game/ReplicatedStorage/Twill")
local Ranks = require(ReplicatedStorage.Shared.Ranks)

local AdminController = {}

function AdminController.Start()
	local player = Players.LocalPlayer

	local function refresh()
		button.Visible = Twill.Authorization.AtLeast(player, Ranks.Moderator)
	end

	-- Draw once for the rank they already hold, since a rank decided before
	-- this ran will never fire a change.
	refresh()

	-- Then follow it, because Resolve may still be running, and a rank can be
	-- granted mid-session.
	Twill.Scope.Framework():Connect(Twill.Authorization.OnChanged(player), refresh)
end

return AdminController
```

A client can read that attribute but cannot write it. Hiding a button this way is
safe. Trusting a client's claim about its own rank is not, which is why the
server checks again.

## Promote at runtime

```luau
Twill.Authorization.SetRank(player, Ranks.Tester)
```

The attribute updates, `OnChanged` fires on both sides, and anything bound to it
follows.

This does not persist. Nothing is remembered, so they rejoin at whatever the
usual decision gives them. To make a promotion permanent, write it to
[`Data`](/reference/data/) and read it back in `Resolve`.

## Web quota

Group lookups spend the server's HTTP budget. `GetGroupStanding` remembers its
answer for the rest of a player's session and drops it through
[`Scope.Player`](/reference/scope/), so asking repeatedly in `Resolve` costs one
lookup.

Asking for every player at once still costs one lookup each. Resolve on join,
which is what `Resolve` already does, rather than sweeping the server on a timer.
