# Coding standards

Review-time rules. Each one is a judgement call: flag it as "possible …", say
what to derive or move, and let the author argue. No linter enforces these.

## Derive, don't restate

A number that follows from another number is written as the derivation.

- **Tests derive tick numbers from exported constants.** A test that waits
  `KING_GATHER_TICKS + KING_MERGE_TICKS` survives a retimed phase; one that
  waits `14` goes stale silently. Flag every bare tick, frame or column count
  in a test that an export (`HOP_TICKS`, `KING_*_TICKS`, `momentEndTick`,
  `FRAME_MS`, …) already names. If no export names it, the fix is to export
  one.
- **Constants derive from their tables.** A length or total comes from the
  table it measures (`HOP_TICKS = HOP.length`,
  `KING_MERGE_TICKS = MERGED.length * KING_MERGE_POSE_TICKS`), and a sum comes
  from its parts (`KING_SHOW_TICKS`). Flag a literal that duplicates what a
  table or sibling constant already says.

## One table per Moment kind

Per-kind behaviour of a Moment (see `CONTEXT.md`) belongs in its
`MOMENT_MOTION` entry in `plugins/pixel-hud/hooks/slime.ts`. Flag a `kind`
check the diff adds outside that table; the fix is a field on `MomentMotion`.
Older checks (the crown test in `nextMoment`, the damage flicker in the cell
renderer, `'reigning'` in `register.tsx`) predate the rule.

ADR 0013 lists the places a new kind touches. Flag a change that adds one more;
a change that folds one into the table (e.g. `PRIORITY` as a field) is welcome.

## Assertions that can fail

Flag an assertion that cannot go red when the code under test is wrong: a
value compared with itself (`assert.equal(f(x), f(x))`), an expected value
computed by the same function as the actual one, or a check that holds for any
input. The fix is an independent expectation: a literal picture, a
constant from the spec, or a different code path.
