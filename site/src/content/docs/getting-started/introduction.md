---
title: An introduction to Twill
description: What Twill is, who it is for, and the limits it draws on purpose.
---

Every Roblox game rebuilds the same foundation: a boot order, remotes that cannot
be abused, state that reaches the client, data that survives the session.

Twill is that foundation, written once and running on both sides of the game. It
covers boot order, networking, replication, player data, monetisation,
permissions, and an admin console.

It is **not** a gameplay kit and **not** a reactive UI layer. Twill gives you no
character controller, no combat, no camera, and no input handling, and it does
not bind state to your interface for you. That half stays yours, and that is
deliberate.

## What it looks like

A service is a `ModuleScript` that returns a table. Twill finds it, boots it, and
hands it each player once their saved data exists.

```luau title="ServerScriptService/Services/ShopService"
local ShopService = {}

function ShopService.OnPlayerReady(player, data, bag)
	-- `data` is the live profile. Mutate it and it saves on its own.
	data.Visits += 1

	-- `bag` closes when the player leaves, so this is never left behind.
	bag:Connect(player.Chatted, onChatted)
end

return ShopService
```

## Both sides, one install

Most of Twill runs on the client as readily as on the server.
[`Lifecycle`](/reference/lifecycle/) boots it there and keeps a separate list,
[`Replication`](/reference/replication/) gives it the receiving half,
[`Tree`](/reference/tree/) builds its screens in a single pass, and
[`Scope`](/reference/scope/) closes whatever it started.

A module stays on the server only where what it holds would tell a client how to
get around it: saved data, purchases, text filtering, unpredictable draws, signed
tokens. Naming one from a client fails at the require rather than handing back a
`nil` that surfaces somewhere else later. The
[module reference](/reference/) marks which is which.

What Twill does not supply on the client is a view layer. `Tree` builds instances
in one pass; it does not re-render them when your state moves. Pair it with a
subscription, or bring a UI library, and Twill stays out of the way either way.

## Who it is for

Twill assumes your game has to remember things. Progress that survives a session,
remotes that strangers will eventually probe, state the client has to be told
about, and a growing pile of systems that all have to start in the right order
and stop cleanly when a player leaves.

If you have built that scaffolding before, you know it never gets more
interesting the second time, and that the bugs it produces arrive late, in
production, and in somebody's save file. Twill is the version you do not write
again.

It fits less well if you want a ready-made gameplay kit, or if your project is
small enough that one `Script` already settles it.

## What sets it apart

**Safe defaults you cannot forget.** Every remote served through `Net.Handle` is
metered from its first line. A rate limit is not an option you can leave off. The
server half is never replicated, so thresholds, the metering algorithm, and each
player's allowance cannot be studied by anyone.

**Every module stands alone.** You can use `Twill.Log` and nothing else. Only
`Lifecycle` is a framework in the strict sense; the rest are libraries you call.

**Failures are loud.** A critical service that fails to boot refuses players
rather than serving a half-broken game. Data that fails to load kicks the player
rather than opening a session that would erase their progress. `Filter` answers
`nil` when the filter cannot be reached, never the text that went in.

**Cleanup has an owner.** No connection inside Twill is left out of a bag.
`Scope` gives three lifetimes, player, character, and alive, and closes them for
you.

## No toolchain, and no opinion about yours

Installing Twill requires nothing: no package manager, no build step, no external
tooling. It is two folders you drop into a place, and every dependency is
bundled, so what you open is what runs.

That is a statement about what is **required**, not about how you are expected to
work. A great deal of Roblox development happens entirely inside Studio, and a
framework that demands a filesystem workflow is not available to those people at
all.

### It follows the place, not the folder

Every require Twill makes resolves against the DataModel rather than the
filesystem, using the prefixes the engine itself provides: `@game` from the root,
`./` and `../` from the script, and `@self` for a script's own children. No alias
configuration is involved anywhere.

The consequence is that Twill neither knows nor cares how a place was assembled.
Build it by hand in Studio, edit it as files through an external editor, or
generate it from a source tree with whatever tooling you keep. If the result puts
`Twill` in `ReplicatedStorage` and `TwillServer` in `ServerScriptService`, it
runs, and not one line of it changes.

:::note[Installed by hand for now]
No source tree or project file is published alongside Twill yet, so working from
files means lifting the two folders out of a place yourself. Updating a bundled
package is a manual job for the same reason. See
[Bundled packages](/reference/bundled-packages/).
:::

## The shape of the code

Twill's own modules follow one layout: variables, then functions, then
initialisation. Public functions carry a documentation block, and the block says
what the function is for rather than how it works.

Every module opens with a header explaining what it does, why it exists, and
what it deliberately does not do. Much of this documentation is drawn from those
headers, because they were written first and they are what the code is checked
against.

## Status

**v1.6.1.** The API is stable, and where one does move, the
[changelog](https://github.com/andrian-syh/rblx-twill/blob/main/CHANGELOG.md)
carries a Migration section saying exactly what to rewrite. A major version is
reserved for a release that reshapes how the framework works rather than for any
single change.

`Twill.Version` reports the version the installed copy carries, which is the
quickest way to tell what a place is actually running.

Every bundled dependency is traced and licensed; see
[Bundled packages](/reference/bundled-packages/).

## Next

[Install Twill](/getting-started/installation/) puts both folders in place.
