/** Display a cost exactly as stored — no rounding, no trailing zeros */
export function fmtCost(n: number): string {
  if (n === 0) return '0'
  // toPrecision(10) removes floating-point noise, parseFloat strips trailing zeros
  return parseFloat(n.toPrecision(10)).toString()
}
