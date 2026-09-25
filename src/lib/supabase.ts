import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function requireConfig(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }
  return { url: supabaseUrl, key: supabaseAnonKey }
}

let cached: SupabaseClient | null = null

function anonClient(): SupabaseClient {
  if (!cached) {
    const { url, key } = requireConfig()
    cached = createClient(url, key)
  }
  return cached
}

// Created on first use rather than on import, so a build without env vars
// present does not fail while Next collects page data.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = anonClient() as unknown as Record<string | symbol, unknown>
    const value = client[property]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// Requests made through this client carry the user's JWT, so row level
// security sees the signed-in user instead of the anonymous role.
export function createAuthedClient(accessToken: string): SupabaseClient {
  const { url, key } = requireConfig()
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
