---
title: See what your game is doing
description: Scope your logging, keep it quiet in production, and catch the errors nobody handled.
---

Output that nobody can read is the same as no output. A live server produces
hundreds of lines a minute, and the ones that matter are buried under prints that
were useful for an afternoon three months ago.

Two modules cover this. [`Log`](/reference/log/) gives every message a scope and a
severity, so the noise can be turned down without deleting anything.
[`Error`](/reference/error/) catches the failures nobody wrote a handler for.

## One logger per system

Make it once, keep it for the lifetime of that system, and never build one per
call.

```luau title="ServerScriptService/Services/ShopService"
local Twill = require("@game/ReplicatedStorage/Twill")

-- The scope is what makes a line findable later. Name the system, not the file.
local logger = Twill.Log.new("Shop")

local ShopService = {}

function ShopService.Start()
	logger:Info("ready")   --> [Shop] ready
end

return ShopService
```

## Choose the severity honestly

The levels rank `Debug < Info < Warn < Error`, and the choice decides what
survives when you turn the volume down.

| Level | For |
| --- | --- |
| `Debug` | Detail useful only while investigating. The first thing silenced. |
| `Info` | Progress worth seeing in a healthy session. |
| `Warn` | A recoverable problem that did not stop the operation. |
| `Error` | A failure. Reaches the installed handler as well as the output. |

```luau
logger:Debug("catalogue reloaded", #items)
logger:Info("ready")
logger:Warn(`unknown item '{itemId}' requested`)
logger:Error(`could not reach the catalogue: {reason}`)
```

:::caution[`Error` reports, it never throws]
Calling it does not stop your function. That is deliberate, so reporting a
failure cannot itself become one, but it means the line after it still runs.
Raise an error yourself where the caller should actually stop.
:::

## Turn it down in production

One call sets the floor for every logger on that side, Twill's own included.

```luau title="ServerScriptService/Main"
local RunService = game:GetService("RunService")

-- Studio sees everything. A live server keeps only what someone would act on.
Twill.Log.SetLevel(if RunService:IsStudio() then "Debug" else "Info")
```

Nothing is deleted by doing this. A `Debug` line left in the code costs a
comparison when it is silenced, so leave the investigation aids where they are and
raise the floor instead of stripping them out before release.

## Warnings name the caller

`Warn` and `Error` report the nearest line **outside** Twill, so a complaint
about a bad call points at the call rather than at the framework that noticed it.

```text
[Twill.Data] (from MyGame.Services.Shop:42) Edit refused: unsupported value
```

That is usually enough to skip opening a stack trace at all. Only a bounded
stretch of the stack is examined, so a failure raised through many layers of
native code reports no call-site rather than a misleading one.

## Send failures somewhere you will see them

Nobody reads a live server's output. Route reported failures to whatever you
actually watch.

```luau
function ObservabilityService.Init()
	Twill.Log.SetErrorHandler(function(scope, ...)
		-- Runs on its own thread, so a slow sink cannot hold up the reporter,
		-- and it is allowed to yield.
		AnalyticsService:LogCustomEvent(scope, ...)
	end)
end
```

One handler at a time. Installing a second replaces the first, so install it once
during `Init` rather than from each system that wants reporting.

## Catch what nobody handled

`Log.SetErrorHandler` only sees failures somebody deliberately reported. The
interesting ones are the failures nobody expected at all.

```luau
function ObservabilityService.Init()
	local errors = Twill.Error.Install(Twill.Log.new("Unhandled"))

	-- It is a thing that must be cleaned up, like anything else.
	Twill.Scope.Framework():Add(errors, "Destroy")
end
```

Every script error the runtime reports now leaves a record carrying its trace.
Nothing is re-thrown: the error already happened, and raising it again would only
report it twice.

### Post them to a channel

```luau
local errors = Twill.Error.Install(logger, {
	Webhook = webhookUrl,
})
```

Posting happens only on the server, where the URL cannot be read by a client, and
it is throttled so a burst of failures cannot bury the channel. A burst is dropped
rather than queued, because the point is to be told that something broke, not to
receive every instance of it.

:::danger[Keep the URL out of ReplicatedStorage]
A webhook URL is a credential. Anything that can post to your channel can flood
it. Read it from somewhere only the server can reach, and never from a module a
client can require.
:::

## What good output looks like

- A scope on every line, so a search finds one system rather than one word.
- `Info` for things that happened, not for things that are about to.
- `Warn` reserved for something a person could act on. If nobody would act, it is
  `Debug`.
- No line inside a hot path or a per-frame loop. Logging is not free, and a line
  written every frame is the first thing to drown everything else.
