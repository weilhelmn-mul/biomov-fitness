'use client'

import { useState, useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface UserMetric {
  id: string
  email: string
  nombre: string
  rol: string
  activo: boolean
  creado: string
  genero: string | null
  edad: number | null
  imc: number | null
  peso: number | null
  altura: number | null
  fcMax: number | null
  fcReposo: number | null
  rmBench: number | null
  rmSquat: number | null
  rmDeadlift: number | null
  rmOverhead: number | null
  rmRow: number | null
  rmTotal: number
  objetivo: string | null
  nivelExperiencia: string | null
  disciplina: string | null
  totalEvaluaciones: number
}

interface Overview {
  totalUsers: number
  totalEvaluations: number
  avgIMC: string | null
  avgVDOT: string | null
  avgRMTotal: number | null
  objectivesDistribution: Record<string, number>
  levelsDistribution: Record<string, number>
  genderDistribution: Record<string, number>
}

interface RankingUser {
  userId: string
  nombre: string
  email: string
  rol: string
  genero: string | null
  edad: number | null
  peso: number | null
  imc: number | null
  nivel: string | null
  objetivo: string | null
  rm: {
    bench: number
    squat: number
    deadlift: number
    overhead: number
    row: number
    total: number
  }
  wilksScore: number | null
  vdot: number | null
  fcReposo: number | null
  totalEvaluaciones: number
}

interface Rankings {
  byStrength: RankingUser[]
  byRelativeStrength: RankingUser[]
  byVDOT: RankingUser[]
  byBench: RankingUser[]
  bySquat: RankingUser[]
  byDeadlift: RankingUser[]
  byEvaluations: RankingUser[]
  byFCReposo: RankingUser[]
}

interface Alert {
  id: string
  user_id: string
  user_name: string
  tipo_alerta: string
  severidad: string
  titulo: string
  mensaje: string
  created_at: string
}

// ============================================================================
// ICON COMPONENT
// ============================================================================

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ProgressBar({ value, max, color = 'green' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const colors = {
    green: 'from-[#13ec6d] to-[#00f0ff]',
    orange: 'from-[#f59e0b] to-[#ef4444]',
    purple: 'from-[#8b5cf6] to-[#ec4899]',
    blue: 'from-[#00f0ff] to-[#3b82f6]',
  }
  return (
    <div className="h-2 bg-[#102218] rounded-full overflow-hidden">
      <div 
        className={`h-full bg-gradient-to-r ${colors[color as keyof typeof colors]} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

function MedalIcon({ position }: { position: number }) {
  const colors = {
    1: 'text-yellow-400',
    2: 'text-slate-300',
    3: 'text-amber-600',
  }
  const icons = {
    1: 'emoji_events',
    2: 'military_tech',
    3: 'workspace_premium',
  }
  if (position > 3) return null
  return (
    <Icon 
      name={icons[position as keyof typeof icons]} 
      className={`${colors[position as keyof typeof colors]} text-lg`}
    />
  )
}

function StatCard({ icon, label, value, subValue, color = 'green' }: { 
  icon: string
  label: string
  value: string | number
  subValue?: string
  color?: string
}) {
  const colors: Record<string, string> = {
    green: 'text-[#13ec6d]',
    cyan: 'text-[#00f0ff]',
    orange: 'text-[#f59e0b]',
    purple: 'text-[#8b5cf6]',
    red: 'text-red-400',
    pink: 'text-pink-400',
  }
  return (
    <div className="bg-[#193324] rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} className={colors[color]} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  )
}

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================

export default function AdminDashboard({ lang }: { lang: 'es' | 'en' }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'comparison' | 'alerts'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [users, setUsers] = useState<UserMetric[]>([])
  const [rankings, setRankings] = useState<Rankings | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<any>(null)
  const [comparisonUsers, setComparisonUsers] = useState<string[]>([])

  const texts = {
    es: {
      title: 'Panel de Administración',
      subtitle: 'Dashboard comparativo de usuarios',
      tabs: { overview: 'Resumen', users: 'Usuarios', comparison: 'Comparativas', alerts: 'Alertas' },
      stats: {
        totalUsers: 'Total Usuarios',
        totalEvals: 'Total Evaluaciones',
        avgIMC: 'IMC Promedio',
        avgVDOT: 'VDOT Promedio',
        avgRM: 'RM Total Promedio',
      },
      rankings: {
        strength: 'Ranking Fuerza Total',
        relativeStrength: 'Fuerza Relativa (Wilks)',
        vdot: 'VDOT (Resistencia)',
        bench: 'Bench Press',
        squat: 'Sentadilla',
        deadlift: 'Peso Muerto',
        evaluations: 'Evaluaciones',
        fcReposo: 'FC Reposo (Mejor)',
      },
      labels: {
        kg: 'kg',
        sessions: 'sesiones',
        noData: 'Sin datos',
        loading: 'Cargando...',
        viewDetail: 'Ver Detalle',
        compare: 'Comparar',
        selectToCompare: 'Selecciona usuarios para comparar',
      },
      objectives: {
        fuerza: 'Fuerza',
        hipertrofia: 'Hipertrofia',
        resistencia: 'Resistencia',
        salud: 'Salud',
        perdida_peso: 'Pérdida de Peso',
        perdida_grasa: 'Pérdida de Grasa',
        rendimiento: 'Rendimiento',
      },
      levels: {
        principiante: 'Principiante',
        intermedio: 'Intermedio',
        avanzado: 'Avanzado',
      },
      distribution: {
        objectives: 'Distribución por Objetivo',
        levels: 'Distribución por Nivel',
        gender: 'Distribución por Género',
      },
    },
    en: {
      title: 'Admin Panel',
      subtitle: 'User comparison dashboard',
      tabs: { overview: 'Overview', users: 'Users', comparison: 'Comparisons', alerts: 'Alerts' },
      stats: {
        totalUsers: 'Total Users',
        totalEvals: 'Total Evaluations',
        avgIMC: 'Avg BMI',
        avgVDOT: 'Avg VDOT',
        avgRM: 'Avg Total RM',
      },
      rankings: {
        strength: 'Total Strength Ranking',
        relativeStrength: 'Relative Strength (Wilks)',
        vdot: 'VDOT (Endurance)',
        bench: 'Bench Press',
        squat: 'Squat',
        deadlift: 'Deadlift',
        evaluations: 'Evaluations',
        fcReposo: 'Resting HR (Best)',
      },
      labels: {
        kg: 'kg',
        sessions: 'sessions',
        noData: 'No data',
        loading: 'Loading...',
        viewDetail: 'View Detail',
        compare: 'Compare',
        selectToCompare: 'Select users to compare',
      },
      objectives: {
        fuerza: 'Strength',
        hipertrofia: 'Hypertrophy',
        resistencia: 'Endurance',
        salud: 'Health',
        perdida_peso: 'Weight Loss',
        perdida_grasa: 'Fat Loss',
        rendimiento: 'Performance',
      },
      levels: {
        principiante: 'Beginner',
        intermedio: 'Intermediate',
        avanzado: 'Advanced',
      },
      distribution: {
        objectives: 'Distribution by Objective',
        levels: 'Distribution by Level',
        gender: 'Gender Distribution',
      },
    },
  }

  const t = texts[lang]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'comparison' && !rankings) {
      loadComparisons()
    }
    if (activeTab === 'alerts' && alerts.length === 0) {
      loadAlerts()
    }
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, usersRes] = await Promise.all([
        fetch('/api/admin/dashboard?type=overview'),
        fetch('/api/admin/dashboard?type=users'),
      ])
      
      const overviewData = await overviewRes.json()
      const usersData = await usersRes.json()
      
      if (overviewData.success) setOverview(overviewData.overview)
      if (usersData.success) setUsers(usersData.users || [])
    } catch (error: any) {
      setError('Error de conexión: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadComparisons = async () => {
    try {
      const res = await fetch('/api/admin/dashboard?type=comparisons')
      const data = await res.json()
      if (data.success) {
        setRankings(data.rankings)
      }
    } catch (error) {
      console.error('Error loading comparisons:', error)
    }
  }

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/admin/dashboard?type=alerts')
      const data = await res.json()
      if (data.success) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
  }

  const loadUserDetail = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/dashboard?type=user-detail&userId=${userId}`)
      const data = await res.json()
      if (data.success) {
        setUserDetail(data)
        setSelectedUser(userId)
      }
    } catch (error) {
      console.error('Error loading user detail:', error)
    }
  }

  const exportUserToExcel = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/export`)
      if (!response.ok) throw new Error('Error al exportar')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuario_${userId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting user:', error)
      alert('Error al exportar usuario')
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${userName}"?`)) return
    try {
      const response = await fetch(`/api/users/${userId}/approve`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setUsers(users.filter(u => u.id !== userId))
        alert('Usuario eliminado correctamente')
      }
    } catch (error: any) {
      alert(error.message || 'Error al eliminar usuario')
    }
  }

  const getObjectiveLabel = (obj: string | null) => 
    obj && t.objectives[obj as keyof typeof t.objectives] ? t.objectives[obj as keyof typeof t.objectives] : obj || '---'
  
  const getLevelLabel = (level: string | null) =>
    level && t.levels[level as keyof typeof t.levels] ? t.levels[level as keyof typeof t.levels] : level || '---'

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500/30 text-red-400'
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
      default: return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    }
  }

  const toggleCompareUser = (userId: string) => {
    setComparisonUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : prev.length < 4 ? [...prev, userId] : prev
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="sync" className="text-4xl text-[#13ec6d] animate-spin" />
        <span className="ml-3 text-slate-400">{t.labels.loading}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <Icon name="error" className="text-red-400 text-2xl" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-5 border border-[#13ec6d]/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center">
            <Icon name="admin_panel_settings" className="text-[#13ec6d] text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.title}</h2>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10">
        {(['overview', 'users', 'comparison', 'alerts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab 
                ? 'bg-[#13ec6d] text-[#102218]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon name={
              tab === 'overview' ? 'dashboard' :
              tab === 'users' ? 'group' :
              tab === 'comparison' ? 'leaderboard' :
              'notifications_active'
            } className="text-sm" />
            {t.tabs[tab]}
          </button>
        ))}
      </div>

      {/* ======================== OVERVIEW TAB ======================== */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon="group" label={t.stats.totalUsers} value={overview.totalUsers} color="green" />
            <StatCard icon="assessment" label={t.stats.totalEvals} value={overview.totalEvaluations} color="cyan" />
            <StatCard icon="monitor_weight" label={t.stats.avgIMC} value={overview.avgIMC || '--'} subValue="índice" color="orange" />
            <StatCard icon="speed" label={t.stats.avgVDOT} value={overview.avgVDOT || '--'} subValue="VO2max estimado" color="purple" />
            <StatCard icon="fitness_center" label={t.stats.avgRM} value={overview.avgRMTotal ? `${overview.avgRMTotal} kg` : '--'} subValue="5 ejercicios" color="green" />
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Objectives */}
            <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="flag" className="text-[#13ec6d]" />
                {t.distribution.objectives}
              </h3>
              <div className="space-y-2">
                {Object.entries(overview.objectivesDistribution).map(([obj, count]) => {
                  const total = Object.values(overview.objectivesDistribution).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? ((count as number) / total * 100).toFixed(0) : 0
                  return (
                    <div key={obj} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 truncate">{getObjectiveLabel(obj)}</span>
                      <div className="flex-1">
                        <ProgressBar value={count as number} max={total} color="green" />
                      </div>
                      <span className="text-xs text-white font-bold w-8">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Levels */}
            <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="speed" className="text-[#00f0ff]" />
                {t.distribution.levels}
              </h3>
              <div className="space-y-2">
                {Object.entries(overview.levelsDistribution).map(([level, count]) => {
                  const total = Object.values(overview.levelsDistribution).reduce((a, b) => a + b, 0)
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 truncate">{getLevelLabel(level)}</span>
                      <div className="flex-1">
                        <ProgressBar value={count as number} max={total} color="orange" />
                      </div>
                      <span className="text-xs text-white font-bold w-8">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gender */}
            <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="wc" className="text-pink-400" />
                {t.distribution.gender}
              </h3>
              <div className="space-y-2">
                {Object.entries(overview.genderDistribution).map(([gender, count]) => {
                  const total = Object.values(overview.genderDistribution).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? ((count as number) / total * 100).toFixed(0) : 0
                  return (
                    <div key={gender} className="flex items-center justify-between p-2 bg-[#102218] rounded-lg">
                      <span className="text-xs text-slate-400 capitalize">{gender}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{count}</span>
                        <span className="text-xs text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Users Preview */}
          <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Icon name="group" className="text-[#13ec6d]" />
                Usuarios Recientes
              </h3>
              <button onClick={() => setActiveTab('users')} className="text-xs text-[#00f0ff] hover:underline">
                Ver todos →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.slice(0, 6).map((user) => (
                <div key={user.id} className="bg-[#102218] rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#13ec6d]/20 flex items-center justify-center shrink-0">
                    <Icon name="person" className="text-[#13ec6d]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{user.nombre || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        user.rol === 'superadmin' || user.rol === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                        user.rol === 'entrenador' ? 'bg-[#13ec6d]/20 text-[#13ec6d]' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {user.rol}
                      </span>
                      {user.rmTotal > 0 && (
                        <span className="text-[10px] text-[#f59e0b]">{user.rmTotal} kg RM</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================== USERS TAB ======================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-[#193324] rounded-xl p-3 border border-white/5 text-sm text-slate-300">
            <Icon name="info" className="text-[#00f0ff] align-middle mr-2" />
            {users.length} usuarios registrados
          </div>
          
          <div className="bg-[#193324] rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-[#102218]">
                    <th className="text-left p-3 text-xs text-slate-400 font-medium">Usuario</th>
                    <th className="text-center p-3 text-xs text-slate-400 font-medium">Datos</th>
                    <th className="text-center p-3 text-xs text-slate-400 font-medium">Fuerza (RM)</th>
                    <th className="text-center p-3 text-xs text-slate-400 font-medium">Nivel</th>
                    <th className="text-center p-3 text-xs text-slate-400 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-[#102218]/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#13ec6d]/20 flex items-center justify-center">
                            <Icon name="person" className="text-[#13ec6d] text-sm" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{user.nombre || 'Sin nombre'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-xs">
                          <p className="text-slate-400">Edad: <span className="text-white">{user.edad || '--'}</span></p>
                          <p className="text-slate-400">IMC: <span className="text-white">{user.imc?.toFixed(1) || '--'}</span></p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-xs">
                          <p className="text-[#13ec6d] font-bold">{user.rmTotal} kg</p>
                          <p className="text-slate-500">B:{user.rmBench || 0} S:{user.rmSquat || 0} D:{user.rmDeadlift || 0}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.nivelExperiencia === 'avanzado' ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' :
                          user.nivelExperiencia === 'intermedio' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {getLevelLabel(user.nivelExperiencia)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => user.id && exportUserToExcel(user.id)}
                            className="p-1.5 text-[#00f0ff] hover:bg-[#00f0ff]/20 rounded transition-all"
                            title="Exportar"
                          >
                            <Icon name="download" className="text-lg" />
                          </button>
                          <button
                            onClick={() => user.id && deleteUser(user.id, user.nombre || 'Usuario')}
                            className="p-1.5 text-red-400 hover:bg-red-400/20 rounded transition-all"
                            title="Eliminar"
                          >
                            <Icon name="delete" className="text-lg" />
                          </button>
                          <button
                            onClick={() => user.id && loadUserDetail(user.id)}
                            className="px-2 py-1 text-xs bg-[#13ec6d]/20 text-[#13ec6d] rounded hover:bg-[#13ec6d]/30"
                          >
                            {t.labels.viewDetail}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================== COMPARISON TAB ======================== */}
      {activeTab === 'comparison' && rankings && (
        <div className="space-y-6">
          {/* Rankings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fuerza Total */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="fitness_center" className="text-[#13ec6d]" />
                {t.rankings.strength}
              </h3>
              <div className="space-y-2">
                {rankings.byStrength.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#13ec6d] font-bold text-sm">{user.rm.total}</span>
                      <span className="text-xs text-slate-500 ml-1">kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VDOT */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="speed" className="text-[#f59e0b]" />
                {t.rankings.vdot}
              </h3>
              <div className="space-y-2">
                {rankings.byVDOT.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <span className="text-[#f59e0b] font-bold text-sm">VDOT {user.vdot?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bench Press */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="weight" className="text-[#8b5cf6]" />
                {t.rankings.bench}
              </h3>
              <div className="space-y-2">
                {rankings.byBench.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <span className="text-[#8b5cf6] font-bold text-sm">{user.rm.bench} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentadilla */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="accessibility_new" className="text-pink-400" />
                {t.rankings.squat}
              </h3>
              <div className="space-y-2">
                {rankings.bySquat.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <span className="text-pink-400 font-bold text-sm">{user.rm.squat} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Peso Muerto */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="front_hand" className="text-[#00f0ff]" />
                {t.rankings.deadlift}
              </h3>
              <div className="space-y-2">
                {rankings.byDeadlift.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <span className="text-[#00f0ff] font-bold text-sm">{user.rm.deadlift} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fuerza Relativa */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="balance" className="text-green-400" />
                {t.rankings.relativeStrength}
              </h3>
              <div className="space-y-2">
                {rankings.byRelativeStrength.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 font-bold text-sm">{user.wilksScore?.toFixed(1)}</span>
                      <span className="text-xs text-slate-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluaciones */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="assessment" className="text-cyan-400" />
                {t.rankings.evaluations}
              </h3>
              <div className="space-y-2">
                {rankings.byEvaluations.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <span className="text-cyan-400 font-bold text-sm">{user.totalEvaluaciones}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FC Reposo */}
            <div className="bg-[#193324] rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Icon name="favorite" className="text-red-400" />
                {t.rankings.fcReposo}
              </h3>
              <div className="space-y-2">
                {rankings.byFCReposo.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between bg-[#102218] rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm truncate max-w-[80px]">{user.nombre}</span>
                    </div>
                    <span className="text-red-400 font-bold text-sm">{user.fcReposo} bpm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== ALERTS TAB ======================== */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-[#193324] rounded-2xl p-8 border border-white/5 text-center">
              <Icon name="check_circle" className="text-4xl text-[#13ec6d] mb-2" />
              <p className="text-slate-400">No hay alertas pendientes</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`bg-[#193324] rounded-xl p-4 border ${getAlertColor(alert.severidad)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white">{alert.titulo}</h4>
                    <p className="text-sm text-slate-300 mt-1">{alert.mensaje}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Usuario: {alert.user_name}
                    </p>
                  </div>
                  <Icon name={
                    alert.severidad === 'critical' ? 'error' :
                    alert.severidad === 'warning' ? 'warning' :
                    'info'
                  } className="text-2xl" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================== USER DETAIL MODAL ======================== */}
      {selectedUser && userDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#193324] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#13ec6d]/30">
            <div className="sticky top-0 bg-[#193324] border-b border-white/10 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {userDetail.user?.nombre_completo || userDetail.user?.email || 'Usuario'}
              </h3>
              <button
                onClick={() => { setSelectedUser(null); setUserDetail(null) }}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#102218] rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">Edad</p>
                  <p className="text-lg font-bold text-white">
                    {userDetail.user?.fecha_nacimiento 
                      ? Math.floor((Date.now() - new Date(userDetail.user.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                      : '--'}
                  </p>
                </div>
                <div className="bg-[#102218] rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">IMC</p>
                  <p className="text-lg font-bold text-[#13ec6d]">{userDetail.user?.imc?.toFixed(1) || '--'}</p>
                </div>
                <div className="bg-[#102218] rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">RM Total</p>
                  <p className="text-lg font-bold text-[#f59e0b]">{userDetail.stats?.rmTotal || 0} kg</p>
                </div>
                <div className="bg-[#102218] rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">VDOT</p>
                  <p className="text-lg font-bold text-[#8b5cf6]">{userDetail.stats?.maxVDOT?.toFixed(1) || '--'}</p>
                </div>
              </div>
              
              {/* Strength */}
              <div className="bg-[#102218] rounded-xl p-4">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Icon name="fitness_center" className="text-[#13ec6d]" />
                  Records Personales (1RM)
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: 'Bench', value: userDetail.user?.rm_bench_press },
                    { label: 'Squat', value: userDetail.user?.rm_squat },
                    { label: 'Deadlift', value: userDetail.user?.rm_deadlift },
                    { label: 'Overhead', value: userDetail.user?.rm_overhead_press },
                    { label: 'Row', value: userDetail.user?.rm_barbell_row },
                  ].map((rm) => (
                    <div key={rm.label} className="text-center p-2 bg-[#193324] rounded-lg">
                      <p className="text-xs text-slate-400">{rm.label}</p>
                      <p className="text-sm font-bold text-white">{rm.value || 0} kg</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Evaluations */}
              {userDetail.evaluations?.length > 0 && (
                <div className="bg-[#102218] rounded-xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Icon name="assessment" className="text-[#00f0ff]" />
                    Últimas Evaluaciones ({userDetail.evaluations.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDetail.evaluations.slice(0, 5).map((e: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-[#193324] rounded">
                        <span className="text-xs text-slate-400">
                          {new Date(e.fecha_evaluacion).toLocaleDateString()} - {e.tipo_evaluacion || 'General'}
                        </span>
                        <div className="flex gap-3 text-xs">
                          {e.vdot && <span className="text-[#f59e0b]">VDOT {e.vdot.toFixed(1)}</span>}
                          {e.fuerza_maxima_kg && <span className="text-[#13ec6d]">{e.fuerza_maxima_kg} kg</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
