import type { On } from 'claude-code'
import type { TestBody } from 'claude-code/testing'
import { describe, expect, mock, test } from 'claude-code/testing'

import {
  bar,
  fullnessRole,
  modelName,
  remainingRole,
  resetClock,
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

function answers(on: On, git: Git) {
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
  on('command.register', async () => ({ value: undefined }) as never)
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
