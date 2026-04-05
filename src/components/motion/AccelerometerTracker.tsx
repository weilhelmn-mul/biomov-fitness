'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AccelerometerData {
  x: number
  y: number
  z: number
  timestamp: number
  angle: number
  pitch: number
  roll: number
}

interface ROMResult {
  id: string
  timestamp: number
  rom: number
  maxAngle: number
  minAngle: number
  duration: number
  movementType: string
}

interface AccelerometerTrackerProps {
  lang?: 'es' | 'en'
}

// Movement axis configuration
const MOVEMENT_AXIS = {
  flexion: { label: 'Flexión', labelEn: 'Flexion', primary: 'pitch' },
  extension: { label: 'Extensión', labelEn: 'Extension', primary: 'pitch' },
  abduction: { label: 'Abducción', labelEn: 'Abduction', primary: 'roll' },
  rotation: { label: 'Rotación', labelEn: 'Rotation', primary: 'roll' },
} as const

type MovementType = keyof typeof MOVEMENT_AXIS
type SensorState = 'idle' | 'tracking' | 'measuring' | 'completed'

export default function AccelerometerTracker({ lang = 'es' }: AccelerometerTrackerProps) {
  // Sensor state
  const [sensorState, setSensorState] = useState<SensorState>('idle')
  const [movementType, setMovementType] = useState<MovementType>('flexion')
  
  // Sensor data - Real time
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 })
  const [accIncludingGravity, setAccIncludingGravity] = useState({ x: 0, y: 0, z: 0 })
  const [rotation, setRotation] = useState({ alpha: 0, beta: 0, gamma: 0 })
  const [rawAngle, setRawAngle] = useState(0)
  const [calibratedAngle, setCalibratedAngle] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  
  // Calibration
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [calibrationAngle, setCalibrationAngle] = useState(0)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  
  // Measurement
  const [isRecording, setIsRecording] = useState(false)
  const [currentROM, setCurrentROM] = useState(0)
  const [maxAngle, setMaxAngle] = useState(0)
  const [minAngle, setMinAngle] = useState(0)
  const [results, setResults] = useState<ROMResult[]>([])
  
  // Simulation
  const [simulationMode, setSimulationMode] = useState(false)
  
  // Angle History for graph
  const [angleHistory, setAngleHistory] = useState<{time: number; angle: number}[]>([])
  const [pitchHistory, setPitchHistory] = useState<{time: number; value: number}[]>([])
  const [rollHistory, setRollHistory] = useState<{time: number; value: number}[]>([])
  const [yawHistory, setYawHistory] = useState<{time: number; value: number}[]>([])
  const historyMaxPoints = 100

  // Refs
  const dataBufferRef = useRef<AccelerometerData[]>([])
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const calibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Refs for values that need to be current in callbacks
  const isCalibratedRef = useRef(false)
  const calibrationAngleRef = useRef(0)
  const movementTypeRef = useRef<MovementType>('flexion')
  const isCalibratingRef = useRef(false)
  const isRecordingRef = useRef(false)
  const rawAngleRef = useRef(0)

  // Translations
  const t = {
    es: {
      title: 'Medición de la ROM',
      subtitle: 'Rango de Movimiento Articular en Tiempo Real',
      activateSensor: 'ACTIVAR SENSOR',
      stopSensor: 'DETENER SENSOR',
      calibrate: 'CALIBRAR',
      recalibrate: 'RECALIBRAR',
      startRecording: 'INICIAR MEDICIÓN',
      stopRecording: 'DETENER MEDICIÓN',
      useSimulation: 'Demo Simulación',
      acceleration: 'Aceleración (sin gravedad)',
      accGravity: 'Aceleración + Gravedad',
      rotation: 'Rotación',
      rawAngle: 'Ángulo Bruto',
      calibratedAngle: 'Ángulo Calibrado',
      rom: 'ROM',
      maxAngle: 'Máx',
      minAngle: 'Mín',
      results: 'Resultados',
      calibrated: 'Calibrado',
      degrees: '°',
      mps2: 'm/s²',
      live: 'EN VIVO',
      recording: 'MIDIENDO',
      x: 'X',
      y: 'Y',
      z: 'Z',
      pitch: 'Pitch',
      roll: 'Roll',
      yaw: 'Yaw',
      magnitude: 'Magnitud',
      calibrationInstructions: 'Mantén posición neutra y presiona CALIBRAR',
      movementType: 'Tipo de Movimiento',
      events: 'Eventos',
    },
    en: {
      title: 'ROM Measurement',
      subtitle: 'Real-time Range of Motion Measurement',
      activateSensor: 'ACTIVATE SENSOR',
      stopSensor: 'STOP SENSOR',
      calibrate: 'CALIBRATE',
      recalibrate: 'RECALIBRATE',
      startRecording: 'START MEASUREMENT',
      stopRecording: 'STOP MEASUREMENT',
      useSimulation: 'Demo Simulation',
      acceleration: 'Acceleration (no gravity)',
      accGravity: 'Acceleration + Gravity',
      rotation: 'Rotation',
      rawAngle: 'Raw Angle',
      calibratedAngle: 'Calibrated Angle',
      rom: 'ROM',
      maxAngle: 'Max',
      minAngle: 'Min',
      results: 'Results',
      calibrated: 'Calibrated',
      degrees: '°',
      mps2: 'm/s²',
      live: 'LIVE',
      recording: 'MEASURING',
      x: 'X',
      y: 'Y',
      z: 'Z',
      pitch: 'Pitch',
      roll: 'Roll',
      yaw: 'Yaw',
      magnitude: 'Magnitude',
      calibrationInstructions: 'Hold neutral position and press CALIBRATE',
      movementType: 'Movement Type',
      events: 'Events',
    }
  }[lang]

  // Keep refs in sync with state
  useEffect(() => { isCalibratedRef.current = isCalibrated }, [isCalibrated])
  useEffect(() => { calibrationAngleRef.current = calibrationAngle }, [calibrationAngle])
  useEffect(() => { movementTypeRef.current = movementType }, [movementType])
  useEffect(() => { isCalibratingRef.current = isCalibrating }, [isCalibrating])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])
  useEffect(() => { rawAngleRef.current = rawAngle }, [rawAngle])

  // Calculate pitch and roll from accelerometer
  const calculateAngles = useCallback((accX: number, accY: number, accZ: number): { pitch: number; roll: number } => {
    const pitch = Math.atan2(accX, Math.sqrt(accY * accY + accZ * accZ)) * (180 / Math.PI)
    const roll = Math.atan2(accY, Math.sqrt(accX * accX + accZ * accZ)) * (180 / Math.PI)
    return { pitch, roll }
  }, [])

  // Get angle based on movement type
  const getMovementAngle = useCallback((pitch: number, roll: number): number => {
    const isPitch = MOVEMENT_AXIS[movementTypeRef.current].primary === 'pitch'
    return isPitch ? pitch : roll
  }, [])

  // Motion event handler
  const handleMotionEvent = useCallback((event: DeviceMotionEvent) => {
    const acc = event.acceleration
    const accGrav = event.accelerationIncludingGravity
    const rot = event.rotationRate
    const now = Date.now()

    setEventCount(prev => prev + 1)

    // Acceleration without gravity
    if (acc && acc.x !== null) {
      setAcceleration({ x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 })
    }

    // Acceleration including gravity - main data for angle calculation
    if (accGrav && accGrav.x !== null && accGrav.y !== null && accGrav.z !== null) {
      const mag = Math.sqrt(accGrav.x ** 2 + accGrav.y ** 2 + accGrav.z ** 2)
      
      if (mag > 5) {
        setAccIncludingGravity({ x: accGrav.x, y: accGrav.y, z: accGrav.z })

        // Calculate both pitch and roll
        const { pitch, roll } = calculateAngles(accGrav.x, accGrav.y, accGrav.z)
        
        // Get the relevant angle based on movement type
        const rawMovementAngle = getMovementAngle(pitch, roll)
        
        setRawAngle(rawMovementAngle)
        rawAngleRef.current = rawMovementAngle
        
        // Apply calibration offset
        const calAngle = isCalibratedRef.current 
          ? rawMovementAngle - calibrationAngleRef.current 
          : rawMovementAngle
          
        setCalibratedAngle(calAngle)
        
        // Update angle history for graph
        setAngleHistory(prev => {
          const newHistory = [...prev, { time: now, angle: calAngle }]
          return newHistory.slice(-historyMaxPoints)
        })
        
        // Update pitch/roll history
        setPitchHistory(prev => {
          const newHistory = [...prev, { time: now, value: pitch }]
          return newHistory.slice(-historyMaxPoints)
        })
        setRollHistory(prev => {
          const newHistory = [...prev, { time: now, value: roll }]
          return newHistory.slice(-historyMaxPoints)
        })

        // Recording
        if (isRecordingRef.current) {
          dataBufferRef.current.push({
            x: accGrav.x, y: accGrav.y, z: accGrav.z,
            timestamp: now, angle: calAngle,
            pitch, roll
          })
          
          if (dataBufferRef.current.length >= 2) {
            const allAngles = dataBufferRef.current.map(d => d.angle)
            const maxA = Math.max(...allAngles)
            const minA = Math.min(...allAngles)
            setMaxAngle(maxA)
            setMinAngle(minA)
            setCurrentROM(Math.abs(maxA - minA))
          }
        }
      }
    }

    // Rotation rate
    if (rot && rot.alpha !== null) {
      const yawVal = rot.alpha || 0
      setRotation({
        alpha: yawVal,
        beta: rot.beta || 0,
        gamma: rot.gamma || 0
      })
      setYawHistory(prev => {
        const newHistory = [...prev, { time: now, value: yawVal }]
        return newHistory.slice(-historyMaxPoints)
      })
    }
  }, [calculateAngles, getMovementAngle])

  // Activate sensor
  const activateSensor = useCallback(async () => {
    console.log('activateSensor called')
    
    try {
      // Request permission on iOS
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission()
        if (permission !== 'granted') {
          alert('Permiso de sensor denegado')
          return
        }
      }

      // Add event listener
      window.addEventListener('devicemotion', handleMotionEvent)
      
      console.log('Sensor activated, setting state to tracking')
      setSensorState('tracking')
      setEventCount(0)
      
    } catch (error) {
      console.error('Error activating sensor:', error)
      alert('Error al activar el sensor: ' + (error as Error).message)
    }
  }, [handleMotionEvent])

  // Start simulation
  const startSimulation = useCallback(() => {
    setSimulationMode(true)
    setSensorState('tracking')
    setIsCalibrated(true)
    isCalibratedRef.current = true
    setEventCount(0)
    setAngleHistory([])
    setPitchHistory([])
    setRollHistory([])
    setYawHistory([])

    let simAngle = 0
    let dir = 1
    
    simulationIntervalRef.current = setInterval(() => {
      simAngle += dir * (Math.random() * 2 + 1)
      if (simAngle > 70) dir = -1
      if (simAngle < -30) dir = 1

      const noise = () => (Math.random() - 0.5) * 0.5
      const angle = simAngle + noise()
      const now = Date.now()

      setRawAngle(angle)
      rawAngleRef.current = angle
      setCalibratedAngle(angle)
      
      // Update history
      setAngleHistory(prev => {
        const newHistory = [...prev, { time: now, angle }]
        return newHistory.slice(-historyMaxPoints)
      })
      setPitchHistory(prev => {
        const newHistory = [...prev, { time: now, value: angle }]
        return newHistory.slice(-historyMaxPoints)
      })
      setRollHistory(prev => {
        const newHistory = [...prev, { time: now, value: angle * 0.3 }]
        return newHistory.slice(-historyMaxPoints)
      })
      setYawHistory(prev => {
        const newHistory = [...prev, { time: now, value: angle * 0.5 }]
        return newHistory.slice(-historyMaxPoints)
      })

      const accX = Math.sin(angle * Math.PI / 180) * 2 + noise()
      const accY = 9.81 * Math.cos(angle * Math.PI / 180) + noise()
      const accZ = noise()

      setAcceleration({ x: accX * 0.2, y: accZ, z: accZ })
      setAccIncludingGravity({ x: accX, y: accY, z: accZ })
      setRotation({ alpha: angle * 0.5, beta: angle * 0.3, gamma: noise() * 10 })
      setEventCount(prev => prev + 1)

      if (isRecordingRef.current) {
        dataBufferRef.current.push({ 
          x: accX, y: accY, z: accZ, 
          timestamp: now, 
          angle,
          pitch: angle,
          roll: 0
        })
        const angles = dataBufferRef.current.map(d => d.angle)
        setMaxAngle(Math.max(...angles))
        setMinAngle(Math.min(...angles))
        setCurrentROM(Math.abs(Math.max(...angles) - Math.min(...angles)))
      }
    }, 50)
  }, [])

  // Stop tracking
  const stopTracking = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotionEvent)
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current)
      simulationIntervalRef.current = null
    }
    if (calibrationIntervalRef.current) {
      clearInterval(calibrationIntervalRef.current)
      calibrationIntervalRef.current = null
    }
    setSensorState('idle')
    setIsRecording(false)
    isRecordingRef.current = false
    setSimulationMode(false)
    setIsCalibrated(false)
    isCalibratedRef.current = false
    setCalibrationAngle(0)
    calibrationAngleRef.current = 0
    dataBufferRef.current = []
    setEventCount(0)
    setAngleHistory([])
    setPitchHistory([])
    setRollHistory([])
    setYawHistory([])
  }, [handleMotionEvent])

  // Calibrate with multiple samples
  const handleCalibrate = useCallback(() => {
    setIsCalibrating(true)
    isCalibratingRef.current = true
    setCalibrationProgress(0)
    dataBufferRef.current = []
    
    const CALIBRATION_DURATION = 2000
    const startTime = Date.now()
    
    calibrationIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / CALIBRATION_DURATION * 100, 100)
      setCalibrationProgress(progress)
      
      if (elapsed >= CALIBRATION_DURATION) {
        if (calibrationIntervalRef.current) {
          clearInterval(calibrationIntervalRef.current)
          calibrationIntervalRef.current = null
        }
        
        // Use current angle from ref
        const angle = rawAngleRef.current
        setCalibrationAngle(angle)
        calibrationAngleRef.current = angle
        setIsCalibrated(true)
        isCalibratedRef.current = true
        setIsCalibrating(false)
        isCalibratingRef.current = false
      }
    }, 50)
  }, [])

  // Quick calibrate
  const handleQuickCalibrate = useCallback(() => {
    const angle = rawAngleRef.current
    setCalibrationAngle(angle)
    calibrationAngleRef.current = angle
    setIsCalibrated(true)
    isCalibratedRef.current = true
  }, [])

  // Start recording
  const handleStartRecording = useCallback(() => {
    dataBufferRef.current = []
    setCurrentROM(0)
    setMaxAngle(calibratedAngle)
    setMinAngle(calibratedAngle)
    setIsRecording(true)
    isRecordingRef.current = true
  }, [calibratedAngle])

  // Stop recording
  const handleStopRecording = useCallback(() => {
    if (dataBufferRef.current.length < 2) {
      setIsRecording(false)
      isRecordingRef.current = false
      return
    }
    
    const angles = dataBufferRef.current.map(d => d.angle)
    const result: ROMResult = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rom: Math.abs(Math.max(...angles) - Math.min(...angles)),
      maxAngle: Math.max(...angles),
      minAngle: Math.min(...angles),
      duration: (dataBufferRef.current[dataBufferRef.current.length - 1].timestamp - dataBufferRef.current[0].timestamp) / 1000,
      movementType: movementType
    }
    
    setResults(prev => [result, ...prev.slice(0, 4)])
    setIsRecording(false)
    isRecordingRef.current = false
  }, [movementType])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent)
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current)
      if (calibrationIntervalRef.current) clearInterval(calibrationIntervalRef.current)
    }
  }, [handleMotionEvent])

  // Calculate magnitudes
  const accMag = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2)
  const accGravMag = Math.sqrt(accIncludingGravity.x ** 2 + accIncludingGravity.y ** 2 + accIncludingGravity.z ** 2)

  // ===== RENDER =====

  return (
    <div className="flex flex-col min-h-[600px] bg-[#102218] pb-20">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-[#0d1a12] border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">{t.title}</h2>
            <p className="text-[10px] text-[#13ec6d]">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {simulationMode && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded uppercase">SIM</span>}
            {isCalibrated && (
              <span className="px-2 py-0.5 bg-[#13ec6d]/20 text-[#13ec6d] text-[9px] font-bold rounded uppercase">
                {t.calibrated} ✓
              </span>
            )}
            {sensorState === 'tracking' && eventCount > 0 && (
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-[#13ec6d]/20 text-[#13ec6d]'}`}>
                {isRecording ? t.recording : t.live}
              </span>
            )}
          </div>
        </div>
      </div>

      {sensorState === 'idle' ? (
        // === IDLE STATE ===
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 rounded-full bg-[#13ec6d]/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[#13ec6d] text-5xl">sensors</span>
          </div>
          <button 
            type="button"
            onClick={activateSensor} 
            className="w-full max-w-xs py-5 bg-[#13ec6d] text-[#102218] rounded-xl font-bold text-lg uppercase flex items-center justify-center gap-3 mb-3 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-2xl">sensors</span>
            {t.activateSensor}
          </button>
          <button 
            type="button"
            onClick={startSimulation} 
            className="w-full max-w-xs py-3 bg-[#193324] border border-amber-500/30 text-amber-400 rounded-xl font-bold uppercase text-sm active:scale-95 transition-transform"
          >
            {t.useSimulation}
          </button>
        </div>
      ) : (
        // === TRACKING - REAL TIME DATA ===
        <div className="flex-1 overflow-y-auto pb-4">
          {/* Calibration Progress Overlay */}
          {isCalibrating && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-[#193324] rounded-2xl p-6 mx-4 max-w-sm w-full border border-[#13ec6d]/30">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[#13ec6d] text-4xl animate-pulse">tune</span>
                  <p className="text-white font-bold mt-2">Calibrando...</p>
                  <p className="text-slate-400 text-xs mt-1">{t.calibrationInstructions}</p>
                  <div className="mt-4 h-2 bg-[#102218] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#13ec6d] transition-all duration-100"
                      style={{ width: `${calibrationProgress}%` }}
                    />
                  </div>
                  <p className="text-[#13ec6d] text-sm mt-2">{Math.round(calibrationProgress)}%</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Movement Type Selector */}
          <div className="px-4 py-2">
            <div className="bg-[#193324] rounded-xl p-2 border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase mb-2 px-2">{t.movementType}</p>
              <div className="flex gap-1">
                {Object.entries(MOVEMENT_AXIS).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMovementType(key as MovementType)}
                    disabled={isRecording}
                    className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase transition-all active:scale-95 ${
                      movementType === key 
                        ? 'bg-[#13ec6d] text-[#102218]' 
                        : 'bg-[#102218] text-slate-400 hover:text-white'
                    } disabled:opacity-50`}
                  >
                    {lang === 'es' ? config.label : config.labelEn}
                    <span className="block text-[8px] opacity-70">
                      {config.primary === 'pitch' ? '(Pitch)' : '(Roll)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Main Angle Display */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-center gap-8">
              {/* Raw Angle */}
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase mb-1">{t.rawAngle}</p>
                <p className="text-3xl font-bold text-white">{rawAngle.toFixed(1)}{t.degrees}</p>
                <p className="text-[8px] text-slate-600">
                  {MOVEMENT_AXIS[movementType].primary === 'pitch' ? 'Pitch' : 'Roll'}
                </p>
              </div>
              {/* Separator */}
              <div className="h-12 w-px bg-white/10" />
              {/* Calibrated Angle */}
              <div className="text-center">
                <p className="text-[10px] text-[#13ec6d] uppercase mb-1">{t.calibratedAngle}</p>
                <p className="text-3xl font-bold text-[#13ec6d]">{calibratedAngle.toFixed(1)}{t.degrees}</p>
              </div>
            </div>

            {/* ROM during recording */}
            {isRecording && (
              <div className="mt-4 bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-xl p-4 text-center">
                <p className="text-xs text-[#13ec6d] uppercase font-bold">{t.rom}</p>
                <p className="text-4xl font-bold text-[#13ec6d]">{currentROM.toFixed(1)}{t.degrees}</p>
                <div className="flex justify-center gap-6 mt-2 text-xs">
                  <span className="text-white">{t.maxAngle}: {maxAngle.toFixed(1)}{t.degrees}</span>
                  <span className="text-white">{t.minAngle}: {minAngle.toFixed(1)}{t.degrees}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-2">
                  {lang === 'es' ? MOVEMENT_AXIS[movementType].label : MOVEMENT_AXIS[movementType].labelEn}
                </p>
              </div>
            )}
          </div>

          {/* 3-Axis Acceleration Visual Bars */}
          <div className="px-4 mb-3">
            <div className="bg-[#193324] rounded-xl p-4 border border-white/5">
              <p className="text-[9px] text-slate-500 uppercase font-bold mb-3">{lang === 'es' ? 'Aceleración en 3 Ejes' : '3-Axis Acceleration'}</p>
              <div className="space-y-3">
                {/* X Axis */}
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center gap-1">
                    <span className="text-red-400 font-bold text-sm">X</span>
                  </div>
                  <div className="flex-1 h-8 bg-[#102218] rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-px h-full bg-white/10" />
                    </div>
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-75 rounded-lg"
                      style={{
                        width: `${Math.min(Math.abs(accIncludingGravity.x) / 15 * 50, 50)}%`,
                        marginLeft: accIncludingGravity.x >= 0 ? '50%' : `${50 - Math.min(Math.abs(accIncludingGravity.x) / 15 * 50, 50)}%`
                      }}
                    />
                  </div>
                  <span className="text-white text-sm font-mono w-16 text-right">{accIncludingGravity.x.toFixed(2)}</span>
                </div>

                {/* Y Axis */}
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center gap-1">
                    <span className="text-green-400 font-bold text-sm">Y</span>
                  </div>
                  <div className="flex-1 h-8 bg-[#102218] rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-px h-full bg-white/10" />
                    </div>
                    <div
                      className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-75 rounded-lg"
                      style={{
                        width: `${Math.min(Math.abs(accIncludingGravity.y) / 15 * 50, 50)}%`,
                        marginLeft: accIncludingGravity.y >= 0 ? '50%' : `${50 - Math.min(Math.abs(accIncludingGravity.y) / 15 * 50, 50)}%`
                      }}
                    />
                  </div>
                  <span className="text-white text-sm font-mono w-16 text-right">{accIncludingGravity.y.toFixed(2)}</span>
                </div>

                {/* Z Axis */}
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center gap-1">
                    <span className="text-blue-400 font-bold text-sm">Z</span>
                  </div>
                  <div className="flex-1 h-8 bg-[#102218] rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-px h-full bg-white/10" />
                    </div>
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-75 rounded-lg"
                      style={{
                        width: `${Math.min(Math.abs(accIncludingGravity.z) / 15 * 50, 50)}%`,
                        marginLeft: accIncludingGravity.z >= 0 ? '50%' : `${50 - Math.min(Math.abs(accIncludingGravity.z) / 15 * 50, 50)}%`
                      }}
                    />
                  </div>
                  <span className="text-white text-sm font-mono w-16 text-right">{accIncludingGravity.z.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-[9px]">
                <span className="text-slate-500">{lang === 'es' ? 'Magnitud Total' : 'Total Magnitude'}</span>
                <span className="text-white font-mono">{accGravMag.toFixed(2)} {t.mps2}</span>
              </div>
            </div>
          </div>

          {/* Angle History Graph */}
          {angleHistory.length > 5 && (
            <div className="px-4 mb-3">
              <div className="bg-[#193324] rounded-xl p-4 border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-3">{lang === 'es' ? 'Historial de Ángulo' : 'Angle History'}</p>
                <div className="h-24 relative bg-[#102218] rounded-lg overflow-hidden">
                  {/* Center line */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                  {/* Graph */}
                  <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="angleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#13ec6d" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#13ec6d" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d={`M 0 ${50 - (angleHistory[0]?.angle || 0) / 180 * 50 + 25} ${angleHistory.map((p, i) => `L ${i / (angleHistory.length - 1) * 100} ${50 - p.angle / 180 * 50 + 25}`).join(' ')} L 100 50 L 0 50 Z`}
                      fill="url(#angleGradient)"
                    />
                    {/* Line */}
                    <path
                      d={`M 0 ${50 - (angleHistory[0]?.angle || 0) / 180 * 50 + 25} ${angleHistory.map((p, i) => `L ${i / (angleHistory.length - 1) * 100} ${50 - p.angle / 180 * 50 + 25}`).join(' ')}`}
                      fill="none"
                      stroke="#13ec6d"
                      strokeWidth="0.5"
                    />
                  </svg>
                  {/* Labels */}
                  <div className="absolute left-1 top-1 text-[8px] text-slate-500">+90°</div>
                  <div className="absolute left-1 bottom-1 text-[8px] text-slate-500">-90°</div>
                  <div className="absolute right-1 top-1 text-[8px] text-[#13ec6d]">{calibratedAngle.toFixed(0)}°</div>
                </div>
              </div>
            </div>
          )}

          {/* Pitch, Roll, Yaw Graphs */}
          {pitchHistory.length > 5 && (
            <div className="px-4 mb-3">
              <div className="bg-[#193324] rounded-xl p-4 border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-3">{lang === 'es' ? 'Orientación 3D' : '3D Orientation'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Pitch */}
                  <div className="text-center">
                    <p className="text-[8px] text-purple-400 mb-1">Pitch</p>
                    <div className="h-12 bg-[#102218] rounded relative overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                        <path
                          d={`M 0 ${25 - (pitchHistory[0]?.value || 0) / 180 * 25} ${pitchHistory.map((p, i) => `L ${i / (pitchHistory.length - 1) * 100} ${25 - p.value / 180 * 25}`).join(' ')}`}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="0.5"
                        />
                      </svg>
                    </div>
                    <p className="text-[10px] text-white font-mono mt-1">{pitchHistory[pitchHistory.length-1]?.value.toFixed(1)}°</p>
                  </div>
                  {/* Roll */}
                  <div className="text-center">
                    <p className="text-[8px] text-cyan-400 mb-1">Roll</p>
                    <div className="h-12 bg-[#102218] rounded relative overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                        <path
                          d={`M 0 ${25 - (rollHistory[0]?.value || 0) / 180 * 25} ${rollHistory.map((p, i) => `L ${i / (rollHistory.length - 1) * 100} ${25 - p.value / 180 * 25}`).join(' ')}`}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="0.5"
                        />
                      </svg>
                    </div>
                    <p className="text-[10px] text-white font-mono mt-1">{rollHistory[rollHistory.length-1]?.value.toFixed(1)}°</p>
                  </div>
                  {/* Yaw */}
                  <div className="text-center">
                    <p className="text-[8px] text-orange-400 mb-1">Yaw</p>
                    <div className="h-12 bg-[#102218] rounded relative overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                        <path
                          d={`M 0 ${25 - (yawHistory[0]?.value || 0) / 360 * 25} ${yawHistory.map((p, i) => `L ${i / (yawHistory.length - 1) * 100} ${25 - p.value / 360 * 25}`).join(' ')}`}
                          fill="none"
                          stroke="#fb923c"
                          strokeWidth="0.5"
                        />
                      </svg>
                    </div>
                    <p className="text-[10px] text-white font-mono mt-1">{yawHistory[yawHistory.length-1]?.value.toFixed(1)}°</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rotation Data */}
          <div className="px-4 mb-3">
            <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
              <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">{t.rotation}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[9px] text-purple-400">{t.pitch} (α)</p>
                  <p className="text-lg font-bold text-white font-mono">{rotation.alpha.toFixed(1)}{t.degrees}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-cyan-400">{t.roll} (β)</p>
                  <p className="text-lg font-bold text-white font-mono">{rotation.beta.toFixed(1)}{t.degrees}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-orange-400">{t.yaw} (γ)</p>
                  <p className="text-lg font-bold text-white font-mono">{rotation.gamma.toFixed(1)}{t.degrees}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 mb-3">
            <div className="flex gap-2">
              <div className="flex-1 bg-[#193324] rounded-lg p-2 border border-white/5 text-center">
                <p className="text-[9px] text-slate-500">{t.events}</p>
                <p className="text-lg font-bold text-white">{eventCount}</p>
              </div>
              <div className="flex-1 bg-[#193324] rounded-lg p-2 border border-white/5 text-center">
                <p className="text-[9px] text-slate-500">Rate</p>
                <p className="text-lg font-bold text-white">{eventCount > 0 ? '~60Hz' : '0Hz'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls - Always visible when tracking */}
      {sensorState === 'tracking' && (
        <div className="px-4 py-3 bg-[#0d1a12] border-t border-white/10 mb-16">
          <div className="space-y-2">
            {/* Calibration Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCalibrate}
                disabled={isCalibrating || isRecording}
                className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                  isCalibrated 
                    ? 'bg-[#13ec6d]/20 border border-[#13ec6d]/40 text-[#13ec6d]'
                    : 'bg-[#13ec6d] text-[#102218]'
                } disabled:opacity-50 disabled:bg-slate-600 disabled:text-slate-400`}
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                {isCalibrating ? `${Math.round(calibrationProgress)}%` : 
                 isCalibrated ? `${calibrationAngle.toFixed(0)}°` : t.calibrate}
              </button>
              {isCalibrated && (
                <button
                  type="button"
                  onClick={handleQuickCalibrate}
                  disabled={isRecording}
                  className="py-3 px-4 bg-[#193324] border border-white/10 text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-1 hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                  title={lang === 'es' ? 'Recalibrar rápido' : 'Quick recalibrate'}
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                </button>
              )}
            </div>
            
            {/* Start/Stop Recording */}
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={!isCalibrated}
                className={`w-full py-4 rounded-xl font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                  isCalibrated 
                    ? 'bg-[#13ec6d] text-[#102218]' 
                    : 'bg-slate-600 text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined">radio_button_checked</span>
                {t.startRecording}
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleStopRecording} 
                className="w-full py-4 bg-red-500 text-white rounded-xl font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined">stop_circle</span>
                {t.stopRecording}
              </button>
            )}

            <button 
              type="button"
              onClick={stopTracking} 
              className="w-full py-2 bg-[#193324] border border-white/10 text-slate-400 rounded-xl font-bold uppercase text-xs active:scale-95 transition-transform"
            >
              {t.stopSensor}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && sensorState === 'idle' && (
        <div className="px-4 pb-4">
          <p className="text-sm font-bold text-white mb-2">{t.results}</p>
          {results.map(r => (
            <div key={r.id} className="bg-[#193324] rounded-lg p-3 border border-white/5 mb-2">
              <div className="flex justify-between">
                <p className="text-xl font-bold text-[#13ec6d]">{r.rom.toFixed(1)}{t.degrees}</p>
                <div className="text-right text-xs text-white">
                  <p>{t.maxAngle}: {r.maxAngle.toFixed(1)}{t.degrees}</p>
                  <p>{t.minAngle}: {r.minAngle.toFixed(1)}{t.degrees}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{new Date(r.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
