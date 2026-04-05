'use client'

import dynamic from 'next/dynamic'

// Importar el sistema completo de evaluación isométrica
const EvaluacionCompleta = dynamic(
  () => import('./EvaluacionFuerzaIsometricaCompleta'),
  { ssr: false }
)

// Componente wrapper que exporta el sistema completo
export default function SimpleForceTest() {
  return <EvaluacionCompleta />
}
