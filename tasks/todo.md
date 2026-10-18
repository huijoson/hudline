# 2026-10-18 Ticket #14: slime prefactor

Acceptance: 80 ms clock; no repeated blits; denial unseats the stage;
pure Moment priority; existing art and motion retained; King lasts 6.5–7 s.

- [x] Confirm branch ancestry and read ticket, spec, domain docs and ADRs.
- [x] Locate TDD instructions and agreed seams (pure slime module and testing host).
- [x] Rescale existing hop/show timing test-first.
- [x] Introduce and test pure Moment arbitration; route King through it.
- [x] Test and implement repaint-on-change, including denial and remount.
- [x] Review diff and run npm test, plugin test, plugin validate.
- [x] Commit small slices, merge feature tip, and write downstream notes.

## Dependencies & Environment
Node / npm and Claude Code 2.1.302; no external services for tests.
Requested .claude/skills/tdd/SKILL.md is absent; installed TDD skill read at
/Users/yuhan/.agents/skills/tdd/SKILL.md (including tests.md and mocking.md).

## Working Notes
Low risk, local animation prefactor. Rollback: revert the scoped commits.
Keep sprites, options/defaults, command copy and trigger rules unchanged.
Later tickets own breath, new hop poses, new events and restaging the King.

Timing slice: missing FRAME_MS export failed first; 42 plugin tests pass after
rescaling. Show length is 87 frames / 6960 ms. Preserve the shipped pose cadence
by sampling at elapsed milliseconds; later tickets replace these pose tables.

Moment slice: missing nextMoment export failed first; 43 plugin tests passed.
Moment is a discriminated union with kind/startTick and damage-only target.
Equal priority keeps the active moment; no queue. Other moment art/events are
intentionally deferred. King room checks happen before replacing the active value.

## Results
- 80 ms clock; original sprites, resting default, show phases and trigger/copy
  behaviour retained. King duration: 6960 ms.
- Pure Moment priority and room checks; King rendering uses its start tick.
- Per-seat cell comparison replaces isStill/wasShowing; initial render and
  remount seed the comparison. Denial still unseats only the matching stage.
- Test-first evidence: missing timing/Moment exports failed before their
  implementation; repeated-blit test received 2 frames instead of 1 before fix.
- Final npm test: 95 pass, 0 fail. Plugin test: 46 pass, 0 fail.
- Plugin validate: passed. TypeScript 5.9.3: zero errors, using the exact
  declarations extracted from installed Claude Code 2.1.302's bundled zstd
  asset and the compiler options documented in that asset's header. The
  generated types stay ignored; temporary config is outside the repo.
  Command: npm exec --yes --package typescript@5.9.3 -- tsc -p /tmp/hudline-dq/01-tsconfig.json
- Independent diff review: no blocking findings. git diff --check: clean.
- Downstream notes: /tmp/hudline-dq/notes/01.md. Showcase renderer still uses
  140 ms; its update belongs to the later showcase ticket.
- No version bumps, pushes, PRs or issue writes. No service/config migration.
