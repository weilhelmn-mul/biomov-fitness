import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Obtener registros de ROM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('rom_measurements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, measurements: data })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - Guardar nueva medición de ROM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      user_id, 
      joint, 
      side, 
      angle_min, 
      angle_max, 
      range_of_motion, 
      notes 
    } = body

    if (!user_id || !joint) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rom_measurements')
      .insert({
        user_id,
        joint,
        side: side || 'bilateral',
        angle_min: angle_min || 0,
        angle_max: angle_max || 0,
        range_of_motion: range_of_motion || 0,
        notes: notes || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving ROM measurement:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, measurement: data })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
