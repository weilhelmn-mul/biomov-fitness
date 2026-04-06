import { NextRequest, NextResponse } from 'next/server'
import { supabaseFetch } from '@/lib/supabase'

// ============================================================================
// RUTA DE PRUEBA - Inserta datos con TODAS las métricas llenas
// GET /api/isometric/test-full
// ============================================================================

// Generador de curva de fuerza simulada
function generateForceCurve(fmax: number, durationMs: number = 5000, samplingRate: number = 50): number[] {
  const points = Math.floor((durationMs / 1000) * samplingRate)
  const curve: number[] = []
  
  for (let i = 0; i < points; i++) {
    const t = i / points // 0 a 1
    // Curva típica: subida exponencial, meseta, posible declive por fatiga
    const risePhase = 1 - Math.exp(-t * 8) // Subida rápida
    const fatigue = t > 0.7 ? 1 - (t - 0.7) * 0.3 : 1 // Fatiga ligera al final
    const noise = 1 + (Math.random() - 0.5) * 0.05 // 5% de ruido
    curve.push(Math.round(fmax * risePhase * fatigue * noise * 10) / 10)
  }
  
  return curve
}

// Generar métricas completas para un músculo/lado
function generateFullMetrics(muscleCode: string, side: 'Izquierdo' | 'Derecho', baseForce: number) {
  // Variación aleatoria para simular diferencias entre lados
  const sideFactor = side === 'Derecho' ? 1 + Math.random() * 0.1 : 0.9 + Math.random() * 0.1
  
  const fmax = Math.round(baseForce * sideFactor * 10) / 10
  const testDuration = 5 // segundos
  const samplingRate = 50 // Hz
  
  // Calcular métricas derivadas
  const timeToFmax = Math.round(180 + Math.random() * 120) // 180-300ms
  const forceAt200ms = Math.round(fmax * (0.65 + Math.random() * 0.15) * 10) / 10
  const averageForce = Math.round(fmax * (0.85 + Math.random() * 0.1) * 10) / 10
  
  // RFD (Rate of Force Development) en kg/s
  const rfdMax = Math.round((fmax / timeToFmax) * 1000 * 10) / 10
  const rfd50ms = Math.round(rfdMax * (0.3 + Math.random() * 0.1) * 10) / 10
  const rfd100ms = Math.round(rfdMax * (0.5 + Math.random() * 0.1) * 10) / 10
  const rfd150ms = Math.round(rfdMax * (0.7 + Math.random() * 0.1) * 10) / 10
  const rfd200ms = Math.round(rfdMax * (0.85 + Math.random() * 0.1) * 10) / 10
  
  // Constante de tiempo tau (ms)
  const tau = Math.round(timeToFmax * 0.63 * 10) / 10
  
  // Valores de galga (simulados - en unidades raw del sensor)
  const galgaMax = Math.round(fmax * 12.5 * 10) / 10 // Factor de conversión simulado
  const galgaAvg = Math.round(averageForce * 12.5 * 10) / 10
  
  // Índice de fatiga (0 = sin fatiga, 100 = fatiga total)
  const fatigueIndex = Math.round((5 + Math.random() * 15) * 10) / 10 // 5-20%
  
  // Generar curva de fuerza
  const forceCurve = generateForceCurve(fmax, testDuration * 1000, samplingRate)
  
  // Factor de calibración
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
    symmetry_index: null, // Se calcula después comparando lados
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteName = searchParams.get('athlete') || 'Atleta de Prueba'
    const muscleCount = parseInt(searchParams.get('muscles') || '5') // Número de músculos a evaluar
    
    // Seleccionar músculos aleatorios para la prueba
    const allMuscles = Object.keys(MUSCLE_BASE_FORCE)
    const selectedMuscles = allMuscles
      .sort(() => Math.random() - 0.5)
      .slice(0, muscleCount)
    
    const testDate = new Date().toISOString()
    const evaluationRecords: any[] = []
    
    for (const muscleCode of selectedMuscles) {
      const baseForce = MUSCLE_BASE_FORCE[muscleCode]
      
      // Generar métricas para lado derecho
      const metricsRight = generateFullMetrics(muscleCode, 'Derecho', baseForce)
      
      // Generar métricas para lado izquierdo
      const metricsLeft = generateFullMetrics(muscleCode, 'Izquierdo', baseForce)
      
      // Calcular índice de simetría
      const symmetryIndex = Math.round(
        (Math.abs(metricsRight.fmax - metricsLeft.fmax) / Math.max(metricsRight.fmax, metricsLeft.fmax)) * 100 * 10
      ) / 10
      
      metricsRight.symmetry_index = symmetryIndex
      metricsLeft.symmetry_index = symmetryIndex
      
      // Crear registro para lado derecho
      const { galga_max: _, galga_avg: __, ...rightMetricsClean } = metricsRight
      evaluationRecords.push({
        athlete_id: null,
        athlete_name: athleteName,
        muscle_evaluated: muscleCode,
        side: 'Derecho',
        test_date: testDate,
        unit: 'kg',
        ...rightMetricsClean,
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
        notes: `Prueba automática - ${muscleCode}`,
      })
      
      // Crear registro para lado izquierdo
      const { galga_max: ___, galga_avg: ____, ...leftMetricsClean } = metricsLeft
      evaluationRecords.push({
        athlete_id: null,
        athlete_name: athleteName,
        muscle_evaluated: muscleCode,
        side: 'Izquierdo',
        test_date: testDate,
        unit: 'kg',
        ...leftMetricsClean,
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
        notes: `Prueba automática - ${muscleCode}`,
      })
    }
    
    console.log(`[TEST-FULL] Insertando ${evaluationRecords.length} registros con métricas completas`)
    console.log('[TEST-FULL] Músculos:', selectedMuscles)
    
    // Insertar en Supabase
    const { data, error } = await supabaseFetch<any[]>('isometric_evaluations', {
      method: 'POST',
      body: evaluationRecords
    })
    
    if (error) {
      console.error('[TEST-FULL] Error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error de Supabase: ' + (error.message || JSON.stringify(error)),
        details: error
      }, { status: 500 })
    }
    
    // Mostrar ejemplo de un registro insertado
    const exampleRecord = data?.[0]
    
    return NextResponse.json({
      success: true,
      message: `Prueba exitosa: ${evaluationRecords.length} registros insertados con TODAS las métricas`,
      summary: {
        athlete: athleteName,
        testDate,
        musclesEvaluated: selectedMuscles,
        totalRecords: evaluationRecords.length,
        recordsPerMuscle: 2
      },
      exampleRecord: exampleRecord ? {
        muscle: exampleRecord.muscle_evaluated,
        side: exampleRecord.side,
        fmax: exampleRecord.fmax,
        force_at_200ms: exampleRecord.force_at_200ms,
        average_force: exampleRecord.average_force,
        rfd_max: exampleRecord.rfd_max,
        rfd_50ms: exampleRecord.rfd_50ms,
        rfd_100ms: exampleRecord.rfd_100ms,
        rfd_150ms: exampleRecord.rfd_150ms,
        rfd_200ms: exampleRecord.rfd_200ms,
        tau: exampleRecord.tau,
        galga1_max: exampleRecord.galga1_max,
        galga1_avg: exampleRecord.galga1_avg,
        fatigue_index: exampleRecord.fatigue_index,
        symmetry_index: exampleRecord.symmetry_index,
        force_curve_points: exampleRecord.force_curve?.length || 0,
        sampling_rate: exampleRecord.sampling_rate,
        calibration_factor: exampleRecord.calibration_factor,
      } : null,
      insertedRecords: data
    })
    
  } catch (error: any) {
    console.error('[TEST-FULL] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }, { status: 500 })
  }
}
