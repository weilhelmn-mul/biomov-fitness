'use client'

import { useState, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface UserProfile {
  id?: string
  user_id: string
  nombre_completo: string
  fecha_nacimiento: string
  altura_cm: number
  peso_kg: number
  imc: number | null
  edad: number | null
  fc_maxima: number
  fc_reposo: number
  vfc_media: number | null
  unidades_metricas: boolean
  nivel_experiencia: 'principiante' | 'intermedio' | 'avanzado'
  objetivo: 'fuerza' | 'hipertrofia' | 'resistencia' | 'salud' | 'perdida_peso'
  rm_bench_press: number | null
  rm_squat: number | null
  rm_deadlift: number | null
  rm_overhead_press: number | null
  rm_barbell_row: number | null
}

interface ProfilePageProps {
  lang: 'es' | 'en'
  userId: string
  onProfileUpdate?: (profile: UserProfile) => void
}

// ============================================================================
// ICON COMPONENT
// ============================================================================

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}

// ============================================================================
// PROFILE PAGE COMPONENT
// ============================================================================

export default function ProfilePage({ lang, userId, onProfileUpdate }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile>({
    user_id: userId,
    nombre_completo: '',
    fecha_nacimiento: '',
    altura_cm: 175,
    peso_kg: 70,
    imc: null,
    edad: null,
    fc_maxima: 185,
    fc_reposo: 60,
    vfc_media: null,
    unidades_metricas: true,
    nivel_experiencia: 'intermedio',
    objetivo: 'salud',
    rm_bench_press: null,
    rm_squat: null,
    rm_deadlift: null,
    rm_overhead_press: null,
    rm_barbell_row: null,
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<'personal' | 'cardio' | 'records'>('personal')

  // ============================================================================
  // TEXTS
  // ============================================================================

  const texts = {
    es: {
      title: 'Mi Perfil',
      subtitle: 'Datos personales y métricas',
      
      // Sections
      personal: 'Datos Personales',
      cardio: 'Métricas Cardíacas',
      records: 'Records Personales',
      
      // Personal data
      nombre: 'Nombre Completo',
      fechaNacimiento: 'Fecha de Nacimiento',
      altura: 'Altura (cm)',
      peso: 'Peso (kg)',
      imc: 'IMC',
      edad: 'Edad',
      años: 'años',
      
      // Cardio
      fcMaxima: 'FC Máxima',
      fcReposo: 'FC Reposo',
      vfcMedia: 'VFC Media',
      bpm: 'lpm',
      ms: 'ms',
      
      // Preferences
      preferencias: 'Preferencias',
      unidades: 'Unidades',
      metricas: 'Métricas (kg/cm)',
      imperiales: 'Imperiales (lb/in)',
      nivel: 'Nivel de Experiencia',
      principiante: 'Principiante',
      intermedio: 'Intermedio',
      avanzado: 'Avanzado',
      objetivo: 'Objetivo Principal',
      fuerza: 'Fuerza',
      hipertrofia: 'Hipertrofia',
      resistencia: 'Resistencia',
      salud: 'Salud General',
      perdidaPeso: 'Pérdida de Peso',
      
      // Records
      rmBenchPress: 'Press de Banca (1RM)',
      rmSquat: 'Sentadilla (1RM)',
      rmDeadlift: 'Peso Muerto (1RM)',
      rmOverheadPress: 'Press Militar (1RM)',
      rmBarbellRow: 'Remo con Barra (1RM)',
      kg: 'kg',
      noRegistrado: 'No registrado',
      
      // Actions
      guardar: 'Guardar Cambios',
      guardando: 'Guardando...',
      guardado: '¡Guardado!',
      cargarPerfil: 'Cargando perfil...',
      
      // IMC categories
      imcBajo: 'Bajo peso',
      imcNormal: 'Peso normal',
      imcSobrepeso: 'Sobrepeso',
      imcObesidad: 'Obesidad',
      
      // HR Zones info
      zonasFC: 'Zonas de FC Calculadas',
      z1: 'Z1 Recuperación',
      z2: 'Z2 Aeróbico',
      z3: 'Z3 Tempo',
      z4: 'Z4 Umbral',
      z5: 'Z5 VO2max',
    },
    en: {
      title: 'My Profile',
      subtitle: 'Personal data and metrics',
      
      // Sections
      personal: 'Personal Data',
      cardio: 'Cardiac Metrics',
      records: 'Personal Records',
      
      // Personal data
      nombre: 'Full Name',
      fechaNacimiento: 'Date of Birth',
      altura: 'Height (cm)',
      peso: 'Weight (kg)',
      imc: 'BMI',
      edad: 'Age',
      años: 'years',
      
      // Cardio
      fcMaxima: 'Max HR',
      fcReposo: 'Resting HR',
      vfcMedia: 'Average HRV',
      bpm: 'bpm',
      ms: 'ms',
      
      // Preferences
      preferencias: 'Preferences',
      unidades: 'Units',
      metricas: 'Metric (kg/cm)',
      imperiales: 'Imperial (lb/in)',
      nivel: 'Experience Level',
      principiante: 'Beginner',
      intermedio: 'Intermediate',
      avanzado: 'Advanced',
      objetivo: 'Main Goal',
      fuerza: 'Strength',
      hipertrofia: 'Hypertrophy',
      resistencia: 'Endurance',
      salud: 'General Health',
      perdidaPeso: 'Weight Loss',
      
      // Records
      rmBenchPress: 'Bench Press (1RM)',
      rmSquat: 'Squat (1RM)',
      rmDeadlift: 'Deadlift (1RM)',
      rmOverheadPress: 'Overhead Press (1RM)',
      rmBarbellRow: 'Barbell Row (1RM)',
      kg: 'kg',
      noRegistrado: 'Not registered',
      
      // Actions
      guardar: 'Save Changes',
      guardando: 'Saving...',
      guardado: 'Saved!',
      cargarPerfil: 'Loading profile...',
      
      // IMC categories
      imcBajo: 'Underweight',
      imcNormal: 'Normal weight',
      imcSobrepeso: 'Overweight',
      imcObesidad: 'Obesity',
      
      // HR Zones info
      zonasFC: 'Calculated HR Zones',
      z1: 'Z1 Recovery',
      z2: 'Z2 Aerobic',
      z3: 'Z3 Tempo',
      z4: 'Z4 Threshold',
      z5: 'Z5 VO2max',
    },
  }

  const t = texts[lang]

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadProfile()
  }, [userId])

  // ============================================================================
  // FUNCTIONS
  // ============================================================================

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setProfile(prev => ({ ...prev, ...data.profile }))
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        if (onProfileUpdate && data.profile) {
          onProfileUpdate(data.profile)
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  // ============================================================================
  // CALCULATED VALUES
  // ============================================================================

  const calculatedIMC = (): number | null => {
    if (!profile.altura_cm || !profile.peso_kg) return null
    return Number((profile.peso_kg / Math.pow(profile.altura_cm / 100, 2)).toFixed(2))
  }

  const calculatedAge = (): number | null => {
    if (!profile.fecha_nacimiento) return null
    const birth = new Date(profile.fecha_nacimiento)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 && age < 110 ? age : null
  }

  const getIMCCategory = (imc: number | null): { text: string; color: string } => {
    if (!imc) return { text: '-', color: 'text-slate-400' }
    if (imc < 18.5) return { text: t.imcBajo, color: 'text-blue-400' }
    if (imc < 25) return { text: t.imcNormal, color: 'text-[#13ec6d]' }
    if (imc < 30) return { text: t.imcSobrepeso, color: 'text-yellow-400' }
    return { text: t.imcObesidad, color: 'text-red-400' }
  }

  const calculateHRZones = (): Array<{ zone: string; min: number; max: number }> => {
    if (!profile.fc_maxima || !profile.fc_reposo) return []
    const hrReserve = profile.fc_maxima - profile.fc_reposo
    return [
      { zone: t.z1, min: Math.round(profile.fc_reposo + hrReserve * 0.50), max: Math.round(profile.fc_reposo + hrReserve * 0.60) },
      { zone: t.z2, min: Math.round(profile.fc_reposo + hrReserve * 0.60), max: Math.round(profile.fc_reposo + hrReserve * 0.70) },
      { zone: t.z3, min: Math.round(profile.fc_reposo + hrReserve * 0.70), max: Math.round(profile.fc_reposo + hrReserve * 0.80) },
      { zone: t.z4, min: Math.round(profile.fc_reposo + hrReserve * 0.80), max: Math.round(profile.fc_reposo + hrReserve * 0.90) },
      { zone: t.z5, min: Math.round(profile.fc_reposo + hrReserve * 0.90), max: profile.fc_maxima },
    ]
  }

  const imc = calculatedIMC()
  const age = calculatedAge()
  const imcCategory = getIMCCategory(imc)
  const hrZones = calculateHRZones()

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="sync" className="text-4xl text-[#13ec6d] animate-spin" />
        <span className="ml-3 text-slate-400">{t.cargarPerfil}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-5 border border-[#13ec6d]/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center">
            <Icon name="person" className="text-[#13ec6d] text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.title}</h2>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {age !== null && (
            <div className="bg-[#102218] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xs text-slate-400">{t.edad}</p>
              <p className="text-xl font-bold text-white">{age} <span className="text-xs text-slate-500">{t.años}</span></p>
            </div>
          )}
          {imc !== null && (
            <div className="bg-[#102218] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xs text-slate-400">{t.imc}</p>
              <p className={`text-xl font-bold ${imcCategory.color}`}>{imc.toFixed(1)}</p>
              <p className={`text-[9px] ${imcCategory.color}`}>{imcCategory.text}</p>
            </div>
          )}
          <div className="bg-[#102218] rounded-xl p-3 text-center border border-white/5">
            <p className="text-xs text-slate-400">{t.fcMaxima}</p>
            <p className="text-xl font-bold text-[#ef4444]">{profile.fc_maxima} <span className="text-xs text-slate-500">{t.bpm}</span></p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10">
        {(['personal', 'cardio', 'records'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSection === section 
                ? 'bg-[#13ec6d] text-[#102218]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon name={
              section === 'personal' ? 'badge' :
              section === 'cardio' ? 'monitor_heart' :
              'fitness_center'
            } className="text-sm" />
            {t[section]}
          </button>
        ))}
      </div>

      {/* Personal Data Section */}
      {activeSection === 'personal' && (
        <div className="bg-[#193324] rounded-2xl p-5 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Icon name="badge" className="text-[#13ec6d]" />
            {t.personal}
          </h3>
          
          {/* Nombre */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.nombre}</label>
            <input
              type="text"
              value={profile.nombre_completo}
              onChange={(e) => update('nombre_completo', e.target.value)}
              className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              placeholder="Juan Pérez"
            />
          </div>
          
          {/* Fecha de Nacimiento */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.fechaNacimiento}</label>
            <input
              type="date"
              value={profile.fecha_nacimiento}
              onChange={(e) => update('fecha_nacimiento', e.target.value)}
              className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
            />
          </div>
          
          {/* Altura y Peso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.altura}</label>
              <input
                type="number"
                value={profile.altura_cm}
                onChange={(e) => update('altura_cm', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
                min="100"
                max="250"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.peso}</label>
              <input
                type="number"
                value={profile.peso_kg}
                onChange={(e) => update('peso_kg', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
                min="30"
                max="300"
                step="0.1"
              />
            </div>
          </div>
          
          {/* Preferencias */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-xs text-slate-400 mb-3 flex items-center gap-2">
              <Icon name="tune" className="text-sm" />
              {t.preferencias}
            </h4>
            
            {/* Unidades */}
            <div className="mb-3">
              <label className="text-xs text-slate-400 mb-1 block">{t.unidades}</label>
              <div className="flex bg-[#102218] rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => update('unidades_metricas', true)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                    profile.unidades_metricas ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.metricas}
                </button>
                <button
                  onClick={() => update('unidades_metricas', false)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                    !profile.unidades_metricas ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.imperiales}
                </button>
              </div>
            </div>
            
            {/* Nivel */}
            <div className="mb-3">
              <label className="text-xs text-slate-400 mb-1 block">{t.nivel}</label>
              <select
                value={profile.nivel_experiencia}
                onChange={(e) => update('nivel_experiencia', e.target.value)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              >
                <option value="principiante">{t.principiante}</option>
                <option value="intermedio">{t.intermedio}</option>
                <option value="avanzado">{t.avanzado}</option>
              </select>
            </div>
            
            {/* Objetivo */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.objetivo}</label>
              <select
                value={profile.objetivo}
                onChange={(e) => update('objetivo', e.target.value)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              >
                <option value="fuerza">{t.fuerza}</option>
                <option value="hipertrofia">{t.hipertrofia}</option>
                <option value="resistencia">{t.resistencia}</option>
                <option value="salud">{t.salud}</option>
                <option value="perdida_peso">{t.perdidaPeso}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Cardio Section */}
      {activeSection === 'cardio' && (
        <div className="space-y-4">
          <div className="bg-[#193324] rounded-2xl p-5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Icon name="monitor_heart" className="text-[#ef4444]" />
              {t.cardio}
            </h3>
            
            {/* FC Máxima y Reposo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t.fcMaxima}</label>
                <input
                  type="number"
                  value={profile.fc_maxima}
                  onChange={(e) => update('fc_maxima', parseInt(e.target.value) || 0)}
                  className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
                  min="60"
                  max="220"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{t.fcReposo}</label>
                <input
                  type="number"
                  value={profile.fc_reposo}
                  onChange={(e) => update('fc_reposo', parseInt(e.target.value) || 0)}
                  className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
                  min="30"
                  max="120"
                />
              </div>
            </div>
            
            {/* VFC Media */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.vfcMedia}</label>
              <input
                type="number"
                value={profile.vfc_media || ''}
                onChange={(e) => update('vfc_media', parseFloat(e.target.value) || null)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
                placeholder="ms"
                min="10"
                max="200"
              />
            </div>
          </div>
          
          {/* HR Zones */}
          {hrZones.length > 0 && (
            <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="zones" className="text-[#00f0ff]" />
                {t.zonasFC}
              </h3>
              
              <div className="space-y-2">
                {hrZones.map((zone, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#102218] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-8 rounded-full"
                        style={{
                          backgroundColor: idx === 0 ? '#22c55e' : idx === 1 ? '#13ec6d' : idx === 2 ? '#f59e0b' : idx === 3 ? '#f97316' : '#ef4444'
                        }}
                      />
                      <span className="text-white text-sm font-medium">{zone.zone}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-mono text-sm">{zone.min} - {zone.max}</span>
                      <span className="text-slate-500 text-xs ml-2">{t.bpm}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Records Section */}
      {activeSection === 'records' && (
        <div className="bg-[#193324] rounded-2xl p-5 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Icon name="fitness_center" className="text-[#f59e0b]" />
            {t.records}
          </h3>
          
          {/* 1RM Inputs */}
          <div className="space-y-3">
            {[
              { field: 'rm_bench_press', label: t.rmBenchPress },
              { field: 'rm_squat', label: t.rmSquat },
              { field: 'rm_deadlift', label: t.rmDeadlift },
              { field: 'rm_overhead_press', label: t.rmOverheadPress },
              { field: 'rm_barbell_row', label: t.rmBarbellRow },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between bg-[#102218] rounded-lg p-3 border border-white/5">
                <span className="text-white text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={profile[field as keyof UserProfile] || ''}
                    onChange={(e) => update(field as keyof UserProfile, parseFloat(e.target.value) || null)}
                    className="w-20 bg-[#193324] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-right focus:border-[#13ec6d] focus:outline-none"
                    placeholder="--"
                    min="0"
                    step="2.5"
                  />
                  <span className="text-slate-500 text-xs w-8">{t.kg}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Total */}
          {profile.rm_bench_press && profile.rm_squat && profile.rm_deadlift && (
            <div className="bg-[#13ec6d]/10 rounded-lg p-3 border border-[#13ec6d]/30">
              <div className="flex items-center justify-between">
                <span className="text-[#13ec6d] text-sm font-bold">
                  {lang === 'es' ? 'Total Big 3' : 'Big 3 Total'}
                </span>
                <span className="text-[#13ec6d] text-lg font-bold font-mono">
                  {((profile.rm_bench_press || 0) + (profile.rm_squat || 0) + (profile.rm_deadlift || 0)).toFixed(1)} {t.kg}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={saveProfile}
        disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          saved 
            ? 'bg-[#13ec6d] text-[#102218]' 
            : saving 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-[#13ec6d]/20 border border-[#13ec6d]/30 text-[#13ec6d] hover:bg-[#13ec6d]/30'
        }`}
      >
        {saved ? (
          <>
            <Icon name="check_circle" className="text-lg" />
            {t.guardado}
          </>
        ) : saving ? (
          <>
            <Icon name="sync" className="text-lg animate-spin" />
            {t.guardando}
          </>
        ) : (
          <>
            <Icon name="save" className="text-lg" />
            {t.guardar}
          </>
        )}
      </button>
    </div>
  )
}

// ============================================================================
// EXPORT PROFILE TYPE FOR OTHER COMPONENTS
// ============================================================================

export type { UserProfile }
