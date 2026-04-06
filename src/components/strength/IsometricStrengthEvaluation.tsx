'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

type Lado = 'R' | 'L'
type RegionCuerpo = 'upper' | 'core' | 'lower'
type EstadoTest = 'inactivo' | 'listo' | 'medicion' | 'finalizado'
type EstadoConexion = 'desconectado' | 'conectado' | 'error'
type UnidadFuerza = 'kg' | 'N'
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
  ejercicios: string[]
}

interface EvaluacionIsometricaCompleta {
  id: string
  fecha: string
  musculo: string
  lado: Lado
  fuerzaMaxima: number
  tiempoHastaFmax: number
  rfd: number
  fuerzaMedia: number
  duracionTest: number
  unidad: UnidadFuerza
}

interface ResultadoAsimetria {
  musculoId: string
  musculoNombre: string
  derecha: number
  izquierda: number
  promedio: number
  asimetriaPorcentaje: number
  clasificacion: ClasificacionAsimetria
  dominante: 'R' | 'L' | 'equilibrado'
}

interface IndiceFuerzaGlobal {
  trenSuperior: number
  core: number
  trenInferior: number
  indiceGlobal: number
}

interface Insight {
  tipo: 'alerta' | 'info' | 'recomendacion'
  mensaje: string
  musculo?: string
  severidad: 'alta' | 'media' | 'baja'
}

interface FuerzaDataPoint {
  tiempo: number
  fuerza: number
}

interface Calibracion {
  offset: number
  factorEscala: number
  fecha: string
}

// ============================================================================
// DATOS DE MÚSCULOS - ESTRUCTURA COMPLETA
// ============================================================================

const MUSCULOS_ISOMETRICOS: MusculoEvaluado[] = [
  // TREN SUPERIOR - Pecho
  { id: 'pectoral_mayor', nombre: 'Pectoral Mayor', nombreCorto: 'Pectoral', region: 'upper', subgrupo: 'pecho', fuerza: { R: 0, L: 0 }, ejercicios: ['Press Banca', 'Press Inclinado', 'Fondos'] },
  
  // TREN SUPERIOR - Espalda
  { id: 'dorsal_ancho', nombre: 'Dorsal Ancho', nombreCorto: 'Dorsal', region: 'upper', subgrupo: 'espalda', fuerza: { R: 0, L: 0 }, ejercicios: ['Dominadas', 'Jalón al Pecho', 'Remo'] },
  { id: 'trapecio', nombre: 'Trapecio Medio/Inferior', nombreCorto: 'Trapecio', region: 'upper', subgrupo: 'espalda', fuerza: { R: 0, L: 0 }, ejercicios: ['Encogimientos', 'Remo al Mentón', 'Face Pull'] },
  
  // TREN SUPERIOR - Hombros
  { id: 'deltoide_anterior', nombre: 'Deltoide Anterior', nombreCorto: 'D. Anterior', region: 'upper', subgrupo: 'hombros', fuerza: { R: 0, L: 0 }, ejercicios: ['Press Militar', 'Elevaciones Frontales'] },
  { id: 'deltoide_medio', nombre: 'Deltoide Medio', nombreCorto: 'D. Medio', region: 'upper', subgrupo: 'hombros', fuerza: { R: 0, L: 0 }, ejercicios: ['Elevaciones Laterales', 'Press Arnold'] },
  { id: 'deltoide_posterior', nombre: 'Deltoide Posterior', nombreCorto: 'D. Posterior', region: 'upper', subgrupo: 'hombros', fuerza: { R: 0, L: 0 }, ejercicios: ['Pájaros', 'Face Pull', 'Reverse Fly'] },
  
  // TREN SUPERIOR - Brazos
  { id: 'biceps_braquial', nombre: 'Bíceps Braquial', nombreCorto: 'Bíceps', region: 'upper', subgrupo: 'brazos', fuerza: { R: 0, L: 0 }, ejercicios: ['Curl Barra', 'Curl Mancuernas', 'Martillo'] },
  { id: 'triceps_braquial', nombre: 'Tríceps Braquial', nombreCorto: 'Tríceps', region: 'upper', subgrupo: 'brazos', fuerza: { R: 0, L: 0 }, ejercicios: ['Press Francés', 'Extensiones', 'Fondos'] },
  
  // CORE
  { id: 'recto_abdominal', nombre: 'Recto Abdominal', nombreCorto: 'Abdominal', region: 'core', subgrupo: 'core', fuerza: { R: 0, L: 0 }, ejercicios: ['Crunch', 'Plancha', 'Elevación Piernas'] },
  { id: 'oblicuos', nombre: 'Oblicuos', nombreCorto: 'Oblicuos', region: 'core', subgrupo: 'core', fuerza: { R: 0, L: 0 }, ejercicios: ['Russian Twist', 'Crunch Oblicuo', 'Pallof Press'] },
  { id: 'erectores_espinales', nombre: 'Erectores Espinales', nombreCorto: 'Lumbar', region: 'core', subgrupo: 'core', fuerza: { R: 0, L: 0 }, ejercicios: ['Hiperextensiones', 'Peso Muerto', 'Good Morning'] },
  
  // TREN INFERIOR - Cadera
  { id: 'gluteo_mayor', nombre: 'Glúteo Mayor', nombreCorto: 'Glúteo Mayor', region: 'lower', subgrupo: 'cadera', fuerza: { R: 0, L: 0 }, ejercicios: ['Hip Thrust', 'Sentadilla', 'Peso Muerto'] },
  { id: 'gluteo_medio', nombre: 'Glúteo Medio', nombreCorto: 'Glúteo Medio', region: 'lower', subgrupo: 'cadera', fuerza: { R: 0, L: 0 }, ejercicios: ['Abducciones', 'Clamshell', 'Monster Walk'] },
  
  // TREN INFERIOR - Muslo
  { id: 'cuadriceps', nombre: 'Cuádriceps', nombreCorto: 'Cuádriceps', region: 'lower', subgrupo: 'muslo', fuerza: { R: 0, L: 0 }, ejercicios: ['Sentadilla', 'Prensa', 'Extensiones', 'Zancadas'] },
  { id: 'isquiotibiales', nombre: 'Isquiotibiales', nombreCorto: 'Isquios', region: 'lower', subgrupo: 'muslo', fuerza: { R: 0, L: 0 }, ejercicios: ['Curl Femoral', 'Nordic Curl', 'Peso Muerto Rumano'] },
  { id: 'aductores', nombre: 'Aductores', nombreCorto: 'Aductores', region: 'lower', subgrupo: 'muslo', fuerza: { R: 0, L: 0 }, ejercicios: ['Sentadilla Sumo', 'Aducciones', 'Copenhague'] },
  
  // TREN INFERIOR - Pierna
  { id: 'gastrocnemio', nombre: 'Gastrocnemio', nombreCorto: 'Gemelo', region: 'lower', subgrupo: 'pierna', fuerza: { R: 0, L: 0 }, ejercicios: ['Elevación Talones', 'Prensa Gemelos'] },
  { id: 'soleo', nombre: 'Sóleo', nombreCorto: 'Sóleo', region: 'lower', subgrupo: 'pierna', fuerza: { R: 0, L: 0 }, ejercicios: ['Elevación Sentado', 'Prensa Gemelos'] },
  { id: 'tibial_anterior', nombre: 'Tibial Anterior', nombreCorto: 'Tibial', region: 'lower', subgrupo: 'pierna', fuerza: { R: 0, L: 0 }, ejercicios: ['Dorsiflexión', 'Caminar Talones'] },
]

const SUBGRUPOS = {
  upper: [
    { id: 'pecho', nombre: 'Pecho', color: '#ef4444' },
    { id: 'espalda', nombre: 'Espalda', color: '#f59e0b' },
    { id: 'hombros', nombre: 'Hombros', color: '#8b5cf6' },
    { id: 'brazos', nombre: 'Brazos', color: '#ec4899' },
  ],
  core: [
    { id: 'core', nombre: 'Core', color: '#13ec6d' },
  ],
  lower: [
    { id: 'cadera', nombre: 'Cadera', color: '#00f0ff' },
    { id: 'muslo', nombre: 'Muslo', color: '#3b82f6' },
    { id: 'pierna', nombre: 'Pierna', color: '#06b6d4' },
  ]
}

const REGIONES = [
  { id: 'upper', nombre: 'Tren Superior', color: '#ef4444', icono: 'accessibility' },
  { id: 'core', nombre: 'Core', color: '#13ec6d', icono: 'fitness_center' },
  { id: 'lower', nombre: 'Tren Inferior', color: '#3b82f6', icono: 'directions_walk' },
]

// ============================================================================
// ICONO COMPONENT
// ============================================================================

function Icono({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function calcularAsimetria(R: number, L: number): { porcentaje: number; clasificacion: ClasificacionAsimetria; dominante: 'R' | 'L' | 'equilibrado' } {
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

function calcularIndiceGlobal(musculos: MusculoEvaluado[]): IndiceFuerzaGlobal {
  const upper = musculos.filter(m => m.region === 'upper')
  const core = musculos.filter(m => m.region === 'core')
  const lower = musculos.filter(m => m.region === 'lower')
  
  const promedioRegion = (lista: MusculoEvaluado[]) => {
    const validos = lista.filter(m => m.fuerza.R > 0 || m.fuerza.L > 0)
    if (validos.length === 0) return 0
    const suma = validos.reduce((acc, m) => acc + (m.fuerza.R + m.fuerza.L) / 2, 0)
    return suma / validos.length
  }
  
  const trenSuperior = promedioRegion(upper)
  const coreProm = promedioRegion(core)
  const trenInferior = promedioRegion(lower)
  
  // Normalizar a escala 0-100 (asumiendo max ~100kg)
  const normalizar = (v: number) => Math.min(100, Math.round(v))
  
  const indiceGlobal = (trenSuperior + coreProm + trenInferior) / 3
  
  return {
    trenSuperior: normalizar(trenSuperior),
    core: normalizar(coreProm),
    trenInferior: normalizar(trenInferior),
    indiceGlobal: normalizar(indiceGlobal)
  }
}

function generarInsights(musculos: MusculoEvaluado[], indice: IndiceFuerzaGlobal): Insight[] {
  const insights: Insight[] = []
  
  // Detectar asimetrías significativas
  musculos.forEach(m => {
    const { porcentaje, clasificacion, dominante } = calcularAsimetria(m.fuerza.R, m.fuerza.L)
    
    if (clasificacion === 'riesgo') {
      insights.push({
        tipo: 'alerta',
        mensaje: `⚠️ Desequilibrio crítico en ${m.nombreCorto}: ${porcentaje.toFixed(1)}% de asimetría`,
        musculo: m.id,
        severidad: 'alta'
      })
    } else if (clasificacion === 'moderado') {
      insights.push({
        tipo: 'alerta',
        mensaje: `Desequilibrio moderado en ${m.nombreCorto}: ${porcentaje.toFixed(1)}% (${dominante === 'R' ? 'derecha domina' : 'izquierda domina'})`,
        musculo: m.id,
        severidad: 'media'
      })
    }
  })
  
  // Detectar debilidades por región
  if (indice.trenSuperior < 30) {
    insights.push({
      tipo: 'recomendacion',
      mensaje: 'Tren superior por debajo del promedio. Priorizar ejercicios de empuje y tracción.',
      severidad: 'media'
    })
  }
  
  if (indice.core < 30) {
    insights.push({
      tipo: 'recomendacion',
      mensaje: 'Core débil detectado. Incorporar trabajo de estabilización y anti-rotación.',
      severidad: 'media'
    })
  }
  
  if (indice.trenInferior < 30) {
    insights.push({
      tipo: 'recomendacion',
      mensaje: 'Tren inferior necesita desarrollo. Enfocarse en patrones de sentadilla y cadena posterior.',
      severidad: 'media'
    })
  }
  
  // Detectar dominancia lateral general
  const derechistas = musculos.filter(m => m.fuerza.R > m.fuerza.L).length
  const izquierdistas = musculos.filter(m => m.fuerza.L > m.fuerza.R).length
  
  if (derechistas > izquierdistas * 1.5) {
    insights.push({
      tipo: 'info',
      mensaje: `Dominancia derecha generalizada (${derechistas}/${musculos.length} músculos)`,
      severidad: 'baja'
    })
  } else if (izquierdistas > derechistas * 1.5) {
    insights.push({
      tipo: 'info',
      mensaje: `Dominancia izquierda generalizada (${izquierdistas}/${musculos.length} músculos)`,
      severidad: 'baja'
    })
  }
  
  return insights
}

// ============================================================================
// COMPONENTE RADAR CHART
// ============================================================================

function RadarChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const center = size / 2
  const radius = size * 0.38
  const angleStep = (2 * Math.PI) / data.length
  
  const points = data.map((d, i) => {
    const angle = angleStep * i - Math.PI / 2
    const r = (d.value / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
      ...d
    }
  })
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  
  return (
    <svg width={size + 60} height={size + 40} viewBox={`-30 -10 ${size + 60} ${size + 40}`}>
      {/* Grid circles */}
      {[20, 40, 60, 80, 100].map(pct => (
        <circle
          key={pct}
          cx={center}
          cy={center}
          r={(pct / 100) * radius}
          fill="none"
          stroke="#3a4a3f"
          strokeWidth="0.5"
          strokeDasharray={pct === 100 ? "none" : "2,2"}
        />
      ))}
      
      {/* Axis lines */}
      {points.map((p, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={center + radius * Math.cos(angleStep * i - Math.PI / 2)}
          y2={center + radius * Math.sin(angleStep * i - Math.PI / 2)}
          stroke="#3a4a3f"
          strokeWidth="0.5"
        />
      ))}
      
      {/* Data polygon */}
      <path d={pathD} fill="rgba(19, 236, 109, 0.2)" stroke="#13ec6d" strokeWidth="2" />
      
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={p.color} stroke="#102218" strokeWidth="2" />
      ))}
      
      {/* Labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.labelX}
          y={p.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] font-bold fill-white"
        >
          {p.label}
        </text>
      ))}
      
      {/* Values */}
      {points.map((p, i) => {
        const angle = angleStep * i - Math.PI / 2
        const valueR = (p.value / 100) * radius
        return (
          <text
            key={`v-${i}`}
            x={center + valueR * Math.cos(angle) + 12}
            y={center + valueR * Math.sin(angle)}
            textAnchor="start"
            dominantBaseline="middle"
            className="text-[8px] font-bold"
            fill={p.color}
          >
            {p.value}
          </text>
        )
      })}
    </svg>
  )
}

// ============================================================================
// COMPONENTE HEATMAP CORPORAL
// ============================================================================

function HeatmapCorporal({ musculos, onSelectMusculo }: { musculos: MusculoEvaluado[]; onSelectMusculo: (id: string) => void }) {
  const getColor = (valor: number) => {
    if (valor === 0) return '#1a1a1a'
    if (valor < 30) return '#ef4444'
    if (valor < 50) return '#f59e0b'
    if (valor < 70) return '#13ec6d'
    return '#00f0ff'
  }
  
  const getMusculo = (id: string) => musculos.find(m => m.id === id)
  const getPromedio = (m?: MusculoEvaluado) => m ? (m.fuerza.R + m.fuerza.L) / 2 : 0
  const getAsimetria = (m?: MusculoEvaluado) => m ? calcularAsimetria(m.fuerza.R, m.fuerza.L) : { porcentaje: 0, clasificacion: 'optimo' }
  
  const musculo = (id: string) => getMusculo(id)
  const color = (id: string) => getColor(getPromedio(musculo(id)))
  const asimetriaColor = (id: string) => {
    const a = getAsimetria(musculo(id))
    if (a.clasificacion === 'riesgo') return 'stroke-red-500'
    if (a.clasificacion === 'moderado') return 'stroke-yellow-500'
    return ''
  }
  
  return (
    <div className="flex justify-center gap-4">
      {/* Vista Anterior */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase font-bold mb-1">Anterior</span>
        <svg viewBox="0 0 120 280" className="h-48">
          {/* Cabeza */}
          <circle cx="60" cy="20" r="12" fill="#1a1a1a" stroke="#444" strokeWidth="0.5" />
          
          {/* Pecho - Pectoral Mayor */}
          <path d="M38 45 Q60 40 82 45 L78 70 Q60 75 42 70 Z" fill={color('pectoral_mayor')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('pectoral_mayor')}`} onClick={() => onSelectMusculo('pectoral_mayor')} />
          
          {/* Deltoides */}
          <ellipse cx="32" cy="52" rx="10" ry="15" fill={color('deltoide_anterior')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('deltoide_anterior')} />
          <ellipse cx="88" cy="52" rx="10" ry="15" fill={color('deltoide_anterior')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('deltoide_anterior')} />
          
          {/* Bíceps */}
          <path d="M28 70 Q25 90 30 105 L38 105 Q40 85 35 70 Z" fill={color('biceps_braquial')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('biceps_braquial')}`} onClick={() => onSelectMusculo('biceps_braquial')} />
          <path d="M92 70 Q95 90 90 105 L82 105 Q80 85 85 70 Z" fill={color('biceps_braquial')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('biceps_braquial')} />
          
          {/* Abdominales */}
          <rect x="48" y="75" width="24" height="40" rx="3" fill={color('recto_abdominal')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('recto_abdominal')}`} onClick={() => onSelectMusculo('recto_abdominal')} />
          
          {/* Oblicuos */}
          <path d="M40 75 L48 75 L48 110 L38 100 Z" fill={color('oblicuos')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('oblicuos')}`} onClick={() => onSelectMusculo('oblicuos')} />
          <path d="M80 75 L72 75 L72 110 L82 100 Z" fill={color('oblicuos')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('oblicuos')} />
          
          {/* Cuádriceps */}
          <path d="M42 115 Q50 145 45 180 L60 180 L55 115 Z" fill={color('cuadriceps')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('cuadriceps')}`} onClick={() => onSelectMusculo('cuadriceps')} />
          <path d="M78 115 Q70 145 75 180 L60 180 L65 115 Z" fill={color('cuadriceps')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('cuadriceps')} />
          
          {/* Aductores */}
          <path d="M55 115 L60 160 L65 115 Z" fill={color('aductores')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('aductores')}`} onClick={() => onSelectMusculo('aductores')} />
          
          {/* Tibial */}
          <path d="M45 185 L50 230 L55 230 L52 185 Z" fill={color('tibial_anterior')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('tibial_anterior')}`} onClick={() => onSelectMusculo('tibial_anterior')} />
          <path d="M75 185 L70 230 L65 230 L68 185 Z" fill={color('tibial_anterior')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('tibial_anterior')} />
        </svg>
      </div>
      
      {/* Vista Posterior */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase font-bold mb-1">Posterior</span>
        <svg viewBox="0 0 120 280" className="h-48">
          {/* Cabeza */}
          <circle cx="60" cy="20" r="12" fill="#1a1a1a" stroke="#444" strokeWidth="0.5" />
          
          {/* Trapecio */}
          <path d="M60 30 L38 50 L60 65 L82 50 Z" fill={color('trapecio')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('trapecio')}`} onClick={() => onSelectMusculo('trapecio')} />
          
          {/* Deltoides Posterior */}
          <ellipse cx="30" cy="55" rx="10" ry="12" fill={color('deltoide_posterior')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('deltoide_posterior')}`} onClick={() => onSelectMusculo('deltoide_posterior')} />
          <ellipse cx="90" cy="55" rx="10" ry="12" fill={color('deltoide_posterior')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('deltoide_posterior')} />
          
          {/* Dorsal */}
          <path d="M42 55 L60 60 L78 55 L72 90 L48 90 Z" fill={color('dorsal_ancho')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('dorsal_ancho')}`} onClick={() => onSelectMusculo('dorsal_ancho')} />
          
          {/* Tríceps */}
          <path d="M28 65 Q22 85 26 105 L35 105 Q35 80 32 65 Z" fill={color('triceps_braquial')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('triceps_braquial')}`} onClick={() => onSelectMusculo('triceps_braquial')} />
          <path d="M92 65 Q98 85 94 105 L85 105 Q85 80 88 65 Z" fill={color('triceps_braquial')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('triceps_braquial')} />
          
          {/* Erectores / Lumbar */}
          <rect x="45" y="92" width="30" height="25" rx="3" fill={color('erectores_espinales')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('erectores_espinales')}`} onClick={() => onSelectMusculo('erectores_espinales')} />
          
          {/* Glúteo Mayor */}
          <ellipse cx="48" cy="125" rx="18" ry="20" fill={color('gluteo_mayor')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('gluteo_mayor')}`} onClick={() => onSelectMusculo('gluteo_mayor')} />
          <ellipse cx="72" cy="125" rx="18" ry="20" fill={color('gluteo_mayor')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('gluteo_mayor')} />
          
          {/* Isquiotibiales */}
          <path d="M40 145 Q45 170 42 195 L55 195 L52 145 Z" fill={color('isquiotibiales')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('isquiotibiales')}`} onClick={() => onSelectMusculo('isquiotibiales')} />
          <path d="M80 145 Q75 170 78 195 L65 195 L68 145 Z" fill={color('isquiotibiales')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('isquiotibiales')} />
          
          {/* Gemelos */}
          <path d="M42 200 Q48 220 45 240 L58 240 L55 200 Z" fill={color('gastrocnemio')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('gastrocnemio')}`} onClick={() => onSelectMusculo('gastrocnemio')} />
          <path d="M78 200 Q72 220 75 240 L62 240 L65 200 Z" fill={color('gastrocnemio')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('gastrocnemio')} />
          
          {/* Sóleo */}
          <path d="M48 230 L55 260 L60 260 L58 230 Z" fill={color('soleo')} stroke="#444" strokeWidth="0.5" className={`cursor-pointer hover:stroke-[#13ec6d] ${asimetriaColor('soleo')}`} onClick={() => onSelectMusculo('soleo')} />
          <path d="M72 230 L65 260 L60 260 L62 230 Z" fill={color('soleo')} stroke="#444" strokeWidth="0.5" className="cursor-pointer hover:stroke-[#13ec6d]" onClick={() => onSelectMusculo('soleo')} />
        </svg>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE GRÁFICA FUERZA-TIEMPO
// ============================================================================

interface GraficaFuerzaTiempoProps {
  datos: FuerzaDataPoint[]
  fuerzaPico: number
  tiempoPico: number
  rfd: number
  unidad: UnidadFuerza
  duracion: number
}

function GraficaFuerzaTiempo({ datos, fuerzaPico, tiempoPico, rfd, unidad, duracion }: GraficaFuerzaTiempoProps) {
  // Valores por defecto para evitar divisiones por cero
  const maxTiempo = Math.max(3000, duracion, 1)
  const maxFuerza = Math.max(60, fuerzaPico * 1.3, 1)
  
  const width = 400
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  const xScale = (t: number) => padding.left + (t / maxTiempo) * chartWidth
  const yScale = (f: number) => padding.top + chartHeight - (f / maxFuerza) * chartHeight
  
  // Generar path suave con curvas de Bézier
  const generarPath = (puntos: FuerzaDataPoint[]) => {
    if (puntos.length < 2) return ''
    
    let path = `M ${xScale(puntos[0].tiempo)} ${yScale(puntos[0].fuerza)}`
    
    for (let i = 1; i < puntos.length; i++) {
      const prev = puntos[i - 1]
      const curr = puntos[i]
      
      // Curva de Bézier cuadrática para suavizar
      const cpX = xScale((prev.tiempo + curr.tiempo) / 2)
      path += ` Q ${cpX} ${yScale(prev.fuerza)}, ${xScale(curr.tiempo)} ${yScale(curr.fuerza)}`
    }
    
    return path
  }
  
  // Mostrar mensaje si no hay datos
  const hayDatos = datos && datos.length > 0
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Curva Fuerza-Tiempo
        </span>
        {hayDatos && (
          <span className="text-[9px] text-[#13ec6d] font-mono">
            {datos.length} puntos
          </span>
        )}
      </div>
      
      <div className="bg-[#102218] rounded-xl p-3 border border-white/10">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: '150px' }}>
          {/* Fondo con gradiente */}
          <defs>
            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#13ec6d" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="#13ec6d" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff"/>
              <stop offset="50%" stopColor="#13ec6d"/>
              <stop offset="100%" stopColor="#13ec6d"/>
            </linearGradient>
          </defs>
          
          {/* Grid horizontal */}
          {Array.from({ length: 6 }).map((_, i) => {
            const f = (maxFuerza / 5) * i
            return (
              <g key={`h${i}`}>
                <line 
                  x1={padding.left} 
                  y1={yScale(f)} 
                  x2={width - padding.right} 
                  y2={yScale(f)} 
                  stroke="#3a4a3f" 
                  strokeWidth="0.5" 
                  strokeDasharray={i === 0 ? "none" : "3,3"} 
                />
                <text 
                  x={padding.left - 5} 
                  y={yScale(f) + 3} 
                  fill="#6b7b6f" 
                  fontSize="8" 
                  textAnchor="end"
                >
                  {Math.round(f)}
                </text>
              </g>
            )
          })}
          
          {/* Grid vertical */}
          {Array.from({ length: 7 }).map((_, i) => {
            const t = (maxTiempo / 6) * i
            return (
              <line 
                key={`v${i}`} 
                x1={xScale(t)} 
                y1={padding.top} 
                x2={xScale(t)} 
                y2={height - padding.bottom} 
                stroke="#3a4a3f" 
                strokeWidth="0.5" 
                strokeDasharray="3,3" 
              />
            )
          })}
          
          {/* Zona RFD (0-200ms) */}
          <rect 
            x={xScale(0)} 
            y={padding.top} 
            width={xScale(200) - xScale(0)} 
            height={chartHeight} 
            fill="#00f0ff" 
            opacity="0.1" 
          />
          <text x={xScale(100)} y={padding.top + 12} fill="#00f0ff" fontSize="8" textAnchor="middle" fontWeight="bold">
            RFD
          </text>
          
          {/* Curva de fuerza - Área bajo la curva */}
          {hayDatos && datos.length > 1 && (
            <path 
              d={`${generarPath(datos)} L ${xScale(datos[datos.length - 1].tiempo)} ${height - padding.bottom} L ${xScale(datos[0].tiempo)} ${height - padding.bottom} Z`}
              fill="url(#gridGrad)"
            />
          )}
          
          {/* Curva de fuerza - Línea principal */}
          {hayDatos && datos.length > 1 && (
            <path 
              d={generarPath(datos)} 
              fill="none" 
              stroke="url(#lineGrad)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Punto actual (último) */}
          {hayDatos && datos.length > 0 && (
            <circle 
              cx={xScale(datos[datos.length - 1].tiempo)} 
              cy={yScale(datos[datos.length - 1].fuerza)} 
              r="3" 
              fill="#13ec6d"
              opacity="0.5"
            >
              <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite"/>
            </circle>
          )}
          
          {/* Pico de fuerza */}
          {fuerzaPico > 0 && (
            <g>
              <line 
                x1={xScale(tiempoPico)} 
                y1={yScale(fuerzaPico)} 
                x2={xScale(tiempoPico)} 
                y2={height - padding.bottom} 
                stroke="#13ec6d" 
                strokeWidth="1" 
                strokeDasharray="3,3"
                opacity="0.5"
              />
              <circle 
                cx={xScale(tiempoPico)} 
                cy={yScale(fuerzaPico)} 
                r="5" 
                fill="#13ec6d" 
                stroke="#102218" 
                strokeWidth="2"
              />
              <text 
                x={xScale(tiempoPico)} 
                y={yScale(fuerzaPico) - 12} 
                fill="#13ec6d" 
                fontSize="9" 
                textAnchor="middle" 
                fontWeight="bold"
              >
                {fuerzaPico.toFixed(1)} {unidad}
              </text>
            </g>
          )}
          
          {/* Mensaje si no hay datos */}
          {!hayDatos && (
            <text 
              x={width / 2} 
              y={height / 2} 
              fill="#6b7b6f" 
              fontSize="12" 
              textAnchor="middle"
            >
              Inicia el test para ver la gráfica
            </text>
          )}
          
          {/* Ejes */}
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#5a6a5f" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#5a6a5f" strokeWidth="1" />
          
          {/* Etiquetas de ejes */}
          <text x={width / 2} y={height - 8} fill="#6b7b6f" fontSize="10" textAnchor="middle">
            Tiempo (ms)
          </text>
          <text x={15} y={height / 2} fill="#6b7b6f" fontSize="10" textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>
            Fuerza ({unidad})
          </text>
          
          {/* Escala tiempo */}
          <text x={xScale(0)} y={height - padding.bottom + 15} fill="#6b7b6f" fontSize="8" textAnchor="middle">0</text>
          <text x={xScale(maxTiempo / 2)} y={height - padding.bottom + 15} fill="#6b7b6f" fontSize="8" textAnchor="middle">{Math.round(maxTiempo / 2)}</text>
          <text x={xScale(maxTiempo)} y={height - padding.bottom + 15} fill="#6b7b6f" fontSize="8" textAnchor="middle">{Math.round(maxTiempo)}</text>
        </svg>
      </div>
      
      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gradient-to-r from-[#00f0ff] to-[#13ec6d]" />
          <span className="text-[9px] text-slate-400">Fuerza</span>
        </div>
        {fuerzaPico > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#13ec6d]" />
            <span className="text-[9px] text-slate-400">Pico</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-[#00f0ff]" style={{ opacity: 0.3 }} />
          <span className="text-[9px] text-slate-400">RFD (0-200ms)</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL - SISTEMA AVANZADO DE EVALUACIÓN ISOMÉTRICA
// ============================================================================

export default function EvaluacionFuerzaIsometrica() {
  // Estado de músculos y evaluación
  const [musculos, setMusculos] = useState<MusculoEvaluado[]>(MUSCULOS_ISOMETRICOS)
  const [musculoSeleccionado, setMusculoSeleccionado] = useState<string | null>(null)
  const [ladoActivo, setLadoActivo] = useState<Lado>('R')
  const [regionActiva, setRegionActiva] = useState<RegionCuerpo | 'all'>('all')
  
  // Estado del sensor
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('desconectado')
  const [estadoTest, setEstadoTest] = useState<EstadoTest>('inactivo')
  const [serialSoportado, setSerialSoportado] = useState(false)
  const [unidadFuerza, setUnidadFuerza] = useState<UnidadFuerza>('kg')
  
  // Datos de fuerza actuales
  const [fuerzaActual, setFuerzaActual] = useState(0)
  const [fuerzaPico, setFuerzaPico] = useState(0)
  const [tiempoPico, setTiempoPico] = useState(0)
  const [rfd, setRfd] = useState(0)
  const [duracionTest, setDuracionTest] = useState(0)
  const [fuerzaMedia, setFuerzaMedia] = useState(0)
  
  // Estado para datos de fuerza - NECESARIO para que la gráfica se actualice
  const [datosFuerza, setDatosFuerza] = useState<FuerzaDataPoint[]>([])
  
  // Evaluaciones guardadas
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionIsometricaCompleta[]>([])
  const [mostrarCalibracion, setMostrarCalibracion] = useState(false)
  const [calibracion] = useState<Calibracion>({ offset: 0, factorEscala: 1, fecha: new Date().toISOString() })
  
  // Vista
  const [vista, setVista] = useState<'evaluacion' | 'resultados' | 'historial'>('evaluacion')
  
  // Debug log
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [mostrarDebug, setMostrarDebug] = useState(false)
  
  const agregarLog = (mensaje: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [`[${timestamp}] ${mensaje}`, ...prev.slice(0, 19)])
  }
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const datosFuerzaRef = useRef<FuerzaDataPoint[]>([])
  const picoRef = useRef(0)
  const portRef = useRef<SerialPort | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  const contadorActualizacionRef = useRef(0)
  
  // Cálculos derivados
  const resultadosAsimetria = useMemo<ResultadoAsimetria[]>(() => {
    return musculos.map(m => {
      const { porcentaje, clasificacion, dominante } = calcularAsimetria(m.fuerza.R, m.fuerza.L)
      return {
        musculoId: m.id,
        musculoNombre: m.nombreCorto,
        derecha: m.fuerza.R,
        izquierda: m.fuerza.L,
        promedio: (m.fuerza.R + m.fuerza.L) / 2,
        asimetriaPorcentaje: porcentaje,
        clasificacion,
        dominante
      }
    })
  }, [musculos])
  
  const indiceGlobal = useMemo(() => calcularIndiceGlobal(musculos), [musculos])
  
  const insights = useMemo(() => generarInsights(musculos, indiceGlobal), [musculos, indiceGlobal])
  
  const musculosFiltrados = useMemo(() => {
    if (regionActiva === 'all') return musculos
    return musculos.filter(m => m.region === regionActiva)
  }, [musculos, regionActiva])
  
  // Efectos
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        const serial = (navigator as any).serial
        if (serial && typeof serial.requestPort === 'function') setSerialSoportado(true)
      } catch (e) {}
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
  
  // Funciones del sensor
  const conectarArduino = async () => {
    if (!serialSoportado) {
      agregarLog('ERROR: Web Serial no soportado')
      return
    }
    try {
      agregarLog('Solicitando puerto serial...')
      const port = await (navigator as any).serial.requestPort()
      agregarLog('Abriendo conexión 115200 baud...')
      await port.open({ baudRate: 115200 })
      portRef.current = port
      writerRef.current = port.writable?.getWriter() || null
      setEstadoConexion('conectado')
      setEstadoTest('listo')
      agregarLog('✓ CONECTADO - Sensor listo')
      
      const reader = port.readable?.getReader()
      if (reader) {
        readerRef.current = reader
        const decoder = new TextDecoder()
        let buffer = ''
        const leerLoop = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              for (const line of lines) procesarLineaArduino(line.trim())
            }
          } catch (e) {
            agregarLog('ERROR lectura: ' + (e as Error).message)
          }
        }
        leerLoop()
      }
    } catch (e) {
      agregarLog('ERROR conexión: ' + (e as Error).message)
      setEstadoConexion('error')
    }
  }
  
  const desconectarArduino = async () => {
    try {
      agregarLog('Desconectando sensor...')
      if (writerRef.current) { writerRef.current.releaseLock(); writerRef.current = null }
      if (readerRef.current) { readerRef.current.releaseLock(); readerRef.current = null }
      if (portRef.current) { await portRef.current.close(); portRef.current = null }
      setEstadoConexion('desconectado')
      setEstadoTest('inactivo')
      agregarLog('✓ Sensor desconectado')
    } catch (e) {
      agregarLog('ERROR desconexión: ' + (e as Error).message)
    }
  }
  
  // Enviar comando al Arduino
  const enviarComandoArduino = async (comando: string) => {
    if (!writerRef.current) {
      agregarLog('ERROR: No hay conexión con sensor')
      return
    }
    try {
      const encoder = new TextEncoder()
      await writerRef.current.write(encoder.encode(comando))
      agregarLog(`Comando enviado: "${comando === ' ' ? 'SPACE' : comando}"`)
    } catch (e) {
      agregarLog('ERROR enviando comando: ' + (e as Error).message)
    }
  }

  // Comandos del Arduino
  const cmdIniciarTest = () => enviarComandoArduino(' ')  // ESPACIO
  const cmdDestarar = () => enviarComandoArduino('t')      // Destarar
  const cmdCalibrar = () => enviarComandoArduino('c')      // Calibrar

  const procesarLineaArduino = (linea: string) => {
    console.log('[Arduino]', linea)  // Debug console
    
    if (linea.includes('>>> Test listo')) {
      setEstadoTest('listo')
      agregarLog('ARDUINO: Test listo')
    }
    if (linea.includes('>>> Intento iniciado')) {
      setEstadoTest('medicion')
      datosFuerzaRef.current = []
      picoRef.current = 0
      contadorActualizacionRef.current = 0
      setFuerzaPico(0); setFuerzaActual(0); setRfd(0); setDuracionTest(0); setTiempoPico(0)
      setDatosFuerza([])  // Limpiar gráfica
      agregarLog('▶ INTENTO INICIADO - Grabando datos...')
    }
    if (linea.includes('<<< Fin del intento')) {
      setEstadoTest('finalizado')
      // Actualizar gráfica con todos los datos finales
      setDatosFuerza([...datosFuerzaRef.current])
      if (datosFuerzaRef.current.length > 0) {
        const suma = datosFuerzaRef.current.reduce((a, b) => a + b.fuerza, 0)
        setFuerzaMedia(suma / datosFuerzaRef.current.length)
      }
      agregarLog(`⏹ FIN - ${datosFuerzaRef.current.length} puntos capturados`)
    }
    if (linea.includes('Pico de fuerza (kgf):')) {
      const m = linea.match(/Pico de fuerza \(kgf\):\s*([\d.]+)/)
      if (m) {
        setFuerzaPico(parseFloat(m[1]))
        agregarLog(`PICO: ${m[1]} kgf`)
      }
    }
    if (linea.includes('RFD 0-200 ms')) {
      const m = linea.match(/RFD 0-200 ms \(kgf\/s\):\s*([\d.]+)/)
      if (m) {
        setRfd(parseFloat(m[1]))
        agregarLog(`RFD: ${m[1]} kgf/s`)
      }
    }
    if (linea.includes('>>> Destarado')) {
      agregarLog('✓ Sensor destarado')
    }
    if (linea.includes('=== CALIBRACION')) {
      agregarLog('CALIBRACIÓN iniciada...')
    }
    if (linea.includes('=== CALIBRACION COMPLETA')) {
      agregarLog('✓ Calibración completada')
    }
    // Parsear datos de fuerza: "tiempo,fuerza"
    if (linea.includes(',') && !linea.includes('===') && !linea.includes('>>>') && !linea.includes('<<<') && !linea.includes('Pico') && !linea.includes('RFD')) {
      const partes = linea.split(',')
      if (partes.length >= 2) {
        const tiempo = parseInt(partes[0])
        const fuerza = parseFloat(partes[1])
        if (!isNaN(tiempo) && !isNaN(fuerza)) {
          datosFuerzaRef.current.push({ tiempo, fuerza })
          setFuerzaActual(fuerza)
          if (fuerza > picoRef.current) {
            picoRef.current = fuerza
            setFuerzaPico(fuerza)
            setTiempoPico(tiempo)
          }
          setDuracionTest(tiempo)
          
          // ACTUALIZAR GRÁFICA cada 3 puntos para tiempo real
          contadorActualizacionRef.current++
          if (contadorActualizacionRef.current >= 3) {
            setDatosFuerza([...datosFuerzaRef.current])
            contadorActualizacionRef.current = 0
          }
        }
      }
    }
  }
  
  const iniciarSimulacion = () => {
    // Limpiar todo
    datosFuerzaRef.current = []
    picoRef.current = 0
    setFuerzaPico(0)
    setFuerzaActual(0)
    setRfd(0)
    setDuracionTest(0)
    setTiempoPico(0)
    setFuerzaMedia(0)
    setDatosFuerza([])
    setEstadoTest('medicion')
    
    let tiempo = 0
    let ultimaFuerza = 0
    const picoObjetivo = 35 + Math.random() * 20
    let contadorActualizacion = 0
    
    intervalRef.current = setInterval(() => {
      tiempo += 20
      let fuerza = 0
      
      if (tiempo < 200) {
        // Fase de subida rápida (RFD)
        fuerza = Math.min(picoObjetivo * 0.8, 2 + (tiempo / 200) * picoObjetivo * 0.8 * Math.pow(tiempo / 200, 0.5))
      } else if (tiempo < 2500) {
        // Fase de meseta con oscilaciones
        fuerza = picoObjetivo + Math.sin(tiempo / 100) * 2 + Math.random() * 1.5
      } else if (tiempo < 3000) {
        // Fase de bajada
        fuerza = Math.max(0, ultimaFuerza - 3)
      } else {
        // Fin del test
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setEstadoTest('finalizado')
        
        // Calcular RFD
        const datosTempranos = datosFuerzaRef.current.filter(p => p.tiempo <= 200)
        if (datosTempranos.length > 1) {
          const f200 = datosTempranos[datosTempranos.length - 1].fuerza
          setRfd(Math.round(f200 / 0.2))
        }
        
        // Calcular fuerza media
        const suma = datosFuerzaRef.current.reduce((a, b) => a + b.fuerza, 0)
        setFuerzaMedia(suma / datosFuerzaRef.current.length)
        setFuerzaActual(0)
        
        // Actualizar estado con TODOS los datos finales
        setDatosFuerza([...datosFuerzaRef.current])
        return
      }
      
      ultimaFuerza = fuerza
      
      // Agregar punto de datos
      const nuevoPunto = { tiempo, fuerza }
      datosFuerzaRef.current.push(nuevoPunto)
      
      // Actualizar estado cada 5 puntos para mejor rendimiento visual
      contadorActualizacion++
      if (contadorActualizacion >= 5) {
        setDatosFuerza([...datosFuerzaRef.current])
        contadorActualizacion = 0
      }
      
      setFuerzaActual(fuerza)
      setDuracionTest(tiempo)
      
      if (fuerza > picoRef.current) {
        picoRef.current = fuerza
        setFuerzaPico(fuerza)
        setTiempoPico(tiempo)
      }
    }, 20)
  }
  
  const guardarEvaluacion = async () => {
    if (!musculoSeleccionado || fuerzaPico === 0) return
    
    // Calcular métricas adicionales desde la curva de fuerza
    const calcularRFD = (desdeMs: number, hastaMs: number): number => {
      const puntoInicio = datosFuerzaRef.current.find(p => p.tiempo >= desdeMs)
      const puntoFin = datosFuerzaRef.current.find(p => p.tiempo >= hastaMs)
      if (!puntoInicio || !puntoFin) return 0
      const deltaFuerza = puntoFin.fuerza - puntoInicio.fuerza
      const deltaTiempo = (hastaMs - desdeMs) / 1000 // en segundos
      return Math.round(deltaFuerza / deltaTiempo)
    }
    
    const calcularFuerzaEnTiempo = (ms: number): number => {
      const punto = datosFuerzaRef.current.find(p => p.tiempo >= ms)
      return punto?.fuerza || 0
    }
    
    const calcularTiempoHastaPorcentaje = (porcentaje: number): number => {
      const objetivo = fuerzaPico * (porcentaje / 100)
      const punto = datosFuerzaRef.current.find(p => p.fuerza >= objetivo)
      return punto?.tiempo || 0
    }
    
    // Calcular todos los RFD
    const rfd50ms = calcularRFD(0, 50)
    const rfd100ms = calcularRFD(0, 100)
    const rfd150ms = calcularRFD(0, 150)
    const rfd200ms = calcularRFD(0, 200)
    
    // Tiempos hasta porcentajes de Fmax
    const timeTo50Fmax = calcularTiempoHastaPorcentaje(50)
    const timeTo90Fmax = calcularTiempoHastaPorcentaje(90)
    
    // Fuerza a 200ms
    const forceAt200ms = calcularFuerzaEnTiempo(200)
    
    // Mapa de músculo a código de Supabase
    const muscleCodeMap: Record<string, string> = {
      'pectoral_mayor': 'pectoral',
      'dorsal_ancho': 'dorsal',
      'trapecio': 'trapecio',
      'deltoide_anterior': 'deltoide_ant',
      'deltoide_medio': 'deltoide_med',
      'deltoide_posterior': 'deltoide_post',
      'biceps_braquial': 'biceps',
      'triceps_braquial': 'triceps',
      'recto_abdominal': 'abdominal',
      'oblicuos': 'oblicuos',
      'erectores_espinales': 'erector_spinae',
      'gluteo_mayor': 'glute_max',
      'gluteo_medio': 'glute_med',
      'cuadriceps': 'quads',
      'isquiotibiales': 'hamstrings',
      'aductores': 'adductors',
      'gastrocnemio': 'gastrocnemius',
      'soleo': 'soleus',
      'tibial_anterior': 'tibialis_ant',
    }
    
    // Preparar datos para Supabase
    const evaluationData = {
      athleteId: 'demo-user', // TODO: obtener del usuario logueado
      athleteName: 'Usuario Demo',
      muscleEvaluated: muscleCodeMap[musculoSeleccionado] || musculoSeleccionado,
      side: ladoActivo === 'R' ? 'Derecho' as const : 'Izquierdo' as const,
      unit: unidadFuerza,
      
      // Métricas principales
      fmax: fuerzaPico,
      forceAt200ms: forceAt200ms,
      averageForce: fuerzaMedia,
      testDuration: duracionTest / 1000, // en segundos
      
      // Métricas de tiempo
      timeToFmax: tiempoPico,
      timeTo50Fmax: timeTo50Fmax,
      timeTo90Fmax: timeTo90Fmax,
      
      // RFD
      rfdMax: rfd,
      rfd50ms: rfd50ms,
      rfd100ms: rfd100ms,
      rfd150ms: rfd150ms,
      rfd200ms: rfd200ms || rfd,
      
      // Curva de fuerza
      forceCurve: datosFuerzaRef.current.map(p => ({
        time: p.tiempo / 1000, // en segundos
        force: p.fuerza
      })),
      
      // Metadatos
      samplingRate: 50,
      deviceInfo: {
        model: 'BIOMOV-ForceSensor-v1',
        connection: estadoConexion === 'conectado' ? 'serial' : 'simulated'
      }
    }
    
    // Guardar localmente
    const nueva: EvaluacionIsometricaCompleta = {
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      musculo: musculoSeleccionado,
      lado: ladoActivo,
      fuerzaMaxima: fuerzaPico,
      tiempoHastaFmax: tiempoPico,
      rfd: rfd,
      fuerzaMedia: fuerzaMedia,
      duracionTest: duracionTest,
      unidad: unidadFuerza
    }
    
    setEvaluaciones(prev => [...prev, nueva])
    
    // Actualizar músculo
    setMusculos(prev => prev.map(m => {
      if (m.id === musculoSeleccionado) {
        return {
          ...m,
          fuerza: {
            ...m.fuerza,
            [ladoActivo]: fuerzaPico
          }
        }
      }
      return m
    }))
    
    // Guardar en Supabase
    try {
      agregarLog('Guardando en Supabase...')
      const response = await fetch('/api/force-isometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        agregarLog(`✓ Guardado en Supabase: ID ${result.evaluation?.id?.slice(0, 8)}...`)
      } else {
        agregarLog(`ERROR Supabase: ${result.error}`)
      }
    } catch (e) {
      agregarLog(`ERROR guardando: ${(e as Error).message}`)
    }
    
    // Reiniciar
    setEstadoTest('listo')
    setFuerzaPico(0); setFuerzaActual(0); setRfd(0); setDuracionTest(0); setTiempoPico(0); setFuerzaMedia(0)
    setDatosFuerza([])
    datosFuerzaRef.current = []
    picoRef.current = 0
  }
  
  const actualizarFuerzaManual = (musculoId: string, lado: Lado, valor: number) => {
    setMusculos(prev => prev.map(m => {
      if (m.id === musculoId) {
        return { ...m, fuerza: { ...m.fuerza, [lado]: valor } }
      }
      return m
    }))
  }
  
  // Colores para clasificación de asimetría
  const getClasificacionColor = (c: ClasificacionAsimetria) => {
    switch (c) {
      case 'optimo': return 'text-[#13ec6d] bg-[#13ec6d]/20'
      case 'leve': return 'text-[#f59e0b] bg-[#f59e0b]/20'
      case 'moderado': return 'text-[#f97316] bg-[#f97316]/20'
      case 'riesgo': return 'text-red-400 bg-red-500/20'
    }
  }
  
  return (
    <div className="flex-1 flex flex-col min-h-screen pb-20 bg-[#102218]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#102218]/95 backdrop-blur-md border-b border-[#13ec6d]/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Evaluación de Fuerza Isométrica</h1>
            <p className="text-[10px] text-slate-400">Análisis Bilateral por Grupos Musculares</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
              estadoConexion === 'conectado' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 'bg-slate-500/20 text-slate-400'
            }`}>
              {estadoConexion === 'conectado' ? '● Conectado' : '○ Sin Sensor'}
            </span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {/* Tabs de navegación */}
        <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10">
          {[
            { id: 'evaluacion', label: 'Evaluación', icon: 'sensors' },
            { id: 'resultados', label: 'Resultados', icon: 'analytics' },
            { id: 'historial', label: 'Historial', icon: 'history' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setVista(tab.id as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                vista === tab.id ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icono name={tab.icon} className="text-sm" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* ========== VISTA EVALUACIÓN ========== */}
        {vista === 'evaluacion' && (
          <>
            {/* Heatmap Corporal */}
            <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Icono name="accessibility_new" className="text-[#13ec6d]" />
                  Mapa de Fuerza Corporal
                </h2>
                <div className="flex gap-1">
                  {[['upper', 'T.Superior'], ['core', 'Core'], ['lower', 'T.Inferior'], ['all', 'Todo']].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setRegionActiva(id as any)}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                        regionActiva === id ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#102218] text-slate-400 border border-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              <HeatmapCorporal musculos={musculos} onSelectMusculo={setMusculoSeleccionado} />
              
              {/* Leyenda */}
              <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#1a1a1a]" />
                  <span className="text-[9px] text-slate-400">Sin datos</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#ef4444]" />
                  <span className="text-[9px] text-slate-400">Bajo</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#f59e0b]" />
                  <span className="text-[9px] text-slate-400">Medio</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#13ec6d]" />
                  <span className="text-[9px] text-slate-400">Bueno</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#00f0ff]" />
                  <span className="text-[9px] text-slate-400">Alto</span>
                </div>
              </div>
            </section>
            
            {/* Selector de músculo y lado */}
            <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icono name="fitness_center" className="text-[#f59e0b]" />
                Seleccionar Músculo y Lado
              </h3>
              
              {/* Músculos por región */}
              <div className="space-y-3">
                {REGIONES.map(region => {
                  const musculosRegion = musculosFiltrados.filter(m => m.region === region.id)
                  if (musculosRegion.length === 0) return null
                  
                  return (
                    <div key={region.id}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{region.nombre}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {musculosRegion.map(m => (
                          <button
                            key={m.id}
                            onClick={() => setMusculoSeleccionado(m.id)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              musculoSeleccionado === m.id
                                ? 'bg-[#13ec6d]/20 border-[#13ec6d] text-white'
                                : 'bg-[#102218] border-white/5 text-slate-300 hover:border-white/20'
                            }`}
                          >
                            <p className="text-xs font-bold">{m.nombreCorto}</p>
                            <p className="text-[9px] text-slate-500">{m.fuerza.R}/{m.fuerza.L} kg</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Selector de lado */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-bold text-slate-400 mb-2">Lado a Evaluar</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLadoActivo('R')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      ladoActivo === 'R' ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#102218] text-white border border-white/10'
                    }`}
                  >
                    Derecho (R)
                  </button>
                  <button
                    onClick={() => setLadoActivo('L')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      ladoActivo === 'L' ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#102218] text-white border border-white/10'
                    }`}
                  >
                    Izquierdo (L)
                  </button>
                </div>
              </div>
            </section>
            
            {/* Panel Sensor de Fuerza */}
            <section className={`rounded-xl p-4 border ${
              estadoConexion === 'conectado' ? 'border-[#13ec6d]/50 bg-[#193324]' :
              estadoConexion === 'error' ? 'border-red-500/50 bg-[#193324]' :
              'border-[#00f0ff]/30 bg-[#193324]'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    estadoConexion === 'conectado' ? 'bg-[#13ec6d]/20' : 'bg-[#00f0ff]/20'
                  }`}>
                    <Icono name="sensors" className={estadoConexion === 'conectado' ? 'text-[#13ec6d]' : 'text-[#00f0ff]'} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Sensor de Fuerza HX711</p>
                    <p className="text-[10px] text-slate-400">
                      {estadoConexion === 'conectado' ? '● Conectado • 115200 baud' : '○ Desconectado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {estadoConexion === 'conectado' ? (
                    <button onClick={desconectarArduino} className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={conectarArduino}
                      disabled={!serialSoportado}
                      className="px-3 py-1.5 bg-[#13ec6d] text-[#102218] rounded-lg text-[10px] font-bold disabled:opacity-50"
                    >
                      {serialSoportado ? 'Conectar Sensor' : 'Web Serial no soportado'}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Display de fuerza */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#102218] rounded-lg p-2 text-center">
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Actual</p>
                  <p className="text-xl font-bold text-[#00f0ff] font-mono">{fuerzaActual.toFixed(1)}</p>
                  <p className="text-[8px] text-slate-500">{unidadFuerza}</p>
                </div>
                <div className="bg-[#102218] rounded-lg p-2 text-center">
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Pico</p>
                  <p className="text-xl font-bold text-[#13ec6d] font-mono">{fuerzaPico.toFixed(1)}</p>
                  <p className="text-[8px] text-slate-500">{unidadFuerza}</p>
                </div>
                <div className="bg-[#102218] rounded-lg p-2 text-center">
                  <p className="text-[8px] text-slate-500 uppercase font-bold">RFD</p>
                  <p className="text-xl font-bold text-white font-mono">{rfd.toFixed(0)}</p>
                  <p className="text-[8px] text-slate-500">{unidadFuerza}/s</p>
                </div>
              </div>
              
              {/* Comandos del Arduino - Solo cuando está conectado */}
              {estadoConexion === 'conectado' && (
                <div className="border-t border-white/10 pt-3 mt-3">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-2">Comandos del Sensor</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={cmdDestarar}
                      className="py-2 bg-[#102218] border border-[#00f0ff]/30 rounded-lg text-[10px] font-bold text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-all flex flex-col items-center gap-1"
                    >
                      <Icono name="balance" className="text-base" />
                      <span>Destarar [t]</span>
                    </button>
                    <button 
                      onClick={cmdIniciarTest}
                      disabled={estadoTest === 'medicion'}
                      className="py-2 bg-[#13ec6d] text-[#102218] rounded-lg text-[10px] font-bold hover:bg-[#13ec6d]/80 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                    >
                      <Icono name="play_arrow" className="text-base" />
                      <span>Iniciar [ESP]</span>
                    </button>
                    <button 
                      onClick={cmdCalibrar}
                      className="py-2 bg-[#102218] border border-[#f59e0b]/30 rounded-lg text-[10px] font-bold text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all flex flex-col items-center gap-1"
                    >
                      <Icono name="tune" className="text-base" />
                      <span>Calibrar [c]</span>
                    </button>
                  </div>
                  <p className="text-[8px] text-slate-500 mt-2 text-center">
                    Muestreo: 50 Hz • RFD: 0-200 ms • Unidad: kgf
                  </p>
                </div>
              )}
            </section>
            
            {/* Test Isométrico */}
            <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                <Icono name="monitor_heart" className="text-[#f59e0b]" />
                Test Isométrico de Fuerza
                {musculoSeleccionado && (
                  <span className="ml-auto text-[#13ec6d] text-xs">
                    {musculos.find(m => m.id === musculoSeleccionado)?.nombreCorto} ({ladoActivo})
                  </span>
                )}
              </h3>
              
              {/* Gráfica */}
              <div className="mb-4">
                <GraficaFuerzaTiempo
                  datos={datosFuerza}
                  fuerzaPico={fuerzaPico}
                  tiempoPico={tiempoPico}
                  rfd={rfd}
                  unidad={unidadFuerza}
                  duracion={duracionTest}
                />
              </div>
              
              {/* Controles */}
              <div className="space-y-2">
                {/* Estado info */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    estadoTest === 'inactivo' ? 'bg-slate-500/20 text-slate-400' :
                    estadoTest === 'listo' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                    estadoTest === 'medicion' ? 'bg-[#13ec6d]/20 text-[#13ec6d] animate-pulse' :
                    'bg-[#00f0ff]/20 text-[#00f0ff]'
                  }`}>
                    {estadoTest === 'inactivo' ? 'SIN INICIAR' :
                     estadoTest === 'listo' ? 'LISTO PARA MEDIR' :
                     estadoTest === 'medicion' ? 'MIDIENDO...' :
                     'TEST COMPLETADO'}
                  </span>
                  <span className="text-slate-500">
                    {datosFuerza.length > 0 ? `${datosFuerza.length} puntos` : '---'}
                  </span>
                </div>
                
                {/* Botones */}
                <div className="flex gap-2">
                  {estadoTest === 'inactivo' && (
                    <button 
                      onClick={() => setEstadoTest('listo')} 
                      className="flex-1 py-2.5 bg-[#13ec6d]/20 border border-[#13ec6d]/50 text-[#13ec6d] rounded-lg text-xs font-bold hover:bg-[#13ec6d]/30 transition-all"
                    >
                      Preparar Test
                    </button>
                  )}
                  {estadoTest === 'listo' && (
                    <button 
                      onClick={() => {
                        // Si hay sensor conectado, enviar comando al Arduino
                        if (estadoConexion === 'conectado') {
                          cmdIniciarTest()
                        } else {
                          // Si no hay sensor, usar simulación
                          iniciarSimulacion()
                        }
                      }} 
                      className="flex-1 py-3 bg-[#13ec6d] text-[#102218] rounded-lg text-sm font-bold animate-pulse hover:bg-[#13ec6d]/90 transition-all"
                    >
                      {estadoConexion === 'conectado' ? '▶ INICIAR TEST (SENSOR)' : '▶ INICIAR MEDICIÓN (SIM)'}
                    </button>
                  )}
                  {estadoTest === 'medicion' && (
                    <button 
                      onClick={() => { 
                        if (intervalRef.current) {
                          clearInterval(intervalRef.current)
                          intervalRef.current = null
                        }
                        // Actualizar datos finales
                        setDatosFuerza([...datosFuerzaRef.current])
                        setEstadoTest('finalizado')
                        setFuerzaActual(0)
                      }} 
                      className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all"
                    >
                      ⏹ DETENER TEST
                    </button>
                  )}
                  {estadoTest === 'finalizado' && (
                    <>
                      <button 
                        onClick={() => { 
                          setEstadoTest('listo')
                          setFuerzaPico(0)
                          setRfd(0)
                          setDatosFuerza([])
                          datosFuerzaRef.current = []
                        }} 
                        className="flex-1 py-2.5 bg-[#102218] border border-white/10 text-white rounded-lg text-xs font-bold hover:border-[#13ec6d]/50 transition-all"
                      >
                        ↻ Repetir
                      </button>
                      <button 
                        onClick={guardarEvaluacion} 
                        disabled={!musculoSeleccionado} 
                        className="flex-1 py-2.5 bg-[#13ec6d] text-[#102218] rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-[#13ec6d]/90 transition-all"
                      >
                        ✓ Guardar ({ladoActivo})
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
            
            {/* Input Manual */}
            <section className="bg-[#193324] rounded-2xl p-4 border border-white/10">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                <Icono name="edit" className="text-slate-400" />
                Entrada Manual
              </h3>
              <p className="text-[10px] text-slate-400 mb-3">Ingresa valores si no tienes sensor conectado</p>
              
              {musculoSeleccionado && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-8">R:</span>
                    <input
                      type="number"
                      placeholder="Derecha"
                      value={musculos.find(m => m.id === musculoSeleccionado)?.fuerza.R || ''}
                      onChange={(e) => actualizarFuerzaManual(musculoSeleccionado!, 'R', parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-[#102218] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <span className="text-xs text-slate-400">{unidadFuerza}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-8">L:</span>
                    <input
                      type="number"
                      placeholder="Izquierda"
                      value={musculos.find(m => m.id === musculoSeleccionado)?.fuerza.L || ''}
                      onChange={(e) => actualizarFuerzaManual(musculoSeleccionado!, 'L', parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-[#102218] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <span className="text-xs text-slate-400">{unidadFuerza}</span>
                  </div>
                </div>
              )}
            </section>
            
            {/* Panel Debug - Solo visible cuando está conectado */}
            {estadoConexion === 'conectado' && (
              <section className="bg-[#102218] rounded-xl p-3 border border-white/10">
                <button 
                  onClick={() => setMostrarDebug(!mostrarDebug)}
                  className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-1">
                    <Icono name="terminal" className="text-sm" />
                    Consola de Depuración
                  </span>
                  <Icono name={mostrarDebug ? 'expand_less' : 'expand_more'} className="text-sm" />
                </button>
                
                {mostrarDebug && (
                  <div className="mt-2 space-y-1">
                    <div className="max-h-40 overflow-y-auto bg-[#0a1210] rounded-lg p-2 font-mono text-[9px]">
                      {debugLog.length === 0 ? (
                        <p className="text-slate-500 italic">Esperando eventos...</p>
                      ) : (
                        debugLog.map((log, i) => (
                          <p key={i} className={
                            log.includes('ERROR') ? 'text-red-400' :
                            log.includes('✓') ? 'text-[#13ec6d]' :
                            log.includes('▶') ? 'text-[#00f0ff]' :
                            log.includes('⏹') ? 'text-[#f59e0b]' :
                            'text-slate-300'
                          }>
                            {log}
                          </p>
                        ))
                      )}
                    </div>
                    <button 
                      onClick={() => setDebugLog([])}
                      className="text-[8px] text-slate-500 hover:text-white transition-all"
                    >
                      Limpiar consola
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
        
        {/* ========== VISTA RESULTADOS ========== */}
        {vista === 'resultados' && (
          <>
            {/* Índice Global */}
            <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                <Icono name="leaderboard" className="text-[#13ec6d]" />
                Índice de Fuerza Isométrica Global
              </h3>
              
              <div className="flex justify-center mb-4">
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#3a4a3f" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#13ec6d" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={`${(indiceGlobal.indiceGlobal / 100) * 283} 283`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-[#13ec6d]">{indiceGlobal.indiceGlobal}</span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Índice Global</p>
                </div>
              </div>
              
              {/* Radar por regiones */}
              <div className="flex justify-center mb-4">
                <RadarChart
                  data={[
                    { label: 'T. Superior', value: indiceGlobal.trenSuperior, color: '#ef4444' },
                    { label: 'Core', value: indiceGlobal.core, color: '#13ec6d' },
                    { label: 'T. Inferior', value: indiceGlobal.trenInferior, color: '#3b82f6' },
                  ]}
                  size={180}
                />
              </div>
              
              {/* Barras por región */}
              <div className="space-y-3">
                {REGIONES.map(region => {
                  const valor = region.id === 'upper' ? indiceGlobal.trenSuperior : region.id === 'core' ? indiceGlobal.core : indiceGlobal.trenInferior
                  return (
                    <div key={region.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">{region.nombre}</span>
                        <span className="text-xs font-bold" style={{ color: region.color }}>{valor}/100</span>
                      </div>
                      <div className="h-2 bg-[#102218] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${valor}%`, backgroundColor: region.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            
            {/* Tabla de Asimetrías */}
            <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                <Icono name="compare" className="text-[#00f0ff]" />
                Análisis de Asimetrías
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-2 text-slate-400">Músculo</th>
                      <th className="text-center p-2 text-slate-400">R</th>
                      <th className="text-center p-2 text-slate-400">L</th>
                      <th className="text-center p-2 text-slate-400">Prom</th>
                      <th className="text-center p-2 text-slate-400">Asim %</th>
                      <th className="text-center p-2 text-slate-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosAsimetria.filter(r => r.derecha > 0 || r.izquierda > 0).map(r => (
                      <tr key={r.musculoId} className="border-b border-white/5">
                        <td className="p-2 text-white">{r.musculoNombre}</td>
                        <td className="p-2 text-center text-[#00f0ff]">{r.derecha || '—'}</td>
                        <td className="p-2 text-center text-[#f59e0b]">{r.izquierda || '—'}</td>
                        <td className="p-2 text-center text-white">{r.promedio.toFixed(1)}</td>
                        <td className="p-2 text-center">{r.asimetriaPorcentaje.toFixed(1)}%</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getClasificacionColor(r.clasificacion)}`}>
                            {r.clasificacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Leyenda */}
              <div className="flex justify-center gap-3 mt-3 pt-3 border-t border-white/5">
                {[
                  ['optimo', 'Óptimo ≤5%'],
                  ['leve', 'Leve 5-10%'],
                  ['moderado', 'Moderado 10-15%'],
                  ['riesgo', 'Riesgo >15%'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      key === 'optimo' ? 'bg-[#13ec6d]' :
                      key === 'leve' ? 'bg-[#f59e0b]' :
                      key === 'moderado' ? 'bg-[#f97316]' : 'bg-red-500'
                    }`} />
                    <span className="text-[8px] text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Insights automáticos */}
            {insights.length > 0 && (
              <section className="bg-[#193324] rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                  <Icono name="lightbulb" className="text-[#f59e0b]" />
                  Análisis Automático
                </h3>
                
                <div className="space-y-2">
                  {insights.map((insight, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      insight.tipo === 'alerta' ? 'bg-red-500/10 border-red-500/30' :
                      insight.tipo === 'recomendacion' ? 'bg-[#00f0ff]/10 border-[#00f0ff]/30' :
                      'bg-[#13ec6d]/10 border-[#13ec6d]/30'
                    }`}>
                      <p className="text-xs text-white">{insight.mensaje}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        
        {/* ========== VISTA HISTORIAL ========== */}
        {vista === 'historial' && (
          <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
              <Icono name="history" className="text-[#00f0ff]" />
              Historial de Evaluaciones
            </h3>
            
            {evaluaciones.length === 0 ? (
              <div className="text-center py-8">
                <Icono name="inbox" className="text-4xl text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">No hay evaluaciones guardadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {evaluaciones.slice(-20).reverse().map(e => {
                  const musculo = musculos.find(m => m.id === e.musculo)
                  return (
                    <div key={e.id} className="bg-[#102218] rounded-lg p-3 border border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white text-sm font-bold">{musculo?.nombreCorto || e.musculo}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(e.fecha).toLocaleDateString('es-ES')} • Lado {e.lado}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#13ec6d]">{e.fuerzaMaxima.toFixed(1)} {e.unidad}</p>
                          <p className="text-[10px] text-slate-400">RFD: {e.rfd.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>
      
      {/* Footer con resumen */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#102218]/95 backdrop-blur-md border-t border-[#13ec6d]/20 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-[8px] text-slate-400">Índice Global</p>
              <p className="text-lg font-bold text-[#13ec6d]">{indiceGlobal.indiceGlobal}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] text-slate-400">Evaluados</p>
              <p className="text-lg font-bold text-white">{musculos.filter(m => m.fuerza.R > 0 || m.fuerza.L > 0).length}/{musculos.length}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] text-slate-400">Alertas</p>
              <p className="text-lg font-bold text-red-400">{insights.filter(i => i.tipo === 'alerta').length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500">
              {evaluaciones.length} evaluaciones
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
