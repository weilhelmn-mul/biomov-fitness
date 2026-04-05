import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Tipos para la evaluación de fuerza isométrica
interface ForceCurvePoint {
  time: number   // Tiempo en segundos
  force: number  // Fuerza en kgf
}

interface IsometricForceEvaluation {
  athleteId: string
  athleteName: string
  muscleEvaluated: string        // Código del músculo: quads_l, biceps_r, etc.
  side: 'Izquierdo' | 'Derecho' | 'Bilateral'
  unit: 'kg' | 'N'
  
  // Métricas principales de fuerza
  fmax: number                   // Fuerza máxima (kgf)
  forceAt200ms: number           // Fuerza a los 200ms
  averageForce: number           // Fuerza promedio
  testDuration: number           // Duración del test (segundos)
  
  // Métricas de tiempo
  timeToFmax: number             // Tiempo a Fmax (segundos)
  timeTo50Fmax: number           // Tiempo a 50% Fmax
  timeTo90Fmax: number           // Tiempo a 90% Fmax
  
  // RFD (Rate of Force Development)
  rfdMax: number                 // RFD máximo (kgf/s)
  rfd50ms: number                // RFD 0-50ms
  rfd100ms: number               // RFD 0-100ms
  rfd150ms: number               // RFD 0-150ms
  rfd200ms: number               // RFD 0-200ms
  
  // Parámetros del modelo exponencial
  tau: number                    // Constante de tiempo τ
  forceModeled: number           // Fuerza máxima modelada
  
  // Métricas de galgas (celdas dobles)
  galga1Max?: number
  galga2Max?: number
  galga1Avg?: number
  galga2Avg?: number
  
  // Índices
  fatigueIndex: number           // Índice de fatiga (%)
  symmetryIndex: number          // Índice de simetría bilateral (%)
  
  // Curva de fuerza
  forceCurve: ForceCurvePoint[]
  
  // Metadatos
  samplingRate?: number          // Hz (default: 50)
  calibrationFactor?: number
  deviceInfo?: Record<string, any>
  notes?: string
}

// Inicializar Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  
  return createClient(supabaseUrl, supabaseKey)
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
    
    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId es requerido' }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase no configurado',
        evaluations: []
      }, { status: 500 })
    }
    
    let query = supabase
      .from('isometric_evaluations')
      .select(`
        *,
        muscle_groups!left(name_es, region, code)
      `)
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: false })
      .limit(limit)
    
    if (muscleGroup) {
      query = query.eq('muscle_evaluated', muscleGroup)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[FORCE API] Error fetching evaluations:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        evaluations: []
      }, { status: 500 })
    }
    
    // Transformar los datos para incluir el código del músculo
    const transformedData = data?.map(evaluation => ({
      ...evaluation,
      muscle_code: evaluation.muscle_evaluated,
      muscle_name: evaluation.muscle_groups?.name_es || null
    })) || []
    
    return NextResponse.json({ 
      success: true, 
      evaluations: transformedData,
      total: transformedData.length
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
    
    // Validar campos requeridos
    const requiredFields = ['athleteId', 'muscleEvaluated', 'side', 'fmax']
    for (const field of requiredFields) {
      if (!body[field as keyof IsometricForceEvaluation]) {
        return NextResponse.json({ 
          success: false, 
          error: `Campo requerido: ${field}` 
        }, { status: 400 })
      }
    }
    
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase no configurado' 
      }, { status: 500 })
    }
    
    // Preparar datos para insertar
    const evaluationData = {
      athlete_id: body.athleteId,
      athlete_name: body.athleteName || null,
      muscle_evaluated: body.muscleEvaluated,  // Usar el código directamente (VARCHAR)
      side: body.side,
      unit: body.unit || 'kg',
      
      // Métricas principales
      fmax: body.fmax,
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
      
      // Galgas
      galga1_max: body.galga1Max || null,
      galga2_max: body.galga2Max || null,
      galga1_avg: body.galga1Avg || null,
      galga2_avg: body.galga2Avg || null,
      
      // Índices
      fatigue_index: body.fatigueIndex || null,
      symmetry_index: body.symmetryIndex || null,
      
      // Curva y metadatos
      force_curve: body.forceCurve ? JSON.parse(JSON.stringify(body.forceCurve)) : null,
      sampling_rate: body.samplingRate || 50,
      calibration_factor: body.calibrationFactor || null,
      device_info: body.deviceInfo || null,
      notes: body.notes || null,
      
      test_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    
    // Insertar en Supabase
    const { data, error } = await supabase
      .from('isometric_evaluations')
      .insert(evaluationData)
      .select()
      .single()
    
    if (error) {
      console.error('[FORCE API] Error inserting evaluation:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    // Verificar si hay evaluación del lado opuesto y crear comparación bilateral
    await updateBilateralComparison(supabase, body, data.id)
    
    return NextResponse.json({ 
      success: true, 
      evaluation: {
        ...data,
        muscle_code: body.muscleEvaluated
      },
      message: 'Evaluación guardada exitosamente'
    })
    
  } catch (error) {
    console.error('[FORCE API] Error in POST:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al guardar la evaluación' 
    }, { status: 500 })
  }
}

// ============================================================================
// PUT - Actualizar evaluación existente
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, muscleEvaluated, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de evaluación requerido' 
      }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase no configurado' 
      }, { status: 500 })
    }
    
    // Preparar datos de actualización
    const dataToUpdate: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    
    // Si se actualiza el músculo evaluado
    if (muscleEvaluated) {
      dataToUpdate.muscle_evaluated = muscleEvaluated
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
      galga2Max: 'galga2_max',
      galga1Avg: 'galga1_avg',
      galga2Avg: 'galga2_avg',
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
      athleteId: 'athlete_id'
    }
    
    for (const [key, value] of Object.entries(updateData)) {
      const dbField = fieldMapping[key] || key
      if (dbField !== 'id' && dbField !== 'muscle_evaluated') {
        dataToUpdate[dbField] = value
      }
    }
    
    const { data, error } = await supabase
      .from('isometric_evaluations')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      evaluation: {
        ...data,
        muscle_code: data.muscle_evaluated
      }
    })
    
  } catch (error) {
    console.error('[FORCE API] Error in PUT:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al actualizar la evaluación' 
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
    
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase no configurado' 
      }, { status: 500 })
    }
    
    const { error } = await supabase
      .from('isometric_evaluations')
      .delete()
      .eq('id', id)
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Evaluación eliminada exitosamente' 
    })
    
  } catch (error) {
    console.error('[FORCE API] Error in DELETE:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al eliminar la evaluación' 
    }, { status: 500 })
  }
}

// ============================================================================
// Función auxiliar: Actualizar comparación bilateral
// ============================================================================
async function updateBilateralComparison(
  supabase: any, 
  evaluation: IsometricForceEvaluation,
  newEvalId: string
): Promise<void> {
  try {
    // Obtener ID base del músculo
    const baseCode = evaluation.muscleEvaluated.replace(/_l$|_r$/, '')
    const oppositeMuscleCode = evaluation.side === 'Izquierdo' 
      ? `${baseCode}_r` 
      : `${baseCode}_l`
    
    // Buscar evaluación del lado opuesto
    const { data: oppositeEval } = await supabase
      .from('isometric_evaluations')
      .select('*')
      .eq('athlete_id', evaluation.athleteId)
      .eq('muscle_evaluated', oppositeMuscleCode)
      .order('test_date', { ascending: false })
      .limit(1)
      .single()
    
    if (!oppositeEval) {
      return // No hay evaluación del lado opuesto
    }
    
    // Determinar cuál es izquierda y cuál es derecha
    const leftFmax = evaluation.side === 'Izquierdo' ? evaluation.fmax : oppositeEval.fmax
    const rightFmax = evaluation.side === 'Derecho' ? evaluation.fmax : oppositeEval.fmax
    const leftRfd = evaluation.side === 'Izquierdo' 
      ? (evaluation.rfdMax || 0) 
      : (oppositeEval.rfd_max || 0)
    const rightRfd = evaluation.side === 'Derecho' 
      ? (evaluation.rfdMax || 0) 
      : (oppositeEval.rfd_max || 0)
    
    const leftEvalId = evaluation.side === 'Izquierdo' ? newEvalId : oppositeEval.id
    const rightEvalId = evaluation.side === 'Derecho' ? newEvalId : oppositeEval.id
    
    // Calcular asimetrías
    const fmaxAsymmetry = calculateAsymmetry(leftFmax, rightFmax)
    const rfdAsymmetry = calculateAsymmetry(leftRfd, rightRfd)
    
    // Determinar lado dominante
    let dominantSide = 'balanced'
    if (leftFmax > rightFmax * 1.1) dominantSide = 'left'
    else if (rightFmax > leftFmax * 1.1) dominantSide = 'right'
    
    // Eliminar comparaciones existentes para este atleta y músculo
    await supabase
      .from('bilateral_comparisons')
      .delete()
      .eq('athlete_id', evaluation.athleteId)
      .eq('muscle_base', baseCode)
    
    // Insertar nueva comparación
    await supabase
      .from('bilateral_comparisons')
      .insert({
        athlete_id: evaluation.athleteId,
        muscle_base: baseCode,
        left_eval_id: leftEvalId,
        right_eval_id: rightEvalId,
        fmax_asymmetry: fmaxAsymmetry,
        rfd_asymmetry: rfdAsymmetry,
        dominant_side: dominantSide,
        left_fmax: leftFmax,
        right_fmax: rightFmax,
        left_rfd: leftRfd,
        right_rfd: rightRfd,
        comparison_date: new Date().toISOString()
      })
    
  } catch (error) {
    console.log('[FORCE API] Could not update bilateral comparison:', error)
  }
}

// Calcular índice de asimetría
function calculateAsymmetry(left: number, right: number): number {
  if (left === 0 && right === 0) return 0
  const avg = (left + right) / 2
  if (avg === 0) return 0
  return Math.abs((left - right) / avg) * 100
}
