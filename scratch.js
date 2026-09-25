const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envContent = fs.readFileSync('.env.local', 'utf-8')
const envConfig = {}
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...value] = line.split('=')
    envConfig[key.trim()] = value.join('=').trim()
  }
})

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = envConfig['NEXT_PUBLIC_SUPABASE_ANON_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Checking tables...")
  const tables = ['profiles', 'food_donations', 'food_requests', 'pickups']
  
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`)
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`Error: ${error.message}`)
    } else {
      console.log(data)
    }
  }
}

run()
