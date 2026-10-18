// The slime family that hops beside the branch: 8-bit sprites drawn into a
// Raster, two pixels to a cell ('▀' paints the top pixel in the foreground and
// the bottom one in the background).

// B body, H highlight, W white, K pupil, M mouth, D shade, '.' transparent.
// Each frame is 7 wide in a 6-pixel-tall stage (3 text rows), feet on the floor unless it is airborne.
export const STAND = ['...B...', '..BHB..', '.BWBWB.', 'BBKBKBB', 'DDMMMDD']
export const SQUASH = ['..BHB..', '.BWBWB.', 'BBKBKBB', 'DDDMDDD']
export const WIDE = ['..BHB..', 'BWBBBWB', 'BKBBBKB', 'DDMMMDD']
export const STRETCH = ['...B...', '..BHB..', '.BWBWB.', '.BKBKB.', '.BMMMB.', '..DDD..']
export const BLINK = STAND.map(row => row.replaceAll('W', 'B'))

export const FRAME_MS = 80

export const SLIME_WIDTH = 7
export const STAGE_ROWS = 3
const STAGE_PIXELS = STAGE_ROWS * 2

export type Rest = 'hop' | 'breathe' | 'still'

type Pose = { sprite: readonly string[]; lift: number }
type Beat = Pose & { ticks: number }

const RESTING_POSE: Pose = { sprite: STAND, lift: 0 }

// One hop: crouch, launch, rise/hang, fall, land, rebound, settle.
export const HOP: readonly Pose[] = ([
  { sprite: SQUASH, lift: 0, ticks: 2 },
  { sprite: STRETCH, lift: 0, ticks: 1 },
  { sprite: STAND, lift: 1, ticks: 3 },
  { sprite: STRETCH, lift: 0, ticks: 1 },
  { sprite: SQUASH, lift: 0, ticks: 2 },
  { sprite: STRETCH, lift: 0, ticks: 1 },
  { sprite: STAND, lift: 0, ticks: 1 },
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

type Pixels = (number | null)[][]
type Palette = Partial<Record<string, number>>

const WHITE = 0xfcfcfc
const MOUTH = 0x981828
const GOLD = 0xfcbc3c
const JEWEL = 0xf83800

function blank(count: number): Pixels {
  return Array.from({ length: STAGE_PIXELS }, () => Array<number | null>(slimeColumns(count)).fill(null))
}

// Paints `sprite` with its left edge at `x`, its bottom `lift` pixels off the floor.
function paint(pixels: Pixels, sprite: readonly string[], x: number, lift: number, palette: Palette) {
  const top = STAGE_PIXELS - sprite.length - lift
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
  const rests = HOP_RESTS[i % HOP_RESTS.length] as number[]
  const period = rests.reduce((total, ticks) => total + HOP_TICKS + ticks, 0)
  let step = (tick + (PHASE[i % PHASE.length] ?? 0)) % period
  let cycle = 0
  while (step >= HOP_TICKS + (rests[cycle] as number)) {
    step -= HOP_TICKS + (rests[cycle] as number)
    cycle += 1
  }
  if (step < HOP_TICKS) return HOP[step] as Pose
  // One tick inside every third rest; offsets 1–4 fit even a six-tick rest.
  const isBlinking = cycle % BLINK_EVERY_CYCLES === BLINK_EVERY_CYCLES - 1 && step === HOP_TICKS + 1 + i % FAMILY.length
  return isBlinking ? { sprite: BLINK, lift: 0 } : RESTING_POSE
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

// The King Slime: crowned, as wide as two slimes less one, the whole stage tall.
// B body, H highlight, Y gold crown, R red jewel, W white eyes,
// K pupils and grin corners, M red mouth, D lower shade, '.' transparent.
const KING = [
  '....Y.R.Y....',
  '....YYYYY....',
  '..BBWHBHWBB..',
  '..BBKBBBKBB..',
  '.BBKMMMMMKBB.',
  'DDDDDDDDDDDDD',
]
const KING_BLINK = KING.map(row => row.replaceAll('W', 'B'))
export const KING_WIDTH = 13
// The slimes landing on one another: a splat, then a blob bouncing up.
const MERGED = [
  ['...BWHBHWB...', '.BBBKBBBKBBB.', 'DDDDDMMMDDDDD'],
  ['....BHB....', '..BBBBBBB..', '.BBBWBWBBB.', '.BBBKBKBBB.', 'DDDDMMMDDDD'],
]
const POOF = [
  '..W...W..W...',
  'W...W....W..W',
  '...W..W.W....',
  '.W.........W.',
  'W..W.W..W...W',
  '..W....W..W..',
]
// Twinkles about the king, two sets in turn: [x from the king's left, row].
const TWINKLES = [
  [[-3, 0], [15, 2], [-2, 4]],
  [[-2, 2], [14, 0], [15, 4]],
]

// Each shipped King pose holds for two whole ticks.
export const KING_POSE_TICKS = 2
// One leap: crouch, rise, the top, fall, land.
export const LEAP = 5 * KING_POSE_TICKS
// Collide on the fall of the second leap, then leap out from that same spot.
const COLLIDE = 0.5 + (0.5 * (LEAP - 2 * KING_POSE_TICKS)) / (LEAP - KING_POSE_TICKS)
// Keep the shipped sequence; shorten the reign to keep the whole show near 7 s.
export const KING_GATHER_TICKS = LEAP * 2 - KING_POSE_TICKS
export const KING_MERGE_TICKS = MERGED.length * KING_POSE_TICKS
export const KING_FLASH_TICKS = 2 * KING_POSE_TICKS
export const KING_REIGN_TICKS = 34
export const KING_SCATTER_TICKS = LEAP * 2 + KING_POSE_TICKS
export const KING_SHOW_TICKS = KING_GATHER_TICKS + KING_MERGE_TICKS + KING_FLASH_TICKS + KING_REIGN_TICKS + KING_FLASH_TICKS + KING_SCATTER_TICKS

// Two slimes' room is the least the king needs.
export function canCrown(count: number): boolean {
  return slimeColumns(count) >= KING_WIDTH
}

export type Moment =
  | { kind: 'king' | 'level-up' | 'encounter'; startTick: number }
  | { kind: 'damage'; startTick: number; target: number }

const PRIORITY = { damage: 1, encounter: 2, 'level-up': 3, king: 4 }

// Dropped moments are never queued. Equal priority keeps the current moment.
export function nextMoment(active: Moment | null, incoming: Moment, count: number): Moment | null {
  if (incoming.kind === 'king' && !canCrown(count)) return active
  return active === null || PRIORITY[incoming.kind] > PRIORITY[active.kind] ? incoming : active
}

// Every slime `step` ticks into a leap that takes it `from` (0 home, 1 the
// middle) `to` the next spot: it moves only while in the air. Each one rounds
// away from the middle, so short of it they keep their order and all show.
function leap(pixels: Pixels, count: number, from: number, to: number, step: number) {
  const middle = Math.floor((slimeColumns(count) - SLIME_WIDTH) / 2)
  const heldStep = step - step % KING_POSE_TICKS
  const t = from + ((to - from) * heldStep) / (LEAP - KING_POSE_TICKS)
  const lift = heldStep === 0 || heldStep === LEAP - KING_POSE_TICKS ? 0 : 1
  const sprite = lift === 0 ? SQUASH : STAND
  for (let i = 0; i < count; i += 1) {
    const home = i * SLIME_WIDTH
    const x = home + (middle - home) * t
    paint(pixels, sprite, home < middle ? Math.floor(x) : Math.ceil(x), lift, kinPalette(i))
  }
}

function whiteOf(sprite: readonly string[]): Palette {
  return Object.fromEntries([...new Set(sprite.join(''))].filter(ch => ch !== '.').map(ch => [ch, WHITE]))
}

// The stage `frame` ticks into the King Slime show; `tick` poses the slimes
// once they are home again.
export function kingStage(count: number, frame: number, tick: number | null, rest: Rest = 'breathe'): Pixels {
  const pixels = blank(count)
  const kingX = Math.floor((slimeColumns(count) - KING_WIDTH) / 2)
  const king: Palette = { ...kinPalette(0), Y: GOLD, R: JEWEL }
  let f = frame
  if (f < KING_GATHER_TICKS) {
    if (f < LEAP) leap(pixels, count, 0, 0.5, f)
    else leap(pixels, count, 0.5, 1, f - LEAP)
    return pixels
  }
  f -= KING_GATHER_TICKS
  if (f < KING_MERGE_TICKS) {
    const blob = MERGED[f < KING_POSE_TICKS ? 0 : 1] as string[]
    paint(pixels, blob, Math.floor((slimeColumns(count) - (blob[0] ?? '').length) / 2), 0, kinPalette(0))
    return pixels
  }
  f -= KING_MERGE_TICKS
  if (f < KING_POSE_TICKS) {
    paint(pixels, KING, kingX, 0, whiteOf(KING))
    return pixels
  }
  if (f < KING_FLASH_TICKS) {
    paint(pixels, POOF, kingX, 0, { W: WHITE })
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
  if (f < KING_POSE_TICKS) {
    paint(pixels, KING, kingX, 0, whiteOf(KING))
    return pixels
  }
  if (f < KING_FLASH_TICKS) {
    paint(pixels, POOF, kingX, 0, { W: WHITE })
    return pixels
  }
  f -= KING_FLASH_TICKS
  if (f < LEAP) leap(pixels, count, COLLIDE, 0.5, f)
  else if (f < LEAP * 2) leap(pixels, count, 0.5, 0, f - LEAP)
  else return stage(count, tick, rest)
  return pixels
}

// The stage as Raster cells: base64 of [codePoint, fg, bg] u32 triplets.
// Moments take the stage over resting motion; their start tick shares the clock.
export function slimeCells(count: number, tick: number, moment: Moment | null = null, rest: Rest = 'breathe'): string {
  const frame = moment?.kind === 'king' ? tick - moment.startTick : null
  const pixels = frame !== null && frame >= 0 && frame < KING_SHOW_TICKS && canCrown(count)
    ? kingStage(count, frame, tick, rest)
    : stage(count, tick, rest)
  const width = slimeColumns(count)
  const words = new Uint32Array(width * STAGE_ROWS * 3)
  for (let row = 0; row < STAGE_ROWS; row += 1) {
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

// Where there is no Raster: one resting frame, each slime one color, as text.
export function slimeText(count: number): { text: string; color: string }[][] {
  const pixels = stage(count, null)
  return Array.from({ length: STAGE_ROWS }, (_, row) =>
    Array.from({ length: count }, (_, i) => {
      let text = ''
      for (let c = i * SLIME_WIDTH; c < (i + 1) * SLIME_WIDTH; c += 1) {
        const t = (pixels[row * 2]?.[c] ?? null) !== null
        const b = (pixels[row * 2 + 1]?.[c] ?? null) !== null
        text += t && b ? '█' : t ? '▀' : b ? '▄' : ' '
      }
      const kin = FAMILY[i % FAMILY.length] as Kin
      return { text, color: `#${kin.body.toString(16).padStart(6, '0')}` }
    }),
  )
}
