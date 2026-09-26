---
title: Board
description: An ordered data store leaderboard read from a cache and written in batches
---

**Server only.** Requiring this from a client fails at the require, naming the
module.

```luau
local Board = require("@game/ServerScriptService/Twill").Board

local wins = Board.new("Wins", { Size = 10 }, bag)
wins:Increment(player.UserId, 1)
wins.OnUpdated:Connect(showTop)
```

Added in v1.10.0.

## Reading

The top of the board is read on a timer and kept, so `Top` never yields and
costs nothing. A read that fails keeps the last one. A value written appears
only after it has been written and the next read has happened, and an ordered
data store may take a few seconds to show a new value.

## Writing

`Set` and `Increment` do not write. They gather changes per entry, and the
board writes them together on a timer, one write per entry.

- An `Increment` after a `Set` adds to the value being set.
- A `Set` replaces anything gathered before it.
- Writing stops when the engine reports no ordered write budget left. The rest
  waits for the next flush.
- A write that fails is kept and merged with anything asked for since. A `Set`
  asked for since the failure wins.

Whatever is still waiting is written when the server closes, for up to 25
seconds, and in the background when the board is destroyed.

Values are whole numbers below 2^53 in size, because ordered data stores hold
nothing else.

## API

### `Board.new`

`[Server]`

Opens a leaderboard over an ordered data store.

```luau
function Board.new(name: string, options: Options?, owner: Bag?): Board
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The ordered data store's name. 1 to 50 characters. |
| `options` | `Options?` | How many entries to show, which way round, and how often to read and write. |
| `owner` | `Bag?` | A bag that destroys the board when it closes. |

**Returns**

`Board` - The board, reading its first page in the background.

Throws on a name or an option out of range.

### `Options`

| Field | Default | Meaning |
| :--- | ---: | :--- |
| `Size` | `10` | Entries shown. 1 to 100. |
| `Ascending` | `false` | Lowest first instead of highest first. |
| `Refresh` | `60` | Seconds between reads. At least 10. |
| `Flush` | `60` | Seconds between writes. At least 6. |

### `Board:Set`

`[Server]`

Sets an entry to a value, replacing whatever it held.

```luau
function Board:Set(key: number | string, value: number)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `key` | `number \| string` | A user id, or a key of your own of up to 50 characters. |
| `value` | `number` | A whole number. |

Throws on a key or value that cannot be stored.

### `Board:Increment`

`[Server]`

Adds to an entry, or takes away with a negative amount.

```luau
function Board:Increment(key: number | string, delta: number)
```

Throws on a key or amount that cannot be stored.

### `Board:Top`

`[Server]`

Returns the top of the board as it was last read. Never yields.

```luau
function Board:Top(): { Entry }
```

**Returns**

`{ Entry }` - Frozen entries, best first.

### `Entry`

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `Key` | `string` | The stored key. |
| `UserId` | `number?` | The key as a number, when it is one. |
| `Value` | `number` | The stored value. |
| `Rank` | `number` | Position on the board, from 1. |

### `Board:Flush`

`[Server]`

Writes what is waiting now. A write already under way is waited out first.

```luau
function Board:Flush()
```

Yields.

### `Board:Refresh`

`[Server]`

Reads the top of the board now. A read already under way is waited out first.

```luau
function Board:Refresh()
```

Yields.

### `Board:Destroy`

`[Server]`

Stops reading and writing on a timer, and writes whatever is waiting in the
background. Safe to call more than once.

```luau
function Board:Destroy()
```

### `Board.OnUpdated`

Fires with the new entries after every read.

```luau
Board.OnUpdated: Signal<(entries: { Entry }) -> ()>
```

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| Entries shown | 100 | Roblox |
| Store name and key length | 50 characters | Roblox |
| Largest value | below 2^53 | Roblox |
| Shortest time between reads | 10 seconds | Fixed |
| Shortest time between writes | 6 seconds | Fixed |
| Time to finish writing on shutdown | 25 seconds | Fixed |
