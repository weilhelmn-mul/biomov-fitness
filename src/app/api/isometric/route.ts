import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

// Tipos
interface MuscleForceData {
  id: string
  fuerza: { R: number; L: number }
}

interface IsometricEvaluationRequest {
  userId: string
  musculos: MuscleForceData[]
  indiceGlobal: {
    valor: number
    trenSuperior: number
    core: number
    trenInferior: number
    simetriaGeneral: number
  }
  desequilibrios: Array<{
    musculoId: string
    musculoNombre: string
    ladoDominante: string
    diferenciaPorcentaje: number
    clasificacion: string
    recomendacion: string
  }>
}

// Mapa de nombres de grupos musculares a IDs del frontend
const MUSCLE_ID_MAP: Record<string, string> = {
  'Pectoral Mayor': 'pectoral_mayor',
  'Dorsal Ancho': 'dorsal_ancho',
  'Trapecio Medio/Inferior': 'trapecio',
  'Deltoide Anterior': 'deltoide_anterior',
  'Deltoide Medio': 'deltoide_medio',
  'Deltoide Posterior': 'deltoide_posterior',
  'Bíceps Braquial': 'biceps_braquial',
  'Tríceps Braquial': 'triceps_braquial',
  'Recto Abdominal': 'recto_abdominal',
  'Oblicuos': 'oblicuos',
  'Erectores Espinales': 'erectores_espinales',
  'Glúteo Mayor': 'gluteo_mayor',
  'Glúteo Medio': 'gluteo_medio',
  'Cuádriceps': 'cuadriceps',
  'Isquiotibiales': 'isquiotibiales',
  'Aductores': 'aductores',
  'Gastrocnemio': 'gastrocnemio',
  'Sóleo': 'soleo',
  'Tibial Anterior': 'tibial_anterior',
}

// ============================================================================
// GET - Obtener evaluaciones isométricas del usuario
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }
    
    // Intentar con Supabase primero
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('isometric_evaluations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, evaluations: data })
        }
      } catch (e) {
        console.log('[ISOMETRIC API] Supabase failed, using Prisma')
      }
    }
    
    // Fallback a Prisma - obtener resultados de tests agrupados por músculo
    if (!prisma) {
      return NextResponse.json({ success: true, evaluations: [], musculos: [] })
    }
    
    // Obtener todos los resultados del usuario
    const results = await prisma.testResult.findMany({
      where: { userId },
      include: {
        MuscleGroup: true,
        IsometricTest: true
      },
      orderBy: { date: 'desc' }
    })
    
    // Si no hay resultados, devolver array vacío
    if (results.length === 0) {
      return NextResponse.json({ 
        success: true, 
        evaluations: [], 
        musculos: [],
        message: 'No hay evaluaciones isométricas registradas'
      })
    }
    
    // Agrupar por grupo muscular y lado
    const muscleData: Record<string, { R: number; L: number; name: string }> = {}
    
    for (const result of results) {
      const muscleName = result.MuscleGroup?.name
      if (!muscleName) continue
      
      const muscleId = MUSCLE_ID_MAP[muscleName] || muscleName.toLowerCase().replace(/\s+/g, '_')
      
      if (!muscleData[muscleId]) {
        muscleData[muscleId] = { R: 0, L: 0, name: muscleName }
      }
      
      if (result.side === 'R' && result.value > muscleData[muscleId].R) {
        muscleData[muscleId].R = result.value
      } else if (result.side === 'L' && result.value > muscleData[muscleId].L) {
        muscleData[muscleId].L = result.value
      }
    }
    
    // Convertir a formato esperado por el frontend
    const musculos = Object.entries(muscleData).map(([id, data]) => ({
      id,
      nombre: data.name,
      fuerza: { R: data.R, L: data.L }
    }))
    
    // Obtener la última fecha de evaluación
    const lastEvaluation = await prisma.evaluacion.findFirst({
      where: { 
        userId,
        tipoEvaluacion: 'isometrica'
      },
      orderBy: { fechaEvaluacion: 'desc' }
    })
    
    return NextResponse.json({ 
      success: true, 
      evaluations: lastEvaluation ? [lastEvaluation] : [],
      musculos,
      totalResults: results.length
    })
  } catch (error) {
    console.error('Error in GET isometric:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ============================================================================
// POST - Guardar nueva evaluación isométrica
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body: IsometricEvaluationRequest = await request.json()
    const { userId, musculos, indiceGlobal, desequilibrios } = body
    
    console.log('[ISOMETRIC API] Recibiendo datos:', { userId, musculosCount: musculos?.length, indiceGlobal })
    
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }
    
    // Crear registro de evaluación
    const evaluationData = {
      user_id: userId,
      musculos_data: musculos,
      indice_global: indiceGlobal.valor,
      tren_superior: indiceGlobal.trenSuperior,
      core: indiceGlobal.core,
      tren_inferior: indiceGlobal.trenInferior,
      simetria_general: indiceGlobal.simetriaGeneral,
      desequilibrios: desequilibrios
    }
    
    console.log('[ISOMETRIC API] Datos a insertar:', evaluationData)
    
    // Intentar con Supabase primero
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('isometric_evaluations')
          .insert(evaluationData)
          .select()
          .single()
        
        console.log('[ISOMETRIC API] Supabase response:', { data, error })
        
        if (!error && data) {
          return NextResponse.json({ success: true, evaluation: data, count: musculos.length })
        }
        
        if (error) {
          console.error('[ISOMETRIC API] Supabase error:', error)
          return NextResponse.json({ 
            error: 'Error de Supabase: ' + error.message,
            details: error
          }, { status: 500 })
        }
      } catch (e: any) {
        console.error('[ISOMETRIC API] Supabase exception:', e)
        return NextResponse.json({ 
          error: 'Excepción de Supabase: ' + e.message 
        }, { status: 500 })
      }
    } else {
      console.log('[ISOMETRIC API] Supabase client is null')
    }
    
    // Fallback a Prisma
    if (!prisma) {
      return NextResponse.json({ 
        success: true, 
        evaluation: { id: 'local-' + Date.now(), ...evaluationData }
      })
    }
    
    const evaluation = await prisma.evaluacion.create({
      data: {
        id: 'isometric-' + Date.now(),
        userId,
        tipoEvaluacion: 'isometrica',
        fuerzaMaximaKg: indiceGlobal.valor,
        simetriaPorcentaje: indiceGlobal.simetriaGeneral,
        observaciones: JSON.stringify({
          musculos,
          indiceGlobal,
          desequilibrios
        })
      }
    })
    
    return NextResponse.json({ success: true, evaluation })
  } catch (error: any) {
    console.error('Error in POST isometric:', error)
    return NextResponse.json({ 
      error: 'Error al guardar evaluación: ' + error.message 
    }, { status: 500 })
  }
}
