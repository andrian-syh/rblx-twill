---
title: Log
description: Scoped, level-filtered logging
---

```luau
local Log = require("@game/ReplicatedStorage/Twill").Log

local logger = Log.new("Shop")

logger:Info("ready")   --> [Shop] ready
```

One logger per system, built once and kept for the lifetime of that system.

## Levels

`Debug` ranks below `Info`, which ranks below `Warn`, which ranks below `Error`.
One threshold silences everything beneath it.

| Level | Written with | Names the caller |
| :--- | :--- | :--- |
| `Debug` | `print` | No |
| `Info` | `print` | No |
| `Warn` | `warn` | Yes |
| `Error` | `warn`, then the installed handler | Yes |

`Error` reports and never throws. Raise an error yourself where the caller
should stop.

## Call-site attribution

`Warn` and `Error` name the nearest line outside Twill, so a message about a bad
call points at the call rather than at the framework.

```text
[Twill.Data] (from MyGame.Services.Shop:42) Edit refused: unsupported value
```

A line is outside Twill when its source starts with neither
`ReplicatedStorage.Twill` nor `ServerScriptService.TwillServer`. Native frames
are stepped over. Twelve stack levels are examined, so a message raised through
more layers than that reports no call-site rather than a wrong one.

## API

### `Log.new`

`[Server]` | `[Client]`

Creates a logger that tags every message with the given scope.

```luau
function Log.new(scope: string): Logger
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `scope` | `string` | Identifier shown alongside each message, such as a system name. Not empty. |

**Returns**

`Logger` - A logger bound to that scope.

Throws when the scope is empty or is not a string.

### `Logger`

`[Server]` | `[Client]`

```luau
export type Logger = {
	Scope: string,
	Debug: (self: Logger, ...any) -> (),
	Info: (self: Logger, ...any) -> (),
	Warn: (self: Logger, ...any) -> (),
	Error: (self: Logger, ...any) -> (),
}
```

Every method is called with a colon and takes any number of values, written
after the scope exactly as `print` writes them.

| Method | Use it for |
| :--- | :--- |
| `logger:Debug(...)` | Detail useful only while investigating. The first thing silenced. |
| `logger:Info(...)` | Progress worth seeing in a healthy session, such as a system finishing setup. |
| `logger:Warn(...)` | A recoverable problem that did not stop the operation. |
| `logger:Error(...)` | A failure. Reaches the installed handler. Never throws. |

**Example**

```luau
local logger = Log.new("Shop")

logger:Debug("loading catalogue")
logger:Info("ready")
logger:Warn("price table is empty")
logger:Error("could not reach the catalogue")
```

### `Log.SetLevel`

`[Server]` | `[Client]`

Silences every message ranked below the given level.

```luau
function Log.SetLevel(level: Level)

export type Level = "Debug" | "Info" | "Warn" | "Error"
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `level` | `Level` | The lowest severity that still reaches the output. |

Throws when the level is not one of the four.

The threshold is session wide, not per logger. It applies to every logger on
this side, Twill's own included, whichever logger it was called from.

**Example**

```luau
local RunService = game:GetService("RunService")

Log.SetLevel(if RunService:IsStudio() then "Debug" else "Info")
```

### `Log.GetLevel`

`[Server]` | `[Client]`

Reports the level in force on this side.

```luau
function Log.GetLevel(): Level
```

**Returns**

`Level` - The lowest severity still reaching the output.

Each side keeps its own threshold, so the answer on a client says nothing about
the server. The [`loglevel` command](/reference/admin/#loglevel) reads and sets
the server's without republishing the place.

### `Log.SetErrorHandler`

`[Server]` | `[Client]`

Routes every reported failure to a handler.

```luau
function Log.SetErrorHandler(handler: ((scope: string, ...any) -> ())?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `handler` | `((scope: string, ...any) -> ())?` | Receives the reporting scope and the reported values. `nil` removes the handler. |

One handler at a time. Installing a second replaces the first. The handler runs
on its own thread in addition to the normal output, so it may yield.

**Example**

```luau
Log.SetErrorHandler(function(scope: string, ...: any)
	AnalyticsService:LogCustomEvent(Players.LocalPlayer, scope, ...)
end)
```

For unhandled script errors rather than deliberate `Error` calls, see
[`Twill.Error`](/reference/error/).

## Limits

| Limit | Value |
| :--- | ---: |
| Level when nothing sets one | `Info` |
| Stack levels examined for a call-site | 12 |
