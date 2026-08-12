---
title: Watch
description: A set of instances, followed as it changes.
---

```luau
Watch.Tagged("KillBrick", function(part, trove)
	trove:Connect(part.Touched, onTouched)
end)

Watch.Players(function(player, trove)
	trove:Connect(player.CharacterAdded, onCharacter)
end)
```

Three ways to name a set, one contract behind all of them:

> Connect first, then sweep what is already there, and never call twice.

For the patterns this enables, see
[Bind behaviour to tagged instances](/guides/tagged-instances/).

## Why that order

Sweeping first misses anything that arrives while the sweep runs.

Connecting first without remembering what was seen calls twice for anything that
arrives during it. `PlayerAdded` is a deferred event, which makes that window
wide enough to actually hit rather than theoretical. Twill has shipped that bug
once already.

Doing both, in that order, with a record of what has been handled, is the only
arrangement that is correct in both directions. That is what this module is.

## Per-instance bags

Every instance gets its own [Trove](/reference/scope/), closed the moment it
leaves the set. Nothing bound to an instance has to be unbound by hand.

The binding itself belongs to the bag given as the last argument, or to
`Scope.Framework()` when there is none.

## API

### `Watch.Players`

`[Server]` | `[Client]`

Follows everyone on the server, including whoever was already here.

```luau
function Watch.Players(
	onAdded: (player: Player, trove: Scope.Trove) -> (),
	owner: Scope.Trove?
): Binding
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `onAdded` | `(player: Player, trove: Scope.Trove) -> ()` | Called once per player, with a bag that closes when they leave. |
| `owner` | `Scope.Trove?` | The bag the binding belongs to. The framework's own when left out. |

**Returns**

`Binding` - Ends the following, closing every player's bag.

Throws when no callback is given.

:::tip[Inside a service, prefer the hook]
[`OnPlayerReady`](/reference/lifecycle/#the-player-pipeline) does the same thing
and additionally waits for the player's data to load. Reach for `Watch.Players`
in code that is not a service, or where you deliberately want the player before
their data exists.
:::

### `Watch.Tagged`

`[Server]` | `[Client]`

Follows everything carrying a tag, including what was tagged before this ran.

```luau
function Watch.Tagged(
	tag: string,
	onAdded: (instance: Instance, trove: Scope.Trove) -> (),
	owner: Scope.Trove?
): Binding
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `tag` | `string` | The `CollectionService` tag to follow. Must not be empty. |
| `onAdded` | `(instance: Instance, trove: Scope.Trove) -> ()` | Called once per instance, with a bag that closes when the tag goes. |
| `owner` | `Scope.Trove?` | The bag the binding belongs to. The framework's own when left out. |

**Returns**

`Binding` - Ends the following, closing every member's bag.

Throws when the tag is empty or no callback is given.

This is how behaviour binds to instances without knowing where they live, so
moving or renaming a folder cannot break it. Removing the tag closes that
instance's bag, which makes untagging a complete off switch.

### `Watch.Children`

`[Server]` | `[Client]`

Follows the direct children of one instance, including the ones already there.

```luau
function Watch.Children(
	parent: Instance,
	onAdded: (child: Instance, trove: Scope.Trove) -> (),
	owner: Scope.Trove?
): Binding
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `parent` | `Instance` | Whose children to follow. |
| `onAdded` | `(child: Instance, trove: Scope.Trove) -> ()` | Called once per child, with a bag that closes when it goes. |
| `owner` | `Scope.Trove?` | The bag the binding belongs to. The framework's own when left out. |

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
opened, so one call unwinds everything the watch ever set up.
