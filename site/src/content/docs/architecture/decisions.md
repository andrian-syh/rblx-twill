---
title: Decisions
description: Why Weave has the shape it has, what was turned down, and what the evidence does and does not show
---

Weave is the set of practices that Roblox, three other engines, and the
software architecture literature agree on, reduced to what holds on Roblox
without a build step. This page records each decision with its reason and its
cost, so a team that departs from one knows what it gives up.

## What the sources agree on

No engine prescribes one folder structure. They agree on five practices, and
each Weave rule comes from one of them.

| Practice | Stated by | Weave rule |
| :--- | :--- | :--- |
| One entry point per side | Roblox Creator Docs | R1 |
| The server holds the rules; clients receive replicated state | Unreal's Gameplay Framework, Roblox security guidance | R2, R7, R8 |
| A feature registers with the core; the core does not name features | Unreal's Game Features, Bevy's plugins | R4, the boot folders |
| Dependencies point one way and form no cycle | Parnas, Martin, Godot's scene guidance | R3, R4, R5 |
| Content is data, kept apart from behaviour | Godot's resources, Nystrom's Type Object | Catalogues, tags, attributes |

## What the evidence shows

One rule rests on measurement. Studies of large Java, C#, and C++ systems found
that modules in a dependency cycle hold most of the defects, and that a cycle is
rarely removed once it exists. That supports R5.

The other rules rest on the argument of the people who proposed them and on
their use in shipped engines. No study measures feature folders against layer
folders, a single writer against many, or any of this on a Roblox game. Treat
the rules as engineering judgement that many independent sources share.

## Decisions

### Flat boot folders, private code beside them

An entry is one `ModuleScript` in `Services` or `Controllers`. Its private code
is in `Modules/<Feature>`.

The alternative was one folder per feature, holding the entry and its private
code together. `Lifecycle` boots every module in the folder it is given and does
not search a nested folder, so a feature folder would need a second way to
discover entries. The flat form needs none, and the boot folder reads as the
list of features.

**Cost.** A feature's entry and its private code are in two folders.

### One feature, several containers

A feature is not one folder, because a container decides who can read its
contents. Server code beside client code would be published to every player.
One shared name per feature stands in for the folder.

### Entries reached by name

An entry fetches another with `Lifecycle.Get("CoinService")` in `Start`.

A `require` of a sibling at load is the direct alternative, and it forms a cycle
as soon as two entries need each other. A name loses the type, which is the
objection the author of Knit gave when archiving that framework. Weave keeps the
name for the one case that needs it, between entries, and restores the type with
an annotation.

**Cost.** One annotation per entry used, written by hand.

### A local script as the client entry point

Creator Docs suggest a `Script` with its run context set to client, placed in
`ReplicatedStorage`. Weave keeps a `LocalScript` in `StarterPlayerScripts`. The
file is a few lines long, and sync tools disagree on the file suffix for the
other form.

### One remote file per feature

`Shared/Remotes` is a folder with one module per feature. One file for all
remotes would list the whole attack surface in one place, and every feature
would edit it. `Net.List()` gives the full list at run time.

### A check in the command bar

The check is a script pasted into the command bar. A game script cannot read
the source of another script, so a check that runs at boot could test placement
and nothing else. The command bar needs no install and works in Studio alone.

### The rules in a module in the place

`README` is a `ModuleScript` in `ServerScriptService`. A team that works in
Studio alone has no repository to hold a file, and a module in the place is
open in the editor people already use. It is on the server so it does not
replicate.

## Turned down

| Alternative | Reason |
| :--- | :--- |
| Folders by technical layer: `Utils`, `Handlers`, `Managers` | One change to one feature touches every folder. |
| Full ports and adapters in every feature | Its own authors call full boundaries expensive. In Luau it becomes functions that pass a call along. |
| A dependency injection container | The wiring is hidden, and a dynamic language gives no compile-time help to find a mistake in it. |
| A global event bus | It is a global, it hides who acts on an event, and it can hide a cycle. |
| One store for all state | Every feature depends on it, and it depends on every feature's shape. |
| An ECS as the base model | It pays off with very many similar objects, and costs in debugging. Weave allows one inside a feature. |
| Scripts on parts, models, and interfaces | Start order is not promised, and sync tools handle them unevenly. |
| A feature as a script with child scripts | Sync tools write that shape to disk in different ways. |
| Require aliases | They need configuration that Studio alone does not read. |
| Remotes generated from a service table | Generated remotes carry no validation. |
| A schema compiler as a requirement | It adds a build step, and Weave must work with none. |

## What Weave does not cover

Interface architecture, the model inside a feature, matchmaking, testing
strategy, and asset naming. Each depends on the game.

## Sources

- [Creator Docs: script locations](https://create.roblox.com/docs/scripting/locations)
- [Creator Docs: security tactics](https://create.roblox.com/docs/scripting/security/security-tactics)
- [Epic: Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine)
- [Epic: Game Features and Modular Gameplay](https://dev.epicgames.com/documentation/en-us/unreal-engine/game-features-and-modular-gameplay-in-unreal-engine)
- [Godot: scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html)
- [Godot: autoloads versus regular nodes](https://docs.godotengine.org/en/stable/tutorials/best_practices/autoloads_versus_regular_nodes.html)
- [Bevy: plugins](https://bevy.org/learn/quick-start/getting-started/plugins/)
- [Unity: organizing your project](https://unity.com/how-to/organizing-your-project)
- [Nystrom, Game Programming Patterns: Singleton](https://gameprogrammingpatterns.com/singleton.html)
- [Nystrom, Game Programming Patterns: Service Locator](https://gameprogrammingpatterns.com/service-locator.html)
- [Nystrom, Game Programming Patterns: Type Object](https://gameprogrammingpatterns.com/type-object.html)
- Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules",
  Communications of the ACM, 1972
- [Martin: Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
- [Martin: The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Fowler: Yagni](https://martinfowler.com/bliki/Yagni.html)
- [Fowler: What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html)
- [Oyetoyan, Cruzes, and Conradi: cyclic dependencies and defects](https://www.sintef.no/en/publications/publication/1065078/)
- [Zimmermann and Nagappan: Predicting Defects using Network Analysis on Dependency Graphs](https://www.microsoft.com/en-us/research/publication/predicting-defects-using-network-analysis-on-dependency-graphs/)
- [Knit: ARCHIVAL.md](https://github.com/Sleitnick/Knit/blob/main/ARCHIVAL.md)
- [Software Engineering at Google, chapter 8: Style Guides and Rules](https://abseil.io/resources/swe-book/html/ch08.html)
