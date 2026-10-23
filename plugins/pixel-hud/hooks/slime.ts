import { nextMoment as admitMoment } from './stage'
import type { Moment, Rest, Stage } from './stage'

export { DAMAGE_COOLDOWN_TICKS, FRAME_MS } from './stage'
export type { Moment, Rest } from './stage'

// The slime family that hops beside the branch: 8-bit sprites drawn into a
// Raster, two pixels to a cell ('▀' paints the top pixel in the foreground and
// the bottom one in the background).

// B body, L light body, H highlight, E deep shade, W white, K pupil or blink lid, M two-row U smile, D shade, '.' transparent.
// Each kin is 11 wide in a 16-pixel-tall stage (8 text rows), feet on the floor unless it is airborne.
export type KinPose = 'stand' | 'blink' | 'squash' | 'wide' | 'stretch'
export type KinSprites = Record<KinPose, readonly string[]>

// A thin tip flaring into a round bulb: the slime, she-slime and metal slime.
export const ONION: KinSprites = {
  stand: [
    '.....D.....',
    '.....B.....',
    '.....B.....',
    '....BLB....',
    '...HHLDB...',
    '..HLLLBDB..',
    '.HLLLBBDEB.',
    'BHBWBBDWDEB',
    'BDWKWDWKWEB',
    'BEBWDDDWDED',
    'BDMDDDDEMED',
    '.BEMMMMMED.',
    '..DDDDDDD..',
  ],
  blink: [
    '.....D.....',
    '.....B.....',
    '.....B.....',
    '....BLB....',
    '...HHLDB...',
    '..HLLLBDB..',
    '.HLLLBBDEB.',
    'BHBDBBDDDEB',
    'BDKKKDKKKEB',
    'BEBDDDDDDED',
    'BDMDDDDEMED',
    '.BEMMMMMED.',
    '..DDDDDDD..',
  ],
  squash: [
    '.....D.....',
    '....BLB....',
    '...HHLDB...',
    '.HLLLBBDEB.',
    'BHBWBBDWDEB',
    'BDWKWDWKWEB',
    'BEBWDDDWDED',
    'BDMDDDDEMED',
    '.BEMMMMMED.',
    '.DDDDDDDDD.',
  ],
  wide: [
    '.....D.....',
    '.....B.....',
    '....BLB....',
    '...HHLDB...',
    '..HLLLBDB..',
    '.HLLLBBDEB.',
    'BHBWBBDWDEB',
    'BDWKWDWKWEB',
    'BEBWDDDWDED',
    'BDMDDDDEMED',
    '.BEMMMMMED.',
    '.DDDDDDDDD.',
  ],
  stretch: [
    '.....D.....',
    '.....B.....',
    '.....B.....',
    '.....B.....',
    '....BLB....',
    '...HHLDB...',
    '..HLLLBDB..',
    '.HLLLBBDEB.',
    'BHBWBBDWDEB',
    'BDWKWDWKWEB',
    'BEBWDDDWDED',
    'BDMDDDDEMED',
    '.BEMMMMMED.',
    '..DBBBBBD..',
    '...DDDDD...',
  ],
}

// A low dome over a melted skirt with bubbles above: the bubble slime.
export const PUDDLE: KinSprites = {
  stand: [
    '.H.......H.',
    '......H....',
    '...HHBBD...',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'DDBMMMMMBDD',
    'DDDDDDDDDDD',
  ],
  blink: [
    '.H.......H.',
    '......H....',
    '...HHBBD...',
    'BBBBBBBBBDD',
    'BBKKKBKKKDD',
    'BBBBBBBBBDD',
    'BBMBBBBBMDD',
    'DDBMMMMMBDD',
    'DDDDDDDDDDD',
  ],
  squash: [
    '.H.......H.',
    '..HHBBBBD..',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'DDBMMMMMBDD',
    'DDDDDDDDDDD',
  ],
  wide: [
    '.H.......H.',
    '.....H.....',
    '..HHBBBBD..',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'DDBMMMMMBDD',
    'DDDDDDDDDDD',
  ],
  stretch: [
    '........H..',
    '.H.........',
    '.....H.....',
    '....HB.....',
    '...HHBBD...',
    '..HBBBBBD..',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'DDBMMMMMBDD',
    '..DDDDDDD..',
  ],
}

// A flowing silver mound with a reflective skirt: the liquid metal slime.
export const LIQUID: KinSprites = {
  stand: [
    '.....HB....',
    '...HHBBD...',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'HHBMMMMMBHH',
    'DDDDDDDDDDD',
  ],
  blink: [
    '.....HB....',
    '...HHBBD...',
    'BBBBBBBBBDD',
    'BBKKKBKKKDD',
    'BBBBBBBBBDD',
    'BBMBBBBBMDD',
    'HHBMMMMMBHH',
    'DDDDDDDDDDD',
  ],
  squash: [
    '..HHHBBBD..',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'DDDMMMMMDDD',
  ],
  wide: [
    '.....HB....',
    '..HHHBBBD..',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    'DDDMMMMMDDD',
  ],
  stretch: [
    '.....B.....',
    '....HB.....',
    '...HBBD....',
    '..HBBBBD...',
    'BBBWBBBWBDD',
    'BBWKWBWKWDD',
    'BBBWBBBWBDD',
    'BBMBBBBBMDD',
    '..DMMMMMD..',
    'HHHBBBBBHHH',
    'DDDDDDDDDDD',
  ],
}

export type Pixels = (number | null)[][]
export type Palette = Partial<Record<string, number>>

export function bodyPalette<T extends { B: number; D: number; L?: number; E?: number }>(palette: T): T & { L: number; E: number } {
  return { ...palette, L: palette.L ?? palette.B, E: palette.E ?? palette.D }
}

const WHITE = 0xfcfcfc
const PUPIL = 0x0b0a0d
const GOLD = 0xfcbc3c
const GOLD_SHADE = 0xd89010
const GOLD_DEEP_SHADE = 0x8c5000

type Breath = { period: number; blink: number }

export type Kin = {
  name: string
  sprites: KinSprites
  palette: Record<'B' | 'L' | 'H' | 'D' | 'E' | 'K' | 'M' | 'W', number>
  phase: number
  breath: Breath
  // Fixed rest lengths keep each kin's pauses varied and repeatable.
  hopRests: readonly number[]
}

export const FAMILY: readonly Kin[] = [
  { name: 'slime', phase: 0, breath: { period: 36, blink: 12 }, hopRests: [6, 10, 14], sprites: ONION, palette: { B: 0x3880a8, L: 0x50b0d0, H: 0xf8f8f8, D: 0x206088, E: 0x205068, M: 0xe85820, W: WHITE, K: PUPIL } },
  { name: 'she-slime', phase: 3, breath: { period: 44, blink: 18 }, hopRests: [9, 14, 7], sprites: ONION, palette: { B: 0xf88820, L: 0xfcb048, H: 0xfcd860, D: 0xd06010, E: 0xb03800, M: 0x5c1c68, W: WHITE, K: PUPIL } },
  { name: 'metal slime', phase: 7, breath: { period: 50, blink: 24 }, hopRests: [12, 6, 10], sprites: ONION, palette: { B: 0xa8b0c0, L: 0xd0d8e0, H: 0xffffff, D: 0x747c90, E: 0x4c5468, M: 0xe83828, W: WHITE, K: PUPIL } },
  { name: 'bubble slime', phase: 12, breath: { period: 40, blink: 30 }, hopRests: [14, 8, 11], sprites: PUDDLE, palette: bodyPalette({ B: 0x40c818, H: 0xc8f840, D: 0x1c7c10, M: PUPIL, K: PUPIL, W: WHITE }) },
  { name: 'liquid metal slime', phase: 17, breath: { period: 46, blink: 28 }, hopRests: [8, 12, 9], sprites: LIQUID, palette: bodyPalette({ B: 0x8c9cb8, H: 0xf0f8ff, D: 0x3c4860, M: PUPIL, K: PUPIL, W: WHITE }) },
]

export const SLIME_ROWS = 8
export const SLIME_WIDTH = ONION.stand[0]!.length
export const SLIME_GAP = 2
const SLIME_PIXELS = SLIME_ROWS * 2

export function kinHomeX(i: number): number {
  return i * (SLIME_WIDTH + SLIME_GAP)
}

// 'air' lifts a kin until its tip touches the top of the stage; sprite heights
// differ between kin, so it resolves per kin.
type Lift = number | 'air'
export type Pose = { pose: KinPose; lift: Lift }
type Beat = Pose & { ticks: number }
const beats = <T extends { ticks: number }>({ ticks, ...pose }: T): Omit<T, 'ticks'>[] => Array<Omit<T, 'ticks'>>(ticks).fill(pose)
export type Frame = { sprite: readonly string[]; lift: number }

export function kinFrame(sprites: KinSprites, { pose, lift }: Pose): Frame {
  const sprite = sprites[pose]
  return { sprite, lift: lift === 'air' ? SLIME_PIXELS - sprite.length : lift }
}

const RESTING_POSE: Pose = { pose: 'stand', lift: 0 }

// Durations of the moving hop phases, shared with the King's leaps.
export const HOP_CROUCH_TICKS = 2
export const HOP_LAUNCH_TICKS = 1
export const HOP_RISE_TICKS = 1
export const HOP_HANG_TICKS = 2
export const HOP_FALL_TICKS = 1
export const HOP_LAND_TICKS = 2
export const HOP_REBOUND_TICKS = 1
export const HOP_SETTLE_TICKS = 1
const HOP_RISE_START = HOP_CROUCH_TICKS + HOP_LAUNCH_TICKS
const HOP_HANG_START = HOP_RISE_START + HOP_RISE_TICKS
const HOP_AIR_TICKS = HOP_RISE_TICKS + HOP_HANG_TICKS
const HOP_FALL_START = HOP_RISE_START + HOP_AIR_TICKS

// One hop: crouch, launch, rise/hang, fall, land, rebound, settle.
export const HOP: readonly Pose[] = ([
  { pose: 'squash', lift: 0, ticks: HOP_CROUCH_TICKS },
  { pose: 'stretch', lift: 0, ticks: HOP_LAUNCH_TICKS },
  { pose: 'stand', lift: 'air', ticks: HOP_AIR_TICKS },
  { pose: 'stretch', lift: 0, ticks: HOP_FALL_TICKS },
  { pose: 'squash', lift: 0, ticks: HOP_LAND_TICKS },
  { pose: 'stretch', lift: 0, ticks: HOP_REBOUND_TICKS },
  { pose: 'stand', lift: 0, ticks: HOP_SETTLE_TICKS },
] satisfies Beat[]).flatMap(beats)
export const HOP_TICKS = HOP.length
export const BLINK_EVERY_CYCLES = 3
export const BREATH_SQUISH_TICKS = 2

const DEFAULT = 0x01000000
const TOP_HALF = 0x2580
const BOTTOM_HALF = 0x2584
const SPACE = 0x20

export function slimeColumns(count: number): number {
  return count > 0 ? count * SLIME_WIDTH + (count - 1) * SLIME_GAP : 0
}

function blank(count: number): Pixels {
  return Array.from({ length: SLIME_PIXELS }, () => Array<number | null>(slimeColumns(count)).fill(null))
}

// Paints `sprite` with its left edge at `x`, its bottom `lift` pixels off the floor.
export function paint(pixels: Pixels, sprite: readonly string[], x: number, lift: number, palette: Palette) {
  const top = pixels.length - sprite.length - lift
  sprite.forEach((line, r) => {
    ;[...line].forEach((ch, c) => {
      const color = palette[ch]
      const row = pixels[top + r]
      if (color !== undefined && row && x + c >= 0 && x + c < row.length) row[x + c] = color
    })
  })
}

function kinOf(i: number): Kin {
  return FAMILY[i % FAMILY.length] as Kin
}

function paintKin(pixels: Pixels, i: number, pose: Pose, x: number, palette: Palette = kinOf(i).palette) {
  const { sprite, lift } = kinFrame(kinOf(i).sprites, pose)
  paint(pixels, sprite, x, lift, palette)
}

// A null `tick` is the slimes at rest: all of them sitting on the floor.
function pose(i: number, tick: number | null, rest: Rest): Pose {
  if (tick === null || rest === 'still') return RESTING_POSE
  if (rest === 'breathe') {
    const breath = kinOf(i).breath
    const isBlinking = tick % (breath.period * BLINK_EVERY_CYCLES) === breath.period * (BLINK_EVERY_CYCLES - 1) + breath.blink
    if (isBlinking) return { pose: 'blink', lift: 0 }
    const isSquishing = tick % breath.period >= breath.period - BREATH_SQUISH_TICKS
    return isSquishing ? { pose: 'wide', lift: 0 } : RESTING_POSE
  }
  const { step, cycle } = hopClock(i, tick)
  if (step < HOP_TICKS) return HOP[step] as Pose
  // One tick inside every third rest; offsets 1–5 leave standing ticks on both sides in each kin's rests.
  const isBlinking = cycle % BLINK_EVERY_CYCLES === BLINK_EVERY_CYCLES - 1 && step === HOP_TICKS + 1 + i % FAMILY.length
  return isBlinking ? { pose: 'blink', lift: 0 } : RESTING_POSE
}

// Locate a kin in its deterministic hop/rest sequence.
function hopClock(i: number, tick: number): { step: number; cycle: number } {
  const rests = kinOf(i).hopRests
  const period = rests.reduce((total, ticks) => total + HOP_TICKS + ticks, 0)
  let step = (tick + kinOf(i).phase) % period
  let cycle = 0
  while (step >= HOP_TICKS + (rests[cycle] as number)) {
    step -= HOP_TICKS + (rests[cycle] as number)
    cycle += 1
  }
  return { step, cycle }
}

// The endpoint is the plain stand; resume only at Rest or the first Crouch tick.
function hopRejoinTick(i: number, endpoint: number): number {
  const nextTick = endpoint + 1
  const { step } = hopClock(i, nextTick)
  return step === 0 || step >= HOP_TICKS ? nextTick : nextTick + HOP_TICKS - step
}

// Hold one kin through its endpoint, then rejoin Rest or a fresh Crouch.
function paintRejoiningKin(pixels: Pixels, i: number, tick: number, rest: Rest, endpointTick: number) {
  const held = tick <= endpointTick || (rest === 'hop' && tick < hopRejoinTick(i, endpointTick))
  paintKin(pixels, i, pose(i, held ? null : tick, rest), kinHomeX(i))
}

// The stage's pixels for `count` slimes at `tick`: a color per pixel, or null.
export function stage(count: number, tick: number | null, rest: Rest = 'breathe'): Pixels {
  const pixels = blank(count)
  for (let i = 0; i < count; i += 1) {
    paintKin(pixels, i, pose(i, tick, rest), kinHomeX(i))
  }
  return pixels
}

// The King Slime: crowned, the whole stage tall, and too wide for one slot.
// B body, H highlight, Y crown gold, J red jewel, P and G crown fabric, W white eyes,
// K pupils or blink lids, M orange-red U smile, D lower shade, '.' transparent.
export const KING = [
  '......Y..PGGP..Y......',
  '......YPGPGGPGPY......',
  '......YYYYYYYYYY......',
  '......YJYYJJYYJY......',
  '....HHBBBBBBBBBBBB....',
  '..BHHBBBBBBBBBBBBBBB..',
  '.BHBBBBBBBBBBBBBBBBBB.',
  '.BBBBBBBWBBBBWBBBBBBB.',
  'BBBBBBBWKWBBWKWBBBBBBB',
  'BBBBBBBBWBBBBWBBBBBBBB',
  'BBBBBBMBBBBBBBBMBBBBBB',
  'BBBBBBBMBBBBBBMBBBBBBB',
  'DBBBBBBBMMMMMMBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBD',
  'DDBBBBBBBBBBBBBBBBBBDD',
  '.DDDDDDDDDDDDDDDDDDDD.',
]
// The plated Metal King: S the bright metal sheen, O the darker band above the shade.
export const PLATED_KING = [
  '......Y..PGGP..Y......',
  '......YPGPGGPGPY......',
  '......YYYYYYYYYY......',
  '......YJYYJJYYJY......',
  '....SSHBBBBBBBBBSS....',
  '..BSSHBBBBBBBBBBBSSB..',
  '.BSHBBBBBBBBBBBBBBBSB.',
  '.SHBBBBBWBBBBWBBBBBBS.',
  'BSBBBBBWKWBBWKWBBBBBSB',
  'BHBBBBBBWBBBBWBBBBBBBB',
  'BBBBBBMBBBBBBBBMBBBBBB',
  'OBBBBBBMBBBBBBMBBBBBBO',
  'OOBBBBBBMMMMMMBBBBBBOO',
  'DOOBBBBBBBBBBBBBBBBOOD',
  'DDOOOOOOOOOOOOOOOOOODD',
  '.DDDDDDDDDDDDDDDDDDDD.',
]
const CROWN: Palette = { Y: GOLD, J: 0xf83800, P: 0x8838d0, G: 0x28a848 }
const FACE: Palette = { K: PUPIL, M: 0xe85820, W: WHITE }

export type KingVariant = 'king' | 'metal'
type King = { name: string; sprite: readonly string[]; blink: readonly string[]; squash: readonly string[]; body: Palette; crown: Palette }

function crowned(name: string, sprite: readonly string[], body: Palette, crown: Palette): King {
  return {
    name,
    sprite,
    blink: sprite.map(row => row.replaceAll(/WKW/g, 'KKK').replaceAll('W', 'B')),
    // No squash was drawn: the landing loses the crown's points and spreads one
    // pixel wider on each side where the body meets the edge.
    squash: sprite.slice(1).map(row => row[0] + row + row.at(-1)),
    body: { ...FACE, ...body },
    crown,
  }
}

export const KINGS: Record<KingVariant, King> = {
  king: crowned('King Slime', KING, FAMILY[0]!.palette, CROWN),
  metal: crowned('Metal King Slime', PLATED_KING, bodyPalette({ B: 0xb8c4d0, H: 0xe8f0f8, D: 0x5c6878, O: 0x8c98a8, S: 0xffffff }), CROWN),
}

export function pickKing(random: () => number): KingVariant {
  const variants = Object.keys(KINGS) as KingVariant[]
  return variants[Math.floor(random() * variants.length)]!
}

export const KING_DROP_FALL_TICKS = 2
export const KING_DROP_SQUASH_TICKS = 2
// The King falls from five eighths of the stage, halving its height, and rebounds one eighth.
const KING_DROP_LIFT = SLIME_PIXELS * 5 / 8
type KingBeat = { squash: boolean; lift: number; ticks: number }
export const KING_DROP: readonly Omit<KingBeat, 'ticks'>[] = ([
  { squash: false, lift: KING_DROP_LIFT, ticks: KING_DROP_FALL_TICKS / 2 },
  { squash: false, lift: KING_DROP_LIFT / 2, ticks: KING_DROP_FALL_TICKS / 2 },
  { squash: true, lift: 0, ticks: KING_DROP_SQUASH_TICKS },
  { squash: false, lift: SLIME_PIXELS / 8, ticks: HOP_REBOUND_TICKS },
  { squash: false, lift: 0, ticks: HOP_SETTLE_TICKS },
] satisfies KingBeat[]).flatMap(beats)
export const KING_WIDTH = KING[0]!.length
// The slimes landing on one another: a splat, then a blob bouncing up.
const MERGED_SPLAT = [
  '.......BBHHBBBB.......',
  '....BBBWBBBBBBWBBB....',
  '..BBBBWKWBBBBWKWBBBB..',
  '.BBBBBBWBBBBBBWBBBBBB.',
  'DDBBBBMBBBBBBBBMBBBBDD',
  '.DDDDDBMMMMMMMMBDDDDD.',
]
const MERGED_BLOB = [
  '........D........',
  '........B........',
  '.......BLB.......',
  '......HHLDB......',
  '....HHLLLBDBB....',
  '..HHHLLLLBBDDEB..',
  '.HHLLLLLBBBDDEEB.',
  'BHBBBBWBBDWDDEEEB',
  'BHBDBWKWDWKWDDEEB',
  'BBDEDBWDDDWDDEEED',
  'BDDEDMDDDDDMEEEED',
  '.BDDEEMMMMMEEDDD.',
  '..BDDDDDDDDDDDD..',
  '....DDDDDDDDD....',
]
export const MERGED = [MERGED_SPLAT, MERGED_BLOB]
export const POOF = [
  '....W.....W....W....',
  '.W.....W......W...W.',
  '...W......W.W.......',
  'W.....W.........W...',
  '...W.....W..W.....W.',
  '.W...W.........W....',
  '.......W...W......W.',
  'W..W..........W.....',
  '.....W....W.....W..W',
  '..W......W...W......',
  'W.....W.......W...W.',
  '....W....W.W........',
]
// Twinkles about the king, two sets in turn: [x from the king's left, row].
const TWINKLES = [
  [[-3, 0], [KING_WIDTH + 2, SLIME_PIXELS / 2], [-2, SLIME_PIXELS - 2]],
  [[-2, SLIME_PIXELS / 2], [KING_WIDTH + 1, 0], [KING_WIDTH + 2, SLIME_PIXELS - 2]],
]

// An airborne stand keeps the falling collision in the air without clipping a stretch.
export const KING_COLLISION: Pose = { pose: 'stand', lift: 'air' }

export const KING_SCATTER_AIR_TICKS = HOP_AIR_TICKS + HOP_FALL_TICKS
export const SCATTER: readonly Pose[] = ([
  { pose: 'stretch', lift: 'air', ticks: HOP_RISE_TICKS },
  { pose: 'stand', lift: 'air', ticks: HOP_HANG_TICKS },
  { pose: 'stretch', lift: 'air', ticks: HOP_FALL_TICKS },
  { pose: 'squash', lift: 0, ticks: HOP_LAND_TICKS },
] satisfies Beat[]).flatMap(beats)

// Reign blinks and twinkles hold for two ticks.
export const KING_POSE_TICKS = 2
export const LEAP = HOP_TICKS
const HALFWAY = 0.5
// Halfway in after leap one, then three quarters of the remaining way.
const COLLIDE = HALFWAY + (1 - HALFWAY) * 3 / 4
// One complete leap, then the second leap through its Fall.
export const KING_GATHER_TICKS = LEAP + HOP_FALL_START + HOP_FALL_TICKS
// Splat and blob each hold for three ticks.
const KING_MERGE_POSE_TICKS = 3
export const KING_MERGE_TICKS = MERGED.length * KING_MERGE_POSE_TICKS
// Crown fall, heavy squash, rebound and settle.
export const KING_DROP_TICKS = KING_DROP.length
// White king, then poof.
export const KING_FLASH_TICKS = 2
// Crowned king with the existing blink and twinkles.
export const KING_REIGN_TICKS = 40
// Three hidden/shown pairs before the burst.
const KING_FLICKER_TICKS = 2
export const KING_DEFEAT_TICKS = 6
// Poof before the family scatters.
export const KING_POOF_TICKS = 2
// One arc home, ending in a grounded squash.
export const KING_SCATTER_TICKS = SCATTER.length
export const KING_SHOW_TICKS = KING_GATHER_TICKS + KING_MERGE_TICKS + KING_DROP_TICKS + KING_FLASH_TICKS + KING_REIGN_TICKS + KING_DEFEAT_TICKS + KING_POOF_TICKS + KING_SCATTER_TICKS

// Two slimes' room is the least the king needs.
export function canCrown(count: number): boolean {
  return slimeColumns(count) >= KING_WIDTH
}

// Three hidden/shown pairs; the whole family holds still through the endpoint.
const DAMAGE_FLICKERS = 3
const DAMAGE_FLICKER_TICKS = 2
export const DAMAGE_TICKS = DAMAGE_FLICKERS * DAMAGE_FLICKER_TICKS

// One hop in unison with no Rest; its Settle is already the exact resting frame.
const LEVEL_UP_ENDPOINT = HOP_TICKS - HOP_SETTLE_TICKS

export const ENCOUNTER_STAGGER_TICKS = 3
export const ENCOUNTER_FALL_TICKS = 3
export const ENCOUNTER_START_LIFT = SLIME_PIXELS
export const ENCOUNTER: readonly Pose[] = ([
  ...Array.from({ length: ENCOUNTER_FALL_TICKS }, (_, i) => ({
    pose: 'stand', lift: Math.round(ENCOUNTER_START_LIFT * (1 - i / ENCOUNTER_FALL_TICKS)), ticks: 1,
  }) satisfies Beat),
  { pose: 'squash', lift: 0, ticks: HOP_LAND_TICKS },
  { pose: 'stretch', lift: 0, ticks: HOP_REBOUND_TICKS },
] satisfies Beat[]).flatMap(beats)
export const ENCOUNTER_ARRIVAL_TICKS = ENCOUNTER.length

// Relative endpoint of one kin, shared by rendering and expiry.
function encounterEndpoint(i: number): number {
  return i * ENCOUNTER_STAGGER_TICKS + ENCOUNTER_ARRIVAL_TICKS
}

type MomentMotion = {
  priority: number
  minColumns: number
  endpoint: (i: number, count: number) => number
  stage: (moment: Moment, count: number, tick: number, rest: Rest) => Pixels
}

const MOMENT_MOTION: Partial<Record<Moment['kind'], MomentMotion>> = {
  king: {
    priority: 5,
    minColumns: KING_WIDTH,
    endpoint: () => KING_SHOW_TICKS,
    stage: (moment, count, tick, rest) => canCrown(count) && moment.kind === 'king'
      ? kingStage(count, tick - moment.startTick, tick, rest, moment.variant)
      : stage(count, tick, rest),
  },
  encounter: {
    priority: 2,
    minColumns: 0,
    endpoint: encounterEndpoint,
    stage: (moment, count, tick, rest) => encounterStage(count, tick - moment.startTick, tick, rest),
  },
  damage: {
    priority: 1,
    minColumns: 0,
    endpoint: () => DAMAGE_TICKS,
    stage: damageStage,
  },
  'level-up': {
    priority: 4,
    minColumns: 0,
    endpoint: () => LEVEL_UP_ENDPOINT,
    stage: levelUpStage,
  },
}

// Exclusive expiry: keep the exact endpoint, then release as soon as every kin
// can join Rest or a fresh Crouch.
export function momentEndTick(moment: Moment, count: number, rest: Rest): number {
  const motion = MOMENT_MOTION[moment.kind]
  if (!motion) return moment.startTick
  const { endpoint } = motion
  const endpoints = Array.from({ length: count }, (_, i) => moment.startTick + endpoint(i, count))
  return Math.max(...endpoints.map((endpoint, i) => rest === 'hop' ? hopRejoinTick(i, endpoint) : endpoint + 1), moment.startTick + 1)
}

// Dropped moments are never queued. Equal priority keeps the current moment.
export function nextMoment(active: Moment | null, incoming: Moment, count: number): Moment | null {
  return admitMoment(SLIME_STAGE, active, incoming, count)
}

// Round away from the middle so every body shows when they press together.
function paintFamily(pixels: Pixels, count: number, progress: number, familyPose: Pose) {
  const middle = Math.floor((slimeColumns(count) - SLIME_WIDTH) / 2)
  for (let i = 0; i < count; i += 1) {
    const home = kinHomeX(i)
    const x = home + (middle - home) * progress
    paintKin(pixels, i, familyPose, home < middle ? Math.floor(x) : Math.ceil(x))
  }
}

function gather(pixels: Pixels, count: number, frame: number) {
  const second = frame >= LEAP
  const step = second ? frame - LEAP : frame
  // Advance once per airborne Rise/Hang tick, finishing before the Fall.
  const progress = Math.min(1, Math.max(0, step - (HOP_RISE_START - 1)) / HOP_AIR_TICKS)
  const p = HOP[step] as Pose
  const collision = second && step === HOP_FALL_START
  paintFamily(pixels, count, second ? HALFWAY + progress * (COLLIDE - HALFWAY) : progress * HALFWAY,
    collision ? KING_COLLISION : p)
}

function whiteOf(sprite: readonly string[]): Palette {
  return Object.fromEntries([...new Set(sprite.join(''))].filter(ch => ch !== '.').map(ch => [ch, WHITE]))
}

// The stage `frame` ticks into the King Slime show; `tick` poses the slimes
// after the exact resting frame at the end of the show.
export function kingStage(count: number, frame: number, tick: number | null, rest: Rest, variant: KingVariant): Pixels {
  const pixels = blank(count)
  const kingX = Math.floor((slimeColumns(count) - KING_WIDTH) / 2)
  const poofX = Math.floor((slimeColumns(count) - POOF[0]!.length) / 2)
  const { sprite, blink, squash, body, crown } = KINGS[variant]
  const king: Palette = { ...body, ...crown }
  let f = frame
  if (f < KING_GATHER_TICKS) {
    gather(pixels, count, f)
    return pixels
  }
  f -= KING_GATHER_TICKS
  if (f < KING_MERGE_TICKS) {
    const blob = MERGED[Math.floor(f / KING_MERGE_POSE_TICKS)] as string[]
    paint(pixels, blob, Math.floor((slimeColumns(count) - (blob[0] ?? '').length) / 2), 0, body)
    return pixels
  }
  f -= KING_MERGE_TICKS
  if (f < KING_DROP_TICKS) {
    const drop = KING_DROP[f]!
    const dropSprite = drop.squash ? squash : sprite
    const x = Math.floor((slimeColumns(count) - (dropSprite[0] ?? '').length) / 2)
    paint(pixels, dropSprite, x, drop.lift, king)
    return pixels
  }
  f -= KING_DROP_TICKS
  if (f === 0) {
    paint(pixels, sprite, kingX, 0, whiteOf(sprite))
    return pixels
  }
  if (f < KING_FLASH_TICKS) {
    paint(pixels, POOF, poofX, 0, { W: WHITE })
    return pixels
  }
  f -= KING_FLASH_TICKS
  if (f < KING_REIGN_TICKS) {
    const reignPose = (f - f % KING_POSE_TICKS) / KING_POSE_TICKS
    paint(pixels, reignPose % 8 === 5 ? blink : sprite, kingX, 0, king)
    for (const [dx, row] of TWINKLES[Math.floor(reignPose / 3) % 2] ?? []) {
      const line = pixels[row ?? 0]
      const x = kingX + (dx ?? 0)
      if (line && x >= 0 && x < line.length) line[x] = reignPose % 2 === 0 ? GOLD : WHITE
    }
    return pixels
  }
  f -= KING_REIGN_TICKS
  if (f < KING_DEFEAT_TICKS) {
    if (f % KING_FLICKER_TICKS === KING_FLICKER_TICKS - 1) paint(pixels, sprite, kingX, 0, king)
    return pixels
  }
  f -= KING_DEFEAT_TICKS
  if (f < KING_POOF_TICKS) {
    paint(pixels, POOF, poofX, 0, { W: WHITE })
    return pixels
  }
  f -= KING_POOF_TICKS
  if (f >= SCATTER.length) {
    const endpoint = momentEndTick({ kind: 'king', startTick: 0, variant }, count, 'still') - 1
    if (tick === null) return stage(count, null)
    const endpointTick = tick - frame + endpoint
    const pixels = blank(count)
    for (let i = 0; i < count; i += 1) {
      paintRejoiningKin(pixels, i, tick, rest, endpointTick)
    }
    return pixels
  }
  const progress = Math.min(1, f / (KING_SCATTER_AIR_TICKS - 1))
  paintFamily(pixels, count, COLLIDE * (1 - progress), SCATTER[f] as Pose)
  return pixels
}

// Flicker the target while the family holds still, then rejoin resting motion.
function damageStage(moment: Moment, count: number, tick: number, rest: Rest): Pixels {
  const pixels = blank(count)
  const frame = tick - moment.startTick
  const endpointTick = moment.startTick + DAMAGE_TICKS
  for (let i = 0; i < count; i += 1) {
    if (moment.kind === 'damage' && i === moment.target && frame < DAMAGE_TICKS && frame % DAMAGE_FLICKER_TICKS === 0) continue
    paintRejoiningKin(pixels, i, tick, rest, endpointTick)
  }
  return pixels
}

// Every kin hops at once from home, flashing gold at the top, then rejoins resting motion.
function levelUpStage(moment: Moment, count: number, tick: number, rest: Rest): Pixels {
  const pixels = blank(count)
  const frame = tick - moment.startTick
  const endpointTick = moment.startTick + LEVEL_UP_ENDPOINT
  // Gold body and white highlight for the Hang at the top of the hop.
  const isGold = frame >= HOP_HANG_START && frame < HOP_FALL_START
  for (let i = 0; i < count; i += 1) {
    if (frame < LEVEL_UP_ENDPOINT) {
      const { palette } = kinOf(i)
      paintKin(pixels, i, HOP[frame]!, kinHomeX(i), isGold ? { ...palette, B: GOLD, L: GOLD, D: GOLD_SHADE, E: GOLD_DEEP_SHADE, H: WHITE } : palette)
    } else {
      paintRejoiningKin(pixels, i, tick, rest, endpointTick)
    }
  }
  return pixels
}

function encounterStage(count: number, frame: number, tick: number, rest: Rest): Pixels {
  const pixels = blank(count)
  const startTick = tick - frame
  for (let i = 0; i < count; i += 1) {
    const step = frame - i * ENCOUNTER_STAGGER_TICKS
    if (step < 0) continue
    if (step < ENCOUNTER.length) {
      paintKin(pixels, i, ENCOUNTER[step]!, kinHomeX(i))
    } else {
      paintRejoiningKin(pixels, i, tick, rest, startTick + encounterEndpoint(i))
    }
  }
  return pixels
}

// The stage as Raster cells: base64 of [codePoint, fg, bg] u32 triplets.
// Moments take the stage over resting motion; their start tick shares the clock.
export function slimeCells(count: number, tick: number, moment: Moment | null = null, rest: Rest = 'breathe'): string {
  const frame = moment ? tick - moment.startTick : -1
  let pixels = stage(count, tick, rest)
  if (moment && frame >= 0 && tick < momentEndTick(moment, count, rest)) {
    pixels = MOMENT_MOTION[moment.kind]?.stage(moment, count, tick, rest) ?? pixels
  }
  return pixelCells(pixels)
}

export function pixelCells(pixels: Pixels): string {
  const width = pixels[0]?.length ?? 0
  const rows = pixels.length / 2
  const words = new Uint32Array(width * rows * 3)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const top = pixels[row * 2]?.[col] ?? null
      const bottom = pixels[row * 2 + 1]?.[col] ?? null
      const cell =
        top !== null
          ? [TOP_HALF, top, bottom ?? DEFAULT]
          : bottom !== null
            ? [BOTTOM_HALF, bottom, DEFAULT]
            : [SPACE, DEFAULT, DEFAULT]
      words.set(cell, (row * width + col) * 3)
    }
  }
  const bytes = new Uint8Array(words.buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Half blocks keep the silhouette when a surface cannot draw Raster cells.
export function halfBlockText(pixels: Pixels, row: number, start = 0, end = pixels[0]?.length ?? 0): string {
  let text = ''
  for (let col = start; col < end; col += 1) {
    const top = (pixels[row * 2]?.[col] ?? null) !== null
    const bottom = (pixels[row * 2 + 1]?.[col] ?? null) !== null
    text += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' '
  }
  return text
}

// Where there is no Raster: one resting frame, each slime one color, as text.
export function slimeText(count: number): { text: string; color: string }[][] {
  const pixels = stage(count, null)
  return Array.from({ length: SLIME_ROWS }, (_, row) =>
    Array.from({ length: count }, (_, i) => {
      const text = halfBlockText(pixels, row, kinHomeX(i), i + 1 < count ? kinHomeX(i + 1) : slimeColumns(count))
      return { text, color: `#${kinOf(i).palette.B.toString(16).padStart(6, '0')}` }
    }),
  )
}

export const SLIME_STAGE: Stage = {
  rows: SLIME_ROWS,
  taskMoment: () => null,
  maxRoom: FAMILY.length,
  rest: (idle, hop) => hop ? 'hop' : idle ? 'breathe' : 'still',
  columns: slimeColumns,
  cells: slimeCells,
  text: slimeText,
  momentEndTick,
  accepts: (kind, room) => MOMENT_MOTION[kind] !== undefined && slimeColumns(room) >= MOMENT_MOTION[kind].minColumns,
  priority: kind => MOMENT_MOTION[kind]?.priority ?? 0,
}
