import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  // Obtener usuarios (sin password_hash)
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, email, nombre_completo, rol, aprobado, password_hash')
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Verificar si tienen password_hash
  const users = data?.map(u => ({
    id: u.id,
    email: u.email,
    nombre_completo: u.nombre_completo,
    rol: u.rol,
    aprobado: u.aprobado,
    has_password: !!u.password_hash
  }))
  
  return NextResponse.json({ 
    total: users?.length || 0,
    users 
  })
}
