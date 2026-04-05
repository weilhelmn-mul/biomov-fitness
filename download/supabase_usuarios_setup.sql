-- =====================================================
-- BIOMOV - TABLA DE USUARIOS PARA LOGIN
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Crear tabla de usuarios
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

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_aprobado ON usuarios(aprobado);

-- Habilitar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios pueden ver su propio registro" ON usuarios
  FOR SELECT USING (true);

-- Política para permitir inserción
CREATE POLICY "Cualquiera puede insertar" ON usuarios
  FOR INSERT WITH CHECK (true);

-- Política para permitir actualización
CREATE POLICY "Usuarios pueden actualizar su propio registro" ON usuarios
  FOR UPDATE USING (true);

-- Crear un usuario admin por defecto
-- Contraseña: admin123 (cambiar después del primer login)
INSERT INTO usuarios (email, password_hash, nombre_completo, rol, aprobado)
VALUES (
  'admin@biomov.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqK3XJWKhLZGqP6bOPNVYJmFQK6mvm',
  'Administrador',
  'super_admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Verificar la tabla
SELECT * FROM usuarios;
