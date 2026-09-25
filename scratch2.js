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
  const { data, error } = await supabase.from('pickups').insert([{}]).select()
  console.log("Error:", error)
}

run()
