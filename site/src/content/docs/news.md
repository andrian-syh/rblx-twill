---
title: News
description: Releases, changes, and what is being worked on.
---

Releases and what is being worked on. The full record is
[CHANGELOG.md](https://github.com/andrian-syh/rblx-twill/blob/main/CHANGELOG.md).

## v1.1.0

**Released.** Two built-in utilities, and nothing already written has to change.

### [`Chance`](/reference/chance/), weighted draws

Gacha, loot tables, drop rates, mutations: anything where some outcomes should
come up more often than others.

What makes it more than a weighted list is that **luck is an exponent per entry
rather than a multiplier over the table**. Give the common bulk an exponent of
zero and the rare tail a positive one, and a single `luckFactor` expresses every
luck potion, gamepass, and event bonus in the game without a second table of odds
to keep in step.

That is also what makes the odds disclosable. Roblox requires the numerical odds
of a paid random item to be shown before purchase, **and the effect of anything
sold that improves them**. `GetProbabilities` answers both, at any luck, computed
from the table being drawn rather than typed into the interface beside it.

A pool takes a [`Random`](/reference/random/) round directly, so a weighted draw
is as auditable as an even one:

```luau
local round = Twill.Random.Commit()
announce(round.Commitment)

local pool = Twill.Chance.new(round)
pool:AddItem("common", 100)
pool:AddItem("legendary", 1, 2)

local prize = pool:Next(playerLuck)

announce(round:Reveal())
```

### [`Navigation`](/reference/navigation/), agents that walk somewhere

`PathfindingService` supplies a route. What it does not supply is anything that
keeps a hundred agents from costing a hundred times as much, and that is what
this is.

**One loop drives every agent**, rather than a timer, a thread, and a handful of
connections each. **One budget** bounds how many routes are worked out at once,
because working one out costs more the more of them are already under way; a
crowd of agents all wanting a route at the same moment is the failure this exists
to prevent. **Routes ask for themselves again** when something appears across the
part still ahead, which the engine reports and most implementations ignore.

Giving up is measured as **a lack of progress**, not as a clock against an
assumed speed, so a humanoid, a drone, and a rolling boulder are all judged the
same way without any of them being asked how fast they are. Movement is a
function the agent calls, which is what lets those three share one code path.

```luau
local agent = Twill.Navigation.new(npc, nil, trove)

agent.Arrived:Connect(onThere)
agent:GoTo(workspace.Target)
```

`GoTo` does not yield, and a goal set again before the first resolves abandons it
rather than racing it.

### Also

`Round:NextNumber` gives a round the same method an ordinary `Random` carries, so
anything that draws from one draws from a round without knowing which it was
handed. It is what lets a weighted pool be provably fair.

### Moving from v1.0.0

`Packages.WeightedRandom` became [`Chance`](/reference/chance/) and is no longer
a bundled package. A package sits at the bottom of the stack and cannot depend on
a Twill module, which is exactly what kept it tied to `math.random` and unable to
reach `Random`. Moving it out is what made the round above possible.

```diff lang="luau"
- local WeightedRandom = require(ReplicatedStorage.Twill.Packages.WeightedRandom)
- local pool = WeightedRandom.new()
+ local pool = Twill.Chance.new()
```

Three defects were fixed on the way. A negative weight made `GetProbability`
report odds above one for every other entry. A luck factor at or below `-1`
produced a weight that was infinite or not a number, slipped past every check,
and quietly returned the same entry forever. And the luck formula existed in two
places that were free to disagree.

## v1.0.0

**Released.** The API is stable, and breaking changes wait for a major version.

[Download the model](https://github.com/andrian-syh/rblx-twill/releases/tag/v1.0.0)
from the release, or copy the folders in by hand. Either way the install is the
same two folders, and both are required. See
[Installing Twill](/getting-started/installation/).

Twill ships with a documentation page per module carrying signatures taken from
the source, and a test suite that runs on every playtest in Studio.

`Twill.Version` reports what an installed copy carries, which is the quickest
way to tell what a place is actually running.

### What went into it

**`Compress`.** Large values made small and safe to send as text. `Encode`
computes both a JSON form and a compressed form and returns the smaller, so the
result is never longer than the JSON it replaced, while a few thousand
repetitive rows land near a fifth of it. The byte count travels with the
payload, so a truncated payload is refused rather than read as a smaller value.

**`Random` and `Token`.** Draws come from a cryptographic generator rather than
`math.random`, and a round can publish a commitment before drawing so the
outcome can be audited afterwards. `Token` signs a payload with HMAC-SHA256 so a
redeem code can be checked without a DataStore lookup.

**`Data` bound to `Replication`.** Naming fields in `Replicate` sends them to
their owner's client, following direct mutation, with no mirroring by hand.

**Server modules typed from their own source.** The root table used to carry
hand-written types for the six server-only modules, because a client's type
checker cannot require them. They are now taken from the server half directly,
so a signature cannot drift between the two without the source moving. Nothing
changes at runtime: those types are resolved by the type solver and never
executed.

**Every bundled component is traced and licensed.** The `Cryptography` package
is recorded as MIT by daily3014 and Xoifaii, and the notices file no longer
claims that every bundled component is vendored unmodified, since that one
carries three fixes to its random number generator. See
[Bundled packages](/reference/bundled-packages/).

### Defects found and fixed before release

**`Schema` accepted NaN and infinity.** Both comparisons against a range are
false for NaN, so it passed every number rule, including an unbounded one.
Neither survives a DataStore, so both are now refused at the type check rather
than at the range check.

**`Schema` accepted a dictionary as an array.** `{ a = 1 }` has a length of zero,
so it passed every array rule as though it were empty. An array rule now
requires the keys to be exactly `1..n`.

**`Replication` ignored numeric path segments on two of three paths.** Resolving
a path fell back to a numeric key, but writing and waking subscribers did not, so
`Subscribe("Data.Items.2")` never fired. All three now share one lookup.

**`Serialize.FindUnstorable` did not inspect keys.** A table mixing named and
numbered keys encodes to an array with the named keys silently dropped. It is now
refused, along with gaps in a numbering and text that is not valid UTF-8.

**The bundled CSPRNG could be left permanently broken.** A failed entropy gather
was not checked, and reseeding cleared the key before gathering. Both are fixed
in the vendored copy.

## Working on

- An integration harness covering the paths the test suite cannot reach: `admit`
  in server `Net`, `drain` in `Replication`, the `Lifecycle` core, the `Data`
  replication binding, and the blocked-route handling in `Navigation`. See
  [Testing and verification](/explanation/testing/).
- Independent verification of the `Cryptography` primitives Twill does not use
  itself. Four are checked against test vectors; the rest are not. See
  [Bundled packages](/reference/bundled-packages/).
- A published source tree, so working from files does not mean lifting the two
  folders out of a place by hand. The framework already runs unchanged under any
  workflow that assembles a place; what is missing is the packaging.
