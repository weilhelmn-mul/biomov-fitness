'use client'

import { Badge } from '@/components/ui/badge'

export type AreaType = 'MEDICINA' | 'FISIOTERAPIA' | 'NUTRICION' | 'ASISTENCIA_SOCIAL' | 'GIMNASIO' | string

interface AreaBadgeProps {
  area: AreaType
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const DEFAULT_AREA_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  MEDICINA: {
    label: 'Medicina',
    color: 'text-[#00f0ff]',
    bgColor: 'bg-[#00f0ff]/20 border-[#00f0ff]/30',
    icon: 'medical_services'
  },
  FISIOTERAPIA: {
    label: 'Fisioterapia',
    color: 'text-[#13ec6d]',
    bgColor: 'bg-[#13ec6d]/20 border-[#13ec6d]/30',
    icon: 'healing'
  },
  NUTRICION: {
    label: 'Nutrición',
    color: 'text-[#f59e0b]',
    bgColor: 'bg-[#f59e0b]/20 border-[#f59e0b]/30',
    icon: 'restaurant'
  },
  ASISTENCIA_SOCIAL: {
    label: 'Asistencia Social',
    color: 'text-[#a855f7]',
    bgColor: 'bg-[#a855f7]/20 border-[#a855f7]/30',
    icon: 'volunteer_activism'
  },
  GIMNASIO: {
    label: 'Gimnasio',
    color: 'text-[#ef4444]',
    bgColor: 'bg-[#ef4444]/20 border-[#ef4444]/30',
    icon: 'fitness_center'
  }
}

// Colores dinámicos para nuevas áreas
const DYNAMIC_COLORS = [
  { color: 'text-[#ec4899]', bgColor: 'bg-[#ec4899]/20 border-[#ec4899]/30' },
  { color: 'text-[#06b6d4]', bgColor: 'bg-[#06b6d4]/20 border-[#06b6d4]/30' },
  { color: 'text-[#6366f1]', bgColor: 'bg-[#6366f1]/20 border-[#6366f1]/30' },
  { color: 'text-[#84cc16]', bgColor: 'bg-[#84cc16]/20 border-[#84cc16]/30' },
  { color: 'text-[#f97316]', bgColor: 'bg-[#f97316]/20 border-[#f97316]/30' },
]

const DEFAULT_CONFIG = {
  label: 'Área',
  color: 'text-slate-400',
  bgColor: 'bg-slate-500/20 border-slate-500/30',
  icon: 'location_on'
}

// Función para obtener color basado en el hash del nombre
function getDynamicColor(areaName: string): { color: string; bgColor: string } {
  const hash = areaName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return DYNAMIC_COLORS[hash % DYNAMIC_COLORS.length]
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}

export function AreaBadge({ area, size = 'md', showIcon = true }: AreaBadgeProps) {
  // Buscar en áreas por defecto
  let config = DEFAULT_AREA_CONFIG[area]
  
  // Si no existe, crear configuración dinámica
  if (!config) {
    const dynamicColor = getDynamicColor(area)
    config = {
      label: formatAreaLabel(area),
      color: dynamicColor.color,
      bgColor: dynamicColor.bgColor,
      icon: 'location_on'
    }
  }
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2'
  }

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <Badge 
      className={`${config.bgColor} ${config.color} border font-medium ${sizeClasses[size]} rounded-full flex items-center`}
    >
      {showIcon && <Icon name={config.icon} className={iconSizes[size]} />}
      {config.label}
    </Badge>
  )
}

// Formatear el nombre del área para mostrar
function formatAreaLabel(area: string): string {
  return area
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function getAreaConfig(area: string) {
  if (DEFAULT_AREA_CONFIG[area]) {
    return DEFAULT_AREA_CONFIG[area]
  }
  
  const dynamicColor = getDynamicColor(area)
  return {
    label: formatAreaLabel(area),
    color: dynamicColor.color,
    bgColor: dynamicColor.bgColor,
    icon: 'location_on'
  }
}

// Verifica si es un área válida (cualquier string no vacío es válido)
export function isValidArea(area: string): area is AreaType {
  return typeof area === 'string' && area.trim().length > 0
}
