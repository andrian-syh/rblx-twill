---
title: Bundled packages
description: The third-party code Twill ships with, and what each licence asks of you.
---

Twill bundles every dependency, so installing it needs no package manager and no
build step. That is about what is required, not about how you work: bundled code
travels with the place, whatever assembled it.

The authoritative record is
[THIRD-PARTY-NOTICES.md](https://github.com/andrian-syh/rblx-twill/blob/main/THIRD-PARTY-NOTICES.md)
in the repository, which carries the licence texts in full. This page summarises
it. Nothing inside the place records this, because a notice a licence obliges you
to redistribute belongs with the thing you redistribute.

## Shared

`ReplicatedStorage.Twill.Packages`

| Package | Licence | Author |
| --- | --- | --- |
| Packet 1.7 | 0BSD | 5uphi |
| Trove | MIT | Sleitnick, part of RbxUtil |
| Signal (NamedSignal) | MIT | Averlyst |
| AptInt | Unlicense | fosterchild1 |
| BytePress | MIT | Twill |

`BytePress` is Twill's own, kept beside the third-party packages because it is
reached the same way. It carries Twill's licence, not somebody else's.

## Server

`ServerScriptService.TwillServer.Packages`

| Package | Licence | Author |
| --- | --- | --- |
| ProfileStore | Apache-2.0 | loleris, MAD STUDIO |
| Cmdr | MIT | evaera |
| Cryptography | MIT | daily3014 and Xoifaii |

Cryptography is
[Luau Cryptography](https://github.com/daily3014/rbx-cryptography), also
[announced on the developer
forum](https://devforum.roblox.com/t/fastest-cryptography-library-for-roblox/3680271).
[`Random`](/reference/random/) and [`Token`](/reference/token/) reach a small
part of it: SHA-256, HMAC-SHA256, ChaCha20, and Blake3.

## Three are reachable from the root

Most bundled packages are reached only through a Twill module. Three are not:

| Reached as | Is | By |
| --- | --- | --- |
| `Twill.Trove` | Trove | Sleitnick |
| `Twill.Signal` | NamedSignal | Averlyst |
| `Twill.Packet` | Packet | 5uphi |

They are exposed because you already hold their values. `Scope.Player` hands back
a Trove, `Replication.OnChanged` hands back a signal, and `Net.Declare` hands
back a packet, so their methods are part of Twill's surface whether or not the
root names them. Naming them only saves you a path.

**Their API is theirs, not Twill's.** Twill's promise that the API is stable and
that breaking changes wait for a major version covers Twill's own modules. Code
written against `Twill.Signal` is code written against NamedSignal, and it
follows that project's decisions rather than this one's.

Where a Twill module covers what you need, write against the module. `Scope`
rather than `Trove.new`, `Net.Declare` rather than `Packet`. Those wrappers are
load-bearing in several cases, and they are the part this project promises to
keep still.

## What each licence asks

**Apache-2.0** (ProfileStore) is the most demanding of the set. The licence text
must ship with any redistribution, notices must be preserved, and significant
modifications must be stated.

**MIT** (Trove, Signal, Cmdr, Cryptography) asks that the copyright and permission
notice travels with the code. The headers inside those files are the notice. Do
not strip them.

**0BSD and Unlicense** (Packet, AptInt) ask for nothing at all, not even
attribution. They are listed anyway, because a reader deserves to know what they
are running.

None of the above is copyleft, so nothing here forces a licence on Twill or on
your game. Twill's own code is MIT.
