---
title: Serialize
description: Roblox values in a shape a DataStore will accept
---

```luau
local Serialize = require("@game/ReplicatedStorage/Twill").Serialize

data.Home = Serialize.Encode(spawnPoint.Position)

local home = Serialize.Decode(data.Home)
```

For the patterns and the shapes that fail quietly, see
[Store Roblox values safely](/guides/storing-roblox-values/).

## The problem

A DataStore holds JSON and nothing else, so a `Vector3`, a `CFrame`, or a
`Color3` written straight into player data fails the save.

It fails late and it fails quietly. The value is passed along by reference at
every step without complaint, and survives all the way to the write itself.

## The encoded shape

`Encode` walks a whole tree and replaces what it recognises with a plain table
carrying two fields: `__twillType`, the name of the type, and `V`, its numbers.
`Decode` puts them back.

Nine types are recognised: `Vector3`, `Vector2`, `CFrame`, `Color3`, `UDim`,
`UDim2`, `BrickColor`, `NumberRange`, and `EnumItem`. Anything else is carried
through untouched, both ways.

The numbers sit in a nested array rather than alongside the type field. A table
holding both array keys and string keys is what a DataStore cannot round-trip:
the numbers come back as the strings `"1"`, `"2"`, `"3"`, and every decoder
reads `nil`. The encoded shape avoids the fault
[`FindUnstorable`](#serializefindunstorable) exists to report.

## API

### `Serialize.Encode`

`[Server]` | `[Client]`

Replaces every Roblox value in a tree with a plain table storage accepts.

```luau
function Serialize.Encode(value: any): any
```

**Returns**

`any` - A storable tree of the same shape.

The original is left alone. Anything unrecognised is carried through untouched,
so running this over ordinary data changes nothing.

### `Serialize.Decode`

`[Server]` | `[Client]`

Puts back every Roblox value that was encoded.

```luau
function Serialize.Decode(value: any): any
```

**Returns**

`any` - A fresh tree with its Roblox values restored.

Data that was never encoded passes through unchanged, so this is safe to run
over a mix of both without knowing which is which.

An `EnumItem` whose family or name no longer exists decodes to `nil` rather than
raising, since the engine decides what those are.

### `Serialize.FindUnstorable`

`[Server]` | `[Client]`

Finds the first thing in a tree that storage would refuse or quietly drop.

```luau
function Serialize.FindUnstorable(value: any, path: string?): (string?, string?)
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `value` | `any` | The tree to walk. |
| `path` | `string?` | Where the walk currently is. Leave it out at the top. |

**Returns**

`string?` - Where the offender sits, or `nil` when the tree is clean.

`string?` - What made it unstorable.

Clean means storable as it stands, without encoding. Six faults are reported:

| Reported as | Raised by |
| :--- | :--- |
| The type name, such as `Vector3` | A value a DataStore cannot hold. Encode it. |
| `not a finite number` | NaN or infinity. Neither is valid JSON. |
| `text that is not valid UTF-8` | A string a DataStore rejects. |
| `both named and numbered keys` | `{ 1, 2, Name = "x" }` encodes to `[1,2]`. The string key is lost with no error. |
| `gaps in its numbering` | `{ [1] = "a", [3] = "b" }` comes back with string keys. |
| `an index that is not a whole number from one` | A fractional or zero-based index. |

A key that is neither a string nor a number is reported by its own type name.

The path is dotted, such as `Stats.Wins`. It is empty text when the offender is
the value handed in, so test the first return against `nil` rather than for
emptiness.

The last three faults are silent losses rather than failed saves, which is why
they are worth naming before the write.

**Example**

```luau
local where, what = Serialize.FindUnstorable(data)

if where then
	logger:Warn(`{where} holds {what}`)
end
```

## This is not run for you

[`Data`](/reference/data/) does not encode on your behalf. It would then have to
guess on the way back out, and a save that quietly rewrites what you handed it
is worse than one that refuses.

`Data.Edit` runs `FindUnstorable`, answers
[`"unsupported"`](/reference/data/#outcome), and sends you here.

## Serialize or Compress

The two answer different questions.

| | `Serialize` | [`Compress`](/reference/compress/) |
| :--- | :--- | :--- |
| Result | Readable, exact | Opaque, smaller |
| Lossy | No | Yes, in named ways |
| Reach for it when | A person or another system reads the field | Only size matters |
