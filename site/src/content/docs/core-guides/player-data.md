---
title: Store and save player data
description: Set up a profile, add fields safely over time, and read data for players who are not here.
---

## Set up the store

Configure once, during `Init`, then wire the gate so no service sees a player
before their data exists.

```luau title="ServerScriptService/Main.server.luau"
local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Data.Configure({
	Store = "PlayerData",
	Version = 1,
	Template = {
		Coins = 0,
		Inventory = {},
		Stats = { Wins = 0, Losses = 0 },
	},
})

Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)
Twill.Lifecycle.Start(script.Parent.Services)
```

## Read and write

`Data.Get` returns the live table. Mutate it and it saves on its own.

```luau
function ShopService.OnPlayerReady(player, data)
	data.Coins += 100
end
```

```luau
local data = Twill.Data.Get(player)
if not data then
	return
end

data.Stats.Wins += 1
```

There is no commit step, and **no save call belongs in `BindToClose`**.
ProfileStore flushes everything on shutdown already.

:::caution[Re-check after every yield]
A player can leave while you were waiting. Anything that yields must ask again
before it writes.

```luau
local ok = someYieldingCall()

if not Twill.Data.IsReady(player) then
	return
end

Twill.Data.Get(player).Coins += 10
```
:::

## Add a field later

Add it to the template. Existing profiles are filled in on load, so a new field
needs no migration.

```luau
Template = {
	Coins = 0,
	Inventory = {},
	Stats = { Wins = 0, Losses = 0 },
	Pets = {},            -- new; existing profiles get {} on next load
}
```

## Change a field later

Renaming, reshaping, or recomputing a field needs a migration. Bump the version
and add a step keyed by the version it **produces**.

```luau
Twill.Data.Configure({
	Store = "PlayerData",
	Version = 3,
	Template = { Coins = 0, Stats = { Wins = 0 } },
	Migrations = {
		[2] = function(data)
			data.Coins = data.Money or 0
			data.Money = nil
		end,
		[3] = function(data)
			data.Stats = { Wins = data.Wins or 0 }
			data.Wins = nil
		end,
	},
})
```

Steps run in ascending order, and only on profiles that already hold data. A new
profile starts at the current version and skips all of them.

A step that throws prevents the session from opening, and the player is kicked
rather than served a half-upgraded profile. That is the safe failure, but it is
still a failure, so write migrations defensively:

```luau
[3] = function(data)
	data.Stats = { Wins = tonumber(data.Wins) or 0 }
end,
```

### Never renumber a migration

Once a version has shipped, its number is fixed. Profiles in the wild record
which version they are at. Renumbering makes a step run twice or not at all.

## Store a Roblox value

A DataStore holds JSON. A `Vector3` written straight into player data fails the
save, late and quietly.

```luau
data.Home = Twill.Serialize.Encode(spawnPoint.Position)
-- ...
local home = Twill.Serialize.Decode(data.Home)
```

See [`Serialize`](/reference/serialize/) for the full list of what needs
encoding, and the key shapes a DataStore silently mangles.

## Show data on the client

Name the fields in `Replicate` and they arrive on the owning client, following
direct mutation.

```luau
Twill.Data.Configure({
	-- ...
	Replicate = { "Coins", "Stats" },
})
```

```luau title="client"
Twill.Replication.Subscribe("Data.Coins", function(coins)
	label.Text = Twill.Format.Comma(coins or 0)
end)
```

Only the named fields travel, and only to their owner.

## Data for a player who is not here

```luau
local data = Twill.Data.GetOffline(userId)
```

Read-only, and it does not take the session from whichever server holds it.

## Write to a player who is not here

```luau
local outcome = Twill.Data.Edit(userId, "Data", "Coins", 500)
```

Three routes are chosen for you: applied here if this server holds the session,
sent to whichever server does, or left in their saved data until next login.
**Nothing ever writes over a session it does not own.**

Check the [outcome](/reference/data/#outcome). `"unsupported"` means the value
cannot survive a DataStore and needs
[`Serialize.Encode`](/reference/serialize/) first.

## Move a large collection off the main profile

A profile that loads on every join should stay small. Put rarely-read data in a
branch.

```luau
Twill.Data.Configure({
	-- ...
	Branches = {
		Pets = {
			Template = { Owned = {} },
			Version = 1,
		},
	},
})
```

```luau
local pets = Twill.Data.GetBranch(player, "Pets")
	or Twill.Data.LoadBranch(player, "Pets")
```

`GetBranch` does not yield. `LoadBranch` does.

## Verify a write landed

Most writes need no confirmation. When one does, such as before telling Roblox a
purchase succeeded:

```luau
local landed = Twill.Data.SaveNow(player, function(saved)
	return saved.Coins >= expected
end, 10)
```

[`Monetization`](/reference/monetization/) already does this for receipts. You do
not need to repeat it there.
