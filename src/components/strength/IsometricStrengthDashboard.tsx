'use client'

import { useState, useMemo } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell, ReferenceLine, ComposedChart, Line, Area
} from 'recharts'

// ============================================================================
// TYPES
// ============================================================================

type Lado = 'R' | 'L'
type RegionCuerpo = 'upper' | 'core' | 'lower'
type ClasificacionAsimetria = 'optimo' | 'leve' | 'moderado' | 'riesgo'

interface FuerzaBilateral {
  R: number
  L: number
}

interface MusculoEvaluado {
  id: string
  nombre: string
  nombreCorto: string
  region: RegionCuerpo
  subgrupo: string
  fuerza: FuerzaBilateral
  pesoNormativo?: number // Valor de referencia para normalización
}

interface IndiceFuerzaIsometricaGlobal {
  valor: number // 0-100
  trenSuperior: number
  core: number
  trenInferior: number
  simetriaGeneral: number // Promedio de simetría
  grados: {
    fuerza: 'deficiente' | 'bajo' | 'moderado' | 'bueno' | 'excelente'
    simetria: 'critico' | 'moderado' | 'leve' | 'optimo'
  }
}

interface DesequilibrioDetectado {
  musculoId: string
  musculoNombre: string
  ladoDominante: 'R' | 'L'
  diferenciaPorcentaje: number
  clasificacion: ClasificacionAsimetria
  recomendacion: string
}

// ============================================================================
// MÚSCULOS ISOMÉTRICOS COMPLETOS
// ============================================================================

export const MUSCULOS_ISOMETRICOS: MusculoEvaluado[] = [
  // 🔴 TREN SUPERIOR - Pecho
  { id: 'pectoral_mayor', nombre: 'Pectoral Mayor', nombreCorto: 'Pectoral', region: 'upper', subgrupo: 'pecho', fuerza: { R: 0, L: 0 }, pesoNormativo: 100 },
  
  // 🔴 TREN SUPERIOR - Espalda
  { id: 'dorsal_ancho', nombre: 'Dorsal Ancho', nombreCorto: 'Dorsal', region: 'upper', subgrupo: 'espalda', fuerza: { R: 0, L: 0 }, pesoNormativo: 90 },
  { id: 'trapecio', nombre: 'Trapecio Medio/Inferior', nombreCorto: 'Trapecio', region: 'upper', subgrupo: 'espalda', fuerza: { R: 0, L: 0 }, pesoNormativo: 70 },
  
  // 🔴 TREN SUPERIOR - Hombros
  { id: 'deltoide_anterior', nombre: 'Deltoide Anterior', nombreCorto: 'D. Anterior', region: 'upper', subgrupo: 'hombros', fuerza: { R: 0, L: 0 }, pesoNormativo: 50 },
  { id: 'deltoide_medio', nombre: 'Deltoide Medio', nombreCorto: 'D. Medio', region: 'upper', subgrupo: 'hombros', fuerza: { R: 0, L: 0 }, pesoNormativo: 45 },
  { id: 'deltoide_posterior', nombre: 'Deltoide Posterior', nombreCorto: 'D. Posterior', region: 'upper', subgrupo: 'hombros', fuerza: { R: 0, L: 0 }, pesoNormativo: 40 },
  
  // 🔴 TREN SUPERIOR - Brazos
  { id: 'biceps_braquial', nombre: 'Bíceps Braquial', nombreCorto: 'Bíceps', region: 'upper', subgrupo: 'brazos', fuerza: { R: 0, L: 0 }, pesoNormativo: 35 },
  { id: 'triceps_braquial', nombre: 'Tríceps Braquial', nombreCorto: 'Tríceps', region: 'upper', subgrupo: 'brazos', fuerza: { R: 0, L: 0 }, pesoNormativo: 40 },
  
  // 🟢 CORE
  { id: 'recto_abdominal', nombre: 'Recto Abdominal', nombreCorto: 'Abdominal', region: 'core', subgrupo: 'core', fuerza: { R: 0, L: 0 }, pesoNormativo: 60 },
  { id: 'oblicuos', nombre: 'Oblicuos', nombreCorto: 'Oblicuos', region: 'core', subgrupo: 'core', fuerza: { R: 0, L: 0 }, pesoNormativo: 45 },
  { id: 'erectores_espinales', nombre: 'Erectores Espinales', nombreCorto: 'Lumbar', region: 'core', subgrupo: 'core', fuerza: { R: 0, L: 0 }, pesoNormativo: 80 },
  
  // 🔵 TREN INFERIOR - Cadera
  { id: 'gluteo_mayor', nombre: 'Glúteo Mayor', nombreCorto: 'Glúteo Mayor', region: 'lower', subgrupo: 'cadera', fuerza: { R: 0, L: 0 }, pesoNormativo: 120 },
  { id: 'gluteo_medio', nombre: 'Glúteo Medio', nombreCorto: 'Glúteo Medio', region: 'lower', subgrupo: 'cadera', fuerza: { R: 0, L: 0 }, pesoNormativo: 50 },
  
  // 🔵 TREN INFERIOR - Muslo
  { id: 'cuadriceps', nombre: 'Cuádriceps', nombreCorto: 'Cuádriceps', region: 'lower', subgrupo: 'muslo', fuerza: { R: 0, L: 0 }, pesoNormativo: 100 },
  { id: 'isquiotibiales', nombre: 'Isquiotibiales', nombreCorto: 'Isquios', region: 'lower', subgrupo: 'muslo', fuerza: { R: 0, L: 0 }, pesoNormativo: 80 },
  { id: 'aductores', nombre: 'Aductores', nombreCorto: 'Aductores', region: 'lower', subgrupo: 'muslo', fuerza: { R: 0, L: 0 }, pesoNormativo: 60 },
  
  // 🔵 TREN INFERIOR - Pierna
  { id: 'gastrocnemio', nombre: 'Gastrocnemio', nombreCorto: 'Gemelo', region: 'lower', subgrupo: 'pierna', fuerza: { R: 0, L: 0 }, pesoNormativo: 70 },
  { id: 'soleo', nombre: 'Sóleo', nombreCorto: 'Sóleo', region: 'lower', subgrupo: 'pierna', fuerza: { R: 0, L: 0 }, pesoNormativo: 50 },
  { id: 'tibial_anterior', nombre: 'Tibial Anterior', nombreCorto: 'Tibial', region: 'lower', subgrupo: 'pierna', fuerza: { R: 0, L: 0 }, pesoNormativo: 30 },
]

// ============================================================================
// COLORES Y CONFIGURACIÓN
// ============================================================================

const COLORES = {
  upper: '#ef4444',
  core: '#13ec6d',
  lower: '#3b82f6',
  R: '#00f0ff',
  L: '#f59e0b',
  optimo: '#13ec6d',
  leve: '#84cc16',
  moderado: '#f59e0b',
  riesgo: '#ef4444',
}

const SUBGRUPOS_CONFIG = {
  pecho: { color: '#ef4444', nombre: 'Pecho' },
  espalda: { color: '#f59e0b', nombre: 'Espalda' },
  hombros: { color: '#8b5cf6', nombre: 'Hombros' },
  brazos: { color: '#ec4899', nombre: 'Brazos' },
  core: { color: '#13ec6d', nombre: 'Core' },
  cadera: { color: '#00f0ff', nombre: 'Cadera' },
  muslo: { color: '#3b82f6', nombre: 'Muslo' },
  pierna: { color: '#06b6d4', nombre: 'Pierna' },
}

// ============================================================================
// FUNCIONES DE CÁLCULO
// ============================================================================

function calcularAsimetria(R: number, L: number): { 
  porcentaje: number
  clasificacion: ClasificacionAsimetria
  dominante: 'R' | 'L' | 'equilibrado' 
} {
  if (R === 0 && L === 0) return { porcentaje: 0, clasificacion: 'optimo', dominante: 'equilibrado' }
  
  const max = Math.max(R, L)
  const porcentaje = max > 0 ? (Math.abs(R - L) / max) * 100 : 0
  
  let clasificacion: ClasificacionAsimetria
  if (porcentaje <= 5) clasificacion = 'optimo'
  else if (porcentaje <= 10) clasificacion = 'leve'
  else if (porcentaje <= 15) clasificacion = 'moderado'
  else clasificacion = 'riesgo'
  
  const dominante = R > L ? 'R' : L > R ? 'L' : 'equilibrado'
  
  return { porcentaje, clasificacion, dominante }
}

function calcularIndiceFuerzaGlobal(musculos: MusculoEvaluado[]): IndiceFuerzaIsometricaGlobal {
  const upper = musculos.filter(m => m.region === 'upper')
  const core = musculos.filter(m => m.region === 'core')
  const lower = musculos.filter(m => m.region === 'lower')
  
  // Calcular promedio normalizado por región (0-100)
  const calcularPromedioNormalizado = (lista: MusculoEvaluado[]) => {
    const validos = lista.filter(m => m.fuerza.R > 0 || m.fuerza.L > 0)
    if (validos.length === 0) return 0
    
    const sumaNormalizada = validos.reduce((acc, m) => {
      const promedio = (m.fuerza.R + m.fuerza.L) / 2
      const normativo = m.pesoNormativo || 50
      const normalizado = Math.min(100, (promedio / normativo) * 100)
      return acc + normalizado
    }, 0)
    
    return Math.round(sumaNormalizada / validos.length)
  }
  
  const trenSuperior = calcularPromedioNormalizado(upper)
  const coreProm = calcularPromedioNormalizado(core)
  const trenInferior = calcularPromedioNormalizado(lower)
  
  // Calcular simetría general
  const asimetrias = musculos
    .filter(m => m.fuerza.R > 0 || m.fuerza.L > 0)
    .map(m => calcularAsimetria(m.fuerza.R, m.fuerza.L))
  
  const simetriaGeneral = asimetrias.length > 0
    ? Math.round(100 - asimetrias.reduce((acc, a) => acc + a.porcentaje, 0) / asimetrias.length)
    : 100
  
  // Índice global ponderado
  const valor = Math.round((trenSuperior * 0.35 + coreProm * 0.25 + trenInferior * 0.40) * (simetriaGeneral / 100))
  
  // Determinar grados
  const getGradoFuerza = (v: number): IndiceFuerzaIsometricaGlobal['grados']['fuerza'] => {
    if (v < 30) return 'deficiente'
    if (v < 50) return 'bajo'
    if (v < 70) return 'moderado'
    if (v < 85) return 'bueno'
    return 'excelente'
  }
  
  const getGradoSimetria = (s: number): IndiceFuerzaIsometricaGlobal['grados']['simetria'] => {
    if (s < 85) return 'critico'
    if (s < 92) return 'moderado'
    if (s < 97) return 'leve'
    return 'optimo'
  }
  
  return {
    valor,
    trenSuperior,
    core: coreProm,
    trenInferior,
    simetriaGeneral,
    grados: {
      fuerza: getGradoFuerza(valor),
      simetria: getGradoSimetria(simetriaGeneral)
    }
  }
}

function detectarDesequilibrios(musculos: MusculoEvaluado[]): DesequilibrioDetectado[] {
  const desequilibrios: DesequilibrioDetectado[] = []
  
  musculos.forEach(m => {
    if (m.fuerza.R === 0 && m.fuerza.L === 0) return
    
    const { porcentaje, clasificacion, dominante } = calcularAsimetria(m.fuerza.R, m.fuerza.L)
    
    if (clasificacion === 'moderado' || clasificacion === 'riesgo') {
      const recomendaciones: Record<string, string> = {
        'pectoral_mayor': 'Incluir press banca unilateral y aperturas con mancuernas.',
        'dorsal_ancho': 'Priorizar remos unilaterales y dominadas asimétricas.',
        'trapecio': 'Encogimientos unilaterales y elevaciones escapulares.',
        'deltoide_anterior': 'Press militar con mancuernas y elevaciones frontales unilaterales.',
        'deltoide_medio': 'Elevaciones laterales unilaterales con control.',
        'deltoide_posterior': 'Pájaros y face pull con énfasis en el lado débil.',
        'biceps_braquial': 'Curls unilaterales con mayor volumen en lado débil.',
        'triceps_braquial': 'Extensiones unilaterales y fondos asimétricos.',
        'recto_abdominal': 'Planchas laterales y crunches con rotación.',
        'oblicuos': 'Russian twists y pallof press unilateral.',
        'erectores_espinales': 'Hiperextensiones unilaterales y superman.',
        'gluteo_mayor': 'Hip thrust unilateral y elevaciones de cadera.',
        'gluteo_medio': 'Abducciones y clamshell con banda.',
        'cuadriceps': 'Sentadillas búlgaras y zancadas.',
        'isquiotibiales': 'Curl femoral unilateral y nordic curl.',
        'aductores': 'Copenhague y sentadilla sumo con énfasis.',
        'gastrocnemio': 'Elevación de talones unilateral de pie.',
        'soleo': 'Elevación de talones unilateral sentado.',
        'tibial_anterior': 'Dorsiflexión con banda resistida.',
      }
      
      desequilibrios.push({
        musculoId: m.id,
        musculoNombre: m.nombre,
        ladoDominante: dominante === 'equilibrado' ? 'R' : dominante,
        diferenciaPorcentaje: porcentaje,
        clasificacion,
        recomendacion: recomendaciones[m.id] || 'Trabajo unilateral progresivo.'
      })
    }
  })
  
  return desequilibrios.sort((a, b) => b.diferenciaPorcentaje - a.diferenciaPorcentaje)
}

// ============================================================================
// COMPONENTES DE VISUALIZACIÓN
// ============================================================================

function Icono({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// Radar Chart usando Recharts para visualización regional
function RadarFuerzaRegional({ musculos }: { musculos: MusculoEvaluado[] }) {
  const data = useMemo(() => {
    const subgrupos: Record<string, { total: number, count: number, color: string }> = {}
    
    musculos.forEach(m => {
      if (!subgrupos[m.subgrupo]) {
        subgrupos[m.subgrupo] = { 
          total: 0, 
          count: 0, 
          color: SUBGRUPOS_CONFIG[m.subgrupo as keyof typeof SUBGRUPOS_CONFIG]?.color || '#888' 
        }
      }
      
      const promedio = (m.fuerza.R + m.fuerza.L) / 2
      if (promedio > 0) {
        const normalizado = Math.min(100, (promedio / (m.pesoNormativo || 50)) * 100)
        subgrupos[m.subgrupo].total += normalizado
        subgrupos[m.subgrupo].count++
      }
    })
    
    return Object.entries(subgrupos).map(([id, data]) => ({
      subgrupo: SUBGRUPOS_CONFIG[id as keyof typeof SUBGRUPOS_CONFIG]?.nombre || id,
      valor: data.count > 0 ? Math.round(data.total / data.count) : 0,
      color: data.color,
      fullMark: 100,
    }))
  }, [musculos])
  
  if (data.every(d => d.valor === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos de evaluación
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <PolarGrid stroke="#3a4a3f" />
        <PolarAngleAxis 
          dataKey="subgrupo" 
          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 100]} 
          tick={{ fill: '#6b7b6f', fontSize: 8 }}
        />
        <Radar
          name="Fuerza"
          dataKey="valor"
          stroke="#13ec6d"
          fill="#13ec6d"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#193324', 
            border: '1px solid #13ec6d40',
            borderRadius: '8px'
          }}
          formatter={(value: number) => [`${value}%`, 'Fuerza Normalizada']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// Gráfico de barras comparativas bilaterales
function BarrasBilaterales({ musculos, region }: { musculos: MusculoEvaluado[]; region: RegionCuerpo | 'all' }) {
  const data = useMemo(() => {
    const filtrados = region === 'all' ? musculos : musculos.filter(m => m.region === region)
    
    return filtrados
      .filter(m => m.fuerza.R > 0 || m.fuerza.L > 0)
      .map(m => ({
        nombre: m.nombreCorto,
        derecho: m.fuerza.R,
        izquierdo: m.fuerza.L,
        promedio: (m.fuerza.R + m.fuerza.L) / 2,
        asimetria: calcularAsimetria(m.fuerza.R, m.fuerza.L).porcentaje,
      }))
      .sort((a, b) => b.promedio - a.promedio)
  }, [musculos, region])
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos para mostrar
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3a4a3f" horizontal={true} vertical={false} />
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} unit=" kg" />
        <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 10 }} width={70} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#193324', 
            border: '1px solid #13ec6d40',
            borderRadius: '8px'
          }}
          formatter={(value: number, name: string) => [
            `${value.toFixed(1)} kg`, 
            name === 'derecho' ? 'Derecho' : name === 'izquierdo' ? 'Izquierdo' : name
          ]}
        />
        <Legend 
          formatter={(value) => value === 'derecho' ? 'Derecho (R)' : 'Izquierdo (L)'}
        />
        <ReferenceLine x={0} stroke="#3a4a3f" />
        <Bar dataKey="derecho" fill={COLORES.R} radius={[0, 4, 4, 0]} barSize={16} />
        <Bar dataKey="izquierdo" fill={COLORES.L} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Gráfico de asimetrías
function GraficoAsimetrias({ musculos }: { musculos: MusculoEvaluado[] }) {
  const data = useMemo(() => {
    return musculos
      .filter(m => m.fuerza.R > 0 || m.fuerza.L > 0)
      .map(m => {
        const { porcentaje, clasificacion } = calcularAsimetria(m.fuerza.R, m.fuerza.L)
        return {
          nombre: m.nombreCorto,
          asimetria: porcentaje,
          clasificacion,
          color: clasificacion === 'optimo' ? COLORES.optimo :
                 clasificacion === 'leve' ? COLORES.leve :
                 clasificacion === 'moderado' ? COLORES.moderado : COLORES.riesgo
        }
      })
      .sort((a, b) => b.asimetria - a.asimetria)
  }, [musculos])
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos de asimetría
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3a4a3f" horizontal={true} vertical={false} />
        <XAxis type="number" domain={[0, 30]} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
        <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 10 }} width={70} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#193324', 
            border: '1px solid #13ec6d40',
            borderRadius: '8px'
          }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Asimetría']}
        />
        <ReferenceLine x={5} stroke={COLORES.optimo} strokeDasharray="3 3" label={{ value: 'Óptimo', fill: COLORES.optimo, fontSize: 9 }} />
        <ReferenceLine x={10} stroke={COLORES.leve} strokeDasharray="3 3" label={{ value: 'Leve', fill: COLORES.leve, fontSize: 9 }} />
        <ReferenceLine x={15} stroke={COLORES.moderado} strokeDasharray="3 3" label={{ value: 'Moderado', fill: COLORES.moderado, fontSize: 9 }} />
        <Bar dataKey="asimetria" radius={[0, 4, 4, 0]} barSize={12}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface IsometricStrengthDashboardProps {
  musculosIniciales?: MusculoEvaluado[]
  onMusculosChange?: (musculos: MusculoEvaluado[]) => void
  onIndiceChange?: (indice: IndiceFuerzaIsometricaGlobal) => void
}

export default function IsometricStrengthDashboard({
  musculosIniciales = MUSCULOS_ISOMETRICOS,
  onMusculosChange,
  onIndiceChange
}: IsometricStrengthDashboardProps) {
  const [musculos, setMusculos] = useState<MusculoEvaluado[]>(musculosIniciales)
  const [regionActiva, setRegionActiva] = useState<RegionCuerpo | 'all'>('all')
  const [vista, setVista] = useState<'radar' | 'barras' | 'asimetrias'>('radar')
  
  // Cálculos derivados
  const indiceGlobal = useMemo(() => calcularIndiceFuerzaGlobal(musculos), [musculos])
  const desequilibrios = useMemo(() => detectarDesequilibrios(musculos), [musculos])
  const musculosEvaluados = useMemo(() => 
    musculos.filter(m => m.fuerza.R > 0 || m.fuerza.L > 0).length,
    [musculos]
  )
  
  // Notificar cambios
  useMemo(() => {
    if (onIndiceChange) onIndiceChange(indiceGlobal)
  }, [indiceGlobal, onIndiceChange])
  
  // Funciones para actualizar fuerza
  const actualizarFuerza = (musculoId: string, lado: Lado, valor: number) => {
    const nuevos = musculos.map(m => 
      m.id === musculoId 
        ? { ...m, fuerza: { ...m.fuerza, [lado]: valor } }
        : m
    )
    setMusculos(nuevos)
    if (onMusculosChange) onMusculosChange(nuevos)
  }
  
  const cargarDatosEjemplo = () => {
    const datosEjemplo = musculos.map(m => ({
      ...m,
      fuerza: {
        R: Math.round((m.pesoNormativo || 50) * (0.7 + Math.random() * 0.5)),
        L: Math.round((m.pesoNormativo || 50) * (0.65 + Math.random() * 0.5))
      }
    }))
    setMusculos(datosEjemplo)
    if (onMusculosChange) onMusculosChange(datosEjemplo)
  }
  
  const limpiarDatos = () => {
    const limpios = musculos.map(m => ({ ...m, fuerza: { R: 0, L: 0 } }))
    setMusculos(limpios)
    if (onMusculosChange) onMusculosChange(limpios)
  }
  
  // Helpers
  const getGradoColor = (grado: string) => {
    switch (grado) {
      case 'excelente': case 'optimo': return 'text-[#13ec6d]'
      case 'bueno': case 'leve': return 'text-[#84cc16]'
      case 'moderado': return 'text-[#f59e0b]'
      case 'bajo': case 'critico': return 'text-[#ef4444]'
      case 'deficiente': return 'text-red-400'
      default: return 'text-white'
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Header con índice global */}
      <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#13ec6d]/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center">
              <Icono name="fitness_center" className="text-[#13ec6d] text-2xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Índice de Fuerza Isométrica Global</h2>
              <p className="text-xs text-slate-400">{musculosEvaluados} de {musculos.length} músculos evaluados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargarDatosEjemplo}
              className="px-3 py-1.5 bg-[#13ec6d]/20 text-[#13ec6d] rounded-lg text-xs font-bold hover:bg-[#13ec6d]/30 transition-all"
            >
              Datos Ejemplo
            </button>
            <button
              onClick={limpiarDatos}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-all"
            >
              Limpiar
            </button>
          </div>
        </div>
        
        {/* Índice principal */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-1 flex flex-col items-center justify-center bg-[#102218] rounded-xl p-3">
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Índice Global</p>
            <p className={`text-4xl font-bold ${getGradoColor(indiceGlobal.grados.fuerza)}`}>
              {indiceGlobal.valor}
            </p>
            <p className={`text-[10px] font-bold ${getGradoColor(indiceGlobal.grados.fuerza)}`}>
              {indiceGlobal.grados.fuerza.toUpperCase()}
            </p>
          </div>
          
          <div className="col-span-3 grid grid-cols-4 gap-2">
            <div className="bg-[#102218] rounded-xl p-3 text-center">
              <p className="text-[8px] text-slate-500 uppercase">T. Superior</p>
              <p className="text-xl font-bold text-[#ef4444]">{indiceGlobal.trenSuperior}</p>
            </div>
            <div className="bg-[#102218] rounded-xl p-3 text-center">
              <p className="text-[8px] text-slate-500 uppercase">Core</p>
              <p className="text-xl font-bold text-[#13ec6d]">{indiceGlobal.core}</p>
            </div>
            <div className="bg-[#102218] rounded-xl p-3 text-center">
              <p className="text-[8px] text-slate-500 uppercase">T. Inferior</p>
              <p className="text-xl font-bold text-[#3b82f6]">{indiceGlobal.trenInferior}</p>
            </div>
            <div className="bg-[#102218] rounded-xl p-3 text-center">
              <p className="text-[8px] text-slate-500 uppercase">Simetría</p>
              <p className={`text-xl font-bold ${getGradoColor(indiceGlobal.grados.simetria)}`}>
                {indiceGlobal.simetriaGeneral}
              </p>
            </div>
          </div>
          
          <div className="col-span-1 flex flex-col justify-center bg-[#102218] rounded-xl p-3">
            <p className="text-[8px] text-slate-500 uppercase mb-2">Desequilibrios</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-red-400">Riesgo</span>
                <span className="text-xs font-bold text-red-400">
                  {desequilibrios.filter(d => d.clasificacion === 'riesgo').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#f59e0b]">Moderado</span>
                <span className="text-xs font-bold text-[#f59e0b]">
                  {desequilibrios.filter(d => d.clasificacion === 'moderado').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Selector de vista y región */}
      <div className="flex gap-2">
        <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10">
          {['radar', 'barras', 'asimetrias'].map(v => (
            <button
              key={v}
              onClick={() => setVista(v as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vista === v ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {v === 'radar' ? 'Radar' : v === 'barras' ? 'Bilateral' : 'Asimetrías'}
            </button>
          ))}
        </div>
        
        <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10">
          {['all', 'upper', 'core', 'lower'].map(r => (
            <button
              key={r}
              onClick={() => setRegionActiva(r as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                regionActiva === r ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'all' ? 'Todo' : r === 'upper' ? 'Superior' : r === 'core' ? 'Core' : 'Inferior'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Visualizaciones */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        {vista === 'radar' && <RadarFuerzaRegional musculos={musculos} />}
        {vista === 'barras' && <BarrasBilaterales musculos={musculos} region={regionActiva} />}
        {vista === 'asimetrias' && <GraficoAsimetrias musculos={musculos} />}
      </div>
      
      {/* Panel de desequilibrios detectados */}
      {desequilibrios.length > 0 && (
        <div className="bg-[#193324] rounded-2xl p-4 border border-[#f59e0b]/30">
          <div className="flex items-center gap-2 mb-3">
            <Icono name="warning" className="text-[#f59e0b]" />
            <h3 className="text-sm font-bold text-white">Desequilibrios Detectados</h3>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {desequilibrios.map((d, i) => (
              <div 
                key={i}
                className={`p-3 rounded-xl border ${
                  d.clasificacion === 'riesgo' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{d.musculoNombre}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    d.clasificacion === 'riesgo' ? 'bg-red-500/20 text-red-400' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                  }`}>
                    {d.diferenciaPorcentaje.toFixed(1)}% ({d.ladoDominante === 'R' ? 'Derecho domina' : 'Izquierdo domina'})
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{d.recomendacion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Grid de entrada de datos */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Icono name="edit" className="text-[#00f0ff]" />
          Ingreso Manual de Datos (kg)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {musculos
            .filter(m => regionActiva === 'all' || m.region === regionActiva)
            .map(m => (
              <div key={m.id} className="bg-[#102218] rounded-lg p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{m.nombreCorto}</p>
                  <p className="text-[8px] text-slate-500">{SUBGRUPOS_CONFIG[m.subgrupo as keyof typeof SUBGRUPOS_CONFIG]?.nombre}</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={m.fuerza.R || ''}
                    onChange={(e) => actualizarFuerza(m.id, 'R', parseFloat(e.target.value) || 0)}
                    placeholder="R"
                    className="w-12 px-1 py-1 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded text-xs text-[#00f0ff] text-center font-mono"
                  />
                  <input
                    type="number"
                    value={m.fuerza.L || ''}
                    onChange={(e) => actualizarFuerza(m.id, 'L', parseFloat(e.target.value) || 0)}
                    placeholder="L"
                    className="w-12 px-1 py-1 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded text-xs text-[#f59e0b] text-center font-mono"
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// Exportar tipos y utilidades para uso externo
export { 
  calcularAsimetria, 
  calcularIndiceFuerzaGlobal, 
  detectarDesequilibrios,
  MUSCULOS_ISOMETRICOS
}
export type { 
  MusculoEvaluado, 
  IndiceFuerzaIsometricaGlobal, 
  DesequilibrioDetectado,
  FuerzaBilateral
}
