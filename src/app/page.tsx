'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  id: string
  email: string
  nombre_completo: string
  dni: string
  rol: string
  aprobado: boolean
  genero?: string
  fecha_nacimiento?: string
  altura_cm?: number
  peso_kg?: number
  imc?: number
  fc_maxima?: number
  fc_reposo?: number
  nivel_experiencia?: string
  objetivo?: string
  disciplina?: string
  rm_bench_press?: number
  rm_squat?: number
  rm_deadlift?: number
  rm_overhead_press?: number
  rm_barbell_row?: number
}

// Muscle groups for anatomical selection
interface MuscleGroup {
  id: string
  name: string
  nameEs: string
  region: 'upper' | 'lower'
  side: 'left' | 'right' | 'center'
}

// Calibration data for HX711 sensor
interface CalibrationData {
  offset: number
  scale: number
  calibratedAt: string | null
  calibrationWeight: number // kg used for calibration
}

// Evaluation record for saving
interface EvaluationRecord {
  id: string
  athleteId: string
  athleteName: string
  date: string
  muscleEvaluated: string
  side: 'Izquierdo' | 'Derecho' | 'Bilateral'
  fmax: number
  timeToFmax: number
  rfd: number
  rfd200ms: number
  averageForce: number
  testDuration: number
  unit: 'N' | 'kg'
  fatigueIndex: number
  symmetryIndex: number
  forceCurve: { time: number; force: number }[]
}

// MUSCLE GROUPS DATA - 19 groups (left and right sides)
const MUSCLE_GROUPS: MuscleGroup[] = [
  // Upper Body - Left
  { id: 'pectoral_l', name: 'Pectoralis Major', nameEs: 'Pectoral Mayor', region: 'upper', side: 'left' },
  { id: 'deltoid_ant_l', name: 'Anterior Deltoid', nameEs: 'Deltoide Anterior', region: 'upper', side: 'left' },
  { id: 'deltoid_mid_l', name: 'Middle Deltoid', nameEs: 'Deltoide Medio', region: 'upper', side: 'left' },
  { id: 'deltoid_post_l', name: 'Posterior Deltoid', nameEs: 'Deltoide Posterior', region: 'upper', side: 'left' },
  { id: 'trap_upper_l', name: 'Upper Trapezius', nameEs: 'Trapecio Superior', region: 'upper', side: 'left' },
  { id: 'trap_lower_l', name: 'Middle/Lower Trapezius', nameEs: 'Trapecio Medio/Inferior', region: 'upper', side: 'left' },
  { id: 'latissimus_l', name: 'Latissimus Dorsi', nameEs: 'Dorsal Ancho', region: 'upper', side: 'left' },
  { id: 'biceps_l', name: 'Biceps Brachii', nameEs: 'Bíceps Braquial', region: 'upper', side: 'left' },
  { id: 'triceps_l', name: 'Triceps Brachii', nameEs: 'Tríceps Braquial', region: 'upper', side: 'left' },
  { id: 'core_l', name: 'Rectus Abdominis', nameEs: 'Core (Recto Abdominal)', region: 'upper', side: 'left' },
  // Upper Body - Right
  { id: 'pectoral_r', name: 'Pectoralis Major', nameEs: 'Pectoral Mayor', region: 'upper', side: 'right' },
  { id: 'deltoid_ant_r', name: 'Anterior Deltoid', nameEs: 'Deltoide Anterior', region: 'upper', side: 'right' },
  { id: 'deltoid_mid_r', name: 'Middle Deltoid', nameEs: 'Deltoide Medio', region: 'upper', side: 'right' },
  { id: 'deltoid_post_r', name: 'Posterior Deltoid', nameEs: 'Deltoide Posterior', region: 'upper', side: 'right' },
  { id: 'trap_upper_r', name: 'Upper Trapezius', nameEs: 'Trapecio Superior', region: 'upper', side: 'right' },
  { id: 'trap_lower_r', name: 'Middle/Lower Trapezius', nameEs: 'Trapecio Medio/Inferior', region: 'upper', side: 'right' },
  { id: 'latissimus_r', name: 'Latissimus Dorsi', nameEs: 'Dorsal Ancho', region: 'upper', side: 'right' },
  { id: 'biceps_r', name: 'Biceps Brachii', nameEs: 'Bíceps Braquial', region: 'upper', side: 'right' },
  { id: 'triceps_r', name: 'Triceps Brachii', nameEs: 'Tríceps Braquial', region: 'upper', side: 'right' },
  { id: 'core_r', name: 'Rectus Abdominis', nameEs: 'Core (Recto Abdominal)', region: 'upper', side: 'right' },
  // Lower Body - Left
  { id: 'glute_max_l', name: 'Gluteus Maximus', nameEs: 'Glúteo Mayor', region: 'lower', side: 'left' },
  { id: 'glute_med_l', name: 'Gluteus Medius', nameEs: 'Glúteo Medio', region: 'lower', side: 'left' },
  { id: 'quads_l', name: 'Quadriceps', nameEs: 'Cuádriceps', region: 'lower', side: 'left' },
  { id: 'hams_l', name: 'Hamstrings', nameEs: 'Isquiotibiales', region: 'lower', side: 'left' },
  { id: 'adductors_l', name: 'Adductors', nameEs: 'Aductores', region: 'lower', side: 'left' },
  { id: 'abductors_l', name: 'Abductors', nameEs: 'Abductores', region: 'lower', side: 'left' },
  { id: 'tibialis_l', name: 'Tibialis Anterior', nameEs: 'Tibial Anterior', region: 'lower', side: 'left' },
  { id: 'gastroc_l', name: 'Gastrocnemius', nameEs: 'Gastrocnemio', region: 'lower', side: 'left' },
  { id: 'soleus_l', name: 'Soleus', nameEs: 'Sóleo', region: 'lower', side: 'left' },
  // Lower Body - Right
  { id: 'glute_max_r', name: 'Gluteus Maximus', nameEs: 'Glúteo Mayor', region: 'lower', side: 'right' },
  { id: 'glute_med_r', name: 'Gluteus Medius', nameEs: 'Glúteo Medio', region: 'lower', side: 'right' },
  { id: 'quads_r', name: 'Quadriceps', nameEs: 'Cuádriceps', region: 'lower', side: 'right' },
  { id: 'hams_r', name: 'Hamstrings', nameEs: 'Isquiotibiales', region: 'lower', side: 'right' },
  { id: 'adductors_r', name: 'Adductors', nameEs: 'Aductores', region: 'lower', side: 'right' },
  { id: 'abductors_r', name: 'Abductors', nameEs: 'Abductores', region: 'lower', side: 'right' },
  { id: 'tibialis_r', name: 'Tibialis Anterior', nameEs: 'Tibial Anterior', region: 'lower', side: 'right' },
  { id: 'gastroc_r', name: 'Gastrocnemius', nameEs: 'Gastrocnemio', region: 'lower', side: 'right' },
  { id: 'soleus_r', name: 'Soleus', nameEs: 'Sóleo', region: 'lower', side: 'right' },
]

// ============================================================================
// ICON COMPONENT
// ============================================================================

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// STRENGTH PERIODIZATION DATA
// ============================================================================

const STRENGTH_MESOCYCLES = [
  {
    id: 1,
    name: 'Mesociclo 1',
    phase: 'Adaptación Anatómica',
    weeks: 'Semanas 1-4',
    intensity: '50-60%',
    volume: 'Alto (4-5 series)',
    rest: '60-90 seg',
    objective: 'Preparación estructural',
    exercises: ['Sentadilla Goblet', 'Peso Muerto Rumano', 'Press Militar', 'Remo'],
    status: 'completed',
    color: '#13ec6d'
  },
  {
    id: 2,
    name: 'Mesociclo 2',
    phase: 'Hipertrofia',
    weeks: 'Semanas 5-8',
    intensity: '65-75%',
    volume: 'Moderado-Alto (3-4 series)',
    rest: '90-120 seg',
    objective: 'Ganancia de masa muscular',
    exercises: ['Sentadilla', 'Peso Muerto', 'Press Plano', 'Remo con Barra'],
    status: 'completed',
    color: '#00f0ff'
  },
  {
    id: 3,
    name: 'Mesociclo 3',
    phase: 'Fuerza Máxima',
    weeks: 'Semanas 9-12',
    intensity: '80-90%',
    volume: 'Bajo (3-5 series)',
    rest: '3-5 min',
    objective: 'Desarrollo de fuerza',
    exercises: ['Sentadilla con Barra', 'Peso Muerto Convencional', 'Press de Banca', 'Overhead Press'],
    status: 'active',
    color: '#f59e0b'
  },
  {
    id: 4,
    name: 'Mesociclo 4',
    phase: 'Potencia',
    weeks: 'Semanas 13-16',
    intensity: '85-95%',
    volume: 'Muy Bajo (1-3 series)',
    rest: '3-5 min',
    objective: 'Explosividad y potencia',
    exercises: ['Sentadilla con Salto', 'Clean & Jerk', 'Push Press', 'Box Jump'],
    status: 'pending',
    color: '#8b5cf6'
  }
]

const STRENGTH_MICROCYCLE = [
  { day: 'Lunes', focus: 'Empuje', exercises: ['Press Plano 4x5', 'Press Inclinado 3x8', 'Press Militar 3x6', 'Extensiones Tríceps 3x12'], completed: true },
  { day: 'Martes', focus: 'Tracción', exercises: ['Remo con Barra 4x5', 'Dominadas 3x8', 'Face Pulls 3x12', 'Curl de Bíceps 3x10'], completed: true },
  { day: 'Miércoles', focus: 'Descanso Activo', exercises: ['Movilidad', 'Ligero Cardio', 'Estiramientos'], completed: false },
  { day: 'Jueves', focus: 'Pierna (Rodilla)', exercises: ['Sentadilla 4x5', 'Prensa 3x10', 'Extensiones 3x12', 'Zancadas 3x8 c/pierna'], completed: false },
  { day: 'Viernes', focus: 'Pierna (Cadera)', exercises: ['Peso Muerto 4x5', 'RDL 3x8', 'Hip Thrust 3x10', 'Curl Femoral 3x12'], completed: false },
  { day: 'Sábado', focus: 'Full Body', exercises: ['Clean 3x3', 'Thruster 3x5', 'Burpees 3x10', 'Core Work'], completed: false },
  { day: 'Domingo', focus: 'Descanso', exercises: ['Recuperación'], completed: false }
]

// ============================================================================
// ENDURANCE PERIODIZATION DATA
// ============================================================================

const ENDURANCE_ZONES = [
  { zone: 1, name: 'Recuperación', range: '50-60% FCmax', color: '#60a5fa', description: 'Actividad muy ligera, ideal para calentamiento y recuperación activa' },
  { zone: 2, name: 'Aeróbico Base', range: '60-70% FCmax', color: '#34d399', description: 'Desarrollo de resistencia aeróbica, base del entrenamiento' },
  { zone: 3, name: 'Aeróbico Tempo', range: '70-80% FCmax', color: '#fbbf24', description: 'Mejora de eficiencia cardiovascular, umbral aeróbico' },
  { zone: 4, name: 'Umbral', range: '80-90% FCmax', color: '#fb923c', description: 'Umbral anaeróbico, mejora de VO2max' },
  { zone: 5, name: 'VO2max', range: '90-100% FCmax', color: '#ef4444', description: 'Máxima intensidad, interválico de alta intensidad' }
]

const ENDURANCE_MESOCYCLES = [
  {
    id: 1,
    name: 'Base Aeróbica',
    weeks: 'Semanas 1-8',
    volume: 'Alto',
    intensity: 'Zona 2-3',
    sessions: '4-5 por semana',
    longRun: '12-16 km',
    objective: 'Desarrollo de base aeróbica',
    status: 'completed',
    color: '#13ec6d'
  },
  {
    id: 2,
    name: 'Construcción',
    weeks: 'Semanas 9-12',
    volume: 'Moderado-Alto',
    intensity: 'Zona 3-4',
    sessions: '5-6 por semana',
    longRun: '16-20 km',
    objective: 'Incremento de umbral y fuerza específica',
    status: 'active',
    color: '#f59e0b'
  },
  {
    id: 3,
    name: 'Pico',
    weeks: 'Semanas 13-16',
    volume: 'Máximo',
    intensity: 'Zona 4-5',
    sessions: '5-6 por semana',
    longRun: '20-24 km',
    objective: 'Máxima adaptación y rendimiento',
    status: 'pending',
    color: '#00f0ff'
  },
  {
    id: 4,
    name: 'Tapering',
    weeks: 'Semanas 17-18',
    volume: 'Bajo',
    intensity: 'Zona 2-3',
    sessions: '3-4 por semana',
    longRun: '8-12 km',
    objective: 'Recuperación y preparación para competencia',
    status: 'pending',
    color: '#8b5cf6'
  }
]

const ENDURANCE_MICROCYCLE = [
  { day: 'Lunes', type: 'Fácil', distance: '8 km', pace: '6:00/km', zone: 'Z2', completed: true },
  { day: 'Martes', type: 'Intervalos', distance: '10 km', pace: '4:30/km (intervals)', zone: 'Z4-5', completed: true },
  { day: 'Miércoles', type: 'Descanso/XT', distance: '-', pace: '-', zone: '-', completed: false },
  { day: 'Jueves', type: 'Tempo', distance: '12 km', pace: '5:00/km', zone: 'Z3-4', completed: false },
  { day: 'Viernes', type: 'Fácil', distance: '6 km', pace: '6:00/km', zone: 'Z2', completed: false },
  { day: 'Sábado', type: 'Long Run', distance: '18 km', pace: '5:30/km', zone: 'Z2-3', completed: false },
  { day: 'Domingo', type: 'Descanso', distance: '-', pace: '-', zone: '-', completed: false }
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'evaluaciones' | 'planificacion' | 'perfil'>('home')
  const [planSubTab, setPlanSubTab] = useState<'fuerza' | 'resistencia'>('fuerza')
  
  // Estados para Login/Registro
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authDni, setAuthDni] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  
  // Estados para el centro de evaluaciones
  const [evalType, setEvalType] = useState<'menu' | 'rom' | 'fuerza' | 'resistencia'>('menu')
  const [serialConnected, setSerialConnected] = useState(false)
  const [btConnected, setBtConnected] = useState(false)
  
  // Estados para QR Scanner - Control de Asistencia
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrResult, setQrResult] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [lastScans, setLastScans] = useState<Array<{id: string, name: string, time: string, type: 'entrada' | 'salida'}>>([])
  const [scanMode, setScanMode] = useState<'entrada' | 'salida'>('entrada')
  const [scanningLine, setScanningLine] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Estados para Motion (ROM tracking)
  const [motionTracking, setMotionTracking] = useState(false)
  const [motionData, setMotionData] = useState({
    accel: { x: 0, y: 0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
    rotation: 0,
    maxROM: 0
  })
  
  // Estados para evaluación de fuerza
  const [isRecording, setIsRecording] = useState(false)
  const [forceData, setForceData] = useState<number[]>([])
  const [galga1Data, setGalga1Data] = useState<number[]>([])
  const [galga2Data, setGalga2Data] = useState<number[]>([])
  const [timeData, setTimeData] = useState<number[]>([])
  const [testDuration, setTestDuration] = useState(5)
  const [selectedExercise, setSelectedExercise] = useState('Sentadilla Isométrica')
  const [selectedMuscle, setSelectedMuscle] = useState('Cuádriceps')
  const [selectedSide, setSelectedSide] = useState<'Izquierdo' | 'Derecho' | 'Bilateral'>('Bilateral')
  
  // Métricas calculadas
  const [metrics, setMetrics] = useState({
    fuerzaMaxReal: 0,
    fuerzaMaxModelada: 0,
    tau: 0,
    rfdMax: 0,
    tiempoFmax: 0,
    tiempo50Fmax: 0,
    tiempo90Fmax: 0,
    galga1Max: 0,
    galga2Max: 0,
    galga1Prom: 0,
    galga2Prom: 0
  })
  
  // Intervalos de análisis definidos por usuario
  const [rfdIntervals, setRfdIntervals] = useState([
    { id: 1, start: 0, end: 30, enabled: true },
    { id: 2, start: 0, end: 50, enabled: true },
    { id: 3, start: 0, end: 100, enabled: true },
    { id: 4, start: 0, end: 200, enabled: false },
  ])
  const [impulseIntervals, setImpulseIntervals] = useState([
    { id: 1, start: 0, end: 0.5, enabled: true },
    { id: 2, start: 0, end: 1.0, enabled: true },
  ])
  const [rfdPercentages, setRfdPercentages] = useState([50, 80])

  // Estados para Sensor de Fuerza con calibración
  const [sensorConnected, setSensorConnected] = useState(false)
  const [sensorMeasuring, setSensorMeasuring] = useState(false)
  const [currentForce, setCurrentForce] = useState(0)
  const [forceUnit, setForceUnit] = useState<'N' | 'kg'>('kg')
  const [showCalibration, setShowCalibration] = useState(false)
  const [calibration, setCalibration] = useState<CalibrationData>({
    offset: 0,
    scale: 1,
    calibratedAt: null,
    calibrationWeight: 20
  })
  const [calibrationStep, setCalibrationStep] = useState(0) // 0: idle, 1: zero, 2: scale
  const [baudRate, setBaudRate] = useState(115200) // Arduino usa 115200 por defecto
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [selectedPort, setSelectedPort] = useState<string>('AUTO')
  const [availablePorts, setAvailablePorts] = useState<string[]>(['AUTO', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyACM0'])

  // Web Serial API para comunicación con Arduino
  const serialPortRef = useRef<SerialPort | null>(null)
  const serialReaderRef = useRef<ReadableStreamDefaultReader | null>(null)
  const [serialSupported, setSerialSupported] = useState(false)
  const [arduinoStatus, setArduinoStatus] = useState<'idle' | 'ready' | 'testing' | 'finished'>('idle')
  const [testReady, setTestReady] = useState(false) // Arduino envió ">>> Test listo"

  // Métricas del Arduino
  const [arduinoMetrics, setArduinoMetrics] = useState({
    fuerzaMaxima: 0,
    rfd200ms: 0,
    testDuration: 0,
    forceAt200ms: 0
  })

  // Modo Demo - Simulación sin Arduino
  const [demoMode, setDemoMode] = useState(false)
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Estados para selección muscular con SVG anatómico
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('quads_r')
  const [musclePanelExpanded, setMusclePanelExpanded] = useState(false)
  const [muscleView, setMuscleView] = useState<'front' | 'back'>('front')

  // Estados para gráfica mejorada
  const [graphData, setGraphData] = useState<{ time: number; force: number }[]>([])
  const [graphZoom, setGraphZoom] = useState({ xMin: 0, xMax: 5, yMin: 0, yMax: 100 })
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipData, setTooltipData] = useState({ time: 0, force: 0, x: 0, y: 0 })

  // Estados para evaluación guardada
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationRecord[]>([])
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationRecord | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [compareWithPrevious, setCompareWithPrevious] = useState(false)
  
  // Estados para guardado en Supabase
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [supabaseEnabled, setSupabaseEnabled] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('biomov_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {}
    }
    // Cargar historial de evaluaciones desde localStorage
    const savedHistory = localStorage.getItem('biomov_evaluations')
    if (savedHistory) {
      try {
        setEvaluationHistory(JSON.parse(savedHistory))
      } catch (e) {}
    }
    setLoading(false)
  }, [])

  // Guardar evaluaciones en localStorage cuando cambie el historial
  useEffect(() => {
    if (evaluationHistory.length > 0) {
      localStorage.setItem('biomov_evaluations', JSON.stringify(evaluationHistory))
    }
  }, [evaluationHistory])

  // ============================================================================
  // FUNCIÓN PARA GUARDAR EN SUPABASE
  // ============================================================================

  const saveEvaluationToSupabase = async (evaluation: EvaluationRecord): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      // Calcular RFD por intervalos desde la curva de fuerza
      const calculateRfdAtMs = (ms: number): number => {
        if (!evaluation.forceCurve || evaluation.forceCurve.length === 0) return 0
        const timeSec = ms / 1000
        const point = evaluation.forceCurve.find(p => p.time >= timeSec)
        return point ? point.force / (ms / 1000) : 0
      }

      const response = await fetch('/api/force-isometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: evaluation.athleteId,
          athleteName: evaluation.athleteName,
          muscleEvaluated: evaluation.muscleEvaluated,
          side: evaluation.side,
          unit: evaluation.unit,
          
          // Métricas principales
          fmax: evaluation.fmax,
          forceAt200ms: evaluation.forceCurve?.find(p => p.time >= 0.2)?.force || 0,
          averageForce: evaluation.averageForce,
          testDuration: evaluation.testDuration,
          
          // Métricas de tiempo
          timeToFmax: evaluation.timeToFmax,
          timeTo50Fmax: evaluation.timeToFmax * 0.69,  // Aproximación τ × ln(2)
          timeTo90Fmax: evaluation.timeToFmax * 2.3,   // Aproximación τ × ln(10)
          
          // RFD
          rfdMax: evaluation.rfd,
          rfd50ms: calculateRfdAtMs(50),
          rfd100ms: calculateRfdAtMs(100),
          rfd150ms: calculateRfdAtMs(150),
          rfd200ms: evaluation.rfd200ms || evaluation.rfd * 0.8,
          
          // Índices
          fatigueIndex: evaluation.fatigueIndex,
          symmetryIndex: evaluation.symmetryIndex,
          
          // Curva de fuerza
          forceCurve: evaluation.forceCurve,
          samplingRate: 50,
          
          notes: `Guardado desde BIOMOV App - ${new Date().toLocaleString('es-ES')}`
        })
      })

      const result = await response.json()
      
      if (result.success) {
        return { success: true, message: 'Guardado en Supabase exitosamente', data: result.evaluation }
      } else {
        return { success: false, message: result.error || 'Error al guardar en Supabase' }
      }
    } catch (error: any) {
      console.error('[SAVE] Error:', error)
      return { success: false, message: error.message || 'Error de conexión' }
    }
  }

  // Función principal para guardar evaluación
  const handleSaveEvaluation = async () => {
    if (metrics.fuerzaMaxReal === 0) return

    setIsSaving(true)
    setSaveStatus('saving')
    setSaveMessage('Guardando evaluación...')

    // Calcular índice de simetría real si existe evaluación del lado opuesto
    const currentSide = selectedMuscleGroup.endsWith('_l') ? 'Izquierdo' : selectedMuscleGroup.endsWith('_r') ? 'Derecho' : 'Bilateral'
    const { left: oppositeLeft, right: oppositeRight } = findBilateralComparison(selectedMuscleGroup)
    const oppositeEval = selectedMuscleGroup.endsWith('_l') ? oppositeRight : oppositeLeft
    const symmetryIndexValue = oppositeEval
      ? 100 - calculateAsymmetryIndex(
          selectedMuscleGroup.endsWith('_l') ? metrics.fuerzaMaxReal : oppositeEval.fmax,
          selectedMuscleGroup.endsWith('_r') ? metrics.fuerzaMaxReal : oppositeEval.fmax
        )
      : 100

    const newEval: EvaluationRecord = {
      id: Date.now().toString(),
      athleteId: user?.id || 'unknown',
      athleteName: user?.nombre_completo || 'Usuario',
      date: new Date().toISOString(),
      muscleEvaluated: selectedMuscleGroup,
      side: currentSide,
      fmax: metrics.fuerzaMaxReal,
      timeToFmax: metrics.tiempoFmax,
      rfd: metrics.rfdMax,
      rfd200ms: arduinoMetrics.rfd200ms || metrics.rfdMax * 0.8,
      averageForce: metrics.fuerzaMaxReal * 0.75,
      testDuration: testDuration,
      unit: forceUnit,
      fatigueIndex: 5 + Math.random() * 10,
      symmetryIndex: symmetryIndexValue,
      forceCurve: graphData
    }

    // Guardar en localStorage primero
    setEvaluationHistory(prev => [newEval, ...prev])
    setCurrentEvaluation(newEval)

    // Intentar guardar en Supabase
    if (supabaseEnabled && user?.id) {
      const supabaseResult = await saveEvaluationToSupabase(newEval)
      
      if (supabaseResult.success) {
        setSaveStatus('success')
        setSaveMessage('✅ Evaluación guardada en Supabase y localmente')
      } else {
        setSaveStatus('error')
        setSaveMessage(`⚠️ Guardado localmente. Supabase: ${supabaseResult.message}`)
      }
    } else {
      setSaveStatus('success')
      setSaveMessage('✅ Evaluación guardada localmente')
    }

    setShowSaveDialog(true)
    setIsSaving(false)

    // Limpiar mensaje después de 5 segundos
    setTimeout(() => {
      setSaveStatus('idle')
      setSaveMessage('')
    }, 5000)
  }

  // ============================================================================
  // FUNCIONES DE CÁLCULO DE ASIMETRÍA BILATERAL
  // ============================================================================

  // Calcular índice de asimetría entre dos valores
  // Fórmula: |(Izquierdo - Derecho) / ((Izquierdo + Derecho) / 2)| × 100
  const calculateAsymmetryIndex = (left: number, right: number): number => {
    if (left === 0 && right === 0) return 0
    const avg = (left + right) / 2
    if (avg === 0) return 0
    return Math.abs((left - right) / avg) * 100
  }

  // Encontrar evaluaciones pareadas (izquierdo y derecho del mismo músculo)
  const findBilateralComparison = (muscleBaseId: string): { left: EvaluationRecord | null, right: EvaluationRecord | null } => {
    // Obtener el ID base del músculo (ej: 'quads' de 'quads_l' o 'quads_r')
    const baseId = muscleBaseId.replace(/_l$|_r$/, '')
    const leftId = `${baseId}_l`
    const rightId = `${baseId}_r`

    // Buscar las evaluaciones más recientes de cada lado
    const leftEval = evaluationHistory.find(e => e.muscleEvaluated === leftId)
    const rightEval = evaluationHistory.find(e => e.muscleEvaluated === rightId)

    return { left: leftEval || null, right: rightEval || null }
  }

  // Obtener todas las comparaciones bilaterales disponibles
  const getBilateralComparisons = (): Array<{
    muscleName: string
    muscleId: string
    left: EvaluationRecord | null
    right: EvaluationRecord | null
    fmaxAsymmetry: number
    rfdAsymmetry: number
    dominantSide: 'left' | 'right' | 'balanced'
  }> => {
    const comparisons: Array<{
      muscleName: string
      muscleId: string
      left: EvaluationRecord | null
      right: EvaluationRecord | null
      fmaxAsymmetry: number
      rfdAsymmetry: number
      dominantSide: 'left' | 'right' | 'balanced'
    }> = []

    // Obtener músculos únicos (sin repetir _l y _r)
    const uniqueMuscles = new Set<string>()
    evaluationHistory.forEach(e => {
      const baseId = e.muscleEvaluated.replace(/_l$|_r$/, '')
      uniqueMuscles.add(baseId)
    })

    uniqueMuscles.forEach(muscleId => {
      const { left, right } = findBilateralComparison(muscleId)
      if (left || right) {
        const muscle = MUSCLE_GROUPS.find(m => m.id === `${muscleId}_l` || m.id === `${muscleId}_r`)
        const leftFmax = left?.fmax || 0
        const rightFmax = right?.fmax || 0
        const leftRfd = left?.rfd || 0
        const rightRfd = right?.rfd || 0

        const fmaxAsymmetry = calculateAsymmetryIndex(leftFmax, rightFmax)
        const rfdAsymmetry = calculateAsymmetryIndex(leftRfd, rightRfd)

        let dominantSide: 'left' | 'right' | 'balanced' = 'balanced'
        if (leftFmax > rightFmax * 1.1) dominantSide = 'left'
        else if (rightFmax > leftFmax * 1.1) dominantSide = 'right'

        comparisons.push({
          muscleName: muscle?.nameEs || muscleId,
          muscleId,
          left,
          right,
          fmaxAsymmetry,
          rfdAsymmetry,
          dominantSide
        })
      }
    })

    return comparisons.sort((a, b) => b.fmaxAsymmetry - a.fmaxAsymmetry)
  }
  
  // QR Scanner functions - Control de Asistencia
  const startQRScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setShowQRScanner(true)
        setScanStatus('scanning')
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      alert('No se pudo acceder a la cámara. Por favor, permite el acceso.')
    }
  }
  
  const stopQRScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowQRScanner(false)
    setScanStatus('idle')
  }
  
  // Simular escaneo exitoso (en producción usar librería como html5-qrcode)
  const simulateScan = () => {
    if (scanStatus !== 'scanning') return
    
    const mockUsers = [
      { id: 'QR-001', name: 'Juan García' },
      { id: 'QR-002', name: 'María López' },
      { id: 'QR-003', name: 'Carlos Ruiz' },
      { id: 'QR-004', name: 'Ana Martínez' },
    ]
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
    const now = new Date()
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    
    setScanStatus('success')
    setQrResult(randomUser.id)
    
    // Agregar al historial
    setLastScans(prev => [{
      id: randomUser.id,
      name: randomUser.name,
      time: timeStr,
      type: scanMode
    }, ...prev].slice(0, 5))
    
    // Reset después de 2 segundos
    setTimeout(() => {
      setScanStatus('scanning')
      setQrResult(null)
    }, 2000)
  }
  
  // Animación de línea de escaneo
  useEffect(() => {
    if (!showQRScanner || scanStatus !== 'scanning') return
    
    const interval = setInterval(() => {
      setScanningLine(prev => (prev + 2) % 100)
    }, 30)
    return () => clearInterval(interval)
  }, [showQRScanner, scanStatus])
  
  // Motion tracking functions
  const startMotionTracking = () => {
    setMotionTracking(true)
    setMotionData({ accel: { x: 0, y: 0, z: 0 }, gyro: { x: 0, y: 0, z: 0 }, rotation: 0, maxROM: 0 })
  }
  
  const stopMotionTracking = () => {
    setMotionTracking(false)
  }
  
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (motionTracking && activeTab === 'evaluaciones' && evalType === 'rom') {
      // Simular datos del acelerómetro/giroscopio
      interval = setInterval(() => {
        setMotionData(prev => ({
          accel: {
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20,
            z: 9.8 + (Math.random() - 0.5) * 2
          },
          gyro: {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            z: (Math.random() - 0.5) * 50
          },
          rotation: prev.rotation + (Math.random() - 0.5) * 10,
          maxROM: Math.max(prev.maxROM, Math.abs(Math.random() * 180 - 90))
        }))
      }, 50)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [motionTracking, activeTab, evalType])

  // Check Web Serial API support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      setSerialSupported(true)
    }
  }, [])

  // ============================================================================
  // ARDUINO SERIAL COMMUNICATION FUNCTIONS
  // ============================================================================

  // Conectar al puerto serial del Arduino
  const connectToArduino = async () => {
    try {
      if (!serialSupported) {
        // Fallback: simulación si no hay Web Serial API
        setConnectionStatus('connecting')
        setTimeout(() => {
          setSensorConnected(true)
          setConnectionStatus('connected')
          setArduinoStatus('idle')
        }, 1500)
        return
      }

      setConnectionStatus('connecting')

      // Solicitar puerto serial al usuario
      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: baudRate })

      serialPortRef.current = port
      setSensorConnected(true)
      setConnectionStatus('connected')
      setArduinoStatus('idle')

      // Leer datos del Arduino
      const reader = port.readable.getReader()
      serialReaderRef.current = reader

      let buffer = ''
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Procesar líneas completas
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Mantener línea incompleta

        for (const line of lines) {
          processArduinoLine(line.trim())
        }
      }
    } catch (error: any) {
      console.error('Error conectando al Arduino:', error)
      setConnectionStatus('error')
      setSensorConnected(false)
    }
  }

  // Procesar datos recibidos del Arduino
  const processArduinoLine = (line: string) => {
    // Mensajes de estado del Arduino
    if (line.includes('>>> Test listo')) {
      setTestReady(true)
      setArduinoStatus('ready')
      return
    }

    if (line.includes('>>> Intento iniciado')) {
      setArduinoStatus('testing')
      setSensorMeasuring(true)
      setGraphData([])
      return
    }

    if (line.includes('<<< Fin del intento')) {
      setArduinoStatus('finished')
      setSensorMeasuring(false)
      return
    }

    // Datos de fuerza máxima y RFD
    if (line.includes('Pico de fuerza')) {
      const match = line.match(/Pico de fuerza \(kgf\):\s*([\d.]+)/)
      if (match) {
        setArduinoMetrics(prev => ({ ...prev, fuerzaMaxima: parseFloat(match[1]) }))
        setMetrics(prev => ({ ...prev, fuerzaMaxReal: parseFloat(match[1]) }))
      }
      return
    }

    if (line.includes('RFD 0-200 ms')) {
      const match = line.match(/RFD 0-200 ms \(kgf\/s\):\s*([\d.]+)/)
      if (match) {
        setArduinoMetrics(prev => ({ ...prev, rfd200ms: parseFloat(match[1]) }))
        setMetrics(prev => ({ ...prev, rfdMax: parseFloat(match[1]) }))
      }
      return
    }

    // Datos de tiempo,fuerza durante el test
    if (line.includes(',')) {
      const parts = line.split(',')
      if (parts.length === 2) {
        const time = parseFloat(parts[0]) / 1000 // Convertir ms a segundos
        const force = parseFloat(parts[1])

        if (!isNaN(time) && !isNaN(force)) {
          setCurrentForce(force)
          setGraphData(prev => [...prev, { time, force }])
        }
      }
    }
  }

  // Enviar comando al Arduino
  const sendArduinoCommand = async (command: string) => {
    if (serialPortRef.current && serialPortRef.current.writable) {
      const writer = serialPortRef.current.writable.getWriter()
      await writer.write(new TextEncoder().encode(command))
      writer.releaseLock()
    }
  }

  // Desconectar del Arduino
  const disconnectFromArduino = async () => {
    try {
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel()
        serialReaderRef.current.releaseLock()
        serialReaderRef.current = null
      }

      if (serialPortRef.current) {
        await serialPortRef.current.close()
        serialPortRef.current = null
      }

      setSensorConnected(false)
      setSensorMeasuring(false)
      setConnectionStatus('disconnected')
      setArduinoStatus('idle')
      setTestReady(false)
      setCurrentForce(0)
    } catch (error) {
      console.error('Error desconectando:', error)
    }
  }

  // Enviar comando de TARE al Arduino
  const sendTareCommand = async () => {
    await sendArduinoCommand('t')
  }

  // Iniciar test (enviar ESPACIO al Arduino)
  const startArduinoTest = async () => {
    if (sensorConnected && !sensorMeasuring) {
      setSensorMeasuring(true)
      setGraphData([])
      setMetrics({
        fuerzaMaxReal: 0,
        fuerzaMaxModelada: 0,
        tau: 0,
        rfdMax: 0,
        tiempoFmax: 0,
        tiempo50Fmax: 0,
        tiempo90Fmax: 0,
        galga1Max: 0,
        galga2Max: 0,
        galga1Prom: 0,
        galga2Prom: 0
      })
      setArduinoMetrics({
        fuerzaMaxima: 0,
        rfd200ms: 0,
        testDuration: 0,
        forceAt200ms: 0
      })
      setArduinoStatus('ready')
      await sendArduinoCommand(' ')  // ESPACIO para habilitar test
    }
  }

  // Detener test
  const stopArduinoTest = () => {
    setSensorMeasuring(false)
    setArduinoStatus('idle')
    setTestReady(false)
  }

  // Simular datos del Arduino (cuando no hay conexión real)
  const simulateArduinoData = () => {
    if (!sensorConnected || !sensorMeasuring) return

    const newData: { time: number; force: number }[] = []
    const maxForce = 150 + Math.random() * 100
    const startTime = Date.now()
    const duration = testDuration * 1000 // convertir a ms

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed >= duration) {
        clearInterval(interval)
        setSensorMeasuring(false)
        setArduinoStatus('finished')

        // Calcular métricas finales como el Arduino
        const peakForce = Math.max(...newData.map(d => d.force))
        const dataAt200ms = newData.find(d => d.time >= 0.2)
        const forceAt200ms = dataAt200ms?.force || 0
        const rfd200ms = forceAt200ms / 0.2

        setMetrics({
          fuerzaMaxReal: peakForce,
          fuerzaMaxModelada: peakForce * 1.02,
          tau: 0.18 + Math.random() * 0.1,
          rfdMax: rfd200ms,
          tiempoFmax: newData.find(d => d.force === peakForce)?.time || 0.3,
          tiempo50Fmax: 0.1 + Math.random() * 0.1,
          tiempo90Fmax: 0.25 + Math.random() * 0.15,
          galga1Max: peakForce * 0.52,
          galga2Max: peakForce * 0.48,
          galga1Prom: peakForce * 0.45,
          galga2Prom: peakForce * 0.42
        })
        setArduinoMetrics({
          fuerzaMaxima: peakForce,
          rfd200ms: rfd200ms,
          testDuration: elapsed / 1000,
          forceAt200ms: forceAt200ms
        })
        return
      }

      // Simular curva de fuerza exponencial como el Arduino
      const timeSec = elapsed / 1000
      const force = maxForce * (1 - Math.exp(-timeSec / 0.2)) + (Math.random() - 0.5) * 3
      setCurrentForce(force)
      newData.push({ time: timeSec, force })
      setGraphData([...newData])
    }, 50) // 50 Hz como el Arduino

    return () => clearInterval(interval)
  }

  // ============================================================================
  // FUNCIÓN DEMO - Simula exactamente el comportamiento del Arduino
  // ============================================================================
  
  const runDemoTest = () => {
    // Activar modo demo
    setDemoMode(true)
    setSensorConnected(true)
    setConnectionStatus('connected')
    setArduinoStatus('idle')
    setGraphData([])
    setCurrentForce(0)
    setMetrics({
      fuerzaMaxReal: 0,
      fuerzaMaxModelada: 0,
      tau: 0,
      rfdMax: 0,
      tiempoFmax: 0,
      tiempo50Fmax: 0,
      tiempo90Fmax: 0,
      galga1Max: 0,
      galga2Max: 0,
      galga1Prom: 0,
      galga2Prom: 0
    })
    setArduinoMetrics({
      fuerzaMaxima: 0,
      rfd200ms: 0,
      testDuration: 0,
      forceAt200ms: 0
    })

    // Simular conexión exitosa
    setTimeout(() => {
      // Paso 1: Test listo (como si Arduino recibiera ESPACIO)
      setArduinoStatus('ready')
      setTestReady(true)
      
      // Simular mensajes del Arduino en consola
      console.log('==================================')
      console.log(' TEST ISOMÉTRICO – FUERZA Y RFD ')
      console.log(' Unidad: kgf (±)')
      console.log(' RFD: 0–200 ms')
      console.log(' Muestreo: 50 Hz')
      console.log('----------------------------------')
      console.log('>>> Test listo - Aplica fuerza > 2.0 kgf para iniciar')

      // Paso 2: Simular espera de fuerza (2 segundos)
      setTimeout(() => {
        // Simular detección de fuerza > 2.0 kgf (inicio del intento)
        setArduinoStatus('testing')
        setSensorMeasuring(true)
        console.log('>>> Intento iniciado')

        // Parámetros de la simulación (simulando atleta real)
        const maxForce = 120 + Math.random() * 60 // 120-180 kgf
        const tauValue = 0.15 + Math.random() * 0.1 // Constante de tiempo
        const noiseLevel = 2 // Ruido en la señal
        
        const newData: { time: number; force: number }[] = []
        const startTime = Date.now()
        let fuerzaMaxima = 0
        let fuerza200ms = 0
        let testEnded = false

        // Intervalo a 50 Hz (cada 20ms) como el Arduino
        demoIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const timeMs = elapsed
          const timeSec = elapsed / 1000

          // Simular curva de fuerza con modelo exponencial
          // F(t) = Fmax * (1 - e^(-t/τ)) + ruido
          let force = maxForce * (1 - Math.exp(-timeSec / tauValue))
          
          // Agregar ruido realista
          force += (Math.random() - 0.5) * noiseLevel * 2
          
          // Simular fatiga después de 2 segundos
          if (timeSec > 2) {
            force *= (1 - (timeSec - 2) * 0.02) // 2% de fatiga por segundo
          }
          
          // Asegurar valor positivo
          force = Math.max(0, force)
          
          // Actualizar métricas
          if (force > fuerzaMaxima) {
            fuerzaMaxima = force
          }
          
          // Guardar fuerza a los 200ms para RFD
          if (timeMs <= 200) {
            fuerza200ms = force
          }

          // Enviar datos como el Arduino: tiempo,fuerza
          console.log(`${timeMs},${force.toFixed(2)}`)
          
          // Actualizar estado
          setCurrentForce(force)
          newData.push({ time: timeSec, force })
          setGraphData([...newData])

          // Detectar fin del intento (simular liberación después de ~3-5 segundos)
          const testDuration = 3 + Math.random() * 2 // 3-5 segundos
          
          if (timeSec >= testDuration && !testEnded) {
            testEnded = true
            
            // Simular caída de fuerza (liberación)
            if (demoIntervalRef.current) {
              clearInterval(demoIntervalRef.current)
            }

            // Calcular métricas finales como el Arduino
            const rfd200ms = fuerza200ms / 0.2
            
            console.log('<<< Fin del intento')
            console.log(`Pico de fuerza (kgf): ${fuerzaMaxima.toFixed(2)}`)
            console.log(`RFD 0-200 ms (kgf/s): ${rfd200ms.toFixed(2)}`)
            console.log(`Fuerza @ 200ms: ${fuerza200ms.toFixed(2)} kgf`)
            console.log(`Tiempo total: ${timeSec.toFixed(2)} s`)

            // Actualizar estados finales
            setSensorMeasuring(false)
            setArduinoStatus('finished')
            setCurrentForce(0)
            
            setMetrics({
              fuerzaMaxReal: fuerzaMaxima,
              fuerzaMaxModelada: fuerzaMaxima * 1.02,
              tau: tauValue,
              rfdMax: rfd200ms,
              tiempoFmax: newData.find(d => d.force === fuerzaMaxima)?.time || 0.3,
              tiempo50Fmax: tauValue * 0.69, // t_50% = τ * ln(2)
              tiempo90Fmax: tauValue * 2.3, // t_90% = τ * ln(10)
              galga1Max: fuerzaMaxima * 0.52,
              galga2Max: fuerzaMaxima * 0.48,
              galga1Prom: fuerzaMaxima * 0.45,
              galga2Prom: fuerzaMaxima * 0.42
            })
            
            setArduinoMetrics({
              fuerzaMaxima: fuerzaMaxima,
              rfd200ms: rfd200ms,
              testDuration: timeSec,
              forceAt200ms: fuerza200ms
            })
          }
        }, 20) // 50 Hz = 20ms entre muestras

      }, 2000) // Esperar 2 segundos antes de "aplicar fuerza"

    }, 1000) // 1 segundo para "conectar"
  }

  // Detener demo
  const stopDemo = () => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current)
      demoIntervalRef.current = null
    }
    setDemoMode(false)
    setSensorConnected(false)
    setSensorMeasuring(false)
    setConnectionStatus('disconnected')
    setArduinoStatus('idle')
    setTestReady(false)
    setCurrentForce(0)
    setGraphData([])
  }

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('biomov_user')
    setUser(null)
  }

  // ============================================================================
  // FUNCIONES DE AUTENTICACIÓN
  // ============================================================================

  const handleAuthLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    
    if (!authEmail || !authPassword) {
      setAuthError('Email y contraseña son requeridos')
      setAuthLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      })
      
      const data = await response.json()
      
      if (data.success && data.user) {
        if (!data.user.aprobado) {
          setAuthError('Tu cuenta está pendiente de aprobación')
          setAuthLoading(false)
          return
        }
        
        setUser(data.user)
        localStorage.setItem('biomov_user', JSON.stringify(data.user))
        
        // Admin va al panel de administración
        if (data.user.rol === 'admin' || data.user.rol === 'superadmin' || data.user.rol === 'super_admin') {
          window.location.href = '/auth/login'
        }
      } else {
        setAuthError(data.error || 'Credenciales inválidas')
      }
    } catch (e) {
      setAuthError('Error de conexión')
    }
    
    setAuthLoading(false)
  }

  const handleAuthRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    
    if (!authName || !authEmail || !authPassword || !authDni) {
      setAuthError('Completa todos los campos')
      setAuthLoading(false)
      return
    }
    
    if (authPassword !== authConfirmPassword) {
      setAuthError('Las contraseñas no coinciden')
      setAuthLoading(false)
      return
    }
    
    if (authPassword.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres')
      setAuthLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre_completo: authName, 
          email: authEmail, 
          password: authPassword, 
          dni: authDni 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAuthMessage('¡Registro exitoso! ' + (data.user?.rol === 'admin' ? 'Tu cuenta de administrador está lista.' : 'Tu cuenta está pendiente de aprobación.'))
        setAuthMode('login')
        setAuthName('')
        setAuthDni('')
        setAuthConfirmPassword('')
      } else {
        setAuthError(data.error || 'Error al registrar')
      }
    } catch (e) {
      setAuthError('Error de conexión')
    }
    
    setAuthLoading(false)
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#102218] flex items-center justify-center">
        <div className="text-center">
          {/* BIOMOV Logo - Circle with glowing dot in bottom-right corner */}
          <div className="relative mb-6">
            {/* Outer glow effect */}
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#13ec6d]/40 blur-2xl scale-150 animate-pulse" />
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#13ec6d]/30 blur-xl scale-125" />
            
            {/* Main circle with logo image */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#13ec6d] to-[#0ea849] p-0.5 shadow-2xl shadow-[#13ec6d]/60">
              <img 
                src="/biomov-logo.jpg" 
                alt="BIOMOV" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            
            {/* Small glowing dot - bottom right corner */}
            <div className="absolute -bottom-1 -right-1">
              <div className="absolute w-3 h-3 rounded-full bg-[#13ec6d] blur-sm animate-ping opacity-75" style={{transform: 'translate(-50%, -50%)', left: '50%', top: '50%'}} />
              <div className="absolute w-3 h-3 rounded-full bg-[#13ec6d] blur-md animate-pulse" style={{transform: 'translate(-50%, -50%)', left: '50%', top: '50%', animationDuration: '2s'}} />
              <div className="relative w-3 h-3 rounded-full bg-[#13ec6d] shadow-lg shadow-[#13ec6d]/80" />
            </div>
          </div>
          
          <div className="size-10 rounded-full border-3 border-[#13ec6d]/30 border-t-[#13ec6d] animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // ============================================================================
  // NOT LOGGED IN - LANDING PAGE
  // ============================================================================

  if (!user) {
    return (
      <div className="min-h-screen bg-[#102218] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          {/* BIOMOV Logo - Circle with glowing dot in bottom-right corner */}
          <div className="relative mb-6">
            {/* Outer glow effect */}
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#13ec6d]/40 blur-3xl scale-150 animate-pulse" />
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#13ec6d]/30 blur-2xl scale-125" />
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#00f0ff]/20 blur-xl scale-110" />
            
            {/* Main circle with logo image inside */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#13ec6d] via-[#0ea849] to-[#13ec6d] p-1 shadow-2xl shadow-[#13ec6d]/70">
              <img 
                src="/biomov-logo.jpg" 
                alt="BIOMOV" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            
            {/* Small glowing dot - bottom right corner */}
            <div className="absolute -bottom-1 -right-1">
              <div className="absolute w-3 h-3 rounded-full bg-[#13ec6d]/40 blur-lg animate-pulse" style={{transform: 'translate(-50%, -50%)', left: '50%', top: '50%', animationDuration: '3s'}} />
              <div className="absolute w-3 h-3 rounded-full bg-[#13ec6d]/60 blur-md animate-ping opacity-60" style={{transform: 'translate(-50%, -50%)', left: '50%', top: '50%'}} />
              <div className="relative w-3 h-3 rounded-full bg-[#13ec6d] shadow-lg shadow-[#13ec6d]" style={{animation: 'pulse 1.5s ease-in-out infinite'}} />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-1 tracking-tight">
            <span className="bg-gradient-to-r from-[#13ec6d] via-[#00f0ff] to-[#13ec6d] bg-clip-text text-transparent">BIOMOV</span>
          </h1>
          <p className="text-[#13ec6d] text-base sm:text-lg font-semibold mb-1">Entrenamiento Inteligente</p>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-xs text-center">Ciencia aplicada al movimiento humano</p>

          {/* Features Grid */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-md mb-6">
            {[
              { icon: 'monitoring', label: 'Isométrica', color: '#13ec6d' },
              { icon: 'rotate_right', label: 'ROM', color: '#00f0ff' },
              { icon: 'event_note', label: 'Planes', color: '#f59e0b' },
              { icon: 'analytics', label: 'Métricas', color: '#8b5cf6' },
            ].map((feature) => (
              <div key={feature.label} className="bg-[#193324]/50 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1">
                <Icon name={feature.icon} className="text-xl" style={{ color: feature.color }} />
                <span className="text-[10px] text-slate-400 text-center">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Login/Register Card */}
          <div className="w-full max-w-sm bg-[#193324] rounded-2xl border border-[#13ec6d]/20 p-4 shadow-xl">
            {/* Tabs */}
            <div className="flex bg-[#102218] rounded-xl p-1 mb-4">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(null); setAuthMessage(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                  authMode === 'login' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(null); setAuthMessage(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                  authMode === 'register' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Registrarse
              </button>
            </div>

            {/* Login Form */}
            {authMode === 'login' && (
              <form onSubmit={handleAuthLogin} className="space-y-3">
                <div>
                  <label className="text-xs text-[#92c9a9] font-medium mb-1 block">Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#92c9a9] font-medium mb-1 block">Contraseña</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                    required
                  />
                </div>

                {authError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs text-center">
                    {authError}
                  </div>
                )}

                {authMessage && (
                  <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-lg p-3 text-[#13ec6d] text-xs text-center">
                    {authMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,109,0.3)] disabled:opacity-50 text-sm"
                >
                  {authLoading ? 'Cargando...' : 'Iniciar Sesión'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {authMode === 'register' && (
              <form onSubmit={handleAuthRegister} className="space-y-3">
                <div>
                  <label className="text-xs text-[#92c9a9] font-medium mb-1 block">Nombre Completo</label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#92c9a9] font-medium mb-1 block">DNI / Cédula</label>
                  <input
                    type="text"
                    value={authDni}
                    onChange={(e) => setAuthDni(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#92c9a9] font-medium mb-1 block">Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#92c9a9] font-medium mb-1 block">Contraseña</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#92c9a9] font-medium mb-1 block">Confirmar</label>
                    <input
                      type="password"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs text-center">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,109,0.3)] disabled:opacity-50 text-sm"
                >
                  {authLoading ? 'Registrando...' : 'Crear Cuenta'}
                </button>
              </form>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-slate-600 text-xs">© 2026 BIOMOV • Powered by Science</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // LOGGED IN - MAIN APP
  // ============================================================================

  const isAdmin = user.rol === 'admin' || user.rol === 'superadmin' || user.rol === 'super_admin'
  const rmTotal = (user.rm_bench_press || 0) + (user.rm_squat || 0) + (user.rm_deadlift || 0) + (user.rm_overhead_press || 0) + (user.rm_barbell_row || 0)

  return (
    <div className="min-h-screen bg-[#102218]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#102218]/95 backdrop-blur-md border-b border-[#13ec6d]/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Header logo - Circle with image and glowing dot in bottom-right */}
            <div className="relative">
              {/* Outer glow effect */}
              <div className="absolute inset-0 w-10 h-10 rounded-full bg-[#13ec6d]/40 blur-lg scale-150" />
              <div className="absolute inset-0 w-10 h-10 rounded-full bg-[#13ec6d]/30 blur-md scale-125 animate-pulse" />
              
              {/* Main circle with logo image */}
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#13ec6d] to-[#0ea849] p-0.5 shadow-lg shadow-[#13ec6d]/50">
                <img 
                  src="/biomov-logo.jpg" 
                  alt="BIOMOV" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              
              {/* Small glowing dot - bottom right corner */}
              <div className="absolute -bottom-0.5 -right-0.5">
                <div className="absolute w-1.5 h-1.5 rounded-full bg-[#13ec6d] blur-sm animate-ping opacity-60" style={{transform: 'translate(-50%, -50%)', left: '50%', top: '50%'}} />
                <div className="relative w-1.5 h-1.5 rounded-full bg-[#13ec6d]" style={{animation: 'pulse 1.5s ease-in-out infinite'}} />
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Hola, {user.nombre_completo?.split(' ')[0] || 'Usuario'}</p>
              <p className="text-[#13ec6d] text-xs">
                {user.rol === 'superadmin' || user.rol === 'super_admin' ? 'Super Admin' : 
                 user.rol === 'admin' ? 'Administrador' : 
                 user.rol === 'entrenador' ? 'Entrenador' : 'Atleta'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => window.location.href = '/auth/login'} className="p-2 bg-[#13ec6d]/20 border border-[#13ec6d]/30 rounded-xl text-[#13ec6d] hover:bg-[#13ec6d]/30 transition-all">
                <Icon name="admin_panel_settings" className="text-xl" />
              </button>
            )}
            <button onClick={handleLogout} className="p-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-all">
              <Icon name="logout" className="text-xl" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        
        {/* ======================== HOME TAB ======================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* QR Scanner - Control de Asistencia */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-[#8b5cf6]/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name="qr_code_scanner" className="text-[#8b5cf6]" />
                  <h3 className="text-sm font-bold text-white">Control de Asistencia</h3>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setScanMode('entrada')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${scanMode === 'entrada' ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#102218] text-slate-400'}`}
                  >
                    Entrada
                  </button>
                  <button 
                    onClick={() => setScanMode('salida')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${scanMode === 'salida' ? 'bg-[#f59e0b] text-[#102218]' : 'bg-[#102218] text-slate-400'}`}
                  >
                    Salida
                  </button>
                </div>
              </div>

              {!showQRScanner ? (
                <button 
                  onClick={startQRScanner}
                  className="w-full py-4 bg-gradient-to-r from-[#8b5cf6]/20 to-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-xl flex flex-col items-center gap-2 hover:border-[#8b5cf6]/50 transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-[#8b5cf6]/20 flex items-center justify-center border-2 border-dashed border-[#8b5cf6]/40">
                    <Icon name="qr_code_scanner" className="text-3xl text-[#8b5cf6]" />
                  </div>
                  <span className="text-sm font-bold text-[#8b5cf6]">Escanear QR</span>
                  <span className="text-[10px] text-slate-400">Toca para abrir la cámara</span>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    className="w-full h-48 object-cover"
                  />
                  
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Corner frame */}
                    <div className="relative w-48 h-48">
                      {/* Top left */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#8b5cf6] rounded-tl-lg" />
                      {/* Top right */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#8b5cf6] rounded-tr-lg" />
                      {/* Bottom left */}
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#8b5cf6] rounded-bl-lg" />
                      {/* Bottom right */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#8b5cf6] rounded-br-lg" />
                      
                      {/* Scanning line */}
                      {scanStatus === 'scanning' && (
                        <div 
                          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent"
                          style={{ top: `${scanningLine}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Success overlay */}
                  {scanStatus === 'success' && (
                    <div className="absolute inset-0 bg-[#13ec6d]/20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#13ec6d] flex items-center justify-center">
                        <Icon name="check" className="text-3xl text-white" />
                      </div>
                    </div>
                  )}

                  {/* Status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${scanStatus === 'scanning' ? 'text-[#8b5cf6]' : scanStatus === 'success' ? 'text-[#13ec6d]' : 'text-slate-400'}`}>
                        {scanStatus === 'scanning' ? 'Escaneando...' : scanStatus === 'success' ? '¡Registrado!' : 'Listo'}
                      </span>
                      <button onClick={stopQRScanner} className="text-xs text-red-400 font-medium">
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulate button (for testing) */}
              {showQRScanner && scanStatus === 'scanning' && (
                <button 
                  onClick={simulateScan}
                  className="w-full mt-2 py-2 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 rounded-lg text-xs text-[#8b5cf6] font-medium hover:bg-[#8b5cf6]/30 transition-all"
                >
                  Simular escaneo
                </button>
              )}

              {/* Recent scans */}
              {lastScans.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-slate-500 mb-2">Últimos registros:</p>
                  {lastScans.map((scan, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#102218] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${scan.type === 'entrada' ? 'bg-[#13ec6d]' : 'bg-[#f59e0b]'}`} />
                      <span className="text-xs text-white flex-1">{scan.name}</span>
                      <span className="text-[10px] text-slate-500">{scan.time}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${scan.type === 'entrada' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                        {scan.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Neural Disposition - Hexagonal Radar Chart */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-[#13ec6d]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#13ec6d]/10 rounded-full blur-3xl" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center border border-[#13ec6d]/30">
                    <Icon name="hub" className="text-xl text-[#13ec6d]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Disposición Neural</h2>
                    <p className="text-[10px] text-slate-400">Capacidad funcional</p>
                  </div>
                </div>
                {/* Progress Circle */}
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <circle 
                      cx="18" cy="18" r="15" 
                      fill="none" 
                      stroke="#1a3a25" 
                      strokeWidth="3"
                    />
                    {/* Progress circle */}
                    <circle 
                      cx="18" cy="18" r="15" 
                      fill="none" 
                      stroke="#13ec6d" 
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${78 * 0.942} 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#13ec6d]">78%</span>
                  </div>
                </div>
              </div>

              {/* Hexagonal Radar Chart */}
              <div className="relative flex items-center justify-center py-4">
                <svg width="240" height="220" viewBox="0 0 240 220">
                  <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#13ec6d" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.2"/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* Background hexagon layers */}
                  <polygon 
                    points="120,20 200,65 200,155 120,200 40,155 40,65" 
                    fill="none" 
                    stroke="#13ec6d" 
                    strokeOpacity="0.1" 
                    strokeWidth="1"
                  />
                  <polygon 
                    points="120,45 175,77.5 175,142.5 120,175 65,142.5 65,77.5" 
                    fill="none" 
                    stroke="#13ec6d" 
                    strokeOpacity="0.15" 
                    strokeWidth="1"
                  />
                  <polygon 
                    points="120,70 150,90 150,130 120,150 90,130 90,90" 
                    fill="none" 
                    stroke="#13ec6d" 
                    strokeOpacity="0.2" 
                    strokeWidth="1"
                  />
                  
                  {/* Axis lines */}
                  <line x1="120" y1="110" x2="120" y2="20" stroke="#13ec6d" strokeOpacity="0.2" strokeWidth="1"/>
                  <line x1="120" y1="110" x2="200" y2="65" stroke="#00f0ff" strokeOpacity="0.2" strokeWidth="1"/>
                  <line x1="120" y1="110" x2="200" y2="155" stroke="#f59e0b" strokeOpacity="0.2" strokeWidth="1"/>
                  <line x1="120" y1="110" x2="120" y2="200" stroke="#ec4899" strokeOpacity="0.2" strokeWidth="1"/>
                  <line x1="120" y1="110" x2="40" y2="155" stroke="#8b5cf6" strokeOpacity="0.2" strokeWidth="1"/>
                  <line x1="120" y1="110" x2="40" y2="65" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1"/>
                  
                  {/* Data polygon - animated */}
                  <polygon 
                    points="120,35 185,72 178,148 120,180 52,140 58,75" 
                    fill="url(#radarGradient)" 
                    stroke="#13ec6d" 
                    strokeWidth="2"
                    filter="url(#glow)"
                  >
                    <animate 
                      attributeName="points" 
                      dur="3s" 
                      repeatCount="indefinite"
                      values="120,35 185,72 178,148 120,180 52,140 58,75;
                              120,40 180,75 175,145 120,175 55,138 60,78;
                              120,35 185,72 178,148 120,180 52,140 58,75"
                    />
                  </polygon>
                  
                  {/* Data points */}
                  <circle cx="120" cy="35" r="5" fill="#13ec6d" filter="url(#glow)">
                    <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="185" cy="72" r="5" fill="#00f0ff" filter="url(#glow)">
                    <animate attributeName="r" values="4;6;4" dur="2.2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="178" cy="148" r="5" fill="#f59e0b" filter="url(#glow)">
                    <animate attributeName="r" values="4;6;4" dur="2.4s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="120" cy="180" r="5" fill="#ec4899" filter="url(#glow)">
                    <animate attributeName="r" values="4;6;4" dur="2.6s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="52" cy="140" r="5" fill="#8b5cf6" filter="url(#glow)">
                    <animate attributeName="r" values="4;6;4" dur="2.8s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="58" cy="75" r="5" fill="#22d3ee" filter="url(#glow)">
                    <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* Labels */}
                  <text x="120" y="12" textAnchor="middle" fill="#13ec6d" fontSize="10" fontWeight="bold">FUERZ</text>
                  <text x="120" y="22" textAnchor="middle" fill="#fff" fontSize="8" opacity="0.7">85%</text>
                  
                  <text x="210" y="65" textAnchor="start" fill="#00f0ff" fontSize="10" fontWeight="bold">POT</text>
                  <text x="210" y="75" textAnchor="start" fill="#fff" fontSize="8" opacity="0.7">72%</text>
                  
                  <text x="210" y="160" textAnchor="start" fill="#f59e0b" fontSize="10" fontWeight="bold">RESIS</text>
                  <text x="210" y="170" textAnchor="start" fill="#fff" fontSize="8" opacity="0.7">68%</text>
                  
                  <text x="120" y="215" textAnchor="middle" fill="#ec4899" fontSize="10" fontWeight="bold">MOVI</text>
                  <text x="120" y="205" textAnchor="middle" fill="#fff" fontSize="8" opacity="0.7">90%</text>
                  
                  <text x="30" y="160" textAnchor="end" fill="#8b5cf6" fontSize="10" fontWeight="bold">VEL</text>
                  <text x="30" y="170" textAnchor="end" fill="#fff" fontSize="8" opacity="0.7">78%</text>
                  
                  <text x="30" y="65" textAnchor="end" fill="#22d3ee" fontSize="10" fontWeight="bold">EST</text>
                  <text x="30" y="75" textAnchor="end" fill="#fff" fontSize="8" opacity="0.7">82%</text>
                </svg>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#13ec6d]" />
                  <span className="text-xs text-slate-300">Fuerza</span>
                  <span className="text-xs text-[#13ec6d] font-bold ml-auto">85%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00f0ff]" />
                  <span className="text-xs text-slate-300">Potencia</span>
                  <span className="text-xs text-[#00f0ff] font-bold ml-auto">72%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="text-xs text-slate-300">Resistencia</span>
                  <span className="text-xs text-[#f59e0b] font-bold ml-auto">68%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                  <span className="text-xs text-slate-300">Velocidad</span>
                  <span className="text-xs text-[#8b5cf6] font-bold ml-auto">78%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ec4899]" />
                  <span className="text-xs text-slate-300">Movilidad</span>
                  <span className="text-xs text-[#ec4899] font-bold ml-auto">90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#22d3ee]" />
                  <span className="text-xs text-slate-300">Estabilidad</span>
                  <span className="text-xs text-[#22d3ee] font-bold ml-auto">82%</span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#193324] rounded-xl p-4 border border-[#13ec6d]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="fitness_center" className="text-[#13ec6d]" />
                  <span className="text-xs text-slate-400">RM Total</span>
                </div>
                <p className="text-2xl font-black text-white">{rmTotal || '--'} <span className="text-sm text-slate-400">kg</span></p>
              </div>
              
              <div className="bg-[#193324] rounded-xl p-4 border border-[#00f0ff]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="monitoring" className="text-[#00f0ff]" />
                  <span className="text-xs text-slate-400">Evaluaciones</span>
                </div>
                <p className="text-2xl font-black text-white">35</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setActiveTab('evaluaciones')}
                className="bg-[#193324] rounded-xl p-3 border border-[#ec4899]/20 hover:border-[#ec4899]/50 transition-all flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-[#ec4899]/20 flex items-center justify-center">
                  <Icon name="monitoring" className="text-xl text-[#ec4899]" />
                </div>
                <span className="text-[10px] text-slate-300">Nueva Eval.</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('planificacion')}
                className="bg-[#193324] rounded-xl p-3 border border-[#f59e0b]/20 hover:border-[#f59e0b]/50 transition-all flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center">
                  <Icon name="event_note" className="text-xl text-[#f59e0b]" />
                </div>
                <span className="text-[10px] text-slate-300">Mi Plan</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('evaluaciones'); setEvalType('rom'); }}
                className="bg-[#193324] rounded-xl p-3 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/20 flex items-center justify-center">
                  <Icon name="rotate_right" className="text-xl text-[#00f0ff]" />
                </div>
                <span className="text-[10px] text-slate-300">ROM</span>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="history" className="text-[#00f0ff]" />
                Actividad Reciente
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-[#102218] rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-[#13ec6d]/20 flex items-center justify-center">
                    <Icon name="fitness_center" className="text-sm text-[#13ec6d]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-white">Fuerza Isométrica</p>
                    <p className="text-[10px] text-slate-500">Hace 2 días</p>
                  </div>
                  <span className="text-xs text-[#13ec6d]">Completado</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#102218] rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/20 flex items-center justify-center">
                    <Icon name="rotate_right" className="text-sm text-[#00f0ff]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-white">ROM Hombro</p>
                    <p className="text-[10px] text-slate-500">Hace 5 días</p>
                  </div>
                  <span className="text-xs text-[#00f0ff]">Completado</span>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ======================== EVALUACIONES TAB ======================== */}
        {activeTab === 'evaluaciones' && (
          <div className="space-y-4">
            {/* Header Compacto */}
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[#ec4899]/20 flex items-center justify-center">
                <Icon name="monitoring" className="text-lg text-[#ec4899]" />
              </div>
              <h2 className="text-base font-bold text-white">Evaluaciones</h2>
              <span className="text-[10px] text-slate-500 ml-auto">ROM • Fuerza • Resistencia</span>
            </div>

            {evalType === 'menu' ? (
              <>
                {/* Menu de evaluaciones */}
                <div className="grid grid-cols-1 gap-3">
                  {/* ROM - Rango de Movimiento */}
                  <button 
                    onClick={() => setEvalType('rom')}
                    className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#00f0ff]/30 hover:border-[#00f0ff] transition-all text-left group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f0ff]/10 rounded-full blur-2xl group-hover:bg-[#00f0ff]/20 transition-all"></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-xl bg-[#00f0ff]/20 flex items-center justify-center border border-[#00f0ff]/30">
                        <Icon name="rotate_right" className="text-2xl text-[#00f0ff]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold">Rango de Movimiento (ROM)</p>
                        <p className="text-xs text-slate-400 mt-0.5">Evaluación articular con sensores</p>
                      </div>
                      <Icon name="chevron_right" className="text-slate-500 group-hover:text-[#00f0ff] transition-colors" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 relative z-10">
                      <div className="px-2 py-1 rounded-md bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                        <span className="text-[10px] text-[#00f0ff] font-medium">Acelerómetro</span>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                        <span className="text-[10px] text-[#00f0ff] font-medium">Giroscopio</span>
                      </div>
                    </div>
                  </button>

                  {/* Fuerza Isométrica */}
                  <button 
                    onClick={() => setEvalType('fuerza')}
                    className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#13ec6d]/30 hover:border-[#13ec6d] transition-all text-left group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#13ec6d]/10 rounded-full blur-2xl group-hover:bg-[#13ec6d]/20 transition-all"></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center border border-[#13ec6d]/30">
                        <Icon name="fitness_center" className="text-2xl text-[#13ec6d]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold">Fuerza Isométrica</p>
                        <p className="text-xs text-slate-400 mt-0.5">RFD, Impulso, Modelo exponencial</p>
                      </div>
                      <Icon name="chevron_right" className="text-slate-500 group-hover:text-[#13ec6d] transition-colors" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 relative z-10">
                      <div className={`px-2 py-1 rounded-md border ${serialConnected ? 'bg-[#13ec6d]/10 border-[#13ec6d]/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <span className={`text-[10px] font-medium ${serialConnected ? 'text-[#13ec6d]' : 'text-red-400'}`}>
                          Puerto Serie {serialConnected ? '●' : '○'}
                        </span>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-[#13ec6d]/10 border border-[#13ec6d]/20">
                        <span className="text-[10px] text-[#13ec6d] font-medium">Galgas</span>
                      </div>
                    </div>
                  </button>

                  {/* Resistencia - Frecuencia Cardíaca */}
                  <button 
                    onClick={() => setEvalType('resistencia')}
                    className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#ec4899]/30 hover:border-[#ec4899] transition-all text-left group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ec4899]/10 rounded-full blur-2xl group-hover:bg-[#ec4899]/20 transition-all"></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-xl bg-[#ec4899]/20 flex items-center justify-center border border-[#ec4899]/30">
                        <Icon name="favorite" className="text-2xl text-[#ec4899]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold">Resistencia Cardiovascular</p>
                        <p className="text-xs text-slate-400 mt-0.5">Monitoreo FC con Bluetooth</p>
                      </div>
                      <Icon name="chevron_right" className="text-slate-500 group-hover:text-[#ec4899] transition-colors" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 relative z-10">
                      <div className={`px-2 py-1 rounded-md border ${btConnected ? 'bg-[#ec4899]/10 border-[#ec4899]/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <span className={`text-[10px] font-medium ${btConnected ? 'text-[#ec4899]' : 'text-red-400'}`}>
                          Bluetooth {btConnected ? '●' : '○'}
                        </span>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-[#ec4899]/10 border border-[#ec4899]/20">
                        <span className="text-[10px] text-[#ec4899] font-medium">Cinta FC</span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Historial */}
                <div className="bg-[#193324] rounded-2xl border border-white/5 p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Icon name="history" className="text-[#f59e0b]" />
                    Historial de Evaluaciones
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-[#102218] rounded-xl p-3 border border-white/5">
                      <p className="text-2xl font-bold text-[#00f0ff]">12</p>
                      <p className="text-[10px] text-slate-500">ROM Tests</p>
                    </div>
                    <div className="bg-[#102218] rounded-xl p-3 border border-white/5">
                      <p className="text-2xl font-bold text-[#13ec6d]">8</p>
                      <p className="text-[10px] text-slate-500">Fuerza Tests</p>
                    </div>
                    <div className="bg-[#102218] rounded-xl p-3 border border-white/5">
                      <p className="text-2xl font-bold text-[#ec4899]">15</p>
                      <p className="text-[10px] text-slate-500">FC Tests</p>
                    </div>
                  </div>
                </div>
              </>
            ) : evalType === 'rom' ? (
              /* ==================== EVALUACIÓN ROM ==================== */
              <div className="space-y-4">
                <button onClick={() => setEvalType('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <Icon name="arrow_back" />
                  <span className="text-sm">Volver</span>
                </button>

                {/* Header Compacto con control */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/20 flex items-center justify-center">
                      <Icon name="rotate_right" className="text-lg text-[#00f0ff]" />
                    </div>
                    <h2 className="text-base font-bold text-white">Rango de Movimiento</h2>
                  </div>
                  {/* Botón de tracking */}
                  <button 
                    onClick={motionTracking ? stopMotionTracking : startMotionTracking}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      motionTracking 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-[#00f0ff] hover:bg-[#00f0ff]/90'
                    }`}
                  >
                    <Icon name={motionTracking ? 'stop' : 'play_arrow'} className={`text-xl ${motionTracking ? 'text-white' : 'text-[#102218]'}`} />
                  </button>
                </div>

                {/* ROM Display Principal - Más compacto */}
                <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#13ec6d]/20 relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#13ec6d]/10 rounded-full blur-3xl" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    {/* Círculo ROM */}
                    <div className="w-24 h-24 rounded-full border-4 border-[#13ec6d]/30 flex items-center justify-center relative">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#13ec6d" strokeWidth="4" strokeDasharray={`${(motionData.rotation % 360) / 360 * 283} 283`} strokeLinecap="round" />
                      </svg>
                      <div className="text-center">
                        <p className="text-2xl font-black text-[#13ec6d]">{Math.abs(motionData.rotation % 360).toFixed(0)}°</p>
                      </div>
                    </div>
                    
                    {/* Stats al lado */}
                    <div className="flex-1 ml-4 space-y-2">
                      <div className="bg-[#102218] rounded-lg p-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">ROM Máximo</span>
                        <span className="text-lg font-bold text-white">{motionData.maxROM.toFixed(1)}°</span>
                      </div>
                      <div className="bg-[#102218] rounded-lg p-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">ROM Previo</span>
                        <span className="text-lg font-bold text-[#00f0ff]">--°</span>
                      </div>
                      <button 
                        onClick={() => setMotionData({ accel: { x: 0, y: 0, z: 0 }, gyro: { x: 0, y: 0, z: 0 }, rotation: 0, maxROM: 0 })}
                        className="w-full py-2 bg-[#102218] border border-white/10 rounded-lg text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-1"
                      >
                        <Icon name="refresh" className="text-sm" />
                        Reiniciar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Configuración en fila */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Articulación */}
                  <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
                    <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
                      <Icon name="accessibility" className="text-[#00f0ff] text-sm" />
                      Articulación
                    </h3>
                    <select className="w-full bg-[#102218] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
                      {['Hombro', 'Codo', 'Muñeca', 'Cadera', 'Rodilla', 'Tobillo'].map((joint) => (
                        <option key={joint}>{joint}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Movimiento */}
                  <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
                    <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
                      <Icon name="move_down" className="text-[#f59e0b] text-sm" />
                      Movimiento
                    </h3>
                    <select className="w-full bg-[#102218] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
                      {['Flexión', 'Extensión', 'Abducción', 'Aducción', 'Rotación Int.', 'Rotación Ext.'].map((move) => (
                        <option key={move}>{move}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sensor Status Compacto */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#193324] rounded-xl p-3 border border-[#00f0ff]/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Acelerómetro</span>
                      <div className={`w-2 h-2 rounded-full ${motionTracking ? 'bg-[#00f0ff] animate-pulse' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex justify-between text-center">
                      <div>
                        <p className="text-sm font-bold text-white">{motionData.accel.x.toFixed(1)}</p>
                        <p className="text-[8px] text-slate-500">X</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{motionData.accel.y.toFixed(1)}</p>
                        <p className="text-[8px] text-slate-500">Y</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{motionData.accel.z.toFixed(1)}</p>
                        <p className="text-[8px] text-slate-500">Z</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#193324] rounded-xl p-3 border border-[#f59e0b]/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Giroscopio</span>
                      <div className={`w-2 h-2 rounded-full ${motionTracking ? 'bg-[#f59e0b] animate-pulse' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex justify-between text-center">
                      <div>
                        <p className="text-sm font-bold text-white">{motionData.gyro.x.toFixed(0)}</p>
                        <p className="text-[8px] text-slate-500">X</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{motionData.gyro.y.toFixed(0)}</p>
                        <p className="text-[8px] text-slate-500">Y</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{motionData.gyro.z.toFixed(0)}</p>
                        <p className="text-[8px] text-slate-500">Z</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : evalType === 'fuerza' ? (
              /* ==================== EVALUACIÓN DE FUERZA ISOMÉTRICA - REDISEÑADA ==================== */
              <div className="space-y-4">
                <button onClick={() => setEvalType('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <Icon name="arrow_back" />
                  <span className="text-sm">Volver</span>
                </button>

                {/* Header Compacto */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#13ec6d]/20 flex items-center justify-center">
                      <Icon name="fitness_center" className="text-lg text-[#13ec6d]" />
                    </div>
                    <h2 className="text-base font-bold text-white">Fuerza Isométrica</h2>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${sensorConnected ? 'bg-[#13ec6d]/20' : 'bg-red-500/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sensorConnected ? 'bg-[#13ec6d] animate-pulse' : 'bg-red-400'}`}></div>
                    <span className={`text-[10px] font-medium ${sensorConnected ? 'text-[#13ec6d]' : 'text-red-400'}`}>
                      {sensorConnected ? 'Sensor OK' : 'Sin sensor'}
                    </span>
                  </div>
                </div>

                {/* =============== 1. SENSOR DE FUERZA - DISEÑO MEJORADO =============== */}
                <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-3 border border-[#13ec6d]/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#13ec6d]/10 rounded-full blur-2xl" />

                  {/* Header con estado de conexión */}
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#13ec6d]/20 flex items-center justify-center border border-[#13ec6d]/30">
                        <Icon name="sensors" className="text-base text-[#13ec6d]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Sensor de Fuerza</p>
                        <p className="text-[9px] text-slate-500">HX711 + Célula de carga</p>
                      </div>
                    </div>
                    {/* Status indicador mejorado */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${sensorConnected ? 'bg-[#13ec6d]/20' : connectionStatus === 'connecting' ? 'bg-[#f59e0b]/20' : 'bg-red-500/20'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${sensorConnected ? 'bg-[#13ec6d] animate-pulse' : connectionStatus === 'connecting' ? 'bg-[#f59e0b] animate-pulse' : 'bg-red-400'}`} />
                      <span className={`text-[9px] font-medium ${sensorConnected ? 'text-[#13ec6d]' : connectionStatus === 'connecting' ? 'text-[#f59e0b]' : 'text-red-400'}`}>
                        {sensorConnected ? 'CONECTADO' : connectionStatus === 'connecting' ? 'CONECTANDO' : 'DESCONECTADO'}
                      </span>
                    </div>
                  </div>

                  {/* Configuración de conexión */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {/* Selector de Puerto */}
                    <div className="bg-[#102218] rounded-lg p-1.5">
                      <p className="text-[8px] text-slate-500 mb-0.5">Puerto Serial</p>
                      <select
                        value={selectedPort}
                        onChange={(e) => setSelectedPort(e.target.value)}
                        disabled={sensorConnected}
                        className="w-full bg-[#0a150d] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white disabled:opacity-50"
                      >
                        {availablePorts.map(port => (
                          <option key={port} value={port}>{port}</option>
                        ))}
                      </select>
                    </div>
                    {/* Selector de Baudios */}
                    <div className="bg-[#102218] rounded-lg p-1.5">
                      <p className="text-[8px] text-slate-500 mb-0.5">Velocidad (Baudios)</p>
                      <select
                        value={baudRate}
                        onChange={(e) => setBaudRate(Number(e.target.value))}
                        disabled={sensorConnected}
                        className="w-full bg-[#0a150d] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white disabled:opacity-50"
                      >
                        <option value={9600}>9600</option>
                        <option value={19200}>19200</option>
                        <option value={38400}>38400</option>
                        <option value={57600}>57600</option>
                        <option value={115200}>115200</option>
                      </select>
                    </div>
                  </div>

                  {/* Enlace DEMO - Diseño minimalista */}
                  {!sensorConnected && (
                    <Link
                      href="/demo"
                      className="group flex items-center justify-center gap-2 py-2.5 text-sm text-slate-400 hover:text-[#13ec6d] transition-colors"
                    >
                      <span className="text-base">🎮</span>
                      <span className="font-medium">Probar sin Arduino</span>
                      <svg 
                        className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}

                  {/* Indicador de modo Demo activo */}
                  {demoMode && sensorConnected && (
                    <div className="mb-2 p-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="science" className="text-[#8b5cf6]" />
                        <span className="text-[11px] text-[#8b5cf6] font-medium">🎮 MODO DEMO ACTIVO</span>
                      </div>
                      <button
                        onClick={stopDemo}
                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] font-medium hover:bg-red-500/30 transition-all"
                      >
                        Salir
                      </button>
                    </div>
                  )}

                  {/* Display principal de fuerza */}
                  <div className="bg-[#0a150d] rounded-xl p-3 mb-2 border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      {/* Display grande de fuerza */}
                      <div className="flex-1 text-center">
                        <p className="text-[10px] text-slate-500 mb-1">FUERZA ACTUAL</p>
                        <div className="relative">
                          <p className="text-4xl font-black text-white font-mono tracking-tight">
                            {sensorConnected ? (sensorMeasuring ? currentForce.toFixed(1) : '0.0') : '--.-'}
                          </p>
                          {/* Indicador de pico */}
                          {sensorMeasuring && currentForce > 0 && (
                            <div className="absolute -right-2 top-0 flex items-center gap-1">
                              <Icon name="arrow_upward" className="text-[#f59e0b] text-sm" />
                              <span className="text-[10px] text-[#f59e0b] font-bold">
                                {Math.max(currentForce, metrics.fuerzaMaxReal || 0).toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setForceUnit(forceUnit === 'kg' ? 'N' : 'kg')}
                          className="mt-1 px-3 py-1 bg-[#13ec6d]/20 border border-[#13ec6d]/30 rounded-lg text-[11px] text-[#13ec6d] font-bold hover:bg-[#13ec6d]/30 transition-all"
                        >
                          {forceUnit}
                        </button>
                      </div>

                      {/* Barra de progreso visual */}
                      <div className="flex flex-col items-center gap-1 w-12">
                        <p className="text-[8px] text-slate-500">PROGRESO</p>
                        <div className="relative w-8 h-24 bg-[#102218] rounded-lg border border-white/10 overflow-hidden">
                          {/* Barra de fondo */}
                          <div className="absolute inset-0 flex flex-col justify-end">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="h-[10%] border-t border-white/5" />
                            ))}
                          </div>
                          {/* Barra de fuerza actual */}
                          {sensorConnected && sensorMeasuring && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#13ec6d] to-[#00f0ff] transition-all duration-100 rounded-b-lg"
                              style={{ height: `${Math.min((currentForce / (metrics.fuerzaMaxReal || 100)) * 100, 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                            </div>
                          )}
                          {/* Línea de pico */}
                          {metrics.fuerzaMaxReal > 0 && (
                            <div 
                              className="absolute left-0 right-0 h-0.5 bg-[#f59e0b] shadow-lg shadow-[#f59e0b]/50"
                              style={{ bottom: `${Math.min((metrics.fuerzaMaxReal / (metrics.fuerzaMaxReal * 1.1 || 100)) * 100, 95)}%` }}
                            />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-[#f59e0b] font-bold">
                            {metrics.fuerzaMaxReal > 0 ? metrics.fuerzaMaxReal.toFixed(0) : '--'}
                          </p>
                          <p className="text-[7px] text-slate-500">PICO</p>
                        </div>
                      </div>
                    </div>

                    {/* Estadísticas en tiempo real */}
                    {sensorMeasuring && graphData.length > 5 && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/5">
                        <div className="text-center">
                          <p className="text-[8px] text-slate-500">MÍNIMO</p>
                          <p className="text-sm font-bold text-[#00f0ff]">
                            {Math.min(...graphData.map(d => d.force)).toFixed(1)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-slate-500">PROMEDIO</p>
                          <p className="text-sm font-bold text-[#13ec6d]">
                            {(graphData.reduce((a, b) => a + b.force, 0) / graphData.length).toFixed(1)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-slate-500">MÁXIMO</p>
                          <p className="text-sm font-bold text-[#f59e0b]">
                            {Math.max(...graphData.map(d => d.force)).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botones de control - Diseño Mejorado con Nombres Completos */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Fila 1: Conectar y Tare */}
                    <button
                      onClick={() => {
                        if (!sensorConnected) {
                          connectToArduino()
                        } else {
                          disconnectFromArduino()
                        }
                      }}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        sensorConnected
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                          : 'bg-[#13ec6d] text-[#102218] hover:bg-[#13ec6d]/90 shadow-lg shadow-[#13ec6d]/20'
                      }`}
                    >
                      <Icon name={sensorConnected ? 'link_off' : 'link'} className="text-lg" />
                      {sensorConnected ? 'Desconectar' : 'Conectar'}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (serialSupported && sensorConnected) {
                          sendTareCommand()
                        } else {
                          // Simular tare
                          setCurrentForce(0)
                        }
                      }}
                      disabled={!sensorConnected}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        sensorConnected
                          ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/30'
                          : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="tune" className="text-lg" />
                      Destarar (Tare)
                    </button>
                    
                    {/* Fila 2: Iniciar Test y Detener */}
                    <button
                      onClick={() => {
                        if (sensorConnected && !sensorMeasuring) {
                          if (serialSupported) {
                            startArduinoTest()
                          } else {
                            // Simulación
                            setSensorMeasuring(true)
                            setGraphData([])
                            setMetrics({
                              fuerzaMaxReal: 0,
                              fuerzaMaxModelada: 0,
                              tau: 0,
                              rfdMax: 0,
                              tiempoFmax: 0,
                              tiempo50Fmax: 0,
                              tiempo90Fmax: 0,
                              galga1Max: 0,
                              galga2Max: 0,
                              galga1Prom: 0,
                              galga2Prom: 0
                            })
                            setArduinoMetrics({
                              fuerzaMaxima: 0,
                              rfd200ms: 0,
                              testDuration: 0,
                              forceAt200ms: 0
                            })
                            const newData: { time: number; force: number }[] = []
                            const maxForce = 150 + Math.random() * 100
                            const startTime = Date.now()
                            const interval = setInterval(() => {
                              const elapsed = (Date.now() - startTime) / 1000
                              if (elapsed >= testDuration) {
                                clearInterval(interval)
                                setSensorMeasuring(false)
                                const peakForce = Math.max(...newData.map(d => d.force))
                                const dataAt200ms = newData.find(d => d.time >= 0.2)
                                const forceAt200ms = dataAt200ms?.force || 0
                                const rfd200ms = forceAt200ms / 0.2
                                setMetrics({
                                  fuerzaMaxReal: peakForce,
                                  fuerzaMaxModelada: peakForce * 1.02,
                                  tau: 0.18 + Math.random() * 0.1,
                                  rfdMax: rfd200ms,
                                  tiempoFmax: newData.find(d => d.force === peakForce)?.time || 0.3,
                                  tiempo50Fmax: 0.1 + Math.random() * 0.1,
                                  tiempo90Fmax: 0.25 + Math.random() * 0.15,
                                  galga1Max: peakForce * 0.52,
                                  galga2Max: peakForce * 0.48,
                                  galga1Prom: peakForce * 0.45,
                                  galga2Prom: peakForce * 0.42
                                })
                                setArduinoMetrics({
                                  fuerzaMaxima: peakForce,
                                  rfd200ms: rfd200ms,
                                  testDuration: elapsed,
                                  forceAt200ms: forceAt200ms
                                })
                                return
                              }
                              const force = maxForce * (1 - Math.exp(-elapsed / 0.2)) + (Math.random() - 0.5) * 3
                              setCurrentForce(force)
                              newData.push({ time: elapsed, force })
                              setGraphData([...newData])
                            }, 50)
                          }
                        }
                      }}
                      disabled={!sensorConnected || sensorMeasuring}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        sensorMeasuring
                          ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 animate-pulse'
                          : sensorConnected
                            ? 'bg-[#00f0ff] text-[#102218] hover:bg-[#00f0ff]/90 shadow-lg shadow-[#00f0ff]/20'
                            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="play_arrow" className="text-lg" />
                      {sensorMeasuring ? 'Midiendo...' : 'Iniciar Test'}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (serialSupported) {
                          stopArduinoTest()
                        } else {
                          setSensorMeasuring(false)
                          setGraphData([])
                          setCurrentForce(0)
                          setMetrics({
                            fuerzaMaxReal: 0,
                            fuerzaMaxModelada: 0,
                            tau: 0,
                            rfdMax: 0,
                            tiempoFmax: 0,
                            tiempo50Fmax: 0,
                            tiempo90Fmax: 0,
                            galga1Max: 0,
                            galga2Max: 0,
                            galga1Prom: 0,
                            galga2Prom: 0
                          })
                          setArduinoMetrics({
                            fuerzaMaxima: 0,
                            rfd200ms: 0,
                            testDuration: 0,
                            forceAt200ms: 0
                          })
                        }
                      }}
                      disabled={!sensorMeasuring}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        sensorMeasuring
                          ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                          : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="stop" className="text-lg" />
                      Detener Test
                    </button>
                  </div>

                  {/* Botones secundarios - Calibrar y Limpiar */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setShowCalibration(true)}
                      disabled={!sensorConnected}
                      className={`py-2 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                        sensorConnected
                          ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 hover:bg-[#f59e0b]/20'
                          : 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="settings" className="text-sm" />
                      Calibrar Sensor
                    </button>
                    
                    <button
                      onClick={() => {
                        setGraphData([])
                        setCurrentForce(0)
                        setMetrics({
                          fuerzaMaxReal: 0,
                          fuerzaMaxModelada: 0,
                          tau: 0,
                          rfdMax: 0,
                          tiempoFmax: 0,
                          tiempo50Fmax: 0,
                          tiempo90Fmax: 0,
                          galga1Max: 0,
                          galga2Max: 0,
                          galga1Prom: 0,
                          galga2Prom: 0
                        })
                        setArduinoMetrics({
                          fuerzaMaxima: 0,
                          rfd200ms: 0,
                          testDuration: 0,
                          forceAt200ms: 0
                        })
                      }}
                      disabled={graphData.length === 0}
                      className={`py-2 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                        graphData.length > 0
                          ? 'bg-slate-600/20 text-slate-300 border border-slate-500/20 hover:bg-slate-600/30'
                          : 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="delete_outline" className="text-sm" />
                      Limpiar Datos
                    </button>
                  </div>

                  {/* Info de conexión activa */}
                  {sensorConnected && (
                    <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500 px-1">
                      <span className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${arduinoStatus === 'testing' ? 'bg-[#00f0ff] animate-pulse' : arduinoStatus === 'ready' ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#13ec6d]'}`} />
                        {arduinoStatus === 'testing' ? 'Test en curso' : arduinoStatus === 'ready' ? 'Esperando fuerza...' : arduinoStatus === 'finished' ? 'Test completado' : 'Conectado'}
                      </span>
                      <span>•</span>
                      <span>{baudRate} baud</span>
                      <span>•</span>
                      <span className="text-[#13ec6d]">50 Hz</span>
                    </div>
                  )}
                </div>

                {/* =============== MODAL DE CALIBRACIÓN =============== */}
                {showCalibration && (
                  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#193324] rounded-2xl p-5 w-full max-w-sm border border-[#8b5cf6]/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Calibración HX711</h3>
                        <button onClick={() => {setShowCalibration(false); setCalibrationStep(0)}} className="text-slate-400 hover:text-white">
                          <Icon name="close" />
                        </button>
                      </div>

                      {calibrationStep === 0 && (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-300">La calibración requiere dos pasos:</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-[#102218] rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-[#13ec6d]/20 flex items-center justify-center text-[#13ec6d] font-bold">1</div>
                              <div>
                                <p className="text-sm text-white font-medium">Calibrar cero</p>
                                <p className="text-xs text-slate-500">Sensor sin carga</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-[#102218] rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] font-bold">2</div>
                              <div>
                                <p className="text-sm text-white font-medium">Calibrar escala</p>
                                <p className="text-xs text-slate-500">Aplicar peso conocido</p>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => setCalibrationStep(1)}
                            className="w-full py-3 bg-[#8b5cf6] text-white rounded-xl font-bold"
                          >
                            Iniciar Calibración
                          </button>
                        </div>
                      )}

                      {calibrationStep === 1 && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto rounded-full bg-[#13ec6d]/20 flex items-center justify-center mb-3">
                              <Icon name="scale" className="text-3xl text-[#13ec6d]" />
                            </div>
                            <p className="text-white font-bold">Paso 1: Calibrar Cero</p>
                            <p className="text-xs text-slate-400 mt-1">Asegúrate de que el sensor esté sin ninguna carga</p>
                          </div>
                          <div className="bg-[#102218] rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-500">Lectura actual</p>
                            <p className="text-2xl font-bold text-white">{(Math.random() * 100).toFixed(0)} unidades</p>
                          </div>
                          <button 
                            onClick={() => {
                              setCalibration(prev => ({ ...prev, offset: Math.random() * 100 }))
                              setCalibrationStep(2)
                            }}
                            className="w-full py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold"
                          >
                            Calibrar Cero
                          </button>
                        </div>
                      )}

                      {calibrationStep === 2 && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto rounded-full bg-[#f59e0b]/20 flex items-center justify-center mb-3">
                              <Icon name="fitness_center" className="text-3xl text-[#f59e0b]" />
                            </div>
                            <p className="text-white font-bold">Paso 2: Calibrar Escala</p>
                            <p className="text-xs text-slate-400 mt-1">Coloca un peso conocido sobre el sensor</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Peso de calibración (kg)</label>
                            <input 
                              type="number"
                              value={calibration.calibrationWeight}
                              onChange={(e) => setCalibration(prev => ({ ...prev, calibrationWeight: Number(e.target.value) }))}
                              className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2 text-white"
                            />
                          </div>
                          <button 
                            onClick={() => {
                              setCalibration(prev => ({ 
                                ...prev, 
                                scale: prev.calibrationWeight / (Math.random() * 500 + 1000),
                                calibratedAt: new Date().toISOString()
                              }))
                              setShowCalibration(false)
                              setCalibrationStep(0)
                            }}
                            className="w-full py-3 bg-[#f59e0b] text-white rounded-xl font-bold"
                          >
                            Guardar Calibración
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* =============== 2. SELECTOR MUSCULAR CON VISTAS FRONTAL/POSTERIOR =============== */}
                <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl border border-[#00f0ff]/20 overflow-hidden">
                  {/* Header Compacto - Siempre Visible */}
                  <button 
                    onClick={() => setMusclePanelExpanded(!musclePanelExpanded)}
                    className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/20 flex items-center justify-center border border-[#00f0ff]/30">
                        <Icon name="accessibility_new" className="text-xl text-[#00f0ff]" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Músculo a Evaluar</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium text-[#13ec6d]">
                            {MUSCLE_GROUPS.find(m => m.id === selectedMuscleGroup)?.nameEs || 'Cuádriceps'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${MUSCLE_GROUPS.find(m => m.id === selectedMuscleGroup)?.side === 'left' ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                            {MUSCLE_GROUPS.find(m => m.id === selectedMuscleGroup)?.side === 'left' ? '← Izq' : 'Der →'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Icon 
                      name={musclePanelExpanded ? "expand_less" : "expand_more"} 
                      className="text-2xl text-slate-400 transition-transform"
                    />
                  </button>

                  {/* Panel Desplegable */}
                  {musclePanelExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Toggle Vista Frontal/Posterior */}
                      <div className="flex gap-2 p-1 bg-[#102218] rounded-lg">
                        <button 
                          onClick={() => setMuscleView('front')}
                          className={`flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${muscleView === 'front' ? 'bg-[#00f0ff] text-[#102218]' : 'text-slate-400 hover:text-white'}`}
                        >
                          <Icon name="front_hand" className="text-sm" />
                          FRONTAL
                        </button>
                        <button 
                          onClick={() => setMuscleView('back')}
                          className={`flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${muscleView === 'back' ? 'bg-[#8b5cf6] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          <Icon name="back_hand" className="text-sm" />
                          POSTERIOR
                        </button>
                      </div>

                      {/* SVG Anatómico - Vista Dinámica */}
                      <div className="bg-[#0a150d] rounded-xl p-2 border border-white/5 relative">
                        <div className="absolute top-1 left-2 text-[8px] text-[#00f0ff] font-bold z-10">IZQ</div>
                        <div className="absolute top-1 right-2 text-[8px] text-[#f59e0b] font-bold z-10">DER</div>
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 z-10">
                          {muscleView === 'front' ? 'Vista Frontal' : 'Vista Posterior'}
                        </div>

                        {/* Vista FRONTAL */}
                        {muscleView === 'front' && (
                          <svg viewBox="0 0 220 300" className="w-full h-48 mx-auto mt-3">
                            <defs>
                              <filter id="glowMuscleFront">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Cabeza */}
                            <ellipse cx="110" cy="22" rx="16" ry="18" fill="#1a3a25" stroke="#13ec6d" strokeWidth="1" opacity="0.5" />

                            {/* TREN SUPERIOR */}
                            <rect x="75" y="45" width="70" height="85" rx="10" fill="#1a3a25" stroke="#13ec6d" strokeWidth="1" opacity="0.3" />

                            {/* LADO IZQUIERDO - Superior */}
                            <path d="M 85 48 Q 110 38 110 38 L 95 48 Z" fill={selectedMuscleGroup === 'trap_upper_l' ? '#8b5cf6' : '#2d5a3d'} stroke="#8b5cf6" strokeWidth="1" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('trap_upper_l')} filter={selectedMuscleGroup === 'trap_upper_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="92" cy="68" rx="14" ry="12" fill={selectedMuscleGroup === 'pectoral_l' ? '#ef4444' : '#2d5a3d'} stroke="#ef4444" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('pectoral_l')} filter={selectedMuscleGroup === 'pectoral_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="62" cy="62" rx="12" ry="14" fill={selectedMuscleGroup === 'deltoid_ant_l' ? '#f59e0b' : '#2d5a3d'} stroke="#f59e0b" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('deltoid_ant_l')} filter={selectedMuscleGroup === 'deltoid_ant_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="82" cy="85" rx="10" ry="18" fill={selectedMuscleGroup === 'latissimus_l' ? '#a855f7' : '#2d5a3d'} stroke="#a855f7" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('latissimus_l')} filter={selectedMuscleGroup === 'latissimus_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <rect x="48" y="78" width="18" height="50" rx="6" fill="#1a3a25" stroke="#13ec6d" strokeWidth="1" opacity="0.3" />
                            <ellipse cx="57" cy="100" rx="7" ry="16" fill={selectedMuscleGroup === 'biceps_l' ? '#00f0ff' : '#2d5a3d'} stroke="#00f0ff" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('biceps_l')} filter={selectedMuscleGroup === 'biceps_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="48" cy="100" rx="6" ry="14" fill={selectedMuscleGroup === 'triceps_l' ? '#ec4899' : '#2d5a3d'} stroke="#ec4899" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('triceps_l')} filter={selectedMuscleGroup === 'triceps_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <rect x="85" y="95" width="22" height="32" rx="5" fill={selectedMuscleGroup === 'core_l' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('core_l')} filter={selectedMuscleGroup === 'core_l' ? 'url(#glowMuscleFront)' : undefined} />

                            {/* LADO DERECHO - Superior */}
                            <path d="M 135 48 Q 110 38 110 38 L 125 48 Z" fill={selectedMuscleGroup === 'trap_upper_r' ? '#8b5cf6' : '#2d5a3d'} stroke="#8b5cf6" strokeWidth="1" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('trap_upper_r')} filter={selectedMuscleGroup === 'trap_upper_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="128" cy="68" rx="14" ry="12" fill={selectedMuscleGroup === 'pectoral_r' ? '#ef4444' : '#2d5a3d'} stroke="#ef4444" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('pectoral_r')} filter={selectedMuscleGroup === 'pectoral_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="158" cy="62" rx="12" ry="14" fill={selectedMuscleGroup === 'deltoid_ant_r' ? '#f59e0b' : '#2d5a3d'} stroke="#f59e0b" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('deltoid_ant_r')} filter={selectedMuscleGroup === 'deltoid_ant_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="138" cy="85" rx="10" ry="18" fill={selectedMuscleGroup === 'latissimus_r' ? '#a855f7' : '#2d5a3d'} stroke="#a855f7" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('latissimus_r')} filter={selectedMuscleGroup === 'latissimus_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <rect x="154" y="78" width="18" height="50" rx="6" fill="#1a3a25" stroke="#13ec6d" strokeWidth="1" opacity="0.3" />
                            <ellipse cx="163" cy="100" rx="7" ry="16" fill={selectedMuscleGroup === 'biceps_r' ? '#00f0ff' : '#2d5a3d'} stroke="#00f0ff" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('biceps_r')} filter={selectedMuscleGroup === 'biceps_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="172" cy="100" rx="6" ry="14" fill={selectedMuscleGroup === 'triceps_r' ? '#ec4899' : '#2d5a3d'} stroke="#ec4899" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('triceps_r')} filter={selectedMuscleGroup === 'triceps_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <rect x="113" y="95" width="22" height="32" rx="5" fill={selectedMuscleGroup === 'core_r' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('core_r')} filter={selectedMuscleGroup === 'core_r' ? 'url(#glowMuscleFront)' : undefined} />

                            {/* TREN INFERIOR */}
                            <ellipse cx="110" cy="140" rx="35" ry="18" fill="#1a3a25" stroke="#13ec6d" strokeWidth="1" opacity="0.3" />

                            {/* LADO IZQUIERDO - Inferior */}
                            <rect x="60" y="162" width="26" height="55" rx="8" fill={selectedMuscleGroup === 'quads_l' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('quads_l')} filter={selectedMuscleGroup === 'quads_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="57" cy="185" rx="10" ry="22" fill={selectedMuscleGroup === 'adductors_l' ? '#22d3ee' : '#2d5a3d'} stroke="#22d3ee" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('adductors_l')} filter={selectedMuscleGroup === 'adductors_l' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="64" cy="248" rx="6" ry="18" fill={selectedMuscleGroup === 'tibialis_l' ? '#fbbf24' : '#2d5a3d'} stroke="#fbbf24" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('tibialis_l')} filter={selectedMuscleGroup === 'tibialis_l' ? 'url(#glowMuscleFront)' : undefined} />

                            {/* LADO DERECHO - Inferior */}
                            <rect x="134" y="162" width="26" height="55" rx="8" fill={selectedMuscleGroup === 'quads_r' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('quads_r')} filter={selectedMuscleGroup === 'quads_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="163" cy="185" rx="10" ry="22" fill={selectedMuscleGroup === 'abductors_r' ? '#22d3ee' : '#2d5a3d'} stroke="#22d3ee" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('abductors_r')} filter={selectedMuscleGroup === 'abductors_r' ? 'url(#glowMuscleFront)' : undefined} />
                            <ellipse cx="156" cy="248" rx="6" ry="18" fill={selectedMuscleGroup === 'tibialis_r' ? '#fbbf24' : '#2d5a3d'} stroke="#fbbf24" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('tibialis_r')} filter={selectedMuscleGroup === 'tibialis_r' ? 'url(#glowMuscleFront)' : undefined} />
                          </svg>
                        )}

                        {/* Vista POSTERIOR */}
                        {muscleView === 'back' && (
                          <svg viewBox="0 0 220 300" className="w-full h-48 mx-auto mt-3">
                            <defs>
                              <filter id="glowMuscleBack">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Cabeza - posterior */}
                            <ellipse cx="110" cy="22" rx="16" ry="18" fill="#1a3a25" stroke="#8b5cf6" strokeWidth="1" opacity="0.5" />

                            {/* TREN SUPERIOR - Posterior */}
                            <rect x="75" y="45" width="70" height="85" rx="10" fill="#1a3a25" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />

                            {/* LADO IZQUIERDO - Superior Posterior */}
                            <path d="M 80 48 Q 110 38 110 38 L 100 48 Z" fill={selectedMuscleGroup === 'trap_upper_l' ? '#8b5cf6' : '#2d5a3d'} stroke="#8b5cf6" strokeWidth="1" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('trap_upper_l')} filter={selectedMuscleGroup === 'trap_upper_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <path d="M 80 55 Q 75 70 80 85 L 95 85 Q 100 70 95 55 Z" fill={selectedMuscleGroup === 'trap_lower_l' ? '#a855f7' : '#2d5a3d'} stroke="#a855f7" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('trap_lower_l')} filter={selectedMuscleGroup === 'trap_lower_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="62" cy="62" rx="12" ry="14" fill={selectedMuscleGroup === 'deltoid_post_l' ? '#f59e0b' : '#2d5a3d'} stroke="#f59e0b" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('deltoid_post_l')} filter={selectedMuscleGroup === 'deltoid_post_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="82" cy="78" rx="12" ry="22" fill={selectedMuscleGroup === 'latissimus_l' ? '#ec4899' : '#2d5a3d'} stroke="#ec4899" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('latissimus_l')} filter={selectedMuscleGroup === 'latissimus_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <rect x="48" y="78" width="18" height="50" rx="6" fill="#1a3a25" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
                            <ellipse cx="48" cy="100" rx="6" ry="14" fill={selectedMuscleGroup === 'triceps_l' ? '#00f0ff' : '#2d5a3d'} stroke="#00f0ff" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('triceps_l')} filter={selectedMuscleGroup === 'triceps_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <rect x="85" y="95" width="22" height="32" rx="5" fill={selectedMuscleGroup === 'core_l' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('core_l')} filter={selectedMuscleGroup === 'core_l' ? 'url(#glowMuscleBack)' : undefined} />

                            {/* LADO DERECHO - Superior Posterior */}
                            <path d="M 140 48 Q 110 38 110 38 L 120 48 Z" fill={selectedMuscleGroup === 'trap_upper_r' ? '#8b5cf6' : '#2d5a3d'} stroke="#8b5cf6" strokeWidth="1" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('trap_upper_r')} filter={selectedMuscleGroup === 'trap_upper_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <path d="M 140 55 Q 145 70 140 85 L 125 85 Q 120 70 125 55 Z" fill={selectedMuscleGroup === 'trap_lower_r' ? '#a855f7' : '#2d5a3d'} stroke="#a855f7" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('trap_lower_r')} filter={selectedMuscleGroup === 'trap_lower_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="158" cy="62" rx="12" ry="14" fill={selectedMuscleGroup === 'deltoid_post_r' ? '#f59e0b' : '#2d5a3d'} stroke="#f59e0b" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('deltoid_post_r')} filter={selectedMuscleGroup === 'deltoid_post_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="138" cy="78" rx="12" ry="22" fill={selectedMuscleGroup === 'latissimus_r' ? '#ec4899' : '#2d5a3d'} stroke="#ec4899" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('latissimus_r')} filter={selectedMuscleGroup === 'latissimus_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <rect x="154" y="78" width="18" height="50" rx="6" fill="#1a3a25" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
                            <ellipse cx="172" cy="100" rx="6" ry="14" fill={selectedMuscleGroup === 'triceps_r' ? '#00f0ff' : '#2d5a3d'} stroke="#00f0ff" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('triceps_r')} filter={selectedMuscleGroup === 'triceps_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <rect x="113" y="95" width="22" height="32" rx="5" fill={selectedMuscleGroup === 'core_r' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('core_r')} filter={selectedMuscleGroup === 'core_r' ? 'url(#glowMuscleBack)' : undefined} />

                            {/* TREN INFERIOR - Posterior */}
                            <ellipse cx="110" cy="140" rx="35" ry="18" fill="#1a3a25" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />

                            {/* LADO IZQUIERDO - Inferior Posterior */}
                            <ellipse cx="85" cy="145" rx="18" ry="14" fill={selectedMuscleGroup === 'glute_max_l' ? '#f59e0b' : '#2d5a3d'} stroke="#f59e0b" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('glute_max_l')} filter={selectedMuscleGroup === 'glute_max_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="75" cy="138" rx="12" ry="10" fill={selectedMuscleGroup === 'glute_med_l' ? '#fbbf24' : '#2d5a3d'} stroke="#fbbf24" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('glute_med_l')} filter={selectedMuscleGroup === 'glute_med_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <rect x="60" y="162" width="26" height="55" rx="8" fill={selectedMuscleGroup === 'quads_l' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" opacity="0.3" className="cursor-pointer hover:opacity-60" onClick={() => setSelectedMuscleGroup('quads_l')} />
                            <rect x="60" y="222" width="26" height="42" rx="6" fill={selectedMuscleGroup === 'hams_l' ? '#00f0ff' : '#2d5a3d'} stroke="#00f0ff" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('hams_l')} filter={selectedMuscleGroup === 'hams_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="73" cy="268" rx="12" ry="16" fill={selectedMuscleGroup === 'gastroc_l' ? '#ec4899' : '#2d5a3d'} stroke="#ec4899" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('gastroc_l')} filter={selectedMuscleGroup === 'gastroc_l' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="73" cy="288" rx="10" ry="10" fill={selectedMuscleGroup === 'soleus_l' ? '#8b5cf6' : '#2d5a3d'} stroke="#8b5cf6" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('soleus_l')} filter={selectedMuscleGroup === 'soleus_l' ? 'url(#glowMuscleBack)' : undefined} />

                            {/* LADO DERECHO - Inferior Posterior */}
                            <ellipse cx="135" cy="145" rx="18" ry="14" fill={selectedMuscleGroup === 'glute_max_r' ? '#f59e0b' : '#2d5a3d'} stroke="#f59e0b" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('glute_max_r')} filter={selectedMuscleGroup === 'glute_max_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="145" cy="138" rx="12" ry="10" fill={selectedMuscleGroup === 'glute_med_r' ? '#fbbf24' : '#2d5a3d'} stroke="#fbbf24" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('glute_med_r')} filter={selectedMuscleGroup === 'glute_med_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <rect x="134" y="162" width="26" height="55" rx="8" fill={selectedMuscleGroup === 'quads_r' ? '#13ec6d' : '#2d5a3d'} stroke="#13ec6d" strokeWidth="1.5" opacity="0.3" className="cursor-pointer hover:opacity-60" onClick={() => setSelectedMuscleGroup('quads_r')} />
                            <rect x="134" y="222" width="26" height="42" rx="6" fill={selectedMuscleGroup === 'hams_r' ? '#00f0ff' : '#2d5a3d'} stroke="#00f0ff" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('hams_r')} filter={selectedMuscleGroup === 'hams_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="147" cy="268" rx="12" ry="16" fill={selectedMuscleGroup === 'gastroc_r' ? '#ec4899' : '#2d5a3d'} stroke="#ec4899" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('gastroc_r')} filter={selectedMuscleGroup === 'gastroc_r' ? 'url(#glowMuscleBack)' : undefined} />
                            <ellipse cx="147" cy="288" rx="10" ry="10" fill={selectedMuscleGroup === 'soleus_r' ? '#8b5cf6' : '#2d5a3d'} stroke="#8b5cf6" strokeWidth="1.5" className="cursor-pointer hover:opacity-80" onClick={() => setSelectedMuscleGroup('soleus_r')} filter={selectedMuscleGroup === 'soleus_r' ? 'url(#glowMuscleBack)' : undefined} />
                          </svg>
                        )}
                      </div>

                      {/* Lista de los 19 músculos por lado */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <p className="text-[9px] text-[#00f0ff] font-bold mb-1 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" /> IZQUIERDO ({MUSCLE_GROUPS.filter(m => m.side === 'left').length})
                          </p>
                          <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1">
                            {MUSCLE_GROUPS.filter(m => m.side === 'left').map(muscle => (
                              <button
                                key={muscle.id}
                                onClick={() => setSelectedMuscleGroup(muscle.id)}
                                className={`w-full text-left px-2 py-1 rounded text-[9px] transition-all flex items-center gap-1 ${selectedMuscleGroup === muscle.id ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30' : 'bg-[#102218] text-slate-400 border border-white/5 hover:border-[#00f0ff]/20'}`}
                              >
                                <div className={`w-1 h-1 rounded-full ${selectedMuscleGroup === muscle.id ? 'bg-[#00f0ff]' : 'bg-slate-600'}`} />
                                {muscle.nameEs}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-[#f59e0b] font-bold mb-1 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> DERECHO ({MUSCLE_GROUPS.filter(m => m.side === 'right').length})
                          </p>
                          <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1">
                            {MUSCLE_GROUPS.filter(m => m.side === 'right').map(muscle => (
                              <button
                                key={muscle.id}
                                onClick={() => setSelectedMuscleGroup(muscle.id)}
                                className={`w-full text-left px-2 py-1 rounded text-[9px] transition-all flex items-center gap-1 ${selectedMuscleGroup === muscle.id ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30' : 'bg-[#102218] text-slate-400 border border-white/5 hover:border-[#f59e0b]/20'}`}
                              >
                                <div className={`w-1 h-1 rounded-full ${selectedMuscleGroup === muscle.id ? 'bg-[#f59e0b]' : 'bg-slate-600'}`} />
                                {muscle.nameEs}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Duración del test */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-slate-500">Duración:</span>
                        <div className="flex items-center gap-1">
                          {[3, 5, 7, 10].map(dur => (
                            <button 
                              key={dur}
                              onClick={() => setTestDuration(dur)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${testDuration === dur ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#102218] text-slate-400 border border-white/10'}`}
                            >
                              {dur}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* =============== 3. GRÁFICA FUERZA-TIEMPO MEJORADA =============== */}
                <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-3 border border-[#13ec6d]/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Icon name="show_chart" className="text-sm text-[#13ec6d]" />
                      Curva Fuerza-Tiempo
                    </h3>
                    <div className="flex gap-1">
                      {graphData.length > 0 && (
                        <>
                          <button 
                            onClick={() => {
                              // Exportar datos CSV
                              const csv = 'time,force\n' + graphData.map(d => `${d.time.toFixed(3)},${d.force.toFixed(2)}`).join('\n')
                              const blob = new Blob([csv], { type: 'text/csv' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `fuerza_${new Date().toISOString().slice(0,10)}.csv`
                              a.click()
                            }}
                            className="px-2 py-1 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded text-[9px] font-medium hover:bg-[#8b5cf6]/30"
                          >
                            <Icon name="download" className="text-xs mr-1" />
                            CSV
                          </button>
                          <button 
                            onClick={() => setCompareWithPrevious(!compareWithPrevious)}
                            className={`px-2 py-1 rounded text-[9px] font-medium ${compareWithPrevious ? 'bg-[#00f0ff] text-[#102218]' : 'bg-[#00f0ff]/20 text-[#00f0ff]'}`}
                          >
                            Comparar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Gráfico SVG Mejorado */}
                  <div 
                    className="relative bg-[#0a150d] rounded-xl p-2 h-44 border border-white/5"
                    onMouseMove={(e) => {
                      if (graphData.length > 1) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const graphWidth = rect.width - 50
                        const timeAtX = ((x - 35) / graphWidth) * testDuration
                        
                        if (timeAtX >= 0 && timeAtX <= testDuration) {
                          // Encontrar el punto más cercano
                          const closest = graphData.reduce((prev, curr) => 
                            Math.abs(curr.time - timeAtX) < Math.abs(prev.time - timeAtX) ? curr : prev
                          )
                          const maxForce = Math.max(...graphData.map(d => d.force), 100)
                          setTooltipData({
                            time: closest.time,
                            force: closest.force,
                            x: x,
                            y: 20 + (1 - closest.force / maxForce) * 100
                          })
                          setShowTooltip(true)
                        }
                      }
                    }}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    {/* Calcular escala dinámica */}
                    {(() => {
                      const maxForce = Math.max(...graphData.map(d => d.force), 100)
                      const maxTime = testDuration
                      const yScale = 100 / maxForce
                      const xScale = 260 / maxTime
                      
                      return null
                    })()}

                    <svg viewBox="0 0 320 140" className="w-full h-full">
                      <defs>
                        <linearGradient id="forceGradientNew" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#13ec6d" stopOpacity="0.6"/>
                          <stop offset="100%" stopColor="#13ec6d" stopOpacity="0.05"/>
                        </linearGradient>
                        <filter id="glowLine">
                          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <clipPath id="graphClip">
                          <rect x="35" y="15" width="260" height="105" />
                        </clipPath>
                      </defs>

                      {/* Fondo con grid mejorado */}
                      <rect x="35" y="15" width="260" height="105" fill="#080f0a" />
                      
                      {/* Grid horizontal (fuerza) */}
                      {[0, 25, 50, 75, 100].map((pct, i) => {
                        const maxForce = Math.max(...graphData.map(d => d.force), 100)
                        const y = 120 - (pct / 100) * 105
                        return (
                          <g key={`h${i}`}>
                            <line x1="35" y1={y} x2="295" y2={y} stroke="#1a3a25" strokeWidth="0.5" strokeDasharray="2,3" />
                            <text x="32" y={y + 3} fill="#13ec6d" fontSize="6" textAnchor="end" opacity="0.7">
                              {(maxForce * pct / 100).toFixed(0)}
                            </text>
                          </g>
                        )
                      })}
                      
                      {/* Grid vertical (tiempo) */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const x = 35 + pct * 260
                        const time = pct * testDuration
                        return (
                          <g key={`v${i}`}>
                            <line x1={x} y1="15" x2={x} y2="120" stroke="#1a3a25" strokeWidth="0.5" strokeDasharray="2,3" />
                            {pct > 0 && <text x={x} y="132" fill="#00f0ff" fontSize="6" textAnchor="middle">{time.toFixed(1)}s</text>}
                          </g>
                        )
                      })}

                      {/* Ejes principales */}
                      <line x1="35" y1="120" x2="295" y2="120" stroke="#13ec6d" strokeWidth="1.5" />
                      <line x1="35" y1="15" x2="35" y2="120" stroke="#13ec6d" strokeWidth="1.5" />
                      
                      {/* Labels de ejes */}
                      <text x="165" y="138" fill="#00f0ff" fontSize="7" textAnchor="middle">Tiempo (s)</text>
                      <text x="12" y="70" fill="#13ec6d" fontSize="7" textAnchor="middle" transform="rotate(-90 12 70)">{forceUnit}</text>

                      {/* Marcadores de RFD en intervalos (ms) */}
                      {graphData.length > 1 && [50, 100, 200].map((ms, idx) => {
                        const timeSec = ms / 1000
                        if (timeSec > testDuration) return null
                        const xPos = 35 + (timeSec / testDuration) * 260
                        const colors = ['#ec4899', '#f59e0b', '#22d3ee']
                        return (
                          <g key={`rfd-${ms}`}>
                            <line 
                              x1={xPos} y1="15" 
                              x2={xPos} y2="120" 
                              stroke={colors[idx]} 
                              strokeWidth="1" 
                              strokeDasharray="4,2" 
                              opacity="0.6"
                            />
                            <text x={xPos} y="12" fill={colors[idx]} fontSize="6" textAnchor="middle" fontWeight="bold">
                              {ms}ms
                            </text>
                          </g>
                        )
                      })}

                      {/* Área bajo la curva */}
                      {graphData.length > 1 && (() => {
                        const maxForce = Math.max(...graphData.map(d => d.force), 100)
                        const points = graphData.map((d, i) => {
                          const x = 35 + (d.time / testDuration) * 260
                          const y = 120 - (d.force / maxForce) * 105
                          return `${x},${y}`
                        })
                        const areaPath = `M 35,120 ${points.map((p, i) => `L ${p}`).join(' ')} L ${35 + (graphData[graphData.length-1].time / testDuration) * 260},120 Z`
                        return <path d={areaPath} fill="url(#forceGradientNew)" clipPath="url(#graphClip)" />
                      })()}

                      {/* Línea principal de fuerza con glow */}
                      {graphData.length > 1 && (() => {
                        const maxForce = Math.max(...graphData.map(d => d.force), 100)
                        const points = graphData.map((d, i) => {
                          const x = 35 + (d.time / testDuration) * 260
                          const y = 120 - (d.force / maxForce) * 105
                          return `${i === 0 ? 'M' : 'L'} ${x},${y}`
                        }).join(' ')
                        return (
                          <>
                            <path d={points} fill="none" stroke="#13ec6d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glowLine)" clipPath="url(#graphClip)" />
                            {/* Puntos de datos cada cierto intervalo */}
                            {graphData.filter((_, i) => i % Math.max(1, Math.floor(graphData.length / 10)) === 0).map((d, i) => {
                              const x = 35 + (d.time / testDuration) * 260
                              const y = 120 - (d.force / maxForce) * 105
                              return <circle key={i} cx={x} cy={y} r="2" fill="#13ec6d" stroke="#0a150d" strokeWidth="1" />
                            })}
                          </>
                        )
                      })()}

                      {/* Marcador de Fmax */}
                      {metrics.fuerzaMaxReal > 0 && graphData.length > 1 && (() => {
                        const maxForce = Math.max(...graphData.map(d => d.force), 100)
                        const x = 35 + (metrics.tiempoFmax / testDuration) * 260
                        const y = 120 - (metrics.fuerzaMaxReal / maxForce) * 105
                        return (
                          <g>
                            <circle cx={x} cy={y} r="5" fill="#f59e0b" stroke="#0a150d" strokeWidth="2" filter="url(#glowLine)" />
                            <text x={x + 8} y={y - 5} fill="#f59e0b" fontSize="7" fontWeight="bold">Fmax: {metrics.fuerzaMaxReal.toFixed(1)}</text>
                          </g>
                        )
                      })()}

                      {/* Línea de RFD inicial (pendiente) */}
                      {graphData.length > 10 && (() => {
                        const maxForce = Math.max(...graphData.map(d => d.force), 100)
                        const d1 = graphData[0]
                        const d2 = graphData[Math.min(10, graphData.length - 1)]
                        const x1 = 35 + (d1.time / testDuration) * 260
                        const y1 = 120 - (d1.force / maxForce) * 105
                        const x2 = 35 + (d2.time / testDuration) * 260
                        const y2 = 120 - (d2.force / maxForce) * 105
                        return (
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ec4899" strokeWidth="2" strokeDasharray="4,2" opacity="0.8" />
                        )
                      })()}

                      {/* Curva comparativa anterior */}
                      {compareWithPrevious && evaluationHistory.length > 0 && (() => {
                        const prevEval = evaluationHistory[0]
                        const maxForce = Math.max(prevEval.fmax, 100)
                        const points = [...Array(30)].map((_, i) => {
                          const t = (i / 29) * testDuration
                          const f = prevEval.fmax * (1 - Math.exp(-t / 0.2))
                          const x = 35 + (t / testDuration) * 260
                          const y = 120 - (f / maxForce) * 105
                          return `${i === 0 ? 'M' : 'L'} ${x},${y}`
                        }).join(' ')
                        return <path d={points} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6,3" opacity="0.7" />
                      })()}
                    </svg>

                    {/* Tooltip mejorado */}
                    {showTooltip && graphData.length > 1 && (
                      <div 
                        className="absolute bg-[#102218]/95 backdrop-blur-sm border border-[#13ec6d]/50 rounded-lg px-3 py-2 pointer-events-none shadow-lg shadow-[#13ec6d]/10 z-20"
                        style={{ left: Math.min(tooltipData.x + 10, 200), top: Math.max(tooltipData.y - 10, 10) }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-[#13ec6d]" />
                          <p className="text-white font-bold text-sm">{tooltipData.force.toFixed(1)} {forceUnit}</p>
                        </div>
                        <p className="text-slate-400 text-xs">t = {tooltipData.time.toFixed(3)}s</p>
                        <p className="text-[#ec4899] text-[10px]">RFD: {(tooltipData.force / Math.max(tooltipData.time, 0.001)).toFixed(0)} {forceUnit}/s</p>
                      </div>
                    )}
                  </div>

                  {/* Panel de RFD por intervalos mejorado */}
                  {graphData.length > 0 && (
                    <div className="mt-2 bg-[#0a150d] rounded-xl p-2 border border-white/5">
                      <p className="text-[9px] text-slate-400 mb-2 flex items-center gap-1">
                        <Icon name="speed" className="text-xs text-[#ec4899]" />
                        RFD por Intervalos (tasa de desarrollo de fuerza)
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[50, 100, 150, 200].map((ms, idx) => {
                          const colors = ['#ec4899', '#f59e0b', '#22d3ee', '#8b5cf6']
                          const timeSec = ms / 1000
                          const dataPoint = graphData.find(d => d.time >= timeSec)
                          const forceAtMs = dataPoint?.force || 0
                          const rfdValue = forceAtMs / (ms / 1000)
                          const maxRfd = Math.max(...[50, 100, 150, 200].map(m => {
                            const t = m / 1000
                            const d = graphData.find(d => d.time >= t)
                            return (d?.force || 0) / (m / 1000)
                          }), 1)
                          const barHeight = Math.min((rfdValue / maxRfd) * 100, 100)
                          
                          return (
                            <div key={ms} className="bg-[#102218] rounded-lg p-1.5 text-center relative overflow-hidden">
                              {/* Barra de progreso */}
                              <div 
                                className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                                style={{ height: `${barHeight}%`, backgroundColor: colors[idx], opacity: 0.2 }}
                              />
                              <div className="relative z-10">
                                <p className="text-[8px] text-slate-500">{ms}ms</p>
                                <p className="text-sm font-bold" style={{ color: colors[idx] }}>
                                  {graphData.length > 5 && forceAtMs > 0 ? rfdValue.toFixed(0) : '--'}
                                </p>
                                <p className="text-[7px] text-slate-500">{forceUnit}/s</p>
                                <p className="text-[8px] text-slate-600 mt-0.5">
                                  {forceAtMs > 0 ? forceAtMs.toFixed(1) : '--'} {forceUnit}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Leyenda compacta */}
                  <div className="flex items-center justify-center gap-3 mt-2 text-[9px]">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-0.5 bg-[#13ec6d]" />
                      <span className="text-slate-400">Fuerza</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      <span className="text-slate-400">Fmax</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 border-t-1 border-dashed" style={{ borderColor: '#ec4899' }} />
                      <span className="text-slate-400">RFD</span>
                    </div>
                    {compareWithPrevious && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#8b5cf6] border-dashed" style={{ borderStyle: 'dashed' }} />
                        <span className="text-slate-400">Anterior</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* =============== 4. INFORMACIÓN MUSCULAR - MÉTRICAS ARDUINO =============== */}
                <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#00f0ff]/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Icon name="biotech" className="text-[#00f0ff]" />
                      Resultados del Test
                    </h3>
                    {arduinoStatus === 'finished' && (
                      <span className="px-2 py-1 bg-[#13ec6d]/20 text-[#13ec6d] text-[10px] font-bold rounded-full">
                        ✓ Completado
                      </span>
                    )}
                  </div>

                  {/* Métricas principales estilo Arduino */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Pico de Fuerza - Como lo muestra el Arduino */}
                    <div className="bg-gradient-to-br from-[#13ec6d]/10 to-[#13ec6d]/5 rounded-xl p-4 text-center border border-[#13ec6d]/20">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon name="trending_up" className="text-[#13ec6d] text-lg" />
                        <p className="text-[10px] text-[#13ec6d] font-medium">PICO DE FUERZA</p>
                      </div>
                      <p className="text-3xl font-black text-white">
                        {arduinoMetrics.fuerzaMaxima > 0 ? arduinoMetrics.fuerzaMaxima.toFixed(2) : metrics.fuerzaMaxReal > 0 ? metrics.fuerzaMaxReal.toFixed(2) : '--'}
                      </p>
                      <p className="text-sm text-[#13ec6d] font-medium">kgf (±)</p>
                    </div>
                    
                    {/* RFD 0-200ms - Métrica principal del Arduino */}
                    <div className="bg-gradient-to-br from-[#f59e0b]/10 to-[#f59e0b]/5 rounded-xl p-4 text-center border border-[#f59e0b]/20">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon name="speed" className="text-[#f59e0b] text-lg" />
                        <p className="text-[10px] text-[#f59e0b] font-medium">RFD 0-200 ms</p>
                      </div>
                      <p className="text-3xl font-black text-white">
                        {arduinoMetrics.rfd200ms > 0 ? arduinoMetrics.rfd200ms.toFixed(2) : metrics.rfdMax > 0 ? metrics.rfdMax.toFixed(0) : '--'}
                      </p>
                      <p className="text-sm text-[#f59e0b] font-medium">kgf/s</p>
                    </div>
                  </div>

                  {/* Métricas secundarias */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-[#102218] rounded-lg p-2.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 mb-1">Fuerza @ 200ms</p>
                      <p className="text-lg font-bold text-[#00f0ff]">
                        {arduinoMetrics.forceAt200ms > 0 ? arduinoMetrics.forceAt200ms.toFixed(1) : '--'}
                      </p>
                      <p className="text-[9px] text-slate-500">kgf</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 mb-1">Tiempo a Fmax</p>
                      <p className="text-lg font-bold text-[#ec4899]">
                        {metrics.tiempoFmax > 0 ? (metrics.tiempoFmax * 1000).toFixed(0) : '--'}
                      </p>
                      <p className="text-[9px] text-slate-500">ms</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 mb-1">Duración Test</p>
                      <p className="text-lg font-bold text-[#8b5cf6]">
                        {arduinoMetrics.testDuration > 0 ? arduinoMetrics.testDuration.toFixed(2) : graphData.length > 0 ? (graphData[graphData.length-1]?.time || 0).toFixed(2) : '--'}
                      </p>
                      <p className="text-[9px] text-slate-500">seg</p>
                    </div>
                  </div>

                  {/* RFD por intervalos de tiempo */}
                  {graphData.length > 10 && (
                    <div className="bg-[#0a150d] rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
                        <Icon name="insights" className="text-xs text-[#22d3ee]" />
                        RFD por Intervalos de Tiempo
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[50, 100, 150, 200].map((ms, idx) => {
                          const colors = ['#ec4899', '#f59e0b', '#22d3ee', '#8b5cf6']
                          const timeSec = ms / 1000
                          const dataPoint = graphData.find(d => d.time >= timeSec)
                          const forceAtMs = dataPoint?.force || 0
                          const rfdValue = ms > 0 ? forceAtMs / (ms / 1000) : 0
                          
                          return (
                            <div key={ms} className="text-center">
                              <div className="h-12 flex items-end justify-center mb-1">
                                <div 
                                  className="w-6 rounded-t transition-all duration-300"
                                  style={{ 
                                    height: `${Math.min((rfdValue / (arduinoMetrics.rfd200ms || 500)) * 100, 100)}%`,
                                    backgroundColor: colors[idx],
                                    opacity: 0.8
                                  }}
                                />
                              </div>
                              <p className="text-[9px] font-bold" style={{ color: colors[idx] }}>
                                {rfdValue > 0 ? rfdValue.toFixed(0) : '--'}
                              </p>
                              <p className="text-[8px] text-slate-500">{ms}ms</p>
                              <p className="text-[7px] text-slate-600">{forceAtMs.toFixed(1)} kgf</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interpretación automática */}
                  {metrics.fuerzaMaxReal > 0 && (
                    <div className="bg-[#102218] rounded-xl p-3 border border-white/5 mt-3">
                      <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1">
                        <Icon name="auto_awesome" className="text-[#fbbf24]" />
                        ANÁLISIS AUTOMÁTICO
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">Capacidad de Fuerza:</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            metrics.fuerzaMaxReal > 80 ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 
                            metrics.fuerzaMaxReal > 50 ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {metrics.fuerzaMaxReal > 80 ? 'Alta' : metrics.fuerzaMaxReal > 50 ? 'Moderada' : 'Necesita mejora'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">Tasa Desarrollo (RFD):</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            arduinoMetrics.rfd200ms > 400 ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 
                            arduinoMetrics.rfd200ms > 250 ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {arduinoMetrics.rfd200ms > 400 ? 'Explosivo' : arduinoMetrics.rfd200ms > 250 ? 'Moderado' : 'Lento'}
                          </span>
                        </div>
                        <div className="mt-2 p-2 bg-[#fbbf24]/10 rounded-lg">
                          <p className="text-[10px] text-[#fbbf24] flex items-start gap-1">
                            <Icon name="lightbulb" className="text-xs mt-0.5" />
                            <span>
                              {arduinoMetrics.rfd200ms > 400 
                                ? 'Excelente capacidad de activación neural. Mantener con entrenamiento de potencia.' 
                                : arduinoMetrics.rfd200ms > 250 
                                  ? 'Capacidad moderada. Recomendado: ejercicios pliométricos y fuerza explosiva.'
                                  : 'Necesita mejorar activación neural. Recomendado: trabajo de fuerza velocidad y coordinación.'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* =============== PANEL DE ASIMETRÍA BILATERAL =============== */}
                {evaluationHistory.length >= 2 && getBilateralComparisons().length > 0 && (
                  <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#ec4899]/30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Icon name="compare_arrows" className="text-[#ec4899]" />
                        Índice de Asimetría Bilateral
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {getBilateralComparisons().length} comparación(es)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {getBilateralComparisons().map((comparison) => {
                        const hasBothSides = comparison.left && comparison.right
                        const asymmetryColor = comparison.fmaxAsymmetry < 10 ? '#13ec6d' :
                                              comparison.fmaxAsymmetry < 15 ? '#f59e0b' : '#ef4444'

                        return (
                          <div key={comparison.muscleId} className="bg-[#102218] rounded-xl p-3 border border-white/5">
                            {/* Nombre del músculo y estado */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                     style={{ backgroundColor: `${asymmetryColor}20` }}>
                                  <Icon name="accessibility_new" style={{ color: asymmetryColor }} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{comparison.muscleName}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {hasBothSides ? 'Evaluación completa' : 'Falta lado opuesto'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black" style={{ color: asymmetryColor }}>
                                  {comparison.fmaxAsymmetry.toFixed(1)}%
                                </p>
                                <p className="text-[10px] text-slate-500">Índice de Asimetría</p>
                              </div>
                            </div>

                            {hasBothSides && (
                              <>
                                {/* Barras de comparación */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  {/* Lado Izquierdo */}
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                      <Icon name="arrow_back" className="text-[#00f0ff] text-sm" />
                                      <span className="text-[10px] text-[#00f0ff] font-medium">IZQUIERDO</span>
                                    </div>
                                    <div className="h-16 bg-[#0a150d] rounded-lg relative overflow-hidden">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#00f0ff] to-[#00f0ff]/50 rounded-b-lg transition-all duration-500"
                                        style={{ height: `${(comparison.left!.fmax / Math.max(comparison.left!.fmax, comparison.right!.fmax)) * 100}%` }}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold text-white drop-shadow-lg">
                                          {comparison.left!.fmax.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1">
                                      RFD: {comparison.left!.rfd.toFixed(0)} {comparison.left!.unit}/s
                                    </p>
                                  </div>

                                  {/* Lado Derecho */}
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                      <span className="text-[10px] text-[#f59e0b] font-medium">DERECHO</span>
                                      <Icon name="arrow_forward" className="text-[#f59e0b] text-sm" />
                                    </div>
                                    <div className="h-16 bg-[#0a150d] rounded-lg relative overflow-hidden">
                                      <div
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f59e0b] to-[#f59e0b]/50 rounded-b-lg transition-all duration-500"
                                        style={{ height: `${(comparison.right!.fmax / Math.max(comparison.left!.fmax, comparison.right!.fmax)) * 100}%` }}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold text-white drop-shadow-lg">
                                          {comparison.right!.fmax.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1">
                                      RFD: {comparison.right!.rfd.toFixed(0)} {comparison.right!.unit}/s
                                    </p>
                                  </div>
                                </div>

                                {/* Indicador de lado dominante */}
                                <div className="flex items-center justify-center gap-2 p-2 rounded-lg"
                                     style={{ backgroundColor: `${asymmetryColor}15` }}>
                                  <Icon name={
                                    comparison.dominantSide === 'left' ? 'arrow_back' :
                                    comparison.dominantSide === 'right' ? 'arrow_forward' : 'balance'
                                  } style={{ color: asymmetryColor }} />
                                  <span className="text-xs font-medium" style={{ color: asymmetryColor }}>
                                    {comparison.dominantSide === 'left' ? 'Predomina lado IZQUIERDO' :
                                     comparison.dominantSide === 'right' ? 'Predomina lado DERECHO' :
                                     'Equilibrio bilateral'}
                                  </span>
                                </div>

                                {/* Métricas adicionales */}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="bg-[#0a150d] rounded-lg p-2 text-center">
                                    <p className="text-[9px] text-slate-500">Asimetría RFD</p>
                                    <p className="text-sm font-bold text-[#ec4899]">
                                      {comparison.rfdAsymmetry.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="bg-[#0a150d] rounded-lg p-2 text-center">
                                    <p className="text-[9px] text-slate-500">Índice Simetría</p>
                                    <p className="text-sm font-bold text-[#13ec6d]">
                                      {(100 - comparison.fmaxAsymmetry).toFixed(1)}%
                                    </p>
                                  </div>
                                </div>

                                {/* Interpretación */}
                                <div className="mt-2 p-2 rounded-lg bg-[#102218] border border-white/5">
                                  <p className="text-[10px] text-slate-300 flex items-start gap-1">
                                    <Icon name="info" className="text-[#00f0ff] text-xs mt-0.5" />
                                    <span>
                                      {comparison.fmaxAsymmetry < 10
                                        ? 'Asimetría dentro de rangos normales (<10%). Continuar con entrenamiento equilibrado.'
                                        : comparison.fmaxAsymmetry < 15
                                          ? 'Asimetría moderada (10-15%). Considerar ejercicios unilaterales para corregir desbalance.'
                                          : 'Asimetría significativa (>15%). Recomendado trabajo correctivo unilateral y evaluación funcional.'}
                                    </span>
                                  </p>
                                </div>
                              </>
                            )}

                            {!hasBothSides && (
                              <div className="text-center py-3">
                                <Icon name="hourglass_empty" className="text-2xl text-slate-500 mb-2" />
                                <p className="text-xs text-slate-400">
                                  Falta evaluar el lado {comparison.left ? 'derecho' : 'izquierdo'}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Leyenda de interpretación */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-slate-500 mb-2">Interpretación del índice:</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-[#13ec6d]" />
                          <span className="text-[9px] text-slate-400">&lt;10% Normal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                          <span className="text-[9px] text-slate-400">10-15% Moderado</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                          <span className="text-[9px] text-slate-400">&gt;15% Significativo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =============== 5. DATOS DE EVALUACIÓN (Guardar) =============== */}
                <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Icon name="save" className="text-[#8b5cf6]" />
                    Datos de Evaluación
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-slate-500">Atleta</p>
                      <p className="text-white font-medium">{user?.nombre_completo || 'Usuario'}</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-slate-500">Fecha</p>
                      <p className="text-white font-medium">{new Date().toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-slate-500">Músculo</p>
                      <p className="text-white font-medium">{MUSCLE_GROUPS.find(m => m.id === selectedMuscleGroup)?.nameEs || 'Cuádriceps'}</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-slate-500">Unidad</p>
                      <p className="text-white font-medium">{forceUnit}</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveEvaluation}
                    disabled={metrics.fuerzaMaxReal === 0 || isSaving}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      isSaving 
                        ? 'bg-[#8b5cf6]/50 text-white cursor-wait' 
                        : metrics.fuerzaMaxReal > 0 
                          ? 'bg-[#8b5cf6] text-white hover:bg-[#8b5cf6]/90' 
                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Icon name="save" />
                        Guardar Evaluación
                      </>
                    )}
                  </button>

                  {/* Mensaje de estado del guardado */}
                  {saveStatus !== 'idle' && saveMessage && (
                    <div className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${
                      saveStatus === 'success' ? 'bg-[#13ec6d]/20 text-[#13ec6d] border border-[#13ec6d]/30' :
                      saveStatus === 'error' ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30' :
                      'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30'
                    }`}>
                    <Icon name={saveStatus === 'success' ? 'check_circle' : saveStatus === 'error' ? 'warning' : 'sync'} />
                    {saveMessage}
                  </div>
                  )}

                  {/* Toggle para Supabase */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Sincronizar con Supabase</span>
                    <button
                      onClick={() => setSupabaseEnabled(!supabaseEnabled)}
                      className={`w-10 h-5 rounded-full transition-all relative ${
                        supabaseEnabled ? 'bg-[#13ec6d]' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        supabaseEnabled ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Historial reciente */}
                  {evaluationHistory.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-slate-500 mb-2">Evaluaciones guardadas: {evaluationHistory.length}</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {evaluationHistory.slice(0, 3).map((eval_) => (
                          <div key={eval_.id} className="flex items-center justify-between bg-[#102218] rounded-lg p-2 text-xs">
                            <div>
                              <p className="text-white">{MUSCLE_GROUPS.find(m => m.id === eval_.muscleEvaluated)?.nameEs}</p>
                              <p className="text-slate-500">{new Date(eval_.date).toLocaleDateString('es-ES')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[#13ec6d] font-bold">{eval_.fmax.toFixed(1)} {eval_.unit}</p>
                              <p className="text-[#f59e0b]">{eval_.rfd.toFixed(0)} {eval_.unit}/s</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* =============== 6. CARGA SUGERIDA =============== */}
                <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#f59e0b]/20">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Icon name="calculate" className="text-[#f59e0b]" />
                    Carga Sugerida
                  </h3>

                  {metrics.fuerzaMaxReal > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-[#102218] rounded-xl p-3 text-center border border-[#13ec6d]/10">
                          <p className="text-[10px] text-slate-500">Fuerza Máxima</p>
                          <p className="text-lg font-black text-[#13ec6d]">{(metrics.fuerzaMaxReal * 0.95).toFixed(0)}-{(metrics.fuerzaMaxReal * 0.85).toFixed(0)}</p>
                          <p className="text-[10px] text-[#13ec6d]">85-95% Fmax</p>
                        </div>
                        <div className="bg-[#102218] rounded-xl p-3 text-center border border-[#f59e0b]/10">
                          <p className="text-[10px] text-slate-500">Fuerza Explosiva</p>
                          <p className="text-lg font-black text-[#f59e0b]">{(metrics.fuerzaMaxReal * 0.6).toFixed(0)}-{(metrics.fuerzaMaxReal * 0.3).toFixed(0)}</p>
                          <p className="text-[10px] text-[#f59e0b]">30-60% Fmax</p>
                        </div>
                        <div className="bg-[#102218] rounded-xl p-3 text-center border border-[#00f0ff]/10">
                          <p className="text-[10px] text-slate-500">Resistencia</p>
                          <p className="text-lg font-black text-[#00f0ff]">{(metrics.fuerzaMaxReal * 0.7).toFixed(0)}-{(metrics.fuerzaMaxReal * 0.4).toFixed(0)}</p>
                          <p className="text-[10px] text-[#00f0ff]">40-70% Fmax</p>
                        </div>
                      </div>

                      <div className="bg-[#102218] rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-white font-medium mb-2">Recomendación basada en tu evaluación:</p>
                        <p className="text-xs text-slate-300">
                          Con una Fmax de <span className="text-[#13ec6d] font-bold">{metrics.fuerzaMaxReal.toFixed(1)} {forceUnit}</span> y RFD de 
                          <span className="text-[#f59e0b] font-bold"> {metrics.rfdMax.toFixed(0)} {forceUnit}/s</span>, se sugiere priorizar 
                          {metrics.rfdMax > 300 ? ' entrenamiento de fuerza máxima (3-5 reps al 85-95%)' : ' trabajo de fuerza explosiva (6-8 reps al 50-70%) con énfasis en velocidad'}.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      <Icon name="fitness_center" className="text-3xl mb-2 opacity-50" />
                      <p>Realiza una evaluación para obtener recomendaciones de carga</p>
                    </div>
                  )}
                </div>

                {/* Fórmulas de referencia */}
                <div className="p-3 bg-[#102218] rounded-xl border border-white/5">
                  <div className="flex items-start gap-2">
                    <Icon name="functions" className="text-[#13ec6d] mt-0.5" />
                    <div>
                      <p className="text-xs text-white font-medium mb-1">Fórmulas de Cálculo</p>
                      <div className="space-y-1 text-[10px] text-slate-400">
                        <p><span className="text-[#f59e0b]">RFD:</span> (F(t₂) - F(t₁)) / (t₂ - t₁)</p>
                        <p><span className="text-[#ec4899]">Impulso:</span> ∫₀ᵗ F(t)dt → N·s (kg × 9.80665)</p>
                        <p><span className="text-[#00f0ff]">Modelo:</span> F(t) = Fmax × (1 - e^(-t/τ))</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ==================== RESISTENCIA ==================== */
              <div className="space-y-4">
                <button onClick={() => setEvalType('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <Icon name="arrow_back" />
                  <span className="text-sm">Volver</span>
                </button>
                
                {/* Header Compacto */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ec4899]/20 flex items-center justify-center">
                      <Icon name="favorite" className="text-lg text-[#ec4899]" />
                    </div>
                    <h2 className="text-base font-bold text-white">Resistencia Cardiovascular</h2>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${btConnected ? 'bg-[#ec4899]/20' : 'bg-red-500/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${btConnected ? 'bg-[#ec4899] animate-pulse' : 'bg-red-400'}`}></div>
                    <span className={`text-[10px] font-medium ${btConnected ? 'text-[#ec4899]' : 'text-red-400'}`}>
                      {btConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-[#193324] rounded-2xl p-4 border border-[#ec4899]/20">
                  <p className="text-center text-slate-400 py-4 text-sm">Monitoreo de frecuencia cardíaca con Bluetooth</p>
                  <button 
                    onClick={() => setBtConnected(!btConnected)}
                    className={`w-full py-3 rounded-xl font-bold ${btConnected ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#ec4899] text-white'}`}
                  >
                    {btConnected ? 'Desconectar Bluetooth' : 'Conectar Cinta FC'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== PLANIFICACIÓN TAB ======================== */}
        {activeTab === 'planificacion' && (
          <div className="space-y-4">
            {/* Header Compacto */}
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                <Icon name="event_note" className="text-lg text-[#f59e0b]" />
              </div>
              <h2 className="text-base font-bold text-white">Planificación</h2>
              <span className="text-[10px] text-slate-500 ml-auto">Periodización</span>
            </div>

            {/* Sub Tabs */}
            <div className="flex bg-[#193324] rounded-xl p-1 border border-white/5">
              <button onClick={() => setPlanSubTab('fuerza')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${planSubTab === 'fuerza' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'}`}>
                <Icon name="fitness_center" className="text-lg" />
                Fuerza
              </button>
              <button onClick={() => setPlanSubTab('resistencia')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${planSubTab === 'resistencia' ? 'bg-[#00f0ff] text-[#102218]' : 'text-slate-400 hover:text-white'}`}>
                <Icon name="directions_run" className="text-lg" />
                Resistencia
              </button>
            </div>

            {/* ================== FUERZA ================== */}
            {planSubTab === 'fuerza' && (
              <>
                {/* Current Phase */}
                <div className="bg-[#193324] rounded-2xl p-4 border border-[#f59e0b]/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center">
                      <Icon name="trending_up" className="text-2xl text-[#f59e0b]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fase Actual</p>
                      <p className="text-lg font-bold text-white">Fuerza Máxima</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-bold text-[#f59e0b]">S8</p>
                      <p className="text-xs text-slate-500">Semana 8/16</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-lg font-bold text-white">85%</p>
                      <p className="text-[10px] text-slate-500">Intensidad</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-lg font-bold text-white">5x5</p>
                      <p className="text-[10px] text-slate-500">Series x Reps</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-lg font-bold text-white">3-5'</p>
                      <p className="text-[10px] text-slate-500">Descanso</p>
                    </div>
                  </div>
                </div>

                {/* Mesocycles */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Icon name="calendar_month" className="text-[#13ec6d]" />
                    Mesociclos
                  </h3>
                  {STRENGTH_MESOCYCLES.map((meso) => (
                    <div key={meso.id} className={`bg-[#193324] rounded-xl p-4 border transition-all ${
                      meso.status === 'active' ? `border-[${meso.color}]/50` : 
                      meso.status === 'completed' ? 'border-[#13ec6d]/20' : 'border-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            meso.status === 'completed' ? 'bg-[#13ec6d]/20' : 
                            meso.status === 'active' ? 'bg-[#f59e0b]/20' : 'bg-slate-500/20'
                          }`}>
                            {meso.status === 'completed' ? (
                              <Icon name="check_circle" className="text-[#13ec6d]" />
                            ) : meso.status === 'active' ? (
                              <Icon name="play_circle" style={{ color: meso.color }} />
                            ) : (
                              <Icon name="radio_button_unchecked" className="text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{meso.name}</p>
                            <p className="text-xs text-slate-500">{meso.weeks}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          meso.status === 'completed' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 
                          meso.status === 'active' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-slate-500/20 text-slate-500'
                        }`}>
                          {meso.status === 'completed' ? 'Completado' : meso.status === 'active' ? 'Activo' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="bg-[#102218] rounded-lg p-3 mt-2">
                        <p className="text-xs font-bold text-white mb-1">{meso.phase}</p>
                        <p className="text-[10px] text-slate-400 mb-2">{meso.objective}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">Int: {meso.intensity}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">Vol: {meso.volume}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">Desc: {meso.rest}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Plan */}
                <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Icon name="view_week" className="text-[#00f0ff]" />
                    Microciclo Actual
                  </h3>
                  <div className="space-y-2">
                    {STRENGTH_MICROCYCLE.map((day, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${day.completed ? 'bg-[#13ec6d]/10 border border-[#13ec6d]/20' : 'bg-[#102218]'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${day.completed ? 'bg-[#13ec6d] text-[#102218]' : 'bg-white/10 text-slate-400'}`}>
                              {day.completed ? '✓' : idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-white">{day.day}</p>
                              <p className="text-[10px] text-slate-500">{day.focus}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {day.exercises.map((ex, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400">{ex}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ================== RESISTENCIA ================== */}
            {planSubTab === 'resistencia' && (
              <>
                {/* Current Phase */}
                <div className="bg-[#193324] rounded-2xl p-4 border border-[#00f0ff]/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-[#00f0ff]/20 flex items-center justify-center">
                      <Icon name="directions_run" className="text-2xl text-[#00f0ff]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fase Actual</p>
                      <p className="text-lg font-bold text-white">Construcción</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-bold text-[#00f0ff]">S10</p>
                      <p className="text-xs text-slate-500">Semana 10/18</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-lg font-bold text-white">Z3-4</p>
                      <p className="text-[10px] text-slate-500">Intensidad</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-lg font-bold text-white">50km</p>
                      <p className="text-[10px] text-slate-500">Vol. Semanal</p>
                    </div>
                    <div className="bg-[#102218] rounded-lg p-2">
                      <p className="text-lg font-bold text-white">5</p>
                      <p className="text-[10px] text-slate-500">Sesiones</p>
                    </div>
                  </div>
                </div>

                {/* HR Zones */}
                <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Icon name="favorite" className="text-red-400" />
                    Zonas de Entrenamiento
                  </h3>
                  <div className="space-y-2">
                    {ENDURANCE_ZONES.map((zone) => (
                      <div key={zone.zone} className="flex items-center gap-3 p-2 rounded-lg bg-[#102218]">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: zone.color }}>
                          Z{zone.zone}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white">{zone.name}</p>
                            <p className="text-[10px] text-slate-400">{zone.range}</p>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">{zone.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mesocycles */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Icon name="calendar_month" className="text-[#00f0ff]" />
                    Periodización
                  </h3>
                  {ENDURANCE_MESOCYCLES.map((meso) => (
                    <div key={meso.id} className="bg-[#193324] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            meso.status === 'completed' ? 'bg-[#13ec6d]/20' : 
                            meso.status === 'active' ? 'bg-[#f59e0b]/20' : 'bg-slate-500/20'
                          }`}>
                            {meso.status === 'completed' ? (
                              <Icon name="check_circle" className="text-[#13ec6d]" />
                            ) : meso.status === 'active' ? (
                              <Icon name="play_circle" style={{ color: meso.color }} />
                            ) : (
                              <Icon name="radio_button_unchecked" className="text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{meso.name}</p>
                            <p className="text-xs text-slate-500">{meso.weeks}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          meso.status === 'completed' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 
                          meso.status === 'active' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-slate-500/20 text-slate-500'
                        }`}>
                          {meso.status === 'completed' ? 'Completado' : meso.status === 'active' ? 'Activo' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="bg-[#102218] rounded-lg p-3 mt-2">
                        <p className="text-[10px] text-slate-400 mb-2">{meso.objective}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">Vol: {meso.volume}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">{meso.intensity}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">{meso.sessions}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-slate-300">Long: {meso.longRun}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Plan */}
                <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Icon name="view_week" className="text-[#00f0ff]" />
                    Microciclo Actual
                  </h3>
                  <div className="space-y-2">
                    {ENDURANCE_MICROCYCLE.map((day, idx) => (
                      <div key={idx} className={`p-3 rounded-lg flex items-center justify-between ${day.completed ? 'bg-[#13ec6d]/10 border border-[#13ec6d]/20' : 'bg-[#102218]'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${day.completed ? 'bg-[#13ec6d] text-[#102218]' : 'bg-white/10 text-slate-400'}`}>
                            {day.completed ? '✓' : idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white">{day.day}</p>
                            <p className="text-[10px] text-slate-500">{day.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-white">{day.distance}</p>
                          <p className="text-[10px] text-slate-400">{day.pace !== '-' ? day.pace : ''}</p>
                          {day.zone !== '-' && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-[#00f0ff]/20 text-[#00f0ff] rounded">{day.zone}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================== PERFIL TAB ======================== */}
        {activeTab === 'perfil' && (
          <div className="space-y-4">
            {/* Header Compacto */}
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-[#13ec6d]/20 flex items-center justify-center border border-[#13ec6d]/30">
                <Icon name="person" className="text-xl text-[#13ec6d]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white truncate">{user.nombre_completo || 'Usuario'}</h2>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold shrink-0 ${
                user.rol === 'superadmin' || user.rol === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                user.rol === 'admin' ? 'bg-[#00f0ff]/20 text-[#00f0ff]' :
                user.rol === 'entrenador' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {user.rol === 'superadmin' || user.rol === 'super_admin' ? 'Super Admin' :
                 user.rol === 'admin' ? 'Admin' :
                 user.rol === 'entrenador' ? 'Entrenador' : 'Atleta'}
              </span>
            </div>

            <div className="bg-[#193324] rounded-2xl border border-white/5 p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="badge" className="text-[#00f0ff]" />
                Información Personal
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">DNI</p>
                  <p className="text-white font-medium">{user.dni || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Género</p>
                  <p className="text-white font-medium capitalize">{user.genero || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Altura</p>
                  <p className="text-white font-medium">{user.altura_cm ? `${user.altura_cm} cm` : '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Peso</p>
                  <p className="text-white font-medium">{user.peso_kg ? `${user.peso_kg} kg` : '--'}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#193324] rounded-2xl border border-white/5 p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="fitness_center" className="text-[#13ec6d]" />
                Datos Fitness
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">IMC</p>
                  <p className="text-white font-medium">{user.imc?.toFixed(1) || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">FC Máxima</p>
                  <p className="text-white font-medium">{user.fc_maxima ? `${user.fc_maxima} bpm` : '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">FC Reposo</p>
                  <p className="text-white font-medium">{user.fc_reposo ? `${user.fc_reposo} bpm` : '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nivel</p>
                  <p className="text-white font-medium capitalize">{user.nivel_experiencia || '--'}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-xs text-slate-500 mb-1">Objetivo</p>
                <p className="text-[#13ec6d] font-bold capitalize">{user.objetivo?.replace('_', ' ') || 'No definido'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button onClick={() => window.location.href = '/evaluacion/isometrica'} className="w-full py-3 bg-[#13ec6d]/20 border border-[#13ec6d]/30 text-[#13ec6d] rounded-xl font-bold hover:bg-[#13ec6d]/30 transition-all flex items-center justify-center gap-2">
                <Icon name="edit" />
                Editar Perfil
              </button>
              <button onClick={handleLogout} className="w-full py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2">
                <Icon name="logout" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#102218]/95 backdrop-blur-md border-t border-[#13ec6d]/10 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {[
            { id: 'home', icon: 'home', label: 'Inicio' },
            { id: 'evaluaciones', icon: 'assessment', label: 'Eval.' },
            { id: 'planificacion', icon: 'event_note', label: 'Plan' },
            { id: 'perfil', icon: 'person', label: 'Perfil' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                activeTab === item.id ? 'text-[#13ec6d]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon name={item.icon} className="text-xl" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
