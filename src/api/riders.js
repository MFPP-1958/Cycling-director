import { supabase } from '../lib/supabase.js'

export async function getRiders (teamId) {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .eq('team_id', teamId)
    .order('name')
  if (error) throw error
  return data
}

export async function upsertRider (teamId, rider) {
  if (!teamId) throw new Error('No se ha detectado el ID del equipo.')

  // Primero, obtenemos los datos actuales si existe para ver si cambiaron las métricas
  let oldData = null
  if (rider.id) {
    try {
      const { data } = await supabase.from('riders').select('weight_kg, ftp_watts, fc_max').eq('id', rider.id).single()
      oldData = data
    } catch (e) {
      console.warn('No se pudo obtener datos previos del ciclista:', e)
    }
  }

  // Limpiamos fechas: si es string vacío, pasamos null
  const cleanDate = (d) => (d && d.trim() !== '') ? d : null

  const payload = {
    team_id:           teamId,
    name:              rider.name,
    birth_date:        cleanDate(rider.birthDate),
    weight_kg:         rider.weightKg  || null,
    ftp_watts:         rider.ftpWatts  || null,
    fc_max:            rider.fcMax     || null,
    category:          rider.category  || null,
    wkg:               rider.wkg       || null,
    is_pro:            rider.isPro     || false,
    is_active:         rider.isActive !== undefined ? rider.isActive : true,
    notes:             rider.notes     || null,
    registration_date: cleanDate(rider.registrationDate) || new Date().toISOString().split('T')[0],
    updated_at:        new Date().toISOString()
  }
  if (rider.id) payload.id = rider.id

  const { data, error } = await supabase
    .from('riders')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
  
  if (error) {
    console.error('Error en upsertRider:', error)
    throw error
  }

  // Registrar en el histórico si es nuevo o si cambiaron las métricas
  const wChanged   = !oldData || oldData.weight_kg !== payload.weight_kg
  const ftpChanged = !oldData || oldData.ftp_watts !== payload.ftp_watts
  const fcChanged  = !oldData || oldData.fc_max !== payload.fc_max

  if (data && (wChanged || ftpChanged || fcChanged)) {
    try {
      await supabase.from('rider_metrics_history').insert({
        rider_id:         data.id,
        team_id:          teamId,
        weight_kg:        data.weight_kg,
        ftp_watts:        data.ftp_watts,
        fc_max:           data.fc_max,
        wkg:              data.wkg,
        measurement_date: cleanDate(rider.measurementDate) || new Date().toISOString().split('T')[0]
      })
    } catch (e) {
      console.error('Error guardando histórico (no crítico):', e)
    }
  }

  return data
}

export async function deleteRider (riderId) {
  const { error } = await supabase
    .from('riders')
    .delete()
    .eq('id', riderId)
  if (error) throw error
}

export async function toggleRiderActive (riderId, isActive) {
  const { error } = await supabase
    .from('riders')
    .update({ is_active: isActive })
    .eq('id', riderId)
  if (error) throw error
}

export async function getRiderHistory (riderId) {
  const { data, error } = await supabase
    .from('rider_metrics_history')
    .select('*')
    .eq('rider_id', riderId)
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data
}

/** Import an array of rider objects (from CSV) */
export async function importRiders (teamId, riders) {
  const payload = riders.map(r => ({
    team_id:    teamId,
    name:       r.nombre || r.name,
    birth_date: r.fechaNac || r.birthDate || null,
    weight_kg:  parseFloat(r['Peso (kg)'] || r.weightKg) || null,
    ftp_watts:  parseInt(r['FTP (W)']    || r.ftpWatts)  || null,
    fc_max:     parseInt(r['FC Máxima (bpm)'] || r.fcMax) || null,
    category:   r['Categoría'] || r.category || null,
    wkg:        parseFloat(r['W/kg'] || r.wkg) || null,
    is_pro:     (r['PRO'] || r.isPro) === 'Sí' || (r['PRO'] || r.isPro) === true,
    is_active:  true,
    notes:      r.notas || r.notes || null
  }))

  const { data, error } = await supabase
    .from('riders')
    .upsert(payload, { onConflict: 'team_id,name' })
    .select()
  if (error) throw error
  return data
}
