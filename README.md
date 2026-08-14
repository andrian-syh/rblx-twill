# Twill

A modular framework for Roblox. Two folders, no build step, no package manager.

Twill gives you the parts most games rewrite from scratch, a boot sequence, player data,
guarded networking, and state replication, without asking you to adopt all of it. Every
module works on its own. Take the one you need and ignore the rest.

**[Read the documentation →](https://andrian-syh.github.io/rblx-twill/)**

> **v1.2.0.** The API is stable. Breaking changes wait for a major version, and
> everything documented is taken from the source.

## Why this exists

As of mid-2026 there is no maintained, monolithic framework for plain Luau.
[Knit](https://github.com/Sleitnick/Knit) was the standard and is now archived.
[Flamework](https://github.com/rbxts-flamework/core) is roblox-ts only. What the community
actually uses is a set of sharp, single-purpose libraries assembled by hand.

Twill does not try to reverse that. It supplies the one thing a pile of libraries cannot, a
boot order and a player pipeline, and otherwise stays out of the way. **Only `Lifecycle` is
a framework in the strict sense**, because it calls your code. Everything else is a library
you call.

That is deliberate. Knit was rejected largely for demanding total adoption. Twill asks for
none.

## Install

Twill installs in **two places**, and this is not optional. Server code must never sit in
`ReplicatedStorage`, where any client can read it.

```
ReplicatedStorage/
└── Twill/                  ← drop here

ServerScriptService/
└── TwillServer/            ← and here
```

Those two folders are the whole framework. Every dependency is bundled, so there is no
package manager, no build step, and nothing to configure. Every require resolves against
the place itself, so any workflow that produces one runs Twill unchanged.

## In one screen

`ServerScriptService/Main`, a `Script`:

```lua
local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Data.Configure({
    Store = "PlayerData",
    Version = 1,
    Template = { Coins = 0 },
})

Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)
Twill.Lifecycle.Start(script.Parent.Services)
```

A service, any `ModuleScript` under that `Services` folder:

```lua
local ShopService = {}

function ShopService.OnPlayerReady(player, data)
    data.Coins += 100
end

return ShopService
```

That is a server which loads player data, boots your services in a defined order, and
announces each player once their data exists.

The full walkthrough is the
[quick start](https://andrian-syh.github.io/rblx-twill/getting-started/quick-start/).

## What is included

| Group | Modules |
| --- | --- |
| **Core** | `Lifecycle`, `Net`, `Replication`, `Data`, `Scope`, `Log` |
| **Utilities** | `Schema`, `Limit`, `Loop`, `Watch`, `Format`, `Serialize`, `Compress`, `Tree`, `Error`, `BigNumber`, `Chance` |
| **Game systems** | `Authorization`, `Admin`, `Monetization`, `Leaderstats`, `Filter`, `Random`, `Token`, `Navigation` |

Each has a reference page carrying every signature taken from the source, and the side it
runs on marked on every member. See the
[module reference](https://andrian-syh.github.io/rblx-twill/reference/).

## What Twill does not do

No gameplay: no character controller, no combat, no camera, no input handling. No reactive
view layer, no ECS, and no state management for the client beyond receiving what the server
published.

These modules have opinions about infrastructure, which is a smaller and much more
transferable thing to be opinionated about.

## Licence

Twill's own code is **[MIT](LICENSE)**.

The bundled components keep their own licences, listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). None of them is copyleft, so none forces
a licence on your game or on Twill itself. What they do require is that their notices
travel with their code.

The one to know about is **ProfileStore, which is Apache-2.0**. Redistributing Twill with it
means shipping the Apache-2.0 licence text, keeping its notices intact, and stating any
modifications. Twill makes none.

---

Repository: <https://github.com/andrian-syh/rblx-twill> ·
Documentation: <https://andrian-syh.github.io/rblx-twill/> ·
Editing the docs site: [`site/README.md`](site/README.md)
