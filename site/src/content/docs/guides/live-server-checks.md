---
title: Check what Studio cannot
description: Measure network traffic and prove teleports on a live server
---

Two things cannot be proven in a Studio playtest. Studio reports no network
traffic, so bandwidth reads as zero, and Studio cannot teleport, so a send
always fails. Both have to be checked on a published experience with real
players.

Run these checks before a release that changes remotes, replication or
teleports, and again when player counts grow.

## Before you start

- Publish the place, and join it from the Roblox app rather than from Studio.
- Set up the [admin console](/guides/admin-console/) with the `twill` command at
  a rank you hold.
- For teleports, have two places in the same experience, both with Twill
  installed, and [`Token`](/reference/token/) configured with the same secret
  in each.

## Measure network traffic

Twill counts every message, call and byte on each side, and every refusal by
its reason. The [count](/reference/net/#measuring-traffic) starts when the
server starts.

1. Start a live server and bring in as many players as the scenario needs.
2. Play until the server has settled, then run `twill traffic` and note the
   time and the byte counts.
3. Play the scenario you want to measure: a round, a crowded moment, a big
   purchase.
4. Run `twill traffic` again.
5. Work out the rate for that window from the two readings:
   `(bytes after - bytes before) * 8 / 1000 / seconds between` gives kbps.

To measure a window from code instead, call `Net.ResetStats()` when it starts
and read `Net.GetStats()` when it ends. `Seconds` in the result is the length of
the window.

### Reading the result

- **Sent** on the server is the total for every player. Divide it by the number
  of players for what each client has to download.
- **The busiest remotes** are where to look first. A remote that carries a large
  share of the bytes is the one worth batching, throttling or sending less
  often.
- **`Rate` or `Budget` refusals** during normal play mean a limit is tighter
  than the game needs, or a client sends more than it should. Raise the
  remote's `Rate`, or send less.
- **`Schema` or `Validate` refusals** from normal players mean your own client
  sends something your server does not accept. That is a bug, not an attack.
- **`Unknown` or `Malformed` refusals** come from an out of date client or from
  tampering.

The byte counts are the payload Twill builds. The engine adds framing of its
own, so the real traffic is somewhat higher than the count.

## Prove a teleport

Send one player with data, then a group, then check that the data can be taken
only once.

On the sending place:

```luau
local Teleport = require("@game/ServerScriptService/Twill").Teleport

local sent, detail = Teleport.Send(DESTINATION_PLACE, { player }, {
	Data = { Probe = os.time() },
})

print("sent", sent, detail)
```

On the destination place, once the player has arrived:

```luau
local data, reason = Teleport.Receive(player)
print("received", data and data.Probe, reason, game.JobId)

local again, secondReason = Teleport.Receive(player)
print("second", again, secondReason)
```

Check each of these:

| Check | What passes |
| :--- | :--- |
| One player with data | `sent` is `true`, and the destination prints the same `Probe` with no reason. |
| Data taken once | The second `Receive` gives `nil` and `"taken"`. |
| A group in one server | Send two or more players with `Reserve = true`. Every player prints the same `JobId`. |
| Parties | Send one member of a party with `Party = true`. The rest of the party arrives too. |
| No secret shared | Configure a different secret on the destination. `Receive` gives `"forged"`. |
| A player turned away | `Teleport.OnFailed` fires for a player the platform refuses, with the reason. |

Put the secret back the way it was after the forged check.

## Record the result

Keep the readings with the release they belong to: the date, the player count,
the kbps each way, the busiest remotes, and which teleport checks passed. A
later reading only means something next to an earlier one.
