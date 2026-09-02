---
title: Scope
description: Cleanup bags the framework closes for you, keyed by how long a thing should live
---

```luau
local Scope = require("@game/ReplicatedStorage/Twill").Scope

Scope.Player(player):Connect(someSignal, onSomething)
Scope.Alive(character):Connect(humanoid.Died, onDeath)
```

Ask for the bag matching how long a thing should live, put what was made into
it, and disconnect nothing by hand. Every bag is a [`Bag`](/reference/bag/), so
`Connect`, `Add`, `Extend` and the rest work on it.

## The four lifetimes

| Scope | Closes when |
| :--- | :--- |
| `Player` | That player leaves. |
| `Character` | The character is removed, which is at respawn rather than at death. |
| `Alive` | The humanoid dies, or the character is removed. |
| `Framework` | The server stops. Holds Twill's own connections. |

`Character` and `Alive` differ by one death. A healthbar belongs in `Character`,
because it should survive the death that fills it in. A sprint loop belongs in
`Alive`, because it should stop the moment the humanoid does.

Asking twice for the same scope returns the same bag. Two systems share one
without knowing about each other.

## Bags that clean up after themselves

A character bag attaches itself to the character. An instance destroyed without
the bag being closed takes the bag with it, and the bag removes its own entry, so
nothing here holds a dead `Instance`.

A character created outside `game` is not attached, since there is nothing to
watch. Closing it is then the caller's job.

## Taking over player closing

By default a player's bag closes on `PlayerRemoving`. A system that must unwind
first, such as saving data, calls `OwnPlayerClosing` and then closes the bag
itself when it is done.

```luau
Scope.OwnPlayerClosing()

Players.PlayerRemoving:Connect(function(player)
	saveEverything(player)
	Scope.Close(player)
end)
```

This is a one way switch, and it applies to every player from that point on.
[`Lifecycle`](/reference/lifecycle/) calls it when a player gate is set.

## API

### `Scope.Player`

`[Server]` | `[Client]`

Returns the bag that closes when this player leaves.

```luau
function Scope.Player(player: Player): Bag
```

Created on the first ask. Throws when given anything but a `Player`.

### `Scope.Character`

`[Server]` | `[Client]`

Returns the bag that closes when this character is removed.

```luau
function Scope.Character(character: Model): Bag
```

Attaches itself to the character when the character is in `game`. Throws when
given anything but a `Model`.

### `Scope.Alive`

`[Server]` | `[Client]`

Returns the bag that closes the instant this character dies.

```luau
function Scope.Alive(character: Model): Bag
```

Waits for the humanoid when the character has none yet. Also closes when the
character bag closes, so a character removed without dying does not leave this
one open.

Throws when given anything but a `Model`.

### `Scope.Framework`

`[Server]` | `[Client]`

Returns the bag Twill's own modules keep their connections in.

```luau
function Scope.Framework(): Bag
```

The same bag every time. Game code can use it for connections that live as long
as the server, but a shorter scope is almost always the right one.

### `Scope.Close`

`[Server]` | `[Client]`

Closes a player's bag now.

```luau
function Scope.Close(player: Player)
```

Does nothing when there is no bag to close. Throws when given anything but a
`Player`.

### `Scope.CloseCharacter`

`[Server]` | `[Client]`

Closes a character's bag now.

```luau
function Scope.CloseCharacter(character: Model)
```

### `Scope.CloseAlive`

`[Server]` | `[Client]`

Closes a character's alive bag now, without waiting for a death.

```luau
function Scope.CloseAlive(character: Model)
```

### `Scope.CloseAll`

`[Server]` | `[Client]`

Closes every bag held here, shortest lifetime first.

```luau
function Scope.CloseAll()
```

Alive bags, then character bags, then player bags, then the framework bag. This
is a shutdown rather than a reset: the framework bag is destroyed, not emptied.

### `Scope.OwnPlayerClosing`

`[Server]` | `[Client]`

Hands closing of every player bag to the caller, from this point on.

```luau
function Scope.OwnPlayerClosing()
```

There is no way back. Once called, nothing closes a player bag until the caller
does.
