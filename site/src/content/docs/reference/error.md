---
title: Error
description: One listener for every unhandled error.
---

```luau
local Error = require("@game/ReplicatedStorage/Twill/Error")

local errors = Error.Install(logger)
scope:Add(errors, "Destroy")
```

`ScriptContext.Error` reports script failures as they happen, and this module
turns each one into a [`Log`](/reference/log/) line carrying the trace.

**Nothing is re-thrown.** The error already happened, and raising it again would
only double the report.

For how this fits alongside deliberate reporting, see
[See what your game is doing](/guides/logging-and-errors/).

## API

### `Error.Install`

`[Server]` | `[Client]`

Wires a logger to every script error the runtime reports.

```luau
function Error.Install(logger: Log.Logger, options: Options?): Handle

export type Options = {
	Webhook: string?,
}

export type Handle = {
	Destroy: (self: Handle) -> (),
}
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `logger` | `Log.Logger` | Where each error and its trace is written. The failing script is named alongside. |
| `options` | `Options?` | Somewhere to post reports to, when they should leave the server. |

**Returns**

`Handle` - Stops the listening when destroyed.

Throws when no logger is given.

Install once per side. Each error is written at `Error` level with the script that
failed, and the trace follows at `Debug` level, so a quiet production log still
records that something broke without carrying the whole stack.

**Example**

```luau
function ObservabilityService.Init()
	local errors = Twill.Error.Install(Twill.Log.new("Unhandled"))

	-- It is a thing that must be cleaned up, like anything else.
	Twill.Scope.Framework():Add(errors, "Destroy")
end
```

### Webhook

Passing a Discord webhook URL posts each report there, throttled so a burst of
failures cannot bury the channel. A burst is dropped rather than queued, because
the point is to be told that something broke, not to receive every instance of
it. Long reports are cut to fit.

Posting happens **only on the server**, where the URL cannot be read by a client.
Installing with a webhook on the client is not an error, but nothing is posted.

A failed post is reported through the same logger rather than raised, so an
unreachable webhook cannot itself become an error.

:::danger[A webhook URL is a credential]
Keep it in the server half (`ServerScriptService.TwillServer` or your own server
folder), never in `ReplicatedStorage`. Anything that can post to your channel can
flood it.
:::

## Deliberate errors

This module catches failures nobody handled. For errors you raise yourself, call
`logger:Error(...)`, or [`Log.SetErrorHandler`](/reference/log/#logseterrorhandler)
to route all of them somewhere.
