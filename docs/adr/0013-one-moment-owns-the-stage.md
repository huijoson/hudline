# 13. One Moment owns the stage

Date: 2026-10-18

## Status

Accepted.

## Context

The DQ slime restyle (#6) added three Moments (encounter, damage, level-up)
beside the King Slime show. Each is set off by an engine event that can arrive
at any tick, including during another Moment, and each draws the whole family.
Before #10, `register` expired only the King, with its own `KING_SHOW_TICKS`
check, so the other kinds, then only types, would have held the stage forever
once triggered. And a family leaving the King show rejoined the global hop
clock at once, in mid-air for 87 of 200 start ticks.

## Decision

- **One Moment at a time, by fixed priority.** `slime.ts` holds a single
  `Moment` value. `nextMoment` admits a newcomer only if it outranks the active
  one (King > level-up > encounter > damage). Equal or lower priority is
  dropped, never queued.
- **One expiry rule.** Every kind ends at `momentEndTick`, which is derived
  from the kind's per-Kin endpoint in the `MOMENT_MOTION` table. `register`
  never computes an end of its own. A new kind adds a `Moment` member, a
  `MOMENT_MOTION` row, a `PRIORITY` entry and its trigger in `register`.
- **Grounded rejoin.** When the Rest is hop, a Kin stays grounded after its
  endpoint until its own hop clock reaches a rest or a crouch. `momentEndTick`
  includes that wait. No Moment ever hands back a Kin in mid-air.

## Alternatives

- **Queue dropped Moments:** a backlog of failures or compactions would replay
  long after the cause, and a queued damage after a King show reads as a bug.
- **Layer Moments, for example damage over the King:** each pair would need its
  own compositing rules, and the slime stage is only three rows high
  (the quest theme uses four).
- **Per-kind expiry in `register`:** the shape before #10. Every new kind
  would need its own check, and a missed one never ends.
- **Rejoin the global clock at once:** simplest, but it drops Kin into the air
  for one frame.

## Consequences

A Moment can end up to `HOP_TICKS` ticks (under 1 s) after its last endpoint. A
lower-priority trigger that lands during a higher one is lost, and that is
intended. Tests pin the grounded-rejoin invariant. A change that breaks it is a
regression, not a style choice.
