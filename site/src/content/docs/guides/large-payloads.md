---
title: Send large payloads
description: Fit a big value through MessagingService, MemoryStore, or a DataStore, without risking a silent truncation
---

Every transport Roblox gives you has a ceiling, and the way you find it is
usually in production, with a payload that grew. Worse, some transports do not
refuse an oversized payload so much as deliver a shortened one, which reads back
as a smaller value that looks entirely plausible.

Compressing buys headroom and, more importantly, makes a truncated payload fail
loudly instead of quietly.

## Compress it

```luau
-- Text out, so it goes straight through anything that carries JSON.
local packed = Twill.Compress.Encode(bigTable)

MessagingService:PublishAsync("WorldEvent", packed)
```

```luau
-- Nil rather than a throw, and nil rather than a half-read table.
local original = Twill.Compress.Decode(packed)
```

The result is text, so it survives every transport that carries JSON:
DataStores, MessagingService, MemoryStore, attributes, and remotes.

Roblox values are handled natively. You do not need
[`Serialize`](/reference/serialize/) first.

## It is never larger than the original

`Encode` computes both forms and picks the smaller: plain JSON where the value
can survive it, the compressed form otherwise.

So there is no size below which you should avoid it. Small values come back as
JSON, because packing eight bits into a character JSON accepts always costs more
than the byte it replaced.

Compression takes over once it earns its keep. A few thousand repetitive rows
land near a fifth of their JSON.

## Handle a decode failure

```luau
local value = Twill.Compress.Decode(text)

if value == nil then
	logger:Warn("payload could not be read")
	return
end
```

`Decode` never throws. It answers `nil` for a payload that was truncated, was
never a Compress payload, or had its length header altered.

A truncated payload is refused, not read as a smaller value. The byte count
travels with the data precisely so that a transport with a size ceiling cannot
hand you a half-table that looks complete.

## Know what you lose

Compression is lossy in specific, named ways.

| Value | What survives |
| --- | --- |
| `Color3`, `ColorSequence` | 8 bits per channel |
| `CFrame` | Position and axis angle at f32 |
| `DateTime` | Whole seconds |
| `Instance` | A path, resolving to `nil` where it does not exist |
| Functions, threads, buffers | `nil` |
| Cyclic branches | `nil` |

For saved data where exactness matters, use `Serialize` instead, and see
[Store Roblox values safely](/guides/storing-roblox-values/). The two answer
different questions:

- **`Serialize`** keeps a value exact and readable in a shape a DataStore accepts.
- **`Compress`** makes it small and opaque.

Reach for `Serialize` when a person or another system reads the field, and for
`Compress` when only size matters.

## Do not use MessagingService for player data

To write to a player on another server, use
[`Data.Edit`](/reference/data/#writing-to-anybody). It routes through Store and
never writes over a session it does not own.

MessagingService has no such guarantee, and a cross-server write built on it
will eventually race with the owning server and lose progress.

## Transport ceilings still apply

Every transport imposes its own limit, and the result here is text. Compression
buys headroom. It does not remove the ceiling.

See [Platform limits](/reference/platform-limits/).
