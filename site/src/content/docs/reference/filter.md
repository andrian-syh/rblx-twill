---
title: Filter
description: Text a player wrote, made safe to show another player
---

```luau
local Filter = require("@game/ServerScriptService/TwillServer/Filter")

local shown = Filter.ForBroadcast(message, player.UserId)

if not shown then
	return false, "that could not be checked, try again"
end
```

Server only, because the Roblox filter is.

For where this fits in a submission flow, see
[Filter player-written text](/guides/filtering-text/).

## When you must use it

Any text one player wrote and another player sees has to go through Roblox's
filter. That is not a style rule. A game that shows it unfiltered can be taken
down.

It applies to every custom surface: pet names, guild names, signs,
announcements, anything typed into a text box. The default chat is already
filtered; anything you built is not.

## This fails closed

When the filter cannot be reached, every function here answers `nil`, never the
text that went in. The failure is written to the log at `Warn` under
`Twill.Filter`, naming who wrote the text.

Handing back the original on failure is the mistake this module exists to make
impossible. The caller is made to decide what to show instead.

```luau title="Do this"
local shown = Filter.ForBroadcast(text, userId)
if not shown then
	return refuse("try again in a moment")
end
```

```luau title="Not this"
local shown = Filter.ForBroadcast(text, userId) or text
```

The second is the failure mode the module was built to prevent.

## Filter on submit, not on draw

The platform rate limits filtering per user, and the underlying calls spend web
quota. This module adds no limit of its own, so the platform's is the one you
will meet.

Filter once when the text is submitted, store the result, and show the stored
result. Filtering every time a label is redrawn exhausts the budget and achieves
nothing.

## API

### `Filter.ForBroadcast`

`[Server]`

Checks text once and gives back one string safe to show anybody.

```luau
function Filter.ForBroadcast(text: string, fromUserId: number): string?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | What was written. Empty text comes back empty without a call. |
| `fromUserId` | `number` | Who wrote it. |

**Returns**

`string?` - The text to show, or `nil` when it could not be checked. Yields.

Throws when given something other than text and a user id.

This is what almost every use wants, and it costs one check however many people
see the result.

### `Filter.ForUser`

`[Server]`

Checks text and gives back the string safe for one particular reader.

```luau
function Filter.ForUser(text: string, fromUserId: number, toUserId: number): string?
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | What was written. Empty text comes back empty without a call. |
| `fromUserId` | `number` | Who wrote it. |
| `toUserId` | `number` | Who will read it. |

**Returns**

`string?` - The text to show them, or `nil` when it could not be checked.
Yields.

Throws when given something other than text and two user ids.

The result differs per viewer, depending on their account settings. This costs a
call for every reader, so reach for the broadcast form unless the difference
matters.

### `Filter.IsClean`

`[Server]`

Reports whether text came back untouched.

```luau
function Filter.IsClean(text: string, fromUserId: number): boolean
```

**Returns**

`boolean` - `true` only when nothing was changed. Yields.

Use it to refuse a name outright rather than store a version full of hashes.

This is a broadcast check compared against what went in, so a check that could
not be made reads as not clean and nothing gets through on a failure. Empty text
is clean.
