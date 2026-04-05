'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createClientSupabase, subscribeToAttendance, type Asistencia } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { QRGenerator } from '@/components/attendance'
import AdminDashboard from '@/components/admin/AdminDashboard'

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  id: string
  email: string
  nombre_completo: string
  dni: string
  rol: 'usuario' | 'admin' | 'superadmin' | 'super_admin'
  aprobado: boolean
}

interface AttendanceRecord {
  id: string
  nombre_completo: string
  area: string
  fecha: string
  observacion?: string
  created_at: string
}

type ViewMode = 'login' | 'register' | 'admin-dashboard'

// ============================================================================
// TEXTS
// ============================================================================

const TEXTS = {
  es: {
    // Login
    title: 'BIOMOV',
    subtitle: 'Entrenamiento Inteligente',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    email: 'Email',
    password: 'Contraseña',
    fullName: 'Nombre Completo',
    dni: 'DNI / Cédula',
    confirmPassword: 'Confirmar Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    createAccount: 'Crear Cuenta',
    loginBtn: 'Iniciar Sesión',
    registerBtn: 'Registrarse',
    loading: 'Cargando...',
    
    // Scanner
    scanQR: 'Control de Asistencia',
    scanQRDesc: 'Escanea el código QR del área para registrar tu asistencia',
    scanQRBtn: 'Escáner QR',
    startScanning: 'Escanear QR',
    stopScanning: 'Detener',
    scanning: 'Escaneando...',
    areaDetected: 'Área Detectada',
    registerAttendance: 'Registrar Asistencia',
    attendanceSuccess: '¡Asistencia Registrada!',
    attendanceError: 'Error al registrar',
    observationOptional: 'Observación (opcional)',
    yourName: 'Tu nombre completo',
    
    // Admin
    adminPanel: 'Panel de Administración',
    adminDashboard: 'Dashboard',
    logout: 'Cerrar Sesión',
    realtimeActivity: 'Actividad en Tiempo Real',
    totalToday: 'Total Hoy',
    pendingApproval: 'Usuarios Pendientes',
    generateQR: 'Generar QR',
    exportExcel: 'Exportar Excel',
    exportPDF: 'Exportar PDF',
    
    // Table
    searchByName: 'Buscar por nombre...',
    filterByArea: 'Filtrar por área',
    filterByDate: 'Filtrar por fecha',
    sortByDate: 'Ordenar por fecha',
    allAreas: 'Todas las áreas',
    name: 'Nombre',
    area: 'Área',
    date: 'Fecha',
    observation: 'Observación',
    noRecords: 'No hay registros',
    
    // Stats
    statistics: 'Estadísticas por Área',
    totalRecords: 'Total Registros',
    
    // Errors
    invalidCredentials: 'Credenciales inválidas',
    emailRequired: 'Email requerido',
    passwordRequired: 'Contraseña requerida',
    passwordMinLength: 'La contraseña debe tener al menos 6 caracteres',
    passwordsDontMatch: 'Las contraseñas no coinciden',
    fillAllFields: 'Completa todos los campos',
    accountPending: 'Tu cuenta está pendiente de aprobación',
    notAuthorized: 'No autorizado para modo administrador',
    cameraPermission: 'Permiso de cámara denegado',
    cameraError: 'Error al acceder a la cámara',
  }
}

// ============================================================================
// COLORS FOR CHARTS
// ============================================================================

const AREA_COLORS: Record<string, string> = {
  'FISIOTERAPIA': '#13ec6d',
  'MEDICINA': '#00f0ff',
  'NUTRICION': '#f59e0b',
  'GIMNASIO': '#ec4899',
  'ASISTENCIA_SOCIAL': '#8b5cf6',
  'MUSCULACION': '#13ec6d',
  'CARDIO': '#00f0ff',
  'FUNCIONAL': '#22c55e',
  'CROSSFIT': '#f59e0b',
  'YOGA': '#8b5cf6',
  'SPINNING': '#ec4899',
  'PISCINA': '#06b6d4',
}

const CHART_COLORS = ['#13ec6d', '#00f0ff', '#f59e0b', '#ec4899', '#8b5cf6']

// ============================================================================
// ROLE BADGE COMPONENT
// ============================================================================

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'super_admin': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', label: 'Super Admin' },
  'superadmin': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', label: 'Super Admin' },
  'admin': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: 'Admin' },
  'entrenador': { color: '#13ec6d', bg: 'rgba(19, 236, 109, 0.15)', label: 'Entrenador' },
  'paciente': { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Paciente' },
  'usuario': { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Usuario' },
}

// Normalizar roles para comparaciones
const normalizeRole = (role: string): string => {
  if (role === 'superadmin' || role === 'super_admin') return 'super_admin'
  return role
}

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG['usuario']
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ 
        backgroundColor: config.bg, 
        color: config.color,
        border: `1px solid ${config.color}40`
      }}
    >
      {role === 'super_admin' || role === 'superadmin' ? (
        <span className="material-symbols-outlined text-sm">shield</span>
      ) : role === 'admin' ? (
        <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
      ) : role === 'entrenador' ? (
        <span className="material-symbols-outlined text-sm">fitness_center</span>
      ) : (
        <span className="material-symbols-outlined text-sm">person</span>
      )}
      {config.label}
    </span>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LoginPage() {
  const t = TEXTS.es
  const language = 'es' // Language setting for child components
  
  // Mount state
  const [mounted, setMounted] = useState(false)
  
  // View mode
  const [mode, setMode] = useState<ViewMode>('login')
  
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [dni, setDni] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  
  // User state
  const [user, setUser] = useState<UserData | null>(null)
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false)
  const [detectedArea, setDetectedArea] = useState<string | null>(null)
  const [scannerName, setScannerName] = useState('')
  const [scannerObservation, setScannerObservation] = useState('')
  const [attendanceRegistered, setAttendanceRegistered] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [showScannerModal, setShowScannerModal] = useState(false)
  
  // Admin state
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([])
  const [searchName, setSearchName] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'qr' | 'stats' | 'users'>('dashboard')
  const [usersSubTab, setUsersSubTab] = useState<'management' | 'attendance'>('management')
  
  // Users management state
  const [usersList, setUsersList] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [updatingRole, setUpdatingRole] = useState(false)
  const [roleUpdateSuccess, setRoleUpdateSuccess] = useState<string | null>(null)
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null)
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [approvalMessage, setApprovalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const jsqrModuleRef = useRef<any>(null)
  const isCleaningUpRef = useRef(false)
  const supabaseClientRef = useRef<SupabaseClient | null>(null)
  const realtimeSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  // Mount effect
  useEffect(() => {
    setMounted(true)
    
    // Check for existing session
    const savedUser = localStorage.getItem('biomov_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
        // Solo admin/superadmin van al Panel de Administración
        if (parsed.rol === 'admin' || parsed.rol === 'superadmin' || parsed.rol === 'super_admin') {
          setMode('admin-dashboard')
        } else {
          // Redirigir usuarios normales a la app principal
          window.location.href = '/'
        }
      } catch (e) {}
    }
    
    // Preload jsQR
    import('jsqr').then((module) => {
      jsqrModuleRef.current = module.default
    }).catch(console.error)
  }, [])

  // ============================================================================
  // AUTH FUNCTIONS
  // ============================================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (!email || !password) {
      setError(t.emailRequired)
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (data.success && data.user) {
        if (!data.user.aprobado) {
          setError(t.accountPending)
          setLoading(false)
          return
        }
        
        setUser(data.user)
        localStorage.setItem('biomov_user', JSON.stringify(data.user))
        
        // Solo admin/superadmin van al Panel de Administración
        if (data.user.rol === 'admin' || data.user.rol === 'superadmin' || data.user.rol === 'super_admin') {
          setMode('admin-dashboard')
        } else {
          // Usuarios normales van a la app principal
          window.location.href = '/'
        }
      } else {
        setError(data.error || t.invalidCredentials)
      }
    } catch (e) {
      setError('Error de conexión')
    }
    
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (!name || !email || !password || !dni) {
      setError(t.fillAllFields)
      setLoading(false)
      return
    }
    
    if (password !== confirmPassword) {
      setError(t.passwordsDontMatch)
      setLoading(false)
      return
    }
    
    if (password.length < 6) {
      setError(t.passwordMinLength)
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: name, email, password, dni })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage('Registro exitoso. ' + (data.user?.rol === 'admin' ? 'Tu cuenta de administrador está lista.' : 'Tu cuenta está pendiente de aprobación.'))
      } else {
        setError(data.error || 'Error al registrar')
      }
    } catch (e) {
      setError('Error de conexión')
    }
    
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('biomov_user')
    setUser(null)
    setMode('login')
    stopScanner()
  }

  // ============================================================================
  // SCANNER FUNCTIONS
  // ============================================================================

  const stopScanner = useCallback(() => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsScanning(false)
    
    setTimeout(() => {
      isCleaningUpRef.current = false
    }, 100)
  }, [])

  const startScanner = useCallback(async () => {
    if (isScanning || isCleaningUpRef.current) return
    
    setScannerError(null)
    setDetectedArea(null)
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NOT_SUPPORTED')
      }
      
      let stream: MediaStream | null = null
      const configs = [
        { video: { facingMode: { exact: 'environment' } } },
        { video: { facingMode: 'environment' } },
        { video: { facingMode: 'user' } },
        { video: true }
      ]
      
      let lastError: Error | null = null
      
      for (const config of configs) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(config)
          break
        } catch (e: any) {
          lastError = e
          continue
        }
      }
      
      if (!stream) {
        throw lastError || new Error('NO_CAMERA')
      }
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        videoRef.current.setAttribute('muted', 'true')
        
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!
          
          const onCanPlay = () => {
            video.removeEventListener('canplay', onCanPlay)
            video.removeEventListener('loadeddata', onCanPlay)
            video.removeEventListener('error', onError)
            resolve()
          }
          
          const onError = () => {
            video.removeEventListener('canplay', onCanPlay)
            video.removeEventListener('loadeddata', onCanPlay)
            video.removeEventListener('error', onError)
            reject(new Error('VIDEO_ERROR'))
          }
          
          video.addEventListener('canplay', onCanPlay)
          video.addEventListener('loadeddata', onCanPlay)
          video.addEventListener('error', onError)
          
          const timeout = setTimeout(() => {
            video.removeEventListener('canplay', onCanPlay)
            video.removeEventListener('loadeddata', onCanPlay)
            video.removeEventListener('error', onError)
            reject(new Error('TIMEOUT'))
          }, 10000)
          
          video.play().then(() => clearTimeout(timeout)).catch((err) => {
            clearTimeout(timeout)
            reject(err)
          })
        })
        
        setIsScanning(true)
        startQRScanning()
      }
    } catch (err: any) {
      console.error('Scanner error:', err)
      const errorName = err.name || err.message
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setScannerError(t.cameraPermission)
      } else if (errorName === 'NotFoundError' || errorName === 'NO_CAMERA') {
        setScannerError('No se encontró cámara')
      } else {
        setScannerError(t.cameraError)
      }
    }
  }, [isScanning, t.cameraPermission, t.cameraError])

  const startQRScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCleaningUpRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) return
    
    const scanWithJsQR = (jsQR: any) => {
      const scanFrame = () => {
        if (isCleaningUpRef.current || !videoRef.current || !canvasRef.current) {
          return
        }
        
        if (video.paused || video.ended) {
          animationRef.current = requestAnimationFrame(scanFrame)
          return
        }
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          })
          
          if (code && code.data) {
            const match = code.data.match(/^AREA:(.+)$/)
            if (match) {
              if (navigator.vibrate) {
                navigator.vibrate(100)
              }
              setDetectedArea(match[1])
              stopScanner()
              return
            }
          }
        }
        
        animationRef.current = requestAnimationFrame(scanFrame)
      }
      
      scanFrame()
    }
    
    if (jsqrModuleRef.current) {
      scanWithJsQR(jsqrModuleRef.current)
    } else {
      import('jsqr').then((module) => {
        jsqrModuleRef.current = module.default
        scanWithJsQR(module.default)
      }).catch(console.error)
    }
  }, [stopScanner])

  const handleRegisterAttendance = async () => {
    if (!detectedArea || !scannerName.trim()) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: scannerName.trim(),
          area: detectedArea,
          observacion: scannerObservation.trim() || undefined,
          usuario_id: user?.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAttendanceRegistered(true)
        setTimeout(() => {
          setAttendanceRegistered(false)
          setDetectedArea(null)
          setScannerName('')
          setScannerObservation('')
        }, 2000)
      } else {
        setScannerError(data.error || t.attendanceError)
      }
    } catch (e) {
      setScannerError('Error de conexión')
    }
    
    setLoading(false)
  }

  // ============================================================================
  // ADMIN FUNCTIONS
  // ============================================================================

  const fetchAttendanceData = useCallback(async () => {
    try {
      const response = await fetch('/api/attendance?limit=500')
      const data = await response.json()
      setAttendanceData(data.asistencias || [])
    } catch (e) {
      console.error('Error fetching attendance data:', e)
    }
  }, [])

  const fetchPendingUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users/pending')
      const data = await response.json()
      setPendingUsers(data.users || [])
    } catch (e) {
      console.error('Error fetching pending users:', e)
    }
  }, [])

  const handleApproveUser = async (userId: string) => {
    setApprovingUserId(userId)
    setApprovalMessage(null)
    try {
      const response = await fetch(`/api/users/${userId}/approve`, { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setApprovalMessage({ type: 'success', text: '¡Usuario aprobado correctamente!' })
        await fetchPendingUsers()
        setTimeout(() => setApprovalMessage(null), 3000)
      } else {
        setApprovalMessage({ type: 'error', text: data.error || 'Error al aprobar usuario' })
      }
    } catch (e) {
      console.error('Error approving user:', e)
      setApprovalMessage({ type: 'error', text: 'Error de conexión' })
    }
    setApprovingUserId(null)
  }

  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/attendance/export/excel')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asistencias_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error exporting to Excel:', e)
    }
  }

  const exportToPDF = async () => {
    try {
      const response = await fetch('/api/attendance/export/pdf')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asistencias_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error exporting to PDF:', e)
    }
  }

  // ============================================================================
  // USER MANAGEMENT FUNCTIONS
  // ============================================================================

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    setRoleUpdateError(null)
    try {
      const response = await fetch(`/api/users?t=${Date.now()}`)
      const data = await response.json()
      
      if (data.error) {
        setRoleUpdateError(data.error)
      } else {
        setUsersList(data.users || [])
      }
    } catch (e) {
      console.error('Error fetching users:', e)
      setRoleUpdateError('Error al cargar usuarios. Intenta nuevamente.')
    }
    setLoadingUsers(false)
  }, [])

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return
    
    setUpdatingRole(true)
    setRoleUpdateError(null)
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          new_role: newRole,
          requester_id: user?.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setRoleUpdateSuccess(`Rol actualizado correctamente a "${ROLE_CONFIG[newRole]?.label || newRole}"`)
        await fetchUsers()
        setTimeout(() => {
          setRoleUpdateSuccess(null)
          setShowRoleModal(false)
          setSelectedUser(null)
          setNewRole('')
        }, 2000)
      } else {
        setRoleUpdateError(data.error || 'Error al actualizar el rol')
      }
    } catch (e) {
      console.error('Error updating role:', e)
      setRoleUpdateError('Error de conexión. Intenta nuevamente.')
    }
    setUpdatingRole(false)
  }

  const openRoleModal = (userData: any) => {
    setSelectedUser(userData)
    const normalizedRole = normalizeRole(userData.rol || 'usuario')
    setNewRole(normalizedRole)
    setRoleUpdateError(null)
    setShowRoleModal(true)
  }

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let data = [...attendanceData]
    
    if (searchName) {
      data = data.filter(item => 
        item.nombre_completo.toLowerCase().includes(searchName.toLowerCase())
      )
    }
    
    if (filterArea) {
      data = data.filter(item => item.area === filterArea)
    }
    
    if (filterDate) {
      data = data.filter(item => {
        const itemDate = new Date(item.fecha || item.created_at).toISOString().split('T')[0]
        return itemDate === filterDate
      })
    }
    
    data.sort((a, b) => {
      const dateA = new Date(a.fecha || a.created_at).getTime()
      const dateB = new Date(b.fecha || b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return data
  }, [attendanceData, searchName, filterArea, filterDate, sortOrder])

  // Statistics by area
  const areaStats = useMemo(() => {
    const stats: Record<string, number> = {}
    attendanceData.forEach(item => {
      stats[item.area] = (stats[item.area] || 0) + 1
    })
    
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [attendanceData])

  // Stats for cards
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayData = attendanceData.filter(a => 
      new Date(a.fecha || a.created_at) >= today
    )
    
    return {
      totalHoy: todayData.length,
      usuariosUnicos: new Set(todayData.map(a => a.nombre_completo)).size,
      totalRegistros: attendanceData.length,
      totalAreas: areaStats.length
    }
  }, [attendanceData, areaStats])

  // Unique areas for filter
  const uniqueAreas = useMemo(() => {
    return [...new Set(attendanceData.map(item => item.area))].sort()
  }, [attendanceData])

  // Realtime effect
  useEffect(() => {
    if (mode === 'admin-dashboard') {
      fetchAttendanceData()
      fetchPendingUsers()
      
      const setupRealtime = async () => {
        try {
          const client = createClientSupabase()
          if (client) {
            supabaseClientRef.current = client
            
            const subscription = subscribeToAttendance(
              (newRecord) => {
                setAttendanceData(prev => [newRecord, ...prev])
              }
            )
            
            if (subscription) {
              realtimeSubscriptionRef.current = subscription
            }
          }
        } catch (error) {
          console.warn('Supabase Realtime not available:', error)
        }
      }
      
      setupRealtime()
      
      const pollingInterval = setInterval(fetchAttendanceData, 30000)
      
      return () => {
        clearInterval(pollingInterval)
        if (realtimeSubscriptionRef.current) {
          realtimeSubscriptionRef.current.unsubscribe()
          realtimeSubscriptionRef.current = null
        }
      }
    }
  }, [mode, fetchAttendanceData, fetchPendingUsers])

  // Load users when users tab is active
  useEffect(() => {
    if (activeTab === 'users' && usersList.length === 0) {
      fetchUsers()
    }
  }, [activeTab, usersList.length, fetchUsers])

  // Cleanup
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#102218] flex items-center justify-center">
        <div className="size-12 rounded-full border-3 border-[#13ec6d]/30 border-t-[#13ec6d] animate-spin" />
      </div>
    )
  }

  // ============================================================================
  // RENDER: ADMIN DASHBOARD
  // ============================================================================

  if (mode === 'admin-dashboard' && user) {
    return (
      <div className="min-h-screen bg-[#102218]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#102218]/95 backdrop-blur-md border-b border-[#13ec6d]/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#13ec6d]/20 flex items-center justify-center border border-[#13ec6d]/30">
                <img src="/biomov-logo.jpg" alt="BIOMOV" className="w-8 h-8 rounded-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{t.adminPanel}</h1>
                <p className="text-xs text-slate-400">{user.nombre_completo || user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-3 py-2 bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-[#00f0ff] rounded-xl text-sm font-medium hover:bg-[#00f0ff]/30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">fitness_center</span>
                <span className="hidden sm:inline">Ir a la App</span>
              </button>
              <button
                onClick={() => setShowScannerModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all bg-[#13ec6d]/20 border border-[#13ec6d]/30 text-[#13ec6d] hover:bg-[#13ec6d]/30"
              >
                <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                <span className="hidden sm:inline">Escanear QR</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#13ec6d]/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#13ec6d]">today</span>
                <p className="text-xs text-slate-400">{t.totalToday}</p>
              </div>
              <p className="text-3xl font-bold text-[#13ec6d]">{stats.totalHoy}</p>
            </div>
            <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-[#00f0ff]/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#00f0ff]">group</span>
                <p className="text-xs text-slate-400">Usuarios Hoy</p>
              </div>
              <p className="text-3xl font-bold text-[#00f0ff]">{stats.usuariosUnicos}</p>
            </div>
            <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-yellow-400">pending</span>
                <p className="text-xs text-slate-400">{t.pendingApproval}</p>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{pendingUsers.length}</p>
            </div>
            <div className="bg-gradient-to-br from-[#193324] to-[#102218] rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-white">database</span>
                <p className="text-xs text-slate-400">{t.totalRecords}</p>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalRegistros}</p>
            </div>
          </div>

          {/* Pending Users */}
          {(pendingUsers.length > 0 || approvalMessage) && (
            <div className="bg-[#193324] rounded-2xl border border-yellow-500/20 p-4">
              <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">pending</span>
                {t.pendingApproval} ({pendingUsers.length})
              </h3>
              
              {approvalMessage && (
                <div className={`mb-3 p-3 rounded-xl flex items-center gap-2 ${
                  approvalMessage.type === 'success' 
                    ? 'bg-[#13ec6d]/20 border border-[#13ec6d]/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <span className={`material-symbols-outlined ${
                    approvalMessage.type === 'success' ? 'text-[#13ec6d]' : 'text-red-400'
                  }`}>
                    {approvalMessage.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span className={`text-sm ${
                    approvalMessage.type === 'success' ? 'text-[#13ec6d]' : 'text-red-400'
                  }`}>
                    {approvalMessage.text}
                  </span>
                </div>
              )}
              
              {pendingUsers.length > 0 && (
                <div className="grid gap-2">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-[#102218] rounded-xl p-3">
                      <div>
                        <p className="text-white font-medium">{u.nombre_completo}</p>
                        <p className="text-slate-400 text-sm">{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleApproveUser(u.id)}
                        disabled={approvingUserId === u.id}
                        className="px-4 py-2 bg-[#13ec6d] text-[#102218] rounded-lg font-bold text-sm hover:bg-[#13ec6d]/90 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {approvingUserId === u.id ? (
                          <>
                            <span className="size-4 border-2 border-[#102218]/30 border-t-[#102218] rounded-full animate-spin" />
                            Aprobando...
                          </>
                        ) : (
                          'Aprobar'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'dashboard' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'qr' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">qr_code_2</span>
              <span className="hidden sm:inline">Generador QR</span>
              <span className="sm:hidden">QR</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'stats' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">bar_chart</span>
              <span className="hidden sm:inline">Estadísticas</span>
              <span className="sm:hidden">Stats</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'users' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">manage_accounts</span>
              <span className="hidden sm:inline">Usuarios y Registros</span>
              <span className="sm:hidden">Usuarios</span>
            </button>
          </div>

          {/* Admin Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <AdminDashboard lang={language} />
          )}

          {/* QR Generator Tab */}
          {activeTab === 'qr' && (
            <div className="bg-[#193324] rounded-2xl border border-[#13ec6d]/20 p-4">
              <QRGenerator />
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="bg-[#193324] rounded-2xl border border-white/10 p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#13ec6d]">leaderboard</span>
                  {t.statistics}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {areaStats.map((stat, index) => (
                    <div 
                      key={stat.name}
                      className="bg-[#102218] rounded-xl p-4 border-l-4 text-center"
                      style={{ borderColor: AREA_COLORS[stat.name] || CHART_COLORS[index % CHART_COLORS.length] }}
                    >
                      <p className="text-xs text-slate-400 mb-1">{stat.name}</p>
                      <p className="text-2xl font-bold" style={{ color: AREA_COLORS[stat.name] || CHART_COLORS[index % CHART_COLORS.length] }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#193324] rounded-2xl border border-white/10 p-4">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00f0ff]">bar_chart</span>
                    Asistencias por Área
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={areaStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#193324', 
                            border: '1px solid #13ec6d30',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {areaStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={AREA_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#193324] rounded-2xl border border-white/10 p-4">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ec4899]">donut_large</span>
                    Distribución por Área
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={areaStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {areaStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={AREA_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#193324', 
                            border: '1px solid #13ec6d30',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '10px' }}
                          formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex bg-[#102218] rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setUsersSubTab('management')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    usersSubTab === 'management' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">manage_accounts</span>
                  Gestión de Usuarios
                </button>
                <button
                  onClick={() => setUsersSubTab('attendance')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    usersSubTab === 'attendance' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">table</span>
                  Registros de Asistencia
                </button>
              </div>

              {usersSubTab === 'management' && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#13ec6d]">manage_accounts</span>
                      Gestión de Usuarios
                    </h3>
                    <button
                      onClick={fetchUsers}
                      disabled={loadingUsers}
                      className="flex items-center gap-2 px-3 py-2 bg-[#193324] border border-white/10 rounded-lg text-slate-400 hover:text-white text-sm transition-all"
                    >
                      <span className={`material-symbols-outlined text-lg ${loadingUsers ? 'animate-spin' : ''}`}>
                        {loadingUsers ? 'progress_activity' : 'refresh'}
                      </span>
                      Actualizar
                    </button>
                  </div>

                  {roleUpdateSuccess && (
                    <div className="bg-[#13ec6d]/20 border border-[#13ec6d]/30 rounded-xl p-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#13ec6d] text-2xl">check_circle</span>
                      <p className="text-[#13ec6d] font-medium">{roleUpdateSuccess}</p>
                    </div>
                  )}

                  {roleUpdateError && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-400 text-2xl">error</span>
                      <p className="text-red-400 font-medium">{roleUpdateError}</p>
                      <button 
                        onClick={() => setRoleUpdateError(null)}
                        className="ml-auto text-red-400 hover:text-red-300"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}

                  <div className="bg-[#193324] rounded-2xl border border-white/10 overflow-hidden">
                    {loadingUsers ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="size-12 rounded-full border-3 border-[#13ec6d]/30 border-t-[#13ec6d] animate-spin" />
                        <p className="text-slate-400 text-sm mt-3">Cargando usuarios...</p>
                      </div>
                    ) : usersList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <span className="material-symbols-outlined text-slate-600 text-5xl">group_off</span>
                        <p className="text-slate-400 text-sm mt-3">No hay usuarios registrados</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-[#102218]">
                            <tr>
                              <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Nombre</th>
                              <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">DNI</th>
                              <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Email</th>
                              <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Rol Actual</th>
                              <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Cambiar Rol</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {usersList.map((u) => (
                              <tr key={u.id} className="hover:bg-[#102218]/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-[#13ec6d]/20 flex items-center justify-center flex-shrink-0">
                                      <span className="material-symbols-outlined text-[#13ec6d] text-sm">person</span>
                                    </div>
                                    <span className="text-white font-medium truncate max-w-[150px]">{u.nombre_completo || u.nombre || 'Sin nombre'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-300 text-sm">{u.dni || '-'}</td>
                                <td className="px-4 py-3 text-slate-300 text-sm truncate max-w-[150px]">{u.email}</td>
                                <td className="px-4 py-3">
                                  <RoleBadge role={u.rol} />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => openRoleModal(u)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-lg text-[#13ec6d] text-xs font-medium hover:bg-[#13ec6d]/20 transition-all"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Cambiar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {!loadingUsers && usersList.length > 0 && (
                      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-sm">
                        <span className="text-slate-400">Total: {usersList.length} usuarios</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {usersSubTab === 'attendance' && (
                <div className="bg-[#193324] rounded-2xl border border-white/10 overflow-hidden">
                  <div className="p-4 border-b border-white/10 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                          <input
                            type="text"
                            placeholder={t.searchByName}
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                      
                      <select
                        value={filterArea}
                        onChange={(e) => setFilterArea(e.target.value)}
                        className="px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white focus:border-[#13ec6d] focus:outline-none text-sm appearance-none cursor-pointer min-w-[150px]"
                      >
                        <option value="">{t.allAreas}</option>
                        {uniqueAreas.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                      
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white focus:border-[#13ec6d] focus:outline-none text-sm"
                      />
                      
                      <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-[#13ec6d] transition-all text-sm flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                        Fecha
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={exportToExcel}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-green-700 transition-all text-sm"
                      >
                        <span className="material-symbols-outlined">table_view</span>
                        {t.exportExcel}
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-red-700 transition-all text-sm"
                      >
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                        {t.exportPDF}
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#102218]">
                        <tr>
                          <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.name}</th>
                          <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.area}</th>
                          <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.date}</th>
                          <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.observation}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-slate-400 py-8">{t.noRecords}</td>
                          </tr>
                        ) : (
                          filteredData.map((item, index) => (
                            <tr key={item.id || index} className="hover:bg-[#102218]/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-[#13ec6d]/20 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[#13ec6d] text-sm">person</span>
                                  </div>
                                  <span className="text-white font-medium">{item.nombre_completo}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span 
                                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                                  style={{ 
                                    backgroundColor: `${AREA_COLORS[item.area] || '#6b7280'}20`,
                                    color: AREA_COLORS[item.area] || '#6b7280'
                                  }}
                                >
                                  {item.area}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-sm">
                                {new Date(item.fecha || item.created_at).toLocaleString('es', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-sm max-w-[200px] truncate">
                                {item.observacion || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Mostrando {filteredData.length} de {attendanceData.length} registros
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role Change Modal */}
          {showRoleModal && selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-[#193324] rounded-2xl border border-[#13ec6d]/30 p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-12 rounded-full bg-[#13ec6d]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#13ec6d] text-2xl">manage_accounts</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Cambiar Rol de Usuario</h4>
                    <p className="text-sm text-slate-400">{selectedUser.nombre_completo || selectedUser.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {roleUpdateError && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400 text-lg">error</span>
                      <p className="text-red-400 text-sm">{roleUpdateError}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Rol Actual</label>
                    <RoleBadge role={selectedUser.rol} />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Nuevo Rol</label>
                    <select
                      value={newRole}
                      onChange={(e) => { setNewRole(e.target.value); setRoleUpdateError(null); }}
                      className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white focus:border-[#13ec6d] focus:outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value="super_admin">Super Administrador</option>
                      <option value="admin">Administrador</option>
                      <option value="entrenador">Entrenador</option>
                      <option value="paciente">Paciente</option>
                      <option value="usuario">Usuario</option>
                    </select>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    <p className="text-yellow-400 text-sm flex items-start gap-2">
                      <span className="material-symbols-outlined text-lg flex-shrink-0">warning</span>
                      ¿Desea cambiar el rol de este usuario? Esta acción modificará los permisos de acceso.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowRoleModal(false)
                        setSelectedUser(null)
                        setNewRole('')
                        setRoleUpdateError(null)
                      }}
                      disabled={updatingRole}
                      className="flex-1 py-3 bg-[#102218] border border-white/10 text-slate-400 rounded-xl font-medium hover:text-white transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRoleChange}
                      disabled={updatingRole || !newRole || normalizeRole(newRole) === normalizeRole(selectedUser.rol)}
                      className="flex-1 py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updatingRole ? (
                        <>
                          <div className="size-4 rounded-full border-2 border-[#102218]/30 border-t-[#102218] animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">check</span>
                          Confirmar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Scanner Modal */}
          {showScannerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-[#193324] rounded-2xl border border-[#13ec6d]/30 w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#13ec6d]">qr_code_scanner</span>
                    Escanear QR de Asistencia
                  </h3>
                  <button
                    onClick={() => {
                      setShowScannerModal(false)
                      stopScanner()
                      setDetectedArea(null)
                      setScannerName('')
                      setScannerObservation('')
                      setScannerError(null)
                      setAttendanceRegistered(false)
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-slate-400">close</span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {attendanceRegistered ? (
                    <div className="text-center py-8">
                      <div className="size-20 rounded-full bg-[#13ec6d]/20 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-[#13ec6d] text-4xl">check_circle</span>
                      </div>
                      <p className="text-[#13ec6d] font-bold text-lg">¡Asistencia Registrada!</p>
                      <p className="text-slate-400 text-sm mt-2">Área: {detectedArea}</p>
                    </div>
                  ) : detectedArea ? (
                    <div className="space-y-4">
                      <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-xl p-4 text-center">
                        <span className="material-symbols-outlined text-[#13ec6d] text-3xl">location_on</span>
                        <p className="text-[#13ec6d] font-bold text-lg mt-2">Área Detectada</p>
                        <p className="text-white text-xl font-bold">{detectedArea}</p>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nombre Completo</label>
                        <input
                          type="text"
                          value={scannerName}
                          onChange={(e) => setScannerName(e.target.value)}
                          placeholder="Ingresa tu nombre"
                          className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Observación (opcional)</label>
                        <textarea
                          value={scannerObservation}
                          onChange={(e) => setScannerObservation(e.target.value)}
                          placeholder="Notas adicionales..."
                          rows={2}
                          className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setDetectedArea(null); setScannerName(''); setScannerObservation(''); }}
                          className="flex-1 py-3 bg-[#102218] border border-white/10 text-slate-400 rounded-xl font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleRegisterAttendance}
                          disabled={!scannerName.trim() || loading}
                          className="flex-1 py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold disabled:opacity-50"
                        >
                          {loading ? 'Registrando...' : 'Registrar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative aspect-square max-h-64 bg-[#102218] rounded-xl overflow-hidden">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          autoPlay
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {!isScanning && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-[#102218]">
                            <div className="size-16 rounded-full bg-[#13ec6d]/20 flex items-center justify-center mx-auto">
                              <span className="material-symbols-outlined text-[#13ec6d] text-3xl">qr_code_scanner</span>
                            </div>
                            <p className="text-slate-400 text-sm">Presiona el botón para iniciar el escáner</p>
                          </div>
                        )}

                        {isScanning && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 w-12 h-12 border-l-3 border-t-3 border-[#13ec6d] rounded-tl-lg" />
                            <div className="absolute top-4 right-4 w-12 h-12 border-r-3 border-t-3 border-[#13ec6d] rounded-tr-lg" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 border-l-3 border-b-3 border-[#13ec6d] rounded-bl-lg" />
                            <div className="absolute bottom-4 right-4 w-12 h-12 border-r-3 border-b-3 border-[#13ec6d] rounded-br-lg" />
                          </div>
                        )}
                      </div>

                      {scannerError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                          <p className="text-red-400 text-sm text-center">{scannerError}</p>
                        </div>
                      )}

                      <button
                        onClick={isScanning ? stopScanner : startScanner}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          isScanning 
                            ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                            : 'bg-[#13ec6d] text-[#102218]'
                        }`}
                      >
                        <span className="material-symbols-outlined">{isScanning ? 'stop' : 'qr_code_scanner'}</span>
                        {isScanning ? 'Detener' : 'Iniciar Escáner'}
                      </button>

                      {isScanning && (
                        <div className="flex items-center justify-center gap-2">
                          <span className="size-2 bg-[#13ec6d] rounded-full animate-pulse" />
                          <span className="text-[#13ec6d] text-sm font-medium">Escaneando...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ============================================================================
  // RENDER: LOGIN / REGISTER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#102218] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-4 text-center">
        <div className="relative inline-block">
          <img 
            src="/biomov-logo.jpg" 
            alt="BIOMOV" 
            className="w-20 h-20 rounded-full border-4 border-[#13ec6d]/40 object-cover mx-auto"
          />
          <div className="absolute -bottom-1 -right-1 size-4 bg-[#13ec6d] rounded-full border-3 border-[#102218] animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-[#13ec6d] mt-3 tracking-wider">{t.title}</h1>
        <p className="text-[#92c9a9] text-xs mt-1">{t.subtitle}</p>
      </div>

      {/* Login/Register Card */}
      <div className="w-full max-w-sm bg-[#193324] rounded-2xl border border-[#13ec6d]/20 p-5 shadow-xl">
        {/* Tabs */}
        <div className="flex bg-[#102218] rounded-xl p-1 mb-4">
          <button
            onClick={() => { setMode('login'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
              mode === 'login' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.login}
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
              mode === 'register' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.register}
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-lg p-3 text-[#13ec6d] text-sm text-center">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,109,0.3)] disabled:opacity-50"
            >
              {loading ? 'Cargando...' : t.loginBtn}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.fullName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.dni}</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="12345678"
                className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[#92c9a9] font-medium mb-1 block">{t.confirmPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full px-4 py-2.5 bg-[#102218] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-[#13ec6d] focus:outline-none"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-lg p-3 text-[#13ec6d] text-sm text-center">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,109,0.3)] disabled:opacity-50"
            >
              {loading ? 'Registrando...' : t.registerBtn}
            </button>
          </form>
        )}
      </div>

      <p className="text-slate-600 text-xs mt-4">
        © 2025 BIOMOV • Entrenamiento Inteligente
      </p>
    </div>
  )
}
