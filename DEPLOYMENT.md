# Guía de Despliegue - BIOMOV PWA

## Arquitectura Recomendada

```
┌─────────────────┐     ┌─────────────────┐
│   VERCEL        │     │   SUPABASE      │
│   (Frontend)    │────▶│   (Backend)     │
│   Next.js PWA   │     │   - PostgreSQL  │
│   HTTPS ✓       │     │   - Auth        │
│   PWA Ready ✓   │     │   - Storage     │
└─────────────────┘     │   - Realtime    │
                        └─────────────────┘
```

---

## PARTE 1: Desplegar en Vercel (Frontend)

### Paso 1: Crear cuenta en Vercel
1. Ve a https://vercel.com
2. Haz clic en "Sign Up"
3. Elige "Continue with GitHub"

### Paso 2: Subir código a GitHub
```bash
# En tu máquina local
git init
git add .
git commit -m "Initial commit - BIOMOV PWA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/biomov.git
git push -u origin main
```

### Paso 3: Importar proyecto en Vercel
1. Ve a https://vercel.com/new
2. Selecciona tu repositorio de GitHub
3. Vercel detectará automáticamente Next.js
4. Haz clic en "Deploy"
5. Espera ~2 minutos

### Paso 4: Configurar dominio (opcional)
- Tu app estará disponible en: `https://tu-proyecto.vercel.app`
- Puedes agregar un dominio personalizado en Settings > Domains

---

## PARTE 2: Configurar Supabase (Backend)

### Paso 1: Crear proyecto en Supabase
1. Ve a https://supabase.com
2. Haz clic en "New Project"
3. Nombre: `biomov`
4. Genera una contraseña segura para la base de datos
5. Selecciona la región más cercana
6. Haz clic en "Create new project"

### Paso 2: Obtener credenciales
1. Ve a Settings > API
2. Copia:
   - `Project URL` (SUPABASE_URL)
   - `anon public` key (SUPABASE_ANON_KEY)

### Paso 3: Crear tablas (SQL Editor)
```sql
-- Tabla de usuarios
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  age INTEGER,
  weight DECIMAL,
  height INTEGER,
  goal TEXT,
  experience TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de mesociclos
CREATE TABLE mesocycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  number INTEGER,
  phase TEXT,
  week INTEGER,
  total_weeks INTEGER,
  start_date DATE,
  end_date DATE,
  days_per_week INTEGER,
  focus TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de entrenamientos
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  date DATE,
  exercise TEXT,
  sets INTEGER,
  reps INTEGER[],
  weights DECIMAL[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de records personales
CREATE TABLE personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  exercise_id TEXT,
  exercise_name TEXT,
  weight DECIMAL,
  reps INTEGER,
  estimated_1rm DECIMAL,
  date DATE,
  muscle_group TEXT
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own mesocycles" ON mesocycles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mesocycles" ON mesocycles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own PRs" ON personal_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PRs" ON personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Paso 4: Configurar variables de entorno en Vercel
1. Ve a tu proyecto en Vercel
2. Settings > Environment Variables
3. Agrega:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```

---

## PARTE 3: Instalar en Móvil (PWA)

### Android (Chrome)
1. Abre Chrome en tu móvil
2. Ve a tu URL: `https://tu-proyecto.vercel.app`
3. Toca el menú (3 puntos) ⋮
4. Selecciona "Añadir a pantalla de inicio"
5. Confirma la instalación
6. ¡Listo! Tendrás un icono en tu pantalla

### iOS (Safari)
1. Abre Safari en tu iPhone
2. Ve a tu URL: `https://tu-proyecto.vercel.app`
3. Toca el botón "Compartir" (cuadrado con flecha)
4. Selecciona "Añadir a pantalla de inicio"
5. Nombra la app "BIOMOV"
6. Toca "Añadir"
7. ¡Listo! Tendrás un icono en tu pantalla

---

## Requisitos PWA (ya configurados)

✅ manifest.json con:
- name, short_name
- icons (72x72 a 512x512)
- start_url, display: standalone
- theme_color, background_color

✅ Service Worker para:
- Cache offline
- Funcionamiento sin conexión

✅ Meta tags para:
- iOS: apple-mobile-web-app-capable
- Android: mobile-web-app-capable
- Theme colors

---

## Alternativa: Netlify

Si prefieres Netlify:

```bash
# Instalar CLI
npm install -g netlify-cli

# Build y deploy
bun run build
netlify deploy --prod

# Seguir las instrucciones
```

---

## Testing Local en Móvil

### Opción 1: Túnel con ngrok
```bash
# Instalar ngrok
npm install -g ngrok

# Crear túnel (en otra terminal)
ngrok http 3000

# Usa la URL HTTPS que te da ngrok
# Ejemplo: https://abc123.ngrok.io
```

### Opción 2: Red local
```bash
# Iniciar dev server accesible en red
bun run dev -- --host

# Busca tu IP local (ej: 192.168.1.100)
# Accede desde móvil: http://192.168.1.100:3000
```

---

## Checklist Final

- [ ] Código subido a GitHub
- [ ] Proyecto desplegado en Vercel
- [ ] HTTPS funcionando (automático en Vercel)
- [ ] PWA instalable en Android
- [ ] PWA instalable en iOS
- [ ] (Opcional) Supabase configurado
- [ ] (Opcional) Variables de entorno configuradas
- [ ] (Opcional) Base de datos creada
