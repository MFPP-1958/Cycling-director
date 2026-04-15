import { supabase } from '../lib/supabase.js'

// ── RACES ─────────────────────────────────────────────────────────

export async function getRaces (teamId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('races')
    .select(`
      *,
      race_sessions ( id, rider_name, np_watts, if_score, tss, dist_km ),
      ai_analyses   ( id )
    `)
    .eq('team_id', teamId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getRaceById (raceId) {
  const { data, error } = await supabase
    .from('races')
    .select(`
      *,
      race_sessions ( * ),
      ai_analyses   ( * )
    `)
    .eq('id', raceId)
    .single()
  if (error) throw error
  return data
}

export async function createRace (teamId, { name, date, venue, notes }) {
  const { data, error } = await supabase
    .from('races')
    .insert({ team_id: teamId, name, date: date || null, venue: venue || null, notes: notes || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRace (raceId, fields) {
  const { data, error } = await supabase
    .from('races')
    .update(fields)
    .eq('id', raceId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRace (raceId) {
  const { error } = await supabase.from('races').delete().eq('id', raceId)
  if (error) throw error
}

// ── SESSIONS ─────────────────────────────────────────────────────

export async function upsertSession (raceId, metrics) {
  const payload = {
    race_id:          raceId,
    rider_id:         metrics.riderId     || null,
    rider_name:       metrics.name,
    file_name:        metrics.fileName    || null,
    np_watts:         metrics.NP,
    if_score:         metrics.IF,
    tss:              metrics.TSS,
    dist_km:          metrics.dist,
    duration_min:     metrics.durMin,
    avg_fc:           metrics.avgFC,
    max_fc_obs:       metrics.maxFCo,
    pct_fcmax:        metrics.pctFC,
    avg_fc_pct:       metrics.avgFCp,
    avg_speed:        metrics.avgSp,
    max_speed:        metrics.maxSp,
    max_power:        metrics.maxPow,
    avg_power_active: metrics.avgPwA,
    efficiency:       metrics.eff,
    peaks:            metrics.peaks,
    fc_zones:         metrics.fcZones,
    pw_zones:         metrics.pwZones,
    timeseries:       metrics.ts
  }

  const { data, error } = await supabase
    .from('race_sessions')
    .upsert(payload, { onConflict: 'race_id,rider_name' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSessionsByRace (raceId) {
  const { data, error } = await supabase
    .from('race_sessions')
    .select('*')
    .eq('race_id', raceId)
    .order('rider_name')
  if (error) throw error
  return data
}

/** Convert a DB session row back to the shape the UI components expect */
export function sessionToAnalysis (session, riders = []) {
  const rider = riders.find(r => r.id === session.rider_id) || {}
  return {
    id:        session.id,
    name:      session.rider_name,
    fileName:  session.file_name,
    FTP:       rider.ftp_watts  || 250,
    FCM:       rider.fc_max     || 195,
    PESO:      rider.weight_kg  || 65,
    categoria: rider.category   || '—',
    wkg:       rider.wkg        || 0,
    edad:      rider.edad       || 0,
    NP:        session.np_watts,
    IF:        session.if_score,
    TSS:       session.tss,
    dist:      session.dist_km,
    durMin:    session.duration_min,
    avgFC:     session.avg_fc,
    maxFCo:    session.max_fc_obs,
    pctFC:     session.pct_fcmax,
    avgFCp:    session.avg_fc_pct,
    avgSp:     session.avg_speed,
    maxSp:     session.max_speed,
    maxPow:    session.max_power,
    avgPwA:    session.avg_power_active,
    eff:       session.efficiency,
    peaks:     session.peaks    || { p5s:0, p30s:0, p1m:0, p5m:0, p20m:0 },
    fcZones:   session.fc_zones || [0,0,0,0,0],
    pwZones:   session.pw_zones || [0,0,0,0,0,0],
    ts:        session.timeseries || []
  }
}
