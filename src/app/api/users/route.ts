import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // If Supabase is not configured, return empty array
    if (!supabase) {
    console.warn('[USERS API] Supabase not configured, returning empty data')
      return NextResponse.json({ users: [] })
    }
    
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo, dni, rol, aprobado, created_at')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ 
        error: 'Error al obtener usuarios',
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ users: users || [] })
    
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
