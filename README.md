# CyclingDirector — Race Intelligence Platform

Aplicación web profesional para análisis de carreras de ciclismo con persistencia en Supabase y despliegue en Netlify.

## Arquitectura

```
Frontend (Vite + Vanilla JS modular)
    └── Netlify CDN
Backend
    ├── Supabase PostgreSQL  — datos persistentes (carreras, métricas, ciclistas, análisis IA)
    ├── Supabase Auth        — autenticación por email/magic link
    ├── Supabase Storage     — archivos CSV originales (opcional)
    └── Netlify Function     — proxy seguro para API de Anthropic (clave nunca expuesta al cliente)
```

## Setup en 5 pasos

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New project
2. En **SQL Editor** → New Query → pega el contenido de `supabase_schema.sql` → Run
3. En **Settings → API** copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus credenciales reales
```

### 3. Instalar y ejecutar en local

```bash
npm install
# Instala también netlify-cli para probar las funciones localmente:
npm install -g netlify-cli

# Desarrollo con Netlify Dev (incluye la función ai-chat):
netlify dev

# O solo el frontend:
npm run dev
```

### 4. Desplegar en Netlify

```bash
# Primera vez:
netlify login
netlify init   # vincula con tu repositorio
netlify deploy --build  # deploy de prueba

# Deploy a producción:
netlify deploy --build --prod
```

### 5. Configurar variables en Netlify

En tu dashboard de Netlify → **Site settings → Environment variables**:

| Variable                 | Valor                          |
|--------------------------|--------------------------------|
| `VITE_SUPABASE_URL`      | Tu project URL de Supabase     |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase        |
| `ANTHROPIC_API_KEY`      | Tu clave `sk-ant-api03-...`    |

> ⚠️ `ANTHROPIC_API_KEY` solo es necesaria en Netlify (server-side). **Nunca** empieza por `VITE_`.

## Estructura del proyecto

```
cycling-director/
├── netlify.toml              # Configuración de build y funciones
├── netlify/functions/
│   └── ai-chat.js            # Proxy seguro para Anthropic API
├── supabase_schema.sql       # Schema SQL completo (ejecutar una vez)
├── index.html                # Shell de la SPA
├── vite.config.js
├── package.json
└── src/
    ├── main.js               # Entrypoint: auth, estado global, router
    ├── lib/
    │   └── supabase.js       # Cliente Supabase singleton
    ├── api/                  # Capa de acceso a Supabase
    │   ├── riders.js         # CRUD ciclistas
    │   ├── races.js          # CRUD carreras + sesiones
    │   └── aiAnalyses.js     # CRUD análisis IA
    ├── core/                 # Lógica de negocio pura (sin UI, testeable)
    │   ├── csvParser.js      # Parser CSV robusto (BOM, semicolons, quotes)
    │   ├── metricsCalculator.js  # NP, IF, TSS, picos, zonas
    │   └── nameMatching.js   # Matching filename → rider
    ├── components/
    │   ├── Chart.js          # Wrapper Chart.js con PNG download
    │   └── TableDownload.js  # CSV + XLSX para tablas
    └── pages/
        ├── Dashboard.js
        ├── Power.js
        ├── HeartRate.js
        ├── Profile.js
        ├── Individual.js
        ├── Team.js
        ├── History.js
        └── AIAssistant.js
```

## Modelo de datos (Supabase)

| Tabla           | Descripción                                      |
|-----------------|--------------------------------------------------|
| `teams`         | Equipo/organización por usuario                  |
| `riders`        | Ciclistas del equipo                             |
| `races`         | Carreras (metadatos: nombre, fecha, lugar, notas)|
| `race_sessions` | Métricas por ciclista por carrera (NP, IF, TSS, picos, zonas, timeseries) |
| `ai_analyses`   | Análisis IA guardados, vinculados a cada carrera |
| `race_files`    | Referencias a archivos CSV en Storage            |

## Row Level Security

Cada director/entrenador solo ve y edita los datos de su propio equipo. La `anon key` de Supabase es segura de exponer en el cliente gracias a las políticas RLS.

## Para ampliar en el futuro

- **Múltiples usuarios por equipo**: añadir tabla `team_members(team_id, user_id, role)`
- **Comparativa entre carreras**: queries multi-race sobre `race_sessions`
- **Dashboard de evolución**: gráficos de tendencia por ciclista a lo largo del tiempo
- **App móvil**: misma API Supabase, mismo `main.js`
- **Exportación PDF**: añadir Puppeteer como Netlify Function
- **Notificaciones**: Supabase Realtime + webhooks
