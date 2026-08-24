---
title: Troubleshooting
description: Every message Twill writes, paired with what caused it and how to resolve it.
---

This page is a directory of what Twill reports. Each message it writes is quoted
below exactly as it appears in the Output, so pasting the line you are looking at
into search lands you on its cause and its fix.

Entries in **bold** are either a message quoted word for word or a symptom
described plainly, and the paragraph under each one is the reason and what to do
about it.

## How to use this page

- **Have a message?** Search this page for its text. The quote is verbatim, so a
  partial phrase is enough to find it.
- **Have a symptom but no message?** Find the section for the area you are in from
  the list below, then read down it; the symptom entries sit alongside the
  messages.
- **Have neither?** Start at [When nothing here matches](#when-nothing-here-matches).

| Area | Covers |
| --- | --- |
| [Installation and requires](#installation-and-requires) | Missing folders, server-only modules, silent no-ops |
| [Boot and Lifecycle](#boot-and-lifecycle) | Service discovery, `Init` and `Start`, critical failures |
| [Player data](#player-data) | Sessions, saving, offline edits, migrations |
| [Networking](#networking) | Declarations, handlers, rates, ranks, decoding |
| [Replication](#replication) | Subscriptions, patches, paths, published state |
| [Permissions](#permissions) | Ranks, resolvers, group lookups |
| [Admin console](#admin-console) | Cmdr, the command gate, built-in commands |
| [Monetization](#monetization) | Products, passes, receipts |
| [Leaderstats](#leaderstats) | Bindings, value objects, sorting |
| [Filtering](#filtering) | Text filtering and its failure mode |
| [Studio and tooling](#studio-and-tooling) | The Edit VM, API services, testing purchases |

## Reading Twill's output

Every line carries the scope that wrote it, and anything at warning level or
above also names the nearest line **outside** Twill.

```text
[Twill.Data] (from MyGame.Services.Shop:42) Edit refused: unsupported value
 ^ who wrote it   ^ who caused it
```

That second part is usually enough to skip opening a stack trace at all. When it
is absent, the call came from inside the framework or through too many layers of
native code to attribute honestly.

:::tip[Turn the volume up while diagnosing]
The default level is `Info`, so `Debug` lines are hidden. Raise it and the
framework becomes much more talkative, including full error traces from
[`Error.Install`](/reference/error/).

```luau
Twill.Log.SetLevel("Debug")
```
:::

## Installation and requires

**`[Twill] TwillServer.Net is missing; the server half is not installed`**

`ServerScriptService.TwillServer` is absent or renamed. Both folders are
required, and the names matter because Twill finds its own server half by name.
The module named in the message is simply whichever one was needed first. See
[Installing Twill](/getting-started/installation/).

**`[Twill] 'X' is not a Twill module. It may be a server-only module.`**

Either the name is misspelled, or you reached a server-only module from the
client. Anything holding saved data, purchases, filtering, unpredictable draws,
or signed secrets never exists on a client. The
[module reference](/reference/) marks which is which.

**`[Twill] Net.Handle is server only`** and the same for
`Authorization.Configure`, `Authorization.SetRank`, `GetGroupStanding`,
`InGroup`, `Admin.Configure`, `Admin.Register`, `Admin.RegisterTypes`,
`Admin.Run`

The module itself exists on the client, but this particular member does not.
Reading a rank on a client is fine; deciding one is not.

**`Lifecycle.SetPlayerGate is server only`**

The client has no player pipeline, because there `PlayerAdded` means somebody
else joined.

**Nothing happens at all, and there is no message**

Nothing required Twill. A module that is never required never runs, which most
often bites on the client: see the replication and admin console entries below.

## Boot and Lifecycle

**A service never boots, and nothing is reported**

It must be a **direct child** of a folder passed to `Start`, must be a
`ModuleScript`, and must return a table. A module returning anything else is
skipped silently, which is what keeps a helper module sitting beside a service
from booting as one.

Check `Lifecycle.GetBootOrder()` for what was actually discovered.

**`'X' at Y is a folder; pass it to Start to boot what is inside it`**

Nesting a folder inside a service folder does not extend the search. Pass the
inner folder to `Start` as well:

```luau
Twill.Lifecycle.Start({
	ServerScriptService.Services,
	ServerScriptService.Services.Combat,
})
```

**`duplicate service name 'X' at Y; skipped`**

Services are looked up by name, so names must be unique across **every** folder
passed to `Start`. The second one found is ignored.

**`failed to load X: ...`**

The module threw while being required, before any hook ran. This is ordinary
Luau error: read the message after the colon.

**`'X' errored in Init: ...`** or **`'X' errored in Start: ...`**

The hook threw. The rest of the boot carries on unless the service is marked
`Critical`.

**`Start called more than once; ignoring`**

`Lifecycle.Start` runs once per side. If you need more folders, pass them all in
one call as a list.

**A service sees another service that is not ready**

You called it from `Init`. Move the call to `Start`, which runs only after every
`Init` has finished.

**A `Start` hook depends on another `Start` having finished, and sometimes fails**

Each `Start` runs on its own thread, so boot order decides when one **begins**,
never the order in which they finish. Have the later one ask for what it needs
rather than assume it exists.

**`Lifecycle.Get has no service named 'X'`**

`Lifecycle.Get` was given a name that was never discovered. Usually a typo, and
occasionally a service that failed to load earlier in the same run.

**Everyone is kicked with `This server failed to start.`**

A service marked `Critical` threw in `Init` or `Start`. The reason is in the kick
message and in `Lifecycle.GetFailure()`. Players arriving afterwards are kicked
on sight until the server is replaced.

**`boot failed: ...` on the client, and nothing else runs**

The same failure on the client, where there is nobody to kick. The client boot
stops there.

## Player data

**Players are kicked with `Your saved data could not be loaded.`**

The session would not open. Usually the DataStore API is having trouble, or a
migration step threw. Look for `[Twill.Data]` lines just before it.

**Players are kicked with `Your data session was claimed by another server.`**

Normal when someone changes servers faster than the old session is released.
Their branches are freed at the same moment.

**Players are kicked with `This server failed to load your session.`**

The player gate itself threw, rather than the session failing to open. If the
gate is `Data.Gate`, the cause is above it in the log; if it is your own gate,
the error is in it.

**`Data.Gate used before Configure`**

`Lifecycle.SetPlayerGate(Data.Gate)` ran before `Data.Configure`. The same
message exists for `GetOffline`, `Edit`, and `Reset`.

**`Data is already configured`**

`Configure` runs once. Configuring twice would change the shape of stored data
underneath a running server.

**`a branch cannot be named 'main'`**

`main` is the scope name for the primary profile, so a branch cannot take it.

**`Data has no branch named 'X'`**

The name does not match anything in `Branches`. `Data.ListBranches()` reports
what exists.

**`Data.Edit` answers `"unsupported"`, with `X.Y for 123 holds Z; run it through Twill.Serialize.Encode first`**

The value holds something a DataStore cannot store. Encode it, or fix the shape
of its keys. See [Store Roblox values safely](/guides/storing-roblox-values/).

**`Data.Edit` answers `"unknown"`**

No scope answers to that name. The primary profile is `"main"`, **not** `"Data"`;
`Data` is the replication key, which is a different thing.

**`Data.Edit` answers `"blocked"`**

Something along the path is held by a value that is not a table, so the write
would have to overwrite it. Nothing was written.

**`Data.Edit` answers `"queued"` and the change never lands**

That is the truth rather than a fault: the user is not on this server, so the
edit waits for a server that holds them. For a user who never returns, it never
lands.

**`applied a queued edit to 'X'`**

Informational. An edit aimed at this player from elsewhere has just arrived.

**`could not read 123: ...`** or **`stored data for 123 could not be upgraded: ...`**

`GetOffline` failed to read, or the stored data failed a migration. It answers
`nil` rather than a partial profile.

**`could not open branch 'X' for 'Y'`**

The branch session would not open. Every caller waiting on that load is answered
with `nil` rather than left waiting.

**Data changes are not saving**

Check three things in order: that you mutated the table `Data.Get` returned
rather than a copy of it, that `Data.IsReady(player)` is true, and that **Studio
Access to API Services** is enabled.

## Networking

**`'X' was already declared as (...) and cannot be redeclared as (...)`**

Two places declared the same remote with different types. Make them agree. This
refusal is what stops one caller from serialising through another's types.

**`Net.Get has no remote named 'X' yet`**

`Net.Get` ran before whatever declares that name. Declaring is idempotent, so the
usual fix is to declare it in a shared module both sides require.

**`'X' already has a handler`**

One handler per remote. `Net.IsHandled` lets a module check rather than claim and
be refused.

**`'X' replies to the caller, so it needs a Reject option`**

A remote that replies must say what a refused caller is told, otherwise a refusal
leaves them waiting forever.

**`Rate for 'X' must be above zero`**

Metering always applies. A rate of zero would refuse everything, so it is
rejected as a mistake.

**Calls are silently dropped, and the log says `'P' is over the rate for 'X' (N call(s) refused)`**

The caller exceeded the remote's rate. Refusals are reported at most once every
few seconds per player and remote, with a count, so the log cannot become an
amplifier for the flood it is refusing.

**`'P' lacks the rank for 'X'`**

`MinimumRank` refused them, before any of their allowance was spent.

**A refusal naming a field, such as `'P' Stats.Coins should be a whole number for 'X'`**

The `Schema` rule for that argument did not match. The reason names the position
that failed.

**`validator for 'X' errored: ...`**

Your `Validate` threw. A test that cannot decide is read as a refusal, never as
consent.

**`handler for 'X' errored: ...`**

Your handler threw. A remote that replies answers with `Reject`; one that does
not drops the call. Either way the failure never reaches the calls behind it in
the same message.

**`'X' was declared here but the server never declared it`**

A name declared on this client that no server module declares. Calls on it are
dropped locally rather than reaching the wire. Usually a misspelling, or a shared
remotes module the server never requires.

**`a call this side could not read`**

A call arrived that the declared types could not decode. The call is dropped and
the ones behind it in the same message still arrive. From a client this is
ordinarily somebody probing the remote; between your own two sides it means the
declarations have drifted apart.

## Replication

**The client never receives anything**

The client announces itself the first time its half of the module is required. If
no client code ever requires `Twill.Replication`, the server has nothing to send
to. Requiring it once anywhere in your client boot is enough.

**`the server never registered replication; nothing will arrive`**

The client waited for the server to declare the replication remotes and gave up.
The server half never loaded, which usually means the server never required
`Twill.Replication` either.

**`patch arrived for 'X' before its value did; ignored`**

A change arrived for a key this client has never held. Applying it would build a
value the server never published. In practice it means the readiness signal was
missed rather than a message being lost.

**A subscription never fires**

Check whether the key name contains a dot. The first dot separates the key from
the path, so a key called `"Player.Data"` is read as key `Player`, path `Data`,
and can never match.

**`path 'X' inside 'Y' is blocked by a non-table`**

A step along the path is held by something that cannot be descended into. Nothing
was written, and `SetPath` answered `false`.

**`'X.Y' is not a number`**

`Increment` found something other than a number at the path. A missing value is
fine and counts from zero; a string is not.

**`validator for 'X' refused a write`** or **`validator for 'X' errored: ...`**

The key's guard rejected the value, or threw and was read as a rejection.
Clearing a key is always allowed regardless.

**`OnChanged("Data")` fires constantly**

That is the behaviour when `Replicate` is configured: the view is rebuilt on an
interval. Network traffic is unaffected, because a message is only sent when
something moved. To hear real changes, subscribe from the client.

**A value read on the server does not match what the client has**

Something wrote into the value returned by `Get` or `GetFor`. Those hand back the
published value itself, not a copy. Publish through `Set`, `SetPath`, or
`Mutate` instead.

## Permissions

**Everyone reads as rank zero**

`Authorization.Configure` has not run, or ran after the check. A player whose
rank has not been decided reads as the lowest, so a check made too early refuses
rather than admits.

**`Authorization is already configured`**

`Configure` runs once, so that who is privileged cannot change while the server
is running.

**`Resolve errored for 'X': ...`**

Your resolver threw. The player keeps the rank `Users` or `Default` already gave
them.

**`could not read group 123 for 'X': ...`**

The group lookup failed. It is **not** remembered, so it is retried rather than
settled wrongly. Treat `nil` from `GetGroupStanding` as unknown, never as "not a
member".

**A promotion does not survive a rejoin**

`SetRank` lasts for the session only. Write it to [`Data`](/reference/data/) and
read it back in `Resolve` to make it permanent.

## Admin console

**F2 does nothing**

Nothing loaded Cmdr. It takes **two** requires: a server one that calls
`Twill.Admin.Configure`, and a client one that requires
`@game/ReplicatedStorage/Twill/Admin` **by path**.

**`attempt to yield across metamethod/C-call boundary`**

You reached `Twill.Admin` through the root table on a client. The module waits for
Cmdr's client half to replicate, and the lazy accessor on the root table is not
allowed to wait. Require the path directly. Once loaded, `Twill.Admin` works
normally.

**`[Twill] CmdrClient never appeared; the server has to require Twill.Admin before a client can.`**

The client waited for Cmdr's client half and it never arrived, because the server
never required `Twill.Admin`. The server require is what moves it into
`ReplicatedStorage`.

**Every command answers `Admin commands are closed`**

`Twill.Admin.Configure` has not been called. The gate refuses everything until it
is told who may do what, which is the only safe direction for that mistake.

**`Admin commands are not ready yet`**

The client has not yet received the rank settings through replication. It clears
on its own.

**`You are not allowed to use the console` or `You are not allowed to run that`**

The first is the console floor, the second is that command's own required rank.
Both are checked again on the server whatever the client decided.

**`Too many commands at once. Wait a moment.`**

Submissions are metered per player. The log records who was turned away and how
many attempts went unreported.

**`Admin is already configured`**

`Configure` runs once, for the same reason as the other gates.

**A ban of `7d` lasts seven seconds**

Not from Twill's own `moderation` command, which reads durations exactly. This is
Cmdr's built-in `duration` type, which resolves units by fuzzy match. Check which
type your own command declares.

**`A big: value is whole digits, such as big:1500`**

From `playerdata set`. The `big:` mark writes a
[big number](/reference/bignumber/), so what follows it has to be digits, with an
optional leading minus. Anything else is refused rather than stored as the text
`big:whatever`.

**`You cannot grant rank N; your own is M`**

From `rank set`. The console decides who may run what by rank, so granting one at
or above your own would hand out your own authority. The most anyone can create
is somebody strictly below themselves. `rank` also refuses to change your own
rank and to touch anybody already at your rank or above.

**`No store is configured, so there is nothing to save`**

From `saveall`, in a game that never calls [`Data.Configure`](/reference/data/).
Not a fault; a game without saved data has nothing for this command to do.

**`That is not a seed a round could have revealed`**

From `verifyroll`. The seed is not thirty-two bytes of hexadecimal, so it cannot
be one [`Random.Commit`](/reference/random/) produced. Check it was pasted whole.
A seed that is well formed but wrong reports a mismatch instead, which is a
different answer.

**`'X.Y' names a path. This action takes a whole key`**

From `repl freeze`, `unfreeze`, or `throttle`. Those name a whole replicated key,
and a dotted path is refused rather than acted on as if it were one. `repl get`
reads inside a key, and takes the path.

**`Nothing is held at 'X' for everybody`**

From `repl get`. Either nothing has written that key yet, or it was written with
`Replication.SetFor`, which gives each player their own copy. Read those with
`repl getfor <user> <key>`.

**`twill net` marks a remote `UNSERVED`**

It was declared and never handed to [`Net.Handle`](/reference/net/). A client
firing it reaches nothing, silently. This is the diagnosis, not a fault in the
console.

**A moderation command refuses with `X ranks as high as you do`**

Deliberate. Nobody may act on themselves or on anyone standing as high as they
do. The check covers targets present on this server, since somebody elsewhere has
no rank to compare.

## Monetization

**`no handler for product 123; leaving it unprocessed`**

No `HandleProduct` was registered for that id, so the receipt is left for Roblox
to redeliver. Register the handler and the pending purchase lands on its own.

**`product 123 errored for 'X': ...`**

Your grant handler threw. The receipt is answered as not processed, so it is
retried rather than lost.

**`purchase 123 was not confirmed saved; Roblox will retry it`**

The reward was written but the save was not confirmed in time. The record of what
was granted is what makes that retry safe.

**`product 123 already has a handler`**

One handler per product. A second is refused rather than replacing the first,
since a silently replaced handler stops paying without saying so.

**A pass bought during play does not take effect**

It should, without any code from you. If it does not, the cache can be cleared
with `ForgetPasses`, but check first that the purchase actually completed.

**`could not check pass 123 for 'X': ...`**

The ownership check failed. It reads as not owned and is **not** remembered, so
it is asked again rather than settled against the player.

## Leaderstats

**A stat never appears**

The key it watches is not replicated, or the value is one no value object can
hold. A value that cannot be shown leaves the stat as it was rather than clearing
it.

**`leaderstat 'X' is already bound`**

Two systems bound a stat under the same name. Binding **adds** to the list rather
than replacing it, so names have to be unique across every caller.

**`Leaderstats.Bind expects a list of entries: ...`**

The list is malformed. The reason names the field that failed.

**A big number shows but never sorts**

The player list sorts `IntValue` and `NumberValue` only. See
[Count past the number limit](/guides/unbounded-currency/) for the way around it.

## Filtering

**`Filter` returns `nil`**

The filter could not be reached. That is the designed behaviour: it never returns
the text that went in. Decide what to show instead, and never write
`Filter.ForBroadcast(text, id) or text`.

**`could not check text from 123: ...`** or **`could not read filtered text from 123: ...`**

The platform call failed, or reading the result failed after the check succeeded.
Both answer `nil`.

**Filtering is being rate limited**

Filter once when text is submitted, store the result, and show the stored result.
Filtering on every draw exhausts the per-user limit and achieves nothing.

## Studio and tooling

**Edits to a module appear to have no effect**

The Edit-mode VM caches modules between executions. After editing a module's
source, verify through a **playtest**, not through the command bar.

**Studio disconnects repeatedly while testing**

Test code that connects to a global service and then destroys its own folder
leaves the connection alive. `:Destroy()` on a parent does **not** disconnect a
connection to `Players`. Close and reopen the place to clear the Edit VM, and put
the connection in a [`Scope`](/reference/scope/) bag.

**Data does not persist between playtests**

Enable **Studio Access to API Services** in **Game Settings → Security**. Without
it Studio cannot reach a DataStore, and every session starts from the template.

**Purchases cannot be tested**

They cannot be simulated in Studio. Publish to a private test place and buy with a
real account.

## When nothing here matches

1. Raise the level with `Twill.Log.SetLevel("Debug")` and reproduce.
2. Install [`Error.Install`](/reference/error/) so failures nobody handled leave a
   record with their trace.
3. Read the call-site in the warning. It names the line outside Twill that caused
   it, which is usually the one to change.
