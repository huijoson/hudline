import { QUEST_ROWS } from './quest'
import { expect, test } from 'claude-code/testing'

import {
  BATTLE_APPROACH_TICKS,
  BATTLE_SKILL_START,
  BATTLE_HIT_TICKS,
  BATTLE_MONSTER_X,
  BATTLE_RESUME_TICKS,
  HERO_SWORD_END,
  HERO_X,
  QUEST_MIN_COLUMNS,
  HERO_PALETTE,
  BATTLE_SKILL_TICKS,
  GROUND_STEP_TICKS,
  LEVEL_UP_FLASH_TICKS,
  QUEST_DAMAGE_TICKS,
  QUEST_ENCOUNTER_TICKS,
  QUEST_LEVEL_UP_TICKS,
  WALK_CYCLE_TICKS,
  WALK_POSE_TICKS,
} from './quest'
import { MONSTERS, SKILLS } from './quest-foes'
import type { Monster, Skill } from './quest-foes'
import { slimeColumns } from './slime'
import { FRAME_MS, nextMoment } from './stage'
import { selectStage } from './stages'

// Decode the public Raster cells into their six pixel rows.
function pixels(cells: string) {
  const words = new Uint32Array(Uint8Array.from(atob(cells), ch => ch.charCodeAt(0)).buffer)
  const width = words.length / (QUEST_ROWS * 3)
  return Array.from({ length: QUEST_ROWS * 2 }, (_, row) =>
    Array.from({ length: width }, (_, col) => {
      const offset = (Math.floor(row / 2) * width + col) * 3
      const glyph = words[offset]
      if (row % 2 === 0) return glyph === 0x2580 ? words[offset + 1] : null
      if (glyph === 0x2584) return words[offset + 1]
      return glyph === 0x2580 && words[offset + 2] !== 0x01000000 ? words[offset + 2] : null
    }),
  )
}

for (const monster of Object.keys(MONSTERS) as Monster[]) {
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    test(`battle defeats ${monster} with ${skill} and returns to the walk`, () => {
      const quest = selectStage('quest')
      const moment = { kind: 'battle', startTick: WALK_CYCLE_TICKS, monster, skill } as const
      const end = quest.momentEndTick(moment, 3, 'breathe')
      expect((end - moment.startTick) * FRAME_MS >= 2400).toBe(true)
      expect((end - moment.startTick) * FRAME_MS <= 3000).toBe(true)
      const frame = (elapsed: number) => pixels(quest.cells(3, moment.startTick + elapsed, moment, 'breathe'))
      const foe = (elapsed: number) => frame(elapsed).slice(0, -1).flatMap(row => row.slice(BATTLE_MONSTER_X))
      expect(foe(BATTLE_APPROACH_TICKS).includes(MONSTERS[monster].palette.B)).toBe(true)
      const skillStart = BATTLE_SKILL_START
      const skillFrames = Array.from({ length: BATTLE_SKILL_TICKS[skill] }, (_, i) => frame(skillStart + i))
      expect(skillFrames.some(picture => picture.flat().includes(Object.values(SKILLS[skill].palette)[0]))).toBe(true)
      const hitStart = skillStart + BATTLE_SKILL_TICKS[skill]
      const hit = Array.from({ length: BATTLE_HIT_TICKS }, (_, i) => foe(hitStart + i).some(color => color !== null))
      expect(hit).toEqual([false, true, false, true, false, true])
      for (const tick of [end - 1, end, end + 1]) {
        expect(quest.cells(3, tick, moment, 'breathe')).toBe(quest.cells(3, tick, null, 'breathe'))
      }
    })
  }
}

test('the quest hero stands near the left over a dotted ground with a matching text fallback', () => {
  const quest = selectStage('quest')
  expect(quest.columns(4)).toBe(slimeColumns(4))
  const frame = pixels(quest.cells(4, 0, null, 'still'))
  expect(frame[1]?.slice(2, 8)).toEqual([null, 0x0058f8, 0x0058f8, 0x0058f8, null, 0xfcfcfc])
  expect(frame[5]?.slice(8, 16)).toEqual([0x686878, null, 0x686878, null, 0x686878, null, 0x686878, null])
  expect(quest.text(4).flat().map(span => span.color)).toEqual(Array(QUEST_ROWS).fill(`#${HERO_PALETTE.B.toString(16).padStart(6, '0')}`))
  expect(quest.text(4).map(row => row.map(span => span.text).join(''))).toEqual([
    '   ▄▄▄ █                    ',
    '  ▄███▄█                    ',
    '▄ ████▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ',
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
  for (let room = 0; slimeColumns(room) < QUEST_MIN_COLUMNS; room += 1) {
    expect(quest.columns(room)).toBe(0)
    expect(quest.cells(room, 0, null, 'breathe')).toBe('')
    expect(quest.text(room)).toEqual([])
    for (const kind of ['king', 'encounter', 'damage', 'level-up', 'battle'] as const) {
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
  const battle = { kind: 'battle', startTick: 2, monster: 'bat', skill: 'slash' } as const
  expect(nextMoment(quest, encounter, battle, 3)).toBe(battle)
  expect(nextMoment(quest, battle, encounter, 3)).toBe(battle)
  expect(nextMoment(quest, battle, { ...battle, startTick: 3 }, 3)).toBe(battle)
  expect(nextMoment(quest, battle, levelUp, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, battle, 3)).toBe(levelUp)
  expect(nextMoment(quest, encounter, levelUp, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, encounter, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { ...levelUp, startTick: 3 }, 3)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { kind: 'king', startTick: 3 }, 4)).toBe(levelUp)
})


test('skills reach from the attacking sword into the monster without overlapping the hero', () => {
  const quest = selectStage('quest')
  const startTick = 0
  const skillStart = BATTLE_SKILL_START
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    const battle = { kind: 'battle', startTick, monster: 'bat', skill } as const
    const effectStart = skillStart + BATTLE_SKILL_TICKS[skill] - SKILLS[skill].frames.length
    const frame = (elapsed: number) => pixels(quest.cells(3, elapsed, battle, 'still'))
    const attackTip = HERO_SWORD_END - 1
    if (skill === 'slash') {
      // The streak crosses five columns of the monster.
      expect(frame(effectStart)[3]?.[attackTip + 1]).toBe(0xfcfcfc)
      expect(frame(effectStart)[5]?.[BATTLE_MONSTER_X]).toBe(0xfcfcfc)
      expect(frame(effectStart)[1]?.[BATTLE_MONSTER_X + 4]).toBe(0xfcfcfc)
    } else if (skill === 'fireball') {
      for (let tick = 0; tick < SKILLS.fireball.frames.length; tick += 1) {
        expect(frame(effectStart + tick)[2]?.slice(attackTip + tick, attackTip + tick + 2)).toEqual([0xfca044, 0xfca044])
      }
      expect(frame(effectStart + SKILLS.fireball.frames.length - 1)[3]?.[BATTLE_MONSTER_X + 2]).toBe(0xfca044)
    } else {
      expect(frame(effectStart)[0]?.[BATTLE_MONSTER_X + 2]).toBe(0xf8d878)
      expect(frame(effectStart + SKILLS.thunder.frames.length - 1)[5]?.[BATTLE_MONSTER_X]).toBe(0xf8d878)
    }
  }
})

test('battle freezes the ground during combat and rejoins its scroll cycle for every start offset', () => {
  const quest = selectStage('quest')
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    for (let startTick = 0; startTick < WALK_CYCLE_TICKS; startTick += 1) {
      const moment = { kind: 'battle', startTick, monster: 'slime', skill } as const
      const end = quest.momentEndTick(moment, 3, 'breathe')
      const ground = (tick: number) => pixels(quest.cells(3, tick, moment, 'breathe'))[5]?.slice(0, 2)
      const stopped = ground(startTick + BATTLE_APPROACH_TICKS)
      const resumeStart = end - BATTLE_RESUME_TICKS
      for (let tick = startTick + BATTLE_APPROACH_TICKS; tick < resumeStart; tick += 1) {
        expect(ground(tick)).toEqual(stopped)
      }
      for (let tick = end - GROUND_STEP_TICKS; tick <= end + GROUND_STEP_TICKS; tick += 1) {
        expect(ground(tick)).toEqual(pixels(quest.cells(3, tick, null, 'breathe'))[5]?.slice(0, 2))
      }
    }
  }
})

test('still rest keeps standing legs during encounter and battle travel while breathe walks', () => {
  const quest = selectStage('quest')
  const battle = { kind: 'battle', startTick: 0, monster: 'slime', skill: 'slash' } as const
  const end = quest.momentEndTick(battle, quest.maxRoom, 'still')
  const encounter = { kind: 'encounter', startTick: 0 } as const
  const samples = [
    { moment: encounter, tick: QUEST_ENCOUNTER_TICKS - 1 },
    { moment: battle, tick: BATTLE_APPROACH_TICKS - 1 },
    { moment: battle, tick: end - BATTLE_RESUME_TICKS },
  ]
  for (const { moment, tick } of samples) {
    const legs = (rest: 'still' | 'breathe') => pixels(quest.cells(quest.maxRoom, tick, moment, rest))[QUEST_ROWS * 2 - 1]?.slice(HERO_X, HERO_X + 5)
    expect(legs('still')).toEqual([0x686878, 0x0000bc, 0x686878, 0x0000bc, 0x686878])
    expect(legs('breathe')).not.toEqual(legs('still'))
  }
})
