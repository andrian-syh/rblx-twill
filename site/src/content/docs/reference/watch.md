---
title: Watch
description: A set of instances, followed as it changes
---

```luau
local Watch = require("@game/ReplicatedStorage/Twill").Watch

Watch.Tagged("KillBrick", function(part, bag)
	bag:Connect(part.Touched, onTouched)
end)
```

Three ways to name a set, one contract behind all of them: connect first, sweep
what is already there second, and never call twice.

For the patterns this enables, see
[Bind behaviour to tagged instances](/guides/tagged-instances/).

## Why that order

Sweeping first misses anything that arrives while the sweep runs.

Connecting first without a record of what was seen calls twice for anything that
arrives during the sweep. `PlayerAdded` is deferred, which makes that window
wide enough to hit rather than theoretical. Twill shipped that bug once already.

Connecting first, sweeping second, and keeping a record of what has been handled
is the one arrangement correct in both directions.

## Per-instance bags

Every member gets its own [bag](/reference/bag/), closed the moment it leaves
the set. Nothing bound to a member is unbound by hand.

The binding itself belongs to the bag given as the last argument, or to
`Scope.Framework()` when there is none. Destroying the binding closes every
member's bag with it.

An instance already in the set when the watch starts is announced through the
same path as one arriving later, so the callback sees no difference between
them.

## API

### `Watch.Players`

`[Server]` | `[Client]`

Follows everyone on the server, including whoever was already here.

```luau
function Watch.Players(
	onAdded: (player: Player, bag: Scope.Bag) -> (),
	owner: Scope.Bag?
): Binding
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `onAdded` | `(player: Player, bag: Scope.Bag) -> ()` | Called once per player, with a bag that closes when they leave. |
| `owner` | `Scope.Bag?` | The bag the binding belongs to. The framework's own when left out. |

**Returns**

`Binding` - Ends the following, closing every player's bag.

Throws when no callback is given.

Inside a service, [`OnPlayerReady`](/reference/lifecycle/#the-player-pipeline)
does the same and additionally waits for the player's data. Reach for
`Watch.Players` in code that is not a service, or where the player is wanted
before their data exists.

### `Watch.Tagged`

`[Server]` | `[Client]`

Follows everything carrying a tag, including what was tagged before this ran.

```luau
function Watch.Tagged(
	tag: string,
	onAdded: (instance: Instance, bag: Scope.Bag) -> (),
	owner: Scope.Bag?
): Binding
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `tag` | `string` | The `CollectionService` tag to follow. Not empty. |
| `onAdded` | `(instance: Instance, bag: Scope.Bag) -> ()` | Called once per instance, with a bag that closes when the tag goes. |
| `owner` | `Scope.Bag?` | The bag the binding belongs to. The framework's own when left out. |

**Returns**

`Binding` - Ends the following, closing every member's bag.

Throws when the tag is empty or no callback is given.

This binds behaviour to instances without naming where they live, so moving or
renaming a folder cannot break it. Removing the tag closes that instance's bag,
which makes untagging a complete off switch.

### `Watch.Children`

`[Server]` | `[Client]`

Follows the direct children of one instance, including those already there.

```luau
function Watch.Children(
	parent: Instance,
	onAdded: (child: Instance, bag: Scope.Bag) -> (),
	owner: Scope.Bag?
): Binding
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `parent` | `Instance` | Whose children to follow. |
| `onAdded` | `(child: Instance, bag: Scope.Bag) -> ()` | Called once per child, with a bag that closes when it goes. |
| `owner` | `Scope.Bag?` | The bag the binding belongs to. The framework's own when left out. |

**Returns**

`Binding` - Ends the following, closing every child's bag.

Throws when the parent is not an `Instance` or no callback is given.

Only direct children count, never descendants. A child reparented away counts as
having left.

### `Binding`

```luau
export type Binding = {
	Destroy: (self: Binding) -> (),
}
```

Destroying the binding stops the watch and closes every per-instance bag it
opened, so one call unwinds everything the watch set up.
