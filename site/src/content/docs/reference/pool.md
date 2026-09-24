---
title: Pool
description: Parts and models reused rather than cloned and destroyed each time
---

```luau
local Pool = require("@game/ReplicatedStorage/Twill").Pool

local bullets = Pool.new(template, { Size = 50, Parent = workspace.Effects }, bag)
local bullet = bullets:Take(muzzle.CFrame)
bullets:Return(bullet)
```

Added in v1.10.0.

## Parking instead of parenting

A pool clones its template ahead of need. A copy is parented once and never
reparented: while it waits it is parked far outside the world, so taking one is
a move rather than a clone, and returning one is a move rather than a destroy.

A parked copy is still simulated. A template that is not anchored falls while
it waits and is destroyed below the world, so anchor the template, and unanchor
a copy after taking it if it has to fall.

## Copies destroyed elsewhere

A copy destroyed while it is out, or while it waits, is forgotten. The pool
makes a new one when it next needs one, within its ceiling.

## API

### `Pool.new`

`[Server]` | `[Client]`

Makes a pool of copies of a part or a model, filled ahead of need.

```luau
function Pool.new(template: BasePart | Model, options: Options?, owner: Bag?): Pool
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `template` | `BasePart \| Model` | What every copy is cloned from. Left untouched. |
| `options` | `Options?` | How many to make ahead, the ceiling, and where copies live and wait. |
| `owner` | `Bag?` | A bag that destroys the pool, and every copy, when it closes. |

**Returns**

`Pool` - The filled pool.

Throws on a template that is not a part or a model, or is not `Archivable`, and
on options out of range.

### `Options`

| Field | Default | Meaning |
| :--- | ---: | :--- |
| `Size` | `10` | Copies made ahead of need. |
| `Max` | none | The most copies the pool ever makes. No ceiling when left out, and never smaller than `Size`. |
| `Parent` | `workspace` | Where every copy lives. |
| `Park` | `CFrame.new(0, 1e7, 0)` | Where a copy waits. |

### `Pool:Take`

`[Server]` | `[Client]`

Hands out a waiting copy, making one when none is waiting and the ceiling
allows.

```luau
function Pool:Take(at: CFrame?): Instance?
```

**Returns**

`Instance?` - The copy, or `nil` when the pool is at its ceiling or destroyed.

A copy taken with no `at` stays parked until you move it.

### `Pool:Return`

`[Server]` | `[Client]`

Takes a copy back and parks it until it is taken again.

```luau
function Pool:Return(instance: Instance)
```

Throws when the pool never handed that instance out, or already has it back.

### `Pool:Count`

`[Server]` | `[Client]`

Reports how many copies are waiting and how many are out.

```luau
function Pool:Count(): (number, number)
```

### `Pool:Destroy`

`[Server]` | `[Client]`

Destroys every copy the pool made, out or waiting. Safe to call more than once.

```luau
function Pool:Destroy()
```

## Limits

| Limit | Value |
| :--- | ---: |
| Copies made ahead by default | 10 |
| Height a copy waits at by default | 10000000 studs |
