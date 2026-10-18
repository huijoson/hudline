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
import {
  canCrown,
  FAMILY,
  FRAME_MS,
  HOP_TICKS,
  KING_FLASH_TICKS,
  KING_GATHER_TICKS,
  KING_MERGE_TICKS,
  KING_POSE_TICKS,
  KING_REIGN_TICKS,
  KING_SHOW_TICKS,
  KING_WIDTH,
  kingStage,
  LEAP,
  nextMoment,
  slimeCells,
  slimeColumns,
  slimeText,
  SLIME_WIDTH,
  stage,
} from './slime'
import type { Moment } from './slime'

const WHITE = 0xfcfcfc
const MOUTH = 0x981828
// Ticket #8's per-kin breathing periods, in clock ticks.
const BREATH_PERIODS = [36, 44, 50, 40]
const BLINK_EVERY_CYCLES = 3
const LONGEST_BREATH_PERIOD = Math.max(...BREATH_PERIODS)
const BLINK_OBSERVATION_TICKS = BLINK_EVERY_CYCLES * LONGEST_BREATH_PERIOD
const TIP_ROW = 1
const TIP_COLUMN = 3
const EYE_ROW = 3
const LEFT_EYE_COLUMN = 2
const RIGHT_EYE_COLUMN = 4

function slimeFace(pixels: (number | null)[][], i: number) {
  return pixels.map(row => row.slice(i * SLIME_WIDTH, (i + 1) * SLIME_WIDTH))
}

const SPRITE_ROW = pack(BRANCH_SPRITE)[0]

describe('pixel font', () => {
  test('packs a glyph into three half-block rows', () => {
    expect(pixelText('a')).toEqual(['▄▀▄', '█▀█', '▀ ▀'])
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
  test('the default Raster breathes at rest', () => {
    const firstSquishTick = 34
    expect(slimeCells(4, firstSquishTick)).toBe(slimeCells(4, firstSquishTick, null, 'breathe'))
  })

  test('each kin has white eyes, dark pupils, a red grin and a shaded lower edge', () => {
    const rest = stage(4, null)
    for (const [i, kin] of FAMILY.entries()) {
      const face = slimeFace(rest, i)
      expect(face[0]?.every(p => p === null)).toBe(true)
      expect(face[1]?.filter(p => p !== null)).toEqual([kin.body])
      expect(face[3]?.filter(p => p === WHITE).length).toBe(2)
      expect(face[4]?.filter(p => p === 0x0b0a0d).length).toBe(2)
      expect(face[5]?.slice(2, 5)).toEqual([MOUTH, MOUTH, MOUTH])
      const shade = face[5]?.[0] ?? 0xffffff
      expect(shade).not.toBe(kin.body)
      expect(shade).not.toBe(0x0b0a0d)
      for (const shift of [16, 8, 0]) {
        expect((shade >> shift) & 255).toBeLessThan((kin.body >> shift) & 255)
      }
    }
  })

  test('breath widens for two ticks and returns to stand at each kin’s own pace', () => {
    const firstCycleTick = 0
    const rest = stage(4, null)
    const poses: string[][] = []
    for (const [i, period] of BREATH_PERIODS.entries()) {
      const frames: string[] = []
      for (let tick = firstCycleTick; tick <= period; tick += 1) {
        const pixels = stage(4, tick, 'breathe')
        const face = slimeFace(pixels, i)
        expect(face[5]?.some(p => p !== null)).toBe(true)
        frames.push(JSON.stringify(face))
      }
      const standing = JSON.stringify(slimeFace(rest, i))
      expect(frames.filter(frame => frame !== standing).length).toBe(2)
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
      for (let tick = 0; tick < blinkCycleTicks; tick += 1) {
        const face = slimeFace(stage(4, tick, 'breathe'), i)
        if (face[TIP_ROW]?.[TIP_COLUMN] !== null && face[EYE_ROW]?.[LEFT_EYE_COLUMN] !== WHITE && face[EYE_ROW]?.[RIGHT_EYE_COLUMN] !== WHITE) blinks.push(tick)
      }
      expect(blinks.length).toBe(1)
      const blinkTick = blinks[0] ?? 0
      blinkTicks.push(blinkTick)
      const nextBlink = slimeFace(stage(4, blinkTick + blinkCycleTicks, 'breathe'), i)
      const firstBlink = slimeFace(stage(4, blinkTick, 'breathe'), i)
      expect(nextBlink).toEqual(firstBlink)
    }
    expect(new Set(blinkTicks).size).toBe(FAMILY.length)
  })

  test('the King returns to breathing', () => {
    const king: Moment = { kind: 'king', startTick: 0 }
    const kingSettles = KING_SHOW_TICKS - 1
    const kingEnds = KING_SHOW_TICKS
    expect(slimeCells(4, kingSettles, king, 'breathe')).toBe(slimeCells(4, kingSettles, null, 'breathe'))
    expect(slimeCells(4, kingEnds, king, 'breathe')).toBe(slimeCells(4, kingEnds, null, 'breathe'))
  })

  test('a hop crouches, stretches, hangs, lands and rebounds before resting', () => {
    const firstCrouchTick = 0
    const launchTick = 2
    const riseTick = 3
    const fallTick = 6
    const reboundTick = 9
    const settleTick = 10
    const nextCrouchTick = 17
    const runs: number[] = []
    let previous = ''
    for (let tick = firstCrouchTick; tick < nextCrouchTick; tick += 1) {
      const cells = slimeCells(1, tick, null, 'hop')
      if (cells === previous) runs[runs.length - 1] = (runs[runs.length - 1] ?? 0) + 1
      else runs.push(1)
      previous = cells
    }
    // Crouch, launch, rise/hang, fall, land, rebound, settle/rest.
    expect(runs).toEqual([2, 1, 3, 1, 2, 1, 7])
    const stretch = stage(1, launchTick, 'hop')
    expect(stretch[0]?.filter(p => p !== null)).toEqual([FAMILY[0]?.body])
    expect(stretch[5]?.filter(p => p !== null).length).toBe(3)
    expect(stage(1, fallTick, 'hop')).toEqual(stretch)
    expect(stage(1, reboundTick, 'hop')).toEqual(stretch)
    expect(stage(1, riseTick, 'hop')[5]?.every(p => p === null)).toBe(true)
    expect(stage(1, settleTick, 'hop')).toEqual(stage(1, null))
  })

  test('hop rests vary by kin and cycle, within six to fourteen ticks, deterministically', () => {
    const observationTicks = 200
    const movingTicks = 11
    const launchOffset = 2
    const riseOffset = 3
    const minRestTicks = 6
    const maxRestTicks = 14
    const restLengths: number[][] = []
    for (let i = 0; i < FAMILY.length; i += 1) {
      const crouches: number[] = []
      for (let tick = 0; tick < observationTicks; tick += 1) {
        const face = slimeFace(stage(4, tick, 'hop'), i)
        const launch = slimeFace(stage(4, tick + launchOffset, 'hop'), i)
        const rise = slimeFace(stage(4, tick + riseOffset, 'hop'), i)
        const isCrouching = face.slice(0, 2).flat().every(p => p === null)
        const isLaunching = launch[0]?.some(p => p !== null) && launch[5]?.some(p => p !== null)
        const isRising = rise[5]?.every(p => p === null)
        if (isCrouching && isLaunching && isRising) crouches.push(tick)
        expect(slimeFace(stage(4, tick, 'hop'), i)).toEqual(face)
      }
      const rests = crouches.slice(1).map((tick, cycle) => tick - (crouches[cycle] ?? 0) - movingTicks)
      expect(rests.length).toBeGreaterThan(2)
      expect(new Set(rests).size).toBeGreaterThan(1)
      for (const rest of rests) {
        expect(rest >= minRestTicks && rest <= maxRestTicks).toBe(true)
      }
      for (const crouchTick of crouches) {
        const settleTick = crouchTick + movingTicks - 1
        const restTick = crouchTick + movingTicks
        expect(slimeFace(stage(4, settleTick, 'hop'), i)).toEqual(slimeFace(stage(4, null), i))
        expect(slimeFace(stage(4, restTick, 'hop'), i)).toEqual(slimeFace(stage(4, null), i))
      }
      restLengths.push(rests)
    }
    for (let left = 0; left < restLengths.length; left += 1) {
      for (let right = left + 1; right < restLengths.length; right += 1) {
        expect(restLengths[left]).not.toEqual(restLengths[right])
      }
    }
  })

  test('the pointed tip stays visible throughout a hop in the six-pixel stage', () => {
    let airborneTicks = 0
    for (let tick = 0; tick < HOP_TICKS; tick += 1) {
      const pixels = stage(1, tick, 'hop')
      const top = pixels.find(row => row.some(p => p !== null))
      if (!pixels[5]?.some(p => p !== null)) {
        airborneTicks += 1
        expect(top?.filter(p => p !== null)).toEqual([0x3cbcfc])
        expect(pixels[4]?.slice(2, 5)).toEqual([MOUTH, MOUTH, MOUTH])
      }
    }
    expect(airborneTicks).toBeGreaterThan(0)
  })

  test('stands on the floor at rest and leaves it mid-hop', () => {
    const floor = (tick: number) => stage(1, tick, 'hop')[5]?.some(p => p !== null)
    expect(floor(0)).toBe(true)
    expect(Array.from({ length: HOP_TICKS }, (_, tick) => floor(tick))).toContain(false)
    expect(floor(HOP_TICKS)).toBe(true)
    // The top of the hop stays airborne; its moving phase ends grounded.
    const hangTick = 4
    expect(floor(hangTick)).toBe(false)
  })

  test('at rest every slime sits on the floor', () => {
    const rest = stage(4, null)
    for (let i = 0; i < 4; i += 1) {
      expect(slimeFace(rest, i)[5]?.some(p => p !== null)).toBe(true)
    }
    expect(rest[0]?.some(p => p !== null)).toBe(false)
  })

  test('the crouch keeps the white eyes and grin in a lower silhouette', () => {
    const crouchTick = 0
    const crouch = stage(1, crouchTick, 'hop')
    expect(crouch.slice(0, 2).flat().every(p => p === null)).toBe(true)
    expect(crouch.flat().filter(p => p === WHITE).length).toBe(2)
    expect(crouch[5]?.includes(MOUTH)).toBe(true)
  })

  test('packs a frame into three rows of Raster cells', () => {
    const bytes = atob(slimeCells(3, 0)).length
    expect(bytes).toBe(slimeColumns(3) * 3 * 3 * 4)
  })

  test('draws a resting frame as text where there is no Raster', () => {
    const rows = slimeText(4)
    expect(rows.length).toBe(3)
    for (let i = 0; i < 4; i += 1) {
      expect(rows.map(row => row[i]?.text)).toEqual(['   ▄   ', ' ▄███▄ ', '███████'])
    }
    expect(rows[0]?.map(part => part.color)).toEqual(['#3cbcfc', '#fc7460', '#a8a8b8', '#38c838'])
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

    const ui = await mount($, 'terminal', 10, 120)
    const raster = await ui.find({ type: 'Raster', key: 'slimes' })
    expect(raster?.props.columns).toBe(slimeColumns(4))
    expect(raster?.props.rows).toBe(3)
    const hopAirborneTick = 3
    await clock.advance(FRAME_MS * hopAirborneTick)
    expect(blits.at(-1)).toBe(slimeCells(4, hopAirborneTick, null, 'hop'))
    expect(blits.length).toBeGreaterThan(0)
    expect(new Set(blits).size).toBeGreaterThan(1)
    await ui.unmount()

    const desk = await mount($, 'desktop', 10, 120)
    expect(await desk.find({ type: 'Raster' })).toBeUndefined()
    expect(await desk.find({ type: 'Text', text: '███████' })).toBeDefined()
    await desk.unmount()
  })
}

test('each blit changes the seated cells, during hops and the King show', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const cells: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) cells.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 120)
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  cells.push(raster?.props.cells as string)
  await clock.advance(FRAME_MS)
  expect(cells.length).toBe(1)
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
  const ui = await mount($, 'terminal', 10, 120)
  await clock.advance(FRAME_MS * 10)
  expect(blits.length).toBe(1)
  expect((await $.command.run(KING)).text).toBe('No room for a King Slime here: widen the terminal.')
  await ui.unmount()

  const remount = await mount($, 'terminal', 10, 120)
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
  const ui = await mount($, 'terminal', 10, 120)
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  const firstBreathStarts = 34
  const firstBreathEnds = 36
  await clock.advance(FRAME_MS * (firstBreathStarts - 1))
  expect(blits.length).toBe(0)
  await clock.advance(FRAME_MS)
  expect(blits.length).toBe(1)
  expect(blits[0]).not.toBe(raster?.props.cells)
  await clock.advance(FRAME_MS)
  expect(blits.length).toBe(1)
  await clock.advance(FRAME_MS * (firstBreathEnds - firstBreathStarts - 1))
  expect(blits.length).toBe(2)
  expect(blits.at(-1)).toBe(raster?.props.cells)
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
  const ui = await mount($, 'terminal', 10, 120)
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  expect(raster?.props.cells).toBe(slimeCells(4, 0, null, 'still'))
  const blinkCycleTicks = BLINK_OBSERVATION_TICKS
  await clock.advance(FRAME_MS * blinkCycleTicks)
  expect(blits.length).toBe(0)

  await $.turn.complete({ answer: 'ok', durationMs: 60_000, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(FRAME_MS * (KING_SHOW_TICKS + 2))
  expect(blits.some(goldIn)).toBe(true)
  expect(blits.at(-1)).toBe(slimeCells(4, 0, null, 'still'))

  blits.length = 0
  await clock.advance(FRAME_MS * 10)
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

const kingReignStarts = KING_GATHER_TICKS + KING_MERGE_TICKS + KING_FLASH_TICKS

describe('slime moments', () => {
  test('King replaces another moment only when there is room, and renders from its start tick', () => {
    const damage: Moment = { kind: 'damage', startTick: 1, target: 0 }
    const king: Moment = { kind: 'king', startTick: 100 }
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
      { kind: 'king', startTick: 4 },
    ]
    for (const [i, incoming] of moments.entries()) {
      expect(nextMoment(null, incoming, 4)).toEqual(incoming)
      for (const [j, active] of moments.entries()) {
        expect(nextMoment(active, incoming, 4)).toEqual(i > j ? incoming : active)
      }
    }
    const king = moments[3] as Moment
    const active = nextMoment(king, { kind: 'damage', startTick: 5, target: 0 }, 4)
    expect(slimeCells(4, king.startTick + KING_SHOW_TICKS, active, 'still')).toBe(slimeCells(4, 0, null, 'still'))
  })
})

describe('King Slime', () => {
  test('holds each King pose for two ticks without cadence stutter', () => {
    const runs: number[] = []
    let previous = ''
    for (let frame = 0; frame < kingReignStarts; frame += 1) {
      const pixels = JSON.stringify(kingStage(4, frame, null))
      if (pixels === previous) runs[runs.length - 1] = (runs[runs.length - 1] ?? 0) + 1
      else runs.push(1)
      previous = pixels
    }
    // The first landing and second crouch share one silhouette.
    expect(runs).toEqual([2, 2, 2, 2, 4, 2, 2, 2, 2, 2, 2, 2])
    // Reign, flashes and both leaps home also hold for complete pairs of ticks.
    for (let frame = 0; frame < KING_SHOW_TICKS; frame += 2) {
      expect(kingStage(4, frame + 1, null)).toEqual(kingStage(4, frame, null))
    }
  })

  const GOLD = 0xfcbc3c
  const hasGold = (pixels: (number | null)[][]) => pixels.some(row => row.includes(GOLD))

  test('the king keeps its crown and jewel above white eyes and a wide red grin', () => {
    const pixels = kingStage(2, kingReignStarts, null)
    expect(pixels.length).toBe(6)
    expect(pixels[0]?.includes(0xf83800)).toBe(true)
    expect(pixels[1]?.filter(p => p === GOLD).length).toBe(5)
    expect(pixels[2]?.filter(p => p === WHITE).length).toBe(2)
    expect(pixels[3]?.filter(p => p === 0x0b0a0d).length).toBe(2)
    expect(pixels[4]?.filter(p => p === MOUTH).length).toBe(5)
    expect(pixels[5]?.filter(p => p !== null).length).toBe(13)
    expect(pixels[5]?.filter(p => p === 0x1878bc).length).toBe(13)
    expect(kingStage(2, kingReignStarts + 10, null)[2]?.includes(WHITE)).toBe(false)
  })

  test('both merged poses keep white eyes, pupils, a red grin and lower shading at their original sizes', () => {
    for (const [offset, width, height] of [[0, 13, 3], [KING_POSE_TICKS, 11, 5]] as const) {
      const pixels = kingStage(2, KING_GATHER_TICKS + offset, null)
      const occupied = pixels.filter(row => row.some(p => p !== null))
      expect(occupied.length).toBe(height)
      const columns = pixels[5]?.map((_, x) => x).filter(x => pixels.some(row => row[x] !== null)) ?? []
      expect(columns.length).toBe(width)
      expect(pixels.flat().filter(p => p === WHITE).length).toBe(2)
      expect(pixels.flat().filter(p => p === FAMILY[0]?.eye).length).toBe(2)
      expect(pixels[5]?.filter(p => p === MOUTH).length).toBe(3)
      expect(pixels[5]?.filter(p => p === FAMILY[0]?.shade).length).toBe(width - 3)
    }
  })

  test('needs two slimes of room', () => {
    expect(canCrown(1)).toBe(false)
    expect(canCrown(2)).toBe(true)
  })

  test('the slimes gather, the king reigns crowned, and they end back home', () => {
    expect(hasGold(kingStage(4, 0, 0))).toBe(false)
    expect(hasGold(kingStage(4, kingReignStarts, HOP_TICKS))).toBe(true)
    expect(kingStage(4, KING_SHOW_TICKS - 1, HOP_TICKS)).toEqual(stage(4, HOP_TICKS))
  })

  type Pixels = (number | null)[][]
  const grounded = (pixels: Pixels) => (pixels[pixels.length - 1] ?? []).some(c => c !== null)
  const atTop = (pixels: Pixels) => pixels.slice(-1).every(row => row.every(c => c === null))
  const left = (pixels: Pixels) => Math.min(...pixels.map(row => row.findIndex(c => c !== null)).filter(x => x >= 0))
  const right = (pixels: Pixels) => Math.max(...pixels.map(row => row.findLastIndex(c => c !== null)))
  const at = (frame: number, count = 4) => kingStage(count, frame, null)
  const bodies = (pixels: Pixels) => FAMILY.filter(kin => pixels.some(row => row.includes(kin.body))).length
  const rise = KING_POSE_TICKS
  const top = 2 * KING_POSE_TICKS
  const fall = 3 * KING_POSE_TICKS
  const firstLanding = LEAP - KING_POSE_TICKS
  const secondCrouch = LEAP
  const collide = KING_GATHER_TICKS - KING_POSE_TICKS
  const splatStarts = KING_GATHER_TICKS
  const out = kingReignStarts + KING_REIGN_TICKS + KING_FLASH_TICKS
  const halfwayHome = out + firstLanding
  const lastCrouch = out + LEAP
  const homeLanding = out + 2 * LEAP - KING_POSE_TICKS

  test('the slimes leap toward the middle, moving only in the air', () => {
    // Crouched at home, up through the top of the leap, and landed halfway.
    expect(grounded(at(0))).toBe(true)
    expect(left(at(0))).toBe(0)
    expect([rise, top, fall].map(f => grounded(at(f)))).toEqual([false, false, false])
    expect(atTop(at(top))).toBe(true)
    expect(grounded(at(firstLanding))).toBe(true)
    expect(left(at(firstLanding))).toBeGreaterThan(0)
    // The second leap takes off from where the first landed.
    expect(at(secondCrouch)).toEqual(at(firstLanding))
  })

  test('the slimes collide in mid-air, further in than halfway, and land merged', () => {
    expect(grounded(at(collide))).toBe(false)
    expect(left(at(collide))).toBeGreaterThan(left(at(firstLanding)))
    // Pressed together, every one of them still shows.
    expect(bodies(at(collide))).toBe(4)
    // The next pose they are one splat on the floor, as wide as the king, in
    // the first slime's colours: not the four landed on one spot.
    const splat = at(splatStarts)
    expect(grounded(splat)).toBe(true)
    expect(right(splat) - left(splat) + 1).toBe(KING_WIDTH)
    expect(bodies(splat)).toBe(1)
    expect(splat.some(row => row.includes(FAMILY[0]?.body ?? -1))).toBe(true)
  })

  test('the slimes leap home in two hops, from where they collided', () => {
    // Out of the king where they met, so every slime that went in comes out;
    // both the crouch and the standing face span seven pixels.
    expect([left(at(out)), right(at(out))]).toEqual([left(at(collide)), right(at(collide))])
    expect(bodies(at(out))).toBe(4)
    expect(grounded(at(out))).toBe(true)
    expect(atTop(at(out + top))).toBe(true)
    expect(grounded(at(halfwayHome))).toBe(true)
    expect(left(at(halfwayHome))).toBeLessThan(left(at(out)))
    expect(left(at(halfwayHome))).toBeGreaterThan(0)
    expect(at(lastCrouch)).toEqual(at(halfwayHome))
    expect(atTop(at(lastCrouch + top))).toBe(true)
    expect(left(at(homeLanding))).toBe(0)
  })

  test('however many slimes, every one shows where they collide and leap out', () => {
    for (const count of [2, 3, 4]) {
      expect([count, bodies(at(collide, count)), bodies(at(out, count))]).toEqual([count, count, count])
    }
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
  const ui = await mount($, 'terminal', 10, 120)

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
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(true)
  // The show over, the next ask crowns again.
  await clock.advance(FRAME_MS * 2)
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
