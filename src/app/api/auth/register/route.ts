import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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

// Lista de emails autorizados para ser admin
const ADMIN_EMAILS = [
  'admin@biomov.com',
  'weilhelmn@gmail.com'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre_completo, email, password, dni } = body
    
    if (!nombre_completo || !email || !password || !dni) {
      return NextResponse.json({ 
        error: 'Todos los campos son requeridos' 
      }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Error de configuración del servidor' 
      }, { status: 500 })
    }
    
    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()
    
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Este email ya está registrado' 
      }, { status: 400 })
    }
    
    // Hashear la contraseña
    const password_hash = await bcrypt.hash(password, 10)
    
    // Determinar el rol y si necesita aprobación
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase().trim())
    const rol = isAdmin ? 'superadmin' : 'usuario'
    const aprobado = isAdmin // Los admins preautorizados se aprueban automáticamente
    
    // Crear el usuario
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        nombre_completo,
        email: email.toLowerCase().trim(),
        password_hash,
        dni,
        rol,
        aprobado
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting user:', insertError)
      return NextResponse.json({ 
        error: 'Error al crear la cuenta' 
      }, { status: 500 })
    }
    
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      nombre_completo: newUser.nombre_completo,
      dni: newUser.dni,
      rol: newUser.rol,
      aprobado: newUser.aprobado
    }
    
    return NextResponse.json({ 
      success: true, 
      user: userResponse,
      message: aprobado 
        ? 'Cuenta de administrador creada exitosamente' 
        : 'Cuenta creada. Pendiente de aprobación.'
    })
    
  } catch (error) {
    console.error('Error in register API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
