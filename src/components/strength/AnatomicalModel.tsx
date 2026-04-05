'use client'

import { useState, useMemo } from 'react'

// ============================================================================
// TYPES
// ============================================================================

type VistaCuerpo = 'frontal' | 'trasera' | 'izquierda' | 'derecha'
type RegionCuerpo = 'superior' | 'core' | 'inferior'

interface MusculoAnatomico {
  id: string
  name: string
  region: RegionCuerpo
  subgroup: string
  function: string
  exercises: string[]
  synergy: string[]
  vista: VistaCuerpo
  lado: 'R' | 'L' | 'ambos'
  path: string
  colorBase: string
  colorHighlight: string
  fuerza: { R: number; L: number }
  evaluado: boolean
}

interface AnatomicalModelProps {
  onMuscleSelect?: (muscle: MusculoAnatomico) => void
  onMuscleHover?: (muscle: MusculoAnatomico | null) => void
  selectedMuscleId?: string | null
  fuerzas?: Record<string, { R: number; L: number }>
  evaluados?: Set<string>
  showValues?: boolean
  mode?: 'selection' | 'display'
}

// ============================================================================
// MÚSCULOS - DATOS MAESTROS (TU ESTRUCTURA)
// ============================================================================

const MUSCLES_MASTER = {
  "pectoral-mayor": {
    name: "Pectoral Mayor",
    region: "superior" as const,
    subgroup: "pecho",
    function: "empuje",
    exercises: ["Press Banca", "Press Inclinado", "Fondos", "Aperturas"],
    synergy: ["deltoide-anterior", "triceps-braquial"]
  },
  "dorsal-ancho": {
    name: "Dorsal Ancho",
    region: "superior" as const,
    subgroup: "espalda",
    function: "tracción",
    exercises: ["Dominadas", "Jalón al Pecho", "Remo", "Pullover"],
    synergy: ["biceps-braquial"]
  },
  "trapecio-medio-inferior": {
    name: "Trapecio Medio/Inferior",
    region: "superior" as const,
    subgroup: "espalda",
    function: "estabilidad",
    exercises: ["Encogimientos", "Remo al Mentón", "Face Pull", "Y-T-W-L"],
    synergy: ["deltoide-posterior"]
  },
  "deltoide-anterior": {
    name: "Deltoide Anterior",
    region: "superior" as const,
    subgroup: "hombros",
    function: "empuje",
    exercises: ["Press Militar", "Elevaciones Frontales", "Press Arnold"],
    synergy: ["pectoral-mayor", "triceps-braquial"]
  },
  "deltoide-medio": {
    name: "Deltoide Medio",
    region: "superior" as const,
    subgroup: "hombros",
    function: "abducción",
    exercises: ["Elevaciones Laterales", "Press Arnold", "Pájaros"],
    synergy: []
  },
  "deltoide-posterior": {
    name: "Deltoide Posterior",
    region: "superior" as const,
    subgroup: "hombros",
    function: "tracción",
    exercises: ["Pájaros", "Face Pull", "Reverse Fly", "Remo al cuello"],
    synergy: ["trapecio-medio-inferior"]
  },
  "biceps-braquial": {
    name: "Bíceps Braquial",
    region: "superior" as const,
    subgroup: "brazos",
    function: "tracción",
    exercises: ["Curl Barra", "Curl Mancuernas", "Curl Martillo", "Curl Concentrado"],
    synergy: ["dorsal-ancho"]
  },
  "triceps-braquial": {
    name: "Tríceps Braquial",
    region: "superior" as const,
    subgroup: "brazos",
    function: "empuje",
    exercises: ["Press Francés", "Extensiones", "Fondos", "Patada de Tríceps"],
    synergy: ["pectoral-mayor"]
  },
  "recto-abdominal": {
    name: "Recto Abdominal",
    region: "core" as const,
    subgroup: "core",
    function: "estabilidad",
    exercises: ["Crunch", "Plancha", "Elevación Piernas", "Roll-out"],
    synergy: ["oblicuos"]
  },
  "oblicuos": {
    name: "Oblicuos",
    region: "core" as const,
    subgroup: "core",
    function: "rotación",
    exercises: ["Russian Twist", "Crunch Oblicuo", "Pallof Press", "Woodchop"],
    synergy: ["recto-abdominal"]
  },
  "erectores-espinales": {
    name: "Erectores Espinales",
    region: "core" as const,
    subgroup: "core",
    function: "extensión",
    exercises: ["Hiperextensiones", "Peso Muerto", "Good Morning", "Bird Dog"],
    synergy: []
  },
  "gluteo-mayor": {
    name: "Glúteo Mayor",
    region: "inferior" as const,
    subgroup: "cadera",
    function: "extensión cadera",
    exercises: ["Hip Thrust", "Sentadilla", "Peso Muerto", "Step Up"],
    synergy: []
  },
  "gluteo-medio": {
    name: "Glúteo Medio",
    region: "inferior" as const,
    subgroup: "cadera",
    function: "abducción cadera",
    exercises: ["Abducciones", "Clamshell", "Monster Walk", "Band Walk"],
    synergy: []
  },
  "cuadriceps": {
    name: "Cuádriceps",
    region: "inferior" as const,
    subgroup: "muslo",
    function: "extensión rodilla",
    exercises: ["Sentadilla", "Prensa", "Extensiones", "Zancadas", "Step Up"],
    synergy: []
  },
  "isquios": {
    name: "Isquiotibiales",
    region: "inferior" as const,
    subgroup: "muslo",
    function: "flexión rodilla",
    exercises: ["Curl Femoral", "Nordic Curl", "Peso Muerto Rumano", "Good Morning"],
    synergy: []
  },
  "aductores": {
    name: "Aductores",
    region: "inferior" as const,
    subgroup: "muslo",
    function: "aducción cadera",
    exercises: ["Sentadilla Sumo", "Aducciones", "Copenhague", "Side Lunge"],
    synergy: []
  },
  "gastrocnemio": {
    name: "Gastrocnemio",
    region: "inferior" as const,
    subgroup: "pierna",
    function: "flexión plantar",
    exercises: ["Elevación Talones", "Prensa Gemelos", "Saltos", "Escalones"],
    synergy: []
  },
  "soleo": {
    name: "Sóleo",
    region: "inferior" as const,
    subgroup: "pierna",
    function: "flexión plantar",
    exercises: ["Elevación Sentado", "Prensa Gemelos"],
    synergy: []
  },
  "tibial-anterior": {
    name: "Tibial Anterior",
    region: "inferior" as const,
    subgroup: "pierna",
    function: "dorsiflexión",
    exercises: ["Dorsiflexión", "Caminar Talones", "Toe Tap"],
    synergy: []
  }
}

// ============================================================================
// PALETA DE COLORES POR SUBGRUPO
// ============================================================================

const COLORES_SUBGRUPO: Record<string, { base: string; highlight: string }> = {
  pecho: { base: '#E05A6A', highlight: '#F07A8A' },
  espalda: { base: '#C84050', highlight: '#D86070' },
  hombros: { base: '#D85060', highlight: '#E87080' },
  brazos: { base: '#E06575', highlight: '#F08595' },
  core: { base: '#E08540', highlight: '#F0A560' },
  cadera: { base: '#8058A0', highlight: '#9878B8' },
  muslo: { base: '#5078B0', highlight: '#6898C8' },
  pierna: { base: '#4068A0', highlight: '#5888B8' },
}

// ============================================================================
// SILUETA HUMANA - PROPORCIONES ANATÓMICAS
// ============================================================================

const SILUETAS: Record<VistaCuerpo, string> = {
  frontal: `
    M 150 6 C 162 3 173 9 177 22 C 181 36 174 49 162 55 C 150 61 138 59 128 50 C 118 41 117 26 126 14 C 135 3 150 6 150 6 Z
    M 128 55 C 126 62 125 70 125 78 L 125 85 C 105 88 85 96 70 110 C 58 122 50 140 46 162 C 44 182 47 202 54 220 C 58 232 65 242 72 248 L 72 260 C 62 270 55 288 52 308 C 48 335 48 365 52 395 C 56 425 65 455 78 480 C 90 502 105 518 118 528 L 118 540 C 108 550 100 570 96 595 C 92 625 92 660 96 695 C 100 722 108 742 120 755 C 130 765 142 767 150 762 C 158 767 170 765 180 755 C 192 742 200 722 204 695 C 208 660 208 625 204 595 C 200 570 192 550 182 540 L 182 528 C 195 518 210 502 222 480 C 235 455 244 425 248 395 C 252 365 252 335 248 308 C 245 288 238 270 228 260 L 228 248 C 235 242 242 232 246 220 C 253 202 256 182 254 162 C 250 140 242 122 230 110 C 215 96 195 88 175 85 L 175 78 C 175 70 174 62 172 55 L 128 55 Z
  `,
  trasera: `
    M 150 6 C 162 3 173 9 177 22 C 181 36 174 49 162 55 C 150 61 138 59 128 50 C 118 41 117 26 126 14 C 135 3 150 6 150 6 Z
    M 128 55 C 126 62 125 70 125 78 L 125 85 C 105 88 85 96 70 110 C 58 122 50 140 46 162 C 44 182 47 202 54 220 C 58 232 65 242 72 248 L 72 260 C 62 270 55 288 52 308 C 48 335 48 365 52 395 C 56 425 65 455 78 480 C 90 502 105 518 118 528 L 118 540 C 108 550 100 570 96 595 C 92 625 92 660 96 695 C 100 722 108 742 120 755 C 130 765 142 767 150 762 C 158 767 170 765 180 755 C 192 742 200 722 204 695 C 208 660 208 625 204 595 C 200 570 192 550 182 540 L 182 528 C 195 518 210 502 222 480 C 235 455 244 425 248 395 C 252 365 252 335 248 308 C 245 288 238 270 228 260 L 228 248 C 235 242 242 232 246 220 C 253 202 256 182 254 162 C 250 140 242 122 230 110 C 215 96 195 88 175 85 L 175 78 C 175 70 174 62 172 55 L 128 55 Z
  `,
  izquierda: `
    M 95 6 C 108 2 120 8 125 22 C 130 38 122 52 108 58 C 94 64 80 58 72 45 C 64 30 72 10 95 6 Z
    M 78 58 C 76 66 75 74 75 82 L 75 90 C 58 95 40 108 28 128 C 18 145 14 168 16 195 C 18 220 26 245 40 265 L 40 278 C 28 292 22 315 22 342 C 22 378 30 418 48 455 C 66 490 90 518 118 538 L 118 552 C 108 568 102 592 102 622 C 102 658 110 698 128 732 C 142 758 162 772 185 772 C 205 772 220 758 228 732 C 236 702 234 668 225 638 C 218 612 205 592 190 578 L 190 562 C 205 550 218 532 228 510 C 242 480 248 445 248 408 C 248 372 242 340 228 312 L 228 298 C 240 280 248 258 248 232 C 248 205 240 182 225 162 C 210 142 190 128 168 122 L 168 122 C 166 105 164 90 160 78 C 156 66 150 58 145 55 L 78 58 Z
  `,
  derecha: `
    M 205 6 C 192 2 180 8 175 22 C 170 38 178 52 192 58 C 206 64 220 58 228 45 C 236 30 228 10 205 6 Z
    M 222 58 C 224 66 225 74 225 82 L 225 90 C 242 95 260 108 272 128 C 282 145 286 168 284 195 C 282 220 274 245 260 265 L 260 278 C 272 292 278 315 278 342 C 278 378 270 418 252 455 C 234 490 210 518 182 538 L 182 552 C 192 568 198 592 198 622 C 198 658 190 698 172 732 C 158 758 138 772 115 772 C 95 772 80 758 72 732 C 64 702 66 668 75 638 C 82 612 95 592 110 578 L 110 562 C 95 550 82 532 72 510 C 58 480 52 445 52 408 C 52 372 58 340 72 312 L 72 298 C 60 280 52 258 52 232 C 52 205 60 182 75 162 C 90 142 110 128 132 122 L 132 122 C 134 105 136 90 140 78 C 144 66 150 58 155 55 L 222 58 Z
  `,
}

// ============================================================================
// MÚSCULOS SVG - PATHS CON IDs CONSISTENTES
// ============================================================================

const MUSCULOS_SVG: {
  id: string
  vista: VistaCuerpo
  lado: 'R' | 'L' | 'ambos'
  path: string
}[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA FRONTAL
  // ═══════════════════════════════════════════════════════════════════════
  
  // Pectoral Mayor
  { id: 'pectoral-mayor', vista: 'frontal', lado: 'R',
    path: 'M 150 82 C 148 86 145 90 140 92 C 130 95 115 98 100 102 C 85 106 72 112 62 120 C 55 126 52 135 54 145 C 56 158 64 172 78 182 C 95 194 115 200 135 202 C 142 203 147 200 150 195 L 150 82 Z' },
  { id: 'pectoral-mayor', vista: 'frontal', lado: 'L',
    path: 'M 150 82 C 152 86 155 90 160 92 C 170 95 185 98 200 102 C 215 106 228 112 238 120 C 245 126 248 135 246 145 C 244 158 236 172 222 182 C 205 194 185 200 165 202 C 158 203 153 200 150 195 L 150 82 Z' },
  
  // Deltoide Anterior
  { id: 'deltoide-anterior', vista: 'frontal', lado: 'R',
    path: 'M 52 98 C 48 102 46 110 47 122 C 48 136 52 152 60 165 C 68 178 78 185 88 182 C 96 178 100 168 100 155 C 100 140 96 125 88 112 C 80 100 70 95 60 96 C 55 97 52 98 52 98 Z' },
  { id: 'deltoide-anterior', vista: 'frontal', lado: 'L',
    path: 'M 248 98 C 252 102 254 110 253 122 C 252 136 248 152 240 165 C 232 178 222 185 212 182 C 204 178 200 168 200 155 C 200 140 204 125 212 112 C 220 100 230 95 240 96 C 245 97 248 98 248 98 Z' },
  
  // Deltoide Medio (lateral)
  { id: 'deltoide-medio', vista: 'frontal', lado: 'R',
    path: 'M 47 118 C 44 125 43 138 46 152 C 50 168 58 182 70 190 C 80 196 88 192 92 182 C 96 170 94 155 88 142 C 82 128 72 120 62 118 C 54 117 47 118 47 118 Z' },
  { id: 'deltoide-medio', vista: 'frontal', lado: 'L',
    path: 'M 253 118 C 256 125 257 138 254 152 C 250 168 242 182 230 190 C 220 196 212 192 208 182 C 204 170 206 155 212 142 C 218 128 228 120 238 118 C 246 117 253 118 253 118 Z' },
  
  // Bíceps Braquial
  { id: 'biceps-braquial', vista: 'frontal', lado: 'R',
    path: 'M 47 188 C 43 198 41 215 43 235 C 45 255 52 275 62 288 C 72 300 82 302 90 292 C 98 280 100 262 96 242 C 92 222 84 205 72 195 C 62 187 52 186 47 188 Z' },
  { id: 'biceps-braquial', vista: 'frontal', lado: 'L',
    path: 'M 253 188 C 257 198 259 215 257 235 C 255 255 248 275 238 288 C 228 300 218 302 210 292 C 202 280 200 262 204 242 C 208 222 216 205 228 195 C 238 187 248 186 253 188 Z' },
  
  // Recto Abdominal
  { id: 'recto-abdominal', vista: 'frontal', lado: 'ambos',
    path: 'M 130 205 C 128 212 128 225 130 245 C 132 270 136 298 140 328 C 144 355 148 378 150 392 C 152 378 156 355 160 328 C 164 298 168 270 170 245 C 172 225 172 212 170 205 L 130 205 Z' },
  
  // Oblicuos
  { id: 'oblicuos', vista: 'frontal', lado: 'R',
    path: 'M 78 202 C 74 215 72 235 74 260 C 76 288 82 318 92 345 C 102 370 115 388 128 398 C 138 405 145 402 148 390 C 152 375 150 355 144 330 C 138 305 130 280 122 258 C 116 240 112 225 112 212 C 112 205 116 202 122 205 L 78 202 Z' },
  { id: 'oblicuos', vista: 'frontal', lado: 'L',
    path: 'M 222 202 C 226 215 228 235 226 260 C 224 288 218 318 208 345 C 198 370 185 388 172 398 C 162 405 155 402 152 390 C 148 375 150 355 156 330 C 162 305 170 280 178 258 C 184 240 188 225 188 212 C 188 205 184 202 178 205 L 222 202 Z' },
  
  // Cuádriceps
  { id: 'cuadriceps', vista: 'frontal', lado: 'R',
    path: 'M 68 405 C 62 425 58 458 62 498 C 66 538 78 578 98 608 C 118 635 140 648 155 645 C 168 642 172 628 170 605 C 168 578 160 545 148 512 C 136 480 122 452 108 432 C 95 415 82 405 68 405 Z' },
  { id: 'cuadriceps', vista: 'frontal', lado: 'L',
    path: 'M 232 405 C 238 425 242 458 238 498 C 234 538 222 578 202 608 C 182 635 160 648 145 645 C 132 642 128 628 130 605 C 132 578 140 545 152 512 C 164 480 178 452 192 432 C 205 415 218 405 232 405 Z' },
  
  // Aductores
  { id: 'aductores', vista: 'frontal', lado: 'R',
    path: 'M 115 428 C 110 448 108 478 112 512 C 116 545 125 575 140 598 C 152 615 162 618 168 608 C 175 595 175 572 168 545 C 162 520 152 495 142 472 C 133 455 125 442 118 435 C 115 430 115 428 115 428 Z' },
  { id: 'aductores', vista: 'frontal', lado: 'L',
    path: 'M 185 428 C 190 448 192 478 188 512 C 184 545 175 575 160 598 C 148 615 138 618 132 608 C 125 595 125 572 132 545 C 138 520 148 495 158 472 C 167 455 175 442 182 435 C 185 430 185 428 185 428 Z' },
  
  // Tibial Anterior
  { id: 'tibial-anterior', vista: 'frontal', lado: 'R',
    path: 'M 108 658 C 102 680 100 712 105 745 C 110 775 122 800 140 815 C 155 825 168 822 175 808 C 182 792 182 772 175 748 C 168 722 158 700 145 682 C 134 668 122 660 112 658 C 110 658 108 658 108 658 Z' },
  { id: 'tibial-anterior', vista: 'frontal', lado: 'L',
    path: 'M 192 658 C 198 680 200 712 195 745 C 190 775 178 800 160 815 C 145 825 132 822 125 808 C 118 792 118 772 125 748 C 132 722 142 700 155 682 C 166 668 178 660 188 658 C 190 658 192 658 192 658 Z' },
  
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA TRASERA
  // ═══════════════════════════════════════════════════════════════════════
  
  // Trapecio Medio/Inferior
  { id: 'trapecio-medio-inferior', vista: 'trasera', lado: 'ambos',
    path: 'M 150 58 C 138 62 125 70 112 85 C 98 100 85 118 78 138 C 72 155 75 170 88 182 C 105 198 128 208 150 212 C 172 208 195 198 212 182 C 225 170 228 155 222 138 C 215 118 202 100 188 85 C 175 70 162 62 150 58 Z' },
  
  // Dorsal Ancho
  { id: 'dorsal-ancho', vista: 'trasera', lado: 'R',
    path: 'M 78 138 C 72 158 68 188 72 218 C 76 248 88 278 108 302 C 128 322 150 332 165 328 C 178 324 182 310 178 288 C 174 262 162 232 148 205 C 134 180 118 160 100 148 C 88 140 78 138 78 138 Z' },
  { id: 'dorsal-ancho', vista: 'trasera', lado: 'L',
    path: 'M 222 138 C 228 158 232 188 228 218 C 224 248 212 278 192 302 C 172 322 150 332 135 328 C 122 324 118 310 122 288 C 126 262 138 232 152 205 C 166 180 182 160 200 148 C 212 140 222 138 222 138 Z' },
  
  // Deltoide Posterior
  { id: 'deltoide-posterior', vista: 'trasera', lado: 'R',
    path: 'M 48 108 C 44 115 43 128 46 145 C 50 162 60 178 74 188 C 86 196 95 192 100 180 C 105 166 103 150 95 135 C 87 120 75 110 64 107 C 54 105 48 108 48 108 Z' },
  { id: 'deltoide-posterior', vista: 'trasera', lado: 'L',
    path: 'M 252 108 C 256 115 257 128 254 145 C 250 162 240 178 226 188 C 214 196 205 192 200 180 C 195 166 197 150 205 135 C 213 120 225 110 236 107 C 246 105 252 108 252 108 Z' },
  
  // Deltoide Medio (trasera)
  { id: 'deltoide-medio', vista: 'trasera', lado: 'R',
    path: 'M 45 125 C 42 135 42 150 46 165 C 50 180 60 195 75 202 C 88 208 98 202 102 190 C 106 175 102 158 92 145 C 82 132 68 125 56 124 C 48 123 45 125 45 125 Z' },
  { id: 'deltoide-medio', vista: 'trasera', lado: 'L',
    path: 'M 255 125 C 258 135 258 150 254 165 C 250 180 240 195 225 202 C 212 208 202 202 198 190 C 194 175 198 158 208 145 C 218 132 232 125 244 124 C 252 123 255 125 255 125 Z' },
  
  // Tríceps Braquial
  { id: 'triceps-braquial', vista: 'trasera', lado: 'R',
    path: 'M 42 195 C 38 210 38 232 44 258 C 50 282 62 305 78 320 C 92 332 104 332 112 320 C 120 305 120 285 112 262 C 104 240 92 222 78 210 C 66 200 52 196 42 195 Z' },
  { id: 'triceps-braquial', vista: 'trasera', lado: 'L',
    path: 'M 258 195 C 262 210 262 232 256 258 C 250 282 238 305 222 320 C 208 332 196 332 188 320 C 180 305 180 285 188 262 C 196 240 208 222 222 210 C 234 200 248 196 258 195 Z' },
  
  // Erectores Espinales
  { id: 'erectores-espinales', vista: 'trasera', lado: 'R',
    path: 'M 115 248 C 110 268 108 302 112 338 C 116 372 125 402 140 425 C 152 442 162 445 168 432 C 175 418 175 395 168 362 C 162 332 152 302 142 278 C 133 258 125 248 115 248 Z' },
  { id: 'erectores-espinales', vista: 'trasera', lado: 'L',
    path: 'M 185 248 C 190 268 192 302 188 338 C 184 372 175 402 160 425 C 148 442 138 445 132 432 C 125 418 125 395 132 362 C 138 332 148 302 158 278 C 167 258 175 248 185 248 Z' },
  
  // Glúteo Mayor
  { id: 'gluteo-mayor', vista: 'trasera', lado: 'R',
    path: 'M 75 435 C 68 458 64 495 70 535 C 76 572 92 608 118 632 C 142 652 165 658 180 648 C 192 638 195 618 188 588 C 180 555 162 520 140 492 C 120 468 100 450 85 440 C 78 435 75 435 75 435 Z' },
  { id: 'gluteo-mayor', vista: 'trasera', lado: 'L',
    path: 'M 225 435 C 232 458 236 495 230 535 C 224 572 208 608 182 632 C 158 652 135 658 120 648 C 108 638 105 618 112 588 C 120 555 138 520 160 492 C 180 468 200 450 215 440 C 222 435 225 435 225 435 Z' },
  
  // Glúteo Medio
  { id: 'gluteo-medio', vista: 'trasera', lado: 'R',
    path: 'M 72 415 C 65 425 62 445 68 468 C 74 488 88 508 108 518 C 125 525 138 520 145 505 C 152 488 150 468 140 450 C 130 435 112 422 95 418 C 82 415 72 415 72 415 Z' },
  { id: 'gluteo-medio', vista: 'trasera', lado: 'L',
    path: 'M 228 415 C 235 425 238 445 232 468 C 226 488 212 508 192 518 C 175 525 162 520 155 505 C 148 488 150 468 160 450 C 170 435 188 422 205 418 C 218 415 228 415 228 415 Z' },
  
  // Isquiotibiales
  { id: 'isquios', vista: 'trasera', lado: 'R',
    path: 'M 70 655 C 64 680 62 718 68 758 C 74 795 90 828 115 850 C 138 868 158 872 172 858 C 185 842 188 818 180 785 C 172 750 155 718 135 692 C 118 670 100 658 82 655 C 75 654 70 655 70 655 Z' },
  { id: 'isquios', vista: 'trasera', lado: 'L',
    path: 'M 230 655 C 236 680 238 718 232 758 C 226 795 210 828 185 850 C 162 868 142 872 128 858 C 115 842 112 818 120 785 C 128 750 145 718 165 692 C 182 670 200 658 218 655 C 225 654 230 655 230 655 Z' },
  
  // Gastrocnemio
  { id: 'gastrocnemio', vista: 'trasera', lado: 'R',
    path: 'M 102 658 C 94 682 90 720 96 762 C 102 800 118 835 142 855 C 162 870 178 868 190 852 C 202 832 205 805 198 772 C 190 738 175 708 158 685 C 142 668 125 658 110 658 C 106 658 102 658 102 658 Z' },
  { id: 'gastrocnemio', vista: 'trasera', lado: 'L',
    path: 'M 198 658 C 206 682 210 720 204 762 C 198 800 182 835 158 855 C 138 870 122 868 110 852 C 98 832 95 805 102 772 C 110 738 125 708 142 685 C 158 668 175 658 190 658 C 194 658 198 658 198 658 Z' },
  
  // Soleo
  { id: 'soleo', vista: 'trasera', lado: 'R',
    path: 'M 110 782 C 106 802 106 830 112 858 C 118 882 130 900 148 908 C 162 914 175 908 182 892 C 190 872 190 848 182 825 C 174 805 160 790 145 785 C 132 780 120 780 110 782 Z' },
  { id: 'soleo', vista: 'trasera', lado: 'L',
    path: 'M 190 782 C 194 802 194 830 188 858 C 182 882 170 900 152 908 C 138 914 125 908 118 892 C 110 872 110 848 118 825 C 126 805 140 790 155 785 C 168 780 180 780 190 782 Z' },
  
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA LATERAL IZQUIERDA
  // ═══════════════════════════════════════════════════════════════════════
  
  { id: 'deltoide-anterior', vista: 'izquierda', lado: 'L',
    path: 'M 22 115 C 16 128 15 150 22 175 C 29 198 45 218 65 228 C 82 235 92 228 96 212 C 100 192 95 170 84 150 C 73 132 58 120 44 117 C 32 114 22 115 22 115 Z' },
  { id: 'deltoide-medio', vista: 'izquierda', lado: 'L',
    path: 'M 18 138 C 14 150 14 168 20 188 C 26 208 38 225 55 235 C 70 242 82 238 88 225 C 94 208 90 188 80 172 C 70 156 55 145 42 142 C 32 140 18 138 18 138 Z' },
  { id: 'pectoral-mayor', vista: 'izquierda', lado: 'L',
    path: 'M 52 145 C 62 140 78 138 92 145 C 108 152 120 168 122 190 C 124 212 116 235 100 252 C 84 270 66 275 52 268 C 40 260 34 245 38 222 C 42 198 50 172 52 145 Z' },
  { id: 'biceps-braquial', vista: 'izquierda', lado: 'L',
    path: 'M 18 232 C 12 252 12 282 20 315 C 28 345 45 372 68 388 C 88 400 102 395 108 375 C 114 352 108 325 95 298 C 82 272 65 255 48 245 C 34 237 22 234 18 232 Z' },
  { id: 'oblicuos', vista: 'izquierda', lado: 'L',
    path: 'M 35 288 C 28 312 26 352 35 398 C 44 440 62 478 88 502 C 112 522 132 525 145 510 C 158 492 158 465 145 432 C 132 398 112 365 88 340 C 68 318 50 298 38 290 C 35 288 35 288 35 288 Z' },
  { id: 'gluteo-mayor', vista: 'izquierda', lado: 'L',
    path: 'M 30 520 C 22 548 20 592 32 638 C 44 680 68 718 100 742 C 128 762 152 765 168 745 C 185 722 188 690 175 652 C 162 615 138 580 110 558 C 85 538 62 525 45 522 C 35 520 30 520 30 520 Z' },
  { id: 'cuadriceps', vista: 'izquierda', lado: 'L',
    path: 'M 28 745 C 20 782 22 835 40 885 C 58 932 90 972 130 992 C 165 1008 192 1002 208 975 C 225 945 225 905 208 858 C 190 812 158 772 122 752 C 90 735 62 732 40 738 C 28 742 28 745 28 745 Z' },
  { id: 'isquios', vista: 'izquierda', lado: 'L',
    path: 'M 185 560 C 192 585 195 625 185 672 C 175 715 152 755 118 778 C 88 798 62 795 45 770 C 28 742 25 705 40 662 C 55 620 82 585 112 568 C 138 552 162 550 185 560 Z' },
  
  // ═══════════════════════════════════════════════════════════════════════
  // VISTA LATERAL DERECHA
  // ═══════════════════════════════════════════════════════════════════════
  
  { id: 'deltoide-posterior', vista: 'derecha', lado: 'R',
    path: 'M 278 115 C 284 128 285 150 278 175 C 271 198 255 218 235 228 C 218 235 208 228 204 212 C 200 192 205 170 216 150 C 227 132 242 120 256 117 C 268 114 278 115 278 115 Z' },
  { id: 'deltoide-medio', vista: 'derecha', lado: 'R',
    path: 'M 282 138 C 286 150 286 168 280 188 C 274 208 262 225 245 235 C 230 242 218 238 212 225 C 206 208 210 188 220 172 C 230 156 245 145 258 142 C 268 140 282 138 282 138 Z' },
  { id: 'dorsal-ancho', vista: 'derecha', lado: 'R',
    path: 'M 248 145 C 238 140 222 138 208 145 C 192 152 180 168 178 190 C 176 212 184 235 200 252 C 216 270 234 275 248 268 C 260 260 266 245 262 222 C 258 198 250 172 248 145 Z' },
  { id: 'triceps-braquial', vista: 'derecha', lado: 'R',
    path: 'M 282 232 C 288 252 288 282 280 315 C 272 345 255 372 232 388 C 212 400 198 395 192 375 C 186 352 192 325 205 298 C 218 272 235 255 252 245 C 266 237 278 234 282 232 Z' },
  { id: 'erectores-espinales', vista: 'derecha', lado: 'R',
    path: 'M 265 288 C 272 312 274 352 265 398 C 256 440 238 478 212 502 C 188 522 168 525 155 510 C 142 492 142 465 155 432 C 168 398 188 365 212 340 C 232 318 250 298 262 290 C 265 288 265 288 265 288 Z' },
  { id: 'gluteo-mayor', vista: 'derecha', lado: 'R',
    path: 'M 270 520 C 278 548 280 592 268 638 C 256 680 232 718 200 742 C 172 762 148 765 132 745 C 115 722 112 690 125 652 C 138 615 162 580 190 558 C 215 538 238 525 255 522 C 265 520 270 520 270 520 Z' },
  { id: 'isquios', vista: 'derecha', lado: 'R',
    path: 'M 272 745 C 280 782 278 835 260 885 C 242 932 210 972 170 992 C 135 1008 108 1002 92 975 C 75 945 75 905 92 858 C 110 812 142 772 178 752 C 210 735 238 732 260 738 C 272 742 272 745 272 745 Z' },
  { id: 'cuadriceps', vista: 'derecha', lado: 'R',
    path: 'M 115 560 C 108 585 105 625 115 672 C 125 715 148 755 182 778 C 212 798 238 795 255 770 C 272 742 275 705 260 662 C 245 620 218 585 188 568 C 162 552 138 550 115 560 Z' },
]

// ============================================================================
// GENERAR ARRAY DE MÚSCULOS COMPLETO
// ============================================================================

function generarMusculosCompletos(): MusculoAnatomico[] {
  const musculos: MusculoAnatomico[] = []
  
  for (const svgMuscle of MUSCULOS_SVG) {
    const master = MUSCLES_MASTER[svgMuscle.id as keyof typeof MUSCLES_MASTER]
    if (!master) continue
    
    const colores = COLORES_SUBGRUPO[master.subgroup] || { base: '#888888', highlight: '#aaaaaa' }
    
    musculos.push({
      id: svgMuscle.lado === 'ambos' ? svgMuscle.id : `${svgMuscle.id}-${svgMuscle.lado.toLowerCase()}`,
      name: master.name,
      region: master.region,
      subgroup: master.subgroup,
      function: master.function,
      exercises: master.exercises,
      synergy: master.synergy,
      vista: svgMuscle.vista,
      lado: svgMuscle.lado,
      path: svgMuscle.path,
      colorBase: colores.base,
      colorHighlight: colores.highlight,
      fuerza: { R: 0, L: 0 },
      evaluado: false
    })
  }
  
  return musculos
}

const MUSCULOS_ANATOMIA = generarMusculosCompletos()

// ============================================================================
// COMPONENTE DE SILUETA
// ============================================================================

function BodySilhouette({ vista }: { vista: VistaCuerpo }) {
  return (
    <path
      d={SILUETAS[vista]}
      fill="#0a0a0d"
      stroke="#18181b"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

// ============================================================================
// COMPONENTE DE VISTA INDIVIDUAL
// ============================================================================

interface SingleViewProps {
  vista: VistaCuerpo
  musculos: MusculoAnatomico[]
  selectedMuscleId?: string | null
  hoveredMuscleId?: string | null
  onMuscleClick?: (muscle: MusculoAnatomico) => void
  onMuscleHover?: (muscle: MusculoAnatomico | null) => void
  fuerzas?: Record<string, { R: number; L: number }>
  evaluados?: Set<string>
  showValues?: boolean
  size?: number
}

function SingleAnatomicalView({
  vista,
  musculos,
  selectedMuscleId,
  hoveredMuscleId,
  onMuscleClick,
  onMuscleHover,
  fuerzas,
  evaluados,
  showValues = true,
  size = 300,
}: SingleViewProps) {
  const musculosVista = useMemo(() => 
    musculos.filter(m => m.vista === vista),
    [musculos, vista]
  )

  const viewBox = vista === 'izquierda' || vista === 'derecha' ? '0 0 300 820' : '0 0 300 720'

  const getMuscleStyle = (muscle: MusculoAnatomico) => {
    const isSelected = selectedMuscleId === muscle.id || selectedMuscleId === muscle.id.split('-R')[0].split('-L')[0]
    const isHovered = hoveredMuscleId === muscle.id
    const isEvaluated = evaluados?.has(muscle.id) || evaluados?.has(muscle.id.split('-R')[0].split('-L')[0]) || muscle.evaluado
    
    let fill = muscle.colorBase
    let fillOpacity = 0.45
    let stroke = muscle.colorBase
    let strokeWidth = 1.0
    
    if (isEvaluated) {
      fill = muscle.colorHighlight
      fillOpacity = 0.72
      strokeWidth = 1.5
    }
    
    if (isHovered) {
      fillOpacity = 0.82
      strokeWidth = 2.0
    }
    
    if (isSelected) {
      fill = muscle.colorHighlight
      fillOpacity = 0.92
      stroke = '#ffffff'
      strokeWidth = 2.5
    }
    
    return { fill, fillOpacity, stroke, strokeWidth }
  }

  const getForceValue = (muscle: MusculoAnatomico) => {
    const baseId = muscle.id.split('-R')[0].split('-L')[0]
    if (!fuerzas?.[baseId]) return null
    const { R, L } = fuerzas[baseId]
    return muscle.lado === 'R' ? R : muscle.lado === 'L' ? L : (R + L) / 2
  }

  const getMuscleCenter = (path: string) => {
    const coords = path.match(/[\d.]+/g)
    if (!coords || coords.length < 2) return { x: 150, y: 150 }
    let sumX = 0, sumY = 0, count = 0
    for (let i = 0; i < coords.length - 1; i += 2) {
      sumX += parseFloat(coords[i])
      sumY += parseFloat(coords[i + 1])
      count++
    }
    return { x: sumX / count, y: sumY / count }
  }

  return (
    <svg viewBox={viewBox} className="w-full h-auto" style={{ maxHeight: `${size}px` }}>
      <defs>
        <filter id={`glow-${vista}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <BodySilhouette vista={vista} />
      
      {Object.entries(
        musculosVista.reduce((acc, m) => {
          if (!acc[m.subgroup]) acc[m.subgroup] = []
          acc[m.subgroup].push(m)
          return acc
        }, {} as Record<string, MusculoAnatomico[]>)
      ).map(([subgroup, muscles]) => (
        <g key={subgroup} id={`grupo-${subgroup}-${vista}`}>
          {muscles.map(muscle => {
            const style = getMuscleStyle(muscle)
            const forceValue = getForceValue(muscle)
            const isSelected = selectedMuscleId === muscle.id || selectedMuscleId === muscle.id.split('-R')[0].split('-L')[0]
            const center = getMuscleCenter(muscle.path)
            
            return (
              <g key={muscle.id}>
                {isSelected && (
                  <path
                    d={muscle.path}
                    fill={style.fill}
                    fillOpacity={0.25}
                    stroke={style.stroke}
                    strokeWidth={4}
                    filter={`url(#glow-${vista})`}
                    className="pointer-events-none"
                  />
                )}
                
                <path
                  d={muscle.path}
                  fill={style.fill}
                  fillOpacity={style.fillOpacity}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onMuscleClick?.(muscle)}
                  onMouseEnter={() => onMuscleHover?.(muscle)}
                  onMouseLeave={() => onMuscleHover?.(null)}
                />
                
                {showValues && forceValue !== null && forceValue > 0 && (
                  <text
                    x={center.x}
                    y={center.y}
                    fill="white"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                  >
                    {forceValue.toFixed(0)}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

// ============================================================================
// EXPORTAR MÚSCULOS MAESTROS PARA USO EXTERNO
// ============================================================================

export { MUSCLES_MASTER, MUSCULOS_ANATOMIA }
export type { MusculoAnatomico }

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AnatomicalModel({
  onMuscleSelect,
  onMuscleHover,
  selectedMuscleId,
  fuerzas = {},
  evaluados = new Set(),
  showValues = true,
  mode = 'selection',
}: AnatomicalModelProps) {
  const [vistaActiva, setVistaActiva] = useState<VistaCuerpo>('frontal')
  const [hoveredMuscle, setHoveredMuscle] = useState<MusculoAnatomico | null>(null)
  const [layout, setLayout] = useState<'single' | 'grid'>('grid')

  const musculosActualizados = useMemo(() => {
    return MUSCULOS_ANATOMIA.map(m => ({
      ...m,
      fuerza: fuerzas[m.id] || m.fuerza,
      evaluado: evaluados.has(m.id) || m.evaluado,
    }))
  }, [fuerzas, evaluados])

  const handleMuscleClick = (muscle: MusculoAnatomico) => {
    onMuscleSelect?.(muscle)
  }

  const handleMuscleHover = (muscle: MusculoAnatomico | null) => {
    setHoveredMuscle(muscle)
    onMuscleHover?.(muscle)
  }

  const vistas: { id: VistaCuerpo; label: string; icon: string }[] = [
    { id: 'frontal', label: 'Frontal', icon: '👤' },
    { id: 'trasera', label: 'Trasera', icon: '🔙' },
    { id: 'izquierda', label: 'Izquierda', icon: '◀️' },
    { id: 'derecha', label: 'Derecha', icon: '▶️' },
  ]

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-[#102218] rounded-xl p-1 border border-white/10">
          <button onClick={() => setLayout('single')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${layout === 'single' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'}`}>Simple</button>
          <button onClick={() => setLayout('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${layout === 'grid' ? 'bg-[#13ec6d] text-[#102218]' : 'text-slate-400 hover:text-white'}`}>4 Vistas</button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[10px]">
          {[{ c: '#E05A6A', l: 'Pecho' }, { c: '#C84050', l: 'Espalda' }, { c: '#D85060', l: 'Hombros' }, { c: '#E08540', l: 'Core' }, { c: '#5078B0', l: 'Piernas' }].map(({ c, l }) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-slate-400">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info músculo hover */}
      {hoveredMuscle && (
        <div className="bg-[#102218]/80 backdrop-blur-sm border border-[#13ec6d]/30 rounded-lg px-3 py-2 text-sm">
          <span className="text-[#13ec6d] font-medium">{hoveredMuscle.name}</span>
          <span className="text-slate-400 ml-2">({hoveredMuscle.subgroup})</span>
          <span className="text-slate-500 ml-2">• {hoveredMuscle.function}</span>
        </div>
      )}

      {/* Vista */}
      {layout === 'single' ? (
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {vistas.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setVistaActiva(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${vistaActiva === id ? 'bg-[#13ec6d]/20 text-[#13ec6d] border border-[#13ec6d]/50' : 'bg-[#102218] text-slate-400 border border-white/5 hover:border-white/20'}`}>{icon} {label}</button>
            ))}
          </div>
          <div className="flex justify-center bg-[#0a0a0c] rounded-2xl p-6 border border-white/5">
            <SingleAnatomicalView vista={vistaActiva} musculos={musculosActualizados} selectedMuscleId={selectedMuscleId} hoveredMuscleId={hoveredMuscle?.id} onMuscleClick={handleMuscleClick} onMuscleHover={handleMuscleHover} fuerzas={fuerzas} evaluados={evaluados} showValues={showValues} size={500} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {vistas.map(({ id, label }) => (
            <div key={id} className="bg-[#0a0a0c] rounded-xl p-3 border border-white/5 hover:border-[#13ec6d]/30 transition-all">
              <p className="text-[10px] text-slate-500 mb-2 text-center uppercase tracking-wider">{label}</p>
              <SingleAnatomicalView vista={id} musculos={musculosActualizados} selectedMuscleId={selectedMuscleId} hoveredMuscleId={hoveredMuscle?.id} onMuscleClick={handleMuscleClick} onMuscleHover={handleMuscleHover} fuerzas={fuerzas} evaluados={evaluados} showValues={showValues} size={280} />
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-[10px] text-slate-600">{Object.keys(MUSCLES_MASTER).length} músculos • {Object.keys(fuerzas).length} evaluados</div>
    </div>
  )
}
