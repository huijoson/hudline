# 2026-10-18 Ticket #14: slime prefactor

Acceptance: 80 ms clock; no repeated blits; denial unseats the stage;
pure Moment priority; existing art and motion retained; King lasts 6.5–7 s.

- [x] Confirm branch ancestry and read ticket, spec, domain docs and ADRs.
- [x] Locate TDD instructions and agreed seams (pure slime module and testing host).
- [x] Rescale existing hop/show timing test-first.
- [ ] Introduce and test pure Moment arbitration; route King through it.
- [ ] Test and implement repaint-on-change, including denial and remount.
- [ ] Review diff and run npm test, plugin test, plugin validate.
- [ ] Commit small slices, merge feature tip, and write downstream notes.

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
