-- ============================================================================
-- TABLAS DE MÉTRICAS PARA BIOMOV FITNESS
-- Ejecutar este script en el editor SQL de Supabase
-- ============================================================================

-- ============================================================================
-- 1. MÉTRICAS POR USUARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS metricas_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Datos básicos del momento
    fecha_calculo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métricas físicas
    edad INT,
    peso_kg DECIMAL(5,2),
    altura_cm INT,
    imc DECIMAL(4,1),
    
    -- Métricas de fuerza (1RM)
    rm_bench INT DEFAULT 0,
    rm_squat INT DEFAULT 0,
    rm_deadlift INT DEFAULT 0,
    rm_overhead INT DEFAULT 0,
    rm_row INT DEFAULT 0,
    rm_total INT DEFAULT 0,
    
    -- Métricas calculadas
    wilks_score DECIMAL(6,2),
    fuerza_relativa DECIMAL(5,2),
    
    -- Métricas cardiovasculares
    fc_max INT,
    fc_reposo INT,
    vdot DECIMAL(4,1),
    vdot_fecha TIMESTAMP WITH TIME ZONE,
    
    -- Métricas de actividad
    total_evaluaciones INT DEFAULT 0,
    nivel_experiencia VARCHAR(20),
    objetivo VARCHAR(50),
    disciplina VARCHAR(50),
    
    -- Ranking position (para snapshots)
    ranking_fuerza INT,
    ranking_vdot INT,
    ranking_wilks INT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, fecha_calculo)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_metricas_usuario_user ON metricas_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_metricas_usuario_fecha ON metricas_usuario(fecha_calculo);
CREATE INDEX IF NOT EXISTS idx_metricas_usuario_rm_total ON metricas_usuario(rm_total DESC);
CREATE INDEX IF NOT EXISTS idx_metricas_usuario_vdot ON metricas_usuario(vdot DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_metricas_usuario_wilks ON metricas_usuario(wilks_score DESC NULLS LAST);

-- ============================================================================
-- 2. RANKINGS HISTÓRICOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rankings_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_snapshot TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo_ranking VARCHAR(50) NOT NULL, -- 'fuerza', 'vdot', 'wilks', 'bench', 'squat', 'deadlift', 'evaluaciones', 'fc_reposo'
    
    posicion INT NOT NULL,
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_usuario VARCHAR(100),
    valor_metrica DECIMAL(10,2),
    valor_secundario DECIMAL(10,2), -- Para datos adicionales como peso
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rankings_fecha ON rankings_historico(fecha_snapshot);
CREATE INDEX IF NOT EXISTS idx_rankings_tipo ON rankings_historico(tipo_ranking, fecha_snapshot);
CREATE INDEX IF NOT EXISTS idx_rankings_user ON rankings_historico(user_id);

-- ============================================================================
-- 3. ESTADÍSTICAS GLOBALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS estadisticas_globales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_snapshot TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Conteos
    total_usuarios INT DEFAULT 0,
    usuarios_activos INT DEFAULT 0,
    total_evaluaciones INT DEFAULT 0,
    
    -- Promedios
    avg_imc DECIMAL(4,1),
    avg_vdot DECIMAL(4,1),
    avg_rm_total INT,
    avg_edad INT,
    avg_fc_reposo INT,
    
    -- Distribuciones (JSON)
    distribucion_objetivos JSONB DEFAULT '{}',
    distribucion_niveles JSONB DEFAULT '{}',
    distribucion_genero JSONB DEFAULT '{}',
    
    -- Top performers (JSON)
    top_fuerza JSONB DEFAULT '[]',
    top_vdot JSONB DEFAULT '[]',
    top_wilks JSONB DEFAULT '[]',
    
    -- Alertas generadas
    total_alertas INT DEFAULT 0,
    alertas_criticas INT DEFAULT 0,
    alertas_warning INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estadisticas_fecha ON estadisticas_globales(fecha_snapshot DESC);

-- ============================================================================
-- 4. ALERTAS DEL SISTEMA
-- ============================================================================
CREATE TABLE IF NOT EXISTS alertas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_usuario VARCHAR(100),
    
    tipo_alerta VARCHAR(50) NOT NULL, -- 'salud', 'evaluacion', 'rendimiento', 'sistema'
    severidad VARCHAR(20) NOT NULL, -- 'critical', 'warning', 'info'
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    
    -- Estado
    leida BOOLEAN DEFAULT FALSE,
    resuelta BOOLEAN DEFAULT FALSE,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    notas_resolucion TEXT,
    
    -- Metadatos
    valor_alerta DECIMAL(10,2), -- El valor que disparó la alerta
    umbral DECIMAL(10,2), -- El umbral configurado
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_user ON alertas_sistema(user_id);
CREATE INDEX IF NOT EXISTS idx_alertas_severidad ON alertas_sistema(severidad, leida);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas_sistema(created_at DESC);

-- ============================================================================
-- 5. HISTORIAL DE PROGRESO DE USUARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS historial_progreso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métricas de fuerza
    rm_total INT,
    cambio_rm_total INT, -- Diferencia con registro anterior
    
    -- Métricas cardio
    vdot DECIMAL(4,1),
    cambio_vdot DECIMAL(4,1),
    
    -- Métricas físicas
    peso_kg DECIMAL(5,2),
    cambio_peso DECIMAL(5,2),
    imc DECIMAL(4,1),
    
    -- Métricas de rendimiento
    evaluaciones_completadas INT DEFAULT 0,
    
    notas TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_user ON historial_progreso(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_progreso(fecha_registro DESC);

-- ============================================================================
-- 6. VISTA DE RANKINGS ACTUALES
-- ============================================================================
CREATE OR REPLACE VIEW vista_rankings_actuales AS
SELECT 
    user_id,
    nombre_usuario,
    rm_total,
    vdot,
    wilks_score,
    ranking_fuerza,
    ranking_vdot,
    ranking_wilks,
    fecha_calculo
FROM metricas_usuario m
WHERE fecha_calculo = (
    SELECT MAX(fecha_calculo) FROM metricas_usuario
)
ORDER BY rm_total DESC;

-- ============================================================================
-- 7. FUNCIÓN PARA CALCULAR WILKS SCORE
-- ============================================================================
CREATE OR REPLACE FUNCTION calcular_wilks(
    p_peso DECIMAL(5,2),
    p_rm_total INT,
    p_genero VARCHAR(20)
) RETURNS DECIMAL(6,2) AS $$
DECLARE
    v_coef DECIMAL(5,4);
    v_wilks DECIMAL(6,2);
BEGIN
    -- Coeficientes simplificados de Wilks
    IF p_genero = 'masculino' THEN
        v_coef := 0.68;
    ELSE
        v_coef := 0.78;
    END IF;
    
    IF p_peso > 0 AND p_rm_total > 0 THEN
        v_wilks := (p_rm_total * v_coef / p_peso)::DECIMAL(6,2);
    ELSE
        v_wilks := NULL;
    END IF;
    
    RETURN v_wilks;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_metricas_usuario_updated_at
    BEFORE UPDATE ON metricas_usuario
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alertas_sistema_updated_at
    BEFORE UPDATE ON alertas_sistema
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTARIOS EN LAS TABLAS
-- ============================================================================
COMMENT ON TABLE metricas_usuario IS 'Métricas calculadas por usuario con snapshots históricos';
COMMENT ON TABLE rankings_historico IS 'Rankings históricos para análisis de tendencias';
COMMENT ON TABLE estadisticas_globales IS 'Snapshots de estadísticas globales del sistema';
COMMENT ON TABLE alertas_sistema IS 'Alertas generadas automáticamente por el sistema';
COMMENT ON TABLE historial_progreso IS 'Historial de progreso personal de cada usuario';
