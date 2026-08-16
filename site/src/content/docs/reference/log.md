---
title: Log
description: Scoped, level-filtered logging.
---

Create one logger per system and keep it for the lifetime of that system.

```luau
local Log = require("@game/ReplicatedStorage/Twill/Log")
local logger = Log.new("Shop")

logger:Info("ready")   --> [Shop] ready
```

## Levels

`Debug < Info < Warn < Error`. `Log.SetLevel` silences everything below the level
given.

`Debug` and `Info` go to the output as ordinary prints. `Warn` and `Error` go
through `warn`, so they carry the yellow marker and a call-site.

`Error` reports. **It never throws.** Raise an error yourself where the caller
should actually stop.

## Call-site attribution

`Warn` and `Error` name the nearest line outside Twill, so a message about a bad
call points at the call rather than at the framework.

```text
[Twill.Data] (from MyGame.Services.Shop:42) Edit refused: unsupported value
```

This is why a stack trace is rarely needed to find who did what. Only a bounded
stretch of the stack is examined, so a message raised through many layers of
native code reports no call-site rather than a wrong one.

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
| `scope` | `string` | Identifier shown alongside each message, such as a system name. Must not be empty. |

**Returns**

`Logger` - A logger bound to that scope.

Throws when `scope` is empty or is not a string.

**Example**

```luau
local Log = require("@game/ReplicatedStorage/Twill/Log")

-- One logger per system, built once and kept, not one per call.
local logger = Log.new("Shop")

logger:Debug("loading catalogue")
logger:Info("ready")
logger:Warn("price table is empty")
logger:Error("could not reach the catalogue")
```

### `Logger` methods

`[Server]` | `[Client]`

Every method is called with a colon and takes any number of values, which are
written after the scope exactly as `print` would write them.

| Method | Use it for |
| :--- | :--- |
| `logger:Debug(...)` | Detail useful only while investigating. The first thing silenced once a session is healthy. |
| `logger:Info(...)` | Normal progress worth seeing in a healthy session, such as a system finishing its setup. |
| `logger:Warn(...)` | A recoverable problem that did not stop the operation. Names the caller. |
| `logger:Error(...)` | A failure. Names the caller and reaches the installed handler. Never throws. |

```luau
export type Logger = {
	Scope: string,
	Debug: (self: Logger, ...any) -> (),
	Info: (self: Logger, ...any) -> (),
	Warn: (self: Logger, ...any) -> (),
	Error: (self: Logger, ...any) -> (),
}
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

**Returns**

`()` - Nothing.

Throws when the level given is not one of the four.

:::caution[The threshold is not scoped to one logger]
This is a session-wide setting. It affects every logger on this side, Twill's
own included, whichever logger you happen to call it from.
:::

**Example**

```luau
local RunService = game:GetService("RunService")

-- Studio sees everything; a live server keeps the noise down.
Log.SetLevel(if RunService:IsStudio() then "Debug" else "Info")
```

### `Log.GetLevel`

`[Server]` | `[Client]`

Reports the level in force on this side, which every logger is answering to.

```luau
function Log.GetLevel(): Level
```

**Returns**

`Level` - The lowest severity still reaching the output.

Each side keeps its own threshold, so the answer on a client says nothing about
the server. The [`loglevel` command](/reference/admin/#built-in-commands) reads
and sets the server's without republishing the place.

### `Log.SetErrorHandler`

`[Server]` | `[Client]`

Routes every reported failure to a handler, which is how failures reach an
analytics or alerting sink.

```luau
function Log.SetErrorHandler(handler: ((scope: string, ...any) -> ())?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `handler` | `((scope: string, ...any) -> ())?` | Receives the reporting scope and the reported values. Pass `nil` to remove the handler. |

**Returns**

`()` - Nothing.

One handler at a time. Installing a second replaces the first. The handler is
called in addition to the normal output, not instead of it, and it runs apart
from the reporter, so it may yield.

**Example**

```luau
Log.SetErrorHandler(function(scope: string, ...: any)
	-- Runs on its own thread, so a slow sink cannot hold up the reporter.
	AnalyticsService:LogCustomEvent(Players.LocalPlayer, scope, ...)
end)
```

For unhandled script errors rather than deliberate `Error` calls, see
[`Twill.Error`](/reference/error/).
