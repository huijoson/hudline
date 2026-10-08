import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit, SessionUsage, Timer } from 'claude-code'

import type { Branch, Flow, Tally, Usage } from '../types'
import {
  bar,
  fullnessRole,
  modelName,
  NO_FLOW,
  pct,
  PHRASES,
  ratio,
  remainingRole,
  resetClock,
  resetDate,
  say,
  sent,
  sumTranscript,
  tokens,
  usd,
} from './format'
import type { Role } from './format'
import { BRANCH_SPRITE, pack, pixelText, pixelWidth } from './pixel'

const branch = atom({ plugin: 'pixel-hud', key: 'branch' } as const, null)
const usage = atom({ plugin: 'pixel-hud', key: 'usage' } as const, null)
const EMPTY: Tally = { effort: null, transcript: null, base: null, since: NO_FLOW, isThinkingKnown: false }
const tally = atom({ plugin: 'pixel-hud', key: 'tally' } as const, EMPTY)

// Branch: NES-style palette, a vertical title gradient, green sprite, red alert.
const ROW_COLORS = ['#58f898', '#3cbcfc', '#6888fc']
const SPRITE_COLOR = '#00b800'
const DIRTY_COLOR = '#f83800'
const SPRITE = pack(BRANCH_SPRITE)
const GAP = '  '
// Meter: hudline's neon theme.
const ROLE_COLORS: Record<Role, string> = { ok: '#4ade80', warn: '#fbbf24', danger: '#f2555a' }
const LABEL = '#ff49a4'
const PUNCT = '#4a454e'
const CHIP = '#ff1f8f'
const CHIP_INK = '#0b0a0d'
const SEP = ' ★ '
// Big glyphs (3 rows) plus the meter (2 rows).
const FULL_ROWS = 5
// /clear empties $.state, and a branch switched outside Claude Code raises no
// event: poll to catch both.
const POLL_MS = 3000
// $.fs.read refuses files over 4 MiB.
const READ_LIMIT = 4 * 1024 * 1024

async function loadBranch($: EngineInterface) {
  const head = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
  if (head.exitCode !== 0) {
    await update($, branch, () => null)
    return
  }
  const status = await $.process.run(['git', 'status', '--porcelain'])
  const next: Branch = { name: head.stdout.trim(), isDirty: status.stdout.trim() !== '' }
  await update($, branch, prev =>
    prev?.name === next.name && prev.isDirty === next.isDirty ? prev : next,
  )
}

function windowLeft(limits: readonly SessionRateLimit[], kind: string): Usage['fiveHourLeft'] {
  const w = limits.find(l => l.kind === kind)
  return w ? { percent: 100 - w.percentUsed, resetsAt: w.resetsAt } : null
}

function toUsage(model: string, u: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>): Usage {
  return {
    model,
    ctxPercent: u.context.percent ?? null,
    fiveHourLeft: windowLeft(u.rateLimits, 'five_hour'),
    sevenDayLeft: windowLeft(u.rateLimits, 'seven_day'),
    usd: u.cost?.usd ?? null,
  }
}

async function loadUsage($: EngineInterface) {
  const [model, u] = await Promise.all([$.session.model(), $.session.usage()])
  await update($, usage, () => toUsage(model, u))
}

async function refresh($: EngineInterface) {
  await Promise.all([
    loadBranch($).catch(() => update($, branch, () => null)),
    // Keep the last reading; the next poll or measure tries again.
    loadUsage($).catch(() => undefined),
  ])
}

// The transcript is the Conversation's ledger, as hudline reads it: null when
// it is too large to read, zeros when it does not exist yet.
async function readFlow($: EngineInterface, path: string): Promise<Flow | null> {
  if (!(await $.fs.exists(path))) return NO_FLOW
  if ((await $.fs.stat(path)).size > READ_LIMIT) return null
  return sumTranscript(await $.fs.read(path))
}

async function reflow($: EngineInterface, path: string) {
  const flow = await readFlow($, path).catch(() => null)
  await update($, tally, prev => {
    const t = prev ?? EMPTY
    // Past the read limit the totals carry on from the main loop's own counts,
    // but thinking is only in the transcript, so its share goes Missing.
    return flow
      ? { ...t, transcript: path, base: flow, since: NO_FLOW, isThinkingKnown: true }
      : { ...t, transcript: path, isThinkingKnown: false }
  })
}

function add(a: Flow, b: Flow): Flow {
  return {
    input: a.input + b.input,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    out: a.out + b.out,
    thinking: a.thinking + b.thinking,
  }
}

// How many glyphs of the name fit beside the sprite and the dirty mark.
function fitName(name: string, isDirty: boolean, columns: number): string | null {
  const fixed = (BRANCH_SPRITE[0] ?? '').length + GAP.length + (isDirty ? GAP.length + pixelWidth(1) : 0)
  const room = Math.floor((columns - fixed + 1) / 4)
  if (room < 4) {
    return null
  }
  return name.length <= room ? name : `${name.slice(0, room - 2)}..`
}

export const register: Register = on => {
  let poll: Timer | undefined

  on('session.start', async ($, e, next) => {
    await refresh($)
    poll?.cancel()
    poll = $.clock.every(POLL_MS, () => void refresh($))
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const result = await next(e)
    if (e.reason === 'clear') {
      $.clock.after(200, () => void refresh($))
    }
    return result
  })

  // The classic events carry the transcript's path; each rereads the ledger at
  // a moment no model request is in flight. SessionStart also fires on /clear.
  // Never awaited, never thrown: a slow or failed read must not hold a prompt.
  on('classic.SessionStart', async ($, e, next) => {
    void reflow($, e.transcript_path).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.UserPromptSubmit', async ($, e, next) => {
    void reflow($, e.transcript_path).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.Stop', async ($, e, next) => {
    void reflow($, e.transcript_path).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    const model = await $.session.model()
    await update($, usage, () => toUsage(model, e))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.tool === 'Bash' || e.tool === 'Edit' || e.tool === 'Write') {
      await loadBranch($).catch(() => update($, branch, () => null))
    }
    return result
  }).catch(($, e, next) => next(e))

  // Between transcript readings the main loop's responses keep the totals live.
  // A subagent's turns are in its own transcript, so they are left out here too.
  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    for await (const chunk of stream) {
      yield chunk
    }
    const result = await stream.result
    const u = result.usage
    if (e.agentId) {
      return result
    }
    await update($, tally, prev => {
      const t = prev ?? EMPTY
      const step: Flow = u
        ? {
            input: u.input_tokens,
            cacheRead: u.cache_read_input_tokens,
            cacheWrite: u.cache_creation_input_tokens,
            out: u.output_tokens,
            thinking: 0,
          }
        : NO_FLOW
      return {
        ...t,
        effort: e.effort === undefined ? t.effort : String(e.effort),
        since: add(t.since, step),
      }
    })
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const git = await read($, branch)
    const now = await read($, usage)
    if (e.props.hasSurvey || (git === null && now === null)) {
      return next(e)
    }
    const t = (await read($, tally)) ?? EMPTY
    const { Box, Text } = $.ui.resolve(e)

    // Branch: big glyphs when there is room, else a chunky chip.
    const name = git && e.props.maxRows >= FULL_ROWS ? fitName(git.name, git.isDirty, e.props.bodyColumns) : null
    const glyphs = name === null ? null : pixelText(name)
    const dirty = pixelText('*')
    const chip =
      git && glyphs === null
        ? [
            <Text key="chip" color="#fcfcfc" backgroundColor="#0058f8" bold>
              {` ▶ ${git.name.toUpperCase()} `}
            </Text>,
            git.isDirty ? (
              <Text key="chip-dirty" color="#fcfcfc" backgroundColor={DIRTY_COLOR} bold>
                {' ! '}
              </Text>
            ) : null,
            <Text key="chip-gap"> </Text>,
          ]
        : null

    const label = (key: string, text: string) => (
      <Text key={key} color={LABEL}>
        {text}
      </Text>
    )
    const meter = (key: string, percent: number, role: Role) => (
      <Text key={key} color={ROLE_COLORS[role]}>
        {` ${bar(percent)} ${pct(percent)}`}
      </Text>
    )
    const when = (key: string, text: string | null) => (text ? <Text key={key}>{` (${text})`}</Text> : null)
    // Segments are joined by the separator; a Missing one takes its separator with it.
    const joined = (row: string, segments: (JSX.Element | JSX.Element[] | null)[]) =>
      segments
        .filter(s => s !== null)
        .flatMap((s, i) => [
          ...(i > 0
            ? [
                <Text key={`${row}-sep-${i}`} color={PUNCT}>
                  {SEP}
                </Text>,
              ]
            : []),
          ...(Array.isArray(s) ? s : [s]),
        ])

    const flow = add(t.base ?? NO_FLOW, t.since)
    const total = sent(flow)
    const cacheRate = ratio(flow.cacheRead, total)
    const base = t.base
    const thinkRate = t.isThinkingKnown && base ? ratio(base.thinking, base.out) : null
    const alarm = now
      ? say(now.ctxPercent, now.fiveHourLeft?.percent ?? null, now.sevenDayLeft?.percent ?? null)
      : null

    const meterRow = now
      ? joined('top', [
          [
            <Text key="model" color={CHIP_INK} backgroundColor={CHIP}>
              {` ${modelName(now.model)} `}
            </Text>,
            ...(t.effort ? [<Text key="effort">{`:${t.effort}`}</Text>] : []),
          ],
          now.ctxPercent !== null
            ? [label('ctx', 'CTX'), meter('ctx-m', now.ctxPercent, fullnessRole(now.ctxPercent))]
            : null,
          now.fiveHourLeft
            ? [
                label('5h', '5H'),
                meter('5h-m', now.fiveHourLeft.percent, remainingRole(now.fiveHourLeft.percent)),
                ...[when('5h-w', resetClock(now.fiveHourLeft.resetsAt))].filter(x => x !== null),
              ]
            : null,
          now.sevenDayLeft
            ? [
                label('7d', '7D'),
                meter('7d-m', now.sevenDayLeft.percent, remainingRole(now.sevenDayLeft.percent)),
                ...[when('7d-w', resetDate(now.sevenDayLeft.resetsAt))].filter(x => x !== null),
              ]
            : null,
          now.usd !== null ? <Text key="usd">{usd(now.usd)}</Text> : null,
          alarm ? (
            <Text key="say" color={ROLE_COLORS.danger}>
              {PHRASES[alarm]}
            </Text>
          ) : null,
        ])
      : null

    // SENT and OUT are counts, so they are always there once a reading exists;
    // their shares are Missing until there is something to divide.
    const flowRow =
      now && (t.base !== null || total > 0)
        ? joined('flow', [
            [
              label('sent', 'SENT'),
              <Text key="sent-v">{` ${tokens(total)}`}</Text>,
              ...(cacheRate !== null
                ? [<Text key="cr-gap"> </Text>, label('cr', 'CR'), <Text key="cr-v">{` ${pct(cacheRate)}`}</Text>]
                : []),
            ],
            [
              label('out', 'OUT'),
              <Text key="out-v">{` ${tokens(flow.out)}`}</Text>,
              ...(thinkRate !== null
                ? [<Text key="th-gap"> </Text>, label('th', 'TH'), <Text key="th-v">{` ${pct(thinkRate)}`}</Text>]
                : []),
            ],
          ])
        : null

    return (
      <Box flexDirection="column">
        {glyphs && git
          ? glyphs.map((line, row) => (
              <Box key={`row-${row}`}>
                <Text color={SPRITE_COLOR}>{SPRITE[row]}</Text>
                <Text>{GAP}</Text>
                <Text color={ROW_COLORS[row]} bold>
                  {line}
                </Text>
                {git.isDirty ? <Text color={DIRTY_COLOR}>{GAP + dirty[row]}</Text> : null}
              </Box>
            ))
          : null}
        {meterRow ? (
          <Box key="meter" flexWrap="wrap">
            {chip}
            {meterRow}
          </Box>
        ) : (
          <Box key="chip-only">{chip}</Box>
        )}
        {flowRow ? <Box key="flow">{flowRow}</Box> : null}
      </Box>
    )
  })
}
