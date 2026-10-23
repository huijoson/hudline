import { expect, test } from 'claude-code/testing'

import { FIREBALL_TICKS, MONSTERS, paintMonster, paintSkill, SLASH_TICKS, THUNDER_TICKS } from './quest-foes'
import { QUEST_ROWS } from './quest-hero'

const LEFT = 2
// The widest foe, the bat, with two empty columns on each side.
const COLUMNS = LEFT + MONSTERS.bat.frames[0]!.sprite[0]!.length + LEFT

function blank(columns = COLUMNS): (number | null)[][] {
  return Array.from({ length: QUEST_ROWS * 2 }, () => Array<number | null>(columns).fill(null))
}

function silhouette(pixels: (number | null)[][]): string[] {
  return pixels.map(row => row.map(p => p === null ? '.' : '#').join(''))
}

test('the quest slime keeps its literal green eight-letter palette', () => {
  expect(MONSTERS.slime.palette).toEqual({
    B: 0x38c838, L: 0x38c838, H: 0xb8f818, D: 0x008800,
    E: 0x008800, W: 0xfcfcfc, K: 0x0b0a0d, M: 0xf87858,
  })
})

test('the quest slime is a green, grounded silhouette with eyes', () => {
  const pixels = blank()
  paintMonster(pixels, 'slime', LEFT, 0)
  expect(silhouette(pixels)).toEqual([
    '....................',
    '....................',
    '....................',
    '.......#............',
    '.......#............',
    '.......#............',
    '......###...........',
    '.....#####..........',
    '....#######.........',
    '...#########........',
    '..###########.......',
    '..###########.......',
    '..###########.......',
    '..###########.......',
    '...#########........',
    '....#######.........',
  ])
  expect(pixels.flat()).toContain(0x38c838)
  expect(pixels.flat()).toContain(0x0b0a0d)
  expect(pixels.flat()).toContain(0xf87858)
})

for (const monster of ['bat', 'skeleton', 'ghost'] as const) {
  test(`${monster} paints a bounded NES-colour silhouette`, () => {
    const pixels = blank()
    paintMonster(pixels, monster, LEFT, 0)
    expect(pixels.flat().some(p => p !== null)).toBe(true)
    expect(pixels.length).toBe(QUEST_ROWS * 2)
    expect(pixels.every(row => row.length === COLUMNS)).toBe(true)
    const width = MONSTERS[monster].frames[0]!.sprite[0]!.length
    expect(pixels.every(row => row.slice(0, LEFT).every(p => p === null) && row.slice(LEFT + width).every(p => p === null))).toBe(true)
    const body = { bat: 0x8058e0, skeleton: 0xf0f0e8, ghost: 0xd8f4fc }[monster]
    expect(pixels.flat()).toContain(body)
  })
}

for (const monster of ['bat', 'ghost'] as const) {
  test(`${monster} alternates two poses and repeats`, () => {
    const first = blank()
    const second = blank()
    const repeated = blank()
    paintMonster(first, monster, LEFT, 0)
    paintMonster(second, monster, LEFT, 1)
    paintMonster(repeated, monster, LEFT, 2)
    expect(second).not.toEqual(first)
    expect(repeated).toEqual(first)
    if (monster === 'ghost') {
      expect(second.slice(0, -2)).toEqual(first.slice(2))
      expect(second.slice(-2)).toEqual([Array(COLUMNS).fill(null), Array(COLUMNS).fill(null)])
    }
  })
}

test('slash leaves a white diagonal with a blue edge over the foe for two ticks', () => {
  for (let frame = 0; frame < SLASH_TICKS; frame += 1) {
    const pixels = blank()
    paintSkill(pixels, 'slash', LEFT, frame)
    expect(silhouette(pixels)).toEqual([
      '....................',
      '....................',
      '....................',
      '....................',
      '.............#......',
      '............##......',
      '...........##.......',
      '..........##........',
      '.........##.........',
      '........##..........',
      '.......##...........',
      '......##............',
      '.....##.............',
      '....##..............',
      '...##...............',
      '..#.................',
    ])
    expect(new Set(pixels.flat().filter(p => p !== null))).toEqual(new Set([0xfcfcfc, 0x8cc8fc]))
  }
  const ended = blank()
  paintSkill(ended, 'slash', LEFT, SLASH_TICKS)
  expect(ended.flat().every(p => p === null)).toBe(true)
})

test('fireball travels right one pixel per tick, flickering between two poses on the blade, then expires', () => {
  const O = 0xf85818
  const Y = 0xfcd848
  const W = 0xfcfcfc
  const poses = [
    [
      [null, null, O, O, null, null],
      [null, O, Y, Y, O, null],
      [O, Y, W, W, Y, O],
      [O, Y, W, W, Y, O],
      [null, O, Y, Y, O, null],
      [null, null, O, O, null, null],
    ],
    [
      [null, O, null, null, O, null],
      [O, O, Y, Y, O, O],
      [null, Y, W, W, Y, null],
      [null, Y, W, W, Y, O],
      [O, O, Y, Y, O, null],
      [null, null, O, null, O, null],
    ],
  ]
  // The ATTACK blade fills pixel rows 7 and 8 and the ball's white core sits on
  // them. A literal, because the code derives the lift from the same blade.
  const top = 5
  for (let frame = 0; frame < FIREBALL_TICKS; frame += 1) {
    const pixels = blank()
    paintSkill(pixels, 'fireball', LEFT, frame)
    const pose = poses[frame % 2]!
    expect(pixels.slice(top, top + pose.length).map(row => row.slice(LEFT + frame, LEFT + frame + pose[0]!.length))).toEqual(pose)
    expect(pixels.flat().filter(p => p !== null).length).toBe(pose.flat().filter(p => p !== null).length)
  }
  const ended = blank()
  paintSkill(ended, 'fireball', LEFT, FIREBALL_TICKS)
  expect(ended.flat().every(p => p === null)).toBe(true)
})

test('thunder drops a yellow zigzag from the top for three ticks', () => {
  const bolt = [
    '.......##...........',
    '......##............',
    '.....##.............',
    '....###.............',
    '...######...........',
    '.....###............',
    '....###.............',
    '...###..............',
    '..#####.............',
    '....###.............',
    '...##...............',
    '..##................',
    '..#.................',
    '....................',
    '....................',
    '....................',
  ]
  for (let frame = 0; frame < THUNDER_TICKS; frame += 1) {
    const pixels = blank()
    paintSkill(pixels, 'thunder', LEFT, frame)
    expect(silhouette(pixels)).toEqual(bolt.map((row, y) => y < [bolt.length / 4, bolt.length / 2, bolt.length][frame]! ? row : '.'.repeat(COLUMNS)))
    expect(new Set(pixels.flat().filter(p => p !== null))).toEqual(new Set([0xfcd848, 0xfcfcfc]))
  }
  const ended = blank()
  paintSkill(ended, 'thunder', LEFT, THUNDER_TICKS)
  expect(ended.flat().every(p => p === null)).toBe(true)
})

test('painting clips at either edge and preserves transparent pixels and other rows', () => {
  const left = blank()
  const right = blank()
  const slimeWidth = MONSTERS.slime.frames[0]!.sprite[0]!.length
  paintMonster(left, 'slime', 1 - slimeWidth, 0)
  paintMonster(right, 'slime', COLUMNS - 1, 0)
  expect(left[12]).toEqual([0x008800, ...Array(COLUMNS - 1).fill(null)])
  expect(right[12]).toEqual([...Array(COLUMNS - 1).fill(null), 0x38c838])
  expect(left.every(row => row.length === COLUMNS)).toBe(true)
  expect(right.every(row => row.length === COLUMNS)).toBe(true)

  const background = blank().map(row => row.map(() => 0x123456))
  paintMonster(background, 'slime', LEFT, 0)
  expect(background[0]?.[LEFT]).toBe(0x123456)
  expect(background[2]?.[LEFT]).toBe(0x123456)
  expect(background[7]?.[LEFT + 3]).toBe(0xb8f818)
  paintSkill(background, 'thunder', COLUMNS - 6, THUNDER_TICKS - 1)
  expect(background[0]?.[COLUMNS - 1]).toBe(0xfcd848)
  expect(background.every(row => row.length === COLUMNS)).toBe(true)
})

test('the skeleton skull encloses its dark eyes in bone white', () => {
  const pixels = blank()
  paintMonster(pixels, 'skeleton', LEFT, 0)
  const B = 0xf0f0e8
  const K = 0x0b0a0d
  expect(pixels[3]?.slice(LEFT + 2, LEFT + 12)).toEqual([B, K, K, B, B, B, K, K, B, B])
})
