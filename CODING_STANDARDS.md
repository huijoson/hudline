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

Per-kind behaviour of a Moment (see `CONTEXT.md`, ADR 0013) lives in the
`MOMENT_MOTION` entry in `plugins/pixel-hud/hooks/slime.ts`. Flag a new
`if (moment.kind === …)` or `switch` on the kind outside that table; the fix
is a field on `MomentMotion`.

Adding a kind today touches `Moment`, `MOMENT_MOTION`, `PRIORITY` and the
trigger in `register.tsx`. Flag a change that adds a fifth place; a change that
folds one of these into the table (e.g. `PRIORITY` as a field) is welcome.

## Assertions that can fail

Every assertion must be able to go red when the code under test is wrong.
Flag a value compared with itself (`assert.equal(f(x), f(x))`), an expected
value computed by the same function as the actual one, and a check that holds
for any input. The fix is an independent expectation: a literal picture, a
constant from the spec, or a different code path.
