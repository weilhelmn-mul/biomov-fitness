'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import AnatomicalMuscleModel from './AnatomicalMuscleModel'

// Importar el dashboard de análisis de forma dinámica
const IsometricStrengthDashboard = dynamic(
  () => import('./IsometricStrengthDashboard'),
  { ssr: false }
)

// ============================================================================
// TYPES
// ============================================================================

type Vista = 'anatomia' | 'evaluacion' | 'analisis'
type VistaCuerpo = 'frontal' | 'trasera' | 'izquierda' | 'derecha'
type EstadoConexion = 'desconectado' | 'conectando' | 'conectado' | 'error'
type EstadoTest = 'inactivo' | 'listo' | 'midiendo' | 'finalizado'
type Lado = 'R' | 'L'

interface MusculoEvaluado {
  id: string
  nombre: string
  nombreCorto: string
  region: 'upper' | 'core' | 'lower'
  subgrupo: string
  vista: VistaCuerpo
  lado: Lado | 'ambos'
  path: string
  color: string
  fuerza: { R: number; L: number }
  evaluado: boolean
}

interface DatosFuerza {
  tiempo: number
  fuerza: number
}

interface EvaluatedMuscles {
  [key: string]: { R: number; L: number }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function EvaluacionFuerzaIsometricaCompleta() {
  // Estados principales
  const [vista, setVista] = useState<Vista>('anatomia')
  const [musculoSeleccionado, setMusculoSeleccionado] = useState<MusculoEvaluado | null>(null)
  const [evaluatedMuscles, setEvaluatedMuscles] = useState<EvaluatedMuscles>({})
  
  // Estados del sensor Arduino
  const [serialSoportado, setSerialSoportado] = useState(false)
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('desconectado')
  const [estadoTest, setEstadoTest] = useState<EstadoTest>('inactivo')
  const [logs, setLogs] = useState<string[]>([])
  
  // Estados de medición
  const [fuerzaActual, setFuerzaActual] = useState(0)
  const [fuerzaPico, setFuerzaPico] = useState(0)
  const [rfd, setRfd] = useState(0)
  const [datosFuerza, setDatosFuerza] = useState<DatosFuerza[]>([])
  const [mostrarGrafica, setMostrarGrafica] = useState(false)
  
  // Refs
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null)
  const datosFuerzaRef = useRef<DatosFuerza[]>([])
  const picoRef = useRef(0)
  
  // ============================================================================
  // EFECTOS
  // ============================================================================
  
  useEffect(() => {
    // Verificar soporte de Web Serial API
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        const serial = (navigator as any).serial
        if (serial && typeof serial.requestPort === 'function') {
          setSerialSoportado(true)
          agregarLog('✓ Web Serial API soportada')
        }
      } catch (e) {
        agregarLog('✗ Web Serial API no disponible')
      }
    } else {
      agregarLog('✗ Web Serial API no soportada en este navegador')
    }
  }, [])
  
  // ============================================================================
  // FUNCIONES DE LOG
  // ============================================================================
  
  const agregarLog = (mensaje: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${mensaje}`, ...prev.slice(0, 19)])
  }
  
  // ============================================================================
  // FUNCIONES DEL SENSOR ARDUINO
  // ============================================================================
  
  const conectarArduino = async () => {
    if (!serialSoportado) {
      agregarLog('ERROR: Web Serial no soportado')
      return
    }
    
    try {
      setEstadoConexion('conectando')
      agregarLog('Solicitando puerto serial...')
      
      const port = await (navigator as any).serial.requestPort()
      agregarLog('Abriendo conexión 115200 baud...')
      
      await port.open({ baudRate: 115200 })
      portRef.current = port
      writerRef.current = port.writable?.getWriter() || null
      
      setEstadoConexion('conectado')
      setEstadoTest('listo')
      agregarLog('✓ CONECTADO - Sensor listo')
      
      // Iniciar lectura
      const reader = port.readable?.getReader()
      if (reader) {
        readerRef.current = reader
        const decoder = new TextDecoder()
        let buffer = ''
        
        const leerLoop = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              
              for (const line of lines) {
                procesarLineaArduino(line.trim())
              }
            }
          } catch (e) {
            agregarLog('ERROR lectura: ' + (e as Error).message)
          }
        }
        leerLoop()
      }
    } catch (e) {
      agregarLog('ERROR conexión: ' + (e as Error).message)
      setEstadoConexion('error')
    }
  }
  
  const desconectarArduino = async () => {
    try {
      agregarLog('Desconectando sensor...')
      
      if (writerRef.current) {
        writerRef.current.releaseLock()
        writerRef.current = null
      }
      if (readerRef.current) {
        readerRef.current.releaseLock()
        readerRef.current = null
      }
      if (portRef.current) {
        await portRef.current.close()
        portRef.current = null
      }
      
      setEstadoConexion('desconectado')
      setEstadoTest('inactivo')
      agregarLog('✓ Sensor desconectado')
    } catch (e) {
      agregarLog('ERROR desconexión: ' + (e as Error).message)
    }
  }
  
  const enviarComandoArduino = async (comando: string) => {
    if (!writerRef.current) {
      agregarLog('ERROR: No hay conexión con sensor')
      return
    }
    
    try {
      const encoder = new TextEncoder()
      await writerRef.current.write(encoder.encode(comando))
      agregarLog(`Comando enviado: "${comando === ' ' ? 'SPACE' : comando}"`)
    } catch (e) {
      agregarLog('ERROR enviando comando: ' + (e as Error).message)
    }
  }
  
  const procesarLineaArduino = (linea: string) => {
    console.log('[Arduino]', linea)
    
    // Estados del test
    if (linea.includes('>>> Test listo')) {
      setEstadoTest('listo')
      agregarLog('ARDUINO: Test listo')
    }
    if (linea.includes('>>> Intento iniciado')) {
      setEstadoTest('midiendo')
      datosFuerzaRef.current = []
      picoRef.current = 0
      setFuerzaPico(0)
      setFuerzaActual(0)
      setRfd(0)
      setDatosFuerza([])
      agregarLog('▶ INTENTO INICIADO - Grabando...')
    }
    if (linea.includes('<<< Fin del intento')) {
      setEstadoTest('finalizado')
      setDatosFuerza([...datosFuerzaRef.current])
      agregarLog(`⏹ FIN - ${datosFuerzaRef.current.length} puntos`)
    }
    
    // Resultados
    if (linea.includes('Pico de fuerza (kgf):')) {
      const m = linea.match(/Pico de fuerza \(kgf\):\s*([\d.]+)/)
      if (m) {
        setFuerzaPico(parseFloat(m[1]))
        agregarLog(`PICO: ${m[1]} kgf`)
      }
    }
    if (linea.includes('RFD 0-200 ms')) {
      const m = linea.match(/RFD 0-200 ms \(kgf\/s\):\s*([\d.]+)/)
      if (m) {
        setRfd(parseFloat(m[1]))
        agregarLog(`RFD: ${m[1]} kgf/s`)
      }
    }
    if (linea.includes('>>> Destarado')) {
      agregarLog('✓ Sensor destarado')
    }
    
    // Datos de fuerza en tiempo real (formato: "tiempo,fuerza")
    if (linea.includes(',') && !linea.includes('===') && !linea.includes('>>>') && !linea.includes('<<<')) {
      const partes = linea.split(',')
      if (partes.length >= 2) {
        const tiempo = parseInt(partes[0])
        const fuerza = parseFloat(partes[1])
        if (!isNaN(tiempo) && !isNaN(fuerza)) {
          datosFuerzaRef.current.push({ tiempo, fuerza })
          setFuerzaActual(fuerza)
          
          if (fuerza > picoRef.current) {
            picoRef.current = fuerza
            setFuerzaPico(fuerza)
          }
          
          // Actualizar gráfica cada 5 puntos
          if (datosFuerzaRef.current.length % 5 === 0) {
            setDatosFuerza([...datosFuerzaRef.current])
          }
        }
      }
    }
  }
  
  // Comandos Arduino
  const cmdIniciarTest = () => enviarComandoArduino(' ')
  const cmdDestarar = () => enviarComandoArduino('t')
  const cmdCalibrar = () => enviarComandoArduino('c')
  
  // ============================================================================
  // HANDLERS DE MÚSCULOS
  // ============================================================================
  
  const handleMuscleSelect = useCallback((musculo: any) => {
    setMusculoSeleccionado({
      id: musculo.id,
      nombre: musculo.nombre,
      nombreCorto: musculo.nombreCorto,
      region: musculo.region,
      subgrupo: musculo.subgrupo,
      vista: musculo.vista,
      lado: musculo.lado,
      path: musculo.path,
      color: musculo.colorBase,
      fuerza: evaluatedMuscles[musculo.id] || { R: 0, L: 0 },
      evaluado: !!evaluatedMuscles[musculo.id]
    })
    agregarLog(`Músculo seleccionado: ${musculo.nombre}`)
  }, [evaluatedMuscles])
  
  const guardarResultado = () => {
    if (!musculoSeleccionado || fuerzaPico <= 0) return
    
    const lado = musculoSeleccionado.lado === 'ambos' ? 'R' : musculoSeleccionado.lado
    
    setEvaluatedMuscles(prev => ({
      ...prev,
      [musculoSeleccionado.id]: {
        ...prev[musculoSeleccionado.id] || { R: 0, L: 0 },
        [lado]: fuerzaPico
      }
    }))
    
    agregarLog(`✓ Resultado guardado: ${musculoSeleccionado.nombreCorto} = ${fuerzaPico.toFixed(1)} kg`)
    setMusculoSeleccionado(null)
    setEstadoTest('listo')
    setFuerzaPico(0)
    setFuerzaActual(0)
    setRfd(0)
    setDatosFuerza([])
  }
  
  // ============================================================================
  // COMPONENTE DE GRÁFICA FUERZA-TIEMPO
  // ============================================================================
  
  const GraficaFuerzaTiempo = () => {
    const maxTiempo = Math.max(3000, datosFuerza.length > 0 ? datosFuerza[datosFuerza.length - 1].tiempo : 3000, 1)
    const maxFuerza = Math.max(60, fuerzaPico * 1.3, 1)
    
    const width = 400
    const height = 200
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    
    const xScale = (t: number) => padding.left + (t / maxTiempo) * chartWidth
    const yScale = (f: number) => padding.top + chartHeight - (f / maxFuerza) * chartHeight
    
    const generarPath = (puntos: DatosFuerza[]) => {
      if (puntos.length < 2) return ''
      let path = `M ${xScale(puntos[0].tiempo)} ${yScale(puntos[0].fuerza)}`
      for (let i = 1; i < puntos.length; i++) {
        const prev = puntos[i - 1]
        const curr = puntos[i]
        const cpX = xScale((prev.tiempo + curr.tiempo) / 2)
        path += ` Q ${cpX} ${yScale(prev.fuerza)}, ${xScale(curr.tiempo)} ${yScale(curr.fuerza)}`
      }
      return path
    }
    
    return (
      <div className="bg-[#102218] rounded-xl p-3 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Curva Fuerza-Tiempo
          </span>
          {datosFuerza.length > 0 && (
            <span className="text-[9px] text-[#13ec6d] font-mono">
              {datosFuerza.length} puntos
            </span>
          )}
        </div>
        
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: '150px' }}>
          <defs>
            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#13ec6d" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="#13ec6d" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff"/>
              <stop offset="50%" stopColor="#13ec6d"/>
              <stop offset="100%" stopColor="#13ec6d"/>
            </linearGradient>
          </defs>
          
          {/* Grid */}
          {[20, 40, 60, 80, 100].map(pct => {
            const f = (maxFuerza / 5) * (5 - pct / 20)
            return (
              <g key={`h${pct}`}>
                <line x1={padding.left} y1={yScale(f)} x2={width - padding.right} y2={yScale(f)} stroke="#3a4a3f" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={padding.left - 5} y={yScale(f) + 3} fill="#6b7b6f" fontSize="8" textAnchor="end">{Math.round(f)}</text>
              </g>
            )
          })}
          
          {/* Zona RFD */}
          <rect x={xScale(0)} y={padding.top} width={xScale(200) - xScale(0)} height={chartHeight} fill="#00f0ff" opacity="0.1" />
          <text x={xScale(100)} y={padding.top + 12} fill="#00f0ff" fontSize="8" textAnchor="middle" fontWeight="bold">RFD</text>
          
          {/* Curva */}
          {datosFuerza.length > 1 && (
            <>
              <path d={`${generarPath(datosFuerza)} L ${xScale(datosFuerza[datosFuerza.length - 1].tiempo)} ${height - padding.bottom} L ${xScale(datosFuerza[0].tiempo)} ${height - padding.bottom} Z`} fill="url(#gridGrad)" />
              <path d={generarPath(datosFuerza)} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          
          {/* Pico */}
          {fuerzaPico > 0 && (
            <g>
              <circle cx={xScale(datosFuerza.length > 0 ? datosFuerza[Math.floor(datosFuerza.length / 2)]?.tiempo || 1500 : 1500)} cy={yScale(fuerzaPico)} r="5" fill="#13ec6d" stroke="#102218" strokeWidth="2" />
              <text x={xScale(datosFuerza.length > 0 ? datosFuerza[Math.floor(datosFuerza.length / 2)]?.tiempo || 1500 : 1500)} y={yScale(fuerzaPico) - 12} fill="#13ec6d" fontSize="9" textAnchor="middle" fontWeight="bold">{fuerzaPico.toFixed(1)} kg</text>
            </g>
          )}
          
          {/* Ejes */}
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#5a6a5f" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#5a6a5f" strokeWidth="1" />
          <text x={width / 2} y={height - 8} fill="#6b7b6f" fontSize="10" textAnchor="middle">Tiempo (ms)</text>
          <text x={15} y={height / 2} fill="#6b7b6f" fontSize="10" textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>Fuerza (kg)</text>
        </svg>
      </div>
    )
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-[#102218]">
      {/* Header con navegación de vistas */}
      <div className="sticky top-0 z-20 bg-[#102218]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white">Evaluación Isométrica</h1>
            
            {/* Tabs de navegación */}
            <div className="flex gap-1 bg-[#1a2a1f] rounded-xl p-1">
              {[
                { id: 'anatomia', label: 'Anatomía', icon: 'accessibility' },
                { id: 'evaluacion', label: 'Evaluación', icon: 'sensors' },
                { id: 'analisis', label: 'Análisis', icon: 'analytics' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setVista(tab.id as Vista)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                    ${vista === tab.id 
                      ? 'bg-[#13ec6d] text-[#102218]' 
                      : 'text-slate-400 hover:text-white'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ═══════════════════════════════════════════════════════════════
            VISTA: ANATOMÍA
        ═══════════════════════════════════════════════════════════════ */}
        {vista === 'anatomia' && (
          <div className="space-y-4">
            {/* Modelo Anatómico */}
            <AnatomicalMuscleModel
              onMuscleSelect={handleMuscleSelect}
              selectedMuscleId={musculoSeleccionado?.id}
              evaluatedMuscles={evaluatedMuscles}
            />
            
            {/* Músculo seleccionado - Panel de acciones */}
            {musculoSeleccionado && (
              <div className="bg-gradient-to-r from-[#13ec6d]/10 to-[#00f0ff]/10 rounded-2xl p-5 border border-[#13ec6d]/30 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white">{musculoSeleccionado.nombre}</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {musculoSeleccionado.region === 'upper' ? '💪 Tren Superior' : 
                       musculoSeleccionado.region === 'core' ? '🔥 Core' : '🦵 Tren Inferior'} 
                      {' • '}<span className="capitalize">{musculoSeleccionado.subgrupo}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setVista('evaluacion')}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#13ec6d] to-[#00d4ff] text-[#102218] rounded-xl font-bold text-sm shadow-lg shadow-[#13ec6d]/30 hover:shadow-[#13ec6d]/50 transition-all hover:scale-105"
                  >
                    <span className="material-symbols-outlined text-lg">sensors</span>
                    Evaluar Fuerza
                  </button>
                </div>
                
                {musculoSeleccionado.evaluado && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="bg-[#102218] rounded-xl p-4 text-center border border-[#00f0ff]/20">
                      <p className="text-xs text-slate-500 mb-1">Lado Derecho</p>
                      <p className="text-3xl font-bold text-[#00f0ff] font-mono">
                        {(evaluatedMuscles[musculoSeleccionado.id]?.R || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500">kg</p>
                    </div>
                    <div className="bg-[#102218] rounded-xl p-4 text-center border border-[#f59e0b]/20">
                      <p className="text-xs text-slate-500 mb-1">Lado Izquierdo</p>
                      <p className="text-3xl font-bold text-[#f59e0b] font-mono">
                        {(evaluatedMuscles[musculoSeleccionado.id]?.L || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500">kg</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Botón para ver análisis si hay evaluaciones */}
            {Object.keys(evaluatedMuscles).length > 0 && (
              <button
                onClick={() => setVista('analisis')}
                className="w-full py-4 bg-gradient-to-r from-[#13ec6d] to-[#00f0ff] text-[#102218] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-[#13ec6d]/20 hover:shadow-[#13ec6d]/40 transition-all hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-xl">analytics</span>
                Ver Análisis Completo ({Object.keys(evaluatedMuscles).length} músculos)
              </button>
            )}
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════
            VISTA: EVALUACIÓN
        ═══════════════════════════════════════════════════════════════ */}
        {vista === 'evaluacion' && (
          <div className="space-y-4">
            {/* Header con músculo seleccionado */}
            <div className="bg-[#1a2a1f] rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setVista('anatomia')}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                  </button>
                  <div>
                    <h3 className="font-bold text-white text-lg">
                      {musculoSeleccionado?.nombre || 'Selecciona un músculo'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {musculoSeleccionado ? (
                        <>
                          Lado: {musculoSeleccionado.lado === 'ambos' ? 'Bilateral' : 
                                 musculoSeleccionado.lado === 'R' ? 'Derecho' : 'Izquierdo'}
                        </>
                      ) : 'Vuelve a la vista de anatomía'}
                    </p>
                  </div>
                </div>
                
                {/* Estado de conexión */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
                  <div className={`w-2 h-2 rounded-full ${
                    estadoConexion === 'conectado' ? 'bg-[#13ec6d] animate-pulse' :
                    estadoConexion === 'conectando' ? 'bg-[#f59e0b] animate-pulse' :
                    estadoConexion === 'error' ? 'bg-red-500' : 'bg-slate-500'
                  }`} />
                  <span className="text-xs text-slate-400">
                    {estadoConexion === 'conectado' ? 'Conectado' :
                     estadoConexion === 'conectando' ? 'Conectando...' :
                     estadoConexion === 'error' ? 'Error' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Panel de métricas en tiempo real */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1a2a1f] rounded-2xl p-5 text-center border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#00f0ff]/5 to-transparent" />
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wider">Actual</p>
                <p className="text-4xl font-bold text-[#00f0ff] font-mono relative">{fuerzaActual.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1">kg</p>
              </div>
              <div className="bg-[#1a2a1f] rounded-2xl p-5 text-center border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#13ec6d]/5 to-transparent" />
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wider">Pico</p>
                <p className="text-4xl font-bold text-[#13ec6d] font-mono relative">{fuerzaPico.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1">kg</p>
              </div>
              <div className="bg-[#1a2a1f] rounded-2xl p-5 text-center border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wider">RFD</p>
                <p className="text-4xl font-bold text-white font-mono relative">{rfd}</p>
                <p className="text-xs text-slate-500 mt-1">kg/s</p>
              </div>
            </div>
            
            {/* Controles del sensor */}
            <div className="bg-[#1a2a1f] rounded-2xl p-5 border border-white/10">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {estadoConexion === 'desconectado' && (
                  <button
                    onClick={conectarArduino}
                    className="flex items-center gap-2 px-6 py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold hover:bg-[#00f0ff] transition-colors"
                  >
                    <span className="material-symbols-outlined">cable</span>
                    Conectar Sensor
                  </button>
                )}
                
                {estadoConexion === 'conectado' && (
                  <>
                    <button
                      onClick={cmdDestarar}
                      className="flex items-center gap-2 px-4 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-colors border border-white/10"
                    >
                      <span className="material-symbols-outlined">tune</span>
                      Destarar
                    </button>
                    
                    <button
                      onClick={cmdIniciarTest}
                      disabled={estadoTest !== 'listo'}
                      className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                        ${estadoTest === 'listo' 
                          ? 'bg-[#13ec6d] text-[#102218] hover:bg-[#00f0ff] hover:scale-105' 
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="material-symbols-outlined">
                        {estadoTest === 'midiendo' ? 'motion_photos_on' : 'play_arrow'}
                      </span>
                      {estadoTest === 'midiendo' ? 'Midiendo...' : estadoTest === 'finalizado' ? 'Repetir Test' : 'Iniciar Test'}
                    </button>
                    
                    {estadoTest === 'finalizado' && fuerzaPico > 0 && (
                      <button
                        onClick={guardarResultado}
                        className="flex items-center gap-2 px-6 py-3 bg-[#13ec6d] text-[#102218] rounded-xl font-bold hover:bg-[#00f0ff] transition-colors animate-pulse"
                      >
                        <span className="material-symbols-outlined">save</span>
                        Guardar Resultado
                      </button>
                    )}
                    
                    <button
                      onClick={desconectarArduino}
                      className="flex items-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-colors border border-red-500/20"
                    >
                      <span className="material-symbols-outlined">link_off</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Gráfica fuerza-tiempo */}
            <GraficaFuerzaTiempo />
            
            {/* Log del sistema */}
            <details className="bg-[#1a2a1f] rounded-2xl border border-white/10 overflow-hidden">
              <summary className="px-4 py-3 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                📋 Log del Sistema ({logs.length} entradas)
              </summary>
              <div className="max-h-48 overflow-y-auto p-4 pt-0 space-y-1">
                {logs.map((log, i) => (
                  <p key={i} className="text-[10px] font-mono text-slate-500">{log}</p>
                ))}
              </div>
            </details>
            
            {!serialSoportado && (
              <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl p-4">
                <p className="text-sm text-[#f59e0b]">
                  ⚠️ Web Serial API no soportada. Usa Chrome/Edge 89+ para conectar el sensor Arduino.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════
            VISTA: ANÁLISIS
        ═══════════════════════════════════════════════════════════════ */}
        {vista === 'analisis' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setVista('anatomia')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400">arrow_back</span>
              </button>
              <h2 className="text-xl font-bold text-white">Análisis de Fuerza Isométrica</h2>
            </div>
            
            {/* Dashboard de análisis */}
            <IsometricStrengthDashboard 
              evaluatedMuscles={evaluatedMuscles}
            />
          </div>
        )}
      </div>
    </div>
  )
}
