import { expect, mock, test } from 'claude-code/testing'

import { BATTLE_APPROACH_TICKS, QUEST_STAGE } from './quest'
import { FRAME_MS, STAGE_ROWS } from './stage'

function slimePixels(cells: string) {
  const bytes = Uint8Array.from(atob(cells), ch => ch.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer)
  const width = words.length / (STAGE_ROWS * 3)
  return Array.from({ length: STAGE_ROWS * 2 }, (_, row) =>
    Array.from({ length: width }, (_, col) => {
      const offset = (Math.floor(row / 2) * width + col) * 3
      const glyph = words[offset]
      if (row % 2 === 0) return glyph === 0x2580 ? words[offset + 1] ?? null : null
      if (glyph === 0x2584) return words[offset + 1] ?? null
      return glyph === 0x2580 && words[offset + 2] !== 0x01000000 ? words[offset + 2] ?? null : null
    }),
  )
}

test('a short main answer battles without restarting for another answer', { options: { stage: 'quest', slimesIdle: false } }, async ($, on) => {
  const clock = mock.clock(on)
  const blits: string[] = []
  on('ui.blit', async (_$, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  on('process.run', async (_$, e) => ({ value: { exitCode: 0, stdout: e.argv.includes('rev-parse') ? 'main\n' : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.model', async () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000, tokens: 0, percent: 0 }, rateLimits: [] } }))
  on('command.register', async () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', async () => ({ text: 'done' }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 } as never })
  const room = QUEST_STAGE.maxRoom
  const startTick = QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, room, 'still')
  await clock.advance(FRAME_MS * startTick)
  const answer = { answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as const
  await $.turn.complete(answer)
  const battle = { kind: 'battle', startTick, monster: 'bat', skill: 'thunder' } as const
  const frames = [blits.at(-1)]
  expect(frames[0]).toBe(QUEST_STAGE.cells(room, startTick, battle, 'still'))
  await clock.advance(FRAME_MS)
  await $.turn.complete(answer)
  frames.push(blits.at(-1))
  const end = QUEST_STAGE.momentEndTick(battle, room, 'still')
  for (let tick = startTick + 2; tick <= end; tick += 1) {
    await clock.advance(FRAME_MS)
    frames.push(blits.at(-1))
  }
  for (let frame = 0; frame < frames.length; frame += 1) {
    expect(frames[frame]).toBe(QUEST_STAGE.cells(room, startTick + frame, battle, 'still'))
  }
  expect(slimePixels(frames[BATTLE_APPROACH_TICKS]!).flat()).toContain(0x9878f8)
  expect(frames.some(cells => slimePixels(cells!).flat().includes(0xf8d878))).toBe(true)
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, end, null, 'still'))
  await ui.unmount()
})


