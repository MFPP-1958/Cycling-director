import { APP }              from '../main.js'
import { makeChart, COLORS, COLORS_A, SY, BD } from '../components/Chart.js'

export function renderProfile () {
  const D = APP.analysis; if (!D.length) return
  const nm = D.map(r => r.name.split(' ')[0])
  const TX = { color: '#9aa0b0', font: { size: 11 } }
  const GR = { color: 'rgba(255,255,255,.07)' }

  document.getElementById('leg-radar').innerHTML = D.map((r, i) =>
    `<span class="ls"><span class="ld" style="background:${COLORS[i]}"></span>${r.name.split(' ')[0]}</span>`
  ).join('')

  const rLabels = ['Pico 5s','Pico 30s','Pico 1min','Pico 5min','Pico 20min','IF×100']
  const mx = [
    Math.max(...D.map(r => r.peaks.p5s), 1),
    Math.max(...D.map(r => r.peaks.p30s), 1),
    Math.max(...D.map(r => r.peaks.p1m), 1),
    Math.max(...D.map(r => r.peaks.p5m), 1),
    Math.max(...D.map(r => r.peaks.p20m), 1),
    Math.max(...D.map(r => r.IF * 100), 1)
  ]

  makeChart('ch-radar', 'radar', rLabels,
    D.map((r, i) => ({
      label: nm[i],
      data:  [r.peaks.p5s, r.peaks.p30s, r.peaks.p1m, r.peaks.p5m, r.peaks.p20m, r.IF * 100]
               .map((v, j) => Math.round(v / mx[j] * 100)),
      borderColor: COLORS[i], backgroundColor: COLORS_A[i],
      pointBackgroundColor: COLORS[i], pointRadius: 4, fill: true,
      datalabels: { display: false }
    })),
    { scales: { r: { min: 50, max: 100, ticks: { display: false }, grid: { color: '#ffffff15' }, pointLabels: { color: '#ccd0da', font: { size: 11 } } } } },
    'Radar — perfil comparativo (normalizado al máximo del grupo)')

  makeChart('ch-wkg', 'bar', nm,
    [BD('W/kg FTP', D.map(r => r.wkg), COLORS)],
    { scales: SY(Math.max(0, Math.min(...D.map(r => r.wkg)) - .5)) },
    'W/kg FTP — Relación potencia-peso')

  makeChart('ch-eff', 'bar', nm,
    [BD('W/bpm', D.map(r => r.eff), COLORS)],
    { scales: SY(0) },
    'Eficiencia cardíaca — NP/FC media')

  // Typology cards
  document.getElementById('profile-typo').innerHTML = D.map((r, i) => {
    const { tags, desc } = classify(r, D)
    return `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--b1)">
        <div style="width:4px;min-height:50px;background:${COLORS[i]};border-radius:2px;flex-shrink:0;margin-top:2px"></div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500;margin-bottom:3px">${r.name}</div>
          <div style="font-size:12px;color:var(--mu);margin-bottom:8px">${r.categoria}${r.edad ? ' · ' + r.edad + ' años' : ''} · FTP ${r.FTP}W · ${r.wkg} W/kg</div>
          <div style="margin-bottom:7px">${tags.map(t => `<span style="font-size:10px;padding:3px 8px;border-radius:4px;background:${COLORS[i]}22;color:${COLORS[i]};font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-right:4px;display:inline-block;margin-bottom:3px">${t}</span>`).join('')}</div>
          <div style="font-size:13px;color:var(--mu);line-height:1.6">${desc}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:8px">
          <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:${COLORS[i]}">${r.IF}</div>
          <div style="font-size:10px;color:var(--mu)">IF</div>
          <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:500;margin-top:6px">${r.TSS}</div>
          <div style="font-size:10px;color:var(--mu)">TSS</div>
        </div>
      </div>`
  }).join('')
}

function classify (r, all) {
  const tags = [], descs = []
  const mD = Math.max(...all.map(a => a.dist))
  if (r.dist < mD * .83 && r.dist > 0) { tags.push('Abandono'); descs.push(`Completó solo ${r.dist} km. IF ${r.IF} indica salida por encima del umbral.`) }
  if (r.IF >= 1.0)       tags.push('Sobreexigido')
  else if (r.IF >= .94)  tags.push('Alta intensidad')
  else if (r.IF < .88)   tags.push('Reserva táctica')
  if (r.peaks.p5s === Math.max(...all.map(a => a.peaks.p5s))) tags.push('Más explosivo')
  if (r.FTP === Math.max(...all.map(a => a.FTP)))              tags.push('Mayor FTP')
  if (r.fcZones[4] > 50) tags.push('Alta Z5 cardíaca')
  if (r.wkg >= 4.4)      tags.push('Buen W/kg')
  if (!descs.length) descs.push(`NP ${r.NP}W sobre FTP ${r.FTP}W. TSS ${r.TSS} — carga ${r.TSS > 130 ? 'muy alta' : r.TSS > 100 ? 'alta' : 'moderada'}. FC media al ${r.avgFCp}% del máximo.`)
  return { tags: tags.slice(0, 4), desc: descs[0] }
}
