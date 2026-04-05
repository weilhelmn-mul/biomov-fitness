import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Hardcoded credentials for immediate functionality
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysqlqyrxcqdfoagplkik.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcWxxeXJ4Y3FkZm9hZ3Bsa2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2Nzc1MjcsImV4cCI6MjA4OTI1MzUyN30.bQGb_1XMNzwV0jf0SujWsv8xM1_X7rU33vrJi5S1-sM'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}
