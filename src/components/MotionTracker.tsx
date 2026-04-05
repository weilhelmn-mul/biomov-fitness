'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface AccelerationData {
  x: number
  y: number
  z: number
  timestamp: number
}

interface ROMMeasurement {
  id: string
  joint: string
  side: 'left' | 'right' | 'bilateral'
  angle_min: number
  angle_max: number
  range_of_motion: number
  created_at: string
}

interface MotionTrackerProps {
  userId: string
  onSaveMeasurement?: (measurement: any) => void
}

// ============================================================================
// JOINT CONFIGURATIONS
// ============================================================================

const JOINTS = [
  { id: 'shoulder', name: 'Hombro', icon: '↔️', normalROM: { flexion: 180, extension: 60, abduction: 180 } },
  { id: 'elbow', name: 'Codo', icon: '💪', normalROM: { flexion: 145, extension: 0 } },
  { id: 'wrist', name: 'Muñeca', icon: '🤚', normalROM: { flexion: 90, extension: 70 } },
  { id: 'hip', name: 'Cadera', icon: '🦵', normalROM: { flexion: 120, extension: 30 } },
  { id: 'knee', name: 'Rodilla', icon: '🦵', normalROM: { flexion: 135, extension: 0 } },
  { id: 'ankle', name: 'Tobillo', icon: '🦶', normalROM: { dorsiflexion: 20, plantarflexion: 50 } },
  { id: 'cervical', name: 'Cervical', icon: '🗣️', normalROM: { flexion: 45, extension: 45, rotation: 70 } },
  { id: 'lumbar', name: 'Lumbar', icon: '🔙', normalROM: { flexion: 60, extension: 25 } },
]

// ============================================================================
// ICON COMPONENT
// ============================================================================

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MotionTracker({ userId, onSaveMeasurement }: MotionTrackerProps) {
  // State
  const [selectedJoint, setSelectedJoint] = useState(JOINTS[0])
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('right')
  const [isTracking, setIsTracking] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [angleHistory, setAngleHistory] = useState<number[]>([])
  const [maxAngle, setMaxAngle] = useState(0)
  const [minAngle, setMinAngle] = useState(180)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [measurements, setMeasurements] = useState<ROMMeasurement[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  
  // Refs
  const orientationRef = useRef<{ alpha: number; beta: number; gamma: number }>({ alpha: 0, beta: 0, gamma: 0 })
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startOrientationRef = useRef<{ beta: number; gamma: number } | null>(null)

  // ============================================================================
  // DEVICE ORIENTATION HANDLING
  // ============================================================================

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!isTracking) return
    
    const beta = event.beta || 0  // Front-back tilt (-180 to 180)
    const gamma = event.gamma || 0 // Left-right tilt (-90 to 90)
    
    orientationRef.current = {
      alpha: event.alpha || 0,
      beta: beta,
      gamma: gamma
    }

    // Calculate angle based on joint type
    let angle = 0
    
    if (selectedJoint.id === 'knee' || selectedJoint.id === 'elbow') {
      // For knee/elbow, we use beta (front-back tilt)
      angle = Math.abs(beta)
      if (startOrientationRef.current) {
        angle = Math.abs(beta - startOrientationRef.current.beta)
      }
    } else if (selectedJoint.id === 'shoulder' || selectedJoint.id === 'hip') {
      // For shoulder/hip abduction, we use gamma (side tilt)
      angle = Math.abs(gamma)
      if (startOrientationRef.current) {
        angle = Math.abs(gamma - startOrientationRef.current.gamma)
      }
    } else if (selectedJoint.id === 'ankle' || selectedJoint.id === 'wrist') {
      // For ankle/wrist, use beta
      angle = Math.abs(beta)
      if (startOrientationRef.current) {
        angle = Math.abs(beta - startOrientationRef.current.beta)
      }
    } else {
      // Default: use beta
      angle = Math.abs(beta)
    }
    
    // Clamp angle to 0-180
    angle = Math.max(0, Math.min(180, angle))
    
    setCurrentAngle(angle)
    setAngleHistory(prev => [...prev.slice(-100), angle])
    
    if (angle > maxAngle) setMaxAngle(angle)
    if (angle < minAngle) setMinAngle(angle)
  }, [isTracking, selectedJoint.id, maxAngle, minAngle])

  // ============================================================================
  // PERMISSION AND TRACKING
  // ============================================================================

  const requestPermission = async () => {
    // Check if DeviceOrientationEvent is available
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setErrorMessage('Tu dispositivo no soporta sensores de movimiento')
      setHasPermission(false)
      return false
    }

    // iOS 13+ requires permission request
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        if (permission === 'granted') {
          setHasPermission(true)
          return true
        } else {
          setErrorMessage('Permiso denegado para acceder a los sensores')
          setHasPermission(false)
          return false
        }
      } catch (error) {
        setErrorMessage('Error al solicitar permiso')
        setHasPermission(false)
        return false
      }
    }
    
    // Desktop or older devices - simulate
    setHasPermission(true)
    return true
  }

  const startTracking = async () => {
    const hasAccess = await requestPermission()
    if (!hasAccess) return
    
    setErrorMessage(null)
    setIsTracking(true)
    setAngleHistory([])
    setMaxAngle(0)
    setMinAngle(180)
    setCurrentAngle(0)
    
    // Store starting orientation
    window.addEventListener('deviceorientation', handleOrientation)
  }

  const stopTracking = () => {
    setIsTracking(false)
    window.removeEventListener('deviceorientation', handleOrientation)
    
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }
  }

  // ============================================================================
  // SAVE MEASUREMENT
  // ============================================================================

  const saveMeasurement = async () => {
    if (maxAngle === 0 && minAngle === 180) return
    
    setIsSaving(true)
    
    try {
      const measurement = {
        user_id: userId,
        joint: selectedJoint.id,
        side: selectedSide,
        angle_min: Math.round(minAngle),
        angle_max: Math.round(maxAngle),
        range_of_motion: Math.round(maxAngle - minAngle),
        notes: `${selectedJoint.name} - ${selectedSide === 'left' ? 'Izquierdo' : 'Derecho'}`
      }
      
      const response = await fetch('/api/rom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurement)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMeasurements(prev => [data.measurement, ...prev])
        if (onSaveMeasurement) onSaveMeasurement(data.measurement)
        
        // Reset for next measurement
        setMaxAngle(0)
        setMinAngle(180)
        setAngleHistory([])
      } else {
        setErrorMessage('Error al guardar la medición')
      }
    } catch (error) {
      setErrorMessage('Error de conexión')
    }
    
    setIsSaving(false)
  }

  // ============================================================================
  // LOAD HISTORY
  // ============================================================================

  useEffect(() => {
    const loadMeasurements = async () => {
      try {
        const response = await fetch(`/api/rom?user_id=${userId}&limit=20`)
        const data = await response.json()
        if (data.success) {
          setMeasurements(data.measurements || [])
        }
      } catch (error) {
        console.error('Error loading measurements:', error)
      }
    }
    
    if (userId) {
      loadMeasurements()
    }
  }, [userId])

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
      }
    }
  }, [handleOrientation])

  // ============================================================================
  // RENDER
  // ============================================================================

  const calculatedROM = maxAngle - minAngle
  const normalROM = selectedJoint.normalROM.flexion || 180
  const romPercentage = Math.min(100, (calculatedROM / normalROM) * 100)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#00f0ff]/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#00f0ff]/20 flex items-center justify-center">
            <Icon name="rotate_right" className="text-2xl text-[#00f0ff]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Motion Tracker</h2>
            <p className="text-xs text-slate-400">Rango de Movimiento Articular</p>
          </div>
        </div>
      </div>

      {/* Joint Selector */}
      <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Icon name="accessibility_new" className="text-[#13ec6d]" />
          Seleccionar Articulación
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {JOINTS.map((joint) => (
            <button
              key={joint.id}
              onClick={() => {
                setSelectedJoint(joint)
                stopTracking()
              }}
              className={`p-2 rounded-xl text-center transition-all ${
                selectedJoint.id === joint.id
                  ? 'bg-[#00f0ff] text-[#102218]'
                  : 'bg-[#102218] text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg">{joint.icon}</span>
              <p className="text-[10px] font-bold mt-1">{joint.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Side Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedSide('left')}
          className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            selectedSide === 'left' ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#193324] text-slate-400'
          }`}
        >
          <Icon name="arrow_back" />
          Izquierdo
        </button>
        <button
          onClick={() => setSelectedSide('right')}
          className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            selectedSide === 'right' ? 'bg-[#13ec6d] text-[#102218]' : 'bg-[#193324] text-slate-400'
          }`}
        >
          Derecho
          <Icon name="arrow_forward" />
        </button>
      </div>

      {/* Angle Display */}
      <div className="bg-[#193324] rounded-2xl p-6 border border-[#00f0ff]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f0ff]/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          {/* Current Angle */}
          <div className="text-center mb-4">
            <p className="text-xs text-slate-400 mb-1">Ángulo Actual</p>
            <div className="text-5xl font-bold text-[#00f0ff]">
              {Math.round(currentAngle)}°
            </div>
          </div>

          {/* Angle Arc Visualization */}
          <div className="relative w-48 h-24 mx-auto mb-4">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              {/* Background arc */}
              <path
                d="M 10 100 A 90 90 0 0 1 190 100"
                fill="none"
                stroke="#102218"
                strokeWidth="8"
              />
              {/* ROM arc */}
              <path
                d="M 10 100 A 90 90 0 0 1 190 100"
                fill="none"
                stroke={romPercentage >= 80 ? '#13ec6d' : romPercentage >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${romPercentage * 2.83} 283`}
                strokeLinecap="round"
              />
              {/* Current angle indicator */}
              <circle
                cx={10 + 180 * (currentAngle / 180)}
                cy={100 - Math.sin((currentAngle * Math.PI) / 180) * 90}
                r="6"
                fill="#00f0ff"
              />
            </svg>
          </div>

          {/* ROM Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#102218] rounded-lg p-2">
              <p className="text-xs text-slate-500">Mín</p>
              <p className="text-lg font-bold text-white">{Math.round(minAngle)}°</p>
            </div>
            <div className="bg-[#102218] rounded-lg p-2">
              <p className="text-xs text-slate-500">ROM</p>
              <p className="text-lg font-bold text-[#13ec6d]">{Math.round(calculatedROM)}°</p>
            </div>
            <div className="bg-[#102218] rounded-lg p-2">
              <p className="text-xs text-slate-500">Máx</p>
              <p className="text-lg font-bold text-white">{Math.round(maxAngle)}°</p>
            </div>
          </div>
        </div>
      </div>

      {/* Normal ROM Reference */}
      <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">ROM Normal - {selectedJoint.name}</p>
            <p className="text-sm font-bold text-white">
              {normalROM}° flexión
              {selectedJoint.normalROM.extension && ` / ${selectedJoint.normalROM.extension}° extensión`}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            romPercentage >= 80 ? 'bg-[#13ec6d]/20 text-[#13ec6d]' :
            romPercentage >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {Math.round(romPercentage)}%
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
          <p className="text-red-400 text-sm text-center">{errorMessage}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="space-y-2">
        {!isTracking ? (
          <button
            onClick={startTracking}
            className="w-full py-4 bg-[#00f0ff] text-[#102218] rounded-xl font-bold hover:bg-[#00f0ff]/90 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="play_arrow" />
            INICIAR MEDICIÓN
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="w-full py-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="stop" />
            DETENER MEDICIÓN
          </button>
        )}

        {calculatedROM > 0 && !isTracking && (
          <button
            onClick={saveMeasurement}
            disabled={isSaving}
            className="w-full py-3 bg-[#13ec6d]/20 border border-[#13ec6d]/30 text-[#13ec6d] rounded-xl font-bold hover:bg-[#13ec6d]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="size-4 border-2 border-[#13ec6d]/30 border-t-[#13ec6d] rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icon name="save" />
                GUARDAR MEDICIÓN ({Math.round(calculatedROM)}°)
              </>
            )}
          </button>
        )}
      </div>

      {/* History Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full py-3 bg-[#193324] border border-white/5 rounded-xl font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
      >
        <Icon name="history" />
        Ver Historial ({measurements.length})
      </button>

      {/* History Panel */}
      {showHistory && measurements.length > 0 && (
        <div className="bg-[#193324] rounded-2xl p-4 border border-white/5 space-y-2">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Icon name="analytics" className="text-[#00f0ff]" />
            Mediciones Recientes
          </h3>
          {measurements.slice(0, 10).map((m, i) => (
            <div key={m.id || i} className="bg-[#102218] rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white capitalize">{m.joint}</p>
                <p className="text-xs text-slate-400">
                  {m.side === 'left' ? 'Izquierdo' : m.side === 'right' ? 'Derecho' : 'Bilateral'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#00f0ff]">{m.range_of_motion}°</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
