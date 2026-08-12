---
title: Serialize
description: Roblox values in a shape a DataStore will accept.
---

```luau
data.Home = Serialize.Encode(spawnPoint.Position)
-- ...
local home = Serialize.Decode(data.Home)
```

For the patterns and the shapes that fail quietly, see
[Store Roblox values safely](/guides/storing-roblox-values/).

## The problem

A DataStore holds JSON and nothing else, so a `Vector3`, a `CFrame`, or a
`Color3` written straight into player data fails the save.

It fails late and it fails quietly. The value is passed along by reference at
every step without complaint, and survives all the way to the write itself.

## What Encode does

`Encode` walks a whole tree and replaces what it recognises with plain tables
marked by a type field. `Decode` puts them back.

Anything it does not recognise is returned untouched, so running either over
ordinary data costs a walk and changes nothing.

Recognised: `Vector3`, `Vector2`, `CFrame`, `Color3`, `UDim`, `UDim2`,
`BrickColor`, `NumberRange`, and `EnumItem`.

### Why the shape looks the way it does

The encoded form keeps its numbers in a **nested array** rather than alongside
the type field.

A table holding both array keys and string keys is exactly what a DataStore
cannot round-trip: the numbers come back as the strings `"1"`, `"2"`, `"3"`, and
every decoder reads `nil`. The encoded shape avoids the very fault
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

Data that was never encoded passes through unchanged, so this is safe to run over
a mix of both without knowing which is which.

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

Clean means storable **as it stands**, without encoding. It refuses five things:

| Refused | Why |
| --- | --- |
| Userdata a DataStore cannot hold | `Vector3`, `CFrame`, and friends. Encode them. |
| NaN and infinity | Neither is valid JSON. |
| Invalid UTF-8 | A DataStore rejects the write. |
| Mixed named and numbered keys | `{ 1, 2, Name = "x" }` encodes to `[1,2]`. The string key is **lost with no error**. |
| Gaps in a numbering | `{ [1] = "a", [3] = "b" }` comes back with string keys. |

The last two are silent losses rather than failed saves, which is why they are
worth naming before the write rather than discovering afterwards.

**Example**

```luau
local where, what = Serialize.FindUnstorable(data)

if where then
	logger:Warn(`{where} holds {what}`)
end
```

## This is not run for you

[`Data`](/reference/data/) does not encode on your behalf. It would then have to
guess on the way back out, and a save that quietly rewrites what you handed it is
worse than one that refuses.

`Data.Edit` runs `FindUnstorable`, answers
[`"unsupported"`](/reference/data/#outcome), and sends you here.

## Serialize or Compress

The two answer different questions.

| | [`Serialize`](/reference/serialize/) | [`Compress`](/reference/compress/) |
| --- | --- | --- |
| Result | Readable, exact | Opaque, smaller |
| Lossy | No | Yes, in named ways |
| Reach for it when | A person or another system reads the field | Only size matters |
