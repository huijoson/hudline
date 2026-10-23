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

const METAL_SLIME_PAL = bodyPalette({ B: 0xa8b0bc, L: 0xd8dce4, H: 0xfcfcfc, D: 0x687488, E: 0x404858, W: 0xfcfcfc, K: 0x0b0a0d, M: 0x404858 })
const HEALSLIME = [
  '.....KKK.....',
  '....KHBBK....',
  '...KHHBBBK...',
  '..KHHBBBBBK..',
  '.KHHBBWBBWBK.',
  'KHHBBBKBBKBBK',
  'KDBBBBBBBBBDK',
  '.KDDDDDDDDDK.',
  '..KTTTTTTTK..',
  '..TK.T.T.KT..',
  '.KT..TK.T.TK.',
  '.TK.KT..TK.T.',
  '..T..T..T.T..',
]
const HEALSLIME_PAL = { B: 0x3878e8, H: 0x88d8fc, D: 0x183898, T: 0xf8c858, K: 0x181828, W: 0xfcfcfc }
const EYEBALL = [
  '....KKKKKK....',
  '..KKHHHHBBKK..',
  '.KHHHHRRBBBBK.',
  'KHHHHRKKRBBBDK',
  'KHHHHRKKRBBBDK',
  'KHHHHRRRRBBBDK',
  '.KBBBBBBBBBDK.',
  '..KKDDDDDDKK..',
  '....KTTTTK....',
  '..KTTK.TKTTK..',
  '.KT..T.TT..TK.',
  '.TK.KT..TK.KT.',
  '..T..T...T.T..',
]
const EYEBALL_PAL = { B: 0xf0f0e8, H: 0xfcfcfc, D: 0x9898a8, R: 0xe83048, K: 0x281830, T: 0xa858b8 }
const MAGE_A = [
  '.....KKK......',
  '....KHHBK...KK',
  '...KHHBBBK.KWL',
  '..KHBBBBBK.KLL',
  '..KBKKKBBK..SK',
  '..KKWKWKBK..SK',
  '...KKKKBBK..SK',
  '..KHBBBBBBKKSK',
  '.KHBBBDDBBBBSK',
  '.KHBBBDDKKKKSK',
  '.KBBBDDDK...SK',
  '.KBBBDDDK...SK',
  '.KBBBDDDDK..SK',
  'KHBBBDDDDBK.SK',
  'KBBBBBDDDDBKSK',
  '.KKKKKKKKKK.SK',
]
const MAGE_B = [
  '.....KKK......',
  '....KHHBK...KK',
  '...KHHBBBK.KWL',
  '..KHBBBBBK.KWW',
  '..KBKKKBBK..SK',
  '..KKHKHKBK..SK',
  '...KKKKBBK..SK',
  '..KHBBBBBBK.SK',
  '.KHBBBDDBBBKSK',
  '.KHBBBDDKBBBSK',
  '.KBBBDDDK...SK',
  '.KBBBDDDK...SK',
  '.KBBBDDDDK..SK',
  'KHBBBDDDDBK.SK',
  'KBBBBBDDDDBKSK',
  '.KKKKKKKKKK.SK',
]
const MAGE_PAL = { B: 0xa858d8, H: 0xe0a0f8, D: 0x583080, K: 0x201828, W: 0xf8e858, S: 0xb88038, L: 0xf8d878 }
const GREMLIN_A = [
  '.K......K..S.S.S',
  'KBK....KBK.S.S.S',
  'KPBK..KHBK.SSSSS',
  'KPPBKKBHBK...S..',
  'KPPPBWBBWBK..S..',
  '.KPBBKBBKBK..S..',
  '..KBBBBBBBK..S..',
  '...KBRRRBK...S..',
  '..KBBBBBBBK..S..',
  '.KHBBDDBBBBKKS..',
  'KHBKBDDBKBBBBS..',
  '.KK.KBDBK.KKKS..',
  '....KBBBK....S..',
  '...KBBKBBK...S..',
  '..KHBK.KBHK..S..',
  '..KKK...KKK..S..',
]
const GREMLIN_B = [
  '........K..S.S.S',
  '.......KBK.S.S.S',
  '......KHBK.SSSSS',
  '..KKKKBHBK...S..',
  '.KPPBWBBWBK..S..',
  'KPPBBKBBKBK..S..',
  'KPPBBBBBBBK..S..',
  '.KPKBRRRBK...S..',
  '..KBBBBBBBK..S..',
  '.KHBBDDBBBBKKS..',
  'KHBKBDDBKBBBBS..',
  '.KK.KBDBK.KKKS..',
  '....KBBBK....S..',
  '...KBBKBBK...S..',
  '..KHBK.KBHK..S..',
  '..KKK...KKK..S..',
]
const GREMLIN_PAL = { B: 0x88b838, H: 0xc8e878, D: 0x386828, K: 0x201828, P: 0xa858b8, W: 0xfcfcfc, R: 0xf85858, S: 0xd8a848 }
const MUMMY_A = [
  '....KKKK....',
  '...KHBBBK...',
  '..KHHBDDBK..',
  '..KBDDDDBK..',
  '..KBKRKRBK..',
  '...KBBDBK...',
  '..KKDDBBKK..',
  '.KHBBBDDBBK.',
  'KHBKKBBKKBBK',
  'KBDKKDDBKKDK',
  '.KK.KBBDK.K.',
  '....KDBBK...',
  '...KBBDBBK..',
  '...KBDKDBK..',
  '..KHBK.KBBK.',
  '..KKKK.KKKK.',
]
const MUMMY_B = [
  '....KKKK....',
  '...KHBBBK...',
  '..KHHBDDBK..',
  '..KBDDDDBK..',
  '..KBKRKRBK..',
  '...KBBDBK...',
  '..KKDDBBKK..',
  '.KHBDDBBBBK.',
  'KBBKKDDKKBBK',
  'KHDKKBBKKBDK',
  '.KK.KBBDK.K.',
  '....KDBBK...',
  '...KDBBBDK..',
  '...KBBKBDK..',
  '..KHBK.KBBK.',
  '..KKKK.KKKK.',
]
const MUMMY_PAL = { B: 0xd8c890, H: 0xf8e8b8, D: 0x887858, K: 0x282030, R: 0xf85848 }
const COBRA_A = [
  '....KKKKKK....',
  '...KHBBBBHK...',
  '..KHBYYYYBHK..',
  '..KBYYBBYYBK..',
  '..KBYWBBWYBK..',
  '..KBBKBBKBBK..',
  '...KBBRRBBK...',
  '....KYRRYK....',
  '....KYRBYK....',
  '....KBBBDK....',
  '..KKKBBDDKKK..',
  '.KHBBBBBDDBBK.',
  'KHBBKKKKKBDDBK',
  'KBBKYBBBYKDDDK',
  '.KBBBBDDDDDDK.',
  '..KKKKKKKKKK..',
]
const COBRA_B = [
  '...KKKKKK.....',
  '..KHBBBBHK....',
  '.KHBYYYYBHK...',
  '.KBYYBBYYBK...',
  '.KBYWBBWYBK...',
  '.KBBKBBKBBK...',
  '..KBBRRBBK....',
  '...KYRRYK.....',
  '...KYBRYK.....',
  '....KBBBDK....',
  '..KKKBBDDKKK..',
  '.KHBBBBBDDBBK.',
  'KHBBKKKKKBDDBK',
  'KBBKYBBBYKDDDK',
  '.KBBBBDDDDDDK.',
  '..KKKKKKKKKK..',
]
const COBRA_PAL = { B: 0xa858c8, H: 0xd8a0f8, D: 0x583078, K: 0x201828, Y: 0xf8d858, W: 0xfcfcfc, R: 0xe83858 }
const FLAME_A = [
  '.......D......',
  '......DBD.....',
  '......DBD..D..',
  '...D.DBHD.DBD.',
  '..DBDDBHDDBBD.',
  '..DBBBHHBBBBD.',
  '.DBBHHHHHBBBD.',
  '.DBHHHHHHHBBBD',
  'DBHHKHHKHHBBBD',
  'DBHHKHHKHHHBBD',
  'DBHHHHHHHHHBBD',
  '.DBHHKKHHHBBBD',
  '.DBHHHHHHHBBBD',
  '..DBHHWWHHBBD.',
  '..DBBHHHHBBD..',
  '...DDDDDDDD...',
]
const FLAME_B = [
  '....D.........',
  '...DBD........',
  '...DBD..D.....',
  '..DBHD.DBD.D..',
  '..DBHDBHBDDBD.',
  '.DBBBHHHBBBBD.',
  '.DBBHHHHHBBBD.',
  '.DBHHHHHHHBBBD',
  'DBHHKHHKHHBBBD',
  'DBHHKHHKHHHBBD',
  'DBHHHHHHHHHBBD',
  '.DBHHKKHHHBBBD',
  '.DBHHHHHHHBBBD',
  '..DBHHHHWHBBD.',
  '..DBBBHHHBBD..',
  '...DDDDDDDD...',
]
const FLAME_PAL = { B: 0xf87818, H: 0xf8d838, W: 0xfcf0a0, D: 0xc83818, K: 0x582020 }
const TREEFACE_A = [
  '....EEE..EEE....',
  '..EELGGEELGGE...',
  '.ELLLGGGLGGGGE..',
  'ELLLGGGGGGGGGGE.',
  'ELGGGGGGGGGGGGE.',
  '.EGGGEEGGEEGGE..',
  '..EEEBHBBHEEE...',
  '....KBHBBBK.....',
  '..KKKWWBBWWKKK..',
  '.KBHBBKBBKBBHBK.',
  'KHBKBBHHBBBKBHK.',
  '.KK.KBKKKBK.KK..',
  '....KBHHHBK.....',
  '...KBBHBBDBK....',
  '.KKBHBKKBDBBKK..',
  'KHHBBK..KBBBDDK.',
]
const TREEFACE_B = [
  '...EEE..EEE.....',
  '.EELGGEELGGE....',
  'ELLLGGGLGGGGGE..',
  'ELLLGGGGGGGGGGE.',
  '.EGGGGGGGGGGGGE.',
  '.EGGGEEGGEEGGE..',
  '..EEEBHBBHEEE...',
  '....KBHBBBK.....',
  '..KKKWWBBWWKKK..',
  '.KBHBBKBBKBBHBK.',
  'KHBKBBHHBBBKBHK.',
  '.KK.KBKKKBK.KK..',
  '....KBHHHBK.....',
  '...KBBHBBDBK....',
  '.KKBHBKKBDBBKK..',
  'KHHBBK..KBBBDDK.',
]
const TREEFACE_PAL = { B: 0x986028, H: 0xd8a850, D: 0x583820, K: 0x201828, G: 0x389838, L: 0x98d848, E: 0x185828, W: 0xfcfc98 }
const CYCLOPS_A = [
  '............KKK.',
  '....KKKK...KLLCK',
  '...KHBBBK..KLCCK',
  '..KHHWWWBK.KCCCK',
  '..KHBWRWBK..KCK.',
  '..KHBWWWBK..KCK.',
  '...KBBKBDK..KCK.',
  '..KHHBBBBDKKKCK.',
  '.KHHBBBBBBDDBCK.',
  'KHHBBBDDBBBDBCK.',
  'KBBKBBBBBBBDKKK.',
  '.KK.KPPPPPPK....',
  '....KPPPPPPK....',
  '....KBBKKBBK....',
  '...KHBDKKDBBK...',
  '...KKKK..KKKK...',
]
const CYCLOPS_B = [
  '...........KKK..',
  '....KKKK..KLLCK.',
  '...KHBBBK.KLCCK.',
  '..KHHWWWBKKCCCK.',
  '..KHBWRWBK.KCK..',
  '..KHBWWWBK.KCK..',
  '...KBBKBDK.KCK..',
  '..KHHBBBBDKKCK..',
  '.KHHBBBBBBDKKCK.',
  'KHHBBBDDBBBDBCK.',
  'KBBKBBBBBBBDBCK.',
  '.KK.KPPPPPPK....',
  '....KPPPPPPK....',
  '....KBBKKBBK....',
  '...KHBDKKDBBK...',
  '...KKKK..KKKK...',
]
const CYCLOPS_PAL = { B: 0x48b8a0, H: 0x98e0b0, D: 0x207868, K: 0x182838, W: 0xfcfcfc, R: 0xf85838, C: 0xa87838, L: 0xd8a858, P: 0x805838 }
const GARGOYLE_A = [
  'K...K......K...K',
  'KK.KBK....KBK.KK',
  'KPKKHBK..KBHKKPK',
  'KPPKBHKKKKHBKPPK',
  'KPPPKBWBBWBKPPPK',
  'KPPPKBKBBKBKPPPK',
  '.KPPKBBBBBBKPPK.',
  '..KK.KBWWBK.KK..',
  '....KBBBBBBK....',
  '...KHBBDDBBHK...',
  '..KHBKBDDBKBHK..',
  '...KKKBBBBKKK...',
  '.....KBDDBK.....',
  '....KBBKKBBK....',
  '...KHBK..KBHK...',
  '...KKK....KKK...',
]
const GARGOYLE_B = [
  '....K......K....',
  '...KBK....KBK...',
  '..KKHBK..KBHKK..',
  '.KPKBHKKKKHBKPK.',
  'KPPPKBWBBWBKPPPK',
  'KPPPKBKBBKBKPPPK',
  'KPPPKBBBBBBKPPPK',
  '.KPK.KBWWBK.KPK.',
  '..K.KBBBBBBK.K..',
  '...KHBBDDBBHK...',
  '..KHBKBDDBKBHK..',
  '...KKKBBBBKKK...',
  '.....KBDDBK.....',
  '....KBBKKBBK....',
  '...KHBK..KBHK...',
  '...KKK....KKK...',
]
const GARGOYLE_PAL = { B: 0xa868c8, H: 0xe0a0e8, D: 0x583878, K: 0x201828, P: 0x4868b8, W: 0xf8e858 }
const MANEATER_A = [
  '.....KKKK.....',
  '...KKHHBBKK...',
  '..KHHBBBBBDK..',
  '.KHBBWWWWBBDK.',
  'KHBWKKKKKKWBDK',
  'KBWKKKKKKKKWDK',
  'KBBWKWKKWKWBDK',
  '.KBDWWWWWWDDK.',
  '..KBDDDDDDDK..',
  '...KKGGGGKK...',
  '.....KGGK.....',
  '.KK..KGGK..KK.',
  'KLLGEKGGKEGLGK',
  '.KLGGGGGGGGLK.',
  '..KKKGGGGKKK..',
  '....KEEEEK....',
]
const MANEATER_B = [
  '......KKKK....',
  '....KKHHBBKK..',
  '...KHHBBBBBDK.',
  '..KHBBWWWWBBDK',
  '.KHBWKKKKKWBDK',
  '.KBWWWWWWWWBDK',
  '.KBBWWWWWWBDDK',
  '..KBDDDDDDDDK.',
  '...KBDDDDDDK..',
  '...KKGGGGKK...',
  '.....KGGK.....',
  '.KK..KGGK..KK.',
  'KLLGEKGGKEGLGK',
  '.KLGGGGGGGGLK.',
  '..KKKGGGGKKK..',
  '....KEEEEK....',
]
const MANEATER_PAL = { B: 0xd83858, H: 0xf87888, D: 0x881838, K: 0x281828, W: 0xfcf0c8, G: 0x389838, L: 0x98d848, E: 0x185828 }

export const MONSTERS = {
  slime: { name: 'Slime', palette: SLIME_PAL, frames: [{ sprite: QUEST_SLIME, lift: 0 }] },
  bat: { name: 'Dracky', palette: BAT_PAL, frames: [BAT_UP, BAT_DOWN].map(sprite => ({ sprite, lift: 0 })) },
  skeleton: { name: 'Skeleton', palette: SKELETON_PAL, frames: [{ sprite: SKELETON, lift: 0 }] },
  ghost: { name: 'Ghost', palette: GHOST_PAL, frames: [0, 2].map(lift => ({ sprite: GHOST, lift })) },
  metalSlime: { name: 'Metal Slime', palette: METAL_SLIME_PAL, frames: [{ sprite: ONION.stand, lift: 0 }] },
  healslime: { name: 'Healslime', palette: HEALSLIME_PAL, frames: [0, 2].map(lift => ({ sprite: HEALSLIME, lift })) },
  eyeball: { name: 'Eyeball', palette: EYEBALL_PAL, frames: [1, 3].map(lift => ({ sprite: EYEBALL, lift })) },
  mage: { name: 'Magician', palette: MAGE_PAL, frames: [MAGE_A, MAGE_B].map(sprite => ({ sprite, lift: 0 })) },
  gremlin: { name: 'Gremlin', palette: GREMLIN_PAL, frames: [GREMLIN_A, GREMLIN_B].map(sprite => ({ sprite, lift: 0 })) },
  mummy: { name: 'Mummy', palette: MUMMY_PAL, frames: [MUMMY_A, MUMMY_B].map(sprite => ({ sprite, lift: 0 })) },
  cobra: { name: 'King Cobra', palette: COBRA_PAL, frames: [COBRA_A, COBRA_B].map(sprite => ({ sprite, lift: 0 })) },
  flame: { name: 'Flame', palette: FLAME_PAL, frames: [FLAME_A, FLAME_B].map(sprite => ({ sprite, lift: 0 })) },
  treeface: { name: 'Treeface', palette: TREEFACE_PAL, frames: [TREEFACE_A, TREEFACE_B].map(sprite => ({ sprite, lift: 0 })) },
  cyclops: { name: 'Gigantes', palette: CYCLOPS_PAL, frames: [CYCLOPS_A, CYCLOPS_B].map(sprite => ({ sprite, lift: 0 })) },
  gargoyle: { name: 'Gargoyle', palette: GARGOYLE_PAL, frames: [GARGOYLE_A, GARGOYLE_B].map(sprite => ({ sprite, lift: 0 })) },
  maneater: { name: 'Man-eater', palette: MANEATER_PAL, frames: [MANEATER_A, MANEATER_B].map(sprite => ({ sprite, lift: 0 })) },
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
