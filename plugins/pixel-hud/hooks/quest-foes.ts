import { bodyPalette, ONION, paint } from './slime'
import type { Palette, Pixels } from './slime'
import { ATTACK_BLADE_LIFT, QUEST_ROWS } from './quest-hero'

type Pose = { sprite: readonly string[]; lift: number }

// B body, L light body, H highlight or side shade, D shade, E deep shade, W eyes, K pupils, M mouth.
// The bat's pupils are red; the skeleton's K and W are its sockets and teeth gaps.
const QUEST_SLIME = ONION.stand
const SLIME_PAL = bodyPalette({ B: 0x38c838, H: 0xb8f818, D: 0x008800, W: 0xfcfcfc, K: 0x0b0a0d, M: 0xf87858 })
const BAT_UP = [
  'D..............D',
  'BD............DB',
  'BBD....HH....DBB',
  'BBBD..HBBH..DBBB',
  '.BBBDHBBBBHDBBB.',
  '..BBBBWBBWBBBB..',
  '...BBWKBBWKBB...',
  '....BBBBBBBB....',
  '....BBMMMMBB....',
  '.....BWBBWB.....',
  '......DBBD......',
  '.......DD.......',
]
const BAT_DOWN = [
  '.......HH.......',
  '......HBBH......',
  '.....HBBBBH.....',
  '....BWBBWBBB....',
  '...BWKBBWKBBB...',
  '..BBBBBBBBBBBB..',
  '.DBBBBMMMMBBBBD.',
  'DBBD.BWBBWB.DBBD',
  'BBD...DBBD...DBB',
  'BD.....DD.....DB',
  'D..............D',
]
const BAT_PAL = { B: 0x8058e0, H: 0xc0a8fc, D: 0x4c2c98, W: 0xfcfcfc, K: 0xf83800, M: 0x2c1048 }
const SKELETON = [
  '....BBBBBB....',
  '...BBBBBBBB...',
  '..BBBBBBBBBB..',
  '..BKKBBBKKBB..',
  '..BKKBBBKKBB..',
  '...BBBKBBBB...',
  '....BWBWBW....',
  '.....BBBB.....',
  '..HBBBHBBBH...',
  '.BH.BBBBB.HB..',
  '.B..HBBBH..B..',
  '....BBBBB.....',
  '.....H.H......',
  '....BB.BB.....',
  '....B...B.....',
  '...BB...BB....',
]
const SKELETON_PAL = { B: 0xf0f0e8, H: 0xa8a89c, K: 0x0b0a0d, W: 0x0b0a0d }
const GHOST = [
  '....BBBBB.....',
  '..BBBBBBBBB...',
  '.BBBBBBBBBBB..',
  '.BBKKBBBKKBB..',
  'HBBKKBBBKKBBB.',
  'HBBBBBBBBBBBB.',
  'HBBBBKKKBBBBB.',
  'HBBBBKKKBBBBB.',
  'HBBBBBBBBBBBBB',
  'HHBBBBBBBBBBBB',
  'HHBBBBBBBBBBB.',
  'HBBBBBBBBBBBB.',
  'HB.BBB.BBB.BB.',
  'B...B...B...B.',
]
const GHOST_PAL = { B: 0xd8f4fc, H: 0x8cc8e8, K: 0x0b0a0d }

export const MONSTERS = {
  slime: { name: 'Slime', palette: SLIME_PAL, frames: [{ sprite: QUEST_SLIME, lift: 0 }] },
  bat: { name: 'Dracky', palette: BAT_PAL, frames: [BAT_UP, BAT_DOWN].map(sprite => ({ sprite, lift: 0 })) },
  skeleton: { name: 'Skeleton', palette: SKELETON_PAL, frames: [{ sprite: SKELETON, lift: 0 }] },
  ghost: { name: 'Ghost', palette: GHOST_PAL, frames: [0, 2].map(lift => ({ sprite: GHOST, lift })) },
} satisfies Record<string, { name: string; palette: Palette; frames: readonly Pose[] }>

export type Monster = keyof typeof MONSTERS

// Frame is a pose index; the caller owns the animation clock.
export function paintMonster(pixels: Pixels, monster: Monster, x: number, frame: number) {
  const art = MONSTERS[monster]
  const pose = art.frames[frame % art.frames.length] as Pose
  paint(pixels, pose.sprite, x, pose.lift, art.palette)
}

type EffectPose = Pose & { offset: number }

const SLASH = [
  '...........W',
  '..........Ww',
  '.........Ww.',
  '........Ww..',
  '.......Ww...',
  '......Ww....',
  '.....Ww.....',
  '....Ww......',
  '...Ww.......',
  '..Ww........',
  '.Ww.........',
  'W...........',
]
const FIRE_A = [
  '..OO..',
  '.OYYO.',
  'OYWWYO',
  'OYWWYO',
  '.OYYO.',
  '..OO..',
]
const FIRE_B = [
  '.O..O.',
  'OOYYOO',
  '.YWWY.',
  '.YWWYO',
  'OOYYO.',
  '..O.O.',
]
const BOLT = [
  '.....YY',
  '....YY.',
  '...YW..',
  '..YWY..',
  '.YYYYYY',
  '...YWY.',
  '..YWY..',
  '.YWY...',
  'YYYYY..',
  '..YWY..',
  '.YW....',
  'YY.....',
  'Y......',
  '.......',
  '.......',
  '.......',
]
const SKILL_PAL = { W: 0xfcfcfc, w: 0x8cc8fc, O: 0xf85818, Y: 0xfcd848 }

export const SKILLS = {
  slash: {
    heroStep: 1,
    origin: 'monster',
    originOffset: 0,
    palette: SKILL_PAL,
    frames: Array<EffectPose>(2).fill({ sprite: SLASH, lift: 0, offset: 0 }),
  },
  fireball: {
    heroStep: 0,
    origin: 'sword',
    originOffset: 0,
    palette: SKILL_PAL,
    // The ball flickers between its two poses; its centre rides the two-pixel blade.
    frames: Array.from({ length: 6 }, (_, offset) => ({
      sprite: offset % 2 === 0 ? FIRE_A : FIRE_B,
      lift: ATTACK_BLADE_LIFT - Math.floor(FIRE_A.length / 2),
      offset,
    })),
  },
  thunder: {
    heroStep: 0,
    origin: 'monster',
    originOffset: 0,
    palette: SKILL_PAL,
    frames: [BOLT.length / 4, BOLT.length / 2, BOLT.length].map(rows => ({ sprite: BOLT.slice(0, rows), lift: QUEST_ROWS * 2 - rows, offset: 0 })),
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
