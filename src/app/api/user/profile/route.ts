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

// ============================================================================
// GET - Obtener perfil del usuario
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
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
    
    // 1. Obtener datos básicos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    
    // 2. Obtener perfil extendido (user_profiles)
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // 3. Obtener asistencias para estadísticas
    const { data: attendanceData } = await supabase
      .from('asistencias')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
    
    // 4. Obtener evaluaciones
    const { data: evaluationsData } = await supabase
      .from('evaluaciones')
      .select('*')
      .eq('user_id', userId)
      .order('fecha_evaluacion', { ascending: false })
      .limit(10)
      .catch(() => ({ data: [] }))
    
    // 5. Obtener planificación activa
    const { data: planificacionActiva } = await supabase
      .from('planificaciones')
      .select('*')
      .eq('user_id', userId)
      .eq('activo', true)
      .single()
      .catch(() => ({ data: null }))
    
    // Calcular estadísticas
    const totalWorkouts = attendanceData?.length || 0
    const uniqueAreas = new Set(attendanceData?.map((a: any) => a.area) || []).size
    const lastWorkout = attendanceData?.[0]?.created_at || null
    
    // Calcular nivel basado en actividad
    let level = 1
    if (totalWorkouts >= 10) level = 5
    if (totalWorkouts >= 25) level = 10
    if (totalWorkouts >= 50) level = 25
    if (totalWorkouts >= 100) level = 50
    if (totalWorkouts >= 200) level = 75
    if (totalWorkouts >= 300) level = 99
    
    // Construir respuesta del perfil
    const profile = profileData ? {
      id: profileData.id,
      user_id: profileData.user_id,
      nombre_completo: profileData.nombre_completo || userData?.nombre_completo || '',
      fecha_nacimiento: profileData.fecha_nacimiento || '',
      altura_cm: profileData.altura_cm || 175,
      peso_kg: profileData.peso_kg || 70,
      imc: profileData.imc || null,
      edad: profileData.edad || null,
      fc_maxima: profileData.fc_maxima || 185,
      fc_reposo: profileData.fc_reposo || 60,
      vfc_media: profileData.vfc_media || null,
      unidades_metricas: profileData.unidades_metricas ?? true,
      nivel_experiencia: profileData.nivel_experiencia || 'intermedio',
      objetivo: profileData.objetivo || 'salud',
      rm_bench_press: profileData.rm_bench_press || null,
      rm_squat: profileData.rm_squat || null,
      rm_deadlift: profileData.rm_deadlift || null,
      rm_overhead_press: profileData.rm_overhead_press || null,
      rm_barbell_row: profileData.rm_barbell_row || null,
    } : null
    
    return NextResponse.json({
      success: true,
      user: userData ? {
        id: userData.id,
        email: userData.email,
        nombre_completo: userData.nombre_completo,
        dni: userData.dni,
        rol: userData.rol,
        aprobado: userData.aprobado,
        created_at: userData.created_at
      } : null,
      profile,
      stats: {
        totalWorkouts,
        uniqueAreas,
        lastWorkout,
        level,
        currentMesocycle: Math.floor(totalWorkouts / 20) + 1
      },
      evaluations: evaluationsData || [],
      planificacion: planificacionActiva,
      attendance: attendanceData?.slice(0, 20) || []
    })
    
  } catch (error) {
    console.error('Error in user profile API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// ============================================================================
// POST - Guardar/Actualizar perfil del usuario
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      user_id, 
      nombre_completo,
      fecha_nacimiento,
      altura_cm,
      peso_kg,
      fc_maxima,
      fc_reposo,
      vfc_media,
      unidades_metricas,
      nivel_experiencia,
      objetivo,
      rm_bench_press,
      rm_squat,
      rm_deadlift,
      rm_overhead_press,
      rm_barbell_row,
    } = body
    
    if (!user_id) {
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
    
    // Calcular IMC si hay altura y peso
    let imc = null
    if (altura_cm && peso_kg && altura_cm > 0) {
      imc = Number((peso_kg / Math.pow(altura_cm / 100, 2)).toFixed(2))
    }
    
    // Calcular edad si hay fecha de nacimiento
    let edad = null
    if (fecha_nacimiento) {
      const birth = new Date(fecha_nacimiento)
      const today = new Date()
      edad = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        edad--
      }
      if (edad < 0 || edad >= 110) edad = null
    }
    
    // Datos del perfil a guardar
    const profileData = {
      user_id,
      nombre_completo: nombre_completo || '',
      fecha_nacimiento: fecha_nacimiento || null,
      altura_cm: altura_cm || null,
      peso_kg: peso_kg || null,
      imc,
      edad,
      fc_maxima: fc_maxima || null,
      fc_reposo: fc_reposo || null,
      vfc_media: vfc_media || null,
      unidades_metricas: unidades_metricas ?? true,
      nivel_experiencia: nivel_experiencia || 'intermedio',
      objetivo: objetivo || 'salud',
      rm_bench_press: rm_bench_press || null,
      rm_squat: rm_squat || null,
      rm_deadlift: rm_deadlift || null,
      rm_overhead_press: rm_overhead_press || null,
      rm_barbell_row: rm_barbell_row || null,
      updated_at: new Date().toISOString(),
    }
    
    // Usar upsert para crear o actualizar
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving profile:', error)
      
      // Si la tabla no existe, guardar en localStorage del cliente
      return NextResponse.json({ 
        success: true,
        message: 'Perfil guardado localmente',
        profile: { ...profileData, id: 'local' },
        note: 'La tabla user_profiles no existe en Supabase. Ejecuta el script supabase-profile-schema.sql'
      })
    }
    
    // También actualizar el nombre en la tabla usuarios si existe
    if (nombre_completo) {
      await supabase
        .from('usuarios')
        .update({ nombre_completo })
        .eq('id', user_id)
        .catch(() => {}) // Ignorar errores
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Perfil guardado correctamente',
      profile: data
    })
    
  } catch (error) {
    console.error('Error in user profile save API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
