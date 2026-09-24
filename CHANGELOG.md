# Changelog

All notable changes to Twill are recorded in this file.

The format follows [Keep a Changelog
1.1.0](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic
Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

- Each version opens with a one-sentence summary.
- **Migration** comes next, whenever a version asks you to change your code.
- Then come the standard sections, in this order: Added, Changed, Deprecated,
  Removed, Fixed, Security.
- A section with nothing in it is left out.

## [Unreleased]

## [1.10.0] - 2026-09-25

Six new modules cover configs, asynchronous work, pooling, cross-server budgets,
teleports and leaderboards, and player data can now refuse to save a state that
fails your own check.

### Migration

- `Admin.Cmdr` is Cmdr v1.13.0. Calling a registry method through the Cmdr
  object, such as `Admin.Cmdr:RegisterCommandsIn`, now logs a deprecation
  warning. Call it through `Admin.Cmdr.Registry` instead.
- `DefaultCommands = true` now also registers Cmdr's `ban`, `unban` and `exit`.
  They need `MinimumRank` unless `Commands` names them.
- `Data.SaveNow` now confirms only a save that read the data after the call.
  Code that relied on an earlier save landing first now waits for its own,
  within the same timeout.
- Code that matches every `Data.Edit` or `Data.Reset` outcome should expect
  `refused` once a scope has a `Validate` check.

### Added

- `Twill.Async` gives yielding work an answer every time.
  - `Timeout` stops a call at its deadline.
  - `All` runs several calls under one deadline.
  - `Retry` tries a failing call again with growing, randomised waits, and stops
    when its owner bag closes.
- `Twill.Pool` hands out copies of a part or model. Copies are cloned ahead of
  need and parked out of the world rather than reparented.
- `Twill.Config` reads experience configs without yielding. Every key has a
  declared default, which stands in until configs arrive or when a value of the
  wrong kind is delivered. It also offers `Observe`, per-player values and
  manual refreshing.
- `Twill.Shared` publishes messages, subscribes to topics and uses memory store
  hash maps within one per-server budget.
- `Twill.Teleport` sends any number of players in calls of 50. It can reserve
  one server for the whole group and bring parties along. Data travels through a
  memory store behind a signed ticket, never through the client.
- `Twill.Board` shows an ordered data store leaderboard from a cache. It gathers
  changes to an entry into one write, writes within the ordered write budget,
  and writes what is left on shutdown.
- `Validate` on `Data.Configure` and on each branch refuses to save data that
  fails your check. The last good data stays stored.
- `Validate` on `Store.New`, and `Store:Check`, which runs the same check
  without writing.
- The `refused` outcome for `Data.Edit` and `Data.Reset`.
- An `owner` argument on `Tree.Build`, which destroys the tree and its events
  when the owner closes.

### Changed

- The bundled Cmdr is v1.13.0. See the [upstream release
  notes](https://github.com/evaera/Cmdr/releases/tag/v1.13.0).
- `Store` merges ordinary saves asked for while another save still waits to read
  the key, so a burst of saves costs one write.
- When shutdown begins, `Store` calls that are already retrying stop at the
  closing limit of two attempts.
- `Store` sends its release requests and listens for them through `Shared`, so
  they count against the same budget as the game's own messages.
- `Data.Edit`, `Data.Reset`, and edits queued from another server now try the
  change on a copy first when the scope has a `Validate` check. A refused change
  leaves the live data untouched.
- A `Navigation` agent is destroyed when its model is destroyed.

### Fixed

- The timeout on `Data.SaveNow` did not cover the save itself, so a slow write
  held the caller well past it. The wait now ends at the timeout.
- `Data.SaveNow` could confirm a save that was already under way before the
  call, and that save might not hold the change.
- Mail on a key written by ProfileStore ignored that format's counter of letters
  sent. After every letter was read, new letters could reuse old numbers.
- A `Navigation` agent whose model was destroyed without destroying the agent
  was never released.
- A `Navigation` agent for a player's own character took over network ownership
  of every part added to that character later, such as a tool.

## [1.9.0] - 2026-09-24

Replicated state of any realistic size now arrives, player data survives the
migrations and departures that used to damage it, and a purchase is never
answered as granted before it is saved.

### Migration

- Migrations no longer run for a player with no saved data. If a migration step
  also set up a value that new players need, put that value in `Template`.
- `Remote:Connect`, `Remote:Once` and `Remote:Wait` never received anything on
  the server. Serve the remote with `Net.Handle` instead.
- A whole number token given a fraction now throws. Round the value first, or
  declare a fractional token such as `NumberF32`.
- A `Navigation.Failed` handler that matches every reason should expect
  `faulted`.

### Added

- `Keep.Fresh` reports whether a key held nothing before the handle took it.
- `Store.AwaitReach` waits until the reach probe has answered.
- `Remote:Fire` and `Remote:FireClient` return whether the call was written.
- `Navigation` fails an agent with `faulted` when its `Move` or `Jump` raises.
  Every other agent keeps moving.
- `Signal:Fire` refuses to fire from inside its own listeners past 50 levels
  deep, with an error that names the cause.
- `Error.Install` warns when its webhook points at Discord, which refuses
  requests from Roblox game servers.
- `Data` runs on stand-in stores in a Studio session that cannot reach storage,
  and says so once.

### Changed

- `Types.Any` bounds depend on the direction a value travels.
  - What a client sends keeps the old bounds.
  - What the server sends may be 64 levels deep, hold 1048576 parts and 65535
    entries per table, and carry 1 MB per string.
- `Replication` sends each key as its own call. `GetStats().Messages` counts key
  updates sent, the same as `Keys`.
- The whole number tokens of `Net.Types` refuse a fraction at the sender instead
  of truncating it.
- `Remote:Connect`, `Remote:Once` and `Remote:Wait` throw on the server.
- `Remote:Ask` waits for the remote to be numbered, within its timeout, instead
  of returning nothing at once.
- `Data` ends a player's sessions when their player bag closes. Under
  `Lifecycle`, that is after the last `OnPlayerRemoving`.
- A whole-scope `Data.Reset` keeps every field whose name begins with `__twill`.
- A call that could not be written is reported at most once every five seconds
  per remote, with a count.
- `Scope.Player` for a player who has already left returns a bag that closes a
  moment later, instead of one that never closes.
- `Chance` weighs its entries in the order they were added.

### Fixed

- A player's first view of replicated state travelled as one call holding every
  key.
  - Past 4096 parts that call could not be written, so the client never received
    it. Every later change for that player was then ignored for the rest of the
    session.
  - A change that could not be written also moved the server's record of what
    the player held. The next change was then measured against something the
    player never received.
- `Replication.SetFor` and the other per-player writers did nothing when called
  from a `PlayerAdded` listener that ran before the module's own.
- A new player's template ran through every migration, as if it were data saved
  at version 1. A step that read a field missing from the template failed, and
  the player was kicked.
- A migration that raised left behind the data it had half converted, and the
  session saved it on the way out. The next load ran the earlier steps a second
  time.
- A redelivered receipt whose first save was never confirmed was answered
  `PurchaseGranted` without being saved.
- A last save that failed left the key unable to try again.
  - The key was not released on request, and nothing was saved for it on
    shutdown.
  - Shutdown also counted a last save already in flight as finished.
- A session opened by a write that storage refused, such as data that could not
  be packed, was handed out as though it held the key.
- A player who left while their data or a branch was loading kept an open
  session and a bag that nothing closed. Emptied branch records were never
  removed.
- A weighted draw from a committed round could land on a different entry when
  replayed on another server, because entries were weighed in hash order.
- `Schema` raised on a rule whose bound was not a number.
- `Loop.After` kept its entry in the bag after it ran, so the framework bag grew
  with every call that named no owner.
- A `Watch` callback that raised stopped every later member from being
  announced.
- A store and its stand-in with the same name displaced each other's handles.
- The console wrote text containing a quote as JSON it could not read back, and
  gave no reason for the `unsupported` outcome.
- The `Net` reference claimed a value near its string ceiling could not travel.
  A single call past 60 KB travels as a message of its own.

## [1.8.0] - 2026-09-02

Player data now runs on Twill's own store instead of a bundled package, and the
console can read a key's history and name the server that holds it.

### Migration

- Nothing changes for `Data`. Its API, its behaviour and the format of what it
  stores are unchanged.
- Tokens issued before this release read as `forged`. Reissue any that are still
  in circulation.

### Added

- `Twill.Store`, the module `Data` is built on. It holds a DataStore key for one
  server at a time, saves it while it is held, and releases it on the way out.
  Use it directly for keys that are not player data.
- `Data.Inspect` reports who holds a scope, how many sessions its key has had,
  and when it was last written.
- `Data.Versions` walks back through what a scope held before, newest first.
- `playerdata status` names the server holding each scope and reports what
  storage is doing.
- `playerdata versions` reads up to five earlier versions of a scope.
- `Store.OnTrouble`, `Store.OnStrained` and `Store.OnOverwrite` report storage
  failing, failing repeatedly, and finding a key it cannot read.

### Changed

- A key written by ProfileStore still reads. Its format is recognised and raised
  to the current one on the first save.
- Autosave runs every 180 seconds instead of every 300, and is set per store
  rather than for every store at once.
- `Token` produces standard HMAC-SHA256.
  - The bundled library byte-swaps a digest that is already in the right order
    unless told not to.
  - Every tag Twill produced before this release was therefore a keyed hash, but
    not HMAC.

### Removed

- The bundled ProfileStore package. `Data` keeps the same public API.

### Fixed

- A write that storage refused reported success.
  - With packing enabled, a failure to pack took exactly this path: nothing was
    stored, `LastSaved` was updated, and `OnAfterSave` fired.
  - It affected saving, writing back a read-only key, and sending a change.
- Nothing was saved on shutdown. The closing handler wrote to the frozen module
  table on its first line and raised there.
- Taking a key this server already held left the earlier handle looking alive.
  That handle accepted writes that could never be stored, and said nothing until
  the server closed.
- Shutdown waited for every write with no limit.
  - Each write kept its full four attempts, with backoff climbing to 30 seconds.
  - Keys later in the queue could not reach storage before the platform closed
    the server.
- A save already in flight when a session ended reported that another server had
  taken the key, when this server had released it.
- Forgetting a key left this server's handle alive, and its next save wrote the
  key back.
- A public signal fired from inside a storage transform, where a listener that
  yields breaks the write.
- An unreadable key was retried for the full two minutes instead of being given
  up at once.
- Values captured inside a transform were read afterwards without accounting for
  the transform running more than once.
- `Twill.Random` raised on every draw from a committed round, so every auditable
  roll failed. The bundled cryptography library had changed its argument order,
  and the caller had not been updated.

## [1.7.4] - 2026-08-28

Unions carry every value they accept, and malformed or hostile payloads cost
nothing.

### Changed

- A `Net.Union` member of a kind that no sent value can be recognised as is
  refused at the declaration. It no longer compiles and fails at the first send.
  This covers `Types.Any`, `Types.Nil` and `Types.Static`, which a union could
  not carry before either.
- `Twill.Admin`'s shared configuration type names `TwillCommands`, which the
  server half has accepted since 1.7.0.
- Two module descriptions now match what the code does.
  - `Navigation` claimed to route a goal to the nearest place an agent can
    stand. It has never done so: it refuses a goal that is too far off.
  - `Net.List` was described as reporting what a client may send. It reports
    what has been declared.

### Fixed

- A `Net.Union` picked its member from the value it was handed. Where two
  members could not be told apart by that value, it picked one and lost the
  rest.
  - A union of a map and an array sent every table as an array, so a map arrived
    empty.
  - `Union(NumberVarU, NumberF32)` truncated a fraction, and its signed twin
    turned 1.5 into -2.
  - `Union(Color3, Color3F32)` quantised to eight bits, because the narrower
    member was tried first.

  Members that share a runtime shape are now told apart by the widest of them. A
  union with no such member is refused at the declaration.
- Ten datatypes could be declared inside a `Net.Union` but never carried by one:
  `UDim`, `UDim2`, `Rect`, `Region3`, `NumberRange`, `TweenInfo`, `DateTime`,
  `BrickColor`, `NumberSequence` and `ColorSequence`. Each is now recognised.
- Reading an unknown name from the root table reported a missing `Packages`
  folder instead of the name that was asked for, whenever that folder was not
  there to look in.
- A colour crossing through a channel no screen can show returned `nan` for the
  whole colour. The colour space the crossing runs through has no answer for a
  channel below zero; the result is now a valid colour.
- `Tween` refused a time and a delay that were not finite, but accepted a rate
  and a repeat count that were not. All four follow the same rule now.
- `Data.LoadBranch` was the only branch function that did not name what it
  expects when handed something that is not a player or a branch name.

### Security

- `Compress.Serializer` built a table for a count found in the stream before
  weighing that count against the bytes that came with it. Five bytes could ask
  for 90 MB. A count is now weighed first, so a malformed payload returns `nil`
  instead of allocating the memory it named.
- A `Replication` key's guard covered `Set` and `Mutate` but not `SetPath`,
  `SetPathFor`, `Increment` or `IncrementFor`, so half the ways to write a
  guarded key bypassed it. Every write now answers to the guard. A field written
  into a guarded key is tried on a copy first, so a refusal leaves nothing
  behind.
- The metering that decides whether a message is worth opening weighed only the
  payload, never the instances travelling beside it. A caller could carry any
  number of instances for almost nothing. Both are now charged.

## [1.7.3] - 2026-08-27

Four places where the wrong thing happened silently now fail visibly or not at
all.

### Fixed

- Data stored at a version newer than the server supports had its version marked
  back down to that server's version.
  - Returning to a newer server then ran every migration in between a second
    time.
  - A rollback lasting an hour was enough to double a currency for every player
    who logged in during it.

  A version the server does not understand is now left exactly as it is, and
  reported once.
- A compressed payload whose bytes changed in place could raise from inside
  `Compress.Decode`. That function is documented never to throw, and its callers
  hold no `pcall`. A stream that cannot be followed is now dropped whole and
  read back as nothing.
- `NumberVarU` and `NumberVarI` accepted values wider than a varint carries, and
  `NumberVarU` accepted negative ones. The write succeeded, the receiver failed,
  and the call vanished without the sender seeing anything.
  - Both now refuse at the sender, the way fixed-width numbers have since 1.7.1.
  - `NumberVarU` carries 0 to 34359738367, and `NumberVarI` carries -17179869184
    to 17179869183.
- A tween whose target was destroyed stopped without saying why. `Stopped` now
  reports `gone` for a destroyed target, as it already did for one reparented
  away.

## [1.7.2] - 2026-08-24

Compression is Twill's own code end to end, and no stream is read past its end.

### Changed

- `Compress` no longer relies on the bundled BytePress package.
  - Its serializer and entropy coder are now Twill modules,
    `Compress.Serializer` and `Compress.Lzw`.
  - `Encode`, `Decode` and the byte format are unchanged, so anything already
    stored still reads back.

### Removed

- The bundled BytePress package.

### Fixed

- A colour channel is rounded to its nearest 8-bit step instead of floored,
  which halves the largest error a stored `Color3` can carry.
- The entropy coder clears and rebuilds its dictionary once it fills. A long
  payload whose repetition shifts partway through keeps compressing, instead of
  being encoded against a frozen table.

### Security

- Decoding a malformed or hostile payload could read past the bytes it was
  given. A truncated, overly deep or unknown stream now returns `nil`, including
  one crafted to drive the reader into unbounded recursion.

## [1.7.1] - 2026-08-24

A fixed-width number is checked before it is written to the wire.

### Changed

- The last refusal messages with a `Twill.Net: ` prefix, in the codec and the
  frame reader, now follow the shape that 1.7.0 introduced.

### Fixed

- A `Net.Union` that named a fixed-width number among its members compiled, but
  threw the first time it carried a number, because only the widest numeric
  kinds were mapped back from a value. Every numeric kind is now reachable,
  widest first, so `Union(NumberU8, NumberF64)` keeps its double instead of
  narrowing it.

### Security

- A fixed-width integer given a value outside its range was written wrapped
  instead of refused.
  - A client sending 256 for a byte arrived as 0.
  - It passed a validator that would have rejected 256, because the wrap
    happened before any `Validate` or `Schema` hook saw the value.

  Both the single-value path and the array path now refuse an out-of-range
  value.

## [1.7.0] - 2026-08-24

Twill has its own tweening module, with one shared loop behind every moving
value.

### Added

- `Twill.Tween` moves properties, attributes, a model's pivot or scale, and
  plain table fields.
  - Every tween in the game shares one connection, which exists only while
    something is playing.
  - A destination given as an array of two or three values curves through
    control points.
  - `Color3` values cross through Oklab, so blue moving to yellow passes through
    green rather than grey.
- `Tween.new` builds a tween and leaves it standing. `Tween.Play` builds it,
  plays it and cleans it up. Both take a bag as their last argument, so leaving
  a place cannot leave a tween behind.
- `Tween.Active` reports how many tweens are playing across the game, and
  `Tween.Is` tells a tween apart from any other table.
- Starting a tween takes over every property it moves, so two tweens never fight
  over one field.
- Tweening an `Instance` on a server is refused unless `AllowServer` is passed,
  because every frame of it replicates to every client.
- A tween whose write fails stops and reports `faulted` through `Stopped`. Every
  other tween on the loop keeps running.
- `Twill.Tween` is part of the root table's type, so it autocompletes like the
  other modules.

### Changed

- Refusal messages in every module follow one shape: no trailing full stop, no
  bracketed module prefix, and the function named as `Module.Function`.
  - `Data`, `Token`, `Admin` and `Authorization` dropped a `Twill.` prefix that
    six other server modules never carried.
  - `Net.Codec` dropped a `Twill.Net:` prefix that its `where` argument already
    covered.
- `Scope`, `BigNumber`, `Format`, `Replication`, `Data`, `Random`,
  `Monetization` and `Leaderstats` refuse arguments of the wrong type instead of
  carrying on. `Scope.Player`, given something that is not a player, used to
  return the wrong bag.
- `Net.OnReady` types its bag as `Scope.Bag?` instead of `any`.

## [1.6.1] - 2026-08-20

The codec stops doing work twice and allocates less on the path that carries the
most traffic.

### Changed

- `Net.Any` no longer builds a path string for every key of every table it
  writes. The path is composed only when an error is raised, once per container.
  `Replication` sends its patches through `Any`, so this is the busiest path.
- An error that names a numeric key in a dictionary shows the key: `value[7]`
  instead of `value[?]`.
- An array of fixed-width numbers checks the buffer's capacity once for the
  whole run, instead of once more for every element. A 2000-element array costs
  2000 fewer bounds checks in each direction, and the single check still covers
  the whole run before any byte is touched.
- Packing and unpacking a `CFrameRot` no longer allocates tables.
- `Any` no longer allocates a 12-element table for every `CFrame` it writes.

## [1.6.0] - 2026-08-20

Signals are Twill's own, and no thread waiting on one is left behind.

### Migration

The names you already use are unchanged: `new`, `wrap`, `Connect`, `Once`,
`Wait`, `Fire`, `DisconnectAll`, `Destroy`, and the
`Signal.Signal<(value: any) -> ()>` type. The immediate-mode variants are gone.
Replace them as follows.

| Before | After |
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
| `signal:GetConnections()` | `signal:Count()` |
| `signal:CancelAllMutations()` | Remove the call |

### Added

- `Twill.Signal`, which replaces the bundled signal library. Each listener runs
  inside its own `xpcall`, so one that throws is reported with its own traceback
  and the rest still run.
- `Destroy` and `DisconnectAll` wake every thread parked in `Wait` and pass it
  nothing. A wait can no longer outlive the signal it waits on.
- `signal:Wait(timeout)` gives up after a number of seconds. A wait that fires
  first cancels its timeout, so it is never woken twice.
- `signal:Count`, `signal:IsEmpty`, `signal:IsDestroyed` and `Signal.Is`.
  `Count` lets a test assert that no listener outlived its owner.
- `connection:Reconnect` reattaches a disconnected listener without allocating a
  new one.

### Changed

- Connecting, disconnecting and firing during a firing follow the engine's own
  rules.
  - A listener connected mid-fire waits for the next firing.
  - A listener disconnected mid-fire is not called again.
  - Firing from inside a listener runs immediately.
- `Twill.Signal` is a Twill module rather than a bundled package, so it carries
  Twill's stability promise. No third-party package is reachable from the root
  table any more.
- A destroyed signal keeps its methods and raises an error that names what
  happened, instead of `attempt to index nil`.
- A pooled dispatch thread cancelled from outside is checked before it is
  reused.
- Firing one listener 20000 times takes 7.6 ms instead of 14.0 ms. Firing 100
  listeners 200 times takes 2.0 ms instead of 0.9 ms, the cost of the
  per-listener `xpcall`.

### Removed

- The immediate-mode variants listed under Migration.
- `ReplicatedStorage.Twill.Packages.Signal`.

## [1.5.0] - 2026-08-20

Cleanup is Twill's own, and it finishes even when one step fails.

### Migration

Rename the type. Everything else keeps its name.

```diff
-function MyService.OnPlayerReady(player, data, trove: Scope.Trove)
+function MyService.OnPlayerReady(player, data, bag: Scope.Bag)
```

`Add`, `Connect`, `Extend`, `Remove`, `Clean` and `Destroy` are unchanged. Code
that uses only those needs no edit.

| Before | After |
| --- | --- |
| `bag:AttachToInstance(part)` | `bag:AttachTo(part)` |
| `bag:Pop(x)` | `bag:Release(x)` |
| `bag:Construct(Class, ...)` | `bag:Add(Class.new(...))` |
| `bag:WrapClean()` | `function() bag:Destroy() end` |
| `bag:BindToRenderStep(n, p, f)` | `bag:Bind(n, p, f)` |
| `bag:AddPromise(p)` | `bag:Add(p, "cancel")` |
| `Twill.Trove.new()` | `Twill.Bag.new()` |

Cleanup now runs newest first. Two entries that depend on each other are closed
in the order that keeps the dependency alive. Code that relied on the old
forward order relied on behaviour that was never documented.

### Added

- `Twill.Bag`, the cleanup container behind every bag `Scope` hands out.
  - Closing runs newest first, so nothing is torn down after the thing it
    depends on.
  - Each cleanup runs in its own `pcall`, so one that raises is reported and the
    rest still run.
  - Adding from inside a cleanup is allowed, and the addition closes in the same
    pass.
- Named entries. `bag:Add(tween, "Cancel", "aim")` closes whatever held that
  name before.
- `bag:Task`, `bag:Delay`, `bag:Bind`, `bag:Clone`, `bag:Release`, `bag:Get`,
  `bag:Count`, `bag:IsEmpty`, `bag:IsDestroyed`, `bag:Detach` and `Bag.Is`.
  `Count` and `IsEmpty` let a test assert that nothing leaked.

### Changed

- `Scope.Trove` is now `Scope.Bag`. The bags that `Scope`, `Watch`, `Loop`,
  `Navigation` and `OnPlayerReady` hand out are `Twill.Bag` values.
- `AttachToInstance` is now `AttachTo`. Attaching to an instance that is already
  outside the data model closes the bag at once instead of raising.
- Adding something that has no way to close raises at the `Add` call. Hold a
  promise, a tween or a sound by naming its closing method.
- `Pop` is now `Release`.

### Removed

- `Twill.Trove` from the root table, and
  `ReplicatedStorage.Twill.Packages.Trove`.
- `Construct`, `WrapClean`, `BindToRenderStep` and `AddPromise`. Each was
  already one line at the call site.

### Fixed

- A cleanup that raised escaped the loop.
  - Every entry behind it stayed held forever, and the bag's guard flag stayed
    raised, so the bag stopped cleaning anything.
  - Player bags are shared between systems, so one service's failing `Destroy`
    could stop every other service's teardown.
- A one-shot listener whose signal fired during the connect left a dead
  connection in the bag. The entry is now registered before the signal is
  connected.
- A thread that cancelled itself failed silently. The cancellation is now
  deferred.
- Closing takes time linear in the number of entries, even when entries are
  added during cleanup. Measured in Studio, 5000 entries take 0.54 ms, against
  9.9 ms for a rescanning design.

## [1.4.0] - 2026-08-20

Networking is Twill's own, and a corrupt call now costs only itself.

### Migration

Declarations are the only call sites that change.

```luau
-- before
local Packet = require("@game/ReplicatedStorage/Twill/Packages/Packet")
Net.Declare("BuyItem", { Packet.String }, { Packet.Boolean8 })

-- after
Net.Declare("BuyItem", { Net.Types.String(32) }, { Net.Types.Boolean })
```

`Handle`, `IsHandled`, `Get` and `List` are unchanged. A client that waited on
`remote.Id` now waits on `Net.OnReady`, or on nothing at all, because a call
made before numbering arrives is held instead of lost.

### Added

- A built-in wire format under `Twill.Net`. Every call carries the length of its
  own body, so a corrupt or refused call is skipped, and every call behind it in
  the same message still arrives.
- `Net.Types`, the catalogue a remote is declared with.
  - Integer and float widths, including variable-length whole numbers and a
    correct half float.
  - Three CFrame precisions.
  - Arrays, structs, maps, optionals, closed unions, enums and constants.
  - `Types.Any`, for a payload nobody can declare.
- `Net.DeclareUnreliable`, which has no `response` parameter, so a reply cannot
  be attached to a remote that may drop calls. An oversized unreliable call is
  dropped with a message that names the remote.
- `Net.IsReady`, `Net.OnReady` and `Net.AwaitReady`. A call made before the
  server's numbering reaches a client is held and sent once it arrives.
- `remote:Ask`, which always returns: with the answer, with the `Reject`, or
  with nothing when the wait runs out. A handler that never returns is answered
  after a deadline.
- `remote:Connect`, `Once` and `Wait`, and the `FireClients` and `FireAllExcept`
  methods. Listeners run from a copy of the list, so disconnecting one from
  inside another is safe.
- A byte budget per player, weighed before any of their calls are opened, so
  batching many calls into one message costs what those calls weigh.

### Changed

- Remotes are declared with `Net.Types` instead of the bundled Packet library's
  types.
- `Types.Player` is refused in an argument list. The caller already arrives as
  the handler's first argument, and a player named on the wire is one the sender
  chose.
- Metering runs in two stages. The bytes of a whole message are weighed before
  it is opened, and each call is metered by name before its arguments are
  decoded, so a refused call is never decoded.
- Metering creates a player's standing the moment it is needed. This closes the
  window in which a joining player was not metered.
- `Net.List` reports each remote's number alongside its signature.
- `Replication` waits on `Net.OnReady` before asking for its first snapshot,
  instead of polling for up to 30 seconds.

### Removed

- `Twill.Packet` from the root table, and
  `ReplicatedStorage.Twill.Packages.Packet`.

### Fixed

- Text and buffers longer than 255 bytes wrapped their length prefix and
  corrupted everything after them. A value past the ceiling its field declares
  is now refused at the sender, naming the field.
- Half floats now round-trip very small values, which used to become zero or
  garbage, both infinities, and NaN.
- A CFrame that scales, skews or mirrors is refused by the compact rotation
  types instead of being silently flattened. `Types.CFrame` keeps all twelve
  components.
- A constant outside a declared set is refused when sent, instead of decoding as
  `nil` on arrival.
- An instance reference decodes to `nil` when the engine delivers nothing, which
  is legal for anything streamed out, instead of producing an intermittent
  error.

### Security

- A union tag naming a member the union was not declared with is refused,
  instead of selecting an arbitrary decoder.
- A response number arriving from a peer can no longer resume an unrelated
  thread. It is looked up only in the table of the side that issued it.

## [1.3.1] - 2026-08-19

The console no longer rounds big numbers when it writes them.

### Added

- The `big:` prefix on `playerdata set`, which writes a big number of any size.
  - Unmarked digits are promoted to a big number only when an ordinary number
    cannot hold them exactly.
  - `9007199254740992` stays ordinary, and `9007199254740993` does not.
- A refusal for a `big:` value that is not whole digits, instead of storing the
  text `big:whatever`.

### Changed

- The console shows a big number as `big:` followed by every digit, instead of
  shortening it. The value shown can now be typed back in.

### Fixed

- `playerdata set` turned a big number into an ordinary one. Every value typed
  into the console was read as JSON, which has no integers past what a double
  holds.
  - `123456789012345678901234567890` was stored as `1.2345678901234568e+29`.
  - `9007199254740993` was stored as `9007199254740992`, with no warning.
  - A field holding a
    [`BigNumber`](https://andrian-syh.github.io/rblx-twill/reference/bignumber/)
    is a table of limbs, so overwriting it with an ordinary number broke the
    game's own arithmetic on that field.

## [1.3.0] - 2026-08-16

Seven console commands arrive, with a setting to turn them off.

### Added

- Three commands that report state only Twill can see.
  - `twill` names the services that booted and their order, every declared
    remote and whether anything serves it, whether player data is configured,
    and what replication holds and has sent.
  - `loglevel` reads or changes the log level on a running server, without
    republishing the place.
  - `repl` reads replicated state, and can freeze, unfreeze or throttle a key.
- Four commands that act on a player.
  - `rank` reads a rank or overrides it for the session. It refuses to change
    the caller's own rank, to touch anyone at the caller's rank or above, or to
    grant a rank at or above it.
  - `pass` checks whether a player owns a game pass, and clears the cached
    answer when ownership changed out of view.
  - `saveall` asks every open data session on the server to write.
  - `verifyroll` checks a revealed seed against the commitment published before
    a draw, so a disputed roll can be settled without either side trusting the
    other.
- `TwillCommands` on `Admin.Configure`, in the same three shapes as
  `DefaultCommands`. A command left out is never registered and never reaches
  `ReplicatedStorage`, so it is absent from the client.
- `Twill.Admin.Arguments`, which builds the arguments a command offers once its
  action is chosen. It lives in `ReplicatedStorage` because Cmdr runs a
  command's definition on the client as well as the server.
- `Log.GetLevel` and `Data.IsConfigured`.

### Changed

- `playerdata get` prints an indented JSON block once a scope holds more than 40
  values, instead of cutting a flat list of dotted paths at 40 rows. Past 200
  values it asks for a path.
- Twill's own commands register when `Admin.Configure` runs, instead of when the
  module loads. A game that never configures the console no longer registers
  them. The refusal a caller sees is unchanged.

### Fixed

- A console field label longer than nine characters ran into its value with no
  gap.
- The header of `moderationServer` claimed it refused a moderator acting on an
  equal. It can compare ranks only for a target on the same server. The
  [troubleshooting
  reference](https://andrian-syh.github.io/rblx-twill/reference/troubleshooting/)
  already said so.

### Security

- `moderation` now runs its rank check before `unban`, as it already did before
  `kick` and `ban`. Previously anyone who could reach the console could lift a
  ban placed by someone ranked above them.

## [1.2.0] - 2026-08-14

`Replication.Subscribe` takes an owner, two defects are fixed, and every
module's documentation is rewritten.

### Added

- An `owner` argument on `Replication.Subscribe`, matching every other Twill
  function that opens a lasting connection. Without one, a subscription made for
  a player outlived them. Passing no owner behaves as before.

### Changed

- Every module header is rewritten: a description, a list of what the module
  does, and a note only where one is needed. Every function description is a
  sentence, and reasoning moved out of function bodies into the headers.
- The documentation describes what Twill is rather than who it is for.
  Installing is two folders with no build step and no package manager, and every
  require resolves against the DataModel.
- Three pages claimed Twill has no request path. That is true only of
  `Replication`: `Net.Declare` has accepted reply types since 1.0.0, and a
  remote that replies is metered, ranked and screened like any other.
- `Monetization` documents its bound of 50 remembered purchase ids, and how far
  that sits from where redelivery happens.
- `Lifecycle` documents the priority a service boots at when it sets none.
  `Services` explains what two services that need each other should do.

### Fixed

- `Lifecycle` announced the departure of a player whose arrival it never
  announced. A player who left while the player gate still held them reached no
  service, yet every service was told they were leaving. Their cleanup bag still
  closes, because it opened when they joined.
- `Schema` raised on an `"object"` rule with no fields, despite promising that a
  malformed rule fails the check and never throws. The error reached the
  arguments of every remote screened by `Net.Handle`.

## [1.1.0] - 2026-08-13

Two new modules, weighted draws and pathfinding, and `Random` rounds that both
can draw from.

### Added

- `Chance`, weighted draws where luck is an exponent per entry rather than a
  multiplier over the table.
  - One number shifts a whole table.
  - The odds shown to a player are computed from the table.
  - It accepts a `Random` round, so a weighted draw is as auditable as an even
    one.
- `Round:NextNumber`, the fraction a round draws from its own stream. It matches
  the method on an ordinary `Random`, so code drawing from one draws from a
  round unchanged.
- `Navigation`, pathfinding agents driven by one shared loop.
  - A budget bounds how many routes are worked out at once.
  - A route is recomputed when something blocks the part still ahead.
  - An agent gives up when it stops making progress, not when a timer runs out.
  - Movement is a function the agent calls, so humanoids, drones and anything
    else share one code path.

### Changed

- `WeightedRandom` became `Chance`, a Twill module that can reach `Random`.

### Removed

- The bundled `WeightedRandom` package.
- `Pool:GetItems` and the pool's public `Random` field. Neither had callers or
  appeared in the exported type. `GetWeights` and `GetProbabilities` already
  list a pool.
- The warning about mixing key types in one pool. Mixed keys are legal and
  harmless.

### Fixed

- A negative weight reported odds above one for every other entry.
- A luck factor at or below `-1` produced an infinite or undefined weight and
  returned the same entry forever.
- The luck formula existed in two places that could disagree.

## [1.0.0] - 2026-08-12

First release.

### Added

**Core**

- `Lifecycle`, service and controller discovery with a deterministic boot order,
  two boot phases, and a player pipeline gated on data being ready.
- `Net`, one shared declaration of every remote, served on the server with
  metering, rank gating, argument screening and a required refusal reply.
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
- `Limit`, token buckets, per-player allowances and log throttling.
- `Loop`, intervals, delays and work spread across frames.
- `Watch`, instance sets followed by tag, by player or by parent.
- `Format`, numbers and durations rendered for players.
- `Serialize`, Roblox values in a shape a DataStore accepts, and detection of
  shapes that fail silently.
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

- A documentation site covering every module, with signatures taken from the
  source and the side each member runs on marked.
- An automated test suite that runs on every playtest in Studio and never in
  production.

[Unreleased]: https://github.com/andrian-syh/rblx-twill/compare/v1.10.0...HEAD
[1.10.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.7.4...v1.8.0
[1.7.4]: https://github.com/andrian-syh/rblx-twill/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/andrian-syh/rblx-twill/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/andrian-syh/rblx-twill/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/andrian-syh/rblx-twill/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/andrian-syh/rblx-twill/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/andrian-syh/rblx-twill/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/andrian-syh/rblx-twill/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/andrian-syh/rblx-twill/releases/tag/v1.0.0
