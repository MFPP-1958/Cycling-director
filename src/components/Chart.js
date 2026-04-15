import { APP } from '../main.js'

export const COLORS = ['#e8ff47','#47a3ff','#47ffb8','#ffa502','#c47fff','#ff6b47','#ff4757','#47ffea']
export const COLORS_A = COLORS.map(c => c + '38')

const BG_COLOR = '#12151a'
const TX = { color: '#9aa0b0', font: { size: 11, family: "'DM Sans',sans-serif" } }
const GR = { color: 'rgba(255,255,255,0.07)' }

// Register background fill plugin
const bgPlugin = {
  id: 'bg',
  beforeDraw (chart) {
    const { ctx, width, height } = chart
    ctx.save(); ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, width, height); ctx.restore()
  }
}

let pluginsRegistered = false
export function ensurePlugins () {
  if (pluginsRegistered) return
  pluginsRegistered = true
  Chart.register(bgPlugin)
  if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels)
}

/**
 * Create or replace a Chart.js chart.
 * @param {string} id        - canvas element id
 * @param {string} type      - bar | line | radar | doughnut
 * @param {string[]} labels
 * @param {object[]} datasets
 * @param {object} opts      - Chart.js scales/plugins overrides
 * @param {string} title     - shown inside canvas (survives PNG export)
 * @param {string} unit      - W | % | km/h | x
 */
export function makeChart (id, type, labels, datasets, opts = {}, title = '', unit = '') {
  ensurePlugins()
  const cv = document.getElementById(id)
  if (!cv) return null

  if (APP.charts[id]) { APP.charts[id].destroy(); delete APP.charts[id] }

  const isStacked = opts.scales?.x?.stacked
  const isBar     = type === 'bar'
  const isLine    = type === 'line'
  const isRadar   = type === 'radar'

  // Auto-attach datalabels per dataset
  datasets = datasets.map(ds => {
    if (ds.datalabels !== undefined) return ds
    if (isBar && !isStacked) {
      ds.datalabels = {
        display: true, anchor: 'end', align: 'top',
        color: '#e0e4ee', font: { size: 11, weight: '600', family: "'DM Sans',sans-serif" },
        padding: { bottom: 2 },
        formatter: v => {
          if (v === null || v === undefined || v === '') return ''
          if (unit === '%')   return v + '%'
          if (unit === 'W')   return v + 'W'
          if (unit === 'x')   return '×' + v
          return '' + v
        }
      }
    } else if (isBar && isStacked) {
      ds.datalabels = {
        display: ctx => ctx.dataset.data[ctx.dataIndex] > 5,
        anchor: 'center', align: 'center', color: '#fff',
        font: { size: 10, weight: '600', family: "'DM Sans',sans-serif" },
        formatter: v => v > 5 ? v + '%' : ''
      }
    } else {
      ds.datalabels = { display: false }
    }
    return ds
  })

  const showLegend = datasets.length > 1 || isStacked || isRadar

  const chart = new Chart(cv, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      layout: { padding: { top: title ? 2 : 10, right: 16, bottom: 8, left: 8 } },
      plugins: {
        legend: {
          display: showLegend, position: 'top',
          labels: { color: '#ccd0da', font: { size: 11, family: "'DM Sans',sans-serif" }, padding: 10, boxWidth: 12, boxHeight: 12 }
        },
        title: {
          display: !!title, text: title,
          color: '#eef0f5', font: { size: 12, weight: '600', family: "'DM Sans',sans-serif" },
          padding: { top: 8, bottom: 4 }
        },
        datalabels: {}
      },
      ...opts,
      ...(opts.scales ? { scales: opts.scales } : {})
    },
    plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []
  })

  APP.charts[id] = chart

  // Per-chart PNG download button
  const card = cv.closest('.card')
  if (card) {
    card.querySelector('.chart-dl-btn')?.remove()
    const btn = document.createElement('button')
    btn.className = 'btn btn-sm chart-dl-btn'
    btn.title = 'Descargar PNG'
    btn.innerHTML = '⬇ PNG'
    btn.onclick = e => {
      e.stopPropagation()
      const a = document.createElement('a')
      a.download = (title || id).replace(/[^a-zA-Z0-9_\s-]/g, '').replace(/\s+/g, '_').slice(0, 60) + '.png'
      a.href = chart.toBase64Image('image/png', 1)
      a.click()
      if (window.showToast) window.showToast('✅ PNG descargado')
    }
    card.style.position = 'relative'
    card.appendChild(btn)
  }

  return chart
}

/** Shorthand: scales helper */
export function SY (min) {
  return { y: { min: min || 0, ticks: TX, grid: GR }, x: { ticks: { ...TX, maxRotation: 0 }, grid: GR } }
}

/** Shorthand: bar dataset */
export function BD (label, data, bg, extra = {}) {
  return { label, data, backgroundColor: bg, borderRadius: 4, ...extra }
}
