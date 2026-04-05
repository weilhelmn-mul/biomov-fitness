# Módulo de Registro de Asistencia por QR - BIOMOV

## 📋 Descripción General

Módulo completo para el control de asistencia de deportistas/pacientes mediante escaneo de códigos QR en diferentes áreas de un centro deportivo o de rehabilitación.

---

## 🏗️ Arquitectura

### Componentes Principales

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `AttendanceModule` | `/src/components/attendance/AttendanceModule.tsx` | Escáner QR y formulario de registro |
| `AttendanceAdmin` | `/src/components/attendance/AttendanceAdmin.tsx` | Panel de administración completo |
| `AreaBadge` | `/src/components/attendance/AreaBadge.tsx` | Badges con iconos por área |
| `AttendancePage` | `/src/app/page.tsx` (línea 1175) | Página integrada en la navegación |

### API Routes

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/attendance` | GET | Obtener asistencias con filtros |
| `/api/attendance` | POST | Registrar nueva asistencia |
| `/api/attendance/check` | GET | Verificar duplicados (30 min) |
| `/api/user` | GET | Obtener usuario actual |

---

## 🗄️ Base de Datos (Prisma/SQLite)

### Modelo User
```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String?
  dni          String?       @unique
  rol          String        @default("paciente") // admin, paciente, entrenador
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  asistencias  Asistencia[]
}
```

### Modelo Asistencia
```prisma
model Asistencia {
  id             String   @id @default(cuid())
  pacienteId     String
  nombreCompleto String
  area           String   // MEDICINA, FISIOTERAPIA, NUTRICION, ASISTENCIA_SOCIAL, GIMNASIO
  fecha          DateTime @default(now())
  observacion    String?
  createdAt      DateTime @default(now())
  usuario        User     @relation(fields: [pacienteId], references: [id])
}
```

### Modelo ConfiguracionArea
```prisma
model ConfiguracionArea {
  id          String   @id @default(cuid())
  codigo      String   @unique
  nombre      String
  descripcion String?
  icono       String?
  color       String?
  activa      Boolean  @default(true)
}
```

---

## 📱 Flujo de Usuario

### 1. Registro de Asistencia
```
Usuario → Pestaña "Asistencia" → Botón "Activar Cámara" 
→ Escanea QR del área → Confirma registro → ✅ Asistencia registrada
```

### 2. Panel de Administración
```
Admin → Pestaña "Asistencia" → Botón "Panel Admin" 
→ Ve historial completo → Filtra/Busca → Exporta a Excel
```

---

## 🎨 Áreas Configuradas

| Código | Nombre | Color | Icono |
|--------|--------|-------|-------|
| MEDICINA | Medicina | `#00f0ff` | `medical_services` |
| FISIOTERAPIA | Fisioterapia | `#13ec6d` | `healing` |
| NUTRICION | Nutrición | `#f59e0b` | `restaurant` |
| ASISTENCIA_SOCIAL | Asistencia Social | `#a855f7` | `volunteer_activism` |
| GIMNASIO | Gimnasio | `#ef4444` | `fitness_center` |

---

## 🔐 Seguridad

### Validaciones
- Formato QR válido: `AREA:NOMBRE_AREA`
- Área reconocida en lista predefinida
- Prevención de duplicados: 30 minutos entre registros en la misma área

### Roles de Usuario
- **admin**: Acceso completo (escáner + panel admin)
- **paciente**: Solo registro de asistencia
- **entrenador**: Solo registro de asistencia

---

## 📊 Funcionalidades del Panel Admin

1. **Filtros**
   - Por área
   - Por fecha
   - Por nombre

2. **Estadísticas**
   - Conteo por área
   - Total de asistencias
   - Distribución porcentual (gráfico de barras)

3. **Exportación**
   - Excel (.xlsx) con todos los datos filtrados

---

## 🔧 Tecnologías Utilizadas

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de Datos**: Prisma ORM + SQLite
- **Escaneo QR**: html5-qrcode
- **Exportación**: xlsx + file-saver
- **UI Components**: shadcn/ui

---

## 📝 Formato de Código QR

Los códigos QR deben contener el siguiente formato:
```
AREA:MEDICINA
AREA:FISIOTERAPIA
AREA:NUTRICION
AREA:ASISTENCIA_SOCIAL
AREA:GIMNASIO
```

---

## 🚀 Cómo Usar

1. Navegar a la pestaña **"Asistencia"** en el dashboard
2. Presionar **"Activar Cámara"**
3. Apuntar al código QR del área
4. Confirmar el registro
5. (Solo admin) Acceder al **Panel Admin** para ver historial

---

## 📁 Archivos del Módulo

```
src/
├── app/
│   ├── api/
│   │   ├── attendance/
│   │   │   ├── route.ts
│   │   │   └── check/
│   │   │       └── route.ts
│   │   └── user/
│   │       └── route.ts
│   └── page.tsx (AttendancePage integrada)
├── components/
│   └── attendance/
│       ├── AttendanceModule.tsx
│       ├── AttendanceAdmin.tsx
│       ├── AreaBadge.tsx
│       └── index.ts
prisma/
└── schema.prisma (modelos User, Asistencia, ConfiguracionArea)
```
