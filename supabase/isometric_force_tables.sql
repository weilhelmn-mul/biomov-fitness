-- ============================================
-- BIOMOV - TABLAS COMPLETAS PARA EVALUACIÓN DE FUERZA ISOMÉTRICA
-- ============================================
-- Ejecutar COMPLETO en el Editor SQL de Supabase
-- Base de datos: PostgreSQL (Supabase)
-- Última actualización: 2025
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
-- PASO 2: CREAR TABLAS PRINCIPALES
-- ============================================

-- Tabla: muscle_groups (Grupos musculares)
-- Usamos SERIAL (INTEGER) para compatibilidad
CREATE TABLE IF NOT EXISTS muscle_groups (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- ej: 'quads_l', 'pectoral_r'
  name_en VARCHAR(100) NOT NULL,           -- Nombre en inglés
  name_es VARCHAR(100) NOT NULL,           -- Nombre en español
  region region_type NOT NULL,             -- upper, lower, core
  side VARCHAR(10) NOT NULL,               -- left, right, center
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: isometric_evaluations (Evaluaciones isométricas principal)
CREATE TABLE IF NOT EXISTS isometric_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_name VARCHAR(200),
  
  -- Datos del test
  muscle_evaluated INT REFERENCES muscle_groups(id),
  side side_type NOT NULL,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unit force_unit DEFAULT 'kg',
  
  -- Métricas principales de fuerza
  fmax DECIMAL(10,2),                   -- Fuerza máxima (kgf o N)
  force_at_200ms DECIMAL(10,2),         -- Fuerza a los 200ms
  average_force DECIMAL(10,2),          -- Fuerza promedio
  test_duration DECIMAL(6,2),           -- Duración del test (segundos)
  
  -- Métricas de tiempo
  time_to_fmax DECIMAL(8,3),            -- Tiempo a Fmax (segundos)
  time_to_50fmax DECIMAL(8,3),          -- Tiempo a 50% Fmax
  time_to_90fmax DECIMAL(8,3),          -- Tiempo a 90% Fmax
  
  -- RFD (Rate of Force Development)
  rfd_max DECIMAL(10,2),                -- RFD máximo (kgf/s)
  rfd_50ms DECIMAL(10,2),               -- RFD 0-50ms
  rfd_100ms DECIMAL(10,2),              -- RFD 0-100ms
  rfd_150ms DECIMAL(10,2),              -- RFD 0-150ms
  rfd_200ms DECIMAL(10,2),              -- RFD 0-200ms
  
  -- Parámetros del modelo
  tau DECIMAL(8,4),                     -- Constante de tiempo τ
  force_modeled DECIMAL(10,2),          -- Fuerza máxima modelada
  
  -- Métricas de galgas (si aplica doble celda)
  galga1_max DECIMAL(10,2),
  galga2_max DECIMAL(10,2),
  galga1_avg DECIMAL(10,2),
  galga2_avg DECIMAL(10,2),
  
  -- Índices
  fatigue_index DECIMAL(5,2),           -- Índice de fatiga (%)
  symmetry_index DECIMAL(5,2),          -- Índice de simetría bilateral (%)
  
  -- Datos de configuración del Arduino
  sampling_rate INT DEFAULT 50,         -- Hz
  calibration_factor DECIMAL(12,2),
  
  -- Curva de fuerza (JSONB)
  force_curve JSONB,                    -- Array de {time, force}
  
  -- Metadatos
  device_info JSONB,                    -- Info del dispositivo/Arduino
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: bilateral_comparisons (Comparaciones bilaterales)
CREATE TABLE IF NOT EXISTS bilateral_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  muscle_base VARCHAR(50) NOT NULL,     -- Código base del músculo (ej: 'quads')
  left_eval_id UUID REFERENCES isometric_evaluations(id),
  right_eval_id UUID REFERENCES isometric_evaluations(id),
  
  -- Métricas de asimetría
  fmax_asymmetry DECIMAL(5,2),          -- % de asimetría en fuerza
  rfd_asymmetry DECIMAL(5,2),           -- % de asimetría en RFD
  dominant_side VARCHAR(10),            -- left, right, balanced
  
  -- Valores absolutos
  left_fmax DECIMAL(10,2),
  right_fmax DECIMAL(10,2),
  left_rfd DECIMAL(10,2),
  right_rfd DECIMAL(10,2),
  
  comparison_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: test_sessions (Sesiones de test)
CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_name VARCHAR(100),
  total_tests INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: normative_values (Valores normativos)
CREATE TABLE IF NOT EXISTS normative_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muscle_group_id INT REFERENCES muscle_groups(id),
  
  level VARCHAR(20) NOT NULL,           -- bajo, medio, alto, elite
  gender VARCHAR(10),                   -- M, F, ambos
  age_min INT,
  age_max INT,
  
  -- Rangos de fuerza
  fmax_min DECIMAL(10,2),
  fmax_max DECIMAL(10,2),
  
  -- Rangos de RFD
  rfd_200ms_min DECIMAL(10,2),
  rfd_200ms_max DECIMAL(10,2),
  
  unit force_unit DEFAULT 'kg',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 3: INSERTAR GRUPOS MUSCULARES
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
-- PASO 4: INSERTAR VALORES NORMATIVOS
-- ============================================

-- Cuádriceps - Hombres (usando subconsulta para obtener el ID)
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'bajo', 'M', 18, 30, 0, 40, 0, 200 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'medio', 'M', 18, 30, 40, 60, 200, 350 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'alto', 'M', 18, 30, 60, 80, 350, 500 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'elite', 'M', 18, 30, 80, 150, 500, 800 FROM muscle_groups WHERE code = 'quads_l'
ON CONFLICT DO NOTHING;

-- Cuádriceps derecho
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'bajo', 'M', 18, 30, 0, 40, 0, 200 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'medio', 'M', 18, 30, 40, 60, 200, 350 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'alto', 'M', 18, 30, 60, 80, 350, 500 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'elite', 'M', 18, 30, 80, 150, 500, 800 FROM muscle_groups WHERE code = 'quads_r'
ON CONFLICT DO NOTHING;

-- Glúteo Mayor - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'bajo', 'M', 18, 30, 0, 50, 0, 250 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'medio', 'M', 18, 30, 50, 80, 250, 400 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'alto', 'M', 18, 30, 80, 120, 400, 600 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'elite', 'M', 18, 30, 120, 200, 600, 1000 FROM muscle_groups WHERE code = 'glute_max_l'
ON CONFLICT DO NOTHING;

-- Glúteo Mayor derecho
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'bajo', 'M', 18, 30, 0, 50, 0, 250 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'medio', 'M', 18, 30, 50, 80, 250, 400 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'alto', 'M', 18, 30, 80, 120, 400, 600 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'elite', 'M', 18, 30, 120, 200, 600, 1000 FROM muscle_groups WHERE code = 'glute_max_r'
ON CONFLICT DO NOTHING;

-- Bíceps - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'bajo', 'M', 18, 30, 0, 15, 0, 75 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'medio', 'M', 18, 30, 15, 25, 75, 150 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'alto', 'M', 18, 30, 25, 35, 150, 250 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'elite', 'M', 18, 30, 35, 50, 250, 400 FROM muscle_groups WHERE code = 'biceps_l'
ON CONFLICT DO NOTHING;

-- Tríceps - Hombres
INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'bajo', 'M', 18, 30, 0, 20, 0, 100 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'medio', 'M', 18, 30, 20, 30, 100, 180 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'alto', 'M', 18, 30, 30, 45, 180, 300 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

INSERT INTO normative_values (muscle_group_id, level, gender, age_min, age_max, fmax_min, fmax_max, rfd_200ms_min, rfd_200ms_max)
SELECT id, 'elite', 'M', 18, 30, 45, 60, 300, 500 FROM muscle_groups WHERE code = 'triceps_l'
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 5: CREAR ÍNDICES
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
-- PASO 6: CREAR VISTAS
-- ============================================

-- Vista: Última evaluación por músculo y atleta
CREATE OR REPLACE VIEW latest_evaluations AS
SELECT DISTINCT ON (e.athlete_id, e.muscle_evaluated)
  e.*,
  mg.name_es as muscle_name,
  mg.code as muscle_code,
  mg.region
FROM isometric_evaluations e
JOIN muscle_groups mg ON e.muscle_evaluated = mg.id
ORDER BY e.athlete_id, e.muscle_evaluated, e.test_date DESC;

-- Vista: Resumen de asimetrías
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

-- Función para calcular nivel de rendimiento
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
  JOIN muscle_groups mg ON nv.muscle_group_id = mg.id
  WHERE mg.code = p_muscle_code
    AND (nv.gender = p_gender OR nv.gender IS NULL)
    AND nv.age_min <= p_age
    AND nv.age_max >= p_age
    AND nv.fmax_min <= p_fmax
    AND nv.fmax_max >= p_fmax
  ORDER BY 
    CASE nv.level
      WHEN 'elite' THEN 1
      WHEN 'alto' THEN 2
      WHEN 'medio' THEN 3
      WHEN 'bajo' THEN 4
    END
  LIMIT 1;
  
  RETURN COALESCE(v_level, 'sin clasificar');
END;
$$ LANGUAGE plpgsql;

-- Función para calcular automáticamente comparaciones bilaterales
CREATE OR REPLACE FUNCTION update_bilateral_comparison()
RETURNS TRIGGER AS $$
DECLARE
  v_base_code VARCHAR(50);
  v_left_id UUID;
  v_right_id UUID;
  v_left_fmax DECIMAL(10,2);
  v_right_fmax DECIMAL(10,2);
  v_left_rfd DECIMAL(10,2);
  v_right_rfd DECIMAL(10,2);
  v_fmax_asym DECIMAL(5,2);
  v_rfd_asym DECIMAL(5,2);
  v_dominant VARCHAR(10);
  v_left_code VARCHAR(50);
  v_right_code VARCHAR(50);
BEGIN
  -- Obtener código del músculo evaluado
  SELECT code INTO v_base_code FROM muscle_groups WHERE id = NEW.muscle_evaluated;
  
  -- Obtener ID base del músculo (sin _l o _r)
  v_base_code := REPLACE(v_base_code, '_l', '');
  v_base_code := REPLACE(v_base_code, '_r', '');
  
  v_left_code := v_base_code || '_l';
  v_right_code := v_base_code || '_r';
  
  -- Buscar evaluaciones de ambos lados
  SELECT e.id, e.fmax, e.rfd_max INTO v_left_id, v_left_fmax, v_left_rfd
  FROM isometric_evaluations e
  JOIN muscle_groups mg ON e.muscle_evaluated = mg.id
  WHERE e.athlete_id = NEW.athlete_id
    AND mg.code = v_left_code
  ORDER BY e.test_date DESC LIMIT 1;
  
  SELECT e.id, e.fmax, e.rfd_max INTO v_right_id, v_right_fmax, v_right_rfd
  FROM isometric_evaluations e
  JOIN muscle_groups mg ON e.muscle_evaluated = mg.id
  WHERE e.athlete_id = NEW.athlete_id
    AND mg.code = v_right_code
  ORDER BY e.test_date DESC LIMIT 1;
  
  -- Si hay ambos lados, calcular asimetría
  IF v_left_id IS NOT NULL AND v_right_id IS NOT NULL THEN
    v_fmax_asym := ABS((v_left_fmax - v_right_fmax) / NULLIF((v_left_fmax + v_right_fmax) / 2, 0)) * 100;
    v_rfd_asym := ABS((COALESCE(v_left_rfd,0) - COALESCE(v_right_rfd,0)) / 
                 NULLIF((COALESCE(v_left_rfd,0) + COALESCE(v_right_rfd,0)) / 2, 0)) * 100;
    
    IF v_left_fmax > v_right_fmax * 1.1 THEN
      v_dominant := 'left';
    ELSIF v_right_fmax > v_left_fmax * 1.1 THEN
      v_dominant := 'right';
    ELSE
      v_dominant := 'balanced';
    END IF;
    
    -- Insertar o actualizar comparación
    INSERT INTO bilateral_comparisons (
      athlete_id, muscle_base, left_eval_id, right_eval_id,
      fmax_asymmetry, rfd_asymmetry, dominant_side,
      left_fmax, right_fmax, left_rfd, right_rfd
    ) VALUES (
      NEW.athlete_id, v_base_code, v_left_id, v_right_id,
      v_fmax_asym, COALESCE(v_rfd_asym, 0), v_dominant,
      v_left_fmax, v_right_fmax, v_left_rfd, v_right_rfd
    )
    ON CONFLICT (id) DO UPDATE SET
      fmax_asymmetry = v_fmax_asym,
      rfd_asymmetry = COALESCE(v_rfd_asym, 0),
      dominant_side = v_dominant,
      left_fmax = v_left_fmax,
      right_fmax = v_right_fmax,
      left_rfd = v_left_rfd,
      right_rfd = v_right_rfd,
      comparison_date = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar comparaciones automáticamente
DROP TRIGGER IF EXISTS trigger_update_bilateral ON isometric_evaluations;
CREATE TRIGGER trigger_update_bilateral
AFTER INSERT OR UPDATE ON isometric_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_bilateral_comparison();

-- ============================================
-- PASO 8: HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE isometric_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilateral_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias evaluaciones" ON isometric_evaluations;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias evaluaciones" ON isometric_evaluations;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias evaluaciones" ON isometric_evaluations;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias comparaciones" ON bilateral_comparisons;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias comparaciones" ON bilateral_comparisons;
DROP POLICY IF EXISTS "Todos pueden leer grupos musculares" ON muscle_groups;
DROP POLICY IF EXISTS "Todos pueden leer valores normativos" ON normative_values;

-- Políticas para isometric_evaluations
CREATE POLICY "Usuarios pueden ver sus propias evaluaciones"
  ON isometric_evaluations FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Usuarios pueden insertar sus propias evaluaciones"
  ON isometric_evaluations FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Usuarios pueden actualizar sus propias evaluaciones"
  ON isometric_evaluations FOR UPDATE
  USING (auth.uid() = athlete_id);

-- Políticas para bilateral_comparisons
CREATE POLICY "Usuarios pueden ver sus propias comparaciones"
  ON bilateral_comparisons FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Usuarios pueden insertar sus propias comparaciones"
  ON bilateral_comparisons FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

-- Políticas para muscle_groups (lectura pública)
CREATE POLICY "Todos pueden leer grupos musculares"
  ON muscle_groups FOR SELECT
  USING (true);

-- Políticas para normative_values (lectura pública)
CREATE POLICY "Todos pueden leer valores normativos"
  ON normative_values FOR SELECT
  USING (true);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
