---
title: Architecture
description: How the two halves fit together, what happens during boot, and how a value reaches a client.
---

## Two folders

```text
ReplicatedStorage
└── Twill                 the root table, and every module a client may see
    └── Packages          bundled dependencies, shared

ServerScriptService
└── TwillServer           server-only modules, and the server halves
    └── Packages          bundled dependencies, server-only
```

Which module sits where is listed in the
[module reference](/reference/), and the split follows one rule: a module lives
in `TwillServer` when what it holds would tell a client how to get around it.

`TwillServer` is never replicated. What lives there is not only secrets:
thresholds, the metering algorithm, each player's current allowance, and every
line that touches player data.

## The root table

`ReplicatedStorage.Twill` returns a table carrying `Version` and a metatable.
Indexing it for anything else resolves the module by name, checking the shared
folder first and the server folder second, then writes the result back into the
table so every later lookup is an ordinary field read.

```luau
local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Log      -- ReplicatedStorage.Twill.Log
Twill.Data     -- ServerScriptService.TwillServer.Data
```

Resolution is lazy, so a game that touches four modules loads four modules.

The lookup is symmetric: both halves are searched, and both halves' `Packages`
folders are searched. A client asking for a server module gets a message naming
it rather than a `nil` index somewhere later.

**The metamethod cannot yield.** That is why [`Admin`](/reference/admin/), which
must wait for Cmdr's client half to replicate, has to be required by path on the
client. It is the only module with that constraint.

## Modules with two halves

`Net`, `Replication`, `Authorization`, and `Admin` each have a server module of
the same name. The shared half holds what both sides need. The server half holds
what only the server may know.

| Module | Shared | Server only |
| --- | --- | --- |
| `Net` | Declaration, the wire format, and the transport | Metering, screening, serving |
| `Replication` | The client view | The publisher and its per-player copies |
| `Authorization` | Reading a rank | Deciding one, group lookups |
| `Admin` | The console client | The command gate and registry |

The split is not symmetry for its own sake. In each case the server part is
something a client that could read it would be able to work around.

`ServerHalf` is the lookup that finds the other side, written once. On a client
it finds nothing, which is what makes a server-only module unreachable there
rather than merely undocumented.

## Boot

`Lifecycle.Start` runs on each side independently, with its own list.

1. **Discover.** Every `ModuleScript` that is a direct child of a given folder is
   required. Nested folders are not searched, so a helper next to a service is
   not booted as one. A folder found there is warned about, since nesting looks
   like organisation and behaves like exclusion.
2. **Sort.** By `Priority` ascending, ties broken by name, so the order is stable
   across runs rather than dependent on enumeration order.
3. **Init.** Sequentially, for every service. Own state only.
4. **Start.** After every `Init` has finished. Connect, listen, call other
   services. Each one runs on its own thread, so a service that yields does not
   hold up the rest.

Two phases exist so that no service has to guess whether another is ready.

Boot order decides when a `Start` **begins**, never the order in which they
finish. That is the price of not letting one slow service stall the boot, and it
is why a `Start` should ask for what it needs rather than assume another has
already finished.

### When boot fails

A service marked `Critical` that throws in either phase puts that side into a
failed state. On the server, everyone present is kicked and everyone arriving
afterwards is kicked on sight; on the client there is nobody to kick, so the
boot simply stops.

Only the first failure is recorded, so a cascade reports the cause rather than
whatever fell over last. A failure in `Start` still refuses everybody, but it
does so when the failure happens rather than before anyone was let in.

A service that is not `Critical` is logged, and the boot carries on without it.

## The player pipeline

```text
PlayerAdded
   ↓
gate(player, release)          Data.Gate loads the profile
   ↓
release(data)                  only the first call counts
   ↓
OnPlayerReady(player, data, bag)   every service, in boot order
```

The gate is what makes `OnPlayerReady` worth having. Without it, every service
would begin with the same check for whether the data had arrived.

The `bag` is a [`Scope.Player`](/reference/scope/) bag, already open, closed
when the player leaves. A gate that throws costs that player their session: they
are asked to rejoin rather than let in without whatever it was fetching.

Leaving runs the same list backwards:

```text
PlayerRemoving
   ↓
OnPlayerRemoving(player)       every service, in reverse boot order
   ↓
the player's bag closes
```

Reverse order means a service still sees the ones it was allowed to depend on,
and the bag closes only once every service has had its say. That is why
`Lifecycle` takes over player-bag closing from `Scope` on the server. A player
who left while still held at the gate never reached ready, and is never announced
as leaving.

The client runs the same `Lifecycle` but not this pipeline, because there
`PlayerAdded` means somebody else joined. A module booted there is a
[controller](/core-guides/controllers/) rather than a service. `Lifecycle` draws
no distinction between them; the two words exist so it is always clear which side
a module runs on.

## How a value reaches a client

```text
Data.Get(player).Coins += 100
   ↓  (Replicate names the field)
Data rebuilds the player's view on an interval
   ↓
Replication.SetFor(player, "Data", view)
   ↓
diff against the private copy of what this player last received
   ↓  (nothing moved? nothing is sent)
one batched message on the flush interval
   ↓
client applies the patch
   ↓
Subscribe("Data.Coins", ...) fires
```

Three things are worth noticing.

**The diff is against a private copy**, not against the live table. That copy is
the memory price of small messages, and it is per player per key.

**Rebuilding the view is not the same as sending.** `Data`'s view is republished
every interval, so `Replication.OnChanged("Data")` fires on that interval, but a
message only leaves the server when the diff is non-empty.

**A client cannot pull.** There is no request path. Everything a client holds was
pushed, and the client's only outbound message is the one that says it is
listening.

## How a write reaches a player who is elsewhere

`Data.Edit` and `Data.Reset` take a user id rather than a `Player`, and choose one
of three routes:

```text
Data.Edit(userId, scope, path, value)
   ↓
is the session open on this server?
   ├── yes ──→ write to the live profile, save          "applied"
   └── no  ──→ post a message through ProfileStore      "queued"
                  ↓
               whichever server holds the session applies it,
               or it waits in stored data until they next log in
```

Nothing ever writes over a session it does not own, which is the property that
makes this safe to call from an admin command without knowing where the player
is. The cost is honesty about timing: `"queued"` means it will land, not that it
has, and for a user who never returns it never lands at all.

## Keys and paths

One convention runs through `Replication`, `Data.Edit`, and `Leaderstats`:

```text
"Data.Stats.Coins"
 ^key ^path
```

The first dot separates them, which is why **a key name cannot contain a dot**.
A key called `"Player.Data"` can never match a subscription, because the
subscription reads it as key `Player`.

`Delta` is the module both sides of `Replication` share for this: splitting an
address, resolving a path, building a patch, and applying one. `Data` uses it
too, which is why a path means the same thing in an edit as it does in a
subscription.

## Cleanup

`Scope` holds three tables, keyed by player, character, and character-while-alive.

Everything in Twill that creates a connection puts it in one of them, or in
`Scope.Framework()` when it belongs to the process. A bag whose instance is
destroyed without being closed removes its own entry, so `Scope` never holds a
dead `Instance`.

## What is bundled and why

| Package | Owns |
| --- | --- |
| ProfileStore | Sessions, saving, cross-server messaging |
| Cmdr | The console, behind `Admin` |
| AptInt | Arbitrary precision, behind `BigNumber` |
| BytePress | Binary compression, behind `Compress` |
| Cryptography | Hashing and CSPRNG, behind `Random` and `Token` |

Every one of these is reached through a Twill module rather than directly, and in
several cases the wrapper is load-bearing. See
[Bundled packages](/reference/bundled-packages/).
