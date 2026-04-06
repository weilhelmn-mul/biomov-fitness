import { NextRequest, NextResponse } from 'next/server'
import { supabaseFetch } from '@/lib/supabase'

// ============================================================================
// RUTA PARA POBLAR EVALUACIONES PARA TODOS LOS USUARIOS
// GET /api/isometric/seed-all
// 
// Crea evaluaciones isométricas completas para TODOS los usuarios de la tabla usuarios
// ============================================================================

// Generador de curva de fuerza simulada
function generateForceCurve(fmax: number, durationMs: number = 5000, samplingRate: number = 50): number[] {
  const points = Math.floor((durationMs / 1000) * samplingRate)
  const curve: number[] = []
  
  for (let i = 0; i < points; i++) {
    const t = i / points
    const risePhase = 1 - Math.exp(-t * 8)
    const fatigue = t > 0.7 ? 1 - (t - 0.7) * 0.3 : 1
    const noise = 1 + (Math.random() - 0.5) * 0.05
    curve.push(Math.round(fmax * risePhase * fatigue * noise * 10) / 10)
  }
  
  return curve
}

// Generar métricas completas para un músculo/lado
function generateFullMetrics(muscleCode: string, side: 'Izquierdo' | 'Derecho', baseForce: number) {
  const sideFactor = side === 'Derecho' ? 1 + Math.random() * 0.1 : 0.9 + Math.random() * 0.1
  
  const fmax = Math.round(baseForce * sideFactor * 10) / 10
  const testDuration = 5
  const samplingRate = 50
  
  const timeToFmax = Math.round(180 + Math.random() * 120)
  const forceAt200ms = Math.round(fmax * (0.65 + Math.random() * 0.15) * 10) / 10
  const averageForce = Math.round(fmax * (0.85 + Math.random() * 0.1) * 10) / 10
  
  const rfdMax = Math.round((fmax / timeToFmax) * 1000 * 10) / 10
  const rfd50ms = Math.round(rfdMax * (0.3 + Math.random() * 0.1) * 10) / 10
  const rfd100ms = Math.round(rfdMax * (0.5 + Math.random() * 0.1) * 10) / 10
  const rfd150ms = Math.round(rfdMax * (0.7 + Math.random() * 0.1) * 10) / 10
  const rfd200ms = Math.round(rfdMax * (0.85 + Math.random() * 0.1) * 10) / 10
  
  const tau = Math.round(timeToFmax * 0.63 * 10) / 10
  const galgaMax = Math.round(fmax * 12.5 * 10) / 10
  const galgaAvg = Math.round(averageForce * 12.5 * 10) / 10
  const fatigueIndex = Math.round((5 + Math.random() * 15) * 10) / 10
  const forceCurve = generateForceCurve(fmax, testDuration * 1000, samplingRate)
  const calibrationFactor = Math.round((9.8 + Math.random() * 0.4) * 100) / 100
  
  return {
    fmax,
    force_at_200ms: forceAt200ms,
    average_force: averageForce,
    test_duration: testDuration,
    time_to_fmax: timeToFmax,
    time_to_50fmax: Math.round(timeToFmax * 0.5 * 10) / 10,
    time_to_90fmax: Math.round(timeToFmax * 0.9 * 10) / 10,
    rfd_max: rfdMax,
    rfd_50ms: rfd50ms,
    rfd_100ms: rfd100ms,
    rfd_150ms: rfd150ms,
    rfd_200ms: rfd200ms,
    tau,
    force_modeled: Math.round(fmax * 0.98 * 10) / 10,
    galga_max: galgaMax,
    galga_avg: galgaAvg,
    fatigue_index: fatigueIndex,
    symmetry_index: null,
    force_curve: forceCurve,
    sampling_rate: samplingRate,
    calibration_factor: calibrationFactor,
  }
}

// Valores base de fuerza por grupo muscular (kg)
const MUSCLE_BASE_FORCE: Record<string, number> = {
  'pectoral': 95,
  'dorsal': 85,
  'trapecio': 65,
  'deltoide_ant': 45,
  'deltoide_med': 42,
  'deltoide_post': 38,
  'biceps': 32,
  'triceps': 38,
  'abdominal': 55,
  'oblicuos': 42,
  'erector_spinae': 75,
  'glute_max': 115,
  'glute_med': 48,
  'quads': 95,
  'hamstrings': 72,
  'adductors': 55,
  'gastrocnemius': 65,
  'soleus': 48,
  'tibialis_ant': 28,
}

// Músculos a evaluar por defecto (todos)
const ALL_MUSCLES = Object.keys(MUSCLE_BASE_FORCE)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const musclesCount = parseInt(searchParams.get('muscles') || '19') // Todos por defecto
    const onlyMissing = searchParams.get('onlyMissing') !== 'false' // Por defecto solo los que no tienen
    
    console.log('[SEED-ALL] Iniciando población de evaluaciones...')
    
    // 1. Obtener TODOS los usuarios de la tabla usuarios
    const { data: users, error: usersError } = await supabaseFetch<any[]>('usuarios', {
      select: 'id, nombre_completo, email, rol, aprobado',
      query: {
        'aprobado': 'eq.true',  // Solo usuarios aprobados
        'order': 'created_at.asc'
      }
    })
    
    if (usersError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Error al obtener usuarios: ' + (usersError.message || JSON.stringify(usersError))
      }, { status: 500 })
    }
    
    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay usuarios aprobados en la tabla usuarios'
      }, { status: 404 })
    }
    
    console.log(`[SEED-ALL] Encontrados ${users.length} usuarios aprobados`)
    
    // 2. Obtener usuarios que ya tienen evaluaciones
    const { data: existingEvaluations, error: evalError } = await supabaseFetch<any[]>('isometric_evaluations', {
      select: 'athlete_id',
      query: {
        'athlete_id': 'not.is.null'
      }
    })
    
    const usersWithEvaluations = new Set(
      (existingEvaluations || [])
        .filter(e => e.athlete_id)
        .map(e => e.athlete_id)
    )
    
    console.log(`[SEED-ALL] Usuarios con evaluaciones existentes: ${usersWithEvaluations.size}`)
    
    // 3. Filtrar usuarios que necesitan evaluaciones
    let usersToProcess = users
    
    if (onlyMissing) {
      usersToProcess = users.filter(u => !usersWithEvaluations.has(u.id))
      console.log(`[SEED-ALL] Usuarios sin evaluaciones: ${usersToProcess.length}`)
    } else {
      console.log(`[SEED-ALL] Procesando TODOS los usuarios: ${usersToProcess.length}`)
    }
    
    if (usersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos los usuarios ya tienen evaluaciones',
        totalUsers: users.length,
        usersWithEvaluations: usersWithEvaluations.size,
        newEvaluationsCreated: 0
      })
    }
    
    // 4. Seleccionar músculos a evaluar
    const musclesToEval = ALL_MUSCLES.slice(0, musclesCount)
    
    // 5. Generar evaluaciones para cada usuario
    const allEvaluationRecords: any[] = []
    const testDate = new Date().toISOString()
    const results: any[] = []
    
    for (const user of usersToProcess) {
      const athleteId = user.id
      const athleteName = user.nombre_completo || user.email || 'Sin nombre'
      const userRecords: any[] = []
      
      for (const muscleCode of musclesToEval) {
        const baseForce = MUSCLE_BASE_FORCE[muscleCode]
        
        // Métricas para lado derecho
        const metricsRight = generateFullMetrics(muscleCode, 'Derecho', baseForce)
        // Métricas para lado izquierdo
        const metricsLeft = generateFullMetrics(muscleCode, 'Izquierdo', baseForce)
        
        // Calcular índice de simetría
        const symmetryIndex = Math.round(
          (Math.abs(metricsRight.fmax - metricsLeft.fmax) / Math.max(metricsRight.fmax, metricsLeft.fmax)) * 100 * 10
        ) / 10
        
        metricsRight.symmetry_index = symmetryIndex
        metricsLeft.symmetry_index = symmetryIndex
        
        // Crear registro derecho
        const { galga_max: _, galga_avg: __, ...rightClean } = metricsRight
        userRecords.push({
          athlete_id: athleteId,
          athlete_name: athleteName,
          muscle_evaluated: muscleCode,
          side: 'Derecho',
          test_date: testDate,
          unit: 'kg',
          ...rightClean,
          galga1_max: metricsRight.galga_max,
          galga1_avg: metricsRight.galga_avg,
          galga2_max: null,
          galga2_avg: null,
          device_info: {
            model: 'BIOMOV-ForceSensor-v2',
            firmware: '2.1.3',
            sampling_rate: 50,
            calibration_date: new Date().toISOString(),
          },
          notes: `Evaluación generada automáticamente`,
        })
        
        // Crear registro izquierdo
        const { galga_max: ___, galga_avg: ____, ...leftClean } = metricsLeft
        userRecords.push({
          athlete_id: athleteId,
          athlete_name: athleteName,
          muscle_evaluated: muscleCode,
          side: 'Izquierdo',
          test_date: testDate,
          unit: 'kg',
          ...leftClean,
          galga1_max: metricsLeft.galga_max,
          galga1_avg: metricsLeft.galga_avg,
          galga2_max: null,
          galga2_avg: null,
          device_info: {
            model: 'BIOMOV-ForceSensor-v2',
            firmware: '2.1.3',
            sampling_rate: 50,
            calibration_date: new Date().toISOString(),
          },
          notes: `Evaluación generada automáticamente`,
        })
      }
      
      allEvaluationRecords.push(...userRecords)
      
      results.push({
        userId: athleteId,
        userName: athleteName,
        recordsCreated: userRecords.length,
        musclesEvaluated: musclesToEval.length
      })
    }
    
    console.log(`[SEED-ALL] Total registros a insertar: ${allEvaluationRecords.length}`)
    
    // 6. Insertar en batches de 100 para evitar timeout
    const BATCH_SIZE = 100
    let insertedCount = 0
    const errors: any[] = []
    
    for (let i = 0; i < allEvaluationRecords.length; i += BATCH_SIZE) {
      const batch = allEvaluationRecords.slice(i, i + BATCH_SIZE)
      
      const { data, error } = await supabaseFetch<any[]>('isometric_evaluations', {
        method: 'POST',
        body: batch
      })
      
      if (error) {
        console.error(`[SEED-ALL] Error en batch ${i}:`, error)
        errors.push({ batch: i, error: error.message || error })
      } else {
        insertedCount += data?.length || 0
      }
    }
    
    // 7. Resumen final
    const summary = {
      success: errors.length === 0,
      message: `Población completada: ${insertedCount} evaluaciones creadas para ${usersToProcess.length} usuarios`,
      statistics: {
        totalUsersInDatabase: users.length,
        usersWithExistingEvaluations: usersWithEvaluations.size,
        usersProcessed: usersToProcess.length,
        musclesPerUser: musclesToEval.length,
        recordsPerUser: musclesToEval.length * 2,
        totalRecordsCreated: insertedCount,
        batchesProcessed: Math.ceil(allEvaluationRecords.length / BATCH_SIZE),
        errorsCount: errors.length
      },
      musclesEvaluated: musclesToEval,
      usersProcessed: results,
      errors: errors.length > 0 ? errors : undefined
    }
    
    console.log('[SEED-ALL] Completado:', summary.message)
    
    return NextResponse.json(summary)
    
  } catch (error: any) {
    console.error('[SEED-ALL] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }, { status: 500 })
  }
}
