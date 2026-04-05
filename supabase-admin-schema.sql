-- =====================================================
-- BIOMOV - ESQUEMA COMPLETO PARA ADMINISTRACIÓN
-- Incluye: Perfiles, Evaluaciones, Planificación, 
-- Entrenamiento, Recuperación y Dashboard Admin
-- =====================================================

-- =====================================================
-- 1. TABLA DE USUARIOS (Actualizar tabla existente)
-- =====================================================

-- Agregar campos adicionales a la tabla usuarios si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'activo') THEN
    ALTER TABLE usuarios ADD COLUMN activo BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'ultimo_acceso') THEN
    ALTER TABLE usuarios ADD COLUMN ultimo_acceso TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'foto_perfil') THEN
    ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT;
  END IF;
END $$;

-- =====================================================
-- 2. TABLA DE PERFIL DE USUARIO
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  
  -- Datos personales
  nombre_completo TEXT,
  fecha_nacimiento DATE,
  genero TEXT CHECK (genero IN ('masculino', 'femenino', 'otro')),
  altura_cm DECIMAL(5,2),
  peso_kg DECIMAL(5,2),
  
  -- Métricas calculadas automáticamente
  imc DECIMAL(4,2),
  edad INTEGER,
  
  -- Métricas cardíacas
  fc_maxima INTEGER,
  fc_reposo INTEGER,
  vfc_media DECIMAL(6,2),
  
  -- Composición corporal
  grasa_corporal_pct DECIMAL(4,2),
  masa_muscular_kg DECIMAL(5,2),
  
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
  rm_total DECIMAL(6,2) GENERATED ALWAYS AS (
    COALESCE(rm_bench_press, 0) + COALESCE(rm_squat, 0) + COALESCE(rm_deadlift, 0)
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE EVALUACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id UUID REFERENCES user_profiles(id),
  
  -- Tipo y fecha
  tipo_evaluacion TEXT NOT NULL CHECK (tipo_evaluacion IN ('fuerza', 'cardio', 'movilidad', 'composicion', 'vfc', 'isometrico')),
  fecha_evaluacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Datos de evaluación de fuerza
  musculo_evaluado TEXT,
  ejercicio_evaluado TEXT,
  fuerza_maxima_kg DECIMAL(5,2),
  rfd_kg_s DECIMAL(6,2),
  tiempo_hasta_fmax_ms INTEGER,
  fuerza_media_kg DECIMAL(5,2),
  duracion_test_ms INTEGER,
  indice_fatiga DECIMAL(4,2),
  simetria_porcentaje DECIMAL(5,2),
  
  -- Datos de evaluación cardiovascular
  fc_media INTEGER,
  fc_max_alcanzada INTEGER,
  fc_min_alcanzada INTEGER,
  vfc_rmssd DECIMAL(6,2),
  vfc_sdnn DECIMAL(6,2),
  vfc_pnn50 DECIMAL(5,2),
  zscore_vfc DECIMAL(4,2),
  estado_autonomo TEXT CHECK (estado_autonomo IN ('supercompensado', 'optimo', 'fatiga_moderada', 'fatiga_alta', 'fatiga_critica')),
  
  -- Datos de composición corporal
  grasa_corporal_pct DECIMAL(4,2),
  masa_muscular_kg DECIMAL(5,2),
  masa_osea_kg DECIMAL(5,2),
  agua_corporal_pct DECIMAL(4,2),
  
  -- Datos de movilidad
  rom_grados DECIMAL(5,2),
  articulacion_evaluada TEXT,
  lateralidad TEXT CHECK (lateralidad IN ('izquierda', 'derecha', 'bilateral')),
  
  -- VDOT y métricas de carrera
  vdot DECIMAL(4,1),
  tiempo_carrera_seg INTEGER,
  distancia_carrera_m INTEGER,
  ritmo_promedio_seg_km INTEGER,
  
  -- Puntuaciones
  puntuacion_fuerza INTEGER,
  puntuacion_cardio INTEGER,
  puntuacion_movilidad INTEGER,
  puntuacion_general INTEGER,
  
  -- Notas y observaciones
  observaciones TEXT,
  recomendaciones TEXT,
  
  -- Metadata
  creado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE PLANIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS planificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id UUID REFERENCES user_profiles(id),
  
  -- Información del plan
  nombre_plan TEXT NOT NULL,
  descripcion TEXT,
  tipo_plan TEXT DEFAULT 'fuerza' CHECK (tipo_plan IN ('fuerza', 'cardio', 'mixto', 'movilidad', 'deporte')),
  
  -- Periodización
  mesociclo_numero INTEGER DEFAULT 1,
  microciclo_actual INTEGER DEFAULT 1,
  fase TEXT DEFAULT 'adaptacion' CHECK (fase IN ('adaptacion', 'hipertrofia', 'fuerza', 'potencia', 'deload', 'competencia')),
  fecha_inicio DATE,
  fecha_fin DATE,
  
  -- Datos de carrera (desde perfil)
  vdot_actual DECIMAL(4,1),
  vdot_objetivo DECIMAL(4,1),
  ritmo_objetivo_seg_km INTEGER,
  fc_objetivo_zona TEXT,
  
  -- Configuración semanal
  dias_entrenamiento_semana INTEGER DEFAULT 4,
  volumen_semanal_min INTEGER,
  volumen_semanal_kg DECIMAL(10,2),
  intensidad_semanal_puntos DECIMAL(6,2),
  
  -- Objetivos específicos
  objetivo_fuerza_kg DECIMAL(6,2),
  objetivo_hipertrofia_pct DECIMAL(4,2),
  objetivo_resistencia_km DECIMAL(6,2),
  
  -- Métricas de progreso
  progreso_porcentaje DECIMAL(4,2) DEFAULT 0,
  sesiones_completadas INTEGER DEFAULT 0,
  sesiones_planificadas INTEGER DEFAULT 0,
  
  -- Estado
  activo BOOLEAN DEFAULT TRUE,
  completado BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  creado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA DE SESIONES DE ENTRENAMIENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS sesiones_entrenamiento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  planificacion_id UUID REFERENCES planificaciones(id),
  
  -- Información de la sesión
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6),
  tipo_sesion TEXT CHECK (tipo_sesion IN ('fuerza', 'cardio', 'mixto', 'recuperacion', 'tecnica', 'competencia')),
  nombre_sesion TEXT,
  completada BOOLEAN DEFAULT FALSE,
  
  -- Métricas de volumen y carga
  duracion_min INTEGER,
  series_completadas INTEGER,
  reps_totales INTEGER,
  volumen_total_kg DECIMAL(10,2),
  carga_total DECIMAL(10,2),
  tonelaje DECIMAL(10,2),
  
  -- Métricas de intensidad
  intensidad_promedio DECIMAL(3,1),
  rpe_promedio DECIMAL(2,1),
  rir_promedio DECIMAL(2,1),
  puntos_intensidad DECIMAL(6,2),
  
  -- Métricas cardíacas
  fc_promedio INTEGER,
  fc_max_sesion INTEGER,
  fc_min_sesion INTEGER,
  fc_zona_tiempo JSONB,
  calorias_estimadas INTEGER,
  
  -- Métricas de carrera (si aplica)
  distancia_km DECIMAL(6,2),
  ritmo_promedio_seg_km INTEGER,
  ritmo_mejor_seg_km INTEGER,
  elevacion_metros INTEGER,
  
  -- Percepción subjetiva
  sensacion_general TEXT CHECK (sensacion_general IN ('muy_mala', 'mala', 'regular', 'buena', 'muy_buena', 'excelente')),
  energia_nivel INTEGER CHECK (energia_nivel BETWEEN 1 AND 10),
  motivacion_nivel INTEGER CHECK (motivacion_nivel BETWEEN 1 AND 10),
  sueno_nivel INTEGER CHECK (sueno_nivel BETWEEN 1 AND 10),
  estres_nivel INTEGER CHECK (estres_nivel BETWEEN 1 AND 10),
  dolor_muscular INTEGER CHECK (dolor_muscular BETWEEN 1 AND 10),
  
  -- Ejercicios realizados (JSON)
  ejercicios JSONB DEFAULT '[]'::jsonb,
  
  -- Notas
  notas TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLA DE RECUPERACIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS registros_recuperacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Fecha y momento
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  momento_dia TEXT CHECK (momento_dia IN ('manana', 'tarde', 'noche', 'pre_entreno', 'post_entreno')),
  
  -- Métricas de recuperación subjetiva
  calidad_sueno INTEGER CHECK (calidad_sueno BETWEEN 1 AND 10),
  horas_sueno DECIMAL(3,1),
  energia_nivel INTEGER CHECK (energia_nivel BETWEEN 1 AND 10),
  motivacion_nivel INTEGER CHECK (motivacion_nivel BETWEEN 1 AND 10),
  estres_nivel INTEGER CHECK (estres_nivel BETWEEN 1 AND 10),
  dolor_muscular INTEGER CHECK (dolor_muscular BETWEEN 1 AND 10),
  
  -- Métricas VFC
  vfc_rmssd DECIMAL(6,2),
  vfc_sdnn DECIMAL(6,2),
  vfc_lf DECIMAL(8,2),
  vfc_hf DECIMAL(8,2),
  vfc_ratio_lf_hf DECIMAL(6,2),
  zscore_vfc DECIMAL(4,2),
  
  -- Estado autonómico
  estado_recuperacion TEXT CHECK (estado_recuperacion IN ('supercompensado', 'optimo', 'fatiga_leve', 'fatiga_moderada', 'fatiga_alta', 'sobrenetrenamiento')),
  
  -- Índices calculados
  indice_recuperacion DECIMAL(4,1),
  readiness_score DECIMAL(4,1),
  
  -- Métricas adicionales
  fc_reposo INTEGER,
  spo2 INTEGER,
  temperatura DECIMAL(4,1),
  peso_actual DECIMAL(5,2),
  hidratacion_nivel INTEGER CHECK (hidratacion_nivel BETWEEN 1 AND 10),
  
  -- Nutrición del día
  calorias_consumidas INTEGER,
  proteinas_g DECIMAL(5,1),
  carbohidratos_g DECIMAL(5,1),
  grasas_g DECIMAL(5,1),
  agua_ml INTEGER,
  
  -- Notas
  notas TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABLA DE MÉTRICAS AGREGADAS (para Dashboard Admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS metricas_usuario_diarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  fecha DATE NOT NULL,
  
  -- Entrenamiento
  sesiones_completadas INTEGER DEFAULT 0,
  volumen_total_kg DECIMAL(10,2) DEFAULT 0,
  duracion_total_min INTEGER DEFAULT 0,
  calorias_total INTEGER DEFAULT 0,
  
  -- Intensidad
  rpe_promedio DECIMAL(2,1),
  puntos_intensidad DECIMAL(6,2),
  
  -- Cardio
  distancia_total_km DECIMAL(6,2) DEFAULT 0,
  
  -- Recuperación
  calidad_sueno_prom DECIMAL(2,1),
  vfc_rmssd_prom DECIMAL(6,2),
  readiness_score DECIMAL(4,1),
  
  -- Cumplimiento
  cumplimiento_plan_pct DECIMAL(4,1) DEFAULT 0,
  
  -- Único por usuario por fecha
  UNIQUE(user_id, fecha)
);

-- =====================================================
-- 8. TABLA DE ALERTAS DEL SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS alertas_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Tipo de alerta
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN (
    'sobrenetrenamiento', 'fatiga_alta', 'inactividad', 
    'vfc_baja', 'cumplimiento_bajo', 'recordatorio', 
    'logro', 'evaluacion_pendiente', 'plan_vencido'
  )),
  severidad TEXT CHECK (severidad IN ('info', 'warning', 'critical')),
  
  -- Contenido
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  
  -- Estado
  leida BOOLEAN DEFAULT FALSE,
  resuelta BOOLEAN DEFAULT FALSE,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  
  -- Acción recomendada
  accion_recomendada TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. VISTAS PARA EL DASHBOARD ADMIN
-- =====================================================

-- Vista de resumen de usuarios para admin
CREATE OR REPLACE VIEW admin_usuarios_resumen AS
SELECT 
  u.id as user_id,
  u.email,
  u.nombre_completo,
  u.rol,
  u.activo,
  u.ultimo_acceso,
  up.edad,
  up.genero,
  up.imc,
  up.fc_maxima,
  up.fc_reposo,
  up.nivel_experiencia,
  up.objetivo,
  up.rm_total,
  up.updated_at as perfil_updated,
  (SELECT COUNT(*) FROM evaluaciones e WHERE e.user_id = u.id) as total_evaluaciones,
  (SELECT COUNT(*) FROM sesiones_entrenamiento s WHERE s.user_id = u.id) as total_sesiones,
  (SELECT MAX(fecha) FROM sesiones_entrenamiento s WHERE s.user_id = u.id) as ultima_sesion,
  (SELECT COUNT(*) FROM planificaciones p WHERE p.user_id = u.id AND p.activo = TRUE) as planes_activos
FROM usuarios u
LEFT JOIN user_profiles up ON u.id = up.user_id;

-- Vista de métricas comparativas
CREATE OR REPLACE VIEW admin_metricas_comparativas AS
SELECT 
  user_id,
  fecha,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY fecha DESC) as orden,
  sesiones_completadas,
  volumen_total_kg,
  duracion_total_min,
  rpe_promedio,
  calidad_sueno_prom,
  vfc_rmssd_prom,
  readiness_score,
  cumplimiento_plan_pct
FROM metricas_usuario_diarias;

-- Vista de progreso de usuarios
CREATE OR REPLACE VIEW admin_progreso_usuarios AS
SELECT 
  p.user_id,
  up.nombre_completo,
  p.nombre_plan,
  p.tipo_plan,
  p.fase,
  p.mesociclo_numero,
  p.progreso_porcentaje,
  p.sesiones_completadas,
  p.sesiones_planificadas,
  ROUND((p.sesiones_completadas::DECIMAL / NULLIF(p.sesiones_planificadas, 0)) * 100, 1) as cumplimiento_pct,
  p.vdot_actual,
  p.vdot_objetivo,
  p.activo,
  p.fecha_inicio,
  p.fecha_fin
FROM planificaciones p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.activo = TRUE;

-- Vista de alertas activas
CREATE OR REPLACE VIEW admin_alertas_activas AS
SELECT 
  a.*,
  up.nombre_completo,
  u.email
FROM alertas_sistema a
LEFT JOIN user_profiles up ON a.user_id = up.user_id
LEFT JOIN usuarios u ON a.user_id = u.id
WHERE a.leida = FALSE AND a.resuelta = FALSE
ORDER BY 
  CASE a.severidad 
    WHEN 'critical' THEN 1 
    WHEN 'warning' THEN 2 
    ELSE 3 
  END,
  a.created_at DESC;

-- Vista de estadísticas agregadas
CREATE OR REPLACE VIEW admin_estadisticas_generales AS
SELECT 
  COUNT(DISTINCT u.id) as total_usuarios,
  COUNT(DISTINCT CASE WHEN u.activo = TRUE THEN u.id END) as usuarios_activos,
  COUNT(DISTINCT CASE WHEN u.ultimo_acceso > NOW() - INTERVAL '7 days' THEN u.id END) as usuarios_semana,
  COUNT(DISTINCT CASE WHEN u.ultimo_acceso > NOW() - INTERVAL '30 days' THEN u.id END) as usuarios_mes,
  (SELECT COUNT(*) FROM evaluaciones WHERE fecha_evaluacion > NOW() - INTERVAL '30 days') as evaluaciones_mes,
  (SELECT COUNT(*) FROM sesiones_entrenamiento WHERE fecha > NOW() - INTERVAL '7 days') as sesiones_semana,
  (SELECT COUNT(*) FROM planificaciones WHERE activo = TRUE) as planes_activos,
  (SELECT AVG(readiness_score) FROM registros_recuperacion WHERE fecha > NOW() - INTERVAL '7 days') as readiness_promedio,
  (SELECT COUNT(*) FROM alertas_sistema WHERE leida = FALSE) as alertas_pendientes
FROM usuarios u;

-- =====================================================
-- 10. ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_user_id ON evaluaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON evaluaciones(fecha_evaluacion DESC);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_tipo ON evaluaciones(tipo_evaluacion);
CREATE INDEX IF NOT EXISTS idx_planificaciones_user_id ON planificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_planificaciones_activo ON planificaciones(activo);
CREATE INDEX IF NOT EXISTS idx_sesiones_user_id ON sesiones_entrenamiento(user_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones_entrenamiento(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_tipo ON sesiones_entrenamiento(tipo_sesion);
CREATE INDEX IF NOT EXISTS idx_recuperacion_user_id ON registros_recuperacion(user_id);
CREATE INDEX IF NOT EXISTS idx_recuperacion_fecha ON registros_recuperacion(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_metricas_diarias_user_fecha ON metricas_usuario_diarias(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_user_id ON alertas_sistema(user_id);
CREATE INDEX IF NOT EXISTS idx_alertas_leida ON alertas_sistema(leida);
CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acceso ON usuarios(ultimo_acceso DESC);

-- =====================================================
-- 11. HABILITAR RLS (Row Level Security)
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_entrenamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_recuperacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_usuario_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_sistema ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 12. POLÍTICAS DE ACCESO
-- =====================================================

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_rol TEXT;
BEGIN
  SELECT rol INTO user_rol FROM usuarios WHERE id = current_setting('request.jwt.claims', true)::json->>'sub';
  RETURN user_rol IN ('admin', 'superadmin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para user_profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'super_admin')));

CREATE POLICY "Users can view own profile" ON user_profiles 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on user_profiles" ON user_profiles 
  FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can manage profiles" ON user_profiles 
  FOR ALL TO anon 
  USING (true) WITH CHECK (true);

-- Políticas para evaluaciones
CREATE POLICY "Admins can view all evaluaciones" ON evaluaciones 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'super_admin')));

CREATE POLICY "Users can view own evaluaciones" ON evaluaciones 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on evaluaciones" ON evaluaciones 
  FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can manage evaluaciones" ON evaluaciones 
  FOR ALL TO anon 
  USING (true) WITH CHECK (true);

-- Políticas similares para otras tablas...
CREATE POLICY "Service role full access on planificaciones" ON planificaciones 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage planificaciones" ON planificaciones 
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on sesiones" ON sesiones_entrenamiento 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage sesiones" ON sesiones_entrenamiento 
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on recuperacion" ON registros_recuperacion 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage recuperacion" ON registros_recuperacion 
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on metricas" ON metricas_usuario_diarias 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage metricas" ON metricas_usuario_diarias 
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on alertas" ON alertas_sistema 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage alertas" ON alertas_sistema 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- 13. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_planificaciones_updated_at ON planificaciones;
CREATE TRIGGER update_planificaciones_updated_at
  BEFORE UPDATE ON planificaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS calculate_bmi_trigger ON user_profiles;
CREATE TRIGGER calculate_bmi_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION calculate_bmi();

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

DROP TRIGGER IF EXISTS calculate_age_trigger ON user_profiles;
CREATE TRIGGER calculate_age_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION calculate_age();

-- Función para actualizar métricas diarias
CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_fecha DATE;
BEGIN
  v_fecha := DATE(NEW.fecha);
  
  INSERT INTO metricas_usuario_diarias (user_id, fecha, sesiones_completadas, volumen_total_kg, duracion_total_min, rpe_promedio, puntos_intensidad)
  VALUES (
    NEW.user_id,
    v_fecha,
    1,
    COALESCE(NEW.volumen_total_kg, 0),
    COALESCE(NEW.duracion_min, 0),
    NEW.rpe_promedio,
    COALESCE(NEW.puntos_intensidad, 0)
  )
  ON CONFLICT (user_id, fecha) DO UPDATE SET
    sesiones_completadas = metricas_usuario_diarias.sesiones_completadas + 1,
    volumen_total_kg = metricas_usuario_diarias.volumen_total_kg + COALESCE(NEW.volumen_total_kg, 0),
    duracion_total_min = metricas_usuario_diarias.duracion_total_min + COALESCE(NEW.duracion_min, 0),
    rpe_promedio = (metricas_usuario_diarias.rpe_promedio + COALESCE(NEW.rpe_promedio, 0)) / 2,
    puntos_intensidad = metricas_usuario_diarias.puntos_intensidad + COALESCE(NEW.puntos_intensidad, 0);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_metrics_on_session ON sesiones_entrenamiento;
CREATE TRIGGER update_metrics_on_session
  AFTER INSERT ON sesiones_entrenamiento
  FOR EACH ROW EXECUTE FUNCTION update_daily_metrics();

-- Función para crear alertas automáticas
CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Alerta de fatiga alta
  IF NEW.estado_recuperacion IN ('fatiga_alta', 'sobrenetrenamiento') THEN
    INSERT INTO alertas_sistema (user_id, tipo_alerta, severidad, titulo, mensaje, accion_recomendada)
    VALUES (
      NEW.user_id,
      'fatiga_alta',
      'critical',
      'Fatiga Elevada Detectada',
      'Se detectó un estado de fatiga alta o sobreenentrenamiento. readiness_score: ' || NEW.readiness_score,
      'Reducir intensidad de entrenamiento y considerar días de descanso adicionales.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS create_alerts_on_recovery ON registros_recuperacion;
CREATE TRIGGER create_alerts_on_recovery
  AFTER INSERT ON registros_recuperacion
  FOR EACH ROW EXECUTE FUNCTION check_and_create_alerts();

-- =====================================================
-- 14. DATOS DE EJEMPLO PARA PRUEBAS
-- =====================================================

-- Insertar perfiles de ejemplo
INSERT INTO user_profiles (user_id, nombre_completo, fecha_nacimiento, genero, altura_cm, peso_kg, fc_maxima, fc_reposo, nivel_experiencia, objetivo)
VALUES 
  ('demo-user-1', 'Carlos Mendoza', '1990-05-15', 'masculino', 178, 75, 185, 55, 'intermedio', 'fuerza'),
  ('demo-user-2', 'Ana García', '1995-08-22', 'femenino', 165, 58, 178, 52, 'avanzado', 'resistencia'),
  ('demo-user-3', 'Miguel Torres', '1988-03-10', 'masculino', 182, 82, 190, 58, 'principiante', 'salud')
ON CONFLICT (user_id) DO NOTHING;

-- Insertar evaluaciones de ejemplo
INSERT INTO evaluaciones (user_id, tipo_evaluacion, fecha_evaluacion, vdot, puntuacion_fuerza, puntuacion_cardio, puntuacion_general)
VALUES 
  ('demo-user-1', 'fuerza', NOW() - INTERVAL '7 days', 45.5, 78, 72, 75),
  ('demo-user-1', 'cardio', NOW() - INTERVAL '5 days', 46.2, NULL, 80, 80),
  ('demo-user-2', 'fuerza', NOW() - INTERVAL '3 days', 52.0, 85, 88, 86),
  ('demo-user-3', 'composicion', NOW() - INTERVAL '10 days', 38.0, 55, 60, 58)
ON CONFLICT DO NOTHING;

-- Insertar sesiones de ejemplo
INSERT INTO sesiones_entrenamiento (user_id, fecha, tipo_sesion, duracion_min, volumen_total_kg, rpe_promedio, completada)
VALUES 
  ('demo-user-1', NOW() - INTERVAL '1 day', 'fuerza', 65, 8500, 7.5, TRUE),
  ('demo-user-1', NOW() - INTERVAL '3 days', 'cardio', 45, 0, 6.0, TRUE),
  ('demo-user-2', NOW() - INTERVAL '1 day', 'mixto', 75, 6200, 8.0, TRUE),
  ('demo-user-3', NOW() - INTERVAL '2 days', 'fuerza', 50, 4500, 6.5, TRUE)
ON CONFLICT DO NOTHING;

-- Insertar registros de recuperación
INSERT INTO registros_recuperacion (user_id, fecha, calidad_sueno, horas_sueno, energia_nivel, vfc_rmssd, readiness_score, estado_recuperacion)
VALUES 
  ('demo-user-1', NOW() - INTERVAL '1 day', 8, 7.5, 8, 65.5, 85, 'optimo'),
  ('demo-user-2', NOW() - INTERVAL '1 day', 7, 6.0, 7, 58.2, 78, 'optimo'),
  ('demo-user-3', NOW() - INTERVAL '1 day', 6, 5.5, 5, 42.0, 55, 'fatiga_leve')
ON CONFLICT DO NOTHING;
