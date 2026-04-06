import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SUPABASE CONFIGURATION
// These credentials are for the BIOMOV project
// ============================================================================

// Supabase credentials - using publishable key format
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysqlqyrxcqdfoagplkik.supabase.co'

// Try multiple key formats - Supabase publishable keys work differently
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'sb_publishable_Ldw3nlZZtKYgR08HVbw6BQ_WzVvN9w_'

// Check if we're using a publishable key (starts with 'sb_publishable_')
const isPublishableKey = SUPABASE_KEY.startsWith('sb_publishable_')

// Server-side Supabase client
// Note: Publishable keys may need special handling
export const supabase = isPublishableKey 
  ? null // Publishable keys don't work with the standard client
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

// Direct fetch helper for publishable keys
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
  
  // Build URL with query params
  let url = `${SUPABASE_URL}/rest/v1/${table}`
  const params = new URLSearchParams()
  
  if (select) params.append('select', select)
  Object.entries(query).forEach(([key, value]) => params.append(key, value))
  
  if (params.toString()) url += `?${params.toString()}`
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
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
  if (isPublishableKey) {
    console.warn('Publishable key used - Realtime features may not work')
    return null
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
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
