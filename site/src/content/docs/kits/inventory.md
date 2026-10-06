---
title: Inventory
description: Items a player holds, in named containers, changed whole or not at all
---

```luau
local Inventory = require("@game/ServerScriptService/Twill").Kits.Inventory

Inventory.Configure({ Items = { Wood = {}, Sword = { Unique = true } } })
local added, reason = Inventory.Add(player, "Wood", 5)
```

Inventory is a kit: a part of Twill for one kind of game feature rather than
for every game. It ships inside Twill and loads only when you name it. It needs
`Data` configured, and keeps what each player holds in their saved data.

## Where it lives

| Half | Holds |
| :--- | :--- |
| `ReplicatedStorage.Twill.Kits.Inventory` | The client's reads of its own holdings. |
| `ServerScriptService.Twill.Kits.Inventory` | Every change, with `Holdings` inside it. |

The kit declares no remotes. A client asks through a remote of your own, your
handler decides whether the player may, and then calls the kit. Nothing a client
sends reaches an item without passing through your code.

## Items and containers

The catalogue says what exists. What a player holds is kept apart from it, in
their data.

| Sort of item | Held as | Addressed by |
| :--- | :--- | :--- |
| Counted | One count per item, such as 40 `Wood`. | The item's name. |
| One of a kind (`Unique = true`) | One entry each, with its own id and its own data. | The id the kit gave it. |

A container is a named place a player keeps items, such as `Bag`, `Bank` or
`Equipped`. Each has its own capacity and may choose what it takes. Equipping is
a move into the container that is worn, so an item is in one place at a time.

```luau
Inventory.Configure({
	Items = {
		Wood = {},
		Token = { Limit = 3 },
		Sword = { Unique = true, Tradeable = false },
	},
	Containers = {
		Bag = { Capacity = 40 },
		Equipped = {
			Capacity = 1,
			Accepts = function(id)
				return id == "Sword"
			end,
		},
	},
	Default = "Bag",
})
```

A container's capacity counts entries: one for each counted item it holds,
whatever the count, and one for each one-of-a-kind item.

## Changes are whole or refused

Every change checks all of itself against the player's live data before it
makes any of it. A change that cannot be made in full returns `false` and a
reason, and the data is left as it was. Nothing is trimmed to fit, and nothing
raises.

| Asked for | Result |
| :--- | :--- |
| Removing more than is held | Refused. Nothing is removed. |
| Adding past a container's capacity | Refused. Nothing is added. |
| Adding past an item's `Limit` | Refused. The limit counts every container. |
| An amount that is zero, negative, fractional, or not a number | Refused. |
| An item the catalogue does not name | Refused. |
| A container that does not take the item | Refused. |

No call yields. To make two changes together, such as taking materials and
granting what they craft, make both inside
[`Data.Transact`](/reference/data/#datatransact):

```luau
local crafted, reason = Data.Transact(player, function()
	assert(Inventory.Remove(player, "Wood", 5))
	assert(Inventory.Add(player, "Sword"))
end)
```

## What is saved

Holdings are kept in the player's data under `Inventory`:

```luau
data.Inventory = {
	Bag = {
		Stacks = { Wood = 40 },
		Items = { ["9f2c..."] = { Id = "Sword", Data = { Level = 3 } } },
	},
}
```

To show a player their own holdings, list the field under `Replicate`:

```luau
Data.Configure({
	Store = "PlayerData",
	Template = { Inventory = {} },
	Replicate = { "Inventory" },
	Validate = Inventory.Check,
})
```

An item the catalogue no longer names stays in the data untouched. It cannot be
added or moved, and a one-of-a-kind item can still be removed by its id.
Lowering a capacity removes nothing: the container takes no further entries
until it is back under its capacity.

## Trading items

`Inventory.Stacks` and `Inventory.Uniques` describe a container to the
[Trade kit](/kits/trade/). A trade made through them keeps to capacity, to each
item's `Limit`, and to `Tradeable`, and a one-of-a-kind item keeps its id and
its data as it changes hands.

```luau
Trade.Configure({
	Kinds = {
		Goods = Inventory.Stacks("Bag"),
		Gear = Inventory.Uniques("Bag"),
	},
})
```

## The client

```luau
local Inventory = require(ReplicatedStorage.Twill).Kits.Inventory

Inventory.Observe(function(contents)
	render(contents)
end, bag, "Bag")
```

The client half reads the copy that arrives with the player's replicated data.
It changes nothing.

## API

### `Inventory.Configure`

`[Server]`

Sets up the catalogue and the containers. Call it once, after `Data.Configure`.

```luau
function Inventory.Configure(config: Config)
```

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `Items` | `{ [string]: Definition }` | Required | What exists, by name. |
| `Containers` | `{ [string]: Container }?` | `{ Bag = {} }` | The containers each player has. |
| `Default` | `string?` | The only container | The container a call means when it names none. Required with more than one. |

A `Definition` takes these fields, and may carry any others of your own:

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `Unique` | `boolean?` | `false` | Each one is held on its own, with an id and data. |
| `Limit` | `number?` | None | The most one player may hold, across every container. |
| `Tradeable` | `boolean?` | `true` | Whether the trade kinds cover it. |

A `Container` takes:

| Field | Type | Default | Meaning |
| :--- | :--- | :--- | :--- |
| `Capacity` | `number?` | None | The most entries it holds. |
| `Accepts` | `((id: string, definition: Definition) -> boolean)?` | None | Returns `true` for an item it takes. A function that raises takes nothing. |

Throws on a second call, before `Data` is configured, and on a config that does
not fit the tables above. Nothing is changed by a config that throws. The
definitions are copied and frozen.

### `Inventory.Add`

`[Server]`

Gives a player a count of an item, or one-of-a-kind items.

```luau
function Inventory.Add(player: Player, id: string, amount: number?, options: Options?): (boolean, string?, { string }?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Who receives it. |
| `id` | `string` | The item, as the catalogue names it. |
| `amount` | `number?` | How many. 1 when left out. |
| `options` | `Options?` | `Container` to add to, and `Data` for each one-of-a-kind item made. |

**Returns**

`boolean` - `true` when all of it was given. `string?` - why it was not.
`{ string }?` - the id of each one-of-a-kind item made.

Each one-of-a-kind item gets its own copy of `Data`. Data on a counted item is
refused.

### `Inventory.Remove`

`[Server]`

Takes a count of an item, or one item by its id, away from a player.

```luau
function Inventory.Remove(player: Player, key: string, amount: number?, container: string?): (boolean, string?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Who loses it. |
| `key` | `string` | A counted item's name, or a one-of-a-kind item's id. |
| `amount` | `number?` | How many. 1 when left out. |
| `container` | `string?` | Where to take it from. |

**Returns**

`boolean` - `true` when it was taken. `string?` - why it was not.

With no `container`, a counted item is taken from the default container, and a
one-of-a-kind item from wherever it is.

### `Inventory.Move`

`[Server]`

Moves a count of an item, or one item by its id, into another container of the
same player.

```luau
function Inventory.Move(player: Player, key: string, to: string, amount: number?, from: string?): (boolean, string?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `player` | `Player` | Whose items move. |
| `key` | `string` | A counted item's name, or a one-of-a-kind item's id. |
| `to` | `string` | The container they go to. |
| `amount` | `number?` | How many. 1 when left out. |
| `from` | `string?` | Where they are. Found as for `Remove` when left out. |

**Returns**

`boolean` - `true` when they moved. `string?` - why they did not.

What the player holds in total does not change. A one-of-a-kind item keeps its
id and its data.

### `Inventory.SetData`

`[Server]`

Replaces what a one-of-a-kind item carries.

```luau
function Inventory.SetData(player: Player, uid: string, itemData: { [string]: any }?): (boolean, string?)
```

**Returns**

`boolean` - `true` when it was replaced. `string?` - why it was not.

The item keeps a copy. Data that could not be saved, or that passes the size
limit, is refused and the item's data stays as it was.

### `Inventory.Count`

`[Server]`

Counts how much of an item a player holds.

```luau
function Inventory.Count(player: Player, id: string, container: string?): number
```

**Returns**

`number` - how many, in one container or in all of them when `container` is left
out. 0 while their data is not loaded.

### `Inventory.Has`

`[Server]`

Reports whether a player holds enough of an item, across every container.

```luau
function Inventory.Has(player: Player, id: string, amount: number?): boolean
```

### `Inventory.Find`

`[Server]`

Finds a one-of-a-kind item by its id, whichever container holds it.

```luau
function Inventory.Find(player: Player, uid: string): (Item?, string?)
```

**Returns**

`Item?` - the live item, with `Id` and `Data`. Read it; change it through
`SetData`. `string?` - the container holding it.

### `Inventory.Get`

`[Server]`

Returns what one of a player's containers holds.

```luau
function Inventory.Get(player: Player, container: string?): Contents?
```

**Returns**

`Contents?` - the live table, with `Stacks` and `Items`, or `nil` while their
data is not loaded. Read it; change it through the kit.

### `Inventory.Definition`

`[Server]`

Returns what the catalogue says of an item.

```luau
function Inventory.Definition(id: string): Definition?
```

### `Inventory.Check`

`[Server]`

Reports whether saved holdings are well formed.

```luau
function Inventory.Check(data: { [string]: any }): (boolean, string?)
```

**Returns**

`boolean` - `true` when every count is a whole number above zero, every item is
shaped as one, and no id is held twice. `string?` - the first thing wrong.

Pass it as `Validate` to `Data.Configure`, or call it from your own check.

### `Inventory.Stacks`

`[Server]`

Describes a container's counted items to the Trade kit.

```luau
function Inventory.Stacks(container: string?): Kind
```

Throws before `Configure`, and for a container that was not configured.

### `Inventory.Uniques`

`[Server]`

Describes a container's one-of-a-kind items to the Trade kit. The other player
in a trade is shown each offered item's `Id` and `Data`.

```luau
function Inventory.Uniques(container: string?): Kind
```

Throws before `Configure`, and for a container that was not configured.

### `Inventory.OnChanged`

`[Server]`

Fires for each change that stays.

```luau
Inventory.OnChanged: Signal<(player: Player, change: Change) -> ()>
```

| Field | Meaning |
| :--- | :--- |
| `Action` | `added`, `removed`, `moved` or `changed`. |
| `Key` | The item's name, or a one-of-a-kind item's id. |
| `Amount` | How many. |
| `Container` | Where it was added, removed from, or moved from. |
| `To` | Where it was moved to. |
| `Made` | The ids of one-of-a-kind items an add made. |

A change made inside `Data.Transact` is announced once the transaction is kept,
and never when it is undone. A trade made through the kinds announces nothing;
listen to `Trade.OnCompleted` for those.

### Client calls

`[Client]`

| Call | Returns |
| :--- | :--- |
| `Inventory.Get(container?)` | That container's contents, or every container's when left out. |
| `Inventory.Count(id, container?)` | How many this player holds. |
| `Inventory.Observe(callback, owner?, container?)` | A subscription. The callback runs on every change. |

Each is refused on the server, where `Twill.Kits.Inventory` is the server half.

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Largest count of one item | 2^53 | Exact numbers |
| One-of-a-kind items made per call | 100 | Fixed |
| Data on one item, as JSON | 4096 bytes | Fixed |
| Item or container name | 64 characters, no dot | Fixed |
