import { expect, test } from 'claude-code/testing'

import { LEVEL_UP_LIFTS } from './quest'
import { MONSTERS, SKILLS } from './quest-foes'
import { ATTACK, CHEER, HURT, QUEST_ROWS, STAND as HERO, WALK_A, WALK_B } from './quest-hero'
import { BLINK, ENCOUNTER, ENCOUNTER_FALL_TICKS, HOP, KING, KING_COLLISION, KING_DROP, MERGED, POOF, SCATTER, SLIME_ROWS, SQUASH, STAND, STRETCH, WIDE } from './slime'

const STAGE_PIXELS = 16

type Pose = { sprite: readonly string[]; lift: number }

// A full-height sprite cannot move up without leaving the top, so its jumps
// and falls (the King's drop and rebound, the hero's level-up) may rise past
// the top as long as part of it stays on stage. Nothing sinks below the floor.
function fits({ sprite, lift }: Pose): boolean {
  if (!Number.isInteger(lift) || lift < 0) return false
  return sprite.length < STAGE_PIXELS ? lift + sprite.length <= STAGE_PIXELS : lift < STAGE_PIXELS
}

test('the fit rule rejects a sprite that leaves the stage', () => {
  expect(fits({ sprite: STAND, lift: STAGE_PIXELS - STAND.length + 1 })).toBe(false)
  expect(fits({ sprite: STAND, lift: -1 })).toBe(false)
  expect(fits({ sprite: KING, lift: STAGE_PIXELS })).toBe(false)
  expect(fits({ sprite: KING, lift: STAGE_PIXELS - 1 })).toBe(true)
})

test('every slime sprite fits the sixteen-pixel stage at every lift it is drawn with', () => {
  expect(SLIME_ROWS * 2).toBe(STAGE_PIXELS)
  for (const sprite of [STAND, SQUASH, WIDE, STRETCH, BLINK, KING, ...MERGED, POOF]) {
    expect(fits({ sprite, lift: 0 })).toBe(true)
  }
  for (const pose of [...HOP, ...SCATTER, ...KING_DROP, KING_COLLISION]) expect(fits(pose)).toBe(true)
  // The encounter starts wholly above the stage and falls in.
  expect(ENCOUNTER[0]?.lift).toBe(STAGE_PIXELS)
  for (const pose of ENCOUNTER) expect(Number.isInteger(pose.lift)).toBe(true)
  for (const pose of ENCOUNTER.slice(ENCOUNTER_FALL_TICKS)) expect(fits(pose)).toBe(true)
})

test('every quest sprite fits the sixteen-pixel stage at every lift it is drawn with', () => {
  expect(QUEST_ROWS * 2).toBe(STAGE_PIXELS)
  for (const sprite of [HERO, WALK_A, WALK_B, ATTACK, HURT, POOF]) expect(fits({ sprite, lift: 0 })).toBe(true)
  for (const lift of LEVEL_UP_LIFTS) expect(fits({ sprite: CHEER, lift })).toBe(true)
  for (const art of [...Object.values(MONSTERS), ...Object.values(SKILLS)]) {
    for (const pose of art.frames) expect(fits(pose)).toBe(true)
  }
})
