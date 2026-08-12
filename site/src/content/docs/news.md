---
title: News
description: Releases, changes, and what is being worked on.
---

Releases and what is being worked on. The full record is
[CHANGELOG.md](https://github.com/andrian-syh/rblx-twill/blob/main/CHANGELOG.md).

## v1.0.0

The first release. The API is stable, and breaking changes wait for a major
version.

Twill ships as two folders, with a documentation page per module carrying
signatures taken from the source, and a test suite that runs on every playtest
in Studio.

`Twill.Version` reports what an installed copy carries.

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

- An integration harness covering the four paths the test suite cannot reach:
  `admit` in server `Net`, `drain` in `Replication`, the `Lifecycle` core, and
  the `Data` replication binding. See
  [Testing and verification](/explanation/testing/).
- Independent verification of the `Cryptography` primitives Twill does not use
  itself. Four are checked against test vectors; the rest are not. See
  [Bundled packages](/reference/bundled-packages/).
