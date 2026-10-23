import { paint } from './slime'
import type { Palette, Pixels } from './slime'
import { QUEST_ROWS } from './quest-hero'

type Pose = { sprite: readonly string[]; lift: number }

const INK = 0x0b0a0d

// B body, H highlight, K eyes, '.' transparent. Feet sit on the sixth row.
export const MONSTERS = {
  slime: {
    palette: { B: 0x38c838, H: 0xb8f818, K: INK },
    frames: [{ sprite: ['..HHH..', '.BBBBB.', 'BBKBKBB', '.BBBBB.'], lift: 0 }],
  },
  bat: {
    palette: { B: 0x9878f8, H: 0xc8b8fc, K: INK },
    frames: [
      { sprite: ['B.....B', 'BB.H.BB', '.BBHBB.', '..KBK..', '..B.B..'], lift: 0 },
      { sprite: ['...H...', '..BHB..', '.BKBKB.', 'BBB.BBB', 'B.....B'], lift: 0 },
    ],
  },
  skeleton: {
    palette: { B: 0xfcfcfc, H: 0xbcbcbc, K: INK },
    frames: [{ sprite: ['.BBB.', 'BKBKB', '.BBB.', 'BBHBB', '..H..', '.B.B.'], lift: 0 }],
  },
  ghost: {
    palette: { B: 0xbcf0fc, H: 0x3cbcfc, K: INK },
    frames: [0, 1].map(lift => ({ sprite: ['.BBB.', 'BKBKB', 'BBBBB', 'BBHBB', 'B.B.B'], lift })),
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
    frames: Array<EffectPose>(2).fill({ sprite: ['....W', '...W.', '..W..', '.W...', 'W....'], lift: 0, offset: 0 }),
  },
  fireball: {
    heroStep: 0,
    origin: 'sword',
    originOffset: 0,
    palette: { O: 0xfca044 },
    frames: Array.from({ length: 6 }, (_, offset) => ({ sprite: ['OO', 'OO'], lift: 2, offset })),
  },
  thunder: {
    heroStep: 0,
    origin: 'monster',
    originOffset: 0,
    palette: { Y: 0xf8d878 },
    frames: [2, 4, QUEST_ROWS * 2].map(rows => ({ sprite: ['..Y', '.Y.', 'YYY', '..Y', '.Y.', 'Y..'].slice(0, rows), lift: QUEST_ROWS * 2 - rows, offset: 0 })),
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
