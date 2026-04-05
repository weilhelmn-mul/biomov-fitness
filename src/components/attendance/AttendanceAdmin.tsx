'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AreaBadge, type AreaType } from './AreaBadge'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface Asistencia {
  id: string
  pacienteId: string
  nombreCompleto: string
  area: string
  fecha: string
  observacion: string | null
  createdAt: string
}

interface AttendanceAdminProps {
  onClose?: () => void
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}

const AREAS: AreaType[] = ['MEDICINA', 'FISIOTERAPIA', 'NUTRICION', 'ASISTENCIA_SOCIAL', 'GIMNASIO']

export function AttendanceAdmin({ onClose }: AttendanceAdminProps) {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [loading, setLoading] = useState(true)
  const [filterArea, setFilterArea] = useState<string>('all')
  const [filterFecha, setFilterFecha] = useState<string>('')
  const [filterNombre, setFilterNombre] = useState<string>('')
  const [stats, setStats] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchAsistencias()
  }, [])

  const fetchAsistencias = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterArea && filterArea !== 'all') params.append('area', filterArea)
      if (filterFecha) params.append('fecha', filterFecha)
      if (filterNombre) params.append('nombre', filterNombre)

      const response = await fetch(`/api/attendance?${params.toString()}`)
      const data = await response.json()
      setAsistencias(data.asistencias || [])
      
      // Calculate stats
      const areaStats: Record<string, number> = {}
      data.asistencias?.forEach((a: Asistencia) => {
        areaStats[a.area] = (areaStats[a.area] || 0) + 1
      })
      setStats(areaStats)
    } catch (error) {
      console.error('Error fetching asistencias:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchAsistencias()
  }

  const handleClearFilters = () => {
    setFilterArea('all')
    setFilterFecha('')
    setFilterNombre('')
    setTimeout(fetchAsistencias, 0)
  }

  const filteredAsistencias = useMemo(() => {
    return asistencias
  }, [asistencias])

  const exportToExcel = () => {
    const data = filteredAsistencias.map(a => ({
      'Fecha': new Date(a.fecha).toLocaleDateString(),
      'Hora': new Date(a.fecha).toLocaleTimeString(),
      'Nombre': a.nombreCompleto,
      'Área': a.area,
      'Observación': a.observacion || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias')
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    const fileName = `asistencias_${new Date().toISOString().split('T')[0]}.xlsx`
    saveAs(dataBlob, fileName)
  }

  const totalAsistencias = Object.values(stats).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icon name="admin_panel_settings" className="text-[#13ec6d]" />
            Panel de Asistencias
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestión y estadísticas de asistencia por área
          </p>
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-400 hover:bg-slate-700"
          >
            <Icon name="close" />
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {AREAS.map(area => (
          <Card key={area} className="bg-[#193324] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AreaBadge area={area} size="sm" />
              </div>
              <p className="text-3xl font-bold text-white">
                {stats[area] || 0}
              </p>
              <p className="text-xs text-slate-500">registros</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Card */}
      <Card className="bg-gradient-to-r from-[#193324] to-[#1a3020] border-[#13ec6d]/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Total de Asistencias</p>
            <p className="text-4xl font-bold text-[#13ec6d]">{totalAsistencias}</p>
          </div>
          <Icon name="groups" className="text-5xl text-[#13ec6d]/30" />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-[#193324] border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Icon name="filter_list" className="text-slate-400" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Área</Label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="bg-[#102218] border-white/10 text-white">
                  <SelectValue placeholder="Todas las áreas" />
                </SelectTrigger>
                <SelectContent className="bg-[#193324] border-white/10">
                  <SelectItem value="all">Todas</SelectItem>
                  {AREAS.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Fecha</Label>
              <Input
                type="date"
                value={filterFecha}
                onChange={(e) => setFilterFecha(e.target.value)}
                className="bg-[#102218] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Nombre</Label>
              <Input
                type="text"
                placeholder="Buscar por nombre..."
                value={filterNombre}
                onChange={(e) => setFilterNombre(e.target.value)}
                className="bg-[#102218] border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleFilter}
                className="flex-1 bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold"
              >
                <Icon name="search" className="mr-1" />
                Buscar
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="border-slate-600 text-slate-400 hover:bg-slate-700"
              >
                <Icon name="clear" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={exportToExcel}
          className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/30"
        >
          <Icon name="download" className="mr-2" />
          Exportar a Excel
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-[#193324] border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Icon name="history" className="text-slate-400" />
            Historial de Asistencias
          </CardTitle>
          <CardDescription>
            {filteredAsistencias.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="sync" className="text-3xl text-[#13ec6d] animate-spin" />
            </div>
          ) : filteredAsistencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Icon name="event_busy" className="text-4xl mb-2" />
              <p>No se encontraron registros</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium">Fecha</TableHead>
                    <TableHead className="text-slate-400 font-medium">Nombre</TableHead>
                    <TableHead className="text-slate-400 font-medium">Área</TableHead>
                    <TableHead className="text-slate-400 font-medium">Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAsistencias.map((asistencia) => (
                    <TableRow key={asistencia.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-white">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(asistencia.fecha).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(asistencia.fecha).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {asistencia.nombreCompleto}
                      </TableCell>
                      <TableCell>
                        <AreaBadge area={asistencia.area} size="sm" />
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                        {asistencia.observacion || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Area Distribution Chart (Simple Bar) */}
      <Card className="bg-[#193324] border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Icon name="bar_chart" className="text-slate-400" />
            Distribución por Área
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {AREAS.map(area => {
              const count = stats[area] || 0
              const percentage = totalAsistencias > 0 ? (count / totalAsistencias) * 100 : 0
              
              return (
                <div key={area} className="flex items-center gap-3">
                  <div className="w-28">
                    <AreaBadge area={area} size="sm" />
                  </div>
                  <div className="flex-1 h-6 bg-[#102218] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#13ec6d]/50 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-white font-mono">
                    {count}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
