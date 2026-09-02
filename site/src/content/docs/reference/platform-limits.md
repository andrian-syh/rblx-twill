---
title: Platform limits
description: The Roblox ceilings Twill is shaped around, and how to stay clear of them
---

The limits on this page belong to Roblox, not to Twill, and Roblox changes
them. This page describes the shape of each limit and links to the page that
carries the current number. Read that page before designing right up against
one.

Most budgets scale with the player count. Nearly every request budget is a base
plus a per-player term, so a system that runs perfectly in an empty test place
can be over budget on a full server, and inside it again the moment players
leave. Test at population, not alone.

## DataStore

What matters most is the shape of the data, not its size.

- **JSON only.** No `Vector3`, `CFrame`, or `Color3`. Use
  [`Serialize`](/reference/serialize/).
- **No NaN, no infinity.**
- **Text must be valid UTF-8.**
- **Named and numbered keys cannot mix.** `{ 1, 2, Name = "x" }` becomes
  `[1,2]`. The string key is lost with no error.
- **Numbering cannot have gaps.** `{ [1] = "a", [3] = "b" }` comes back with
  string keys.

`Serialize.FindUnstorable` catches all of these, and a key that is neither a
string nor a number besides. `Data.Edit` runs it for you and answers
[`"unsupported"`](/reference/data/#outcome).

Beyond the shape, three ceilings are worth knowing about:

| Ceiling | Why it matters |
| --- | --- |
| Value size per key | Generous, but a profile that grows without bound will reach it. Reach for [`Compress`](/reference/compress/) before redesigning. |
| Requests per minute | Scales with concurrent players, and is shared with Open Cloud. `Store` paces its own writes and queues them per key. |
| Throughput per key | A separate budget from the request count, measured in bytes per minute. A large profile saved often can exhaust this while staying well inside the request budget. |

That last one is the trap, because it is invisible until a profile grows. Two
saves of a large profile can cost more than a hundred saves of a small one.

Names for stores, scopes, and keys are short. Building a key out of several
joined values is the usual way to overrun that.

**Versioning.** Every write keeps previous versions for a retention window, which
is what makes an accidental [`Data.Reset`](/reference/data/#datareset)
recoverable. It is a window, not an archive.

Current numbers: [Data store error codes and limits][datastores].

[datastores]: https://create.roblox.com/docs/cloud-services/data-stores/error-codes-and-limits

## MessagingService

Delivery is best effort, not guaranteed. Roblox states this plainly, and it is
the constraint to design around. A message that never arrives must not leave
your game in a broken state.

This is why cross-server player writes go through
[`Data.Edit`](/reference/data/#writing-to-anybody) instead. It routes through
`Store`, which lands the change in the player's saved data whether or not any
server was listening, and never writes over a session it does not own.

- **The message size ceiling is around a kilobyte**, far smaller than a
  DataStore value. This is the limit `Compress.Encode` exists to help with, and
  it is easy to exceed with an ordinary table.
- **Sends, receives, and subscriptions all have their own budgets**, each scaling
  with players or servers.

Use it for announcements, shutdown coordination, and cache invalidation. Do not
use it as a data channel.

Current numbers:
[MessagingService](https://create.roblox.com/docs/reference/engine/classes/MessagingService).

## MemoryStore

Fast, shared across servers, and temporary. Three structures are offered: a
sorted map, a queue, and a hash map.

- **Everything expires.** There is a default lifetime and you can set your own.
  Nothing here is storage; treat it as a cache with a deadline.
- **Memory and requests are both quotas**, both scaling with the number of
  players, and both counted for the whole experience rather than per server.
- **Requests are counted in units, not calls.** Some calls cost more than one:
  reading a range costs per item returned, and an update costs more than a read.
  A loop that looks like one call per tick can be several.
- Values must be JSON-serialisable, so the same shape notes as DataStore apply.

Current numbers:
[Memory stores](https://create.roblox.com/docs/cloud-services/memory-stores).

## Attributes

Attributes hold a fixed set of value types: strings, numbers, booleans, and a
handful of Roblox datatypes such as `Vector3`, `CFrame`, `Color3`, and `UDim2`.

**They cannot hold a table, and they cannot hold an `Instance`.** Names are
restricted to alphanumeric characters with a few separators, and `RBX` is
reserved.

[`Authorization`](/reference/authorization/) uses an attribute for a player's
rank precisely because attributes replicate on their own and cannot be written
by a client. For anything with structure, use
[`Replication`](/reference/replication/) instead.

Current details: [Instance attributes][attributes].

[attributes]: https://create.roblox.com/docs/studio/properties#instance-attributes

## The player list

**It sorts `IntValue` and `NumberValue` only.** Text is displayed but never
sorted.

The direct consequence: a [`BigNumber`](/reference/bignumber/) reads correctly
and ranks nowhere, because no value object can hold it as a number. See
[Count past the number limit](/guides/unbounded-currency/) for the way around
it.

## Web quota

Several APIs spend the server's HTTP budget: `GetUserIdFromNameAsync`,
`GetRolesInGroupAsync`, text filtering, and Marketplace calls.

Twill guards the two paths that are easiest to abuse:

- The [admin console](/reference/admin/) screens **rank and rate before parsing**
  a command line, because Cmdr's own argument validation resolves usernames
  through Roblox.
- [`Authorization`](/reference/authorization/) remembers group answers per player
  and drops them through `Scope.Player`.

[`Filter`](/reference/filter/) adds no limit of its own, so the platform's
per-user limit is the one you meet. Filter when text is submitted, not every
time it is drawn.

## The general rule

Design away from a ceiling, not right up against it. Finding a limit in
production always costs more than leaving headroom did, and the budgets that
scale with players are found exactly when a game is doing well.
