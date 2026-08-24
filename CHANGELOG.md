# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

A major version is reserved for a release that reshapes how the framework works:
at least three large changes landing together, reaching more than a quarter of
what came before. A smaller change to an API lands in a minor version and brings
a Migration section with it, so what has to be rewritten is always written down.

## [1.7.1] - 2026-08-24

A fixed-width number on the wire is now checked before it is written.

### Fixed

- A fixed-width integer given a value outside its range was written wrapped
  rather than refused, so a client sending 256 for a byte arrived as 0 and
  passed a validator that would have rejected 256. The wrap happened before any
  `Validate` or `Schema` hook saw the value. Both the single-value path and the
  array path now refuse an out-of-range value instead of wrapping it.
- A `Net.Union` naming a fixed-width number among its members compiled but threw
  the first time it carried a number, because only the widest numeric kinds were
  mapped back from a value. Every numeric kind is now reachable, widest first, so
  `Union(NumberU8, NumberF64)` keeps its double rather than narrowing it.

### Changed

- The last refusal messages carrying a `Twill.Net: ` prefix, inside the codec and
  the frame reader, were brought into line with the rest, completing the one
  shape 1.7.0 began.

## [1.7.0] - 2026-08-24

A tweening module of Twill's own, and one shared loop behind every value moving.

### Added

- `Twill.Tween` moves properties, attributes, a model's pivot or scale, and plain
  table fields, with every tween in the game sharing one connection that exists
  only while something is playing. A destination given as an array of two or
  three values curves through control points, which the engine's own tweens
  cannot do. `Color3` crosses through Oklab, so a blue reaching a yellow passes
  through the greens rather than sagging through grey.
- `Tween.new` builds one and leaves it standing; `Tween.Play` builds, plays, and
  tidies itself away. Both take a bag as their last argument, so leaving a place
  cannot leave a tween behind.
- `Tween.Active` reports how many tweens are playing across the whole game, and
  `Tween.Is` tells one apart from any other table.
- Starting a tween takes every property it moves away from whoever held it, so
  two tweens never fight over one field.
- Tweening an `Instance` on a server is refused unless `AllowServer` is passed,
  since every frame of it replicates to every client.
- A tween whose write fails is stopped and reported through `Stopped` with
  `faulted`, leaving every other tween on the loop running.
- `Twill.Tween` is named in the root table's type, so it autocompletes like the
  rest.

### Changed

- Refusal messages across every module now follow one shape: no trailing full
  stop, no bracketed module prefix, and the function named as `Module.Function`.
  `Data`, `Token`, `Admin`, and `Authorization` dropped a `Twill.` that six other
  server modules never carried, and `Net.Codec` dropped a `Twill.Net:` prefix its
  `where` argument already covered.
- `Scope`, `BigNumber`, `Format`, `Replication`, `Data`, `Random`,
  `Monetization`, and `Leaderstats` now refuse arguments of the wrong type where
  they used to carry on. `Scope.Player` given something that is not a player
  returned the wrong bag rather than saying so.
- `Net.OnReady` types its bag as `Scope.Bag?` rather than `any`.

## [1.6.1] - 2026-08-20

Work the codec was doing twice, and allocations on the path that carries the most.

### Changed

- `Net.Any` no longer builds a path string for every key of every table it
  writes. The string existed only to name a value in an error message, and it
  was being built on the way through whether or not anything went wrong. Paths
  are now composed where the error is raised, and once per container rather
  than once per key. `Replication` sends its patches through `Any`, so this is
  the path that carries the most.
- An error naming a numeric key in a dictionary now names the key. It used to
  read `value[?]`, and now reads `value[7]`.
- An array of fixed-width numbers checked the buffer's capacity once for the
  whole run and then again for every element. The run is now written and read
  through the offset the single check returned, so a two thousand element array
  costs two thousand fewer bounds checks in each direction. Nothing is checked
  less: the one check still covers the whole run before a byte is touched.
- Packing and unpacking a `CFrameRot` allocated a table per value on the way out
  and two on the way back. They now use locals.
- `Any` allocated a twelve element table for every `CFrame` it wrote, to iterate
  the components it had just unpacked. It now writes them directly.

## [1.6.0] - 2026-08-20

Signals are Twill's own, and no thread waiting on one is ever left behind.

### Added

- `Twill.Signal`, replacing the bundled signal library. Every listener is called
  inside its own `xpcall`, so one that throws is reported with its own traceback
  and stepped over rather than taking the ones behind it down.
- `Destroy` and `DisconnectAll` wake every thread parked in `Wait`, handing each
  of them nothing. A wait can no longer outlive the signal it waits on, which was
  a suspended thread nothing could reach and no profiler named.
- `signal:Wait(timeout)` gives up after a number of seconds. A wait that fires
  first cancels its timeout, so it can never be woken twice.
- `signal:Count`, `signal:IsEmpty`, `signal:IsDestroyed`, and `Signal.Is`.
  `Count` makes a listener that outlived its owner something a test can assert
  against.
- `connection:Reconnect`, which takes a let-go listener back on without
  allocating a new one.

### Changed

- Connecting, disconnecting, and firing during a firing now follow the engine's
  own rules: a listener connected mid-fire sits that firing out, one let go
  mid-fire is not called again, and firing from inside a listener runs there and
  then. Each connection records which firing it was made during, so the previous
  library's preserved-tail bookkeeping and its firing flag are both gone.
- `Twill.Signal` is a Twill module rather than a bundled package on the root
  table, so it carries Twill's stability promise. Nothing third-party is
  reachable from the root any more.
- A destroyed signal keeps its methods and raises a sentence naming what
  happened, instead of being emptied and raising `attempt to index nil`.
- A pooled dispatch thread that was cancelled from outside is checked before
  reuse rather than resumed blind.
- Firing one listener twenty thousand times went from 14.0 ms to 7.6 ms, because
  dispatch no longer routes every firing through the task scheduler to buy a
  traceback `xpcall` already provides. Firing a hundred listeners two hundred
  times went from 0.9 ms to 2.0 ms, which is the cost of the per-listener
  `xpcall`.
- `ReplicatedStorage.Twill.Packages.Signal` is no longer shipped.

### Migration

The names you already use are unchanged: `new`, `wrap`, `Connect`, `Once`,
`Wait`, `Fire`, `DisconnectAll`, `Destroy`, and the
`Signal.Signal<(value: any) -> ()>` type spelling. The immediate-mode twins are
gone, because there is now only one meaning to have.

| Was | Now |
| --- | --- |
| `signal:ConnectNow(f)` | `signal:Connect(f)` |
| `signal:OnceNow(f)` | `signal:Once(f)` |
| `signal:WaitNow()` | `signal:Wait()` |
| `signal:FireNow(...)` | `signal:Fire(...)` |
| `signal:DisconnectAllNow()` | `signal:DisconnectAll()` |
| `signal:DestroyNow()` | `signal:Destroy()` |
| `connection:DisconnectNow()` | `connection:Disconnect()` |
| `connection:ReconnectNow()` | `connection:Reconnect()` |
| `connection:Destroy()` | `connection:Disconnect()` |
| `signal:GetConnections()` | `signal:Count()`, for the common reason |
| `signal:CancelAllMutations()` | nothing to cancel |

## [1.5.0] - 2026-08-20

Cleanup is Twill's own, and it finishes even when one of them fails.

### Added

- `Twill.Bag`, the cleanup container behind every bag `Scope` hands out. Closing
  runs newest first, so nothing is torn down after the thing it leans on. Every
  cleanup runs in its own `pcall`, so one that raises is reported and stepped
  over rather than stranding the entries behind it. Adding from inside a cleanup
  is allowed, and the addition is closed in the same pass.
- Named entries. `bag:Add(tween, "Cancel", "aim")` closes whatever held that name
  before, so holding one thing at a time needs no bookkeeping.
- `bag:Task`, `bag:Delay`, `bag:Bind`, `bag:Clone`, `bag:Release`, `bag:Get`,
  `bag:Count`, `bag:IsEmpty`, `bag:IsDestroyed`, `bag:Detach`, and `Bag.Is`.
  `Count` and `IsEmpty` make a leak something a test can assert against.

### Changed

- `Scope.Trove` is now `Scope.Bag`, and the bags `Scope`, `Watch`, `Loop`,
  `Navigation`, and `OnPlayerReady` hand out are `Twill.Bag` values.
- `Twill.Trove` is gone from the root table, and
  `ReplicatedStorage.Twill.Packages.Trove` is no longer shipped.
- `AttachToInstance` is now `AttachTo`, and attaching to an instance that is
  already outside the data model closes the bag at once instead of raising.
- Adding something with no way to close now raises at the `Add` that offered it.
  A promise, a tween, or a sound is held by naming its method, which is why there
  is no `AddPromise` and no promise dependency.
- `Construct`, `Pop`, `WrapClean`, `BindToRenderStep`, and `AddPromise` are gone.
  `Pop` is now `Release`; the rest were one line at the call site already.

### Fixed

- A cleanup that raised used to escape the loop, leaving every entry behind it
  held forever and the bag's guard flag raised, so the bag silently stopped
  cleaning anything from then on. Player bags are shared between systems, so one
  service's bad `Destroy` could take every other service's teardown with it.
- A one-shot listener whose signal fired during the connect used to leave a dead
  connection in the bag. The entry is now registered before the signal is
  connected.
- A thread cancelling itself used to fail silently. It is now deferred.
- Closing is linear in the number of entries. Supporting adding-during-cleanup by
  rescanning for the next entry, as the other well-known container does, is
  quadratic: measured in Studio, five thousand entries took 9.9 ms that way and
  0.54 ms this way.

### Migration

Rename the type. Everything else keeps its name.

```diff
-function MyService.OnPlayerReady(player, data, trove: Scope.Trove)
+function MyService.OnPlayerReady(player, data, bag: Scope.Bag)
```

`Add`, `Connect`, `Extend`, `Remove`, `Clean`, and `Destroy` are unchanged, so
code that only uses those needs no edit at all.

| Was | Now |
| --- | --- |
| `bag:AttachToInstance(part)` | `bag:AttachTo(part)` |
| `bag:Pop(x)` | `bag:Release(x)` |
| `bag:Construct(Class, ...)` | `bag:Add(Class.new(...))` |
| `bag:WrapClean()` | `function() bag:Destroy() end` |
| `bag:BindToRenderStep(n, p, f)` | `bag:Bind(n, p, f)` |
| `bag:AddPromise(p)` | `bag:Add(p, "cancel")` |
| `Twill.Trove.new()` | `Twill.Bag.new()` |

Cleanup order reversed. If two entries in one bag depend on each other, they are
now closed in the order that keeps the dependency alive, which is the order you
wanted; if some code depended on the old forward order, it was depending on a
guarantee the old container did not document.

## [1.4.0] - 2026-08-20

Networking is Twill's own, and a corrupt call now costs only itself.

### Added

- A built-in wire format under `Twill.Net`. Every call carries the length of its
  own body, so a corrupt or refused call is stepped over rather than read, and
  every call behind it in the same message still arrives. Both reference
  libraries this replaces lose the whole message instead.
- `Net.Types`, the catalogue a remote is declared with: integer and float widths
  including variable-length whole numbers, a correct half float, three CFrame
  precisions, arrays, structs, maps, optionals, closed unions, enums, constants,
  and `Types.Any` for a payload nobody can declare.
- `Net.DeclareUnreliable`, which has no `response` parameter, so a reply cannot
  be attached to a droppable remote by mistake. Oversized unreliable calls are
  dropped with a line naming the remote rather than vanishing.
- `Net.IsReady`, `Net.OnReady`, and `Net.AwaitReady`. A call made before the
  server's numbering reaches a client is held and sent once it does.
- `remote:Ask`, which always ends: with the answer, with the `Reject`, or with
  nothing when the wait runs out. A handler that never returns is answered for
  after a deadline.
- `remote:Connect`, `Once`, `Wait`, and the `FireClients` / `FireAllExcept`
  spellings. Listeners run from a copy of the list, so giving one up from inside
  another is ordinary.
- A byte budget per player, weighed before any of their calls are opened, so
  batching many calls into one message costs what those calls weigh.

### Changed

- Remotes are declared with `Net.Types` rather than with the bundled Packet
  library's types. `Net.Declare("Buy", { Packet.String })` becomes
  `Net.Declare("Buy", { Net.Types.String(32) })`.
- `Twill.Packet` is gone from the root table, and
  `ReplicatedStorage.Twill.Packages.Packet` is no longer shipped.
- `Types.Player` is refused in an argument list. A player named on the wire is a
  player the sender chose; the caller already arrives as the handler's first
  argument.
- Metering now runs in two stages. The bytes of a whole message are weighed
  before it is opened, and each call is metered by name before its arguments are
  decoded, so the decoding is not paid for on a call that will be refused.
- Metering creates a player's standing the moment it is needed, closing the
  window in which a joining player was unmetered.
- `Net.List` reports each remote's number alongside its signature.
- Replication no longer polls for up to thirty seconds before asking for its
  first snapshot. It waits on `Net.OnReady`.

### Fixed

- Text and buffers longer than 255 bytes no longer wrap their length prefix and
  corrupt everything after them. A value past the ceiling its field declared is
  refused at the sender, naming the field.
- Half floats round-trip the very small values that previously became zero or
  garbage, both infinities, and NaN.
- A CFrame that scales, skews, or mirrors is refused by the compact rotation
  types rather than silently flattened. `Types.CFrame` keeps all twelve
  components.
- A constant outside a declared set is refused on the way out instead of decoding
  as `nil` on arrival.
- A union tag naming a member the union was not declared with is refused rather
  than selecting an arbitrary decoder.
- A response number arriving from a peer can no longer reach a thread. It is
  looked up only in the table belonging to the side that issued it.
- Instance references decode to `nil` when the engine delivers nothing, which is
  a legal outcome for anything streamed out, rather than producing an
  intermittent error.

### Migration

Declarations are the only call sites that change.

```luau
-- before
local Packet = require("@game/ReplicatedStorage/Twill/Packages/Packet")
Net.Declare("BuyItem", { Packet.String }, { Packet.Boolean8 })

-- after
Net.Declare("BuyItem", { Net.Types.String(32) }, { Net.Types.Boolean })
```

`Handle`, `IsHandled`, `Get`, and `List` are unchanged. A client that used to
wait on `remote.Id` waits on `Net.OnReady`, or on nothing at all, since a call
made before the numbering arrives is now held rather than lost.

## [1.3.1] - 2026-08-19

A currency the console quietly rounded, and the mark that stops it.

### Fixed

- `playerdata set` turned a big number into an ordinary one. Every value typed
  into the console was read as JSON, and JSON has no integers past what a double
  holds, so `123456789012345678901234567890` was stored as `1.2345678901234568e+29`
  and `9007199254740993` was stored as `9007199254740992` with nothing said. The
  loss was not only precision: a field holding a
  [`BigNumber`](https://andrian-syh.github.io/rblx-twill/reference/bignumber/) is
  a table of limbs, so writing an ordinary number over one left the game's own
  arithmetic reaching for `limbs` on a number.

### Added

- `big:` on `playerdata set`, which writes a big number whatever its size.
  Unmarked digits are promoted only when an ordinary number provably cannot hold
  them, compared against what a `number` reproduces rather than guessed from
  length, so `9007199254740992` stays ordinary and `9007199254740993` does not.
- A refusal for a `big:` value that is not whole digits, rather than storing the
  text `big:whatever`.

### Changed

- The console shows a big number as `big:` followed by every digit instead of
  shortening it. An admin could not read the stored value, and what was shown
  could not be typed back; both directions of the round trip now close.

## [1.3.0] - 2026-08-16

Seven console commands, and the switch to turn them off.

### Added

- Seven console commands. Three report on state only Twill can see: `twill`
  names the services that booted and in what order, every declared remote and
  whether anything serves it, whether player data is configured, and what
  replication holds and has sent; `loglevel` reads or raises the log level on a
  running server, which previously meant republishing the place; and `repl` reads
  replicated state and can freeze, unfreeze, or throttle a key that is sending
  more than anybody needs.
- Four more act on a player. `rank` reads a rank or overrides it for the session,
  refusing to change the caller's own, to touch anybody at their rank or above,
  or to grant a rank at or above it. `pass` asks whether a player owns a game
  pass, and forgets what was remembered when ownership changed unseen. `saveall`
  asks every open data session here to write. `verifyroll` checks a revealed seed
  against the commitment published before a draw, which settles a disputed roll
  without either side trusting the other.
- None of them are gameplay commands. `fly`, `speed`, and the rest depend on a
  game's own character rules and are a few lines each in Cmdr, so they stay with
  the game.
- `TwillCommands` on `Admin.Configure`, taking the same three shapes as
  `DefaultCommands`. A command left out is never registered, and a command that
  is never registered is never moved into `ReplicatedStorage`, so turning one off
  removes it from the client rather than hiding it there.
- `Twill.Admin.Arguments`, which builds the arguments a command offers once its
  action is chosen. Twill's own five action-style commands are written with it,
  and a game writing one of its own can be too. It sits in `ReplicatedStorage`
  because Cmdr moves a command's definition next to its own before running it,
  on the client as well as the server.
- `Log.GetLevel`, and `Data.IsConfigured`. Both are readers for state the modules
  already kept and could not answer for.

### Changed

- `moderation` now runs its rank check before `unban` as well as before `kick`
  and `ban`. Lifting a ban was the one action that answered only to the command's
  rank gate, so anyone who could reach the console could undo a ban placed by
  somebody above them.
- `playerdata get` prints an indented JSON block once a scope holds more than
  forty values, instead of truncating a flat list of dotted paths at forty rows.
  A deep tree now reads as a tree. Past two hundred values it asks for a path
  rather than answering.
- Twill's own commands now register when `Admin.Configure` runs rather than when
  the module loads. A game that never configures the console previously had them
  registered but unreachable, since the gate refuses everything until a rank is
  set; now they are not registered either, and the refusal a caller sees is
  unchanged.

### Fixed

- A console field whose label was longer than nine characters ran straight into
  its value with no gap. The label now always gets one.
- The header on `moderationServer` claimed it refused a moderator acting on an
  equal. It can only compare ranks for a target on this server, since a rank is
  read from a `Player`. The documentation site
  [already said so](https://andrian-syh.github.io/rblx-twill/reference/troubleshooting/);
  the module's own header did not.

## [1.2.0] - 2026-08-14

One added argument, two defects, and a documentation pass over every module.

### Added

- `owner` on `Replication.Subscribe`, matching the argument every other Twill
  function that opens a lasting connection already took. A subscription made for
  one player and never bagged outlived them and went on firing into a closure
  holding the interface it was drawing. Passing a bag ends that; passing none
  behaves exactly as before.

### Fixed

- `Lifecycle` announced the departure of a player it had never announced the
  arrival of. Someone who left while the player gate still held them reached no
  service, yet every service was told they were leaving. Both
  [Services](https://andrian-syh.github.io/rblx-twill/core-guides/services/) and
  [Architecture](https://andrian-syh.github.io/rblx-twill/explanation/architecture/)
  already described the behaviour this now has; the code was the part out of
  step. Their cleanup bag still closes, since it was opened the moment they
  joined.
- `Schema` raised an error on an `"object"` rule that named no fields, despite
  promising that a malformed rule is a failed check and never a throw. Every
  other rule form already answered `false`. This one reached the arguments of
  every remote screened by `Net.Handle`.

### Changed

- Every module carries a rewritten header: a description, a list of what the
  module does, and a note only where one earns its place. Every function
  description is a sentence, and the reasoning that used to sit in comments
  inside function bodies now sits where the reader looks for it.
- The documentation says what Twill is rather than who it is for. Installing is
  two folders with no build step and no package manager, and every require
  resolves against the DataModel, so nothing changes whether a place was built
  by hand, synced from files, or generated by tooling.
- Three pages claimed Twill has no request path. That is true of `Replication`
  and of nothing else: `Net.Declare` has taken reply types since v1.0.0, and a
  remote that replies is metered, ranked, and screened like any other. What is
  refused is the pull, not the question.
- `Monetization` recorded the last fifty granted purchase ids and said so
  nowhere, while the documentation stated the idempotency guarantee without a
  bound. The bound is now written down, along with how far it sits from where
  redelivery actually happens.
- `Lifecycle` documents the priority a service boots at when it sets none, and
  `Services` answers what two services that need each other should do, by name.

## [1.1.0] - 2026-08-13

Two built-in utilities, and the module they both lean on gains one method.

### Added

- `Chance`, weighted draws where luck is an exponent per entry rather than a
  multiplier over the table, so one number shifts a whole table and the odds a
  player is shown are computed from the table instead of kept beside it. It
  accepts a `Random` round directly, which makes a weighted draw as auditable as
  an even one.
- `Round:NextNumber`, the fraction a round draws from its own stream. Named to
  match the method an ordinary `Random` carries, so anything drawing from one
  draws from a round unchanged.
- `Navigation`, pathfinding agents driven by a single loop rather than one timer
  each, with a budget bounding how many routes are worked out at once, routes
  asked for again when something blocks the part still ahead, and giving up
  measured as a lack of progress rather than as a clock against an assumed
  speed. Movement is a function the agent calls, so a humanoid, a drone, and
  anything else share one code path.

### Changed

- `WeightedRandom` is no longer a bundled package. It became `Chance`, which is
  what lets it reach `Random`; a package cannot depend on a Twill module. Three
  defects were fixed on the way: a negative weight reported odds above one for
  every other entry, a luck factor at or below `-1` produced a weight that was
  infinite or not a number and quietly returned the same entry forever, and the
  luck formula existed in two places that were free to disagree.

### Removed

- `Pool:GetItems` and the pool's public `Random` field, both of which had no
  callers and neither of which appeared in the exported type. `GetWeights` and
  `GetProbabilities` already enumerate a pool.
- The warning about mixing key types in one pool. Mixed keys are legal and
  harmless in a table keyed by anything, and the warning named no actual fault.

## [1.0.0] - 2026-08-12

First release.

### Added

**Core**

- `Lifecycle`, service and controller discovery with a deterministic boot order,
  two boot phases, and a player pipeline gated on data being ready.
- `Net`, one shared declaration of every remote, served on the server with
  metering, rank gating, argument screening, and a required refusal reply.
- `Replication`, server-to-client state with per-player diffing, batching,
  throttling, and no request path for a client to pull with.
- `Data`, player data on ProfileStore with templates, versioned migrations,
  branches, and cross-server writes that never overwrite a session they do not
  own.
- `Scope`, cleanup bags tied to a player, a character, or a character while
  alive.
- `Log`, scoped and level-filtered logging that attributes warnings to the
  nearest line outside the framework.

**Utilities**

- `Schema`, declarative validation that never throws.
- `Limit`, token buckets, per-player allowances, and log throttling.
- `Loop`, intervals, delays, and work spread across frames.
- `Watch`, instance sets followed by tag, by player, or by parent.
- `Format`, numbers and durations rendered for players.
- `Serialize`, Roblox values in a shape a DataStore accepts, and detection of
  the shapes that fail silently.
- `Compress`, large values made small and safe to send as text, never larger
  than the JSON they replace.
- `Tree`, instance trees described as data and built in one pass.
- `Error`, one listener for every unhandled script error.
- `BigNumber`, exact whole numbers with no ceiling, storable as plain data.

**Game systems**

- `Authorization`, ranks decided on the server and published as a read-only
  player attribute.
- `Admin`, an in-game console on Cmdr behind a rank gate, with moderation and
  player data commands.
- `Monetization`, developer products granted exactly once and confirmed saved
  before Roblox is told.
- `Leaderstats`, the player list bound to replicated state.
- `Filter`, player-written text made safe to show, failing closed.
- `Random`, cryptographic draws and provably fair rounds.
- `Token`, signed payloads that prove their own contents.

**Project**

- Documentation site covering every module, with signatures taken from the
  source and the side each member runs on marked.
- An automated test suite that runs on every playtest in Studio and never in
  production.

[1.1.0]: https://github.com/andrian-syh/rblx-twill/releases/tag/v1.1.0
[1.0.0]: https://github.com/andrian-syh/rblx-twill/releases/tag/v1.0.0
