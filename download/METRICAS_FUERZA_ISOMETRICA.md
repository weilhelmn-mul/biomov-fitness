# MÉTRICAS DE EVALUACIÓN DE FUERZA ISOMÉTRICA - BIOMOV

## Resumen de Métricas

Este documento describe todas las métricas que se miden y calculan durante la evaluación de fuerza isométrica en el sistema BIOMOV.

---

## 1. MÉTRICAS PRINCIPALES (Desde Arduino/HX711)

| Métrica | Símbolo | Unidad | Descripción |
|---------|---------|--------|-------------|
| **Fuerza Máxima** | Fmax | kgf | Pico de fuerza más alto alcanzado durante el test |
| **RFD 0-200ms** | RFD₀₋₂₀₀ | kgf/s | Tasa de desarrollo de fuerza en los primeros 200ms |
| **Fuerza @ 200ms** | F₂₀₀ | kgf | Valor de fuerza exacto a los 200ms |
| **Duración del Test** | Ttest | s | Tiempo total del intento desde inicio hasta fin |

### Protocolo de Medición Arduino
- **Frecuencia de muestreo**: 50 Hz (cada 20ms)
- **Sensor**: Celda de carga con HX711
- **Factor de calibración**: 23125.56
- **Inicio del test**: Fuerza > 2.0 kgf
- **Fin del test**: Fuerza < 1.0 kgf después de 300ms

---

## 2. MÉTRICAS CALCULADAS (Frontend)

### 2.1 Fuerza

| Métrica | Símbolo | Unidad | Fórmula/Descripción |
|---------|---------|--------|---------------------|
| **Fuerza Máxima Real** | Freal | kgf | Valor máximo medido directamente |
| **Fuerza Máxima Modelada** | Fmodel | kgf | Valor ajustado al modelo exponencial |
| **Fuerza Promedio** | Favg | kgf | Promedio de fuerza durante el test |

### 2.2 Tiempos Característicos

| Métrica | Símbolo | Unidad | Descripción |
|---------|---------|--------|-------------|
| **Tiempo a Fmax** | tFmax | ms | Tiempo para alcanzar la fuerza máxima |
| **Tiempo 50% Fmax** | t₅₀ | ms | Tiempo para alcanzar el 50% de Fmax |
| **Tiempo 90% Fmax** | t₉₀ | ms | Tiempo para alcanzar el 90% de Fmax |

### 2.3 Parámetros del Modelo

| Métrica | Símbolo | Unidad | Fórmula |
|---------|---------|--------|---------|
| **Constante de Tiempo** | τ (tau) | s | F(t) = Fmax × (1 - e^(-t/τ)) |
| **RFD Máximo** | RFDmax | kgf/s | Máxima pendiente de la curva fuerza-tiempo |

---

## 3. RFD POR INTERVALOS DE TIEMPO

El Rate of Force Development (RFD) se calcula en diferentes ventanas temporales:

| Intervalo | Fórmula | Unidad | Interpretación |
|-----------|---------|--------|----------------|
| **RFD 50ms** | F₅₀ / 0.05 | kgf/s | Capacidad de activación muy temprana |
| **RFD 100ms** | F₁₀₀ / 0.10 | kgf/s | Activación neural temprana |
| **RFD 150ms** | F₁₅₀ / 0.15 | kgf/s | Transición a fuerza sostenida |
| **RFD 200ms** | F₂₀₀ / 0.20 | kgf/s | RFD estándar para comparación |

### Valores de Referencia RFD 0-200ms

| Clasificación | RFD (kgf/s) | Interpretación |
|---------------|-------------|----------------|
| **Explosivo** | > 400 | Excelente activación neural |
| **Moderado** | 250 - 400 | Capacidad media |
| **Lento** | < 250 | Necesita mejora |

---

## 4. MÉTRICAS DE GALGAS (Dobles Celdas)

| Métrica | Descripción | Uso |
|---------|-------------|-----|
| **Galga 1 Máx** | Valor máximo de la celda 1 | Distribución de carga |
| **Galga 2 Máx** | Valor máximo de la celda 2 | Distribución de carga |
| **Galga 1 Prom** | Promedio de la celda 1 | Análisis de estabilidad |
| **Galga 2 Prom** | Promedio de la celda 2 | Análisis de estabilidad |

---

## 5. ÍNDICES DE RENDIMIENTO

### 5.1 Índice de Fatiga

| Métrica | Fórmula | Interpretación |
|---------|---------|----------------|
| **Fatigue Index** | ((Fmax - Ffinal) / Fmax) × 100 | % de pérdida de fuerza al final del test |

### 5.2 Índice de Simetría Bilateral

| Métrica | Fórmula | Rangos |
|---------|---------|--------|
| **Índice de Asimetría** | \|(Izq - Der) / ((Izq + Der) / 2)\| × 100 | Ver tabla abajo |
| **Índice de Simetría** | 100 - Asimetría | |

### Clasificación de Asimetría

| Valor | Clasificación | Acción Recomendada |
|-------|---------------|-------------------|
| **< 10%** | Normal | Continuar entrenamiento equilibrado |
| **10-15%** | Moderada | Considerar ejercicios unilaterales correctivos |
| **> 15%** | Significativa | Trabajo correctivo unilateral + evaluación funcional |

---

## 6. CURVA DE FUERZA (Datos Crudos)

Se almacena la curva completa como array JSON:

```typescript
interface ForceCurvePoint {
  time: number;   // Tiempo en segundos
  force: number;  // Fuerza en kgf
}
```

### Uso de la Curva
- Análisis post-test detallado
- Comparación entre evaluaciones
- Cálculo de métricas adicionales
- Exportación para investigación

---

## 7. DATOS DEL TEST

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **athleteId** | UUID | ID del atleta en Supabase Auth |
| **muscleEvaluated** | String | ID del grupo muscular (ej: quads_l) |
| **side** | Enum | Izquierdo / Derecho / Bilateral |
| **date** | ISO Date | Fecha y hora de la evaluación |
| **unit** | Enum | kg (kilogramos fuerza) / N (Newtons) |

---

## 8. GRUPOS MUSCULARES EVALUABLES

### Tren Superior (19 grupos bilateral)

| ID | Nombre | Región | Lado |
|----|--------|--------|------|
| pectoral_l/r | Pectoral Mayor | Superior | Izq/Der |
| deltoid_ant_l/r | Deltoide Anterior | Superior | Izq/Der |
| deltoid_mid_l/r | Deltoide Medio | Superior | Izq/Der |
| deltoid_post_l/r | Deltoide Posterior | Superior | Izq/Der |
| trap_upper_l/r | Trapecio Superior | Superior | Izq/Der |
| trap_lower_l/r | Trapecio Medio/Inferior | Superior | Izq/Der |
| latissimus_l/r | Dorsal Ancho | Superior | Izq/Der |
| biceps_l/r | Bíceps Braquial | Superior | Izq/Der |
| triceps_l/r | Tríceps Braquial | Superior | Izq/Der |
| core_l/r | Core (Recto Abdominal) | Superior | Izq/Der |

### Tren Inferior (18 grupos bilateral)

| ID | Nombre | Región | Lado |
|----|--------|--------|------|
| glute_max_l/r | Glúteo Mayor | Inferior | Izq/Der |
| glute_med_l/r | Glúteo Medio | Inferior | Izq/Der |
| quads_l/r | Cuádriceps | Inferior | Izq/Der |
| hams_l/r | Isquiotibiales | Inferior | Izq/Der |
| adductors_l/r | Aductores | Inferior | Izq/Der |
| abductors_l/r | Abductores | Inferior | Izq/Der |
| tibialis_l/r | Tibial Anterior | Inferior | Izq/Der |
| gastroc_l/r | Gastrocnemio | Inferior | Izq/Der |
| soleus_l/r | Sóleo | Inferior | Izq/Der |

---

## 9. FÓRMULAS DE CÁLCULO

### Modelo Exponencial de Fuerza
```
F(t) = Fmax × (1 - e^(-t/τ))

Donde:
- F(t) = Fuerza en el tiempo t
- Fmax = Fuerza máxima asíntota
- τ = Constante de tiempo
- t = Tiempo desde el inicio
```

### Tiempos Característicos
```
t₅₀ = τ × ln(2) ≈ τ × 0.69
t₉₀ = τ × ln(10) ≈ τ × 2.3
```

### RFD
```
RFD = (F(t₂) - F(t₁)) / (t₂ - t₁)
```

### Impulso
```
Impulso = ∫₀ᵗ F(t)dt  [N·s]
Nota: 1 kgf = 9.80665 N
```

### Índice de Asimetría Bilateral
```
ASI = |(Fizq - Fder) / ((Fizq + Fder) / 2)| × 100
```

---

## 10. APLICACIONES PRÁCTICAS

### Entrenamiento de Fuerza Máxima
- Usar 85-95% de Fmax
- 3-5 repeticiones
- Descanso 3-5 minutos

### Entrenamiento de Fuerza Explosiva
- Usar 30-60% de Fmax
- 6-8 repeticiones
- Énfasis en velocidad de ejecución

### Entrenamiento Correctivo
- Identificar asimetrías > 10%
- Priorizar lado débil
- Ejercicios unilaterales

---

*Documento generado para BIOMOV - Sistema de Evaluación de Fuerza Isométrica*
*Última actualización: 2025*
