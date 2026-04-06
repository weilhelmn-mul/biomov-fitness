import { NextRequest, NextResponse } from 'next/server'
import { supabaseFetch } from '@/lib/supabase'

// ============================================================================
// TIPOS
// ============================================================================

interface MuscleGroupData {
  id: string
  nombre: string
  fuerza: { R: number; L: number }
  evaluaciones: number
  ultimoTest: string | null
}

// ============================================================================
// GET - Obtener datos de análisis para un usuario
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all' // all, fuerza, resistencia, velocidad, flexibilidad, potencia
    
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const response: any = {}

    // Obtener datos de fuerza isométrica
    if (type === 'all' || type === 'fuerza') {
      response.fuerza = await getStrengthData(userId)
      response.musculos = await getMuscleGroupData(userId)
    }

    // Obtener datos de resistencia (VDOT, FC)
    if (type === 'all' || type === 'resistencia') {
      response.resistencia = await getEnduranceData(userId)
    }

    // Obtener datos del perfil del usuario
    if (type === 'all') {
      response.perfil = await getUserProfile(userId)
    }

    // Obtener historial reciente
    response.historial = await getRecentHistory(userId)

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error in analisis API:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ============================================================================
// FUNCIONES DE OBTENCIÓN DE DATOS
// ============================================================================

async function getStrengthData(userId: string) {
  // Obtener todas las evaluaciones isométricas del usuario
  const { data: evaluations, error } = await supabaseFetch<any[]>('isometric_evaluations', {
    select: 'id, muscle_evaluated, side, fmax, rfd_max, time_to_fmax, symmetry_index, test_date, average_force',
    query: {
      'athlete_id': `eq.${userId}`,
      'order': 'test_date.desc',
      'limit': '100'
    }
  })

  if (error || !evaluations || evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      avgFmax: null,
      maxFmax: null,
      avgRfd: null,
      avgSymmetry: null,
      lastEvaluation: null,
      musclesEvaluated: 0,
      progress: []
    }
  }

  // Calcular estadísticas
  const fmaxValues = evaluations.filter(e => e.fmax).map(e => e.fmax)
  const rfdValues = evaluations.filter(e => e.rfd_max).map(e => e.rfd_max)
  const symmetryValues = evaluations.filter(e => e.symmetry_index).map(e => e.symmetry_index)
  
  const uniqueMuscles = new Set(evaluations.map(e => e.muscle_evaluated))
  
  // Agrupar por fecha para progreso
  const progressMap = new Map<string, number[]>()
  evaluations.forEach(e => {
    if (e.test_date && e.fmax) {
      const date = e.test_date.split('T')[0]
      if (!progressMap.has(date)) {
        progressMap.set(date, [])
      }
      progressMap.get(date)!.push(e.fmax)
    }
  })

  const progress = Array.from(progressMap.entries())
    .map(([date, values]) => ({
      date,
      value: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10) // Últimas 10 entradas

  return {
    totalEvaluations: evaluations.length,
    avgFmax: fmaxValues.length > 0 ? Math.round(fmaxValues.reduce((a, b) => a + b, 0) / fmaxValues.length * 10) / 10 : null,
    maxFmax: fmaxValues.length > 0 ? Math.max(...fmaxValues) : null,
    avgRfd: rfdValues.length > 0 ? Math.round(rfdValues.reduce((a, b) => a + b, 0) / rfdValues.length) : null,
    avgSymmetry: symmetryValues.length > 0 ? Math.round(symmetryValues.reduce((a, b) => a + b, 0) / symmetryValues.length) : null,
    lastEvaluation: evaluations[0]?.test_date || null,
    musclesEvaluated: uniqueMuscles.size,
    progress
  }
}

async function getMuscleGroupData(userId: string): Promise<MuscleGroupData[]> {
  const { data: evaluations, error } = await supabaseFetch<any[]>('isometric_evaluations', {
    select: 'id, muscle_evaluated, side, fmax, rfd_max, test_date',
    query: {
      'athlete_id': `eq.${userId}`,
      'order': 'test_date.desc',
      'limit': '200'
    }
  })

  if (error || !evaluations) {
    return []
  }

  // Agrupar por músculo
  const muscleMap = new Map<string, MuscleGroupData>()

  const muscleNames: Record<string, string> = {
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

  evaluations.forEach(e => {
    const muscleCode = e.muscle_evaluated
    if (!muscleCode) return

    if (!muscleMap.has(muscleCode)) {
      muscleMap.set(muscleCode, {
        id: muscleCode,
        nombre: muscleNames[muscleCode] || muscleCode,
        fuerza: { R: 0, L: 0 },
        evaluaciones: 0,
        ultimoTest: null
      })
    }

    const muscleData = muscleMap.get(muscleCode)!
    muscleData.evaluaciones++

    // Actualizar fuerza máxima por lado (usar el valor más alto)
    const fmax = e.fmax || 0
    if (e.side === 'Derecho' && fmax > muscleData.fuerza.R) {
      muscleData.fuerza.R = fmax
    } else if (e.side === 'Izquierdo' && fmax > muscleData.fuerza.L) {
      muscleData.fuerza.L = fmax
    }

    // Actualizar último test
    if (!muscleData.ultimoTest || new Date(e.test_date) > new Date(muscleData.ultimoTest)) {
      muscleData.ultimoTest = e.test_date
    }
  })

  return Array.from(muscleMap.values())
}

async function getEnduranceData(userId: string) {
  // Obtener datos de evaluaciones de VDOT
  const { data: evaluations, error } = await supabaseFetch<any[]>('evaluaciones', {
    select: 'id, vdot, fecha_evaluacion, fc_reposo, fc_maxima',
    query: {
      'user_id': `eq.${userId}`,
      'order': 'fecha_evaluacion.desc',
      'limit': '50'
    }
  })

  // También obtener datos del perfil del usuario
  const { data: profile } = await supabaseFetch<any[]>('usuarios', {
    select: 'fc_reposo, fc_maxima',
    query: {
      'id': `eq.${userId}`,
      'limit': '1'
    }
  })

  if (error && !profile) {
    return {
      totalEvaluations: 0,
      avgVdot: null,
      maxVdot: null,
      avgFcReposo: null,
      avgFcMaxima: null,
      lastEvaluation: null,
      progress: []
    }
  }

  const vdotValues = (evaluations || []).filter(e => e.vdot).map(e => e.vdot)
  const fcReposoValues = (evaluations || []).filter(e => e.fc_reposo).map(e => e.fc_reposo)
  const fcMaximaValues = (evaluations || []).filter(e => e.fc_maxima).map(e => e.fc_maxima)

  // Progreso de VDOT
  const progressMap = new Map<string, number[]>()
  ;(evaluations || []).forEach(e => {
    if (e.fecha_evaluacion && e.vdot) {
      const date = e.fecha_evaluacion.split('T')[0]
      if (!progressMap.has(date)) {
        progressMap.set(date, [])
      }
      progressMap.get(date)!.push(e.vdot)
    }
  })

  const progress = Array.from(progressMap.entries())
    .map(([date, values]) => ({
      date,
      value: Math.max(...values)
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)

  return {
    totalEvaluations: (evaluations || []).length,
    avgVdot: vdotValues.length > 0 ? Math.round(vdotValues.reduce((a, b) => a + b, 0) / vdotValues.length * 10) / 10 : null,
    maxVdot: vdotValues.length > 0 ? Math.max(...vdotValues) : null,
    avgFcReposo: fcReposoValues.length > 0 ? Math.round(fcReposoValues.reduce((a, b) => a + b, 0) / fcReposoValues.length) : profile?.[0]?.fc_reposo || null,
    avgFcMaxima: fcMaximaValues.length > 0 ? Math.round(fcMaximaValues.reduce((a, b) => a + b, 0) / fcMaximaValues.length) : profile?.[0]?.fc_maxima || null,
    lastEvaluation: evaluations?.[0]?.fecha_evaluacion || null,
    progress
  }
}

async function getUserProfile(userId: string) {
  const { data, error } = await supabaseFetch<any[]>('usuarios', {
    select: 'id, nombre_completo, email, rol, genero, fecha_nacimiento, altura_cm, peso_kg, imc, fc_maxima, fc_reposo, nivel_experiencia, objetivo, rm_bench_press, rm_squat, rm_deadlift, rm_overhead_press, rm_barbell_row',
    query: {
      'id': `eq.${userId}`,
      'limit': '1'
    }
  })

  if (error || !data || data.length === 0) {
    return null
  }

  const user = data[0]
  
  // Calcular edad
  let edad = null
  if (user.fecha_nacimiento) {
    const birth = new Date(user.fecha_nacimiento)
    const today = new Date()
    edad = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  // Calcular RM total
  const rmTotal = (user.rm_bench_press || 0) + (user.rm_squat || 0) + 
                  (user.rm_deadlift || 0) + (user.rm_overhead_press || 0) + 
                  (user.rm_barbell_row || 0)

  return {
    id: user.id,
    nombre: user.nombre_completo,
    email: user.email,
    rol: user.rol,
    genero: user.genero,
    edad,
    altura: user.altura_cm,
    peso: user.peso_kg,
    imc: user.imc,
    fcMaxima: user.fc_maxima,
    fcReposo: user.fc_reposo,
    nivelExperiencia: user.nivel_experiencia,
    objetivo: user.objetivo,
    rm: {
      bench: user.rm_bench_press,
      squat: user.rm_squat,
      deadlift: user.rm_deadlift,
      overhead: user.rm_overhead_press,
      row: user.rm_barbell_row,
      total: rmTotal
    }
  }
}

async function getRecentHistory(userId: string) {
  // Obtener evaluaciones isométricas recientes
  const { data: isometricData } = await supabaseFetch<any[]>('isometric_evaluations', {
    select: 'id, test_date, muscle_evaluated, side, fmax, rfd_max',
    query: {
      'athlete_id': `eq.${userId}`,
      'order': 'test_date.desc',
      'limit': '20'
    }
  })

  // Obtener evaluaciones generales recientes
  const { data: evalData } = await supabaseFetch<any[]>('evaluaciones', {
    select: 'id, fecha_evaluacion, tipo_evaluacion, vdot',
    query: {
      'user_id': `eq.${userId}`,
      'order': 'fecha_evaluacion.desc',
      'limit': '10'
    }
  })

  const history: any[] = []

  // Procesar evaluaciones isométricas
  const isometricGrouped = new Map<string, any>()
  ;(isometricData || []).forEach(e => {
    const date = e.test_date?.split('T')[0]
    if (!date) return
    
    const key = `${date}-fuerza`
    if (!isometricGrouped.has(key)) {
      isometricGrouped.set(key, {
        id: key,
        date: e.test_date,
        type: 'fuerza',
        summary: '',
        metrics: {}
      })
    }
    
    const entry = isometricGrouped.get(key)!
    if (e.fmax) {
      entry.metrics[`${e.muscle_evaluated}_${e.side}`] = e.fmax
    }
  })

  history.push(...Array.from(isometricGrouped.values()))

  // Procesar evaluaciones generales
  ;(evalData || []).forEach(e => {
    if (e.vdot) {
      history.push({
        id: e.id,
        date: e.fecha_evaluacion,
        type: 'resistencia',
        summary: `Evaluación VDOT: ${e.vdot}`,
        metrics: { 'VDOT': e.vdot }
      })
    }
  })

  // Ordenar por fecha descendente
  return history
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)
}
