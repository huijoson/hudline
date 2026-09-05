# 7. Token flow is two layers, and `in` did not survive it

Date: 2026-09-04

## Status

Accepted

## Context

`{in}` was mapped to Anthropic's `input_tokens`, which counts only the input
that was neither read from cache nor written to it. Claude Code always caches,
so that residue is a handful of tokens per request. On a real 145-response
conversation in this repository it summed to **290**, against 19.6M read from
cache — 0.0014% of what actually moved. The default line printed:

```
ctx 8%  │  in 290  out 196.6k  cr 19.6M  cw 385.2k  tot 20.2M
```

Every number there is correct and the row is unreadable. `in` is three orders
of magnitude below `out`; `tot` is a hundred times the context window sitting
beside a `ctx` that says 8%; and nothing on the line says which of the five
counts already contains which. A flat list of five numbers gives the reader no
way to tell, so they assume — in whichever direction makes the line look
sensible, which is the wrong direction.

The README already carried a caveat for `tot` ("usually 90%+ cache reads … a
volume number, not a cost number"). That was a patch applied in the wrong
place: the caveat lived in the README and the confusion lived on the line.

Underneath all of it, `CONTEXT.md` had never defined a single one of these
terms. `Field`, `Representation`, `Narration` and `Threshold colour` were
pinned down precisely; `in`, `out`, `cr`, `cw` and `tot` existed only as a row
of extractors and a table cell. Vocabulary the glossary does not hold is
vocabulary that drifts, and this is what drifted.

## Decision

**The token Fields are a flow meter, not a bill.** They answer how much moved
over a Conversation, and only that. `{cost}` and the quota windows already
answer "what did this cost" and "how much allowance is left" on the same line;
a second, quieter answer to a question already answered is worth less than a
straight answer to one nothing else asks.

**Flow is counted in two layers.** `tot` is Input plus Output. Cache reads and
cache writes are a *breakdown* of Input; thinking is a breakdown of Output. A
breakdown never joins the sum.

That has six consequences, and they are the decision:

- **`in` is removed and replaced by `sent`**, which counts everything sent to
  the model — uncached input plus cache reads plus cache writes. This is what a
  reader already believes "input" means.
- **Breakdowns render as a share of their parent, not as an absolute.** `cr`
  and `cw` are percentages of `sent`, `th` a percentage of `out`. `cr 19.6M`
  beside `sent 20.0M` is the same number printed twice; `cr 98%` is the thing
  the reader wanted to know.
- **No Field for uncached input.** It is `sent − cr − cw`, it is 0.0015%, and
  its only use is checking the other two. Verification is not a status line's
  job.
- **The new ratios get no Threshold colour and no Meter.** A Threshold colour
  answers "is this dangerous now", and no honest ramp exists for a cache hit
  rate — 98% is good news, 20% only means the Conversation is young. The
  Narration decides what to say by asking the Threshold colour, so a fabricated
  ramp here would spend its one sentence on cache statistics.
- **A Conversation is one transcript.** `/clear` starts a new one, `--resume`
  continues one, a subagent's turns belong to the Conversation that spawned it,
  and compaction does not end one.
- **`tot` is always computed, never read from a Host's Payload.** Its
  definition is ours now.

## Considered options

The choice was not whether to fix `in` but how to break it.

**Keep the key, change the arithmetic.** Rejected: every existing Format would
have silently swapped one number for another three orders of magnitude away.
Nobody would discover they had been reading the wrong thing; they would
conclude the tool had started lying.

**Alias `in` to the new name**, the way `wk` aliases `7d`. Rejected, and the
precedent argues against it rather than for it: that alias preserved a
*meaning* under a new name. This one would preserve a *name* under a new
meaning — the opposite use of the same mechanism, and it would keep the old
intuition alive indefinitely.

**Remove the key.** Chosen. An unknown key is printed literally, so an
out-of-date Format renders a visible `{in}` on the line. It is ugly, and it is
the point: the break announces itself.

**Rename `out` too, to `up`/`down`.** Rejected. `out` never changed meaning,
and its holders did nothing wrong. Break exactly what changed.

## Consequences

**`tot` does not move.** 19,976,563 + 196,552 = 20,173,115, precisely what the
flat four-way sum produced. Only `in` changes value, which makes this a smaller
change than its version bump suggests.

**It closes a cross-Host bug rather than opening one.** Two independent
third-party samples of Copilot CLI's payload show `total_input_tokens` an order
of magnitude *above* `total_cache_read_tokens` — impossible under Anthropic's
disjoint semantics, and strong evidence that Copilot's input figure already
includes cache. If so, `{in}` has meant two different things on two Hosts all
along, which is exactly what ADR 0002 exists to forbid; after this change the
two agree. The sample payload shipped in `src/hosts/copilot-cli.js` encoded the
disjoint assumption and was wrong — it was our assumption written down as
though it were observation, and the Wizard was previewing it as fact.

That inference is drawn from samples, not from GitHub's documentation, which
does not describe the relationship. It should be confirmed against a running
Copilot CLI when one is available.

**Ratios can be Missing where counts cannot.** Before the first response there
is no denominator, and a ratio with no denominator is absent rather than zero.
`0` remains a valid count.

**The default line carries `sent`, `cr`, `out`, `th` and neither `tot` nor
`cw`.** Both remain Fields and both stay in the `tokens` template, which exists
for full accounting. They leave the default line under one rule: it does not
carry a number derivable from other numbers already on it. `tot` is within 1%
of `sent`; `cw` is `100 − cr` once a 0.0015% remainder is ignored.

**Breaking, released as 0.5.0.**
