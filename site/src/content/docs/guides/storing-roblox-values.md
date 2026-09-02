---
title: Store Roblox values safely
description: Get a Vector3 or a CFrame into saved data, and find the shapes that fail quietly
---

A DataStore holds JSON and nothing else. Write a `Vector3` into a player's
profile and the save fails, but it fails late and it fails quietly: the value
travels through every step by reference, without complaint, until the write
itself.

[`Serialize`](/reference/serialize/) turns those values into something storage
accepts, and finds the shapes that would be lost on the way back.

## Encode on the way in, decode on the way out

```luau
-- Saving a spawn point the player chose.
data.Home = Twill.Serialize.Encode(spawnPart.Position)

-- Reading it back, wherever that happens.
local home = Twill.Serialize.Decode(data.Home)
part.Position = home
```

Both walk the whole tree, so a table of mixed values needs one call rather than
one per field:

```luau
data.Loadout = Twill.Serialize.Encode({
	Colour = weapon.Colour,          -- Color3
	Offset = weapon.GripOffset,      -- CFrame
	Slot = 3,                        -- left exactly as it is
})
```

Anything unrecognised passes through untouched, so running either over ordinary
data costs a walk and changes nothing. That makes `Decode` safe to run over a
profile that holds a mix of encoded and plain values, without knowing which is
which.

## This is not automatic

Twill will not encode for you. `Data.Edit` refuses an unstorable value and says
so, rather than rewriting what you handed it.

```luau
local outcome = Twill.Data.Edit(userId, "main", "Home", somePosition)
--> "unsupported"
```

The reason is that guessing on the way in means guessing on the way back out. A
save that quietly rewrites your value would hand you back something else later,
and you would find out long after the write.

Encode when a value enters saved data and decode when it leaves. Keeping
profiles encoded in memory means every reader has to remember to decode, and one
that forgets reads a table where it expected a `Vector3`.

## What can be encoded

`Vector3`, `Vector2`, `CFrame`, `Color3`, `UDim`, `UDim2`, `BrickColor`,
`NumberRange`, and `EnumItem`.

Anything else is not a storage problem to solve here. An `Instance` cannot be
saved at all; save something that identifies it, such as a name or an id, and
find it again on load.

## The shapes that fail quietly

Failing to save is loud. Saving something that comes back wrong is not, and
those are the shapes worth knowing.

```luau
local where, what = Twill.Serialize.FindUnstorable(data)

if where then
	logger:Warn(`{where} holds {what}`)
end
```

| Shape | What happens without the check |
| --- | --- |
| Both named and numbered keys in one table | Numbers return as the strings `"1"`, `"2"`, and every reader sees `nil`. |
| Gaps in a numbering | The gap and everything after it is dropped. |
| A key that is not a string or a whole number | The entry vanishes. |
| `NaN` or infinity | The write fails. |
| Text that is not valid UTF-8 | The write fails. |

The first two are the dangerous ones, because nothing reports them at any point.

```luau
-- Looks harmless. Comes back unreadable.
data.Slots = {
	[1] = "sword",
	[2] = "shield",
	Favourite = "sword",
}
```

Split it instead:

```luau
data.Slots = { "sword", "shield" }
data.Favourite = "sword"
```

:::caution[Removing from the middle makes a gap]
`table.remove` closes the gap; assigning `nil` does not. An inventory that
clears a slot by writing `nil` into it saves the entries before the gap and
silently loses the rest.
:::

## Check it before you ship it

`FindUnstorable` is cheap enough to run in Studio against a profile you have
been playing with, which is the fastest way to catch a shape that only appears
after a few sessions.

```luau
function DataAuditService.Start()
	if not RunService:IsStudio() then
		return
	end

	Twill.Watch.Players(function(player)
		task.delay(10, function()
			local data = Twill.Data.Get(player)
			if not data then
				return
			end

			local where, what = Twill.Serialize.FindUnstorable(data)
			if where then
				logger:Warn(`{player.Name}: {where} holds {what}`)
			end
		end)
	end)
end
```

## Serialize or compress

Two modules answer different questions, and reaching for the wrong one is
common.

| Use | When |
| --- | --- |
| [`Serialize`](/reference/serialize/) | A person or another system reads the field, or the value must stay exact. |
| [`Compress`](/reference/compress/) | Only size matters, and the field is opaque anyway. |

`Compress` is lossy by design and produces something unreadable. `Serialize`
keeps the value exact and keeps the profile legible in the DataStore console,
which matters the day you have to look at one by hand. See
[Send large payloads](/guides/large-payloads/) for the other half.
