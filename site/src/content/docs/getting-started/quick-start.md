---
title: Quick start
description: Boot both sides, save a player's data, and watch a service run.
---

By the end of this page you will have a server that loads player data, boots a
service, and prints a line when a player is ready.

This continues from [Installing Twill](/getting-started/installation/). Both
folders should already be in place.

## 1. Write the boot script

Add a `Script` named `Main` in `ServerScriptService`.

```luau title="ServerScriptService/Main"
local Twill = require("@game/ReplicatedStorage/Twill")

-- Names the DataStore and the shape a new profile starts as. Fields missing
-- from an existing profile are filled in from the template on load, so adding
-- a field later needs nothing else.
Twill.Data.Configure({
	Store = "PlayerData",
	Version = 1,
	Template = {
		Coins = 0,
		Visits = 0,
	},
})

-- Holds each joining player until their data exists. Without this, services
-- would see players before their saved data arrived, and every one of them
-- would have to check for itself.
Twill.Lifecycle.SetPlayerGate(Twill.Data.Gate)

-- Finds every ModuleScript that is a direct child of Services, sorts them,
-- and boots them. Call it once, after everything above is configured.
Twill.Lifecycle.Start(script.Parent.Services)
```

Order matters here. `Configure` and `SetPlayerGate` both run before `Start`,
because `Start` is what begins letting players through.

## 2. Write a service

Add a `ModuleScript` named `WelcomeService` inside `Services`.

```luau title="ServerScriptService/Services/WelcomeService"
local WelcomeService = {}

-- Every hook is optional, so this one module is already a complete service.
-- It runs once per player, after their data has loaded.
function WelcomeService.OnPlayerReady(player, data)
	-- `data` is the live profile table. Mutating it saves on its own:
	-- there is no commit step, and no save call belongs in BindToClose.
	data.Visits += 1

	print(`{player.Name} has visited {data.Visits} time(s)`)
end

return WelcomeService
```

## 3. Play

Press **Play**. The output shows:

```text
Player1 has visited 1 time(s)
```

Stop and play again. The count goes up, because the profile was saved and
reloaded.

:::note[The count is not increasing]
Enable **Studio Access to API Services** in **Game Settings → Security**. Studio
cannot reach a DataStore without it, and the profile is starting fresh every run.
:::

## 4. Boot the client too

The same `Lifecycle` runs on both sides, so your client code is discovered and
ordered exactly the way your server code is.

Add a `Folder` named `Client` inside `ReplicatedStorage`, and put a
`ModuleScript` in it.

```luau title="ReplicatedStorage/Client/HudService"
local HudService = {}

-- Start runs after every client module has finished Init, so by here it is
-- safe to reach for another one.
function HudService.Start()
	print("client booted")
end

return HudService
```

Then add a `LocalScript` in `StarterPlayerScripts` to start them.

```luau title="StarterPlayerScripts/Client"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Twill = require("@game/ReplicatedStorage/Twill")

Twill.Lifecycle.Start(ReplicatedStorage.Client)
```

Press **Play** again and `client booted` joins the output.

The client gets discovery, ordering, and the two boot phases. It does not get the
player pipeline, because on a client `PlayerAdded` means somebody else joined.
Each side keeps its own boot list, so the two never interfere.

## What you now have

- Player data with a template and a version number, ready for
  [migrations](/core-guides/player-data/#change-a-field-later).
- A boot order you control, and a gate that means no service ever sees a player
  before their data exists.
- One service on each side, discovered automatically. Adding another is one more
  `ModuleScript` in the same folder.

## Next

The Core Guides take each piece properly: [Write a
service](/core-guides/services/) for the server side, [Write a
controller](/core-guides/controllers/) for the client.
