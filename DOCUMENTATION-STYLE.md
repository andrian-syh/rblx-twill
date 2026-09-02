# Documentation style

How every reference page in this repository is written. It exists so that a
reader who has read one page already knows where to look on the next one.

The rules below are derived from two sources and adapted to this project: the
Diataxis definition of reference material, and the Google developer
documentation style guide.

## What a reference page is

A reference page describes the machinery. It states what a function takes, what
it returns, what it refuses, and what it costs. It does not teach a task and it
does not argue a position.

Three things belong somewhere else:

| Reader's question | Where it belongs |
| :--- | :--- |
| How do I get started? | Getting started |
| How do I build feature X? | A guide |
| Why was it built this way? | A news post, or nowhere |

If a sentence answers one of those, cut it. A reader consulting reference
material is already working and wants an answer, not a tour.

## Page skeleton

Every module page uses these sections, in this order. Sections that have no
content are left out rather than filled.

```
---
title: <Module>
description: <One sentence. What the module does. No period on a fragment.>
---

<Opening code block: the shortest real use of the module.>

## <Concept sections>

## API

### `Module.Function`

## Limits
```

**Opening code block.** Five lines or fewer. Real names, not `foo`. It shows the
common case, not the complete case.

**Concept sections.** Zero to four of them. Each one exists because the API
section cannot carry it: a shared idea two functions both depend on, an ordering
requirement, a lifecycle. If a concept section only restates what the API table
already says, delete it.

**API section.** One `###` heading per public function, in the order the module
declares them. Each entry carries, in this order:

1. Environment tags: `` `[Server]` `` and `` `[Client]` ``, joined by `|`.
2. One sentence saying what the function does.
3. The signature, in a `luau` block.
4. A **Parameters** table, when there are parameters.
5. A **Returns** line, when it returns something.
6. What it throws, when it throws.
7. At most two sentences of anything else that is true and load bearing.

**Limits.** Numbers a caller can hit: sizes, rates, ceilings, timeouts. A table,
not prose. Leave the section out when the module has none.

## Sentences

Aim for twenty five words. Split anything past forty.

Present tense, active voice, and the subject is the thing being described.

| Instead of | Write |
| :--- | :--- |
| The value will be returned by the function | The function returns the value |
| It is recommended that you call Close | Call Close |
| This can be used to store data | This stores data |

Say what happens, not what could happen. `Decode` returns `nil` on a malformed
payload. It does not "gracefully handle" one.

State a constraint as a constraint. "The key must be 32 bytes" is better than
"be sure to use a 32 byte key".

## Words and constructions to avoid

**Filler.** simply, just, easily, quickly, of course, note that, please note, as
you can see, it is worth mentioning, in order to, at this time.

**Praise.** powerful, robust, elegant, seamless, blazing, lightweight, flexible,
intuitive, comprehensive, best in class. A reference page does not sell.

**Hedging.** might, could potentially, generally, typically, in most cases. If
the behaviour is conditional, name the condition.

**Aphorism.** A sentence that sounds quotable is usually a sentence that does not
inform. "The path that refuses a flood is the path a flood runs down" is writing
about the code rather than describing it.

**The rule of three.** Three adjectives, three parallel clauses, three items
where two would do. It reads as rhythm rather than content.

**Second person plural.** "we", "our", "let's". The reader is one person and the
documentation is not a companion.

## Punctuation and formatting

**No em dashes and no double hyphens as punctuation.** Use a comma, a colon, a
semicolon, or two sentences. The `--` inside a Luau doc tag is a separator and is
allowed.

**No emoji anywhere.**

**No bold for emphasis inside a paragraph.** Bold is for the label at the start
of a line, as used throughout this file. A paragraph that needs emphasis needs
rewriting.

**Backticks** for every identifier, file name, and literal value.

**Tables** for anything with more than two parallel facts. Prose loses them.

**One blank line** between blocks. No trailing whitespace.

**Line length** wraps at 80 characters in the source. It does not affect the
rendered page and it makes review diffs readable.

## Examples

Every example compiles and does what the surrounding text says. An example that
would not run is worse than no example.

Use the names a real caller would use. `player`, `keep`, `allowance`, `remote`.
Not `myVariable`, `foo`, `example1`.

Show the common case. The complete case belongs in the parameter table.

## Accuracy

Every statement is checked against the module source, not against memory of it.
A number in the documentation is a number that appears in the code.

When the code changes, the page changes in the same commit. A page describing
behaviour the module no longer has is worse than a missing page, because a reader
has no way to tell.

## Beyond reference pages

Everything above about sentences, words, punctuation, and accuracy applies to
every page in the documentation. The page skeleton does not: a guide is a
sequence of steps, an explanation is an argument, and a news post is a record of
one release.

What changes per section:

| Section | Shape | Opens with |
| :--- | :--- | :--- |
| Getting started | Numbered steps the reader follows in order | What they will have at the end |
| Core guides | One subject, worked through | What the subject is, in a sentence |
| Guides | One task, start to finish | The task, and when it applies |
| Explanation | An argument, with its costs | The position being argued |
| News | One release | What changed and who it affects |

**Callouts.** A reference page uses none. A guide may use `:::caution` or
`:::danger` for a hazard that costs data, money, or security, and nothing else.
`:::note` and `:::tip` are prose that has been put in a box; write the prose.

**Bold.** The same rule everywhere: a label at the start of a line. Two
exceptions, both from the Google style guide: a UI element the reader clicks
(`**Play**`), and a term at the point it is defined.

**Em dashes** are banned in body text, as everywhere else. A news post title may
keep one, because the titles are already published under those names.

**Links** are never broken across a line. Where a link does not fit, start it on
its own line.

## A worked example

Before, from an earlier version of the `Limit` page:

> The path that refuses a flood is the path a flood runs down. A line written per
> refusal turns the limiter into an amplifier for the traffic it is rejecting.
>
> `Throttle` answers that. It says how many were refused since it last spoke, and
> nothing at all in between.

After:

> Logging once per refusal makes the log the flood. `Throttle` counts refusals
> instead, and answers with the count at most once per interval. Writing the line
> stays with the caller.

The second version is shorter, says the same two facts, and reads as description
rather than as a line someone was pleased with.
