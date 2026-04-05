'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

interface Athlete {
  id: string
  name: string
  category: string
  weight: number
}

interface Muscle {
  id: string
  name: string
  bodyRegion: 'upper' | 'core' | 'lower'
  exercises: string[]
}

interface Exercise {
  id: string
  name: string
  primaryMuscleId: string
  exerciseType: 'compound' | 'isolation'
}

interface EvaluacionIsometrica {
  id: string
  atletaId: string
  fecha: string
  musculo: string
  fuerzaMaxima: number
  tiempoHastaFmax: number
  rfd: number
  fuerzaMedia: number
  duracionTest: number
  unidad: 'kg' | 'N'
  indiceFatiga?: number
  simetria?: number
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

type MuscleId = keyof typeof MUSCLE_DATA
type EstadoTest = 'inactivo' | 'listo' | 'medicion' | 'finalizado'
type EstadoConexion = 'desconectado' | 'conectado' | 'error'
type UnidadFuerza = 'kg' | 'N'
type RegionMuscular = 'superior' | 'core' | 'inferior' | 'todas'
type LadoBilateral = 'R' | 'L' | null

// Tipo para resultado de test en Supabase
interface TestResult {
  id?: string
  user_id: string
  test_id: string
  side: string | null
  value: number
  unit: string
  rfd: number
  duration_ms: number
  peak_time_ms: number
  avg_force: number
  fatigue_index: number
  force_index: number
  raw_data: number[]
  created_at?: string
}

// Tipo para clasificación
interface ClasificacionResultado {
  nivel: 'bajo' | 'medio' | 'alto' | 'elite'
  color: string
  emoji: string
  rango: [number, number]
}

// ============================================================================
// DATOS - TESTS ISOMÉTRICOS COMPLETOS
// ============================================================================

// Perfil de sesión actual (se obtiene del contexto de autenticación)
const SESION_ACTUAL = {
  id: 'session',
  name: 'Usuario',
  category: 'Entrenamiento Personal',
  weight: 75
}

// Estructura de Test Isométrico
interface IsometricTest {
  id: string
  testName: string
  position: string
  jointAngle: string
  equipment: string
  metric: 'kg' | 'N' | 'segundos'
  bilateral: boolean
  instructions: string
}

// Estructura de Músculo con Test
interface MuscleWithTest {
  id: string
  name: string
  nameShort: string
  region: 'superior' | 'core' | 'inferior'
  subgroup: string
  function: string
  exercises: string[]
  test: IsometricTest
  normativeRange: { bajo: [number, number]; medio: [number, number]; alto: [number, number]; elite: [number, number] }
}

// 🔴 TREN SUPERIOR
const MUSCLES_SUPERIOR: MuscleWithTest[] = [
  // PECHO
  {
    id: 'pectoral_mayor',
    name: 'Pectoral Mayor',
    nameShort: 'Pectoral',
    region: 'superior',
    subgroup: 'pecho',
    function: 'empuje',
    exercises: ['Press Banca', 'Press Inclinado', 'Fondos', 'Aperturas'],
    test: {
      id: 'pec_iso',
      testName: 'Aducción de Hombro Isométrica',
      position: 'Brazo extendido lateralmente a 90°',
      jointAngle: '90° abducción',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Brazo extendido lateralmente. Empujar hacia adentro contra sensor. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 15], medio: [15, 25], alto: [25, 35], elite: [35, 60] }
  },
  
  // ESPALDA
  {
    id: 'dorsal_ancho',
    name: 'Dorsal Ancho',
    nameShort: 'Dorsal',
    region: 'superior',
    subgroup: 'espalda',
    function: 'tracción',
    exercises: ['Dominadas', 'Jalón al Pecho', 'Remo', 'Pullover'],
    test: {
      id: 'lat_iso',
      testName: 'Extensión de Hombro Isométrica',
      position: 'Brazo extendido al frente-abajo a 45°',
      jointAngle: '45° flexión',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Brazo extendido al frente-abajo. Tirar hacia atrás contra sensor. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 15], medio: [15, 25], alto: [25, 40], elite: [40, 65] }
  },
  {
    id: 'trapecio',
    name: 'Trapecio Medio/Inferior',
    nameShort: 'Trapecio',
    region: 'superior',
    subgroup: 'espalda',
    function: 'estabilidad',
    exercises: ['Encogimientos', 'Remo al Mentón', 'Face Pull', 'Y-T-W-L'],
    test: {
      id: 'trap_iso',
      testName: 'Elevación de Escápula Isométrica',
      position: 'De pie, hombros relajados',
      jointAngle: 'N/A',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Hombros relajados. Encoger hacia las orejas contra resistencia. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 10], medio: [10, 18], alto: [18, 28], elite: [28, 45] }
  },
  
  // HOMBROS
  {
    id: 'deltoide_anterior',
    name: 'Deltoide Anterior',
    nameShort: 'D. Anterior',
    region: 'superior',
    subgroup: 'hombros',
    function: 'empuje',
    exercises: ['Press Militar', 'Elevaciones Frontales', 'Press Arnold'],
    test: {
      id: 'delt_ant_iso',
      testName: 'Flexión de Hombro Isométrica',
      position: 'Brazo extendido al frente a 90°',
      jointAngle: '90° flexión',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Brazo extendido al frente a 90°. Empujar contra sensor. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 8], medio: [8, 14], alto: [14, 22], elite: [22, 35] }
  },
  {
    id: 'deltoide_medio',
    name: 'Deltoide Medio',
    nameShort: 'D. Medio',
    region: 'superior',
    subgroup: 'hombros',
    function: 'abducción',
    exercises: ['Elevaciones Laterales', 'Press Arnold', 'Pájaros'],
    test: {
      id: 'delt_med_iso',
      testName: 'Abducción de Hombro Isométrica',
      position: 'Brazo extendido lateralmente a 30°',
      jointAngle: '30° abducción',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Brazo extendido lateralmente. Empujar contra sensor hacia afuera. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 8], medio: [8, 14], alto: [14, 22], elite: [22, 35] }
  },
  {
    id: 'deltoide_posterior',
    name: 'Deltoide Posterior',
    nameShort: 'D. Posterior',
    region: 'superior',
    subgroup: 'hombros',
    function: 'tracción',
    exercises: ['Pájaros', 'Face Pull', 'Reverse Fly', 'Remo al cuello'],
    test: {
      id: 'delt_post_iso',
      testName: 'Extensión de Hombro Isométrica',
      position: 'Inclinado hacia adelante, brazo extendido atrás',
      jointAngle: '90° extensión',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Inclinado hacia adelante, brazo extendido atrás. Empujar contra sensor. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 6], medio: [6, 12], alto: [12, 18], elite: [18, 30] }
  },
  
  // BRAZOS
  {
    id: 'biceps_braquial',
    name: 'Bíceps Braquial',
    nameShort: 'Bíceps',
    region: 'superior',
    subgroup: 'brazos',
    function: 'tracción',
    exercises: ['Curl Barra', 'Curl Mancuernas', 'Curl Martillo', 'Curl Concentrado'],
    test: {
      id: 'bicep_iso',
      testName: 'Flexión de Codo Isométrica',
      position: 'Codo a 90°, brazo pegado al cuerpo',
      jointAngle: '90°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Brazo pegado al cuerpo, codo a 90°. Empujar contra sensor fijado a la muñeca. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 12], medio: [12, 20], alto: [20, 30], elite: [30, 50] }
  },
  {
    id: 'triceps_braquial',
    name: 'Tríceps Braquial',
    nameShort: 'Tríceps',
    region: 'superior',
    subgroup: 'brazos',
    function: 'empuje',
    exercises: ['Press Francés', 'Extensiones', 'Fondos', 'Patada de Tríceps'],
    test: {
      id: 'tricep_iso',
      testName: 'Extensión de Codo Isométrica',
      position: 'Codo a 90°, brazo pegado al cuerpo',
      jointAngle: '90°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Brazo pegado al cuerpo, codo a 90°. Empujar hacia extensión contra sensor. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 10], medio: [10, 18], alto: [18, 28], elite: [28, 45] }
  }
]

// 🟢 CORE
const MUSCLES_CORE: MuscleWithTest[] = [
  {
    id: 'recto_abdominal',
    name: 'Recto Abdominal',
    nameShort: 'Abdominal',
    region: 'core',
    subgroup: 'core',
    function: 'estabilidad',
    exercises: ['Crunch', 'Plancha', 'Elevación Piernas', 'Roll-out'],
    test: {
      id: 'abs_iso',
      testName: 'Plancha Isométrica',
      position: 'Prono sobre antebrazos',
      jointAngle: 'N/A',
      equipment: 'Cronómetro',
      metric: 'segundos',
      bilateral: false,
      instructions: 'Mantener posición de plancha el máximo tiempo posible. Registrar tiempo hasta fallo.'
    },
    normativeRange: { bajo: [0, 30], medio: [30, 60], alto: [60, 120], elite: [120, 300] }
  },
  {
    id: 'oblicuos',
    name: 'Oblicuos',
    nameShort: 'Oblicuos',
    region: 'core',
    subgroup: 'core',
    function: 'rotación',
    exercises: ['Russian Twist', 'Crunch Oblicuo', 'Pallof Press', 'Woodchop'],
    test: {
      id: 'obl_iso',
      testName: 'Plancha Lateral Isométrica',
      position: 'Apoyo lateral sobre antebrazo',
      jointAngle: 'N/A',
      equipment: 'Cronómetro',
      metric: 'segundos',
      bilateral: true,
      instructions: 'Mantener plancha lateral el máximo tiempo posible. Evaluar ambos lados.'
    },
    normativeRange: { bajo: [0, 20], medio: [20, 45], alto: [45, 90], elite: [90, 180] }
  },
  {
    id: 'erectores_espinales',
    name: 'Erectores Espinales',
    nameShort: 'Lumbar',
    region: 'core',
    subgroup: 'core',
    function: 'extensión',
    exercises: ['Hiperextensiones', 'Peso Muerto', 'Good Morning', 'Bird Dog'],
    test: {
      id: 'lumbar_iso',
      testName: 'Extensión de Tronco Isométrica',
      position: 'Prono, tronco elevado',
      jointAngle: '0°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: false,
      instructions: 'Acostado boca abajo. Elevar tronco y mantener contra resistencia. 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 15], medio: [15, 25], alto: [25, 40], elite: [40, 65] }
  }
]

// 🔵 TREN INFERIOR
const MUSCLES_INFERIOR: MuscleWithTest[] = [
  // CADERA
  {
    id: 'gluteo_mayor',
    name: 'Glúteo Mayor',
    nameShort: 'Glúteo Mayor',
    region: 'inferior',
    subgroup: 'cadera',
    function: 'extensión cadera',
    exercises: ['Hip Thrust', 'Sentadilla', 'Peso Muerto', 'Step Up'],
    test: {
      id: 'glut_may_iso',
      testName: 'Hip Thrust Isométrico',
      position: 'Supino, cadera extendida',
      jointAngle: '0° cadera',
      equipment: 'Celda de carga / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Espalda apoyada en banco, pies en suelo. Elevar cadera y empujar contra carga. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 30], medio: [30, 50], alto: [50, 80], elite: [80, 150] }
  },
  {
    id: 'gluteo_medio',
    name: 'Glúteo Medio',
    nameShort: 'Glúteo Medio',
    region: 'inferior',
    subgroup: 'cadera',
    function: 'abducción cadera',
    exercises: ['Abducciones', 'Clamshell', 'Monster Walk', 'Band Walk'],
    test: {
      id: 'glut_med_iso',
      testName: 'Abducción de Cadera Isométrica',
      position: 'Decúbito lateral',
      jointAngle: '0-15°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Acostado de lado. Elevar pierna contra resistencia. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 8], medio: [8, 15], alto: [15, 25], elite: [25, 40] }
  },
  
  // MUSLO
  {
    id: 'cuadriceps',
    name: 'Cuádriceps',
    nameShort: 'Cuádriceps',
    region: 'inferior',
    subgroup: 'muslo',
    function: 'extensión rodilla',
    exercises: ['Sentadilla', 'Prensa', 'Extensiones', 'Zancadas', 'Step Up'],
    test: {
      id: 'quad_iso',
      testName: 'Extensión de Rodilla Isométrica',
      position: 'Sentado, rodilla a 90°',
      jointAngle: '90°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Sentado en silla con rodilla flexionada 90°. Empujar contra el sensor fijado al tobillo. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 25], medio: [25, 40], alto: [40, 60], elite: [60, 100] }
  },
  {
    id: 'isquiotibiales',
    name: 'Isquiotibiales',
    nameShort: 'Isquios',
    region: 'inferior',
    subgroup: 'muslo',
    function: 'flexión rodilla',
    exercises: ['Curl Femoral', 'Nordic Curl', 'Peso Muerto Rumano', 'Good Morning'],
    test: {
      id: 'ham_iso',
      testName: 'Flexión de Rodilla Isométrica',
      position: 'Decúbito prono, rodilla a 90°',
      jointAngle: '90°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Acostado boca abajo. Flexionar rodilla contra resistencia. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 15], medio: [15, 25], alto: [25, 40], elite: [40, 70] }
  },
  {
    id: 'aductores',
    name: 'Aductores',
    nameShort: 'Aductores',
    region: 'inferior',
    subgroup: 'muslo',
    function: 'aducción cadera',
    exercises: ['Sentadilla Sumo', 'Aducciones', 'Copenhague', 'Side Lunge'],
    test: {
      id: 'add_iso',
      testName: 'Aducción de Cadera Isométrica',
      position: 'Decúbito supino',
      jointAngle: '0°',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Acostado boca arriba. Aproximar pierna hacia línea media contra resistencia. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 12], medio: [12, 22], alto: [22, 35], elite: [35, 55] }
  },
  
  // PIERNA
  {
    id: 'gastrocnemio',
    name: 'Gastrocnemio',
    nameShort: 'Gemelo',
    region: 'inferior',
    subgroup: 'pierna',
    function: 'flexión plantar',
    exercises: ['Elevación Talones', 'Prensa Gemelos', 'Saltos', 'Escalones'],
    test: {
      id: 'gastro_iso',
      testName: 'Elevación de Talones Isométrica',
      position: 'De pie, talones elevados',
      jointAngle: 'N/A',
      equipment: 'Plataforma de fuerza / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'De pie sobre plataforma. Elevar talones y mantener contra carga. 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 40], medio: [40, 70], alto: [70, 110], elite: [110, 180] }
  },
  {
    id: 'soleo',
    name: 'Sóleo',
    nameShort: 'Sóleo',
    region: 'inferior',
    subgroup: 'pierna',
    function: 'flexión plantar',
    exercises: ['Elevación Sentado', 'Prensa Gemelos'],
    test: {
      id: 'soleo_iso',
      testName: 'Flexión Plantar Isométrica (Sentado)',
      position: 'Sentado, rodilla a 90°',
      jointAngle: '90° rodilla',
      equipment: 'Plataforma de fuerza / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Sentado con rodillas a 90°. Empujar planta del pie contra plataforma. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 30], medio: [30, 55], alto: [55, 90], elite: [90, 140] }
  },
  {
    id: 'tibial_anterior',
    name: 'Tibial Anterior',
    nameShort: 'Tibial',
    region: 'inferior',
    subgroup: 'pierna',
    function: 'dorsiflexión',
    exercises: ['Dorsiflexión', 'Caminar Talones', 'Toe Tap'],
    test: {
      id: 'tib_iso',
      testName: 'Dorsiflexión Isométrica',
      position: 'Sentado',
      jointAngle: '0° tobillo',
      equipment: 'Dinamómetro / HX711',
      metric: 'kg',
      bilateral: true,
      instructions: 'Sentado. Elevar pie hacia espinilla contra resistencia. Mantener 3-5 segundos.'
    },
    normativeRange: { bajo: [0, 8], medio: [8, 14], alto: [14, 22], elite: [22, 35] }
  }
]

// Todos los músculos combinados
const ALL_MUSCLES: MuscleWithTest[] = [...MUSCLES_SUPERIOR, ...MUSCLES_CORE, ...MUSCLES_INFERIOR]

// Mapeo para compatibilidad con código existente
const MUSCLE_DATA: Record<string, Muscle> = {}
ALL_MUSCLES.forEach(m => {
  MUSCLE_DATA[m.id] = {
    id: m.id,
    name: m.name,
    bodyRegion: m.region === 'superior' ? 'upper' : m.region === 'inferior' ? 'lower' : 'core',
    exercises: m.exercises
  }
})

const EJERCICIOS: Exercise[] = [
  { id: 'bench_press', name: 'Press de Banca', primaryMuscleId: 'pectoral_mayor', exerciseType: 'compound' },
  { id: 'squat', name: 'Sentadilla', primaryMuscleId: 'cuadriceps', exerciseType: 'compound' },
  { id: 'deadlift', name: 'Peso Muerto', primaryMuscleId: 'erectores_espinales', exerciseType: 'compound' },
  { id: 'overhead_press', name: 'Press Militar', primaryMuscleId: 'deltoide_anterior', exerciseType: 'compound' },
  { id: 'pull_up', name: 'Dominadas', primaryMuscleId: 'dorsal_ancho', exerciseType: 'compound' },
  { id: 'barbell_row', name: 'Remo con Barra', primaryMuscleId: 'dorsal_ancho', exerciseType: 'compound' },
  { id: 'hip_thrust', name: 'Hip Thrust', primaryMuscleId: 'gluteo_mayor', exerciseType: 'compound' },
  { id: 'romanian_deadlift', name: 'Peso Muerto Rumano', primaryMuscleId: 'isquiotibiales', exerciseType: 'compound' },
  { id: 'leg_press', name: 'Prensa de Piernas', primaryMuscleId: 'cuadriceps', exerciseType: 'compound' },
  { id: 'leg_curl', name: 'Curl Femoral', primaryMuscleId: 'isquiotibiales', exerciseType: 'isolation' },
  { id: 'leg_extension', name: 'Extensiones de Cuádriceps', primaryMuscleId: 'cuadriceps', exerciseType: 'isolation' },
  { id: 'isometric_squat', name: 'Sentadilla Isométrica', primaryMuscleId: 'cuadriceps', exerciseType: 'compound' },
  { id: 'isometric_bench', name: 'Press Isométrico', primaryMuscleId: 'pectoral_mayor', exerciseType: 'compound' },
]

const GRUPOS_MUSCULARES = [
  { id: 'cuadriceps', nombre: 'Cuádriceps', musculos: ['cuadriceps'] },
  { id: 'pectorales', nombre: 'Pectorales', musculos: ['pectoral_mayor'] },
  { id: 'deltoides', nombre: 'Deltoides', musculos: ['deltoide_anterior', 'deltoide_medio', 'deltoide_posterior'] },
  { id: 'espalda', nombre: 'Espalda', musculos: ['dorsal_ancho', 'trapecio'] },
  { id: 'brazos', nombre: 'Brazos', musculos: ['biceps_braquial', 'triceps_braquial'] },
  { id: 'isquios', nombre: 'Isquios', musculos: ['isquiotibiales'] },
  { id: 'core', nombre: 'Core', musculos: ['recto_abdominal', 'oblicuos', 'erectores_espinales'] },
  { id: 'gluteos', nombre: 'Glúteos', musculos: ['gluteo_mayor', 'gluteo_medio'] },
  { id: 'pierna', nombre: 'Pierna', musculos: ['gastrocnemio', 'soleo', 'tibial_anterior'] },
]

// ============================================================================
// ICONO
// ============================================================================

function Icono({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// COMPONENTE GRÁFICA FUERZA-TIEMPO MEJORADA
// ============================================================================

interface GraficaFuerzaTiempoProps {
  datos: FuerzaDataPoint[]
  fuerzaPico: number
  tiempoPico: number
  rfd: number
  unidad: UnidadFuerza
  duracion: number
  onExportar?: (formato: 'png' | 'pdf') => void
  evaluacionAnterior?: EvaluacionIsometrica | null
}

function GraficaFuerzaTiempo({ 
  datos, 
  fuerzaPico, 
  tiempoPico, 
  rfd, 
  unidad, 
  duracion,
  onExportar,
  evaluacionAnterior 
}: GraficaFuerzaTiempoProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; tiempo: number; fuerza: number } | null>(null)
  const [zoom, setZoom] = useState({ xMin: 0, xMax: 100, yMin: 0, yMax: 100 })
  const [mostrarComparacion, setMostrarComparacion] = useState(false)
  
  const maxTiempo = Math.max(3000, duracion)
  const maxFuerza = Math.max(50, fuerzaPico * 1.3)
  
  const width = 400
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  // Escalas
  const xScale = (t: number) => padding.left + (t / maxTiempo) * chartWidth
  const yScale = (f: number) => padding.top + chartHeight - (f / maxFuerza) * chartHeight
  
  // Generar path suave usando curvas de Bézier
  const generarPathSuave = (puntos: FuerzaDataPoint[]) => {
    if (puntos.length < 2) return ''
    
    let path = `M ${xScale(puntos[0].tiempo)} ${yScale(puntos[0].fuerza)}`
    
    for (let i = 1; i < puntos.length; i++) {
      const prev = puntos[i - 1]
      const curr = puntos[i]
      const cp1x = xScale(prev.tiempo) + (xScale(curr.tiempo) - xScale(prev.tiempo)) / 3
      const cp2x = xScale(prev.tiempo) + 2 * (xScale(curr.tiempo) - xScale(prev.tiempo)) / 3
      
      path += ` C ${cp1x} ${yScale(prev.fuerza)}, ${cp2x} ${yScale(curr.fuerza)}, ${xScale(curr.tiempo)} ${yScale(curr.fuerza)}`
    }
    
    return path
  }
  
  // Grid suave
  const lineasGrid = useMemo(() => {
    const lineas = []
    // Líneas horizontales cada 10kg/N
    for (let f = 0; f <= maxFuerza; f += 10) {
      lineas.push(
        <line
          key={`h-${f}`}
          x1={padding.left}
          y1={yScale(f)}
          x2={width - padding.right}
          y2={yScale(f)}
          stroke="#3a4a3f"
          strokeWidth="0.5"
          strokeDasharray={f === 0 ? "none" : "3,3"}
        />
      )
    }
    // Líneas verticales cada 500ms
    for (let t = 0; t <= maxTiempo; t += 500) {
      lineas.push(
        <line
          key={`v-${t}`}
          x1={xScale(t)}
          y1={padding.top}
          x2={xScale(t)}
          y2={height - padding.bottom}
          stroke="#3a4a3f"
          strokeWidth="0.5"
          strokeDasharray="3,3"
        />
      )
    }
    return lineas
  }, [maxFuerza, maxTiempo])
  
  // Datos para comparación
  const datosAnteriores = useMemo(() => {
    if (!evaluacionAnterior || !mostrarComparacion) return null
    // Simular datos anteriores basados en la evaluación guardada
    const puntos: FuerzaDataPoint[] = []
    const fmax = evaluacionAnterior.fuerzaMaxima
    const duracionAnt = evaluacionAnterior.duracionTest || 3000
    for (let t = 0; t <= duracionAnt; t += 50) {
      let fuerza = 0
      if (t < 200) {
        fuerza = (t / 200) * fmax * 0.7
      } else if (t < duracionAnt * 0.7) {
        fuerza = fmax * (0.95 + Math.sin(t / 150) * 0.05)
      } else {
        fuerza = Math.max(0, fmax * (1 - (t - duracionAnt * 0.7) / (duracionAnt * 0.3)))
      }
      puntos.push({ tiempo: t, fuerza })
    }
    return puntos
  }, [evaluacionAnterior, mostrarComparacion])
  
  // Manejar mouse move para tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Encontrar punto más cercano
    if (datos.length > 0) {
      const tiempo = ((x - padding.left) / chartWidth) * maxTiempo
      const fuerza = ((height - padding.bottom - y) / chartHeight) * maxFuerza
      
      // Buscar punto más cercano en los datos
      let puntoCercano = datos[0]
      let minDist = Infinity
      for (const punto of datos) {
        const dist = Math.abs(punto.tiempo - tiempo)
        if (dist < minDist) {
          minDist = dist
          puntoCercano = punto
        }
      }
      
      setTooltip({ x, y, tiempo: puntoCercano.tiempo, fuerza: puntoCercano.fuerza })
    }
  }
  
  return (
    <div className="w-full">
      {/* Controles de la gráfica */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">Curva Fuerza-Tiempo</span>
        <div className="flex gap-2">
          {evaluacionAnterior && (
            <button
              onClick={() => setMostrarComparacion(!mostrarComparacion)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                mostrarComparacion 
                  ? 'bg-[#f59e0b] text-[#102218]' 
                  : 'bg-[#102218] text-[#f59e0b] border border-[#f59e0b]/30'
              }`}
            >
              Comparar
            </button>
          )}
          <button
            onClick={() => onExportar?.('png')}
            className="px-2 py-1 rounded text-[10px] font-bold bg-[#102218] text-[#13ec6d] border border-[#13ec6d]/30 hover:bg-[#13ec6d]/10 transition-all"
          >
            Exportar PNG
          </button>
        </div>
      </div>
      
      {/* SVG Gráfica */}
      <div className="bg-[#102218] rounded-xl p-3 border border-white/5 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid */}
          {lineasGrid}
          
          {/* Zona RFD (0-200ms) - Color Azul */}
          <rect
            x={xScale(0)}
            y={padding.top}
            width={xScale(200) - xScale(0)}
            height={chartHeight}
            fill="#00f0ff"
            opacity="0.08"
          />
          <line
            x1={xScale(200)}
            y1={padding.top}
            x2={xScale(200)}
            y2={height - padding.bottom}
            stroke="#00f0ff"
            strokeWidth="1.5"
            strokeDasharray="4,2"
            opacity="0.6"
          />
          
          {/* Línea de pendiente RFD (0-200ms) */}
          {rfd > 0 && (
            <>
              <line
                x1={xScale(0)}
                y1={yScale(0)}
                x2={xScale(200)}
                y2={yScale(rfd * 0.2)}
                stroke="#00f0ff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx={xScale(200)}
                cy={yScale(rfd * 0.2)}
                r="4"
                fill="#00f0ff"
                stroke="#102218"
                strokeWidth="1.5"
              />
              <text
                x={xScale(200) + 5}
                y={yScale(rfd * 0.2) - 5}
                fill="#00f0ff"
                fontSize="8"
                fontWeight="bold"
              >
                RFD: {rfd.toFixed(0)}
              </text>
            </>
          )}
          
          <text x={xScale(100)} y={padding.top + 12} fill="#00f0ff" fontSize="8" textAnchor="middle" fontWeight="bold">
            RFD (0-200ms)
          </text>
          
          {/* Curva anterior (comparación) */}
          {datosAnteriores && (
            <path
              d={generarPathSuave(datosAnteriores)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.7"
            />
          )}
          
          {/* Curva actual */}
          {datos.length > 1 && (
            <path
              d={generarPathSuave(datos)}
              fill="none"
              stroke="#13ec6d"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Marcador Fmax */}
          {fuerzaPico > 0 && (
            <>
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
                y={yScale(fuerzaPico) - 10}
                fill="#13ec6d"
                fontSize="9"
                textAnchor="middle"
                fontWeight="bold"
              >
                Fmax: {fuerzaPico.toFixed(1)} {unidad}
              </text>
            </>
          )}
          
          {/* Ejes */}
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#5a6a5f" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#5a6a5f" strokeWidth="1" />
          
          {/* Etiquetas ejes */}
          <text x={width / 2} y={height - 5} fill="#6b7b6f" fontSize="10" textAnchor="middle">
            Tiempo (ms)
          </text>
          <text x={15} y={height / 2} fill="#6b7b6f" fontSize="10" textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>
            Fuerza ({unidad})
          </text>
          
          {/* Escalas */}
          <text x={xScale(0)} y={height - padding.bottom + 15} fill="#6b7b6f" fontSize="8" textAnchor="middle">0</text>
          <text x={xScale(maxTiempo / 2)} y={height - padding.bottom + 15} fill="#6b7b6f" fontSize="8" textAnchor="middle">{Math.round(maxTiempo / 2)}</text>
          <text x={xScale(maxTiempo)} y={height - padding.bottom + 15} fill="#6b7b6f" fontSize="8" textAnchor="middle">{maxTiempo}</text>
          
          <text x={padding.left - 8} y={yScale(0) + 3} fill="#6b7b6f" fontSize="8" textAnchor="end">0</text>
          <text x={padding.left - 8} y={yScale(maxFuerza / 2) + 3} fill="#6b7b6f" fontSize="8" textAnchor="end">{Math.round(maxFuerza / 2)}</text>
          <text x={padding.left - 8} y={yScale(maxFuerza) + 3} fill="#6b7b6f" fontSize="8" textAnchor="end">{Math.round(maxFuerza)}</text>
          
          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={tooltip.x + 10}
                y={tooltip.y - 25}
                width="90"
                height="40"
                rx="4"
                fill="#193324"
                stroke="#13ec6d"
                strokeWidth="1"
              />
              <text x={tooltip.x + 20} y={tooltip.y - 10} fill="#13ec6d" fontSize="9" fontWeight="bold">
                t: {tooltip.tiempo.toFixed(0)} ms
              </text>
              <text x={tooltip.x + 20} y={tooltip.y + 5} fill="white" fontSize="9">
                F: {tooltip.fuerza.toFixed(1)} {unidad}
              </text>
            </g>
          )}
        </svg>
      </div>
      
      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[#13ec6d]" />
          <span className="text-[9px] text-slate-400">Actual</span>
        </div>
        {mostrarComparacion && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#f59e0b] border-dashed" style={{ borderTop: '1px dashed #f59e0b' }} />
            <span className="text-[9px] text-slate-400">Anterior</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#13ec6d]" />
          <span className="text-[9px] text-slate-400">Fmax</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[#00f0ff]" />
          <span className="text-[9px] text-slate-400">RFD</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PANEL DE CALIBRACIÓN
// ============================================================================

interface PanelCalibracionProps {
  visible: boolean
  onClose: () => void
  onCalibrar: (offset: number, factorEscala: number) => void
  calibracionActual: Calibracion
}

function PanelCalibracion({ visible, onClose, onCalibrar, calibracionActual }: PanelCalibracionProps) {
  const [paso, setPaso] = useState<'cero' | 'escala' | 'completo'>('cero')
  const [pesoConocido, setPesoConocido] = useState<string>('')
  const [valorCrudo, setValorCrudo] = useState<number>(0)
  const [nuevoOffset, setNuevoOffset] = useState<number>(0)
  
  if (!visible) return null
  
  const calibrarCero = () => {
    // Simular calibración de cero
    setNuevoOffset(valorCrudo)
    setPaso('escala')
  }
  
  const calibrarEscala = () => {
    const peso = parseFloat(pesoConocido)
    if (peso > 0 && valorCrudo > nuevoOffset) {
      const factor = (valorCrudo - nuevoOffset) / peso
      onCalibrar(nuevoOffset, factor)
      setPaso('completo')
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#193324] rounded-2xl p-5 w-full max-w-sm mx-4 border border-[#13ec6d]/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Icono name="tune" className="text-[#13ec6d]" />
            Calibración del Sensor
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icono name="close" />
          </button>
        </div>
        
        {paso === 'cero' && (
          <div className="space-y-4">
            <div className="bg-[#102218] rounded-lg p-3 border border-white/10">
              <p className="text-xs text-slate-400 mb-2">Paso 1: Calibrar Cero</p>
              <p className="text-[10px] text-slate-500">
                Retire todo peso del sensor y presione &quot;Establecer Cero&quot;
              </p>
            </div>
            <div className="flex items-center justify-between bg-[#102218] rounded-lg p-3">
              <span className="text-xs text-slate-400">Valor actual:</span>
              <span className="text-lg font-mono text-[#00f0ff]">{valorCrudo.toFixed(0)}</span>
            </div>
            <button
              onClick={calibrarCero}
              className="w-full py-2 bg-[#13ec6d] text-[#102218] rounded-lg text-sm font-bold"
            >
              Establecer Cero
            </button>
          </div>
        )}
        
        {paso === 'escala' && (
          <div className="space-y-4">
            <div className="bg-[#102218] rounded-lg p-3 border border-white/10">
              <p className="text-xs text-slate-400 mb-2">Paso 2: Calibrar Escala</p>
              <p className="text-[10px] text-slate-500">
                Coloque un peso conocido en el sensor
              </p>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Peso conocido (kg)</label>
              <input
                type="number"
                value={pesoConocido}
                onChange={(e) => setPesoConocido(e.target.value)}
                placeholder="Ej: 20"
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaso('cero')}
                className="flex-1 py-2 bg-[#102218] border border-white/10 text-white rounded-lg text-sm font-bold"
              >
                Atrás
              </button>
              <button
                onClick={calibrarEscala}
                disabled={!pesoConocido}
                className="flex-1 py-2 bg-[#13ec6d] text-[#102218] rounded-lg text-sm font-bold disabled:opacity-50"
              >
                Calibrar
              </button>
            </div>
          </div>
        )}
        
        {paso === 'completo' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#13ec6d]/20 flex items-center justify-center mx-auto">
              <Icono name="check_circle" className="text-[#13ec6d] text-3xl" />
            </div>
            <p className="text-sm text-white font-bold">¡Calibración Completada!</p>
            <button
              onClick={onClose}
              className="w-full py-2 bg-[#13ec6d] text-[#102218] rounded-lg text-sm font-bold"
            >
              Cerrar
            </button>
          </div>
        )}
        
        {/* Parámetros actuales */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Parámetros Actuales</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#102218] rounded p-2">
              <p className="text-[9px] text-slate-500">Offset</p>
              <p className="text-xs text-white font-mono">{calibracionActual.offset.toFixed(0)}</p>
            </div>
            <div className="bg-[#102218] rounded p-2">
              <p className="text-[9px] text-slate-500">Factor</p>
              <p className="text-xs text-white font-mono">{calibracionActual.factorEscala.toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function EvaluacionFuerza() {
  // Estado del ejercicio y músculos
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<string>('')
  const [musculoSeleccionado, setMusculoSeleccionado] = useState<MuscleId | null>('quads')
  const [musculoHover, setMusculoHover] = useState<MuscleId | null>(null)
  const [grupoActivo, setGrupoActivo] = useState<string>('quads')
  const [unidadFuerza, setUnidadFuerza] = useState<UnidadFuerza>('kg')
  
  // Usuario de sesión
  const usuarioSesion = SESION_ACTUAL

  // Estado del sensor
  const [serialSoportado, setSerialSoportado] = useState(false)
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('desconectado')
  const [estadoTest, setEstadoTest] = useState<EstadoTest>('inactivo')
  const [modoTest, setModoTest] = useState<'arduino' | 'simulacion'>('simulacion')
  const [mostrarPanelCalibracion, setMostrarPanelCalibracion] = useState(false)

  // Datos de fuerza
  const [fuerzaActual, setFuerzaActual] = useState(0)
  const [fuerzaPico, setFuerzaPico] = useState(0)
  const [tiempoPico, setTiempoPico] = useState(0)
  const [rfd, setRfd] = useState(0)
  const [duracionTest, setDuracionTest] = useState(0)
  const [fuerzaMedia, setFuerzaMedia] = useState(0)
  
  // Estado para gráfica - NECESARIO para que React detecte cambios
  const [datosFuerza, setDatosFuerza] = useState<FuerzaDataPoint[]>([])
  
  // Debug log
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [mostrarDebug, setMostrarDebug] = useState(false)
  
  const agregarLog = (mensaje: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [`[${timestamp}] ${mensaje}`, ...prev.slice(0, 19)])
  }

  // Calibración
  const [calibracion, setCalibracion] = useState<Calibracion>({
    offset: 0,
    factorEscala: 1,
    fecha: new Date().toISOString()
  })

  // Evaluaciones guardadas
  const [evaluacionesGuardadas, setEvaluacionesGuardadas] = useState<EvaluacionIsometrica[]>([
    {
      id: '1',
      atletaId: 'session',
      fecha: '2025-01-15',
      musculo: 'quads',
      fuerzaMaxima: 38.5,
      tiempoHastaFmax: 280,
      rfd: 192,
      fuerzaMedia: 32.1,
      duracionTest: 3000,
      unidad: 'kg'
    }
  ])
  const [exitoGuardado, setExitoGuardado] = useState(false)

  // Inputs de evaluación manual
  const [rm1, setRm1] = useState<string>('')
  const [velocidadMedia, setVelocidadMedia] = useState<string>('')
  const [potencia, setPotencia] = useState<string>('')
  const [rpe, setRpe] = useState<number>(9)
  const [mostrarCargas, setMostrarCargas] = useState(false)

  // Nuevos estados para funcionalidades requeridas
  const [regionSeleccionada, setRegionSeleccionada] = useState<RegionMuscular>('todas')
  const [ladoSeleccionado, setLadoSeleccionado] = useState<LadoBilateral>(null)
  const [guardandoSupabase, setGuardandoSupabase] = useState(false)
  const [exitoSupabase, setExitoSupabase] = useState(false)

  // Refs
  const portRef = useRef<SerialPort | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const datosFuerzaRef = useRef<FuerzaDataPoint[]>([])
  const picoRef = useRef(0)
  const tiempoInicioRef = useRef(0)
  const contadorActualizacionRef = useRef(0)

  // Valores derivados
  const musculoActual = musculoSeleccionado ? MUSCLE_DATA[musculoSeleccionado] : null

  // Última evaluación del músculo actual
  const ultimaEvaluacion = useMemo(() => {
    if (!musculoSeleccionado) return null
    return evaluacionesGuardadas
      .filter(e => e.atletaId === 'session' && e.musculo === musculoSeleccionado)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
  }, [musculoSeleccionado, evaluacionesGuardadas])

  // Cálculo de cargas de entrenamiento - Basado en Fmax del sensor
  const cargasEntrenamiento = useMemo(() => {
    // Usar 1RM manual, o estimar desde Fmax (Fmax * 1.15 = 1RM estimado), o usar evaluación anterior
    const rm = parseFloat(rm1) || (fuerzaPico > 0 ? fuerzaPico * 1.15 : 0) || ultimaEvaluacion?.fuerzaMaxima || 0
    if (!rm) return []
    return [
      { porcentaje: 50, carga: Math.round(rm * 0.5), objetivo: 'Resistencia de Fuerza', rango: '40-60%' },
      { porcentaje: 60, carga: Math.round(rm * 0.6), objetivo: 'Resistencia de Fuerza', rango: '40-60%' },
      { porcentaje: 70, carga: Math.round(rm * 0.7), objetivo: 'Hipertrofia', rango: '65-75%' },
      { porcentaje: 75, carga: Math.round(rm * 0.75), objetivo: 'Hipertrofia', rango: '65-75%' },
      { porcentaje: 80, carga: Math.round(rm * 0.8), objetivo: 'Fuerza', rango: '80-90%' },
      { porcentaje: 85, carga: Math.round(rm * 0.85), objetivo: 'Fuerza', rango: '80-90%' },
      { porcentaje: 90, carga: Math.round(rm * 0.9), objetivo: 'Fuerza Máxima', rango: '90-100%' },
      { porcentaje: 95, carga: Math.round(rm * 0.95), objetivo: 'Fuerza Máxima', rango: '90-100%' },
    ]
  }, [rm1, fuerzaPico, ultimaEvaluacion])

  // Interpretación automática
  const interpretacion = useMemo(() => {
    if (fuerzaPico === 0) return null
    
    // Clasificar fuerza máxima
    let nivelFuerza = 'Bajo'
    let colorFuerza = '#ef4444'
    if (fuerzaPico >= 40) {
      nivelFuerza = 'Alto'
      colorFuerza = '#13ec6d'
    } else if (fuerzaPico >= 25) {
      nivelFuerza = 'Moderado'
      colorFuerza = '#f59e0b'
    }
    
    // Clasificar RFD
    let nivelRfd = 'Bajo'
    let colorRfd = '#ef4444'
    if (rfd >= 200) {
      nivelRfd = 'Alto'
      colorRfd = '#13ec6d'
    } else if (rfd >= 100) {
      nivelRfd = 'Moderado'
      colorRfd = '#f59e0b'
    }
    
    // Recomendación
    let recomendacion = 'Entrenamiento de fuerza general'
    if (nivelRfd === 'Bajo' && nivelFuerza !== 'Bajo') {
      recomendacion = 'Enfocarse en fuerza explosiva'
    } else if (nivelFuerza === 'Bajo') {
      recomendacion = 'Programa de fuerza básica'
    } else if (nivelFuerza === 'Alto' && nivelRfd === 'Alto') {
      recomendacion = 'Mantener nivel actual'
    }
    
    return {
      fuerzaMaxima: { valor: fuerzaPico, nivel: nivelFuerza, color: colorFuerza },
      rfd: { valor: rfd, nivel: nivelRfd, color: colorRfd },
      recomendacion
    }
  }, [fuerzaPico, rfd])

  // Índice de fatiga
  const indiceFatiga = useMemo(() => {
    if (datosFuerzaRef.current.length < 10 || duracionTest < 1000) return 0
    const datos = datosFuerzaRef.current
    const maxFuerza = Math.max(...datos.map(d => d.fuerza))
    const ultimosDatos = datos.slice(-10)
    const promedioFinal = ultimosDatos.reduce((a, b) => a + b.fuerza, 0) / ultimosDatos.length
    return Math.round((1 - promedioFinal / maxFuerza) * 100)
  }, [duracionTest])

  // ========================================
  // NUEVOS CÁLCULOS AUTOMÁTICOS
  // ========================================

  // Obtener el músculo completo con test desde ALL_MUSCLES
  const musculoConTest = useMemo(() => {
    if (!musculoSeleccionado) return null
    return ALL_MUSCLES.find(m => m.id === musculoSeleccionado) || null
  }, [musculoSeleccionado])

  // Músculos filtrados por región
  const musculosFiltrados = useMemo(() => {
    if (regionSeleccionada === 'todas') return ALL_MUSCLES
    return ALL_MUSCLES.filter(m => m.region === regionSeleccionada)
  }, [regionSeleccionada])

  // Índice de Fuerza Isométrica (IF) = fuerzaPico / peso
  const indiceFuerza = useMemo(() => {
    if (fuerzaPico === 0 || usuarioSesion.weight === 0) return 0
    return fuerzaPico / usuarioSesion.weight
  }, [fuerzaPico, usuarioSesion.weight])

  // Índice de Fatiga mejorado (calculado desde datosFuerza)
  const indiceFatigaCalculado = useMemo(() => {
    if (datosFuerza.length < 10 || fuerzaPico === 0) return 0
    const fuerzaFinal = datosFuerza[datosFuerza.length - 1]?.fuerza || 0
    return Math.round(((fuerzaPico - fuerzaFinal) / fuerzaPico) * 100)
  }, [datosFuerza, fuerzaPico])

  // Clasificación automática según valores normativos
  const clasificacion = useMemo((): ClasificacionResultado | null => {
    if (!musculoConTest || fuerzaPico === 0) return null
    
    const { normativeRange } = musculoConTest
    
    if (fuerzaPico >= normativeRange.elite[0] && fuerzaPico <= normativeRange.elite[1]) {
      return { nivel: 'elite', color: '#00f0ff', emoji: '💎', rango: normativeRange.elite }
    }
    if (fuerzaPico >= normativeRange.alto[0] && fuerzaPico < normativeRange.alto[1]) {
      return { nivel: 'alto', color: '#13ec6d', emoji: '🟢', rango: normativeRange.alto }
    }
    if (fuerzaPico >= normativeRange.medio[0] && fuerzaPico < normativeRange.medio[1]) {
      return { nivel: 'medio', color: '#f59e0b', emoji: '🟡', rango: normativeRange.medio }
    }
    return { nivel: 'bajo', color: '#ef4444', emoji: '🔴', rango: normativeRange.bajo }
  }, [musculoConTest, fuerzaPico])

  // Función para guardar resultado en Supabase
  const guardarEnSupabase = useCallback(async () => {
    if (!musculoConTest || fuerzaPico === 0) return
    
    setGuardandoSupabase(true)
    
    try {
      const testData: TestResult = {
        user_id: usuarioSesion.id,
        test_id: musculoConTest.test.id,
        side: musculoConTest.test.bilateral ? ladoSeleccionado : null,
        value: fuerzaPico,
        unit: unidadFuerza,
        rfd: rfd,
        duration_ms: duracionTest,
        peak_time_ms: tiempoPico,
        avg_force: fuerzaMedia,
        fatigue_index: indiceFatigaCalculado,
        force_index: indiceFuerza,
        raw_data: datosFuerza.map(d => d.fuerza)
      }

      if (supabase) {
        const { error } = await supabase
          .from('test_results')
          .insert([testData])
        
        if (error) {
          console.error('Error guardando en Supabase:', error)
          // Fallback: guardar localmente
          guardarEvaluacionLocal()
        } else {
          setExitoSupabase(true)
          setTimeout(() => setExitoSupabase(false), 3000)
        }
      } else {
        // Supabase no configurado, guardar localmente
        guardarEvaluacionLocal()
      }
    } catch (error) {
      console.error('Error en guardado:', error)
      guardarEvaluacionLocal()
    } finally {
      setGuardandoSupabase(false)
    }
  }, [musculoConTest, fuerzaPico, ladoSeleccionado, unidadFuerza, rfd, duracionTest, tiempoPico, fuerzaMedia, indiceFatigaCalculado, indiceFuerza, datosFuerza, usuarioSesion.id])

  // Función de guardado local (fallback)
  const guardarEvaluacionLocal = useCallback(() => {
    if (!musculoSeleccionado || fuerzaPico === 0) return
    
    const nuevaEvaluacion: EvaluacionIsometrica = {
      id: Date.now().toString(),
      atletaId: usuarioSesion.id,
      fecha: new Date().toISOString().split('T')[0],
      musculo: musculoSeleccionado,
      fuerzaMaxima: fuerzaPico,
      tiempoHastaFmax: tiempoPico,
      rfd: rfd,
      fuerzaMedia: fuerzaMedia,
      duracionTest: duracionTest,
      unidad: unidadFuerza,
      indiceFatiga: indiceFatigaCalculado
    }
    
    setEvaluacionesGuardadas(prev => [...prev, nuevaEvaluacion])
    setExitoGuardado(true)
    setTimeout(() => setExitoGuardado(false), 3000)
  }, [musculoSeleccionado, fuerzaPico, tiempoPico, rfd, fuerzaMedia, duracionTest, unidadFuerza, indiceFatigaCalculado, usuarioSesion.id])

  // Efecto para resetear lado cuando cambia el músculo
  useEffect(() => {
    if (musculoConTest && !musculoConTest.test.bilateral) {
      setLadoSeleccionado(null)
    }
  }, [musculoConTest])

  // Effects
  useEffect(() => {
    const verificarSerial = async () => {
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        try {
          const serial = (navigator as any).serial
          if (serial && typeof serial.requestPort === 'function') setSerialSoportado(true)
        } catch (e) {}
      }
    }
    verificarSerial()
  }, [])

  useEffect(() => {
    if (ejercicioSeleccionado) {
      const ejercicio = EJERCICIOS.find(e => e.id === ejercicioSeleccionado)
      if (ejercicio) setMusculoSeleccionado(ejercicio.primaryMuscleId as MuscleId)
    }
  }, [ejercicioSeleccionado])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (writerRef.current) writerRef.current.releaseLock()
      if (readerRef.current) readerRef.current.releaseLock()
      if (portRef.current) portRef.current.close()
    }
  }, [])

  // Funciones Arduino
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
      setModoTest('arduino')
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
      setModoTest('simulacion')
      agregarLog('✓ Sensor desconectado')
    } catch (e) {
      agregarLog('ERROR desconexión: ' + (e as Error).message)
    }
  }

  const procesarLineaArduino = (linea: string) => {
    console.log('[Arduino]', linea)
    
    if (linea.includes('>>> Test listo')) {
      setEstadoTest('listo')
      agregarLog('ARDUINO: Test listo')
    }
    if (linea.includes('>>> Intento iniciado')) {
      setEstadoTest('medicion')
      datosFuerzaRef.current = []
      picoRef.current = 0
      contadorActualizacionRef.current = 0
      tiempoInicioRef.current = Date.now()
      setFuerzaPico(0); setFuerzaActual(0); setRfd(0); setDuracionTest(0); setTiempoPico(0)
      setDatosFuerza([])
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
  const enviarComando = async (cmd: string) => {
    if (writerRef.current && estadoConexion === 'conectado') {
      try { 
        await writerRef.current.write(new TextEncoder().encode(cmd))
        agregarLog(`Comando enviado: "${cmd === ' ' ? 'SPACE' : cmd}"`)
      } catch (e) {
        agregarLog('ERROR enviando comando: ' + (e as Error).message)
      }
    }
  }

  const iniciarSimulacion = () => {
    datosFuerzaRef.current = []
    picoRef.current = 0
    tiempoInicioRef.current = Date.now()
    contadorActualizacionRef.current = 0
    setFuerzaPico(0); setFuerzaActual(0); setRfd(0); setDuracionTest(0); setTiempoPico(0); setFuerzaMedia(0)
    setDatosFuerza([])
    setEstadoTest('medicion')
    let tiempo = 0, ultimaFuerza = 0
    const picoObjetivo = 35 + Math.random() * 15
    intervalRef.current = setInterval(() => {
      tiempo += 20
      let fuerza = 0
      if (tiempo < 200) {
        fuerza = Math.min(picoObjetivo * 0.8, 2 + (tiempo / 200) * picoObjetivo * 0.8 * Math.pow(tiempo / 200, 0.5))
      } else if (tiempo < 2500) {
        fuerza = picoObjetivo + Math.sin(tiempo / 100) * 2 + Math.random() * 1.5
      } else if (tiempo < 3000) {
        fuerza = Math.max(0, ultimaFuerza - 3)
      } else {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setEstadoTest('finalizado')
        // Actualizar gráfica con todos los datos finales
        setDatosFuerza([...datosFuerzaRef.current])
        const datosTempranos = datosFuerzaRef.current.filter(p => p.tiempo <= 200)
        if (datosTempranos.length > 1) {
          const f200 = datosTempranos[datosTempranos.length - 1].fuerza
          setRfd(Math.round(f200 / 0.2))
        }
        const suma = datosFuerzaRef.current.reduce((a, b) => a + b.fuerza, 0)
        setFuerzaMedia(suma / datosFuerzaRef.current.length)
        setFuerzaActual(0)
        return
      }
      ultimaFuerza = fuerza
      datosFuerzaRef.current.push({ tiempo, fuerza })
      setFuerzaActual(fuerza)
      setDuracionTest(tiempo)
      if (fuerza > picoRef.current) {
        picoRef.current = fuerza
        setFuerzaPico(fuerza)
        setTiempoPico(tiempo)
      }
      
      // ACTUALIZAR GRÁFICA cada 5 puntos para tiempo real
      contadorActualizacionRef.current++
      if (contadorActualizacionRef.current >= 5) {
        setDatosFuerza([...datosFuerzaRef.current])
        contadorActualizacionRef.current = 0
      }
    }, 20)
  }

  const iniciarTest = () => {
    if (modoTest === 'arduino' && estadoConexion === 'conectado') enviarComando(' ')
    else iniciarSimulacion()
  }

  const detenerTest = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setEstadoTest('finalizado')
    // Actualizar gráfica con datos finales
    setDatosFuerza([...datosFuerzaRef.current])
    if (datosFuerzaRef.current.length > 0) {
      const suma = datosFuerzaRef.current.reduce((a, b) => a + b.fuerza, 0)
      setFuerzaMedia(suma / datosFuerzaRef.current.length)
    }
  }

  const reiniciarTest = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    datosFuerzaRef.current = []
    picoRef.current = 0
    setDatosFuerza([])
    setEstadoTest(modoTest === 'arduino' && estadoConexion === 'conectado' ? 'listo' : 'inactivo')
    setFuerzaPico(0); setFuerzaActual(0); setRfd(0); setDuracionTest(0); setTiempoPico(0); setFuerzaMedia(0)
  }

  // Función principal de guardado (llama a Supabase o local)
  const guardarEvaluacion = useCallback(() => {
    guardarEnSupabase()
  }, [guardarEnSupabase])

  const calibrarSensor = (offset: number, factorEscala: number) => {
    setCalibracion({
      offset,
      factorEscala,
      fecha: new Date().toISOString()
    })
  }

  const exportarGrafica = (formato: 'png' | 'pdf') => {
    // Implementar exportación
    console.log(`Exportando gráfica en formato ${formato}`)
    // En una implementación real, aquí se generaría el archivo
  }

  const clicMusculo = (musculoId: MuscleId) => {
    setMusculoSeleccionado(musculoId)
    const grupo = GRUPOS_MUSCULARES.find(g => g.musculos.includes(musculoId))
    if (grupo) setGrupoActivo(grupo.id)
  }

  const esMusculoActivo = (musculoId: MuscleId) => musculoSeleccionado === musculoId

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-24 bg-[#102218]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#102218]/90 backdrop-blur-md border-b border-[#13ec6d]/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Evaluación de Fuerza</h1>
            <p className="text-[10px] text-slate-500">Test Isométrico • Análisis Neuromuscular</p>
          </div>
          {/* Perfil de Sesión */}
          <div className="flex items-center gap-3 bg-[#193324] px-3 py-1.5 rounded-xl border border-[#13ec6d]/20">
            <div className="w-8 h-8 rounded-full bg-[#13ec6d]/20 flex items-center justify-center border border-[#13ec6d]/40">
              <Icono name="person" className="text-[#13ec6d] text-sm" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold leading-none text-white">{usuarioSesion.name}</p>
              <p className="text-[10px] text-slate-400">{usuarioSesion.category}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {/* Mapa Muscular Interactivo */}
        <section className="bg-[#1a3020] rounded-2xl p-4 border border-[#13ec6d]/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Icono name="accessibility_new" className="text-[#13ec6d]" />
              Objetivo Anatómico
            </h2>
            {musculoActual && (
              <span className="px-2 py-0.5 rounded-full bg-[#13ec6d] text-[#102218] text-[10px] font-bold">
                {musculoActual.name}
              </span>
            )}
          </div>

          {/* Selector de Región Muscular */}
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => setRegionSeleccionada('todas')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                regionSeleccionada === 'todas'
                  ? 'bg-[#13ec6d] text-[#102218]'
                  : 'bg-[#102218] text-white border border-white/20 hover:border-[#13ec6d]'
              }`}
            >
              TODOS ({ALL_MUSCLES.length})
            </button>
            <button
              onClick={() => setRegionSeleccionada('superior')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                regionSeleccionada === 'superior'
                  ? 'bg-[#ef4444] text-white'
                  : 'bg-[#102218] text-white border border-[#ef4444]/30 hover:border-[#ef4444]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
              SUPERIOR ({MUSCLES_SUPERIOR.length})
            </button>
            <button
              onClick={() => setRegionSeleccionada('core')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                regionSeleccionada === 'core'
                  ? 'bg-[#13ec6d] text-[#102218]'
                  : 'bg-[#102218] text-white border border-[#13ec6d]/30 hover:border-[#13ec6d]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#13ec6d]"></span>
              CORE ({MUSCLES_CORE.length})
            </button>
            <button
              onClick={() => setRegionSeleccionada('inferior')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                regionSeleccionada === 'inferior'
                  ? 'bg-[#00f0ff] text-[#102218]'
                  : 'bg-[#102218] text-white border border-[#00f0ff]/30 hover:border-[#00f0ff]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#00f0ff]"></span>
              INFERIOR ({MUSCLES_INFERIOR.length})
            </button>
          </div>

          {/* Selector de músculo específico por región */}
          <div className="mb-4">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-2 text-center">
              {regionSeleccionada === 'todas' ? 'Todos los músculos' : 
               regionSeleccionada === 'superior' ? 'Tren Superior' :
               regionSeleccionada === 'core' ? 'Core' : 'Tren Inferior'} ({musculosFiltrados.length})
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto">
              {musculosFiltrados.map(musculo => (
                <button
                  key={musculo.id}
                  onClick={() => setMusculoSeleccionado(musculo.id as MuscleId)}
                  className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                    musculoSeleccionado === musculo.id
                      ? 'bg-[#13ec6d] text-[#102218]'
                      : 'bg-[#102218] text-slate-300 border border-white/10 hover:border-[#13ec6d]/50'
                  }`}
                >
                  {musculo.nameShort}
                </button>
              ))}
            </div>
          </div>

          {/* Selector Bilateral R/L - Solo para tests bilaterales */}
          {musculoConTest?.test.bilateral && (
            <div className="mb-4 p-3 bg-[#102218] rounded-xl border border-[#00f0ff]/30">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-2 text-center">
                Test Bilateral - Selecciona el lado a evaluar
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setLadoSeleccionado('L')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    ladoSeleccionado === 'L'
                      ? 'bg-[#00f0ff] text-[#102218]'
                      : 'bg-[#193324] text-white border border-[#00f0ff]/30 hover:border-[#00f0ff]'
                  }`}
                >
                  Izquierda (L)
                </button>
                <button
                  onClick={() => setLadoSeleccionado('R')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    ladoSeleccionado === 'R'
                      ? 'bg-[#00f0ff] text-[#102218]'
                      : 'bg-[#193324] text-white border border-[#00f0ff]/30 hover:border-[#00f0ff]'
                  }`}
                >
                  Derecha (R)
                </button>
              </div>
              {ladoSeleccionado && (
                <p className="text-[10px] text-[#00f0ff] text-center mt-2 font-bold">
                  Evaluando lado: {ladoSeleccionado === 'L' ? 'Izquierdo' : 'Derecho'}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col items-center w-full gap-4">
            <div className="flex justify-center gap-6 w-full">
              {/* Vista Anterior */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Anterior</p>
                <svg className="h-[160px] w-auto" viewBox="0 0 100 220">
                  <circle className="fill-[#1a1a1a] stroke-white stroke-[0.5]" cx="50" cy="15" r="7" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('pectorals') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M38 35 Q50 32 62 35 L65 50 Q50 55 35 50 Z" onClick={() => clicMusculo('pectorals')} onMouseEnter={() => setMusculoHover('pectorals')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('deltoids') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M30 35 Q35 30 40 35 L38 45 Z" onClick={() => clicMusculo('deltoids')} onMouseEnter={() => setMusculoHover('deltoids')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('deltoids') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M70 35 Q65 30 60 35 L62 45 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('biceps') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M25 48 Q32 50 35 60 Q33 70 30 75 Q26 75 24 70 Q22 55 25 48 Z" onClick={() => clicMusculo('biceps')} onMouseEnter={() => setMusculoHover('biceps')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('biceps') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M75 48 Q68 50 65 60 Q67 70 70 75 Q74 75 76 70 Q78 55 75 48 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('forearms') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M24 78 Q28 85 26 95 Q23 100 21 98 Q20 85 24 78 Z" onClick={() => clicMusculo('forearms')} onMouseEnter={() => setMusculoHover('forearms')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('forearms') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M76 78 Q72 85 74 95 Q77 100 79 98 Q80 85 76 78 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('abs') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M42 55 L58 55 L58 85 L42 85 Z" onClick={() => clicMusculo('abs')} onMouseEnter={() => setMusculoHover('abs')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('obliques') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M38 55 L42 55 L42 85 L35 80 Z" onClick={() => clicMusculo('obliques')} onMouseEnter={() => setMusculoHover('obliques')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('obliques') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M62 55 L58 55 L58 85 L65 80 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('quads') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M35 95 Q42 120 40 150 L50 150 L48 95 Z" onClick={() => clicMusculo('quads')} onMouseEnter={() => setMusculoHover('quads')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('quads') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M65 95 Q58 120 60 150 L50 150 L52 95 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('adductors') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M48 95 L50 140 L52 95 Z" onClick={() => clicMusculo('adductors')} onMouseEnter={() => setMusculoHover('adductors')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('tibialis') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M38 160 L42 205 L45 205 L42 160 Z" onClick={() => clicMusculo('tibialis')} onMouseEnter={() => setMusculoHover('tibialis')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('tibialis') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M62 160 L58 205 L55 205 L58 160 Z" />
                </svg>
              </div>
              {/* Vista Posterior */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Posterior</p>
                <svg className="h-[160px] w-auto" viewBox="0 0 100 220">
                  <circle className="fill-[#1a1a1a] stroke-white stroke-[0.5]" cx="50" cy="15" r="7" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('traps') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M50 22 L35 35 L50 45 L65 35 Z" onClick={() => clicMusculo('traps')} onMouseEnter={() => setMusculoHover('traps')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('deltoids') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M30 35 Q25 40 30 45 L35 40 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('deltoids') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M70 35 Q75 40 70 45 L65 40 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('lats') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M35 45 L50 50 L65 45 L60 75 L40 75 Z" onClick={() => clicMusculo('lats')} onMouseEnter={() => setMusculoHover('lats')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('triceps') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M22 45 Q25 55 24 65 Q23 72 26 75 Q30 75 30 65 Q32 50 22 45 Z" onClick={() => clicMusculo('triceps')} onMouseEnter={() => setMusculoHover('triceps')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('triceps') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M78 45 Q75 55 76 65 Q77 72 74 75 Q70 75 70 65 Q68 50 78 45 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('forearms') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M24 78 Q28 85 26 95 Q23 100 21 98 Q20 85 24 78 Z" onClick={() => clicMusculo('forearms')} onMouseEnter={() => setMusculoHover('forearms')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('forearms') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M76 78 Q72 85 74 95 Q77 100 79 98 Q80 85 76 78 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('glutes') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M35 85 Q50 105 65 85 L60 78 L40 78 Z" onClick={() => clicMusculo('glutes')} onMouseEnter={() => setMusculoHover('glutes')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('hamstrings') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M35 105 Q42 130 40 155 L48 155 L48 105 Z" onClick={() => clicMusculo('hamstrings')} onMouseEnter={() => setMusculoHover('hamstrings')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('hamstrings') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M65 105 Q58 130 60 155 L52 155 L52 105 Z" />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('calves') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M38 165 Q45 175 42 195 L48 195 L48 165 Z" onClick={() => clicMusculo('calves')} onMouseEnter={() => setMusculoHover('calves')} onMouseLeave={() => setMusculoHover(null)} />
                  <path className={`cursor-pointer transition-all ${esMusculoActivo('calves') ? 'fill-[#13ec6d] stroke-[#13ec6d]' : 'fill-[#1a1a1a] stroke-white hover:fill-[#333]'}`} strokeWidth="0.5" d="M62 165 Q55 175 58 195 L52 195 L52 165 Z" />
                </svg>
              </div>
            </div>

            {/* Tags de grupos musculares */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {GRUPOS_MUSCULARES.map(grupo => (
                <button
                  key={grupo.id}
                  onClick={() => { setGrupoActivo(grupo.id); setMusculoSeleccionado(grupo.musculos[0] as MuscleId) }}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight transition-all ${
                    grupoActivo === grupo.id
                      ? 'bg-[#13ec6d] text-[#102218]'
                      : 'bg-[#1a1a1a] text-white border border-[#13ec6d]/30 hover:border-[#13ec6d]'
                  }`}
                >
                  {grupo.nombre}
                </button>
              ))}
            </div>

            {/* Tooltip */}
            {musculoHover && (
              <div className="bg-[#13ec6d] text-[#102218] px-3 py-1 rounded-lg text-xs font-bold shadow-lg animate-pulse">
                {MUSCLE_DATA[musculoHover].name}
              </div>
            )}
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
                estadoConexion === 'conectado' ? 'bg-[#13ec6d]/20' :
                estadoConexion === 'error' ? 'bg-red-500/20' : 'bg-[#00f0ff]/20'
              }`}>
                <Icono name="sensors" className={`${
                  estadoConexion === 'conectado' ? 'text-[#13ec6d]' :
                  estadoConexion === 'error' ? 'text-red-500' : 'text-[#00f0ff]'
                }`} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Sensor de Fuerza</p>
                <p className="text-[10px] text-slate-400">
                  {estadoConexion === 'conectado' ? 'Conectado • HX711 • 115200 baud' :
                   estadoConexion === 'error' ? 'Error de conexión' : 'Desconectado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {estadoConexion === 'conectado' ? (
                <>
                  <button 
                    onClick={() => enviarComando('t')} 
                    className="px-2 py-1 bg-[#102218] border border-white/10 rounded text-[10px] font-bold text-white hover:bg-white/5 transition-all"
                  >
                    Tara
                  </button>
                  <button 
                    onClick={() => setMostrarPanelCalibracion(true)}
                    className="px-2 py-1 bg-[#102218] border border-[#13ec6d]/30 rounded text-[10px] font-bold text-[#13ec6d] hover:bg-[#13ec6d]/10 transition-all"
                  >
                    Calibrar
                  </button>
                  <button 
                    onClick={desconectarArduino} 
                    className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold hover:bg-red-500/30 transition-all"
                  >
                    Desconectar
                  </button>
                </>
              ) : (
                <button
                  onClick={conectarArduino}
                  disabled={!serialSoportado}
                  className="px-3 py-1.5 bg-[#13ec6d] text-[#102218] rounded-lg text-[10px] font-bold disabled:opacity-50 hover:bg-[#13ec6d]/90 transition-all"
                >
                  Conectar
                </button>
              )}
            </div>
          </div>
          
          {/* Display de fuerza actual */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#102218] rounded-lg p-2 text-center">
              <p className="text-[8px] text-slate-500 uppercase font-bold">Fuerza Actual</p>
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
          
          {/* Selector de unidad */}
          <div className="flex justify-center mt-3">
            <div className="flex bg-[#102218] rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setUnidadFuerza('kg')}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                  unidadFuerza === 'kg' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                }`}
              >
                kg
              </button>
              <button
                onClick={() => setUnidadFuerza('N')}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                  unidadFuerza === 'N' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                }`}
              >
                N
              </button>
            </div>
          </div>
          
          {/* Comandos del Arduino - Solo cuando está conectado */}
          {estadoConexion === 'conectado' && (
            <div className="border-t border-white/10 pt-3 mt-3">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-2">Comandos del Sensor</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => enviarComando('t')}
                  className="py-2 bg-[#102218] border border-[#00f0ff]/30 rounded-lg text-[10px] font-bold text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-all flex flex-col items-center gap-1"
                >
                  <Icono name="balance" className="text-base" />
                  <span>Destarar [t]</span>
                </button>
                <button 
                  onClick={() => enviarComando(' ')}
                  disabled={estadoTest === 'medicion'}
                  className="py-2 bg-[#13ec6d] text-[#102218] rounded-lg text-[10px] font-bold hover:bg-[#13ec6d]/80 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                >
                  <Icono name="play_arrow" className="text-base" />
                  <span>Iniciar [ESP]</span>
                </button>
                <button 
                  onClick={() => enviarComando('c')}
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
          
          {/* Panel Debug - Solo visible cuando está conectado */}
          {estadoConexion === 'conectado' && (
            <div className="border-t border-white/10 pt-3 mt-3">
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
                  <div className="max-h-32 overflow-y-auto bg-[#0a1210] rounded-lg p-2 font-mono text-[9px]">
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
            </div>
          )}
        </section>

        {/* Test Isométrico y Gráfica */}
        <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
            <Icono name="monitor_heart" className="text-[#f59e0b]" />
            Test Isométrico de Fuerza
            {estadoTest === 'medicion' && (
              <span className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-red-400 font-bold">EN VIVO</span>
              </span>
            )}
          </h3>

          {/* Gráfica mejorada */}
          <div className="mb-4">
            <GraficaFuerzaTiempo
              datos={datosFuerza}
              fuerzaPico={fuerzaPico}
              tiempoPico={tiempoPico}
              rfd={rfd}
              unidad={unidadFuerza}
              duracion={duracionTest}
              onExportar={exportarGrafica}
              evaluacionAnterior={ultimaEvaluacion}
            />
          </div>

          {/* Controles */}
          <div className="flex gap-2">
            {estadoTest === 'inactivo' && (
              <button onClick={() => setEstadoTest('listo')} className="flex-1 py-2.5 bg-[#13ec6d]/20 border border-[#13ec6d]/50 text-[#13ec6d] rounded-lg text-xs font-bold hover:bg-[#13ec6d]/30 transition-all">
                Preparar Test
              </button>
            )}
            {estadoTest === 'listo' && (
              <button onClick={iniciarTest} className="flex-1 py-2.5 bg-[#13ec6d] text-[#102218] rounded-lg text-xs font-bold animate-pulse hover:bg-[#13ec6d]/90 transition-all">
                ¡INICIAR MEDICIÓN!
              </button>
            )}
            {estadoTest === 'medicion' && (
              <button onClick={detenerTest} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all">
                DETENER MEDICIÓN
              </button>
            )}
            {estadoTest === 'finalizado' && (
              <>
                <button onClick={reiniciarTest} className="flex-1 py-2.5 bg-[#102218] border border-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/5 transition-all">
                  Repetir Test
                </button>
                <button onClick={guardarEvaluacion} className="flex-1 py-2.5 bg-[#13ec6d] text-[#102218] rounded-lg text-xs font-bold hover:bg-[#13ec6d]/90 transition-all">
                  Guardar Evaluación
                </button>
              </>
            )}
          </div>

          <p className="text-[9px] text-slate-500 text-center mt-2">
            {modoTest === 'arduino' ? 'Modo Sensor Real • HX711' : 'Modo Simulación'}
          </p>
        </section>

        {/* Panel de Clasificación - Nuevo */}
        {estadoTest === 'finalizado' && clasificacion && musculoConTest && (
          <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Icono name="military_tech" className="text-[#f59e0b]" />
              Clasificación Automática
            </h3>
            
            {/* Badge de clasificación principal */}
            <div 
              className="rounded-xl p-4 mb-4 text-center"
              style={{ backgroundColor: `${clasificacion.color}15`, border: `2px solid ${clasificacion.color}` }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">{clasificacion.emoji}</span>
                <span 
                  className="text-2xl font-bold uppercase tracking-wider"
                  style={{ color: clasificacion.color }}
                >
                  {clasificacion.nivel}
                </span>
                <span className="text-2xl">{clasificacion.emoji}</span>
              </div>
              <p className="text-xs text-slate-400">
                {musculoConTest.name} - {musculoConTest.test.testName}
              </p>
            </div>

            {/* Métricas calculadas */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#102218] rounded-lg p-3 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Índice de Fuerza (IF)</p>
                <p className="text-xl font-bold text-[#13ec6d]">{indiceFuerza.toFixed(2)}</p>
                <p className="text-[8px] text-slate-500">kg/kg</p>
              </div>
              <div className="bg-[#102218] rounded-lg p-3 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Índice de Fatiga</p>
                <p className="text-xl font-bold text-[#f59e0b]">{indiceFatigaCalculado}%</p>
                <p className="text-[8px] text-slate-500">caída de fuerza</p>
              </div>
              <div className="bg-[#102218] rounded-lg p-3 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Fuerza Pico</p>
                <p className="text-xl font-bold text-white">{fuerzaPico.toFixed(1)}</p>
                <p className="text-[8px] text-slate-500">{unidadFuerza}</p>
              </div>
            </div>

            {/* Comparación con valores normativos */}
            <div className="bg-[#102218] rounded-lg p-3">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-2">Comparación con Valores Normativos</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                    <span className="text-[10px] text-slate-400">Bajo</span>
                  </div>
                  <span className="text-[10px] text-white font-mono">{musculoConTest.normativeRange.bajo[0]}-{musculoConTest.normativeRange.bajo[1]} kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
                    <span className="text-[10px] text-slate-400">Medio</span>
                  </div>
                  <span className="text-[10px] text-white font-mono">{musculoConTest.normativeRange.medio[0]}-{musculoConTest.normativeRange.medio[1]} kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#13ec6d]"></span>
                    <span className="text-[10px] text-slate-400">Alto</span>
                  </div>
                  <span className="text-[10px] text-white font-mono">{musculoConTest.normativeRange.alto[0]}-{musculoConTest.normativeRange.alto[1]} kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00f0ff]"></span>
                    <span className="text-[10px] text-slate-400">Elite</span>
                  </div>
                  <span className="text-[10px] text-white font-mono">{musculoConTest.normativeRange.elite[0]}-{musculoConTest.normativeRange.elite[1]} kg</span>
                </div>
              </div>
              
              {/* Tu resultado */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#13ec6d] font-bold">Tu resultado:</span>
                  <span 
                    className="text-sm font-bold"
                    style={{ color: clasificacion.color }}
                  >
                    {fuerzaPico.toFixed(1)} {unidadFuerza} ({clasificacion.nivel.toUpperCase()})
                  </span>
                </div>
              </div>
            </div>

            {/* Lado evaluado (si es bilateral) */}
            {musculoConTest.test.bilateral && ladoSeleccionado && (
              <div className="mt-3 bg-[#00f0ff]/10 rounded-lg p-2 text-center border border-[#00f0ff]/30">
                <span className="text-[10px] text-[#00f0ff] font-bold">
                  Lado evaluado: {ladoSeleccionado === 'L' ? 'Izquierdo' : 'Derecho'}
                </span>
              </div>
            )}
          </section>
        )}

        {/* Panel de Información Muscular */}
        {musculoActual && (
          <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Información Muscular
            </h3>
            
            <div className="space-y-3">
              {/* Músculo actual */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{musculoActual.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {musculoActual.bodyRegion === 'upper' ? 'Tren Superior' :
                     musculoActual.bodyRegion === 'core' ? 'Core' : 'Tren Inferior'}
                  </p>
                </div>
                {estadoTest === 'finalizado' && interpretacion && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Nivel de Fuerza</p>
                    <p className="text-sm font-bold" style={{ color: interpretacion.fuerzaMaxima.color }}>
                      {interpretacion.fuerzaMaxima.nivel}
                    </p>
                  </div>
                )}
              </div>

              {/* Métricas del test */}
              {estadoTest === 'finalizado' && (
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
                  <div className="bg-[#102218] rounded-lg p-2">
                    <p className="text-[9px] text-slate-500">Fuerza Máxima</p>
                    <p className="text-base font-bold text-[#13ec6d]">{fuerzaPico.toFixed(1)} {unidadFuerza}</p>
                  </div>
                  <div className="bg-[#102218] rounded-lg p-2">
                    <p className="text-[9px] text-slate-500">RFD (0-200ms)</p>
                    <p className="text-base font-bold text-white">{rfd.toFixed(0)} {unidadFuerza}/s</p>
                  </div>
                  <div className="bg-[#102218] rounded-lg p-2">
                    <p className="text-[9px] text-slate-500">Tiempo hasta Fmax</p>
                    <p className="text-base font-bold text-white">{tiempoPico} ms</p>
                  </div>
                  <div className="bg-[#102218] rounded-lg p-2">
                    <p className="text-[9px] text-slate-500">Fuerza Media</p>
                    <p className="text-base font-bold text-white">{fuerzaMedia.toFixed(1)} {unidadFuerza}</p>
                  </div>
                  <div className="bg-[#102218] rounded-lg p-2">
                    <p className="text-[9px] text-slate-500">Índice de Fatiga</p>
                    <p className="text-base font-bold text-[#f59e0b]">{indiceFatiga}%</p>
                  </div>
                  <div className="bg-[#102218] rounded-lg p-2">
                    <p className="text-[9px] text-slate-500">Duración del Test</p>
                    <p className="text-base font-bold text-white">{(duracionTest / 1000).toFixed(1)} s</p>
                  </div>
                </div>
              )}

              {/* Interpretación automática */}
              {estadoTest === 'finalizado' && interpretacion && (
                <div className="bg-[#102218] rounded-lg p-3 border border-[#13ec6d]/20 mt-3">
                  <p className="text-[10px] font-bold text-[#13ec6d] mb-2">Interpretación Automática</p>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Fuerza Máxima:</span>
                      <span className="text-[10px] font-bold" style={{ color: interpretacion.fuerzaMaxima.color }}>
                        {interpretacion.fuerzaMaxima.nivel}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">RFD:</span>
                      <span className="text-[10px] font-bold" style={{ color: interpretacion.rfd.color }}>
                        {interpretacion.rfd.nivel}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="text-[10px] text-white">
                        <span className="text-[#13ec6d]">Recomendación:</span> {interpretacion.recomendacion}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progreso histórico */}
              {ultimaEvaluacion && (
                <div className="pt-3 border-t border-white/5">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] text-slate-400">Última Evaluación</span>
                    <span className="text-sm font-bold text-white">{ultimaEvaluacion.fuerzaMaxima} {ultimaEvaluacion.unidad}</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] text-slate-400">Fecha</span>
                    <span className="text-xs text-slate-300">{ultimaEvaluacion.fecha}</span>
                  </div>
                  {/* Gráfica de progreso */}
                  <div className="h-12 w-full pt-2">
                    <div className="w-full h-full flex items-end gap-1">
                      {[40, 45, 50, 55, 70, 85].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t transition-all ${i === 5 ? 'bg-[#13ec6d]' : 'bg-[#13ec6d]/40'}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <p className="text-[8px] text-center text-slate-500 mt-1 uppercase font-bold">Últimos 6 tests</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Datos de Evaluación - Sincronizados con Sensor de Fuerza */}
        <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2 text-white">
              <Icono name="analytics" className="text-[#13ec6d]" />
              Datos de Evaluación
            </h2>
            {estadoTest === 'finalizado' && (
              <span className="px-2 py-0.5 rounded-full bg-[#13ec6d]/20 text-[#13ec6d] text-[10px] font-bold animate-pulse">
                Test Completado
              </span>
            )}
          </div>

          {/* Información del usuario y ejercicio */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-[#102218] rounded-lg p-2">
              <p className="text-[9px] text-slate-500 uppercase">Usuario</p>
              <p className="text-sm text-white font-medium">{usuarioSesion.name}</p>
            </div>
            <div className="bg-[#102218] rounded-lg p-2">
              <p className="text-[9px] text-slate-500 uppercase">Músculo</p>
              <p className="text-sm text-[#13ec6d] font-medium">{musculoActual?.name || 'Sin seleccionar'}</p>
            </div>
          </div>

          {/* Métricas del Test Isométrico - Desde el Sensor */}
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
              <Icono name="sensors" className="text-[#00f0ff] text-sm" />
              Datos del Sensor de Fuerza
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#102218] rounded-lg p-2 border border-[#13ec6d]/20">
                <p className="text-[9px] text-slate-500">Fuerza Máxima (Fmax)</p>
                <p className={`text-lg font-bold ${fuerzaPico > 0 ? 'text-[#13ec6d]' : 'text-slate-500'}`}>
                  {fuerzaPico > 0 ? fuerzaPico.toFixed(1) : '—'} {fuerzaPico > 0 ? unidadFuerza : ''}
                </p>
              </div>
              <div className="bg-[#102218] rounded-lg p-2 border border-[#13ec6d]/20">
                <p className="text-[9px] text-slate-500">RFD (0-200ms)</p>
                <p className={`text-lg font-bold ${rfd > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {rfd > 0 ? rfd.toFixed(0) : '—'} {rfd > 0 ? `${unidadFuerza}/s` : ''}
                </p>
              </div>
              <div className="bg-[#102218] rounded-lg p-2 border border-[#13ec6d]/20">
                <p className="text-[9px] text-slate-500">Tiempo hasta Fmax</p>
                <p className={`text-lg font-bold ${tiempoPico > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {tiempoPico > 0 ? tiempoPico : '—'} {tiempoPico > 0 ? 'ms' : ''}
                </p>
              </div>
              <div className="bg-[#102218] rounded-lg p-2 border border-[#13ec6d]/20">
                <p className="text-[9px] text-slate-500">Fuerza Media</p>
                <p className={`text-lg font-bold ${fuerzaMedia > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {fuerzaMedia > 0 ? fuerzaMedia.toFixed(1) : '—'} {fuerzaMedia > 0 ? unidadFuerza : ''}
                </p>
              </div>
              <div className="bg-[#102218] rounded-lg p-2 border border-[#13ec6d]/20">
                <p className="text-[9px] text-slate-500">Índice de Fatiga</p>
                <p className={`text-lg font-bold ${indiceFatiga > 0 ? 'text-[#f59e0b]' : 'text-slate-500'}`}>
                  {indiceFatiga > 0 ? `${indiceFatiga}%` : '—'}
                </p>
              </div>
              <div className="bg-[#102218] rounded-lg p-2 border border-[#13ec6d]/20">
                <p className="text-[9px] text-slate-500">Duración del Test</p>
                <p className={`text-lg font-bold ${duracionTest > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {duracionTest > 0 ? (duracionTest / 1000).toFixed(1) : '—'} {duracionTest > 0 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Referencia para Cargas - Estimación 1RM basada en Fmax */}
          <div className="bg-[#102218] rounded-lg p-3 border border-[#00f0ff]/30 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#00f0ff]">Referencia para Cargas de Entrenamiento</p>
              {fuerzaPico > 0 && (
                <span className="text-[9px] text-slate-400">Basado en Fmax</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[9px] text-slate-500 mb-1">1RM Estimado (kg)</p>
                <input
                  type="number"
                  value={rm1 || (fuerzaPico > 0 ? Math.round(fuerzaPico * 1.15) : '')}
                  onChange={(e) => setRm1(e.target.value)}
                  placeholder={fuerzaPico > 0 ? Math.round(fuerzaPico * 1.15).toString() : '0.0'}
                  className="w-full bg-[#102218] border border-[#00f0ff]/30 rounded-lg px-2 py-2 text-[#00f0ff] text-sm font-bold focus:border-[#00f0ff] focus:outline-none"
                />
              </div>
              <div className="text-center">
                <Icono name="arrow_forward" className="text-[#00f0ff]" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-[9px] text-slate-500 mb-1">Carga Sugerida (75%)</p>
                <p className="text-xl font-bold text-[#13ec6d]">
                  {(rm1 ? Math.round(parseFloat(rm1) * 0.75) : (fuerzaPico > 0 ? Math.round(fuerzaPico * 1.15 * 0.75) : 0))} kg
                </p>
              </div>
            </div>
          </div>

          {/* Fecha y botón de guardar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-500">Fecha del Test</p>
              <p className="text-xs text-white">{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <button
              onClick={guardarEvaluacion}
              disabled={estadoTest !== 'finalizado' || fuerzaPico === 0 || guardandoSupabase}
              className="px-4 py-2 bg-[#13ec6d] text-[#102218] rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#13ec6d]/90 transition-all flex items-center gap-1"
            >
              <Icono name="save" className="text-sm" />
              {guardandoSupabase ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </div>

          {exitoGuardado && (
            <div className="mt-3 bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-lg p-2 flex items-center gap-2">
              <Icono name="check_circle" className="text-[#13ec6d]" />
              <span className="text-xs text-[#13ec6d]">Evaluación guardada correctamente (local)</span>
            </div>
          )}

          {exitoSupabase && (
            <div className="mt-3 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-lg p-2 flex items-center gap-2">
              <Icono name="cloud_done" className="text-[#00f0ff]" />
              <span className="text-xs text-[#00f0ff]">Evaluación guardada en Supabase correctamente</span>
            </div>
          )}
        </section>

        {/* Carga Sugerida */}
        {mostrarCargas && cargasEntrenamiento.length > 0 && (
          <section className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
              <Icono name="fitness_center" className="text-[#00f0ff]" />
              Cargas de Entrenamiento
            </h3>
            
            {/* Leyenda de objetivos */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-2 text-center">
                <p className="text-[9px] text-[#f59e0b] font-bold">Resistencia</p>
                <p className="text-[8px] text-slate-400">40-60%</p>
              </div>
              <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-lg p-2 text-center">
                <p className="text-[9px] text-[#00f0ff] font-bold">Hipertrofia</p>
                <p className="text-[8px] text-slate-400">65-75%</p>
              </div>
              <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-lg p-2 text-center">
                <p className="text-[9px] text-[#13ec6d] font-bold">Fuerza</p>
                <p className="text-[8px] text-slate-400">80-100%</p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              {cargasEntrenamiento.map(({ porcentaje, carga, objetivo }) => (
                <div key={porcentaje} className={`flex items-center justify-between rounded-lg p-2 border ${
                  objetivo === 'Fuerza Máxima' ? 'bg-[#13ec6d]/5 border-[#13ec6d]/20' :
                  objetivo === 'Fuerza' ? 'bg-[#13ec6d]/10 border-[#13ec6d]/30' :
                  objetivo === 'Hipertrofia' ? 'bg-[#00f0ff]/10 border-[#00f0ff]/30' :
                  'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-10 ${
                      objetivo === 'Fuerza Máxima' || objetivo === 'Fuerza' ? 'text-[#13ec6d]' :
                      objetivo === 'Hipertrofia' ? 'text-[#00f0ff]' : 'text-[#f59e0b]'
                    }`}>{porcentaje}%</span>
                    <span className="text-sm text-white font-bold">{carga} kg</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    objetivo === 'Fuerza Máxima' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' :
                    objetivo === 'Fuerza' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' :
                    objetivo === 'Hipertrofia' ? 'bg-[#00f0ff]/20 text-[#00f0ff]' :
                    'bg-[#f59e0b]/20 text-[#f59e0b]'
                  }`}>{objetivo}</span>
                </div>
              ))}
            </div>
            
            {/* Nota sobre cálculo */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[9px] text-slate-500 text-center">
                Cálculo basado en Fmax: <span className="text-[#13ec6d]">{fuerzaPico > 0 ? fuerzaPico.toFixed(1) : '—'} {unidadFuerza}</span>
                {rm1 && <span className="text-slate-400"> (1RM ajustado: {rm1} kg)</span>}
              </p>
            </div>
          </section>
        )}

        {/* Botón para mostrar cargas */}
        <button
          onClick={() => setMostrarCargas(!mostrarCargas)}
          disabled={!rm1 && fuerzaPico === 0 && !ultimaEvaluacion}
          className="w-full bg-[#102218] border border-[#00f0ff]/50 text-[#00f0ff] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00f0ff]/10 transition-all"
        >
          <Icono name="calculate" /> 
          {mostrarCargas ? 'Ocultar Cargas' : 'Generar Cargas de Entrenamiento'}
        </button>
      </main>

      {/* Modal de Calibración */}
      <PanelCalibracion
        visible={mostrarPanelCalibracion}
        onClose={() => setMostrarPanelCalibracion(false)}
        onCalibrar={calibrarSensor}
        calibracionActual={calibracion}
      />

      {/* Estilos CSS para el mapa muscular */}
      <style jsx global>{`
        .muscle-spot {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .muscle-spot:hover {
          fill: #13ec6d !important;
          fill-opacity: 0.7;
          filter: drop-shadow(0 0 4px #13ec6d);
        }
        .muscle-active {
          fill: #13ec6d !important;
          fill-opacity: 0.9;
          filter: drop-shadow(0 0 6px #13ec6d);
        }
      `}</style>
    </div>
  )
}
