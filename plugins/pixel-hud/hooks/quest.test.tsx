import { expect, test } from 'claude-code/testing'

import {
  GROUND_STEP_TICKS,
  LEVEL_UP_FLASH_TICKS,
  QUEST_DAMAGE_TICKS,
  QUEST_ENCOUNTER_TICKS,
  QUEST_LEVEL_UP_TICKS,
  WALK_CYCLE_TICKS,
  WALK_POSE_TICKS,
} from './quest'
import { slimeColumns } from './slime'
import { nextMoment, STAGE_ROWS } from './stage'
import { selectStage } from './stages'

// Decode the public Raster cells into their six pixel rows.
function pixels(cells: string) {
  const words = new Uint32Array(Uint8Array.from(atob(cells), ch => ch.charCodeAt(0)).buffer)
  const width = words.length / (STAGE_ROWS * 3)
  return Array.from({ length: STAGE_ROWS * 2 }, (_, row) =>
    Array.from({ length: width }, (_, col) => {
      const offset = (Math.floor(row / 2) * width + col) * 3
      const glyph = words[offset]
      if (row % 2 === 0) return glyph === 0x2580 ? words[offset + 1] : null
      if (glyph === 0x2584) return words[offset + 1]
      return glyph === 0x2580 && words[offset + 2] !== 0x01000000 ? words[offset + 2] : null
    }),
  )
}

test('the quest hero stands near the left over a dotted ground with a matching text fallback', () => {
  const quest = selectStage('quest')
  expect(quest.columns(4)).toBe(slimeColumns(4))
  const frame = pixels(quest.cells(4, 0, null, 'still'))
  expect(frame[0]?.slice(2, 7)).toEqual([null, 0x0058f8, 0x0058f8, null, null])
  expect(frame[5]?.slice(8, 16)).toEqual([0x686878, null, 0x686878, null, 0x686878, null, 0x686878, null])
  expect(quest.text(4).map(row => row.map(span => span.text).join(''))).toEqual([
    '   ██▄                      ',
    '  ▄██▄▀                     ',
    '▄ ▄███▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ',
  ])
})

test('walking alternates legs and scrolls the ground, then repeats its cycle', () => {
  const quest = selectStage('quest')
  const first = pixels(quest.cells(4, 0, null, 'breathe'))
  const scroll = pixels(quest.cells(4, GROUND_STEP_TICKS, null, 'breathe'))
  const stride = pixels(quest.cells(4, WALK_POSE_TICKS, null, 'breathe'))
  expect(scroll[5]?.slice(8)).not.toEqual(first[5]?.slice(8))
  expect(stride.map(row => row.slice(2, 7))).not.toEqual(first.map(row => row.slice(2, 7)))
  expect(quest.cells(4, WALK_CYCLE_TICKS, null, 'breathe')).toBe(quest.cells(4, 0, null, 'breathe'))
  for (let tick = 0; tick <= WALK_CYCLE_TICKS; tick += 1) {
    expect(quest.cells(4, tick, null, 'still')).toBe(quest.cells(4, 0, null, 'still'))
  }
})

test('the quest stage disappears below seventeen columns and admits no moments there', () => {
  const quest = selectStage('quest')
  for (const room of [0, 1, 2]) {
    expect(quest.columns(room)).toBe(0)
    expect(quest.cells(room, 0, null, 'breathe')).toBe('')
    expect(quest.text(room)).toEqual([])
    for (const kind of ['king', 'encounter', 'damage', 'level-up'] as const) {
      expect(quest.accepts(kind, room)).toBe(false)
    }
  }
  expect(quest.columns(3)).toBe(slimeColumns(3))
})

test('the encounter walks in from the left and hands back the plain rest at its endpoint', () => {
  const quest = selectStage('quest')
  const encounter = { kind: 'encounter', startTick: WALK_CYCLE_TICKS } as const
  expect(quest.accepts(encounter.kind, 3)).toBe(true)
  const first = pixels(quest.cells(3, encounter.startTick, encounter, 'breathe'))
  expect(first.slice(0, -1).every(row => row.every(pixel => pixel === null))).toBe(true)
  const middle = pixels(quest.cells(3, encounter.startTick + QUEST_ENCOUNTER_TICKS / 2, encounter, 'breathe'))
  expect(middle.slice(0, -1).some(row => row[0] !== null)).toBe(true)
  const end = quest.momentEndTick(encounter, 3, 'breathe')
  expect(end).toBe(encounter.startTick + QUEST_ENCOUNTER_TICKS)
  for (const rest of ['still', 'breathe', 'hop'] as const) {
    expect(quest.cells(3, end, encounter, rest)).toBe(quest.cells(3, end, null, rest))
  }
})

test('damage flickers the hurt hero three times and returns to rest after six ticks', () => {
  const quest = selectStage('quest')
  const damage = { kind: 'damage', startTick: WALK_CYCLE_TICKS, target: 0 } as const
  expect(quest.accepts(damage.kind, 3)).toBe(true)
  expect(quest.momentEndTick(damage, 3, 'still')).toBe(damage.startTick + QUEST_DAMAGE_TICKS)
  for (let frame = 0; frame < QUEST_DAMAGE_TICKS; frame += 1) {
    const picture = pixels(quest.cells(3, damage.startTick + frame, damage, 'still'))
    expect(picture.slice(0, -1).some(row => row.some(pixel => pixel !== null))).toBe(frame % 2 !== 0)
  }
  const end = quest.momentEndTick(damage, 3, 'breathe')
  expect(quest.cells(3, end, damage, 'breathe')).toBe(quest.cells(3, end, null, 'breathe'))
})

test('level-up raises the cheering hero and flashes gold and white for two ticks at the top', () => {
  const quest = selectStage('quest')
  const moment = { kind: 'level-up', startTick: WALK_CYCLE_TICKS } as const
  expect(quest.accepts(moment.kind, 3)).toBe(true)
  const end = quest.momentEndTick(moment, 3, 'breathe')
  expect(end).toBe(moment.startTick + QUEST_LEVEL_UP_TICKS)
  const frames = Array.from({ length: end - moment.startTick }, (_, frame) => pixels(quest.cells(3, moment.startTick + frame, moment, 'breathe')))
  const golden = frames.filter(frame => frame.some(row => row.includes(0xfcbc3c)))
  expect(golden.length).toBe(LEVEL_UP_FLASH_TICKS)
  expect(golden.every(frame => frame.some(row => row.includes(0xfcfcfc)))).toBe(true)
  expect(golden.every(frame => frame[0]?.includes(0xfcfcfc))).toBe(true)
  expect(quest.cells(3, end, moment, 'breathe')).toBe(quest.cells(3, end, null, 'breathe'))
})


test('quest admission rejects the King and only lets a higher-priority moment take over', () => {
  const quest = selectStage('quest')
  const damage = { kind: 'damage', startTick: 0, target: 0 } as const
  const encounter = { kind: 'encounter', startTick: 1 } as const
  const levelUp = { kind: 'level-up', startTick: 2 } as const
  expect(nextMoment(quest, null, damage, 3)).toBe(damage)
  expect(nextMoment(quest, damage, encounter, 3)).toBe(encounter)
  expect(nextMoment(quest, encounter, levelUp, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, encounter, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { ...levelUp, startTick: 3 }, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { kind: 'king', startTick: 3 }, 4)).toBe(levelUp)
})
