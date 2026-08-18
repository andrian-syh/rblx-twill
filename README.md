<div align="center">
  <img src="site/public/favicon.svg" width="100" height="100" alt="Twill Logo" />
  <h1>Twill</h1>
  <p><b>A modular, zero-setup infrastructure framework for Roblox Luau.</b></p>

  <p>
    <a href="https://github.com/andrian-syh/rblx-twill/releases"><img src="https://img.shields.io/badge/version-1.3.0-2563eb?style=flat-square" alt="Version" /></a>
    <a href="https://luau.org/"><img src="https://img.shields.io/badge/language-Luau-00A2FF?style=flat-square&logo=lua&logoColor=white" alt="Luau" /></a>
    <a href="https://roblox.com/"><img src="https://img.shields.io/badge/platform-Roblox-000000?style=flat-square&logo=roblox&logoColor=white" alt="Roblox" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square" alt="License" /></a>
    <a href="https://andrian-syh.github.io/rblx-twill/"><img src="https://img.shields.io/badge/docs-online-6366f1?style=flat-square&logo=readthedocs&logoColor=white" alt="Documentation" /></a>
  </p>

  <p>
    <a href="https://andrian-syh.github.io/rblx-twill/"><b>Documentation</b></a> •
    <a href="https://andrian-syh.github.io/rblx-twill/getting-started/quick-start/"><b>Quick Start</b></a> •
    <a href="https://andrian-syh.github.io/rblx-twill/reference/"><b>API Reference</b></a> •
    <a href="CHANGELOG.md"><b>Changelog</b></a>
  </p>
</div>

---

## Overview

Twill handles the foundational infrastructure that nearly every Roblox game rewrites from scratch: a deterministic boot sequence, player data lifecycle, guarded networking, state replication, and automatic resource cleanup—without forcing you to adopt an all-or-nothing monolith.

**Only `Lifecycle` acts as a framework** by driving your initialization. Every other module is a standalone library you call on demand.

```
ReplicatedStorage/
└── Twill/                  ← Shared modules, client view, and root table

ServerScriptService/
└── TwillServer/            ← Server-only logic, data layer, and rate limits
```

Two folders contain the entire framework. Dependencies come pre-bundled: no package manager, no build step, and no mandatory toolchain required.

---

## Core Pillars

- **Deterministic Booting**: Two-phase boot (`Init` → `Start`) resolves inter-service dependencies cleanly without require cycles or deadlock.
- **Player Pipeline & Data Gate**: Services receive players via `OnPlayerReady` only after their profile is loaded and validated.
- **Guarded Networking**: Remote calls pass through four screening layers (Packet wire types, rate ceilings, schemas, and server validation).
- **Delta State Replication**: Server-to-client state diffing sends only mutated fields; client pull is intentionally restricted.
- **Scoped Lifetimes**: Connections and loops attach to Player, Character, or Alive bags (`Scope`/`Trove`) and clean up automatically.
- **Fail-Closed Security**: Missing permissions, rate overruns, and filter failures reject safely by default rather than leaking state.

---

## Quick Example

### 1. Server Bootstrap (`ServerScriptService/Main.server.luau`)

```luau
local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Data.Configure({
    Store = "PlayerData",
    Version = 1,
    Template = { Coins = 100, Inventory = {} },
})

Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)
Twill.Lifecycle.Start(script.Parent.Services)
```

### 2. Service Definition (`ServerScriptService/Services/ShopService.luau`)

```luau
local ShopService = {}
ShopService.Priority = 10

function ShopService.OnPlayerReady(player, data, trove)
    -- Profile is already loaded and guaranteed
    data.Coins += 50

    -- Bound to the player's session; cleans up automatically on leave
    trove:Connect(player.Chatted, function(message)
        -- ...
    end)
end

return ShopService
```

---

## Modules

| Group | Modules |
| :--- | :--- |
| **Core** | [`Lifecycle`](https://andrian-syh.github.io/rblx-twill/reference/lifecycle/) · [`Net`](https://andrian-syh.github.io/rblx-twill/reference/net/) · [`Replication`](https://andrian-syh.github.io/rblx-twill/reference/replication/) · [`Data`](https://andrian-syh.github.io/rblx-twill/reference/data/) · [`Scope`](https://andrian-syh.github.io/rblx-twill/reference/scope/) · [`Log`](https://andrian-syh.github.io/rblx-twill/reference/log/) |
| **Utilities** | [`Schema`](https://andrian-syh.github.io/rblx-twill/reference/schema/) · [`Limit`](https://andrian-syh.github.io/rblx-twill/reference/limit/) · [`Loop`](https://andrian-syh.github.io/rblx-twill/reference/loop/) · [`Watch`](https://andrian-syh.github.io/rblx-twill/reference/watch/) · [`Format`](https://andrian-syh.github.io/rblx-twill/reference/format/) · [`Serialize`](https://andrian-syh.github.io/rblx-twill/reference/serialize/) · [`Compress`](https://andrian-syh.github.io/rblx-twill/reference/compress/) · [`Tree`](https://andrian-syh.github.io/rblx-twill/reference/tree/) · [`Error`](https://andrian-syh.github.io/rblx-twill/reference/error/) · [`BigNumber`](https://andrian-syh.github.io/rblx-twill/reference/bignumber/) · [`Chance`](https://andrian-syh.github.io/rblx-twill/reference/chance/) · [`Navigation`](https://andrian-syh.github.io/rblx-twill/reference/navigation/) |
| **Game Systems** | [`Authorization`](https://andrian-syh.github.io/rblx-twill/reference/authorization/) · [`Admin`](https://andrian-syh.github.io/rblx-twill/reference/admin/) · [`Monetization`](https://andrian-syh.github.io/rblx-twill/reference/monetization/) · [`Leaderstats`](https://andrian-syh.github.io/rblx-twill/reference/leaderstats/) · [`Filter`](https://andrian-syh.github.io/rblx-twill/reference/filter/) · [`Random`](https://andrian-syh.github.io/rblx-twill/reference/random/) · [`Token`](https://andrian-syh.github.io/rblx-twill/reference/token/) |

---

## Scope & Boundaries

Twill deliberately focuses strictly on **game infrastructure**. It does not provide gameplay systems (character controllers, combat mechanics, camera rigs) or reactive UI layers (ECS, Roact/Fusion equivalents). You are free to pair Twill with any visual or gameplay stack of your choice.

---

## License

Twill's source code is licensed under the [MIT License](LICENSE).

Bundled third-party libraries (`ProfileStore`, `Trove`, `Packet`, `Cmdr`, `AptInt`, `Cryptography`) are redistributed under their respective permissive open-source licenses as documented in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).