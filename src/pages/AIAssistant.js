import { APP, persistAIAnalysis, loadAIAnalyses, removeAIAnalysis, showToast, downloadFile } from '../main.js'

// ── State ─────────────────────────────────────────────────────────
const AI = { history: [], busy: false }

// ── Open / Close ──────────────────────────────────────────────────
export function openAI () {
  document.getElementById('ai-overlay').classList.add('open')
  document.getElementById('ai-drawer').classList.add('open')
  loadAndRenderSaved()
  setTimeout(() => document.getElementById('ai-textarea')?.focus(), 300)
}

export function closeAI () {
  document.getElementById('ai-overlay').classList.remove('open')
  document.getElementById('ai-drawer').classList.remove('open')
}

export function clearChat () {
  AI.history = []
  const box = document.getElementById('ai-messages')
  if (box) box.innerHTML = '<div class="aim b">🔄 Conversación reiniciada.</div>'
}

export function setPrompt (text) {
  const ta = document.getElementById('ai-textarea')
  if (ta) { ta.value = text; ta.focus() }
}

export function handleKey (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}

// ── Saved analyses panel ──────────────────────────────────────────
async function loadAndRenderSaved () {
  const list = document.getElementById('ai-saved-list')
  const area = document.getElementById('ai-saved-area')
  if (!list || !area) return

  const analyses = await loadAIAnalyses()
  if (!analyses.length) { area.style.display = 'none'; return }

  area.style.display = 'block'
  list.innerHTML = analyses.map(a => `
    <div class="ai-saved-item">
      <div class="ai-saved-hdr">
        <div class="ai-saved-q">${escHtml(a.question)}</div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          <span style="font-size:10px;color:var(--mu);font-family:'DM Mono',monospace">${new Date(a.created_at).toLocaleDateString('es')}</span>
          <button class="btn btn-sm" onclick="replayAnalysis('${a.id}')" style="font-size:10px;padding:2px 7px">Ver</button>
          <button class="btn btn-sm" onclick="deleteAnalysis('${a.id}')" style="color:#ff4757;font-size:10px;padding:2px 6px">✕</button>
        </div>
      </div>
      <div class="ai-saved-a">${escHtml(a.answer.slice(0, 180))}…</div>
    </div>`).join('')

  // Make functions available globally for inline onclick
  window.replayAnalysis = async (id) => {
    const all = await loadAIAnalyses()
    const a   = all.find(x => x.id === id)
    if (!a) return
    appendMessage('u', a.question)
    appendMessage('b', formatMarkdown(a.answer))
    appendActionRow(a.question, a.answer, id)
  }
  window.deleteAnalysis = async (id) => {
    if (!confirm('¿Eliminar este análisis?')) return
    await removeAIAnalysis(id)
    loadAndRenderSaved()
    showToast('🗑 Análisis eliminado')
  }
}

// ── Send message ──────────────────────────────────────────────────
export async function sendMessage () {
  if (AI.busy) { showToast('⏳ Espera la respuesta anterior...'); return }

  const question = document.getElementById('ai-textarea')?.value.trim()
  if (!question) { showToast('⚠ Escribe una pregunta'); return }
  if (!APP.analysis.length) { showToast('⚠ Carga y analiza una carrera primero'); return }

  AI.busy = true
  document.getElementById('ai-textarea').value = ''

  appendMessage('u', question)
  const thinkEl = appendMessage('th', '⏳ Analizando los datos de la carrera…')

  const system = `Eres un entrenador y analista experto en ciclismo de rendimiento. Respondes en español con formato Markdown estructurado: usa ## para títulos, ### para subtítulos, **negrita** para datos clave, listas con guiones, y párrafos bien separados. Estructura: resumen ejecutivo → análisis detallado → conclusiones y recomendaciones.`

  let messages = [...AI.history]
  if (!messages.length) {
    messages.push({ role: 'user', content: `Datos de la carrera:\n\n${buildContext()}\n\n---\n\nPregunta: ${question}` })
  } else {
    messages.push({ role: 'user', content: question })
  }

  try {
    // Call via Netlify Function proxy (API key stays server-side)
    const resp = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, model: 'claude-opus-4-5', max_tokens: 2000 })
    })
    const data = await resp.json()
    thinkEl.remove()

    if (data.error) {
      appendMessage('er', '❌ ' + (data.error.message || JSON.stringify(data.error)))
      AI.busy = false
      return
    }

    const answer = data.content?.[0]?.text || '(Sin respuesta)'
    AI.history = messages
    AI.history.push({ role: 'assistant', content: answer })
    if (AI.history.length > 20) AI.history = AI.history.slice(-20)

    appendMessage('b', formatMarkdown(answer))

    // Persist to Supabase
    const saved = await persistAIAnalysis(question, answer)
    appendActionRow(question, answer, saved?.id)
    loadAndRenderSaved()

  } catch (err) {
    thinkEl.remove()
    appendMessage('er', '❌ Error de conexión: ' + err.message)
  }

  AI.busy = false
  scrollMessages()
}

// ── Build race context string ─────────────────────────────────────
function buildContext () {
  if (!APP.analysis.length) return 'Sin datos de carrera.'
  const race = APP.activeRace
  let ctx = `Carrera: ${race?.name || 'N/A'}\n`
  if (race?.date)  ctx += `Fecha: ${race.date}\n`
  if (race?.venue) ctx += `Circuito: ${race.venue}\n`
  if (race?.notes) ctx += `Notas: ${race.notes}\n`
  ctx += `\n`

  APP.analysis.forEach(r => {
    ctx += `--- ${r.name} ---\n`
    ctx += `Categoría: ${r.categoria} | FTP: ${r.FTP}W | FCmáx: ${r.FCM}bpm | Peso: ${r.PESO}kg\n`
    ctx += `NP: ${r.NP}W | IF: ${r.IF} | TSS: ${r.TSS} | Dist: ${r.dist}km | Duración: ${r.durMin}min\n`
    ctx += `FC media: ${r.avgFC}bpm (${r.avgFCp}%FCmáx) | FC máx obs: ${r.maxFCo}bpm (${r.pctFC}%)\n`
    ctx += `Vel media: ${r.avgSp}km/h | Pot. activa: ${r.avgPwA}W | Eficiencia: ${r.eff}W/bpm\n`
    ctx += `Picos: 5s=${r.peaks.p5s}W | 30s=${r.peaks.p30s}W | 1min=${r.peaks.p1m}W | 5min=${r.peaks.p5m}W | 20min=${r.peaks.p20m}W\n`
    ctx += `Zonas FC: Z1=${r.fcZones[0]}% Z2=${r.fcZones[1]}% Z3=${r.fcZones[2]}% Z4=${r.fcZones[3]}% Z5=${r.fcZones[4]}%\n`
    ctx += `Zonas pot: Z1=${r.pwZones[0]}% Z2=${r.pwZones[1]}% Z3=${r.pwZones[2]}% Z4=${r.pwZones[3]}% Z5=${r.pwZones[4]}% Z6=${r.pwZones[5]}%\n`
    if (r.ts?.length > 3) {
      const drops = []
      for (let i = 1; i < r.ts.length; i++) {
        if (r.ts[i-1].pow > 100 && r.ts[i].pow < r.ts[i-1].pow * .75) drops.push(`min${r.ts[i].min}`)
      }
      if (drops.length) ctx += `Caídas potencia: ${drops.join(', ')}\n`
      ctx += `Serie (W/min): ${r.ts.map(t => `${t.min}'→${t.pow}W`).join(', ')}\n`
    }
    ctx += `\n`
  })
  return ctx
}

// ── Message rendering ─────────────────────────────────────────────
function appendMessage (type, html) {
  const box = document.getElementById('ai-messages')
  if (!box) return null
  const div = document.createElement('div')
  div.className = 'aim ' + type
  if (type === 'b') div.innerHTML = html
  else div.textContent = html
  box.appendChild(div)
  scrollMessages()
  return div
}

function appendActionRow (question, answer, analysisId) {
  const box = document.getElementById('ai-messages')
  if (!box) return
  const row = document.createElement('div')
  row.style.cssText = 'display:flex;gap:7px;align-self:flex-start;margin-top:2px'
  const copyBtn = document.createElement('button')
  copyBtn.className = 'btn btn-sm'; copyBtn.textContent = '📋 Copiar'; copyBtn.style.fontSize = '10px'
  copyBtn.onclick = () => { navigator.clipboard.writeText(answer); showToast('✅ Copiado') }
  const docBtn = document.createElement('button')
  docBtn.className = 'btn btn-sm btn-doc'; docBtn.textContent = '⬇ Word'; docBtn.style.fontSize = '10px'
  docBtn.onclick = () => exportSingleDoc(question, answer)
  row.appendChild(copyBtn); row.appendChild(docBtn)
  box.appendChild(row)
  scrollMessages()
}

function scrollMessages () {
  const box = document.getElementById('ai-messages')
  if (box) box.scrollTop = box.scrollHeight
}

// ── Markdown → HTML ───────────────────────────────────────────────
export function formatMarkdown (text) {
  let h = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
  h = h.replace(/`(.+?)`/g, '<code>$1</code>')
  h = h.replace(/^---+$/gm, '<hr>')
  h = h.replace(/((?:^[-*] .+\n?)+)/gm, m =>
    '<ul>' + m.replace(/^[-*] (.+)$/gm, '<li>$1</li>') + '</ul>')
  h = h.replace(/((?:^\d+\. .+\n?)+)/gm, m =>
    '<ol>' + m.replace(/^\d+\. (.+)$/gm, '<li>$1</li>') + '</ol>')
  h = h.replace(/\n{2,}/g, '</p><p>')
  h = h.replace(/\n/g, '<br>')
  if (!h.startsWith('<h') && !h.startsWith('<ul') && !h.startsWith('<ol') && !h.startsWith('<hr')) {
    h = '<p>' + h + '</p>'
  }
  return h
}

function escHtml (s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// ── Word export ───────────────────────────────────────────────────
export function exportAllAnalysesDoc () {
  if (!APP.activeRace) { showToast('⚠ Sin carrera activa'); return }
  loadAIAnalyses().then(analyses => {
    if (!analyses.length) { showToast('⚠ Sin análisis guardados'); return }
    const html = buildDocHTML(APP.activeRace, analyses)
    downloadFile(html, `analisis_ia_${(APP.activeRace.name || 'carrera').replace(/\s+/g, '_')}.doc`, 'application/msword')
    showToast('✅ Word descargado con ' + analyses.length + ' análisis')
  })
}

export async function exportRaceAnalysesDocById (raceId) {
  const { getRaceById } = await import('../api/races.js')
  const race    = APP.races.find(r => r.id === raceId)
  const analyses = race?.ai_analyses || await loadAIAnalyses()
  if (!analyses.length) { showToast('⚠ Sin análisis para esta carrera'); return }
  const html = buildDocHTML(race || APP.activeRace, analyses)
  downloadFile(html, `analisis_ia_${(race?.name || 'carrera').replace(/\s+/g, '_')}.doc`, 'application/msword')
  showToast('✅ Word descargado')
}

function exportSingleDoc (question, answer) {
  const race = APP.activeRace
  const html = buildDocHTML(race, [{ question, answer, created_at: new Date().toISOString() }])
  downloadFile(html, `analisis_ia_${Date.now()}.doc`, 'application/msword')
  showToast('✅ Word descargado')
}

function buildDocHTML (race, analyses) {
  const mdToHTML = txt => {
    let h = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    h = h.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>')
    h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    h = h.replace(/((?:^[-*] .+\n?)+)/gm, m => '<ul>' + m.replace(/^[-*] (.+)$/gm,'<li>$1</li>') + '</ul>')
    h = h.replace(/((?:^\d+\. .+\n?)+)/gm, m => '<ol>' + m.replace(/^\d+\. (.+)$/gm,'<li>$1</li>') + '</ol>')
    h = h.replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')
    if (!h.startsWith('<')) h = '<p>' + h + '</p>'
    return h
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.6;max-width:750px;margin:40px auto;color:#222}
  h1{font-size:18pt;color:#1a3a6e;border-bottom:2px solid #1a3a6e;padding-bottom:6px;margin-top:24px}
  h2{font-size:14pt;color:#1a3a6e;margin-top:20px}
  h3{font-size:12pt;color:#374151;margin-top:16px}
  p{margin:8px 0}ul,ol{margin:8px 0;padding-left:24px}li{margin:4px 0}
  strong{color:#111}hr{border:none;border-top:1px solid #ddd;margin:16px 0}
  .question{font-weight:bold;font-size:11pt;color:#1a3a6e;border-left:4px solid #1a3a6e;padding:8px 16px;margin:20px 0 12px;background:#f0f4ff}
  .meta{font-size:9pt;color:#666;margin-bottom:4px}
  .cover{text-align:center;padding:40px 0 30px}
  .cover h1{border:none;font-size:22pt}
</style></head><body>
<div class="cover">
  <h1>📊 Análisis IA — ${escHtml(race?.name || 'Carrera')}</h1>
  ${race?.date   ? `<p><strong>Fecha:</strong> ${race.date}</p>`   : ''}
  ${race?.venue  ? `<p><strong>Circuito:</strong> ${escHtml(race.venue)}</p>` : ''}
  ${race?.race_sessions?.length ? `<p><strong>Ciclistas:</strong> ${race.race_sessions.map(s => s.rider_name).join(', ')}</p>` : ''}
  <p><strong>Análisis:</strong> ${analyses.length} | <strong>Exportado:</strong> ${new Date().toLocaleDateString('es')}</p>
</div>
${analyses.map((a, i) => `
  <div class="meta">Análisis ${i + 1} · ${new Date(a.created_at).toLocaleDateString('es')} ${new Date(a.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</div>
  <div class="question">❓ ${escHtml(a.question)}</div>
  ${mdToHTML(a.answer)}
  <hr>`).join('\n')}
</body></html>`
}
