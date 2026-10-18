# 13. One Moment owns the stage

Date: 2026-10-18

## Status

Accepted.

## Context

The DQ slime restyle (#6) added three Moments (encounter, damage, level-up)
beside the King Slime show. Each is set off by an engine event that can arrive
at any tick, including during another Moment, and each draws the whole family.
Tickets 05–08 found two failure classes: Moments other than the King never
expired, and a family leaving a Moment rejoined the global hop clock
mid-air (87 of 200 start ticks for the King show).

## Decision

- **One Moment at a time, by fixed priority.** `slime.ts` holds a single
  `Moment` value. `nextMoment` admits a newcomer only if it outranks the active
  one (King > level-up > encounter > damage). Equal or lower priority is
  dropped, never queued.
- **One expiry rule.** Every kind ends at `momentEndTick`, which is derived
  from the kind's per-Kin endpoint in the `MOMENT_MOTION` table. `register`
  never computes an end of its own. A new kind is one `MOMENT_MOTION` row, plus
  a `PRIORITY` entry.
- **Grounded rejoin.** With `rest: 'hop'`, a Kin stays grounded after its
  endpoint until its own hop clock reaches a rest or a crouch (at most
  `HOP_TICKS - 1` ticks). `momentEndTick` includes that wait. No Moment ever
  hands back a Kin in mid-air.

## Alternatives

- **Queue dropped Moments:** a backlog of failures or compactions would replay
  long after the cause, and a queued damage after a King show reads as a bug.
- **Layer Moments, for example damage over the King:** each pair would need its
  own compositing rules, and the stage is only three rows high.
- **Per-kind expiry in `register`:** the shape before ticket 05. `register`
  expired only the King, with its own `KING_SHOW_TICKS` check, so every other
  kind held the stage forever.
- **Rejoin the global clock at once:** simplest, but it drops Kin into the air
  for one frame.

## Consequences

A Moment can end up to 11 ticks (under 1 s) after its last visible frame. A
lower-priority trigger that lands during a higher one is lost, and that is
intended. Tests pin the grounded-rejoin invariant. A change that breaks it is a
regression, not a style choice.
