import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ============================================================================
// GET - Obtener todos los datos del dashboard admin
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const userId = searchParams.get('userId')
    
    // Try Supabase first, fallback to Prisma
    let usePrisma = false
    
    if (supabase) {
      try {
        // Test connection with a simple query
        const { error: testError } = await supabase
          .from('usuarios')
          .select('id')
          .limit(1)
        
        if (testError && testError.message?.includes('fetch')) {
          console.log('[ADMIN DASHBOARD] Supabase connection failed, using Prisma')
          usePrisma = true
        }
      } catch {
        usePrisma = true
      }
    } else {
      usePrisma = true
    }
    
    if (usePrisma) {
      return await handlePrismaRequest(type, userId)
    }
    
    switch (type) {
      case 'overview':
        return await getOverviewSupabase(supabase)
      case 'users':
        return await getUsersListSupabase(supabase)
      case 'user-detail':
        return await getUserDetailSupabase(supabase, userId)
      case 'comparisons':
        return await getComparisonsSupabase(supabase)
      case 'alerts':
        return await getAlertsSupabase(supabase)
      default:
        return await getOverviewSupabase(supabase)
    }
    
  } catch (error) {
    console.error('Error in admin dashboard API:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ============================================================================
// PRISMA HANDLER
// ============================================================================
async function handlePrismaRequest(type: string, userId: string | null) {
  const { prisma } = await import('@/lib/prisma')
  
  if (!prisma) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
  }
  
  switch (type) {
    case 'overview':
      return await getOverviewPrisma(prisma)
    case 'users':
      return await getUsersListPrisma(prisma)
    case 'user-detail':
      return await getUserDetailPrisma(prisma, userId)
    case 'comparisons':
      return await getComparisonsPrisma(prisma)
    case 'alerts':
      return await getAlertsPrisma(prisma)
    default:
      return await getOverviewPrisma(prisma)
  }
}

// ============================================================================
// PRISMA: OVERVIEW
// ============================================================================
async function getOverviewPrisma(prisma: any) {
  const users = await prisma.user.findMany({
    where: { aprobado: true },
    include: { 
      UserProfile: true,
      Evaluacion: true
    }
  })
  
  const objectivesDistribution: Record<string, number> = {}
  const levelsDistribution: Record<string, number> = {}
  const genderDistribution: Record<string, number> = {}
  let totalIMC = 0
  let usersWithIMC = 0
  let totalRM = 0
  let usersWithRM = 0
  let totalVDOT = 0
  let usersWithVDOT = 0
  
  users.forEach((u: any) => {
    // Objectives
    const obj = u.UserProfile?.objetivo || u.objetivo || 'sin_definir'
    objectivesDistribution[obj] = (objectivesDistribution[obj] || 0) + 1
    
    // Levels
    const level = u.UserProfile?.nivelExperiencia || u.nivelExperiencia || 'sin_definir'
    levelsDistribution[level] = (levelsDistribution[level] || 0) + 1
    
    // IMC
    if (u.UserProfile?.imc) {
      totalIMC += u.UserProfile.imc
      usersWithIMC++
    }
    
    // RM Total
    const rmTotal = (u.UserProfile?.rmBenchPress || 0) + (u.UserProfile?.rmSquat || 0) + 
                    (u.UserProfile?.rmDeadlift || 0) + (u.UserProfile?.rmOverheadPress || 0) + 
                    (u.UserProfile?.rmBarbellRow || 0)
    if (rmTotal > 0) {
      totalRM += rmTotal
      usersWithRM++
    }
    
    // VDOT from evaluations
    const vdotEvals = u.Evaluacion?.filter((e: any) => e.vdot) || []
    if (vdotEvals.length > 0) {
      const maxVdot = Math.max(...vdotEvals.map((e: any) => e.vdot))
      totalVDOT += maxVdot
      usersWithVDOT++
    }
  })
  
  const totalEvaluations = await prisma.evaluacion.count()
  
  return NextResponse.json({
    success: true,
    overview: {
      totalUsers: users.length,
      totalEvaluations,
      avgIMC: usersWithIMC > 0 ? (totalIMC / usersWithIMC).toFixed(1) : null,
      avgVDOT: usersWithVDOT > 0 ? (totalVDOT / usersWithVDOT).toFixed(1) : null,
      avgRMTotal: usersWithRM > 0 ? Math.round(totalRM / usersWithRM) : null,
      objectivesDistribution,
      levelsDistribution,
      genderDistribution,
    }
  })
}

// ============================================================================
// PRISMA: USERS LIST
// ============================================================================
async function getUsersListPrisma(prisma: any) {
  const users = await prisma.user.findMany({
    where: { aprobado: true },
    include: {
      UserProfile: true,
      _count: { select: { Evaluacion: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  const usersWithMetrics = users.map((user: any) => {
    const profile = user.UserProfile
    const rmTotal = (profile?.rmBenchPress || 0) + (profile?.rmSquat || 0) + 
                    (profile?.rmDeadlift || 0) + (profile?.rmOverheadPress || 0) + 
                    (profile?.rmBarbellRow || 0)
    
    let edad = null
    if (profile?.fechaNacimiento) {
      const birth = new Date(profile.fechaNacimiento)
      const today = new Date()
      edad = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }
    
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombreCompleto || user.name || user.email,
      rol: user.rol,
      activo: user.aprobado,
      creado: user.createdAt.toISOString(),
      genero: profile?.genero || null,
      edad,
      altura: profile?.alturaCm || null,
      peso: profile?.pesoKg || null,
      imc: profile?.imc || null,
      fcMax: profile?.fcMaxima || null,
      fcReposo: profile?.fcReposo || null,
      nivelExperiencia: profile?.nivelExperiencia || null,
      objetivo: profile?.objetivo || null,
      disciplina: null,
      rmBench: profile?.rmBenchPress || null,
      rmSquat: profile?.rmSquat || null,
      rmDeadlift: profile?.rmDeadlift || null,
      rmOverhead: profile?.rmOverheadPress || null,
      rmRow: profile?.rmBarbellRow || null,
      rmTotal,
      totalEvaluaciones: user._count?.Evaluacion || 0,
    }
  })
  
  return NextResponse.json({
    success: true,
    users: usersWithMetrics,
    total: usersWithMetrics.length,
  })
}

// ============================================================================
// PRISMA: USER DETAIL
// ============================================================================
async function getUserDetailPrisma(prisma: any, userId: string | null) {
  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      UserProfile: true,
      Evaluacion: {
        orderBy: { fechaEvaluacion: 'desc' },
        take: 20
      }
    }
  })
  
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  
  const profile = user.UserProfile
  const rmTotal = (profile?.rmBenchPress || 0) + (profile?.rmSquat || 0) + 
                  (profile?.rmDeadlift || 0) + (profile?.rmOverheadPress || 0) + 
                  (profile?.rmBarbellRow || 0)
  
  const stats = {
    totalEvaluations: user.Evaluacion?.length || 0,
    maxVDOT: user.Evaluacion?.filter((e: any) => e.vdot).sort((a: any, b: any) => b.vdot - a.vdot)[0]?.vdot || null,
    avgVDOT: user.Evaluacion?.filter((e: any) => e.vdot).length > 0
      ? user.Evaluacion.filter((e: any) => e.vdot).reduce((sum: number, e: any) => sum + e.vdot, 0) / user.Evaluacion.filter((e: any) => e.vdot).length
      : null,
    maxStrength: user.Evaluacion?.filter((e: any) => e.fuerzaMaximaKg).sort((a: any, b: any) => b.fuerzaMaximaKg - a.fuerzaMaximaKg)[0]?.fuerzaMaximaKg || null,
    rmTotal,
  }
  
  return NextResponse.json({
    success: true,
    user: {
      ...user,
      nombre_completo: profile?.nombreCompleto || user.nombreCompleto || user.name,
      fecha_nacimiento: profile?.fechaNacimiento,
      altura_cm: profile?.alturaCm,
      peso_kg: profile?.pesoKg,
      imc: profile?.imc,
      fc_maxima: profile?.fcMaxima,
      fc_reposo: profile?.fcReposo,
      nivel_experiencia: profile?.nivelExperiencia,
      objetivo: profile?.objetivo,
      rm_bench_press: profile?.rmBenchPress,
      rm_squat: profile?.rmSquat,
      rm_deadlift: profile?.rmDeadlift,
      rm_overhead_press: profile?.rmOverheadPress,
      rm_barbell_row: profile?.rmBarbellRow,
    },
    evaluations: user.Evaluacion || [],
    stats,
  })
}

// ============================================================================
// PRISMA: COMPARISONS
// ============================================================================
async function getComparisonsPrisma(prisma: any) {
  const users = await prisma.user.findMany({
    where: { aprobado: true },
    include: {
      UserProfile: true,
      Evaluacion: true
    }
  })
  
  const processedUsers = users.map((user: any) => {
    const profile = user.UserProfile
    const rm = {
      bench: profile?.rmBenchPress || 0,
      squat: profile?.rmSquat || 0,
      deadlift: profile?.rmDeadlift || 0,
      overhead: profile?.rmOverheadPress || 0,
      row: profile?.rmBarbellRow || 0,
      total: (profile?.rmBenchPress || 0) + (profile?.rmSquat || 0) + 
             (profile?.rmDeadlift || 0) + (profile?.rmOverheadPress || 0) + 
             (profile?.rmBarbellRow || 0)
    }
    
    let edad = null
    if (profile?.fechaNacimiento) {
      const birth = new Date(profile.fechaNacimiento)
      const today = new Date()
      edad = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }
    
    // Wilks Score
    let wilksScore = null
    if (rm.total > 0 && profile?.pesoKg) {
      const coef = profile.genero === 'masculino' ? 0.7 : 0.78
      wilksScore = rm.total * coef / profile.pesoKg
    }
    
    // VDOT from evaluations
    const vdotEvals = user.Evaluacion?.filter((e: any) => e.vdot) || []
    const vdot = vdotEvals.length > 0 ? Math.max(...vdotEvals.map((e: any) => e.vdot)) : null
    
    return {
      userId: user.id,
      nombre: profile?.nombreCompleto || user.nombreCompleto || user.name || user.email,
      email: user.email,
      rol: user.rol,
      genero: profile?.genero || null,
      edad,
      altura: profile?.alturaCm || null,
      peso: profile?.pesoKg || null,
      imc: profile?.imc || null,
      fcMax: profile?.fcMaxima || null,
      fcReposo: profile?.fcReposo || null,
      nivel: profile?.nivelExperiencia || null,
      objetivo: profile?.objetivo || null,
      disciplina: null,
      rm,
      wilksScore,
      vdot,
      totalEvaluaciones: user.Evaluacion?.length || 0,
    }
  })
  
  // Rankings
  const rankings = {
    byStrength: [...processedUsers]
      .filter(u => u.rm.total > 0)
      .sort((a, b) => b.rm.total - a.rm.total)
      .slice(0, 10),
    
    byRelativeStrength: [...processedUsers]
      .filter(u => u.wilksScore && u.wilksScore > 0)
      .sort((a, b) => (b.wilksScore || 0) - (a.wilksScore || 0))
      .slice(0, 10),
    
    byVDOT: [...processedUsers]
      .filter(u => u.vdot && u.vdot > 0)
      .sort((a, b) => (b.vdot || 0) - (a.vdot || 0))
      .slice(0, 10),
    
    byBench: [...processedUsers]
      .filter(u => u.rm.bench > 0)
      .sort((a, b) => b.rm.bench - a.rm.bench)
      .slice(0, 10),
    
    bySquat: [...processedUsers]
      .filter(u => u.rm.squat > 0)
      .sort((a, b) => b.rm.squat - a.rm.squat)
      .slice(0, 10),
    
    byDeadlift: [...processedUsers]
      .filter(u => u.rm.deadlift > 0)
      .sort((a, b) => b.rm.deadlift - a.rm.deadlift)
      .slice(0, 10),
    
    byEvaluations: [...processedUsers]
      .filter(u => u.totalEvaluaciones > 0)
      .sort((a, b) => b.totalEvaluaciones - a.totalEvaluaciones)
      .slice(0, 10),
    
    byFCReposo: [...processedUsers]
      .filter(u => u.fcReposo && u.fcReposo > 0)
      .sort((a, b) => (a.fcReposo || 0) - (b.fcReposo || 0))
      .slice(0, 10),
  }
  
  const stats = {
    totalUsers: processedUsers.length,
    avgRM: processedUsers.filter(u => u.rm.total > 0).length > 0
      ? Math.round(processedUsers.filter(u => u.rm.total > 0).reduce((sum, u) => sum + u.rm.total, 0) / processedUsers.filter(u => u.rm.total > 0).length)
      : 0,
    avgVDOT: processedUsers.filter(u => u.vdot).length > 0
      ? (processedUsers.filter(u => u.vdot).reduce((sum, u) => sum + (u.vdot || 0), 0) / processedUsers.filter(u => u.vdot).length).toFixed(1)
      : null,
    avgIMC: processedUsers.filter(u => u.imc).length > 0
      ? (processedUsers.filter(u => u.imc).reduce((sum, u) => sum + (u.imc || 0), 0) / processedUsers.filter(u => u.imc).length).toFixed(1)
      : null,
    avgAge: processedUsers.filter(u => u.edad).length > 0
      ? Math.round(processedUsers.filter(u => u.edad).reduce((sum, u) => sum + (u.edad || 0), 0) / processedUsers.filter(u => u.edad).length)
      : null,
    totalEvaluations: processedUsers.reduce((sum, u) => sum + u.totalEvaluaciones, 0),
  }
  
  return NextResponse.json({
    success: true,
    users: processedUsers,
    rankings,
    stats,
  })
}

// ============================================================================
// PRISMA: ALERTS
// ============================================================================
async function getAlertsPrisma(prisma: any) {
  const alerts: any[] = []
  
  const users = await prisma.user.findMany({
    where: { aprobado: true },
    include: { UserProfile: true }
  })
  
  users.forEach((user: any) => {
    const profile = user.UserProfile
    
    // IMC alto
    if (profile?.imc && profile.imc > 30) {
      alerts.push({
        id: `imc-${user.id}`,
        user_id: user.id,
        user_name: profile.nombreCompleto || user.nombreCompleto || user.email,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'IMC elevado',
        mensaje: `${profile.nombreCompleto || user.email} tiene un IMC de ${profile.imc.toFixed(1)}. Considera orientación nutricional.`,
        created_at: new Date().toISOString(),
      })
    }
    
    // Usuario avanzado sin registros de fuerza
    if (profile?.nivelExperiencia === 'avanzado' && !profile?.rmBenchPress) {
      alerts.push({
        id: `rm-${user.id}`,
        user_id: user.id,
        user_name: profile.nombreCompleto || user.nombreCompleto || user.email,
        tipo_alerta: 'evaluacion',
        severidad: 'info',
        titulo: 'Evaluación pendiente',
        mensaje: `${profile.nombreCompleto || user.email} es usuario avanzado pero no tiene registros de 1RM actualizados.`,
        created_at: new Date().toISOString(),
      })
    }
    
    // FC Reposo alta
    if (profile?.fcReposo && profile.fcReposo > 80) {
      alerts.push({
        id: `fc-${user.id}`,
        user_id: user.id,
        user_name: profile.nombreCompleto || user.nombreCompleto || user.email,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'FC Reposo elevada',
        mensaje: `${profile.nombreCompleto || user.email} tiene una FC de reposo de ${profile.fcReposo} bpm. Evaluar recuperación.`,
        created_at: new Date().toISOString(),
      })
    }
  })
  
  return NextResponse.json({
    success: true,
    alerts: alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severidad as keyof typeof severityOrder] - severityOrder[b.severidad as keyof typeof severityOrder]
    }),
    total: alerts.length,
  })
}

// ============================================================================
// SUPABASE IMPLEMENTATIONS (fallback not used, kept for reference)
// ============================================================================
async function getOverviewSupabase(supabase: any) {
  const { count: totalUsers } = await supabase
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('aprobado', true)
  
  const { count: totalEvaluations } = await supabase
    .from('evaluaciones')
    .select('*', { count: 'exact', head: true })
  
  const { data: usersData } = await supabase
    .from('usuarios')
    .select('objetivo, nivel_experiencia, imc, genero')
    .eq('aprobado', true)
  
  const objectivesDistribution: Record<string, number> = {}
  const levelsDistribution: Record<string, number> = {}
  const genderDistribution: Record<string, number> = {}
  let totalIMC = 0
  let usersWithIMC = 0
  
  usersData?.forEach((u: any) => {
    const obj = u.objetivo || 'sin_definir'
    objectivesDistribution[obj] = (objectivesDistribution[obj] || 0) + 1
    
    const level = u.nivel_experiencia || 'sin_definir'
    levelsDistribution[level] = (levelsDistribution[level] || 0) + 1
    
    const gender = u.genero || 'sin_definir'
    genderDistribution[gender] = (genderDistribution[gender] || 0) + 1
    
    if (u.imc) {
      totalIMC += u.imc
      usersWithIMC++
    }
  })
  
  const { data: vdotData } = await supabase
    .from('evaluaciones')
    .select('vdot, user_id')
    .not('vdot', 'is', null)
  
  const latestVdotByUser: Record<string, number> = {}
  vdotData?.forEach((v: any) => {
    if (!latestVdotByUser[v.user_id]) {
      latestVdotByUser[v.user_id] = v.vdot
    }
  })
  
  const vdotValues = Object.values(latestVdotByUser)
  const avgVdot = vdotValues.length > 0
    ? vdotValues.reduce((a: number, b: number) => a + b, 0) / vdotValues.length
    : null
  
  const { data: rmData } = await supabase
    .from('usuarios')
    .select('rm_bench_press, rm_squat, rm_deadlift, rm_overhead_press, rm_barbell_row')
    .eq('aprobado', true)
  
  let totalRM = 0
  let usersWithRM = 0
  rmData?.forEach((u: any) => {
    const userRM = (u.rm_bench_press || 0) + (u.rm_squat || 0) + 
                   (u.rm_deadlift || 0) + (u.rm_overhead_press || 0) + 
                   (u.rm_barbell_row || 0)
    if (userRM > 0) {
      totalRM += userRM
      usersWithRM++
    }
  })
  
  const avgRM = usersWithRM > 0 ? totalRM / usersWithRM : null
  
  return NextResponse.json({
    success: true,
    overview: {
      totalUsers: totalUsers || 0,
      totalEvaluations: totalEvaluations || 0,
      avgIMC: usersWithIMC > 0 ? (totalIMC / usersWithIMC).toFixed(1) : null,
      avgVDOT: avgVdot ? avgVdot.toFixed(1) : null,
      avgRMTotal: avgRM ? Math.round(avgRM) : null,
      objectivesDistribution,
      levelsDistribution,
      genderDistribution,
    }
  })
}

async function getUsersListSupabase(supabase: any) {
  const { data: users, error } = await supabase
    .from('usuarios')
    .select(`
      id, email, nombre_completo, rol, aprobado, created_at,
      genero, fecha_nacimiento, altura_cm, peso_kg, imc,
      fc_maxima, fc_reposo, nivel_experiencia, objetivo, disciplina,
      rm_bench_press, rm_squat, rm_deadlift, rm_overhead_press, rm_barbell_row
    `)
    .eq('aprobado', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  const userIds = users?.map((u: any) => u.id) || []
  const { data: evalsCount } = await supabase
    .from('evaluaciones')
    .select('user_id')
    .in('user_id', userIds)
  
  const evalsByUser: Record<string, number> = {}
  evalsCount?.forEach((e: any) => {
    evalsByUser[e.user_id] = (evalsByUser[e.user_id] || 0) + 1
  })
  
  const usersWithMetrics = users?.map((user: any) => {
    const rmTotal = (user.rm_bench_press || 0) + (user.rm_squat || 0) + 
                    (user.rm_deadlift || 0) + (user.rm_overhead_press || 0) + 
                    (user.rm_barbell_row || 0)
    
    let edad = null
    if (user.fecha_nacimiento) {
      const birth = new Date(user.fecha_nacimiento)
      const today = new Date()
      edad = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }
    
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre_completo,
      rol: user.rol,
      activo: user.aprobado,
      creado: user.created_at,
      genero: user.genero,
      edad,
      altura: user.altura_cm,
      peso: user.peso_kg,
      imc: user.imc,
      fcMax: user.fc_maxima,
      fcReposo: user.fc_reposo,
      nivelExperiencia: user.nivel_experiencia,
      objetivo: user.objetivo,
      disciplina: user.disciplina,
      rmBench: user.rm_bench_press,
      rmSquat: user.rm_squat,
      rmDeadlift: user.rm_deadlift,
      rmOverhead: user.rm_overhead_press,
      rmRow: user.rm_barbell_row,
      rmTotal,
      totalEvaluaciones: evalsByUser[user.id] || 0,
    }
  }) || []
  
  return NextResponse.json({
    success: true,
    users: usersWithMetrics,
    total: usersWithMetrics.length,
  })
}

async function getUserDetailSupabase(supabase: any, userId: string | null) {
  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }
  
  const { data: user } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single()
  
  const { data: evaluations } = await supabase
    .from('evaluaciones')
    .select('*')
    .eq('user_id', userId)
    .order('fecha_evaluacion', { ascending: false })
    .limit(20)
  
  const rmTotal = (user?.rm_bench_press || 0) + (user?.rm_squat || 0) + 
                  (user?.rm_deadlift || 0) + (user?.rm_overhead_press || 0) + 
                  (user?.rm_barbell_row || 0)
  
  const stats = {
    totalEvaluations: evaluations?.length || 0,
    maxVDOT: evaluations?.filter((e: any) => e.vdot).sort((a: any, b: any) => b.vdot - a.vdot)[0]?.vdot || null,
    avgVDOT: evaluations?.filter((e: any) => e.vdot).length > 0
      ? evaluations.filter((e: any) => e.vdot).reduce((sum: number, e: any) => sum + e.vdot, 0) / evaluations.filter((e: any) => e.vdot).length
      : null,
    maxStrength: evaluations?.filter((e: any) => e.fuerza_maxima_kg).sort((a: any, b: any) => b.fuerza_maxima_kg - a.fuerza_maxima_kg)[0]?.fuerza_maxima_kg || null,
    rmTotal,
  }
  
  return NextResponse.json({
    success: true,
    user,
    evaluations: evaluations || [],
    stats,
  })
}

async function getComparisonsSupabase(supabase: any) {
  const { data: users } = await supabase
    .from('usuarios')
    .select(`
      id, nombre_completo, email, rol, genero,
      fecha_nacimiento, altura_cm, peso_kg, imc,
      fc_maxima, fc_reposo, nivel_experiencia, objetivo, disciplina,
      rm_bench_press, rm_squat, rm_deadlift, rm_overhead_press, rm_barbell_row
    `)
    .eq('aprobado', true)
  
  const { data: vdotData } = await supabase
    .from('evaluaciones')
    .select('user_id, vdot, fecha_evaluacion')
    .not('vdot', 'is', null)
    .order('fecha_evaluacion', { ascending: false })
  
  const latestVdotByUser: Record<string, { vdot: number, fecha: string }> = {}
  vdotData?.forEach((v: any) => {
    if (!latestVdotByUser[v.user_id]) {
      latestVdotByUser[v.user_id] = { vdot: v.vdot, fecha: v.fecha_evaluacion }
    }
  })
  
  const { data: evalsCount } = await supabase
    .from('evaluaciones')
    .select('user_id')
  
  const evalsByUser: Record<string, number> = {}
  evalsCount?.forEach((e: any) => {
    evalsByUser[e.user_id] = (evalsByUser[e.user_id] || 0) + 1
  })
  
  const processedUsers = users?.map((user: any) => {
    const rmTotal = (user.rm_bench_press || 0) + (user.rm_squat || 0) + 
                    (user.rm_deadlift || 0) + (user.rm_overhead_press || 0) + 
                    (user.rm_barbell_row || 0)
    
    let edad = null
    if (user.fecha_nacimiento) {
      const birth = new Date(user.fecha_nacimiento)
      const today = new Date()
      edad = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }
    
    let wilksScore = null
    if (rmTotal > 0 && user.peso_kg) {
      const coef = user.genero === 'masculino' ? 0.7 : 0.78
      wilksScore = rmTotal * coef / user.peso_kg
    }
    
    return {
      userId: user.id,
      nombre: user.nombre_completo,
      email: user.email,
      rol: user.rol,
      genero: user.genero,
      edad,
      altura: user.altura_cm,
      peso: user.peso_kg,
      imc: user.imc,
      fcMax: user.fc_maxima,
      fcReposo: user.fc_reposo,
      nivel: user.nivel_experiencia,
      objetivo: user.objetivo,
      disciplina: user.disciplina,
      rm: {
        bench: user.rm_bench_press || 0,
        squat: user.rm_squat || 0,
        deadlift: user.rm_deadlift || 0,
        overhead: user.rm_overhead_press || 0,
        row: user.rm_barbell_row || 0,
        total: rmTotal,
      },
      wilksScore,
      vdot: latestVdotByUser[user.id]?.vdot || null,
      vdotFecha: latestVdotByUser[user.id]?.fecha || null,
      totalEvaluaciones: evalsByUser[user.id] || 0,
    }
  }) || []
  
  const rankings = {
    byStrength: [...processedUsers]
      .filter(u => u.rm.total > 0)
      .sort((a, b) => b.rm.total - a.rm.total)
      .slice(0, 10),
    
    byRelativeStrength: [...processedUsers]
      .filter(u => u.wilksScore && u.wilksScore > 0)
      .sort((a, b) => (b.wilksScore || 0) - (a.wilksScore || 0))
      .slice(0, 10),
    
    byVDOT: [...processedUsers]
      .filter(u => u.vdot && u.vdot > 0)
      .sort((a, b) => (b.vdot || 0) - (a.vdot || 0))
      .slice(0, 10),
    
    byBench: [...processedUsers]
      .filter(u => u.rm.bench > 0)
      .sort((a, b) => b.rm.bench - a.rm.bench)
      .slice(0, 10),
    
    bySquat: [...processedUsers]
      .filter(u => u.rm.squat > 0)
      .sort((a, b) => b.rm.squat - a.rm.squat)
      .slice(0, 10),
    
    byDeadlift: [...processedUsers]
      .filter(u => u.rm.deadlift > 0)
      .sort((a, b) => b.rm.deadlift - a.rm.deadlift)
      .slice(0, 10),
    
    byEvaluations: [...processedUsers]
      .filter(u => u.totalEvaluaciones > 0)
      .sort((a, b) => b.totalEvaluaciones - a.totalEvaluaciones)
      .slice(0, 10),
    
    byFCReposo: [...processedUsers]
      .filter(u => u.fcReposo && u.fcReposo > 0)
      .sort((a, b) => (a.fcReposo || 0) - (b.fcReposo || 0))
      .slice(0, 10),
  }
  
  const stats = {
    totalUsers: processedUsers.length,
    avgRM: processedUsers.filter(u => u.rm.total > 0).length > 0
      ? Math.round(processedUsers.filter(u => u.rm.total > 0).reduce((sum, u) => sum + u.rm.total, 0) / processedUsers.filter(u => u.rm.total > 0).length)
      : 0,
    avgVDOT: processedUsers.filter(u => u.vdot).length > 0
      ? (processedUsers.filter(u => u.vdot).reduce((sum, u) => sum + (u.vdot || 0), 0) / processedUsers.filter(u => u.vdot).length).toFixed(1)
      : null,
    avgIMC: processedUsers.filter(u => u.imc).length > 0
      ? (processedUsers.filter(u => u.imc).reduce((sum, u) => sum + (u.imc || 0), 0) / processedUsers.filter(u => u.imc).length).toFixed(1)
      : null,
    avgAge: processedUsers.filter(u => u.edad).length > 0
      ? Math.round(processedUsers.filter(u => u.edad).reduce((sum, u) => sum + (u.edad || 0), 0) / processedUsers.filter(u => u.edad).length)
      : null,
    totalEvaluations: evalsCount?.length || 0,
  }
  
  return NextResponse.json({
    success: true,
    users: processedUsers,
    rankings,
    stats,
  })
}

async function getAlertsSupabase(supabase: any) {
  const alerts: any[] = []
  
  const { data: users } = await supabase
    .from('usuarios')
    .select('id, nombre_completo, imc, fc_reposo, nivel_experiencia, objetivo, rm_bench_press')
    .eq('aprobado', true)
  
  users?.forEach((user: any) => {
    if (user.imc && user.imc > 30) {
      alerts.push({
        id: `imc-${user.id}`,
        user_id: user.id,
        user_name: user.nombre_completo,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'IMC elevado',
        mensaje: `${user.nombre_completo} tiene un IMC de ${user.imc.toFixed(1)}. Considera orientación nutricional.`,
        created_at: new Date().toISOString(),
      })
    }
    
    if (user.nivel_experiencia === 'avanzado' && !user.rm_bench_press) {
      alerts.push({
        id: `rm-${user.id}`,
        user_id: user.id,
        user_name: user.nombre_completo,
        tipo_alerta: 'evaluacion',
        severidad: 'info',
        titulo: 'Evaluación pendiente',
        mensaje: `${user.nombre_completo} es usuario avanzado pero no tiene registros de 1RM actualizados.`,
        created_at: new Date().toISOString(),
      })
    }
    
    if (user.fc_reposo && user.fc_reposo > 80) {
      alerts.push({
        id: `fc-${user.id}`,
        user_id: user.id,
        user_name: user.nombre_completo,
        tipo_alerta: 'salud',
        severidad: 'warning',
        titulo: 'FC Reposo elevada',
        mensaje: `${user.nombre_completo} tiene una FC de reposo de ${user.fc_reposo} bpm. Evaluar recuperación.`,
        created_at: new Date().toISOString(),
      })
    }
  })
  
  return NextResponse.json({
    success: true,
    alerts: alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severidad as keyof typeof severityOrder] - severityOrder[b.severidad as keyof typeof severityOrder]
    }),
    total: alerts.length,
  })
}
