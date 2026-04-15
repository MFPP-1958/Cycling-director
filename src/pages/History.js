import { APP, loadRaceFromHistory, showToast, downloadFile } from '../main.js'
import { deleteRace } from '../api/races.js'

const COLORS = ['#00AEEF','#47a3ff','#47ffb8','#ffa502','#c47fff','#ff6b47','#ff4757','#47ffea']

export function renderHistory (races) {
  const el = document.getElementById('history-table-wrap')
  if (!el) return

  if (!races.length) {
    el.innerHTML = `<div class="empty"><div class="ei">📅</div><div class="et">Sin carreras guardadas</div>
      <div style="font-size:13px;color:var(--mu);margin-top:8px">Las carreras analizadas aparecerán aquí automáticamente</div></div>`
    return
  }

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;color:var(--mu)">${races.length} carrera(s) guardada(s) en Supabase</div>
      <div style="display:flex;gap:7px">
        <button class="btn btn-sm btn-csv" onclick="exportHistoryCSV()">⬇ CSV</button>
        <button class="btn btn-sm btn-xls" onclick="exportHistoryXLSX()">⬇ Excel</button>
      </div>
    </div>
    <div class="sx">
      <table class="tbl" id="history-tbl">
        <thead><tr>
          <th>Carrera</th><th>Fecha</th><th>Lugar</th><th>Ciclistas</th>
          <th>Dist máx</th><th>TSS máx</th><th>IF máx</th>
          <th>Análisis IA</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${races.map(race => {
            const sessions   = race.race_sessions || []
            const aiCount    = (race.ai_analyses  || []).length
            const maxDist    = sessions.length ? Math.max(...sessions.map(s => s.dist_km  || 0)) : 0
            const maxTSS     = sessions.length ? Math.max(...sessions.map(s => s.tss      || 0)) : 0
            const maxIF      = sessions.length ? Math.max(...sessions.map(s => s.if_score || 0)).toFixed(2) : '—'
            const riderNames = sessions.map(s => s.rider_name)

            return `<tr>
              <td>
                <div style="font-weight:500">${race.name}</div>
                ${race.notes ? `<div style="font-size:11px;color:var(--mu);margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${race.notes}</div>` : ''}
              </td>
              <td style="font-family:'DM Mono',monospace;font-size:12px;white-space:nowrap">${race.date || '—'}</td>
              <td style="color:var(--mu);font-size:12px">${race.venue || '—'}</td>
              <td style="font-size:11px">${riderNames.map((n, i) =>
                `<span style="display:inline-block;padding:2px 7px;border-radius:20px;font-size:10px;background:${COLORS[i % COLORS.length]}18;color:${COLORS[i % COLORS.length]};border:1px solid ${COLORS[i % COLORS.length]}44;margin:2px">${n.split(' ')[0]}</span>`
              ).join('')}</td>
              <td>${maxDist} km</td>
              <td><b style="color:${maxTSS > 130 ? '#ff4757' : maxTSS > 100 ? '#ffa502' : '#47ffb8'}">${maxTSS}</b></td>
              <td style="color:${parseFloat(maxIF) >= 1 ? '#ff4757' : parseFloat(maxIF) >= .9 ? '#ffa502' : '#47ffb8'};font-weight:600">${maxIF}</td>
              <td>${aiCount > 0
                ? `<span style="font-size:11px;color:var(--a5)">🧠 ${aiCount} análisis</span>`
                : '<span style="font-size:11px;color:var(--mu)">—</span>'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-sm" onclick="loadRaceFromHistory('${race.id}')">▶ Cargar</button>
                ${aiCount > 0 ? `<button class="btn btn-sm btn-doc" onclick="exportRaceAIDoc('${race.id}')" style="margin-left:4px">⬇ Word</button>` : ''}
                <button class="btn btn-sm" onclick="confirmDeleteRace('${race.id}','${race.name.replace(/'/g, "\\'")}')\" style="color:#ff4757;margin-left:4px">✕</button>
              </td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`
}

export async function confirmDeleteRace (raceId, raceName) {
  if (!confirm(`¿Eliminar la carrera "${raceName}" y todos sus datos?\nEsta acción no se puede deshacer.`)) return
  try {
    await deleteRace(raceId)
    APP.races = APP.races.filter(r => r.id !== raceId)
    document.getElementById('sc-races').textContent = APP.races.length
    renderHistory(APP.races)
    showToast('🗑 Carrera eliminada: ' + raceName)
  } catch (err) {
    showToast('❌ Error: ' + err.message)
  }
}

export function exportHistoryCSV () {
  const races = APP.races
  if (!races.length) { showToast('⚠ Sin historial'); return }
  const H = ['Carrera','Fecha','Lugar','Ciclistas','Dist máx','TSS máx','IF máx','Análisis IA','Notas']
  const rows = races.map(race => {
    const s = race.race_sessions || []
    return [
      race.name, race.date || '', race.venue || '',
      s.map(x => x.rider_name).join(', '),
      s.length ? Math.max(...s.map(x => x.dist_km  || 0)) : '',
      s.length ? Math.max(...s.map(x => x.tss      || 0)) : '',
      s.length ? Math.max(...s.map(x => x.if_score || 0)).toFixed(2) : '',
      (race.ai_analyses || []).length,
      race.notes || ''
    ]
  })
  downloadFile(
    '\uFEFF' + [H, ...rows].map(r => r.map(v => String(v).includes(';') ? `"${v}"` : v).join(';')).join('\n'),
    'historico_carreras.csv',
    'text/csv;charset=utf-8'
  )
  showToast('✅ CSV histórico exportado')
}

export function exportHistoryXLSX () {
  const races = APP.races
  if (!races.length) { showToast('⚠ Sin historial'); return }
  if (typeof XLSX === 'undefined') { showToast('⚠ Librería Excel no cargada'); return }
  const H = ['Carrera','Fecha','Lugar','Ciclistas','Dist máx (km)','TSS máx','IF máx','Análisis IA','Notas']
  const rows = races.map(race => {
    const s = race.race_sessions || []
    return [
      race.name, race.date || '', race.venue || '',
      s.map(x => x.rider_name).join(', '),
      s.length ? Math.max(...s.map(x => x.dist_km  || 0)) : 0,
      s.length ? Math.max(...s.map(x => x.tss      || 0)) : 0,
      s.length ? parseFloat(Math.max(...s.map(x => x.if_score || 0)).toFixed(2)) : 0,
      (race.ai_analyses || []).length,
      race.notes || ''
    ]
  })
  const ws = XLSX.utils.aoa_to_sheet([H, ...rows])
  ws['!cols'] = [35, 12, 20, 45, 12, 10, 10, 12, 50].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Histórico')
  XLSX.writeFile(wb, 'historico_carreras.xlsx')
  showToast('✅ Excel histórico exportado')
}
