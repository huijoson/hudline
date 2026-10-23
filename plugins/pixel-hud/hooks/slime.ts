import { nextMoment as admitMoment } from './stage'
import type { Moment, Rest, Stage } from './stage'

export { DAMAGE_COOLDOWN_TICKS, FRAME_MS } from './stage'
export type { Moment, Rest } from './stage'

// The slime family that hops beside the branch: 8-bit sprites drawn into a
// Raster, two pixels to a cell ('▀' paints the top pixel in the foreground and
// the bottom one in the background).

// B body, H highlight, W white, K pupil, M mouth, D shade, '.' transparent.
// Each frame is 14 wide in a 16-pixel-tall stage (8 text rows), feet on the floor unless it is airborne.
export const STAND = [
  '......BB......',
  '.....BHB......',
  '....BHHBB.....',
  '...BHHBBBB....',
  '..BHBBBBBBBB..',
  '..BWWBBBWWBB..',
  '.BWWKBBWWKBBB.',
  '.BBWKBBBWKBBB.',
  'BBBBBBBBBBBBBB',
  'BBKBBBBBBBBKBB',
  'DBBKMMMMMMKBBD',
  '.DDDKMMMMKDDD.',
]
export const SQUASH = [
  '.....BB.......',
  '...BHHBBB.....',
  '.BHHBBBBBBBB..',
  '.BWWKBBWWKBBB.',
  'BBBWKBBBWKBBBB',
  'BBBBBBBBBBBBBB',
  'DBBKMMMMMMKBBD',
  'DDDDKMMMMKDDDD',
  '.DDDDDDDDDDDD.',
]
export const WIDE = [
  '......BB......',
  '....BHHBB.....',
  '..BHHBBBBBB...',
  '.BHBBBBBBBBBB.',
  '.BWWBBBBWWBBB.',
  'BWWKBBBBWWKBBB',
  'BBWKBBBBBWKBBB',
  'BBBBBBBBBBBBBB',
  'BBKBBBBBBBBBKB',
  'DBBKMMMMMMMKBD',
  '.DDDKMMMMMKDD.',
]
export const STRETCH = [
  '......B.......',
  '......BB......',
  '.....BHB......',
  '.....BHBB.....',
  '....BHBBBB....',
  '....BWWBWWB...',
  '...BWWKBWWKB..',
  '...BBWKBBWKB..',
  '...BBBBBBBBB..',
  '...BKBBBBBKB..',
  '...BBKMMMKBB..',
  '....DDMMMDD...',
  '.....DDDDD....',
  '......DD......',
]
export const BLINK = [
  '......BB......',
  '.....BHB......',
  '....BHHBB.....',
  '...BHHBBBB....',
  '..BHBBBBBBBB..',
  '..BBBBBBBBBB..',
  '.BBBBBBBBBBBB.',
  '.BKKKBBBKKKBB.',
  'BBBBBBBBBBBBBB',
  'BBKBBBBBBBBKBB',
  'DBBKMMMMMMKBBD',
  '.DDDKMMMMKDDD.',
]

export const SLIME_ROWS = 8
export const SLIME_WIDTH = STAND[0]!.length
const SLIME_PIXELS = SLIME_ROWS * 2
// Airborne, a kin rises until its tip touches the top of the stage.
const STAND_AIR_LIFT = SLIME_PIXELS - STAND.length
const STRETCH_AIR_LIFT = SLIME_PIXELS - STRETCH.length

type Pose = { sprite: readonly string[]; lift: number }
type Beat = Pose & { ticks: number }

const RESTING_POSE: Pose = { sprite: STAND, lift: 0 }

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
  { sprite: SQUASH, lift: 0, ticks: HOP_CROUCH_TICKS },
  { sprite: STRETCH, lift: 0, ticks: HOP_LAUNCH_TICKS },
  { sprite: STAND, lift: STAND_AIR_LIFT, ticks: HOP_AIR_TICKS },
  { sprite: STRETCH, lift: 0, ticks: HOP_FALL_TICKS },
  { sprite: SQUASH, lift: 0, ticks: HOP_LAND_TICKS },
  { sprite: STRETCH, lift: 0, ticks: HOP_REBOUND_TICKS },
  { sprite: STAND, lift: 0, ticks: HOP_SETTLE_TICKS },
] satisfies Beat[]).flatMap(({ sprite, lift, ticks }) => Array<Pose>(ticks).fill({ sprite, lift }))
export const HOP_TICKS = HOP.length
// Fixed rest lengths in ticks keep each kin's pauses varied and repeatable.
const HOP_RESTS = [
  [6, 10, 14],
  [9, 14, 7],
  [12, 6, 10],
  [14, 8, 11],
] satisfies number[][]

type Kin = { body: number; highlight: number; eye: number; shade: number }

// Slime, she-slime, metal slime, bubble slime.
export const FAMILY: readonly Kin[] = [
  { body: 0x3cbcfc, highlight: 0xbcf0fc, eye: 0x0b0a0d, shade: 0x1878bc },
  { body: 0xfc7460, highlight: 0xfcd8c8, eye: 0x0b0a0d, shade: 0xbc3830 },
  { body: 0xa8a8b8, highlight: 0xfcfcfc, eye: 0x0b0a0d, shade: 0x686878 },
  { body: 0x38c838, highlight: 0xb8f818, eye: 0x0b0a0d, shade: 0x188818 },
]
// Each kin has an offset in ticks, so they never move in step.
const PHASE = [0, 3, 7, 12]

const BLINK_EVERY_CYCLES = 3
const BREATH_SQUISH_TICKS = 2
type Breath = { period: number; blink: number }

// A short squish at the end of each kin's own breathing cycle.
const BREATH = [
  { period: 36, blink: 12 },
  { period: 44, blink: 18 },
  { period: 50, blink: 24 },
  { period: 40, blink: 30 },
] satisfies Breath[]

const DEFAULT = 0x01000000
const TOP_HALF = 0x2580
const BOTTOM_HALF = 0x2584
const SPACE = 0x20

export function slimeColumns(count: number): number {
  return count * SLIME_WIDTH
}

export type Pixels = (number | null)[][]
export type Palette = Partial<Record<string, number>>

const WHITE = 0xfcfcfc
const MOUTH = 0xd83838
const GOLD = 0xfcbc3c

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

function kinPalette(i: number): Palette {
  const kin = FAMILY[i % FAMILY.length] as Kin
  return { B: kin.body, H: kin.highlight, K: kin.eye, W: WHITE, M: MOUTH, D: kin.shade }
}

// A null `tick` is the slimes at rest: all of them sitting on the floor.
function pose(i: number, tick: number | null, rest: Rest): Pose {
  if (tick === null || rest === 'still') return RESTING_POSE
  if (rest === 'breathe') {
    const breath = BREATH[i % BREATH.length] as Breath
    const isBlinking = tick % (breath.period * BLINK_EVERY_CYCLES) === breath.period * (BLINK_EVERY_CYCLES - 1) + breath.blink
    if (isBlinking) return { sprite: BLINK, lift: 0 }
    const isSquishing = tick % breath.period >= breath.period - BREATH_SQUISH_TICKS
    return isSquishing ? { sprite: WIDE, lift: 0 } : RESTING_POSE
  }
  const { step, cycle } = hopClock(i, tick)
  if (step < HOP_TICKS) return HOP[step] as Pose
  // One tick inside every third rest; offsets 1–4 fit even a six-tick rest.
  const isBlinking = cycle % BLINK_EVERY_CYCLES === BLINK_EVERY_CYCLES - 1 && step === HOP_TICKS + 1 + i % FAMILY.length
  return isBlinking ? { sprite: BLINK, lift: 0 } : RESTING_POSE
}

// Locate a kin in its deterministic hop/rest sequence.
function hopClock(i: number, tick: number): { step: number; cycle: number } {
  const rests = HOP_RESTS[i % HOP_RESTS.length] as number[]
  const period = rests.reduce((total, ticks) => total + HOP_TICKS + ticks, 0)
  let step = (tick + (PHASE[i % PHASE.length] ?? 0)) % period
  let cycle = 0
  while (step >= HOP_TICKS + (rests[cycle] as number)) {
    step -= HOP_TICKS + (rests[cycle] as number)
    cycle += 1
  }
  return { step, cycle }
}

// The endpoint is plain STAND; resume only at Rest or the first Crouch tick.
function hopRejoinTick(i: number, endpoint: number): number {
  const nextTick = endpoint + 1
  const { step } = hopClock(i, nextTick)
  return step === 0 || step >= HOP_TICKS ? nextTick : nextTick + HOP_TICKS - step
}

// Hold one kin through its endpoint, then rejoin Rest or a fresh Crouch.
function paintRejoiningKin(pixels: Pixels, i: number, tick: number, rest: Rest, endpointTick: number) {
  const held = tick <= endpointTick || (rest === 'hop' && tick < hopRejoinTick(i, endpointTick))
  const p = pose(i, held ? null : tick, rest)
  paint(pixels, p.sprite, i * SLIME_WIDTH, p.lift, kinPalette(i))
}

// The stage's pixels for `count` slimes at `tick`: a color per pixel, or null.
export function stage(count: number, tick: number | null, rest: Rest = 'breathe'): Pixels {
  const pixels = blank(count)
  for (let i = 0; i < count; i += 1) {
    const p = pose(i, tick, rest)
    paint(pixels, p.sprite, i * SLIME_WIDTH, p.lift, kinPalette(i))
  }
  return pixels
}

// The King Slime: crowned, the whole stage tall, and too wide for one slot.
// B body, H highlight, Y gold crown, J red jewel, W white eyes,
// K pupils and grin corners, M red mouth, D lower shade, '.' transparent.
export const KING = [
  '.....Y..J..Y..J..Y......',
  '.....YY.Y.YYY.Y.YY......',
  '.....YYYYYYYYYYYYY......',
  '.....YJYYYJYYYJYYY......',
  '...BBBBBBBHHBBBBBBBB....',
  '..BBBBBBBHHHBBBBBBBBB...',
  '.BBBWWWBBHBBBBWWWBBBBB..',
  '.BBWWWKKBBBBBBWWWKKBBB..',
  'BBBWWWKKBBBBBBWWWKKBBBB.',
  'BBBBBBBBBBBBBBBBBBBBBBB.',
  'BBBKBBBBBBBBBBBBBBBBKBBB',
  'BBBBKMMMMMMMMMMMMMMKBBBB',
  'DBBBBKMMMMMMMMMMMMKBBBBD',
  'DDBBBBKKMMMMMMMMKKBBBBDD',
  '.DDDDBBBBKKKKKKBBBBDDDD.',
  '..DDDDDDDDDDDDDDDDDDDD..',
]
const CROWN: Palette = { Y: 0xfcbc3c, J: 0xf83800 }
// No squash was drawn: the landing loses the crown's points and spreads one
// pixel wider on each side where the body meets the edge.
const KING_SQUASH = KING.slice(1).map(row => row[0] + row + row.at(-1))
export const KING_DROP_FALL_TICKS = 2
export const KING_DROP_SQUASH_TICKS = 2
export const KING_DROP: readonly Pose[] = ([
  { sprite: KING, lift: 10, ticks: KING_DROP_FALL_TICKS / 2 },
  { sprite: KING, lift: 5, ticks: KING_DROP_FALL_TICKS / 2 },
  { sprite: KING_SQUASH, lift: 0, ticks: KING_DROP_SQUASH_TICKS },
  { sprite: KING, lift: 2, ticks: HOP_REBOUND_TICKS },
  { sprite: KING, lift: 0, ticks: HOP_SETTLE_TICKS },
] satisfies Beat[]).flatMap(({ sprite, lift, ticks }) => Array<Pose>(ticks).fill({ sprite, lift }))
const KING_BLINK = KING.map(row => row.replaceAll('W', 'B'))
export const KING_WIDTH = KING[0]!.length
// The slimes landing on one another: a splat, then a blob bouncing up.
const MERGED_SPLAT = [
  '.......BBHHBBBB.......',
  '....BBBBWWBBBWWBBBB...',
  '..BBBBBWKBBBBWKBBBBBB.',
  '.BBBBBBBBBBBBBBBBBBBBB',
  'DDBBBBKMMMMMMKBBBBBDDD',
  '.DDDDDDDKKKKKDDDDDDDD.',
]
const MERGED_BLOB = [
  '........BB..........',
  '.......BHHB.........',
  '......BHHBBB........',
  '....BBHBBBBBBB......',
  '...BBBBBBBBBBBBB....',
  '..BBBWWBBBBBWWBBB...',
  '..BBWWKBBBBWWKBBB...',
  '.BBBWWKBBBBWWKBBBB..',
  '.BBBBBBBBBBBBBBBBB..',
  'BBBKBBBBBBBBBBBKBBB.',
  'DBBBKMMMMMMMMMKBBBD.',
  '.DDDDKMMMMMMMKDDDD..',
  '..DDDDDDDDDDDDDD....',
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

export const KING_SCATTER_AIR_TICKS = HOP_AIR_TICKS + HOP_FALL_TICKS
export const SCATTER: readonly Pose[] = ([
  { sprite: STRETCH, lift: STRETCH_AIR_LIFT, ticks: HOP_RISE_TICKS },
  { sprite: STAND, lift: STAND_AIR_LIFT, ticks: HOP_HANG_TICKS },
  { sprite: STRETCH, lift: STRETCH_AIR_LIFT, ticks: HOP_FALL_TICKS },
  { sprite: SQUASH, lift: 0, ticks: HOP_LAND_TICKS },
] satisfies Beat[]).flatMap(({ sprite, lift, ticks }) => Array<Pose>(ticks).fill({ sprite, lift }))

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
    sprite: STAND, lift: Math.round(ENCOUNTER_START_LIFT * (1 - i / ENCOUNTER_FALL_TICKS)), ticks: 1,
  })),
  { sprite: SQUASH, lift: 0, ticks: HOP_LAND_TICKS },
  { sprite: STRETCH, lift: 0, ticks: HOP_REBOUND_TICKS },
] satisfies Beat[]).flatMap(({ sprite, lift, ticks }) => Array<Pose>(ticks).fill({ sprite, lift }))
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
    stage: (moment, count, tick, rest) => canCrown(count)
      ? kingStage(count, tick - moment.startTick, tick, rest)
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
    const home = i * SLIME_WIDTH
    const x = home + (middle - home) * progress
    paint(pixels, familyPose.sprite, home < middle ? Math.floor(x) : Math.ceil(x), familyPose.lift, kinPalette(i))
  }
}

function gather(pixels: Pixels, count: number, frame: number) {
  const second = frame >= LEAP
  const step = second ? frame - LEAP : frame
  // Advance once per airborne Rise/Hang tick, finishing before the Fall.
  const progress = Math.min(1, Math.max(0, step - (HOP_RISE_START - 1)) / HOP_AIR_TICKS)
  const p = HOP[step] as Pose
  // Lifted STAND keeps the falling collision airborne without clipping STRETCH.
  const collision = second && step === HOP_FALL_START
  paintFamily(pixels, count, second ? HALFWAY + progress * (COLLIDE - HALFWAY) : progress * HALFWAY,
    collision ? { sprite: STAND, lift: STAND_AIR_LIFT } : p)
}

function whiteOf(sprite: readonly string[]): Palette {
  return Object.fromEntries([...new Set(sprite.join(''))].filter(ch => ch !== '.').map(ch => [ch, WHITE]))
}

// The stage `frame` ticks into the King Slime show; `tick` poses the slimes
// after the exact resting frame at the end of the show.
export function kingStage(count: number, frame: number, tick: number | null, rest: Rest = 'breathe'): Pixels {
  const pixels = blank(count)
  const kingX = Math.floor((slimeColumns(count) - KING_WIDTH) / 2)
  const poofX = Math.floor((slimeColumns(count) - POOF[0]!.length) / 2)
  const king: Palette = { ...kinPalette(0), ...CROWN }
  let f = frame
  if (f < KING_GATHER_TICKS) {
    gather(pixels, count, f)
    return pixels
  }
  f -= KING_GATHER_TICKS
  if (f < KING_MERGE_TICKS) {
    const blob = MERGED[Math.floor(f / KING_MERGE_POSE_TICKS)] as string[]
    paint(pixels, blob, Math.floor((slimeColumns(count) - (blob[0] ?? '').length) / 2), 0, kinPalette(0))
    return pixels
  }
  f -= KING_MERGE_TICKS
  if (f < KING_DROP_TICKS) {
    const drop = KING_DROP[f] as Pose
    const x = Math.floor((slimeColumns(count) - (drop.sprite[0] ?? '').length) / 2)
    paint(pixels, drop.sprite, x, drop.lift, king)
    return pixels
  }
  f -= KING_DROP_TICKS
  if (f === 0) {
    paint(pixels, KING, kingX, 0, whiteOf(KING))
    return pixels
  }
  if (f < KING_FLASH_TICKS) {
    paint(pixels, POOF, poofX, 0, { W: WHITE })
    return pixels
  }
  f -= KING_FLASH_TICKS
  if (f < KING_REIGN_TICKS) {
    const reignPose = (f - f % KING_POSE_TICKS) / KING_POSE_TICKS
    paint(pixels, reignPose % 8 === 5 ? KING_BLINK : KING, kingX, 0, king)
    for (const [dx, row] of TWINKLES[Math.floor(reignPose / 3) % 2] ?? []) {
      const line = pixels[row ?? 0]
      const x = kingX + (dx ?? 0)
      if (line && x >= 0 && x < line.length) line[x] = reignPose % 2 === 0 ? GOLD : WHITE
    }
    return pixels
  }
  f -= KING_REIGN_TICKS
  if (f < KING_DEFEAT_TICKS) {
    if (f % KING_FLICKER_TICKS === KING_FLICKER_TICKS - 1) paint(pixels, KING, kingX, 0, king)
    return pixels
  }
  f -= KING_DEFEAT_TICKS
  if (f < KING_POOF_TICKS) {
    paint(pixels, POOF, poofX, 0, { W: WHITE })
    return pixels
  }
  f -= KING_POOF_TICKS
  if (f >= SCATTER.length) {
    const endpoint = momentEndTick({ kind: 'king', startTick: 0 }, count, 'still') - 1
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
      const p = HOP[frame] as Pose
      paint(pixels, p.sprite, i * SLIME_WIDTH, p.lift, isGold ? { ...kinPalette(i), B: GOLD, H: WHITE } : kinPalette(i))
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
      const p = ENCOUNTER[step] as Pose
      paint(pixels, p.sprite, i * SLIME_WIDTH, p.lift, kinPalette(i))
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
      const text = halfBlockText(pixels, row, i * SLIME_WIDTH, (i + 1) * SLIME_WIDTH)
      const kin = FAMILY[i % FAMILY.length] as Kin
      return { text, color: `#${kin.body.toString(16).padStart(6, '0')}` }
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
