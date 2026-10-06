---
title: Weave
description: The project architecture for games on Twill, and for games on anything else
---

Weave is a layout for the code of a Roblox experience. It fixes where code goes
and which code may depend on which. It leaves the genre, the gameplay, and the
choice of libraries to you. This page describes Weave 1.0.0.

Weave is the architecture Twill recommends. Neither needs the other: Twill runs
in any layout, and Weave works on another foundation. See
[Use Weave without Twill](/architecture/without-twill/).

## What it decides

| Weave decides | Weave leaves to you |
| :--- | :--- |
| One entry point per side | What the game is |
| Which container holds which code | Which libraries it uses |
| Which code may require which | How a feature works inside |
| Who may write each piece of saved state | How the interface is drawn |
| What a remote may carry | Whether you sync files to disk |

The decisions are written as twelve numbered [rules](/architecture/rules/). A
rule keeps its number for as long as Weave exists, so a review can say
"this breaks R4" and mean one thing.

## The three properties it protects

**The server decides.** A client can read every script that replicates, and can
send any argument at any rate. Weave puts every decision and every secret where
a client cannot reach it, and lets a remote carry a request and nothing else.

**One owner per piece of state.** Each saved field is written by one module.
Every other module calls that owner. A rule about the field then lives in one
function, and a change that breaks the rule has one place to be.

**A feature is added as files.** A feature registers itself by existing in a
folder that boots. Adding one edits no file that belongs to another feature, so
two people working on two features do not meet in the same file.

## Five layers

Code depends downward only. Nothing in a layer requires a layer above it.

```text
L4  Composition roots   Main, Client              start everything
L3  Features            Services, Controllers,    the game
                        Modules
L2  Shared kernel       Shared                    declarations, pure functions
L1  Foundation          Twill, Packages           infrastructure
L0  Platform            The engine
```

| Layer | Holds | May depend on |
| :--- | :--- | :--- |
| L0 Platform | Engine services and classes | Nothing |
| L1 Foundation | `Twill` or another framework, and third-party packages | L0 |
| L2 Shared kernel | `ReplicatedStorage/Shared` | L0, L1 |
| L3 Features | Entries in `Services` and `Controllers`, and their private code in `Modules` | L0 to L2, and the entry of another feature on the same side |
| L4 Composition roots | The `Main` script and the `Client` local script | Everything |

The world, the interfaces, and the assets are data. Code finds them through tags
and attributes, never through a path written into a script.

## A feature spans containers

In most engines a feature is one folder. On Roblox it cannot be, because the
container decides who can read the code. Server code in a replicated container
is published to every player, so a feature's server part and client part live
apart.

Weave gives the parts of one feature the same name in every container:

| Part | Location | Required |
| :--- | :--- | :--- |
| Server entry | `ServerScriptService/Services/ShopService` | Yes |
| Server private code | `ServerScriptService/Modules/Shop` | When the entry needs it |
| Client entry | `ReplicatedStorage/Client/Controllers/ShopController` | When the feature has a client part |
| Client private code | `ReplicatedStorage/Client/Modules/Shop` | When the entry needs it |
| Remote declarations | `ReplicatedStorage/Shared/Remotes/Shop` | When a client asks for something |
| Public definitions | `ReplicatedStorage/Shared/ShopCatalog` | When the feature has content |

Search the Explorer for `Shop` and the whole feature is listed. The full tree is
in the [folder map](/architecture/folder-map/).

## What crosses the network

| Direction | Channel | Carries |
| :--- | :--- | :--- |
| Client to server | A remote declared in `Shared/Remotes` | What the player wants: "buy Sword" |
| Server to one client | Replicated state | The saved fields that player may see |
| Server to every client | Replicated state, or a one-way event | Shared state and cosmetic effects |

A client never sends a result, and the server never waits for a client to
answer. The remote declarations are the list of everything a client can say to
the server, which makes them the place to review the attack surface.

## What it costs

Weave trades four things for the properties above.

- One feature is spread over as many as six locations. The shared name makes
  them findable, and the cost of opening several folders remains.
- An entry reaches another entry by name, through `Lifecycle.Get`. A name is not
  a type, so each use carries a type annotation written by hand. See
  [R5](/architecture/rules/#r5-entries-never-require-each-other).
- The boot folders are flat. A project with sixty features has sixty entries in
  one folder, sorted by name.
- The [check](/architecture/check-a-project/) reads script text, so it finds the
  violations that have a recognisable shape and misses the rest. Review covers
  what the check cannot.

## Team size

The rules do not change with the size of the team. What a team adds on top does.
One person needs the map and the rules. A team that shares a place gains from
running the check before each commit, and from naming one owner per feature.
These are suggestions, and no measurement sets the thresholds.

## Sync tools

The layout is designed to work with Rojo, Argon, Azul, Script Sync, and Studio
with no tool. Every script you edit is a `ModuleScript` inside a `Folder`, with
no script as its child, which is the one shape all of them write to disk the
same way. See [Use Weave with a sync tool](/architecture/sync-tools/).

## Set up a project

Weave has no file to download. You create the folders, which keeps the place
free of anything you did not put there.

1. [Install Twill](/getting-started/installation/).
2. Follow the [quick start](/getting-started/quick-start/). It creates `Main`,
   `Services`, `Client/Controllers`, and the `Client` local script.
3. Add the remaining folders from the [folder map](/architecture/folder-map/):
   `Shared`, `Shared/Remotes`, `Client/Modules`, `ServerScriptService/Modules`,
   and the two `Assets` folders.
4. Add the [project README](/architecture/project-readme/).
5. Run the [check](/architecture/check-a-project/). It reports no findings.

Then read [Add a feature](/architecture/add-a-feature/).
