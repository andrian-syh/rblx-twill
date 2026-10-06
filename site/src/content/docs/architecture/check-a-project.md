---
title: Check a project
description: Run one script in the command bar to list where a place breaks the Weave rules
---

The check reads the place open in Studio and lists each place a rule is broken,
by rule number. Run it before a commit, and after a merge. It changes nothing.

It runs in the Studio command bar, because only the command bar and plugins can
read the source of a script.

## Run it

1. Open **View → Command Bar**.
2. Paste the script below and press **Enter**.
3. Read the **Output** window.

```luau
local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local VENDOR = { Twill = true, Packages = true, ServerPackages = true }
local ROOTS = {
	ServerScriptService,
	ReplicatedStorage,
	game:GetService("ServerStorage"),
	game:GetService("ReplicatedFirst"),
	game:GetService("StarterPlayer"),
	game:GetService("StarterGui"),
	game:GetService("StarterPack"),
	workspace,
}

local findings = {}

local function report(rule, instance, message)
	table.insert(findings, `{rule}  {instance:GetFullName()}: {message}`)
end

local function vendored(instance)
	local parent = instance
	while parent and parent ~= game do
		if VENDOR[parent.Name] and parent.Parent and parent.Parent.Parent == game then
			return true
		end
		parent = parent.Parent
	end
	return false
end

local function entryPoint(instance)
	return (instance.Name == "Main" and instance.Parent == ServerScriptService)
		or (instance.Name == "Client" and instance.Parent.Name == "StarterPlayerScripts")
		or instance:FindFirstAncestorWhichIsA("Actor") ~= nil
		or instance:FindFirstAncestorWhichIsA("Tool") ~= nil
		or instance:FindFirstAncestor("Loading") ~= nil
end

local function feature(instance, modules)
	local parent = instance
	while parent.Parent ~= modules do
		parent = parent.Parent
	end
	return parent.Name
end

local function checkSource(instance, bootFolders, moduleFolders)
	local source = "\n" .. instance.Source:gsub("typeof%b()", "")

	if instance:IsDescendantOf(ReplicatedStorage) then
		if source:find("ServerScriptService") or source:find("ServerStorage") then
			report("R2 ", instance, "replicated code names a server container")
		end
	end

	local shared = ReplicatedStorage:FindFirstChild("Shared")
	if shared and instance:IsDescendantOf(shared) and source:find("Client%.[CM]o") then
		report("R3 ", instance, "Shared requires feature code")
	end

	local own
	for _, modules in moduleFolders do
		if instance:IsDescendantOf(modules) then
			own = feature(instance, modules)
		end
	end

	for _, boot in bootFolders do
		if instance.Parent == boot then
			own = instance.Name:gsub("Service$", ""):gsub("Controller$", "")
			if source:find("\nlocal [^\n]-= require%(script%.Parent%.") then
				report("R5 ", instance, "requires a sibling entry at load; fetch it in Start")
			end
		end
		if source:find("\nlocal [^\n]-= require%([^\n]-%f[%w]" .. boot.Name .. "%.%w") then
			report("R5 ", instance, `requires an entry in {boot.Name} at load; fetch it in Start`)
		end
	end

	for other in source:gmatch("%f[%w]Modules%.(%w+)") do
		if own and other ~= own then
			report("R4 ", instance, `reaches into Modules.{other}, which belongs to another feature`)
		end
	end
end

local bootFolders, moduleFolders = {}, {}
local client = ReplicatedStorage:FindFirstChild("Client")
for _, side in { { ServerScriptService, "Services" }, { client, "Controllers" } } do
	local boot = side[1] and side[1]:FindFirstChild(side[2])
	local modules = side[1] and side[1]:FindFirstChild("Modules")
	if boot then
		table.insert(bootFolders, boot)
		for _, child in boot:GetChildren() do
			if not child:IsA("ModuleScript") then
				report("R12", child, "a boot folder holds ModuleScripts only")
			end
		end
	end
	if modules then
		table.insert(moduleFolders, modules)
	end
end

for _, root in ROOTS do
	for _, instance in root:GetDescendants() do
		if not instance:IsA("LuaSourceContainer") or vendored(instance) then
			continue
		end

		local entry = entryPoint(instance)
		if not instance:IsA("ModuleScript") and not entry then
			report("R1 ", instance, `{instance.ClassName} outside the two entry points`)
		end
		if #instance:GetChildren() > 0 then
			report("R12", instance, "a script has children")
		end
		if instance.Name:lower() == "init" or instance.Name:find("[^%w_]") then
			report("R12", instance, "the name is not safe for every sync tool")
		end
		if #CollectionService:GetTags(instance) > 0 or next(instance:GetAttributes()) then
			report("R12", instance, "a script carries a tag or an attribute")
		end
		if not entry and not instance.Parent:IsA("Folder") and instance.Parent.Parent ~= game then
			report("R12", instance, "a script sits under an instance that is not a Folder")
		end
		for _, sibling in instance.Parent:GetChildren() do
			if sibling ~= instance and sibling.Name:lower() == instance.Name:lower() then
				report("R12", instance, "a sibling has the same name")
				break
			end
		end

		checkSource(instance, bootFolders, moduleFolders)
	end
end

table.sort(findings)
for _, finding in findings do
	warn(finding)
end
print(`Weave check: {#findings} finding(s)`)
```

A place that follows the rules prints one line:

```text
Weave check: 0 finding(s)
```

## Read a finding

Each finding is a warning with the rule, the script, and what was found:

```text
R4   ServerScriptService.Services.ShopService: reaches into Modules.Coin, which belongs to another feature
```

| Finding | Rule | Fix |
| :--- | :--- | :--- |
| `Script outside the two entry points` | [R1](/architecture/rules/#r1-one-script-and-one-localscript) | Move the code into a `ModuleScript` that an entry requires. |
| `replicated code names a server container` | [R2](/architecture/rules/#r2-replicated-code-never-names-a-server-container) | Move the code to `ServerScriptService`, or remove the reference. |
| `Shared requires feature code` | [R3](/architecture/rules/#r3-shared-holds-no-state-and-requires-no-feature) | Move the module into the feature that needs it. |
| `reaches into Modules.<Feature>` | [R4](/architecture/rules/#r4-reach-a-feature-through-its-entry) | Call a function on that feature's entry. |
| `requires a sibling entry at load` | [R5](/architecture/rules/#r5-entries-never-require-each-other) | Fetch the entry in `Start`. |
| `a script has children` and the other layout findings | [R12](/architecture/rules/#r12-the-layout-is-safe-for-every-sync-tool) | Move the child into a `Folder` beside the script, or rename. |

## What it skips

- Everything under `Twill`, `Packages`, and `ServerPackages`, when those sit
  directly in a service.
- A script under an `Actor`, a `Tool`, or an instance named `Loading`.

## What it cannot see

The check matches text. It finds a `require` written as a path, and it does not
follow a path built at run time or kept in a variable. A comment that names
`ServerStorage` in a replicated script is reported, because a comment and code
look the same to it.

It does not check R6 to R11. Whether one owner writes a field, and whether a
connection has an owner, depend on what the code means. Those are for review:
the [project README](/architecture/project-readme/) lists five questions to
answer before a commit.

## Extend it

To skip another vendored folder, add its name to `VENDOR`. To add a rule of your
own, add a `report` call inside the loop, with a number outside R1 to R12 so it
is never mistaken for a Weave rule.
