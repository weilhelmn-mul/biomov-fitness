import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const VALID_ROLES = ['super_admin', 'superadmin', 'admin', 'entrenador', 'paciente', 'usuario']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, new_role, requester_id } = body
    
    console.log('[UPDATE-ROLE API] Request:', { user_id, new_role, requester_id })
    
    // Validaciones
    if (!user_id || !new_role) {
      return NextResponse.json({ 
        error: 'user_id y new_role son requeridos' 
      }, { status: 400 })
    }
    
    if (!VALID_ROLES.includes(new_role)) {
      return NextResponse.json({ 
        error: 'Rol inválido. Roles válidos: ' + VALID_ROLES.join(', ') 
      }, { status: 400 })
    }
    
    // Si Supabase no está configurado, usar modo demo
    if (!supabase) {
      console.warn('[UPDATE-ROLE API] Supabase no configurado - modo demo')
      return NextResponse.json({ 
        success: true,
        message: `[MODO DEMO] Rol actualizado a "${new_role}"`,
        user: {
          id: user_id,
          email: 'demo@example.com',
          nombre_completo: 'Usuario Demo',
          old_role: 'usuario',
          new_role: new_role
        },
        warning: '⚠️ Credenciales de Supabase no configuradas. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
      })
    }
    
    // Verificar que el solicitante es super_admin
    const { data: requester, error: requesterError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', requester_id)
      .single()
    
    console.log('[UPDATE-ROLE API] Requester query result:', { requester, error: requesterError?.message })
    
    // Si hay error de API key inválido, entrar en modo demo
    if (requesterError) {
      if (requesterError.message?.includes('Invalid API key') || requesterError.message?.includes('JWT')) {
        console.warn('[UPDATE-ROLE API] Credenciales inválidas - modo demo')
        return NextResponse.json({ 
          success: true,
          message: `[MODO DEMO] Rol actualizado a "${new_role}"`,
          user: {
            id: user_id,
            email: 'demo@example.com',
            nombre_completo: 'Usuario Demo',
            old_role: 'usuario',
            new_role: new_role
          },
          warning: '⚠️ Las credenciales de Supabase no son válidas. Verifica NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
        })
      }
      
      // Usuario no encontrado - modo demo con advertencia
      return NextResponse.json({ 
        success: true,
        message: `[MODO DEMO] Rol actualizado a "${new_role}"`,
        user: {
          id: user_id,
          email: 'demo@example.com',
          nombre_completo: 'Usuario Demo',
          old_role: 'usuario',
          new_role: new_role
        },
        warning: '⚠️ Usuario solicitante no encontrado. Los cambios son temporales.'
      })
    }
    
    if (!requester) {
      return NextResponse.json({ 
        success: true,
        message: `[MODO DEMO] Rol actualizado a "${new_role}"`,
        user: {
          id: user_id,
          email: 'demo@example.com',
          nombre_completo: 'Usuario Demo',
          old_role: 'usuario',
          new_role: new_role
        },
        warning: '⚠️ Modo demo activado'
      })
    }
    
    // Verificar si es super_admin (aceptando ambas variantes)
    if (requester.rol !== 'superadmin' && requester.rol !== 'super_admin') {
      return NextResponse.json({ 
        error: 'No autorizado - Solo super_admin puede cambiar roles',
        your_role: requester.rol
      }, { status: 403 })
    }
    
    // Obtener el usuario a actualizar
    const { data: targetUser, error: targetError } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo, rol')
      .eq('id', user_id)
      .single()
    
    if (targetError || !targetUser) {
      console.error('Error fetching target user:', targetError)
      return NextResponse.json({ 
        error: 'Usuario a actualizar no encontrado' 
      }, { status: 404 })
    }
    
    // Actualizar el rol
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ rol: new_role })
      .eq('id', user_id)
    
    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json({ 
        error: 'Error al actualizar el rol',
        details: updateError.message 
      }, { status: 500 })
    }
    
    console.log('[UPDATE-ROLE API] Role updated successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `Rol actualizado de "${targetUser.rol}" a "${new_role}"`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        nombre_completo: targetUser.nombre_completo,
        old_role: targetUser.rol,
        new_role: new_role
      }
    })
    
  } catch (error) {
    console.error('Error in update-role API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
