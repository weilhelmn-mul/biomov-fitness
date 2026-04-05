'use client'

import { useState, useMemo, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

type VistaCuerpo = 'frontal' | 'trasera' | 'izquierda' | 'derecha'
type Region = 'upper' | 'core' | 'lower'
type Lado = 'R' | 'L' | 'ambos'

interface Musculo {
  id: string
  nombre: string
  nombreCorto: string
  region: Region
  subgrupo: string
  vista: VistaCuerpo
  lado: Lado
  path: string
  colorBase: string
  colorHighlight: string
  fuerza: { R: number; L: number }
  evaluado: boolean
}

interface AnatomicalMuscleModelProps {
  onMuscleSelect?: (musculo: Musculo) => void
  onMuscleHover?: (musculo: Musculo | null) => void
  selectedMuscleId?: string | null
  evaluatedMuscles?: Record<string, { R: number; L: number }>
}

// ============================================================================
// MÚSCULOS CON PATHS SVG ANATÓMICOS MEJORADOS
// ============================================================================

const MUSCULOS: Musculo[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA FRONTAL
  // ═══════════════════════════════════════════════════════════════════════
  
  // TREN SUPERIOR - Pecho
  {
    id: 'pectoral_mayor_R',
    nombre: 'Pectoral Mayor Derecho',
    nombreCorto: 'Pectoral Der.',
    region: 'upper',
    subgrupo: 'pecho',
    vista: 'frontal',
    lado: 'R',
    path: 'M 125 95 C 135 85, 160 78, 185 95 C 190 110, 188 130, 183 150 C 165 160, 145 158, 125 150 C 120 130, 118 110, 125 95 Z',
    colorBase: '#ef4444',
    colorHighlight: '#f87171',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'pectoral_mayor_L',
    nombre: 'Pectoral Mayor Izquierdo',
    nombreCorto: 'Pectoral Izq.',
    region: 'upper',
    subgrupo: 'pecho',
    vista: 'frontal',
    lado: 'L',
    path: 'M 215 95 C 225 85, 250 78, 275 95 C 282 110, 280 130, 275 150 C 255 160, 235 158, 215 150 C 210 130, 208 110, 215 95 Z',
    colorBase: '#ef4444',
    colorHighlight: '#f87171',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Hombros - Deltoides Anterior
  {
    id: 'deltoide_anterior_R',
    nombre: 'Deltoide Anterior Derecho',
    nombreCorto: 'Delt. Ant. Der.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'frontal',
    lado: 'R',
    path: 'M 100 78 C 90 70, 80 75, 75 90 C 72 105, 78 125, 90 130 C 100 125, 110 115, 118 100 C 120 88, 112 82, 100 78 Z',
    colorBase: '#8b5cf6',
    colorHighlight: '#a78bfa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'deltoide_anterior_L',
    nombre: 'Deltoide Anterior Izquierdo',
    nombreCorto: 'Delt. Ant. Izq.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'frontal',
    lado: 'L',
    path: 'M 300 78 C 310 70, 320 75, 325 90 C 328 105, 322 125, 310 130 C 300 125, 290 115, 282 100 C 280 88, 288 82, 300 78 Z',
    colorBase: '#8b5cf6',
    colorHighlight: '#a78bfa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Deltoides Medio (lateral en vistaura frontal)
  {
    id: 'deltoide_medio_R',
    nombre: 'Deltoide Medio Derecho',
    nombreCorto: 'Delt. Med. Der.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'frontal',
    lado: 'R',
    path: 'M 72 95 C 65 100, 62 115, 68 130 C 78 135, 88 130, 92 118 C 95 105, 90 95, 82 92 C 78 90, 75 92, 72 95 Z',
    colorBase: '#7c3aed',
    colorHighlight: '#8b5cf6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'deltoide_medio_L',
    nombre: 'Deltoide Medio Izquierdo',
    nombreCorto: 'Delt. Med. Izq.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'frontal',
    lado: 'L',
    path: 'M 328 95 C 335 100, 338 115, 332 130 C 322 135, 312 130, 308 118 C 305 105, 310 95, 318 92 C 322 90, 325 92, 328 95 Z',
    colorBase: '#7c3aed',
    colorHighlight: '#8b5cf6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Bíceps
  {
    id: 'biceps_R',
    nombre: 'Bíceps Braquial Derecho',
    nombreCorto: 'Bíceps Der.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'frontal',
    lado: 'R',
    path: 'M 85 140 C 80 155, 78 180, 82 210 C 88 218, 100 220, 108 212 C 112 185, 110 160, 105 142 C 100 135, 90 135, 85 140 Z',
    colorBase: '#ec4899',
    colorHighlight: '#f472b6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'biceps_L',
    nombre: 'Bíceps Braquial Izquierdo',
    nombreCorto: 'Bíceps Izq.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'frontal',
    lado: 'L',
    path: 'M 315 140 C 320 155, 322 180, 318 210 C 312 218, 300 220, 292 212 C 288 185, 290 160, 295 142 C 300 135, 310 135, 315 140 Z',
    colorBase: '#ec4899',
    colorHighlight: '#f472b6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Antebrazo
  {
    id: 'antebrazo_R',
    nombre: 'Antebrazo Derecho',
    nombreCorto: 'Antebrazo Der.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'frontal',
    lado: 'R',
    path: 'M 78 225 C 72 250, 68 290, 72 330 C 78 340, 95 340, 102 330 C 105 290, 102 250, 98 225 C 95 218, 82 218, 78 225 Z',
    colorBase: '#db2777',
    colorHighlight: '#ec4899',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'antebrazo_L',
    nombre: 'Antebrazo Izquierdo',
    nombreCorto: 'Antebrazo Izq.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'frontal',
    lado: 'L',
    path: 'M 322 225 C 328 250, 332 290, 328 330 C 322 340, 305 340, 298 330 C 295 290, 298 250, 302 225 C 305 218, 318 218, 322 225 Z',
    colorBase: '#db2777',
    colorHighlight: '#ec4899',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // CORE - Abdominales
  {
    id: 'recto_abdominal_superior',
    nombre: 'Recto Abdominal Superior',
    nombreCorto: 'Abdominal Sup.',
    region: 'core',
    subgrupo: 'core',
    vista: 'frontal',
    lado: 'ambos',
    path: 'M 155 165 C 150 168, 148 195, 155 220 C 170 225, 190 225, 205 220 C 212 195, 210 168, 205 165 C 190 160, 170 160, 155 165 Z',
    colorBase: '#10b981',
    colorHighlight: '#34d399',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'recto_abdominal_inferior',
    nombre: 'Recto Abdominal Inferior',
    nombreCorto: 'Abdominal Inf.',
    region: 'core',
    subgrupo: 'core',
    vista: 'frontal',
    lado: 'ambos',
    path: 'M 155 225 C 150 250, 152 280, 160 300 C 175 305, 185 305, 200 300 C 208 280, 210 250, 205 225 C 190 228, 170 228, 155 225 Z',
    colorBase: '#059669',
    colorHighlight: '#10b981',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Oblicuos
  {
    id: 'oblicuos_R',
    nombre: 'Oblicuos Externos Derechos',
    nombreCorto: 'Oblicuos Der.',
    region: 'core',
    subgrupo: 'core',
    vista: 'frontal',
    lado: 'R',
    path: 'M 125 158 C 118 180, 115 220, 120 260 C 130 270, 145 268, 155 255 C 152 220, 150 185, 155 165 C 145 160, 135 158, 125 158 Z',
    colorBase: '#22c55e',
    colorHighlight: '#4ade80',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'oblicuos_L',
    nombre: 'Oblicuos Externos Izquierdos',
    nombreCorto: 'Oblicuos Izq.',
    region: 'core',
    subgrupo: 'core',
    vista: 'frontal',
    lado: 'L',
    path: 'M 275 158 C 282 180, 285 220, 280 260 C 270 270, 255 268, 245 255 C 248 220, 250 185, 245 165 C 255 160, 265 158, 275 158 Z',
    colorBase: '#22c55e',
    colorHighlight: '#4ade80',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Serratos
  {
    id: 'serrato_R',
    nombre: 'Serrato Anterior Derecho',
    nombreCorto: 'Serrato Der.',
    region: 'core',
    subgrupo: 'core',
    vista: 'frontal',
    lado: 'R',
    path: 'M 118 160 C 108 175, 105 195, 110 210 C 118 205, 122 185, 125 165 C 122 160, 120 158, 118 160 Z',
    colorBase: '#14b8a6',
    colorHighlight: '#2dd4bf',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'serrato_L',
    nombre: 'Serrato Anterior Izquierdo',
    nombreCorto: 'Serrato Izq.',
    region: 'core',
    subgrupo: 'core',
    vista: 'frontal',
    lado: 'L',
    path: 'M 282 160 C 292 175, 295 195, 290 210 C 282 205, 278 185, 275 165 C 278 160, 280 158, 282 160 Z',
    colorBase: '#14b8a6',
    colorHighlight: '#2dd4bf',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // TREN INFERIOR - Cuádriceps
  {
    id: 'cuadriceps_R',
    nombre: 'Cuádriceps Derecho',
    nombreCorto: 'Cuádriceps Der.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'frontal',
    lado: 'R',
    path: 'M 140 305 C 132 340, 130 390, 138 440 C 150 450, 175 448, 185 435 C 188 390, 185 340, 178 305 C 168 300, 150 300, 140 305 Z',
    colorBase: '#3b82f6',
    colorHighlight: '#60a5fa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'cuadriceps_L',
    nombre: 'Cuádriceps Izquierdo',
    nombreCorto: 'Cuádriceps Izq.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'frontal',
    lado: 'L',
    path: 'M 260 305 C 268 340, 270 390, 262 440 C 250 450, 225 448, 215 435 C 212 390, 215 340, 222 305 C 232 300, 250 300, 260 305 Z',
    colorBase: '#3b82f6',
    colorHighlight: '#60a5fa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Vasto Lateral
  {
    id: 'vasto_lateral_R',
    nombre: 'Vasto Lateral Derecho',
    nombreCorto: 'V. Lat. Der.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'frontal',
    lado: 'R',
    path: 'M 130 330 C 125 360, 128 400, 135 430 C 142 425, 145 400, 145 360 C 148 340, 145 325, 138 320 C 135 322, 132 325, 130 330 Z',
    colorBase: '#2563eb',
    colorHighlight: '#3b82f6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'vasto_lateral_L',
    nombre: 'Vasto Lateral Izquierdo',
    nombreCorto: 'V. Lat. Izq.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'frontal',
    lado: 'L',
    path: 'M 270 330 C 275 360, 272 400, 265 430 C 258 425, 255 400, 255 360 C 252 340, 255 325, 262 320 C 265 322, 268 325, 270 330 Z',
    colorBase: '#2563eb',
    colorHighlight: '#3b82f6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Aductores
  {
    id: 'aductores_R',
    nombre: 'Aductores Derechos',
    nombreCorto: 'Aductores Der.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'frontal',
    lado: 'R',
    path: 'M 158 340 C 155 380, 158 420, 165 445 C 172 440, 175 420, 172 380 C 175 350, 172 335, 168 330 C 165 332, 160 335, 158 340 Z',
    colorBase: '#6366f1',
    colorHighlight: '#818cf8',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'aductores_L',
    nombre: 'Aductores Izquierdos',
    nombreCorto: 'Aductores Izq.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'frontal',
    lado: 'L',
    path: 'M 242 340 C 245 380, 242 420, 235 445 C 228 440, 225 420, 228 380 C 225 350, 228 335, 232 330 C 235 332, 240 335, 242 340 Z',
    colorBase: '#6366f1',
    colorHighlight: '#818cf8',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Rodilla / Ligamentos
  {
    id: 'rodilla_R',
    nombre: 'Rodilla Derecha',
    nombreCorto: 'Rodilla Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'frontal',
    lado: 'R',
    path: 'M 145 448 C 140 455, 142 470, 150 478 C 160 480, 170 478, 178 470 C 180 460, 175 450, 165 448 C 158 446, 150 446, 145 448 Z',
    colorBase: '#475569',
    colorHighlight: '#64748b',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'rodilla_L',
    nombre: 'Rodilla Izquierda',
    nombreCorto: 'Rodilla Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'frontal',
    lado: 'L',
    path: 'M 255 448 C 260 455, 258 470, 250 478 C 240 480, 230 478, 222 470 C 220 460, 225 450, 235 448 C 242 446, 250 446, 255 448 Z',
    colorBase: '#475569',
    colorHighlight: '#64748b',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Tibial Anterior
  {
    id: 'tibial_anterior_R',
    nombre: 'Tibial Anterior Derecho',
    nombreCorto: 'Tibial Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'frontal',
    lado: 'R',
    path: 'M 150 485 C 148 520, 152 560, 158 590 C 165 592, 172 590, 175 580 C 175 545, 172 510, 168 485 C 162 482, 155 482, 150 485 Z',
    colorBase: '#06b6d4',
    colorHighlight: '#22d3ee',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'tibial_anterior_L',
    nombre: 'Tibial Anterior Izquierdo',
    nombreCorto: 'Tibial Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'frontal',
    lado: 'L',
    path: 'M 250 485 C 252 520, 248 560, 242 590 C 235 592, 228 590, 225 580 C 225 545, 228 510, 232 485 C 238 482, 245 482, 250 485 Z',
    colorBase: '#06b6d4',
    colorHighlight: '#22d3ee',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Peroneos
  {
    id: 'peroneo_R',
    nombre: 'Peroneos Derechos',
    nombreCorto: 'Peroneo Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'frontal',
    lado: 'R',
    path: 'M 178 490 C 180 525, 178 565, 172 590 C 165 588, 162 580, 165 550 C 168 520, 172 495, 178 490 Z',
    colorBase: '#0891b2',
    colorHighlight: '#06b6d4',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'peroneo_L',
    nombre: 'Peroneos Izquierdos',
    nombreCorto: 'Peroneo Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'frontal',
    lado: 'L',
    path: 'M 222 490 C 220 525, 222 565, 228 590 C 235 588, 238 580, 235 550 C 232 520, 228 495, 222 490 Z',
    colorBase: '#0891b2',
    colorHighlight: '#06b6d4',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA TRASERA
  // ═══════════════════════════════════════════════════════════════════════
  
  // Trapecio
  {
    id: 'trapecio_superior',
    nombre: 'Trapecio Superior',
    nombreCorto: 'Trap. Sup.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'ambos',
    path: 'M 155 72 C 140 65, 115 70, 100 85 C 95 95, 100 115, 115 125 C 140 130, 160 130, 180 125 C 200 130, 220 130, 245 125 C 260 115, 265 95, 260 85 C 245 70, 220 65, 205 72 C 190 78, 170 78, 155 72 Z',
    colorBase: '#f59e0b',
    colorHighlight: '#fbbf24',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'trapecio_medio',
    nombre: 'Trapecio Medio',
    nombreCorto: 'Trap. Med.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'ambos',
    path: 'M 130 130 C 120 145, 118 170, 125 195 C 145 200, 165 200, 180 195 C 195 200, 215 200, 235 195 C 242 170, 240 145, 230 130 C 210 135, 190 135, 180 130 C 170 135, 150 135, 130 130 Z',
    colorBase: '#d97706',
    colorHighlight: '#f59e0b',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'trapecio_inferior',
    nombre: 'Trapecio Inferior',
    nombreCorto: 'Trap. Inf.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'ambos',
    path: 'M 155 200 C 145 215, 140 235, 145 255 C 160 260, 175 258, 180 250 C 185 258, 200 260, 215 255 C 220 235, 215 215, 205 200 C 195 205, 185 205, 180 200 C 175 205, 165 205, 155 200 Z',
    colorBase: '#b45309',
    colorHighlight: '#d97706',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Deltoides Posterior
  {
    id: 'deltoide_posterior_R',
    nombre: 'Deltoide Posterior Derecho',
    nombreCorto: 'Delt. Post. Der.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'trasera',
    lado: 'R',
    path: 'M 92 95 C 85 105, 82 125, 88 140 C 98 145, 110 140, 118 130 C 120 115, 115 100, 105 92 C 100 88, 95 90, 92 95 Z',
    colorBase: '#9333ea',
    colorHighlight: '#a855f7',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'deltoide_posterior_L',
    nombre: 'Deltoide Posterior Izquierdo',
    nombreCorto: 'Delt. Post. Izq.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'trasera',
    lado: 'L',
    path: 'M 268 95 C 275 105, 278 125, 272 140 C 262 145, 250 140, 242 130 C 240 115, 245 100, 255 92 C 260 88, 265 90, 268 95 Z',
    colorBase: '#9333ea',
    colorHighlight: '#a855f7',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Dorsal Ancho
  {
    id: 'dorsal_R',
    nombre: 'Dorsal Ancho Derecho',
    nombreCorto: 'Dorsal Der.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'R',
    path: 'M 115 140 C 105 165, 100 210, 110 260 C 130 270, 160 268, 178 255 C 180 220, 175 180, 165 145 C 150 138, 130 138, 115 140 Z',
    colorBase: '#ca8a04',
    colorHighlight: '#eab308',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'dorsal_L',
    nombre: 'Dorsal Ancho Izquierdo',
    nombreCorto: 'Dorsal Izq.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'L',
    path: 'M 245 140 C 255 165, 260 210, 250 260 C 230 270, 200 268, 182 255 C 180 220, 185 180, 195 145 C 210 138, 230 138, 245 140 Z',
    colorBase: '#ca8a04',
    colorHighlight: '#eab308',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Infraespinoso / Romboides
  {
    id: 'infraespinoso_R',
    nombre: 'Infraespinoso Derecho',
    nombreCorto: 'Infra. Der.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'R',
    path: 'M 118 130 C 110 140, 108 160, 115 175 C 125 180, 140 178, 150 168 C 152 150, 148 138, 138 130 C 130 128, 122 128, 118 130 Z',
    colorBase: '#a3a300',
    colorHighlight: '#ca8a04',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'infraespinoso_L',
    nombre: 'Infraespinoso Izquierdo',
    nombreCorto: 'Infra. Izq.',
    region: 'upper',
    subgrupo: 'espalda',
    vista: 'trasera',
    lado: 'L',
    path: 'M 242 130 C 250 140, 252 160, 245 175 C 235 180, 220 178, 210 168 C 208 150, 212 138, 222 130 C 230 128, 238 128, 242 130 Z',
    colorBase: '#a3a300',
    colorHighlight: '#ca8a04',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Tríceps
  {
    id: 'triceps_R',
    nombre: 'Tríceps Braquial Derecho',
    nombreCorto: 'Tríceps Der.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'trasera',
    lado: 'R',
    path: 'M 82 145 C 75 170, 75 210, 82 240 C 92 248, 105 245, 112 235 C 115 200, 112 165, 105 145 C 98 140, 88 140, 82 145 Z',
    colorBase: '#e879f9',
    colorHighlight: '#f0abfc',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'triceps_L',
    nombre: 'Tríceps Braquial Izquierdo',
    nombreCorto: 'Tríceps Izq.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'trasera',
    lado: 'L',
    path: 'M 278 145 C 285 170, 285 210, 278 240 C 268 248, 255 245, 248 235 C 245 200, 248 165, 255 145 C 262 140, 272 140, 278 145 Z',
    colorBase: '#e879f9',
    colorHighlight: '#f0abfc',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Erectores Espinales
  {
    id: 'erectores_espinales',
    nombre: 'Erectores Espinales',
    nombreCorto: 'Lumbar',
    region: 'core',
    subgrupo: 'core',
    vista: 'trasera',
    lado: 'ambos',
    path: 'M 155 265 C 150 290, 152 320, 160 340 C 175 345, 185 345, 200 340 C 208 320, 210 290, 205 265 C 190 260, 170 260, 155 265 Z',
    colorBase: '#047857',
    colorHighlight: '#059669',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Glúteo Mayor
  {
    id: 'gluteo_mayor_R',
    nombre: 'Glúteo Mayor Derecho',
    nombreCorto: 'Glút. May. Der.',
    region: 'lower',
    subgrupo: 'cadera',
    vista: 'trasera',
    lado: 'R',
    path: 'M 125 345 C 115 370, 118 405, 130 425 C 150 435, 175 430, 185 410 C 188 380, 182 355, 168 345 C 155 340, 138 340, 125 345 Z',
    colorBase: '#00d4ff',
    colorHighlight: '#22eaff',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gluteo_mayor_L',
    nombre: 'Glúteo Mayor Izquierdo',
    nombreCorto: 'Glút. May. Izq.',
    region: 'lower',
    subgrupo: 'cadera',
    vista: 'trasera',
    lado: 'L',
    path: 'M 235 345 C 245 370, 242 405, 230 425 C 210 435, 185 430, 175 410 C 172 380, 178 355, 192 345 C 205 340, 222 340, 235 345 Z',
    colorBase: '#00d4ff',
    colorHighlight: '#22eaff',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Glúteo Medio
  {
    id: 'gluteo_medio_R',
    nombre: 'Glúteo Medio Derecho',
    nombreCorto: 'Glút. Med. Der.',
    region: 'lower',
    subgrupo: 'cadera',
    vista: 'trasera',
    lado: 'R',
    path: 'M 118 320 C 108 335, 110 360, 122 375 C 138 378, 155 375, 165 365 C 168 345, 160 328, 145 320 C 135 318, 125 318, 118 320 Z',
    colorBase: '#0284c7',
    colorHighlight: '#0ea5e9',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gluteo_medio_L',
    nombre: 'Glúteo Medio Izquierdo',
    nombreCorto: 'Glút. Med. Izq.',
    region: 'lower',
    subgrupo: 'cadera',
    vista: 'trasera',
    lado: 'L',
    path: 'M 242 320 C 252 335, 250 360, 238 375 C 222 378, 205 375, 195 365 C 192 345, 200 328, 215 320 C 225 318, 235 318, 242 320 Z',
    colorBase: '#0284c7',
    colorHighlight: '#0ea5e9',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Isquiotibiales
  {
    id: 'isquiotibiales_R',
    nombre: 'Isquiotibiales Derechos',
    nombreCorto: 'Isquios Der.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'trasera',
    lado: 'R',
    path: 'M 135 430 C 130 465, 135 505, 145 535 C 158 540, 175 538, 185 525 C 188 490, 182 455, 172 430 C 160 425, 145 425, 135 430 Z',
    colorBase: '#1d4ed8',
    colorHighlight: '#2563eb',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'isquiotibiales_L',
    nombre: 'Isquiotibiales Izquierdos',
    nombreCorto: 'Isquios Izq.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'trasera',
    lado: 'L',
    path: 'M 225 430 C 230 465, 225 505, 215 535 C 202 540, 185 538, 175 525 C 172 490, 178 455, 188 430 C 200 425, 215 425, 225 430 Z',
    colorBase: '#1d4ed8',
    colorHighlight: '#2563eb',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Gastrocnemio (Gemelos)
  {
    id: 'gastrocnemio_R',
    nombre: 'Gastrocnemio Derecho',
    nombreCorto: 'Gemelo Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'trasera',
    lado: 'R',
    path: 'M 148 545 C 142 575, 148 610, 158 635 C 168 640, 178 638, 185 625 C 188 595, 182 565, 172 545 C 165 540, 155 540, 148 545 Z',
    colorBase: '#0e7490',
    colorHighlight: '#0891b2',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gastrocnemio_L',
    nombre: 'Gastrocnemio Izquierdo',
    nombreCorto: 'Gemelo Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'trasera',
    lado: 'L',
    path: 'M 212 545 C 218 575, 212 610, 202 635 C 192 640, 182 638, 175 625 C 172 595, 178 565, 188 545 C 195 540, 205 540, 212 545 Z',
    colorBase: '#0e7490',
    colorHighlight: '#0891b2',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Sóleo
  {
    id: 'soleo_R',
    nombre: 'Sóleo Derecho',
    nombreCorto: 'Sóleo Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'trasera',
    lado: 'R',
    path: 'M 155 625 C 150 645, 155 665, 165 675 C 172 672, 178 665, 175 645 C 175 630, 170 620, 162 618 C 158 620, 155 622, 155 625 Z',
    colorBase: '#155e75',
    colorHighlight: '#0e7490',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'soleo_L',
    nombre: 'Sóleo Izquierdo',
    nombreCorto: 'Sóleo Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'trasera',
    lado: 'L',
    path: 'M 205 625 C 210 645, 205 665, 195 675 C 188 672, 182 665, 185 645 C 185 630, 190 620, 198 618 C 202 620, 205 622, 205 625 Z',
    colorBase: '#155e75',
    colorHighlight: '#0e7490',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // Aquiles
  {
    id: 'aquiles_R',
    nombre: 'Tendón de Aquiles Derecho',
    nombreCorto: 'Aquiles Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'trasera',
    lado: 'R',
    path: 'M 162 670 L 160 700 L 170 700 L 168 670 Z',
    colorBase: '#64748b',
    colorHighlight: '#94a3b8',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'aquiles_L',
    nombre: 'Tendón de Aquiles Izquierdo',
    nombreCorto: 'Aquiles Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'trasera',
    lado: 'L',
    path: 'M 198 670 L 200 700 L 190 700 L 192 670 Z',
    colorBase: '#64748b',
    colorHighlight: '#94a3b8',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA IZQUIERDA (Lateral Izquierdo)
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    id: 'deltoide_L_lat',
    nombre: 'Deltoide Izquierdo',
    nombreCorto: 'Delt. Izq.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 75 95 C 60 85, 45 90, 40 110 C 38 130, 48 150, 65 155 C 80 148, 88 135, 85 115 C 85 100, 80 95, 75 95 Z',
    colorBase: '#8b5cf6',
    colorHighlight: '#a78bfa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'biceps_L_lat',
    nombre: 'Bíceps Izquierdo',
    nombreCorto: 'Bíceps Izq.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 65 160 C 55 190, 55 230, 62 265 C 75 275, 90 270, 95 255 C 95 215, 90 180, 82 160 C 78 155, 68 155, 65 160 Z',
    colorBase: '#ec4899',
    colorHighlight: '#f472b6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'antebrazo_L_lat',
    nombre: 'Antebrazo Izquierdo',
    nombreCorto: 'Antebrazo Izq.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 58 280 C 50 320, 52 370, 58 410 C 70 420, 88 415, 95 400 C 95 355, 92 310, 85 280 C 78 275, 65 275, 58 280 Z',
    colorBase: '#db2777',
    colorHighlight: '#ec4899',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'pectoral_L_lat',
    nombre: 'Pectoral Izquierdo',
    nombreCorto: 'Pect. Izq.',
    region: 'upper',
    subgrupo: 'pecho',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 95 110 C 105 105, 115 105, 125 115 C 128 140, 125 165, 118 180 C 105 175, 95 165, 92 145 C 90 125, 90 115, 95 110 Z',
    colorBase: '#ef4444',
    colorHighlight: '#f87171',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'oblicuos_L_lat',
    nombre: 'Oblicuos Izquierdos',
    nombreCorto: 'Oblic. Izq.',
    region: 'core',
    subgrupo: 'core',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 85 195 C 78 230, 80 280, 88 320 C 100 330, 118 325, 125 310 C 125 265, 120 225, 110 195 C 100 188, 90 188, 85 195 Z',
    colorBase: '#22c55e',
    colorHighlight: '#4ade80',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gluteo_L_lat',
    nombre: 'Glúteos Izquierdos',
    nombreCorto: 'Glút. Izq.',
    region: 'lower',
    subgrupo: 'cadera',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 70 330 C 55 355, 55 395, 68 420 C 88 430, 115 425, 130 405 C 132 375, 125 350, 105 335 C 92 325, 78 325, 70 330 Z',
    colorBase: '#00d4ff',
    colorHighlight: '#22eaff',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'cuadriceps_L_lat',
    nombre: 'Cuádriceps Izquierdo',
    nombreCorto: 'Cuád. Izq.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 95 430 C 85 475, 88 530, 100 575 C 118 585, 145 580, 158 560 C 160 510, 155 460, 140 430 C 125 420, 105 420, 95 430 Z',
    colorBase: '#3b82f6',
    colorHighlight: '#60a5fa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'hamstrings_L_lat',
    nombre: 'Isquiotibiales Izquierdos',
    nombreCorto: 'Isquios Izq.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 60 445 C 50 490, 55 540, 68 580 C 80 585, 92 580, 98 560 C 95 515, 88 470, 78 445 C 72 440, 65 440, 60 445 Z',
    colorBase: '#1d4ed8',
    colorHighlight: '#2563eb',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gastrocnemio_L_lat',
    nombre: 'Gastrocnemio Izquierdo',
    nombreCorto: 'Gemelo Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 85 590 C 75 625, 80 670, 92 705 C 105 715, 125 710, 135 690 C 138 645, 132 605, 118 590 C 108 582, 92 582, 85 590 Z',
    colorBase: '#0891b2',
    colorHighlight: '#06b6d4',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'tibial_L_lat',
    nombre: 'Tibial Anterior Izquierdo',
    nombreCorto: 'Tibial Izq.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'izquierda',
    lado: 'L',
    path: 'M 140 595 C 145 630, 145 675, 138 710 C 130 715, 120 712, 115 700 C 118 660, 122 620, 128 595 C 132 590, 138 590, 140 595 Z',
    colorBase: '#06b6d4',
    colorHighlight: '#22d3ee',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA DERECHA (Lateral Derecho)
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    id: 'deltoide_R_lat',
    nombre: 'Deltoide Derecho',
    nombreCorto: 'Delt. Der.',
    region: 'upper',
    subgrupo: 'hombros',
    vista: 'derecha',
    lado: 'R',
    path: 'M 285 95 C 300 85, 315 90, 320 110 C 322 130, 312 150, 295 155 C 280 148, 272 135, 275 115 C 275 100, 280 95, 285 95 Z',
    colorBase: '#8b5cf6',
    colorHighlight: '#a78bfa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'biceps_R_lat',
    nombre: 'Bíceps Derecho',
    nombreCorto: 'Bíceps Der.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'derecha',
    lado: 'R',
    path: 'M 295 160 C 305 190, 305 230, 298 265 C 285 275, 270 270, 265 255 C 265 215, 270 180, 278 160 C 282 155, 292 155, 295 160 Z',
    colorBase: '#ec4899',
    colorHighlight: '#f472b6',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'antebrazo_R_lat',
    nombre: 'Antebrazo Derecho',
    nombreCorto: 'Antebrazo Der.',
    region: 'upper',
    subgrupo: 'brazos',
    vista: 'derecha',
    lado: 'R',
    path: 'M 302 280 C 310 320, 308 370, 302 410 C 290 420, 272 415, 265 400 C 265 355, 268 310, 275 280 C 282 275, 295 275, 302 280 Z',
    colorBase: '#db2777',
    colorHighlight: '#ec4899',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'pectoral_R_lat',
    nombre: 'Pectoral Derecho',
    nombreCorto: 'Pect. Der.',
    region: 'upper',
    subgrupo: 'pecho',
    vista: 'derecha',
    lado: 'R',
    path: 'M 265 110 C 255 105, 245 105, 235 115 C 232 140, 235 165, 242 180 C 255 175, 265 165, 268 145 C 270 125, 270 115, 265 110 Z',
    colorBase: '#ef4444',
    colorHighlight: '#f87171',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'oblicuos_R_lat',
    nombre: 'Oblicuos Derechos',
    nombreCorto: 'Oblic. Der.',
    region: 'core',
    subgrupo: 'core',
    vista: 'derecha',
    lado: 'R',
    path: 'M 275 195 C 282 230, 280 280, 272 320 C 260 330, 242 325, 235 310 C 235 265, 240 225, 250 195 C 260 188, 270 188, 275 195 Z',
    colorBase: '#22c55e',
    colorHighlight: '#4ade80',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gluteo_R_lat',
    nombre: 'Glúteos Derechos',
    nombreCorto: 'Glút. Der.',
    region: 'lower',
    subgrupo: 'cadera',
    vista: 'derecha',
    lado: 'R',
    path: 'M 290 330 C 305 355, 305 395, 292 420 C 272 430, 245 425, 230 405 C 228 375, 235 350, 255 335 C 268 325, 282 325, 290 330 Z',
    colorBase: '#00d4ff',
    colorHighlight: '#22eaff',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'cuadriceps_R_lat',
    nombre: 'Cuádriceps Derecho',
    nombreCorto: 'Cuád. Der.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'derecha',
    lado: 'R',
    path: 'M 265 430 C 275 475, 272 530, 260 575 C 242 585, 215 580, 202 560 C 200 510, 205 460, 220 430 C 235 420, 255 420, 265 430 Z',
    colorBase: '#3b82f6',
    colorHighlight: '#60a5fa',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'hamstrings_R_lat',
    nombre: 'Isquiotibiales Derechos',
    nombreCorto: 'Isquios Der.',
    region: 'lower',
    subgrupo: 'muslo',
    vista: 'derecha',
    lado: 'R',
    path: 'M 300 445 C 310 490, 305 540, 292 580 C 280 585, 268 580, 262 560 C 265 515, 272 470, 282 445 C 288 440, 295 440, 300 445 Z',
    colorBase: '#1d4ed8',
    colorHighlight: '#2563eb',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'gastrocnemio_R_lat',
    nombre: 'Gastrocnemio Derecho',
    nombreCorto: 'Gemelo Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'derecha',
    lado: 'R',
    path: 'M 275 590 C 285 625, 280 670, 268 705 C 255 715, 235 710, 225 690 C 222 645, 228 605, 242 590 C 252 582, 268 582, 275 590 Z',
    colorBase: '#0891b2',
    colorHighlight: '#06b6d4',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
  {
    id: 'tibial_R_lat',
    nombre: 'Tibial Anterior Derecho',
    nombreCorto: 'Tibial Der.',
    region: 'lower',
    subgrupo: 'pierna',
    vista: 'derecha',
    lado: 'R',
    path: 'M 220 595 C 215 630, 215 675, 222 710 C 230 715, 240 712, 245 700 C 242 660, 238 620, 232 595 C 228 590, 222 590, 220 595 Z',
    colorBase: '#06b6d4',
    colorHighlight: '#22d3ee',
    fuerza: { R: 0, L: 0 },
    evaluado: false
  },
]

// ============================================================================
// COLORES POR SUBGRUPO
// ============================================================================

const SUBGRUPO_COLORS: Record<string, { base: string; highlight: string }> = {
  pecho: { base: '#ef4444', highlight: '#f87171' },
  espalda: { base: '#f59e0b', highlight: '#fbbf24' },
  hombros: { base: '#8b5cf6', highlight: '#a78bfa' },
  brazos: { base: '#ec4899', highlight: '#f472b6' },
  core: { base: '#10b981', highlight: '#34d399' },
  cadera: { base: '#00d4ff', highlight: '#22eaff' },
  muslo: { base: '#3b82f6', highlight: '#60a5fa' },
  pierna: { base: '#06b6d4', highlight: '#22d3ee' },
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AnatomicalMuscleModel({
  onMuscleSelect,
  onMuscleHover,
  selectedMuscleId,
  evaluatedMuscles = {}
}: AnatomicalMuscleModelProps) {
  const [vistaActual, setVistaActual] = useState<VistaCuerpo>('frontal')
  const [hoveredMuscle, setHoveredMuscle] = useState<Musculo | null>(null)
  const [musculoSeleccionado, setMusculoSeleccionado] = useState<string | null>(selectedMuscleId || null)
  
  // Filtrar músculos por vista actual
  const musculosVisibles = useMemo(() => {
    return MUSCULOS.filter(m => m.vista === vistaActual)
  }, [vistaActual])
  
  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = MUSCULOS.length
    const evaluados = Object.keys(evaluatedMuscles).length
    const porcentaje = Math.round((evaluados / total) * 100)
    
    const regiones = {
      upper: { total: MUSCULOS.filter(m => m.region === 'upper').length, evaluados: 0 },
      core: { total: MUSCULOS.filter(m => m.region === 'core').length, evaluados: 0 },
      lower: { total: MUSCULOS.filter(m => m.region === 'lower').length, evaluados: 0 }
    }
    
    Object.keys(evaluatedMuscles).forEach(id => {
      const m = MUSCULOS.find(mus => mus.id === id)
      if (m) regiones[m.region].evaluados++
    })
    
    return { total, evaluados, porcentaje, regiones }
  }, [evaluatedMuscles])
  
  // Handlers
  const handleMuscleClick = useCallback((musculo: Musculo) => {
    setMusculoSeleccionado(musculo.id)
    onMuscleSelect?.(musculo)
  }, [onMuscleSelect])
  
  const handleMuscleEnter = useCallback((musculo: Musculo) => {
    setHoveredMuscle(musculo)
    onMuscleHover?.(musculo)
  }, [onMuscleHover])
  
  const handleMuscleLeave = useCallback(() => {
    setHoveredMuscle(null)
    onMuscleHover?.(null)
  }, [onMuscleHover])
  
  // Obtener color del músculo según estado
  const getMuscleColor = (musculo: Musculo) => {
    const evaluado = evaluatedMuscles[musculo.id]
    const isSelected = musculoSeleccionado === musculo.id
    const isHovered = hoveredMuscle?.id === musculo.id
    
    if (evaluado) {
      // Color basado en nivel de fuerza
      const fuerza = musculo.lado === 'R' ? evaluado.R : musculo.lado === 'L' ? evaluado.L : (evaluado.R + evaluado.L) / 2
      const intensidad = Math.min(1, fuerza / 100) // Normalizar a 100kg max
      
      if (isSelected || isHovered) return musculo.colorHighlight
      return musculo.colorBase
    }
    
    if (isSelected) return musculo.colorHighlight
    if (isHovered) return musculo.colorBase
    
    return '#2a3a2f' // Color base sin evaluar
  }
  
  // Obtener opacidad según estado
  const getMuscleOpacity = (musculo: Musculo) => {
    const evaluado = evaluatedMuscles[musculo.id]
    const isSelected = musculoSeleccionado === musculo.id
    const isHovered = hoveredMuscle?.id === musculo.id
    
    if (evaluado) return 0.85
    if (isSelected) return 0.7
    if (isHovered) return 0.5
    return 0.25
  }

  // SVG viewBox según vista
  const getViewBox = () => {
    if (vistaActual === 'izquierda' || vistaActual === 'derecha') {
      return '0 0 360 750'
    }
    return '0 0 360 720'
  }
  
  return (
    <div className="w-full">
      {/* Selector de Vistas */}
      <div className="flex justify-center gap-2 mb-4">
        {[
          { id: 'frontal', label: 'Frontal', icon: '👤', desc: 'Vista anterior' },
          { id: 'trasera', label: 'Trasera', icon: '👤', desc: 'Vista posterior' },
          { id: 'izquierda', label: 'Izquierda', icon: '←', desc: 'Lado izquierdo' },
          { id: 'derecha', label: 'Derecha', icon: '→', desc: 'Lado derecho' },
        ].map(vista => (
          <button
            key={vista.id}
            onClick={() => setVistaActual(vista.id as VistaCuerpo)}
            className={`
              flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300
              ${vistaActual === vista.id 
                ? 'bg-gradient-to-br from-[#13ec6d] to-[#00d4ff] text-[#102218] shadow-lg shadow-[#13ec6d]/30 scale-105' 
                : 'bg-[#1a2a1f] text-slate-400 hover:text-white hover:bg-[#243328] border border-white/5'
              }
            `}
          >
            <span className="text-lg">{vista.icon}</span>
            <span>{vista.label}</span>
          </button>
        ))}
      </div>
      
      {/* Contenedor Principal */}
      <div className="relative bg-gradient-to-b from-[#0d1a12] to-[#152218] rounded-3xl p-6 border border-white/5 shadow-2xl">
        {/* Header con estadísticas */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Modelo Anatómico Interactivo
            </h3>
            <p className="text-xs text-slate-500">
              Click en un músculo para seleccionarlo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-[#13ec6d]">{stats.evaluados}/{stats.total}</p>
              <p className="text-[10px] text-slate-500">músculos evaluados</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="#1a2a1f"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="#13ec6d"
                  strokeWidth="3"
                  strokeDasharray={`${stats.porcentaje} 100`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                {stats.porcentaje}%
              </span>
            </div>
          </div>
        </div>
        
        {/* SVG del cuerpo */}
        <div className="relative flex justify-center">
          <svg 
            viewBox={getViewBox()} 
            className="w-full max-w-sm h-auto"
            style={{ filter: 'drop-shadow(0 0 20px rgba(19, 236, 109, 0.1))' }}
          >
            {/* Definiciones de gradientes y filtros */}
            <defs>
              {/* Gradiente para silueta */}
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a2a1f" />
                <stop offset="100%" stopColor="#0d1a12" />
              </linearGradient>
              
              {/* Filtro de brillo */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Sombra interior */}
              <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset dx="0" dy="2" />
                <feGaussianBlur stdDeviation="2" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood floodColor="black" floodOpacity="0.3" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
              </filter>
              
              {/* Gradientes por grupo muscular */}
              {Object.entries(SUBGRUPO_COLORS).map(([grupo, colors]) => (
                <linearGradient key={grupo} id={`grad-${grupo}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.highlight} />
                  <stop offset="100%" stopColor={colors.base} />
                </linearGradient>
              ))}
            </defs>
            
            {/* SILUETA DEL CUERPO */}
            <g className="silueta">
              {/* Cabeza */}
              <ellipse 
                cx="180" cy="42" rx="32" ry="38" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
                filter="url(#innerShadow)"
              />
              
              {/* Cuello */}
              <path 
                d="M 160 75 L 160 90 C 170 95, 190 95, 200 90 L 200 75" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Hombros y Torso superior */}
              <path 
                d="M 100 100 
                   C 90 95, 80 100, 75 115
                   L 75 140
                   C 80 138, 90 138, 100 145
                   L 120 90
                   C 110 92, 105 95, 100 100
                   Z"
                fill="url(#bodyGradient)"
                stroke="#3a4a3f"
                strokeWidth="1"
              />
              <path 
                d="M 260 100 
                   C 270 95, 280 100, 285 115
                   L 285 140
                   C 280 138, 270 138, 260 145
                   L 240 90
                   C 250 92, 255 95, 260 100
                   Z"
                fill="url(#bodyGradient)"
                stroke="#3a4a3f"
                strokeWidth="1"
              />
              
              {/* Torso central */}
              <path 
                d="M 120 90 L 120 270 C 130 275, 170 275, 180 275 C 190 275, 230 275, 240 270 L 240 90 C 200 95, 160 95, 120 90 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Brazos */}
              <path 
                d="M 70 145 C 60 180, 55 230, 65 280 L 95 280 C 100 230, 98 180, 95 145 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              <path 
                d="M 290 145 C 300 180, 305 230, 295 280 L 265 280 C 260 230, 262 180, 265 145 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Antebrazos */}
              <path 
                d="M 60 290 C 50 340, 52 400, 62 440 L 92 440 C 100 400, 98 340, 92 290 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              <path 
                d="M 300 290 C 310 340, 308 400, 298 440 L 268 440 C 260 400, 262 340, 268 290 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Manos */}
              <ellipse cx="77" cy="465" rx="22" ry="28" fill="url(#bodyGradient)" stroke="#3a4a3f" strokeWidth="1" />
              <ellipse cx="283" cy="465" rx="22" ry="28" fill="url(#bodyGradient)" stroke="#3a4a3f" strokeWidth="1" />
              
              {/* Cadera */}
              <path 
                d="M 120 270 C 110 285, 115 310, 130 325 C 150 335, 180 335, 180 335 C 180 335, 210 335, 230 325 C 245 310, 250 285, 240 270 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Muslos */}
              <path 
                d="M 125 330 C 115 390, 120 460, 145 515 L 185 515 C 195 460, 190 390, 180 330 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              <path 
                d="M 235 330 C 245 390, 240 460, 215 515 L 175 515 C 165 460, 170 390, 180 330 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Rodillas */}
              <ellipse cx="165" cy="530" rx="28" ry="22" fill="url(#bodyGradient)" stroke="#3a4a3f" strokeWidth="1" />
              <ellipse cx="195" cy="530" rx="28" ry="22" fill="url(#bodyGradient)" stroke="#3a4a3f" strokeWidth="1" />
              
              {/* Pantorrillas */}
              <path 
                d="M 145 550 C 138 595, 142 640, 155 680 L 175 680 C 182 640, 180 595, 175 550 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              <path 
                d="M 215 550 C 222 595, 218 640, 205 680 L 185 680 C 178 640, 180 595, 185 550 Z" 
                fill="url(#bodyGradient)" 
                stroke="#3a4a3f" 
                strokeWidth="1"
              />
              
              {/* Pies */}
              <ellipse cx="165" cy="705" rx="32" ry="18" fill="url(#bodyGradient)" stroke="#3a4a3f" strokeWidth="1" />
              <ellipse cx="195" cy="705" rx="32" ry="18" fill="url(#bodyGradient)" stroke="#3a4a3f" strokeWidth="1" />
            </g>
            
            {/* MÚSCULOS INTERACTIVOS */}
            <g className="musculos">
              {musculosVisibles.map(musculo => {
                const evaluado = evaluatedMuscles[musculo.id]
                const isSelected = musculoSeleccionado === musculo.id
                const isHovered = hoveredMuscle?.id === musculo.id
                
                return (
                  <g key={musculo.id}>
                    {/* Sombra del músculo */}
                    <path
                      d={musculo.path}
                      fill="rgba(0,0,0,0.3)"
                      transform="translate(2, 2)"
                      className="transition-all duration-200"
                    />
                    
                    {/* Músculo principal */}
                    <path
                      d={musculo.path}
                      fill={getMuscleColor(musculo)}
                      fillOpacity={getMuscleOpacity(musculo)}
                      stroke={isSelected ? '#fff' : isHovered ? musculo.colorHighlight : musculo.colorBase}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                      className="cursor-pointer transition-all duration-200"
                      filter={isSelected || isHovered ? 'url(#glow)' : undefined}
                      onClick={() => handleMuscleClick(musculo)}
                      onMouseEnter={() => handleMuscleEnter(musculo)}
                      onMouseLeave={handleMuscleLeave}
                    />
                    
                    {/* Etiqueta de valor si está evaluado */}
                    {evaluado && (
                      <g className="pointer-events-none">
                        {/* Fondo del texto */}
                        <rect
                          x={(() => {
                            const match = musculo.path.match(/M\s*(\d+)/)
                            return match ? parseInt(match[1]) - 12 : 100
                          })()}
                          y={(() => {
                            const match = musculo.path.match(/M\s*\d+\s+(\d+)/)
                            return match ? parseInt(match[1]) - 8 : 100
                          })()}
                          width="24"
                          height="16"
                          rx="4"
                          fill="rgba(0,0,0,0.7)"
                        />
                        {/* Valor */}
                        <text
                          x={(() => {
                            const match = musculo.path.match(/M\s*(\d+)/)
                            return match ? parseInt(match[1]) : 100
                          })()}
                          y={(() => {
                            const match = musculo.path.match(/M\s*\d+\s+(\d+)/)
                            return match ? parseInt(match[1]) + 4 : 100
                          })()}
                          fill="#fff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {musculo.lado === 'R' 
                            ? evaluado.R.toFixed(0) 
                            : musculo.lado === 'L' 
                              ? evaluado.L.toFixed(0)
                              : ((evaluado.R + evaluado.L) / 2).toFixed(0)
                          }
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
          
          {/* Tooltip */}
          {hoveredMuscle && (
            <div 
              className="absolute top-4 left-4 bg-[#102218]/95 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-xl z-10 min-w-[200px] transition-all duration-200"
              style={{ 
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredMuscle.colorBase }}
                />
                <span className="font-bold text-white">{hoveredMuscle.nombre}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 bg-white/5 rounded-full">
                  {hoveredMuscle.region === 'upper' ? 'Tren Superior' : 
                   hoveredMuscle.region === 'core' ? 'Core' : 'Tren Inferior'}
                </span>
                <span>•</span>
                <span className="capitalize">{hoveredMuscle.subgrupo}</span>
              </div>
              {evaluatedMuscles[hoveredMuscle.id] && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lado Der.:</span>
                    <span className="text-[#00f0ff] font-mono">{evaluatedMuscles[hoveredMuscle.id].R.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lado Izq.:</span>
                    <span className="text-[#f59e0b] font-mono">{evaluatedMuscles[hoveredMuscle.id].L.toFixed(1)} kg</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Leyenda de colores */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            { color: '#ef4444', label: 'Pecho', grupo: 'pecho' },
            { color: '#f59e0b', label: 'Espalda', grupo: 'espalda' },
            { color: '#8b5cf6', label: 'Hombros', grupo: 'hombros' },
            { color: '#ec4899', label: 'Brazos', grupo: 'brazos' },
            { color: '#10b981', label: 'Core', grupo: 'core' },
            { color: '#00d4ff', label: 'Cadera', grupo: 'cadera' },
            { color: '#3b82f6', label: 'Muslo', grupo: 'muslo' },
            { color: '#06b6d4', label: 'Pierna', grupo: 'pierna' },
          ].map(item => (
            <div 
              key={item.grupo} 
              className="flex items-center justify-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div 
                className="w-4 h-4 rounded-md shadow-lg" 
                style={{ 
                  backgroundColor: item.color,
                  boxShadow: `0 2px 8px ${item.color}40`
                }} 
              />
              <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        
        {/* Estadísticas por región */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-[#1a2a1f] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Tren Superior</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-[#ef4444]">{stats.regiones.upper.evaluados}</span>
              <span className="text-slate-500">/</span>
              <span className="text-sm text-slate-400">{stats.regiones.upper.total}</span>
            </div>
          </div>
          <div className="bg-[#1a2a1f] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Core</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-[#13ec6d]">{stats.regiones.core.evaluados}</span>
              <span className="text-slate-500">/</span>
              <span className="text-sm text-slate-400">{stats.regiones.core.total}</span>
            </div>
          </div>
          <div className="bg-[#1a2a1f] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Tren Inferior</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-[#3b82f6]">{stats.regiones.lower.evaluados}</span>
              <span className="text-slate-500">/</span>
              <span className="text-sm text-slate-400">{stats.regiones.lower.total}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animación CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
