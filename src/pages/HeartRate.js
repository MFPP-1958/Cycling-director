// HeartRate.js
import { APP }              from '../main.js'
import { makeChart, COLORS, SY, BD } from '../components/Chart.js'

const TX = { color: '#9aa0b0', font: { size: 11 } }
const GR = { color: 'rgba(255,255,255,.07)' }

export function renderHeartRate () {
  const D = APP.analysis; if (!D.length) return
  const nm = D.map(r => r.name.split(' ')[0])

  makeChart('ch-fcpct', 'bar', nm,
    [BD('FC media %FCmáx', D.map(r => r.avgFCp), COLORS)],
    { scales: { y: { min: Math.max(60, Math.min(...D.map(r => r.avgFCp)) - 5), max: 100, ticks: { ...TX, callback: v => v + '%' }, grid: GR }, x: { ticks: { ...TX, maxRotation: 0 }, grid: GR } } },
    'FC media como % FCmáxima', '%')

  makeChart('ch-fcmax', 'bar', nm, [
    BD('FC obs', D.map(r => r.maxFCo), COLORS),
    BD('FCmáx', D.map(r => r.FCM), 'rgba(255,255,255,.12)', { borderColor: 'rgba(255,255,255,.3)', borderWidth: 1, datalabels: { display: false } })
  ], { scales: SY(Math.max(0, Math.min(...D.map(r => r.maxFCo)) - 15)) },
  'FC máxima observada vs registrada', 'W')

  const fzC = ['#1a3a6e','#47a3ff','#47ffb8','#ffa502','#ff4757']
  makeChart('ch-fczones', 'bar', nm,
    ['Z1 <60%','Z2 60-70%','Z3 70-80%','Z4 80-90%','Z5 >90%'].map((l, i) => ({
      label: l, data: D.map(r => r.fcZones[i]), backgroundColor: fzC[i], borderRadius: 0
    })),
    { scales: { x: { stacked: true, ticks: { ...TX, maxRotation: 0 }, grid: GR }, y: { stacked: true, max: 100, ticks: { ...TX, callback: v => v + '%' }, grid: GR } } },
    'Zonas FC — % tiempo total', '%')

  const pzC = ['#1a2a6e','#47a3ff','#47ffb8','#00AEEF','#ffa502','#ff4757']
  makeChart('ch-pwzones', 'bar', nm,
    ['Z1','Z2','Z3','Z4 Umbral','Z5 VO2','Z6 AnCap'].map((l, i) => ({
      label: l, data: D.map(r => r.pwZones[i]), backgroundColor: pzC[i], borderRadius: 0
    })),
    { scales: { x: { stacked: true, ticks: { ...TX, maxRotation: 0 }, grid: GR }, y: { stacked: true, max: 100, ticks: { ...TX, callback: v => v + '%' }, grid: GR } } },
    'Zonas potencia Coggan — % tiempo', '%')

  makeChart('ch-z5fc', 'bar', nm,
    [BD('% Z5 FC', D.map(r => r.fcZones[4]), COLORS)],
    { scales: { y: { min: 0, ticks: { ...TX, callback: v => v + '%' }, grid: GR }, x: { ticks: { ...TX, maxRotation: 0 }, grid: GR } } },
    '% tiempo Z5 FC (>90% FCmáx)', '%')
}
