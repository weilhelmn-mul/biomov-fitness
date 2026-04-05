import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) return null
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// ============================================================================
// GET - Obtener métricas guardadas
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'latest'
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30')
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }
    
    switch (action) {
      case 'latest':
        return await getLatestMetrics(supabase)
      case 'history':
        return await getMetricsHistory(supabase, days)
      case 'user':
        return await getUserMetricsHistory(supabase, userId, days)
      case 'rankings':
        return await getSavedRankings(supabase, searchParams.get('tipo'))
      case 'alerts':
        return await getSavedAlerts(supabase)
      case 'stats':
        return await getSavedStats(supabase, days)
      case 'check':
        return await checkTables(supabase)
      default:
        return await getLatestMetrics(supabase)
    }
  } catch (error) {
    console.error('Error in metrics API:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ============================================================================
// POST - Guardar métricas
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }
    
    switch (action) {
      case 'save_all':
        return await saveAllMetrics(supabase)
      case 'save_user_metrics':
        return await saveUserMetrics(supabase)
      case 'save_rankings':
        return await saveRankings(supabase)
      case 'save_alerts':
        return await saveAlerts(supabase)
      case 'save_stats':
        return await saveGlobalStats(supabase)
      default:
        return await saveAllMetrics(supabase)
    }
  } catch (error) {
    console.error('Error saving metrics:', error)
    return NextResponse.json({ error: 'Error al guardar métricas' }, { status: 500 })
  }
}

// ============================================================================
// CHECK TABLES - Verificar si las tablas existen
// ============================================================================
async function checkTables(supabase: any) {
  const tables = ['metricas_usuario', 'rankings_historico', 'estadisticas_globales', 'alertas_sistema', 'historial_progreso']
  const status: Record<string, boolean> = {}
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    status[table] = !error || !error.message.includes('Could not find')
  }
  
  const allExist = Object.values(status).every(v => v)
  
  return NextResponse.json({
    success: true,
    allTablesExist: allExist,
    tables: status,
    message: allExist 
      ? 'Todas las tablas existen. Puedes guardar métricas.'
      : 'Faltan tablas. Ejecuta el script SQL en Supabase.',
    sqlFile: '/supabase/create_metrics_tables.sql'
  })
}

// ============================================================================
// SAVE ALL METRICS
// ============================================================================
async function saveAllMetrics(supabase: any) {
  // Verificar que las tablas existen
  const { data: checkData } = await supabase.from('metricas_usuario').select('*').limit(1)
  const { error: checkError } = await supabase.from('metricas_usuario').select('*').limit(1)
  
  if (checkError && checkError.message.includes('Could not find')) {
    return NextResponse.json({ 
      success: false,
      error: 'Las tablas de métricas no existen',
      needsSetup: true,
      sqlFile: '/supabase/create_metrics_tables.sql',
      instructions: [
        '1. Ve a Supabase Dashboard > SQL Editor',
        '2. Crea una nueva query',
        '3. Copia el contenido del archivo /supabase/create_metrics_tables.sql',
        '4. Ejecuta el script SQL',
        '5. Vuelve a ejecutar este endpoint'
      ]
    }, { status: 400 })
  }
  
  const results = { userMetrics: null, rankings: null, alerts: null, stats: null }
  
  const userMetricsResult = await saveUserMetrics(supabase)
  results.userMetrics = await userMetricsResult.json()
  
  const rankingsResult = await saveRankings(supabase)
  results.rankings = await rankingsResult.json()
  
  const alertsResult = await saveAlerts(supabase)
  results.alerts = await alertsResult.json()
  
  const statsResult = await saveGlobalStats(supabase)
  results.stats = await statsResult.json()
  
  return NextResponse.json({
    success: true,
    message: 'Todas las métricas guardadas correctamente',
    results,
    timestamp: new Date().toISOString(),
  })
}

// ============================================================================
// SAVE USER METRICS
// ============================================================================
async function saveUserMetrics(supabase: any) {
  const { data: users, error: usersError } = await supabase
    .from('usuarios')
    .select(`id, nombre_completo, genero, fecha_nacimiento, altura_cm, peso_kg, imc,
      fc_maxima, fc_reposo, nivel_experiencia, objetivo, disciplina,
      rm_bench_press, rm_squat, rm_deadlift, rm_overhead_press, rm_barbell_row`)
    .eq('aprobado', true)
  
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })
  
  // Obtener VDOT más reciente
  const { data: vdotData } = await supabase
    .from('evaluaciones')
    .select('user_id, vdot, fecha_evaluacion')
    .not('vdot', 'is', null)
    .order('fecha_evaluacion', { ascending: false })
  
  const latestVdot: Record<string, { vdot: number, fecha: string }> = {}
  vdotData?.forEach((v: any) => {
    if (!latestVdot[v.user_id]) {
      latestVdot[v.user_id] = { vdot: v.vdot, fecha: v.fecha_evaluacion }
    }
  })
  
  // Contar evaluaciones
  const { data: evalsCount } = await supabase.from('evaluaciones').select('user_id')
  const evalsByUser: Record<string, number> = {}
  evalsCount?.forEach((e: any) => {
    evalsByUser[e.user_id] = (evalsByUser[e.user_id] || 0) + 1
  })
  
  const userMetrics = users?.map((user: any) => {
    const rmTotal = (user.rm_bench_press || 0) + (user.rm_squat || 0) + 
                    (user.rm_deadlift || 0) + (user.rm_overhead_press || 0) + 
                    (user.rm_barbell_row || 0)
    
    let edad = null
    if (user.fecha_nacimiento) {
      edad = Math.floor((Date.now() - new Date(user.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }
    
    let wilksScore = null
    if (rmTotal > 0 && user.peso_kg) {
      wilksScore = parseFloat((rmTotal * (user.genero === 'masculino' ? 0.68 : 0.78) / user.peso_kg).toFixed(2))
    }
    
    let fuerzaRelativa = null
    if (rmTotal > 0 && user.peso_kg) {
      fuerzaRelativa = parseFloat((rmTotal / user.peso_kg).toFixed(2))
    }
    
    const vdotInfo = latestVdot[user.id]
    
    return {
      user_id: user.id,
      edad,
      peso_kg: user.peso_kg,
      altura_cm: user.altura_cm,
      imc: user.imc,
      rm_bench: user.rm_bench_press || 0,
      rm_squat: user.rm_squat || 0,
      rm_deadlift: user.rm_deadlift || 0,
      rm_overhead: user.rm_overhead_press || 0,
      rm_row: user.rm_barbell_row || 0,
      rm_total: rmTotal,
      wilks_score: wilksScore,
      fuerza_relativa: fuerzaRelativa,
      fc_max: user.fc_maxima,
      fc_reposo: user.fc_reposo,
      vdot: vdotInfo?.vdot || null,
      vdot_fecha: vdotInfo?.fecha || null,
      total_evaluaciones: evalsByUser[user.id] || 0,
      nivel_experiencia: user.nivel_experiencia,
      objetivo: user.objetivo,
      disciplina: user.disciplina,
    }
  }) || []
  
  // Calcular rankings
  const byStrength = [...userMetrics].sort((a, b) => b.rm_total - a.rm_total)
  const byVdot = [...userMetrics].filter(u => u.vdot).sort((a, b) => (b.vdot || 0) - (a.vdot || 0))
  const byWilks = [...userMetrics].filter(u => u.wilks_score).sort((a, b) => (b.wilks_score || 0) - (a.wilks_score || 0))
  
  byStrength.forEach((u, idx) => { u.ranking_fuerza = idx + 1 })
  byVdot.forEach((u, idx) => { u.ranking_vdot = idx + 1 })
  byWilks.forEach((u, idx) => { u.ranking_wilks = idx + 1 })
  
  const { error: insertError } = await supabase.from('metricas_usuario').insert(userMetrics)
  
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  
  return NextResponse.json({ success: true, saved: userMetrics.length, timestamp: new Date().toISOString() })
}

// ============================================================================
// SAVE RANKINGS
// ============================================================================
async function saveRankings(supabase: any) {
  const { data: metricas } = await supabase
    .from('metricas_usuario')
    .select('*')
    .order('fecha_calculo', { ascending: false })
    .limit(100)
  
  if (!metricas || metricas.length === 0) {
    return NextResponse.json({ success: true, saved: 0, message: 'No hay métricas guardadas' })
  }
  
  const latestDate = metricas[0].fecha_calculo
  const latestMetrics = metricas.filter((m: any) => m.fecha_calculo === latestDate)
  
  const rankingsData: any[] = []
  const timestamp = new Date().toISOString()
  
  const rankingTypes = [
    { field: 'rm_total', tipo: 'fuerza' },
    { field: 'vdot', tipo: 'vdot' },
    { field: 'wilks_score', tipo: 'wilks' },
    { field: 'rm_bench', tipo: 'bench' },
    { field: 'rm_squat', tipo: 'squat' },
    { field: 'rm_deadlift', tipo: 'deadlift' },
  ]
  
  for (const { field, tipo } of rankingTypes) {
    const sorted = [...latestMetrics].filter((m: any) => m[field] !== null && m[field] > 0).sort((a: any, b: any) => b[field] - a[field])
    sorted.forEach((m: any, idx: number) => {
      rankingsData.push({
        fecha_snapshot: timestamp,
        tipo_ranking: tipo,
        posicion: idx + 1,
        user_id: m.user_id,
        nombre_usuario: m.nombre,
        valor_metrica: m[field],
        valor_secundario: m.peso_kg,
      })
    })
  }
  
  // FC Reposo (menor es mejor)
  const fcSorted = [...latestMetrics].filter((m: any) => m.fc_reposo > 0).sort((a: any, b: any) => a.fc_reposo - b.fc_reposo)
  fcSorted.forEach((m: any, idx: number) => {
    rankingsData.push({
      fecha_snapshot: timestamp,
      tipo_ranking: 'fc_reposo',
      posicion: idx + 1,
      user_id: m.user_id,
      nombre_usuario: m.nombre,
      valor_metrica: m.fc_reposo,
    })
  })
  
  const { error } = await supabase.from('rankings_historico').insert(rankingsData)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ success: true, saved: rankingsData.length, timestamp })
}

// ============================================================================
// SAVE ALERTS
// ============================================================================
async function saveAlerts(supabase: any) {
  const { data: users } = await supabase
    .from('usuarios')
    .select('id, nombre_completo, imc, fc_reposo, nivel_experiencia, rm_bench_press')
    .eq('aprobado', true)
  
  const alerts: any[] = []
  
  users?.forEach((user: any) => {
    if (user.imc && user.imc > 30) {
      alerts.push({
        user_id: user.id,
        nombre_usuario: user.nombre_completo,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'IMC elevado',
        mensaje: `${user.nombre_completo} tiene IMC de ${user.imc.toFixed(1)}`,
        valor_alerta: user.imc,
        umbral: 30,
      })
    }
    
    if (user.nivel_experiencia === 'avanzado' && !user.rm_bench_press) {
      alerts.push({
        user_id: user.id,
        nombre_usuario: user.nombre_completo,
        tipo_alerta: 'evaluacion',
        severidad: 'info',
        titulo: 'Evaluación pendiente',
        mensaje: `${user.nombre_completo} es avanzado sin 1RM registrado`,
      })
    }
    
    if (user.fc_reposo && user.fc_reposo > 80) {
      alerts.push({
        user_id: user.id,
        nombre_usuario: user.nombre_completo,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'FC Reposo elevada',
        mensaje: `${user.nombre_completo} tiene FC reposo de ${user.fc_reposo} bpm`,
        valor_alerta: user.fc_reposo,
        umbral: 80,
      })
    }
    
    if (user.imc && user.imc < 18.5) {
      alerts.push({
        user_id: user.id,
        nombre_usuario: user.nombre_completo,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'IMC bajo',
        mensaje: `${user.nombre_completo} tiene IMC de ${user.imc.toFixed(1)}`,
        valor_alerta: user.imc,
        umbral: 18.5,
      })
    }
  })
  
  if (alerts.length === 0) {
    return NextResponse.json({ success: true, saved: 0, message: 'No hay alertas nuevas' })
  }
  
  const { error } = await supabase.from('alertas_sistema').insert(alerts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ success: true, saved: alerts.length, timestamp: new Date().toISOString() })
}

// ============================================================================
// SAVE GLOBAL STATS
// ============================================================================
async function saveGlobalStats(supabase: any) {
  const { data: metricas } = await supabase
    .from('metricas_usuario')
    .select('*')
    .order('fecha_calculo', { ascending: false })
    .limit(100)
  
  if (!metricas || metricas.length === 0) {
    return NextResponse.json({ success: true, saved: 0, message: 'No hay métricas' })
  }
  
  const latestDate = metricas[0].fecha_calculo
  const latestMetrics = metricas.filter((m: any) => m.fecha_calculo === latestDate)
  
  const withIMC = latestMetrics.filter((m: any) => m.imc)
  const avgIMC = withIMC.length > 0 ? (withIMC.reduce((s: number, m: any) => s + m.imc, 0) / withIMC.length).toFixed(1) : null
  
  const withVDOT = latestMetrics.filter((m: any) => m.vdot)
  const avgVDOT = withVDOT.length > 0 ? (withVDOT.reduce((s: number, m: any) => s + m.vdot, 0) / withVDOT.length).toFixed(1) : null
  
  const withRM = latestMetrics.filter((m: any) => m.rm_total > 0)
  const avgRM = withRM.length > 0 ? Math.round(withRM.reduce((s: number, m: any) => s + m.rm_total, 0) / withRM.length) : null
  
  const withEdad = latestMetrics.filter((m: any) => m.edad)
  const avgEdad = withEdad.length > 0 ? Math.round(withEdad.reduce((s: number, m: any) => s + m.edad, 0) / withEdad.length) : null
  
  const withFC = latestMetrics.filter((m: any) => m.fc_reposo)
  const avgFC = withFC.length > 0 ? Math.round(withFC.reduce((s: number, m: any) => s + m.fc_reposo, 0) / withFC.length) : null
  
  const distribucionObjetivos: Record<string, number> = {}
  const distribucionNiveles: Record<string, number> = {}
  
  latestMetrics.forEach((m: any) => {
    if (m.objetivo) distribucionObjetivos[m.objetivo] = (distribucionObjetivos[m.objetivo] || 0) + 1
    if (m.nivel_experiencia) distribucionNiveles[m.nivel_experiencia] = (distribucionNiveles[m.nivel_experiencia] || 0) + 1
  })
  
  const topFuerza = [...latestMetrics].filter((m: any) => m.rm_total > 0).sort((a: any, b: any) => b.rm_total - a.rm_total).slice(0, 5).map((m: any) => ({ user_id: m.user_id, valor: m.rm_total }))
  const topVDOT = [...latestMetrics].filter((m: any) => m.vdot).sort((a: any, b: any) => b.vdot - a.vdot).slice(0, 5).map((m: any) => ({ user_id: m.user_id, valor: m.vdot }))
  const topWilks = [...latestMetrics].filter((m: any) => m.wilks_score).sort((a: any, b: any) => b.wilks_score - a.wilks_score).slice(0, 5).map((m: any) => ({ user_id: m.user_id, valor: m.wilks_score }))
  
  const { count: totalAlertas } = await supabase.from('alertas_sistema').select('*', { count: 'exact', head: true }).eq('leida', false)
  const { count: alertasCriticas } = await supabase.from('alertas_sistema').select('*', { count: 'exact', head: true }).eq('leida', false).eq('severidad', 'critical')
  const { count: alertasWarning } = await supabase.from('alertas_sistema').select('*', { count: 'exact', head: true }).eq('leida', false).eq('severidad', 'warning')
  const { count: totalEvals } = await supabase.from('evaluaciones').select('*', { count: 'exact', head: true })
  
  const stats = {
    total_usuarios: latestMetrics.length,
    usuarios_activos: latestMetrics.length,
    total_evaluaciones: totalEvals || 0,
    avg_imc: avgIMC ? parseFloat(avgIMC) : null,
    avg_vdot: avgVDOT ? parseFloat(avgVDOT) : null,
    avg_rm_total: avgRM,
    avg_edad: avgEdad,
    avg_fc_reposo: avgFC,
    distribucion_objetivos: distribucionObjetivos,
    distribucion_niveles: distribucionNiveles,
    distribucion_genero: {},
    top_fuerza: topFuerza,
    top_vdot: topVDOT,
    top_wilks: topWilks,
    total_alertas: totalAlertas || 0,
    alertas_criticas: alertasCriticas || 0,
    alertas_warning: alertasWarning || 0,
  }
  
  const { error } = await supabase.from('estadisticas_globales').insert(stats)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ success: true, saved: stats, timestamp: new Date().toISOString() })
}

// ============================================================================
// GET FUNCTIONS
// ============================================================================

async function getLatestMetrics(supabase: any) {
  const { data, error } = await supabase.from('metricas_usuario').select('*').order('fecha_calculo', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ success: false, message: 'No hay métricas. Ejecuta POST con action=save_all' })
  
  const latestDate = data[0].fecha_calculo
  return NextResponse.json({ success: true, fecha_calculo: latestDate, total: data.length, metrics: data.filter((m: any) => m.fecha_calculo === latestDate) })
}

async function getMetricsHistory(supabase: any, days: number) {
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('estadisticas_globales').select('*').gte('fecha_snapshot', fromDate).order('fecha_snapshot', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, dias: days, total: data?.length || 0, historial: data })
}

async function getUserMetricsHistory(supabase: any, userId: string | null, days: number) {
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('metricas_usuario').select('*').eq('user_id', userId).gte('fecha_calculo', fromDate).order('fecha_calculo', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, user_id: userId, dias: days, total: data?.length || 0, historial: data })
}

async function getSavedRankings(supabase: any, tipo: string | null) {
  let query = supabase.from('rankings_historico').select('*').order('fecha_snapshot', { ascending: false }).limit(200)
  if (tipo) query = query.eq('tipo_ranking', tipo)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, total: data?.length || 0, rankings: data })
}

async function getSavedAlerts(supabase: any) {
  const { data, error } = await supabase.from('alertas_sistema').select('*').eq('leida', false).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, total: data?.length || 0, alerts: data })
}

async function getSavedStats(supabase: any, days: number) {
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('estadisticas_globales').select('*').gte('fecha_snapshot', fromDate).order('fecha_snapshot', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, dias: days, total: data?.length || 0, stats: data?.[0] || null, historial: data })
}
