import { APP, showToast }         from '../main.js'
import { makeChart, COLORS }       from '../components/Chart.js'

const TX = { color: '#9aa0b0', font: { size: 11 } }
const GR = { color: 'rgba(255,255,255,.07)' }

export function renderIndividual (idx) {
  const r   = APP.analysis[idx]
  if (!r) return
  const col = COLORS[idx % COLORS.length]
  const el  = document.getElementById('individual-content')

  document.getElementById('btn-dl-individual').style.display = 'inline-flex'

  el.innerHTML = `
    <div class="g4" style="margin-bottom:14px">
      <div class="metric"><div class="ml">NP / FTP</div><div class="mv" style="color:${col}">${r.NP}W</div><div class="ms">FTP ${r.FTP}W</div></div>
      <div class="metric"><div class="ml">IF / TSS</div><div class="mv" style="color:${r.IF >= 1 ? '#ff4757' : r.IF >= .9 ? '#ffa502' : '#47ffb8'};font-size:26px">${r.IF}</div><div class="ms">TSS ${r.TSS}</div></div>
      <div class="metric"><div class="ml">Distancia</div><div class="mv" style="color:${col}">${r.dist}</div><div class="ms">km · ${r.durMin} min</div></div>
      <div class="metric"><div class="ml">FC media/máx</div><div class="mv" style="color:${col};font-size:22px">${r.avgFC}</div><div class="ms">bpm · máx ${r.maxFCo} (${r.pctFC}%)</div></div>
    </div>
    <div class="g4" style="margin-bottom:14px">
      <div class="metric"><div class="ml">Pico 5s</div><div class="mv" style="color:${col};font-size:22px">${r.peaks.p5s}W</div></div>
      <div class="metric"><div class="ml">Pico 30s</div><div class="mv" style="color:${col};font-size:22px">${r.peaks.p30s}W</div></div>
      <div class="metric"><div class="ml">Pico 5min</div><div class="mv" style="color:${col};font-size:22px">${r.peaks.p5m}W</div></div>
      <div class="metric"><div class="ml">Pico 20min</div><div class="mv" style="color:${col};font-size:22px">${r.peaks.p20m}W</div></div>
    </div>
    <div class="g2" style="margin-bottom:14px">
      <div class="card"><div class="cw" style="height:260px"><canvas id="i-pow"></canvas></div></div>
      <div class="card"><div class="cw" style="height:260px"><canvas id="i-fc"></canvas></div></div>
    </div>
    <div class="g2" style="margin-bottom:14px">
      <div class="card"><div class="cw" style="height:255px"><canvas id="i-fcz"></canvas></div></div>
      <div class="card"><div class="cw" style="height:255px"><canvas id="i-pwz"></canvas></div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="cw" style="height:230px"><canvas id="i-mmp"></canvas></div>
    </div>
    <div class="card">
      <div class="ctitle">📋 Ficha técnica — ${r.name}</div>
      <table class="tbl" style="margin-top:4px">
        <tr><td style="color:var(--mu)">Nombre</td><td><b>${r.name}</b></td><td style="color:var(--mu)">Categoría</td><td>${r.categoria}</td></tr>
        <tr><td style="color:var(--mu)">Edad</td><td>${r.edad || '—'}</td><td style="color:var(--mu)">Peso</td><td>${r.PESO} kg</td></tr>
        <tr><td style="color:var(--mu)">FTP declarado</td><td>${r.FTP}W</td><td style="color:var(--mu)">W/kg</td><td>${r.wkg}</td></tr>
        <tr><td style="color:var(--mu)">NP</td><td><b>${r.NP}W</b></td><td style="color:var(--mu)">IF</td><td style="color:${r.IF >= 1 ? '#ff4757' : r.IF >= .9 ? '#ffa502' : '#47ffb8'};font-weight:600">${r.IF}</td></tr>
        <tr><td style="color:var(--mu)">TSS</td><td><b>${r.TSS}</b></td><td style="color:var(--mu)">Eficiencia</td><td>${r.eff} W/bpm</td></tr>
        <tr><td style="color:var(--mu)">Pico 20min vs FTP</td><td>${r.peaks.p20m}W</td><td style="color:var(--mu)">% del FTP</td><td>${r.FTP > 0 ? Math.round(r.peaks.p20m / r.FTP * 100) : 0}%</td></tr>
        <tr><td style="color:var(--mu)">Vel media / máx</td><td>${r.avgSp} / ${r.maxSp} km/h</td><td style="color:var(--mu)">Pot. activa</td><td>${r.avgPwA}W</td></tr>
        <tr><td style="color:var(--mu)">FC media / máx obs</td><td>${r.avgFC} / ${r.maxFCo} bpm</td><td style="color:var(--mu)">% FCmáxima</td><td>${r.pctFC}%</td></tr>
      </table>
    </div>`

  setTimeout(() => {
    const mins = r.ts.map(t => t.min + "'")
    const co   = { scales: { y: { min: 0, ticks: TX, grid: GR }, x: { ticks: { ...TX, maxTicksLimit: 12 }, grid: GR } } }

    makeChart('i-pow', 'line', mins, [{
      label: 'Potencia (W)', data: r.ts.map(t => t.pow),
      borderColor: col, backgroundColor: col + '22', fill: true, tension: .3, pointRadius: 0, borderWidth: 2,
      datalabels: { display: false }
    }], co, r.name + ' — Potencia durante la carrera (W)')

    makeChart('i-fc', 'line', mins, [{
      label: 'FC (bpm)', data: r.ts.map(t => t.fc || null),
      borderColor: '#ff4757', backgroundColor: '#ff475722', fill: true, tension: .3,
      pointRadius: 0, borderWidth: 2, spanGaps: true, datalabels: { display: false }
    }], {
      scales: { y: { min: r.avgFC > 0 ? Math.max(0, r.avgFC - 30) : 0, ticks: TX, grid: GR }, x: { ticks: { ...TX, maxTicksLimit: 12 }, grid: GR } }
    }, r.name + ' — FC durante la carrera (bpm)')

    makeChart('i-fcz', 'bar',
      ['Z1 <60%','Z2 60-70%','Z3 70-80%','Z4 80-90%','Z5 >90%'],
      [{ label: '% tiempo', data: r.fcZones,
         backgroundColor: ['#1a3a6e','#47a3ff','#47ffb8','#ffa502','#ff4757'], borderRadius: 4,
         datalabels: { display: true, anchor: 'end', align: 'top', color: '#e0e4ee', font: { size: 11, weight: '600' }, formatter: v => v > 0 ? v + '%' : '' }
      }],
      { scales: { y: { min: 0, max: Math.max(...r.fcZones, 10) + 12, ticks: { ...TX, callback: v => v + '%' }, grid: GR }, x: { ticks: TX, grid: GR } } },
      r.name + ' — Zonas FC (% tiempo)')

    makeChart('i-pwz', 'bar',
      ['Z1','Z2','Z3','Z4','Z5','Z6'],
      [{ label: '% tiempo', data: r.pwZones,
         backgroundColor: ['#1a2a6e','#47a3ff','#47ffb8','#e8ff47','#ffa502','#ff4757'], borderRadius: 4,
         datalabels: { display: true, anchor: 'end', align: 'top', color: '#e0e4ee', font: { size: 11, weight: '600' }, formatter: v => v > 0 ? v + '%' : '' }
      }],
      { scales: { y: { min: 0, max: Math.max(...r.pwZones, 10) + 12, ticks: { ...TX, callback: v => v + '%' }, grid: GR }, x: { ticks: TX, grid: GR } } },
      r.name + ' — Zonas potencia (% tiempo)')

    makeChart('i-mmp', 'line',
      ['5s','30s','1min','5min','20min'],
      [{ label: 'W', data: [r.peaks.p5s, r.peaks.p30s, r.peaks.p1m, r.peaks.p5m, r.peaks.p20m],
         borderColor: col, backgroundColor: col + '22', fill: true, tension: .4,
         pointRadius: 8, pointBackgroundColor: col, borderWidth: 2,
         datalabels: { display: true, align: 'top', offset: 4, color: col, font: { size: 13, weight: '700' }, formatter: v => v + 'W' }
      }],
      { scales: { y: { min: Math.max(0, r.peaks.p20m - 50), ticks: TX, grid: GR }, x: { ticks: TX, grid: GR } } },
      r.name + ' — Curva MMP')
  }, 80)
}

export function downloadIndividualCharts () {
  ['i-pow','i-fc','i-fcz','i-pwz','i-mmp'].forEach(id => {
    const ch = APP.charts[id]
    if (!ch) return
    const a = document.createElement('a')
    a.download = id + '.png'
    a.href = ch.toBase64Image('image/png', 1)
    a.click()
  })
  showToast('✅ Gráficos individuales descargados')
}
