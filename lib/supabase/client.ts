import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let _client: ReturnType<typeof createClient> | null = null

/** Lazily create the Supabase client. Returns null when env vars are missing,
 * so callers can fall back to demo data instead of crashing the build. */
export function getSupabase() {
  if (_client) return _client
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set. ' +
          'Falling back to demo data.',
      )
    }
    return null
  }
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return _client
}

/** Convenience export — null when not configured. */
export const supabase = _client