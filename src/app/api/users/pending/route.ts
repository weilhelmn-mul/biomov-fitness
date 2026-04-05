import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) return null
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ users: [] })
    }
    
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo, dni, rol, created_at')
      .eq('aprobado', false)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching pending users:', error)
      return NextResponse.json({ users: [] })
    }
    
    return NextResponse.json({ users: users || [] })
    
  } catch (error) {
    console.error('Error in pending users API:', error)
    return NextResponse.json({ users: [] })
  }
}
