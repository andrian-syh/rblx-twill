---
title: Schema
description: Declarative checks for values that came from somewhere else
---

```luau
local Schema = require("@game/ReplicatedStorage/Twill").Schema

local ok, reason = Schema.Check(payload.Name, { "string", 1, 20 })

if not ok then
	return refuse(reason)
end
```

Nothing here raises. A value that does not match is a `false` answer, and so is a
rule that is itself malformed.

## Rules

A rule is a type name, or a table whose first entry is a type name and whose
later entries constrain it.

```luau
"string"                          -- any string
{ "string", 1, 20 }               -- between 1 and 20 characters
{ "number", 0, 100 }              -- between 0 and 100
{ "integer", 1 }                  -- whole, at least 1
{ "enum", "red", "green" }        -- one of these values
{ "array", "number" }             -- a real array of numbers
{ "object", { Coins = "number" } }
{ "optional", { "string", 1, 20 } }
```

| Kind | Constrained by |
| :--- | :--- |
| `number` | A low and a high, both optional. |
| `integer` | The same, and the value must be whole. |
| `string` | A low and a high, applied to its length. |
| `enum` | The values listed after it. |
| `array` | The rule every element must satisfy. |
| `object` | A table of field names to rules. |
| `optional` | The rule to apply when the value is not `nil`. |
| `boolean` `table` `function` `thread` `userdata` `nil` | Nothing further. |

Any Roblox type name works as a kind: `Vector3`, `Color3`, `Instance`,
`EnumItem`. Luau kinds are matched with `type`, and the rest with `typeof`.

## What no number rule admits

NaN and infinity fail every number and integer rule, before any range is
considered. Neither survives a DataStore, so a value that reached a schema on its
way to storage is refused here rather than at the save.

## Objects check what they name

An `object` rule checks the fields it lists and ignores the rest. It reads as a
contract for what the caller uses, not a wall against everything else.

```luau
{ "object", { Coins = "number", Name = { "string", 1, 20 } } }
```

A payload carrying extra fields passes. To refuse those, check them explicitly.

Fields are checked in table order, which is not defined. A value failing two
rules is reported against whichever was reached first.

## Arrays must be arrays

An `array` rule counts the table's entries and compares that count with its
length. A table with a gap, or with any named key, is not an array and fails
before its elements are looked at.

## API

### `Schema.Validate`

`[Server]` | `[Client]`

Answers whether a value satisfies a rule.

```luau
function Schema.Validate(value: any, rule: Rule): boolean
```

For callers that read no reason. Use `Check` when the reason is going somewhere.

### `Schema.Check`

`[Server]` | `[Client]`

Answers whether a value satisfies a rule, naming the position that failed.

```luau
function Schema.Check(value: any, rule: Rule): (boolean, string?)
```

**Returns**

`boolean` - `false` for anything the rule does not admit.

`string?` - Why it failed, naming the offending position.

Checking stops at the first mismatch, so the reason names one position rather
than listing every problem.

### `Rule`

```luau
export type Rule = string | { [string]: any }
```

## Messages

The position is `value` at the top level, and a path below it: `value.Coins`,
`value.Items[3]`, `value.Stats.Wins`.

| Reason | Raised by |
| :--- | :--- |
| `value should be a number` | Wrong type, or a whole number rule given a fraction. |
| `value should be a real number` | NaN or infinity. |
| `value is below the allowed minimum` | Under the low bound. |
| `value is above the allowed maximum` | Over the high bound. |
| `value is too short` | A string under its length bound. |
| `value is too long` | A string over its length bound. |
| `value is not one of the allowed values` | An `enum` rule matching nothing. |
| `value should be an array` | Not a table, or a table that is not a real array. |
| `value should be a table` | An `object` rule given something else. |
| `value has an invalid rule` | The rule itself is malformed. |

## Where Twill uses this

[`Net.Handle`](/reference/net/#schema) applies a list of rules positionally to a
remote's arguments, after the wire types have already guaranteed the argument
types. Use it for shapes and ranges a wire type cannot express.
