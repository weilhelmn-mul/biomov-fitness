-- ============================================
-- BIOMOV - TABLAS COMPLETAS PARA EVALUACIÓN DE FUERZA ISOMÉTRICA
-- ============================================
-- VERSIÓN 2 - Compatible con tablas existentes
-- Ejecutar COMPLETO en el Editor SQL de Supabase
-- ============================================

-- ============================================
-- PASO 1: CREAR ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE side_type AS ENUM ('Izquierdo', 'Derecho', 'Bilateral');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE force_unit AS ENUM ('kg', 'N');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE region_type AS ENUM ('upper', 'lower', 'core');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE test_status AS ENUM ('idle', 'ready', 'testing', 'finished');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- PASO 2: MODIFICAR TABLA MUSCLE_GROUPS EXISTENTE
-- ============================================

-- Agregar columna 'code' si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'muscle_groups' AND column_name = 'code'
  ) THEN
    ALTER TABLE muscle_groups ADD COLUMN code VARCHAR(50);
  END IF;
END $$;

-- Crear índice único en code si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'muscle_groups_code_key'
  ) THEN
    CREATE UNIQUE INDEX muscle_groups_code_key ON muscle_groups(code);
  END IF;
END $$;

-- Si la tabla tiene id como VARCHAR, necesitamos recrearla
-- Verificar y manejar este caso

-- ============================================
-- PASO 3: CREAR TABLAS PRINCIPALES (si no existen)
-- ============================================

-- Tabla: isometric_evaluations
CREATE TABLE IF NOT EXISTS isometric_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID,
  athlete_name VARCHAR(200),
  
  -- Datos del test
  muscle_evaluated VARCHAR(50),  -- Usamos VARCHAR para compatibilidad
  side side_type NOT NULL,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unit force_unit DEFAULT 'kg',
  
  -- Métricas principales de fuerza
  fmax DECIMAL(10,2),
  force_at_200ms DECIMAL(10,2),
  average_force DECIMAL(10,2),
  test_duration DECIMAL(6,2),
  
  -- Métricas de tiempo
  time_to_fmax DECIMAL(8,3),
  time_to_50fmax DECIMAL(8,3),
  time_to_90fmax DECIMAL(8,3),
  
  -- RFD (Rate of Force Development)
  rfd_max DECIMAL(10,2),
  rfd_50ms DECIMAL(10,2),
  rfd_100ms DECIMAL(10,2),
  rfd_150ms DECIMAL(10,2),
  rfd_200ms DECIMAL(10,2),
  
  -- Parámetros del modelo
  tau DECIMAL(8,4),
  force_modeled DECIMAL(10,2),
  
  -- Métricas de galgas
  galga1_max DECIMAL(10,2),
  galga2_max DECIMAL(10,2),
  galga1_avg DECIMAL(10,2),
  galga2_avg DECIMAL(10,2),
  
  -- Índices
  fatigue_index DECIMAL(5,2),
  symmetry_index DECIMAL(5,2),
  
  -- Datos de configuración
  sampling_rate INT DEFAULT 50,
  calibration_factor DECIMAL(12,2),
  
  -- Curva de fuerza
  force_curve JSONB,
  
  -- Metadatos
  device_info JSONB,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: bilateral_comparisons
CREATE TABLE IF NOT EXISTS bilateral_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID,
  
  muscle_base VARCHAR(50) NOT NULL,
  left_eval_id UUID REFERENCES isometric_evaluations(id),
  right_eval_id UUID REFERENCES isometric_evaluations(id),
  
  fmax_asymmetry DECIMAL(5,2),
  rfd_asymmetry DECIMAL(5,2),
  dominant_side VARCHAR(10),
  
  left_fmax DECIMAL(10,2),
  right_fmax DECIMAL(10,2),
  left_rfd DECIMAL(10,2),
  right_rfd DECIMAL(10,2),
  
  comparison_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: test_sessions
CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_name VARCHAR(100),
  total_tests INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: normative_values
CREATE TABLE IF NOT EXISTS normative_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muscle_group_id VARCHAR(50),  -- Usamos VARCHAR para compatibilidad
  
  level VARCHAR(20) NOT NULL,
  gender VARCHAR(10),
  age_min INT,
  age_max INT,
  
  fmax_min DECIMAL(10,2),
  fmax_max DECIMAL(10,2),
  
  rfd_200ms_min DECIMAL(10,2),
  rfd_200ms_max DECIMAL(10,2),
  
  unit force_unit DEFAULT 'kg',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 4: ACTUALIZAR DATOS DE MUSCLE_GROUPS
-- ============================================

-- Si muscle_groups tiene datos pero sin 'code', actualizar según name_es o name_en
-- Primero verificamos la estructura actual

-- Actualizar códigos basados en patrones existentes
UPDATE muscle_groups SET code = 'pectoral_l' WHERE name_es ILIKE '%pectoral%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'pectoral_r' WHERE name_es ILIKE '%pectoral%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'deltoid_ant_l' WHERE (name_es ILIKE '%deltoide%anter%' OR name_en ILIKE '%anterior%deltoid%') AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'deltoid_ant_r' WHERE (name_es ILIKE '%deltoide%anter%' OR name_en ILIKE '%anterior%deltoid%') AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'deltoid_mid_l' WHERE (name_es ILIKE '%deltoide%medio%' OR name_en ILIKE '%middle%deltoid%') AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'deltoid_mid_r' WHERE (name_es ILIKE '%deltoide%medio%' OR name_en ILIKE '%middle%deltoid%') AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'deltoid_post_l' WHERE (name_es ILIKE '%deltoide%posterior%' OR name_en ILIKE '%posterior%deltoid%') AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'deltoid_post_r' WHERE (name_es ILIKE '%deltoide%posterior%' OR name_en ILIKE '%posterior%deltoid%') AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'trap_upper_l' WHERE name_es ILIKE '%trapecio%super%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'trap_upper_r' WHERE name_es ILIKE '%trapecio%super%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'trap_lower_l' WHERE name_es ILIKE '%trapecio%medio%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'trap_lower_r' WHERE name_es ILIKE '%trapecio%medio%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'latissimus_l' WHERE (name_es ILIKE '%dorsal%' OR name_en ILIKE '%latissimus%') AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'latissimus_r' WHERE (name_es ILIKE '%dorsal%' OR name_en ILIKE '%latissimus%') AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'biceps_l' WHERE name_es ILIKE '%bíceps%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'biceps_r' WHERE name_es ILIKE '%bíceps%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'triceps_l' WHERE name_es ILIKE '%tríceps%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'triceps_r' WHERE name_es ILIKE '%tríceps%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'core_l' WHERE name_es ILIKE '%core%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'core_r' WHERE name_es ILIKE '%core%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'glute_max_l' WHERE name_es ILIKE '%glúteo%mayor%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'glute_max_r' WHERE name_es ILIKE '%glúteo%mayor%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'glute_med_l' WHERE name_es ILIKE '%glúteo%medio%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'glute_med_r' WHERE name_es ILIKE '%glúteo%medio%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'quads_l' WHERE name_es ILIKE '%cuádriceps%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'quads_r' WHERE name_es ILIKE '%cuádriceps%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'hams_l' WHERE name_es ILIKE '%isquiotibial%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'hams_r' WHERE name_es ILIKE '%isquiotibial%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'adductors_l' WHERE name_es ILIKE '%aductor%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'adductors_r' WHERE name_es ILIKE '%aductor%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'abductors_l' WHERE name_es ILIKE '%abductor%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'abductors_r' WHERE name_es ILIKE '%abductor%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'tibialis_l' WHERE name_es ILIKE '%tibial%anter%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'tibialis_r' WHERE name_es ILIKE '%tibial%anter%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'gastroc_l' WHERE name_es ILIKE '%gastrocnemio%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'gastroc_r' WHERE name_es ILIKE '%gastrocnemio%' AND side = 'right' AND code IS NULL;
UPDATE muscle_groups SET code = 'soleus_l' WHERE name_es ILIKE '%sóleo%' AND side = 'left' AND code IS NULL;
UPDATE muscle_groups SET code = 'soleus_r' WHERE name_es ILIKE '%sóleo%' AND side = 'right' AND code IS NULL;

-- ============================================
-- PASO 5: INSERTAR GRUPOS MUSCULARES FALTANTES
-- ============================================

-- TREN SUPERIOR - IZQUIERDO
INSERT INTO muscle_groups (code, name_en, name_es, region, side) VALUES
('pectoral_l', 'Pectoralis Major', 'Pectoral Mayor', 'upper', 'left'),
('deltoid_ant_l', 'Anterior Deltoid', 'Deltoide Anterior', 'upper', 'left'),
('deltoid_mid_l', 'Middle Deltoid', 'Deltoide Medio', 'upper', 'left'),
('deltoid_post_l', 'Posterior Deltoid', 'Deltoide Posterior', 'upper', 'left'),
('trap_upper_l', 'Upper Trapezius', 'Trapecio Superior', 'upper', 'left'),
('trap_lower_l', 'Middle/Lower Trapezius', 'Trapecio Medio/Inferior', 'upper', 'left'),
('latissimus_l', 'Latissimus Dorsi', 'Dorsal Ancho', 'upper', 'left'),
('biceps_l', 'Biceps Brachii', 'Bíceps Braquial', 'upper', 'left'),
('triceps_l', 'Triceps Brachii', 'Tríceps Braquial', 'upper', 'left'),
('core_l', 'Rectus Abdominis', 'Core (Recto Abdominal)', 'upper', 'left')
ON CONFLICT (code) DO NOTHING;

-- TREN SUPERIOR - DERECHO
INSERT INTO muscle_groups (code, name_en, name_es, region, side) VALUES
('pectoral_r', 'Pectoralis Major', 'Pectoral Mayor', 'upper', 'right'),
('deltoid_ant_r', 'Anterior Deltoid', 'Deltoide Anterior', 'upper', 'right'),
('deltoid_mid_r', 'Middle Deltoid', 'Deltoide Medio', 'upper', 'right'),
('deltoid_post_r', 'Posterior Deltoid', 'Deltoide Posterior', 'upper', 'right'),
('trap_upper_r', 'Upper Trapezius', 'Trapecio Superior', 'upper', 'right'),
('trap_lower_r', 'Middle/Lower Trapezius', 'Trapecio Medio/Inferior', 'upper', 'right'),
('latissimus_r', 'Latissimus Dorsi', 'Dorsal Ancho', 'upper', 'right'),
('biceps_r', 'Biceps Brachii', 'Bíceps Braquial', 'upper', 'right'),
('triceps_r', 'Triceps Brachii', 'Tríceps Braquial', 'upper', 'right'),
('core_r', 'Rectus Abdominis', 'Core (Recto Abdominal)', 'upper', 'right')
ON CONFLICT (code) DO NOTHING;

-- TREN INFERIOR - IZQUIERDO
INSERT INTO muscle_groups (code, name_en, name_es, region, side) VALUES
('glute_max_l', 'Gluteus Maximus', 'Glúteo Mayor', 'lower', 'left'),
('glute_med_l', 'Gluteus Medius', 'Glúteo Medio', 'lower', 'left'),
('quads_l', 'Quadriceps', 'Cuádriceps', 'lower', 'left'),
('hams_l', 'Hamstrings', 'Isquiotibiales', 'lower', 'left'),
('adductors_l', 'Adductors', 'Aductores', 'lower', 'left'),
('abductors_l', 'Abductors', 'Abductores', 'lower', 'left'),
('tibialis_l', 'Tibialis Anterior', 'Tibial Anterior', 'lower', 'left'),
('gastroc_l', 'Gastrocnemius', 'Gastrocnemio', 'lower', 'left'),
('soleus_l', 'Soleus', 'Sóleo', 'lower', 'left')
ON CONFLICT (code) DO NOTHING;

-- TREN INFERIOR - DERECHO
INSERT INTO muscle_groups (code, name_en, name_es, region, side) VALUES
('glute_max_r', 'Gluteus Maximus', 'Glúteo Mayor', 'lower', 'right'),
('glute_med_r', 'Gluteus Medius', 'Glúteo Medio', 'lower', 'right'),
('quads_r', 'Quadriceps', 'Cuádriceps', 'lower', 'right'),
('hams_r', 'Hamstrings', 'Isquiotibiales', 'lower', 'right'),
('adductors_r', 'Adductors', 'Aductores', 'lower', 'right'),
('abductors_r', 'Abductors', 'Abductores', 'lower', 'right'),
('tibialis_r', 'Tibialis Anterior', 'Tibial Anterior', 'lower', 'right'),
('gastroc_r', 'Gastrocnemius', 'Gastrocnemio', 'lower', 'right'),
('soleus_r', 'Soleus', 'Sóleo', 'lower', 'right')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- PASO 6: INSERTAR VALORES NORMATIVOS
-- ============================================

-- Cuádriceps - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'bajo', 'M', 18, 30, 0, 40, 0, 200 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'medio', 'M', 18, 30, 40, 60, 200, 350 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'alto', 'M', 18, 30, 60, 80, 350, 500 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'elite', 'M', 18, 30, 80, 150, 500, 800 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

-- Cuádriceps derecho
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'bajo', 'M', 18, 30, 0, 40, 0, 200 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'medio', 'M', 18, 30, 40, 60, 200, 350 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'alto', 'M', 18, 30, 60, 80, 350, 500 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'elite', 'M', 18, 30, 80, 150, 500, 800 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

-- Glúteo Mayor - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'bajo', 'M', 18, 30, 0, 50, 0, 250 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'medio', 'M', 18, 30, 50, 80, 250, 400 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'alto', 'M', 18, 30, 80, 120, 400, 600 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'elite', 'M', 18, 30, 120, 200, 600, 1000 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

-- Glúteo Mayor derecho
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'bajo', 'M', 18, 30, 0, 50, 0, 250 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'medio', 'M', 18, 30, 50, 80, 250, 400 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'alto', 'M', 18, 30, 80, 120, 400, 600 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'elite', 'M', 18, 30, 120, 200, 600, 1000 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

-- Bíceps - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'bajo', 'M', 18, 30, 0, 15, 0, 75 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'medio', 'M', 18, 30, 15, 25, 75, 150 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'alto', 'M', 18, 30, 25, 35, 150, 250 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'elite', 'M', 18, 30, 35, 50, 250, 400 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

-- Tríceps - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'bajo', 'M', 18, 30, 0, 20, 0, 100 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'medio', 'M', 18, 30, 20, 30, 100, 180 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'alto', 'M', 18, 30, 30, 45, 180, 300 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT code, 'elite', 'M', 18, 30, 45, 60, 300, 500 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 7: CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_evaluations_athlete ON isometric_evaluations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_muscle ON isometric_evaluations(muscle_evaluated);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON isometric_evaluations(test_date);
CREATE INDEX IF NOT EXISTS idx_evaluations_side ON isometric_evaluations(side);
CREATE INDEX IF NOT EXISTS idx_comparisons_athlete ON bilateral_comparisons(athlete_id);
CREATE INDEX IF NOT EXISTS idx_muscle_region ON muscle_groups(region);
CREATE INDEX IF NOT EXISTS idx_muscle_code ON muscle_groups(code);
CREATE INDEX IF NOT EXISTS idx_normative_muscle ON normative_values(muscle_group_id);

-- ============================================
-- PASO 8: CREAR VISTAS
-- ============================================

CREATE OR REPLACE VIEW latest_evaluations AS
SELECT DISTINCT ON (e.athlete_id, e.muscle_evaluated)
  e.*,
  mg.name_es as muscle_name,
  mg.code as muscle_code,
  mg.region
FROM isometric_evaluations e
LEFT JOIN muscle_groups mg ON e.muscle_evaluated = mg.code
ORDER BY e.athlete_id, e.muscle_evaluated, e.test_date DESC;

CREATE OR REPLACE VIEW asymmetry_summary AS
SELECT 
  athlete_id,
  muscle_base,
  fmax_asymmetry,
  rfd_asymmetry,
  dominant_side,
  CASE 
    WHEN fmax_asymmetry < 10 THEN 'Normal'
    WHEN fmax_asymmetry < 15 THEN 'Moderada'
    ELSE 'Significativa'
  END as asymmetry_level,
  comparison_date
FROM bilateral_comparisons
ORDER BY fmax_asymmetry DESC;

-- ============================================
-- PASO 9: FUNCIONES
-- ============================================

CREATE OR REPLACE FUNCTION get_performance_level(
  p_muscle_code VARCHAR(50),
  p_fmax DECIMAL(10,2),
  p_gender VARCHAR(10) DEFAULT 'M',
  p_age INT DEFAULT 25
) RETURNS VARCHAR(20) AS $$
DECLARE
  v_level VARCHAR(20);
BEGIN
  SELECT nv.level INTO v_level
  FROM normative_values nv
  WHERE nv.muscle_group_id = p_muscle_code
    AND (nv.gender = p_gender OR nv.gender IS NULL)
    AND nv.age_min <= p_age
    AND nv.age_max >= p_age
    AND nv.fmax_min <= p_fmax
    AND nv.fmax_max >= p_fmax
  ORDER BY 
    CASE level
      WHEN 'elite' THEN 1
      WHEN 'alto' THEN 2
      WHEN 'medio' THEN 3
      WHEN 'bajo' THEN 4
    END
  LIMIT 1;
  
  RETURN COALESCE(v_level, 'sin clasificar');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 10: HABILITAR RLS
-- ============================================

ALTER TABLE isometric_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilateral_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias evaluaciones" ON isometric_evaluations;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias evaluaciones" ON isometric_evaluations;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias evaluaciones" ON isometric_evaluations;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias comparaciones" ON bilateral_comparisons;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias comparaciones" ON bilateral_comparisons;
DROP POLICY IF EXISTS "Todos pueden leer grupos musculares" ON muscle_groups;
DROP POLICY IF EXISTS "Todos pueden leer valores normativos" ON normative_values;

-- Crear políticas
CREATE POLICY "Usuarios pueden ver sus propias evaluaciones"
  ON isometric_evaluations FOR SELECT
  USING (true);  -- Cambiar a auth.uid() = athlete_id en producción

CREATE POLICY "Usuarios pueden insertar sus propias evaluaciones"
  ON isometric_evaluations FOR INSERT
  WITH CHECK (true);  -- Cambiar a auth.uid() = athlete_id en producción

CREATE POLICY "Usuarios pueden actualizar sus propias evaluaciones"
  ON isometric_evaluations FOR UPDATE
  USING (true);  -- Cambiar a auth.uid() = athlete_id en producción

CREATE POLICY "Usuarios pueden ver sus propias comparaciones"
  ON bilateral_comparisons FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden insertar sus propias comparaciones"
  ON bilateral_comparisons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Todos pueden leer grupos musculares"
  ON muscle_groups FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden leer valores normativos"
  ON normative_values FOR SELECT
  USING (true);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
