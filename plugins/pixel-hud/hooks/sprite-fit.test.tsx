import { expect, test } from 'claude-code/testing'

import { BLINK, ENCOUNTER, ENCOUNTER_FALL_TICKS, HOP, KING, KING_DROP, MERGED, POOF, SCATTER, SLIME_ROWS, SQUASH, STAND, STRETCH, WIDE } from './slime'

const STAGE_PIXELS = 16

type Pose = { sprite: readonly string[]; lift: number }

// A full-height sprite cannot move up without leaving the top, so its jumps
// and falls (the King's drop and rebound) are the one exception.
function fits({ sprite, lift }: Pose): boolean {
  return Number.isInteger(lift) && lift >= 0 && (lift + sprite.length <= STAGE_PIXELS || sprite.length === STAGE_PIXELS)
}

test('every slime sprite fits the sixteen-pixel stage at every lift it is drawn with', () => {
  expect(SLIME_ROWS * 2).toBe(STAGE_PIXELS)
  for (const sprite of [STAND, SQUASH, WIDE, STRETCH, BLINK, KING, ...MERGED, POOF]) {
    expect(fits({ sprite, lift: 0 })).toBe(true)
  }
  for (const pose of [...HOP, ...SCATTER, ...KING_DROP]) expect(fits(pose)).toBe(true)
  // The encounter starts wholly above the stage and falls in.
  expect(ENCOUNTER[0]?.lift).toBe(STAGE_PIXELS)
  for (const pose of ENCOUNTER) expect(Number.isInteger(pose.lift)).toBe(true)
  for (const pose of ENCOUNTER.slice(ENCOUNTER_FALL_TICKS)) expect(fits(pose)).toBe(true)
})
