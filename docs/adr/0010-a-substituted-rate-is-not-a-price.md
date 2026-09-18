# 10. A substituted rate is not a price, so the money is Missing

Date: 2026-09-17

## Status

Accepted.

## Context

[ADR-0008](0008-the-host-prices-the-money.md) decided that Conversation cost is
what the Host reports, at list price, or it is Missing. That was written about a
Host that has no cost to report. It did not consider a Host that reports a cost
it cannot stand behind.

Claude Code prices a Conversation client-side from a model catalogue compiled
into the binary. Every id in that catalogue is a Claude id: the price table's
keys are built from `CATALOG_MODEL_IDS`, all nineteen of which are `claude-*`,
and the loader refuses to start if one ever is not. When the model that served a
request is not in that catalogue, the Host does not decline to answer. It prices
the request at a substituted default rate — the same rate whatever actually ran
— and reports the sum as `cost.total_cost_usd`.

Nothing on the Status line says so. The Host knows: it latches
`hasUnknownModelCost` and reports a per-model `costBasis` of `"unknown"`. Neither
reaches the Status line. The `cost` object in the status line Payload is
`{total_cost_usd, ...!1, total_duration_ms, …}`, where the `...!1` is a spread of
`false` over a field that is not there. A session whose model was routed through
a third-party gateway therefore shows the money of a model that was never run,
in the same typeface as the real thing.

What to do about a number that can be seen to be a guess turns on a fact about
the Host's pricing rather than on a fact about the Payload: **pricing follows the
model the API served, not the model the session asked for.** The Payload's
`model.id` is the latter — the main-loop model as configured — and on a routed
session the two are different strings. The transcript records the former, on
every assistant row, as `message.model`.

## Decision

The Claude Code Adapter treats `cost` as Missing when the transcript shows that a
model outside the Host's catalogue served the Conversation.

`sumUsageLines` collects the distinct served model ids as it walks the rows it
already walks. The Adapter declares `cost` in `transcriptExtract`, and its `cost`
extract returns `undefined` when any served id is not catalogue-shaped. The test
is `/claude-/i` — the shape of an id, never a list of ids; a list would be a
price table under another name (ADR-0008), and this question only needs the
answer "could the Host hold a price for this at all".

Missing is concluded only from evidence. If the transcript cannot be read, or
names no model, the money is shown. `{cost}` is now enough on its own to make the
renderer read the transcript, where before only the token-flow Fields did.

## Alternatives

**Test the Payload's `model.id`.** Rejected, and this is the one worth recording,
because it is free and it is wrong. It reads the model the session asked for,
and the failure it is meant to catch lives in the gap between that and the model
served. On the routed session that prompted this it would have passed silently
and gone on printing the guess.

**Read the transcript's `cost-state` row, which carries `hasUnknownModelCost`.**
Rejected: it is the Host's own answer, exactly, and it is not there when it is
needed. The row is written by the ledger-save path late in a session — across 33
transcripts on one machine, 20 rows in 19 files, at most two per file, and none
at all in the session that was asking. A live session is precisely the one a
status line is rendering.

**Ship a price table and price the tokens ourselves.** Rejected in ADR-0008, and
rejected again here for a further reason: the model arrives through a reseller,
so any published list price is a third party's guess at a rate nobody published.

## Consequences

- **A correct number can be withdrawn.** The Host's own test for "can I price
  this" is the catalogue *or* a server-supplied `additional_model_costs` map, and
  that map does not reach the status line either. So when a gateway or reseller
  supplies rates for a model outside the catalogue, the Host is right and this
  rule hides it. That is the case this decision is worst at, and it is the
  revisiting trigger: **the day the status line Payload carries `costBasis`, or a
  reseller supplies rates, this rule is what to delete.** The field would answer
  the question directly, and the guesswork would go with it.
- A user whose `modelOverrides` maps a non-Claude id onto a Claude one is priced
  by the Host and hidden here. Deliberate, rare, and wrong in the direction that
  hides rather than lies.
- `{cost}` now costs a transcript read. For the default line it is free — that
  Format already asks for the token flow — but a Format that asks only for the
  money will read the file where it previously did not.
- A Conversation that changed models mid-flight carries a guess inside its total,
  so it is Missing rather than partly right. There is no way to subtract it out,
  and a total that is mostly right is the thing this ADR exists to stop printing.
