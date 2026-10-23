import { expect, test } from 'claude-code/testing'

import { LEVEL_UP_LIFTS } from './quest'
import { MONSTERS, SKILLS } from './quest-foes'
import { ATTACK, CHEER, HURT, QUEST_ROWS, STAND as HERO, WALK_A, WALK_B } from './quest-hero'
import { ENCOUNTER, ENCOUNTER_FALL_TICKS, FAMILY, HOP, KING, KING_GATHER_TICKS, KING_MERGE_TICKS, kingStage, canCrown, slimeColumns, KING_COLLISION, KING_DROP, KINGS, kinFrame, MERGED, ONION, POOF, SCATTER, SLIME_ROWS } from './slime'

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
  expect(fits({ sprite: ONION.stand, lift: STAGE_PIXELS - ONION.stand.length + 1 })).toBe(false)
  expect(fits({ sprite: ONION.stand, lift: -1 })).toBe(false)
  expect(fits({ sprite: KING, lift: STAGE_PIXELS })).toBe(false)
  expect(fits({ sprite: KING, lift: STAGE_PIXELS - 1 })).toBe(true)
})

test('every slime sprite fits the sixteen-pixel stage at every lift it is drawn with', () => {
  expect(SLIME_ROWS * 2).toBe(STAGE_PIXELS)
  const kings = Object.values(KINGS)
  for (const sprite of [...kings.flatMap(king => [king.sprite, king.blink, king.squash]), ...MERGED, POOF]) {
    expect(fits({ sprite, lift: 0 })).toBe(true)
  }
  for (const { sprite, squash } of kings) {
    for (const drop of KING_DROP) expect(fits({ sprite: drop.squash ? squash : sprite, lift: drop.lift })).toBe(true)
  }
  for (const { sprites } of FAMILY) {
    for (const sprite of Object.values(sprites)) expect(fits({ sprite, lift: 0 })).toBe(true)
    for (const pose of [...HOP, ...SCATTER, KING_COLLISION]) expect(fits(kinFrame(sprites, pose))).toBe(true)
    // The encounter starts wholly above the stage and falls in.
    const encounter = ENCOUNTER.map(pose => kinFrame(sprites, pose))
    expect(encounter[0]?.lift).toBe(STAGE_PIXELS)
    for (const pose of encounter) expect(Number.isInteger(pose.lift)).toBe(true)
    for (const pose of encounter.slice(ENCOUNTER_FALL_TICKS)) expect(fits(pose)).toBe(true)
  }
})

test('every kin and every King share one size, so the slots and the King room stay fixed', () => {
  for (const { sprites } of FAMILY) {
    for (const sprite of Object.values(sprites)) expect(sprite.every(row => row.length === ONION.stand[0]!.length)).toBe(true)
  }
  for (const { sprite } of Object.values(KINGS)) {
    expect(sprite.length).toBe(KING.length)
    expect(sprite.every(row => row.length === KING[0]!.length)).toBe(true)
  }
})

test('every quest sprite fits the sixteen-pixel stage at every lift it is drawn with', () => {
  expect(QUEST_ROWS * 2).toBe(STAGE_PIXELS)
  for (const sprite of [HERO, WALK_A, WALK_B, ATTACK, HURT, POOF]) expect(fits({ sprite, lift: 0 })).toBe(true)
  for (const lift of LEVEL_UP_LIFTS) expect(fits({ sprite: CHEER, lift })).toBe(true)
  for (const art of [...Object.values(MONSTERS), ...Object.values(SKILLS)]) {
    for (const pose of art.frames) expect(fits(pose)).toBe(true)
  }
})

// Admission must leave room for every full-width pose, including the landing squash.
test('the smallest admitted King stage fits merged and crowned poses without horizontal clipping', () => {
  const count = FAMILY.findIndex((_, i) => canCrown(i + 1)) + 1
  expect(count).toBe(2)
  expect(canCrown(count - 1)).toBe(false)
  for (const sprite of [...MERGED, ...Object.values(KINGS).flatMap(king => [king.sprite, king.blink, king.squash])]) {
    for (const row of sprite) expect(row.length).toBeLessThanOrEqual(slimeColumns(count))
  }
})

// Every palette letter must paint, even when a shared merged shape uses new shades.
test('both Kings paint every nontransparent pixel of each merged pose', () => {
  for (const variant of ['king', 'metal'] as const) {
    for (const [i, sprite] of MERGED.entries()) {
      const frame = KING_GATHER_TICKS + i * KING_MERGE_TICKS / MERGED.length
      const pixels = kingStage(FAMILY.length, frame, null, 'still', variant)
      expect(pixels.flat().filter(pixel => pixel !== null).length).toBe(
        [...sprite.join('')].filter(pixel => pixel !== '.').length,
      )
    }
  }
})
