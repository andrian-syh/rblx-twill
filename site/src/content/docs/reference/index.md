---
title: Module reference
description: Every module Twill ships, what it is for, and which side of the game it runs on.
---

Twill installs as two folders. Both are required.

| Folder | Contents |
| --- | --- |
| `ReplicatedStorage.Twill` | The modules a client is allowed to see, plus the root table. |
| `ServerScriptService.TwillServer` | The server half. Never replicated. |

The root table resolves modules lazily, so a single require reaches everything:

```luau
local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Log        -- shared
Twill.Data       -- resolved from TwillServer, server only
```

Requiring a module directly works too, and is the better choice inside a client
module that must not wait. See [Admin](/reference/admin/) for the one case where
it is required rather than preferred.

The root table also carries `Twill.Version`, which is the quickest way to confirm
an install answered at all.

## Shared modules

Available on the server and the client.

| Module | What it does |
| --- | --- |
| [Lifecycle](/reference/lifecycle/) | Service discovery, boot order, and the player pipeline. |
| [Net](/reference/net/) | Declaring remotes, and serving them with metering and validation. |
| [Replication](/reference/replication/) | Publishing server state and reading it on the client. |
| [Scope](/reference/scope/) | Cleanup bags tied to a player, a character, or a life. |
| [Log](/reference/log/) | Scoped, level-filtered logging. |
| [Schema](/reference/schema/) | Declarative validation for values you did not write. |
| [Limit](/reference/limit/) | Token buckets, per-player allowances, and log throttling. |
| [Loop](/reference/loop/) | Repeating work, delays, and spreading a list across frames. |
| [Watch](/reference/watch/) | Following a set of instances as it changes. |
| [Format](/reference/format/) | Numbers and durations turned into readable text. |
| [Serialize](/reference/serialize/) | Roblox values in a shape a DataStore accepts. |
| [Compress](/reference/compress/) | Large values made small and safe to send as text. |
| [Tree](/reference/tree/) | Instances described as data and built in one pass. |
| [Error](/reference/error/) | One listener for every unhandled script error. |
| [BigNumber](/reference/bignumber/) | Exact whole numbers with no ceiling. |
| [Chance](/reference/chance/) | Weighted draws, and the odds behind them. |
| [Navigation](/reference/navigation/) | Agents that walk somewhere, and one loop driving all of them. |
| [Authorization](/reference/authorization/) | Ranks, and the questions that depend on them. |
| [Admin](/reference/admin/) | An in-game command console built on Cmdr, with nine commands of its own. |

## Server-only modules

Requiring any of these from a client fails with a message naming the module.

| Module | What it does |
| --- | --- |
| [Data](/reference/data/) | Player data on ProfileStore, with versioning and migrations. |
| [Monetization](/reference/monetization/) | Developer products and passes, granted once. |
| [Leaderstats](/reference/leaderstats/) | The Roblox player list, filled from replicated state. |
| [Filter](/reference/filter/) | Player-written text made safe to show. |
| [Random](/reference/random/) | Unpredictable draws, and rolls a player can audit. |
| [Token](/reference/token/) | Signed text that proves nobody edited it. |

Four modules span both sides under one name. `Net`, `Replication`,
`Authorization`, and `Admin` each have a server half that is not replicated, and
their pages mark every member that only exists there.

## Bundled libraries on the root

Three names on the root table are not Twill modules and have no page here:
`Twill.Trove`, `Twill.Signal`, and `Twill.Packet`. They are bundled third-party
packages, exposed because you already hold their values — a `Scope` bag is a
Trove, and a declared remote is a Packet.

Their API belongs to their projects, and Twill's stability promise does not cover
it. See [Bundled packages](/reference/bundled-packages/).

## Reading the badges

Every member on every page carries the sides it exists on.

| Badge | Meaning |
| --- | --- |
| `[Server]` \| `[Client]` | Available on both. |
| `[Server]` | Calling it from a client fails. |
| `[Client]` | The receiving half of a module whose publisher is server-side. |

## Reading the signatures

Signatures are written as Luau type annotations, taken from the source.

```luau
function Limit.PerPlayer(rate: number, burst: number?): Allowance
```

A trailing `?` means the argument may be omitted or the return may be `nil`.
`self` appears in a signature only where the member is called with a colon.

Generic parameters such as `<T>` mean the module hands back whatever type you
put in. Nothing is checked at runtime by the generic itself.
