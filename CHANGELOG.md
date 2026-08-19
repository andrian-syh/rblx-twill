# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
Twill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Breaking changes wait for a major version.

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
