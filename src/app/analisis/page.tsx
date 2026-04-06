'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Importar dashboard de forma dinámica para evitar problemas de SSR
const IsometricStrengthDashboard = dynamic(
  () => import('@/components/strength/IsometricStrengthDashboard'),
  { ssr: false }
)

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  id: string
  email: string
  name: string
  rol: string
}

type AnalisisCategory = 'fuerza' | 'resistencia' | 'velocidad' | 'flexibilidad' | 'potencia'

interface MetricCard {
  id: string
  label: string
  value: number
  unit: string
  change?: number
  trend?: 'up' | 'down' | 'stable'
  color: string
}

interface EvaluationHistory {
  id: string
  date: string
  type: AnalisisCategory
  summary: string
  metrics: Record<string, number>
}

// Datos de análisis desde la API
interface AnalysisData {
  fuerza: {
    totalEvaluations: number
    avgFmax: number | null
    maxFmax: number | null
    avgRfd: number | null
    avgSymmetry: number | null
    lastEvaluation: string | null
    musclesEvaluated: number
    progress: { date: string; value: number }[]
  }
  resistencia: {
    totalEvaluations: number
    avgVdot: number | null
    maxVdot: number | null
    avgFcReposo: number | null
    avgFcMaxima: number | null
    lastEvaluation: string | null
    progress: { date: string; value: number }[]
  }
  musculos: {
    id: string
    nombre: string
    fuerza: { R: number; L: number }
    evaluaciones: number
    ultimoTest: string | null
  }[]
  perfil: {
    id: string
    nombre: string
    email: string
    rol: string
    genero: string
    edad: number | null
    altura: number | null
    peso: number | null
    imc: number | null
    fcMaxima: number | null
    fcReposo: number | null
    nivelExperiencia: string | null
    objetivo: string | null
    rm: {
      bench: number | null
      squat: number | null
      deadlift: number | null
      overhead: number | null
      row: number | null
      total: number
    }
  } | null
  historial: EvaluationHistory[]
}

// ============================================================================
// ICON COMPONENT
// ============================================================================

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// CONFIGURACIÓN DE CATEGORÍAS
// ============================================================================

const CATEGORIES: Record<AnalisisCategory, {
  name: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  fuerza: {
    name: 'Fuerza',
    icon: 'fitness_center',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'Análisis de fuerza isométrica, dinámica y potencia muscular'
  },
  resistencia: {
    name: 'Resistencia',
    icon: 'favorite',
    color: '#ec4899',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    description: 'Capacidad cardiovascular y resistencia aeróbica/anaeróbica'
  },
  velocidad: {
    name: 'Velocidad',
    icon: 'bolt',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Velocidad de desplazamiento, reacción y aceleración'
  },
  flexibilidad: {
    name: 'Flexibilidad',
    icon: 'self_improvement',
    color: '#8b5cf6',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    description: 'Rango de movimiento, movilidad articular y elasticidad'
  },
  potencia: {
    name: 'Potencia',
    icon: 'flash_on',
    color: '#00f0ff',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    description: 'Potencia explosiva, salto y fuerza explosiva'
  }
}

// ============================================================================
// COMPONENTE DE MÉTRICAS RESUMEN
// ============================================================================

function MetricSummaryCard({ metric }: { metric: MetricCard }) {
  const trendIcon = metric.trend === 'up' ? 'trending_up' : metric.trend === 'down' ? 'trending_down' : 'trending_flat'
  const trendColor = metric.trend === 'up' ? 'text-[#13ec6d]' : metric.trend === 'down' ? 'text-red-400' : 'text-slate-400'
  
  return (
    <div className="bg-[#193324] rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 uppercase font-bold">{metric.label}</span>
        {metric.trend && (
          <Icon name={trendIcon} className={`text-sm ${trendColor}`} />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color: metric.color }}>
          {metric.value ?? '--'}
        </span>
        <span className="text-xs text-slate-400">{metric.unit}</span>
      </div>
      {metric.change !== undefined && (
        <div className={`text-[10px] mt-1 ${metric.change >= 0 ? 'text-[#13ec6d]' : 'text-red-400'}`}>
          {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}% vs. anterior
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENTE DE HISTORIAL COLAPSABLE (POPUP STYLE)
// ============================================================================

function HistoryPopup({ history }: { history: EvaluationHistory[] }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 ${
          isOpen 
            ? 'bg-[#193324] border border-[#f59e0b]/30' 
            : 'bg-gradient-to-r from-[#f59e0b] to-[#ec4899] hover:scale-105'
        }`}
      >
        <Icon 
          name={isOpen ? 'close' : 'history'} 
          className={isOpen ? 'text-[#f59e0b]' : 'text-white'} 
        />
        <span className={`text-sm font-bold ${isOpen ? 'text-white' : 'text-white'}`}>
          {isOpen ? 'Cerrar' : `Historial (${history.length})`}
        </span>
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-20 right-6 z-40 w-80 max-h-[60vh] bg-[#102218] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#f59e0b]/20 to-[#ec4899]/20 p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center">
                <Icon name="history" className="text-[#f59e0b]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Historial de Evaluaciones</h3>
                <p className="text-[10px] text-slate-400">{history.length} evaluaciones registradas</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 overflow-y-auto max-h-[calc(60vh-80px)]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Icon name="history" className="text-4xl mb-2 opacity-50" />
                <p className="text-sm">No hay evaluaciones</p>
                <p className="text-[10px] mt-1">Realiza tu primera evaluación</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    className="bg-[#193324] rounded-xl p-3 border border-white/10 hover:border-[#f59e0b]/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${CATEGORIES[item.type]?.color || '#888'}20` }}
                      >
                        <Icon name={CATEGORIES[item.type]?.icon || 'assessment'} className="text-sm" style={{ color: CATEGORIES[item.type]?.color || '#888' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{CATEGORIES[item.type]?.name || 'Evaluación'}</span>
                          <span className="text-[10px] text-slate-400">{item.date ? formatDate(item.date) : ''}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{item.summary || 'Sin descripción'}</p>
                      </div>
                    </div>
                    {item.metrics && Object.keys(item.metrics).length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-10">
                        {Object.entries(item.metrics).slice(0, 3).map(([key, value]) => (
                          <span key={key} className="text-[9px] bg-white/5 px-2 py-0.5 rounded-full text-slate-300">
                            {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE FUERZA (CON DATOS REALES)
// ============================================================================

function FuerzaAnalysisPanel({ userId, data }: { userId: string; data: AnalysisData['fuerza'] | null }) {
  const [indiceGlobal, setIndiceGlobal] = useState<any>(null)

  const handleIndiceChange = useCallback((indice: any) => {
    setIndiceGlobal(indice)
  }, [])

  // Calcular métricas desde datos reales
  const metrics: MetricCard[] = useMemo(() => {
    if (!data) {
      return [
        { id: 'fmax', label: 'Fuerza Máx. Promedio', value: 0, unit: 'kg', color: '#ef4444' },
        { id: 'simetria', label: 'Simetría General', value: 0, unit: '%', color: '#13ec6d' },
        { id: 'rfd', label: 'RFD Promedio', value: 0, unit: 'kg/s', color: '#00f0ff' },
        { id: 'evaluaciones', label: 'Evaluaciones', value: 0, unit: 'total', color: '#8b5cf6' },
      ]
    }

    // Calcular tendencia basada en el progreso
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (data.progress && data.progress.length >= 2) {
      const lastTwo = data.progress.slice(-2)
      if (lastTwo[1].value > lastTwo[0].value) trend = 'up'
      else if (lastTwo[1].value < lastTwo[0].value) trend = 'down'
    }

    return [
      { 
        id: 'fmax', 
        label: 'Fuerza Máx. Promedio', 
        value: data.avgFmax ?? 0, 
        unit: 'kg', 
        trend: trend,
        color: '#ef4444' 
      },
      { 
        id: 'simetria', 
        label: 'Simetría General', 
        value: data.avgSymmetry ?? 100, 
        unit: '%', 
        color: '#13ec6d' 
      },
      { 
        id: 'rfd', 
        label: 'RFD Promedio', 
        value: data.avgRfd ?? 0, 
        unit: 'kg/s', 
        color: '#00f0ff' 
      },
      { 
        id: 'evaluaciones', 
        label: 'Evaluaciones', 
        value: data.totalEvaluations ?? 0, 
        unit: 'total', 
        color: '#8b5cf6' 
      },
    ]
  }, [data])

  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(metric => (
          <MetricSummaryCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Dashboard de Fuerza Isométrica */}
      <div className="bg-[#102218] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="monitoring" className="text-[#ef4444]" />
          Evaluación de Fuerza Isométrica
        </h3>
        <IsometricStrengthDashboard
          userId={userId}
          onIndiceChange={handleIndiceChange}
        />
      </div>

      {/* Comparación con Normativos */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="leaderboard" className="text-[#f59e0b]" />
          Comparación con Valores Normativos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[#102218] rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase mb-1">Población General</p>
            <p className="text-3xl font-bold text-[#13ec6d]">75%</p>
            <p className="text-[10px] text-slate-400">Percentil 75</p>
          </div>
          <div className="text-center p-4 bg-[#102218] rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase mb-1">Deportistas Amateur</p>
            <p className="text-3xl font-bold text-[#f59e0b]">45%</p>
            <p className="text-[10px] text-slate-400">Percentil 45</p>
          </div>
          <div className="text-center p-4 bg-[#102218] rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase mb-1">Atletas de Élite</p>
            <p className="text-3xl font-bold text-[#ef4444]">20%</p>
            <p className="text-[10px] text-slate-400">Percentil 20</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE RESISTENCIA (CON DATOS REALES)
// ============================================================================

function ResistenciaAnalysisPanel({ data }: { data: AnalysisData['resistencia'] | null }) {
  // Calcular zonas de FC basadas en datos reales
  const fcMax = data?.avgFcMaxima || 190
  const fcReposo = data?.avgFcReposo || 60

  const metrics: MetricCard[] = useMemo(() => {
    if (!data) {
      return [
        { id: 'vo2max', label: 'VO2max Estimado', value: 0, unit: 'ml/kg/min', color: '#ec4899' },
        { id: 'umbral', label: 'Umbral Anaeróbico', value: 0, unit: 'bpm', color: '#f59e0b' },
        { id: 'recuperacion', label: 'FC Recuperación', value: 0, unit: 'bpm', color: '#13ec6d' },
        { id: 'endurance', label: 'Resistencia Muscular', value: 0, unit: '%', color: '#00f0ff' },
      ]
    }

    let vdotTrend: 'up' | 'down' | 'stable' = 'stable'
    if (data.progress && data.progress.length >= 2) {
      const lastTwo = data.progress.slice(-2)
      if (lastTwo[1].value > lastTwo[0].value) vdotTrend = 'up'
      else if (lastTwo[1].value < lastTwo[0].value) vdotTrend = 'down'
    }

    return [
      { 
        id: 'vo2max', 
        label: 'VO2max Estimado', 
        value: data.avgVdot ?? 0, 
        unit: 'ml/kg/min', 
        trend: vdotTrend,
        color: '#ec4899' 
      },
      { 
        id: 'umbral', 
        label: 'Umbral Anaeróbico', 
        value: Math.round(fcMax * 0.85), 
        unit: 'bpm', 
        color: '#f59e0b' 
      },
      { 
        id: 'recuperacion', 
        label: 'FC Recuperación', 
        value: fcReposo, 
        unit: 'bpm', 
        trend: fcReposo < 65 ? 'up' : fcReposo > 75 ? 'down' : 'stable',
        color: '#13ec6d' 
      },
      { 
        id: 'endurance', 
        label: 'Evaluaciones', 
        value: data.totalEvaluations ?? 0, 
        unit: 'total', 
        color: '#00f0ff' 
      },
    ]
  }, [data, fcMax, fcReposo])

  // Zonas de entrenamiento calculadas
  const zonas = [
    { zone: 'Z1 - Recuperación', range: `${Math.round(fcMax * 0.5)}-${Math.round(fcMax * 0.6)} bpm`, color: '#60a5fa', pct: 15 },
    { zone: 'Z2 - Aeróbico Base', range: `${Math.round(fcMax * 0.6)}-${Math.round(fcMax * 0.7)} bpm`, color: '#34d399', pct: 40 },
    { zone: 'Z3 - Tempo', range: `${Math.round(fcMax * 0.7)}-${Math.round(fcMax * 0.8)} bpm`, color: '#fbbf24', pct: 25 },
    { zone: 'Z4 - Umbral', range: `${Math.round(fcMax * 0.8)}-${Math.round(fcMax * 0.9)} bpm`, color: '#fb923c', pct: 15 },
    { zone: 'Z5 - VO2max', range: `${Math.round(fcMax * 0.9)}-${fcMax} bpm`, color: '#ef4444', pct: 5 },
  ]

  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(metric => (
          <MetricSummaryCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Zonas de Entrenamiento */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="favorite" className="text-[#ec4899]" />
          Zonas de Frecuencia Cardíaca
        </h3>
        <div className="space-y-3">
          {zonas.map((z, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{z.zone}</span>
                  <span className="text-[10px] text-slate-400">{z.range}</span>
                </div>
                <div className="h-2 bg-[#102218] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${z.pct}%`, backgroundColor: z.color }}
                  />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 w-12 text-right">{z.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progreso VDOT */}
      {data?.progress && data.progress.length > 0 && (
        <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="trending_up" className="text-[#13ec6d]" />
            Evolución del VO2max
          </h3>
          <div className="space-y-2">
            {data.progress.slice(-5).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{new Date(p.date).toLocaleDateString('es-ES')}</span>
                <span className="text-[#ec4899] font-bold">{p.value.toFixed(1)} ml/kg/min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sin datos */}
      {(!data || data.totalEvaluations === 0) && (
        <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <Icon name="show_chart" className="text-4xl mb-2 opacity-50" />
              <p className="text-sm">Sin datos de resistencia</p>
              <p className="text-xs mt-1">Realiza evaluaciones de VDOT para ver tu progreso</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE VELOCIDAD
// ============================================================================

function VelocidadAnalysisPanel({ perfil }: { perfil: AnalysisData['perfil'] }) {
  // Usar RM del perfil para estimar velocidad
  const rm = perfil?.rm?.total || 0
  
  const metrics: MetricCard[] = [
    { id: 'vel_max', label: 'Velocidad Máx. Est.', value: rm > 0 ? 28 + (rm / 100) : 0, unit: 'km/h', color: '#f59e0b' },
    { id: 'aceleracion', label: 'Aceleración Est.', value: rm > 0 ? 1.9 - (rm / 1000) : 0, unit: 's', color: '#00f0ff' },
    { id: 'reaccion', label: 'Tiempo Reacción Est.', value: 0.25, unit: 's', color: '#13ec6d' },
    { id: 'cadencia', label: 'Cadencia Est.', value: 175, unit: 'pasos/min', color: '#8b5cf6' },
  ]

  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(metric => (
          <MetricSummaryCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Info */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="bolt" className="text-[#f59e0b]" />
          Tests de Velocidad
        </h3>
        <div className="flex items-center justify-center h-32 text-slate-400">
          <div className="text-center">
            <Icon name="speed" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Tests de velocidad próximamente</p>
            <p className="text-xs mt-1">Los valores mostrados son estimaciones</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE FLEXIBILIDAD
// ============================================================================

function FlexibilidadAnalysisPanel() {
  const metrics: MetricCard[] = [
    { id: 'sit_reach', label: 'Sit & Reach Est.', value: 15, unit: 'cm', color: '#8b5cf6' },
    { id: 'rom_hombro', label: 'ROM Hombro Est.', value: 170, unit: '°', color: '#ec4899' },
    { id: 'rom_cadera', label: 'ROM Cadera Est.', value: 105, unit: '°', color: '#13ec6d' },
    { id: 'movilidad', label: 'Movilidad General', value: 70, unit: '%', color: '#00f0ff' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(metric => (
          <MetricSummaryCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="accessibility_new" className="text-[#8b5cf6]" />
          Evaluaciones de Flexibilidad
        </h3>
        <div className="flex items-center justify-center h-32 text-slate-400">
          <div className="text-center">
            <Icon name="self_improvement" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Tests de flexibilidad próximamente</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE POTENCIA
// ============================================================================

function PotenciaAnalysisPanel({ perfil }: { perfil: AnalysisData['perfil'] }) {
  const rm = perfil?.rm?.total || 0
  const peso = perfil?.peso || 70
  
  // Estimaciones basadas en RM
  const cmjEstimate = rm > 0 ? 35 + (rm / 20) : 35
  const powerEstimate = rm > 0 ? rm * peso * 0.5 : 3000

  const metrics: MetricCard[] = [
    { id: 'cmj', label: 'Salto Vertical Est.', value: cmjEstimate, unit: 'cm', color: '#00f0ff' },
    { id: 'sj', label: 'Squat Jump Est.', value: cmjEstimate * 0.9, unit: 'cm', color: '#f59e0b' },
    { id: 'potencia_pico', label: 'Potencia Pico Est.', value: powerEstimate, unit: 'W', color: '#ef4444' },
    { id: 'rsi', label: 'RSI Est.', value: 2.5, unit: '', color: '#8b5cf6' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(metric => (
          <MetricSummaryCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="vertical_align_top" className="text-[#00f0ff]" />
          Tests de Salto y Potencia
        </h3>
        <div className="flex items-center justify-center h-32 text-slate-400">
          <div className="text-center">
            <Icon name="flash_on" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Tests de potencia próximamente</p>
            <p className="text-xs mt-1">Los valores son estimaciones basadas en tus 1RM</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function AnalisisPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [activeCategory, setActiveCategory] = useState<AnalisisCategory>('fuerza')
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)

  // Verificar autenticación
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('biomov_user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        if (!user.id) {
          router.push('/')
          return
        }
        setUserData({
          id: user.id,
          email: user.email,
          name: user.nombre_completo || user.name,
          rol: user.rol || 'paciente'
        })
      } else {
        router.push('/')
        return
      }
    } catch (error) {
      console.error('Error reading user:', error)
      router.push('/')
      return
    }
    setLoading(false)
  }, [router])

  // Cargar datos de análisis desde la API
  useEffect(() => {
    if (!userData?.id) return
    
    const fetchAnalysisData = async () => {
      setLoadingData(true)
      try {
        const response = await fetch(`/api/analisis?userId=${userData.id}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setAnalysisData(result.data)
        }
      } catch (error) {
        console.error('Error loading analysis data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchAnalysisData()
  }, [userData?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#102218] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Icon name="sync" className="text-4xl text-[#13ec6d] animate-spin" />
          <span className="text-slate-400">Cargando análisis...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#102218]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#102218]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Icon name="arrow_back" className="text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Centro de Análisis</h1>
              <p className="text-xs text-slate-400">
                {userData?.name || 'Usuario'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#13ec6d]/10 to-[#00f0ff]/10 rounded-2xl p-4 border border-[#13ec6d]/20 mb-6">
          <div className="flex items-start gap-3">
            <Icon name="analytics" className="text-[#00f0ff] text-xl" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Análisis Integral del Rendimiento
              </h3>
              <p className="text-xs text-slate-400">
                Visualiza tu progreso en fuerza, resistencia, velocidad, flexibilidad y potencia. 
                Los datos se conectan directamente desde tus evaluaciones en Supabase.
              </p>
            </div>
          </div>
        </div>

        {/* Loading indicator for data */}
        {loadingData && (
          <div className="flex items-center justify-center py-4 mb-4">
            <Icon name="sync" className="text-[#13ec6d] animate-spin mr-2" />
            <span className="text-sm text-slate-400">Cargando datos...</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {(Object.keys(CATEGORIES) as AnalisisCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all shrink-0 ${
                activeCategory === cat 
                  ? `${CATEGORIES[cat].bgColor} ${CATEGORIES[cat].borderColor} border`
                  : 'bg-[#193324] border-white/10 hover:border-white/20'
              }`}
            >
              <Icon 
                name={CATEGORIES[cat].icon} 
                className={activeCategory === cat ? '' : 'text-slate-400'}
                style={{ color: activeCategory === cat ? CATEGORIES[cat].color : undefined }}
              />
              <span className={`text-sm font-bold ${activeCategory === cat ? 'text-white' : 'text-slate-400'}`}>
                {CATEGORIES[cat].name}
              </span>
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="bg-[#193324]/50 rounded-2xl p-4 border border-white/10 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${CATEGORIES[activeCategory].color}20` }}
                >
                  <Icon 
                    name={CATEGORIES[activeCategory].icon} 
                    style={{ color: CATEGORIES[activeCategory].color }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{CATEGORIES[activeCategory].name}</h2>
                  <p className="text-xs text-slate-400">{CATEGORIES[activeCategory].description}</p>
                </div>
              </div>

              {/* Dynamic Content */}
              {activeCategory === 'fuerza' && (
                <FuerzaAnalysisPanel 
                  userId={userData?.id || ''} 
                  data={analysisData?.fuerza || null} 
                />
              )}
              {activeCategory === 'resistencia' && (
                <ResistenciaAnalysisPanel data={analysisData?.resistencia || null} />
              )}
              {activeCategory === 'velocidad' && (
                <VelocidadAnalysisPanel perfil={analysisData?.perfil || null} />
              )}
              {activeCategory === 'flexibilidad' && <FlexibilidadAnalysisPanel />}
              {activeCategory === 'potencia' && (
                <PotenciaAnalysisPanel perfil={analysisData?.perfil || null} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-[#193324]/50 rounded-2xl p-4 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="flash_on" className="text-[#00f0ff]" />
                Acciones Rápidas
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/evaluacion/isometrica')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#102218] rounded-xl border border-white/10 hover:border-[#13ec6d]/30 transition-all"
                >
                  <Icon name="add_circle" className="text-[#13ec6d]" />
                  <span className="text-sm text-white font-medium">Nueva Evaluación</span>
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#102218] rounded-xl border border-white/10 hover:border-[#00f0ff]/30 transition-all"
                >
                  <Icon name="download" className="text-[#00f0ff]" />
                  <span className="text-sm text-white font-medium">Exportar Reporte</span>
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#102218] rounded-xl border border-white/10 hover:border-[#f59e0b]/30 transition-all"
                >
                  <Icon name="compare" className="text-[#f59e0b]" />
                  <span className="text-sm text-white font-medium">Comparar Períodos</span>
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="mt-6 bg-[#193324]/50 rounded-2xl p-4 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="analytics" className="text-[#13ec6d]" />
                Resumen de Actividad
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#102218] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#13ec6d]">
                    {analysisData?.fuerza?.totalEvaluations || 0}
                  </p>
                  <p className="text-[10px] text-slate-400">Evaluaciones Fuerza</p>
                </div>
                <div className="bg-[#102218] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#ec4899]">
                    {analysisData?.resistencia?.totalEvaluations || 0}
                  </p>
                  <p className="text-[10px] text-slate-400">Evaluaciones Cardio</p>
                </div>
                <div className="bg-[#102218] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#00f0ff]">
                    {analysisData?.fuerza?.musclesEvaluated || 0}
                  </p>
                  <p className="text-[10px] text-slate-400">Músculos Evaluados</p>
                </div>
                <div className="bg-[#102218] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#f59e0b]">
                    {analysisData?.perfil?.rm?.total || 0}
                  </p>
                  <p className="text-[10px] text-slate-400">RM Total (kg)</p>
                </div>
              </div>
            </div>

            {/* Perfil Info */}
            {analysisData?.perfil && (
              <div className="mt-6 bg-[#193324]/50 rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Icon name="person" className="text-[#8b5cf6]" />
                  Información del Perfil
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nivel:</span>
                    <span className="text-white font-medium">{analysisData.perfil.nivelExperiencia || 'Sin definir'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Objetivo:</span>
                    <span className="text-white font-medium">{analysisData.perfil.objetivo || 'Sin definir'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IMC:</span>
                    <span className="text-white font-medium">{analysisData.perfil.imc?.toFixed(1) || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">FC Reposo:</span>
                    <span className="text-white font-medium">{analysisData.perfil.fcReposo || '--'} bpm</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-[#193324] border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-[#13ec6d]/30 transition-all"
          >
            <Icon name="home" />
            <span className="font-bold">Volver al Inicio</span>
          </button>
        </div>
      </main>

      {/* Floating History Popup */}
      <HistoryPopup history={analysisData?.historial || []} />
    </div>
  )
}
