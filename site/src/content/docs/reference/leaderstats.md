---
title: Leaderstats
description: The Roblox player list, filled from replicated state
---

```luau
Twill.Leaderstats.Bind({
	{ Name = "Coins", Key = "Data", Path = "Stats.Coins" },
	{ Name = "Wave",  Key = "Wave" },
})
```

Server only.

Each entry watches one replicated key and writes what it finds into a value
object in a `leaderstats` folder under the player.

Nothing else has to be called. The same write that reaches the client updates
the player list, and a shared key updates it for everyone at once. The folder
lives on the player, so it leaves when they do.

For the trade-offs, see [Show stats in the player list](/guides/leaderstats/).

## Value objects

The value object is chosen from the value itself, and replaced if the value
later needs a different one, so a stat that outgrows its holder keeps showing
rather than silently stopping.

| Value | Object |
| :--- | :--- |
| Whole number | `IntValue` |
| Fractional number | `NumberValue` |
| String | `StringValue` |
| Boolean | `BoolValue` |
| [`BigNumber`](/reference/bignumber/) | `StringValue`, formatted |

A value that cannot be shown at all leaves the stat as it was, rather than
clearing it.

The player list sorts `IntValue` and `NumberValue` only. Text is shown but never
sorted, so a big number reads correctly and ranks nowhere. Where ranking matters
more than exactness, store a clamped plain number alongside the big one and bind
that.

## Bind keys that change at human pace

A key written every frame writes the player list every frame, and every client
pays for it. The player list is replicated to everyone.

For a value that changes continuously, either throttle the key with
[`SetThrottle`](/reference/replication/#replicationsetthrottle) or bind a
separate, coarser key.

## API

### `Leaderstats.Bind`

`[Server]`

Binds stats to published keys and fills the list in for everyone already here.

```luau
function Leaderstats.Bind(newEntries: { Entry })

export type Entry = {
	Name: string,
	Key: string,
	Path: string?,
	Places: number?,
}
```

**Entry**

| Field | Type | Description |
| :--- | :--- | :--- |
| `Name` | `string` | The column heading, and the name of the value object. Not empty. |
| `Key` | `string` | The [`Replication`](/reference/replication/) key to watch. Not empty. |
| `Path` | `string?` | A path inside that key. Left out to watch the whole key. |
| `Places` | `number?` | Decimal places, for a value shortened into text. |

Throws on a malformed list, naming the field that failed, and on a stat name
that is already bound.

Binding adds rather than replaces. Calling this again keeps what was bound
before and appends to it, so a system can register its own stat without knowing
what else exists. Binding ten stats to one key costs one listener, not ten.

### `Leaderstats.Refresh`

`[Server]`

Writes every bound stat onto a player.

```luau
function Leaderstats.Refresh(player: Player)
```

Throws when given anything but a `Player`.

Rarely needed, since bound stats follow their keys on their own and every
joining player is written to. It exists for state that moved without the keys
noticing.
