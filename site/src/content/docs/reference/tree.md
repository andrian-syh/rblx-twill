---
title: Tree
description: Instances described as data and built in one pass.
---

```luau
local Tree = require("@game/ReplicatedStorage/Twill/Tree")

local root, refs = Tree.Build({
	ClassName = "Frame",
	Name = "HUD",
	Size = UDim2.fromScale(1, 1),
	Attributes = { Opacity = 0.5 },
	Children = {
		{
			ClassName = "TextLabel",
			Ref = "Title",
			Text = "Hello",
		},
	},
}, playerGui)

refs.Title.Text = "Ready"
```

## Specs

A spec is one table per instance. Keys hold properties, so a spec reads like the
`Instance` it becomes.

Six keys are reserved for structure and are never written as properties.

```luau
export type Spec = {
	ClassName: string,
	Name: string?,
	Ref: string?,
	Attributes: { [string]: any }?,
	Events: { [string]: (...any) -> () }?,
	Children: { Spec }?,
	[string]: any,
}
```

| Key | Meaning |
| --- | --- |
| `ClassName` | The kind of instance to create. The only required key. |
| `Name` | What the instance is called. |
| `Children` | A list of further specs, built below this one. |
| `Attributes` | Written with `SetAttribute`, after the properties. |
| `Events` | Signal names mapped to callbacks. Connected after the properties. |
| `Ref` | A name this instance is handed back under. |

## The order things happen

Properties are written first, then attributes, then events are connected, and
children are built last.

That order buys one useful guarantee: **an initial property write never fires
your own handler**, because nothing is connected while those writes happen. A
`GetPropertyChangedSignal` handler passed through `Events` hears only the changes
you make afterwards.

:::caution[A handler that runs at once will not see the children]
Events are connected before the children exist. That is fine for interaction
handlers, which run long after the build, but a handler that could fire
immediately should not assume the rest of the tree is there yet.
:::

## API

### `Tree.Build`

`[Server]` | `[Client]`

Builds an instance tree from a spec, and hands back the pieces worth keeping hold
of.

```luau
function Tree.Build(spec: Spec, parent: Instance?): (Instance, { [string]: Instance })
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `spec` | `Spec` | Describes the root instance and everything under it. |
| `parent` | `Instance?` | Where the root goes. Left unparented when omitted. |

**Returns**

`Instance` - The root of the finished tree.

`{ [string]: Instance }` - Every instance that asked for a `Ref`, by that name,
however deep in the tree it sat.

Throws when a spec anywhere in the tree has no `ClassName`.

Parenting is the last thing done, so the tree arrives complete rather than being
watched as it assembles. A tree that fails partway leaves nothing behind in the
world, because nothing was parented outward yet.

One spec may be built many times, into several places at once.

**Example**

```luau
local root, refs = Tree.Build({
	ClassName = "Frame",
	Name = "CoinCounter",
	Size = UDim2.fromOffset(180, 40),
	BackgroundTransparency = 0.3,

	Children = {
		{
			ClassName = "TextLabel",
			-- Named here so it can be updated without searching for it later.
			Ref = "Amount",
			Size = UDim2.fromScale(1, 1),
			Text = "0",
		},
		{
			ClassName = "TextButton",
			Text = "Collect",
			Events = {
				Activated = onCollect,
			},
		},
	},
}, playerGui)

-- Refs are collected from the whole tree, so this reaches a nested label
-- without a chain of FindFirstChild calls.
Twill.Replication.Subscribe("Data.Coins", function(coins)
	refs.Amount.Text = Twill.Format.Comma(coins or 0)
end)
```

## Connections

`Events` connections are **not** owned by a bag. Destroying the root instance
disconnects them, which for UI parented to a `PlayerGui` is enough, since Roblox
removes it with the player.

For anything longer-lived, or anything parented into the world, put the root in a
[`Scope`](/reference/scope/) bag:

```luau
local root = Tree.Build(spec, workspace)
bag:Add(root)
```

## What this is not

`Tree` builds instances once. It does not re-render them when your state moves,
and it holds no view state of its own. Follow a value by subscribing to it and
writing through a `Ref`, as above, or bring a UI library if you want
reconciliation. Twill stays out of the way either way.
