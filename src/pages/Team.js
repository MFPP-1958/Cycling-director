import { APP, showToast, downloadFile } from '../main.js'
import { upsertRider, deleteRider, toggleRiderActive, getRiderHistory } from '../api/riders.js'
import { makeChart, SY, BD } from '../components/Chart.js'

let state = {
  activeTab: true, // true = Activos, false = Bajas
  searchTerm: '',
  categoryFilter: '',
  sortCol: 'name',
  sortDir: 'asc'
}

function getAge (birthDate) {
  if (!birthDate) return '—'
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function handleSort (col) {
  if (state.sortCol === col) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    state.sortCol = col
    state.sortDir = 'asc'
  }
  filterTeamTable()
}

export function setTeamTab (isActive) {
  state.activeTab = isActive
  
  const bAct = document.getElementById('btn-tab-activos')
  const bBaj = document.getElementById('btn-tab-bajas')
  
  if (isActive) {
    bAct.style.background = 'var(--s3)'
    bAct.style.color = 'var(--ac)'
    bAct.style.borderColor = 'var(--ac)'
    
    bBaj.style.background = 'transparent'
    bBaj.style.color = 'var(--mu)'
    bBaj.style.borderColor = 'var(--b2)'
  } else {
    bBaj.style.background = 'var(--s3)'
    bBaj.style.color = 'var(--tx)'
    bBaj.style.borderColor = 'var(--tx)'

    bAct.style.background = 'transparent'
    bAct.style.color = 'var(--mu)'
    bAct.style.borderColor = 'var(--b2)'
  }
  
  filterTeamTable()
}

export function filterTeamTable () {
  state.searchTerm = document.getElementById('t-search')?.value.toLowerCase() || ''
  state.categoryFilter = document.getElementById('t-category')?.value || ''
  
  let filtered = APP.riders.filter(r => r.is_active === state.activeTab)
  
  if (state.searchTerm) {
    filtered = filtered.filter(r => r.name.toLowerCase().includes(state.searchTerm))
  }
  
  if (state.categoryFilter) {
    filtered = filtered.filter(r => r.category === state.categoryFilter)
  }
  
  // Sorting
  filtered.sort((a, b) => {
    let vA = a[state.sortCol]
    let vB = b[state.sortCol]
    
    // Especial handling for age (virtual field)
    if (state.sortCol === 'age') {
       vA = a.birth_date ? new Date(a.birth_date).getTime() : 0
       vB = b.birth_date ? new Date(b.birth_date).getTime() : 0
       // Reverse order for age vs date
       return state.sortDir === 'asc' ? vB - vA : vA - vB
    }

    if (vA == null) vA = ''
    if (vB == null) vB = ''
    
    if (typeof vA === 'string') {
      return state.sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)
    }
    return state.sortDir === 'asc' ? vA - vB : vB - vA
  })

  renderTeamTable(filtered)
}

export function renderTeamTable (riders) {
  const el = document.getElementById('team-table-wrap')
  if (!el) return
  if (!riders.length) {
    el.innerHTML = '<div class="empty" style="padding:40px 0"><div class="ei">👥</div><div class="et">Sin ciclistas en esta vista</div></div>'
    return
  }

  const getSortIcon = (col) => {
    if (state.sortCol !== col) return '<span style="opacity:0.2">↕</span>'
    return state.sortDir === 'asc' ? '↑' : '↓'
  }

  const COLORS = ['#e8ff47','#47a3ff','#47ffb8','#ffa502','#c47fff','#ff6b47','#ff4757','#47ffea']
  
  el.innerHTML = `
    <table class="tbl" id="team-tbl">
      <thead>
        <tr>
          <th></th>
          <th onclick="handleSort('name')" style="cursor:pointer">NOMBRE ${getSortIcon('name')}</th>
          <th onclick="handleSort('birth_date')" style="cursor:pointer; text-align:center">FECHA NAC. ${getSortIcon('birth_date')}</th>
          <th onclick="handleSort('category')" style="cursor:pointer; text-align:center">CATEGORÍA ${getSortIcon('category')}</th>
          <th onclick="handleSort('age')" style="cursor:pointer; text-align:center">EDAD ${getSortIcon('age')}</th>
          <th onclick="handleSort('weight_kg')" style="cursor:pointer; text-align:center">PESO (KG) ${getSortIcon('weight_kg')}</th>
          <th onclick="handleSort('ftp_watts')" style="cursor:pointer; text-align:center">FTP (W) ${getSortIcon('ftp_watts')}</th>
          <th onclick="handleSort('wkg')" style="cursor:pointer; text-align:center">W/KG ${getSortIcon('wkg')}</th>
          <th onclick="handleSort('fc_max')" style="cursor:pointer; text-align:center">FC MÁX. ${getSortIcon('fc_max')}</th>
          <th style="text-align:right">ACCIONES</th>
        </tr>
      </thead>
      <tbody>
        ${riders.map((r, i) => {
          const birth = r.birth_date ? r.birth_date.split('-').reverse().join('/') : '—'
          return `
          <tr style="opacity:${r.is_active ? '1' : '0.5'}">
            <td><span class="rc" style="background:${COLORS[i % COLORS.length]}"></span></td>
            <td><b>${r.name}</b></td>
            <td style="text-align:center; color:var(--mu)">${birth}</td>
            <td style="text-align:center"><span class="aic" style="background:var(--s2); border-color:var(--b1); padding:2px 8px">${r.category || '—'}</span></td>
            <td style="text-align:center; font-weight:500">${getAge(r.birth_date)}</td>
            <td style="text-align:center; color:var(--mu)">${r.weight_kg || '—'}</td>
            <td style="text-align:center; color:var(--ac)">${r.ftp_watts || '—'}</td>
            <td style="text-align:center; font-weight:500">${r.wkg || '—'}</td>
            <td style="text-align:center; color:var(--mu)">${r.fc_max || '—'}</td>
            <td style="white-space:nowrap; text-align:right">
              <button class="btn btn-sm" onclick="editRider('${r.id}')" title="Editar">✏</button>
              <button class="btn btn-sm" style="margin-left:4px" onclick="openProgressionModal('${r.id}')" title="Ver progresión">📉</button>
              <button class="btn btn-sm" style="margin-left:4px;color:${r.is_active ? '#ff4757' : '#47ffb8'}" 
                onclick="toggleRiderActiveStatus('${r.id}', ${!r.is_active})" title="${r.is_active ? 'Dar de baja' : 'Activar'}">
                ${r.is_active ? '⏸' : '▶'}
              </button>
            </td>
          </tr>`}).join('')}
      </tbody>
    </table>`
}

export function openRiderModal () {
  clearRiderFormUI()
  document.getElementById('mod-rider-title').textContent = '➕ Añadir ciclista'
  document.getElementById('mod-rider').showModal()
}

export function closeRiderModal () {
  const mod = document.getElementById('mod-rider')
  if (mod) mod.close()
}

export async function toggleRiderActiveStatus(riderId, newStatus) {
  try {
    await toggleRiderActive(riderId, newStatus)
    // Update local state
    const rx = APP.riders.find(r => r.id === riderId)
    if (rx) rx.is_active = newStatus
    
    showToast(`✅ Ciclista ${newStatus ? 'dado de alta' : 'dado de baja'}`)
    filterTeamTable()
  } catch (err) {
    showToast('❌ Error al cambiar estado: ' + err.message)
  }
}

export function autoCalculateCategory() {
  const dob = document.getElementById('f-dob')?.value
  const isPro = document.getElementById('f-pro')?.value === 'Sí'
  const catSel = document.getElementById('f-cat')
  
  if (!dob) return
  
  const birthYear = new Date(dob).getFullYear()
  const currentYear = new Date().getFullYear()
  const cyclingAge = currentYear - birthYear
  
  let suggested = ''
  
  if (isPro) {
    suggested = 'PRO'
  } else if (cyclingAge === 15) suggested = 'Cadete 1º'
  else if (cyclingAge === 16) suggested = 'Cadete 2º'
  else if (cyclingAge === 17) suggested = 'Juvenil 1º'
  else if (cyclingAge === 18) suggested = 'Juvenil 2º'
  else if (cyclingAge >= 19 && cyclingAge <= 22) suggested = 'Sub-23'
  else if (cyclingAge >= 23 && cyclingAge <= 29) suggested = 'Elite'
  else if (cyclingAge >= 30 && cyclingAge <= 39) suggested = 'Master 30'
  else if (cyclingAge >= 40 && cyclingAge <= 49) suggested = 'Master 40'
  else if (cyclingAge >= 50 && cyclingAge <= 59) suggested = 'Master 50'
  else if (cyclingAge >= 60) suggested = 'Master 60'
  else suggested = 'Elite' // Default for others
  
  // Update select if not in custom mode
  if (catSel && catSel.value !== 'custom') {
    const options = Array.from(catSel.options).map(o => o.text)
    if (options.includes(suggested)) {
       catSel.value = suggested
    }
  }
}

export function onCategoryChange() {
  const catSel = document.getElementById('f-cat')
  const customFg = document.getElementById('fg-cat-custom')
  const proFg = document.getElementById('fg-pro-wrap')
  
  if (!catSel) return

  if (catSel.value === 'custom') {
    if (customFg) customFg.style.display = 'block'
    if (proFg) proFg.style.display = 'none'
  } else {
    if (customFg) customFg.style.display = 'none'
    if (proFg) proFg.style.display = 'block'
    autoCalculateCategory()
  }
}

export async function saveRiderForm () {
  const id       = document.getElementById('f-rider-id')?.value || null
  const name     = document.getElementById('f-name')?.value.trim()
  if (!name) { showToast('⚠ El nombre es obligatorio'); return }

  const dob      = document.getElementById('f-dob')?.value        || null
  const regDate  = document.getElementById('f-reg-date')?.value   || null
  const weightKg = parseFloat(document.getElementById('f-peso')?.value) || null
  const ftpWatts = parseInt(document.getElementById('f-ftp')?.value)    || null
  const fcMax    = parseInt(document.getElementById('f-fcmax')?.value)  || null
  const isPro    = document.getElementById('f-pro')?.value === 'Sí'
  const notes    = document.getElementById('f-notes')?.value      || null
  const measDate = document.getElementById('f-meas-date')?.value  || null

  const catSel   = document.getElementById('f-cat')
  let category   = catSel ? catSel.value : null
  if (category === 'custom') {
    category = document.getElementById('f-cat-custom')?.value.trim() || 'Desconocida'
  } else if (isPro) {
    category = 'PRO'
  }

  const wkg      = weightKg && ftpWatts ? Math.round(ftpWatts / weightKg * 100) / 100 : null
  
  // Mantener is_active del rider actual si existe
  const existRider = APP.riders.find(x => x.id === id)
  const isActive = existRider ? existRider.is_active : true

  try {
    const saved = await upsertRider(APP.team.id, { 
      id, name, birthDate: dob, weightKg, ftpWatts, fcMax, category, wkg, isPro, isActive, notes,
      registrationDate: regDate, measurementDate: measDate
    })
    
    // refresh riders list
    const { getRiders } = await import('../api/riders.js')
    APP.riders = await getRiders(APP.team.id)
    document.getElementById('sc-riders').textContent = APP.riders.filter(r => r.is_active !== false).length
    filterTeamTable()
    
    closeRiderModal()
    showToast('✅ Guardado: ' + saved.name)
  } catch (err) {
    showToast('❌ Error: ' + err.message)
  }
}

export function fillRiderForm (riderId) {
  const r = APP.riders.find(x => x.id === riderId)
  if (!r) return
  document.getElementById('f-rider-id').value = r.id
  document.getElementById('f-name').value     = r.name       || ''
  document.getElementById('f-dob').value      = r.birth_date || ''
  
  document.getElementById('f-reg-date').value = r.registration_date || ''
  document.getElementById('f-meas-date').value = new Date().toISOString().split('T')[0] 

  // Category handling
  const catSel = document.getElementById('f-cat')
  const customInput = document.getElementById('f-cat-custom')
  const options = catSel ? Array.from(catSel.options).map(o => o.text) : []
  
  if (options.includes(r.category)) {
    catSel.value = r.category
    document.getElementById('fg-cat-custom').style.display = 'none'
    document.getElementById('fg-pro-wrap').style.display = 'block'
  } else if (r.category === 'PRO') {
    if (catSel) catSel.value = 'Sub-23' 
    autoCalculateCategory()
  } else {
    if (catSel) catSel.value = 'custom'
    if (customInput) customInput.value = r.category || ''
    document.getElementById('fg-cat-custom').style.display = 'block'
    document.getElementById('fg-pro-wrap').style.display = 'none'
  }

  document.getElementById('f-peso').value     = r.weight_kg  || ''
  document.getElementById('f-ftp').value      = r.ftp_watts  || ''
  document.getElementById('f-fcmax').value    = r.fc_max     || ''
  document.getElementById('f-pro').value      = r.is_pro ? 'Sí' : 'No'
  document.getElementById('f-notes').value    = r.notes      || ''
  
  document.getElementById('mod-rider-title').textContent = '✏ Editar ciclista'
  document.getElementById('mod-rider').showModal()
}

export async function removeRider (riderId, name) {
  if (!confirm(`¿Eliminar a ${name}?\nNota: Si solo está fuera del equipo temporalmente, es mejor 'Dar de baja'.`)) return
  try {
    await deleteRider(riderId)
    APP.riders = APP.riders.filter(r => r.id !== riderId)
    document.getElementById('sc-riders').textContent = APP.riders.filter(r => r.is_active !== false).length
    filterTeamTable()
    showToast('🗑 Eliminado: ' + name)
  } catch (err) {
    showToast('❌ Error: ' + err.message)
  }
}

export function clearRiderForm () {
  // Alias for backward comp
  clearRiderFormUI()
}

export function clearRiderFormUI () {
  ['f-rider-id','f-name','f-dob','f-reg-date','f-meas-date','f-peso','f-ftp','f-fcmax','f-notes','f-cat-custom'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  
  // Defaults
  const today = new Date().toISOString().split('T')[0]
  const regDateEl = document.getElementById('f-reg-date')
  const measDateEl = document.getElementById('f-meas-date')
  const proEl = document.getElementById('f-pro')
  const catEl = document.getElementById('f-cat')
  
  if (regDateEl) regDateEl.value = today
  if (measDateEl) measDateEl.value = today
  if (proEl) proEl.value = 'No'
  if (catEl) catEl.value = 'Elite'
  
  const customFg = document.getElementById('fg-cat-custom')
  const proFg = document.getElementById('fg-pro-wrap')
  if (customFg) customFg.style.display = 'none'
  if (proFg) proFg.style.display = 'block'
}

// ── MODAL PROGRESION ─────────────────────────────────────
export async function openProgressionModal(riderId) {
  const r = APP.riders.find(x => x.id === riderId)
  if (!r) return
  
  const mod = document.getElementById('mod-progression')
  const empty = document.getElementById('progression-empty')
  const charts = document.getElementById('progression-charts')
  
  document.getElementById('mod-progression-title').textContent = `📉 Progresión: ${r.name}`
  mod.showModal()
  
  try {
    const history = await getRiderHistory(riderId)
    
    // Incluir el estado actual a los datos históricos para tener la curva completa si es necesario
    // Pero solo si no coincide con el último registro exacto por unos segundos de delay.
    
    if (!history || history.length < 2) {
      empty.style.display = 'block'
      charts.style.display = 'none'
      return
    }
    
    empty.style.display = 'none'
    charts.style.display = 'block'
    
    const labels = history.map(h => new Date(h.recorded_at).toLocaleDateString())
    const ftpData = history.map(h => h.ftp_watts || null)
    
    document.getElementById('p-ftp-ini').textContent = (history[0].ftp_watts || '--') + 'W'
    document.getElementById('p-ftp-act').textContent = (history[history.length-1].ftp_watts || '--') + 'W'
    
    makeChart('ch-progression', 'line', labels, 
      [{
        label: 'FTP (W)',
        data: ftpData,
        borderColor: '#e8ff47',
        backgroundColor: '#e8ff4733',
        fill: true,
        tension: 0.2,
        pointBackgroundColor: '#e8ff47',
        pointRadius: 5
      }], 
      { scales: SY(0) },
      'Evolución del FTP en el tiempo'
    )
    
  } catch (err) {
    showToast('❌ Error cargando histórico: ' + err.message)
    mod.close()
  }
}

export function exportTeamCSV () {
  const riders = APP.riders.filter(r => r.is_active === state.activeTab)
  if (!riders.length) { showToast('⚠ Sin ciclistas'); return }
  const H = ['Nombre','Fecha Nac.','Peso (kg)','FTP (W)','FC Máxima (bpm)','Edad','Categoría','W/kg','PRO']
  const rows = riders.map(r => [
    r.name, r.birth_date || '', r.weight_kg || '', r.ftp_watts || '',
    r.fc_max || '', getAge(r.birth_date), r.category || '', r.wkg || '', r.is_pro ? 'Sí' : 'No'
  ])
  downloadFile(
    '\uFEFF' + [H, ...rows].map(r => r.join(';')).join('\n'), // UTF-8 BOM
    'plantilla_ciclistas.csv',
    'text/csv;charset=utf-8'
  )
  showToast('✅ CSV exportado')
}

export function exportTeamXLSX () {
  const riders = APP.riders.filter(r => r.is_active === state.activeTab)
  if (!riders.length) { showToast('⚠ Sin ciclistas'); return }
  if (typeof XLSX === 'undefined') { showToast('⚠ Librería Excel no cargada'); return }
  const H = ['Nombre','Fecha Nac.','Peso (kg)','FTP (W)','FC Máxima (bpm)','Edad','Categoría','W/kg','PRO']
  const rows = riders.map(r => [r.name, r.birth_date, r.weight_kg, r.ftp_watts, r.fc_max, getAge(r.birth_date), r.category, r.wkg, r.is_pro ? 'Sí' : 'No'])
  const ws = XLSX.utils.aoa_to_sheet([H, ...rows])
  ws['!cols'] = [30, 12, 10, 10, 14, 8, 14, 8, 8].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, 'plantilla_ciclistas.xlsx')
  showToast('✅ Excel exportado')
}
