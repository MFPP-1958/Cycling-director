import { supabase, getUser, getOrCreateTeam } from './lib/supabase.js'
import { getRiders, importRiders }             from './api/riders.js'
import { getRaces, getRaceById,
         createRace, updateRace, deleteRace,
         upsertSession, sessionToAnalysis }     from './api/races.js'
import { getAnalysesByRace,
         saveAnalysis, deleteAnalysis }         from './api/aiAnalyses.js'
import { parseCSV, parsePlantillaCSV }          from './core/csvParser.js'
import { computeMetrics, extractColumns }       from './core/metricsCalculator.js'
import { matchRiderByFilename }                 from './core/nameMatching.js'

// ── App-wide state ────────────────────────────────────────────────
export const APP = {
  user:        null,
  team:        null,
  riders:      [],      // all riders for this team
  races:       [],      // race list (summary)
  activeRace:  null,    // full race object with sessions + analyses
  analysis:    [],      // sessions mapped to UI shape
  charts:      {},      // Chart.js instances keyed by canvas id
  // staging area for files not yet saved
  stagedFiles: [],      // [{name, text}]
}

// ── Bootstrap ─────────────────────────────────────────────────────
async function init () {
  // Clear any error fragments from the URL hash (like expired OTPs)
  if (window.location.hash.includes('error=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (!supabase) {
    document.getElementById('app-root').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0c0f;padding:20px">
        <div style="background:#12151a;border:1px solid rgba(255,71,87,.3);border-radius:12px;padding:40px;width:100%;max-width:450px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:#ff4757;margin-bottom:12px">Error de Configuración</div>
          <p style="color:#7a8090;font-size:14px;line-height:1.6;margin-bottom:24px">
            No se han encontrado las variables de entorno de Supabase.<br><br>
            Por favor, asegúrate de tener un archivo <b>.env</b> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> activo.
          </p>
          <button onclick="location.reload()" style="background:var(--s2);color:var(--tx);border:1px solid var(--b2);border-radius:6px;padding:10px 20px;font-size:13px;cursor:pointer">
            🔄 Reintentar conexión
          </button>
        </div>
      </div>`
    // Aun así permitimos que el resto de los handlers se asignen para que la shell sea "viva"
    // Pero detenemos la lógica de carga de datos
    return
  }

  const user = await getUser()

  if (!user) {
    renderAuth()
    return
  }

  APP.user = user
  APP.team = await getOrCreateTeam(user)

  await Promise.all([
    loadRiders(),
    loadRaces()
  ])

  renderApp()
  navigate('import')
}

async function loadRiders () {
  APP.riders = await getRiders(APP.team.id)
}

async function loadRaces () {
  APP.races = await getRaces(APP.team.id)
}

// ── Auth UI ───────────────────────────────────────────────────────
function renderAuth () {
  document.getElementById('app-root').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0c0f">
      <div style="background:#12151a;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:40px;width:360px;text-align:center">
        <img src="/logo.png" alt="MFPP Logo" style="width:100%;max-width:240px;margin-bottom:32px">
        <div id="auth-msg" style="font-size:13px;color:#7a8090;margin-bottom:20px">Inicia sesión para continuar</div>
        <input id="auth-email" type="email" placeholder="tu@email.com"
          style="width:100%;background:#1a1e26;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:10px 12px;color:#eef0f5;font-size:13px;margin-bottom:10px;outline:none;box-sizing:border-box">
        <input id="auth-pass" type="password" placeholder="Contraseña"
          style="width:100%;background:#1a1e26;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:10px 12px;color:#eef0f5;font-size:13px;margin-bottom:16px;outline:none;box-sizing:border-box">
        <button onclick="doLogin()" style="width:100%;background:#e8ff47;color:#000;border:none;border-radius:6px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:10px">Iniciar sesión</button>
        <button onclick="doSignup()" style="width:100%;background:transparent;color:#e8ff47;border:1px solid rgba(232,255,71,.3);border-radius:6px;padding:10px;font-size:12px;cursor:pointer;margin-bottom:10px">Crear cuenta nueva</button>
        <button onclick="doMagicLink()" style="width:100%;background:transparent;color:#7a8090;border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:10px;font-size:11px;cursor:pointer">Acceder con magic link (sin contraseña)</button>
      </div>
    </div>`

  // Make auth functions global for onclick
  window.doLogin = async () => {
    const email = document.getElementById('auth-email').value.trim()
    const pass  = document.getElementById('auth-pass').value
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { document.getElementById('auth-msg').textContent = '❌ ' + error.message; return }
    init()
  }
  window.doSignup = async () => {
    const email = document.getElementById('auth-email').value.trim()
    const pass  = document.getElementById('auth-pass').value
    const { error } = await supabase.auth.signUp({ email, password: pass })
    if (error) { document.getElementById('auth-msg').textContent = '❌ ' + error.message; return }
    document.getElementById('auth-msg').textContent = '✅ Revisa tu email para confirmar la cuenta'
  }
  window.doMagicLink = async () => {
    const email = document.getElementById('auth-email').value.trim()
    if (!email) { document.getElementById('auth-msg').textContent = '⚠ Introduce tu email primero'; return }
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { document.getElementById('auth-msg').textContent = '❌ ' + error.message; return }
    document.getElementById('auth-msg').textContent = '✅ Magic link enviado a ' + email
  }
}

// ── Main app shell ────────────────────────────────────────────────
function renderApp () {
  // The full app shell is in index.html; here we just wire up global state
  // and make key functions available to the HTML event handlers
  updateSidebar()
}

// ── Navigation ────────────────────────────────────────────────────
const PANELS = ['import','dashboard','power','heartrate','profile','individual','team','history','estadisticas','diagnostico','analisis','informes','config']
const TITLES  = {
  import:       'Carga de Datos',
  dashboard:    'Dashboard general',
  power:        'Potencia y picos',
  heartrate:    'FC y zonas',
  profile:      'Perfil del ciclista',
  individual:   'Vista individual',
  team:         'Gestión de Plantilla',
  history:      'Gestión de Informes',
  estadisticas: 'Estadísticas',
  diagnostico:  'Diagnóstico y Revisión',
  analisis:     'Análisis Interactivo',
  informes:     'Gestión de Informes',
  config:       'Configuración'
}

export function navigate (id) {
  PANELS.forEach(p => {
    document.getElementById('panel-' + p)?.classList.toggle('active', p === id)
    document.getElementById('nav-'   + p)?.classList.toggle('active', p === id)
  })
  const niAI = document.getElementById('nav-ai')
  if (niAI) niAI.classList.remove('active')
  const tb = document.getElementById('topbar-title')
  if (tb) tb.textContent = TITLES[id] || id

  if (id === 'team')         renderTeamPanel()
  if (id === 'history')      renderHistoryPanel()
  if (id === 'individual')   populateRiderSelect()
  if (id === 'estadisticas') renderStatsPanel()
}

function updateSidebar () {
  const sc = document.getElementById('sc-riders')
  if (sc) sc.textContent = APP.riders.length
  const sr = document.getElementById('sc-races')
  if (sr) sr.textContent = APP.races.length
}

// ── File staging (Import panel) ───────────────────────────────────
export function stageRaceFiles (files) {
  Array.from(files).forEach(f => {
    const reader = new FileReader()
    reader.onload = e => {
      const existing = APP.stagedFiles.findIndex(s => s.name === f.name)
      if (existing >= 0) APP.stagedFiles[existing] = { name: f.name, text: e.target.result }
      else APP.stagedFiles.push({ name: f.name, text: e.target.result })
      renderStagedFiles()
      updateImportStatus()
      showToast('✅ Cargado: ' + f.name)
    }
    reader.readAsText(f, 'UTF-8')
  })
}

export function stagePlantilla (file) {
  const reader = new FileReader()
  reader.onload = async e => {
    const riders = parsePlantillaCSV(e.target.result)
    try {
      const saved = await importRiders(APP.team.id, riders)
      APP.riders = await getRiders(APP.team.id)
      updateSidebar()
      document.getElementById('plantilla-status').innerHTML =
        `<div class="al al-ok">✅ ${saved.length} ciclistas importados y guardados en la base de datos</div>`
      showToast('✅ Plantilla guardada: ' + saved.length + ' ciclistas')
    } catch (err) {
      document.getElementById('plantilla-status').innerHTML =
        `<div class="al al-err">❌ Error: ${err.message}</div>`
    }
  }
  reader.readAsText(file, 'UTF-8')
}

function renderStagedFiles () {
  const el = document.getElementById('staged-files')
  if (!el) return
  el.innerHTML = APP.stagedFiles.map((f, i) => `
    <div class="file-item">
      <div><div class="fn">🚴 ${f.name}</div></div>
      <button class="btn btn-sm" onclick="APP.stagedFiles.splice(${i},1);renderStagedFiles();updateImportStatus()">✕</button>
    </div>`).join('')
}

function updateImportStatus () {
  const el = document.getElementById('import-status')
  if (!el) return
  const nr = APP.stagedFiles.length, np = APP.riders.length
  el.innerHTML = `
    <div class="al ${nr > 0 ? 'al-ok' : 'al-warn'}">${nr > 0 ? '✅' : '⚠'} ${nr} archivo(s) de carrera preparados</div>
    <div class="al ${np > 0 ? 'al-ok' : 'al-warn'}" style="margin-bottom:0">${np > 0 ? '✅' : '⚠'} ${np} ciclistas en base de datos</div>`
}

// ── Run analysis and persist to Supabase ─────────────────────────
export async function runAndSaveAnalysis () {
  if (!APP.stagedFiles.length) { showToast('⚠ Carga al menos un archivo CSV de carrera'); return }

  const name   = document.getElementById('c-name')?.value   || 'Carrera ' + new Date().toLocaleDateString('es')
  const date   = document.getElementById('c-date')?.value   || null
  const venue  = document.getElementById('c-venue')?.value  || null
  const notes  = document.getElementById('c-notes')?.value  || null

  showToast('⏳ Guardando en base de datos…')

  try {
    // 1. Create race record
    const race = await createRace(APP.team.id, { name, date, venue, notes })

    // 2. Compute + save each session
    const analysisResults = []
    for (const file of APP.stagedFiles) {
      const { rows } = parseCSV(file.text)
      if (!rows.length) continue

      const matchedRider = matchRiderByFilename(file.name, APP.riders)
      const columns      = extractColumns(rows)
      const metrics      = computeMetrics(columns, matchedRider || {})

      const sessionPayload = {
        ...metrics,
        name:     matchedRider?.name || file.name.replace(/\.(csv|txt)$/i, ''),
        riderId:  matchedRider?.id   || null,
        fileName: file.name
      }

      const saved = await upsertSession(race.id, sessionPayload)
      analysisResults.push(sessionToAnalysis(saved, APP.riders))
    }

    // 3. Update local state
    APP.activeRace = race
    APP.analysis   = analysisResults
    await loadRaces()
    updateSidebar()

    // 4. Render all analysis panels
    const { renderDashboard } = await import('./pages/Dashboard.js')
    const { renderPower }     = await import('./pages/Power.js')
    const { renderHeartRate } = await import('./pages/HeartRate.js')
    const { renderProfile }   = await import('./pages/Profile.js')
    renderDashboard()
    renderPower()
    renderHeartRate()
    renderProfile()
    populateRiderSelect()

    navigate('dashboard')
    showToast('✅ Análisis guardado · ' + analysisResults.length + ' ciclistas')
  } catch (err) {
    showToast('❌ Error: ' + err.message)
    console.error(err)
  }
}

// ── Load a race from history ──────────────────────────────────────
export async function loadRaceFromHistory (raceId) {
  showToast('⏳ Cargando carrera…')
  try {
    const race = await getRaceById(raceId)
    APP.activeRace = race
    APP.analysis   = race.race_sessions.map(s => sessionToAnalysis(s, APP.riders))

    // Load AI analyses
    APP.activeRace.ai_analyses = race.ai_analyses || []

    // Restore form fields
    if (document.getElementById('c-name'))  document.getElementById('c-name').value  = race.name  || ''
    if (document.getElementById('c-date'))  document.getElementById('c-date').value  = race.date  || ''
    if (document.getElementById('c-venue')) document.getElementById('c-venue').value = race.venue || ''
    if (document.getElementById('c-notes')) document.getElementById('c-notes').value = race.notes || ''

    const { renderDashboard } = await import('./pages/Dashboard.js')
    const { renderPower }     = await import('./pages/Power.js')
    const { renderHeartRate } = await import('./pages/HeartRate.js')
    const { renderProfile }   = await import('./pages/Profile.js')
    renderDashboard()
    renderPower()
    renderHeartRate()
    renderProfile()
    populateRiderSelect()

    navigate('dashboard')
    showToast('✅ Cargada: ' + race.name + ' · ' + APP.analysis.length + ' ciclistas')
  } catch (err) {
    showToast('❌ Error al cargar: ' + err.message)
  }
}

// ── Individual panel ──────────────────────────────────────────────
function populateRiderSelect () {
  const sel = document.getElementById('sel-rider')
  if (!sel) return
  sel.innerHTML = '<option value="">— Selecciona un ciclista —</option>'
  APP.analysis.forEach((r, i) => {
    sel.innerHTML += `<option value="${i}">${r.name}</option>`
  })
}

// ── Team panel ────────────────────────────────────────────────────
async function renderTeamPanel () {
  const el = document.getElementById('team-table-wrap')
  if (!el) return
  APP.riders = await getRiders(APP.team.id)
  updateSidebar()
  const { renderTeamTable } = await import('./pages/Team.js')
  renderTeamTable(APP.riders)
}

// ── History panel ─────────────────────────────────────────────────
async function renderHistoryPanel () {
  const el = document.getElementById('history-table-wrap')
  if (!el) return
  await loadRaces()
  const { renderHistory } = await import('./pages/History.js')
  renderHistory(APP.races)
}

// ── Stats panel ───────────────────────────────────────────────────
async function renderStatsPanel () {
  const el = document.getElementById('panel-estadisticas')
  if (!el) return
  const { renderStats } = await import('./pages/Stats.js')
  renderStats()
}

// ── AI analyses ───────────────────────────────────────────────────
export async function loadAIAnalyses () {
  if (!APP.activeRace?.id) return []
  return getAnalysesByRace(APP.activeRace.id)
}

export async function persistAIAnalysis (question, answer) {
  if (!APP.activeRace?.id) return null
  return saveAnalysis(APP.activeRace.id, { question, answer })
}

export async function removeAIAnalysis (analysisId) {
  await deleteAnalysis(analysisId)
}

// ── Toast ─────────────────────────────────────────────────────────
export function showToast (msg) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 3200)
}

// ── Export helpers ────────────────────────────────────────────────
export function downloadFile (content, filename, type) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Expose to HTML event handlers ────────────────────────────────
window.APP               = APP
window.navigate          = navigate
window.stageRaceFiles    = stageRaceFiles
window.stagePlantilla    = stagePlantilla
window.runAndSaveAnalysis= runAndSaveAnalysis
window.loadRaceFromHistory= loadRaceFromHistory
window.showToast         = showToast
window.downloadFile      = downloadFile
window.renderStagedFiles = renderStagedFiles
window.updateImportStatus= updateImportStatus

// ── Start ─────────────────────────────────────────────────────────
init()
