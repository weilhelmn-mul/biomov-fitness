import { NextRequest, NextResponse } from 'next/server'
import { supabaseFetch } from '@/lib/supabase'

// Tipos para la evaluación de fuerza isométrica
interface ForceCurvePoint {
  time: number   // Tiempo en segundos
  force: number  // Fuerza en kgf
}

interface IsometricForceEvaluation {
  athleteId?: string
  athleteName?: string
  muscleEvaluated: string        // Código del músculo: quads, biceps, etc.
  side: 'Izquierdo' | 'Derecho' | 'Bilateral'
  unit?: 'kg' | 'N'
  
  // Métricas principales de fuerza
  fmax: number                   // Fuerza máxima (kgf)
  forceAt200ms?: number          // Fuerza a los 200ms
  averageForce?: number          // Fuerza promedio
  testDuration?: number          // Duración del test (segundos)
  
  // Métricas de tiempo
  timeToFmax?: number            // Tiempo a Fmax (milisegundos)
  timeTo50Fmax?: number          // Tiempo a 50% Fmax
  timeTo90Fmax?: number          // Tiempo a 90% Fmax
  
  // RFD (Rate of Force Development)
  rfdMax?: number                // RFD máximo (kgf/s)
  rfd50ms?: number               // RFD 0-50ms
  rfd100ms?: number              // RFD 0-100ms
  rfd150ms?: number              // RFD 0-150ms
  rfd200ms?: number              // RFD 0-200ms
  
  // Parámetros del modelo exponencial
  tau?: number                   // Constante de tiempo τ
  forceModeled?: number          // Fuerza máxima modelada
  
  // Métricas de galga (una sola galga)
  galga1Max?: number
  galga1Avg?: number
  
  // Índices
  fatigueIndex?: number          // Índice de fatiga (%)
  symmetryIndex?: number         // Índice de simetría bilateral (%)
  
  // Curva de fuerza
  forceCurve?: ForceCurvePoint[]
  
  // Metadatos
  samplingRate?: number          // Hz (default: 50)
  calibrationFactor?: number
  deviceInfo?: Record<string, any>
  notes?: string
}

// ============================================================================
// GET - Obtener evaluaciones del atleta
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const muscleGroup = searchParams.get('muscleGroup')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const query: Record<string, string> = {
      'order': 'test_date.desc',
      'limit': String(limit)
    }
    
    if (muscleGroup) {
      query['muscle_evaluated'] = `eq.${muscleGroup}`
    }
    
    const { data, error } = await supabaseFetch<any[]>('isometric_evaluations', {
      select: '*',
      query
    })
    
    if (error) {
      console.error('[FORCE API] Error fetching evaluations:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message || JSON.stringify(error),
        evaluations: []
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      evaluations: data || [],
      total: data?.length || 0
    })
    
  } catch (error) {
    console.error('[FORCE API] Error in GET:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// ============================================================================
// POST - Guardar nueva evaluación de fuerza isométrica
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body: IsometricForceEvaluation = await request.json()
    
    console.log('[FORCE API] Recibiendo evaluación:', {
      athleteId: body.athleteId,
      athleteName: body.athleteName,
      muscle: body.muscleEvaluated,
      side: body.side,
      fmax: body.fmax,
      rfd: body.rfdMax
    })
    
    // Validar campos requeridos
    if (!body.muscleEvaluated || !body.side) {
      return NextResponse.json({ 
        success: false, 
        error: 'Campos requeridos: muscleEvaluated, side' 
      }, { status: 400 })
    }
    
    if (!body.fmax || body.fmax === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere fuerza máxima (fmax) mayor a 0' 
      }, { status: 400 })
    }
    
    // Validar si athleteId es un UUID válido
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }
    
    const evaluationData = {
      athlete_id: body.athleteId && isValidUUID(body.athleteId) ? body.athleteId : null,
      athlete_name: body.athleteName || 'Usuario',
      muscle_evaluated: body.muscleEvaluated,
      side: body.side,
      unit: body.unit || 'kg',
      test_date: new Date().toISOString(),
      
      // Métricas principales
      fmax: body.fmax || null,
      force_at_200ms: body.forceAt200ms || null,
      average_force: body.averageForce || null,
      test_duration: body.testDuration || null,
      
      // Métricas de tiempo
      time_to_fmax: body.timeToFmax || null,
      time_to_50fmax: body.timeTo50Fmax || null,
      time_to_90fmax: body.timeTo90Fmax || null,
      
      // RFD
      rfd_max: body.rfdMax || null,
      rfd_50ms: body.rfd50ms || null,
      rfd_100ms: body.rfd100ms || null,
      rfd_150ms: body.rfd150ms || null,
      rfd_200ms: body.rfd200ms || null,
      
      // Modelo
      tau: body.tau || null,
      force_modeled: body.forceModeled || null,
      
      // Galgas (una sola galga)
      galga1_max: body.galga1Max || null,
      galga2_max: null,
      galga1_avg: body.galga1Avg || null,
      galga2_avg: null,
      
      // Índices
      fatigue_index: body.fatigueIndex || null,
      symmetry_index: body.symmetryIndex || null,
      
      // Curva y metadatos
      force_curve: body.forceCurve || null,
      sampling_rate: body.samplingRate || 50,
      calibration_factor: body.calibrationFactor || null,
      device_info: body.deviceInfo || null,
      notes: body.notes || null
    }
    
    console.log('[FORCE API] Datos a insertar:', {
      athlete_id: evaluationData.athlete_id,
      athlete_name: evaluationData.athlete_name,
      muscle: evaluationData.muscle_evaluated,
      fmax: evaluationData.fmax
    })
    
    // Insertar en Supabase
    const { data, error } = await supabaseFetch<any>('isometric_evaluations', {
      method: 'POST',
      body: evaluationData
    })
    
    if (error) {
      console.error('[FORCE API] Error inserting evaluation:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error de base de datos: ' + (error.message || JSON.stringify(error))
      }, { status: 500 })
    }
    
    console.log('[FORCE API] Evaluación guardada:', data?.id)
    
    return NextResponse.json({ 
      success: true, 
      evaluation: data,
      message: 'Evaluación guardada exitosamente'
    })
    
  } catch (error: any) {
    console.error('[FORCE API] Error in POST:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al guardar la evaluación: ' + error.message 
    }, { status: 500 })
  }
}

// ============================================================================
// PUT - Actualizar evaluación existente
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de evaluación requerido' 
      }, { status: 400 })
    }
    
    // Mapear nombres de campos del frontend a la base de datos
    const fieldMapping: Record<string, string> = {
      forceAt200ms: 'force_at_200ms',
      averageForce: 'average_force',
      testDuration: 'test_duration',
      timeToFmax: 'time_to_fmax',
      timeTo50Fmax: 'time_to_50fmax',
      timeTo90Fmax: 'time_to_90fmax',
      rfdMax: 'rfd_max',
      rfd50ms: 'rfd_50ms',
      rfd100ms: 'rfd_100ms',
      rfd150ms: 'rfd_150ms',
      rfd200ms: 'rfd_200ms',
      forceModeled: 'force_modeled',
      galga1Max: 'galga1_max',
      galga1Avg: 'galga1_avg',
      fatigueIndex: 'fatigue_index',
      symmetryIndex: 'symmetry_index',
      forceCurve: 'force_curve',
      samplingRate: 'sampling_rate',
      calibrationFactor: 'calibration_factor',
      deviceInfo: 'device_info',
      athleteName: 'athlete_name',
      notes: 'notes',
      fmax: 'fmax',
      side: 'side',
      unit: 'unit',
      athleteId: 'athlete_id',
      muscleEvaluated: 'muscle_evaluated'
    }
    
    const dataToUpdate: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'id') continue
      const dbField = fieldMapping[key] || key
      dataToUpdate[dbField] = value
    }
    
    const { data, error } = await supabaseFetch<any>('isometric_evaluations', {
      method: 'PATCH',
      body: dataToUpdate,
      query: { 'id': `eq.${id}` }
    })
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message || JSON.stringify(error)
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      evaluation: data
    })
    
  } catch (error: any) {
    console.error('[FORCE API] Error in PUT:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al actualizar la evaluación: ' + error.message 
    }, { status: 500 })
  }
}

// ============================================================================
// DELETE - Eliminar evaluación
// ============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de evaluación requerido' 
      }, { status: 400 })
    }
    
    const { error } = await supabaseFetch(null, {
      method: 'DELETE',
      query: { 'id': `eq.${id}` }
    })
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message || JSON.stringify(error)
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Evaluación eliminada exitosamente' 
    })
    
  } catch (error: any) {
    console.error('[FORCE API] Error in DELETE:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al eliminar la evaluación: ' + error.message 
    }, { status: 500 })
  }
}
