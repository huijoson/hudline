// The slime family that hops beside the branch: 8-bit sprites drawn into a
// Raster, two pixels to a cell ('▀' paints the top pixel in the foreground and
// the bottom one in the background).

// B body, H highlight, K eye, '.' transparent. Each frame is 7 wide; it sits in
// a 6-pixel-tall stage (3 text rows), feet on the floor unless it is airborne.
const STAND = ['...B...', '..BHB..', '.BKBKB.', '.BBBBB.']
const SQUASH = ['..BHB..', '.BKBKB.', 'BBBBBBB']

export const SLIME_WIDTH = 7
export const STAGE_ROWS = 3
const STAGE_PIXELS = STAGE_ROWS * 2

type Pose = { sprite: readonly string[]; lift: number }

// One hop: rest, crouch, spring up two pixels, hang, land, rest a while.
export const HOP: readonly Pose[] = [
  { sprite: STAND, lift: 0 },
  { sprite: SQUASH, lift: 0 },
  { sprite: STAND, lift: 1 },
  { sprite: STAND, lift: 2 },
  { sprite: STAND, lift: 2 },
  { sprite: STAND, lift: 1 },
  { sprite: SQUASH, lift: 0 },
  { sprite: STAND, lift: 0 },
  { sprite: STAND, lift: 0 },
  { sprite: STAND, lift: 0 },
]

type Kin = { body: number; highlight: number; eye: number }

// Slime, she-slime, metal slime, bubble slime.
export const FAMILY: readonly Kin[] = [
  { body: 0x3cbcfc, highlight: 0xbcf0fc, eye: 0x0b0a0d },
  { body: 0xfc7460, highlight: 0xfcd8c8, eye: 0x0b0a0d },
  { body: 0xa8a8b8, highlight: 0xfcfcfc, eye: 0x0b0a0d },
  { body: 0x38c838, highlight: 0xb8f818, eye: 0x0b0a0d },
]
// Each one starts its hop at a different moment, so they never move in step.
const PHASE = [0, 4, 7, 2]

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
  return { B: kin.body, H: kin.highlight, K: kin.eye }
}

function pose(i: number, tick: number): Pose {
  return HOP[(tick + (PHASE[i % PHASE.length] ?? 0)) % HOP.length] as Pose
}

// The stage's pixels for `count` slimes at `tick`: a color per pixel, or null.
export function stage(count: number, tick: number): Pixels {
  const pixels = blank(count)
  for (let i = 0; i < count; i += 1) {
    const p = pose(i, tick)
    paint(pixels, p.sprite, i * SLIME_WIDTH, p.lift, kinPalette(i))
  }
  return pixels
}

// The King Slime: crowned, as wide as two slimes less one, the whole stage tall.
// Y crown, R jewel, B body, H highlight, K eyes and smile.
const KING = [
  '....Y.R.Y....',
  '....YYYYY....',
  '...BBBBBHB...',
  '..BBKBBBKBB..',
  '.BBBBKKKBBBB.',
  'BBBBBBBBBBBBB',
]
const KING_BLINK = [KING[0], KING[1], KING[2], '..BBBBBBBBB..', KING[4], KING[5]] as string[]
const KING_WIDTH = 13
// The slimes pressing into one: bigger and bigger blobs.
const BLOBS = [
  ['...BHB...', '..BBBBB..', '.BBKBKBB.', 'BBBBBBBBB'],
  ['....BHB....', '..BBBBBBB..', '.BBBKBKBBB.', 'BBBBBBBBBBB', 'BBBBBBBBBBB'],
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

// The show, in ticks: gather, merge, flash, the king's reign, flash, scatter.
const GATHER = 10
const MERGE = BLOBS.length
const REIGN = 24
const SCATTER = 10
export const KING_SHOW_TICKS = GATHER + MERGE + 2 + REIGN + 2 + SCATTER

// Two slimes' room is the least the king needs.
export function canCrown(count: number): boolean {
  return slimeColumns(count) >= KING_WIDTH
}

// The slimes hopping from home toward the middle, `t` of the way there (0 to 1).
function travel(pixels: Pixels, count: number, tick: number, t: number) {
  const middle = Math.floor((slimeColumns(count) - SLIME_WIDTH) / 2)
  for (let i = 0; i < count; i += 1) {
    const home = i * SLIME_WIDTH
    const p = pose(i, tick)
    paint(pixels, p.sprite, Math.round(home + (middle - home) * t), p.lift, kinPalette(i))
  }
}

function whiteOf(sprite: readonly string[]): Palette {
  return Object.fromEntries([...new Set(sprite.join(''))].filter(ch => ch !== '.').map(ch => [ch, WHITE]))
}

// The stage `frame` ticks into the King Slime show, `tick` keeping the hops going.
export function kingStage(count: number, frame: number, tick: number): Pixels {
  const pixels = blank(count)
  const kingX = Math.floor((slimeColumns(count) - KING_WIDTH) / 2)
  const king: Palette = { ...kinPalette(0), Y: GOLD, R: JEWEL }
  let f = frame
  if (f < GATHER) {
    travel(pixels, count, tick, f / (GATHER - 1))
    return pixels
  }
  f -= GATHER
  if (f < MERGE) {
    const blob = BLOBS[f] as string[]
    paint(pixels, blob, Math.floor((slimeColumns(count) - (blob[0] ?? '').length) / 2), 0, kinPalette(0))
    return pixels
  }
  f -= MERGE
  if (f === 0) {
    paint(pixels, KING, kingX, 0, whiteOf(KING))
    return pixels
  }
  if (f === 1) {
    paint(pixels, POOF, kingX, 0, { W: WHITE })
    return pixels
  }
  f -= 2
  if (f < REIGN) {
    paint(pixels, f % 8 === 5 ? KING_BLINK : KING, kingX, 0, king)
    for (const [dx, row] of TWINKLES[Math.floor(f / 3) % 2] ?? []) {
      const line = pixels[row ?? 0]
      const x = kingX + (dx ?? 0)
      if (line && x >= 0 && x < line.length) line[x] = f % 2 === 0 ? GOLD : WHITE
    }
    return pixels
  }
  f -= REIGN
  if (f === 0) {
    paint(pixels, KING, kingX, 0, whiteOf(KING))
    return pixels
  }
  if (f === 1) {
    paint(pixels, POOF, kingX, 0, { W: WHITE })
    return pixels
  }
  f -= 2
  travel(pixels, count, tick, 1 - Math.min(1, (f + 1) / SCATTER))
  return pixels
}

// The stage as Raster cells: base64 of [codePoint, fg, bg] u32 triplets.
// `show` is how many ticks into the King Slime show, or null when there is none.
export function slimeCells(count: number, tick: number, show: number | null = null): string {
  const pixels = show !== null && show < KING_SHOW_TICKS && canCrown(count) ? kingStage(count, show, tick) : stage(count, tick)
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
  const pixels = stage(count, 0)
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
