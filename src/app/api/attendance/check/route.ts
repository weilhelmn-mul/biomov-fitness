import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Verificar si usuario ya registró asistencia recientemente en un área
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('usuarioId') || searchParams.get('usuario_id')
    const area = searchParams.get('area')

    console.log('🔍 Attendance check:', { usuarioId, area })

    if (!usuarioId || !area) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // If Supabase is not configured, allow registration
    if (!supabase) {
      console.warn('Supabase not configured, allowing registration')
      return NextResponse.json({
        canRegister: true,
        message: 'Puede registrar asistencia'
      })
    }

    // Calcular fecha límite (30 minutos atrás)
    const fechaLimite = new Date()
    fechaLimite.setMinutes(fechaLimite.getMinutes() - 30)

    // Buscar asistencia reciente - intentar con usuario_id primero
    let asistenciaReciente = null
    let error = null

    // Intentar con usuario_id
    const result1 = await supabase
      .from('asistencias')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('area', area)
      .gte('fecha', fechaLimite.toISOString())
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (result1.data) {
      asistenciaReciente = result1.data
    } else if (result1.error) {
      // Intentar con paciente_id como fallback
      const result2 = await supabase
        .from('asistencias')
        .select('*')
        .eq('paciente_id', usuarioId)
        .eq('area', area)
        .gte('fecha', fechaLimite.toISOString())
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (result2.data) {
        asistenciaReciente = result2.data
      }
      error = result2.error
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return NextResponse.json({
        canRegister: true,
        message: 'Puede registrar asistencia'
      })
    }

    if (asistenciaReciente) {
      const fechaAsistencia = new Date(asistenciaReciente.fecha)
      const minutosTranscurridos = Math.floor(
        (Date.now() - fechaAsistencia.getTime()) / (1000 * 60)
      )

      console.log('⚠️ Recent attendance found:', asistenciaReciente)

      return NextResponse.json({
        canRegister: false,
        lastAttendance: {
          id: asistenciaReciente.id,
          fecha: asistenciaReciente.fecha,
          area: asistenciaReciente.area
        },
        message: `Ya registraste asistencia en esta área hace ${minutosTranscurridos} minutos. Debes esperar 30 minutos entre registros en la misma área.`
      })
    }

    console.log('✅ Can register attendance')
    return NextResponse.json({
      canRegister: true,
      message: 'Puede registrar asistencia'
    })
  } catch (error) {
    console.error('Error checking attendance:', error)
    return NextResponse.json(
      { error: 'Error al verificar asistencia' },
      { status: 500 }
    )
  }
}
