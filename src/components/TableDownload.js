import { downloadFile, showToast } from '../main.js'

export function getTableData (tableId) {
  const el  = document.getElementById(tableId)
  const tbl = el?.tagName === 'TABLE' ? el : el?.querySelector('table')
  if (!tbl) return { headers: [], rows: [] }
  const headers = Array.from(tbl.querySelectorAll('thead th')).map(th => th.innerText.trim())
  const rows    = Array.from(tbl.querySelectorAll('tbody tr'))
    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim().replace(/\s+/g, ' ')))
    .filter(r => r.some(v => v))
  return { headers, rows }
}

export function dlTableCSV (tableId, fileName) {
  const { headers, rows } = getTableData(tableId)
  if (!headers.length) { showToast('⚠ Tabla vacía'); return }
  const sep = ';'
  const csv = [headers, ...rows]
    .map(r => r.map(v => v.includes(sep) || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(sep))
    .join('\n')
  downloadFile('\uFEFF' + csv, (fileName || 'tabla') + '.csv', 'text/csv;charset=utf-8')
  showToast('✅ CSV: ' + (fileName || 'tabla') + '.csv')
}

export function dlTableXLSX (tableId, fileName) {
  const { headers, rows } = getTableData(tableId)
  if (!headers.length) { showToast('⚠ Tabla vacía'); return }
  if (typeof XLSX === 'undefined') { showToast('⚠ Librería Excel no cargada'); return }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((h, ci) => ({
    wch: Math.min(Math.max(h.length, ...rows.map(r => (r[ci] || '').length)) + 2, 40)
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, (fileName || 'tabla') + '.xlsx')
  showToast('✅ Excel: ' + (fileName || 'tabla') + '.xlsx')
}
