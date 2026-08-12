---
title: Design principles
description: The rules Twill's modules were written against, and what each one costs.
---

These are not aspirations. Each one shows up as a specific decision somewhere in
the code, usually one that made an API slightly less convenient, and each is
listed here with what it cost.

A principle with no cost is a slogan.

## Fail closed

When a check cannot be completed, refuse.

`Filter` answers `nil` when the Roblox filter is unreachable, never the text that
went in. Returning the original would turn an outage into an unfiltered
broadcast, and `or text` is such a natural thing to write that the module has to
make it useless.

`Admin` refuses every command until `Configure` has been called. A console that
defaults to open is a console that ships open.

A validator that throws is read as a refusal, in both `Net` and `Replication`. A
test that cannot decide must not be read as consent.

A critical service that fails to boot locks the server. Serving a game with a
missing system means discovering it later, from a player.

**The cost:** callers have to handle a refusal they might rather have ignored.

## The client receives only what it must execute

The server half lives outside `ReplicatedStorage` and is never replicated.

That is not only about secrets. Rate ceilings, the metering algorithm, each
player's current allowance, and all data handling live there, because an opponent
who can read the limiter can find its edge.

A client cannot request anything from `Replication`. There is no request path at
all. Everything a client holds arrived because the server decided to send it.

**The cost:** several modules have two halves, and one of them, `Admin`, has to
be required directly on the client rather than through the root table.

## A permission gate should never guess

Ranks are numbers you name yourself. Twill ships no rank names, because a game
with two levels and a game with twelve are the same problem, and any set of names
Twill picked would be wrong for one of them.

`Admin.Configure` has no default rank for the same reason. A gate that guesses is
a gate that eventually guesses wrong, in the direction nobody notices until it
matters.

`GetGroupStanding` returns `nil` when the group could not be reached, which is
deliberately different from "not a member". Collapsing the two would silently
demote your moderators during a Roblox outage.

**The cost:** you write your own rank table, and name a minimum rank, before you
can use anything that depends on ranks.

## Configuration happens once

`Data`, `Authorization`, `Admin`, and `Token` all refuse a second `Configure`.

This is not tidiness. Changing a data template, who is privileged, or a signing
secret **while a server is running** changes the meaning of everything already
loaded or issued. A second call is far more likely to be a mistake than an
intention, so it is an error rather than a silent replacement.

The same reasoning covers handlers: one per packet in `Net`, one per product in
`Monetization`. A silently replaced handler stops working without saying so, and
in the monetisation case stops paying.

**The cost:** configuration has to happen in one place during `Init`, rather than
wherever each system would find convenient.

## Grant once, and prove it landed

Roblox redelivers a purchase receipt until it is told the purchase was granted,
so the same purchase arrives more than once. Two failures follow from getting
this wrong, in opposite directions: pay twice, or report success for a reward
that was never saved.

`Monetization` closes both. The record of what was granted is written **in the
same write as the reward**, so a redelivered receipt is recognised, and success
is reported to Roblox only once that write is confirmed. Everything else answers
that it is not done yet, which asks for the receipt again.

`Token` is the counterexample that proves the rule. A signature proves origin,
never novelty, so a valid token can be redeemed twice. Twill says so plainly
rather than implying a guarantee it cannot make.

**The cost:** granting a product waits for a confirmed save, and a purchase
handler must not do anything slow.

## Cleanup has an owner

Nothing in Twill starts a connection nobody owns. Every handle carries `Destroy`,
every loop and watch takes a bag, and anything without one goes to
`Scope.Framework()`.

Three lifetimes exist because they are genuinely different. A character bag
closes at respawn, not at death, so a sprint loop in one keeps running on a
corpse. `Alive` exists for exactly that case.

**The cost:** an extra argument on most calls, and a decision you have to make
rather than a default that is right half the time.

## Never quietly rewrite what you were given

`Data` does not encode Roblox values for you. It would then have to guess on the
way back out, and a save that silently rewrites your data is worse than one that
refuses. `Data.Edit` answers `"unsupported"` and sends you to
[`Serialize`](/reference/serialize/).

`Compress` refuses a truncated payload rather than reading it as a smaller value,
because a save that looks complete and is not is the worst failure available.

`Net.Declare` refuses a clashing redeclaration, because the alternative is one
caller serialising through another's types and corrupting the payload with
nothing reported.

**The cost:** more errors at the boundary, and callers who have to decide.

## Order is decided, concurrency is not hidden

Boot order is deterministic: `Priority` ascending, ties broken by name, so two
runs of the same place boot in the same order.

What Twill does **not** do is pretend the phases are sequential when they are
not. Each `Start` runs on its own thread, so a service that yields there does not
hold the rest of the boot behind it. Boot order therefore decides when a `Start`
begins, never the order in which they finish.

Hiding that would mean either stalling every boot behind the slowest service, or
letting people write code that depends on a completion order that was never
promised. Both are worse than saying it.

**The cost:** a `Start` that needs something from another service has to ask for
it rather than assume it is there.

## Reading is not copying

`Replication.Get`, `GetFor`, and the value handed to a `Subscribe` callback are
the held value itself, not a copy.

Copying on every read would make a HUD that reads a value each frame quietly
expensive, and the framework cannot know how often you will read. So the value is
handed over as it is, and the rule that comes with it is stated instead: treat
what you read as read only, and publish through the functions.

**The cost:** writing into a value you read desynchronises that side, and nothing
reports it.

## Errors name the caller, not the framework

`Warn` and `Error` report the nearest line outside Twill.

```text
[Twill.Data] (from MyGame.Services.Shop:42) Edit refused: unsupported value
```

A framework that reports its own internals as the location of your bug has made
the bug harder to find than it was.

**The cost:** a bounded stretch of stack is examined on every warning, and a
failure raised through enough native code reports no call-site rather than a
wrong one.

## Metering must not amplify

The path that refuses a flood is the path a flood runs down. A log line per
refusal turns a rate limiter into an amplifier for the traffic it is rejecting.

`Limit.Throttle` answers how many were held back since it last spoke, and nothing
in between. Writing the line stays with the caller, so the decision is visible
rather than buried.

The admin console applies the same shape to its own gate, and screens rank and
rate **before** parsing a command line, because parsing can reach outward to
Roblox to resolve a username.

**The cost:** a refusal you wanted to see individually is counted rather than
printed.

## An unfair draw is worse than a slow one

`Random` draws again rather than folding values that do not divide evenly into
the generator's word. Folding is faster and would make low outcomes fractionally
likelier than high ones, which is exactly the bias a loot table must not have.

The same reasoning bounds the span a single draw may cover: a wider range could
not be unbiased from one word, so it is refused rather than quietly skewed.

**The cost:** a draw occasionally costs more than one word, and bounds beyond the
supported span are an error rather than an approximation.

## Reuse before writing

Twill bundles Packet, ProfileStore, Trove, Cmdr, and others rather than
reimplementing them. Each is better at its job than a framework's own version
would be, and each carries a licence Twill can honour.

Where Twill does wrap one, the wrapper exists for a reason it can state.
`BigNumber` wraps AptInt because a stored value has to survive a DataStore
round-trip, which requires reattaching a metatable JSON drops and copying results
out of a shared limb pool. Neither is optional, and neither is obvious.

**The cost:** updating a bundled package is a manual job, since there is no
package manager to do it.

## What Twill does not do

No gameplay: no character controller, no combat, no camera, no input handling.

No reactive view layer. `Tree` builds instances from a table in one pass and
stops there; it does not re-render when your state moves, and it holds no view
state. No ECS, and no state management for the client beyond receiving what the
server published.

A framework that answers every question has opinions about your game. These
modules have opinions about **infrastructure**, which is a smaller and much more
transferable thing to be opinionated about.
