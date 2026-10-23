import type { Monster, Skill } from './quest-foes'

export const FRAME_MS = 80
export const STAGE_ROWS = 3
export const DAMAGE_COOLDOWN_TICKS = Math.round(2_000 / FRAME_MS)

export type Rest = 'hop' | 'breathe' | 'still'

export type Moment =
  | { kind: 'king' | 'level-up' | 'encounter'; startTick: number }
  | { kind: 'damage'; startTick: number; target: number }
  | { kind: 'battle'; startTick: number; monster: Monster; skill: Skill }

// Room is the number of seven-column slots granted beside the branch.
export interface Stage {
  taskMoment: (tick: number, random: () => number) => Moment | null
  maxRoom: number
  rest: (idle: boolean, hop: boolean) => Rest
  columns: (room: number) => number
  cells: (room: number, tick: number, moment: Moment | null, rest: Rest) => string
  text: (room: number) => { text: string; color: string }[][]
  momentEndTick: (moment: Moment, room: number, rest: Rest) => number
  accepts: (kind: Moment['kind'], room: number) => boolean
  priority: (kind: Moment['kind']) => number
}

// Dropped moments are never queued. Equal priority keeps the current moment.
export function nextMoment(stage: Stage, active: Moment | null, incoming: Moment, room: number): Moment | null {
  if (!stage.accepts(incoming.kind, room)) return active
  return active === null || stage.priority(incoming.kind) > stage.priority(active.kind) ? incoming : active
}
