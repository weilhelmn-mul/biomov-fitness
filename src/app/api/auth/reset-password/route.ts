import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, new_password } = body
    
    if (!email || !new_password) {
      return NextResponse.json({ 
        error: 'Email y nueva contraseña son requeridos' 
      }, { status: 400 })
    }
    
    if (new_password.length < 6) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 })
    }
    
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Hash the new password
    const password_hash = await bcrypt.hash(new_password, 10)
    
    // Update user password
    const { data, error } = await supabase
      .from('usuarios')
      .update({ password_hash })
      .eq('email', email.toLowerCase().trim())
      .select('id, email, nombre_completo')
    
    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json({ 
        error: 'Error al actualizar contraseña: ' + error.message 
      }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contraseña actualizada correctamente',
      user: data[0]
    })
    
  } catch (error: any) {
    console.error('Error in reset password API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
