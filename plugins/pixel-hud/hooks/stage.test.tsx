import { expect, test } from 'claude-code/testing'

import { FAMILY, KING_WIDTH, SLIME_STAGE, SLIME_WIDTH } from './slime'
import { nextMoment } from './stage'
import type { Moment } from './stage'
import { selectStage } from './stages'

test('the slime stage keeps its room and resting text fallback', () => {
  const stage = selectStage('slimes')
  expect(stage.maxRoom).toBe(FAMILY.length)
  expect(stage.text(1)).toEqual([
    [{ text: '   ▄   ', color: '#3cbcfc' }],
    [{ text: ' ▄███▄ ', color: '#3cbcfc' }],
    [{ text: '███████', color: '#3cbcfc' }],
  ])
})

for (const option of [undefined, 'slimes', 'unknown', false]) {
  test(`stage ${String(option)} selects the slime theme`, () => {
    expect(selectStage(option)).toBe(SLIME_STAGE)
  })
}

test('stage admission keeps priority and the King room requirement', () => {
  const stage = selectStage('slimes')
  const encounter: Moment = { kind: 'encounter', startTick: 0 }
  const damage: Moment = { kind: 'damage', startTick: 0, target: 0 }
  const levelUp: Moment = { kind: 'level-up', startTick: 0 }
  const king: Moment = { kind: 'king', startTick: 0 }
  const kingRoom = Math.ceil(KING_WIDTH / SLIME_WIDTH)
  expect(nextMoment(stage, encounter, damage, stage.maxRoom)).toBe(encounter)
  expect(nextMoment(stage, encounter, levelUp, stage.maxRoom)).toBe(levelUp)
  expect(nextMoment(stage, levelUp, king, kingRoom - 1)).toBe(levelUp)
  expect(nextMoment(stage, levelUp, king, kingRoom)).toBe(king)
  expect(nextMoment(stage, king, { ...king, startTick: 1 }, kingRoom)).toBe(king)
})
