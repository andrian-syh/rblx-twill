---
title: Async
description: Yielding work with a deadline, run together, or tried again, that always returns an answer
---

```luau
local Async = require("@game/ReplicatedStorage/Twill").Async

local finished, code = Async.Timeout(10, TeleportService.ReserveServerAsync, TeleportService, placeId)
local fetched, body = Async.Retry(HttpService.GetAsync, { Attempts = 3 }, HttpService, url)
```

Added in v1.10.0.

## Answers, not promises

Every function yields the calling thread and returns plain values, in the shape
`pcall` uses: `true` and the results, or `false` and a reason. Nothing is chained
and nothing has to be awaited later.

A reason is the error the call raised, or one of two values on the module:

| Value | Meaning |
| :--- | :--- |
| `Async.TimedOut` | The deadline passed before the call finished. |
| `Async.Cancelled` | The owner bag of a retry closed. |

## Cancellation

`Timeout` and `All` run each call on its own thread and cancel it where it
stands when the deadline passes. Work that must never stop halfway, such as a
save or a grant, does not belong in them.

`Retry` runs on the calling thread and never cuts a call off. It only decides
whether to make another.

## API

### `Async.Timeout`

`[Server]` | `[Client]`

Runs a call and waits for it, but no longer than a deadline.

```luau
function Async.Timeout(seconds: number, callback: (...any) -> ...any, ...: any): (boolean, ...any)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `seconds` | `number` | The longest to wait. Zero or more. |
| `callback` | `(...any) -> ...any` | What to run. |
| `...` | `any` | What to run it with. |

**Returns**

`boolean` - `true` when the call finished in time without raising.

`...any` - What the call returned, or the error it raised, or `Async.TimedOut`.

Yields. Throws on a duration that is negative, infinite or not a number, and on
a callback that is not a function.

### `Async.All`

`[Server]` | `[Client]`

Runs several calls at once and waits for every one, or for a deadline.

```luau
function Async.All(callbacks: { () -> ...any }, seconds: number?): (boolean, { Outcome })
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `callbacks` | `{ () -> ...any }` | The calls to run. Each takes no arguments. |
| `seconds` | `number?` | The longest to wait for all of them. 30 when left out. |

**Returns**

`boolean` - `true` when every call finished in time without raising.

`{ Outcome }` - One entry per call, in order, holding what `pcall` would have
returned, with `n` set. A call cut off by the deadline holds `false` and
`Async.TimedOut`.

Yields. An empty list returns `true` at once. Throws on a list that holds
anything but functions.

### `Async.Retry`

`[Server]` | `[Client]`

Runs a call on the calling thread, and tries it again when it raises.

```luau
function Async.Retry(callback: (...any) -> ...any, options: RetryOptions?, ...: any): (boolean, ...any)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `callback` | `(...any) -> ...any` | What to run. |
| `options` | `RetryOptions?` | How many tries, how long between them, and when to stop. |
| `...` | `any` | What to run it with. |

**Returns**

`boolean` - `true` when a try went through.

`...any` - What that try returned, or the last error, or `Async.Cancelled`.

Yields. Throws on a callback that is not a function, and on options out of range.

Each wait is longer than the one before and spread at random between half and
all of its length, so many servers retrying together do not return together.

### `RetryOptions`

| Field | Default | Meaning |
| :--- | ---: | :--- |
| `Attempts` | `3` | Tries in total. A whole number of at least one. |
| `Delay` | `1` | Seconds before the second try. |
| `Growth` | `2` | What each wait is multiplied by. At least one. |
| `Ceiling` | `30` | The longest wait. No less than `Delay`. |
| `ShouldRetry` | none | `(message: string) -> boolean`. Stops at once when it answers anything but `true`, or raises. |
| `Owner` | none | A bag. Once it closes, no further try is made. |

## Limits

| Limit | Value |
| :--- | ---: |
| Default deadline for `All` | 30 seconds |
| Default tries for `Retry` | 3 |
| Default longest wait between tries | 30 seconds |
