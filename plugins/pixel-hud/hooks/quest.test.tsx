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
import { HERO_PALETTE, QUEST_ROWS } from './quest-hero'
import { FRAME_MS, nextMoment } from './stage'
import { selectStage } from './stages'

const FLOOR = QUEST_ROWS * 2 - 1
const GROUND = 0x686878
const BOOT = 0x6a4020

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
      const end = quest.momentEndTick(moment, quest.maxRoom, 'breathe')
      expect((end - moment.startTick) * FRAME_MS >= 2400).toBe(true)
      expect((end - moment.startTick) * FRAME_MS <= 3000).toBe(true)
      const frame = (elapsed: number) => pixels(quest.cells(quest.maxRoom, moment.startTick + elapsed, moment, 'breathe'))
      const foe = (elapsed: number) => frame(elapsed).slice(0, -1).flatMap(row => row.slice(BATTLE_MONSTER_X))
      expect(foe(BATTLE_APPROACH_TICKS).includes(MONSTERS[monster].palette.B)).toBe(true)
      const skillStart = BATTLE_SKILL_START
      const skillFrames = Array.from({ length: BATTLE_SKILL_TICKS[skill] }, (_, i) => frame(skillStart + i))
      const colour = { slash: 0x8cc8fc, fireball: 0xf85818, thunder: 0xfcd848 }[skill]
      expect(skillFrames.some(picture => picture.flat().includes(colour))).toBe(true)
      const hitStart = skillStart + BATTLE_SKILL_TICKS[skill]
      const hit = Array.from({ length: BATTLE_HIT_TICKS }, (_, i) => foe(hitStart + i).some(color => color !== null))
      expect(hit).toEqual([false, true, false, true, false, true])
      for (const tick of [end - 1, end, end + 1]) {
        expect(quest.cells(quest.maxRoom, tick, moment, 'breathe')).toBe(quest.cells(quest.maxRoom, tick, null, 'breathe'))
      }
    })
  }
}

test('the quest hero stands near the left over a dotted ground with a matching text fallback', () => {
  const quest = selectStage('quest')
  expect(quest.columns(quest.maxRoom)).toBe(QUEST_MIN_COLUMNS)
  const frame = pixels(quest.cells(quest.maxRoom, 0, null, 'still'))
  // The helmet's crest is the gold Loto emblem between blue plates.
  expect(frame[1]?.slice(HERO_X + 6, HERO_X + 11)).toEqual([0x78b8fc, 0x2068f8, 0xfcbc3c, 0x2068f8, 0x0828a0])
  expect(frame[FLOOR]?.slice(HERO_X + 2, HERO_X + 4)).toEqual([BOOT, BOOT])
  expect(frame[FLOOR]?.slice(24, 32)).toEqual([GROUND, null, GROUND, null, GROUND, null, GROUND, null])
  expect(quest.text(quest.maxRoom).flat().map(span => span.color)).toEqual(Array(QUEST_ROWS).fill(`#${HERO_PALETTE.B.toString(16).padStart(6, '0')}`))
  expect(quest.text(quest.maxRoom).map(row => row.map(span => span.text).join(''))).toEqual([
    '  ▄     ▄██▄▄    █                            ',
    '  ██▄ ▄███████▄  █                            ',
    '  ▀████████████▄▄█▄▄                          ',
    '    ██████████  ▄█▄                           ',
    '   ▀████████▀█████████                        ',
    '  ▄█████████ █████████                        ',
    '  ▀█████████ █████████                        ',
    '▄ ▄ ████▄███▄ ███████ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ',
  ])
})

test('walking alternates legs and scrolls the ground, then repeats its cycle', () => {
  const quest = selectStage('quest')
  const first = pixels(quest.cells(quest.maxRoom, 0, null, 'breathe'))
  const scroll = pixels(quest.cells(quest.maxRoom, GROUND_STEP_TICKS, null, 'breathe'))
  const stride = pixels(quest.cells(quest.maxRoom, WALK_POSE_TICKS, null, 'breathe'))
  expect(scroll[FLOOR]?.slice(24)).not.toEqual(first[FLOOR]?.slice(24))
  expect(stride.map(row => row.slice(2, 7))).not.toEqual(first.map(row => row.slice(2, 7)))
  expect(quest.cells(quest.maxRoom, WALK_CYCLE_TICKS, null, 'breathe')).toBe(quest.cells(quest.maxRoom, 0, null, 'breathe'))
  for (let tick = 0; tick <= WALK_CYCLE_TICKS; tick += 1) {
    expect(quest.cells(quest.maxRoom, tick, null, 'still')).toBe(quest.cells(quest.maxRoom, 0, null, 'still'))
  }
})

test('the quest stage takes exactly the attack and widest monster width whenever it has room', () => {
  const quest = selectStage('quest')
  expect(quest.columns(0)).toBe(0)
  expect(quest.cells(0, 0, null, 'breathe')).toBe('')
  expect(quest.text(0)).toEqual([])
  for (const kind of ['king', 'encounter', 'damage', 'level-up', 'battle'] as const) {
    expect(quest.accepts(kind, 0)).toBe(false)
  }
  // Hero offset 2, attack 26, gap 2 and the 16-pixel bat.
  expect(QUEST_MIN_COLUMNS).toBe(46)
  for (let room = 1; room <= quest.maxRoom; room += 1) {
    expect(quest.columns(room)).toBe(QUEST_MIN_COLUMNS)
  }
})

test('the encounter walks in from the left and hands back the plain rest at its endpoint', () => {
  const quest = selectStage('quest')
  const encounter = { kind: 'encounter', startTick: WALK_CYCLE_TICKS } as const
  expect(quest.accepts(encounter.kind, quest.maxRoom)).toBe(true)
  const first = pixels(quest.cells(quest.maxRoom, encounter.startTick, encounter, 'breathe'))
  expect(first.slice(0, -1).every(row => row.every(pixel => pixel === null))).toBe(true)
  const middle = pixels(quest.cells(quest.maxRoom, encounter.startTick + QUEST_ENCOUNTER_TICKS / 2, encounter, 'breathe'))
  expect(middle.slice(0, -1).some(row => row[0] !== null)).toBe(true)
  const end = quest.momentEndTick(encounter, quest.maxRoom, 'breathe')
  expect(end).toBe(encounter.startTick + QUEST_ENCOUNTER_TICKS)
  for (const rest of ['still', 'breathe', 'hop'] as const) {
    expect(quest.cells(quest.maxRoom, end, encounter, rest)).toBe(quest.cells(quest.maxRoom, end, null, rest))
  }
})

test('damage flickers the hurt hero three times and returns to rest after six ticks', () => {
  const quest = selectStage('quest')
  const damage = { kind: 'damage', startTick: WALK_CYCLE_TICKS, target: 0 } as const
  expect(quest.accepts(damage.kind, quest.maxRoom)).toBe(true)
  expect(quest.momentEndTick(damage, quest.maxRoom, 'still')).toBe(damage.startTick + QUEST_DAMAGE_TICKS)
  for (let frame = 0; frame < QUEST_DAMAGE_TICKS; frame += 1) {
    const picture = pixels(quest.cells(quest.maxRoom, damage.startTick + frame, damage, 'still'))
    expect(picture.slice(0, -1).some(row => row.some(pixel => pixel !== null))).toBe(frame % 2 !== 0)
  }
  const end = quest.momentEndTick(damage, quest.maxRoom, 'breathe')
  expect(quest.cells(quest.maxRoom, end, damage, 'breathe')).toBe(quest.cells(quest.maxRoom, end, null, 'breathe'))
})

test('level-up raises the cheering hero and flashes gold and white for two ticks at the top', () => {
  const quest = selectStage('quest')
  const moment = { kind: 'level-up', startTick: WALK_CYCLE_TICKS } as const
  expect(quest.accepts(moment.kind, quest.maxRoom)).toBe(true)
  const end = quest.momentEndTick(moment, quest.maxRoom, 'breathe')
  expect(end).toBe(moment.startTick + QUEST_LEVEL_UP_TICKS)
  const frames = Array.from({ length: end - moment.startTick }, (_, frame) => pixels(quest.cells(quest.maxRoom, moment.startTick + frame, moment, 'breathe')))
  // Only the flash has pure white (the helmet's light and the shield).
  const golden = frames.filter(frame => frame.flat().includes(0xfcfcfc))
  expect(golden.length).toBe(LEVEL_UP_FLASH_TICKS)
  expect(golden.every(frame => !frame.flat().includes(HERO_PALETTE.B) && frame.flat().includes(0xfcbc3c))).toBe(true)
  expect(golden.every(frame => frame[0]?.includes(0xfcfcfc))).toBe(true)
  // Raised off the ground: only the ground line is left on the floor row.
  expect(golden.every(frame => frame[FLOOR]?.every(pixel => pixel === null || pixel === GROUND))).toBe(true)
  expect(quest.cells(quest.maxRoom, end, moment, 'breathe')).toBe(quest.cells(quest.maxRoom, end, null, 'breathe'))
})


test('quest admission rejects the King and only lets a higher-priority moment take over', () => {
  const quest = selectStage('quest')
  const damage = { kind: 'damage', startTick: 0, target: 0 } as const
  const encounter = { kind: 'encounter', startTick: 1 } as const
  const levelUp = { kind: 'level-up', startTick: 2 } as const
  expect(nextMoment(quest, null, damage, quest.maxRoom)).toBe(damage)
  expect(nextMoment(quest, damage, encounter, quest.maxRoom)).toBe(encounter)
  const battle = { kind: 'battle', startTick: 2, monster: 'bat', skill: 'slash' } as const
  expect(nextMoment(quest, encounter, battle, quest.maxRoom)).toBe(battle)
  expect(nextMoment(quest, battle, encounter, quest.maxRoom)).toBe(battle)
  expect(nextMoment(quest, battle, { ...battle, startTick: 3 }, quest.maxRoom)).toBe(battle)
  expect(nextMoment(quest, battle, levelUp, quest.maxRoom)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, battle, quest.maxRoom)).toBe(levelUp)
  expect(nextMoment(quest, encounter, levelUp, quest.maxRoom)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, encounter, quest.maxRoom)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { ...levelUp, startTick: 3 }, quest.maxRoom)).toBe(levelUp)
  expect(nextMoment(quest, levelUp, { kind: 'king', startTick: 3 }, quest.maxRoom)).toBe(levelUp)
})


test('skills reach from the attacking sword into the monster without overlapping the hero', () => {
  const quest = selectStage('quest')
  const startTick = 0
  const skillStart = BATTLE_SKILL_START
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    const battle = { kind: 'battle', startTick, monster: 'bat', skill } as const
    const effectStart = skillStart + BATTLE_SKILL_TICKS[skill] - SKILLS[skill].frames.length
    const frame = (elapsed: number) => pixels(quest.cells(quest.maxRoom, elapsed, battle, 'still'))
    const attackTip = HERO_SWORD_END - 1
    if (skill === 'slash') {
      // The streak runs from the monster's bottom-left corner up across it.
      expect(frame(effectStart)[FLOOR]?.[BATTLE_MONSTER_X]).toBe(0xfcfcfc)
      expect(frame(effectStart)[4]?.[BATTLE_MONSTER_X + SKILLS.slash.frames[0]!.sprite[0]!.length - 1]).toBe(0xfcfcfc)
      expect(frame(effectStart).every(row => row.slice(0, BATTLE_MONSTER_X).every(p => p !== 0xfcfcfc && p !== 0x8cc8fc))).toBe(true)
    } else if (skill === 'fireball') {
      // The white core rides the blade's two rows from just past the tip.
      for (let tick = 0; tick < SKILLS.fireball.frames.length; tick += 1) {
        for (const row of [7, 8]) {
          expect(frame(effectStart + tick)[row]?.slice(attackTip + tick + 2, attackTip + tick + 4)).toEqual([0xfcfcfc, 0xfcfcfc])
        }
      }
      expect(frame(effectStart + SKILLS.fireball.frames.length - 1)[7]?.[BATTLE_MONSTER_X + 4]).toBe(0xfcfcfc)
    } else {
      expect(frame(effectStart)[0]?.[BATTLE_MONSTER_X + 5]).toBe(0xfcd848)
      expect(frame(effectStart + SKILLS.thunder.frames.length - 1)[12]?.[BATTLE_MONSTER_X]).toBe(0xfcd848)
    }
  }
})

test('battle freezes the ground during combat and rejoins its scroll cycle for every start offset', () => {
  const quest = selectStage('quest')
  for (const skill of Object.keys(SKILLS) as Skill[]) {
    for (let startTick = 0; startTick < WALK_CYCLE_TICKS; startTick += 1) {
      const moment = { kind: 'battle', startTick, monster: 'slime', skill } as const
      const end = quest.momentEndTick(moment, quest.maxRoom, 'breathe')
      const ground = (tick: number) => pixels(quest.cells(quest.maxRoom, tick, moment, 'breathe'))[QUEST_ROWS * 2 - 1]?.slice(0, 2)
      const stopped = ground(startTick + BATTLE_APPROACH_TICKS)
      const resumeStart = end - BATTLE_RESUME_TICKS
      for (let tick = startTick + BATTLE_APPROACH_TICKS; tick < resumeStart; tick += 1) {
        expect(ground(tick)).toEqual(stopped)
      }
      for (let tick = end - GROUND_STEP_TICKS; tick <= end + GROUND_STEP_TICKS; tick += 1) {
        expect(ground(tick)).toEqual(pixels(quest.cells(quest.maxRoom, tick, null, 'breathe'))[QUEST_ROWS * 2 - 1]?.slice(0, 2))
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
    const legs = (rest: 'still' | 'breathe') => pixels(quest.cells(quest.maxRoom, tick, moment, rest))[FLOOR]?.slice(HERO_X, HERO_X + 5)
    expect(legs('still')).toEqual([GROUND, null, BOOT, BOOT, BOOT])
    expect(legs('breathe')).not.toEqual(legs('still'))
  }
})
