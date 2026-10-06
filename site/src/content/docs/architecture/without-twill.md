---
title: Use Weave without Twill
description: Keep the folder map and the rules on another framework, another library, or none
---

The folder map and the twelve rules name no Twill function. Twill fills one
layer, the foundation, and this guide replaces that layer.

It applies when a project uses another framework, a set of separate libraries,
or plain modules.

## What the foundation must supply

| Need | Twill supplies | Without Twill |
| :--- | :--- | :--- |
| Boot in two phases, in a stable order | `Lifecycle.Start` | The loader below |
| Reach another entry | `Lifecycle.Get` | A `require` inside `Start` |
| Saved data with a session lock | `Data` | A data-store library, behind one service |
| Remotes with types, a rate, and a schema | `Net` | A networking library, or a wrapper that validates |
| State sent one way to clients | `Replication` | A state library, or attributes set by the server |
| Cleanup by lifetime | `Scope`, `Bag` | A cleanup library, or a table of connections per player |

Each row is a need from a rule. A foundation that leaves a row empty leaves the
rule to be kept by hand.

## A loader

This replaces the body of `Main`. It requires every entry, runs each `Init` in
name order, then runs each `Start` on its own thread.

```luau title="ServerScriptService/Main"
local ServerScriptService = game:GetService("ServerScriptService")

local folder = ServerScriptService.Services

local modules = {}
for _, child in folder:GetChildren() do
	if child:IsA("ModuleScript") then
		table.insert(modules, child)
	end
end
table.sort(modules, function(first, second)
	return first.Name < second.Name
end)

local entries = {}
for index, module in modules do
	entries[index] = require(module)
end

for _, entry in entries do
	if entry.Init then
		entry.Init()
	end
end

for _, entry in entries do
	if entry.Start then
		task.spawn(entry.Start)
	end
end
```

For the client, use the same code in the `Client` local script with
`folder` set to `ReplicatedStorage:WaitForChild("Client"):WaitForChild("Controllers")`.

The loader has no player gate. Give the data service a `Start` that connects
`PlayerAdded`, and have it call the other entries once a player's data exists.

## Reach another entry

With no registry, an entry requires the other entry inside `Start`. By then
every module has loaded, so two entries can use each other.

```luau
local CoinService: typeof(require(script.Parent.CoinService))

function ShopService.Start()
	CoinService = require(script.Parent.CoinService)
end
```

This keeps [R5](/architecture/rules/#r5-entries-never-require-each-other): no
entry requires another while it loads.

## Where other tools fit

| Tool | Place in Weave |
| :--- | :--- |
| Services and controllers written as plain modules | `Services` and `Client/Controllers`, booted by the loader. |
| Flamework | The same folders in Studio, built from your source tree. Constructor injection takes the place of `Lifecycle.Get`. It needs roblox-ts and a sync tool. |
| An ECS library, such as Matter or jecs | Inside one feature. The entry owns the world and the schedule, and the systems live in `Modules/<Feature>`. Saved data still goes through its owner. |
| Fusion, React Lua, or Vide | Components in `Client/Modules/<Feature>`, mounted by the controller, fed from replicated state. The interface is never the source of a value. |
| ProfileStore or another data library | Behind one data service, which is the only code that touches a profile. |
| A schema compiler, such as Zap or Blink | The schema takes the place of `Shared/Remotes`. It adds a build step. |
| Third-party packages | `ReplicatedStorage/Packages` and `ServerScriptService/ServerPackages`. |

## What stays the same

All twelve rules, the folder names, the feature naming, the
[check](/architecture/check-a-project/), and the `README`. In the `README`,
change the `Foundation` line under Status, and the example in R5.
