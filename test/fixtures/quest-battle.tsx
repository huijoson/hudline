import { expect, mock, test } from 'claude-code/testing'

import { BATTLE_APPROACH_TICKS, QUEST_STAGE } from './quest'
import { QUEST_ROWS } from './quest-hero'
import { FRAME_MS } from './stage'
import { MONSTERS, SKILLS } from './quest-foes'
import type { Monster, Skill } from './quest-foes'

function slimePixels(cells: string) {
  const bytes = Uint8Array.from(atob(cells), ch => ch.charCodeAt(0))
  const words = new Uint32Array(bytes.buffer)
  const width = words.length / (QUEST_ROWS * 3)
  return Array.from({ length: QUEST_ROWS * 2 }, (_, row) =>
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
  const battle = { kind: 'battle', startTick, monster: randomMonster, skill: randomSkill } as const
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
  expect(slimePixels(frames[BATTLE_APPROACH_TICKS]!).flat()).toContain(MONSTERS[randomMonster].palette.B)
  expect(frames.some(cells => slimePixels(cells!).flat().includes(SKILLS[randomSkill].palette.W))).toBe(true)
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, end, null, 'still'))
  await ui.unmount()
})

const monsters = Object.keys(MONSTERS) as Monster[]
const skills = Object.keys(SKILLS) as Skill[]
const picks = [1 / monsters.length, 0.67]
const randomMonster = monsters[Math.floor(picks[0]! * monsters.length)]!
const randomSkill = skills[Math.floor(picks[1]! * skills.length)]!
const cases: { args: string; monster: Monster; skill: Skill }[] = [
  { args: '', monster: randomMonster, skill: randomSkill },
  { args: 'SKELETON', monster: 'skeleton', skill: randomSkill },
  { args: 'FIREBALL', monster: randomMonster, skill: 'fireball' },
  { args: 'ghost slash', monster: 'ghost', skill: 'slash' },
  { args: 'slash ghost', monster: 'ghost', skill: 'slash' },
  { args: 'king cobra thunder', monster: 'cobra', skill: 'thunder' },
  { args: 'thunder metal slime', monster: 'metalSlime', skill: 'thunder' },
  { args: 'Metal Slime', monster: 'metalSlime', skill: randomSkill },
  ...monsters.map(monster => ({ args: MONSTERS[monster].name.replace(/[\s-]/g, '').toUpperCase(), monster, skill: randomSkill })),
]

for (const { args, monster, skill } of cases) {
  test(`/quest-battle ${args} summons the named battle immediately`, { options: { stage: 'quest', slimesIdle: false } }, async ($, on) => {
    const clock = mock.clock(on)
    const blits: string[] = []
    on('ui.blit', async (_$, e) => {
      if ('cells' in e) blits.push(e.cells)
      return { value: {} }
    })
    on('process.run', async (_$, e) => ({ value: { exitCode: 0, stdout: e.argv.includes('rev-parse') ? 'main\n' : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
    on('session.model', async () => ({ value: 'claude-opus-5-5' }))
    on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000, tokens: 0, percent: 0 }, rateLimits: [] } }))
    const registered: { name: string; argumentHint?: string }[] = []
    on('command.register', async (_$, e) => { registered.push(e); return { value: undefined } as never })
    on('session.start', (_$, e) => ({ cwd: e.cwd }))
    on('turn.complete', async () => ({ text: 'done' }))
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    expect(registered.find(command => command.name === 'quest-battle')).toEqual({ name: 'quest-battle', description: 'Summon a monster for the hero to fight', argumentHint: '[monster] [skill]' })
    const ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 } as never })
    const room = QUEST_STAGE.maxRoom
    const startTick = QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, room, 'still')
    await clock.advance(FRAME_MS * startTick)
    const command = { command: 'quest-battle', args }
    expect((await $.command.run(command)).text).toBe(`A ${MONSTERS[monster].name} draws near! The hero uses ${SKILLS[skill].name}!`)
    const battle = { kind: 'battle', startTick, monster, skill } as const
    expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, startTick, battle, 'still'))
    const end = QUEST_STAGE.momentEndTick(battle, room, 'still')
    for (let tick = startTick + 1; tick < end; tick += 1) {
      await clock.advance(FRAME_MS)
      if (tick === startTick + 2) {
        expect((await $.command.run({ ...command, args: 'slime thunder' })).text).toBe('But the hero is already fighting!')
        await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
      }
      expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, tick, battle, 'still'))
    }
    await ui.unmount()
  })
}

for (const stage of ['quest', 'slimes']) {
  test(`/quest-battle handles invalid arguments and unavailable room on ${stage}`, { options: { stage, slimesIdle: false } }, async ($, on) => {
    const clock = mock.clock(on)
    const blits: string[] = []
    on('ui.blit', async (_$, e) => { if ('cells' in e) blits.push(e.cells); return { value: {} } })
    on('process.run', async (_$, e) => ({ value: { exitCode: 0, stdout: e.argv.includes('rev-parse') ? 'main\n' : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
    on('session.model', async () => ({ value: 'claude-opus-5-5' }))
    on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000, tokens: 0, percent: 0 }, rateLimits: [] } }))
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', (_$, e) => ({ cwd: e.cwd }))
    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    for (const bodyColumns of [120, 30]) {
      const ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns } as never })
      const settleTicks = 100
      await clock.advance(FRAME_MS * settleTicks)
      const before = blits.length
      for (const args of ['__unknown_monster__', 'slime __unknown_monster__', 'slime ghost', 'slash thunder', 'slime slash ghost', 'king cobra thunder extra', 'thunder metal slime slash']) {
        expect((await $.command.run({ command: 'quest-battle', args })).text).toBe(`But that battle is unknown! Monsters: ${monsters.join(', ')}. Skills: ${skills.join(', ')}. Choose one of each, or leave either to fate.`)
        expect(blits.length).toBe(before)
      }
      if (stage === 'slimes' || bodyColumns === 30) {
        expect((await $.command.run({ command: 'quest-battle' })).text).toBe(stage === 'slimes' ? 'But there is no hero here. The slimes carry on.' : 'But there was no room for a battle! Widen the terminal.')
        expect(blits.length).toBe(before)
      } else {
        const reply = (await $.command.run({ command: 'quest-battle' })).text
        expect(reply).toBe(`A ${MONSTERS[randomMonster].name} draws near! The hero uses ${SKILLS[randomSkill].name}!`)
        await clock.advance(FRAME_MS * BATTLE_APPROACH_TICKS)
        expect(blits.at(-1)).toBe(QUEST_STAGE.cells(QUEST_STAGE.maxRoom, settleTicks + BATTLE_APPROACH_TICKS, { kind: 'battle', startTick: settleTicks, monster: randomMonster, skill: randomSkill }, 'still'))
      }
      await ui.unmount()
    }
  })
}

test('/quest-battle waits while compaction levels up the hero', { options: { stage: 'quest', slimesIdle: false } }, async ($, on) => {
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
  on('classic.PostCompact', async () => ({}) as never)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 } as never })
  const room = QUEST_STAGE.maxRoom
  const startTick = QUEST_STAGE.momentEndTick({ kind: 'encounter', startTick: 0 }, room, 'still')
  await clock.advance(FRAME_MS * startTick)
  await $.classic.PostCompact({ compact_summary: 'The conversation so far, compacted.', trigger: 'auto' } as never)
  const levelUp = { kind: 'level-up', startTick } as const
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, startTick, levelUp, 'still'))
  const before = blits.length
  expect((await $.command.run({ command: 'quest-battle', args: 'slime thunder' })).text).toBe('But the hero is busy! Try again in a moment.')
  expect(blits.length).toBe(before)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
  const end = QUEST_STAGE.momentEndTick(levelUp, room, 'still')
  for (let tick = startTick + 1; tick <= end; tick += 1) {
    await clock.advance(FRAME_MS)
    expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, tick, levelUp, 'still'))
  }
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, end, null, 'still'))
  await clock.advance(FRAME_MS * BATTLE_APPROACH_TICKS)
  expect(blits.at(-1)).toBe(QUEST_STAGE.cells(room, end + BATTLE_APPROACH_TICKS, null, 'still'))
  await ui.unmount()
})
