import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    
    console.log('[LOGIN API] Request received for email:', email)
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email y contraseña son requeridos' 
      }, { status: 400 })
    }
    
    // If Supabase is not configured, return error
    if (!supabase) {
      console.warn('[LOGIN API] Supabase not configured')
      return NextResponse.json({ 
        error: 'Servicio no disponible temporalmente' 
      }, { status: 503 })
    }
    
    // Buscar usuario por email
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()
    
    if (error || !user) {
      console.log('[LOGIN API] User not found:', error)
      return NextResponse.json({ 
        error: 'Credenciales inválidas' 
      }, { status: 401 })
    }
    
    // Verificar contraseña
    if (!user.password_hash) {
      console.log('[LOGIN API] No password_hash for user')
      return NextResponse.json({ 
        error: 'Cuenta no configurada correctamente' 
      }, { status: 401 })
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      console.log('[LOGIN API] Invalid password')
      return NextResponse.json({ 
        error: 'Credenciales inválidas' 
      }, { status: 401 })
    }
    
    console.log('[LOGIN API] Login successful for:', user.email)
    
    // Retornar usuario sin el hash de contraseña
    const userResponse = {
      id: user.id,
      email: user.email,
      nombre_completo: user.nombre_completo,
      dni: user.dni,
      rol: user.rol,
      aprobado: user.aprobado
    }
    
    return NextResponse.json({ 
      success: true, 
      user: userResponse 
    })
    
  } catch (error) {
    console.error('Error in login API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
