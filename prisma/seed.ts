import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Crear áreas de configuración
  const areas = [
    { codigo: 'MEDICINA', nombre: 'Medicina', descripcion: 'Consultas médicas y evaluaciones', icono: 'medical_services', color: '#00f0ff' },
    { codigo: 'FISIOTERAPIA', nombre: 'Fisioterapia', descripcion: 'Tratamientos y rehabilitación física', icono: 'healing', color: '#13ec6d' },
    { codigo: 'NUTRICION', nombre: 'Nutrición', descripcion: 'Consultas nutricionales y planes alimenticios', icono: 'restaurant', color: '#f59e0b' },
    { codigo: 'ASISTENCIA_SOCIAL', nombre: 'Asistencia Social', descripcion: 'Servicios sociales y apoyo comunitario', icono: 'volunteer_activism', color: '#a855f7' },
    { codigo: 'GIMNASIO', nombre: 'Gimnasio', descripcion: 'Entrenamiento físico y ejercicio', icono: 'fitness_center', color: '#ef4444' },
  ]

  for (const area of areas) {
    const existing = await prisma.configuracionArea.findUnique({
      where: { codigo: area.codigo }
    })

    if (!existing) {
      await prisma.configuracionArea.create({ data: area })
      console.log(`✅ Área creada: ${area.nombre}`)
    } else {
      console.log(`⏭️  Área ya existe: ${area.nombre}`)
    }
  }

  // Crear usuarios de demostración
  const usuarios = [
    { email: 'admin@biomov.com', name: 'Administrador', dni: '12345678', rol: 'admin' },
    { email: 'paciente@biomov.com', name: 'Juan Pérez', dni: '87654321', rol: 'paciente' },
    { email: 'maria@biomov.com', name: 'María García', dni: '11223344', rol: 'paciente' },
  ]

  for (const usuario of usuarios) {
    const existing = await prisma.user.findUnique({
      where: { email: usuario.email }
    })

    if (!existing) {
      await prisma.user.create({ data: usuario })
      console.log(`✅ Usuario creado: ${usuario.name} (${usuario.rol})`)
    } else {
      console.log(`⏭️  Usuario ya existe: ${usuario.name}`)
    }
  }

  console.log('✨ Seed completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
