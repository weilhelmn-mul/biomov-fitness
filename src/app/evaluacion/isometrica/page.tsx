'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Importar el dashboard de forma dinámica para evitar problemas de SSR
const IsometricStrengthDashboard = dynamic(
  () => import('@/components/strength/IsometricStrengthDashboard'),
  { ssr: false }
)

// Tipos
interface UserData {
  id: string
  email: string
  name: string
  rol: string
}

interface MuscleData {
  id: string
  nombre: string
  fuerza: { R: number; L: number }
}

interface IndiceGlobal {
  valor: number
  trenSuperior: number
  core: number
  trenInferior: number
  simetriaGeneral: number
}

// ============================================================================
// ICON COMPONENT
// ============================================================================
function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================
export default function EvaluacionIsometricaPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [musculosData, setMusculosData] = useState<MuscleData[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [indiceGlobal, setIndiceGlobal] = useState<IndiceGlobal | null>(null)

  // Verificar autenticación
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('biomov_user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        // Si no hay ID de usuario, redirigir a login
        if (!user.id) {
          router.push('/auth/login')
          return
        }
        setUserData({
          id: user.id,
          email: user.email,
          name: user.nombre_completo || user.name,
          rol: user.rol || 'paciente'
        })
      } else {
        router.push('/auth/login')
        return
      }
    } catch (error) {
      console.error('Error reading user:', error)
      router.push('/auth/login')
      return
    }
    setLoading(false)
  }, [router])

  // Cargar datos existentes del usuario
  useEffect(() => {
    if (!userData?.id) return

    const fetchIsometricData = async () => {
      try {
        const response = await fetch(`/api/isometric?userId=${userData.id}`)
        const data = await response.json()

        if (data.success && data.musculos && data.musculos.length > 0) {
          setMusculosData(data.musculos)
        }
      } catch (error) {
        console.error('Error loading isometric data:', error)
      }
    }

    fetchIsometricData()
  }, [userData?.id])

  // Guardar evaluación
  const handleSave = useCallback(async (musculos: any[], indice: IndiceGlobal, desequilibrios: any[]) => {
    if (!userData?.id) return

    setSaving(true)
    try {
      const response = await fetch('/api/isometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id,
          musculos: musculos.map(m => ({ id: m.id, fuerza: m.fuerza })),
          indiceGlobal: indice,
          desequilibrios
        })
      })

      const data = await response.json()
      if (data.success) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Error saving evaluation:', error)
    } finally {
      setSaving(false)
    }
  }, [userData?.id])

  const handleLogout = () => {
    localStorage.removeItem('biomov_user')
    router.push('/auth/login')
  }

  const handleIndiceChange = useCallback((indice: IndiceGlobal) => {
    setIndiceGlobal(indice)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#102218] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Icon name="sync" className="text-4xl text-[#13ec6d] animate-spin" />
          <span className="text-slate-400">Cargando evaluación...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#102218]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#102218]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Icon name="arrow_back" className="text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Evaluación Isométrica</h1>
              <p className="text-xs text-slate-400">
                {userData?.name || 'Usuario'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-[10px] text-[#13ec6d]">
                Guardado: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {saving && (
              <span className="text-[10px] text-[#f59e0b] flex items-center gap-1">
                <Icon name="sync" className="text-xs animate-spin" />
                Guardando...
              </span>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#13ec6d]/10 to-[#00f0ff]/10 rounded-2xl p-4 border border-[#13ec6d]/20 mb-6">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-[#00f0ff] text-xl" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Sistema de Evaluación de Fuerza Isométrica
              </h3>
              <p className="text-xs text-slate-400">
                Evalúa la fuerza isométrica máxima por grupo muscular, detecta desequilibrios 
                entre lado derecho e izquierdo, y obtén un Índice Global de Fuerza Isométrica.
              </p>
            </div>
          </div>
        </div>

        {/* Índice Global Summary Card */}
        {indiceGlobal && (
          <div className="bg-[#193324] rounded-2xl p-4 border border-white/10 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#13ec6d]">
                    {indiceGlobal.valor}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Índice de Fuerza Isométrica Global</h3>
                  <p className="text-xs text-slate-400">
                    Simetría: {indiceGlobal.simetriaGeneral}%
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-[#ef4444]">{indiceGlobal.trenSuperior}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Superior</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-[#13ec6d]">{indiceGlobal.core}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Core</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-[#3b82f6]">{indiceGlobal.trenInferior}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Inferior</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Component */}
        <IsometricStrengthDashboard
          userId={userData?.id}
          onIndiceChange={handleIndiceChange}
        />

        {/* Back Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-[#193324] border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-[#13ec6d]/30 transition-all"
          >
            <Icon name="home" />
            <span className="font-bold">Volver al Inicio</span>
          </button>
        </div>
      </main>
    </div>
  )
}
