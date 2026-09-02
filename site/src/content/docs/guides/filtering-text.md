---
title: Filter player-written text
description: Make anything one player typed safe to show another, and fail correctly when the filter is down
---

The moment your game lets one player type something another player will read,
you have taken on a moderation obligation that Roblox enforces. Most of the work
is one function call. The part that goes wrong is what happens when that call
fails, because the tempting fallback is the one that gets games taken down.

## When this is required

Any text one player wrote and another player sees has to go through Roblox's
filter. This is not a style preference. A game that shows it unfiltered can be
taken down.

It applies to every surface you built yourself: pet names, guild names, signs,
announcements, chat replacements, anything typed into a text box. The default
chat is already filtered. Nothing you wrote is.

## Filter on submit

```luau
Twill.Net.Handle(Remotes.RenamePet, function(player, petId, name)
	-- Filtering yields, so everything after it has to assume time has passed.
	local shown = Twill.Filter.ForBroadcast(name, player.UserId)

	if not shown then
		return false, "could not check that name, try again"
	end

	-- Re-read after the yield rather than before it. The player may have left
	-- while the filter was thinking, and their session is gone with them.
	local data = Twill.Data.Get(player)
	if not data then
		return false, "not ready"
	end

	-- Store the filtered text, never the text they submitted.
	data.Pets[petId].Name = shown

	return true, shown
end, {
	Rate = 0.5,
	Schema = { { "string", 1, 40 }, { "string", 1, 20 } },
	Reject = function() return false, "slow down" end,
})
```

Store the filtered result and display the stored result. Do not filter again on
every draw.

## Handle failure correctly

Every function in [`Filter`](/reference/filter/) answers `nil` when the filter
cannot be reached. It never returns the text that went in.

```luau title="Do this"
local shown = Twill.Filter.ForBroadcast(text, userId)
if not shown then
	return refuse("try again in a moment")
end
```

```luau title="Not this"
local shown = Twill.Filter.ForBroadcast(text, userId) or text
```

The `or text` fallback looks like defensive programming and is the opposite of
it. A filter outage becomes an unfiltered broadcast.

## Broadcast or per-user

| Function | Result | Cost |
| --- | --- | --- |
| `ForBroadcast` | One string safe for everybody. | One call. |
| `ForUser` | Tailored to a single recipient. | One call per recipient. |

`ForBroadcast` is what almost every use wants. Reach for `ForUser` only where
the recipient genuinely matters, such as a direct message, and never in a loop
over the whole server.

## Refuse rather than mangle

For a name, showing `#####` is worse than refusing.

```luau
if not Twill.Filter.IsClean(name, player.UserId) then
	return false, "pick a different name"
end
```

`IsClean` returns `false` when the filter could not be reached, consistent with
the rest of the module. That means a filter outage refuses the rename, which is
the correct direction to fail.

## Budget

This module has a rate limit of its own per user, and the underlying calls spend
the server's web quota.

Filter once at submission. Store the result. Show the stored result.
