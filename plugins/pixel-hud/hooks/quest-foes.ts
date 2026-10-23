import { paint } from './slime'
import type { Palette, Pixels } from './slime'
import { ATTACK, QUEST_ROWS } from './quest-hero'

type Pose = { sprite: readonly string[]; lift: number }

// B body, H highlight, D shade, W eyes, K pupils, M mouth, E bat eyes.
export const MONSTERS = {
  slime: {
    palette: { B: 0x38c838, H: 0xb8f818, D: 0x008800, W: 0xfcfcfc, K: 0x0b0a0d, M: 0x981828 },
    frames: [
      { sprite: ['....B....', '...BHB...', '..BHHBB..', '.BWWBWWB.', 'BBWKBWKBB', 'BBBBBBBBB', 'DBBMMMBBD', '.DDDDDDD.'], lift: 0 },
    ],
  },
  bat: {
    palette: { B: 0x9878f8, H: 0xc8b8fc, D: 0x5838c0, E: 0xf83800 },
    frames: [
      { sprite: ['D.......D', 'BD.....DB', 'BBD.H.DBB', '.BBBHBBB.', '..BEBEB..', '...BDB...', '...D.D...'], lift: 0 },
      { sprite: ['....H....', '...BHB...', '..BEBEB..', '.BBBBBBB.', 'BBD.D.DBB', 'BD.....DB', 'D.......D'], lift: 0 },
    ],
  },
  skeleton: {
    palette: { B: 0xfcfcfc, H: 0xbcbcbc, K: 0x0b0a0d },
    frames: [
      { sprite: ['.BBBBB.', 'BBBBBBB', 'BKKBKKB', '.BBHBB.', '..HBH..', 'BHBBBHB', '..HBH..', '.BB.BB.'], lift: 0 },
    ],
  },
  ghost: {
    palette: { B: 0xbcf0fc, H: 0x3cbcfc, K: 0x0b0a0d },
    frames: [0, 1].map(lift => ({ sprite: ['..BBB..', '.BBBBB.', 'BBKBKBB', 'HBBBBBB', 'HBBKBBB', 'HBBBBBB', 'B.BB.BB'], lift })),
  },
} satisfies Record<string, { palette: Palette; frames: readonly Pose[] }>

export type Monster = keyof typeof MONSTERS

// Frame is a pose index; the caller owns the animation clock.
export function paintMonster(pixels: Pixels, monster: Monster, x: number, frame: number) {
  const art = MONSTERS[monster]
  const pose = art.frames[frame % art.frames.length] as Pose
  paint(pixels, pose.sprite, x, pose.lift, art.palette)
}

type EffectPose = Pose & { offset: number }

export const SKILLS = {
  slash: {
    heroStep: 1,
    origin: 'monster',
    originOffset: 0,
    palette: { W: 0xfcfcfc },
    frames: Array<EffectPose>(2).fill({ sprite: ['.....W', '....W.', '...W..', '..W...', '.W....', 'W.....'], lift: 0, offset: 0 }),
  },
  fireball: {
    heroStep: 0,
    origin: 'sword',
    originOffset: 0,
    palette: { O: 0xfca044, H: 0xfcd8a8 },
    frames: Array.from({ length: 6 }, (_, offset) => ({ sprite: ['.O.', 'OHO', '.O.'], lift: QUEST_ROWS * 2 - ATTACK.findIndex(row => row.includes('W')) - 2, offset })),
  },
  thunder: {
    heroStep: 0,
    origin: 'monster',
    originOffset: 0,
    palette: { Y: 0xf8d878 },
    frames: [2, 4, QUEST_ROWS * 2].map(rows => ({ sprite: ['..Y', '.Y.', 'YYY', '..Y', '.Y.', 'Y..', 'YYY', '..Y'].slice(0, rows), lift: QUEST_ROWS * 2 - rows, offset: 0 })),
  },
} satisfies Record<string, { heroStep: number; origin: 'monster' | 'sword'; originOffset: number; palette: Palette; frames: readonly EffectPose[] }>

export type Skill = keyof typeof SKILLS

export const SLASH_TICKS = SKILLS.slash.frames.length
export const FIREBALL_TICKS = SKILLS.fireball.frames.length
export const THUNDER_TICKS = SKILLS.thunder.frames.length

// Frame is elapsed effect ticks. Effects expire instead of looping; x is the
// monster's left edge for slash/thunder, or the sword's tip for fireball.
export function paintSkill(pixels: Pixels, skill: Skill, x: number, frame: number) {
  const art = SKILLS[skill]
  const pose = art.frames[frame]
  if (pose) paint(pixels, pose.sprite, x + pose.offset, pose.lift, art.palette)
}
