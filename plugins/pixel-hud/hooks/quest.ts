import { MONSTERS, paintMonster, paintSkill, SKILLS } from './quest-foes'
import type { Monster, Skill } from './quest-foes'
import { FAMILY, halfBlockText, paint, pixelCells, POOF, slimeColumns } from './slime'
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
// Leave room for the hero's attack, a two-column gap and a five-column foe.
export const HERO_SWORD_END = HERO_X + ATTACK[0]!.length
export const BATTLE_MONSTER_X = HERO_SWORD_END + 2
export const QUEST_MIN_COLUMNS = BATTLE_MONSTER_X + 5
export const HERO_PALETTE = { H: 0x0058f8, F: 0xfcd8a8, K: 0x181818, R: 0xd82800, B: 0x0078f8, S: 0xfcd8a8, Y: 0xac7c00, W: 0xfcfcfc, L: 0x0000bc }
const GOLD_PALETTE = { ...HERO_PALETTE, H: 0xfcbc3c, B: 0xfcbc3c, L: 0xfcbc3c, R: 0xfcfcfc, F: 0xfcfcfc, S: 0xfcfcfc }
const GROUND = 0x686878
export const BATTLE_APPROACH_TICKS = 8
export const BATTLE_FACE_OFF_TICKS = 4
export const BATTLE_HIT_TICKS = 6
export const BATTLE_BURST_TICKS = 2
export const BATTLE_RESUME_TICKS = 4
export const BATTLE_SKILL_START = BATTLE_APPROACH_TICKS + BATTLE_FACE_OFF_TICKS
const BATTLE_MIN_SKILL_TICKS = 6
export const BATTLE_SKILL_TICKS = Object.fromEntries(
  Object.entries(SKILLS).map(([skill, art]) => [skill, Math.max(BATTLE_MIN_SKILL_TICKS, Math.ceil((art.frames.length + 2) / 2) * 2)]),
) as Record<Skill, number>

type Battle = Extract<Moment, { kind: 'battle' }>

function battleTicks(moment: Battle): number {
  return BATTLE_SKILL_START + BATTLE_SKILL_TICKS[moment.skill] + BATTLE_HIT_TICKS + BATTLE_BURST_TICKS + BATTLE_RESUME_TICKS
}

function battlePose(frame: number, tick: number, moment: Battle, rest: Rest): HeroPose {
  const attacking = frame >= BATTLE_SKILL_START && frame < BATTLE_SKILL_START + BATTLE_SKILL_TICKS[moment.skill]
  const walking = frame < BATTLE_APPROACH_TICKS || frame >= battleTicks(moment) - BATTLE_RESUME_TICKS
  return { sprite: attacking ? ATTACK : walking ? walkSprite(tick, rest) : STAND, x: HERO_X + (attacking ? SKILLS[moment.skill].heroStep : 0), lift: 0, palette: HERO_PALETTE }
}

function battleArt(pixels: Pixels, frame: number, moment: Battle) {
  const width = pixels[0]!.length
  const hitStart = BATTLE_SKILL_START + BATTLE_SKILL_TICKS[moment.skill]
  const burstStart = hitStart + BATTLE_HIT_TICKS
  if (frame < hitStart || (frame < burstStart && (frame - hitStart) % 2 !== 0)) {
    const x = frame < BATTLE_APPROACH_TICKS
      ? BATTLE_MONSTER_X + Math.ceil((width - BATTLE_MONSTER_X) * (BATTLE_APPROACH_TICKS - 1 - frame) / (BATTLE_APPROACH_TICKS - 1))
      : BATTLE_MONSTER_X
    paintMonster(pixels, moment.monster, x, Math.floor(frame / WALK_POSE_TICKS))
  }
  if (frame >= BATTLE_SKILL_START && frame < hitStart) {
    const skill = SKILLS[moment.skill]
    const effectStart = hitStart - skill.frames.length
    const swordTip = HERO_SWORD_END - 1
    const origin = skill.origin === 'sword' ? swordTip : BATTLE_MONSTER_X
    paintSkill(pixels, moment.skill, origin + skill.originOffset, frame - effectStart)
  }
  if (frame >= burstStart && frame < burstStart + BATTLE_BURST_TICKS) {
    paint(pixels, POOF, BATTLE_MONSTER_X - 2, 0, { W: 0xfcfcfc })
  }
}

function battleGroundTick(frame: number, tick: number, moment: Battle): number {
  // Stop for whole ground cycles, using the start of Resume to finish a cycle.
  // Subtracting whole cycles then rejoins the global walk without a pixel jump.
  const cycle = GROUND_STEP_TICKS * 2
  const stopped = battleTicks(moment) - BATTLE_APPROACH_TICKS - BATTLE_RESUME_TICKS
  return tick - Math.max(0, Math.min(frame - BATTLE_APPROACH_TICKS, Math.ceil(stopped / cycle) * cycle))
}

function questColumns(room: number): number {
  const width = slimeColumns(room)
  return width >= QUEST_MIN_COLUMNS ? width : 0
}

type HeroPose = { sprite: readonly string[]; x: number; lift: number; palette: Palette }
type MomentMotion = {
  priority: number
  ticks: (moment: Moment) => number
  pose: (frame: number, tick: number, moment: Moment, rest: Rest) => HeroPose | null
  art?: (pixels: Pixels, frame: number, moment: Moment) => void
  groundTick?: (frame: number, tick: number, moment: Moment) => number
}

const MOMENT_MOTION: Partial<Record<Moment['kind'], MomentMotion>> = {
  battle: {
    priority: 3,
    ticks: moment => moment.kind === 'battle' ? battleTicks(moment) : 0,
    pose: (frame, tick, moment, rest) => moment.kind === 'battle' ? battlePose(frame, tick, moment, rest) : null,
    art: (pixels, frame, moment) => { if (moment.kind === 'battle') battleArt(pixels, frame, moment) },
    groundTick: (frame, tick, moment) => moment.kind === 'battle' ? battleGroundTick(frame, tick, moment) : tick,
  },
  'level-up': {
    priority: 4,
    ticks: () => QUEST_LEVEL_UP_TICKS,
    pose: frame => ({
      sprite: CHEER,
      x: HERO_X,
      lift: LEVEL_UP_LIFTS[frame] ?? 0,
      palette: frame >= LEVEL_UP_FLASH_START && frame < LEVEL_UP_FLASH_START + LEVEL_UP_FLASH_TICKS ? GOLD_PALETTE : HERO_PALETTE,
    }),
  },
  damage: {
    priority: 1,
    ticks: () => QUEST_DAMAGE_TICKS,
    pose: frame => frame % 2 === 0 ? null : { sprite: HURT, x: HERO_X, lift: 0, palette: HERO_PALETTE },
  },
  encounter: {
    priority: 2,
    ticks: () => QUEST_ENCOUNTER_TICKS,
    pose: (frame, tick, _moment, rest) => ({
      sprite: walkSprite(tick, rest),
      x: -STAND[0]!.length + Math.floor((HERO_X + STAND[0]!.length) * frame / (QUEST_ENCOUNTER_TICKS - 1)),
      lift: 0,
      palette: HERO_PALETTE,
    }),
  },
}

function walkSprite(tick: number, rest: Rest): readonly string[] {
  if (rest === 'still') return STAND
  return Math.floor(tick / WALK_POSE_TICKS) % 2 === 0 ? WALK_A : WALK_B
}

function questPixels(room: number, tick = 0, rest: Rest = 'still', moment: Moment | null = null): Pixels {
  const width = questColumns(room)
  const pixels = Array.from({ length: STAGE_ROWS * 2 }, () => Array<number | null>(width).fill(null))
  const motion = moment ? MOMENT_MOTION[moment.kind] : undefined
  const frame = moment ? tick - moment.startTick : -1
  const active = motion && moment && frame >= 0 && frame < motion.ticks(moment)
  const groundTick = active ? motion.groundTick?.(frame, tick, moment) ?? tick : tick
  const offset = rest === 'still' ? 0 : Math.floor(groundTick / GROUND_STEP_TICKS) % 2
  for (let col = offset; col < width; col += 2) pixels[STAGE_ROWS * 2 - 1]![col] = GROUND
  const pose = active
    ? motion.pose(frame, tick, moment, rest)
    : { sprite: walkSprite(tick, rest), x: HERO_X, lift: 0, palette: HERO_PALETTE }
  if (pose) paint(pixels, pose.sprite, pose.x, pose.lift, pose.palette)
  if (active) motion.art?.(pixels, frame, moment)
  return pixels
}

export const QUEST_STAGE: Stage = {
  taskMoment: (startTick, random) => {
    const monsters = Object.keys(MONSTERS) as Monster[]
    const skills = Object.keys(SKILLS) as Skill[]
    return { kind: 'battle', startTick, monster: monsters[Math.floor(random() * monsters.length)]!, skill: skills[Math.floor(random() * skills.length)]! }
  },
  maxRoom: FAMILY.length,
  rest: idle => idle ? 'breathe' : 'still',
  columns: questColumns,
  cells: (room, tick, moment, rest) => questColumns(room) > 0 ? pixelCells(questPixels(room, tick, rest, moment)) : '',
  text: room => {
    if (questColumns(room) === 0) return []
    const pixels = questPixels(room)
    return Array.from({ length: STAGE_ROWS }, (_, row) => [{
      text: halfBlockText(pixels, row),
      color: `#${HERO_PALETTE.B.toString(16).padStart(6, '0')}`,
    }])
  },
  momentEndTick: moment => moment.startTick + (MOMENT_MOTION[moment.kind]?.ticks(moment) ?? 0),
  accepts: (kind, room) => questColumns(room) > 0 && MOMENT_MOTION[kind] !== undefined,
  priority: kind => MOMENT_MOTION[kind]?.priority ?? 0,
}
