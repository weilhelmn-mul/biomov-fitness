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
          {metric.value.toFixed(1)}
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
// COMPONENTE DE HISTORIAL
// ============================================================================

function HistoryTimeline({ history }: { history: EvaluationHistory[] }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Icon name="history" className="text-4xl mb-2 opacity-50" />
        <p className="text-sm">No hay evaluaciones registradas</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <div 
          key={item.id} 
          className="bg-[#193324] rounded-xl p-4 border border-white/10 flex items-start gap-3"
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${CATEGORIES[item.type].color}20` }}
          >
            <Icon name={CATEGORIES[item.type].icon} style={{ color: CATEGORIES[item.type].color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white">{CATEGORIES[item.type].name}</span>
              <span className="text-[10px] text-slate-400">{formatDate(item.date)}</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">{item.summary}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.metrics).slice(0, 3).map(([key, value]) => (
                <span key={key} className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-slate-300">
                  {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE FUERZA
// ============================================================================

function FuerzaAnalysisPanel({ userId }: { userId: string }) {
  const [indiceGlobal, setIndiceGlobal] = useState<any>(null)

  const handleIndiceChange = useCallback((indice: any) => {
    setIndiceGlobal(indice)
  }, [])

  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricSummaryCard metric={{
          id: 'fmax',
          label: 'Fuerza Máx. Promedio',
          value: indiceGlobal?.valor || 0,
          unit: 'kg',
          change: 5.2,
          trend: 'up',
          color: '#ef4444'
        }} />
        <MetricSummaryCard metric={{
          id: 'simetria',
          label: 'Simetría General',
          value: indiceGlobal?.simetriaGeneral || 100,
          unit: '%',
          change: 2.1,
          trend: 'up',
          color: '#13ec6d'
        }} />
        <MetricSummaryCard metric={{
          id: 'rfd',
          label: 'RFD Promedio',
          value: 245,
          unit: 'kg/s',
          change: -3.5,
          trend: 'down',
          color: '#00f0ff'
        }} />
        <MetricSummaryCard metric={{
          id: 'evaluaciones',
          label: 'Evaluaciones',
          value: 12,
          unit: 'total',
          trend: 'stable',
          color: '#8b5cf6'
        }} />
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
// PANEL DE ANÁLISIS DE RESISTENCIA
// ============================================================================

function ResistenciaAnalysisPanel() {
  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricSummaryCard metric={{
          id: 'vo2max',
          label: 'VO2max Estimado',
          value: 48.5,
          unit: 'ml/kg/min',
          change: 3.2,
          trend: 'up',
          color: '#ec4899'
        }} />
        <MetricSummaryCard metric={{
          id: 'umbral',
          label: 'Umbral Anaeróbico',
          value: 165,
          unit: 'bpm',
          change: 2,
          trend: 'up',
          color: '#f59e0b'
        }} />
        <MetricSummaryCard metric={{
          id: 'recuperacion',
          label: 'FC Recuperación',
          value: 62,
          unit: 'bpm',
          change: -4,
          trend: 'up',
          color: '#13ec6d'
        }} />
        <MetricSummaryCard metric={{
          id: 'endurance',
          label: 'Resistencia Muscular',
          value: 78,
          unit: '%',
          trend: 'stable',
          color: '#00f0ff'
        }} />
      </div>

      {/* Zonas de Entrenamiento */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="favorite" className="text-[#ec4899]" />
          Zonas de Frecuencia Cardíaca
        </h3>
        <div className="space-y-3">
          {[
            { zone: 'Z1 - Recuperación', range: '95-114 bpm', color: '#60a5fa', pct: 15 },
            { zone: 'Z2 - Aeróbico Base', range: '114-133 bpm', color: '#34d399', pct: 40 },
            { zone: 'Z3 - Tempo', range: '133-152 bpm', color: '#fbbf24', pct: 25 },
            { zone: 'Z4 - Umbral', range: '152-171 bpm', color: '#fb923c', pct: 15 },
            { zone: 'Z5 - VO2max', range: '171-190 bpm', color: '#ef4444', pct: 5 },
          ].map((z, i) => (
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

      {/* Evolución */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="trending_up" className="text-[#13ec6d]" />
          Evolución del VO2max
        </h3>
        <div className="flex items-center justify-center h-48 text-slate-400">
          <div className="text-center">
            <Icon name="show_chart" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Datos de evolución próximamente</p>
            <p className="text-xs mt-1">Conecta tu dispositivo para sincronizar</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE VELOCIDAD
// ============================================================================

function VelocidadAnalysisPanel() {
  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricSummaryCard metric={{
          id: 'vel_max',
          label: 'Velocidad Máxima',
          value: 32.5,
          unit: 'km/h',
          change: 2.1,
          trend: 'up',
          color: '#f59e0b'
        }} />
        <MetricSummaryCard metric={{
          id: 'aceleracion',
          label: 'Aceleración 0-10m',
          value: 1.85,
          unit: 's',
          change: -0.15,
          trend: 'up',
          color: '#00f0ff'
        }} />
        <MetricSummaryCard metric={{
          id: 'reaccion',
          label: 'Tiempo Reacción',
          value: 0.22,
          unit: 's',
          change: -0.02,
          trend: 'up',
          color: '#13ec6d'
        }} />
        <MetricSummaryCard metric={{
          id: 'cadencia',
          label: 'Cadencia',
          value: 185,
          unit: 'pasos/min',
          trend: 'stable',
          color: '#8b5cf6'
        }} />
      </div>

      {/* Tests de Velocidad */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="bolt" className="text-[#f59e0b]" />
          Tests de Velocidad Realizados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Sprint 10m', value: '1.85s', date: '15/03/2024', status: 'good' },
            { name: 'Sprint 20m', value: '3.12s', date: '15/03/2024', status: 'good' },
            { name: 'Sprint 40m', value: '5.68s', date: '15/03/2024', status: 'excellent' },
            { name: 'Agilidad T-Test', value: '9.45s', date: '10/03/2024', status: 'needs_work' },
          ].map((test, i) => (
            <div key={i} className="bg-[#102218] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{test.name}</p>
                <p className="text-[10px] text-slate-400">{test.date}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#f59e0b]">{test.value}</p>
                <p className={`text-[10px] ${
                  test.status === 'excellent' ? 'text-[#13ec6d]' :
                  test.status === 'good' ? 'text-[#f59e0b]' : 'text-red-400'
                }`}>
                  {test.status === 'excellent' ? 'Excelente' :
                   test.status === 'good' ? 'Bueno' : 'Mejorable'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perfil de Velocidad */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="speed" className="text-[#00f0ff]" />
          Perfil de Velocidad-Fuerza
        </h3>
        <div className="flex items-center justify-center h-48 text-slate-400">
          <div className="text-center">
            <Icon name="show_chart" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Perfil de velocidad-fuerza próximamente</p>
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
  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricSummaryCard metric={{
          id: 'sit_reach',
          label: 'Sit & Reach',
          value: 15.5,
          unit: 'cm',
          change: 2.3,
          trend: 'up',
          color: '#8b5cf6'
        }} />
        <MetricSummaryCard metric={{
          id: 'rom_hombro',
          label: 'ROM Hombro',
          value: 175,
          unit: '°',
          trend: 'stable',
          color: '#ec4899'
        }} />
        <MetricSummaryCard metric={{
          id: 'rom_cadera',
          label: 'ROM Cadera',
          value: 110,
          unit: '°',
          change: 5,
          trend: 'up',
          color: '#13ec6d'
        }} />
        <MetricSummaryCard metric={{
          id: 'movilidad',
          label: 'Movilidad General',
          value: 72,
          unit: '%',
          change: 8,
          trend: 'up',
          color: '#00f0ff'
        }} />
      </div>

      {/* Evaluaciones por Articulación */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="accessibility_new" className="text-[#8b5cf6]" />
          Rango de Movimiento por Articulación
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Cervical', value: 85, status: 'good' },
            { name: 'Hombro', value: 90, status: 'excellent' },
            { name: 'Columna', value: 65, status: 'needs_work' },
            { name: 'Cadera', value: 78, status: 'good' },
            { name: 'Rodilla', value: 95, status: 'excellent' },
            { name: 'Tobillo', value: 72, status: 'good' },
            { name: 'Muñeca', value: 88, status: 'excellent' },
            { name: 'Codo', value: 92, status: 'excellent' },
          ].map((joint, i) => (
            <div key={i} className="bg-[#102218] rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1">{joint.name}</p>
              <p className={`text-xl font-bold ${
                joint.status === 'excellent' ? 'text-[#13ec6d]' :
                joint.status === 'good' ? 'text-[#f59e0b]' : 'text-red-400'
              }`}>
                {joint.value}%
              </p>
              <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    joint.status === 'excellent' ? 'bg-[#13ec6d]' :
                    joint.status === 'good' ? 'bg-[#f59e0b]' : 'bg-red-400'
                  }`}
                  style={{ width: `${joint.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-[#f59e0b]/30">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Icon name="lightbulb" className="text-[#f59e0b]" />
          Recomendaciones de Movilidad
        </h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-xs text-slate-300">
            <Icon name="arrow_right" className="text-[#f59e0b] text-sm" />
            <span>Incorporar estiramientos dinámicos para columna vertebral</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-slate-300">
            <Icon name="arrow_right" className="text-[#f59e0b] text-sm" />
            <span>Trabajar movilidad de tobillo con ejercicios específicos</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-slate-300">
            <Icon name="arrow_right" className="text-[#f59e0b] text-sm" />
            <span>Considerar yoga o Pilates 2x por semana</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// PANEL DE ANÁLISIS DE POTENCIA
// ============================================================================

function PotenciaAnalysisPanel() {
  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricSummaryCard metric={{
          id: 'cmj',
          label: 'Salto Vertical (CMJ)',
          value: 42.5,
          unit: 'cm',
          change: 3.2,
          trend: 'up',
          color: '#00f0ff'
        }} />
        <MetricSummaryCard metric={{
          id: 'sj',
          label: 'Squat Jump',
          value: 38.2,
          unit: 'cm',
          change: 2.8,
          trend: 'up',
          color: '#f59e0b'
        }} />
        <MetricSummaryCard metric={{
          id: 'potencia_pico',
          label: 'Potencia Pico',
          value: 4250,
          unit: 'W',
          change: 5.5,
          trend: 'up',
          color: '#ef4444'
        }} />
        <MetricSummaryCard metric={{
          id: 'rsi',
          label: 'RSI (Reactividad)',
          value: 2.8,
          unit: '',
          trend: 'stable',
          color: '#8b5cf6'
        }} />
      </div>

      {/* Tests de Salto */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="vertical_align_top" className="text-[#00f0ff]" />
          Tests de Salto Realizados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Countermovement Jump', value: '42.5 cm', date: '20/03/2024', power: '4250W' },
            { name: 'Squat Jump', value: '38.2 cm', date: '20/03/2024', power: '3980W' },
            { name: 'Drop Jump', value: '35.8 cm', date: '20/03/2024', power: '4100W' },
          ].map((test, i) => (
            <div key={i} className="bg-[#102218] rounded-xl p-4">
              <p className="text-sm font-bold text-white mb-1">{test.name}</p>
              <p className="text-[10px] text-slate-400 mb-3">{test.date}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Altura</p>
                  <p className="text-lg font-bold text-[#00f0ff]">{test.value}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Potencia</p>
                  <p className="text-lg font-bold text-[#f59e0b]">{test.power}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perfil de Potencia */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="flash_on" className="text-[#f59e0b]" />
          Perfil Fuerza-Velocidad-Potencia
        </h3>
        <div className="flex items-center justify-center h-48 text-slate-400">
          <div className="text-center">
            <Icon name="show_chart" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Perfil de potencia próximamente</p>
            <p className="text-xs mt-1">Realiza tests de salto para generar datos</p>
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
  const [activeCategory, setActiveCategory] = useState<AnalisisCategory>('fuerza')
  const [history, setHistory] = useState<EvaluationHistory[]>([])

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

  // Cargar historial
  useEffect(() => {
    if (!userData?.id) return
    
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/isometric?userId=${userData.id}`)
        const data = await response.json()
        
        if (data.success && data.evaluations) {
          const historyData: EvaluationHistory[] = data.evaluations.map((e: any) => ({
            id: e.id,
            date: e.test_date,
            type: 'fuerza' as AnalisisCategory,
            summary: `${e.muscle_evaluated} - ${e.side} - Fmax: ${e.fmax?.toFixed(1) || 0} kg`,
            metrics: {
              'Fmax': e.fmax || 0,
              'RFD': e.rfd_max || 0,
              'Tiempo': e.time_to_fmax || 0
            }
          }))
          setHistory(historyData)
        }
      } catch (error) {
        console.error('Error loading history:', error)
      }
    }
    
    fetchHistory()
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
                Compara tus resultados con valores normativos y recibe recomendaciones personalizadas.
              </p>
            </div>
          </div>
        </div>

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
              {activeCategory === 'fuerza' && <FuerzaAnalysisPanel userId={userData?.id || ''} />}
              {activeCategory === 'resistencia' && <ResistenciaAnalysisPanel />}
              {activeCategory === 'velocidad' && <VelocidadAnalysisPanel />}
              {activeCategory === 'flexibilidad' && <FlexibilidadAnalysisPanel />}
              {activeCategory === 'potencia' && <PotenciaAnalysisPanel />}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Historial Reciente */}
            <div className="bg-[#193324]/50 rounded-2xl p-4 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="history" className="text-[#f59e0b]" />
                Historial de Evaluaciones
              </h3>
              <HistoryTimeline history={history} />
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-[#193324]/50 rounded-2xl p-4 border border-white/10">
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
    </div>
  )
}
