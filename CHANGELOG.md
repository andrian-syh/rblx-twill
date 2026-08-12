# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
Twill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Breaking changes wait for a major version.

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

[1.0.0]: https://github.com/andrian-syh/rblx-twill/releases/tag/v1.0.0
