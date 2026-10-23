# 14. The stage is a theme

Date: 2026-10-23

## Status

Accepted.

## Context

The stage beside the branch has always meant the slime family, and
`register.tsx` calls the slime module by name. A second theme (a questing
hero, `docs/specs/quest-stage.md`) needs the same room, clock, moments and
repaint rules, with different art and one new trigger: a battle every time
the main agent finishes a task.

Until now motion marked rare moments: a session starting, a failure, a
compaction, a task of 20 seconds or more. A battle on every finished task is
much more frequent.

## Decision

- **One `Stage` interface, chosen once.** `plugin.json` declares a `stage`
  option (`slimes` or `quest`, default `slimes`), which `/config` shows as a
  picker. `register` picks the implementation at load and never branches on
  the theme again. Each theme supplies its columns, cells, text fallback,
  moment endpoints and the moment kinds it accepts. ADR 0013's single-Moment
  rule applies to every theme.
- **The quest stage battles on every finished task.** This is opt-in: a user
  who picks the quest theme has asked for the busier stage. A battle is short
  (under 3 s), is dropped rather than queued when one is already playing, and
  carries no text, so it still marks a moment and does not narrate.
- **The walk costs a repaint every second tick.** On the quest stage the
  resting motion is a scrolling walk, which changes more often than breath.
  Repaint-on-change keeps that to one blit per changed frame, and
  `slimesIdle: false` stops it.

## Alternatives

- **A separate plugin per theme:** duplicates the HUD, the meter and every
  Field rule that ADR 0011 already had to keep in step once.
- **Battles only after long tasks, like the King:** the user asked for a
  battle on every finished task. The King keeps its 20-second rule on the
  slime stage.
- **A slash command to switch themes live:** it would have to write settings
  itself. `/config` already does that.

## Consequences

Adding a theme is adding a module that implements `Stage` and an entry in
the option's list. Adding a monster or a skill to the quest theme is adding
a table row. The `slimesIdle` name now also governs the quest stage; renaming
it would break stored settings, so it stays.
