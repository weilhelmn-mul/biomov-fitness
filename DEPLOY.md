# 🚀 Despliegue de BIOMOV AI

## Opción 1: Vercel (Recomendado)

### Paso 1: Instalar Vercel CLI
```bash
npm i -g vercel
```

### Paso 2: Desplegar
```bash
cd /home/z/my-project
vercel
```

### Paso 3: Seguir las instrucciones
- Login con GitHub/GitLab/Bitbucket
- Seleccionar proyecto
- Vercel detectará automáticamente Next.js

### URL Resultante
Tu app estará en: `https://biomov-ai.vercel.app`

---

## Opción 2: GitHub + Vercel

### Paso 1: Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit - BIOMOV AI"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/biomov-ai.git
git push -u origin main
```

### Paso 2: Conectar con Vercel
1. Ve a https://vercel.com
2. Click "New Project"
3. Importa tu repo de GitHub
4. Click "Deploy"

---

## Opción 3: Docker

### Build de la imagen
```bash
docker build -t biomov-ai .
```

### Ejecutar contenedor
```bash
docker run -p 3000:3000 biomov-ai
```

---

## Variables de Entorno (si las necesitas)

Crea un archivo `.env.production`:
```
DATABASE_URL="tu_database_url"
```

En Vercel, agrega estas variables en:
Project Settings → Environment Variables

---

## Notas Importantes

- ✅ El build está optimizado
- ✅ PWA configurada
- ✅ Fuentes optimizadas
- ⚠️ Web Serial API requiere HTTPS (Vercel lo provee automáticamente)
