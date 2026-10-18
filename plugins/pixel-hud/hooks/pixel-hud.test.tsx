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
  HOP_CROUCH_TICKS,
  HOP_FALL_TICKS,
  HOP_HANG_TICKS,
  HOP_LAND_TICKS,
  HOP_LAUNCH_TICKS,
  HOP_REBOUND_TICKS,
  HOP_RISE_TICKS,
  HOP_SETTLE_TICKS,
  HOP_TICKS,
  KING_DEFEAT_TICKS,
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
  kingStage,
  LEAP,
  momentEndTick,
  nextMoment,
  slimeCells,
  slimeColumns,
  slimeText,
  SLIME_WIDTH,
  stage,
  STAGE_ROWS,
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

// Raster cells are row-major [code point, foreground, background] u32s.
function slimeCellFace(cells: string, count: number, i: number) {
  const binary = atob(cells)
  const bytesPerSlime = SLIME_WIDTH * 3 * Uint32Array.BYTES_PER_ELEMENT
  return Array.from({ length: STAGE_ROWS }, (_, row) => {
    const start = (row * count + i) * bytesPerSlime
    return binary.slice(start, start + bytesPerSlime)
  })
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

  test('the King holds each kin at rest until its next grounded hop start', () => {
    const silhouette = (pixels: (number | null)[][]) => pixels.map(row => row.map(p => p !== null))
    for (const count of [2, 3, 4]) {
      const standing = stage(count, null)
      const crouching = kingStage(count, 0, null)
      for (let startTick = 0; startTick < 200; startTick += 1) {
        const king: Moment = { kind: 'king', startTick }
        const endpoint = startTick + KING_SHOW_TICKS
        expect(slimeCells(count, endpoint, king, 'hop')).toBe(slimeCells(count, 0, null, 'still'))
        const joined = Array<boolean>(count).fill(false)
        let allJoinedTick = endpoint + HOP_TICKS
        for (let tick = endpoint + 1; tick <= endpoint + HOP_TICKS; tick += 1) {
          const global = stage(count, tick, 'hop')
          const previous = stage(count, tick - 1, 'hop')
          const actual = kingStage(count, tick - startTick, tick, 'hop')
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
    expect(stretch[0]?.filter(p => p !== null)).toEqual([FAMILY[0]?.body])
    expect(stretch[5]?.filter(p => p !== null).length).toBe(3)
    expect(stage(1, fallTick, 'hop')).toEqual(stretch)
    expect(stage(1, reboundTick, 'hop')).toEqual(stretch)
    expect(stage(1, riseTick, 'hop')[5]?.every(p => p === null)).toBe(true)
    expect(stage(1, settleTick, 'hop')).toEqual(stage(1, null))
  })

  test('each kin blinks for one grounded tick strictly inside every third hop rest', () => {
    const restSequences = [[6, 10, 14], [9, 14, 7], [12, 6, 10], [14, 8, 11]]
    const phaseTicks = [0, 3, 7, 12]
    const blinkOffsets: number[] = []
    for (const [i, rests] of restSequences.entries()) {
      const standing = slimeFace(stage(4, null), i)
      const blinking = standing.map((row, r) => row.map((pixel, c) => r === EYE_ROW && (c === LEFT_EYE_COLUMN || c === RIGHT_EYE_COLUMN) ? FAMILY[i]?.body : pixel))
      let crouchTick = -(phaseTicks[i] ?? 0)
      for (let cycle = 0; cycle < BLINK_EVERY_CYCLES * 2; cycle += 1) {
        const restTicks = rests[cycle % rests.length] ?? 0
        const restStart = crouchTick + HOP_TICKS
        const nextCrouch = restStart + restTicks
        const blinks: number[] = []
        for (let tick = Math.max(0, crouchTick); tick < nextCrouch; tick += 1) {
          const face = slimeFace(stage(4, tick, 'hop'), i)
          if (tick < restStart) expect(face).not.toEqual(blinking)
          else if (JSON.stringify(face) === JSON.stringify(blinking)) blinks.push(tick)
          else expect(face).toEqual(standing)
        }
        if (cycle % BLINK_EVERY_CYCLES === BLINK_EVERY_CYCLES - 1) {
          expect(blinks.length).toBe(1)
          const blinkTick = blinks[0] ?? 0
          expect(blinkTick).toBeGreaterThan(restStart)
          expect(blinkTick).toBeLessThan(nextCrouch - 1)
          // Even the shortest six-tick rest has standing ticks on both sides.
          expect(blinkTick - restStart).toBeLessThan(6 - 1)
          expect(slimeFace(stage(4, blinkTick - 1, 'hop'), i)).toEqual(standing)
          expect(slimeFace(stage(4, blinkTick + 1, 'hop'), i)).toEqual(standing)
          if (cycle < BLINK_EVERY_CYCLES) blinkOffsets.push(blinkTick - restStart)
        } else expect(blinks).toEqual([])
        crouchTick = nextCrouch
      }
    }
    expect(new Set(blinkOffsets).size).toBe(FAMILY.length)
  })

  test('hop rests vary by kin and cycle, within six to fourteen ticks, deterministically', () => {
    const observationTicks = 200
    const movingTicks = HOP_TICKS
    const launchOffset = 2
    const riseOffset = 3
    const minRestTicks = 6
    const maxRestTicks = 14
    const expectedRests = [[6, 10, 14], [14, 7, 9], [6, 10, 12], [8, 11, 14]]
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
      }
      const rests = crouches.slice(1).map((tick, cycle) => tick - (crouches[cycle] ?? 0) - movingTicks)
      expect(rests.slice(0, 3)).toEqual(expectedRests[i])
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
  expect((await $.command.run(KING)).text).toBe('But there was no room for a King Slime! Widen the terminal.')
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

const hopLaunch = HOP_CROUCH_TICKS
const hopRise = hopLaunch + HOP_LAUNCH_TICKS
const hopTop = hopRise + HOP_RISE_TICKS
const hopFall = hopTop + HOP_HANG_TICKS
const hopLanding = hopFall + HOP_FALL_TICKS
const hopRebound = hopLanding + HOP_LAND_TICKS
const hopSettle = hopRebound + HOP_REBOUND_TICKS
const floorRow = STAGE_ROWS * 2 - 1
const kingDropStarts = KING_GATHER_TICKS + KING_MERGE_TICKS
const kingReignStarts = KING_GATHER_TICKS + KING_MERGE_TICKS + KING_DROP_TICKS + KING_FLASH_TICKS

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
  test('gather uses crouch, stretch, airborne stand, landing and rebound poses', () => {
    const crouch = 0
    const launch = hopLaunch
    const rise = hopRise
    const land = hopLanding
    const rebound = hopRebound
    const settle = hopSettle
    const home = kingStage(4, crouch, null)
    expect(home.slice(0, 2).flat().every(p => p === null)).toBe(true)
    for (let i = 0; i < 4; i += 1) expect(home[floorRow]?.slice(i * SLIME_WIDTH, (i + 1) * SLIME_WIDTH)).toEqual([
      FAMILY[i]?.shade, FAMILY[i]?.shade, FAMILY[i]?.shade, MOUTH, FAMILY[i]?.shade, FAMILY[i]?.shade, FAMILY[i]?.shade,
    ])
    const launchTips = kingStage(4, launch, null)[0]
    expect(launchTips?.flatMap((p, x) => p === null ? [] : [x])).toEqual(FAMILY.map((_, i) => i * SLIME_WIDTH + Math.floor(SLIME_WIDTH / 2)))
    expect(kingStage(4, rise, null)[5]?.every(p => p === null)).toBe(true)
    expect(kingStage(4, land, null).slice(0, 2).flat().every(p => p === null)).toBe(true)
    const fall = hopFall
    expect(kingStage(4, rebound, null)[0]).toEqual(kingStage(4, fall, null)[0])
    expect(kingStage(4, settle, null)[0]?.every(p => p === null)).toBe(true)
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
    expect(height(kingStage(4, dropStarts, null))).toBeLessThan(6)
    expect(kingStage(4, dropStarts, null)[5]?.every(p => p === null)).toBe(true)
    expect(height(kingStage(4, squashStarts, null))).toBe(5)
    expect(width(kingStage(4, squashStarts, null))).toBe(KING_WIDTH + 2)
    expect(width(kingStage(2, squashStarts, null))).toBe(slimeColumns(2))
    expect(kingStage(4, rebound, null)[5]?.every(p => p === null)).toBe(true)
    expect(hasGold(kingStage(4, reignStarts, null))).toBe(true)
    const defeat = Array.from({ length: KING_DEFEAT_TICKS }, (_, step) => kingStage(4, defeatStarts + step, null))
    expect(defeat.map(pixels => pixels.flat().every(p => p === null))).toEqual([true, false, true, false, true, false])
    expect(kingStage(4, poofStarts, null).flat().filter(p => p !== null).every(p => p === WHITE)).toBe(true)
    expect(KING_SHOW_TICKS).toBe(86)
  })

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
    const kingBlink = kingReignStarts + 10
    expect(kingStage(2, kingBlink, null)[2]?.includes(WHITE)).toBe(false)
  })

  test('both merged poses keep white eyes, pupils, a red grin and lower shading at their original sizes', () => {
    for (const [offset, width, height] of [[0, 13, 3], [KING_MERGE_TICKS / 2, 11, 5]] as const) {
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
    expect(kingStage(4, KING_SHOW_TICKS, HOP_TICKS, 'hop')).toEqual(stage(4, null))
  })

  type Pixels = (number | null)[][]
  const grounded = (pixels: Pixels) => (pixels[pixels.length - 1] ?? []).some(c => c !== null)
  const atTop = (pixels: Pixels) => pixels.slice(-1).every(row => row.every(c => c === null))
  const left = (pixels: Pixels) => Math.min(...pixels.map(row => row.findIndex(c => c !== null)).filter(x => x >= 0))
  const right = (pixels: Pixels) => Math.max(...pixels.map(row => row.findLastIndex(c => c !== null)))
  const at = (frame: number, count = 4) => kingStage(count, frame, null)
  const bodies = (pixels: Pixels) => FAMILY.filter(kin => pixels.some(row => row.includes(kin.body))).length
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
    // The highlight sits at x + 3 in every leap pose, even as width changes.
    const xOf = (pixels: Pixels, i: number) => pixels.flatMap(row => row.flatMap((p, x) => p === FAMILY[i]?.highlight ? [x] : []))[0]
    for (const count of [2, 3, 4]) {
      for (const [start, length] of [[0, LEAP], [LEAP, KING_GATHER_TICKS - LEAP], [out, KING_SCATTER_TICKS]] as const) {
        for (let frame = Math.max(1, start); frame < start + length; frame += 1) {
          const current = at(frame, count)
          if (!grounded(current)) continue
          const previous = at(frame - 1, count)
          for (let i = 0; i < count; i += 1) {
            expect(xOf(current, i)).toBeDefined()
            expect(xOf(current, i)).toBe(xOf(previous, i))
          }
        }
      }
    }
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

  test('the airborne collision keeps every body tip inside the stage', () => {
    for (const count of [2, 3, 4]) {
      const pixels = at(collide, count)
      expect(grounded(pixels)).toBe(false)
      for (const kin of FAMILY.slice(0, count)) expect(pixels[0]?.includes(kin.body)).toBe(true)
      expect(pixels[0]?.filter(p => p !== null).length).toBe(count)
    }
  })

  test('scatter bursts from the collision in one airborne arc and lands home squashed', () => {
    // The shared BHB row stays at the collision x positions across poses.
    expect(at(out)[0]).toEqual(at(collide)[1])
    expect(bodies(at(out))).toBe(4)
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

test('the King show holds grounded kin until each can rejoin the global hop', { options: { slimesHop: true } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  answers(on, { name: 'main', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 120)
  const count = Number((await ui.find({ type: 'Raster', key: 'slimes' }))?.props.columns) / SLIME_WIDTH
  const showStart = 12
  await clock.advance(FRAME_MS * showStart)
  await $.command.run(KING)
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits[blits.length - 1]).toBe(slimeCells(count, 0, null, 'still'))
  const king: Moment = { kind: 'king', startTick: showStart }
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
  expect(registered).toEqual([{ name: 'slime-king', description: 'Call the slimes together to form a King Slime' }])

  // Nothing drawn yet: no stage for a king.
  expect((await $.command.run(KING)).text).toBe('But there was no room for a King Slime! Widen the terminal.')

  const ui = await mount($, 'terminal', 10, 120)
  expect((await $.command.run(KING)).text).toBe('The slimes band together... A King Slime appears!')
  // Asking again mid-show is not a question of room.
  expect((await $.command.run(KING)).text).toBe('The King Slime is already here!')
  await clock.advance(FRAME_MS * KING_SHOW_TICKS)
  expect(blits.some(goldIn)).toBe(true)
  // The show over, the next ask crowns again.
  await clock.advance(FRAME_MS * 2)
  expect((await $.command.run(KING)).text).toBe('The slimes band together... A King Slime appears!')
  await ui.unmount()
})

test('/slime-king finds no room when the band only fits the branch', async ($, on) => {
  answers(on, { name: 'feature/slimes', porcelain: '', isRepo: true })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await mount($, 'terminal', 10, 30)
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
