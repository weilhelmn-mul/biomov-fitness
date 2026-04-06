'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Importar el dashboard de forma dinámica para evitar problemas de SSR
const IsometricStrengthDashboard = dynamic(
  () => import('@/components/strength/IsometricStrengthDashboard'),
  { ssr: false }
)

// Tipos
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
// PAGE COMPONENT - DEMO MODE
// ============================================================================
export default function DemoPage() {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [indiceGlobal, setIndiceGlobal] = useState<IndiceGlobal | null>(null)
  const [musculosData, setMusculosData] = useState<any[]>([])

  const userData = {
    id: 'demo-user-001',
    email: 'demo@biomov.com',
    name: 'Usuario Demo'
  }

  // Guardar evaluación en Supabase
  const handleSave = useCallback(async (musculos: any[], indice: IndiceGlobal, desequilibrios: any[]) => {
    setSaving(true)
    setSaveMessage(null)
    
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
        setSaveMessage({ 
          type: 'success', 
          text: `${data.count} evaluaciones guardadas en Supabase` 
        })
      } else {
        setSaveMessage({ 
          type: 'error', 
          text: data.error || 'Error al guardar' 
        })
      }
    } catch (error) {
      console.error('Error saving evaluation:', error)
      setSaveMessage({ 
        type: 'error', 
        text: 'Error de conexion' 
      })
    } finally {
      setSaving(false)
    }
  }, [])

  const handleIndiceChange = useCallback((indice: IndiceGlobal) => {
    setIndiceGlobal(indice)
  }, [])

  return (
    <div className="min-h-screen bg-[#102218]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#102218]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Icon name="arrow_back" className="text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Demo - Fuerza Isometrica</h1>
              <p className="text-xs text-slate-400">{userData.email}</p>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#13ec6d]/10 to-[#00f0ff]/10 rounded-2xl p-4 border border-[#13ec6d]/20 mb-6">
          <div className="flex items-start gap-3">
            <Icon name="science" className="text-[#00f0ff] text-xl" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Modo Demostracion - Integracion Supabase
              </h3>
              <p className="text-xs text-slate-400">
                Prueba la evaluacion de fuerza isometrica sin Arduino. Los datos se guardan en Supabase.
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
                  <h3 className="text-sm font-bold text-white">Indice de Fuerza Global</h3>
                  <p className="text-xs text-slate-400">
                    Simetria: {indiceGlobal.simetriaGeneral}%
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
          userId={userData.id}
          onIndiceChange={handleIndiceChange}
        />

        {/* Save Status Message */}
        {saveMessage && (
          <div className={`mt-6 p-4 rounded-2xl border ${
            saveMessage.type === 'success' 
              ? 'bg-[#13ec6d]/10 border-[#13ec6d]/30 text-[#13ec6d]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              <Icon name={saveMessage.type === 'success' ? 'check_circle' : 'error'} />
              <span className="text-sm font-medium">{saveMessage.text}</span>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#13ec6d] transition-colors text-sm"
          >
            <Icon name="home" />
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
