import { supabase } from '../lib/supabase.js'

export async function getAnalysesByRace (raceId) {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('race_id', raceId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveAnalysis (raceId, { question, answer, model = 'claude-opus-4-5' }) {
  const { data, error } = await supabase
    .from('ai_analyses')
    .insert({ race_id: raceId, question, answer, model })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAnalysis (analysisId) {
  const { error } = await supabase
    .from('ai_analyses')
    .delete()
    .eq('id', analysisId)
  if (error) throw error
}
