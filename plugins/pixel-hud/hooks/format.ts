import type { Flow } from '../types'

// Pure formatting for the HUD, ported from hudline's src/fields.js,
// src/themes.js and src/transcript.js so the mod and the npm status line
// read the same numbers the same way.

// ── Representations ─────────────────────────────────────────────────────────

// U+25B0/25B1 are East Asian Width Neutral; a CJK terminal keeps them one cell.
const METER_CELLS = 5

export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function bar(percent: number): string {
  const filled = Math.round((clampPercentage(percent) / 100) * METER_CELLS)
  return '▰'.repeat(filled) + '▱'.repeat(METER_CELLS - filled)
}

export function pct(value: number): string {
  return `${clampPercentage(value)}%`
}

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.trunc(n))
}

// Written the way Claude Code writes it, so it matches /cost: four decimals
// at or below half a dollar, two above, rounded through cents (hudline ADR-0009).
export function usd(n: number): string {
  return n > 0.5 ? `$${(Math.round(n * 100) / 100).toFixed(2)}` : `$${n.toFixed(4)}`
}

const pad = (n: number) => String(n).padStart(2, '0')

function toDate(iso: string | undefined): Date | null {
  const at = iso ? new Date(iso) : null
  return at && !Number.isNaN(at.getTime()) ? at : null
}

// 5h window: the local clock time it resets at.
export function resetClock(iso: string | undefined): string | null {
  const at = toDate(iso)
  return at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : null
}

// 7d window: the local date it resets on.
export function resetDate(iso: string | undefined): string | null {
  const at = toDate(iso)
  return at ? `${pad(at.getMonth() + 1)}/${pad(at.getDate())}` : null
}

const FAMILIES = ['opus', 'sonnet', 'haiku', 'fable']

// `claude-opus-5-5` -> `Opus 5.5`; an alias such as `opus` -> `Opus`.
export function modelName(model: string): string {
  const lower = model.toLowerCase()
  const family = FAMILIES.find(f => lower.includes(f))
  if (!family) return model
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  const version = new RegExp(`${family}-(\\d+)(?:-(\\d{1,2}))?(?!\\d)`).exec(lower)
  if (!version) return name
  return version[2] ? `${name} ${version[1]}.${version[2]}` : `${name} ${version[1]}`
}

// A share is Missing (null) without a denominator: before the first response
// there is nothing for a cache read to be a share of, and 0% would say it missed.
export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null
}

// ── Threshold roles ─────────────────────────────────────────────────────────
// Fullness: high is bad. Remaining: high is good. Two ramps, not one.

export type Role = 'ok' | 'warn' | 'danger'

export function fullnessRole(percent: number): Role {
  const n = clampPercentage(percent)
  return n >= 82 ? 'danger' : n >= 75 ? 'warn' : 'ok'
}

export function remainingRole(percent: number): Role {
  const n = clampPercentage(percent)
  return n >= 50 ? 'ok' : n >= 20 ? 'warn' : 'danger'
}

// Narration: the one most actionable alarm, worst-first by how soon it stops
// you, reusing the threshold roles so the sentence never disagrees with a colour.
export type SayToken = 'ctx_full' | 'five_hour_low' | 'weekly_low'

export function say(ctx: number | null, fiveHourLeft: number | null, weekLeft: number | null): SayToken | null {
  if (ctx !== null && fullnessRole(ctx) === 'danger') return 'ctx_full'
  if (fiveHourLeft !== null && remainingRole(fiveHourLeft) === 'danger') return 'five_hour_low'
  if (weekLeft !== null && remainingRole(weekLeft) === 'danger') return 'weekly_low'
  return null
}

// Dragon Quest's English localisation: hudline's neon phrasebook.
export const PHRASES: Record<SayToken, string> = {
  weekly_low: 'Thy power waneth!',
  five_hour_low: 'Thy stamina waneth!',
  ctx_full: 'Thy context runneth over!',
}

// ── Token flow ──────────────────────────────────────────────────────────────
// Two layers: Input (uncached + cache read + cache write) and Output, with
// cache reads and thinking as breakdowns, never peers.

export const NO_FLOW: Flow = { input: 0, cacheRead: 0, cacheWrite: 0, out: 0, thinking: 0 }

export function sent(flow: Flow): number {
  return flow.input + flow.cacheRead + flow.cacheWrite
}

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

// Sums a Claude Code transcript (JSONL). Claude Code can write one API
// response over several lines, each repeating its usage, so rows are
// de-duplicated by message id.
export function sumTranscript(raw: string): Flow {
  const flow = { ...NO_FLOW }
  const seen = new Set<string>()
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let entry: unknown
    try {
      entry = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (typeof entry !== 'object' || entry === null || (entry as { type?: unknown }).type !== 'assistant') continue
    const message = (entry as { message?: unknown }).message
    if (typeof message !== 'object' || message === null) continue
    const { id, usage } = message as { id?: unknown; usage?: unknown }
    if (typeof id !== 'string' || !id || typeof usage !== 'object' || usage === null) continue
    if (seen.has(id)) continue
    seen.add(id)
    const u = usage as Record<string, unknown>
    flow.input += num(u.input_tokens)
    flow.cacheRead += num(u.cache_read_input_tokens)
    flow.cacheWrite += num(u.cache_creation_input_tokens)
    flow.out += num(u.output_tokens)
    const details = u.output_tokens_details
    if (typeof details === 'object' && details !== null) {
      flow.thinking += num((details as Record<string, unknown>).thinking_tokens)
    }
  }
  return flow
}
