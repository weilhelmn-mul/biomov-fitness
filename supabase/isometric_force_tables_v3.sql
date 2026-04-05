-- ============================================
-- BIOMOV - TABLAS COMPLETAS PARA EVALUACIÓN DE FUERZA ISOMÉTRICA
-- ============================================
-- VERSIÓN 3 - Detecta estructura existente
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

-- ============================================
-- PASO 2: CREAR TABLAS PRINCIPALES (si no existen)
-- ============================================

-- Tabla: isometric_evaluations
CREATE TABLE IF NOT EXISTS isometric_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID,
  athlete_name VARCHAR(200),
  
  muscle_evaluated VARCHAR(50),
  side side_type NOT NULL,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unit force_unit DEFAULT 'kg',
  
  fmax DECIMAL(10,2),
  force_at_200ms DECIMAL(10,2),
  average_force DECIMAL(10,2),
  test_duration DECIMAL(6,2),
  
  time_to_fmax DECIMAL(8,3),
  time_to_50fmax DECIMAL(8,3),
  time_to_90fmax DECIMAL(8,3),
  
  rfd_max DECIMAL(10,2),
  rfd_50ms DECIMAL(10,2),
  rfd_100ms DECIMAL(10,2),
  rfd_150ms DECIMAL(10,2),
  rfd_200ms DECIMAL(10,2),
  
  tau DECIMAL(8,4),
  force_modeled DECIMAL(10,2),
  
  galga1_max DECIMAL(10,2),
  galga2_max DECIMAL(10,2),
  galga1_avg DECIMAL(10,2),
  galga2_avg DECIMAL(10,2),
  
  fatigue_index DECIMAL(5,2),
  symmetry_index DECIMAL(5,2),
  
  sampling_rate INT DEFAULT 50,
  calibration_factor DECIMAL(12,2),
  
  force_curve JSONB,
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
  muscle_group_id VARCHAR(50),
  
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
-- PASO 3: VERIFICAR Y AGREGAR COLUMNA 'code' A muscle_groups
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

-- ============================================
-- PASO 4: INSERTAR VALORES NORMATIVOS DIRECTOS
-- ============================================

-- Insertar valores normativos usando códigos directamente
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max) VALUES
-- Cuádriceps izquierdo
('quads_l', 'bajo', 'M', 18, 30, 0, 40, 0, 200),
('quads_l', 'medio', 'M', 18, 30, 40, 60, 200, 350),
('quads_l', 'alto', 'M', 18, 30, 60, 80, 350, 500),
('quads_l', 'elite', 'M', 18, 30, 80, 150, 500, 800),
-- Cuádriceps derecho
('quads_r', 'bajo', 'M', 18, 30, 0, 40, 0, 200),
('quads_r', 'medio', 'M', 18, 30, 40, 60, 200, 350),
('quads_r', 'alto', 'M', 18, 30, 60, 80, 350, 500),
('quads_r', 'elite', 'M', 18, 30, 80, 150, 500, 800),
-- Glúteo izquierdo
('glute_max_l', 'bajo', 'M', 18, 30, 0, 50, 0, 250),
('glute_max_l', 'medio', 'M', 18, 30, 50, 80, 250, 400),
('glute_max_l', 'alto', 'M', 18, 30, 80, 120, 400, 600),
('glute_max_l', 'elite', 'M', 18, 30, 120, 200, 600, 1000),
-- Glúteo derecho
('glute_max_r', 'bajo', 'M', 18, 30, 0, 50, 0, 250),
('glute_max_r', 'medio', 'M', 18, 30, 50, 80, 250, 400),
('glute_max_r', 'alto', 'M', 18, 30, 80, 120, 400, 600),
('glute_max_r', 'elite', 'M', 18, 30, 120, 200, 600, 1000),
-- Bíceps
('biceps_l', 'bajo', 'M', 18, 30, 0, 15, 0, 75),
('biceps_l', 'medio', 'M', 18, 30, 15, 25, 75, 150),
('biceps_l', 'alto', 'M', 18, 30, 25, 35, 150, 250),
('biceps_l', 'elite', 'M', 18, 30, 35, 50, 250, 400),
-- Tríceps
('triceps_l', 'bajo', 'M', 18, 30, 0, 20, 0, 100),
('triceps_l', 'medio', 'M', 18, 30, 20, 30, 100, 180),
('triceps_l', 'alto', 'M', 18, 30, 30, 45, 180, 300),
('triceps_l', 'elite', 'M', 18, 30, 45, 60, 300, 500)
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 5: CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_evaluations_athlete ON isometric_evaluations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_muscle ON isometric_evaluations(muscle_evaluated);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON isometric_evaluations(test_date);
CREATE INDEX IF NOT EXISTS idx_evaluations_side ON isometric_evaluations(side);
CREATE INDEX IF NOT EXISTS idx_comparisons_athlete ON bilateral_comparisons(athlete_id);
CREATE INDEX IF NOT EXISTS idx_normative_muscle ON normative_values(muscle_group_id);

-- ============================================
-- PASO 6: CREAR VISTAS
-- ============================================

CREATE OR REPLACE VIEW latest_evaluations AS
SELECT DISTINCT ON (e.athlete_id, e.muscle_evaluated)
  e.*,
  e.muscle_evaluated as muscle_code
FROM isometric_evaluations e
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
-- PASO 7: FUNCIONES
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
-- PASO 8: HABILITAR RLS
-- ============================================

-- Deshabilitar RLS primero para evitar problemas
ALTER TABLE isometric_evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE bilateral_comparisons DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS
ALTER TABLE isometric_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilateral_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('isometric_evaluations', 'bilateral_comparisons', 'test_sessions', 'muscle_groups', 'normative_values')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "permitir_todo_select" ON isometric_evaluations FOR SELECT USING (true);
CREATE POLICY "permitir_todo_insert" ON isometric_evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "permitir_todo_update" ON isometric_evaluations FOR UPDATE USING (true);
CREATE POLICY "permitir_todo_delete" ON isometric_evaluations FOR DELETE USING (true);

CREATE POLICY "permitir_comparaciones_select" ON bilateral_comparisons FOR SELECT USING (true);
CREATE POLICY "permitir_comparaciones_insert" ON bilateral_comparisons FOR INSERT WITH CHECK (true);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
