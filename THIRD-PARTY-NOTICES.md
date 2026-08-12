# Third-party notices

Twill redistributes the components below. Each keeps its own licence; Twill's
MIT licence does not replace them.

All are redistributed **unmodified** except Cryptography, which carries three
fixes to its random number generator. Those are noted in its own section.

Verified against the upstream sources on 31 July 2026, Cmdr on 1 August 2026,
and Cryptography on 12 August 2026.

`BytePress` and `WeightedRandom` are not listed here. They are Twill's own and
carry Twill's MIT licence.

---

## Cmdr — MIT

**Author:** evaera, from [Cmdr](https://github.com/evaera/Cmdr)
**Location in Twill:** `ServerScriptService/TwillServer/Packages/Cmdr`

Cmdr moves part of itself into `ReplicatedStorage/CmdrClient` at run time. That
copy is the same redistribution and carries the same licence.

```
MIT License

Copyright (c) 2018 Eryn L. K.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## AptInt — Unlicense

**Author:** fosterchild1
**Source:** https://github.com/fosterchild1/AptInt
**Location in Twill:** `ReplicatedStorage/Twill/Packages/AptInt`

Released into the public domain under the Unlicense. It asks for nothing — no
attribution, no notice, no conditions. Listed here because someone running Twill
deserves to know what is in it.

Twill reaches it only through `Twill.BigNumber`, which owns the two details that
make an arbitrary-precision integer survive a DataStore: reattaching the
metatable that JSON drops, and copying results out of AptInt's limb pool.

---

## Packet — 0BSD (BSD Zero Clause)

**Author:** 5uphi
**Source:** https://devforum.roblox.com/t/packet-networking-library/3573907
**Creator Store asset:** `104116977416770`
**Location in Twill:** `ReplicatedStorage/Twill/Packages/Packet`

> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted.

0BSD asks for nothing — no attribution, no notice, no conditions. Packet is
listed here anyway, because someone running Twill deserves to know what is in
it.

**Open item:** the vendored copy carries no version marker. Releases 1.1 through
1.7 were security fixes, so check it against the Creator Store asset before
shipping a release.

---

## Trove — MIT

**Author:** Sleitnick, part of [RbxUtil](https://github.com/Sleitnick/RbxUtil)
**Location in Twill:** `ReplicatedStorage/Twill/Packages/Trove`

```
MIT License

Copyright (c) 2021 Stephen Leitnick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

> The copyright year above is taken from the RbxUtil repository. Confirm it
> against the upstream `LICENSE.md` when you cut a release.

---

## NamedSignal 2.3.2 — MIT

**Author:** Averlyst
**Source:** https://github.com/averlyst/NamedSignal
**Location in Twill:** `ReplicatedStorage/Twill/Packages/Signal`

```
MIT License

Copyright (c) 2026 Averlyst

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

This notice also appears in the module's own file header. **Do not strip it** —
MIT requires it to travel with the code.

---

## Cryptography — MIT

**Authors:** daily3014 and Xoifaii, from
[Luau Cryptography](https://github.com/daily3014/rbx-cryptography)
**Source:** https://github.com/daily3014/rbx-cryptography
**Announcement:** https://devforum.roblox.com/t/fastest-cryptography-library-for-roblox/3680271
**Location in Twill:** `ServerScriptService/TwillServer/Packages/Cryptography`

```
MIT License

Copyright (c) 2026 daily3014

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Modified.** The bundled copy carries three fixes to its random number
generator. MIT does not require modifications to be declared, but a notices file
that says otherwise about its own contents is worth correcting.

Twill reaches only a small part of this package: SHA-256, HMAC-SHA256, ChaCha20,
and Blake3, behind `Random` and `Token`.

---

## ProfileStore — Apache-2.0

**Author:** loleris, MAD STUDIO
**Source:** https://github.com/MadStudioRoblox/ProfileStore
**Location in Twill:** `ServerScriptService/TwillServer/Packages/ProfileStore`

Licensed under the Apache License, Version 2.0. The full text is at
http://www.apache.org/licenses/LICENSE-2.0 and **must be included** with any
redistribution that carries ProfileStore.

This is the strictest component in the bundle. Redistributing it obliges you to:

- ship a copy of the Apache-2.0 licence text
- retain all copyright, patent, trademark and attribution notices
- state prominently if you modified the file

**Twill makes no modifications to ProfileStore.** If you ever do, say so here.

---

## A note on scope

None of the above is copyleft. Bundling them does not force Twill's own code to
adopt their licences, which is why Twill is MIT. What they do require is that
their notices and terms travel with their code — which is what this file exists
to satisfy.

This is a practical engineering summary, not legal advice. If Twill ever ships
commercially or inside something larger, have someone qualified read it.
