import { APP } from '../main.js'

// ── Paleta de colores por categoría ──────────────────────────────────
const CAT_PALETTE = {
  'Cadete 1º':  '#47a3ff',
  'Cadete 2º':  '#00AEEF',
  'Juvenil 1º': '#47ffb8',
  'Juvenil 2º': '#ffa502',
  'Sub-23':     '#c47fff',
  'Elite':      '#ff6b47',
  'Master 30':  '#2ed573',
  'Master 40':  '#2ed573',
  'Master 50':  '#ff4757',
  'Master 60':  '#ff4757',
  'PRO':        '#e8ff47',
}
function catColor (cat) {
  return CAT_PALETTE[cat] || '#7a8090'
}

// ── Renderizado ───────────────────────────────────────────────────────
export function renderStats () {
  const el = document.getElementById('panel-estadisticas')
  if (!el) return

  try {
    // Solo ciclistas activos
    const riders = (APP.riders || []).filter(r => r.is_active !== false)

    if (!riders.length) {
      el.innerHTML = `
        <div class="ptitle" style="font-size:22px;letter-spacing:2px">ESTADÍSTICAS DEL EQUIPO</div>
        <div class="psub">MÉTRICAS GLOBALES DE RENDIMIENTO</div>
        <div class="card" style="text-align:center;padding:60px">
          <div style="font-size:48px;margin-bottom:16px">📊</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--tx);margin-bottom:8px">Sin ciclistas en plantilla</div>
          <div style="color:var(--mu);font-size:13px">Añade ciclistas en <strong style="color:var(--ac)">Gestión de Plantilla</strong> para ver las estadísticas.</div>
        </div>`
      return
    }

    // ── Cálculos de métricas ─────────────────────────────────────────
    const total = riders.length

    const withFtp    = riders.filter(r => r.ftp_watts > 0)
    const withWkg    = riders.filter(r => r.wkg > 0)
    const withWeight = riders.filter(r => r.weight_kg > 0)

    const avg = (arr, fn) => arr.length ? (arr.reduce((s, r) => s + Number(fn(r)), 0) / arr.length) : null

    const avgFtp    = withFtp.length    ? Math.round(avg(withFtp, r => r.ftp_watts))            : null
    const avgWkg    = withWkg.length    ? avg(withWkg, r => r.wkg).toFixed(2)                   : null
    const avgWeight = withWeight.length ? Math.round(avg(withWeight, r => r.weight_kg))         : null

    // ── Mejores ciclistas ────────────────────────────────────────────
    const bestFtp = withFtp.length
      ? withFtp.reduce((a, b) => Number(a.ftp_watts) > Number(b.ftp_watts) ? a : b)
      : null
    const bestWkg = withWkg.length
      ? withWkg.reduce((a, b) => Number(a.wkg) > Number(b.wkg) ? a : b)
      : null
    const bestWkgValue = bestWkg ? Number(bestWkg.wkg).toFixed(2) : null

    // ── Distribución por categorías ─────────────────────────────────
    const catMap = {}
    riders.forEach(r => {
      const cat = r.category || '+50'
      catMap[cat] = (catMap[cat] || 0) + 1
    })
    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    const maxCatCount = catEntries.length ? catEntries[0][1] : 1

    // ── Helper de rayas de categoría ────────────────────────────────
    function catRow (cat, count) {
      const pct    = ((count / total) * 100).toFixed(1)
      const barPct = Math.round((count / maxCatCount) * 100)
      const color  = catColor(cat)
      return `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="min-width:88px;text-align:right">
            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
                          background:${color}22;color:${color};border:1px solid ${color}55">${cat}</span>
          </div>
          <div style="flex:1;background:var(--s3);border-radius:4px;height:7px;position:relative;overflow:hidden">
            <div style="width:${barPct}%;background:${color};height:100%;border-radius:4px;transition:width .4s ease"></div>
          </div>
          <div style="min-width:64px;text-align:right;font-size:13px;font-weight:500;color:var(--tx)">
            ${count} <span style="color:var(--mu);font-weight:400;font-size:11px">(${pct}%)</span>
          </div>
        </div>`
    }

    // ── Helper tarjeta métrica superior ──────────────────────────────
    function metricCard (label, value, unit, icon, valueColor = 'var(--tx)') {
      const display = value !== null ? `<span style="color:${valueColor}">${value}</span>` : '<span style="color:var(--mu)">—</span>'
      return `
        <div style="background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:20px 22px;
                    display:flex;justify-content:space-between;align-items:center;position:relative;overflow:hidden">
          <div>
            <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--mu);margin-bottom:8px">${label}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:38px;letter-spacing:1px;line-height:1">
              ${display}
              ${value !== null ? `<span style="font-size:18px;color:var(--mu);margin-left:3px">${unit}</span>` : ''}
            </div>
          </div>
          <div style="font-size:36px;opacity:0.12;user-select:none">${icon}</div>
        </div>`
    }

    // ── Helper tarjeta Mejor Ciclista ────────────────────────────────
    function champCard (sectionLabel, rider, value, unit, color = 'var(--wn)') {
      if (!rider) {
        return `
          <div style="margin-bottom:18px">
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--mu);margin-bottom:8px">${sectionLabel}</div>
            <div style="background:var(--s2);border:1px solid var(--b1);border-radius:8px;padding:16px 20px;color:var(--mu);font-size:12px">Sin datos</div>
          </div>`
      }
      const catC = catColor(rider.category)
      return `
        <div style="margin-bottom:18px">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--mu);margin-bottom:8px">${sectionLabel}</div>
          <div style="background:linear-gradient(135deg,var(--s2) 60%,${color}12);border:1px solid ${color}44;
                      border-radius:8px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:15px;font-weight:600;color:var(--tx);margin-bottom:4px">${rider.name}</div>
              <span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:600;
                            background:${catC}22;color:${catC};border:1px solid ${catC}55">${rider.category || '—'}</span>
            </div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:34px;color:${color};letter-spacing:1px;line-height:1">
              ${value}<span style="font-size:16px;color:var(--mu);margin-left:4px">${unit}</span>
            </div>
          </div>
        </div>`
    }

    // ── HTML final ───────────────────────────────────────────────────
    el.innerHTML = `
      <div class="ptitle" style="font-size:22px;letter-spacing:2px">ESTADÍSTICAS DEL EQUIPO</div>
      <div class="psub" style="letter-spacing:2px;text-transform:uppercase;font-size:11px;margin-bottom:22px">
        Métricas globales de rendimiento
      </div>

      <!-- TARJETAS SUPERIORES -->
      <div class="g4" style="margin-bottom:22px">
        ${metricCard('Total Ciclistas', total, '', '👥', 'var(--tx)')}
        ${metricCard('FTP Medio', avgFtp, 'W', '⚡', 'var(--wn)')}
        ${metricCard('W/kg Medio', avgWkg, '', '🏔', 'var(--ac)')}
        ${metricCard('Peso Medio', avgWeight, 'kg', '⚖️', 'var(--tx)')}
      </div>

      <!-- CUERPO: MEJORES + CATEGORÍAS -->
      <div class="g2" style="align-items:start;gap:18px">

        <!-- MEJORES CICLISTAS -->
        <div class="card">
          <div class="ctitle" style="display:flex;align-items:center;gap:7px;font-size:11px;letter-spacing:2px">
            🏆 MEJORES CICLISTAS
          </div>
          ${champCard('Mayor Potencia Absoluta (FTP)', bestFtp, bestFtp?.ftp_watts, 'W', '#ffa502')}
          ${champCard('Mayor Potencia Relativa (W/kg)', bestWkg, bestWkgValue, '', 'var(--ac)')}
        </div>

        <!-- DISTRIBUCIÓN POR CATEGORÍAS -->
        <div class="card">
          <div class="ctitle" style="font-size:11px;letter-spacing:2px;margin-bottom:18px">
            DISTRIBUCIÓN POR CATEGORÍAS
          </div>
          ${catEntries.map(([cat, count]) => catRow(cat, count)).join('')}
          ${catEntries.length === 0 ? '<div style="color:var(--mu);font-size:13px">Sin categorías definidas</div>' : ''}
        </div>

      </div>`
  } catch (err) {
    el.innerHTML = `<div style="color:var(--dg);padding:20px;">
      <h2>Error capturado en Stats.js:</h2>
      <pre style="white-space:pre-wrap;background:#111;padding:10px;border-radius:4px;margin-top:10px;">${err.stack}</pre>
    </div>`
  }
}
