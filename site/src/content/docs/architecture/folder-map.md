---
title: Folder map
description: Every folder in a Weave project, what it holds, and who can read it
---

```text
ReplicatedStorage
├── Twill
├── Shared
│   ├── Remotes
│   │   └── Shop
│   └── ShopCatalog
├── Client
│   ├── Controllers
│   │   └── ShopController
│   └── Modules
│       └── Shop
│           └── ShopView
└── Assets

ServerScriptService
├── Twill
├── Main
├── Services
│   ├── CoinService
│   └── ShopService
├── Modules
│   ├── PlayerData
│   └── Shop
│       └── Pricing
└── README

ServerStorage
└── Assets

StarterPlayer
└── StarterPlayerScripts
    └── Client
```

## ReplicatedStorage

Every client can read everything here, whether or not the client runs it.

| Location | Class | Holds |
| :--- | :--- | :--- |
| `Twill` | `ModuleScript` | The shared half of the foundation. Installed from a release and never edited. |
| `Shared` | `Folder` | Declarations and pure functions both sides require. No state. |
| `Shared/Remotes` | `Folder` | One `ModuleScript` per feature, declaring what a client may ask. |
| `Shared/<Feature>Catalog` | `ModuleScript` | The public definitions of one feature: items, levels, names. |
| `Client` | `Folder` | All client code. |
| `Client/Controllers` | `Folder` | One `ModuleScript` per feature. `Lifecycle` boots every one. |
| `Client/Modules` | `Folder` | Private client code, in one `Folder` per feature. |
| `Assets` | `Folder` | Models, interfaces, and sounds made in Studio that both sides use. |
| `Packages` | `Folder` | Third-party packages both sides use. Create it when the first one arrives. |

## ServerScriptService

No client can read anything here.

| Location | Class | Holds |
| :--- | :--- | :--- |
| `Twill` | `ModuleScript` | The server half of the foundation. Never edited. |
| `Main` | `Script` | The server composition root. Configures the foundation, then boots `Services`. |
| `Services` | `Folder` | One `ModuleScript` per feature. `Lifecycle` boots every one. |
| `Modules` | `Folder` | Private server code and secret definitions, in one `Folder` per feature. |
| `Modules/PlayerData` | `ModuleScript` | The saved shape of a player, and the owner of each field. |
| `README` | `ModuleScript` | The rules, written for the people who work in the place. |
| `ServerPackages` | `Folder` | Third-party packages only the server uses. Create it when the first one arrives. |

## Other containers

| Location | Class | Holds |
| :--- | :--- | :--- |
| `ServerStorage/Assets` | `Folder` | Templates only the server may see. |
| `StarterPlayerScripts/Client` | `LocalScript` | The client composition root. Boots `Client/Controllers`. |
| `StarterGui` | | Interfaces made in Studio. No scripts. |
| `Workspace` | | The world. No scripts. Behaviour binds through tags and attributes. |
| `ReplicatedFirst/Loading` | `Folder` | A loading screen, when the game has one. It depends on no game code. |

## What boots

`Lifecycle.Start` requires every `ModuleScript` that is a direct child of the
folder it is given. `Main` gives it `Services`, and `Client` gives it
`Client/Controllers`.

Everything in those two folders boots, including a module that only holds data.
A `Folder` inside one of them is not searched. Both facts lead to one rule: a
boot folder holds entries and nothing else, and everything an entry needs lives
in `Modules` or `Shared`.

## Names

| Thing | Name | Example |
| :--- | :--- | :--- |
| Server entry | `<Feature>Service` | `ShopService` |
| Client entry | `<Feature>Controller` | `ShopController` |
| Private code | `Modules/<Feature>/<What it decides>` | `Modules/Shop/Pricing` |
| Remote declarations | `Shared/Remotes/<Feature>` | `Shared/Remotes/Shop` |
| Public definitions | `Shared/<Feature>Catalog` | `Shared/ShopCatalog` |

Name a private module after the decision it hides: `Pricing`, `DropTable`,
`Matchmaking`. A module named `Utils`, `Helpers`, or `Manager` hides no decision,
so nothing says what belongs in it.

A name uses letters, digits, and `_`. No script is named `init`, and no two
siblings differ by letter case alone.

The folder `Shared` and the module [`Twill.Shared`](/reference/shared/) are
unrelated. The folder holds code both sides require. The module sends messages
between servers.

## Where data goes

| Data | Location |
| :--- | :--- |
| Saved player data: template, version, migrations | `ServerScriptService/Modules/PlayerData` |
| State for one player during a session | A local table in the service that owns it, cleared from the player's bag |
| Public definitions | `ReplicatedStorage/Shared/<Feature>Catalog` |
| Secret definitions: drop rates, thresholds | `ServerScriptService/Modules/<Feature>` |
| Values tuned while the game is live | [`Config`](/reference/config/), with declared defaults |
| Settings of one object in the world | Attributes on the tagged instance |
| Templates cloned at run time | `ServerStorage/Assets`, or `ReplicatedStorage/Assets` when a client clones them |
