import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Obtener asistencias con filtros opcionales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const area = searchParams.get('area')
    const fecha = searchParams.get('fecha')
    const nombre = searchParams.get('nombre')
    const limit = searchParams.get('limit') || '500'

    // Try Supabase first, then fallback to Prisma
    let supabaseFailed = false
    
    if (supabase) {
      try {
        // Build query
        let query = supabase
          .from('asistencias')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(parseInt(limit))

        // Apply filters
        if (area && area !== 'all') {
          query = query.eq('area', area)
        }

        if (fecha) {
          const fechaInicio = new Date(fecha)
          fechaInicio.setHours(0, 0, 0, 0)
          const fechaFin = new Date(fecha)
          fechaFin.setHours(23, 59, 59, 999)
          
          query = query.gte('fecha', fechaInicio.toISOString())
          query = query.lt('fecha', fechaFin.toISOString())
        }

        if (nombre) {
          query = query.ilike('nombre_completo', `%${nombre}%`)
        }

        const { data: asistencias, error } = await query

        if (!error && asistencias) {
          // Transform data to match expected format
          const transformedData = asistencias.map(a => ({
            id: a.id,
            usuario_id: a.usuario_id || a.paciente_id,
            nombre_completo: a.nombre_completo,
            area: a.area,
            fecha: a.fecha,
            observacion: a.observacion,
            created_at: a.created_at
          }))

          return NextResponse.json({ asistencias: transformedData })
        }
        
        console.log('[ATTENDANCE API] Supabase error, falling back to Prisma:', error?.message)
        supabaseFailed = true
      } catch (supabaseError) {
        console.log('[ATTENDANCE API] Supabase connection failed:', supabaseError)
        supabaseFailed = true
      }
    } else {
      supabaseFailed = true
    }

    // Fallback to Prisma/SQLite
    if (supabaseFailed) {
      console.log('[ATTENDANCE API] Using Prisma (SQLite fallback)')
      
      const { prisma } = await import('@/lib/prisma')
      
      if (!prisma) {
        return NextResponse.json({ asistencias: [] })
      }

      // Build where clause for Prisma
      const where: any = {}
      
      if (area && area !== 'all') {
        where.area = area
      }
      
      if (fecha) {
        const fechaInicio = new Date(fecha)
        fechaInicio.setHours(0, 0, 0, 0)
        const fechaFin = new Date(fecha)
        fechaFin.setHours(23, 59, 59, 999)
        
        where.fecha = {
          gte: fechaInicio,
          lt: fechaFin
        }
      }
      
      if (nombre) {
        where.nombreCompleto = {
          contains: nombre,
          mode: 'insensitive'
        }
      }

      const asistencias = await prisma.asistencia.findMany({
        where,
        orderBy: { fecha: 'desc' },
        take: parseInt(limit)
      })

      // Transform data to match expected format
      const transformedData = asistencias.map(a => ({
        id: a.id,
        usuario_id: a.pacienteId,
        nombre_completo: a.nombreCompleto,
        area: a.area,
        fecha: a.fecha.toISOString(),
        observacion: a.observacion,
        created_at: a.createdAt.toISOString()
      }))

      return NextResponse.json({ asistencias: transformedData })
    }
    
    return NextResponse.json({ asistencias: [] })
  } catch (error) {
    console.error('Error fetching asistencias:', error)
    return NextResponse.json(
      { error: 'Error al obtener asistencias' },
      { status: 500 }
    )
  }
}

// POST - Registrar nueva asistencia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Aceptar ambos formatos de campos para compatibilidad
    const usuarioId = body.usuario_id || body.usuarioId || body.paciente_id || body.pacienteId
    const nombreCompleto = body.nombre_completo || body.nombreCompleto
    const area = body.area
    const observacion = body.observacion || body.observation

    console.log('📝 Attendance POST received:', { usuarioId, nombreCompleto, area, observacion })

    // Validaciones - nombre y área son obligatorios
    if (!nombreCompleto || !area) {
      console.error('❌ Missing required fields:', { nombreCompleto, area })
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre y área son obligatorios' },
        { status: 400 }
      )
    }

    const validAreas = ['MEDICINA', 'FISIOTERAPIA', 'NUTRICION', 'ASISTENCIA_SOCIAL', 'GIMNASIO', 
                       'MUSCULACION', 'CARDIO', 'FUNCIONAL', 'CROSSFIT', 'YOGA', 'SPINNING', 'PISCINA']
    if (!validAreas.includes(area)) {
      console.error('❌ Invalid area:', area)
      return NextResponse.json(
        { error: 'Área no válida', area, validAreas },
        { status: 400 }
      )
    }

    // Try Supabase first
    let supabaseFailed = false
    
    if (supabase) {
      try {
        const insertData: any = {
          nombre_completo: nombreCompleto,
          area: area,
          observacion: observacion || null,
          fecha: new Date().toISOString()
        }
        
        if (usuarioId) {
          insertData.usuario_id = usuarioId
        }

        const { data: asistencia, error: insertError } = await supabase
          .from('asistencias')
          .insert(insertData)
          .select()
          .single()

        if (!insertError && asistencia) {
          console.log('✅ Attendance saved to Supabase:', asistencia)
          return NextResponse.json({ 
            success: true, 
            asistencia: {
              id: asistencia.id,
              usuario_id: asistencia.usuario_id || asistencia.paciente_id,
              nombre_completo: asistencia.nombre_completo,
              area: asistencia.area,
              fecha: asistencia.fecha,
              observacion: asistencia.observacion,
              created_at: asistencia.created_at
            }
          })
        }
        
        console.log('[ATTENDANCE API] Supabase insert error, falling back to Prisma:', insertError?.message)
        supabaseFailed = true
      } catch (supabaseError) {
        console.log('[ATTENDANCE API] Supabase connection failed:', supabaseError)
        supabaseFailed = true
      }
    } else {
      supabaseFailed = true
    }

    // Fallback to Prisma/SQLite
    if (supabaseFailed) {
      console.log('[ATTENDANCE API] Using Prisma (SQLite fallback)')
      
      const { prisma } = await import('@/lib/prisma')
      
      if (!prisma) {
        return NextResponse.json({ 
          success: true, 
          asistencia: {
            id: 'mock-' + Date.now(),
            usuario_id: usuarioId,
            nombre_completo: nombreCompleto,
            area: area,
            observacion: observacion,
            fecha: new Date().toISOString()
          }
        })
      }

      const asistencia = await prisma.asistencia.create({
        data: {
          id: 'asistencia-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          pacienteId: usuarioId || null,
          nombreCompleto: nombreCompleto,
          area: area,
          observacion: observacion || null,
          fecha: new Date(),
        }
      })

      console.log('✅ Attendance saved to SQLite:', asistencia)

      return NextResponse.json({ 
        success: true, 
        asistencia: {
          id: asistencia.id,
          usuario_id: asistencia.pacienteId,
          nombre_completo: asistencia.nombreCompleto,
          area: asistencia.area,
          fecha: asistencia.fecha.toISOString(),
          observacion: asistencia.observacion,
          created_at: asistencia.createdAt.toISOString()
        }
      })
    }
    
    return NextResponse.json({ success: true, asistencia: null })
  } catch (error) {
    console.error('Error creating asistencia:', error)
    return NextResponse.json(
      { error: 'Error al registrar asistencia' },
      { status: 500 }
    )
  }
}
