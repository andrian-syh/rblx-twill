---
title: Compress
description: Large data made small, and safe to send wherever text goes.
---

```luau
local packed = Compress.Encode(bigTable)
MessagingService:PublishAsync("Topic", packed)

local original = Compress.Decode(packed)
```

What comes out is text, so it survives every transport that carries JSON:
DataStores, MessagingService, MemoryStore, attributes, remotes.

The binary engine underneath is `Packages.BytePress`, whose own output is not
valid UTF-8 and is refused by all of them. That trap is why this module exists
instead of a direct call.

Roblox values are handled natively, so [`Serialize`](/reference/serialize/) is
not needed first.

## Never larger than the original

`Encode` computes two forms and the smaller one wins: plain JSON where the value
can survive it, the compressed form otherwise, marked by a leading character no
JSON value can begin with.

**The result is therefore never longer than the JSON of the same value**, while a
few thousand repetitive rows still land near a fifth of it.

Small values come back as plain JSON because nothing else can win there. Packing
eight bits into a character JSON accepts always costs more than the byte it
replaced, whatever alphabet is used. Compression takes over once it earns its
keep, and never before.

## Truncation is refused, not read

The byte count travels with the payload, so text that was cut short is refused
rather than read as a smaller value.

A truncated save that looks complete is worse than one that fails, and transports
with a size ceiling do cut payloads.

It is a length and not a checksum, so bytes altered in place still read. That is
the right trade for transports that lose the tail but never rewrite the middle.

## What is lost

This matters most for saved data.

| Value | What survives |
| --- | --- |
| `Color3`, `ColorSequence` | Quantised to 8 bits per channel. |
| `CFrame` | Position and axis angle at f32. |
| `DateTime` | Whole seconds. |
| `Instance` | Travels as a path. Resolves to `nil` where it does not exist. |
| Functions, threads, buffers | Become `nil`. |
| Cyclic branches | Become `nil`. |

If any of that matters, use [`Serialize`](/reference/serialize/) instead, which is
exact.

## API

### `Compress.Encode`

`[Server]` | `[Client]`

Turns a value into compact text that every text transport will carry.

```luau
function Compress.Encode(value: any): string
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `any` | Anything. What cannot be represented travels as `nil`, per the table above. |

**Returns**

`string` - Text safe to store and to send, never longer than the plain reading of
the same value.

This is lossy by design: it makes a value small and opaque rather than exact and
readable. Where a person or another system reads the field, or where precision
matters, encode it for storage instead of compressing it.

### `Compress.Decode`

`[Server]` | `[Client]`

Rebuilds the value behind text that was encoded here.

```luau
function Compress.Decode(text: string): any
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | Text from `Encode`, in either of the two forms it produces. |

**Returns**

`any` - The original value, or `nil` when the text cannot be read.

**Never throws.** A payload that was truncated, altered at its length header, or
was never a Compress payload at all comes back as `nil`, so a corrupted field is a
missing value rather than a broken caller.

## Transport ceilings still apply

Every transport imposes its own limit on the result, and the result is text.
Check the limit for the one you are sending through before assuming it fits. See
[Platform limits](/reference/platform-limits/).
