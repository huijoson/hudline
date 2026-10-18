# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- Closest schema value. The real surface is a terminal: a Claude Code status
line and a Claude Code mod band drawn above the prompt. Not a browser. -->

## Users

Developers who live in agent CLIs (Claude Code first; also GitHub Copilot CLI,
Antigravity CLI, Qwen Code) and want context use, quota left and token flow
visible at a glance while they work, without opening anything.

## Product Purpose

hudline writes a single status line from the host's payload: context, 5-hour
and weekly quota, cost, and cumulative token flow. pixel-hud is the same line
as a Claude Code mod, drawn above the prompt with the git branch in 8-bit pixel
letters and a slime family beside it. The slimes are companions: they give the
HUD character and mark moments (such as a long task finishing with the King
Slime), and must never get in the way of reading the numbers.

*Inferred from the repository and the 2026-10-18 shape session; not yet
explicitly confirmed by the owner.*

## Positioning

One Format string portable across hosts through per-host adapters, with zero
npm dependencies, no network calls and no persistent state. The mod adds a
game-flavoured (Dragon Quest slime) presence that a plain status line cannot.

## Capabilities and Constraints

- The status line is plain stdout text; the mod draws through Claude Code's
  `$.ui` Raster (half-block cells, two pixels per cell) and repaints with
  `$.ui.blit` on a `$.clock` timer.
- Where no Raster exists, the slimes fall back to one still frame as text.
- The slime stage is 3 text rows tall; slimes leave one by one to make room
  for the branch name on narrow terminals.
- Domain terms live in `CONTEXT.md`; decisions in `docs/adr/`.

## Brand Commitments

- Default neon theme (ADR 0006). Pixel-art slimes in the Dragon Quest family
  palette: slime, she-slime, metal slime, bubble slime, and the King Slime.

## Evidence on Hand

- Showcase renders: `docs/showcase/hudline.png`, `pixel-hud.png`,
  `pixel-hud-king.png`, all with sample values only. No real usage data,
  testimonials or metrics; do not fabricate them.

## Product Principles

1. The numbers come first; decoration never costs readability or width the
   data needs.
2. Report state, not events (ADR 0005); motion marks moments, it does not
   narrate.
3. Cheap at rest: nothing runs or repaints that the user cannot see change.
4. Degrade quietly: missing data or capabilities disappear rather than error.
