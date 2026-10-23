import { paint, pixelCells, slimeColumns } from './slime'
import type { Palette, Pixels } from './slime'
import { STAGE_ROWS } from './stage'
import type { Moment, Rest, Stage } from './stage'

// H helmet, F face, K eye, R cape, B armour, S hand, Y hilt, W blade, L legs.
export const STAND = ['.....W', '.HHH.W', '.HFK.W', 'RBBBSY', 'RBBB..', '.L.L..']
export const WALK_A = ['.....W', '.HHH.W', '.HFK.W', 'RBBBSY', 'RBBB..', 'L...L.']
export const WALK_B = ['.....W', '.HHH.W', '.HFK.W', 'RBBBSY', 'RBBB..', '..L...']
export const WALK_POSE_TICKS = 4
export const WALK_CYCLE_TICKS = WALK_POSE_TICKS * 2
export const GROUND_STEP_TICKS = 2
export const QUEST_ENCOUNTER_TICKS = 12
export const QUEST_DAMAGE_TICKS = 6
export const HURT = ['......', 'HHH...', 'HFF..W', 'RBBBSY', 'RBBB..', 'L..L..']
export const ATTACK = ['........', '.HHH....', '.HFK....', 'RBBBSYWW', 'RBBB....', '.L..L...']
export const CHEER = ['....W.', '.HHHW.', '.HFKY.', 'RBBBS.', 'RBBB..', '.L.L..']
const LEVEL_UP_LIFTS = [0, 0, 1, 1, 1, 1, 0, 0]
export const QUEST_LEVEL_UP_TICKS = LEVEL_UP_LIFTS.length
export const LEVEL_UP_FLASH_START = 3
export const LEVEL_UP_FLASH_TICKS = 2
export const HERO_X = 2
export const QUEST_MIN_COLUMNS = 17
export const HERO_PALETTE = { H: 0x0058f8, F: 0xfcd8a8, K: 0x181818, R: 0xd82800, B: 0x0078f8, S: 0xfcd8a8, Y: 0xac7c00, W: 0xfcfcfc, L: 0x0000bc }
const GOLD_PALETTE = { ...HERO_PALETTE, H: 0xfcbc3c, B: 0xfcbc3c, L: 0xfcbc3c, R: 0xfcfcfc, F: 0xfcfcfc, S: 0xfcfcfc }
const GROUND = 0x686878

function questColumns(room: number): number {
  const width = slimeColumns(room)
  return width >= QUEST_MIN_COLUMNS ? width : 0
}

type HeroPose = { sprite: readonly string[]; x: number; lift: number; palette: Palette }
type MomentMotion = {
  priority: number
  ticks: number
  pose: (frame: number, tick: number) => HeroPose | null
}

const MOMENT_MOTION: Partial<Record<Moment['kind'], MomentMotion>> = {
  'level-up': {
    priority: 3,
    ticks: QUEST_LEVEL_UP_TICKS,
    pose: frame => ({
      sprite: CHEER,
      x: HERO_X,
      lift: LEVEL_UP_LIFTS[frame] ?? 0,
      palette: frame >= LEVEL_UP_FLASH_START && frame < LEVEL_UP_FLASH_START + LEVEL_UP_FLASH_TICKS ? GOLD_PALETTE : HERO_PALETTE,
    }),
  },
  damage: {
    priority: 1,
    ticks: QUEST_DAMAGE_TICKS,
    pose: frame => frame % 2 === 0 ? null : { sprite: HURT, x: HERO_X, lift: 0, palette: HERO_PALETTE },
  },
  encounter: {
    priority: 2,
    ticks: QUEST_ENCOUNTER_TICKS,
    pose: (frame, tick) => ({
      sprite: walkSprite(tick),
      x: -STAND[0]!.length + Math.floor((HERO_X + STAND[0]!.length) * frame / (QUEST_ENCOUNTER_TICKS - 1)),
      lift: 0,
      palette: HERO_PALETTE,
    }),
  },
}

function walkSprite(tick: number): readonly string[] {
  return Math.floor(tick / WALK_POSE_TICKS) % 2 === 0 ? WALK_A : WALK_B
}

function questPixels(room: number, tick = 0, rest: Rest = 'still', moment: Moment | null = null): Pixels {
  const width = questColumns(room)
  const pixels = Array.from({ length: STAGE_ROWS * 2 }, () => Array<number | null>(width).fill(null))
  const offset = rest === 'still' ? 0 : Math.floor(tick / GROUND_STEP_TICKS) % 2
  for (let col = offset; col < width; col += 2) pixels[STAGE_ROWS * 2 - 1]![col] = GROUND
  const motion = moment ? MOMENT_MOTION[moment.kind] : undefined
  const frame = moment ? tick - moment.startTick : -1
  const pose = motion && frame >= 0 && frame < motion.ticks
    ? motion.pose(frame, tick)
    : { sprite: rest === 'still' ? STAND : walkSprite(tick), x: HERO_X, lift: 0, palette: HERO_PALETTE }
  if (pose) paint(pixels, pose.sprite, pose.x, pose.lift, pose.palette)
  return pixels
}

export const QUEST_STAGE: Stage = {
  maxRoom: 4,
  rest: idle => idle ? 'breathe' : 'still',
  columns: questColumns,
  cells: (room, tick, moment, rest) => questColumns(room) > 0 ? pixelCells(questPixels(room, tick, rest, moment)) : '',
  text: room => {
    if (questColumns(room) === 0) return []
    const pixels = questPixels(room)
    return Array.from({ length: STAGE_ROWS }, (_, row) => [{
      text: (pixels[row * 2] ?? []).map((top, col) => {
        const bottom = pixels[row * 2 + 1]?.[col] ?? null
        return top !== null && bottom !== null ? '█' : top !== null ? '▀' : bottom !== null ? '▄' : ' '
      }).join(''),
      color: '#0058f8',
    }])
  },
  momentEndTick: moment => moment.startTick + (MOMENT_MOTION[moment.kind]?.ticks ?? 0),
  accepts: (kind, room) => questColumns(room) > 0 && MOMENT_MOTION[kind] !== undefined,
  priority: kind => MOMENT_MOTION[kind]?.priority ?? 0,
}
