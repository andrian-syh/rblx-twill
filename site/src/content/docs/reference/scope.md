---
title: Scope
description: Cleanup bags the framework closes for you.
---

`Twill.Scope` hands out cleanup bags tied to a lifetime. Ask for the bag that
matches how long the thing should live, put whatever you made into it, and never
disconnect anything by hand.

```luau
local Scope = require("@game/ReplicatedStorage/Twill/Scope")

Scope.Player(player):Connect(someSignal, onSomething)
Scope.Character(character):Connect(humanoid.Died, onDeath)
```

Every bag is a [Trove](/reference/bundled-packages/), so `Connect`, `Add`,
`Construct`, `AttachToInstance`, and the rest all work.

## Three lifetimes

They are genuinely different, and picking the wrong one is the usual source of
a system that keeps running after the player it belonged to is gone.

| Bag | Closes |
| --- | --- |
| `Player` | When that player leaves. |
| `Character` | When that character is removed, which Roblox does at respawn, not at death. |
| `Alive` | The instant the humanoid dies, or on removal if the character is taken away without dying. |

Use `Alive` for anything that should stop the moment a player is dead: movement,
abilities, input.

Use `Character` for anything that belongs to the model and should outlive the
death: ragdoll, corpse effects, a body that stays for a few seconds.

## Bags are shared

Asking again for the same scope returns the same bag, so two systems can share
one without knowing about each other.

```luau
-- in two different services, for the same player
Scope.Player(player):Add(thingA)
Scope.Player(player):Add(thingB)
```

Both land in one bag, and one close cleans up both.

## Services get theirs handed to them

Most code never calls this module at all, because
[`OnPlayerReady`](/reference/lifecycle/#the-player-pipeline) receives the player
bag as its third argument.

```luau
function MyService.OnPlayerReady(player, data, trove)
	trove:Connect(workspace.Thing.Touched, onTouched)
end
```

## API

Every member is safe to call more than once. Closing a bag that does not exist
does nothing rather than failing.

### `Scope.Player`

`[Server]` | `[Client]`

Returns the bag that closes when this player leaves, creating it on first ask.

```luau
function Scope.Player(player: Player): Trove
```

**Returns**

`Trove` - That player's bag, shared by every caller.

### `Scope.Character`

`[Server]` | `[Client]`

Returns the bag that closes when this character is removed, which happens at
respawn rather than at the moment of death.

```luau
function Scope.Character(character: Model): Trove
```

**Returns**

`Trove` - That character's bag, shared by every caller.

### `Scope.Alive`

`[Server]` | `[Client]`

Returns the bag that closes the instant this character dies, or on removal if it
is taken away without dying.

```luau
function Scope.Alive(character: Model): Trove
```

**Returns**

`Trove` - That character's alive bag, shared by every caller.

A character that has no `Humanoid` yet is watched until one appears, so this is
safe to call on a model that is still assembling.

**Example**

```luau
local function onCharacterAdded(character: Model)
	local humanoid = character:WaitForChild("Humanoid") :: Humanoid

	-- Stops the moment they die, rather than at respawn.
	Scope.Alive(character):Connect(RunService.Heartbeat, function()
		drainStamina(humanoid)
	end)

	-- Outlives the death, so the ragdoll is still there to watch.
	Scope.Character(character):Connect(humanoid.Died, function()
		playDeathEffect(character)
	end)
end
```

### `Scope.Close`

`[Server]` | `[Client]`

Closes a player's bag now, ahead of them leaving.

```luau
function Scope.Close(player: Player)
```

**Returns**

`()` - Nothing.

### `Scope.CloseCharacter`

`[Server]` | `[Client]`

Closes a character's bag now, ahead of the model going away.

```luau
function Scope.CloseCharacter(character: Model)
```

**Returns**

`()` - Nothing.

### `Scope.CloseAlive`

`[Server]` | `[Client]`

Closes a character's alive bag now, without waiting for a death.

```luau
function Scope.CloseAlive(character: Model)
```

**Returns**

`()` - Nothing.

### `Scope.Framework`

`[Server]` | `[Client]`

Returns the bag that lives as long as the server or client session does.

```luau
function Scope.Framework(): Trove
```

**Returns**

`Trove` - The one framework bag, shared by every module.

Anything in Twill that starts a connection without an owner puts it here,
because nothing in the framework is allowed to start a connection nobody owns.
Use it for your own process-lifetime connections too.

### `Scope.CloseAll`

`[Server]` | `[Client]`

Closes every bag held here, shortest lifetime first, and the framework's own
last.

```luau
function Scope.CloseAll()
```

**Returns**

`()` - Nothing.

:::danger[This is a shutdown, not a reset]
Nothing is reopened afterwards. The framework bag is destroyed along with the
rest, so every Twill module that depends on it stops working. Intended for
teardown at the end of a test run.
:::

### `Scope.OwnPlayerClosing`

`[Server]` | `[Client]`

Hands over the closing of player bags to the caller.

```luau
function Scope.OwnPlayerClosing()
```

**Returns**

`()` - Nothing.

By default `Scope` closes a player's bag itself the moment they leave. Call this
when you need to run your own teardown first, on state the bag is about to take
away. Whoever calls it takes on closing every player bag from then on, through
[`Scope.Close`](#scopeclose).

:::caution[Lifecycle already calls this]
[`Lifecycle.Start`](/reference/lifecycle/#lifecyclestart) claims player closing
on the server so every service sees `OnPlayerRemoving` before the bag closes
under it. You only need this when you are using `Scope` on its own, without the
rest of the framework, and you have teardown of your own to run first.
:::

## A model destroyed without being closed

A bag belonging to a model that is destroyed without anyone closing it takes its
own entry out of `Scope`'s table, so nothing here holds a dead `Instance`.

## What `Destroy` does not do

Destroying a parent instance **does not** disconnect connections made to global
services.

```luau
-- This connection survives the folder being destroyed.
sandbox.Connection = Players.PlayerAdded:Connect(onJoin)
sandbox:Destroy()
```

This is the usual way test code leaks. Put the connection in a bag instead.
