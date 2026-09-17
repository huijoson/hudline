# 8. The Host prices the money

Date: 2026-09-17

## Status

Accepted.

## Context

The question that opened this was whether the package should work out its own
money: fetch the official list prices, multiply by the token counts, and stop
depending on whatever number the Host hands over. The complaint underneath it —
"the Bar's cost doesn't match `/cost`" — read like the reported value was wrong,
and a price table is the obvious way to stop trusting it.

Both halves of that reading turned out to be wrong.

The mismatch was not in the value. `/cost` and the Payload's
`cost.total_cost_usd` read the same accumulator; they are the same number,
written to different precisions ([ADR-0009](0009-cost-is-written-the-way-the-host-writes-it.md)).

And a table of ours would be strictly worse at the job. The Host computes this
figure client-side at list price from the same usage record it bills from, and
that record is finer than the Payload: its cost function splits cache writes
into the 5m and 1h tiers, counts web searches, and applies the data-residency
multiplier, where the Payload carries the sum of the cache writes and no web
search count at all. List prices times the Payload's coarser counts is an
approximation of a number that was already exact.

What the investigation did establish is what a price table would cost us. There
is no official machine-readable price source: the models endpoint carries no
pricing, and the official table exists only as a Markdown page that holds no
model ids and grants no licence to redistribute. The practical sources are
community mirrors — LiteLLM's JSON (MIT, and only 29 KB once trimmed to
Anthropic) and OpenRouter's catalogue (exact match, no open licence) — which
agree with each other and with the official page today, and would have to be
re-checked against that page on every refresh to keep being worth anything.

## Decision

Conversation cost is what the Host reports, at list price, or it is Missing.
This package ships no price table, no refresh command, and no cross-source
validation.

## Alternatives

**Ship a LiteLLM-derived table and a `hudline prices --update` command.**
Rejected for now, not forever. The design was worked out in full — a
machine-wide cache, the bundled table as the floor, newer-of-the-two wins, the
diff printed before it is written — and it is the right design the day a Host
reports token counts without a cost. None does today.

**Scrape the official pricing page as the only source.** Rejected. It is the
authority on price and the only place all five columns live together, but it
names models by display name, so it cannot be the only input, and it cannot be
vendored into a package that has to work offline.

**Read the price catalogue baked into the installed Claude Code binary.**
Rejected as anything but a last resort. The table is real and complete — 19
models, 8 tiers — but it is minified bundle internals behind a byte offset that
moves with the version, with no stability guarantee and no licence. A status
line whose money depends on where a brace sits inside someone else's 220 MB
binary is a status line that breaks on their next release.

## Consequences

- A Host that reports no cost shows no money. That is the Missing policy
  working, not a gap: inventing a number from a table we maintain ourselves is
  the same mistake as any other placeholder.
- The revisit trigger is explicit. The first Host that supplies token counts
  without a cost makes the table worth its maintenance — and that day, this ADR
  is the design to pick up.
