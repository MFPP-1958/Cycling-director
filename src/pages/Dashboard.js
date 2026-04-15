import { APP, downloadFile } from '../main.js'
import { makeChart, COLORS, SY, BD } from '../components/Chart.js'

export function renderDashboard () {
  const D = APP.analysis
  if (!D.length) return

  const race = APP.activeRace
  const nm   = D.map(r => r.name.split(' ')[0])

  document.getElementById('dash-title').textContent = race?.name || 'Dashboard'
  document.getElementById('dash-sub').textContent   =
    (race?.date ? race.date + ' · ' : '') + D.length + ' ciclistas analizados'

  // KPI cards
  document.getElementById('dash-kpis').innerHTML = D.map((r, i) => `
    <div class="metric">
      <div class="ml" style="color:${COLORS[i]}">${r.name.split(' ')[0]}</div>
      <div class="mv" style="color:${COLORS[i]};font-size:26px">${r.dist} km</div>
      <div class="ms">${r.durMin} min</div>
      <div class="ms" style="margin-top:5px">TSS <b>${r.TSS}</b> · IF <b>${r.IF}</b></div>
    </div>`).join('')

  // Charts
  makeChart('ch-npftp', 'bar', nm, [
    BD('NP (Pot. normalizada)', D.map(r => r.NP), COLORS),
    BD('FTP declarado', D.map(r => r.FTP), 'transparent',
      { borderColor: '#ff475799', borderWidth: 2, datalabels: { display: false } })
  ], { scales: SY(Math.max(0, Math.min(...D.map(r => Math.min(r.NP, r.FTP))) - 30)) },
  (race?.name || '') + ' — Potencia normalizada vs FTP', 'W')

  makeChart('ch-iftss', 'bar', nm, [
    BD('IF', D.map(r => r.IF), COLORS, {
      yAxisID: 'y',
      datalabels: { display: true, anchor: 'end', align: 'top', color: '#eef0f5', font: { size: 11, weight: '600' }, formatter: v => v.toFixed(2) }
    }),
    { label: 'TSS', data: D.map(r => r.TSS), type: 'line', yAxisID: 'y2',
      borderColor: '#ffa502', borderWidth: 2.5, fill: false, tension: .3,
      pointRadius: 6, pointBackgroundColor: '#ffa502', backgroundColor: '#ffa502',
      datalabels: { display: true, align: 'top', offset: 4, color: '#ffa502', font: { size: 11, weight: '600' }, formatter: v => v }
    }
  ], {
    scales: {
      y:  { position: 'left',  min: .7, max: 1.2, ticks: { color: '#9aa0b0', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.07)' } },
      y2: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#ffa502aa', font: { size: 11 } } },
      x:  { ticks: { color: '#9aa0b0', font: { size: 11 }, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,.07)' } }
    }
  }, (race?.name || '') + ' — IF y TSS')

  makeChart('ch-speed', 'bar', nm,
    [BD('Velocidad media', D.map(r => r.avgSp), COLORS)],
    { scales: SY(Math.max(0, Math.min(...D.map(r => r.avgSp)) - 4)) },
    (race?.name || '') + ' — Velocidad media', 'km/h')

  makeChart('ch-dist', 'bar', nm,
    [BD('Distancia', D.map(r => r.dist), COLORS)],
    { scales: SY(0) },
    (race?.name || '') + ' — Distancia completada', 'km')

  // Summary table
  document.getElementById('dash-tbody').innerHTML = D.map((r, i) => `
    <tr>
      <td><span class="rc" style="background:${COLORS[i]}"></span><b>${r.name}</b></td>
      <td style="color:var(--mu)">${r.categoria}</td>
      <td>${r.FTP}W</td><td>${r.wkg}</td>
      <td><b>${r.NP}W</b></td>
      <td style="color:${r.IF >= 1 ? '#ff4757' : r.IF >= .9 ? '#ffa502' : '#47ffb8'};font-weight:600">${r.IF}</td>
      <td><b>${r.TSS}</b></td>
      <td>${r.dist} km</td><td>${r.durMin} min</td>
      <td>${r.avgFC} bpm</td><td>${r.maxFCo} bpm</td><td>${r.pctFC}%</td>
      <td>${r.peaks.p5s}W</td><td>${r.peaks.p20m}W</td><td>${r.avgSp} km/h</td>
    </tr>`).join('')

  // Insights
  const bNP  = D.reduce((a, b) => a.NP > b.NP ? a : b)
  const bTSS = D.reduce((a, b) => a.TSS > b.TSS ? a : b)
  const mD   = Math.max(...D.map(r => r.dist))
  const ins = [
    `<b>${bNP.name}</b> generó la potencia normalizada más alta: <b>${bNP.NP}W</b> (IF ${bNP.IF} sobre FTP ${bNP.FTP}W).`,
    `Mayor carga fisiológica: <b>${bTSS.name}</b> con TSS <b>${bTSS.TSS}</b>.`,
    ...D.filter(r => r.dist < mD * .83 && r.dist > 0).map(r =>
      `⚠ <b>${r.name}</b> completó solo <b>${r.dist} km</b> — posible abandono (IF ${r.IF}).`),
    D.length > 1 ? `Pico 5s más alto: <b>${D.reduce((a, b) => a.peaks.p5s > b.peaks.p5s ? a : b).name}</b> con <b>${Math.max(...D.map(r => r.peaks.p5s))}W</b>.` : ''
  ].filter(Boolean)

  document.getElementById('dash-insights').innerHTML = ins
    .map(t => `<div style="padding:10px 14px;border-left:3px solid var(--a2);border-radius:0 6px 6px 0;background:var(--s2);margin-bottom:8px;font-size:13px;color:var(--mu);line-height:1.6">${t}</div>`)
    .join('')
}
