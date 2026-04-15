/**
 * Match a CSV filename to the closest rider in a list.
 * Tokenises both and counts prefix matches.
 */
export function matchRiderByFilename (filename, riders) {
  const base = filename
    .replace(/\.(csv|txt)$/i, '')
    .replace(/_?FIT$/i, '')
    .replace(/-\d{2}-\d{2}-\d{4}$/, '')

  const tokens = base
    .split(/(?=[A-Z])|[-_\s]+/)
    .map(t => t.toLowerCase())
    .filter(t => t.length > 2)

  let best = null, bestScore = -1

  for (const rider of riders) {
    const riderTokens = (rider.name || rider.nombre || '').toLowerCase().split(/\s+/)
    let score = 0
    for (const t of tokens) {
      for (const rt of riderTokens) {
        const minLen = Math.min(t.length, rt.length, 5)
        if (t.slice(0, minLen) === rt.slice(0, minLen)) score += 3
        else if (minLen >= 3 && (rt.includes(t.slice(0, 3)) || t.includes(rt.slice(0, 3)))) score += 1
      }
    }
    if (score > bestScore) { bestScore = score; best = rider }
  }

  return best
}
