import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) return null
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }
    
    // Obtener datos del usuario (todos los datos están en la tabla usuarios)
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    
    // Obtener evaluaciones
    const { data: evaluations } = await supabase
      .from('evaluaciones')
      .select('*')
      .eq('user_id', userId)
      .order('fecha_evaluacion', { ascending: false })
    
    // Obtener métricas guardadas
    const { data: metricas } = await supabase
      .from('metricas_usuario')
      .select('*')
      .eq('user_id', userId)
      .order('fecha_calculo', { ascending: false })
      .limit(1)
    
    // Obtener sesiones de entrenamiento
    const { data: sessions } = await supabase
      .from('sesiones_entrenamiento')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })
      .limit(50)
    
    // Calcular edad
    let edad = 'N/A'
    if (user.fecha_nacimiento) {
      const birth = new Date(user.fecha_nacimiento)
      const today = new Date()
      edad = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toString()
    }
    
    // Calcular RM Total
    const rmTotal = (user.rm_bench_press || 0) + (user.rm_squat || 0) + 
                    (user.rm_deadlift || 0) + (user.rm_overhead_press || 0) + 
                    (user.rm_barbell_row || 0)
    
    // Crear workbook
    const workbook = XLSX.utils.book_new()
    
    // ============================================
    // HOJA 1: DATOS DEL USUARIO
    // ============================================
    const profileData = [
      ['BIOMOV FITNESS - REPORTE DE USUARIO'],
      ['Generado:', new Date().toLocaleString('es-ES')],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['DATOS PERSONALES'],
      ['═══════════════════════════════════════'],
      ['ID', user.id],
      ['Email', user.email || 'N/A'],
      ['Nombre Completo', user.nombre_completo || 'N/A'],
      ['DNI', user.dni || 'N/A'],
      ['Rol', user.rol || 'usuario'],
      ['Género', user.genero || 'N/A'],
      ['Fecha de Nacimiento', user.fecha_nacimiento ? new Date(user.fecha_nacimiento).toLocaleDateString('es-ES') : 'N/A'],
      ['Edad', edad + ' años'],
      ['Fecha Registro', new Date(user.created_at).toLocaleDateString('es-ES')],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['DATOS FÍSICOS'],
      ['═══════════════════════════════════════'],
      ['Altura', user.altura_cm ? `${user.altura_cm} cm` : 'N/A'],
      ['Peso', user.peso_kg ? `${user.peso_kg} kg` : 'N/A'],
      ['IMC', user.imc ? user.imc.toFixed(1) : 'N/A'],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['DATOS CARDIOVASCULARES'],
      ['═══════════════════════════════════════'],
      ['FC Máxima', user.fc_maxima ? `${user.fc_maxima} bpm` : 'N/A'],
      ['FC Reposo', user.fc_reposo ? `${user.fc_reposo} bpm` : 'N/A'],
      ['VFC Media', user.vfc_media ? `${user.vfc_media} ms` : 'N/A'],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['ENTRENAMIENTO'],
      ['═══════════════════════════════════════'],
      ['Nivel de Experiencia', user.nivel_experiencia || 'N/A'],
      ['Objetivo', user.objetivo || 'N/A'],
      ['Disciplina', user.disciplina || 'N/A'],
      ['Tiempo de Práctica', user.tiempo_practica || 'N/A'],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['RECORDS PERSONALES (1RM)'],
      ['═══════════════════════════════════════'],
      ['Bench Press', user.rm_bench_press ? `${user.rm_bench_press} kg` : 'N/A'],
      ['Sentadilla (Squat)', user.rm_squat ? `${user.rm_squat} kg` : 'N/A'],
      ['Peso Muerto (Deadlift)', user.rm_deadlift ? `${user.rm_deadlift} kg` : 'N/A'],
      ['Overhead Press', user.rm_overhead_press ? `${user.rm_overhead_press} kg` : 'N/A'],
      ['Barbell Row', user.rm_barbell_row ? `${user.rm_barbell_row} kg` : 'N/A'],
      ['TOTAL 1RM', rmTotal > 0 ? `${rmTotal} kg` : 'N/A'],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['SALUD'],
      ['═══════════════════════════════════════'],
      ['Lesiones', user.lesiones || 'Ninguna registrada'],
      ['Restricciones', user.restricciones || 'Ninguna registrada'],
      ['', ''],
      ['═══════════════════════════════════════'],
      ['RESUMEN DE ACTIVIDAD'],
      ['═══════════════════════════════════════'],
      ['Total Evaluaciones', evaluations?.length || 0],
      ['Total Sesiones', sessions?.length || 0],
      ['Último Acceso', user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleString('es-ES') : 'N/A'],
    ]
    
    const profileSheet = XLSX.utils.aoa_to_sheet(profileData)
    
    // Ajustar ancho de columnas
    profileSheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
    
    XLSX.utils.book_append_sheet(workbook, profileSheet, 'Datos Usuario')
    
    // ============================================
    // HOJA 2: MÉTRICAS CALCULADAS
    // ============================================
    if (metricas && metricas.length > 0) {
      const m = metricas[0]
      const metricasData = [
        ['MÉTRICAS CALCULADAS'],
        ['Fecha de Cálculo:', new Date(m.fecha_calculo).toLocaleString('es-ES')],
        ['', ''],
        ['MÉTRICA', 'VALOR'],
        ['RM Total', `${m.rm_total} kg`],
        ['Wilks Score', m.wilks_score ? m.wilks_score.toFixed(2) : 'N/A'],
        ['Fuerza Relativa', m.fuerza_relativa ? `${m.fuerza_relativa.toFixed(2)} kg/kg` : 'N/A'],
        ['VDOT', m.vdot ? m.vdot.toFixed(1) : 'N/A'],
        ['Fecha VDOT', m.vdot_fecha ? new Date(m.vdot_fecha).toLocaleDateString('es-ES') : 'N/A'],
        ['', ''],
        ['RANKINGS ACTUALES'],
        ['Ranking Fuerza', m.ranking_fuerza ? `#${m.ranking_fuerza} de 15` : 'N/A'],
        ['Ranking VDOT', m.ranking_vdot ? `#${m.ranking_vdot} de 15` : 'N/A'],
        ['Ranking Wilks', m.ranking_wilks ? `#${m.ranking_wilks} de 15` : 'N/A'],
      ]
      
      const metricasSheet = XLSX.utils.aoa_to_sheet(metricasData)
      metricasSheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(workbook, metricasSheet, 'Métricas')
    }
    
    // ============================================
    // HOJA 3: EVALUACIONES
    // ============================================
    if (evaluations && evaluations.length > 0) {
      const evalData = [
        ['HISTORIAL DE EVALUACIONES'],
        ['Total:', evaluations.length],
        ['', ''],
        ['Fecha', 'Tipo', 'VDOT', 'Fuerza Max (kg)', 'RFD (kg/s)', 'FC Media', 'FC Max', 'RMSSD', 'Grasa %', 'Masa Muscular (kg)', 'Observaciones']
      ]
      
      evaluations.forEach((e: any) => {
        evalData.push([
          new Date(e.fecha_evaluacion).toLocaleDateString('es-ES'),
          e.tipo_evaluacion || 'General',
          e.vdot || 'N/A',
          e.fuerza_maxima_kg || 'N/A',
          e.rfd_kg_s || 'N/A',
          e.fc_media || 'N/A',
          e.fc_max_alcanzada || 'N/A',
          e.vfc_rmssd || 'N/A',
          e.grasa_corporal_pct || 'N/A',
          e.masa_muscular_kg || 'N/A',
          e.observaciones || ''
        ])
      })
      
      const evalSheet = XLSX.utils.aoa_to_sheet(evalData)
      evalSheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
        { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
        { wch: 10 }, { wch: 15 }, { wch: 30 }
      ]
      XLSX.utils.book_append_sheet(workbook, evalSheet, 'Evaluaciones')
    }
    
    // ============================================
    // HOJA 4: SESIONES DE ENTRENAMIENTO
    // ============================================
    if (sessions && sessions.length > 0) {
      const sessionsData = [
        ['SESIONES DE ENTRENAMIENTO'],
        ['Total:', sessions.length],
        ['', ''],
        ['Fecha', 'Duración (min)', 'Volumen (kg)', 'RPE Promedio', 'Completada', 'Notas']
      ]
      
      sessions.forEach((s: any) => {
        sessionsData.push([
          new Date(s.fecha).toLocaleDateString('es-ES'),
          s.duracion_min || 'N/A',
          s.volumen_total_kg || 0,
          s.rpe_promedio || 'N/A',
          s.completada ? 'Sí' : 'No',
          s.notas || ''
        ])
      })
      
      const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsData)
      sessionsSheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 30 }
      ]
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sesiones')
    }
    
    // ============================================
    // HOJA 5: RESUMEN DE FUERZA
    // ============================================
    const fuerzaData = [
      ['RESUMEN DE FUERZA - RECORDS PERSONALES'],
      ['', ''],
      ['EJERCICIO', '1RM (kg)', 'DETALLE'],
      ['Bench Press', user.rm_bench_press || 0, 'Press de banca plano'],
      ['Sentadilla', user.rm_squat || 0, 'Back squat'],
      ['Peso Muerto', user.rm_deadlift || 0, 'Deadlift convencional'],
      ['Overhead Press', user.rm_overhead_press || 0, 'Press militar'],
      ['Barbell Row', user.rm_barbell_row || 0, 'Remo con barra'],
      ['', '', ''],
      ['TOTAL', rmTotal, 'Suma de 5 levantamientos'],
      ['', '', ''],
      ['ESTADÍSTICAS'],
      ['Fuerza Relativa', rmTotal > 0 && user.peso_kg ? (rmTotal / user.peso_kg).toFixed(2) + ' kg/kg peso corporal' : 'N/A'],
      ['Percentil Estimado', rmTotal > 0 ? getStrengthPercentile(rmTotal, user.genero) : 'N/A'],
    ]
    
    const fuerzaSheet = XLSX.utils.aoa_to_sheet(fuerzaData)
    fuerzaSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(workbook, fuerzaSheet, 'Fuerza')
    
    // ============================================
    // HOJA 6: VDOT Y ENDURANCE
    // ============================================
    const vdotEvals = evaluations?.filter((e: any) => e.vdot) || []
    
    if (vdotEvals.length > 0) {
      const vdotData = [
        ['HISTORIAL VDOT - ENDURANCE'],
        ['', ''],
        ['VDOT ACTUAL', vdotEvals[0]?.vdot?.toFixed(1) || 'N/A'],
        ['', ''],
        ['Fecha', 'VDOT', 'Tiempo Carrera', 'Distancia (m)', 'FC Media'],
      ]
      
      vdotEvals.forEach((e: any) => {
        vdotData.push([
          new Date(e.fecha_evaluacion).toLocaleDateString('es-ES'),
          e.vdot?.toFixed(1) || 'N/A',
          e.tiempo_carrera_seg ? formatTime(e.tiempo_carrera_seg) : 'N/A',
          e.distancia_carrera_m || 'N/A',
          e.fc_media || 'N/A'
        ])
      })
      
      // Agregar ritmos de entrenamiento basados en VDOT actual
      const currentVdot = vdotEvals[0]?.vdot
      if (currentVdot) {
        vdotData.push(['', '', '', '', ''])
        vdotData.push(['RITMOS DE ENTRENAMIENTO ESTIMADOS', '', '', '', ''])
        vdotData.push(['Zona', 'Ritmo/km', 'Descripción', '', ''])
        vdotData.push(['Easy', getVDOTPace(currentVdot, 'easy'), 'Recuperación', '', ''])
        vdotData.push(['Tempo', getVDOTPace(currentVdot, 'tempo'), 'Umbral', '', ''])
        vdotData.push(['Interval', getVDOTPace(currentVdot, 'interval'), 'VO2max', '', ''])
      }
      
      const vdotSheet = XLSX.utils.aoa_to_sheet(vdotData)
      vdotSheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, vdotSheet, 'VDOT-Endurance')
    }
    
    // Generar archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    const fileName = `BIOMOV_${(user.nombre_completo || 'usuario').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('Error exporting user:', error)
    return NextResponse.json({ error: 'Error al exportar usuario' }, { status: 500 })
  }
}

// Funciones auxiliares
function getStrengthPercentile(rmTotal: number, genero: string | null): string {
  // Percentiles aproximados basados en powerlifting
  const percentiles = genero === 'femenino' 
    ? [
        { min: 0, max: 150, label: 'Principiante (0-25%)' },
        { min: 150, max: 250, label: 'Intermedio (25-50%)' },
        { min: 250, max: 400, label: 'Avanzado (50-75%)' },
        { min: 400, max: 550, label: 'Muy Avanzado (75-90%)' },
        { min: 550, max: Infinity, label: 'Élite (90%+)' }
      ]
    : [
        { min: 0, max: 200, label: 'Principiante (0-25%)' },
        { min: 200, max: 350, label: 'Intermedio (25-50%)' },
        { min: 350, max: 500, label: 'Avanzado (50-75%)' },
        { min: 500, max: 700, label: 'Muy Avanzado (75-90%)' },
        { min: 700, max: Infinity, label: 'Élite (90%+)' }
      ]
  
  const found = percentiles.find(p => rmTotal >= p.min && rmTotal < p.max)
  return found?.label || 'N/A'
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getVDOTPace(vdot: number, zone: string): string {
  // Fórmula simplificada de ritmos basados en VDOT
  // Ritmo en min/km
  const basePace = 60 / (vdot * 0.3) // aproximación
  
  const multipliers: Record<string, number> = {
    easy: 1.25,
    tempo: 1.08,
    interval: 0.95
  }
  
  const pace = basePace * (multipliers[zone] || 1)
  const mins = Math.floor(pace)
  const secs = Math.round((pace - mins) * 60)
  
  return `${mins}:${secs.toString().padStart(2, '0')} /km`
}
