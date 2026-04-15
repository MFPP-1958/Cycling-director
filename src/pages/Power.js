import { APP }              from '../main.js'
import { makeChart, COLORS, SY, BD } from '../components/Chart.js'

export function renderPower () {
  const D = APP.analysis; if (!D.length) return
  const nm = D.map(r => r.name.split(' ')[0])
  const race = APP.activeRace

  document.getElementById('leg-mmp').innerHTML = D.map((r, i) =>
    `<span class="ls"><span class="ld" style="background:${COLORS[i]}"></span>${r.name.split(' ')[0]}</span>`
  ).join('')

  makeChart('ch-mmp', 'line', ['5s','30s','1min','5min','20min'],
    D.map((r, i) => ({
      label: nm[i], data: [r.peaks.p5s, r.peaks.p30s, r.peaks.p1m, r.peaks.p5m, r.peaks.p20m],
      borderColor: COLORS[i], backgroundColor: COLORS[i] + '33', fill: false, tension: .4,
      pointRadius: 7, pointBackgroundColor: COLORS[i], borderWidth: 2,
      datalabels: { display: true, align: 'top', color: COLORS[i], font: { size: 10, weight: '700' }, formatter: v => v + 'W' }
    })),
    { scales: SY(0) }, 'Curva MMP — Potencia máxima media')

  makeChart('ch-p5s',   'bar', nm, [BD('Pico 5s',   D.map(r => r.peaks.p5s),   COLORS)], { scales: SY(0) }, 'Pico 5s — Explosividad', 'W')
  makeChart('ch-p30s',  'bar', nm, [BD('Pico 30s',  D.map(r => r.peaks.p30s),  COLORS)], { scales: SY(0) }, 'Pico 30s — Capacidad anaeróbica', 'W')
  makeChart('ch-p5m',   'bar', nm, [BD('Pico 5min', D.map(r => r.peaks.p5m),   COLORS)], { scales: SY(0) }, 'Pico 5min — VO2max', 'W')
  makeChart('ch-p20m',  'bar', nm, [BD('Pico 20min',D.map(r => r.peaks.p20m),  COLORS)], { scales: SY(0) }, 'Pico 20min — FTP real estimado', 'W')

  makeChart('ch-explo', 'bar', nm,
    [BD('Ratio', D.map(r => r.FTP > 0 ? Math.round(r.peaks.p5s / r.FTP * 100) / 100 : 0), COLORS)],
    { scales: SY(0) }, 'Explosividad relativa (pico5s ÷ FTP)', 'x')

  makeChart('ch-vo2r', 'bar', nm,
    [BD('Ratio', D.map(r => r.FTP > 0 ? Math.round(r.peaks.p5m / r.FTP * 100) / 100 : 0), COLORS)],
    { scales: SY(0) }, 'VO2max relativo (pico5min ÷ FTP)', 'x')

  makeChart('ch-avgp', 'bar', nm,
    [BD('W activos', D.map(r => r.avgPwA), COLORS)],
    { scales: SY(0) }, 'Potencia media activa en carrera (excl. ceros)', 'W')
}
