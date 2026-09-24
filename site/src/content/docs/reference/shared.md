---
title: Shared
description: Cross-server messages and memory store maps, spent from one budget per server
---

**Server only.** Requiring this from a client fails at the require, naming the
module.

```luau
local Shared = require("@game/ReplicatedStorage/Twill").Shared

Shared.Publish("Announcements", { Text = "Double coins for an hour" })
Shared.Subscribe("Announcements", onAnnouncement, bag)
```

Added in v1.10.0.

## One budget per server

Every message this server publishes, every topic it listens to, and every
memory store request it makes is counted here. Twill's own traffic, such as the
release requests `Store` sends, is counted against the same allowance as the
game's.

| Allowance | Per minute, per server |
| :--- | :--- |
| Messages published | 600 + 240 × players |
| Subscribe requests | 240 |
| Subscriptions held at once | 20 + 8 × players |
| Memory store request units | 100 + 120 × players |

Messaging limits are the platform's own, per server. The memory store quota
belongs to the whole experience, and no server can see what the others spend,
so `Shared` counts a share: the per-player part is this server's, and the base
is assumed split with other servers.

A request that finds no room waits for up to 5 seconds before failing. A failed
request is tried again, up to 3 times in total, unless the failure is one that
trying again cannot fix, such as a value that is too large.

## Best-effort delivery

A published message may never arrive. Nothing that matters may depend on one.
Player data goes through [`Data.Edit`](/reference/data/#writing-to-anybody),
which lands whether or not any server is listening.

## API

### `Shared.Publish`

`[Server]`

Publishes a message to every server listening to a topic.

```luau
function Shared.Publish(topic: string, message: any): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `topic` | `string` | 1 to 80 characters. |
| `message` | `any` | Anything that encodes as JSON in 1024 bytes or fewer. |

**Returns**

`boolean` - `true` when the message was handed over. Delivery is still best
effort. Yields.

Throws on a topic out of range, and on a message that cannot be sent: too large,
or holding a value storage cannot hold, such as an `Instance`.

### `Shared.Subscribe`

`[Server]`

Listens to a topic until its owner closes.

```luau
function Shared.Subscribe(topic: string, callback: (data: any, sent: number) -> (), owner: Bag?): Connection?
```

**Returns**

`Connection?` - A handle with `Disconnect`, held by `owner`, or by the framework
bag when left out. `nil` when listening could not start, such as when the server
holds as many subscriptions as its players allow. Yields.

A callback that raises is reported and stepped over.

### `Shared.Map`

`[Server]`

Returns a handle on a memory store hash map.

```luau
function Shared.Map(name: string): SharedMap
```

Throws on a name longer than 128 characters.

### `SharedMap:Get`

```luau
function SharedMap:Get(key: string): (boolean, any)
```

**Returns**

`boolean` - `true` when the read went through.

`any` - What the key holds, `nil` when nothing, or why the read failed. Yields.

### `SharedMap:Set`

```luau
function SharedMap:Set(key: string, value: any, expiry: number): boolean
```

**Returns**

`boolean` - `true` when the write went through, whether or not the key held
anything before. Yields.

`expiry` is a whole number of seconds from 1 to 3888000. Everything in a memory
store expires.

### `SharedMap:Update`

Changes one key from what it holds now, never over a change made elsewhere in
between.

```luau
function SharedMap:Update(key: string, transform: (current: any) -> any, expiry: number): (boolean, any)
```

**Returns**

`boolean` - `true` when the request went through.

`any` - What the key holds afterwards, or why the request failed. Yields.

The transform returns `nil` to leave the key unchanged. It costs at least 2
request units.

### `SharedMap:Remove`

```luau
function SharedMap:Remove(key: string): boolean
```

**Returns**

`boolean` - `true` when the request went through. Yields.

### `Shared.Usage`

`[Server]`

Reports what this server has spent in the last minute, against each ceiling.

```luau
function Shared.Usage(): Usage
```

**Returns**

`Usage` - `Publish`, `Subscribe`, `Listening` and `Memory`, each with a matching
`Limit` field such as `PublishLimit`.

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Message size | 1024 bytes | Roblox |
| Topic length | 80 characters | Roblox |
| Map name and key length | 128 characters | Roblox |
| Longest expiry | 3888000 seconds | Roblox |
| Wait for room | 5 seconds | Fixed |
| Tries per request | 3 | Fixed |
