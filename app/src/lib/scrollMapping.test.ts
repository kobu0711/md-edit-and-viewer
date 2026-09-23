import { describe, expect, it } from 'vitest'

import { lineForTop, topForLine, type LinePosition } from '@/lib/scrollMapping'

const positions: LinePosition[] = [
  { line: 1, top: 0 },
  { line: 5, top: 100 },
  { line: 9, top: 300 },
]

describe('topForLine', () => {
  it('対応点そのものの位置を返す', () => {
    expect(topForLine(positions, 1)).toBe(0)
    expect(topForLine(positions, 5)).toBe(100)
    expect(topForLine(positions, 9)).toBe(300)
  })

  it('対応点の間は線形補間する', () => {
    expect(topForLine(positions, 3)).toBe(50)
    expect(topForLine(positions, 7)).toBe(200)
  })

  it('行の小数部も補間に反映する（折り返し行の途中を表現するため）', () => {
    expect(topForLine(positions, 2.5)).toBe(37.5)
  })

  it('範囲外は両端にクランプする', () => {
    expect(topForLine(positions, -10)).toBe(0)
    expect(topForLine(positions, 999)).toBe(300)
  })

  it('対応点が1つだけならその位置を返す', () => {
    expect(topForLine([{ line: 4, top: 80 }], 1)).toBe(80)
    expect(topForLine([{ line: 4, top: 80 }], 100)).toBe(80)
  })

  it('対応点が無ければ null を返す', () => {
    expect(topForLine([], 3)).toBeNull()
  })
})

describe('lineForTop', () => {
  it('位置から行番号へ逆方向に補間する', () => {
    expect(lineForTop(positions, 0)).toBe(1)
    expect(lineForTop(positions, 50)).toBe(3)
    expect(lineForTop(positions, 200)).toBe(7)
    expect(lineForTop(positions, 300)).toBe(9)
  })

  it('範囲外は両端にクランプする', () => {
    expect(lineForTop(positions, -50)).toBe(1)
    expect(lineForTop(positions, 10_000)).toBe(9)
  })

  it('往復させても元の値に戻る', () => {
    const line = 6.25
    const top = topForLine(positions, line)
    expect(top).not.toBeNull()
    expect(lineForTop(positions, top!)).toBeCloseTo(line, 10)
  })

  it('対応点が無ければ null を返す', () => {
    expect(lineForTop([], 120)).toBeNull()
  })
})
