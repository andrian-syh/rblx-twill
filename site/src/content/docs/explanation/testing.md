---
title: Testing and verification
description: What Twill's own test suite covers, what it does not, and how to verify a change in Studio without fooling yourself
---

## Playtests only prove the paths you walked

Twill once described seven modules as verified by playtest. Reading those same
modules afterwards turned up seven defects, none of which a playtest had caught:
a join reward granted twice, a `false` that read as `nil`, a rate limiter that
flooded its own log.

None of them were exotic. They were not on the path anyone had walked.

A playtest proves the path you took. An assertion proves the contract.

## The suite that ships

`ServerScriptService.TwillTests` holds the assertions. There is no test
framework and there are no fixtures.

- Gated behind `RunService:IsStudio()`, so it never runs in production.
- Runs itself on every playtest, with no command to remember.
- A pass is one line. A failure names every check that failed.
- One failure does not stop the rest, so a single break does not hide the others.

It covers every module that can be exercised from one server, including `Bag`,
`Signal`, `Scope`, `Loop`, `Net` and its wire format, server `Replication`,
`Store`, `Data` migrations and sessions, `Tree`, `Tween`, `Async`, `Pool`,
`Config`, `Shared`, `Board`, `Random`, `Token`, `Chance`, `Navigation`, the
console's rank gate, and the rules of the Trade kit. It also carries
known-answer tests for the cryptographic primitives against official RFC
vectors.

## The client half

Some paths only exist with a real client on the other end. A `LocalScript`,
`StarterPlayerScripts.TwillTestsClient`, runs beside the suite on every
playtest. It makes a fixed set of calls, then echoes each push and each
replicated value back to the server. It holds no verdicts: every assertion
stays in `TwillTests`, so a run still ends in one line.

Through it the suite checks, with a real client:

- `Net`: calls arrive with their arguments, questions are answered, refusals by
  `Schema`, `Validate`, rank and a raising handler are answered as served, calls
  over the rate are dropped, and pushes arrive on both remotes.
- `Net.GetStats`: traffic and refusals are counted against the right remote.
- `Replication`: shared and player keys, paths, cleared keys, and a key that
  cannot be sent not holding back the rest.
- `Lifecycle`: boot order, every `Init` before any `Start`, a failed `Init`
  kept to its own service, and the player gate and bag.
- The `Replicate` binding of `Data`.
- The Trade kit: every ask a lone player makes is turned down with a notice. With
  a second player, in Clients and Servers mode, a whole trade runs between the
  two clients and the coins are counted on both sides.

The declarations both halves share live in one module beside the client half,
so the two can never disagree about a remote.

## The shape it uses

```luau
local function check(name: string, passed: boolean)
	total += 1
	if not passed then
		table.insert(failures, name)
	end
end

check("a bucket refuses once the burst is gone", not bucket:Take())
```

The name of a check is a sentence stating what should be true. When it fails,
the name alone tells you what broke, without anyone reading the test.

That is the whole reason for not using a framework here. A framework would give
better reporting and a worse habit: naming tests after the function they call
rather than after the claim they make.

## What is not covered, and why

| Untested | Why it is hard |
| --- | --- |
| `OnPlayerRemoving` in `Lifecycle` | The only player would have to leave, which ends the playtest. |
| A `Critical` service failing to boot | It kicks every player, the harness included. |
| `Teleport.Send` reaching another server | Studio cannot teleport. |
| `Path.Blocked` in `Navigation` | It needs the world to change under an agent that is already walking. |
| The whole trade, in a solo playtest | It needs two players; the suite says so and skips it. |

What these have in common is that the run would have to end, leave, or move
while the assertion is watching. They are not skipped because they are
unimportant; they are skipped because a playtest cannot hold them still.
[Check what Studio cannot](/guides/live-server-checks/) covers teleports on a
live server.

Saying so is more useful than a coverage percentage that counts the easy parts.

## Verifying your own changes

### Inject a real script, do not use the command bar

The command bar and external tooling keep their own module cache. A `require`
there hands you a fresh instance with empty state, so a module the game has
already configured reappears as though it had not been.

Worse, that fresh instance runs its own initialisation and connects to the same
real services, so testing this way can leave live connections behind.

Add a temporary `Script` or `LocalScript`, playtest, read the output, delete it.

### Edit-mode caches modules

After editing a module's source, the Edit VM may still hand you the previous
version. Measurements taken that way can contradict themselves in ways that look
like a bug in the code rather than in the measurement.

**Verify through a playtest.** If a number looks impossible, suspect the
instrument before the subject.

### Cleanup rules apply to test code

```luau
local connection = Players.PlayerAdded:Connect(onJoin)
sandbox:Destroy()
-- still connected
```

`:Destroy()` on a parent does not disconnect a connection to a global service.
Running that seven times leaves seven live connections, and a Studio session
that gets steadily stranger.

### Turn the log level up first

The default level hides `Debug`, which is where most of Twill's own account of
what it is doing lives.

```luau
Twill.Log.SetLevel("Debug")
```

Pair it with [`Error.Install`](/reference/error/) so failures nobody handled
leave a record with their trace, rather than a single red line with no context.

### Test at population, not alone

Roblox request budgets are mostly a base plus a per-player term, so a system
that is comfortable in an empty test place can be over budget on a full server.
Two clients is the minimum for anything touching replication, and one client
cannot prove isolation between players at all.

## Before saying something works

1. **State the observable result before running.** "Coins should read 251" is a
   test. "Let us see what happens" is not.
2. **Run it in the right session.** Anything touching cross-player replication
   needs two clients.
3. **Read the output.** Absence of an error is not evidence of success,
   particularly where a module is designed to refuse quietly.
4. **When numbers contradict each other, suspect the instrument.**

That fourth rule has earned its place. A compression measurement once claimed a
2000x ratio and a larger output in the same breath. The code was fine; the Edit
VM was serving a cached module.

The same rule applies to tooling outside Studio. A search tool that reports line
numbers from a normalised copy of a file will disagree with the editor about
where a function sits, and the honest first conclusion is that the two tools
count differently, not that the file changed underneath you.
