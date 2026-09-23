/** ソース行とプレビュー上のピクセル位置の対応点。line / top ともに昇順で並んでいる前提。 */
export interface LinePosition {
  line: number
  top: number
}

function interpolate(
  positions: LinePosition[],
  value: number,
  from: 'line' | 'top',
): number | null {
  if (positions.length === 0) return null

  const to = from === 'line' ? 'top' : 'line'
  const first = positions[0]
  const last = positions[positions.length - 1]
  if (value <= first[from]) return first[to]
  if (value >= last[from]) return last[to]

  // value 以下で最後の対応点を二分探索する（大きな文書でもスクロールごとの走査を避ける）
  let low = 0
  let high = positions.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (positions[mid][from] <= value) low = mid
    else high = mid
  }

  const start = positions[low]
  const end = positions[high]
  const span = end[from] - start[from]
  if (span <= 0) return start[to]

  const ratio = (value - start[from]) / span
  return start[to] + ratio * (end[to] - start[to])
}

/** 行番号（小数可）に対応するプレビュー上の位置を返す。範囲外は端にクランプする。 */
export function topForLine(positions: LinePosition[], line: number): number | null {
  return interpolate(positions, line, 'line')
}

/** プレビュー上の位置に対応する行番号（小数可）を返す。範囲外は端にクランプする。 */
export function lineForTop(positions: LinePosition[], top: number): number | null {
  return interpolate(positions, top, 'top')
}
