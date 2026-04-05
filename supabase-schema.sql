-- =====================================================
-- BIOMOV - Script de creación de tablas para Supabase
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  dni TEXT UNIQUE,
  rol TEXT DEFAULT 'paciente' CHECK (rol IN ('admin', 'paciente', 'entrenador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asistencia table
CREATE TABLE IF NOT EXISTS asistencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('MEDICINA', 'FISIOTERAPIA', 'NUTRICION', 'ASISTENCIA_SOCIAL', 'GIMNASIO')),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuracion areas table (opcional)
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

-- Indexes para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_asistencias_paciente_id ON asistencias(paciente_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_area ON asistencias(area);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_areas ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (acceso completo)
CREATE POLICY "Service role full access on users" ON users 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Service role full access on asistencias" ON asistencias 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Service role full access on configuracion_areas" ON configuracion_areas 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Políticas para anon (lectura limitada)
CREATE POLICY "Anon can read users" ON users 
  FOR SELECT TO anon 
  USING (true);

CREATE POLICY "Anon can insert asistencias" ON asistencias 
  FOR INSERT TO anon 
  WITH CHECK (true);

CREATE POLICY "Anon can read asistencias" ON asistencias 
  FOR SELECT TO anon 
  USING (true);

CREATE POLICY "Anon can read configuracion_areas" ON configuracion_areas 
  FOR SELECT TO anon 
  USING (true);

-- Insertar áreas por defecto
INSERT INTO configuracion_areas (codigo, nombre, descripcion, icono, color) VALUES
  ('MEDICINA', 'Medicina', 'Consultas médicas generales', 'local_hospital', '#ef4444'),
  ('FISIOTERAPIA', 'Fisioterapia', 'Terapia física y rehabilitación', 'healing', '#3b82f6'),
  ('NUTRICION', 'Nutrición', 'Consultas de nutrición y dietética', 'restaurant', '#22c55e'),
  ('ASISTENCIA_SOCIAL', 'Asistencia Social', 'Servicios de trabajo social', 'volunteer_activism', '#f59e0b'),
  ('GIMNASIO', 'Gimnasio', 'Área de entrenamiento físico', 'fitness_center', '#8b5cf6')
ON CONFLICT (codigo) DO NOTHING;

-- Insertar usuario demo
INSERT INTO users (id, email, name, dni, rol) VALUES
  ('demo-user-id', 'demo@biomov.com', 'Carlos Mendoza', '12345678', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracion_areas_updated_at
  BEFORE UPDATE ON configuracion_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
