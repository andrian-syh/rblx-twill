---
title: Teleport
description: Players sent between servers in groups, with carried data kept off the client
---

**Server only.** Requiring this from a client fails at the require, naming the
module.

```luau
local Teleport = require("@game/ReplicatedStorage/Twill").Teleport

local sent, code = Teleport.Send(ARENA_PLACE, squad, { Reserve = true, Data = { Mode = "ranked" } })
local data, reason = Teleport.Receive(player)
```

Added in v1.10.0.

## Data that never passes through the client

Teleport data travels through the client, so a player can read it and may be
able to change it. `Teleport` keeps carried data in a memory store instead,
through [`Shared`](/reference/shared/), under each player's user id. The client
carries only a ticket signed by [`Token`](/reference/token/), and the arriving
server checks the ticket before handing the data over, once.

Every place that sends or receives data needs `Token` configured with the same
secret. Carried data is kept for 600 seconds; a player who arrives later arrives
with nothing.

## Groups and parties

`Send` splits a group into calls of 50, the most one call can carry. With
`Reserve = true`, it reserves one server first and sends every call there, so a
group larger than one call stays together.

`Party = true` also sends everyone on this server who shares a party with a
player being sent.

## Retries

A call that raises is tried again, up to 5 attempts in all, about a second
apart, unless the error shows the call itself was wrong.

A player the platform turns down on the way out is tried again when the reason
is one that waiting can fix: after 15 seconds for `Flooded`, after 1 second for
`Failure`, up to 5 attempts in all. Any other reason, or running out of tries, fires
`OnFailed`. A teleport that `Teleport` did not start is left to whoever started
it.

Studio cannot teleport, so a send there fails.

## API

### `Teleport.Send`

`[Server]`

Sends players to a place, with anything they carry.

```luau
function Teleport.Send(placeId: number, players: { Player }, options: Options?): (boolean, string?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `placeId` | `number` | Where they go. |
| `players` | `{ Player }` | Who goes. Anyone who already left is skipped. |
| `options` | `Options?` | Data to carry, which server, and whether parties come along. |

**Returns**

`boolean` - `true` when every call was accepted. The platform may still turn a
player down afterwards, which `OnFailed` reports.

`string?` - The access code of the server reserved for them, or why nothing was
sent.

Yields. Throws on a place id that is not a whole number above zero, on a list
that holds anything but players, on two destinations at once, and on `Data`
when `Token` is not configured.

### `Options`

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `Data` | `any?` | What each player carries. Anything a memory store can hold. |
| `Reserve` | `boolean?` | Reserve one server and send everyone there. |
| `AccessCode` | `string?` | Send to a server reserved earlier. |
| `ServerId` | `string?` | Send to one running server. |
| `Party` | `boolean?` | Also send everyone here who shares a party with them. |

At most one of `Reserve`, `AccessCode` and `ServerId`.

### `Teleport.Receive`

`[Server]`

Hands over the data a player carried here. Call it after they arrive.

```luau
function Teleport.Receive(player: Player): (any, Reason?)
```

**Returns**

`any` - What they carried, or `nil`.

`Reason?` - Why there is nothing: `"none"`, `"malformed"`, `"forged"`,
`"expired"`, `"wrong audience"`, `"missing"`, `"unreachable"` or `"taken"`.
Yields.

A second call for the same player answers `"taken"`. After `"unreachable"`,
calling again tries again.

### `Teleport.OnFailed`

`[Server]`

Fires for each player who could not be sent.

```luau
Teleport.OnFailed: Signal<(player: Player, result: Enum.TeleportResult, message: string) -> ()>
```

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Players per call | 50 | Roblox |
| Time carried data is kept | 600 seconds | Fixed |
| Tries per call or player | 5 | Fixed |
| Wait after `Flooded` | 15 seconds | Fixed |
| Wait after `Failure` | 1 second | Fixed |
