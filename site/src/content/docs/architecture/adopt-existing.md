---
title: Adopt Weave in an existing game
description: Move a game that already runs onto the Weave layout, one feature at a time
---

A game that already runs moves to Weave in steps that each leave it playable.
This guide gives the order. It applies to a place with scripts spread across
containers, with or without a framework.

Do not move everything at once. A rewrite that touches every script cannot be
tested one part at a time.

## 1. Measure

Run the [check](/architecture/check-a-project/) and keep the count. Every step
below lowers it, and a step that raises it went wrong.

## 2. Create the folders

Add the empty folders of the [folder map](/architecture/folder-map/), and the
[project README](/architecture/project-readme/). Nothing runs differently yet.

## 3. Make one entry point per side

Add `Main` and `Client`. Have each start the boot folders, which are empty.
The scripts the game already has keep running beside them.

## 4. Wrap what exists as one feature

Pick the script that does the most. Turn it into a `ModuleScript` with a `Start`
function, place it in `Services` under one name, such as `GameService`, and
delete the original script. Do the same on the client.

The code is unchanged and still does too much. It boots from one entry point,
which is what [R1](/architecture/rules/#r1-one-script-and-one-localscript)
asks.

## 5. Close the network edge

List every remote. For each one, answer two questions:

- Does it carry a result the client computed? Change it to carry the request,
  and compute the result on the server.
- Does the handler check type, range, ownership, and rate? Add what is missing.

This step protects players more than any other. Do it before any step that
only tidies.

## 6. Give saved state one writer

Search for every line that writes saved data. Group the lines by field, choose
an owner per field, and move each write behind a function on that owner.

Start with the fields that hold currency and items.

## 7. Split features out

Take one feature out of the wrapped module: move its handlers to
`<Feature>Service`, its private code to `Modules/<Feature>`, and its remotes to
`Shared/Remotes/<Feature>`. Play. Repeat for the next feature.

Split a feature when it is about to change. A part of the wrapped module that
nobody touches can stay where it is.

## 8. Move scripts off the world

Replace each script on a part or a model with a tag, and bind the behaviour in
an entry with `Watch.Tagged` or `CollectionService`. See
[Bind behaviour to tagged instances](/guides/tagged-instances/).

## When to stop

Stop when the check reports nothing and the five questions in the `README` have
the answer yes for each change you make. Code that follows the rules and is
still large is not a Weave problem.
