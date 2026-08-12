---
title: Replicate state to clients
description: Push server state to one player or to everyone, and read it on the other side.
---

## Publish

```luau title="server"
Twill.Replication.Set("RoundEndsAt", os.time() + 120)

Twill.Replication.SetFor(player, "Loadout", loadout)
Twill.Replication.SetPathFor(player, "Loadout", "Primary", "rifle")
Twill.Replication.IncrementFor(player, "Loadout", "Ammo", -1)
```

Every name has a `For` twin. Without it the value is shared by everybody. With
it, the value belongs to one player and **no one else ever receives it**.

## Subscribe

```luau title="client"
local subscription = Twill.Replication.Subscribe("Loadout.Primary", function(weapon)
	label.Text = weapon or "none"
end)

trove:Add(subscription)
```

The callback runs once immediately if the value is already known, so there is no
separate "read the current value" step.

:::caution[Require Replication somewhere on the client]
The client sends one readiness signal the first time its half of the module is
required. If no client code ever requires it, the server has nothing to send to.
:::

## Read without subscribing

```luau
local endsAt = Twill.Replication.Get("RoundEndsAt")
```

Works on both sides. On the client this reads what was last received, so it can
be `nil` early. To wait:

```luau
local endsAt, arrived = Twill.Replication.WaitFor("RoundEndsAt", 10)
```

## Key names cannot contain dots

The first dot separates the key from the path inside it.

```luau
Replication.Set("Player.Data", value)     -- never matches any subscription
Replication.Set("PlayerData", value)      -- correct
```

A subscription to `"Player.Data"` reads it as key `Player`, path `Data`, and
waits forever.

## Change one field in a large table

```luau
Twill.Replication.SetPathFor(player, "Data", "Stats.Coins", 250)
```

Only that field travels. Replication keeps a private copy of what each player was
last sent and diffs against it, so a deep write inside a large table costs one
field, not the table.

`SetPath` returns `false` if the path does not exist, rather than creating the
intermediate tables and hiding a typo.

## Rearrange without sending every step

```luau
Twill.Replication.Freeze("Board")

for _, move in moves do
	Twill.Replication.SetPath("Board", move.Path, move.Value)
end

Twill.Replication.Unfreeze("Board")
```

One diff for the whole rearrangement instead of a message per step.

## Slow a noisy key

```luau
Twill.Replication.SetThrottle("Position", 0.5)
```

Writes are already batched on a global interval. This slows one key further, for
values that change far more often than a player could notice.

## Guard against your own mistakes

```luau
Twill.Replication.SetValidator("RoundEndsAt", function(value)
	return type(value) == "number" and value > os.time()
end)
```

A client cannot publish anything, so this is not a security boundary. It catches
the bug where some code path publishes `nil` at three in the morning.

## Player data is already wired

If you only want a player to see their own saved fields, do not publish by hand.
Name them in [`Data.Configure`](/reference/data/):

```luau
Replicate = { "Coins", "Stats" },
```

They arrive under the `Data` key and follow direct mutation. See
[Store and save player data](/core-guides/player-data/).

## Watch the cost

```luau
local stats = Twill.Replication.GetStats()
print(stats.Messages, stats.Keys)
```

The diff is what keeps messages small, and the private per-player copy is what
the diff costs in memory. A key holding a very large table for every player is
paid for twice.
