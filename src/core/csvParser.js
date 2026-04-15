/**
 * Robust CSV parser.
 * Handles: UTF-8 BOM, semicolon/comma delimiters, quoted fields.
 */
export function parseCSV (raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (!lines.length) return { headers: [], rows: [] }

  const delim = lines[0].includes(';') ? ';' : ','

  function splitLine (line) {
    const out = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === delim && !inQ) { out.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    out.push(cur.trim())
    return out.map(v => v.replace(/^"|"$/g, '').trim())
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = splitLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : '' })
    return obj
  })
  return { headers, rows }
}

/**
 * Parse a rider plantilla CSV into an array of rider objects.
 */
export function parsePlantillaCSV (raw) {
  const { rows } = parseCSV(raw)
  return rows
    .filter(r => (r['Nombre'] || '').trim())
    .map(r => ({
      name:      (r['Nombre'] || '').trim(),
      birthDate: r['Fecha Nac.'] || null,
      weightKg:  parseFloat((r['Peso (kg)'] || '0').replace(',', '.')) || null,
      ftpWatts:  parseInt(r['FTP (W)'] || 0) || null,
      fcMax:     parseInt(r['FC Máxima (bpm)'] || 0) || null,
      age:       parseInt(r['Edad'] || 0) || null,
      category:  (r['Categoría'] || r['Categoria'] || '').trim() || null,
      wkg:       parseFloat((r['W/kg'] || '0').replace(',', '.')) || null,
      isPro:     (r['PRO'] || 'No').trim() === 'Sí',
      notes:     null
    }))
}
