'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  MUSCULOS_ISOMETRICOS, 
  calcularIndiceFuerzaGlobal, 
  detectarDesequilibrios,
  calcularAsimetria
} from '@/components/strength/IsometricStrengthDashboard'
import type { 
  MusculoEvaluado, 
  IndiceFuerzaIsometricaGlobal, 
  DesequilibrioDetectado 
} from '@/components/strength/IsometricStrengthDashboard'

interface UseIsometricStrengthOptions {
  userId?: string
  autoLoad?: boolean
  onSave?: (data: SaveData) => void
}

interface SaveData {
  musculos: MusculoEvaluado[]
  indiceGlobal: IndiceFuerzaIsometricaGlobal
  desequilibrios: DesequilibrioDetectado[]
}

interface UseIsometricStrengthReturn {
  // Estado
  musculos: MusculoEvaluado[]
  indiceGlobal: IndiceFuerzaIsometricaGlobal
  desequilibrios: DesequilibrioDetectado[]
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  
  // Acciones
  actualizarFuerza: (musculoId: string, lado: 'R' | 'L', valor: number) => void
  setMusculos: (musculos: MusculoEvaluado[]) => void
  cargarDatosEjemplo: () => void
  limpiarDatos: () => void
  guardar: () => Promise<boolean>
  cargar: () => Promise<boolean>
  
  // Métricas calculadas
  musculosEvaluados: number
  totalMusculos: number
  porcentajeCompletado: number
  
  // Datos para integración con radar principal
  radarData: {
    nombre: string
    valor: number
    color: string
  }[]
}

/**
 * Hook para manejar el sistema de evaluación de fuerza isométrica
 * Facilita la integración con el dashboard principal
 */
export function useIsometricStrength(options: UseIsometricStrengthOptions = {}): UseIsometricStrengthReturn {
  const { userId, autoLoad = false, onSave } = options
  
  // Estado principal
  const [musculos, setMusculos] = useState<MusculoEvaluado[]>(MUSCULOS_ISOMETRICOS)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Cálculos derivados
  const indiceGlobal = useMemo(() => calcularIndiceFuerzaGlobal(musculos), [musculos])
  const desequilibrios = useMemo(() => detectarDesequilibrios(musculos), [musculos])
  
  const musculosEvaluados = useMemo(() => 
    musculos.filter(m => m.fuerza.R > 0 || m.fuerza.L > 0).length,
    [musculos]
  )
  
  const totalMusculos = musculos.length
  const porcentajeCompletado = Math.round((musculosEvaluados / totalMusculos) * 100)
  
  // Datos formateados para integración con radar principal
  const radarData = useMemo(() => [
    { 
      nombre: 'Fuerza Isométrica', 
      valor: indiceGlobal.valor, 
      color: '#13ec6d' 
    },
    { 
      nombre: 'Tren Superior', 
      valor: indiceGlobal.trenSuperior, 
      color: '#ef4444' 
    },
    { 
      nombre: 'Core', 
      valor: indiceGlobal.core, 
      color: '#13ec6d' 
    },
    { 
      nombre: 'Tren Inferior', 
      valor: indiceGlobal.trenInferior, 
      color: '#3b82f6' 
    },
    { 
      nombre: 'Simetría', 
      valor: indiceGlobal.simetriaGeneral, 
      color: '#f59e0b' 
    },
  ], [indiceGlobal])
  
  // Funciones de acción
  const actualizarFuerza = useCallback((musculoId: string, lado: 'R' | 'L', valor: number) => {
    setMusculos(prev => prev.map(m => 
      m.id === musculoId 
        ? { ...m, fuerza: { ...m.fuerza, [lado]: valor } }
        : m
    ))
  }, [])
  
  const cargarDatosEjemplo = useCallback(() => {
    const datosEjemplo = MUSCULOS_ISOMETRICOS.map(m => ({
      ...m,
      fuerza: {
        R: Math.round((m.pesoNormativo || 50) * (0.7 + Math.random() * 0.5)),
        L: Math.round((m.pesoNormativo || 50) * (0.65 + Math.random() * 0.5))
      }
    }))
    setMusculos(datosEjemplo)
  }, [])
  
  const limpiarDatos = useCallback(() => {
    setMusculos(MUSCULOS_ISOMETRICOS.map(m => ({ ...m, fuerza: { R: 0, L: 0 } })))
  }, [])
  
  const guardar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/isometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          musculos: musculos.map(m => ({ id: m.id, fuerza: m.fuerza })),
          indiceGlobal,
          desequilibrios
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setLastSaved(new Date())
        if (onSave) {
          onSave({ musculos, indiceGlobal, desequilibrios })
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error guardando evaluación isométrica:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, musculos, indiceGlobal, desequilibrios, onSave])
  
  const cargar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/isometric?userId=${userId}`)
      const data = await response.json()
      
      if (data.success && data.evaluations?.length > 0) {
        const ultima = data.evaluations[0]
        if (ultima.musculos_data) {
          const musculosData = JSON.parse(ultima.musculos_data)
          setMusculos(prev => prev.map(m => {
            const saved = musculosData.find((s: any) => s.id === m.id)
            return saved ? { ...m, fuerza: saved.fuerza } : m
          }))
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error cargando evaluación isométrica:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId])
  
  // Auto-cargar si está habilitado
  useEffect(() => {
    if (autoLoad && userId) {
      cargar()
    }
  }, [autoLoad, userId, cargar])
  
  return {
    musculos,
    indiceGlobal,
    desequilibrios,
    isLoading,
    isSaving,
    lastSaved,
    actualizarFuerza,
    setMusculos,
    cargarDatosEjemplo,
    limpiarDatos,
    guardar,
    cargar,
    musculosEvaluados,
    totalMusculos,
    porcentajeCompletado,
    radarData
  }
}

/**
 * Función auxiliar para obtener solo el índice de fuerza isométrica global
 * Útil para integración rápida en dashboards existentes
 */
export function getIsometricIndex(musculos: MusculoEvaluado[]): number {
  return calcularIndiceFuerzaGlobal(musculos).valor
}

/**
 * Función para obtener resumen rápido de desequilibrios críticos
 */
export function getCriticalImbalances(musculos: MusculoEvaluado[]): DesequilibrioDetectado[] {
  return detectarDesequilibrios(musculos).filter(d => d.clasificacion === 'riesgo')
}

/**
 * Función para generar datos de radar listos para Recharts
 */
export function getRadarDataForDashboard(musculos: MusculoEvaluado[]): {
  name: string
  value: number
  fullMark: number
}[] {
  const indice = calcularIndiceFuerzaGlobal(musculos)
  
  return [
    { name: 'Fuerza Isométrica', value: indice.valor, fullMark: 100 },
    { name: 'Tren Superior', value: indice.trenSuperior, fullMark: 100 },
    { name: 'Core', value: indice.core, fullMark: 100 },
    { name: 'Tren Inferior', value: indice.trenInferior, fullMark: 100 },
    { name: 'Simetría', value: indice.simetriaGeneral, fullMark: 100 },
  ]
}

// Exportar tipos
export type { MusculoEvaluado, IndiceFuerzaIsometricaGlobal, DesequilibrioDetectado }
