import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Obtener usuario actual (simulado para demo)
export async function GET() {
  try {
    // If Supabase is not configured, return demo user
    if (!supabase) {
      console.warn('Supabase not configured, returning demo user')
      return NextResponse.json({
        user: {
          id: 'demo-user-id',
          email: 'demo@biomov.com',
          name: 'Carlos Mendoza',
          rol: 'admin'
        }
      })
    }

    // En producción, esto vendría de la sesión/auth
    // Por ahora, obtenemos el usuario demo
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, rol')
      .eq('email', 'demo@biomov.com')
      .single()

    if (error || !user) {
      // If user doesn't exist, create demo user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: 'demo-user-id',
          email: 'demo@biomov.com',
          name: 'Carlos Mendoza',
          rol: 'admin'
        })
        .select('id, email, name, rol')
        .single()

      if (createError) {
        console.error('Error creating demo user:', createError)
        // Return mock user anyway
        return NextResponse.json({
          user: {
            id: 'demo-user-id',
            email: 'demo@biomov.com',
            name: 'Carlos Mendoza',
            rol: 'admin'
          }
        })
      }

      return NextResponse.json({ user: newUser })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        rol: user.rol
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}
