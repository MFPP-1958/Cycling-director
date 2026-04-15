import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasEnv = !!(supabaseUrl && supabaseKey)

if (!hasEnv) {
  console.warn(
    '[CyclingDirector] Alerta: Faltan variables de entorno de Supabase.\n' +
    'Crea un archivo .env basado en .env.example con tus credenciales.'
  )
}

export const supabase = hasEnv 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/** Returns current authenticated user or null */
export async function getUser () {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Returns the team row for the current user, creating one if needed */
export async function getOrCreateTeam (user) {
  const { data: existing } = await supabase
    .from('teams')
    .select('*')
    .eq('created_by', user.id)
    .single()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('teams')
    .insert({ name: 'Mi equipo', created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return created
}
