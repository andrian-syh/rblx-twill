---
title: Bundled packages
description: The third-party code Twill ships with, and what each licence asks of you.
---

Twill bundles every dependency, so installing it needs no package manager and no
build step. That is about what is required, not about how you work: bundled code
travels with the place, whatever assembled it.

The authoritative record inside the place is
`ReplicatedStorage.Twill.Packages.ATTRIBUTION`, which also returns a table you
can read at runtime. This page summarises it.

## Shared

`ReplicatedStorage.Twill.Packages`

| Package | Licence | Author |
| --- | --- | --- |
| Packet 1.7 | 0BSD | 5uphi |
| Trove | MIT | Sleitnick, part of RbxUtil |
| Signal (NamedSignal) | MIT | Averlyst |
| AptInt | Unlicense | fosterchild1 |
| BytePress | MIT | Twill |
| WeightedRandom | MIT | Twill |

`BytePress` and `WeightedRandom` are Twill's own, kept beside the third-party
packages because they are reached the same way. They carry Twill's licence, not
somebody else's.

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
