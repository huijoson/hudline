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
import { BRANCH_SPRITE, pixelText, pixelWidth } from './pixel'
import { QUEST_MIN_COLUMNS, QUEST_STAGE } from './quest'
import { HERO_PALETTE, QUEST_ROWS } from './quest-hero'
import { GAP, METER_ROWS, POLL_MS, TITLE_ROWS } from './register'
import {
  BLINK_EVERY_CYCLES,
  BREATH_SQUISH_TICKS,
  ONION,
  PUDDLE,
  LIQUID,
  canCrown,
  DAMAGE_COOLDOWN_TICKS,
  DAMAGE_TICKS,
  ENCOUNTER,
  ENCOUNTER_ARRIVAL_TICKS,
  ENCOUNTER_FALL_TICKS,
  ENCOUNTER_STAGGER_TICKS,
  FAMILY,
  FRAME_MS,
  HOP_CROUCH_TICKS,
  HOP_FALL_TICKS,
  HOP_HANG_TICKS,
  HOP_LAND_TICKS,
  HOP_LAUNCH_TICKS,
  HOP_REBOUND_TICKS,
  HOP_RISE_TICKS,
  HOP_SETTLE_TICKS,
  HOP_TICKS,
  KING as KING_SPRITE,
  KING_DEFEAT_TICKS,
  KING_DROP,
  KING_DROP_FALL_TICKS,
  KING_DROP_SQUASH_TICKS,
  KING_DROP_TICKS,
  KING_FLASH_TICKS,
  KING_GATHER_TICKS,
  KING_MERGE_TICKS,
  KING_POOF_TICKS,
  KING_REIGN_TICKS,
  KING_SCATTER_AIR_TICKS,
  KING_SCATTER_TICKS,
  KING_SHOW_TICKS,
  KING_WIDTH,
  KINGS,
  kingStage,
  LEAP,
  momentEndTick,
  nextMoment,
  kinFrame,
  pickKing,
  slimeCells,
  slimeColumns,
  slimeText,
  SLIME_WIDTH,
  SLIME_GAP,
  kinHomeX,
  stage,
  SLIME_ROWS,
} from './slime'
import type { KingVariant, Moment } from './slime'

const failure = { tool_name: 'Bash', tool_input: {}, tool_use_id: 'failed-tool', error: 'failed' }
const compaction = { compact_summary: 'The conversation so far, compacted.' }

function shape(pixels: (number | null)[][]): string {
  return JSON.stringify(pixels.map(row => row.map(p => p !== null)))
}

const WHITE = 0xfcfcfc
const GOLD = 0xfcbc3c
const KING_MOUTH = KINGS.king.body.M
const KIN_MOUTH = FAMILY[0]!.palette.M
const BREATH_PERIODS = FAMILY.map(kin => kin.breath.period)
const LONGEST_BREATH_PERIOD = Math.max(...BREATH_PERIODS)
const BLINK_OBSERVATION_TICKS = BLINK_EVERY_CYCLES * LONGEST_BREATH_PERIOD
// Sweep enough start offsets to exercise the staggered hop clocks.
const HOP_START_WINDOW_TICKS = Math.max(...FAMILY.map(kin => kin.hopRests.reduce((sum, rest) => sum + HOP_TICKS + rest, 0)))
const kingLandingTick = KING_SHOW_TICKS - HOP_LAND_TICKS
const PUPIL = 0x0b0a0d
// The blue slime's tip row at rest.
const TIP_ROW = SLIME_ROWS * 2 - ONION.stand.length
// Rows above every crouching kin, and the blue slime's stretching tip row.
const CROUCH_EMPTY_ROWS = SLIME_ROWS * 2 - Math.max(...FAMILY.map(kin => kin.sprites.squash.length))
const STRETCH_TIP_ROW = 1

function slimeFace(pixels: (number | null)[][], i: number) {
  return pixels.map(row => row.slice(kinHomeX(i), kinHomeX(i) + SLIME_WIDTH))
}

// Columns of the pupils that sit between white on both sides, looking straight ahead.
function pupils(row: (number | null)[] = []): number[] {
  return row.flatMap((p, x) => p === PUPIL && row[x - 1] === WHITE && row[x + 1] === WHITE ? [x] : [])
}

// A blink keeps the standing silhouette and shows no white of the eyes.
function isBlinking(face: (number | null)[][], standing: (number | null)[][]): boolean {
  return shape(face) === shape(standing) && !face.flat().includes(WHITE)
}

// Raster cells are row-major [code point, foreground, background] u32s.
function slimeCellFace(cells: string, count: number, i: number) {
  const binary = atob(cells)
  const bytesPerSlime = SLIME_WIDTH * 3 * Uint32Array.BYTES_PER_ELEMENT
  return Array.from({ length: SLIME_ROWS }, (_, row) => {
    const start = (row * slimeColumns(count) + kinHomeX(i)) * 3 * Uint32Array.BYTES_PER_ELEMENT
    return binary.slice(start, start + bytesPerSlime)
  })
}

// Decode the public Raster output back to pixels for clipping assertions.
function slimePixels(cells: string, rows = SLIME_ROWS) {
  const bytes = Uint8Array.from(atob(cells), ch => ch.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer)
  const width = words.length / (rows * 3)
  return Array.from({ length: rows * 2 }, (_, row) =>
    Array.from({ length: width }, (_, col) => {
      const offset = (Math.floor(row / 2) * width + col) * 3
      const glyph = words[offset]
      if (row % 2 === 0) return glyph === 0x2580 ? words[offset + 1] ?? null : null
      if (glyph === 0x2584) return words[offset + 1] ?? null
      return glyph === 0x2580 && words[offset + 2] !== 0x01000000 ? words[offset + 2] ?? null : null
    }),
  )
}

const SPRITE_ROW = '█   █'
// The stage beside the title, with the meter below it.
const FULL_ROWS = SLIME_ROWS + METER_ROWS
const MAIN_TITLE = ['█▄ ▄█ ▄▀▀▀▄  ▀█▀  █   █', '█ █ █ █▄▄▄█   █   █▀▄ █', '█   █ █   █   █   █  ▀█', '▀   ▀ ▀   ▀  ▀▀▀  ▀   ▀']
const DEV_TITLE = ['█▀▀▀▄ █▀▀▀▀ █   █', '█   █ █▄▄▄  █   █', '█   █ █     ▀▄ ▄▀', '▀▀▀▀  ▀▀▀▀▀   ▀  ']
const FEATURE_TITLE = ['█▀▀▀▀ █▀▀▀▀ ▄▀▀▀▄ ▀▀█▀▀ █   █ █▀▀▀▄ █▀▀▀▀     █ ▄▀▀▀▀ █      ▀█▀  █▄ ▄█ █▀▀▀▀ ▄▀▀▀▀', '█▄▄▄  █▄▄▄  █▄▄▄█   █   █   █ █▄▄▄▀ █▄▄▄    ▄▀  ▀▄▄▄  █       █   █ █ █ █▄▄▄  ▀▄▄▄ ', '█     █     █   █   █   █   █ █ ▀▄  █     ▄▀        █ █       █   █   █ █         █', '▀     ▀▀▀▀▀ ▀   ▀   ▀    ▀▀▀  ▀   ▀ ▀▀▀▀▀ ▀     ▀▀▀▀  ▀▀▀▀▀  ▀▀▀  ▀   ▀ ▀▀▀▀▀ ▀▀▀▀ ']
const CLIPPED_TITLE = ['█▀▀▀▀ █▀▀▀▀ ▄▀▀▀▄ ▀▀█▀▀            ', '█▄▄▄  █▄▄▄  █▄▄▄█   █              ', '█     █     █   █   █    ▄▄    ▄▄  ', '▀     ▀▀▀▀▀ ▀   ▀   ▀    ▀▀    ▀▀  ']

describe('pixel font', () => {
  test('packs a glyph into four half-block rows', () => {
    expect(pixelText('a')).toEqual(['▄▀▀▀▄', '█▄▄▄█', '█   █', '▀   ▀'])
  })

  test('spaces glyphs one column apart', () => {
    expect(pixelText('ii')[0]?.length).toBe(pixelWidth(2))
  })
})

describe('format, as hudline writes it', () => {
  test('fills five cells by percent', () => {
    expect(bar(42)).toBe('▰▰▱▱▱')
    expect(bar(83)).toBe('▰▰▰▰▱')
    expect(bar(0)).toBe('▱▱▱▱▱')
    expect(bar(140)).toBe('▰▰▰▰▰')
  })

  test('shortens token counts', () => {
    expect(tokens(1_234_567)).toBe('1.2M')
    expect(tokens(21_100)).toBe('21.1k')
    expect(tokens(512)).toBe('512')
  })

  test('writes cost the way /cost does', () => {
    expect(usd(1.234)).toBe('$1.23')
    expect(usd(0.2304)).toBe('$0.2304')
  })

  test('names the model with its version', () => {
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(modelName('claude-sonnet-5')).toBe('Sonnet 5')
    expect(modelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(modelName('opus')).toBe('Opus')
    expect(modelName('mystery')).toBe('mystery')
  })

  test('ignores a missing reset time', () => {
    expect(resetClock(undefined)).toBe(null)
    expect(resetDate('not a date')).toBe(null)
  })

  test('writes a reset as the local clock time or the local date', () => {
    const at = new Date(2026, 9, 9, 7, 5).toISOString()
    expect(resetClock(at)).toBe('07:05')
    expect(resetDate(at)).toBe('10/09')
  })

  test('reads fullness and remaining on opposite ramps', () => {
    expect(fullnessRole(42)).toBe('ok')
    expect(fullnessRole(75)).toBe('warn')
    expect(fullnessRole(82)).toBe('danger')
    expect(remainingRole(61)).toBe('ok')
    expect(remainingRole(20)).toBe('warn')
    expect(remainingRole(19)).toBe('danger')
  })

  test('narrates the alarm that stops you soonest', () => {
    expect(say(88, 6, 12)).toBe('ctx_full')
    expect(say(30, 6, 12)).toBe('five_hour_low')
    expect(say(30, 90, 12)).toBe('weekly_low')
    expect(say(30, 90, 95)).toBe(null)
  })

  test('sums a transcript once per message, thinking as a share of out', () => {
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

function answers(on: On, git: Git, registered: { name: string; description: string }[] = []) {
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
    registered.push({ name: e.name, description: e.description ?? '' })
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
    const ui = await mount($, surface, FULL_ROWS, 120)
    for (const line of MAIN_TITLE) {
      expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
    }
    expect(await ui.find({ type: 'Text', text: '  ▄███▄' })).toBeDefined()
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

for (const [theme, rows] of [['slimes', SLIME_ROWS], ['quest', QUEST_ROWS]] as const) {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`centres the branch title beside the ${theme} stage on ${surface}`, { options: { stage: theme } }, async ($, on) => {
      mock.clock(on)
      answers(on, { name: 'main', porcelain: ' M app.ts\n', isRepo: true })
      await $.session.start({ cwd: '/repo', surface, isInteractive: true })
      const height = Math.max(rows, TITLE_ROWS)
      const ui = await mount($, surface, height + METER_ROWS, 120)
      const top = Math.floor((height - TITLE_ROWS) / 2)
      const blank = ' '.repeat(BRANCH_SPRITE[0]!.length + GAP.length + pixelWidth('main'.length) + GAP.length + pixelWidth(1))
      const sprite = ['█   █', '█  ▄▀', '█▄▀  ', '▀    ']
      const dirty = ['▄ ▄ ▄', '▄███▄', '▄▀█▀▄', '     ']
      for (let row = 0; row < height; row += 1) {
        const titleRow = row - top
        const prefix = titleRow >= 0 && titleRow < TITLE_ROWS
          ? `${sprite[titleRow]}  ${MAIN_TITLE[titleRow]}  ${dirty[titleRow]}`
          : blank
        expect((await ui.find({ type: 'Box', key: `row-${row}` }))?.text.startsWith(prefix)).toBe(true)
      }
      // Every title row gets a gradient colour, whatever the font's height.
      for (const line of MAIN_TITLE) {
        expect(typeof (await ui.find({ type: 'Text', text: line }))?.props.color).toBe('string')
      }
      expect(await ui.find({ type: 'Box', key: `row-${height}` })).toBeUndefined()
      await ui.unmount()
    })
  }
}

const mainTitleColumns = BRANCH_SPRITE[0]!.length + GAP.length + pixelWidth('main'.length) + GAP.length
const fiveKinColumns = mainTitleColumns + slimeColumns(FAMILY.length)
for (const [columns, count] of [[fiveKinColumns - 3, FAMILY.length - 1], [fiveKinColumns - 1, FAMILY.length - 1], [fiveKinColumns, FAMILY.length]] as const) {
  test(`a clean main branch fits ${count} kin at ${columns} columns`, async ($, on) => {
    mock.clock(on)
    answers(on, { name: 'main', porcelain: '', isRepo: true })
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    const ui = await mount($, 'terminal', FULL_ROWS, columns)
    expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.columns).toBe(slimeColumns(count))
    for (const line of MAIN_TITLE) expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
    await ui.unmount()
  })
}

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
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  for (let i = 0; i < 20 && (await ui.find({ type: 'Text', text: ' 1.2M' })) === undefined; i += 1) {
    await ui.unmount()
    ui = await mount($, 'terminal', FULL_ROWS, 120)
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

  const ui = await mount($, 'terminal', FULL_ROWS, 120)
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

  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  for (const line of DEV_TITLE) {
    expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  }
  await ui.unmount()
})

describe('slime family', () => {
  test('the five kin keep their literal eight-letter palettes', () => {
    expect(Object.fromEntries(FAMILY.map(kin => [kin.name, kin.palette]))).toEqual({
      'slime': { B: 0x3880a8, L: 0x50b0d0, H: 0xf8f8f8, D: 0x206088, E: 0x205068, M: 0xe85820, W: 0xfcfcfc, K: 0x0b0a0d },
      'she-slime': { B: 0xf88820, L: 0xfcb048, H: 0xfcd860, D: 0xd06010, E: 0xb03800, M: 0x5c1c68, W: 0xfcfcfc, K: 0x0b0a0d },
      'metal slime': { B: 0xa8b0c0, L: 0xd0d8e0, H: 0xffffff, D: 0x747c90, E: 0x4c5468, M: 0xe83828, W: 0xfcfcfc, K: 0x0b0a0d },
      'bubble slime': { B: 0x40c818, H: 0xc8f840, D: 0x1c7c10, M: 0x0b0a0d, K: 0x0b0a0d, W: 0xfcfcfc, L: 0x40c818, E: 0x1c7c10 },
      'liquid metal slime': { B: 0x8c9cb8, H: 0xf0f8ff, D: 0x3c4860, M: 0x0b0a0d, K: 0x0b0a0d, W: 0xfcfcfc, L: 0x8c9cb8, E: 0x3c4860 },
    })
  })

  test('kin have two empty columns between their homes and no outer gap', () => {
    expect(SLIME_GAP).toBe(2)
    expect(slimeColumns(0)).toBe(0)
    for (let count = 1; count <= FAMILY.length; count += 1) {
      const rest = stage(count, null)
      expect(slimeColumns(count)).toBe(count * SLIME_WIDTH + (count - 1) * SLIME_GAP)
      expect(rest.every(row => row.length === kinHomeX(count - 1) + SLIME_WIDTH)).toBe(true)
      for (let i = 1; i < count; i += 1) {
        expect(rest.every(row => row.slice(kinHomeX(i) - SLIME_GAP, kinHomeX(i)).every(p => p === null))).toBe(true)
      }
    }
  })

  test('the default Raster breathes at rest', () => {
    const firstSquishTick = FAMILY[0]!.breath.period - BREATH_SQUISH_TICKS
    expect(slimeCells(FAMILY.length, firstSquishTick)).toBe(slimeCells(FAMILY.length, firstSquishTick, null, 'breathe'))
  })

  test('each kin has white cross eyes, centred pupils, a two-row U smile and a shaded lower edge', () => {
    const rest = stage(FAMILY.length, null)
    expect(new Set(FAMILY.map(kin => kin.palette.B)).size).toBe(FAMILY.length)
    for (const [i, kin] of FAMILY.entries()) {
      const face = slimeFace(rest, i)
      const eyeRow = face.findIndex(row => pupils(row).length === 2)
      expect(eyeRow).toBeGreaterThan(0)
      for (const x of pupils(face[eyeRow])) {
        expect(face[eyeRow - 1]?.[x]).toBe(WHITE)
        expect(face[eyeRow + 1]?.[x]).toBe(WHITE)
        for (const y of [eyeRow - 1, eyeRow + 1]) {
          expect(face[y]?.[x - 1]).not.toBe(WHITE)
          expect(face[y]?.[x + 1]).not.toBe(WHITE)
        }
      }
      const [left, right] = pupils(face[eyeRow])
      expect((left ?? 0) + (right ?? 0)).toBe(SLIME_WIDTH - 1)
      // The U's corners sit below the outer eye columns, above its five-pixel base.
      expect(face[eyeRow + 2]?.[left! - 1]).toBe(kin.palette.M)
      expect(face[eyeRow + 2]?.[right! + 1]).toBe(kin.palette.M)
      expect(face[eyeRow + 3]?.slice(left!, right! + 1)).toEqual(Array(5).fill(kin.palette.M))
      const shade = face[floorRow]?.filter(p => p !== null) ?? []
      expect(new Set(shade)).toEqual(new Set([kin.palette.D]))
      for (const shift of [16, 8, 0]) {
        expect((kin.palette.D >> shift) & 255).toBeLessThan((kin.palette.B >> shift) & 255)
      }
    }
  })

  test('breath widens for two ticks and returns to stand at each kin’s own pace', () => {
    const firstCycleTick = 0
    const rest = stage(FAMILY.length, null)
    const poses: string[][] = []
    for (const [i, period] of BREATH_PERIODS.entries()) {
      const frames: string[] = []
      for (let tick = firstCycleTick; tick <= period; tick += 1) {
        const pixels = stage(FAMILY.length, tick, 'breathe')
        const face = slimeFace(pixels, i)
        expect(face[floorRow]?.some(p => p !== null)).toBe(true)
        frames.push(JSON.stringify(face))
      }
      const standing = JSON.stringify(slimeFace(rest, i))
      expect(frames.filter(frame => frame !== standing).length).toBe(BREATH_SQUISH_TICKS)
      expect(frames.at(-1)).toBe(standing)
      poses.push(frames.map(frame => frame === standing ? 'stand' : 'wide'))
    }
    for (let left = 0; left < poses.length; left += 1) {
      for (let right = left + 1; right < poses.length; right += 1) {
        const sharedTicks = Math.min(BREATH_PERIODS[left] ?? 0, BREATH_PERIODS[right] ?? 0)
        expect(poses[left]?.slice(0, sharedTicks)).not.toEqual(poses[right]?.slice(0, sharedTicks))
      }
    }
  })

  test('each kin blinks once every third breath at its own offset', () => {
    const blinkTicks: number[] = []
    for (const [i, period] of BREATH_PERIODS.entries()) {
      const blinkCycleTicks = period * BLINK_EVERY_CYCLES
      const blinks: number[] = []
      const standing = slimeFace(stage(FAMILY.length, null), i)
      for (let tick = 0; tick < blinkCycleTicks; tick += 1) {
        if (isBlinking(slimeFace(stage(FAMILY.length, tick, 'breathe'), i), standing)) blinks.push(tick)
      }
      expect(blinks.length).toBe(1)
      const blinkTick = blinks[0] ?? 0
      expect(blinkTick).toBe(period * (BLINK_EVERY_CYCLES - 1) + FAMILY[i]!.breath.blink)
      blinkTicks.push(blinkTick)
      const nextBlink = slimeFace(stage(FAMILY.length, blinkTick + blinkCycleTicks, 'breathe'), i)
      const firstBlink = slimeFace(stage(FAMILY.length, blinkTick, 'breathe'), i)
      expect(nextBlink).toEqual(firstBlink)
    }
    expect(new Set(blinkTicks).size).toBe(FAMILY.length)
  })

  test('the King holds each kin at rest until its next grounded hop start', () => {
    const silhouette = (pixels: (number | null)[][]) => pixels.map(row => row.map(p => p !== null))
    for (const count of [2, 3, 4, 5]) {
      const standing = stage(count, null)
      const crouching = kingStage(count, kingLandingTick, null, 'breathe', 'king')
      for (let startTick = 0; startTick < HOP_START_WINDOW_TICKS; startTick += 1) {
        const king: Moment = { kind: 'king', startTick, variant: 'king' }
        const endpoint = startTick + KING_SHOW_TICKS
        expect(slimeCells(count, endpoint, king, 'hop')).toBe(slimeCells(count, 0, null, 'still'))
        const joined = Array<boolean>(count).fill(false)
        let allJoinedTick = endpoint + HOP_TICKS
        for (let tick = endpoint + 1; tick <= endpoint + HOP_TICKS; tick += 1) {
          const global = stage(count, tick, 'hop')
          const previous = stage(count, tick - 1, 'hop')
          const actual = kingStage(count, tick - startTick, tick, 'hop', 'king')
          const cells = slimeCells(count, tick, king, 'hop')
          const globalCells = slimeCells(count, tick, null, 'hop')
          const standingCells = slimeCells(count, 0, null, 'still')
          for (let i = 0; i < count; i += 1) {
            const shape = JSON.stringify(silhouette(slimeFace(global, i)))
            const prior = JSON.stringify(silhouette(slimeFace(previous, i)))
            const stand = JSON.stringify(silhouette(slimeFace(standing, i)))
            const crouch = JSON.stringify(silhouette(slimeFace(crouching, i)))
            // Rest follows a standing settle/rest; Crouch begins after Rest.
            if ((shape === stand || shape === crouch) && prior === stand) joined[i] = true
            expect(slimeFace(actual, i)).toEqual(slimeFace(joined[i] ? global : standing, i))
            expect(slimeCellFace(cells, count, i)).toEqual(slimeCellFace(joined[i] ? globalCells : standingCells, count, i))
          }
          if (joined.every(Boolean)) allJoinedTick = Math.min(allJoinedTick, tick)
        }
        expect(momentEndTick(king, count, 'hop')).toBe(allJoinedTick)
        expect(joined.every(Boolean)).toBe(true)
        expect(slimeCells(count, endpoint + HOP_TICKS, king, 'hop')).toBe(slimeCells(count, endpoint + HOP_TICKS, null, 'hop'))
        for (const rest of ['breathe', 'still'] as const) {
          expect(slimeCells(count, endpoint, king, rest)).toBe(slimeCells(count, 0, null, 'still'))
          expect(slimeCells(count, endpoint + 1, king, rest)).toBe(slimeCells(count, endpoint + 1, null, rest))
        }
      }
    }
  })

  test('a hop crouches, stretches, hangs, lands and rebounds before resting', () => {
    const firstCrouchTick = 0
    const launchTick = HOP_CROUCH_TICKS
    const riseTick = HOP_CROUCH_TICKS + HOP_LAUNCH_TICKS
    const fallTick = riseTick + HOP_RISE_TICKS + HOP_HANG_TICKS
    const reboundTick = fallTick + HOP_FALL_TICKS + HOP_LAND_TICKS
    const settleTick = HOP_TICKS - HOP_SETTLE_TICKS
    const nextCrouchTick = HOP_TICKS + 6
    const runs: number[] = []
    let previous = ''
    for (let tick = firstCrouchTick; tick < nextCrouchTick; tick += 1) {
      const cells = slimeCells(1, tick, null, 'hop')
      if (cells === previous) runs[runs.length - 1] = (runs[runs.length - 1] ?? 0) + 1
      else runs.push(1)
      previous = cells
    }
    // Crouch, launch, rise/hang, fall, land, rebound, settle/rest.
    expect(runs).toEqual([2, 1, 3, 1, 2, 1, nextCrouchTick - settleTick])
    const stretch = stage(1, launchTick, 'hop')
    expect(stretch[STRETCH_TIP_ROW]?.filter(p => p !== null)).toEqual([FAMILY[0]?.palette.D])
    expect(stretch[floorRow]?.filter(p => p !== null).length).toBe(5)
    expect(stage(1, fallTick, 'hop')).toEqual(stretch)
    expect(stage(1, reboundTick, 'hop')).toEqual(stretch)
    expect(stage(1, riseTick, 'hop')[floorRow]?.every(p => p === null)).toBe(true)
    expect(stage(1, settleTick, 'hop')).toEqual(stage(1, null))
  })

  test('each kin blinks for one grounded tick strictly inside every third hop rest', () => {
    const blinkOffsets: number[] = []
    for (const [i, kin] of FAMILY.entries()) {
      const rests = kin.hopRests
      const standing = slimeFace(stage(FAMILY.length, null), i)
      let crouchTick = -kin.phase
      for (let cycle = 0; cycle < BLINK_EVERY_CYCLES * 2; cycle += 1) {
        const restTicks = rests[cycle % rests.length] ?? 0
        const restStart = crouchTick + HOP_TICKS
        const nextCrouch = restStart + restTicks
        const blinks: number[] = []
        for (let tick = Math.max(0, crouchTick); tick < nextCrouch; tick += 1) {
          const face = slimeFace(stage(FAMILY.length, tick, 'hop'), i)
          if (tick < restStart) expect(isBlinking(face, standing)).toBe(false)
          else if (isBlinking(face, standing)) blinks.push(tick)
          else expect(face).toEqual(standing)
        }
        if (cycle % BLINK_EVERY_CYCLES === BLINK_EVERY_CYCLES - 1) {
          expect(blinks.length).toBe(1)
          const blinkTick = blinks[0] ?? 0
          expect(blinkTick).toBeGreaterThan(restStart)
          expect(blinkTick).toBeLessThan(nextCrouch - 1)
          // Even the shortest six-tick rest has standing ticks on both sides.
          expect(blinkTick - restStart).toBeLessThan(restTicks - 1)
          expect(slimeFace(stage(FAMILY.length, blinkTick - 1, 'hop'), i)).toEqual(standing)
          expect(slimeFace(stage(FAMILY.length, blinkTick + 1, 'hop'), i)).toEqual(standing)
          if (cycle < BLINK_EVERY_CYCLES) blinkOffsets.push(blinkTick - restStart)
        } else expect(blinks).toEqual([])
        crouchTick = nextCrouch
      }
    }
    expect(new Set(blinkOffsets).size).toBe(FAMILY.length)
  })

  test('hop rests vary by kin and cycle, within six to fourteen ticks, deterministically', () => {
    const observationTicks = HOP_START_WINDOW_TICKS * 3
    const movingTicks = HOP_TICKS
    const launchOffset = HOP_CROUCH_TICKS
    const riseOffset = HOP_CROUCH_TICKS + HOP_LAUNCH_TICKS
    const minRestTicks = Math.min(...FAMILY.flatMap(kin => [...kin.hopRests]))
    const maxRestTicks = Math.max(...FAMILY.flatMap(kin => [...kin.hopRests]))
    const restLengths: number[][] = []
    for (let i = 0; i < FAMILY.length; i += 1) {
      const crouches: number[] = []
      for (let tick = 0; tick < observationTicks; tick += 1) {
        const face = slimeFace(stage(FAMILY.length, tick, 'hop'), i)
        const launch = slimeFace(stage(FAMILY.length, tick + launchOffset, 'hop'), i)
        const rise = slimeFace(stage(FAMILY.length, tick + riseOffset, 'hop'), i)
        const isCrouching = face.slice(0, CROUCH_EMPTY_ROWS).flat().every(p => p === null)
        const stretchTop = SLIME_ROWS * 2 - FAMILY[i]!.sprites.stretch.length
        const isLaunching = launch[stretchTop]?.some(p => p !== null) && launch[floorRow]?.some(p => p !== null)
        const isRising = rise[floorRow]?.every(p => p === null)
        if (isCrouching && isLaunching && isRising) crouches.push(tick)
      }
      const rests = crouches.slice(1).map((tick, cycle) => tick - (crouches[cycle] ?? 0) - movingTicks)
      const kin = FAMILY[i]!
      let firstCycle = 0
      let firstCrouch = -kin.phase
      while (firstCrouch < 0) {
        firstCrouch += HOP_TICKS + kin.hopRests[firstCycle % kin.hopRests.length]!
        firstCycle += 1
      }
      expect(rests.slice(0, kin.hopRests.length)).toEqual(kin.hopRests.map((_, cycle) => kin.hopRests[(firstCycle + cycle) % kin.hopRests.length]))
      expect(rests.length).toBeGreaterThan(2)
      expect(new Set(rests).size).toBeGreaterThan(1)
      for (const rest of rests) {
        expect(rest >= minRestTicks && rest <= maxRestTicks).toBe(true)
      }
      for (const crouchTick of crouches) {
        const settleTick = crouchTick + movingTicks - 1
        const restTick = crouchTick + movingTicks
        expect(slimeFace(stage(FAMILY.length, settleTick, 'hop'), i)).toEqual(slimeFace(stage(FAMILY.length, null), i))
        expect(slimeFace(stage(FAMILY.length, restTick, 'hop'), i)).toEqual(slimeFace(stage(FAMILY.length, null), i))
      }
      restLengths.push(rests)
    }
    for (let left = 0; left < restLengths.length; left += 1) {
      for (let right = left + 1; right < restLengths.length; right += 1) {
        expect(restLengths[left]).not.toEqual(restLengths[right])
      }
    }
  })

  test('the pointed tip stays visible throughout a hop in the sixteen-pixel stage', () => {
    let airborneTicks = 0
    for (let tick = 0; tick < HOP_TICKS; tick += 1) {
      const pixels = stage(1, tick, 'hop')
      const top = pixels.find(row => row.some(p => p !== null))
      if (!pixels[floorRow]?.some(p => p !== null)) {
        airborneTicks += 1
        expect(pixels[0]).toBe(top)
        expect(top?.filter(p => p !== null)).toEqual([FAMILY[0]!.palette.D])
        expect(pixels.some(row => row.filter(p => p === KIN_MOUTH).length === 5)).toBe(true)
      }
    }
    expect(airborneTicks).toBeGreaterThan(0)
  })

  test('stands on the floor at rest and leaves it mid-hop', () => {
    const floor = (tick: number) => stage(1, tick, 'hop')[floorRow]?.some(p => p !== null)
    expect(floor(0)).toBe(true)
    expect(Array.from({ length: HOP_TICKS }, (_, tick) => floor(tick))).toContain(false)
    expect(floor(HOP_TICKS)).toBe(true)
    // The top of the hop stays airborne; its moving phase ends grounded.
    const hangTick = 4
    expect(floor(hangTick)).toBe(false)
  })

  test('at rest every slime sits on the floor', () => {
    const rest = stage(FAMILY.length, null)
    for (let i = 0; i < FAMILY.length; i += 1) {
      expect(slimeFace(rest, i)[floorRow]?.some(p => p !== null)).toBe(true)
    }
    expect(rest.slice(0, TIP_ROW).flat().some(p => p !== null)).toBe(false)
  })

  test('the crouch keeps the cross eyes and U smile in a lower silhouette', () => {
    const crouchTick = 0
    const crouch = stage(1, crouchTick, 'hop')
    expect(crouch.slice(0, CROUCH_EMPTY_ROWS).flat().every(p => p === null)).toBe(true)
    expect(crouch.flat().filter(p => p === WHITE).length).toBe(8)
    expect(crouch.flat()).toContain(KIN_MOUTH)
  })

  test('packs a frame into eight rows of Raster cells', () => {
    const bytes = atob(slimeCells(3, 0)).length
    expect(bytes).toBe(slimeColumns(3) * SLIME_ROWS * 3 * 4)
  })

  test('draws a resting frame as text where there is no Raster', () => {
    const rows = slimeText(FAMILY.length)
    expect(rows.length).toBe(SLIME_ROWS)
    for (let i = 0; i < FAMILY.length; i += 1) {
      const silhouettes = [
        [
          '           ',
          '     ▄     ',
          '     █     ',
          '   ▄███▄   ',
          ' ▄███████▄ ',
          '███████████',
          '███████████',
          ' ▀███████▀ ',
        ],
        [
          '           ',
          '           ',
          '           ',
          ' ▄       ▄ ',
          '   ▄▄▄█▄   ',
          '███████████',
          '███████████',
          '███████████',
        ],
        [
          '           ',
          '           ',
          '           ',
          '           ',
          '   ▄▄██▄   ',
          '███████████',
          '███████████',
          '███████████',
        ],
      ]
      const silhouette = new Map([[ONION, silhouettes[0]], [PUDDLE, silhouettes[1]], [LIQUID, silhouettes[2]]]).get(FAMILY[i]!.sprites)!
      const gap = i + 1 < FAMILY.length ? ' '.repeat(SLIME_GAP) : ''
      expect(rows.map(row => row[i]?.text)).toEqual(silhouette.map(line => line + gap))
    }
    expect(rows.map(row => row.map(part => part.text).join('').length)).toEqual(Array(SLIME_ROWS).fill(slimeColumns(FAMILY.length)))
    expect(rows[0]?.map(part => part.color)).toEqual(FAMILY.map(kin => `#${kin.palette.B.toString(16).padStart(6, '0')}`))
  })
})

for (const slimesIdle of [true, false]) {
  test(`the slimes hop on terminal and rest on desktop with slimesIdle=${slimesIdle}`, { options: { slimesHop: true, slimesIdle } }, async ($, on) => {
    const clock = mock.clock(on)
    const blits: string[] = []
    on('ui.blit', async (_$, e) => {
      if ('cells' in e) blits.push(e.cells)
      return { value: {} }
    })
    answers(on, { name: 'main', porcelain: '', isRepo: true })
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

    const ui = await mount($, 'terminal', FULL_ROWS, 120)
    const raster = await ui.find({ type: 'Raster', key: 'slimes' })
    expect(raster?.props.columns).toBe(slimeColumns(FAMILY.length))
    expect(raster?.props.rows).toBe(SLIME_ROWS)
    const hopAirborneTick = 3
    const encounter: Moment = { kind: 'encounter', startTick: 0 }
    await clock.advance(FRAME_MS * hopAirborneTick)
    expect(blits.at(-1)).toBe(slimeCells(FAMILY.length, hopAirborneTick, encounter, 'hop'))
    expect(blits.length).toBeGreaterThan(0)
    expect(new Set(blits).size).toBeGreaterThan(1)
    await ui.unmount()

    const desk = await mount($, 'desktop', FULL_ROWS, 120)
    expect(await desk.find({ type: 'Raster' })).toBeUndefined()
    expect(await desk.find({ type: 'Text', text: '███████' })).toBeDefined()
    await desk.unmount()
  })
}

test('the encounter waits for a stage, plays once, and expires before resting hops resume', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const beforeSeatingTicks = 12
  await clock.advance(FRAME_MS * beforeSeatingTicks)
  const desktop = await mount($, 'desktop', FULL_ROWS, 120)
  await desktop.unmount()
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  const encounter: Moment = { kind: 'encounter', startTick: beforeSeatingTicks }
  const count = FAMILY.length
  const initial = (await ui.find({ type: 'Raster', key: 'slimes' }))?.props.cells
  expect(initial).toBe(slimeCells(count, beforeSeatingTicks, encounter, 'hop'))
  expect(initial).not.toBe(slimeCells(count, beforeSeatingTicks, null, 'hop'))
  const endpointTick = momentEndTick(encounter, count, 'still') - 1
  const expiredTick = momentEndTick(encounter, count, 'hop')
  expect(Number.isFinite(expiredTick)).toBe(true)
  for (let tick = beforeSeatingTicks + 1; tick <= expiredTick + HOP_TICKS; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, encounter, 'hop'))
    if (tick === endpointTick) {
      expect(slimeCellFace(blits.at(-1) as string, count, count - 1)).toEqual(slimeCellFace(slimeCells(count, 0, null, 'still'), count, count - 1))
    }
  }
  const remountTick = expiredTick + HOP_TICKS
  await ui.unmount()
  ui = await mount($, 'terminal', FULL_ROWS, 120)
  expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.cells).toBe(slimeCells(count, remountTick, null, 'hop'))
  await ui.unmount()
})

test('a failure without a seated stage spends neither cooldown nor target', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const tick = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'still')
  await clock.advance(FRAME_MS * tick)
  await ui.unmount()
  const desktop = await mount($, 'desktop', FULL_ROWS, 120)
  const beforeFailure = blits.length
  await $.classic.PostToolUseFailure(failure as never)
  expect(blits.length).toBe(beforeFailure)
  await desktop.unmount()
  ui = await mount($, 'terminal', FULL_ROWS, 120)
  await $.classic.PostToolUseFailure(failure as never)
  const damage: Moment = { kind: 'damage', startTick: tick, target: 0 }
  expect(blits.at(-1)).toBe(slimeCells(count, tick, damage, 'still'))
  await ui.unmount()
})

test('session.start resets the damage cooldown and target rotation', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  const count = FAMILY.length
  const encounterTicks = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'still')
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  await clock.advance(FRAME_MS * encounterTicks)
  await $.classic.PostToolUseFailure(failure as never)
  expect(blits.at(-1)).toBe(slimeCells(count, encounterTicks, { kind: 'damage', startTick: encounterTicks, target: 0 }, 'still'))
  await ui.unmount()
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  ui = await mount($, 'terminal', FULL_ROWS, 120)
  await clock.advance(FRAME_MS * encounterTicks)
  // The new encounter ends before the previous session's cooldown would.
  const tick = encounterTicks * 2
  await $.classic.PostToolUseFailure(failure as never)
  expect(blits.at(-1)).toBe(slimeCells(count, tick, { kind: 'damage', startTick: tick, target: 0 }, 'still'))
  await ui.unmount()
})

test('the next damage target stays in range after the terminal seats fewer kin', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.columns).toBe(slimeColumns(count))
  let tick = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'still')
  await clock.advance(FRAME_MS * tick)
  // Leave the next target at kin 3, outside the narrower family's range.
  for (const target of [0, 1, 2]) {
    await $.classic.PostToolUseFailure(failure as never)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, { kind: 'damage', startTick: tick, target }, 'still'))
    await clock.advance(FRAME_MS * DAMAGE_COOLDOWN_TICKS)
    tick += DAMAGE_COOLDOWN_TICKS
  }
  await ui.unmount()
  const narrowerCount = 2
  const narrowerColumns = (BRANCH_SPRITE[0] ?? '').length + 2 + pixelWidth('main'.length) + 2 + slimeColumns(narrowerCount)
  ui = await mount($, 'terminal', FULL_ROWS, narrowerColumns)
  expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.columns).toBe(slimeColumns(narrowerCount))
  await $.classic.PostToolUseFailure(failure as never)
  const damage: Moment = { kind: 'damage', startTick: tick, target: 1 }
  expect(blits.at(-1)).toBe(slimeCells(narrowerCount, tick, damage, 'still'))
  await ui.unmount()
})

test('failures flicker rotating kin after encounter expiry, with interrupt and cooldown filtering', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const encounterEnds = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'still')
  await clock.advance(FRAME_MS * encounterEnds)
  let tick = encounterEnds
  for (let failureIndex = 0; failureIndex <= count; failureIndex += 1) {
    const beforeInterrupt = blits.length
    await $.classic.PostToolUseFailure({ ...failure, is_interrupt: true } as never)
    expect(blits.length).toBe(beforeInterrupt)
    await $.classic.PostToolUseFailure(failure as never)
    const damage: Moment = { kind: 'damage', startTick: tick, target: failureIndex % count }
    expect(blits.at(-1)).toBe(slimeCells(count, tick, damage, 'still'))
    for (let frame = 1; frame <= DAMAGE_TICKS + 1; frame += 1) {
      await clock.advance(FRAME_MS)
      expect(blits.at(-1)).toBe(slimeCells(count, tick + frame, damage, 'still'))
    }
    const beforeCooldown = blits.length
    const justBeforeCooldown = DAMAGE_COOLDOWN_TICKS - 1
    await clock.advance(FRAME_MS * (justBeforeCooldown - DAMAGE_TICKS - 1))
    await $.classic.PostToolUseFailure(failure as never)
    await clock.advance(FRAME_MS)
    expect(blits.length).toBe(beforeCooldown)
    tick += DAMAGE_COOLDOWN_TICKS
  }
  await ui.unmount()
})

test('damage yields to encounter and King without consuming a target or cooldown', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const encounter: Moment = { kind: 'encounter', startTick: 0 }
  const encounterEnds = momentEndTick(encounter, count, 'still')
  const lastEncounterTick = encounterEnds - 1
  await clock.advance(FRAME_MS * lastEncounterTick)
  const beforeFailure = blits.length
  await $.classic.PostToolUseFailure(failure as never)
  expect(blits.length).toBe(beforeFailure)
  await clock.advance(FRAME_MS)
  await $.classic.PostToolUseFailure(failure as never)
  const firstDamage: Moment = { kind: 'damage', startTick: encounterEnds, target: 0 }
  expect(blits.at(-1)).toBe(slimeCells(count, encounterEnds, firstDamage, 'still'))
  const king: Moment = { kind: 'king', startTick: encounterEnds, variant: await crownKing($) }
  const kingEnds = momentEndTick(king, count, 'still')
  const lastKingTick = kingEnds - 1
  await clock.advance(FRAME_MS * (lastKingTick - encounterEnds))
  const beforeKingFailure = blits.length
  await $.classic.PostToolUseFailure(failure as never)
  expect(blits.length).toBe(beforeKingFailure)
  await clock.advance(FRAME_MS)
  await $.classic.PostToolUseFailure(failure as never)
  const nextDamage: Moment = { kind: 'damage', startTick: kingEnds, target: 1 }
  expect(blits.at(-1)).toBe(slimeCells(count, kingEnds, nextDamage, 'still'))
  await ui.unmount()
})

test('damage returns to grounded hopping, expires, and admits the next failure', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const encounterEnds = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'hop')
  await clock.advance(FRAME_MS * encounterEnds)
  await $.classic.PostToolUseFailure(failure as never)
  const damage: Moment = { kind: 'damage', startTick: encounterEnds, target: 0 }
  const endpointTick = encounterEnds + DAMAGE_TICKS
  const expiryTick = momentEndTick(damage, count, 'hop')
  expect(Number.isFinite(expiryTick)).toBe(true)
  const nextFailureTick = encounterEnds + DAMAGE_COOLDOWN_TICKS
  for (let tick = encounterEnds + 1; tick <= nextFailureTick; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, damage, 'hop'))
    if (tick === endpointTick) expect(blits.at(-1)).toBe(slimeCells(count, tick, null, 'still'))
    if (tick >= expiryTick) expect(blits.at(-1)).toBe(slimeCells(count, tick, null, 'hop'))
  }
  await $.classic.PostToolUseFailure(failure as never)
  const nextDamage: Moment = { kind: 'damage', startTick: nextFailureTick, target: 1 }
  expect(blits.at(-1)).toBe(slimeCells(count, nextFailureTick, nextDamage, 'hop'))
  await ui.unmount()
})

test('compaction levels up in gold over the encounter and damage, but not over the King', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  on('classic.PostCompact', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const midEncounterTick = ENCOUNTER_STAGGER_TICKS
  await clock.advance(FRAME_MS * midEncounterTick)
  expect(blits.some(goldIn)).toBe(false)
  await $.classic.PostCompact({ ...compaction, trigger: 'auto' } as never)
  const levelUp: Moment = { kind: 'level-up', startTick: midEncounterTick }
  expect(blits.at(-1)).toBe(slimeCells(count, midEncounterTick, levelUp, 'still'))
  const levelUpEnds = momentEndTick(levelUp, count, 'still')
  for (let tick = midEncounterTick + 1; tick <= levelUpEnds; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, levelUp, 'still'))
  }
  expect(blits.some(goldIn)).toBe(true)
  expect(blits.at(-1)).toBe(slimeCells(count, 0, null, 'still'))

  await $.classic.PostToolUseFailure(failure as never)
  const damage: Moment = { kind: 'damage', startTick: levelUpEnds, target: 0 }
  expect(blits.at(-1)).toBe(slimeCells(count, levelUpEnds, damage, 'still'))
  await clock.advance(FRAME_MS)
  const midDamageTick = levelUpEnds + 1
  await $.classic.PostCompact({ ...compaction, trigger: 'manual' } as never)
  const manualLevelUp: Moment = { kind: 'level-up', startTick: midDamageTick }
  expect(blits.at(-1)).toBe(slimeCells(count, midDamageTick, manualLevelUp, 'still'))

  const king: Moment = { kind: 'king', startTick: midDamageTick, variant: await crownKing($) }
  const beforeCompaction = blits.length
  await $.classic.PostCompact({ ...compaction, trigger: 'auto' } as never)
  expect(blits.length).toBe(beforeCompaction)
  const kingEnds = momentEndTick(king, count, 'still')
  for (let tick = midDamageTick + 1; tick <= kingEnds; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, king, 'still'))
  }
  await ui.unmount()
})

test('a second compaction during a level-up is ignored, and the first ends on time', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostCompact', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const encounterEnds = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'still')
  await clock.advance(FRAME_MS * encounterEnds)
  await $.classic.PostCompact({ ...compaction, trigger: 'auto' } as never)
  const levelUp: Moment = { kind: 'level-up', startTick: encounterEnds }
  const secondCompactionTick = encounterEnds + hopLaunch
  await clock.advance(FRAME_MS * hopLaunch)
  const beforeSecond = blits.length
  await $.classic.PostCompact({ ...compaction, trigger: 'manual' } as never)
  expect(blits.length).toBe(beforeSecond)
  expect(blits.at(-1)).toBe(slimeCells(count, secondCompactionTick, levelUp, 'still'))
  const levelUpEnds = momentEndTick(levelUp, count, 'still')
  for (let tick = secondCompactionTick + 1; tick <= levelUpEnds; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, levelUp, 'still'))
  }
  expect(blits.at(-1)).toBe(slimeCells(count, 0, null, 'still'))
  await ui.unmount()
})

test('level-up returns to grounded hopping, expires, and admits lower-priority damage', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  on('classic.PostCompact', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const count = FAMILY.length
  const encounterEnds = momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'hop')
  await clock.advance(FRAME_MS * encounterEnds)
  await $.classic.PostCompact({ ...compaction, trigger: 'auto' } as never)
  const levelUp: Moment = { kind: 'level-up', startTick: encounterEnds }
  const settleTick = encounterEnds + HOP_TICKS - HOP_SETTLE_TICKS
  const expiryTick = momentEndTick(levelUp, count, 'hop')
  expect(Number.isFinite(expiryTick)).toBe(true)
  for (let tick = encounterEnds + 1; tick <= expiryTick + HOP_TICKS; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(slimeCells(count, tick, levelUp, 'hop'))
    if (tick === settleTick) expect(blits.at(-1)).toBe(slimeCells(count, tick, null, 'still'))
    if (tick >= expiryTick) expect(blits.at(-1)).toBe(slimeCells(count, tick, null, 'hop'))
  }
  const failureTick = expiryTick + HOP_TICKS
  await $.classic.PostToolUseFailure(failure as never)
  const damage: Moment = { kind: 'damage', startTick: failureTick, target: 0 }
  expect(blits.at(-1)).toBe(slimeCells(count, failureTick, damage, 'hop'))
  await ui.unmount()
})

test('clear, polls and remounts do not replay an encounter displaced by the King', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('session.end', async (_$, e) => ({ sessionId: e.sessionId }))
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  await $.command.run(KING)
  const kingFinishedTick = KING_SHOW_TICKS + 1
  await clock.advance(FRAME_MS * kingFinishedTick)
  expect(blits.some(goldIn)).toBe(true)
  expect(blits.at(-1)).toBe(slimeCells(FAMILY.length, 0, null, 'still'))
  blits.length = 0
  await $.session.end({ reason: 'clear', sessionId: 's1' } as never)
  const pollWindowMs = POLL_MS * 2
  await clock.advance(pollWindowMs)
  await ui.unmount()
  ui = await mount($, 'terminal', FULL_ROWS, 120)
  expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.cells).toBe(slimeCells(FAMILY.length, 0, null, 'still'))
  expect(blits.length).toBe(0)
  await ui.unmount()
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  ui = await mount($, 'terminal', FULL_ROWS, 120)
  expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.cells).not.toBe(slimeCells(FAMILY.length, 0, null, 'still'))
  await ui.unmount()
})

test('each blit changes the seated cells, during encounter, hops and the King show', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const cells: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) cells.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  cells.push(raster?.props.cells as string)
  await clock.advance(FRAME_MS)
  expect(cells.length).toBeGreaterThan(1)
  await clock.advance(FRAME_MS * 20)
  await $.command.run(KING)
  await clock.advance(FRAME_MS * (KING_SHOW_TICKS + 2))
  expect(cells.some(goldIn)).toBe(true)
  for (let i = 1; i < cells.length; i += 1) expect(cells[i]).not.toBe(cells[i - 1])
  await ui.unmount()
})

test('a denied blit unseats the stage until a render seats it again', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: { deny: 'The band is gone' } }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  await clock.advance(FRAME_MS * 10)
  expect(blits.length).toBe(1)
  expect((await $.command.run(KING)).text).toBe('But there was no room for a King Slime! Widen the terminal.')
  await ui.unmount()

  const remount = await mount($, 'terminal', FULL_ROWS, 120)
  const raster = await remount.find({ type: 'Raster', key: 'slimes' })
  await clock.advance(FRAME_MS * 10)
  expect(blits.length).toBe(2)
  expect(blits[1]).not.toBe(raster?.props.cells)
  await remount.unmount()
})

test('by default the slimes breathe without repainting unchanged cells', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const encounterEnds = momentEndTick({ kind: 'encounter', startTick: 0 }, FAMILY.length, 'breathe')
  await clock.advance(FRAME_MS * encounterEnds)
  blits.length = 0
  const standing = slimeCells(FAMILY.length, encounterEnds)
  const firstBreathStarts = 34
  const firstBreathEnds = 36
  await clock.advance(FRAME_MS * (firstBreathStarts - 1 - encounterEnds))
  expect(blits.length).toBe(0)
  await clock.advance(FRAME_MS)
  expect(blits.length).toBe(1)
  expect(blits[0]).not.toBe(standing)
  await clock.advance(FRAME_MS)
  expect(blits.length).toBe(1)
  await clock.advance(FRAME_MS * (firstBreathEnds - firstBreathStarts - 1))
  expect(blits.length).toBe(2)
  expect(blits.at(-1)).toBe(standing)
  await ui.unmount()
})

test('with breath off the slimes sit still, and the King Slime still plays', { options: { slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('turn.complete', async () => ({ text: 'done' }))
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const encounterEnds = momentEndTick({ kind: 'encounter', startTick: 0 }, FAMILY.length, 'still')
  await clock.advance(FRAME_MS * encounterEnds)
  expect(blits.at(-1)).toBe(slimeCells(FAMILY.length, 0, null, 'still'))
  blits.length = 0
  const blinkCycleTicks = BLINK_OBSERVATION_TICKS
  await clock.advance(FRAME_MS * blinkCycleTicks)
  expect(blits.length).toBe(0)

  await $.turn.complete({ answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(FRAME_MS * (KING_SHOW_TICKS + 2))
  expect(blits.some(goldIn)).toBe(true)
  expect(blits.at(-1)).toBe(slimeCells(FAMILY.length, 0, null, 'still'))

  blits.length = 0
  await clock.advance(FRAME_MS * 10)
  expect(blits.length).toBe(0)
  await ui.unmount()
})

test('slimes give up their room before the branch name does', async ($, on) => {
  answers(on, { name: 'feature/slimes', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const columns = BRANCH_SPRITE[0]!.length + 2 + pixelWidth('feature/slimes'.length)
  const ui = await mount($, 'terminal', FULL_ROWS, columns)
  for (const line of FEATURE_TITLE) {
    expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  }
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  expect((raster?.props.columns as number | undefined) ?? 0).toBeLessThan(slimeColumns(FAMILY.length))
  await ui.unmount()
})

const hopLaunch = HOP_CROUCH_TICKS
const hopRise = hopLaunch + HOP_LAUNCH_TICKS
const hopTop = hopRise + HOP_RISE_TICKS
const hopFall = hopTop + HOP_HANG_TICKS
const hopLanding = hopFall + HOP_FALL_TICKS
const hopRebound = hopLanding + HOP_LAND_TICKS
const hopSettle = hopRebound + HOP_REBOUND_TICKS
const floorRow = SLIME_ROWS * 2 - 1
const kingDropStarts = KING_GATHER_TICKS + KING_MERGE_TICKS
const kingReignStarts = KING_GATHER_TICKS + KING_MERGE_TICKS + KING_DROP_TICKS + KING_FLASH_TICKS

describe('slime moments', () => {
  test('damage flickers only its target for three hidden/shown pairs, then stands', () => {
    const startTick = DAMAGE_TICKS * 2
    for (const count of [1, 2, 3, 4]) {
      const standing = stage(count, null)
      for (let target = 0; target < count; target += 1) {
        const damage: Moment = { kind: 'damage', startTick, target }
        for (let frame = 0; frame < DAMAGE_TICKS; frame += 1) {
          const pixels = slimePixels(slimeCells(count, startTick + frame, damage, 'still'))
          for (let i = 0; i < count; i += 1) {
            const face = slimeFace(pixels, i)
            if (i === target && frame % 2 === 0) expect(face.flat().every(pixel => pixel === null)).toBe(true)
            else expect(face).toEqual(slimeFace(standing, i))
          }
        }
        const endpointTick = startTick + DAMAGE_TICKS
        expect(slimeCells(count, endpointTick, damage, 'still')).toBe(slimeCells(count, endpointTick, null, 'still'))
        expect(momentEndTick(damage, count, 'still')).toBe(endpointTick + 1)
      }
    }
  })

  test('level-up hops every kin in unison, gold and white at the top, and ends standing', () => {
    const startTick = HOP_TICKS * 2 + 1
    const settleTick = HOP_TICKS - HOP_SETTLE_TICKS
    const floorRow = SLIME_ROWS * 2 - 1
    // Expected art comes directly from the sprite requirement, independently of HOP/kinFrame.
    const expectedSprite = (i: number, frame: number) => {
      const sprites = FAMILY[i]!.sprites
      if (frame < HOP_CROUCH_TICKS) return sprites.squash
      if (frame < hopRise) return sprites.stretch
      if (frame < hopFall) return sprites.stand
      if (frame < hopFall + HOP_FALL_TICKS) return sprites.stretch
      if (frame < hopFall + HOP_FALL_TICKS + HOP_LAND_TICKS) return sprites.squash
      return frame < settleTick ? sprites.stretch : sprites.stand
    }
    const bodyPixels = (i: number) => [...FAMILY[i]!.sprites.stand.join('')].filter(pixel => pixel === 'B' || pixel === 'L').length
    for (let count = 1; count <= FAMILY.length; count += 1) {
      const levelUp: Moment = { kind: 'level-up', startTick }
      let isAllAirborne = false
      for (let frame = 0; frame < HOP_TICKS; frame += 1) {
        const pixels = slimePixels(slimeCells(count, startTick + frame, levelUp, 'still'))
        const isGold = frame >= hopTop && frame < hopFall
        for (let i = 0; i < count; i += 1) {
          const face = slimeFace(pixels, i)
          const kin = FAMILY[i] as (typeof FAMILY)[number]
          const sprite = expectedSprite(i, frame)
          const airborne = frame >= hopRise && frame < hopFall
          const top = airborne ? 0 : SLIME_ROWS * 2 - sprite.length
          const expected = Array.from({ length: SLIME_ROWS * 2 }, (_, row) =>
            Array.from({ length: SLIME_WIDTH }, (_, col) => (sprite[row - top]?.[col] ?? '.') !== '.'))
          expect(face.map(row => row.map(pixel => pixel !== null))).toEqual(expected)
          expect(face.flat().filter(p => p === GOLD).length).toBe(isGold ? bodyPixels(i) : 0)
          if (isGold) {
            for (const letter of ['B', 'L', 'D', 'E'] as const) {
              expect(face.flat()).not.toContain(kin.palette[letter])
            }
            expect(face.flat()).toContain(0xd89010)
            if (sprite.some(row => row.includes('E'))) expect(face.flat()).toContain(0x8c5000)
            if (kin.palette.H !== WHITE) expect(face.flat()).not.toContain(kin.palette.H)
          }
        }
        if (pixels[floorRow]?.every(p => p === null)) isAllAirborne = true
      }
      expect(isAllAirborne).toBe(true)
      const standing = slimeCells(count, 0, null, 'still')
      expect(slimeCells(count, startTick + settleTick, levelUp, 'still')).toBe(standing)
      expect(momentEndTick(levelUp, count, 'still')).toBe(startTick + HOP_TICKS)
      expect(slimeCells(count, startTick + HOP_TICKS, levelUp, 'breathe')).toBe(slimeCells(count, startTick + HOP_TICKS, null, 'breathe'))
    }
  })

  test('the encounter starts empty and each kin first shows only its lower rows', () => {
    const encounter: Moment = { kind: 'encounter', startTick: 0 }
    for (const count of [2, 3, 4, 5]) {
      const first = slimePixels(slimeCells(count, 0, encounter, 'still'))
      expect(first.flat().every(pixel => pixel === null)).toBe(true)
      for (let i = 0; i < count; i += 1) {
        const standing = slimeFace(stage(count, null), i)
        const emptyRow = Array<null>(SLIME_WIDTH).fill(null)
        const dropTick = i * ENCOUNTER_STAGGER_TICKS
        // Each falling tick shows the rows below the stage top.
        for (const offset of [1, 2]) {
          const visibleRows = SLIME_ROWS * 2 - kinFrame(FAMILY[i]!.sprites, ENCOUNTER[offset]!).lift
          const actual = slimeFace(slimePixels(slimeCells(count, dropTick + offset, encounter, 'still')), i)
          const expected = [...standing.slice(-visibleRows), ...Array(SLIME_ROWS * 2 - visibleRows).fill(emptyRow)]
          expect(actual).toEqual(expected)
        }
      }
    }
  })

  test('damage expires after every kin rejoins hopping from rest or a fresh crouch', () => {
    for (const count of [1, 2, 3, 4]) {
      const standing = slimeCells(count, 0, null, 'still')
      for (let startTick = 0; startTick < HOP_START_WINDOW_TICKS; startTick += 1) {
        const damage: Moment = { kind: 'damage', startTick, target: count - 1 }
        let allJoinedTick = startTick + 1
        for (let i = 0; i < count; i += 1) {
          const endpointTick = startTick + DAMAGE_TICKS
          const stand = shape(slimeFace(stage(count, null), i))
          const crouch = shape(slimeFace(kingStage(count, kingLandingTick, null, 'breathe', 'king'), i))
          let joined = false
          for (let tick = endpointTick; tick <= endpointTick + HOP_TICKS; tick += 1) {
            const global = shape(slimeFace(stage(count, tick, 'hop'), i))
            const previous = shape(slimeFace(stage(count, tick - 1, 'hop'), i))
            if (!joined && tick > endpointTick && (global === stand || global === crouch) && previous === stand) {
              joined = true
              allJoinedTick = Math.max(allJoinedTick, tick)
            }
            const expected = joined ? slimeCells(count, tick, null, 'hop') : standing
            expect(slimeCellFace(slimeCells(count, tick, damage, 'hop'), count, i)).toEqual(slimeCellFace(expected, count, i))
          }
          expect(joined).toBe(true)
        }
        expect(momentEndTick(damage, count, 'hop')).toBe(allJoinedTick)
      }
    }
  })

  test('level-up expires after every kin rejoins hopping from rest or a fresh crouch', () => {
    const settleTick = HOP_TICKS - HOP_SETTLE_TICKS
    for (const count of [1, 2, 3, 4]) {
      const standing = slimeCells(count, 0, null, 'still')
      for (let startTick = 0; startTick < HOP_START_WINDOW_TICKS; startTick += 1) {
        const levelUp: Moment = { kind: 'level-up', startTick }
        const endpointTick = startTick + settleTick
        let allJoinedTick = startTick + 1
        for (let i = 0; i < count; i += 1) {
          const stand = shape(slimeFace(stage(count, null), i))
          const crouch = shape(slimeFace(kingStage(count, kingLandingTick, null, 'breathe', 'king'), i))
          let joined = false
          for (let tick = endpointTick; tick <= endpointTick + HOP_TICKS; tick += 1) {
            const global = shape(slimeFace(stage(count, tick, 'hop'), i))
            const previous = shape(slimeFace(stage(count, tick - 1, 'hop'), i))
            if (!joined && tick > endpointTick && (global === stand || global === crouch) && previous === stand) {
              joined = true
              allJoinedTick = Math.max(allJoinedTick, tick)
            }
            const expected = joined ? slimeCells(count, tick, null, 'hop') : standing
            expect(slimeCellFace(slimeCells(count, tick, levelUp, 'hop'), count, i)).toEqual(slimeCellFace(expected, count, i))
          }
          expect(joined).toBe(true)
        }
        expect(momentEndTick(levelUp, count, 'hop')).toBe(allJoinedTick)
      }
    }
  })

  test('each encounter arrival rejoins hopping only from rest or a fresh crouch', () => {
    const staggerTicks = ENCOUNTER_STAGGER_TICKS
    const arrivalTicks = ENCOUNTER_ARRIVAL_TICKS
    for (const count of [1, 2, 3, 4]) {
      const standing = slimeCells(count, 0, null, 'still')
      for (let startTick = 0; startTick < HOP_START_WINDOW_TICKS; startTick += 1) {
        const encounter: Moment = { kind: 'encounter', startTick }
        let allJoinedTick = startTick + 1
        for (let i = 0; i < count; i += 1) {
          const endpointTick = startTick + i * staggerTicks + arrivalTicks
          const stand = shape(slimeFace(stage(count, null), i))
          const crouch = shape(slimeFace(kingStage(count, kingLandingTick, null, 'breathe', 'king'), i))
          let joined = false
          for (let tick = endpointTick; tick <= endpointTick + HOP_TICKS; tick += 1) {
            const global = shape(slimeFace(stage(count, tick, 'hop'), i))
            const previous = shape(slimeFace(stage(count, tick - 1, 'hop'), i))
            if (!joined && tick > endpointTick && (global === stand || global === crouch) && previous === stand) {
              joined = true
              allJoinedTick = Math.max(allJoinedTick, tick)
            }
            const expected = joined ? slimeCells(count, tick, null, 'hop') : standing
            expect(slimeCellFace(slimeCells(count, tick, encounter, 'hop'), count, i)).toEqual(slimeCellFace(expected, count, i))
          }
          expect(joined).toBe(true)
        }
        expect(momentEndTick(encounter, count, 'hop')).toBe(allJoinedTick)
      }
    }
  })

  test('the encounter drops each kin three ticks apart, then lands, rebounds and rests', () => {
    const count = FAMILY.length
    const encounter: Moment = { kind: 'encounter', startTick: 0 }
    const staggerTicks = ENCOUNTER_STAGGER_TICKS
    const fallTicks = ENCOUNTER_FALL_TICKS
    const squashTicks = HOP_LAND_TICKS
    const reboundTicks = HOP_REBOUND_TICKS
    const standing = slimeCells(count, 0, null, 'still')
    const crouching = slimeCells(count, kingLandingTick, { kind: 'king', startTick: 0, variant: 'king' }, 'still')
    const empty = slimeCellFace(slimeCells(count, 0, encounter, 'still'), count, 0)
    const launchTick = HOP_CROUCH_TICKS
    const stretching = slimeCells(count, launchTick, null, 'hop')
    for (let i = 0; i < count; i += 1) {
      const dropTick = i * staggerTicks
      const landingTick = dropTick + fallTicks
      const reboundTick = landingTick + squashTicks
      const settledTick = reboundTick + reboundTicks
      if (i > 0) expect(slimeCellFace(slimeCells(count, dropTick - 1, encounter, 'still'), count, i)).toEqual(empty)
      const first = slimeCellFace(slimeCells(count, dropTick, encounter, 'still'), count, i)
      expect(first).not.toEqual(slimeCellFace(standing, count, i))
      for (let tick = dropTick; tick < landingTick; tick += 1) {
        expect(slimeCellFace(slimeCells(count, tick, encounter, 'still'), count, i).at(-1)).not.toBe(slimeCellFace(standing, count, i).at(-1))
      }
      for (let tick = landingTick; tick < reboundTick; tick += 1) {
        expect(slimeCellFace(slimeCells(count, tick, encounter, 'still'), count, i)).toEqual(slimeCellFace(crouching, count, i))
      }
      // Blue's launch gives the stretch silhouette; other kin use their own colours.
      if (i === 0) expect(slimeCellFace(slimeCells(count, reboundTick, encounter, 'still'), count, i)).toEqual(slimeCellFace(stretching, count, i))
      expect(slimeCellFace(slimeCells(count, settledTick, encounter, 'still'), count, i)).toEqual(slimeCellFace(standing, count, i))
    }
    const endpointTick = (count - 1) * staggerTicks + fallTicks + squashTicks + reboundTicks
    expect(slimeCells(count, endpointTick, encounter, 'still')).toBe(standing)
    expect(momentEndTick(encounter, count, 'still')).toBe(endpointTick + 1)
  })

  test('King replaces another moment only when there is room, and renders from its start tick', () => {
    const damage: Moment = { kind: 'damage', startTick: 1, target: 0 }
    const king: Moment = { kind: 'king', startTick: 100, variant: 'king' }
    expect(nextMoment(damage, king, 1)).toEqual(damage)
    expect(nextMoment(null, king, 1)).toBe(null)
    const active = nextMoment(damage, king, 2)
    expect(active).toEqual(king)
    expect(goldIn(slimeCells(2, king.startTick, active, 'still'))).toBe(false)
    expect(goldIn(slimeCells(2, king.startTick + kingReignStarts, active, 'still'))).toBe(true)
    expect(slimeCells(2, king.startTick + KING_SHOW_TICKS, active, 'still')).toBe(slimeCells(2, 0, null, 'still'))
  })

  test('only a higher-priority moment takes the stage, and dropped moments never return', () => {
    const moments: Moment[] = [
      { kind: 'damage', startTick: 1, target: 2 },
      { kind: 'encounter', startTick: 2 },
      { kind: 'level-up', startTick: 3 },
      { kind: 'king', startTick: 4, variant: 'king' },
    ]
    for (const [i, incoming] of moments.entries()) {
      expect(nextMoment(null, incoming, 4)).toEqual(incoming)
      for (const [j, active] of moments.entries()) {
        expect(nextMoment(active, incoming, 4)).toEqual(i > j ? incoming : active)
      }
    }
    const king = moments[3] as Moment
    const active = nextMoment(king, { kind: 'damage', startTick: 5, target: 0 }, 4)
    expect(slimeCells(FAMILY.length, king.startTick + KING_SHOW_TICKS, active, 'still')).toBe(slimeCells(FAMILY.length, 0, null, 'still'))
  })
})

describe('King Slime', () => {
  test('gather uses crouch, stretch, airborne stand, landing and rebound poses', () => {
    const crouch = 0
    const launch = hopLaunch
    const rise = hopRise
    const land = hopLanding
    const rebound = hopRebound
    const settle = hopSettle
    const home = kingStage(FAMILY.length, crouch, null, 'breathe', 'king')
    expect(home.slice(0, CROUCH_EMPTY_ROWS).flat().every(p => p === null)).toBe(true)
    for (const [i, kin] of FAMILY.entries()) {
      expect(slimeFace(home, i)[floorRow]).toEqual(
        [...kin.sprites.squash.at(-1)!].map(ch => kin.palette[ch as keyof typeof kin.palette] ?? null),
      )
    }
    // The launch stretches every kin taller than it stands, still on the floor.
    const topOf = (face: (number | null)[][]) => face.findIndex(row => row.some(p => p !== null))
    const launched = kingStage(FAMILY.length, launch, null, 'breathe', 'king')
    for (let i = 0; i < FAMILY.length; i += 1) {
      expect(topOf(slimeFace(launched, i))).toBeLessThan(topOf(slimeFace(stage(FAMILY.length, null), i)))
      expect(slimeFace(launched, i)[floorRow]?.some(p => p !== null)).toBe(true)
    }
    expect(kingStage(FAMILY.length, rise, null, 'breathe', 'king')[floorRow]?.every(p => p === null)).toBe(true)
    expect(kingStage(FAMILY.length, land, null, 'breathe', 'king').slice(0, CROUCH_EMPTY_ROWS).flat().every(p => p === null)).toBe(true)
    const fall = hopFall
    expect(kingStage(FAMILY.length, rebound, null, 'breathe', 'king')).toEqual(kingStage(FAMILY.length, fall, null, 'breathe', 'king'))
    expect(topOf(kingStage(FAMILY.length, settle, null, 'breathe', 'king'))).toBe(topOf(stage(FAMILY.length, null)))
  })

  const GOLD = 0xfcbc3c
  const hasGold = (pixels: (number | null)[][]) => pixels.some(row => row.includes(GOLD))

  test('the crown drops, squashes wider, rebounds, reigns and flickers before the poof', () => {
    const dropStarts = kingDropStarts
    const squashStarts = dropStarts + KING_DROP_FALL_TICKS
    const rebound = squashStarts + KING_DROP_SQUASH_TICKS
    const flash = dropStarts + KING_DROP_TICKS
    const reignStarts = flash + KING_FLASH_TICKS
    const defeatStarts = reignStarts + KING_REIGN_TICKS
    const poofStarts = defeatStarts + KING_DEFEAT_TICKS
    const width = (pixels: (number | null)[][]) => new Set(pixels.flatMap(row => row.flatMap((p, x) => p === null ? [] : [x]))).size
    const height = (pixels: (number | null)[][]) => pixels.filter(row => row.some(p => p !== null)).length
    // Falling in from above, only the King's rows below the stage top show.
    expect(height(kingStage(FAMILY.length, dropStarts, null, 'breathe', 'king'))).toBe(SLIME_ROWS * 2 - KING_DROP[0]!.lift)
    expect(kingStage(FAMILY.length, dropStarts, null, 'breathe', 'king')[floorRow]?.every(p => p === null)).toBe(true)
    expect(height(kingStage(FAMILY.length, squashStarts, null, 'breathe', 'king'))).toBe(KING_SPRITE.length - 1)
    expect(width(kingStage(FAMILY.length, squashStarts, null, 'breathe', 'king'))).toBe(KING_WIDTH + 2)
    expect(width(kingStage(2, squashStarts, null, 'breathe', 'king'))).toBe(KING_WIDTH + 2)
    expect(kingStage(FAMILY.length, rebound, null, 'breathe', 'king')[floorRow]?.every(p => p === null)).toBe(true)
    expect(hasGold(kingStage(FAMILY.length, reignStarts, null, 'breathe', 'king'))).toBe(true)
    const defeat = Array.from({ length: KING_DEFEAT_TICKS }, (_, step) => kingStage(FAMILY.length, defeatStarts + step, null, 'breathe', 'king'))
    expect(defeat.map(pixels => pixels.flat().every(p => p === null))).toEqual([true, false, true, false, true, false])
    expect(kingStage(FAMILY.length, poofStarts, null, 'breathe', 'king').flat().filter(p => p !== null).every(p => p === WHITE)).toBe(true)
    expect(KING_SHOW_TICKS).toBe(86)
  })

  test('the king keeps its jewelled crown above white cross eyes with centred pupils and an orange-red U smile', () => {
    const pixels = kingStage(2, kingReignStarts, null, 'breathe', 'king')
    expect(pixels.length).toBe(16)
    expect(pixels[0]?.includes(0x8838d0)).toBe(true)
    expect(pixels[0]?.includes(0x28a848)).toBe(true)
    expect(pixels[2]?.filter(p => p === GOLD).length).toBe(10)
    expect(pixels[3]?.filter(p => p === 0xf83800).length).toBe(4)
    expect(pixels[7]?.filter(p => p === WHITE).length).toBe(2)
    const eyes = pixels[8]?.flatMap(p => p === WHITE ? ['W'] : p === 0x0b0a0d ? ['K'] : []).join('')
    expect(eyes).toBe('WKWWKW')
    expect(pixels[11]?.filter(p => p === KING_MOUTH).length).toBe(2)
    expect(pixels[12]?.filter(p => p === KING_MOUTH).length).toBe(6)
    expect(pixels[floorRow]?.filter(p => p !== null).length).toBe(20)
    expect(pixels[floorRow]?.filter(p => p === FAMILY[0]!.palette.D).length).toBe(20)
    const kingBlink = kingReignStarts + 10
    expect(kingStage(2, kingBlink, null, 'breathe', 'king')[7]?.includes(WHITE)).toBe(false)
  })

  test('both Kings keep plus eyes, the whole three-row U smile and an orange-red mouth', () => {
    for (const king of Object.values(KINGS)) {
      expect(king.body.M).toBe(0xe85820)
      // Mask only the face ink: metal sheen and body shading are independent.
      expect(king.sprite.slice(7, 13).map(row => row.replaceAll(/[^WKM]/g, '.'))).toEqual([
        '........W....W........',
        '.......WKW..WKW.......',
        '........W....W........',
        '......M........M......',
        '.......M......M.......',
        '........MMMMMM........',
      ])
    }
  })

  test('every King closes each three-pixel eye into a lid when blinking', () => {
    for (const king of Object.values(KINGS)) {
      expect(king.blink[8]?.slice(7, 15)).toBe('KKKBBKKK')
      expect(king.blink.join('')).not.toContain('W')
      expect(king.blink.map(row => row.replaceAll(/[BHK]/g, 'B'))).toEqual(
        king.sprite.map(row => row.replaceAll(/[BHWK]/g, 'B')),
      )
    }
  })

  test('both merged poses keep white eyes, pupils, an orange-red U smile and lower shading', () => {
    // [offset, width, height, white, dark, mouth, floor shade] of the splat and the blob.
    for (const [offset, width, height, white, dark, mouth, floorShade] of [
      [0, 22, 6, 8, 2, 10, 10],
      [KING_MERGE_TICKS / 2, 17, 14, 8, 2, 7, 9],
    ] as const) {
      const pixels = kingStage(2, KING_GATHER_TICKS + offset, null, 'breathe', 'king')
      const occupied = pixels.filter(row => row.some(p => p !== null))
      expect(occupied.length).toBe(height)
      const columns = pixels[floorRow]?.map((_, x) => x).filter(x => pixels.some(row => row[x] !== null)) ?? []
      expect(columns.length).toBe(width)
      expect(pixels.flat().filter(p => p === WHITE).length).toBe(white)
      expect(pixels.flat().filter(p => p === KINGS.king.body.K).length).toBe(dark)
      expect(pixels.flat().filter(p => p === KING_MOUTH).length).toBe(mouth)
      expect(pixels[floorRow]?.filter(p => p === KINGS.king.body.D).length).toBe(floorShade)
    }
  })

  test('needs two slimes of room', () => {
    expect(canCrown(1)).toBe(false)
    expect(canCrown(2)).toBe(true)
  })

  test('the slimes gather, the king reigns crowned, and they end back home', () => {
    expect(hasGold(kingStage(FAMILY.length, 0, 0, 'breathe', 'king'))).toBe(false)
    expect(hasGold(kingStage(FAMILY.length, kingReignStarts, HOP_TICKS, 'breathe', 'king'))).toBe(true)
    expect(kingStage(FAMILY.length, KING_SHOW_TICKS, HOP_TICKS, 'hop', 'king')).toEqual(stage(FAMILY.length, null))
  })

  type Pixels = (number | null)[][]
  const grounded = (pixels: Pixels) => (pixels[pixels.length - 1] ?? []).some(c => c !== null)
  const atTop = (pixels: Pixels) => pixels.slice(-1).every(row => row.every(c => c === null))
  const left = (pixels: Pixels) => Math.min(...pixels.map(row => row.findIndex(c => c !== null)).filter(x => x >= 0))
  const right = (pixels: Pixels) => Math.max(...pixels.map(row => row.findLastIndex(c => c !== null)))
  const at = (frame: number, count = FAMILY.length) => kingStage(count, frame, null, 'breathe', 'king')
  const bodies = (pixels: Pixels) => FAMILY.filter(kin => pixels.some(row => row.includes(kin.palette.B))).length
  const rise = hopRise
  const top = hopTop
  const lastHang = hopFall - 1
  const firstLanding = hopLanding
  const secondCrouch = LEAP
  const collide = KING_GATHER_TICKS - 1
  const splatStarts = KING_GATHER_TICKS
  const out = kingReignStarts + KING_REIGN_TICKS + KING_DEFEAT_TICKS + KING_POOF_TICKS
  const homeLanding = out + KING_SCATTER_AIR_TICKS

  test('the slimes leap toward the middle, moving only in the air', () => {
    // Crouched at home, up through the top of the leap, and landed halfway.
    expect(grounded(at(0))).toBe(true)
    expect(left(at(0))).toBe(0)
    expect([rise, top, lastHang].map(f => grounded(at(f)))).toEqual([false, false, false])
    expect(atTop(at(top))).toBe(true)
    expect(grounded(at(firstLanding))).toBe(true)
    expect(left(at(firstLanding))).toBeGreaterThan(0)
    // The second leap takes off from where the first landed.
    expect(at(secondCrouch)).toEqual(at(firstLanding))
    // Each pose puts its first highlight pixel in its own row, so a kin that
    // stays grounded in one pose must keep that pixel where it was.
    const xOf = (pixels: Pixels, i: number) => pixels.flatMap((row, y) => row.flatMap((p, x) => p === FAMILY[i]?.palette.H ? [`${x},${y}`] : []))[0]
    const rowOf = (point: string | undefined) => point?.split(',')[1]
    for (const count of [2, 3, 4, 5]) {
      for (const [start, length] of [[0, LEAP], [LEAP, KING_GATHER_TICKS - LEAP], [out, KING_SCATTER_TICKS]] as const) {
        for (let frame = Math.max(1, start); frame < start + length; frame += 1) {
          const current = at(frame, count)
          if (!grounded(current)) continue
          const previous = at(frame - 1, count)
          for (let i = 0; i < count; i += 1) {
            expect(xOf(current, i)).toBeDefined()
            if (rowOf(xOf(current, i)) === rowOf(xOf(previous, i))) expect(xOf(current, i)).toBe(xOf(previous, i))
          }
        }
      }
    }
  })

  test('the slimes collide in mid-air, further in than halfway, and land merged', () => {
    expect(grounded(at(collide))).toBe(false)
    expect(left(at(collide))).toBeGreaterThan(left(at(firstLanding)))
    // Pressed together, every one of them still shows.
    expect(bodies(at(collide))).toBe(FAMILY.length)
    // The next pose they are one splat on the floor, nearly as wide as the
    // king, in the first slime's colours: not the family landed on one spot.
    const splat = at(splatStarts)
    expect(grounded(splat)).toBe(true)
    expect(right(splat) - left(splat) + 1).toBe(22)
    expect(bodies(splat)).toBe(1)
    expect(splat.some(row => row.includes(KINGS.king.body.B ?? -1))).toBe(true)
  })

  test('the airborne collision keeps every body tip inside the stage', () => {
    for (const count of [2, 3, 4, 5]) {
      const pixels = at(collide, count)
      expect(grounded(pixels)).toBe(false)
      // A kin's top is its tip or, for the bubble slime, a bubble; a bubble
      // in front may cover a neighbour's topmost tip pixel.
      const top = pixels.slice(0, 2).flat()
      for (const kin of FAMILY.slice(0, count)) expect(top.some(p => p === kin.palette.B || p === kin.palette.H)).toBe(true)
    }
  })

  test('scatter bursts from the collision in one airborne arc and lands home squashed', () => {
    // The onion tips stay at the collision x positions across poses.
    const tips = (pixels: Pixels) => [...new Set(pixels.slice(0, 1).flatMap(row => row.flatMap((p, x) => FAMILY.filter(kin => kin.sprites === ONION).some(kin => kin.palette.D === p) ? [x] : [])))].sort()
    // A bubble can cover a tip in the collision; scatter reveals all three.
    expect(tips(at(out)).length).toBe(3)
    for (const tip of tips(at(collide))) expect(tips(at(out))).toContain(tip)
    // LIQUID changes its top from HB to B; the highlight marks the same column.
    const liquid = FAMILY.find(kin => kin.sprites === LIQUID)!
    expect(at(out)[0]?.indexOf(liquid.palette.B)).toBe(at(collide)[0]?.indexOf(liquid.palette.H))
    expect(bodies(at(out))).toBe(FAMILY.length)
    expect(atTop(at(out))).toBe(true)
    const scatterArcTicks = KING_SCATTER_TICKS
    const arc = Array.from({ length: scatterArcTicks }, (_, step) => at(out + step))
    expect(arc.some(atTop)).toBe(true)
    const landingTicks = HOP_LAND_TICKS
    for (const frame of arc.slice(0, -landingTicks)) expect(atTop(frame)).toBe(true)
    expect(grounded(at(homeLanding))).toBe(true)
    expect(at(homeLanding)).toEqual(at(0))
    expect(at(homeLanding + 1)).toEqual(at(0))
    expect(left(at(homeLanding))).toBe(0)
  })

  test('however many slimes, every one shows where they collide and leap out', () => {
    for (const count of [2, 3, 4, 5]) {
      expect([count, bodies(at(collide, count)), bodies(at(out, count))]).toEqual([count, count, count])
    }
  })

  test('an injected random crowns the King or Metal King, each in its own body and crown', () => {
    const reigns = ([[0, 'king'], [0.5, 'metal']] as const).map(([pick, variant]) => {
      expect(pickKing(() => pick)).toBe(variant)
      const { body, crown } = KINGS[variant]
      const merged = kingStage(2, KING_GATHER_TICKS + KING_MERGE_TICKS / 2, null, 'breathe', variant)
      expect(merged.flat()).toContain(body.B)
      const reign = kingStage(2, kingReignStarts, null, 'breathe', variant)
      expect(reign.flat()).toContain(body.B)
      expect(reign.flat()).toContain(body.D)
      // The crown's band is all crown metal.
      expect(new Set(reign[2]?.filter(p => p !== null))).toEqual(new Set([crown.Y]))
      // The Metal King is plated: a bright sheen above, a darker band below.
      for (const plate of [body.S, body.O]) {
        if (variant === 'king') expect(plate).toBeUndefined()
        else expect(reign.flat()).toContain(plate)
      }
      return reign
    })
    expect(new Set(Object.values(KINGS).map(king => king.body.B)).size).toBe(2)
    for (const [i, reign] of reigns.entries()) {
      const others = Object.values(KINGS).filter((_, k) => k !== i)
      for (const other of others) expect(reign.flat()).not.toContain(other.body.B)
    }
    expect(pickKing(() => 0.499)).toBe('king')
    expect(pickKing(() => 0.99)).toBe('metal')
    expect(KINGS.king.name).toBe('King Slime')
    expect(KINGS.metal.name).toBe('Metal King Slime')
    // Both Kings wear gold bands.
    expect([KINGS.king, KINGS.metal].map(king => king.crown.Y)).toEqual([GOLD, GOLD])
  })

  test('the show lasts 6.5 to 7 seconds at 80 ms per frame', () => {
    expect(FRAME_MS).toBe(80)
    expect(KING_SHOW_TICKS * FRAME_MS).toBeGreaterThanOrEqual(6500)
    expect(KING_SHOW_TICKS * FRAME_MS).toBeLessThanOrEqual(7000)
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
  const ui = await mount($, 'terminal', FULL_ROWS, 120)

  // A quick answer is no occasion.
  await $.turn.complete({ answer: 'ok', durationMs: 3_000, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(false)

  await $.turn.complete({ answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't2', reason: 'answer' })
  blits.length = 0
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(true)

  blits.length = 0
  await clock.advance(FRAME_MS * 10)
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
  let ui = await mount($, 'terminal', FULL_ROWS, 120)
  for (let i = 0; i < 20 && ((await ui.find({ type: 'Text', text })) !== undefined) !== isShown; i += 1) {
    await ui.unmount()
    ui = await mount($, 'terminal', FULL_ROWS, 120)
  }
  return ui
}

const KING = {
  command: 'slime-king',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

// The King the command names as it crowns one, read back from its reply.
async function crownKing($: Parameters<TestBody>[0]): Promise<KingVariant> {
  const { text } = await $.command.run(KING)
  const variant = (Object.keys(KINGS) as KingVariant[]).find(v => text === `The slimes band together... A ${KINGS[v].name} appears!`)
  expect(variant).toBeDefined()
  return variant ?? 'king'
}

function colorIn(cells: string, color: number): boolean {
  const words = new Uint32Array(Uint8Array.from(atob(cells), c => c.charCodeAt(0)).buffer)
  return words.some((w, i) => i % 3 !== 0 && w === color)
}

test('the King show holds grounded kin until each can rejoin the global hop', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const columns = Number((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.columns)
  const count = FAMILY.findIndex((_, i) => slimeColumns(i + 1) === columns) + 1
  const showStart = 12
  await clock.advance(FRAME_MS * showStart)
  const king: Moment = { kind: 'king', startTick: showStart, variant: await crownKing($) }
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits[blits.length - 1]).toBe(slimeCells(count, 0, null, 'still'))
  for (let offset = 1; offset <= HOP_TICKS; offset += 1) {
    const tick = showStart + KING_SHOW_TICKS + offset
    await clock.advance(FRAME_MS)
    expect(blits[blits.length - 1]).toBe(slimeCells(count, tick, king, 'hop'))
  }
  expect(blits[blits.length - 1]).toBe(slimeCells(count, showStart + KING_SHOW_TICKS + HOP_TICKS, null, 'hop'))
  await ui.unmount()
})

test('/slime-king is registered, and crowns the slimes while they are on stage', async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  const registered: { name: string; description: string }[] = []
  answers(on, { name: 'main', porcelain: '', isRepo: true }, registered)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  expect(registered).toEqual([
    { name: 'slime-king', description: 'Call the slimes together to form a King Slime' },
    { name: 'quest-battle', description: 'Summon a monster for the hero to fight' },
  ])

  // Nothing drawn yet: no stage for a king.
  expect((await $.command.run(KING)).text).toBe('But there was no room for a King Slime! Widen the terminal.')

  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const variant = await crownKing($)
  // Asking again mid-show is not a question of room, and names the King that reigns.
  expect((await $.command.run(KING)).text).toBe(`The ${KINGS[variant].name} is already here!`)
  await clock.advance(FRAME_MS * (kingReignStarts + 1))
  // The named King reigns in its own body colour, and no other King's.
  for (const [other, king] of Object.entries(KINGS)) {
    expect(colorIn(blits.at(-1)!, king.body.B!)).toBe(other === variant)
  }
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(true)
  // The show over, the next ask crowns again.
  await clock.advance(FRAME_MS * 2)
  await crownKing($)
  await ui.unmount()
})

test('/slime-king on the quest stage says the hero walks on, with or without room', { options: { stage: 'quest' } }, async ($, on) => {
  mock.clock(on)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const reply = 'But there are no slimes here. The hero walks on.'
  expect((await $.command.run(KING)).text).toBe(reply)
  for (const columns of [120, 30]) {
    const ui = await mount($, 'terminal', FULL_ROWS, columns)
    expect((await $.command.run(KING)).text).toBe(reply)
    await ui.unmount()
  }
})

test('/slime-king finds no room when the band only fits the branch', async ($, on) => {
  answers(on, { name: 'feature/slimes', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 30)
  expect(await ui.find({ type: 'Raster', key: 'slimes' })).toBeUndefined()
  expect((await $.command.run(KING)).text).toBe('But there was no room for a King Slime! Widen the terminal.')
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
  const ui = await mount($, 'terminal', FULL_ROWS, 120)

  const long = { answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't1' } as const
  await $.turn.complete({ ...long, reason: 'answer', agentId: 'sub' } as never)
  await $.turn.complete({ ...long, reason: 'aborted', isAborted: true })
  await $.turn.complete({ ...long, reason: 'error' })
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
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
  const clipped = 'feat..'
  const columns = BRANCH_SPRITE[0]!.length + 2 + pixelWidth(clipped.length)
  const ui = await mount($, 'terminal', FULL_ROWS, columns)
  for (const line of CLIPPED_TITLE) {
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
    props: { hasSurvey: true, isWorking: false, maxRows: FULL_ROWS, bodyColumns: 120 } as never,
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

  const ui = await mount($, 'terminal', FULL_ROWS, 120)
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

  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  expect(await ui.find({ type: 'Text', text: DEV_TITLE[0] })).toBeDefined()
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

  const ui = await mount($, 'terminal', FULL_ROWS, 120)
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


test('the quest hero stays still with idle off even when slime hopping is on', { options: { stage: 'quest', slimesIdle: false, slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const end = QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, QUEST_STAGE.maxRoom, 'still')
  await clock.advance(FRAME_MS * end)
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(QUEST_STAGE.maxRoom, end, null, 'still'))
  expect(slimePixels(blits.at(-1)!, QUEST_STAGE.rows).flat()).toContain(HERO_PALETTE.B)
  blits.length = 0
  await clock.advance(FRAME_MS * DAMAGE_COOLDOWN_TICKS)
  expect(blits).toEqual([])
  await ui.unmount()
})

test('quest failures flicker the hero and compaction takes over in gold', { options: { stage: 'quest', slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('classic.PostToolUseFailure', async () => ({}) as never)
  on('classic.PostCompact', async () => ({}) as never)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, 120)
  const room = QUEST_STAGE.maxRoom
  const tick = QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, room, 'still')
  await clock.advance(FRAME_MS * tick)
  blits.length = 0
  await $.classic.PostToolUseFailure({ ...failure, is_interrupt: true } as never)
  expect(blits).toEqual([])
  await $.classic.PostToolUseFailure(failure as never)
  const damage: Moment = { kind: 'damage', startTick: tick, target: 0 }
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, tick, damage, 'still'))
  expect(slimePixels(blits.at(-1)!, QUEST_STAGE.rows).slice(0, -1).flat().every(pixel => pixel === null)).toBe(true)
  await clock.advance(FRAME_MS)
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, tick + 1, damage, 'still'))
  await $.classic.PostCompact({ ...compaction, trigger: 'auto' } as never)
  const levelUp: Moment = { kind: 'level-up', startTick: tick + 1 }
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, tick + 1, levelUp, 'still'))
  const end = QUEST_STAGE.momentEndTick(levelUp, room, 'still')
  for (let frame = tick + 2; frame <= end; frame += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, frame, levelUp, 'still'))
  }
  expect(blits.some(goldIn)).toBe(true)
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, end, null, 'still'))
  await ui.unmount()
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`the quest stage disappears on a narrow ${surface}`, { options: { stage: 'quest' } }, async ($, on) => {
    const clock = mock.clock(on)
    const blits: string[] = []
    on('ui.blit', async (_$, e) => {
      if ('cells' in e) blits.push(e.cells)
      return { value: {} }
    })
    answers(on, { name: 'main', porcelain: '', isRepo: true })
    await $.session.start({ cwd: '/repo', surface, isInteractive: true })
    const ui = await mount($, surface, FULL_ROWS, 40)
    expect(await ui.find({ type: 'Raster', key: 'slimes' })).toBe(undefined)
    expect(JSON.stringify(await ui.drawn()).includes(`"color":"#${HERO_PALETTE.B.toString(16).padStart(6, '0')}"`)).toBe(false)
    await clock.advance(FRAME_MS * DAMAGE_COOLDOWN_TICKS)
    expect(blits).toEqual([])
    await ui.unmount()
  })
}

// The width docs/showcase/render_mod.py renders at.
const SHOWCASE_COLUMNS = 84

test('the quest stage claims only its own columns beside the branch at the showcase width', { options: { stage: 'quest' } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', FULL_ROWS, SHOWCASE_COLUMNS)
  expect((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.columns).toBe(QUEST_MIN_COLUMNS)
  await clock.advance(FRAME_MS * QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, QUEST_STAGE.maxRoom, 'still'))
  expect(slimePixels(blits.at(-1)!, QUEST_STAGE.rows).flat()).toContain(HERO_PALETTE.B)
  await ui.unmount()
})

for (const columns of [40, 120]) {
  test(`quest battles ignore ineligible turns at ${columns} columns`, { options: { stage: 'quest', slimesIdle: false } }, async ($, on) => {
    const clock = mock.clock(on)
    const blits: string[] = []
    on('ui.blit', async (_$, e) => {
      if ('cells' in e) blits.push(e.cells)
      return { value: {} }
    })
    on('turn.complete', async () => ({ text: 'done' }))
    answers(on, { name: 'main', porcelain: '', isRepo: true })
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    const answer = { answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as const
    // A stage must be seated before any battle is admitted.
    await $.turn.complete(answer)
    const ui = await mount($, 'terminal', FULL_ROWS, columns)
    const encounterEnd = QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, QUEST_STAGE.maxRoom, 'still')
    await clock.advance(FRAME_MS * encounterEnd)
    blits.length = 0
    await $.turn.complete({ ...answer, agentId: 'sub' } as never)
    await $.turn.complete({ ...answer, reason: 'error' })
    await $.turn.complete({ ...answer, reason: 'aborted', isAborted: true })
    if (columns === 40) await $.turn.complete(answer)
    await clock.advance(FRAME_MS * DAMAGE_COOLDOWN_TICKS)
    expect(blits).toEqual([])
    await ui.unmount()
  })
}

for (const [theme, rows] of [['quest', QUEST_ROWS], ['slimes', SLIME_ROWS]] as const) {
  test(`${theme} seats a ${rows}-row Raster on each render`, { options: { stage: theme } }, async ($, on) => {
    mock.clock(on)
    answers(on, { name: 'main', porcelain: '', isRepo: true })
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    for (let render = 0; render < 2; render += 1) {
      const ui = await mount($, 'terminal', Math.max(rows, TITLE_ROWS) + METER_ROWS, 120)
      const raster = await ui.find({ type: 'Raster', key: 'slimes' })
      expect(raster?.props.rows).toBe(rows)
      expect(new Uint32Array(Uint8Array.from(atob(String(raster?.props.cells)), ch => ch.charCodeAt(0)).buffer).length).toBe(Number(raster?.props.columns) * rows * 3)
      await ui.unmount()
    }
  })
}

test('the desktop quest fallback includes all eight rows', { options: { stage: 'quest' } }, async ($, on) => {
  mock.clock(on)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  const ui = await mount($, 'desktop', FULL_ROWS, 120)
  for (const row of QUEST_STAGE.text(QUEST_STAGE.maxRoom)) {
    expect(await ui.find({ type: 'Text', text: row[0]!.text })).toBeDefined()
  }
  await ui.unmount()
})

test('a band one row short uses the chip instead of clipping the quest stage', { options: { stage: 'quest' } }, async ($, on) => {
  mock.clock(on)
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', QUEST_ROWS + METER_ROWS - 1, 120)
  expect(await ui.find({ type: 'Raster', key: 'slimes' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: ' ▶ MAIN ' })).toBeDefined()
  await ui.unmount()
})
