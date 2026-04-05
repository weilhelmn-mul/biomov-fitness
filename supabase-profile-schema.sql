-- =====================================================
-- BIOMOV - Tablas de Perfil, Evaluación y Planificación
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- 1. TABLA DE PERFIL DE USUARIO
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  
  -- Datos personales
  nombre_completo TEXT,
  fecha_nacimiento DATE,
  altura_cm DECIMAL(5,2),
  peso_kg DECIMAL(5,2),
  
  -- Métricas calculadas
  imc DECIMAL(4,2),
  edad INTEGER,
  
  -- Métricas cardíacas
  fc_maxima INTEGER,
  fc_reposo INTEGER,
  vfc_media DECIMAL(6,2),
  
  -- Preferencias
  unidades_metricas BOOLEAN DEFAULT TRUE,
  nivel_experiencia TEXT DEFAULT 'intermedio' CHECK (nivel_experiencia IN ('principiante', 'intermedio', 'avanzado')),
  objetivo TEXT DEFAULT 'salud' CHECK (objetivo IN ('fuerza', 'hipertrofia', 'resistencia', 'salud', 'perdida_peso')),
  
  -- Records personales (1RM)
  rm_bench_press DECIMAL(5,2),
  rm_squat DECIMAL(5,2),
  rm_deadlift DECIMAL(5,2),
  rm_overhead_press DECIMAL(5,2),
  rm_barbell_row DECIMAL(5,2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE EVALUACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id UUID REFERENCES user_profiles(id),
  
  -- Tipo y fecha
  tipo_evaluacion TEXT NOT NULL CHECK (tipo_evaluacion IN ('fuerza', 'cardio', 'movilidad', 'composicion', 'vfc')),
  fecha_evaluacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Datos de evaluación de fuerza
  musculo_evaluado TEXT,
  ejercicio_evaluado TEXT,
  fuerza_maxima_kg DECIMAL(5,2),
  rfd_kg_s DECIMAL(6,2),
  tiempo_hasta_fmax_ms INTEGER,
  fuerza_media_kg DECIMAL(5,2),
  duracion_test_ms INTEGER,
  indice_fatiga INTEGER,
  simetria_porcentaje DECIMAL(5,2),
  
  -- Datos de evaluación cardiovascular
  fc_media INTEGER,
  fc_max_alcanzada INTEGER,
  vfc_rmssd DECIMAL(6,2),
  vfc_sdnn DECIMAL(6,2),
  zscore_vfc DECIMAL(4,2),
  estado_autonomo TEXT,
  
  -- Datos de composición corporal
  grasa_corporal_pct DECIMAL(4,2),
  masa_muscular_kg DECIMAL(5,2),
  agua_corporal_pct DECIMAL(4,2),
  
  -- Datos de movilidad
  rom_grados DECIMAL(5,2),
  articulacion_evaluada TEXT,
  
  -- VDOT y métricas de carrera
  vdot DECIMAL(4,1),
  tiempo_carrera_seg INTEGER,
  distancia_carrera_m INTEGER,
  
  -- Notas y observaciones
  observaciones TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE PLANIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS planificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id UUID REFERENCES user_profiles(id),
  
  -- Información del plan
  nombre_plan TEXT NOT NULL,
  descripcion TEXT,
  tipo_plan TEXT DEFAULT 'fuerza' CHECK (tipo_plan IN ('fuerza', 'cardio', 'mixto', 'movilidad')),
  
  -- Periodización
  mesociclo_numero INTEGER DEFAULT 1,
  fase TEXT DEFAULT 'adaptacion' CHECK (fase IN ('adaptacion', 'hipertrofia', 'fuerza', 'potencia', 'deload')),
  fecha_inicio DATE,
  fecha_fin DATE,
  
  -- Datos de carrera (desde perfil)
  vdot_objetivo DECIMAL(4,1),
  ritmo_objetivo_seg_km INTEGER,
  fc_objetivo_zona TEXT,
  
  -- Configuración semanal
  dias_entrenamiento_semana INTEGER DEFAULT 4,
  volumen_semanal_min INTEGER,
  intensidad_semanal_puntos INTEGER,
  
  -- Estado
  activo BOOLEAN DEFAULT TRUE,
  completado BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE SESIONES DE ENTRENAMIENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS sesiones_entrenamiento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  planificacion_id UUID REFERENCES planificaciones(id),
  
  -- Información de la sesión
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tipo_sesion TEXT CHECK (tipo_sesion IN ('fuerza', 'cardio', 'mixto', 'recuperacion')),
  completada BOOLEAN DEFAULT FALSE,
  
  -- Métricas de la sesión
  duracion_min INTEGER,
  volumen_total_kg DECIMAL(10,2),
  intensidad_promedio INTEGER,
  puntos_intensidad DECIMAL(6,2),
  
  -- Métricas cardíacas
  fc_promedio INTEGER,
  fc_max_sesion INTEGER,
  calorias_estimadas INTEGER,
  
  -- Percepción subjetiva
  rpe_promedio DECIMAL(2,1),
  sensacion_general TEXT,
  
  -- Notas
  notas TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_user_id ON evaluaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON evaluaciones(fecha_evaluacion);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_tipo ON evaluaciones(tipo_evaluacion);
CREATE INDEX IF NOT EXISTS idx_planificaciones_user_id ON planificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_planificaciones_activo ON planificaciones(activo);
CREATE INDEX IF NOT EXISTS idx_sesiones_user_id ON sesiones_entrenamiento(user_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones_entrenamiento(fecha);

-- =====================================================
-- 6. HABILITAR RLS (Row Level Security)
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_entrenamiento ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS DE ACCESO
-- =====================================================

-- Políticas para user_profiles
CREATE POLICY "Service role full access on user_profiles" ON user_profiles 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anon can manage own profile" ON user_profiles 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);

-- Políticas para evaluaciones
CREATE POLICY "Service role full access on evaluaciones" ON evaluaciones 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anon can manage evaluaciones" ON evaluaciones 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);

-- Políticas para planificaciones
CREATE POLICY "Service role full access on planificaciones" ON planificaciones 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anon can manage planificaciones" ON planificaciones 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);

-- Políticas para sesiones_entrenamiento
CREATE POLICY "Service role full access on sesiones_entrenamiento" ON sesiones_entrenamiento 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anon can manage sesiones" ON sesiones_entrenamiento 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);

-- =====================================================
-- 8. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planificaciones_updated_at
  BEFORE UPDATE ON planificaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular IMC automáticamente
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.altura_cm IS NOT NULL AND NEW.altura_cm > 0 AND NEW.peso_kg IS NOT NULL AND NEW.peso_kg > 0 THEN
    NEW.imc := ROUND((NEW.peso_kg / POWER(NEW.altura_cm / 100, 2))::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para calcular IMC
CREATE TRIGGER calculate_bmi_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bmi();

-- Función para calcular edad automáticamente
CREATE OR REPLACE FUNCTION calculate_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_nacimiento IS NOT NULL THEN
    NEW.edad := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.fecha_nacimiento))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para calcular edad
CREATE TRIGGER calculate_age_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_age();

-- =====================================================
-- 9. DATOS DE EJEMPLO
-- =====================================================

-- Insertar perfil de ejemplo
INSERT INTO user_profiles (user_id, nombre_completo, fecha_nacimiento, altura_cm, peso_kg, fc_maxima, fc_reposo, nivel_experiencia, objetivo)
VALUES 
  ('demo-user-id', 'Carlos Mendoza', '1990-05-15', 178, 75, 185, 55, 'intermedio', 'fuerza')
ON CONFLICT (user_id) DO NOTHING;
