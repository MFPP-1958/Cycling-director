/**
 * Pure metrics calculator.
 * No UI, no side effects — takes raw data arrays, returns metrics object.
 */

/** Normalised Power: 30s rolling average^4 mean ^0.25 */
export function calcNP (powerArr) {
  if (powerArr.length < 30) {
    return powerArr.length
      ? Math.round(powerArr.reduce((a, b) => a + b, 0) / powerArr.length)
      : 0
  }
  const rolled = []
  for (let i = 29; i < powerArr.length; i++) {
    let s = 0; for (let j = i - 29; j <= i; j++) s += powerArr[j]
    rolled.push(s / 30)
  }
  return Math.round((rolled.reduce((a, b) => a + b ** 4, 0) / rolled.length) ** 0.25)
}

/** Peak average power for a window of `windowSec` seconds */
export function calcPeak (arr, windowSec) {
  if (!arr.length) return 0
  if (arr.length < windowSec) {
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  }
  let best = 0, sum = 0
  for (let i = 0; i < windowSec; i++) sum += arr[i]
  if (sum / windowSec > best) best = sum / windowSec
  for (let i = windowSec; i < arr.length; i++) {
    sum += arr[i] - arr[i - windowSec]
    if (sum / windowSec > best) best = sum / windowSec
  }
  return Math.round(best)
}

/** FC zone distribution as array of percentages [z1..z5] */
export function calcFCZones (fcArr, fcMax) {
  const valid = fcArr.filter(v => v > 40 && v < 250)
  if (!valid.length || !fcMax) return [0, 0, 0, 0, 0]
  const pct = (lo, hi) => Math.round(
    valid.filter(v => v >= fcMax * lo && v < fcMax * hi).length / valid.length * 100
  )
  return [pct(0, .6), pct(.6, .7), pct(.7, .8), pct(.8, .9), pct(.9, 9)]
}

/** Power zone distribution (Coggan) as array of percentages [z1..z6] */
export function calcPowerZones (pwArr, ftp) {
  if (!pwArr.length || !ftp) return [0, 0, 0, 0, 0, 0]
  const pct = (lo, hi) => Math.round(
    pwArr.filter(v => v >= ftp * lo && (hi === Infinity || v < ftp * hi)).length / pwArr.length * 100
  )
  return [pct(0, .55), pct(.55, .75), pct(.75, .90), pct(.90, 1.05), pct(1.05, 1.20), pct(1.20, Infinity)]
}

/**
 * Main entry point.
 * @param {string[]} columns - column arrays extracted from CSV rows
 * @param {object}   rider   - rider metadata (ftp, fcMax, weight, etc.)
 * @returns complete metrics object ready to store in race_sessions
 */
export function computeMetrics ({ powerArr, fcArr, speedArr, distArr }, rider) {
  const FTP  = rider.ftpWatts || 250
  const FCM  = rider.fcMax    || 195
  const PESO = rider.weightKg || 65

  const N      = powerArr.length // ~1 row per second
  const NP     = calcNP(powerArr)
  const IF_    = NP > 0 && FTP > 0 ? Math.round(NP / FTP * 100) / 100 : 0
  const TSS    = NP > 0 && FTP > 0 ? Math.round(N * NP * IF_ / (FTP * 3600) * 100) : 0

  const peaks = {
    p5s:  calcPeak(powerArr, 5),
    p30s: calcPeak(powerArr, 30),
    p1m:  calcPeak(powerArr, 60),
    p5m:  calcPeak(powerArr, 300),
    p20m: calcPeak(powerArr, 1200)
  }

  const fcValid  = fcArr.filter(v => v > 40 && v < 250)
  const avgFC    = fcValid.length ? Math.round(fcValid.reduce((a, b) => a + b, 0) / fcValid.length) : 0
  const maxFCo   = fcValid.length ? Math.round(Math.max(...fcValid)) : 0
  const pctFC    = FCM > 0 && maxFCo > 0 ? Math.round(maxFCo / FCM * 100) : 0
  const avgFCp   = FCM > 0 && avgFC  > 0 ? Math.round(avgFC  / FCM * 100) : 0

  const spValid  = speedArr.filter(v => v > 0)
  const avgSp    = spValid.length ? Math.round(spValid.reduce((a, b) => a + b, 0) / spValid.length * 10) / 10 : 0
  const maxSp    = speedArr.length ? Math.round(Math.max(...speedArr, 0) * 10) / 10 : 0
  const maxDist  = distArr.length  ? Math.max(...distArr, 0) : 0

  const pwActive = powerArr.filter(v => v > 5)
  const avgPwA   = pwActive.length ? Math.round(pwActive.reduce((a, b) => a + b, 0) / pwActive.length) : 0
  const maxPow   = powerArr.length ? Math.round(Math.max(...powerArr, 0)) : 0

  // Timeseries: one point every 60 seconds
  const ts = []
  for (let i = 0; i < N; i += 60) {
    ts.push({
      min: Math.round(i / 60),
      pow: Math.round(powerArr[i] || 0),
      fc:  Math.round(fcArr[i]    || 0),
      spd: Math.round((speedArr[i] || 0) * 10) / 10
    })
  }

  return {
    NP, IF: IF_, TSS,
    dist:    Math.round(maxDist * 10) / 10,
    durMin:  Math.round(N / 60 * 10) / 10,
    avgFC, maxFCo, pctFC, avgFCp,
    avgSp, maxSp, maxPow, avgPwA,
    eff:     avgFC > 0 ? Math.round(NP / avgFC * 10) / 10 : 0,
    peaks,
    fcZones:  calcFCZones(fcArr, FCM),
    pwZones:  calcPowerZones(powerArr, FTP),
    ts
  }
}

/** Extract typed column arrays from parsed CSV rows */
export function extractColumns (rows) {
  const gn = (row, keys) => {
    for (const k of keys) {
      const v = row[k]
      if (v !== undefined && v !== '') {
        const n = parseFloat(v.toString().replace(',', '.'))
        if (!isNaN(n)) return n
      }
    }
    return 0
  }

  return {
    powerArr: rows.map(r => gn(r, ['Potencia (W)', 'Potencia', 'Power'])),
    fcArr:    rows.map(r => gn(r, ['FC (bpm)', 'FC', 'HeartRate'])),
    speedArr: rows.map(r => gn(r, ['Velocidad (km/h)', 'Velocidad', 'Speed'])),
    distArr:  rows.map(r => gn(r, ['Distancia (km)', 'Distancia', 'Distance']))
  }
}
