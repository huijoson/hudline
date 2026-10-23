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

// Decode the public Raster cells into the quest pixel rows.
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
      const end = quest.momentEndTick(moment, 4, 'breathe')
      expect((end - moment.startTick) * FRAME_MS >= 2400).toBe(true)
      expect((end - moment.startTick) * FRAME_MS <= 3000).toBe(true)
      const frame = (elapsed: number) => pixels(quest.cells(4, moment.startTick + elapsed, moment, 'breathe'))
      const foe = (elapsed: number) => frame(elapsed).slice(0, -1).flatMap(row => row.slice(BATTLE_MONSTER_X))
      expect(foe(BATTLE_APPROACH_TICKS).includes(MONSTERS[monster].palette.B)).toBe(true)
      const skillStart = BATTLE_SKILL_START
      const skillFrames = Array.from({ length: BATTLE_SKILL_TICKS[skill] }, (_, i) => frame(skillStart + i))
      expect(skillFrames.some(picture => picture.flat().includes(Object.values(SKILLS[skill].palette)[0]))).toBe(true)
      const hitStart = skillStart + BATTLE_SKILL_TICKS[skill]
      const hit = Array.from({ length: BATTLE_HIT_TICKS }, (_, i) => foe(hitStart + i).some(color => color !== null))
      expect(hit).toEqual([false, true, false, true, false, true])
      for (const tick of [end - 1, end, end + 1]) {
        expect(quest.cells(4, tick, moment, 'breathe')).toBe(quest.cells(4, tick, null, 'breathe'))
      }
    })
  }
}

test('the quest hero stands near the left over a dotted ground with a matching text fallback', () => {
  const quest = selectStage('quest')
  expect(quest.columns(4)).toBe(slimeColumns(4))
  const frame = pixels(quest.cells(4, 0, null, 'still'))
  expect(frame[0]?.slice(HERO_X + 2, HERO_X + 6)).toEqual([0x3cbcfc, 0x0058f8, 0x0058f8, 0x0000bc])
  expect(frame[7]?.slice(HERO_X + 2, HERO_X + 4)).toEqual([0x503000, 0x503000])
  expect(frame[7]?.slice(12, 20)).toEqual([0x686878, null, 0x686878, null, 0x686878, null, 0x686878, null])
  expect(quest.text(4).flat().map(span => span.color)).toEqual(Array(QUEST_ROWS).fill(`#${HERO_PALETTE.B.toString(16).padStart(6, '0')}`))
  expect(quest.text(4).map(row => row.map(span => span.text).join(''))).toEqual([
    '   ▄████▄ █                 ',
    '  ▄██████ █                 ',
    '  ███████▀█▀                ',
    '▄ ▄▀██▄██ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ',
  ])
})

test('walking alternates legs and scrolls the ground, then repeats its cycle', () => {
  const quest = selectStage('quest')
  const first = pixels(quest.cells(4, 0, null, 'breathe'))
  const scroll = pixels(quest.cells(4, GROUND_STEP_TICKS, null, 'breathe'))
  const stride = pixels(quest.cells(4, WALK_POSE_TICKS, null, 'breathe'))
  expect(scroll[7]?.slice(12)).not.toEqual(first[7]?.slice(12))
  expect(stride.map(row => row.slice(2, 7))).not.toEqual(first.map(row => row.slice(2, 7)))
  expect(quest.cells(4, WALK_CYCLE_TICKS, null, 'breathe')).toBe(quest.cells(4, 0, null, 'breathe'))
  for (let tick = 0; tick <= WALK_CYCLE_TICKS; tick += 1) {
    expect(quest.cells(4, tick, null, 'still')).toBe(quest.cells(4, 0, null, 'still'))
  }
})

test('the quest stage disappears below the full attack and widest monster width and admits no moments there', () => {
  const quest = selectStage('quest')
  for (let room = 0; slimeColumns(room) < QUEST_MIN_COLUMNS; room += 1) {
    expect(quest.columns(room)).toBe(0)
    expect(quest.cells(room, 0, null, 'breathe')).toBe('')
    expect(quest.text(room)).toEqual([])
    for (const kind of ['king', 'encounter', 'damage', 'level-up', 'battle'] as const) {
      expect(quest.accepts(kind, room)).toBe(false)
    }
  }
  expect(QUEST_MIN_COLUMNS).toBe(25)
  expect(BATTLE_MONSTER_X).toBe(HERO_SWORD_END + 2)
  expect(quest.columns(4)).toBe(slimeColumns(4))
})

test('the encounter walks in from the left and hands back the plain rest at its endpoint', () => {
  const quest = selectStage('quest')
  const encounter = { kind: 'encounter', startTick: WALK_CYCLE_TICKS } as const
  expect(quest.accepts(encounter.kind, 4)).toBe(true)
  const first = pixels(quest.cells(4, encounter.startTick, encounter, 'breathe'))
  expect(first.slice(0, -1).every(row => row.every(pixel => pixel === null))).toBe(true)
  const middle = pixels(quest.cells(4, encounter.startTick + QUEST_ENCOUNTER_TICKS / 2, encounter, 'breathe'))
  expect(middle.slice(0, -1).some(row => row[0] !== null)).toBe(true)
  const end = quest.momentEndTick(encounter, 4, 'breathe')
  expect(end).toBe(encounter.startTick + QUEST_ENCOUNTER_TICKS)
  for (const rest of ['still', 'breathe', 'hop'] as const) {
    expect(quest.cells(4, end, encounter, rest)).toBe(quest.cells(4, end, null, rest))
  }
})

test('damage flickers the hurt hero three times and returns to rest after six ticks', () => {
  const quest = selectStage('quest')
  const damage = { kind: 'damage', startTick: WALK_CYCLE_TICKS, target: 0 } as const
  expect(quest.accepts(damage.kind, 4)).toBe(true)
  expect(quest.momentEndTick(damage, 4, 'still')).toBe(damage.startTick + QUEST_DAMAGE_TICKS)
  for (let frame = 0; frame < QUEST_DAMAGE_TICKS; frame += 1) {
    const picture = pixels(quest.cells(4, damage.startTick + frame, damage, 'still'))
    expect(picture.slice(0, -1).some(row => row.some(pixel => pixel !== null))).toBe(frame % 2 !== 0)
  }
  const end = quest.momentEndTick(damage, 4, 'breathe')
  expect(quest.cells(4, end, damage, 'breathe')).toBe(quest.cells(4, end, null, 'breathe'))
})

test('level-up raises the cheering hero and flashes gold and white for two ticks at the top', () => {
  const quest = selectStage('quest')
  const moment = { kind: 'level-up', startTick: WALK_CYCLE_TICKS } as const
  expect(quest.accepts(moment.kind, 4)).toBe(true)
  const end = quest.momentEndTick(moment, 4, 'breathe')
  expect(end).toBe(moment.startTick + QUEST_LEVEL_UP_TICKS)
  const frames = Array.from({ length: end - moment.startTick }, (_, frame) => pixels(quest.cells(4, moment.startTick + frame, moment, 'breathe')))
  const golden = frames.filter(frame => frame[0]?.includes(0xac7c00) === true)
  expect(golden.length).toBe(LEVEL_UP_FLASH_TICKS)
  expect(golden.every(frame => frame.some(row => row.includes(0xfcfcfc)))).toBe(true)
  expect(golden.every(frame => frame[0]?.includes(0xfcfcfc))).toBe(true)
  expect(quest.cells(4, end, moment, 'breathe')).toBe(quest.cells(4, end, null, 'breathe'))
})


test('quest admission rejects the King and only lets a higher-priority moment take over', () => {
  const quest = selectStage('quest')
  const damage = { kind: 'damage', startTick: 0, target: 0 } as const
  const encounter = { kind: 'encounter', startTick: 1 } as const
  const levelUp = { kind: 'level-up', startTick: 2 } as const
  expect(nextMoment(quest, null, damage, 4)).toBe(damage)
  expect(nextMoment(quest, damage, encounter, 4)).toBe(encounter)
  const battle = { kind: 'battle', startTick: 2, monster: 'bat', skill: 'slash' } as const
  expect(nextMoment(quest, encounter, battle, 4)).toBe(battle)
  expect(nextMoment(quest, battle, encounter, 4)).toBe(battle)
  expect(nextMoment(quest, battle, { ...battle, startTick: 3 }, 4)).toBe(battle)
  expect(nextMoment(quest, battle, levelUp, 4)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, battle, 4)).toBe(levelUp)
  expect(nextMoment(quest, encounter, levelUp, 4)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, encounter, 4)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { ...levelUp, startTick: 3 }, 4)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { kind: 'king', startTick: 3 }, 4)).toBe(levelUp)
})


test('skills reach from the attacking sword into the monster without overlapping the hero', () => {
  const quest = selectStage('quest')
  const startTick = 0
  const skillStart = BATTLE_SKILL_START
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    const battle = { kind: 'battle', startTick, monster: 'bat', skill } as const
    const effectStart = skillStart + BATTLE_SKILL_TICKS[skill] - SKILLS[skill].frames.length
    const frame = (elapsed: number) => pixels(quest.cells(4, elapsed, battle, 'still'))
    const attackTip = HERO_SWORD_END - 1
    if (skill === 'slash') {
      // The streak crosses six columns of the monster.
      expect(frame(effectStart)[4]?.[attackTip + 1]).toBe(0xfcfcfc)
      expect(frame(effectStart)[7]?.[BATTLE_MONSTER_X]).toBe(0xfcfcfc)
      expect(frame(effectStart)[2]?.[BATTLE_MONSTER_X + 5]).toBe(0xfcfcfc)
    } else if (skill === 'fireball') {
      for (let tick = 0; tick < SKILLS.fireball.frames.length; tick += 1) {
        expect(frame(effectStart + tick)[4]?.slice(attackTip + tick, attackTip + tick + 3)).toEqual([0xfca044, 0xfcd8a8, 0xfca044])
      }
      expect(frame(effectStart + SKILLS.fireball.frames.length - 1)[4]?.[BATTLE_MONSTER_X + 2]).toBe(0xfca044)
    } else {
      expect(frame(effectStart)[0]?.[BATTLE_MONSTER_X + 2]).toBe(0xf8d878)
      expect(frame(effectStart + SKILLS.thunder.frames.length - 1)[7]?.[BATTLE_MONSTER_X + 2]).toBe(0xf8d878)
    }
  }
})

test('battle freezes the ground during combat and rejoins its scroll cycle for every start offset', () => {
  const quest = selectStage('quest')
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    for (let startTick = 0; startTick < WALK_CYCLE_TICKS; startTick += 1) {
      const moment = { kind: 'battle', startTick, monster: 'slime', skill } as const
      const end = quest.momentEndTick(moment, 4, 'breathe')
      const ground = (tick: number) => pixels(quest.cells(4, tick, moment, 'breathe'))[QUEST_ROWS * 2 - 1]?.slice(0, 2)
      const stopped = ground(startTick + BATTLE_APPROACH_TICKS)
      const resumeStart = end - BATTLE_RESUME_TICKS
      for (let tick = startTick + BATTLE_APPROACH_TICKS; tick < resumeStart; tick += 1) {
        expect(ground(tick)).toEqual(stopped)
      }
      for (let tick = end - GROUND_STEP_TICKS; tick <= end + GROUND_STEP_TICKS; tick += 1) {
        expect(ground(tick)).toEqual(pixels(quest.cells(4, tick, null, 'breathe'))[QUEST_ROWS * 2 - 1]?.slice(0, 2))
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
    expect(legs('still')).toEqual([0x686878, null, 0x503000, 0x503000, 0x686878])
    expect(legs('breathe')).not.toEqual(legs('still'))
  }
})
