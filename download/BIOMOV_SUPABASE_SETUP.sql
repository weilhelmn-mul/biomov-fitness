-- =====================================================
-- BIOMOV - CONFIGURACIÓN COMPLETA SUPABASE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre_completo TEXT,
  dni TEXT,
  rol TEXT DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin', 'superadmin', 'super_admin', 'entrenador', 'paciente')),
  aprobado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  foto_perfil TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_aprobado ON usuarios(aprobado);

-- 2. TABLA DE ASISTENCIAS
CREATE TABLE IF NOT EXISTS asistencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  nombre_completo TEXT NOT NULL,
  area TEXT NOT NULL,
  area_id UUID,
  observacion TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dispositivo TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asistencias_usuario ON asistencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_area ON asistencias(area);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);

-- 3. TABLA DE ÁREAS CONFIGURACIÓN
CREATE TABLE IF NOT EXISTS configuracion_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT,
  color TEXT,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HABILITAR RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_areas ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS
CREATE POLICY "Public read usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Public insert usuarios" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update usuarios" ON usuarios FOR UPDATE USING (true);

CREATE POLICY "Public read asistencias" ON asistencias FOR SELECT USING (true);
CREATE POLICY "Public insert asistencias" ON asistencias FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read areas" ON configuracion_areas FOR SELECT USING (true);
CREATE POLICY "Public insert areas" ON configuracion_areas FOR INSERT WITH CHECK (true);

-- 6. INSERTAR ÁREAS POR DEFECTO
INSERT INTO configuracion_areas (codigo, nombre, descripcion, icono, color) VALUES
  ('MEDICINA', 'Medicina', 'Consultas médicas generales', 'local_hospital', '#ef4444'),
  ('FISIOTERAPIA', 'Fisioterapia', 'Terapia física y rehabilitación', 'healing', '#3b82f6'),
  ('NUTRICION', 'Nutrición', 'Consultas de nutrición y dietética', 'restaurant', '#22c55e'),
  ('ASISTENCIA_SOCIAL', 'Asistencia Social', 'Servicios de trabajo social', 'volunteer_activism', '#f59e0b'),
  ('GIMNASIO', 'Gimnasio', 'Área de entrenamiento físico', 'fitness_center', '#8b5cf6')
ON CONFLICT (codigo) DO NOTHING;

-- 7. CREAR USUARIO ADMIN POR DEFECTO
-- Email: admin@biomov.com
-- Contraseña: admin123
-- IMPORTANTE: Cambiar la contraseña después del primer login
INSERT INTO usuarios (email, password_hash, nombre_completo, rol, aprobado)
VALUES (
  'admin@biomov.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqK3XJWKhLZGqP6bOPNVYJmFQK6mvm',
  'Administrador BIOMOV',
  'super_admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- 8. VERIFICAR DATOS
SELECT 'usuarios' as tabla, count(*) as registros FROM usuarios
UNION ALL
SELECT 'asistencias', count(*) FROM asistencias
UNION ALL
SELECT 'configuracion_areas', count(*) FROM configuracion_areas;
