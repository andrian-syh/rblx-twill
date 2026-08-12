---
title: Clean up connections and instances
description: Pick the bag that matches how long something should live, and never write a teardown again.
---

## Use the bag you were handed

A service receives a player bag as the third argument of `OnPlayerReady`. Most
code never needs anything else.

```luau
function CombatService.OnPlayerReady(player, data, trove)
	trove:Connect(player.CharacterAdded, onCharacter)
	trove:Add(buildHudFor(player))
end
```

The bag closes when the player leaves. There is no `OnPlayerRemoving` teardown to
write.

## Pick the right lifetime

```luau
Twill.Scope.Player(player)
Twill.Scope.Character(character)
Twill.Scope.Alive(character)
```

| Bag | Closes | Use it for |
| --- | --- | --- |
| `Player` | The player leaves. | Anything that belongs to the session. |
| `Character` | The character is removed, which Roblox does at **respawn**, not at death. | Ragdoll, corpse effects, anything that should outlive the death. |
| `Alive` | The humanoid dies, or the character is removed without dying. | Movement, abilities, input. Anything that must stop the instant they are dead. |

The distinction between the last two is the one that causes bugs. A sprint loop
in a `Character` bag keeps running on a corpse until the respawn.

## Bags are shared

Asking again for the same scope returns the same bag.

```luau
-- in two unrelated services
Twill.Scope.Player(player):Add(a)
Twill.Scope.Player(player):Add(b)
```

Neither service has to know about the other, and one close cleans up both.

## Loops and watches take a bag

```luau
Twill.Loop.Every(1, tick, trove)
Twill.Loop.After(5, expire, trove)
Twill.Watch.Tagged("Door", onDoor, trove)
```

Leave the last argument out and the work goes to `Scope.Framework()`, which lives
as long as the server does. That is correct for a global system and wrong for
anything tied to a player.

## Anything with `Destroy` fits

```luau
trove:Add(instance)
trove:Add(subscription)
trove:Add(handle)
trove:Add(errors, "Destroy")
trove:Add(function()
	restoreSomething()
end)
```

Every handle Twill returns carries `Destroy`, so a bag holds it like anything
else.

## What `Destroy` does not do

:::danger[Destroying a parent does not disconnect a connection to a service]
```luau
local sandbox = Instance.new("Folder")
sandbox.Connection = Players.PlayerAdded:Connect(onJoin)
sandbox:Destroy()
-- onJoin still fires. Forever.
```

`Players` holds the connection, not the folder. Running that code seven times
leaves seven live connections.
:::

This is the usual way test code leaks, and the usual cause of a Studio session
that grows steadily slower. Put the connection in a bag.

## Global connections

For something that genuinely lives as long as the process:

```luau
Twill.Scope.Framework():Connect(
	MarketplaceService.PromptGamePassPurchaseFinished,
	onPassBought
)
```

Nothing in Twill starts a connection nobody owns, and neither should your code.

## Using Scope on its own

`Scope` does not require the rest of the framework, but player bags normally
close because `Lifecycle` tells them to. Without `Lifecycle`, ask `Scope` to
watch for itself:

```luau
Twill.Scope.OwnPlayerClosing()
```
