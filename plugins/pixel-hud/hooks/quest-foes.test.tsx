import { expect, test } from 'claude-code/testing'

import { FIREBALL_TICKS, paintMonster, paintSkill, SLASH_TICKS, THUNDER_TICKS } from './quest-foes'

function blank(columns = 12): (number | null)[][] {
  return Array.from({ length: 6 }, () => Array<number | null>(columns).fill(null))
}

test('the quest slime is a green, grounded silhouette with eyes', () => {
  const pixels = blank()
  paintMonster(pixels, 'slime', 2, 0)
  expect(pixels.map(row => row.map(p => p === null ? '.' : '#').join(''))).toEqual([
    '............',
    '............',
    '....###.....',
    '...#####....',
    '..#######...',
    '...#####....',
  ])
  expect(pixels.flat()).toContain(0x38c838)
  expect(pixels.flat()).toContain(0x0b0a0d)
})

for (const monster of ['bat', 'skeleton', 'ghost'] as const) {
  test(`${monster} paints a bounded NES-colour silhouette`, () => {
    const pixels = blank()
    paintMonster(pixels, monster, 2, 0)
    expect(pixels.flat().some(p => p !== null)).toBe(true)
    expect(pixels.length).toBe(6)
    expect(pixels.every(row => row.length === 12)).toBe(true)
    expect(pixels.every(row => row.slice(0, 2).every(p => p === null) && row.slice(9).every(p => p === null))).toBe(true)
    const body = { bat: 0x9878f8, skeleton: 0xfcfcfc, ghost: 0xbcf0fc }[monster]
    expect(pixels.flat()).toContain(body)
  })
}

for (const monster of ['bat', 'ghost'] as const) {
  test(`${monster} alternates two poses and repeats`, () => {
    const first = blank()
    const second = blank()
    const repeated = blank()
    paintMonster(first, monster, 2, 0)
    paintMonster(second, monster, 2, 1)
    paintMonster(repeated, monster, 2, 2)
    expect(second).not.toEqual(first)
    expect(repeated).toEqual(first)
    if (monster === 'ghost') {
      expect(second.slice(0, -1)).toEqual(first.slice(1))
      expect(second[5]).toEqual(Array(12).fill(null))
    }
  })
}

test('slash leaves a white diagonal over the foe for two ticks', () => {
  for (const frame of [0, 1]) {
    const pixels = blank()
    paintSkill(pixels, 'slash', 2, frame)
    expect(pixels.map(row => row.map(p => p === null ? '.' : '#').join(''))).toEqual([
      '............',
      '......#.....',
      '.....#......',
      '....#.......',
      '...#........',
      '..#.........',
    ])
    expect(pixels.flat().filter(p => p !== null).every(p => p === 0xfcfcfc)).toBe(true)
  }
  const ended = blank()
  paintSkill(ended, 'slash', 2, SLASH_TICKS)
  expect(ended.flat().every(p => p === null)).toBe(true)
})

test('fireball travels right one pixel per tick as an orange two-by-two ball, then expires', () => {
  for (let frame = 0; frame < FIREBALL_TICKS; frame += 1) {
    const pixels = blank()
    paintSkill(pixels, 'fireball', 2, frame)
    const lit = pixels.flatMap((row, y) => row.flatMap((p, x) => p === null ? [] : [[x, y, p]]))
    expect(lit).toEqual([
      [2 + frame, 2, 0xfca044],
      [3 + frame, 2, 0xfca044],
      [2 + frame, 3, 0xfca044],
      [3 + frame, 3, 0xfca044],
    ])
  }
  const ended = blank()
  paintSkill(ended, 'fireball', 2, FIREBALL_TICKS)
  expect(ended.flat().every(p => p === null)).toBe(true)
})

test('thunder drops a yellow zigzag from the top for three ticks', () => {
  for (const frame of [0, 1, 2]) {
    const pixels = blank()
    paintSkill(pixels, 'thunder', 2, frame)
    expect(pixels.map(row => row.map(p => p === null ? '.' : '#').join(''))).toEqual([
      '....#.......',
      '...#........',
      '..###.......',
      '....#.......',
      '...#........',
      '..#.........',
    ])
    expect(pixels.flat().filter(p => p !== null).every(p => p === 0xf8d878)).toBe(true)
  }
  const ended = blank()
  paintSkill(ended, 'thunder', 2, THUNDER_TICKS)
  expect(ended.flat().every(p => p === null)).toBe(true)
})

test('painting clips at either edge and preserves transparent pixels and other rows', () => {
  const left = blank()
  const right = blank()
  paintMonster(left, 'slime', -6, 0)
  paintMonster(right, 'slime', 11, 0)
  expect(left[4]).toEqual([0x38c838, ...Array(11).fill(null)])
  expect(right[4]).toEqual([...Array(11).fill(null), 0x38c838])
  expect(left.every(row => row.length === 12)).toBe(true)
  expect(right.every(row => row.length === 12)).toBe(true)

  const background = blank().map(row => row.map(() => 0x123456))
  paintMonster(background, 'slime', 2, 0)
  expect(background[0]).toEqual(Array(12).fill(0x123456))
  expect(background[2]?.[2]).toBe(0x123456)
  expect(background[2]?.[4]).toBe(0xb8f818)
  paintSkill(background, 'thunder', 11, 0)
  expect(background[2]?.[11]).toBe(0xf8d878)
  expect(background.every(row => row.length === 12)).toBe(true)
})

test('the skeleton skull encloses its dark eyes in bone white', () => {
  const pixels = blank()
  paintMonster(pixels, 'skeleton', 2, 0)
  expect(pixels[1]?.slice(2, 7)).toEqual([0xfcfcfc, 0x0b0a0d, 0xfcfcfc, 0x0b0a0d, 0xfcfcfc])
})
