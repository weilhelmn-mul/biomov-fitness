// ============================================================================
// TIPOS PARA EVALUACIÓN ISOMÉTRICA - Adaptados a Supabase
// ============================================================================

// Tipo de lado según el ENUM en Supabase
export type SideType = 'Izquierdo' | 'Derecho' | 'Bilateral'
export type ForceUnit = 'kg' | 'N'

// Métricas detalladas de una evaluación isométrica
export interface IsometricMetrics {
  fmax?: number                    // Fuerza máxima (kg)
  force_at_200ms?: number          // Fuerza a los 200ms
  average_force?: number           // Fuerza promedio
  test_duration?: number           // Duración del test (segundos)
  time_to_fmax?: number            // Tiempo hasta Fmax (ms)
  time_to_50fmax?: number          // Tiempo hasta 50% Fmax (ms)
  time_to_90fmax?: number          // Tiempo hasta 90% Fmax (ms)
  rfd_max?: number                 // RFD máximo (kg/s)
  rfd_50ms?: number                // RFD a 50ms
  rfd_100ms?: number               // RFD a 100ms
  rfd_150ms?: number               // RFD a 150ms
  rfd_200ms?: number               // RFD a 200ms
  tau?: number                     // Constante de tiempo
  force_modeled?: number           // Fuerza modelada
  galga_max?: number               // Valor máximo de la galga (solo una galga)
  galga_avg?: number               // Valor promedio de la galga
  fatigue_index?: number           // Índice de fatiga
  symmetry_index?: number          // Índice de simetría
  force_curve?: number[]           // Curva de fuerza (array de puntos)
  sampling_rate?: number           // Tasa de muestreo (Hz)
  calibration_factor?: number      // Factor de calibración
}

// Métricas bilaterales detalladas
export interface MetricasBilaterales {
  R: IsometricMetrics
  L: IsometricMetrics
}

// Datos de un músculo evaluado (ambos lados)
export interface MuscleEvaluationData {
  muscleId: string                 // ID del músculo (ej: 'pectoral_mayor')
  muscleName: string               // Nombre del músculo
  lado: MetricasBilaterales        // Métricas de ambos lados
}

// Registro de evaluación en Supabase
export interface IsometricEvaluationDB {
  id?: string
  athlete_id?: string | null
  athlete_name?: string | null
  muscle_evaluated: string
  side: SideType
  test_date: string
  unit: ForceUnit
  fmax?: number | null
  force_at_200ms?: number | null
  average_force?: number | null
  test_duration?: number | null
  time_to_fmax?: number | null
  time_to_50fmax?: number | null
  time_to_90fmax?: number | null
  rfd_max?: number | null
  rfd_50ms?: number | null
  rfd_100ms?: number | null
  rfd_150ms?: number | null
  rfd_200ms?: number | null
  tau?: number | null
  force_modeled?: number | null
  galga1_max?: number | null
  galga1_avg?: number | null
  galga2_max?: number | null
  galga2_avg?: number | null
  fatigue_index?: number | null
  symmetry_index?: number | null
  sampling_rate?: number | null
  calibration_factor?: number | null
  force_curve?: number[] | null
  device_info?: any | null
  notes?: string | null
}

// Solicitud completa de evaluación isométrica
export interface IsometricEvaluationRequest {
  userId: string
  athleteName?: string
  musculos: MuscleEvaluationData[]
  sessionDate?: string
  notes?: string
  deviceInfo?: {
    model?: string
    firmware?: string
    samplingRate?: number
  }
}

// Respuesta de la API
export interface IsometricEvaluationResponse {
  success: boolean
  evaluations?: IsometricEvaluationDB[]
  count?: number
  error?: string
  details?: any
}

// Mapa de nombres de grupos musculares a códigos para Supabase
export const MUSCLE_CODE_MAP: Record<string, string> = {
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

// Mapa inverso para convertir códigos a nombres
export const CODE_TO_MUSCLE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MUSCLE_CODE_MAP).map(([k, v]) => [v, k])
)
