import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysqlqyrxcqdfoagplkik.supabase.co'

// Use anon key for both client and server (works with RLS)
const getAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcWxxeXJ4Y3FkZm9hZ3Bsa2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2Nzc1MjcsImV4cCI6MjA4OTI1MzUyN30.bQGb_1XMNzwV0jf0SujWsv8xM1_X7rU33vrJi5S1-sM'

const SUPABASE_ANON_KEY = getAnonKey()

// Server-side Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Direct fetch helper
export async function supabaseFetch<T = any>(
  table: string, 
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    query?: Record<string, string>
    body?: any
    select?: string
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { method = 'GET', query = {}, body, select } = options
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`
  const params = new URLSearchParams()
  
  if (select) params.append('select', select)
  Object.entries(query).forEach(([key, value]) => params.append(key, value))
  
  if (params.toString()) url += `?${params.toString()}`
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
  
  if (method === 'POST') {
    headers['Prefer'] = 'return=representation'
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { data: null, error: data }
    }
    
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Client-side Supabase client for Realtime
export function createClientSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}

// Asistencia type for realtime
export interface Asistencia {
  id: string
  usuario_id: string | null
  nombre_completo: string
  area: string
  area_id: string | null
  observacion: string | null
  fecha: string
  dispositivo: string | null
  ip_address: string | null
  created_at: string
}

// Realtime subscription helper
export function subscribeToAttendance(
  onInsert: (payload: Asistencia) => void,
  onUpdate?: (payload: Asistencia) => void,
  onDelete?: (id: string) => void
): { unsubscribe: () => void } | null {
  const client = createClientSupabase()

  const channel = client
    .channel('attendance-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'asistencias' },
      (payload) => {
        onInsert(payload.new as Asistencia)
      }
    )

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'asistencias' },
      (payload) => {
        onUpdate(payload.new as Asistencia)
      }
    )
  }

  if (onDelete) {
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'asistencias' },
      (payload) => {
        onDelete(payload.old.id as string)
      }
    )
  }

  channel.subscribe()

  return {
    unsubscribe: () => {
      client.removeChannel(channel)
    }
  }
}

// Types for our database tables
export interface User {
  id: string
  email: string
  name: string | null
  dni: string | null
  rol: string
  created_at: string
  updated_at: string
}
