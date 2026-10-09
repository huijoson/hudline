import type { On } from 'claude-code'
import type { TestBody } from 'claude-code/testing'
import { describe, expect, mock, test } from 'claude-code/testing'

import {
  bar,
  fullnessRole,
  modelName,
  remainingRole,
  resetClock,
  resetDate,
  say,
  sumTranscript,
  tokens,
  usd,
} from './format'
import { BRANCH_SPRITE, pack, pixelText, pixelWidth } from './pixel'
import { canCrown, HOP, KING_SHOW_TICKS, kingStage, slimeCells, slimeColumns, slimeText, stage } from './slime'

const SPRITE_ROW = pack(BRANCH_SPRITE)[0]

describe('pixel font', () => {
  test('packs a glyph into three half-block rows', async () => {
    expect(pixelText('a')).toEqual(['▄▀▄', '█▀█', '▀ ▀'])
  })

  test('spaces glyphs one column apart', async () => {
    expect(pixelText('ii')[0]?.length).toBe(pixelWidth(2))
  })
})

describe('format, as hudline writes it', () => {
  test('fills five cells by percent', async () => {
    expect(bar(42)).toBe('▰▰▱▱▱')
    expect(bar(83)).toBe('▰▰▰▰▱')
    expect(bar(0)).toBe('▱▱▱▱▱')
    expect(bar(140)).toBe('▰▰▰▰▰')
  })

  test('shortens token counts', async () => {
    expect(tokens(1_234_567)).toBe('1.2M')
    expect(tokens(21_100)).toBe('21.1k')
    expect(tokens(512)).toBe('512')
  })

  test('writes cost the way /cost does', async () => {
    expect(usd(1.234)).toBe('$1.23')
    expect(usd(0.2304)).toBe('$0.2304')
  })

  test('names the model with its version', async () => {
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(modelName('claude-sonnet-5')).toBe('Sonnet 5')
    expect(modelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(modelName('opus')).toBe('Opus')
    expect(modelName('mystery')).toBe('mystery')
  })

  test('ignores a missing reset time', async () => {
    expect(resetClock(undefined)).toBe(null)
    expect(resetDate('not a date')).toBe(null)
  })

  test('writes a reset as the local clock time or the local date', async () => {
    const at = new Date(2026, 9, 9, 7, 5).toISOString()
    expect(resetClock(at)).toBe('07:05')
    expect(resetDate(at)).toBe('10/09')
  })

  test('reads fullness and remaining on opposite ramps', async () => {
    expect(fullnessRole(42)).toBe('ok')
    expect(fullnessRole(75)).toBe('warn')
    expect(fullnessRole(82)).toBe('danger')
    expect(remainingRole(61)).toBe('ok')
    expect(remainingRole(20)).toBe('warn')
    expect(remainingRole(19)).toBe('danger')
  })

  test('narrates the alarm that stops you soonest', async () => {
    expect(say(88, 6, 12)).toBe('ctx_full')
    expect(say(30, 6, 12)).toBe('five_hour_low')
    expect(say(30, 90, 12)).toBe('weekly_low')
    expect(say(30, 90, 95)).toBe(null)
  })

  test('sums a transcript once per message, thinking as a share of out', async () => {
    const row = (id: string, out: number, thinking: number) =>
      JSON.stringify({
        type: 'assistant',
        message: {
          id,
          usage: {
            input_tokens: 10,
            cache_read_input_tokens: 980,
            cache_creation_input_tokens: 10,
            output_tokens: out,
            output_tokens_details: { thinking_tokens: thinking },
          },
        },
      })
    const raw = [row('a', 100, 20), row('a', 100, 20), row('b', 300, 80), '{"type":"user"}', 'not json'].join('\n')
    expect(sumTranscript(raw)).toEqual({ input: 20, cacheRead: 1960, cacheWrite: 20, out: 400, thinking: 100 })
  })
})

type Git = { name: string; porcelain: string; isRepo: boolean }

function answers(on: On, git: Git, registered: string[] = []) {
  on('process.run', async (_$, e) => ({
    value: {
      exitCode: git.isRepo ? 0 : 128,
      stdout: e.argv.includes('rev-parse') ? `${git.name}\n` : git.porcelain,
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('session.model', async () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', async () => ({
    value: {
      startedAt: 0,
      context: { window: 200_000, tokens: 84_000, percent: 42 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 39 },
        { kind: 'seven_day', percentUsed: 85 },
      ],
      cost: { usd: 1.234 },
    },
  }))
  on('command.register', async (_$, e) => {
    registered.push(e.name)
    return { value: undefined } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
}

function mount($: Parameters<TestBody>[0], surface: 'terminal' | 'desktop', maxRows: number, bodyColumns: number) {
  return $.ui.mount({
    plugin: 'pixel-hud',
    surface,
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns } as never,
  })
}

test('draws the branch in pixel glyphs above the neon meter', async ($, on) => {
  answers(on, { name: 'main', porcelain: ' M src/app.rs\n', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mount($, surface, 10, 120)
    for (const line of pixelText('main')) {
      expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
    }
    expect(await ui.find({ type: 'Text', text: `  ${pixelText('*')[1]}` })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' Opus 5.5 ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' ▰▰▱▱▱ 42%' })).toBeDefined()
    // Quota windows read as remaining: 39% used is 61% left, 85% used is 15% left.
    expect(await ui.find({ type: 'Text', text: ' ▰▰▰▱▱ 61%' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' ▰▱▱▱▱ 15%' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Thy power waneth!' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '$1.23' })).toBeDefined()
    // No token flow before a transcript reading or a response.
    expect(await ui.find({ type: 'Text', text: 'SENT' })).toBeUndefined()
    await ui.unmount()
  }
})

test('reads token flow from the transcript the classic hooks name', async ($, on) => {
  mock.clock(on)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  on('classic.SessionStart', async () => ({}) as never)
  const row = JSON.stringify({
    type: 'assistant',
    message: {
      id: 'm1',
      usage: {
        input_tokens: 4_000,
        cache_read_input_tokens: 1_176_000,
        cache_creation_input_tokens: 20_000,
        output_tokens: 21_100,
        output_tokens_details: { thinking_tokens: 5_064 },
      },
    },
  })
  on('fs.exists', async () => ({ value: true }))
  on('fs.stat', async () => ({ value: { kind: 'file', size: row.length, mtimeMs: 0, isLink: false } }))
  on('fs.read', async () => ({ value: row }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.classic.SessionStart({ source: 'startup', transcript_path: '/t.jsonl' } as never)

  // The read runs beside the hook, never ahead of the prompt: draw until it lands.
  let ui = await mount($, 'terminal', 10, 120)
  for (let i = 0; i < 20 && (await ui.find({ type: 'Text', text: ' 1.2M' })) === undefined; i += 1) {
    await ui.unmount()
    ui = await mount($, 'terminal', 10, 120)
  }
  expect(await ui.find({ type: 'Text', text: ' 1.2M' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 98%' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 21.1k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 24%' })).toBeDefined()
  await ui.unmount()
})

test('shrinks the branch to a chip when the band is narrow or short', async ($, on) => {
  answers(on, { name: 'feature/x', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  for (const [rows, columns] of [[10, 20], [4, 120]] as const) {
    const ui = await mount($, 'terminal', rows, columns)
    expect(await ui.find({ type: 'Text', text: ' ▶ FEATURE/X ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' Opus 5.5 ' })).toBeDefined()
    await ui.unmount()
  }
})

test('shows only the meter outside a git repo', async ($, on) => {
  answers(on, { name: '', porcelain: '', isRepo: false })
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const ui = await mount($, 'terminal', 10, 120)
  expect(await ui.find({ type: 'Text', text: ' Opus 5.5 ' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: SPRITE_ROW })).toBeUndefined()
  await ui.unmount()
})

test('picks up a branch switched outside Claude Code on the next poll', async ($, on) => {
  const clock = mock.clock(on)
  const git = { name: 'main', porcelain: '', isRepo: true }
  answers(on, git)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  git.name = 'dev'
  await clock.advance(3000)

  const ui = await mount($, 'terminal', 10, 120)
  for (const line of pixelText('dev')) {
    expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  }
  await ui.unmount()
})

describe('slime family', () => {
  test('stands on the floor at rest and leaves it mid-hop', async () => {
    const floor = (tick: number) => stage(1, tick)[5]?.some(p => p !== null)
    expect(floor(0)).toBe(true)
    const airborne = HOP.findIndex(p => p.lift === 2)
    expect(floor(airborne)).toBe(false)
  })

  test('at rest every slime sits on the floor', async () => {
    const rest = stage(4, null)
    for (let i = 0; i < 4; i += 1) {
      expect(rest[5]?.slice(i * slimeColumns(1), (i + 1) * slimeColumns(1)).some(p => p !== null)).toBe(true)
    }
    expect(rest[0]?.some(p => p !== null)).toBe(false)
    expect(rest[1]?.some(p => p !== null)).toBe(false)
  })

  test('packs a frame into three rows of Raster cells', async () => {
    const bytes = atob(slimeCells(3, 0)).length
    expect(bytes).toBe(slimeColumns(3) * 3 * 3 * 4)
  })

  test('draws a resting frame as text where there is no Raster', async () => {
    const rows = slimeText(2)
    expect(rows.length).toBe(3)
    expect(rows[2]?.[0]?.text).toBe(' █████ ')
    expect(rows[0]?.[1]?.color).toBe('#fc7460')
  })
})

test('the slimes hop beside the branch on the terminal and rest on desktop', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  const ui = await mount($, 'terminal', 10, 120)
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  expect(raster?.props.columns).toBe(slimeColumns(4))
  expect(raster?.props.rows).toBe(3)
  await clock.advance(140 * 3)
  expect(blits.length).toBeGreaterThan(0)
  expect(new Set(blits).size).toBeGreaterThan(1)
  await ui.unmount()

  const desk = await mount($, 'desktop', 10, 120)
  expect(await desk.find({ type: 'Raster' })).toBeUndefined()
  expect(await desk.find({ type: 'Text', text: ' █████ ' })).toBeDefined()
  await desk.unmount()
})

test('by default the slimes sit still, and the King Slime still plays', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('turn.complete', async () => ({ text: 'done' }))
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 120)
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  expect(raster?.props.cells).toBe(slimeCells(4, null))
  await clock.advance(140 * 10)
  expect(blits.length).toBe(0)

  await $.turn.complete({ answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(140 * (KING_SHOW_TICKS + 2))
  expect(blits.some(goldIn)).toBe(true)
  expect(blits.at(-1)).toBe(slimeCells(4, null))

  blits.length = 0
  await clock.advance(140 * 10)
  expect(blits.length).toBe(0)
  await ui.unmount()
})

test('slimes give up their room before the branch name does', async ($, on) => {
  answers(on, { name: 'feature/slimes', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 70)
  for (const line of pixelText('feature/slimes')) {
    expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  }
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  expect((raster?.props.columns as number | undefined) ?? 0).toBeLessThan(slimeColumns(4))
  await ui.unmount()
})

describe('King Slime', () => {
  const GOLD = 0xfcbc3c
  const hasGold = (pixels: (number | null)[][]) => pixels.some(row => row.includes(GOLD))

  test('needs two slimes of room', async () => {
    expect(canCrown(1)).toBe(false)
    expect(canCrown(2)).toBe(true)
  })

  test('the slimes gather, the king reigns crowned, and they end back home', async () => {
    expect(hasGold(kingStage(4, 0, 0))).toBe(false)
    expect(hasGold(kingStage(4, 20, 20))).toBe(true)
    expect(kingStage(4, KING_SHOW_TICKS - 1, 7)).toEqual(stage(4, 7))
  })
})

function goldIn(cells: string): boolean {
  const bytes = Uint8Array.from(atob(cells), c => c.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer)
  return words.some((w, i) => i % 3 !== 0 && w === 0xfcbc3c)
}

test('a long task crowns a King Slime, and the slimes come back after', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('turn.complete', async () => ({ text: 'done' }))
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 120)

  // A quick answer is no occasion.
  await $.turn.complete({ answer: 'ok', durationMs: 3_000, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(140 * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(false)

  await $.turn.complete({ answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't2', reason: 'answer' })
  blits.length = 0
  await clock.advance(140 * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(true)

  blits.length = 0
  await clock.advance(140 * 10)
  expect(blits.length).toBeGreaterThan(0)
  expect(blits.some(goldIn)).toBe(false)
  await ui.unmount()
})

// The bottom of a turn.step chain: one response with the given usage.
function steps(on: On, usage: () => unknown) {
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: usage() } as never
  })
}

async function step($: Parameters<TestBody>[0], e: { effort?: 'high'; agentId?: string }) {
  const stream = $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 1, ...e })
  for await (const _ of stream) {
    // Drain: the hook adds its counts once the response is read to its end.
  }
  await stream.result
}

// Reflow runs beside the hook that started it: draw until the band shows it.
async function drawUntil($: Parameters<TestBody>[0], text: string, isShown = true) {
  let ui = await mount($, 'terminal', 10, 120)
  for (let i = 0; i < 20 && ((await ui.find({ type: 'Text', text })) !== undefined) !== isShown; i += 1) {
    await ui.unmount()
    ui = await mount($, 'terminal', 10, 120)
  }
  return ui
}

const KING = {
  command: 'slime-king',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

test('/slime-king is registered, and crowns the slimes while they are on stage', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  const registered: string[] = []
  answers(on, { name: 'main', porcelain: '', isRepo: true }, registered)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  expect(registered).toEqual(['slime-king'])

  // Nothing drawn yet: no stage for a king.
  expect((await $.command.run(KING)).text).toBe('No room for a King Slime here: widen the terminal.')

  const ui = await mount($, 'terminal', 10, 120)
  expect((await $.command.run(KING)).text).toBe('The slimes are merging...')
  // Asking again mid-show is not a question of room.
  expect((await $.command.run(KING)).text).toBe('The King Slime already reigns.')
  await clock.advance(140 * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(true)
  // The show over, the next ask crowns again.
  await clock.advance(140 * 2)
  expect((await $.command.run(KING)).text).toBe('The slimes are merging...')
  await ui.unmount()
})

test('/slime-king finds no room when the band only fits the branch', async ($, on) => {
  answers(on, { name: 'feature/slimes', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 30)
  expect(await ui.find({ type: 'Raster', key: 'slimes' })).toBeUndefined()
  expect((await $.command.run(KING)).text).toBe('No room for a King Slime here: widen the terminal.')
  await ui.unmount()
})

test('only the main loop answering after a long task crowns the king', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('turn.complete', async () => ({ text: 'done' }))
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 120)

  const long = { answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't1' } as const
  await $.turn.complete({ ...long, reason: 'answer', agentId: 'sub' } as never)
  await $.turn.complete({ ...long, reason: 'aborted', isAborted: true })
  await $.turn.complete({ ...long, reason: 'error' })
  await clock.advance(140 * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(false)
  await ui.unmount()
})

test('marks a dirty tree on the chip too', async ($, on) => {
  answers(on, { name: 'main', porcelain: ' M a\n', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 4, 120)
  expect(await ui.find({ type: 'Text', text: ' ▶ MAIN ' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' ! ' })).toBeDefined()
  await ui.unmount()
})

test('cuts a branch name too long for the band, after the slimes have left', async ($, on) => {
  answers(on, { name: 'feature/very-long-name', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  // 30 columns: 7 for the sprite and its gap leave room for 6 glyphs.
  const ui = await mount($, 'terminal', 10, 30)
  for (const line of pixelText('feat..')) {
    expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  }
  await ui.unmount()
})

test('gives the band back to the engine while a survey is up', async ($, on) => {
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  on('ui.render', async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>survey</Text>
  })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({
    plugin: 'pixel-hud',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: true, isWorking: false, maxRows: 10, bodyColumns: 120 } as never,
  })
  expect(await ui.find({ type: 'Text', text: 'survey' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' Opus 5.5 ' })).toBeUndefined()
  await ui.unmount()
})

test('a new reading from the engine redraws the meter, reset times and alarm', async ($, on) => {
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  on('session.measure', async (_$, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const resetsAt = new Date(2026, 9, 9, 7, 5).toISOString()
  await $.session.measure({
    context: { window: 200_000, tokens: 176_000, percent: 88 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 30, resetsAt }],
    changed: [],
  } as never)

  const ui = await mount($, 'terminal', 10, 120)
  expect(await ui.find({ type: 'Text', text: ' ▰▰▰▰▱ 88%' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' ▰▰▰▰▱ 70%' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' (07:05)' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Thy context runneth over!' })).toBeDefined()
  // No weekly window and no cost in this reading: both go, separators and all.
  expect(await ui.find({ type: 'Text', text: '7D' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '$1.23' })).toBeUndefined()
  await ui.unmount()
})

test('rereads the branch shortly after /clear', async ($, on) => {
  const clock = mock.clock(on)
  const git = { name: 'main', porcelain: '', isRepo: true }
  answers(on, git)
  on('session.end', async (_$, e) => ({ sessionId: e.sessionId }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  git.name = 'dev'
  await $.session.end({ reason: 'clear', sessionId: 's1' } as never)
  await clock.advance(200)

  const ui = await mount($, 'terminal', 10, 120)
  expect(await ui.find({ type: 'Text', text: pixelText('dev')[0] })).toBeDefined()
  await ui.unmount()
})

test('a transcript not written yet reads as zero counts with no shares', async ($, on) => {
  mock.clock(on)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  on('classic.SessionStart', async () => ({}) as never)
  on('fs.exists', async () => ({ value: false }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.classic.SessionStart({ source: 'startup', transcript_path: '/t.jsonl' } as never)

  const ui = await drawUntil($, 'SENT')
  expect(await ui.find({ type: 'Text', text: 'SENT' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'OUT' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'CR' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'TH' })).toBeUndefined()
  await ui.unmount()
})

test('responses keep the counts live, the effort shows, and a subagent is left out', async ($, on) => {
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  let usage: unknown = {
    model: 'claude-opus-5-5',
    input_tokens: 2_000,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: 500,
  }
  steps(on, () => usage)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  await step($, { effort: 'high' })
  usage = { ...(usage as object), input_tokens: 9_000_000, output_tokens: 9_000_000 }
  await step($, { agentId: 'sub' })

  const ui = await mount($, 'terminal', 10, 120)
  expect(await ui.find({ type: 'Text', text: ':high' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 2.0k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 500' })).toBeDefined()
  // No cache reads yet is a 0% share; thinking is only in the transcript.
  expect(await ui.find({ type: 'Text', text: 'CR' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'TH' })).toBeUndefined()
  await ui.unmount()
})

test('past the read limit the counts carry on, and the thinking share goes', async ($, on) => {
  mock.clock(on)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  on('classic.SessionStart', async () => ({}) as never)
  on('classic.Stop', async () => ({}) as never)
  const row = JSON.stringify({
    type: 'assistant',
    message: {
      id: 'm1',
      usage: {
        input_tokens: 4_000,
        cache_read_input_tokens: 1_176_000,
        cache_creation_input_tokens: 20_000,
        output_tokens: 21_100,
        output_tokens_details: { thinking_tokens: 5_064 },
      },
    },
  })
  let size = row.length
  on('fs.exists', async () => ({ value: true }))
  on('fs.stat', async () => ({ value: { kind: 'file', size, mtimeMs: 0, isLink: false } }))
  on('fs.read', async () => ({ value: row }))
  steps(on, () => ({
    model: 'claude-opus-5-5',
    input_tokens: 0,
    cache_read_input_tokens: 1_000_000,
    cache_creation_input_tokens: 0,
    output_tokens: 8_900,
  }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.classic.SessionStart({ source: 'startup', transcript_path: '/t.jsonl' } as never)
  let ui = await drawUntil($, ' 24%')
  expect(await ui.find({ type: 'Text', text: ' 24%' })).toBeDefined()
  await ui.unmount()

  await step($, {})
  size = 5 * 1024 * 1024
  await $.classic.Stop({ stop_hook_active: false, transcript_path: '/t.jsonl' } as never)
  ui = await drawUntil($, 'TH', false)
  expect(await ui.find({ type: 'Text', text: 'TH' })).toBeUndefined()
  // 1.2M from the last reading plus 1.0M since; 21.1k plus 8.9k out.
  expect(await ui.find({ type: 'Text', text: ' 2.2M' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 30.0k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 99%' })).toBeDefined()
  await ui.unmount()
})
