-- ============================================
-- TABLAS PARA EVALUACIÓN ISOMÉTRICA - BIOMOV
-- ============================================
-- Ejecutar COMPLETO en el Editor SQL de Supabase
-- Base de datos: PostgreSQL (Supabase)

-- ============================================
-- PASO 1: CREAR TABLAS
-- ============================================

-- Tabla: muscle_groups
CREATE TABLE IF NOT EXISTS muscle_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_short VARCHAR(50),
  region VARCHAR(50),
  subgroup VARCHAR(50),
  function VARCHAR(100),
  exercises TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: isometric_tests
CREATE TABLE IF NOT EXISTS isometric_tests (
  id SERIAL PRIMARY KEY,
  muscle_group_id INT REFERENCES muscle_groups(id) ON DELETE CASCADE,
  test_name VARCHAR(100) NOT NULL,
  position TEXT,
  joint_angle VARCHAR(50),
  equipment VARCHAR(100),
  metric VARCHAR(50),
  bilateral BOOLEAN DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: test_results (usa auth.users de Supabase)
CREATE TABLE IF NOT EXISTS test_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id INT REFERENCES isometric_tests(id) ON DELETE CASCADE,
  side VARCHAR(10),
  value FLOAT NOT NULL,
  unit VARCHAR(20),
  rfd FLOAT,
  duration_ms INT,
  peak_time_ms INT,
  avg_force FLOAT,
  fatigue_index FLOAT,
  force_index FLOAT,
  hr_avg INT,
  hr_peak INT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  raw_data JSONB
);

-- Tabla: normative_values
CREATE TABLE IF NOT EXISTS normative_values (
  id SERIAL PRIMARY KEY,
  muscle_group_id INT REFERENCES muscle_groups(id) ON DELETE CASCADE,
  test_id INT REFERENCES isometric_tests(id) ON DELETE CASCADE,
  level VARCHAR(50),
  gender VARCHAR(10),
  age_min INT,
  age_max INT,
  min_value FLOAT,
  max_value FLOAT,
  unit VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 2: INSERTAR DATOS DE MÚSCULOS
-- ============================================

-- TREN SUPERIOR - Pecho
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Pectoral Mayor', 'Pectoral', 'superior', 'pecho', 'empuje', ARRAY['Press Banca', 'Press Inclinado', 'Fondos', 'Aperturas']);

-- TREN SUPERIOR - Espalda
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Dorsal Ancho', 'Dorsal', 'superior', 'espalda', 'tracción', ARRAY['Dominadas', 'Jalón al Pecho', 'Remo', 'Pullover']),
('Trapecio Medio/Inferior', 'Trapecio', 'superior', 'espalda', 'estabilidad', ARRAY['Encogimientos', 'Remo al Mentón', 'Face Pull', 'Y-T-W-L']);

-- TREN SUPERIOR - Hombros
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Deltoide Anterior', 'D. Anterior', 'superior', 'hombros', 'empuje', ARRAY['Press Militar', 'Elevaciones Frontales', 'Press Arnold']),
('Deltoide Medio', 'D. Medio', 'superior', 'hombros', 'abducción', ARRAY['Elevaciones Laterales', 'Press Arnold', 'Pájaros']),
('Deltoide Posterior', 'D. Posterior', 'superior', 'hombros', 'tracción', ARRAY['Pájaros', 'Face Pull', 'Reverse Fly', 'Remo al cuello']);

-- TREN SUPERIOR - Brazos
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Bíceps Braquial', 'Bíceps', 'superior', 'brazos', 'tracción', ARRAY['Curl Barra', 'Curl Mancuernas', 'Curl Martillo', 'Curl Concentrado']),
('Tríceps Braquial', 'Tríceps', 'superior', 'brazos', 'empuje', ARRAY['Press Francés', 'Extensiones', 'Fondos', 'Patada de Tríceps']);

-- CORE
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Recto Abdominal', 'Abdominal', 'core', 'core', 'estabilidad', ARRAY['Crunch', 'Plancha', 'Elevación Piernas', 'Roll-out']),
('Oblicuos', 'Oblicuos', 'core', 'core', 'rotación', ARRAY['Russian Twist', 'Crunch Oblicuo', 'Pallof Press', 'Woodchop']),
('Erectores Espinales', 'Lumbar', 'core', 'core', 'extensión', ARRAY['Hiperextensiones', 'Peso Muerto', 'Good Morning', 'Bird Dog']);

-- TREN INFERIOR - Cadera
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Glúteo Mayor', 'Glúteo Mayor', 'inferior', 'cadera', 'extensión cadera', ARRAY['Hip Thrust', 'Sentadilla', 'Peso Muerto', 'Step Up']),
('Glúteo Medio', 'Glúteo Medio', 'inferior', 'cadera', 'abducción cadera', ARRAY['Abducciones', 'Clamshell', 'Monster Walk', 'Band Walk']);

-- TREN INFERIOR - Muslo
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Cuádriceps', 'Cuádriceps', 'inferior', 'muslo', 'extensión rodilla', ARRAY['Sentadilla', 'Prensa', 'Extensiones', 'Zancadas', 'Step Up']),
('Isquiotibiales', 'Isquios', 'inferior', 'muslo', 'flexión rodilla', ARRAY['Curl Femoral', 'Nordic Curl', 'Peso Muerto Rumano', 'Good Morning']),
('Aductores', 'Aductores', 'inferior', 'muslo', 'aducción cadera', ARRAY['Sentadilla Sumo', 'Aducciones', 'Copenhague', 'Side Lunge']);

-- TREN INFERIOR - Pierna
INSERT INTO muscle_groups (name, name_short, region, subgroup, function, exercises) VALUES
('Gastrocnemio', 'Gemelo', 'inferior', 'pierna', 'flexión plantar', ARRAY['Elevación Talones', 'Prensa Gemelos', 'Saltos', 'Escalones']),
('Sóleo', 'Sóleo', 'inferior', 'pierna', 'flexión plantar', ARRAY['Elevación Sentado', 'Prensa Gemelos']),
('Tibial Anterior', 'Tibial', 'inferior', 'pierna', 'dorsiflexión', ARRAY['Dorsiflexión', 'Caminar Talones', 'Toe Tap']);

-- ============================================
-- PASO 3: INSERTAR TESTS ISOMÉTRICOS
-- ============================================

-- Cuádriceps
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Cuádriceps'), 'Extensión de Rodilla Isométrica', 'Sentado, rodilla a 90°', '90°', 'Dinamómetro / HX711', 'kg', true, 'Sentado en silla con rodilla flexionada 90°. Empujar contra el sensor fijado al tobillo. Mantener 3-5 segundos.');

-- Glúteo Mayor
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Glúteo Mayor'), 'Hip Thrust Isométrico', 'Supino, cadera extendida', '0° cadera', 'Celda de carga', 'kg', true, 'Espalda apoyada en banco, pies en suelo. Elevar cadera y empujar contra carga. Mantener 3-5 segundos.');

-- Bíceps
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Bíceps'), 'Flexión de Codo Isométrica', 'Codo a 90°', '90°', 'Dinamómetro', 'kg', true, 'Brazo pegado al cuerpo, codo a 90°. Empujar contra sensor fijado a la muñeca. Mantener 3-5 segundos.');

-- Tríceps
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Tríceps'), 'Extensión de Codo Isométrica', 'Codo a 90°', '90°', 'Dinamómetro', 'kg', true, 'Brazo pegado al cuerpo, codo a 90°. Empujar hacia extensión contra sensor. Mantener 3-5 segundos.');

-- Deltoides Anterior
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'D. Anterior'), 'Flexión de Hombro Isométrica', 'Hombro a 90° flexión', '90°', 'Dinamómetro', 'kg', true, 'Brazo extendido al frente a 90°. Empujar contra sensor. Mantener 3-5 segundos.');

-- Deltoides Medio
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'D. Medio'), 'Abducción de Hombro Isométrica', 'Hombro a 30° abducción', '30°', 'Dinamómetro', 'kg', true, 'Brazo extendido lateralmente. Empujar contra sensor. Mantener 3-5 segundos.');

-- Deltoides Posterior
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'D. Posterior'), 'Extensión de Hombro Isométrica', 'Hombro a 90° extensión', '90°', 'Dinamómetro', 'kg', true, 'Inclinado hacia adelante, brazo extendido atrás. Empujar contra sensor. Mantener 3-5 segundos.');

-- Pectoral
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Pectoral'), 'Aducción de Hombro Isométrica', 'Hombro a 90° abducción', '90°', 'Dinamómetro', 'kg', true, 'Brazo extendido lateralmente. Empujar hacia adentro contra sensor. Mantener 3-5 segundos.');

-- Dorsal
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Dorsal'), 'Extensión de Hombro Isométrica', 'Hombro a 45° flexión', '45°', 'Dinamómetro', 'kg', true, 'Brazo extendido al frente-abajo. Tirar hacia atrás contra sensor. Mantener 3-5 segundos.');

-- Trapecio
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Trapecio'), 'Elevación de Escápula Isométrica', 'De pie', 'N/A', 'Dinamómetro', 'kg', true, 'Hombros relajados. Encoger hacia las orejas contra resistencia. Mantener 3-5 segundos.');

-- Abdominal
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Abdominal'), 'Plancha Isométrica', 'Prono sobre antebrazos', 'N/A', 'Cronómetro', 'segundos', false, 'Mantener posición de plancha el máximo tiempo posible. Registrar tiempo hasta fallo.');

-- Oblicuos
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Oblicuos'), 'Plancha Lateral Isométrica', 'Apoyo lateral sobre antebrazo', 'N/A', 'Cronómetro', 'segundos', true, 'Mantener plancha lateral el máximo tiempo posible. Evaluar ambos lados.');

-- Lumbar
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Lumbar'), 'Extensión de Tronco Isométrica', 'Prono, tronco elevado', '0°', 'Dinamómetro', 'kg', false, 'Acostado boca abajo. Elevar tronco y mantener contra resistencia. 3-5 segundos.');

-- Glúteo Medio
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Glúteo Medio'), 'Abducción de Cadera Isométrica', 'Decúbito lateral', '0-15°', 'Dinamómetro', 'kg', true, 'Acostado de lado. Elevar pierna contra resistencia. Mantener 3-5 segundos.');

-- Isquiotibiales
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Isquios'), 'Flexión de Rodilla Isométrica', 'Decúbito prono, rodilla a 90°', '90°', 'Dinamómetro', 'kg', true, 'Acostado boca abajo. Flexionar rodilla contra resistencia. Mantener 3-5 segundos.');

-- Aductores
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Aductores'), 'Aducción de Cadera Isométrica', 'Decúbito supino', '0°', 'Dinamómetro', 'kg', true, 'Acostado boca arriba. Aproximar pierna hacia línea media contra resistencia. Mantener 3-5 segundos.');

-- Gemelo
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Gemelo'), 'Elevación de Talones Isométrica', 'De pie, talones elevados', 'N/A', 'Plataforma de fuerza', 'kg', true, 'De pie sobre plataforma. Elevar talones y mantener contra carga. 3-5 segundos.');

-- Sóleo
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Sóleo'), 'Flexión Plantar Isométrica (Sentado)', 'Sentado, rodilla a 90°', '90° rodilla', 'Plataforma de fuerza', 'kg', true, 'Sentado con rodillas a 90°. Empujar planta del pie contra plataforma. Mantener 3-5 segundos.');

-- Tibial
INSERT INTO isometric_tests (muscle_group_id, test_name, position, joint_angle, equipment, metric, bilateral, instructions) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Tibial'), 'Dorsiflexión Isométrica', 'Sentado', '0° tobillo', 'Dinamómetro', 'kg', true, 'Sentado. Elevar pie hacia espinilla contra resistencia. Mantener 3-5 segundos.');

-- ============================================
-- PASO 4: INSERTAR VALORES NORMATIVOS
-- ============================================

-- Valores normativos para Cuádriceps (hombres 18-30 años)
INSERT INTO normative_values (muscle_group_id, test_id, level, gender, age_min, age_max, min_value, max_value, unit) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Cuádriceps'), (SELECT id FROM isometric_tests WHERE test_name = 'Extensión de Rodilla Isométrica'), 'bajo', 'M', 18, 30, 0, 30, 'kg'),
((SELECT id FROM muscle_groups WHERE name_short = 'Cuádriceps'), (SELECT id FROM isometric_tests WHERE test_name = 'Extensión de Rodilla Isométrica'), 'medio', 'M', 18, 30, 30, 45, 'kg'),
((SELECT id FROM muscle_groups WHERE name_short = 'Cuádriceps'), (SELECT id FROM isometric_tests WHERE test_name = 'Extensión de Rodilla Isométrica'), 'alto', 'M', 18, 30, 45, 60, 'kg'),
((SELECT id FROM muscle_groups WHERE name_short = 'Cuádriceps'), (SELECT id FROM isometric_tests WHERE test_name = 'Extensión de Rodilla Isométrica'), 'elite', 'M', 18, 30, 60, 100, 'kg');

-- Valores normativos para Glúteo Mayor (hombres 18-30 años)
INSERT INTO normative_values (muscle_group_id, test_id, level, gender, age_min, age_max, min_value, max_value, unit) VALUES
((SELECT id FROM muscle_groups WHERE name_short = 'Glúteo Mayor'), (SELECT id FROM isometric_tests WHERE test_name = 'Hip Thrust Isométrico'), 'bajo', 'M', 18, 30, 0, 40, 'kg'),
((SELECT id FROM muscle_groups WHERE name_short = 'Glúteo Mayor'), (SELECT id FROM isometric_tests WHERE test_name = 'Hip Thrust Isométrico'), 'medio', 'M', 18, 30, 40, 60, 'kg'),
((SELECT id FROM muscle_groups WHERE name_short = 'Glúteo Mayor'), (SELECT id FROM isometric_tests WHERE test_name = 'Hip Thrust Isométrico'), 'alto', 'M', 18, 30, 60, 80, 'kg'),
((SELECT id FROM muscle_groups WHERE name_short = 'Glúteo Mayor'), (SELECT id FROM isometric_tests WHERE test_name = 'Hip Thrust Isométrico'), 'elite', 'M', 18, 30, 80, 150, 'kg');

-- ============================================
-- PASO 5: CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_date ON test_results(date);
CREATE INDEX IF NOT EXISTS idx_test_results_test ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_muscle_groups_region ON muscle_groups(region);
CREATE INDEX IF NOT EXISTS idx_muscle_groups_subgroup ON muscle_groups(subgroup);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
