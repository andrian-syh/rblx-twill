---
title: Project README
description: The Weave rules as a module that lives in the place, for the people who work in it
---

This guide puts the rules inside the place, as a `ModuleScript` named `README`.
It applies to every Weave project. A person who opens the place in Studio then
has the map, the rules, and the project's own notes without leaving the editor.

The module holds one comment and returns an empty table. Nothing requires it.

## Add it

1. Add a `ModuleScript` named `README` in `ServerScriptService`.
2. Replace its contents with the text below.
3. Fill in the four lines under Status.

It sits in `ServerScriptService` so that it does not replicate, and outside
`Services` so that it does not boot.

```luau title="ServerScriptService/README"
--[[
	WEAVE 1.0.0
	The architecture of this project. Read it before you add or change code.

	Full documentation: https://andrian-syh.github.io/rblx-twill/architecture/overview/


	1. WHAT WEAVE PROTECTS

	Weave keeps three things true as the project grows:
	  - The server decides everything that matters, and a client cannot change it.
	  - Each piece of saved state has one owner, so one place validates every change.
	  - A feature is added by adding files. No central file grows with every feature.


	2. STATUS

	Fill these in for your project, and update them when they change.
	  Architecture   Weave 1.0.0
	  Foundation     Twill 2.1.1
	  Owner          (who decides on a change to these rules)
	  Reviewed       (the date these rules were last read against the code)


	3. MAP

	ReplicatedStorage
	  Twill              The foundation. Installed from a release. Never edited.
	  Shared             Declarations and pure functions both sides use.
	    Remotes          One ModuleScript per feature: what a client may ask.
	    <Feature>Catalog Public definitions of one feature.
	  Client
	    Controllers      One ModuleScript per feature. Each one boots.
	    Modules          Private client code, one Folder per feature.
	  Assets             Models, interfaces and sounds made in Studio.

	ServerScriptService
	  Twill              The server half of the foundation. Never edited.
	  Main               The only Script. Configures, then boots Services.
	  Services           One ModuleScript per feature. Each one boots.
	  Modules            Private server code, one Folder per feature.
	    PlayerData       The saved shape of a player. Names the owner of each field.
	  README             This file.

	ServerStorage
	  Assets             Templates only the server may see.

	StarterPlayer > StarterPlayerScripts
	  Client             The only LocalScript. Boots Controllers.

	Workspace            The world. No scripts. Behaviour binds through tags.

	One feature uses one name everywhere. A feature named Shop is ShopService,
	ShopController, Modules/Shop, Shared/Remotes/Shop and Shared/ShopCatalog. Search
	the Explorer for "Shop" to see all of it.

	Third-party packages go in ReplicatedStorage/Packages and
	ServerScriptService/ServerPackages. Create those folders when you need them.


	4. RULES

	Each rule has a fixed number. Use the number in reviews: "this breaks R4".

	R1   Keep one Script (Main) and one LocalScript (Client).
	     Why: the engine does not promise the order in which scripts start.
	     Also allowed: scripts under an Actor, under a Tool, and under
	     ReplicatedFirst/Loading.

	R2   Never name ServerScriptService or ServerStorage in replicated code, and
	     never put a secret in a replicated container.
	     Why: a client can read every script that replicates.
	     Secrets go in ServerScriptService/Modules/<Feature>.

	R3   Shared holds no state and requires no feature.
	     Why: each side loads its own copy, so state in Shared is never shared.

	R4   Reach another feature through its entry in Services or Controllers.
	     Never require Modules/<AnotherFeature>.
	     Why: private code can then change without breaking another feature.

	R5   Entries never require each other. Fetch another entry in Start:
	         CoinService = Twill.Lifecycle.Get("CoinService")
	     Why: two entries that require each other fail to load.

	R6   One owner writes each piece of saved state. Everyone else calls the owner.
	     Why: one function is then the only place a rule for that state can break.
	     The owner of each field is named in Modules/PlayerData.

	R7   A remote carries what the player wants, never the result. Each handler
	     checks shape, range, ownership and rate before it acts.
	     Why: a client can send any argument, at any rate.
	     Write "buy Sword", never "set my coins to 50".

	R8   State a client shows comes from replication, one way, from the server.
	     The server never waits for an answer from a client.
	     Why: a client that never answers would hold the server forever.

	R9   Init touches the module's own state and never yields. Everything that
	     reaches outward waits for Start.
	     Why: a yield in Init holds up every module after it.

	R10  A signal says what happened. To make something happen, call a function.
	     Why: a call can be found by reading the code. A listener cannot.

	R11  Everything created at run time has an owner that removes it: the player
	     bag from OnPlayerReady, a character bag, or the bag of a tagged instance.
	     Why: a connection nobody owns outlives the thing it served.

	R12  Keep the layout safe for every sync tool: scripts have no children, no
	     script is named "init", names use letters, digits and "_" only, siblings
	     differ by more than letter case, and scripts carry no tags or attributes.
	     Why: each sync tool writes those cases to disk differently.


	5. WHERE THINGS GO

	I want to...                                 Go to
	Add a feature                                Section 6
	Let a client ask for something               Shared/Remotes/<Feature>
	Save a field for each player                 Modules/PlayerData, then name its owner
	Show a saved field to its player             The Replicate list in Modules/PlayerData
	Add an item, a level or an enemy             Shared/<Feature>Catalog
	Keep a number secret from clients            ServerScriptService/Modules/<Feature>
	Write logic that is worth testing            Modules/<Feature>, as a pure function
	Use another feature                          Twill.Lifecycle.Get, from Start
	Give behaviour to an object in the world     A tag, then Twill.Watch.Tagged
	Add a model, an interface or a sound         Assets


	6. ADD A FEATURE

	The documentation page "Add a feature" builds one feature in full.

	1. Name the state the feature owns. If the state has an owner, call that owner.
	2. Declare what a client may ask for in Shared/Remotes/<Feature>, with the
	   narrowest types.
	3. Add public definitions to Shared/<Feature>Catalog, if the feature has any.
	4. Add <Feature>Service to Services. Serve each remote from Start with a Rate
	   and a Schema. Validate, then call the owner of the state.
	5. Add saved fields to Modules/PlayerData, and name their owner there.
	6. Add <Feature>Controller to Client/Controllers. Subscribe to replicated state
	   and send requests. A controller never decides an outcome.
	7. Tag the world objects the feature uses, and list them in section 9.
	8. Run the check in section 7, then play with two clients.

	No step edits a file that belongs to another feature.


	7. BEFORE YOU COMMIT

	Run the Weave check. Copy the script from the documentation page "Check a
	project" into the Studio command bar. It lists each finding by rule number.

	Then answer each question with yes:
	  - Does the server decide every outcome this change adds?
	  - Does every remote this change adds have a Rate and a Schema?
	  - Does every write go through the owner of that state?
	  - Is everything this change creates at run time put in a bag?
	  - Did you play it with two clients?


	8. NEVER

	  - Never edit either Twill module. Replace both from one release.
	  - Never put a Script or a LocalScript on a part, a model or an interface.
	  - Never put a data module in Services or Controllers. Everything there boots.
	  - Never send state to a client through a remote.
	  - Never trust a value because your own controller sent it.


	9. WORLD CONTRACT

	List every tag and attribute that code reads. A builder then knows what the
	code expects without reading the code.

	Tag              On                  Attributes          Read by
	(none)


	10. WITHOUT TWILL

	The map and the rules do not depend on Twill. To use another foundation,
	replace the two Twill modules, Main and Client. The documentation page
	"Use Weave without Twill" gives a loader and the mapping.
]]

return {}
```

## Keep it true

Three parts belong to your project, and change with it.

| Part | Update it when |
| :--- | :--- |
| Status | The foundation is upgraded, the owner changes, or the rules are reviewed. |
| Never | The team agrees a prohibition of its own. Add it to the list. |
| World contract | Code starts or stops reading a tag or an attribute. |

Leave the map and rules R1 to R12 as they are. A project that departs from a
rule records the departure under the rule, with the reason, and keeps the
number.

A rule of your own takes a number outside R1 to R12, such as `P1`, so nobody
mistakes it for a Weave rule.
