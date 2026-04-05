'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface VelocityData {
  velocity: number
  timestamp: number
  position: number
}

interface RepData {
  repNumber: number
  peakVelocity: number
  meanVelocity: number
  rom: number
  duration: number
  startTime: number
  endTime: number
}

interface VelocityTrackerProps {
  lang?: 'es' | 'en'
}

// Training zones based on velocity
const VELOCITY_ZONES = {
  power: { min: 0.8, max: 2.0, label: { es: 'Potencia', en: 'Power' }, color: '#ef4444' },
  strength: { min: 0.5, max: 0.8, label: { es: 'Fuerza', en: 'Strength' }, color: '#f59e0b' },
  hypertrophy: { min: 0.3, max: 0.5, label: { es: 'Hipertrofia', en: 'Hypertrophy' }, color: '#13ec6d' },
  endurance: { min: 0.1, max: 0.3, label: { es: 'Resistencia', en: 'Endurance' }, color: '#3b82f6' }
}

export default function VelocityTracker({ lang = 'es' }: VelocityTrackerProps) {
  // State
  const [isTracking, setIsTracking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending')

  // Camera and tracking
  const [useAccelerometer, setUseAccelerometer] = useState(false)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [referenceDistance, setReferenceDistance] = useState(30) // cm
  const [pixelsPerCm, setPixelsPerCm] = useState(0)

  // Velocity data
  const [currentVelocity, setCurrentVelocity] = useState(0)
  const [velocityHistory, setVelocityHistory] = useState<number[]>([])
  const [positionHistory, setPositionHistory] = useState<number[]>([])
  const [lastPosition, setLastPosition] = useState<number | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)

  // Rep tracking
  const [repCount, setRepCount] = useState(0)
  const [currentRepData, setCurrentRepData] = useState<VelocityData[]>([])
  const [completedReps, setCompletedReps] = useState<RepData[]>([])
  const [repPhase, setRepPhase] = useState<'eccentric' | 'concentric'>('concentric')
  const [repStartPosition, setRepStartPosition] = useState<number | null>(null)

  // Accelerometer fallback
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 })
  const [integratedVelocity, setIntegratedVelocity] = useState(0)
  const [integratedPosition, setIntegratedPosition] = useState(0)

  // Session stats
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [peakVelocity, setPeakVelocity] = useState(0)
  const [avgVelocity, setAvgVelocity] = useState(0)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const velocityBufferRef = useRef<number[]>([])
  const accelerometerRef = useRef({ vx: 0, vy: 0, vz: 0, px: 0, py: 0, pz: 0 })

  // Translations
  const t = {
    es: {
      title: 'Análisis de Velocidad',
      subtitle: 'Entrenamiento Basado en Velocidad (VBT)',
      startCamera: 'Iniciar Cámara',
      stopCamera: 'Detener Cámara',
      startRecording: 'Iniciar Grabación',
      stopRecording: 'Detener Grabación',
      calibrate: 'Calibrar',
      calibrating: 'Calibrando...',
      calibrationDesc: 'Coloca un objeto de referencia en la cámara',
      referenceSize: 'Tamaño de Referencia',
      cm: 'cm',
      currentVelocity: 'Velocidad Actual',
      peakVelocity: 'Pico de Velocidad',
      avgVelocity: 'Velocidad Media',
      reps: 'Repeticiones',
      rep: 'Rep',
      rom: 'ROM',
      duration: 'Duración',
      zone: 'Zona',
      targetZone: 'Zona Objetivo',
      power: 'Potencia',
      strength: 'Fuerza',
      hypertrophy: 'Hipertrofia',
      endurance: 'Resistencia',
      useAccelerometer: 'Usar Acelerómetro',
      useCamera: 'Usar Cámara',
      noCamera: 'Cámara No Disponible',
      noCameraDesc: 'Permiso denegado o cámara no disponible',
      sessionStats: 'Estadísticas de Sesión',
      velocityLoss: 'Pérdida de Velocidad',
      totalReps: 'Total Reps',
      bestRep: 'Mejor Rep',
      trainingZones: 'Zonas de Entrenamiento',
      selectZone: 'Selecciona zona objetivo',
      mps: 'm/s',
      ms: 'ms',
      degrees: '°',
      live: 'EN VIVO',
      recording: 'GRABANDO',
      calibrated: 'CALIBRADO',
      newRep: 'Nueva Rep',
      reset: 'Reiniciar',
    },
    en: {
      title: 'Velocity Analysis',
      subtitle: 'Velocity Based Training (VBT)',
      startCamera: 'Start Camera',
      stopCamera: 'Stop Camera',
      startRecording: 'Start Recording',
      stopRecording: 'Stop Recording',
      calibrate: 'Calibrate',
      calibrating: 'Calibrating...',
      calibrationDesc: 'Place a reference object in the camera',
      referenceSize: 'Reference Size',
      cm: 'cm',
      currentVelocity: 'Current Velocity',
      peakVelocity: 'Peak Velocity',
      avgVelocity: 'Average Velocity',
      reps: 'Repetitions',
      rep: 'Rep',
      rom: 'ROM',
      duration: 'Duration',
      zone: 'Zone',
      targetZone: 'Target Zone',
      power: 'Power',
      strength: 'Strength',
      hypertrophy: 'Hypertrophy',
      endurance: 'Endurance',
      useAccelerometer: 'Use Accelerometer',
      useCamera: 'Use Camera',
      noCamera: 'Camera Not Available',
      noCameraDesc: 'Permission denied or camera not available',
      sessionStats: 'Session Stats',
      velocityLoss: 'Velocity Loss',
      totalReps: 'Total Reps',
      bestRep: 'Best Rep',
      trainingZones: 'Training Zones',
      selectZone: 'Select target zone',
      mps: 'm/s',
      ms: 'ms',
      degrees: '°',
      live: 'LIVE',
      recording: 'RECORDING',
      calibrated: 'CALIBRATED',
      newRep: 'New Rep',
      reset: 'Reset',
    }
  }[lang]

  // Get current training zone
  const getCurrentZone = useCallback((velocity: number) => {
    for (const [key, zone] of Object.entries(VELOCITY_ZONES)) {
      if (velocity >= zone.min && velocity <= zone.max) {
        return { key, ...zone }
      }
    }
    return { key: 'endurance', ...VELOCITY_ZONES.endurance }
  }, [])

  // Request camera permission and start stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraPermission('granted')
    } catch (err) {
      console.error('Camera error:', err)
      setCameraPermission('denied')
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setCameraPermission('pending')
    setIsTracking(false)
    setIsRecording(false)
  }, [])

  // Process video frame for motion detection
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isTracking) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Simple color tracking (detect bright colored object)
    let sumX = 0, sumY = 0, count = 0
    const targetColor = { r: 255, g: 50, b: 50 } // Red tracking
    const threshold = 100

    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const i = (y * canvas.width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        const dr = Math.abs(r - targetColor.r)
        const dg = Math.abs(g - targetColor.g)
        const db = Math.abs(b - targetColor.b)

        if (dr < threshold && dg < threshold && db < threshold) {
          sumX += x
          sumY += y
          count++
        }
      }
    }

    if (count > 10) {
      const centerX = sumX / count
      const centerY = sumY / count

      // Calculate velocity
      const now = performance.now()
      if (lastPosition !== null && lastTimestamp !== null) {
        const deltaTime = (now - lastTimestamp) / 1000 // seconds
        const distancePixels = centerY - lastPosition
        const distanceMeters = pixelsPerCm > 0 ? (distancePixels / pixelsPerCm) / 100 : distancePixels / 1000
        const velocity = Math.abs(distanceMeters / deltaTime)

        // Apply moving average filter
        velocityBufferRef.current.push(velocity)
        if (velocityBufferRef.current.length > 5) {
          velocityBufferRef.current.shift()
        }
        const smoothedVelocity = velocityBufferRef.current.reduce((a, b) => a + b, 0) / velocityBufferRef.current.length

        setCurrentVelocity(smoothedVelocity)
        setVelocityHistory(prev => [...prev.slice(-50), smoothedVelocity])
        setPositionHistory(prev => [...prev.slice(-100), centerY])

        // Track peak velocity
        if (smoothedVelocity > peakVelocity) {
          setPeakVelocity(smoothedVelocity)
        }

        // Update avg velocity
        const allVelocities = [...velocityHistory, smoothedVelocity]
        setAvgVelocity(allVelocities.reduce((a, b) => a + b, 0) / allVelocities.length)

        // Rep detection
        if (isRecording) {
          setCurrentRepData(prev => [...prev, {
            velocity: smoothedVelocity,
            timestamp: now,
            position: centerY
          }])

          // Detect rep completion (direction change)
          if (positionHistory.length >= 3) {
            const recent = positionHistory.slice(-3)
            const goingUp = recent[1] > recent[0]
            const nowGoingUp = recent[2] > recent[1]

            if (goingUp !== nowGoingUp && repStartPosition !== null) {
              const repROM = Math.abs(centerY - repStartPosition)
              if (repROM > 50) { // Minimum movement threshold
                // Calculate rep stats
                const repPeak = Math.max(...currentRepData.map(d => d.velocity))
                const repMean = currentRepData.map(d => d.velocity).reduce((a, b) => a + b, 0) / currentRepData.length
                const repDuration = now - currentRepData[0].timestamp

                const newRep: RepData = {
                  repNumber: repCount + 1,
                  peakVelocity: repPeak,
                  meanVelocity: repMean,
                  rom: pixelsPerCm > 0 ? repROM / pixelsPerCm : repROM,
                  duration: repDuration,
                  startTime: currentRepData[0].timestamp,
                  endTime: now
                }

                setCompletedReps(prev => [...prev, newRep])
                setRepCount(prev => prev + 1)
                setCurrentRepData([])
              }
            }
          }

          if (repStartPosition === null) {
            setRepStartPosition(centerY)
          }
        }
      }

      setLastPosition(centerY)
      setLastTimestamp(now)

      // Draw tracking marker
      ctx.fillStyle = '#13ec6d'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 10, 0, Math.PI * 2)
      ctx.fill()
    }

    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [isTracking, isRecording, lastPosition, lastTimestamp, pixelsPerCm, peakVelocity, velocityHistory, positionHistory, repCount, currentRepData, repStartPosition])

  // Handle accelerometer for velocity (fallback)
  const handleAccelerometerMotion = useCallback((event: DeviceMotionEvent) => {
    if (!isTracking || !useAccelerometer) return

    const acc = event.accelerationIncludingGravity
    if (!acc) return

    const now = performance.now()
    const dt = lastTimestamp ? (now - lastTimestamp) / 1000 : 0.016

    const ax = acc.x || 0
    const ay = acc.y || 0
    const az = acc.z || 0

    // Remove gravity (assuming device is mostly vertical)
    const netAccelY = ay - 9.81

    // Integrate acceleration to get velocity
    const newVy = accelerometerRef.current.vy + netAccelY * dt
    const newPy = accelerometerRef.current.py + newVy * dt

    accelerometerRef.current.vy = newVy * 0.98 // Apply decay
    accelerometerRef.current.py = newPy

    const velocity = Math.abs(newVy)

    setAcceleration({ x: ax, y: ay, z: az || 0 })
    setIntegratedVelocity(velocity)
    setIntegratedPosition(newPy)
    setCurrentVelocity(velocity)
    setVelocityHistory(prev => [...prev.slice(-50), velocity])

    setLastTimestamp(now)
  }, [isTracking, useAccelerometer, lastTimestamp])

  // Start/stop accelerometer listener
  useEffect(() => {
    if (isTracking && useAccelerometer) {
      window.addEventListener('devicemotion', handleAccelerometerMotion)
    }
    return () => {
      window.removeEventListener('devicemotion', handleAccelerometerMotion)
    }
  }, [isTracking, useAccelerometer, handleAccelerometerMotion])

  // Start video processing
  useEffect(() => {
    if (isTracking && !useAccelerometer && cameraPermission === 'granted') {
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isTracking, useAccelerometer, cameraPermission, processFrame])

  // Reset session
  const handleReset = useCallback(() => {
    setRepCount(0)
    setCompletedReps([])
    setCurrentRepData([])
    setVelocityHistory([])
    setPositionHistory([])
    setPeakVelocity(0)
    setAvgVelocity(0)
    setSessionStartTime(null)
    setRepStartPosition(null)
    velocityBufferRef.current = []
  }, [])

  // Start recording session
  const handleStartRecording = useCallback(() => {
    handleReset()
    setIsRecording(true)
    setSessionStartTime(Date.now())
  }, [handleReset])

  // Stop recording session
  const handleStopRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  // Calibration
  const handleCalibrate = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return

    setIsCalibrating(true)

    // Simple calibration: measure a reference object
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Take a snapshot and detect edges
    ctx.drawImage(videoRef.current, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Find the brightest region (assuming reference object is bright)
    let minY = canvas.height, maxY = 0
    const threshold = 200

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
        if (brightness > threshold) {
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }

    const pixelHeight = maxY - minY
    if (pixelHeight > 10) {
      setPixelsPerCm(pixelHeight / referenceDistance)
    }

    setIsCalibrating(false)
  }, [referenceDistance])

  // Camera not available view
  if (cameraPermission === 'denied' && !useAccelerometer) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px] bg-[#102218]">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-red-500 text-4xl">videocam_off</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{t.noCamera}</h3>
        <p className="text-slate-400 text-center max-w-sm mb-4">{t.noCameraDesc}</p>
        <button
          onClick={() => setUseAccelerometer(true)}
          className="px-6 py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-green-400 transition-all"
        >
          {t.useAccelerometer}
        </button>
      </div>
    )
  }

  const currentZone = getCurrentZone(currentVelocity)

  return (
    <div className="flex flex-col min-h-[500px] bg-[#102218]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
            <p className="text-xs text-[#13ec6d] font-medium">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {pixelsPerCm > 0 && (
              <span className="px-2 py-1 bg-[#13ec6d]/20 text-[#13ec6d] text-[10px] font-bold rounded uppercase">
                {t.calibrated}
              </span>
            )}
            {isTracking && (
              <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
                isRecording ? 'bg-red-500/20 text-red-400' : 'bg-[#13ec6d]/20 text-[#13ec6d]'
              }`}>
                {isRecording ? t.recording : t.live}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      {!useAccelerometer && (
        <div className="relative mx-4 rounded-xl overflow-hidden bg-black aspect-video mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Camera Controls Overlay */}
          {!isTracking && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <button
                onClick={() => {
                  startCamera()
                  setIsTracking(true)
                }}
                className="px-6 py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-green-400 transition-all"
              >
                <span className="material-symbols-outlined">videocam</span>
                {t.startCamera}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Velocity Display */}
      <div className="px-4 mb-4">
        <div className="bg-[#193324] rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t.currentVelocity}</p>
              <p className="text-4xl font-bold text-white">{currentVelocity.toFixed(2)} <span className="text-lg text-[#13ec6d]">{t.mps}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{t.zone}</p>
              <p className="text-lg font-bold" style={{ color: currentZone.color }}>{currentZone.label[lang]}</p>
            </div>
          </div>

          {/* Velocity Bar */}
          <div className="relative h-3 bg-black/30 rounded-full overflow-hidden mb-2">
            <div
              className="absolute h-full transition-all duration-100 rounded-full"
              style={{
                width: `${Math.min((currentVelocity / 2) * 100, 100)}%`,
                backgroundColor: currentZone.color
              }}
            />
          </div>

          {/* Zone Markers */}
          <div className="flex justify-between text-[8px] text-slate-600">
            <span>0</span>
            <span style={{ color: VELOCITY_ZONES.endurance.color }}>0.3</span>
            <span style={{ color: VELOCITY_ZONES.hypertrophy.color }}>0.5</span>
            <span style={{ color: VELOCITY_ZONES.strength.color }}>0.8</span>
            <span style={{ color: VELOCITY_ZONES.power.color }}>2.0</span>
          </div>
        </div>
      </div>

      {/* Velocity Chart */}
      {velocityHistory.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t.currentVelocity}</p>
            <div className="h-20 relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 50 20">
                {/* Zone backgrounds */}
                <rect x="0" y="15" width="50" height="5" fill={VELOCITY_ZONES.endurance.color + '20'} />
                <rect x="0" y="10" width="50" height="5" fill={VELOCITY_ZONES.hypertrophy.color + '20'} />
                <rect x="0" y="5" width="50" height="5" fill={VELOCITY_ZONES.strength.color + '20'} />
                <rect x="0" y="0" width="50" height="5" fill={VELOCITY_ZONES.power.color + '20'} />

                {/* Velocity line */}
                <path
                  d={velocityHistory.map((v, i) => {
                    const x = (i / (velocityHistory.length - 1)) * 50
                    const y = 20 - Math.min((v / 2) * 20, 20)
                    return `${i === 0 ? 'M' : 'L'}${x},${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#13ec6d"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#193324] rounded-lg p-3 border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t.peakVelocity}</p>
            <p className="text-xl font-bold text-white">{peakVelocity.toFixed(2)}</p>
            <p className="text-[10px] text-[#13ec6d]">{t.mps}</p>
          </div>
          <div className="bg-[#193324] rounded-lg p-3 border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t.avgVelocity}</p>
            <p className="text-xl font-bold text-white">{avgVelocity.toFixed(2)}</p>
            <p className="text-[10px] text-[#13ec6d]">{t.mps}</p>
          </div>
          <div className="bg-[#193324] rounded-lg p-3 border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t.reps}</p>
            <p className="text-xl font-bold text-[#13ec6d]">{repCount}</p>
            <p className="text-[10px] text-slate-500">{t.totalReps}</p>
          </div>
        </div>
      </div>

      {/* Rep History */}
      {completedReps.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t.reps}</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {completedReps.map((rep) => (
                <div
                  key={rep.repNumber}
                  className="flex-shrink-0 w-16 bg-[#102218] rounded-lg p-2 text-center"
                >
                  <p className="text-[10px] text-slate-500">#{rep.repNumber}</p>
                  <p className="text-sm font-bold text-white">{rep.meanVelocity.toFixed(2)}</p>
                  <p className="text-[8px] text-slate-500">{t.mps}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="px-4 mb-4">
        {isTracking ? (
          <div className="space-y-2">
            {/* Calibration and Mode Switch Row */}
            <div className="flex gap-2">
              <button
                onClick={handleCalibrate}
                disabled={!useAccelerometer && cameraPermission !== 'granted'}
                className="flex-1 py-3 bg-[#193324] border border-[#13ec6d]/30 text-[#13ec6d] rounded-xl font-bold uppercase text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-[#13ec6d]/10 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                {isCalibrating ? t.calibrating : t.calibrate}
              </button>
              <button
                onClick={() => setUseAccelerometer(!useAccelerometer)}
                className="py-3 px-4 bg-[#193324] border border-white/10 text-white rounded-xl font-bold uppercase text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-lg">
                  {useAccelerometer ? 'videocam' : 'sensors'}
                </span>
              </button>
            </div>

            {/* Recording Row */}
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="w-full py-4 bg-[#13ec6d] text-[#102218] rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-400 transition-all"
              >
                <span className="material-symbols-outlined">radio_button_checked</span>
                {t.startRecording}
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="w-full py-4 bg-red-500 text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
              >
                <span className="material-symbols-outlined">stop_circle</span>
                {t.stopRecording}
              </button>
            )}

            {/* Stop Tracking */}
            <button
              onClick={() => {
                stopCamera()
                setIsTracking(false)
                setIsRecording(false)
              }}
              className="w-full py-3 bg-[#193324] border border-white/10 text-slate-400 rounded-xl font-bold uppercase text-sm tracking-wider hover:bg-white/5 transition-all"
            >
              {t.stopCamera}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => {
                startCamera()
                setIsTracking(true)
              }}
              className="w-full py-4 bg-[#13ec6d] text-[#102218] rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-400 transition-all"
            >
              <span className="material-symbols-outlined">videocam</span>
              {t.startCamera}
            </button>
            <button
              onClick={() => {
                setUseAccelerometer(true)
                setIsTracking(true)
              }}
              className="w-full py-3 bg-[#193324] border border-[#13ec6d]/30 text-[#13ec6d] rounded-xl font-bold uppercase text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-[#13ec6d]/10 transition-all"
            >
              <span className="material-symbols-outlined">sensors</span>
              {t.useAccelerometer}
            </button>
          </div>
        )}
      </div>

      {/* Training Zones Reference */}
      <div className="px-4 mb-4">
        <div className="bg-[#193324] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t.trainingZones}</p>
          <div className="space-y-1">
            {Object.entries(VELOCITY_ZONES).map(([key, zone]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-white">{zone.label[lang]}</span>
                </div>
                <span className="text-slate-400">{zone.min}-{zone.max} {t.mps}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
