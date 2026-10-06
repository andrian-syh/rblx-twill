---
title: Use Weave with a sync tool
description: Map the Weave folders to files on disk with Rojo, Argon, Azul, or Script Sync, or work in Studio alone
---

Weave is designed to work with any tool that mirrors scripts between Studio and
a folder on disk, and with no tool. This page gives the mapping for each.

It applies once the project has the [folder map](/architecture/folder-map/). If
you work in Studio only, read [Studio only](#studio-only) and skip the rest.

## What is synced and what is not

| Synced as files | Kept in Studio |
| :--- | :--- |
| `ReplicatedStorage/Shared` | Both `Twill` modules |
| `ReplicatedStorage/Client` | `Assets`, in both containers |
| `ServerScriptService/Services` | `Workspace`, `StarterGui` |
| `ServerScriptService/Modules` | `ServerScriptService/README` |
| `Main` and `Client`, where the tool can | |

The four synced folders hold `ModuleScript` and `Folder` instances only, and no
script has a child. That is [R12](/architecture/rules/#r12-the-layout-is-safe-for-every-sync-tool),
and it is why one layout fits every tool below.

On disk, give each directory the name its folder has in Studio.

```text
src
├── ReplicatedStorage
│   ├── Shared
│   └── Client
└── ServerScriptService
    ├── Services
    ├── Modules
    └── Main.server.luau
```

## Rojo

The disk is the source of truth. Map each synced folder by path, and give the
services no path of their own, so what you installed in Studio stays.

```json title="default.project.json"
{
	"name": "game",
	"tree": {
		"$className": "DataModel",
		"ReplicatedStorage": {
			"Shared": { "$path": "src/ReplicatedStorage/Shared" },
			"Client": { "$path": "src/ReplicatedStorage/Client" }
		},
		"ServerScriptService": {
			"Main": { "$path": "src/ServerScriptService/Main.server.luau" },
			"Services": { "$path": "src/ServerScriptService/Services" },
			"Modules": { "$path": "src/ServerScriptService/Modules" }
		},
		"StarterPlayer": {
			"StarterPlayerScripts": {
				"$className": "StarterPlayerScripts",
				"Client": { "$path": "src/StarterPlayerScripts/Client.client.luau" }
			}
		}
	}
}
```

An instance made by hand inside a mapped folder is removed on the next sync.
Keep models and interfaces in `Assets`, which is not mapped.

## Argon

Argon reads a Rojo project file, so the mapping above applies. Argon also writes
changes made in Studio back to disk, which creates a file for each script added
there.

## Azul

Studio is the source of truth, and there is no project file. Azul mirrors the
place to disk as it is.

- Leave both `Twill` modules out of what you edit and push. They have children,
  and Azul writes a script with children differently from the other tools.
- Deleting a file on disk deletes the instance in Studio, with everything under
  it. Under R12 a script has nothing under it to lose.

## Script Sync

Script Sync mirrors chosen folders. Choose the four synced folders: `Shared`,
`Client`, `Services`, and `Modules`.

`Main` and `Client` sit directly in a service, so they stay in Studio. Both are
a few lines long and change rarely.

## Studio only

Nothing to set up. Install packages from model files into `Packages` and
`ServerPackages`. Team Create shares the place, and the
[check](/architecture/check-a-project/) runs from the command bar.

## Teams

When a sync tool writes in both directions, let one person run it per session.
Two people who sync the same place at the same time overwrite each other, and
neither is told. Everyone else works through version control or through Studio,
and not through both on the same script.

Before a merge, run the check on the merged place. A merge is where a second
entry point, or a script with a child, most often arrives.
