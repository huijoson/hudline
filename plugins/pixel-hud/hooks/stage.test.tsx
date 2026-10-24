import { expect, test } from 'claude-code/testing'

import { MONSTERS } from './quest-foes'
import { FAMILY, KING_WIDTH, SLIME_STAGE, slimeColumns } from './slime'
import { nextMoment } from './stage'
import type { Moment } from './stage'
import { selectStage } from './stages'

test('the slime stage keeps its room and resting text fallback', () => {
  const stage = selectStage('slimes')
  expect(stage.maxRoom).toBe(FAMILY.length)
  expect(stage.text(1)).toEqual([
    [{ text: '           ', color: '#3880a8' }],
    [{ text: '     ▄     ', color: '#3880a8' }],
    [{ text: '     █     ', color: '#3880a8' }],
    [{ text: '   ▄███▄   ', color: '#3880a8' }],
    [{ text: ' ▄███████▄ ', color: '#3880a8' }],
    [{ text: '███████████', color: '#3880a8' }],
    [{ text: '███████████', color: '#3880a8' }],
    [{ text: ' ▀███████▀ ', color: '#3880a8' }],
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
  const king: Moment = { kind: 'king', startTick: 0, variant: 'king' }
  const kingRoom = 2
  expect(slimeColumns(kingRoom - 1)).toBeLessThan(KING_WIDTH)
  expect(slimeColumns(kingRoom)).toBeGreaterThanOrEqual(KING_WIDTH)
  expect(nextMoment(stage, encounter, damage, stage.maxRoom)).toBe(encounter)
  expect(nextMoment(stage, encounter, levelUp, stage.maxRoom)).toBe(levelUp)
  expect(nextMoment(stage, levelUp, king, kingRoom - 1)).toBe(levelUp)
  expect(nextMoment(stage, levelUp, king, kingRoom)).toBe(king)
  expect(nextMoment(stage, king, { ...king, startTick: 1 }, kingRoom)).toBe(king)
})


test('finished tasks pick quest battles and leave the slime stage without consuming randomness', () => {
  const picks = [1 / Object.keys(MONSTERS).length, 0.67]
  let pick = 0
  const random = () => picks[pick++]!
  expect(selectStage('slimes').taskMoment(12, random)).toBe(null)
  expect(selectStage('quest').taskMoment(12, random)).toEqual({ kind: 'battle', startTick: 12, monster: 'bat', skill: 'thunder' })
})
