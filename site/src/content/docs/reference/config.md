---
title: Config
description: Live experience configs read without yielding, with a declared default for every key
---

**Server only.** Requiring this from a client fails at the require, naming the
module. The engine does not offer configs to clients.

```luau
local Config = require("@game/ServerScriptService/Twill").Config

Config.Configure({ Defaults = { BossHealth = 500, HalloweenLive = false } })

local health = Config.Get("BossHealth")
```

Added in v1.10.0.

## Defaults that always answer

Every key is declared once, with the value it falls back to. A read never yields
and never fails. It answers from the configs Roblox delivered, or from the
default while none have arrived.

A delivered value is kept only when it is the same type as its default. A config
published as text for a key whose default is a number reads the default, and the
mismatch is logged once.

A key read before it was declared is an error, so a misspelt key is found at
once rather than quietly reading nothing. Table values are frozen; copy one
before changing it.

## Loading and refreshing

Configs load in the background once `Configure` runs. When they cannot be
loaded, the defaults stand in and loading is tried again, waiting 5 seconds at
first and doubling up to 60.

With `Refresh = "Auto"`, the default, new values are taken as soon as they are
published. With `Refresh = "Manual"`, they are taken only when `Config.Refresh`
runs, for a game that changes values only between rounds.

## Per-player values

Roblox can target a config at some players. `LoadFor` loads the values for one
player, and `GetFor` reads them. Until a player's values load, `GetFor` answers
with the shared ones. `PerPlayer = true` loads them for every player as they
join.

## API

### `Config.Configure`

`[Server]`

Declares every key and its default, and starts loading. Call it once, during
`Init`.

```luau
function Config.Configure(options: Options)
```

**Options**

| Field | Type | Description |
| :--- | :--- | :--- |
| `Defaults` | `{ [string]: any }` | Every key, and the value it falls back to. |
| `Refresh` | `("Auto" \| "Manual")?` | When new values are taken. `"Auto"` when left out. |
| `PerPlayer` | `boolean?` | Whether to load targeted values for every player. |

Throws on a second call, on a client, on a key that is not a non-empty string,
and on a default of `nil`.

### `Config.Get`

`[Server]`

Reads a key's current value. Never yields.

```luau
function Config.Get(key: string): any
```

**Returns**

`any` - The delivered value, or the default when there is none of the right
type.

Throws on a key `Configure` did not declare.

### `Config.GetFor`

`[Server]`

Reads a key's value for one player, including anything targeted at them. Never
yields.

```luau
function Config.GetFor(player: Player, key: string): any
```

Throws on a key `Configure` did not declare.

### `Config.LoadFor`

`[Server]`

Loads the values targeted at one player, or waits for a load already under way.

```luau
function Config.LoadFor(player: Player): boolean
```

**Returns**

`boolean` - `true` when that player's own values are loaded. Yields.

### `Config.Observe`

`[Server]`

Calls back with a key's value now, and again whenever the shared value changes.

```luau
function Config.Observe(key: string, callback: (value: any) -> (), owner: Bag?): any
```

**Returns**

`any` - The connection, held by `owner`, or by the framework bag when left out.

### `Config.Refresh`

`[Server]`

Takes the newest published values now.

```luau
function Config.Refresh()
```

Only needed with `Refresh = "Manual"`.

### `Config.IsLive`

`[Server]`

Reports whether configs have arrived, rather than defaults standing in.

```luau
function Config.IsLive(): boolean
```

### `Config.Defaults`

`[Server]`

Returns the default of every declared key, frozen.

```luau
function Config.Defaults(): { [string]: any }
```

## Limits

| Limit | Value | Set by |
| :--- | ---: | :--- |
| First wait before loading again | 5 seconds | Fixed |
| Longest wait before loading again | 60 seconds | Fixed |
| Active configs per experience, value sizes | See [Experience configs](https://create.roblox.com/docs/production/configs) | Roblox |
