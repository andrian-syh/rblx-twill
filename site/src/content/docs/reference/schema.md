---
title: Schema
description: Declarative checks for values you did not write.
---

```luau
local ok = Schema.Validate(payload.Count, { "number", 0, 10^6 })

local ok, reason = Schema.Check(player.Name, { "string", 1, 20 })
if not ok then
	logger:Warn(reason)
end
```

`Validate` answers true or false. `Check` says why when it is false. They share
one engine, so the rule language is identical.

**Nothing here throws.** A rule that does not match is a false answer, not an
error, and a rule that is itself malformed is a failed check rather than a throw.
A mistake in a rule cannot take down the caller reading it.

## Rules

A rule is a type name, or a table that constrains one.

```luau
export type Rule = string | { [string]: any }
```

The bare type names are the kinds `type` and `typeof` know: `string`, `number`,
`integer`, `boolean`, `table`, `function`, `Instance`, `EnumItem`, `Vector3`, and
so on.

| Rule | Passes when |
| --- | --- |
| `{ "number", min, max }` | A number inside the range. Either bound may be omitted. |
| `{ "integer", min, max }` | A whole number inside the range. |
| `{ "string", min, max }` | Text within a character count. |
| `{ "enum", a, b, c }` | The value is one of the listed ones. |
| `{ "array", itemRule }` | Every element passes `itemRule`. |
| `{ "object", fieldRules }` | Every declared field passes its rule. |
| `{ "optional", rule }` | `nil` passes. Otherwise `rule` applies. |

Rules nest, so one rule can describe a whole payload.

```luau
local rule = {
	"object",
	{
		Name = { "string", 1, 20 },
		Level = { "integer", 1, 100 },
		Tags = { "array", "string" },
		Note = { "optional", { "string", 0, 200 } },
	},
}
```

## Two rules worth knowing

**NaN and infinity pass no number rule.** Neither survives a DataStore, so a
value that would be lost on the next save is refused here instead. This applies
to an unbounded `"number"` rule as well, not only to a ranged one.

**An array rule means a real array.** A table holding anything other than the
keys `1..n` is refused rather than read as an empty one. `{ a = 1 }` has a length
of zero and would otherwise pass every array rule ever written.

## Objects are contracts, not walls

Unknown fields are not checked. An `"object"` rule reads as a statement about
what you use, never a refusal of everything else.

Add `"optional"` where a field may be absent. `nil` passes only there.

## API

### `Schema.Validate`

`[Server]` | `[Client]`

Answers whether a value satisfies a rule.

```luau
function Schema.Validate(value: any, rule: Rule): boolean
```

**Returns**

`boolean` - False for anything the rule does not admit.

Use this where the answer decides something and nobody reads a reason. Use
[`Check`](#schemacheck) where a refusal is worth reporting.

### `Schema.Check`

`[Server]` | `[Client]`

Answers whether a value satisfies a rule, saying why when it does not.

```luau
function Schema.Check(value: any, rule: Rule): (boolean, string?)
```

**Returns**

`boolean` - False for anything the rule does not admit.

`string?` - Why it failed, naming the position that failed. `nil` when it passed.

Checking stops at the first mismatch, and the reason names where it sat, which is
what makes a refusal on nested data worth logging rather than merely counting.

```text
Stats.Coins should be a whole number
```

**Example**

```luau
local ok, reason = Schema.Check(payload, {
	"object",
	{
		Slot = { "integer", 1, 9 },
		ItemId = { "string", 1, 40 },
	},
})

if not ok then
	-- The reason names the offending field, so one log line is enough to
	-- tell a malformed payload from a merely unexpected one.
	logger:Warn(`refused a loadout: {reason}`)
	return
end
```

## Use with Net

[`Net.Handle`](/reference/net/#schema) takes a list of these, applied positionally
to a packet's arguments.

```luau
Twill.Net.Handle(buy, onBuy, {
	Schema = {
		{ "string", 1, 40 },
		{ "integer", 1, 99 },
	},
})
```

Packet already guarantees the argument **types** at the wire level. A schema is
for everything a wire type cannot express: ranges, lengths, and shapes.
