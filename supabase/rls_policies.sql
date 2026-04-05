-- ============================================================================
-- POLÍTICAS RLS PARA TABLAS DE MÉTRICAS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Deshabilitar RLS temporalmente o agregar políticas permisivas

-- Opción 1: Deshabilitar RLS (más simple para métricas del sistema)
ALTER TABLE metricas_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE rankings_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_globales DISABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_sistema DISABLE ROW LEVEL SECURITY;
ALTER TABLE historial_progreso DISABLE ROW LEVEL SECURITY;

-- Opción 2: Si prefieres mantener RLS, usar estas políticas:
/*
-- Políticas para metricas_usuario
CREATE POLICY "Allow all for metricas_usuario" ON metricas_usuario
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para rankings_historico
CREATE POLICY "Allow all for rankings_historico" ON rankings_historico
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para estadisticas_globales
CREATE POLICY "Allow all for estadisticas_globales" ON estadisticas_globales
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para alertas_sistema
CREATE POLICY "Allow all for alertas_sistema" ON alertas_sistema
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para historial_progreso
CREATE POLICY "Allow all for historial_progreso" ON historial_progreso
    FOR ALL USING (true) WITH CHECK (true);
*/

-- Verificar
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('metricas_usuario', 'rankings_historico', 'estadisticas_globales', 'alertas_sistema', 'historial_progreso');
