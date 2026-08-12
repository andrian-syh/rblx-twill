# House style

Working notes for anyone writing pages under `src/content/docs/`. Not published:
this file lives outside the content collection on purpose.

## Voice

Write the way the Luau and Roblox Engine references write. Short declarative
sentences. State the rule, then the reason it exists. A sentence that could be
deleted without losing information should be deleted.

Say what a thing is for before saying how to call it. Say what it costs before
moving on.

## Banned

**Em dashes and en dashes.** Use a comma, a colon, a full stop, or brackets.
Rewrite the sentence if none of those fit.

**Double hyphens in prose.** `--` appears only inside Luau code, where it is
comment syntax.

**Filler**: *it is important to note*, *keep in mind*, *it is worth mentioning*,
*simply*, *just*, *let us dive in*, *at the end of the day*, *when it comes to*,
*that being said*.

**Marketing adjectives**: *powerful*, *robust*, *seamless*, *effortless*,
*elegant*, *comprehensive*, *cutting-edge*, *blazing fast*.

**Machine verbs**: *leverage*, *utilize*, *delve*, *unlock*, *empower*,
*streamline*, *facilitate*.

**Structural tells**: rhyming tricolons, "not only X but also Y", a closing
sentence that restates the section, transitions that carry no information,
stacked hedges, paragraphs of uniform length, prose broken into bullets for no
reason, bold used as decoration.

## Spelling

British, matching the author's own comments in the source: `licence`,
`recognise`, `serialising`, `behaviour`, `judgement`.

API and product names keep their own spelling: `Monetization`, `Serialize`,
`Authorization`, `ProfileStore`.

## Accuracy

Signatures come from the source, never from memory. When a page documents
behaviour, that behaviour was observed, not assumed.

Where something is unverified, say so on the page. A documented gap is useful. A
confident guess is worse than silence.

Avoid writing Roblox's own numbers into a page. Platform limits change, and a
page that names one goes stale without anyone noticing. Describe the shape of the
limit and point at the official documentation.

## Links, root-relative always

Write `[Design principles](/explanation/design-principles/)`. Never
`../design-principles/`. Trailing slash required.

Two facts force this, both confirmed by testing rather than assumed:

1. **Astro does not rewrite Markdown links for `base`.** A root-relative link
   alone 404s under a project-page sub-path. `plugins/rehype-base-links.mjs`
   prefixes them at build time, which is what makes them safe.
2. **`starlight-links-validator` never validates a relative link.** In its
   source, a relative link hits an early `return` before any check runs.
   `errorOnRelativeLinks` only decides whether to *report* it. A relative link is
   an unchecked link.

Relative links are therefore left as build errors on purpose.

**Frontmatter is not Markdown.** Hero action links and anything else in YAML
never reach the rehype plugin, and `starlight-links-validator` joins `base` into
its route table, so a root-relative action reads as invalid under a sub-path
however it is written. Two pieces cover this:

- `src/components/Hero.astro` prefixes the action links at render time.
- `HERO_ACTIONS` in `astro.config.mjs` excludes exactly those links from the
  validator, and nothing else.

Keep that set in step with `index.mdx`. If a page needs a link in frontmatter
somewhere other than the hero, build with `BASE_PATH` set and read the emitted
href before assuming it works.

**Concatenating onto `BASE_URL` needs care.** It is only guaranteed to end in a
slash when `base` was written with one. Strip and re-add:

```js
const prefix = import.meta.env.BASE_URL.replace(/\/+$/, '');
const href = `${prefix}/news/`;
```

## Nothing that goes stale on its own

Never write a count of modules, tests, assertions, or lines. Never enumerate a
set that grows: the server-only modules, the folder contents, the command list.
Both have been wrong on this site before, and a number nobody re-counts is worse
than no number, because it reads as authoritative.

State the **rule** instead, and link to the one page that has to be maintained
anyway:

- Not "the other six are server-only", but "a module stays on the server where
  what it holds would tell a client how to get around it".
- Not "twenty-three modules", but "one page per module".

The module reference and the sidebar are the only places a list belongs, because
a missing entry there fails the build.

The same applies to naming a tool where a category will do. Twill runs wherever a
place is assembled, so the docs say that, rather than naming today's tooling.

## Page shapes

**Getting Started** is the entry path: what Twill is, how to install it, and one
run through a working server. It assumes nothing.

**Core Guide** teaches one load-bearing concept properly. Start from the problem,
show the shape, name the trap. These are the pages a reader works through in
order.

**How-to guide** answers "how do I", and reads as tips and best practices. Open
with the problem in one or two sentences, then task-shaped headings, working
code, and the caveats that actually bite. It does not teach concepts; it links to
the Core Guide that does.

**Reference** describes the API. Complete over readable, but never inaccurate to
stay short.

**Explanation** covers why. No step-by-step, no full signatures.

## API reference anatomy

Every member gets the same block, in this order:

````markdown
### `Module.Member`

`[Server]` | `[Client]`

One sentence, imperative, saying what it is for.

```luau
function Module.Member(first: string, second: number?): boolean
```

**Parameters**

| Name | Type | Description |
| :--- | :--- | :--- |
| `first` | `string` | Only when the signature cannot say it alone. |

**Returns**

`boolean` - What the answer means.
````

Rules that hold without exception:

- **The badge is always present.** `[Server]`, `[Client]`, or both. A reader
  should never have to infer which side a call belongs on.
- **`Returns` is always present**, including `()` - Nothing.
- **What throws is stated** in a sentence after `Returns`, not left to be
  discovered.
- **`Yields` is stated** wherever it does.

A **parameters table** is added only where it earns its place: a unit, a bound, a
default, nil behaviour, or an options table. `Format.Plural(count, word)` needs
none. `Loop.Every(interval, callback, owner)` needs one, because every argument
carries a constraint the signature does not show.

Signatures are copied from the source, never from memory. When a page describes
behaviour, that behaviour was read in the source or observed in a playtest.

## Admonitions

Starlight asides, not blockquotes. Each carries a title in brackets that states
the point, so the box is readable without the body.

| Aside | For |
| --- | --- |
| `:::note` | Context worth having, no consequence if missed. |
| `:::tip` | A better way to do the thing being described. |
| `:::caution` | Something that will surprise you. |
| `:::danger` | Data loss, a security hole, or money. |

## Comments belong inside the code

A guide's code block explains itself. Put the reason in a comment on the line it
concerns rather than in a paragraph underneath, because the paragraph is not
there when somebody copies the block.

Comment the **why**, never the what. `-- Re-read after the yield: the player may
have left` earns its place. `-- Get the data` does not.

## Sidebar

Entries in `astro.config.mjs` are listed by slug rather than autogenerated, so
the order is editorial. An entry naming a page that does not exist fails the
build, which is the intended safety net.
