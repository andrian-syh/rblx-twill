---
title: Authorization
description: Who is allowed to do what
---

```luau
local Authorization = require("@game/ReplicatedStorage/Twill").Authorization

if Authorization.AtLeast(player, Ranks.Moderator) then
	openThePanel(player)
end
```

A rank is a number. You name the numbers yourself, in a table both sides can
read, and higher means more.

```luau
-- ReplicatedStorage/Shared/Ranks
return table.freeze({
	Guest = 0,
	Player = 10,
	Tester = 50,
	Moderator = 70,
	Owner = 100,
})
```

Twill ships no rank names of its own. A game with two levels and a game with
twelve are both served by a plain table of numbers.

For the patterns, see [Gate actions by rank](/guides/ranks-and-permissions/).

## Deciding a rank

The server decides, once, during `Init`.

```luau
Twill.Authorization.Configure({
	Default = Ranks.Player,
	Users = { [123456] = Ranks.Owner },

	Resolve = function(player)
		return if inGroup(player) then Ranks.Moderator else nil
	end,
})
```

`Users` and `Default` answer at once, so a player is never left without a rank
while a slower answer is worked out. `Resolve` may yield; until it returns, the
player holds what `Users` or `Default` gave them.

A `Resolve` answering anything but a number leaves the rank as it stands, which
is how it declines to decide.

## Reading a rank

The answer travels as a player attribute named `TwillRank`, so reading works the
same on both sides without a remote.

```luau
if Twill.Authorization.GetRank(player) >= Ranks.Moderator then
	-- ...
end
```

A client can read that attribute but cannot write it. Hiding a button by rank is
therefore safe. Trusting a client's claim about its own rank is not.

Every decision that matters is made on the server, which is what
[`MinimumRank`](/reference/net/#minimumrank) on `Net.Handle` is for.

## API

### `Authorization.GetRank`

`[Server]` | `[Client]`

Returns a player's rank.

```luau
function Authorization.GetRank(player: Player): number
```

**Returns**

`number` - Their rank, or zero when none has been decided.

A player whose rank has not been decided yet reads as zero, so a check made too
early refuses rather than admits.

### `Authorization.AtLeast`

`[Server]` | `[Client]`

Reports whether a player's rank reaches at least the one given.

```luau
function Authorization.AtLeast(player: Player, rank: number): boolean
```

**Returns**

`boolean` - `true` when they reach it.

The same comparison, spelled once. Reading this on a client is for what a player
is shown, never for what they are allowed to do.

### `Authorization.OnChanged`

`[Server]` | `[Client]`

Returns a signal that fires when a player's rank is decided or changed.

```luau
function Authorization.OnChanged(player: Player): RBXScriptSignal
```

**Returns**

`RBXScriptSignal` - Fires on every change, carrying nothing.

This is the attribute's own changed signal. Draw once for the rank already held,
then follow this: a rank decided before you connected never fires.

### `Authorization.Attribute`

`[Server]` | `[Client]`

The attribute name a rank is published under.

```luau
Authorization.Attribute   --> "TwillRank"
```

For code that binds to the attribute directly, such as a UI that follows it
without going through this module.

### `Authorization.Configure`

`[Server]`

Sets who holds which rank.

```luau
function Authorization.Configure(config: Config)

export type Config = {
	Default: number?,
	Users: { [number]: number }?,
	Resolve: ((player: Player) -> number?)?,
}
```

**Config**

| Field | Type | Description |
| :--- | :--- | :--- |
| `Default` | `number?` | The rank everybody starts at. Zero when left out. |
| `Users` | `{ [number]: number }?` | Ranks by user id, answered without waiting. |
| `Resolve` | `((player: Player) -> number?)?` | Decides what a table cannot. May yield. |

Call once, during the first boot phase, before anything can act on a rank.
Throws on a second call, rather than letting who is privileged change while the
server runs.

Players already on the server when this runs are decided too, so configuring is
not something a player can arrive ahead of.

A `Resolve` that throws is reported at `Error` and leaves the player on the rank
they already hold. One that returns after the player has gone changes nothing.

### `Authorization.SetRank`

`[Server]`

Overrides a player's rank for the rest of their session.

```luau
function Authorization.SetRank(player: Player, rank: number)
```

Throws when the rank is not a number.

Nothing is remembered: they rejoin at whatever the usual decision gives them. To
make a promotion permanent, write it to [`Data`](/reference/data/) and read it
back in `Resolve`.

The [`rank` command](/reference/admin/#rank) reaches this from the console,
under guards this function does not impose on its own. Calling `SetRank` in your
own code has no such guards, so do not route a player's request into it.

### `Authorization.GetGroupStanding`

`[Server]`

Returns a player's standing in a group.

```luau
function Authorization.GetGroupStanding(player: Player, groupId: number): GroupStanding?

export type GroupStanding = {
	IsMember: boolean,
	Ranks: { number },
	Roles: { string },
}
```

**Returns**

`GroupStanding?` - Their membership, or `nil` when the lookup failed. Yields on
the first call per player and group.

Throws when the group id is not a number.

Remembered for the rest of their session, because group lookups spend the
server's web quota, and dropped through [`Scope.Player`](/reference/scope/). A
failed lookup is not remembered, so it is retried rather than treated as an
answer of no, and is reported at `Warn`.

`nil` means unknown, not that they are outside the group. Standing that changes
while they are playing is not picked up; they see it on rejoining. Where a group
outage should not silently demote your moderators, check for `nil` explicitly
rather than treating it as a refusal.

### `Authorization.InGroup`

`[Server]`

Reports whether a player belongs to a group, optionally at a rank or above.

```luau
function Authorization.InGroup(player: Player, groupId: number, minimumRank: number?): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | The player to check. |
| `groupId` | `number` | The group to check them against. |
| `minimumRank` | `number?` | Lowest group rank that counts. Any member when left out. |

**Returns**

`boolean` - `true` when they belong, at that rank or above. Yields.

A lookup that failed reads as not a member, so this cannot let somebody in on
the strength of an answer nobody received. This is the question `Resolve` is
usually asked.

## Server only

`Configure`, `SetRank`, `GetGroupStanding`, and `InGroup` exist on a client but
throw when called, naming themselves as server only. The list of who holds which
rank never reaches a player.
