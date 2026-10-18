# 12. Slimes breathe by default

Date: 2026-10-18

## Status

Accepted.

## Context

Commit c266c88 made the mod's slimes sit still by default to avoid paying for
continuous repaints. The Dragon Quest faces need a small resting squish and an
occasional blink to read as living slimes, even when hopping is off.

## Decision

Breath is on by default. Each slime keeps its own deterministic rhythm, mostly
standing, with a two-tick squish and a one-tick blink roughly every third cycle.
The existing repaint-on-change check answers the cost argument: the 80 ms clock
only blits when the Raster cells differ from the last seated frame.

`slimesIdle: false` restores plain STAND frames without repaints at rest.
`slimesHop: true` supersedes breath. Moments take priority over either resting
motion and play regardless of these options.

[ADR-0005](0005-narration-reports-state-not-events.md) still governs the
status-line Narration: it is driven by the current Payload and reports state.
The mod can keep state and receive engine events; its event-driven animations
carry no Narration text. These are different surfaces and contracts, so mod
moments do not change the status line's rule.

## Consequences

The default mod has motion at rest, reversing c266c88's decision. Users who want
perfect stillness can turn breath off without losing event animations. No new
status-line state, disk writes or Narration messages are introduced.
