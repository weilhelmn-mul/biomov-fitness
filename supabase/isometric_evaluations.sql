-- ============================================================================
-- TABLA: isometric_evaluations
-- Descripción: Almacena las evaluaciones de fuerza isométrica
-- Base de datos: Supabase (PostgreSQL)
-- ============================================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS isometric_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    musculos_data JSONB,
    indice_global INTEGER DEFAULT 0,
    tren_superior INTEGER DEFAULT 0,
    core INTEGER DEFAULT 0,
    tren_inferior INTEGER DEFAULT 0,
    simetria_general INTEGER DEFAULT 0,
    desequilibrios JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_isometric_evaluations_user_id 
ON isometric_evaluations(user_id);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_isometric_evaluations_created_at 
ON isometric_evaluations(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE isometric_evaluations ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias evaluaciones
CREATE POLICY "Users can view their own evaluations" 
ON isometric_evaluations 
FOR SELECT 
USING (auth.uid()::text = user_id OR user_id LIKE 'demo-%');

-- Política: Los usuarios pueden insertar sus propias evaluaciones
CREATE POLICY "Users can insert their own evaluations" 
ON isometric_evaluations 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'demo-%');

-- Política: Los admins pueden ver todas las evaluaciones
CREATE POLICY "Admins can view all evaluations" 
ON isometric_evaluations 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- Comentarios
COMMENT ON TABLE isometric_evaluations IS 'Evaluaciones de fuerza isométrica de usuarios';
COMMENT ON COLUMN isometric_evaluations.user_id IS 'ID del usuario (de auth.users o demo-user)';
COMMENT ON COLUMN isometric_evaluations.musculos_data IS 'JSON con datos de fuerza por músculo: {id, nombre, fuerza: {R, L}}';
COMMENT ON COLUMN isometric_evaluations.indice_global IS 'Índice global de fuerza isométrica (0-100)';
COMMENT ON COLUMN isometric_evaluations.tren_superior IS 'Puntuación del tren superior (0-100)';
COMMENT ON COLUMN isometric_evaluations.core IS 'Puntuación del core (0-100)';
COMMENT ON COLUMN isometric_evaluations.tren_inferior IS 'Puntuación del tren inferior (0-100)';
COMMENT ON COLUMN isometric_evaluations.simetria_general IS 'Porcentaje de simetría general (0-100)';
COMMENT ON COLUMN isometric_evaluations.desequilibrios IS 'Array de desequilibrios detectados';

-- ============================================================================
-- EJEMPLO DE DATOS INSERTADOS
-- ============================================================================

/*
INSERT INTO isometric_evaluations (
    user_id,
    musculos_data,
    indice_global,
    tren_superior,
    core,
    tren_inferior,
    simetria_general,
    desequilibrios
) VALUES (
    'demo-user-001',
    '[
        {"id": "pectoral_mayor", "nombre": "Pectoral Mayor", "fuerza": {"R": 74, "L": 98}},
        {"id": "dorsal_ancho", "nombre": "Dorsal Ancho", "fuerza": {"R": 90, "L": 92}},
        {"id": "biceps_braquial", "nombre": "Bíceps Braquial", "fuerza": {"R": 77, "L": 69}}
    ]'::jsonb,
    77,
    72,
    65,
    80,
    84,
    '[
        {
            "musculoId": "pectoral_mayor",
            "musculoNombre": "Pectoral Mayor",
            "ladoDominante": "L",
            "diferenciaPorcentaje": 24.3,
            "clasificacion": "riesgo",
            "recomendacion": "Fortalecer lado derecho"
        }
    ]'::jsonb
);
*/
