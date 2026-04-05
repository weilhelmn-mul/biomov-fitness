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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario requerido' 
      }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Error de configuración del servidor' 
      }, { status: 500 })
    }
    
    const { error } = await supabase
      .from('usuarios')
      .update({ aprobado: true })
      .eq('id', userId)
    
    if (error) {
      console.error('Error approving user:', error)
      return NextResponse.json({ 
        error: 'Error al aprobar usuario' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Usuario aprobado correctamente' 
    })
    
  } catch (error) {
    console.error('Error in approve user API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario requerido' 
      }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Error de configuración del servidor' 
      }, { status: 500 })
    }
    
    // Primero eliminar registros relacionados
    // Eliminar evaluaciones del usuario
    await supabase
      .from('evaluaciones')
      .delete()
      .eq('user_id', userId)
    
    // Eliminar sesiones del usuario
    await supabase
      .from('sesiones_entrenamiento')
      .delete()
      .eq('user_id', userId)
    
    // Eliminar perfil del usuario
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)
    
    // Eliminar registros de recuperación
    await supabase
      .from('registros_recuperacion')
      .delete()
      .eq('user_id', userId)
    
    // Finalmente eliminar el usuario
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', userId)
    
    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ 
        error: 'Error al eliminar usuario' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Usuario eliminado correctamente' 
    })
    
  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
