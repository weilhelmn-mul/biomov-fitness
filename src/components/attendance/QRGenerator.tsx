'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface AreaConfig {
  codigo: string
  nombre: string
  color: string
  bgColor: string
  icono: string
}

const DEFAULT_AREAS: AreaConfig[] = [
  { codigo: 'AREA:MEDICINA', nombre: 'Medicina', color: '#00f0ff', bgColor: '#ffffff', icono: 'medical_services' },
  { codigo: 'AREA:FISIOTERAPIA', nombre: 'Fisioterapia', color: '#13ec6d', bgColor: '#ffffff', icono: 'healing' },
  { codigo: 'AREA:NUTRICION', nombre: 'Nutrición', color: '#f59e0b', bgColor: '#ffffff', icono: 'restaurant' },
  { codigo: 'AREA:ASISTENCIA_SOCIAL', nombre: 'Asistencia Social', color: '#a855f7', bgColor: '#ffffff', icono: 'volunteer_activism' },
  { codigo: 'AREA:GIMNASIO', nombre: 'Gimnasio', color: '#ef4444', bgColor: '#ffffff', icono: 'fitness_center' },
]

const AVAILABLE_COLORS = [
  { name: 'Azul', value: '#00f0ff' },
  { name: 'Verde', value: '#13ec6d' },
  { name: 'Naranja', value: '#f59e0b' },
  { name: 'Púrpura', value: '#a855f7' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
]

const AVAILABLE_ICONS = [
  'medical_services',
  'healing',
  'restaurant',
  'volunteer_activism',
  'fitness_center',
  'psychology',
  'school',
  'work',
  'local_hospital',
  'spa',
  'sports_gymnastics',
  'self_improvement',
  'medication',
  'health_and_safety',
  'emergency',
]

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

interface QRGeneratorProps {
  onClose?: () => void
}

export function QRGenerator({ onClose }: QRGeneratorProps) {
  const [areas, setAreas] = useState<AreaConfig[]>(DEFAULT_AREAS)
  const [qrImages, setQrImages] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaColor, setNewAreaColor] = useState('#13ec6d')
  const [newAreaIcon, setNewAreaIcon] = useState('medical_services')
  const [newAreaQR, setNewAreaQR] = useState<string | null>(null)
  const [creatingArea, setCreatingArea] = useState(false)

  // Cargar áreas guardadas del localStorage
  useEffect(() => {
    const savedAreas = localStorage.getItem('biomov_custom_areas')
    if (savedAreas) {
      try {
        const customAreas = JSON.parse(savedAreas)
        setAreas([...DEFAULT_AREAS, ...customAreas])
      } catch (e) {
        console.error('Error loading custom areas:', e)
      }
    }
  }, [])

  useEffect(() => {
    const generateAllQRs = async () => {
      setGenerating(true)
      const images: Record<string, string> = {}
      
      for (const area of areas) {
        try {
          const dataUrl = await QRCode.toDataURL(area.codigo, {
            width: 400,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          })
          images[area.codigo] = dataUrl
        } catch (err) {
          console.error('Error generating QR:', err)
        }
      }
      
      setQrImages(images)
      setGenerating(false)
    }
    
    generateAllQRs()
  }, [areas])

  // Generar preview del QR para nueva área
  useEffect(() => {
    if (newAreaName.trim()) {
      const codigo = `AREA:${newAreaName.toUpperCase().replace(/\s+/g, '_')}`
      QRCode.toDataURL(codigo, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setNewAreaQR).catch(() => setNewAreaQR(null))
    } else {
      setNewAreaQR(null)
    }
  }, [newAreaName])

  const downloadQR = (area: AreaConfig) => {
    const link = document.createElement('a')
    link.download = `QR_${area.nombre.replace(/\s+/g, '_')}.png`
    link.href = qrImages[area.codigo]
    link.click()
  }

  const downloadAllQRs = () => {
    areas.forEach((area, index) => {
      setTimeout(() => downloadQR(area), index * 300)
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleAddArea = () => {
    if (!newAreaName.trim()) {
      toast.error('Ingresa un nombre para el área')
      return
    }

    const codigo = `AREA:${newAreaName.toUpperCase().replace(/\s+/g, '_')}`
    
    // Verificar si ya existe
    if (areas.some(a => a.codigo === codigo)) {
      toast.error('Ya existe un área con ese nombre')
      return
    }

    setCreatingArea(true)

    const newArea: AreaConfig = {
      codigo,
      nombre: newAreaName.trim(),
      color: newAreaColor,
      bgColor: '#ffffff',
      icono: newAreaIcon,
    }

    // Guardar en localStorage
    const savedAreas = localStorage.getItem('biomov_custom_areas')
    const customAreas = savedAreas ? JSON.parse(savedAreas) : []
    customAreas.push(newArea)
    localStorage.setItem('biomov_custom_areas', JSON.stringify(customAreas))

    // Agregar a la lista
    setAreas(prev => [...prev, newArea])
    
    // Limpiar y cerrar
    setNewAreaName('')
    setNewAreaColor('#13ec6d')
    setNewAreaIcon('medical_services')
    setNewAreaQR(null)
    setShowAddModal(false)
    setCreatingArea(false)
    
    toast.success(`Área "${newArea.nombre}" agregada correctamente`)
  }

  const handleDeleteArea = (area: AreaConfig) => {
    // No permitir eliminar áreas por defecto
    if (DEFAULT_AREAS.some(a => a.codigo === area.codigo)) {
      toast.error('No se pueden eliminar las áreas predeterminadas')
      return
    }

    // Eliminar de localStorage
    const savedAreas = localStorage.getItem('biomov_custom_areas')
    if (savedAreas) {
      const customAreas = JSON.parse(savedAreas).filter((a: AreaConfig) => a.codigo !== area.codigo)
      localStorage.setItem('biomov_custom_areas', JSON.stringify(customAreas))
    }

    // Eliminar de la lista
    setAreas(prev => prev.filter(a => a.codigo !== area.codigo))
    toast.success(`Área "${area.nombre}" eliminada`)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="qr_code_2" className="text-[#13ec6d]" />
            Generador de Códigos QR
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Códigos QR para cada área del centro
          </p>
        </div>
        <div className="flex gap-2 no-print flex-wrap">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-[#102218] font-bold"
          >
            <Icon name="add_circle" className="mr-2" />
            Agregar Área
          </Button>
          <Button
            onClick={downloadAllQRs}
            className="bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#102218] font-bold"
          >
            <Icon name="download" className="mr-2" />
            Descargar Todos
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-[#13ec6d]/30 text-[#13ec6d] hover:bg-[#13ec6d]/10"
          >
            <Icon name="print" className="mr-2" />
            Imprimir
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              <Icon name="close" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Icon name="sync" className="text-5xl text-[#13ec6d] animate-spin" />
          <p className="text-slate-400">Generando códigos QR...</p>
        </div>
      )}

      {/* QR Grid - Printable */}
      {!generating && (
        <div id="qr-print-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area) => (
            <Card 
              key={area.codigo} 
              className="bg-white border-2 border-gray-200 print:break-inside-avoid relative group"
            >
              {/* Delete button - only for custom areas */}
              {!DEFAULT_AREAS.some(a => a.codigo === area.codigo) && (
                <button
                  onClick={() => handleDeleteArea(area)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity print:hidden hover:bg-red-600"
                  title="Eliminar área"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              )}
              <CardHeader className="text-center pb-2 border-b border-gray-100">
                <CardTitle 
                  className="text-xl font-bold flex items-center justify-center gap-2"
                  style={{ color: area.color }}
                >
                  <Icon name={area.icono} />
                  {area.nombre}
                </CardTitle>
                <p className="text-xs text-gray-500 font-mono">{area.codigo}</p>
              </CardHeader>
              <CardContent className="p-4">
                {/* QR Image */}
                <div className="flex justify-center mb-4">
                  {qrImages[area.codigo] ? (
                    <img 
                      src={qrImages[area.codigo]} 
                      alt={`QR ${area.nombre}`}
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                      <Icon name="error" className="text-4xl text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Download Button - Hidden on print */}
                <div className="flex justify-center print:hidden">
                  <Button
                    onClick={() => downloadQR(area)}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <Icon name="download" className="mr-1 text-sm" />
                    Descargar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      {!generating && (
        <Card className="bg-[#193324] border-white/5 no-print">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Icon name="info" className="text-[#00f0ff]" />
              Instrucciones de Uso
            </h3>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li>Imprime cada código QR en papel resistente o plástico</li>
              <li>Coloca el QR en un lugar visible del área correspondiente</li>
              <li>Los usuarios escanean con la app BIOMOV para registrar asistencia</li>
              <li>
                Cada QR contiene el código del área (ej: <code className="bg-[#102218] px-1 rounded text-[#13ec6d]">AREA:MEDICINA</code>)
              </li>
              <li>Puedes agregar nuevas áreas personalizadas con el botón "Agregar Área"</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Add Area Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#193324] border-[#13ec6d]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Icon name="add_circle" className="text-[#00f0ff]" />
              Agregar Nueva Área
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Area Name */}
            <div className="space-y-2">
              <Label className="text-[#92c9a9]">Nombre del Área</Label>
              <Input
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Ej: Psicología, Odontología..."
                className="bg-[#102218] border-white/10 text-white placeholder:text-slate-500 focus:border-[#13ec6d]"
              />
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="text-[#92c9a9]">Color</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewAreaColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newAreaColor === color.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label className="text-[#92c9a9]">Icono</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[#102218] rounded-lg">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewAreaIcon(icon)}
                    className={`p-2 rounded-lg transition-all ${
                      newAreaIcon === icon 
                        ? 'bg-[#13ec6d]/20 border border-[#13ec6d]' 
                        : 'bg-[#193324] border border-white/10 hover:border-[#13ec6d]/50'
                    }`}
                    title={icon}
                  >
                    <Icon name={icon} className={newAreaIcon === icon ? 'text-[#13ec6d]' : 'text-slate-400'} />
                  </button>
                ))}
              </div>
            </div>

            {/* QR Preview */}
            {newAreaQR && (
              <div className="space-y-2">
                <Label className="text-[#92c9a9]">Vista Previa del QR</Label>
                <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg">
                  <img src={newAreaQR} alt="QR Preview" className="w-32 h-32" />
                  <p className="text-xs text-gray-500 font-mono">
                    AREA:{newAreaName.toUpperCase().replace(/\s+/g, '_')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowAddModal(false)}
              variant="outline"
              className="border-slate-600 text-slate-400 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddArea}
              disabled={!newAreaName.trim() || creatingArea}
              className="bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-[#102218] font-bold"
            >
              {creatingArea ? (
                <>
                  <Icon name="sync" className="mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Icon name="add" className="mr-2" />
                  Crear Área
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #qr-print-area,
          #qr-print-area * {
            visibility: visible;
          }
          #qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}

export default QRGenerator
