
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('Checking columns for table "riders"...')
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching riders:', error)
  } else {
    console.log('Columns found in first row:', Object.keys(data[0] || {}))
  }
}

checkSchema()
