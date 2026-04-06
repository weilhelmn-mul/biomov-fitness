import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseFetch } from '@/lib/supabase'

// ============================================================================
// TIPOS - Adaptados a la estructura de la tabla isometric_evaluations en Supabase
// ============================================================================

// Tipo de lado según el ENUM en Supabase: 'Izquierdo' | 'Derecho' | 'Bilateral'
type SideType = 'Izquierdo' | 'Derecho' | 'Bilateral'
type ForceUnit = 'kg' | 'N'

// Métricas detalladas de una evaluación isométrica
interface IsometricMetrics {
  fmax?: number                    // Fuerza máxima (kg)
  force_at_200ms?: number          // Fuerza a los 200ms
  average_force?: number           // Fuerza promedio
  test_duration?: number           // Duración del test (segundos)
  time_to_fmax?: number            // Tiempo hasta Fmax (ms)
  time_to_50fmax?: number          // Tiempo hasta 50% Fmax (ms)
  time_to_90fmax?: number          // Tiempo hasta 90% Fmax (ms)
  rfd_max?: number                 // RFD máximo (kg/s)
  rfd_50ms?: number                // RFD a 50ms
  rfd_100ms?: number               // RFD a 100ms
  rfd_150ms?: number               // RFD a 150ms
  rfd_200ms?: number               // RFD a 200ms
  tau?: number                     // Constante de tiempo
  force_modeled?: number           // Fuerza modelada
  galga_max?: number               // Valor máximo de la galga (solo una galga)
  galga_avg?: number               // Valor promedio de la galga
  fatigue_index?: number           // Índice de fatiga
  symmetry_index?: number          // Índice de simetría
  force_curve?: number[]           // Curva de fuerza (array de puntos)
  sampling_rate?: number           // Tasa de muestreo (Hz)
  calibration_factor?: number      // Factor de calibración
}

// Datos de un músculo evaluado (ambos lados)
interface MuscleEvaluationData {
  muscleId: string                 // ID del músculo (ej: 'pectoral_mayor')
  muscleName: string               // Nombre del músculo
  lado: {
    derecho: IsometricMetrics      // Métricas del lado derecho
    izquierdo: IsometricMetrics    // Métricas del lado izquierdo
  }
}

// Solicitud completa de evaluación isométrica
interface IsometricEvaluationRequest {
  userId: string                   // ID del usuario en la tabla 'usuarios'
  musculos: MuscleEvaluationData[]
  sessionDate?: string             // Fecha de la sesión de evaluación
  notes?: string
  deviceInfo?: {
    model?: string
    firmware?: string
    samplingRate?: number
  }
}

// Respuesta de la API
interface IsometricEvaluationResponse {
  success: boolean
  evaluations?: any[]
  count?: number
  error?: string
  details?: any
}

// Mapa de nombres de grupos musculares a códigos para Supabase
const MUSCLE_CODE_MAP: Record<string, string> = {
  'pectoral_mayor': 'pectoral',
  'dorsal_ancho': 'dorsal',
  'trapecio': 'trapecio',
  'deltoide_anterior': 'deltoide_ant',
  'deltoide_medio': 'deltoide_med',
  'deltoide_posterior': 'deltoide_post',
  'biceps_braquial': 'biceps',
  'triceps_braquial': 'triceps',
  'recto_abdominal': 'abdominal',
  'oblicuos': 'oblicuos',
  'erectores_espinales': 'erector_spinae',
  'gluteo_mayor': 'glute_max',
  'gluteo_medio': 'glute_med',
  'cuadriceps': 'quads',
  'isquiotibiales': 'hamstrings',
  'aductores': 'adductors',
  'gastrocnemio': 'gastrocnemius',
  'soleo': 'soleus',
  'tibial_anterior': 'tibialis_ant',
}

// Función helper para convertir evaluación a formato Supabase
function createEvaluationRecord(
  userId: string,
  muscleId: string,
  muscleName: string,
  side: SideType,
  metrics: IsometricMetrics,
  sessionDate: string,
  athleteName: string,  // SIEMPRE viene de nombre_completo de usuarios
  deviceInfo?: any
) {
  return {
    athlete_id: userId,  // ID del usuario de la tabla 'usuarios'
    athlete_name: athleteName,  // nombre_completo de la tabla 'usuarios'
    muscle_evaluated: MUSCLE_CODE_MAP[muscleId] || muscleId,
    side,
    test_date: sessionDate,
    unit: 'kg' as ForceUnit,
    fmax: metrics.fmax || null,
    force_at_200ms: metrics.force_at_200ms || null,
    average_force: metrics.average_force || null,
    test_duration: metrics.test_duration || null,
    time_to_fmax: metrics.time_to_fmax || null,
    time_to_50fmax: metrics.time_to_50fmax || null,
    time_to_90fmax: metrics.time_to_90fmax || null,
    rfd_max: metrics.rfd_max || null,
    rfd_50ms: metrics.rfd_50ms || null,
    rfd_100ms: metrics.rfd_100ms || null,
    rfd_150ms: metrics.rfd_150ms || null,
    rfd_200ms: metrics.rfd_200ms || null,
    tau: metrics.tau || null,
    force_modeled: metrics.force_modeled || null,
    galga1_max: metrics.galga_max || null,    // Una sola galga
    galga1_avg: metrics.galga_avg || null,    // Una sola galga
    galga2_max: null,  // No se usa
    galga2_avg: null,  // No se usa
    fatigue_index: metrics.fatigue_index || null,
    symmetry_index: metrics.symmetry_index || null,
    sampling_rate: metrics.sampling_rate || 50,
    calibration_factor: metrics.calibration_factor || null,
    force_curve: metrics.force_curve ? JSON.parse(JSON.stringify(metrics.force_curve)) : null,
    device_info: deviceInfo || null,
    notes: null,
  }
}

// ============================================================================
// GET - Obtener evaluaciones isométricas del usuario
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const muscleCode = searchParams.get('muscle')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }
    
    // Usar supabaseFetch para obtener evaluaciones
    const query: Record<string, string> = {
      'athlete_id': `eq.${userId}`,  // Filtrar por athlete_id
      'order': 'test_date.desc',
      'limit': String(limit)
    }
    
    if (muscleCode) {
      query['muscle_evaluated'] = `eq.${muscleCode}`
    }
    
    const { data, error } = await supabaseFetch<any[]>('isometric_evaluations', {
      select: '*',
      query
    })
    
    if (error) {
      console.error('[ISOMETRIC API] Supabase error:', error)
    }
    
    if (data && data.length > 0) {
      // Agrupar evaluaciones por músculo y sesión
      const groupedData = groupEvaluationsByMuscle(data)
      return NextResponse.json({ 
        success: true, 
        evaluations: data,
        musculos: groupedData,
        totalRecords: data.length
      })
    }
    
    // Sin datos
    return NextResponse.json({ 
      success: true, 
      evaluations: [], 
      musculos: [],
      message: 'No hay evaluaciones isométricas registradas para este usuario'
    })
  } catch (error) {
    console.error('Error in GET isometric:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Función para agrupar evaluaciones por músculo
function groupEvaluationsByMuscle(evaluations: any[]) {
  const muscleMap: Record<string, { 
    id: string
    nombre: string
    fuerza: { R: number; L: number }
    evaluaciones: any[]
  }> = {}
  
  const codeToName: Record<string, string> = {
    'pectoral': 'Pectoral Mayor',
    'dorsal': 'Dorsal Ancho',
    'trapecio': 'Trapecio',
    'deltoide_ant': 'Deltoide Anterior',
    'deltoide_med': 'Deltoide Medio',
    'deltoide_post': 'Deltoide Posterior',
    'biceps': 'Bíceps Braquial',
    'triceps': 'Tríceps Braquial',
    'abdominal': 'Recto Abdominal',
    'oblicuos': 'Oblicuos',
    'erector_spinae': 'Erectores Espinales',
    'glute_max': 'Glúteo Mayor',
    'glute_med': 'Glúteo Medio',
    'quads': 'Cuádriceps',
    'hamstrings': 'Isquiotibiales',
    'adductors': 'Aductores',
    'gastrocnemius': 'Gastrocnemio',
    'soleus': 'Sóleo',
    'tibialis_ant': 'Tibial Anterior',
  }
  
  for (const evaluacion of evaluations) {
    const muscleCode = evaluacion.muscle_evaluated
    if (!muscleCode) continue
    
    if (!muscleMap[muscleCode]) {
      muscleMap[muscleCode] = {
        id: muscleCode,
        nombre: codeToName[muscleCode] || muscleCode,
        fuerza: { R: 0, L: 0 },
        evaluaciones: []
      }
    }
    
    // Actualizar fuerza máxima por lado
    const fmax = evaluacion.fmax || 0
    if (evaluacion.side === 'Derecho' && fmax > muscleMap[muscleCode].fuerza.R) {
      muscleMap[muscleCode].fuerza.R = fmax
    } else if (evaluacion.side === 'Izquierdo' && fmax > muscleMap[muscleCode].fuerza.L) {
      muscleMap[muscleCode].fuerza.L = fmax
    }
    
    muscleMap[muscleCode].evaluaciones.push(evaluacion)
  }
  
  return Object.values(muscleMap)
}

// ============================================================================
// POST - Guardar nueva evaluación isométrica
// Guarda cada músculo/lado como un registro individual en Supabase
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body: IsometricEvaluationRequest = await request.json()
    const { 
      userId, 
      musculos, 
      sessionDate, 
      notes,
      deviceInfo 
    } = body
    
    console.log('[ISOMETRIC API] Recibiendo datos:', { 
      userId, 
      musculosCount: musculos?.length 
    })
    
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'userId requerido' 
      }, { status: 400 })
    }
    
    if (!musculos || musculos.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No hay músculos para guardar' 
      }, { status: 400 })
    }
    
    // Obtener nombre_completo de la tabla usuarios
    let athleteName = 'Usuario'
    try {
      const { data: userData, error: userError } = await supabaseFetch<any[]>('usuarios', {
        select: 'id,nombre_completo,email',
        query: {
          'id': `eq.${userId}`,
          'limit': '1'
        }
      })
      
      if (!userError && userData && userData.length > 0) {
        athleteName = userData[0].nombre_completo || userData[0].email || 'Usuario'
        console.log('[ISOMETRIC API] Usuario encontrado:', athleteName)
      } else {
        console.log('[ISOMETRIC API] Usuario no encontrado, usando nombre por defecto')
      }
    } catch (e) {
      console.log('[ISOMETRIC API] Error al buscar usuario (continuando):', e)
    }
    
    // Fecha de la sesión
    const testDate = sessionDate || new Date().toISOString()
    
    // Crear registros para cada músculo y lado
    const evaluationRecords: any[] = []
    
    for (const musculo of musculos) {
      const { muscleId, muscleName, lado } = musculo
      
      // Crear registro para lado derecho si tiene datos
      if (lado.derecho && (lado.derecho.fmax || lado.derecho.galga_max)) {
        evaluationRecords.push(
          createEvaluationRecord(
            userId,
            muscleId,
            muscleName,
            'Derecho',
            lado.derecho,
            testDate,
            athleteName,
            deviceInfo
          )
        )
      }
      
      // Crear registro para lado izquierdo si tiene datos
      if (lado.izquierdo && (lado.izquierdo.fmax || lado.izquierdo.galga_max)) {
        evaluationRecords.push(
          createEvaluationRecord(
            userId,
            muscleId,
            muscleName,
            'Izquierdo',
            lado.izquierdo,
            testDate,
            athleteName,
            deviceInfo
          )
        )
      }
    }
    
    if (evaluationRecords.length === 0) {
      return NextResponse.json({ 
        error: 'No hay datos de fuerza para guardar',
        success: false 
      }, { status: 400 })
    }
    
    console.log(`[ISOMETRIC API] Insertando ${evaluationRecords.length} registros`)
    
    // Insertar en Supabase
    const { data, error } = await supabaseFetch<any[]>('isometric_evaluations', {
      method: 'POST',
      body: evaluationRecords
    })
    
    if (error) {
      console.error('[ISOMETRIC API] Supabase error:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Error de Supabase: ' + (error.message || JSON.stringify(error)),
        details: error
      }, { status: 500 })
    }
    
    if (data) {
      return NextResponse.json({ 
        success: true, 
        evaluations: data, 
        count: data.length,
        athlete: {
          id: userId,
          name: athleteName
        },
        message: `${data.length} evaluaciones guardadas correctamente`
      })
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Error desconocido al guardar'
    }, { status: 500 })
  } catch (error: any) {
    console.error('Error in POST isometric:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al guardar evaluación: ' + error.message 
    }, { status: 500 })
  }
}
