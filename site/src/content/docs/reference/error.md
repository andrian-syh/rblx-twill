---
title: Error
description: One listener for every unhandled error
---

```luau
local Error = require("@game/ReplicatedStorage/Twill").Error

local errors = Error.Install(Log.new("Unhandled"))

Scope.Framework():Add(errors, "Destroy")
```

`ScriptContext.Error` reports script failures as they happen, and this module
turns each one into [`Log`](/reference/log/) lines carrying the trace.

Nothing is re-thrown. The error already happened, and raising it again would
double the report.

For how this sits alongside deliberate reporting, see
[See what your game is doing](/guides/logging-and-errors/).

## What each failure writes

Two lines per failure, at two levels.

| Level | Content |
| :--- | :--- |
| `Error` | The full name of the script that failed, then the message. |
| `Debug` | The trace. |

Splitting them means a server running at `Info` records that something broke
without carrying the whole stack.

## Webhook

Passing a Discord webhook URL posts each report there as well. A report is the
script name, the message, and the trace, cut to 1900 characters.

Posting is metered at one post every five seconds, and a post refused by the
meter is dropped rather than queued. The point is to be told that something
broke, not to receive every instance of it.

Posting happens only on the server. Installing with a webhook on the client is
not an error, and nothing is posted.

A failed post is reported through the same logger at `Warn` rather than raised,
so an unreachable webhook does not itself become an error.

A webhook URL is a credential. Keep it in the server half, in
`ServerScriptService.TwillServer` or your own server folder, never in
`ReplicatedStorage`. Anything that can read it can post to the channel.

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
| `logger` | `Log.Logger` | Where each error and its trace is written. |
| `options` | `Options?` | Somewhere to post reports to, when they should leave the server. |

**Returns**

`Handle` - Stops the listening when destroyed.

Throws when no logger is given.

Install once per side. A second install listens twice and reports every failure
twice.

**Example**

```luau
function ObservabilityService.Init()
	local errors = Twill.Error.Install(Twill.Log.new("Unhandled"))

	Twill.Scope.Framework():Add(errors, "Destroy")
end
```

## Deliberate errors

This module catches failures nobody handled. For errors raised on purpose, call
`logger:Error(...)`, or
[`Log.SetErrorHandler`](/reference/log/#logseterrorhandler) to route all of them
somewhere.

## Limits

| Limit | Value |
| :--- | ---: |
| Webhook posts | 1 every 5 seconds |
| Report length | 1900 characters |
