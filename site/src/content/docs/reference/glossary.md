---
title: Glossary
description: Terms that carry a specific meaning inside Twill.
---

Words on this page mean something particular inside Twill, which is not always
what they mean elsewhere in Roblox development. Anything not listed here means
what it usually does.

## Structure and boot

| Term | What it means |
| :--- | :--- |
| **Service** | A server-side `ModuleScript` returning a table, discovered by [`Lifecycle`](/reference/lifecycle/). Every field is optional, so a module with none of them is still a legal service. See [Write a service](/core-guides/services/). |
| **Controller** | The client-side counterpart of a service, booted by the same `Lifecycle`. Identical in shape, named separately so it is always clear which side a module runs on. `Lifecycle` itself draws no distinction and types both as `Service`. See [Write a controller](/core-guides/controllers/). |
| **Server half** | `ServerScriptService.TwillServer`. Never replicated. It holds more than secrets: thresholds, the metering algorithm, each player's current allowance, and all data handling. |
| **Root table** | `ReplicatedStorage.Twill`, which resolves modules by name on first use. Naming a server-only module from a client fails there rather than handing back `nil`. |
| **Init** | The first boot phase. Runs sequentially for every service. Your own state only, because another service may not be set up yet. |
| **Start** | The second boot phase, after every `Init` has finished. Connect, listen, and call other services freely. Each `Start` runs on its own thread, so boot order decides when one **begins**, never the order in which they finish. |
| **Priority** | A number on a service deciding boot order. Lower boots first, and ties break by name so the order is stable across runs. |
| **Critical** | A flag on a service whose failed boot locks the server and refuses every player, rather than serving a game that is quietly missing a system. |
| **Player pipeline** | The path a joining player takes: the gate holds them, then every service is announced through `OnPlayerReady` in boot order. Server-side only, because on a client `PlayerAdded` means somebody else joined. |
| **Gate** | A function that holds a joining player until something finishes, normally until their data is loaded. Installed with `Lifecycle.SetPlayerGate`. |

## Cleanup and lifetimes

| Term | What it means |
| :--- | :--- |
| **Bag** | The everyday word for a Trove handed out by [`Scope`](/reference/scope/). You put what you made into it, and the framework closes it. |
| **Trove** | The cleanup object from Sleitnick's package. It holds connections, instances, and functions, and releases all of them when destroyed. |
| **Player bag** | Closes when that player leaves. Handed to every service as the third argument of `OnPlayerReady`, which is why most code never calls `Scope` directly. |
| **Character bag** | Closes when the character model is removed, which Roblox does at **respawn**, not at the moment of death. For anything that should outlive dying, such as a ragdoll. |
| **Alive bag** | Closes the instant the humanoid dies, or on removal if the character is taken away without dying. For anything that should stop while a player is dead: movement, abilities, input. |
| **Framework bag** | `Scope.Framework()`, which lives as long as the session. Anything in Twill that starts a connection without an owner puts it here, because nothing in the framework is allowed to start a connection nobody owns. |

## Player data

| Term | What it means |
| :--- | :--- |
| **Template** | The shape a new profile starts as. Fields missing from an existing profile are filled in from it on load, so adding a field later needs nothing else. |
| **Migration** | A function keyed by the version it **produces**, so `[2]` upgrades a version 1 profile. They run in ascending order and only on profiles that already hold data. |
| **Branch** | A separate store for player data that does not need loading on every join, with its own template, version, and migrations. See [`Data`](/reference/data/#branches). |
| **Scope** (data) | The name of one store belonging to a user: `"main"` for the primary profile, or a branch name. Used by `Data.Edit`, `Data.Reset`, and the admin console. |
| **Session** | ProfileStore's hold on a profile. One server at a time, which is what stops two servers writing over each other. Losing it mid-play costs the player their place on that server rather than their progress. |
| **Outcome** | The typed value returned by `Data.Edit` and `Data.Reset`, naming what actually happened instead of a boolean that hides the reason. |
| **Storable shape** | Data a DataStore can hold and return unchanged. The traps are silent: a table mixing named and numbered keys, and gaps in a numbering, both come back wrong with no error. `Serialize.FindUnstorable` names them. |

:::caution[Two different things are called a scope]
A **data scope** names a store, such as `"main"`. A `Log` **scope** is the label
on a logger, such as `[Shop]`. And `Twill.Scope` is the cleanup module, which
deals in bags and neither of the other two. They never appear in the same
argument, but the word is genuinely overloaded.
:::

## Networking and replication

| Term | What it means |
| :--- | :--- |
| **Wire id** | The numeric identifier the server assigns to a packet. A client-declared packet receives it a moment later, which is why `Fire` must not be called while a module is still loading. |
| **Signature** | The rendering of a packet's argument and reply types. Declaring one name with two different signatures is refused, because the alternative is one caller serialising through another's types. |
| **Reject** | What a refused caller is told. Required on a packet that replies, since a refusal without one leaves the caller waiting forever. |
| **Token bucket** | A meter that refills at its rate and never holds more than its burst. **A rate below one is how you spell a cooldown.** |
| **Throttle** (Limit) | A function that answers **how many were held back** since it last spoke, and `nil` in between. It exists so that logging does not amplify the flood it is refusing. |
| **Key** (replication) | The top-level name a value is published under. **It cannot contain a dot**, because the first dot separates the key from the path inside it. |
| **Path** | Everything after the first dot in a replication address or a `Data.Edit` call. In `"Data.Stats.Coins"`, `Data` is the key and `Stats.Coins` is the path. |
| **Patch** | The difference between what a client was last sent and what it should hold now. Only what moved travels, so changing one field deep inside a large table sends that field rather than the table. |
| **Replicated field** | A field named in `Data.Replicate`, which reaches its owner's client under the `Data` key and follows direct mutation. Only the named fields travel, and only to their owner. |

## Permissions, draws, and tokens

| Term | What it means |
| :--- | :--- |
| **Rank** | A number you name yourself. Higher means more authority. It reaches the client as a player attribute, read-only there, so hiding a button by rank is safe while trusting a client's claim about one is not. |
| **Fail closed** | Answering with a refusal when a check cannot be completed, rather than with the unchecked value. [`Filter`](/reference/filter/) returns `nil` when the Roblox filter is unreachable, never the text that went in. |
| **Commitment** | A digest published **before** a draw is made, proving the outcome was fixed in advance. See [`Random`](/reference/random/#rounds). |
| **Round** | The object returned by `Random.Commit()`. It carries a commitment, draws from a reproducible stream, and can reveal its seed for auditing. |
| **Audience** | A string signed into a token and checked when it is read, so a token minted for one purpose is refused by every other. |
