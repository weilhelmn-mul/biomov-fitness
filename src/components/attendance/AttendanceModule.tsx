'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaBadge, isValidArea, type AreaType } from './AreaBadge'
import { toast } from 'sonner'

type ScanState = 'idle' | 'scanning' | 'detected' | 'registering' | 'success' | 'error'

interface AttendanceModuleProps {
  usuarioId: string
  usuarioNombre: string
  onSuccess?: () => void
}

interface CheckResponse {
  canRegister: boolean
  lastAttendance?: {
    fecha: string
    area: string
  }
  message?: string
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}

export function AttendanceModule({ usuarioId, usuarioNombre, onSuccess }: AttendanceModuleProps) {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [detectedArea, setDetectedArea] = useState<string>('')
  const [observacion, setObservacion] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [lastAttendance, setLastAttendance] = useState<{ fecha: string; area: string } | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraLabel, setCurrentCameraLabel] = useState<string>('')
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isScanningRef = useRef(false)

  // Obtener lista de cámaras disponibles
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      setAvailableCameras(cameras)
      return cameras
    } catch (err) {
      console.error('Error getting cameras:', err)
      return []
    }
  }, [])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
        isScanningRef.current = false
      } catch (err) {
        console.log('Error stopping scanner:', err)
      }
    }
  }, [])

  const startScanner = useCallback(async (facing: 'environment' | 'user' = cameraFacing) => {
    if (isScanningRef.current) {
      await stopScanner()
    }

    setIsStarting(true)
    setScanState('scanning')
    setDetectedArea('')
    setErrorMessage('')
    setLastAttendance(null)

    try {
      // Obtener cámaras disponibles
      const cameras = await getCameras()
      
      // Crear instancia del scanner
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      const onScanSuccess = async (decodedText: string) => {
        // Parse QR content: "AREA:MEDICINA"
        const areaMatch = decodedText.match(/^AREA:(.+)$/)
        
        if (!areaMatch) {
          setErrorMessage('QR no válido. Formato esperado: AREA:NOMBRE_AREA')
          setScanState('error')
          toast.error('QR no válido')
          return
        }

        const area = areaMatch[1].toUpperCase().trim()
        
        if (!isValidArea(area)) {
          setErrorMessage(`Área no reconocida: ${area}`)
          setScanState('error')
          toast.error('Área no reconocida')
          return
        }

        // Check if user can register
        try {
          const checkResponse = await fetch(`/api/attendance/check?usuarioId=${usuarioId}&area=${area}`)
          const checkData: CheckResponse = await checkResponse.json()

          if (!checkData.canRegister) {
            setLastAttendance(checkData.lastAttendance || null)
            setErrorMessage(checkData.message || 'Ya registraste asistencia recientemente en esta área')
            setScanState('error')
            toast.error('Asistencia duplicada')
            return
          }
        } catch (err) {
          console.error('Error checking attendance:', err)
        }

        setDetectedArea(area)
        setScanState('detected')
        await stopScanner()
      }

      const onScanFailure = (error: string) => {
        // Ignore scan failures (no QR found in frame)
      }

      // Configuración del scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        aspectRatio: 1.0,
      }

      // Encontrar la cámara con el facing mode correcto
      let cameraId: string | undefined
      
      if (cameras.length > 0) {
        // Buscar cámara por facing mode o por label
        const targetCamera = cameras.find(cam => {
          if (facing === 'environment') {
            return cam.label.toLowerCase().includes('back') || 
                   cam.label.toLowerCase().includes('rear') ||
                   cam.label.toLowerCase().includes('posterior') ||
                   cam.label.toLowerCase().includes('environment')
          } else {
            return cam.label.toLowerCase().includes('front') ||
                   cam.label.toLowerCase().includes('user') ||
                   cam.label.toLowerCase().includes('facetime')
          }
        })
        
        // Si no encontramos por label, usar la posición por defecto
        cameraId = targetCamera?.deviceId || (facing === 'environment' ? cameras[0]?.deviceId : cameras[cameras.length - 1]?.deviceId)
      }

      // Iniciar scanner
      await html5QrCode.start(
        { facingMode: facing },
        config,
        onScanSuccess,
        onScanFailure
      )
      
      isScanningRef.current = true
      setCameraFacing(facing)
      
      // Actualizar el label de la cámara actual
      const currentTrack = html5QrCode.getRunningTrackCameraCapabilities?.()
      if (currentTrack) {
        const currentCam = cameras.find(cam => cam.deviceId === scannerRef.current?.getRunningTrackDeviceId?.())
        if (currentCam) {
          setCurrentCameraLabel(currentCam.label)
        }
      }
      
    } catch (err) {
      console.error('Error starting scanner:', err)
      setErrorMessage('Error al iniciar la cámara. Verifica los permisos.')
      setScanState('error')
      toast.error('Error al iniciar la cámara')
    } finally {
      setIsStarting(false)
    }
  }, [cameraFacing, getCameras, stopScanner, usuarioId])

  const switchCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    await stopScanner()
    await startScanner(newFacing)
  }, [cameraFacing, stopScanner, startScanner])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  const handleRegister = async () => {
    if (!detectedArea) return

    setScanState('registering')
    setErrorMessage('')

    try {
      const payload = {
        usuario_id: usuarioId,
        nombre_completo: usuarioNombre,
        area: detectedArea,
        observacion: observacion || null,
      }
      
      console.log('📤 Sending attendance:', payload)

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      
      console.log('📥 Attendance response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar asistencia')
      }

      setScanState('success')
      toast.success('¡Asistencia registrada correctamente!')
      
      setTimeout(() => {
        onSuccess?.()
        resetScanner()
      }, 2000)
    } catch (error) {
      console.error('❌ Error registering attendance:', error)
      setScanState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error al registrar asistencia')
      toast.error('Error al registrar asistencia')
    }
  }

  const resetScanner = async () => {
    await stopScanner()
    setScanState('idle')
    setDetectedArea('')
    setObservacion('')
    setErrorMessage('')
    setLastAttendance(null)
  }

  // Idle state - show start button
  if (scanState === 'idle') {
    return (
      <Card className="bg-[#193324] border-[#13ec6d]/20">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl text-white flex items-center justify-center gap-2">
            <Icon name="qr_code_scanner" className="text-[#13ec6d]" />
            Registro de Asistencia
          </CardTitle>
          <CardDescription className="text-slate-400">
            Escanea el código QR del área para registrar tu asistencia
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-2">
          <div className="w-40 h-40 rounded-2xl bg-[#102218] border-2 border-dashed border-[#13ec6d]/30 flex items-center justify-center">
            <Icon name="qr_code_2" className="text-6xl text-[#13ec6d]/50" />
          </div>
          <Button
            onClick={() => startScanner()}
            className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold py-6 text-base shadow-[0_0_20px_rgba(19,236,109,0.3)]"
          >
            <Icon name="camera_alt" className="mr-2" />
            Activar Cámara
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Scanning state - show camera with switch button
  if (scanState === 'scanning') {
    return (
      <Card className="bg-[#193324] border-[#13ec6d]/20">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl text-white flex items-center justify-center gap-2">
            <Icon name="qr_code_scanner" className="text-[#13ec6d] animate-pulse" />
            Escaneando...
          </CardTitle>
          <CardDescription className="text-slate-400">
            Apunta la cámara al código QR del área
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-2">
          {/* Camera View */}
          <div 
            ref={containerRef}
            id="qr-reader" 
            className="w-full max-w-sm overflow-hidden rounded-xl bg-black"
            style={{ minHeight: '280px' }}
          />
          
          {/* Camera Controls */}
          <div className="w-full flex flex-col gap-3">
            {/* Camera Type Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <Icon name={cameraFacing === 'environment' ? 'photo_camera' : 'flip_camera_ios'} className="text-[#13ec6d]" />
              <span className="text-slate-400">
                {cameraFacing === 'environment' ? 'Cámara Trasera' : 'Cámara Frontal'}
              </span>
            </div>
            
            {/* Switch Camera Button */}
            <Button
              onClick={switchCamera}
              disabled={isStarting}
              className="w-full bg-[#102218] border border-[#13ec6d]/30 text-[#13ec6d] hover:bg-[#13ec6d]/10 hover:border-[#13ec6d] font-medium py-3"
            >
              <Icon name="flip_camera_ios" className="mr-2 text-lg" />
              {isStarting ? 'Cambiando...' : 'Cambiar Cámara'}
            </Button>
            
            {/* Cancel Button */}
            <Button
              onClick={resetScanner}
              variant="outline"
              className="w-full border-slate-600 text-slate-400 hover:bg-slate-700"
            >
              <Icon name="close" className="mr-2" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Detected state - show confirmation form
  if (scanState === 'detected' || scanState === 'registering') {
    return (
      <Card className="bg-[#193324] border-[#13ec6d]/20">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl text-white flex items-center justify-center gap-2">
            <Icon name="check_circle" className="text-[#13ec6d]" />
            Área Detectada
          </CardTitle>
          <CardDescription className="text-slate-400">
            Confirma tu asistencia
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-2">
          {/* Detected Area */}
          <div className="bg-[#102218] rounded-xl p-4 border border-white/5">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Área</Label>
            <div className="mt-2 flex items-center gap-3">
              <AreaBadge area={detectedArea} size="lg" />
            </div>
          </div>

          {/* User Info */}
          <div className="bg-[#102218] rounded-xl p-4 border border-white/5">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Usuario</Label>
            <p className="mt-1 text-white font-medium">{usuarioNombre}</p>
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="observacion" className="text-xs text-slate-500 uppercase tracking-wide">
              Observación (opcional)
            </Label>
            <Textarea
              id="observacion"
              placeholder="Agregar notas adicionales..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="bg-[#102218] border-white/10 text-white placeholder:text-slate-600 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={resetScanner}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700"
              disabled={scanState === 'registering'}
            >
              <Icon name="close" className="mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleRegister}
              className="flex-1 bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold"
              disabled={scanState === 'registering'}
            >
              {scanState === 'registering' ? (
                <>
                  <Icon name="sync" className="mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Icon name="check" className="mr-2" />
                  Registrar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (scanState === 'success') {
    return (
      <Card className="bg-[#193324] border-[#13ec6d]/50">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="w-20 h-20 rounded-full bg-[#13ec6d]/20 flex items-center justify-center">
            <Icon name="check_circle" className="text-5xl text-[#13ec6d]" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">¡Asistencia Registrada!</h3>
            <p className="text-slate-400 mt-1">
              {detectedArea && <AreaBadge area={detectedArea} size="md" />}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (scanState === 'error') {
    return (
      <Card className="bg-[#193324] border-[#ef4444]/30">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="w-20 h-20 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
            <Icon name="error" className="text-5xl text-[#ef4444]" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">Error</h3>
            <p className="text-[#ef4444] mt-1">{errorMessage}</p>
            {lastAttendance && (
              <p className="text-slate-500 text-sm mt-2">
                Última asistencia en esta área: {new Date(lastAttendance.fecha).toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={resetScanner}
            className="mt-4 bg-slate-700 hover:bg-slate-600 text-white"
          >
            <Icon name="refresh" className="mr-2" />
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
