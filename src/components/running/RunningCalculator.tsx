'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  DISTANCE_MAP,
  TRAINING_ZONES,
  timeToSeconds,
  secondsToTime,
  secondsToPace,
  calculateVDOT,
  paceFromVDOT,
  projectRaceTimes,
  calculateHRZones,
  calculatePowerZones,
  calculateBMI,
  calculateAge,
  calculateIntensityPoints,
  getWeeklyIntensityTarget,
} from '@/lib/running-calculations'

// ============================================================================
// TYPES
// ============================================================================

interface RunnerData {
  metricHeightWeight: boolean;
  height: number;
  weight: number;
  birthdate: string;
  hrMax: number;
  hrRest: number;
  raceDistance: string;
  customDistance: number | null;
  raceTime: string;
  hrTweak: number;
  paceUnits: 'km' | 'mile';
}

// Profile data from user profile
interface ProfileData {
  fecha_nacimiento?: string;
  altura_cm?: number;
  peso_kg?: number;
  fc_maxima?: number;
  fc_reposo?: number;
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
// RUNNING CALCULATOR COMPONENT
// ============================================================================

export default function RunningCalculator({ 
  lang,
  profileData 
}: { 
  lang: 'es' | 'en'
  profileData?: ProfileData | null
}) {
  // State - Initialize with profile data if available
  const [data, setData] = useState<RunnerData>(() => ({
    metricHeightWeight: true,
    height: profileData?.altura_cm || 180,
    weight: profileData?.peso_kg || 75,
    birthdate: profileData?.fecha_nacimiento || '1990-01-01',
    hrMax: profileData?.fc_maxima || 190,
    hrRest: profileData?.fc_reposo || 45,
    raceDistance: '10k',
    customDistance: null,
    raceTime: '00:45:00',
    hrTweak: 2,
    paceUnits: 'km',
  }))
  
  // Update data when profile changes
  useEffect(() => {
    if (profileData) {
      setData(prev => ({
        ...prev,
        height: profileData.altura_cm || prev.height,
        weight: profileData.peso_kg || prev.weight,
        birthdate: profileData.fecha_nacimiento || prev.birthdate,
        hrMax: profileData.fc_maxima || prev.hrMax,
        hrRest: profileData.fc_reposo || prev.hrRest,
      }))
    }
  }, [profileData])
  
  const [activeTab, setActiveTab] = useState<'paces' | 'projections' | 'zones' | 'intensity'>('paces')
  
  // Distance options
  const distanceOptions = Object.keys(DISTANCE_MAP).concat('Custom')
  
  // Update helper
  const update = (field: keyof RunnerData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }
  
  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  
  const age = useMemo(() => calculateAge(data.birthdate), [data.birthdate])
  
  const raceDistanceMeters = useMemo(() => {
    if (data.raceDistance === 'Custom' && data.customDistance) {
      return data.customDistance * 1000
    }
    return DISTANCE_MAP[data.raceDistance] || null
  }, [data.raceDistance, data.customDistance])
  
  const raceTimeSeconds = useMemo(() => timeToSeconds(data.raceTime), [data.raceTime])
  
  const vdot = useMemo(() => {
    if (raceDistanceMeters && raceTimeSeconds) {
      return calculateVDOT(raceDistanceMeters, raceTimeSeconds)
    }
    return null
  }, [raceDistanceMeters, raceTimeSeconds])
  
  const bmi = useMemo(() => calculateBMI(data.height, data.weight, data.metricHeightWeight), [data.height, data.weight, data.metricHeightWeight])
  
  const trainingPaces = useMemo(() => {
    if (!vdot) return []
    return TRAINING_ZONES.map(zone => {
      const pace = paceFromVDOT(vdot, zone.percent, data.paceUnits)
      return {
        ...zone,
        pace: pace ? secondsToPace(pace) : '--:--',
      }
    })
  }, [vdot, data.paceUnits])
  
  const raceProjections = useMemo(() => {
    if (!raceDistanceMeters || !raceTimeSeconds) return []
    return projectRaceTimes(raceDistanceMeters, raceTimeSeconds)
  }, [raceDistanceMeters, raceTimeSeconds])
  
  const hrZones = useMemo(() => calculateHRZones(data.hrMax, data.hrRest), [data.hrMax, data.hrRest])
  
  const powerZones = useMemo(() => {
    if (!data.weight || !vdot) return []
    return calculatePowerZones(data.weight, vdot)
  }, [data.weight, vdot])
  
  const intensityTarget = useMemo(() => {
    if (!vdot) return null
    return getWeeklyIntensityTarget(vdot)
  }, [vdot])
  
  // ============================================================================
  // TEXTS
  // ============================================================================
  
  const texts = {
    es: {
      title: 'Calculadora de Entrenamiento',
      subtitle: 'Basada en el sistema VDOT de Jack Daniels',
      runnerData: 'Datos del Corredor',
      metric: 'Métrico (cm/kg)',
      imperial: 'Imperial (in/lb)',
      height: 'Altura',
      weight: 'Peso',
      birthdate: 'Fecha de Nacimiento',
      hrMax: 'FC Máxima',
      hrRest: 'FC Reposo',
      raceDistance: 'Distancia de Carrera',
      customDistance: 'Distancia Personalizada (km)',
      raceTime: 'Tiempo (hh:mm:ss)',
      hrAdjustment: 'Ajuste de FC',
      paceUnits: 'Unidades de Ritmo',
      age: 'Edad',
      years: 'años',
      bmi: 'IMC',
      vdot: 'VDOT',
      
      tabs: {
        paces: 'Ritmos',
        projections: 'Proyecciones',
        zones: 'Zonas',
        intensity: 'Intensidad',
      },
      
      trainingPaces: 'Ritmos de Entrenamiento',
      pacePerKm: 'Ritmo /km',
      pacePerMile: 'Ritmo /milla',
      zone: 'Zona',
      description: 'Descripción',
      
      raceProjections: 'Proyecciones de Carrera',
      distance: 'Distancia',
      time: 'Tiempo',
      pace: 'Ritmo',
      
      hrZones: 'Zonas de Frecuencia Cardíaca',
      hrRange: 'Rango FC',
      percent: '% Reserva',
      
      powerZones: 'Zonas de Potencia',
      powerRange: 'Rango (W)',
      
      intensity: 'Puntos de Intensidad',
      weeklyTarget: 'Objetivo Semanal',
      optimal: 'Óptimo',
      points: 'puntos',
      
      low: 'Bajo',
      medium: 'Medio',
      high: 'Alto',
      
      enterData: 'Ingresa datos de carrera para ver los ritmos de entrenamiento.',
      basedOn: 'Basado en VDOT =',
    },
    en: {
      title: 'Training Calculator',
      subtitle: "Based on Jack Daniels' VDOT system",
      runnerData: 'Runner Data',
      metric: 'Metric (cm/kg)',
      imperial: 'Imperial (in/lb)',
      height: 'Height',
      weight: 'Weight',
      birthdate: 'Birthdate',
      hrMax: 'Max HR',
      hrRest: 'Resting HR',
      raceDistance: 'Race Distance',
      customDistance: 'Custom Distance (km)',
      raceTime: 'Time (hh:mm:ss)',
      hrAdjustment: 'HR Adjustment',
      paceUnits: 'Pace Units',
      age: 'Age',
      years: 'years',
      bmi: 'BMI',
      vdot: 'VDOT',
      
      tabs: {
        paces: 'Paces',
        projections: 'Projections',
        zones: 'Zones',
        intensity: 'Intensity',
      },
      
      trainingPaces: 'Training Paces',
      pacePerKm: 'Pace /km',
      pacePerMile: 'Pace /mile',
      zone: 'Zone',
      description: 'Description',
      
      raceProjections: 'Race Projections',
      distance: 'Distance',
      time: 'Time',
      pace: 'Pace',
      
      hrZones: 'Heart Rate Zones',
      hrRange: 'HR Range',
      percent: '% Reserve',
      
      powerZones: 'Power Zones',
      powerRange: 'Range (W)',
      
      intensity: 'Intensity Points',
      weeklyTarget: 'Weekly Target',
      optimal: 'Optimal',
      points: 'points',
      
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      
      enterData: 'Enter race data to see training paces.',
      basedOn: 'Based on VDOT =',
    },
  }
  
  const t = texts[lang]
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193324] to-[#102218] rounded-2xl p-5 border border-[#13ec6d]/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-[#13ec6d]/20 flex items-center justify-center">
            <Icon name="speed" className="text-[#13ec6d] text-2xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {age !== null && (
            <div className="bg-[#102218] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xs text-slate-400">{t.age}</p>
              <p className="text-xl font-bold text-white">{age} <span className="text-xs text-slate-500">{t.years}</span></p>
            </div>
          )}
          {bmi !== null && (
            <div className="bg-[#102218] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xs text-slate-400">{t.bmi}</p>
              <p className="text-xl font-bold text-[#00f0ff]">{bmi.toFixed(1)}</p>
            </div>
          )}
          {vdot !== null && (
            <div className="bg-[#102218] rounded-xl p-3 text-center border border-[#13ec6d]/30">
              <p className="text-xs text-slate-400">{t.vdot}</p>
              <p className="text-xl font-bold text-[#13ec6d]">{vdot.toFixed(1)}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Input Form */}
      <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="person" className="text-[#13ec6d]" />
          {t.runnerData}
        </h3>
        
        <div className="space-y-4">
          {/* Metric/Imperial Toggle */}
          <div className="flex bg-[#102218] rounded-lg p-1 border border-white/10">
            <button
              onClick={() => update('metricHeightWeight', true)}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                data.metricHeightWeight ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.metric}
            </button>
            <button
              onClick={() => update('metricHeightWeight', false)}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                !data.metricHeightWeight ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.imperial}
            </button>
          </div>
          
          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {t.height} ({data.metricHeightWeight ? 'cm' : 'in'})
              </label>
              <input
                type="number"
                value={data.height}
                onChange={(e) => update('height', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {t.weight} ({data.metricHeightWeight ? 'kg' : 'lb'})
              </label>
              <input
                type="number"
                value={data.weight}
                onChange={(e) => update('weight', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              />
            </div>
          </div>
          
          {/* Birthdate */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.birthdate}</label>
            <input
              type="date"
              value={data.birthdate}
              onChange={(e) => update('birthdate', e.target.value)}
              className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
            />
          </div>
          
          {/* HR Max & Rest */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.hrMax}</label>
              <input
                type="number"
                value={data.hrMax}
                onChange={(e) => update('hrMax', parseInt(e.target.value) || 0)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.hrRest}</label>
              <input
                type="number"
                value={data.hrRest}
                onChange={(e) => update('hrRest', parseInt(e.target.value) || 0)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              />
            </div>
          </div>
          
          {/* Race Distance */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.raceDistance}</label>
            <select
              value={data.raceDistance}
              onChange={(e) => update('raceDistance', e.target.value)}
              className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
            >
              {distanceOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          
          {/* Custom Distance */}
          {data.raceDistance === 'Custom' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.customDistance}</label>
              <input
                type="number"
                value={data.customDistance || ''}
                onChange={(e) => update('customDistance', parseFloat(e.target.value) || null)}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
                placeholder="10"
              />
            </div>
          )}
          
          {/* Race Time */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.raceTime}</label>
            <input
              type="text"
              value={data.raceTime}
              onChange={(e) => update('raceTime', e.target.value)}
              className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none font-mono"
              placeholder="00:45:00"
            />
          </div>
          
          {/* Pace Units */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.paceUnits}</label>
              <div className="flex bg-[#102218] rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => update('paceUnits', 'km')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                    data.paceUnits === 'km' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  /km
                </button>
                <button
                  onClick={() => update('paceUnits', 'mile')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                    data.paceUnits === 'mile' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  /mile
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.hrAdjustment}</label>
              <select
                value={data.hrTweak}
                onChange={(e) => update('hrTweak', parseInt(e.target.value))}
                className="w-full bg-[#102218] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#13ec6d] focus:outline-none"
              >
                <option value={1}>{t.low}</option>
                <option value={2}>{t.medium}</option>
                <option value={3}>{t.high}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Results Tabs */}
      <div className="flex bg-[#193324] rounded-xl p-1 border border-white/10 overflow-x-auto">
        {(['paces', 'projections', 'zones', 'intensity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === tab ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon name={
              tab === 'paces' ? 'speed' :
              tab === 'projections' ? 'trending_up' :
              tab === 'zones' ? 'monitor_heart' :
              'bolt'
            } className="text-sm" />
            {t.tabs[tab]}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'paces' && (
        <div className="space-y-4">
          <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Icon name="speed" className="text-[#13ec6d]" />
                {t.trainingPaces}
              </h3>
              {vdot !== null && (
                <span className="text-xs text-[#13ec6d] font-mono bg-[#13ec6d]/10 px-2 py-1 rounded">
                  {t.basedOn} {vdot.toFixed(1)}
                </span>
              )}
            </div>
            
            {vdot === null ? (
              <p className="text-slate-400 text-sm text-center py-8">{t.enterData}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-white/10">
                      <th className="pb-3 text-xs text-slate-400 font-medium">{t.zone}</th>
                      <th className="pb-3 text-xs text-slate-400 font-medium text-right">
                        {data.paceUnits === 'km' ? t.pacePerKm : t.pacePerMile}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingPaces.map((zone, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0">
                        <td className="py-3">
                          <div>
                            <p className="text-white font-medium text-sm">{lang === 'es' ? zone.nameEs : zone.name}</p>
                            <p className="text-xs text-slate-500">{lang === 'es' ? zone.descriptionEs : zone.description}</p>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-[#13ec6d] font-mono font-bold">{zone.pace}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'projections' && (
        <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="trending_up" className="text-[#00f0ff]" />
            {t.raceProjections}
          </h3>
          
          {!raceProjections.length ? (
            <p className="text-slate-400 text-sm text-center py-8">{t.enterData}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-white/10">
                    <th className="pb-3 text-xs text-slate-400 font-medium">{t.distance}</th>
                    <th className="pb-3 text-xs text-slate-400 font-medium text-right">{t.time}</th>
                    <th className="pb-3 text-xs text-slate-400 font-medium text-right">{t.pace}</th>
                  </tr>
                </thead>
                <tbody>
                  {raceProjections.map((proj, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0">
                      <td className="py-3 text-white font-medium text-sm">{proj.distance}</td>
                      <td className="py-3 text-right text-white font-mono">{proj.time}</td>
                      <td className="py-3 text-right text-[#00f0ff] font-mono">{proj.pace}/km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'zones' && (
        <div className="space-y-4">
          {/* HR Zones */}
          <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Icon name="monitor_heart" className="text-[#ef4444]" />
              {t.hrZones}
            </h3>
            
            {!hrZones.length ? (
              <p className="text-slate-400 text-sm text-center py-4">{t.enterData}</p>
            ) : (
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
                      <span className="text-slate-500 text-xs ml-2">bpm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Power Zones */}
          <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Icon name="bolt" className="text-[#f59e0b]" />
              {t.powerZones}
            </h3>
            
            {!powerZones.length ? (
              <p className="text-slate-400 text-sm text-center py-4">{t.enterData}</p>
            ) : (
              <div className="space-y-2">
                {powerZones.map((zone, idx) => (
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
                      <span className="text-slate-500 text-xs ml-2">W</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'intensity' && (
        <div className="bg-[#193324] rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="bolt" className="text-[#8b5cf6]" />
            {t.intensity}
          </h3>
          
          {!intensityTarget ? (
            <p className="text-slate-400 text-sm text-center py-8">{t.enterData}</p>
          ) : (
            <div className="space-y-4">
              {/* Weekly Target */}
              <div className="bg-[#102218] rounded-xl p-4 border border-white/5 text-center">
                <p className="text-xs text-slate-400 mb-2">{t.weeklyTarget}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm">{intensityTarget.min}</span>
                  <div className="h-4 w-px bg-slate-600" />
                  <span className="text-2xl font-bold text-[#8b5cf6]">{intensityTarget.optimal}</span>
                  <div className="h-4 w-px bg-slate-600" />
                  <span className="text-slate-400 text-sm">{intensityTarget.max}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t.points}</p>
              </div>
              
              {/* Zone Points */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-white/10">
                      <th className="pb-3 text-xs text-slate-400 font-medium">{t.zone}</th>
                      <th className="pb-3 text-xs text-slate-400 font-medium text-center">30 min</th>
                      <th className="pb-3 text-xs text-slate-400 font-medium text-center">60 min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['E', 'M', 'T', 'I', 'R'].map((zone) => (
                      <tr key={zone} className="border-b border-white/5 last:border-0">
                        <td className="py-3 text-white font-medium text-sm">{zone}</td>
                        <td className="py-3 text-center text-slate-300 font-mono text-sm">
                          {calculateIntensityPoints(zone, 30)}
                        </td>
                        <td className="py-3 text-center text-slate-300 font-mono text-sm">
                          {calculateIntensityPoints(zone, 60)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <p className="text-xs text-slate-500 text-center">
                {lang === 'es' 
                  ? 'Puntos por minuto de entrenamiento en cada zona'
                  : 'Points per minute of training in each zone'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
