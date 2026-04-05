-- ============================================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- COPIA Y PEGA TODO ESTE SCRIPT
-- ============================================================================

-- 1. TABLA DE MÉTRICAS POR USUARIO
CREATE TABLE IF NOT EXISTS metricas_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_calculo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métricas físicas
    edad INT,
    peso_kg DECIMAL(5,2),
    altura_cm INT,
    imc DECIMAL(4,1),
    
    -- Métricas de fuerza
    rm_bench INT DEFAULT 0,
    rm_squat INT DEFAULT 0,
    rm_deadlift INT DEFAULT 0,
    rm_overhead INT DEFAULT 0,
    rm_row INT DEFAULT 0,
    rm_total INT DEFAULT 0,
    
    -- Métricas calculadas
    wilks_score DECIMAL(6,2),
    fuerza_relativa DECIMAL(5,2),
    
    -- Métricas cardio
    fc_max INT,
    fc_reposo INT,
    vdot DECIMAL(4,1),
    vdot_fecha TIMESTAMP WITH TIME ZONE,
    
    -- Actividad
    total_evaluaciones INT DEFAULT 0,
    nivel_experiencia VARCHAR(20),
    objetivo VARCHAR(50),
    disciplina VARCHAR(50),
    
    -- Rankings
    ranking_fuerza INT,
    ranking_vdot INT,
    ranking_wilks INT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE RANKINGS HISTÓRICOS
CREATE TABLE IF NOT EXISTS rankings_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_snapshot TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo_ranking VARCHAR(50) NOT NULL,
    posicion INT NOT NULL,
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_usuario VARCHAR(100),
    valor_metrica DECIMAL(10,2),
    valor_secundario DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE ESTADÍSTICAS GLOBALES
CREATE TABLE IF NOT EXISTS estadisticas_globales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_snapshot TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    total_usuarios INT DEFAULT 0,
    usuarios_activos INT DEFAULT 0,
    total_evaluaciones INT DEFAULT 0,
    
    avg_imc DECIMAL(4,1),
    avg_vdot DECIMAL(4,1),
    avg_rm_total INT,
    avg_edad INT,
    avg_fc_reposo INT,
    
    distribucion_objetivos JSONB DEFAULT '{}',
    distribucion_niveles JSONB DEFAULT '{}',
    distribucion_genero JSONB DEFAULT '{}',
    
    top_fuerza JSONB DEFAULT '[]',
    top_vdot JSONB DEFAULT '[]',
    top_wilks JSONB DEFAULT '[]',
    
    total_alertas INT DEFAULT 0,
    alertas_criticas INT DEFAULT 0,
    alertas_warning INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE ALERTAS DEL SISTEMA
CREATE TABLE IF NOT EXISTS alertas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_usuario VARCHAR(100),
    
    tipo_alerta VARCHAR(50) NOT NULL,
    severidad VARCHAR(20) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    
    leida BOOLEAN DEFAULT FALSE,
    resuelta BOOLEAN DEFAULT FALSE,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    notas_resolucion TEXT,
    
    valor_alerta DECIMAL(10,2),
    umbral DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE HISTORIAL DE PROGRESO
CREATE TABLE IF NOT EXISTS historial_progreso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    rm_total INT,
    cambio_rm_total INT,
    vdot DECIMAL(4,1),
    cambio_vdot DECIMAL(4,1),
    peso_kg DECIMAL(5,2),
    cambio_peso DECIMAL(5,2),
    imc DECIMAL(4,1),
    evaluaciones_completadas INT DEFAULT 0,
    notas TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_metricas_user ON metricas_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_metricas_fecha ON metricas_usuario(fecha_calculo);
CREATE INDEX IF NOT EXISTS idx_metricas_rm ON metricas_usuario(rm_total DESC);
CREATE INDEX IF NOT EXISTS idx_metricas_vdot ON metricas_usuario(vdot DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_rankings_fecha ON rankings_historico(fecha_snapshot);
CREATE INDEX IF NOT EXISTS idx_rankings_tipo ON rankings_historico(tipo_ranking);

CREATE INDEX IF NOT EXISTS idx_stats_fecha ON estadisticas_globales(fecha_snapshot DESC);

CREATE INDEX IF NOT EXISTS idx_alertas_user ON alertas_sistema(user_id);
CREATE INDEX IF NOT EXISTS idx_alertas_leida ON alertas_sistema(leida);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas_sistema(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_progreso_user ON historial_progreso(user_id);
CREATE INDEX IF NOT EXISTS idx_progreso_fecha ON historial_progreso(fecha_registro DESC);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE metricas_usuario IS 'Métricas calculadas por usuario';
COMMENT ON TABLE rankings_historico IS 'Rankings históricos';
COMMENT ON TABLE estadisticas_globales IS 'Estadísticas globales del sistema';
COMMENT ON TABLE alertas_sistema IS 'Alertas generadas automáticamente';
COMMENT ON TABLE historial_progreso IS 'Historial de progreso personal';

-- ============================================================================
-- ¡LISTO! Las tablas están creadas.
-- Ahora puedes ejecutar POST /api/admin/metrics para guardar las métricas
-- ============================================================================
