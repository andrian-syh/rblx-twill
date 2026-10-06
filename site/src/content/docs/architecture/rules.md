---
title: Rules
description: The twelve rules of Weave 1.0.0, each with its reason and how it is checked
---

Each rule has a fixed number. A rule that is withdrawn keeps its number, and no
other rule takes it.

| Rule | In one line | Checked by |
| :--- | :--- | :--- |
| R1 | One `Script` and one `LocalScript` | The check |
| R2 | Replicated code never names a server container | The check |
| R3 | `Shared` holds no state and requires no feature | The check, in part |
| R4 | Reach a feature through its entry | The check |
| R5 | Entries never require each other | The check |
| R6 | One owner writes each piece of saved state | Review |
| R7 | A remote carries a request, never a result | `Net.Handle`, in part |
| R8 | State reaches a client one way | Review |
| R9 | `Init` touches own state and never yields | Review |
| R10 | A signal reports, a call commands | Review |
| R11 | Everything created at run time has an owner | Review |
| R12 | The layout is safe for every sync tool | The check |

"The check" is the script in [Check a project](/architecture/check-a-project/).

## Structure

### R1: One Script and one LocalScript

A project has one `Script`, `ServerScriptService/Main`, and one `LocalScript`,
`StarterPlayerScripts/Client`. All other code is a `ModuleScript`.

**Why.** The engine does not promise the order in which scripts start. With one
entry point per side, the order is the order that entry point chooses.

**Exceptions.** A script under an `Actor`, a script under a `Tool`, and a script
under `ReplicatedFirst/Loading`.

### R2: Replicated code never names a server container

No script in `ReplicatedStorage` contains the text `ServerScriptService` or
`ServerStorage`, and no secret is stored in a container that replicates.

**Why.** A client can read every script that replicates, including one it never
runs. A drop rate in `ReplicatedStorage` is a published drop rate.

**Do.** Put the secret in `ServerScriptService/Modules/<Feature>`, and send the
client the outcome.

### R3: Shared holds no state and requires no feature

A module in `Shared` returns declarations, definitions, or pure functions. It
does not keep a value that changes, and it does not require anything from
`Client`, `Services`, or `Modules`.

**Why.** Each side loads its own copy of a module. A table changed on the server
is unchanged on every client, so state in `Shared` only looks shared. A kernel
that requires a feature also makes every feature depend on that one.

### R4: Reach a feature through its entry

Code outside a feature uses the feature's entry in `Services` or `Controllers`.
It never requires anything under `Modules/<AnotherFeature>`.

**Why.** The entry is the part of a feature that others may rely on. Everything
under `Modules` can then be renamed, split, or rewritten without a search
through the rest of the project.

```luau
-- In ShopService. Breaks R4: Modules/Coin belongs to another feature.
local Ledger = require(ServerScriptService.Modules.Coin.Ledger)

-- Follows R4: the entry is the way in.
CoinService = Twill.Lifecycle.Get("CoinService")
```

### R5: Entries never require each other

An entry does not require another entry while it loads. It fetches the other
entry in `Start`.

**Why.** Two modules that require each other while loading fail to load. Fetched
in `Start`, after every module has loaded and every `Init` has run, two entries
can use each other.

`Lifecycle.Get` takes a name, so the result has no type. Declare the variable
with the type of the module it will hold:

```luau
local CoinService: typeof(require(script.Parent.CoinService))

function ShopService.Start()
	CoinService = Twill.Lifecycle.Get("CoinService")
end
```

`typeof` reads the type without running the `require`, so the annotation loads
nothing.

## State

### R6: One owner writes each piece of saved state

Each saved field is written by one entry. Any other code that needs the field
changed calls a function on the owner. `Modules/PlayerData` names the owner of
every field.

**Why.** The rules for a field, such as "coins never go below zero", then live
in the owner's functions and nowhere else.

```luau
-- In ShopService. Breaks R6: Coins belongs to CoinService.
data.Coins -= price

-- Follows R6.
if not CoinService.Spend(player, price) then
	return false, "not enough coins"
end
```

A change that spans two owners, such as spending coins and granting an item,
must not yield between its parts. Where a part can fail after another has
succeeded, wrap both in [`Data.Transact`](/reference/data/).

### R7: A remote carries a request, never a result

A remote names what the player wants. The handler checks the shape and range of
every argument, whether the player may do it, and how often, before it acts.

**Why.** A client can send any argument at any rate, with or without your
controller.

| Check | Where |
| :--- | :--- |
| Type | The declaration, with the narrowest `Net.Types` |
| Rate | `Rate` on `Net.Handle` |
| Range and length | `Schema` on `Net.Handle` |
| Ownership and game state | `Validate`, or the first lines of the handler |

`Net.Handle` applies a rate to every remote and refuses a remote that replies
without a `Reject`. The choice of numbers and the ownership check are yours.

**Do.** Declare `BuyItem(itemId)`. **Do not** declare `SetCoins(amount)`.

### R8: State reaches a client one way

A value a client shows arrives through
[`Replication`](/reference/replication/), from the server. The server never
calls a client and waits for the answer.

**Why.** A value sent by replication is diffed, batched, and cannot be requested.
A server that waits on a client waits for as long as that client chooses.

## Behaviour

### R9: Init touches own state and never yields

`Init` sets up the module's own tables. Connections, loops, remotes, and calls
to another entry belong in `Start`.

**Why.** `Init` runs for every entry in sequence. A yield in one holds up every
entry after it, and a call to another entry reaches a module that is not set up.

### R10: A signal reports, a call commands

A signal says that something happened: `RoundEnded`, `ItemSold`. Code that needs
another feature to do something calls a function on its entry.

**Why.** A call is found by reading the caller. A listener is found only by
searching for everything that connected, so a command sent as a signal hides who
carries it out.

### R11: Everything created at run time has an owner

Every connection, loop, and instance made while the game runs is put in a bag
that closes at the right time.

| Lifetime | Bag |
| :--- | :--- |
| A player's session | The third argument of `OnPlayerReady` |
| A character | `Scope.Character` or `Scope.Alive` |
| A tagged instance | The second argument of the `Watch.Tagged` callback |
| The whole server or client | `Scope.Framework()` |

**Why.** A connection that nothing owns outlives the thing it served, and keeps
that thing in memory.

## Layout

### R12: The layout is safe for every sync tool

- A script has no children.
- No script is named `init`.
- A name uses letters, digits, and `_`.
- No two siblings differ by letter case alone.
- A script carries no tags and no attributes.
- A script sits in a `Folder`, or directly in a service.
- A boot folder holds `ModuleScript` instances only.

**Why.** Sync tools write a script with children, a tagged script, and an
unusual name to disk in different ways, and some cannot write them. A
`ModuleScript` in a `Folder` is written the same way by all of them.

The two `Twill` modules have children. They are installed from a release and
never edited, so they stay outside what you sync.
