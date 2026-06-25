# PulseGuard — Frontend (Next.js App Router + TypeScript)

PulseGuard es una consola interactiva de DevSecOps y monitoreo de disponibilidad de APIs en tiempo real. Este repositorio contiene el código de la aplicación de usuario, desarrollada en **Next.js (React)** con integración de **Supabase Client** y visualización interactiva de analíticas mediante **Recharts**.

---

## 🎨 Características de la Interfaz y UX/UI Premium

Siguiendo las pautas de diseño más estrictas de **AranguriApps**, implementamos una interfaz futurista retro-tech con una paleta de colores de alto contraste (Ácido, Fucsia, Negro Puro, y Carbono) y micro-animaciones:

1. **Dashboard de Proyectos:** Lista los proyectos y calcula de forma dinámica el porcentaje de disponibilidad (Uptime), latencia media (ms), y estado de expiración del SSL.
2. **Escaneo On-Demand de Commits:** Incluye un botón interactivo **[ 🔍 Scan Commits ]** que se conecta mediante el token de proveedor de GitHub a su API para extraer diffs recientes y auditar vulnerabilidades en el momento.
3. **SecOps Playground (Developer Toolbox):**
   - **API Auditor:** Suite de pruebas con botones preconfigurados (Load Presets) para lanzar peticiones instantáneas y ver respuestas junto a un reporte AI de Gemini.
   - **Code Auditor:** Pestaña con plantillas de código inseguro (SQLi express, Dockerfile como root, dependencias vulnerables) listas para ser auditadas.
   - **SSL/DNS Inspector:** Inspección DNS y TLS automatizada con evaluación de red Gemini.
   - **Hacking Simulator:** Lanzamiento seguro de ataques (SQLi, XSS, rate-limit, traversal) con una consola interactiva que simula logs de penetración.

---

## ⚙️ Tecnologías y Arquitectura

- **Next.js (App Router):** Enrutamiento basado en archivos con componentes del cliente altamente optimizados.
- **Supabase JS Client:** Autenticación e integración de eventos en tiempo real. La interfaz se suscribe a los canales de Supabase (`realtime`) para actualizar las tablas de checks e incidentes instantáneamente cuando se detectan novedades en el backend.
- **Recharts:** Renderizado premium de áreas gradientes para el histórico de latencia de servidores.
- **Vanilla CSS & Tailwind CSS:** Combinación híbrida para un control máximo del diseño visual sin placeholders.

---

## 🤖 Uso de Herramientas de IA

El frontend fue diseñado con apoyo de herramientas generativas de IA. La salida fue auditada minuciosamente para evitar código innecesario, asegurar la responsividad en móviles y consolidar un flujo de usuario robusto e integrado.

---

## 📦 Instalación y Configuración Local

### Prerrequisitos
- Node.js v20.x o v22.x
- Backend de PulseGuard corriendo en tu red o producción

### Variables de Entorno (`.env.local`)
Crea un archivo `.env.local` en la raíz de `pulseguard-frontend/`:
```env
# URL del backend (incluye la ruta base /api)
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# Credenciales de Supabase del proyecto
NEXT_PUBLIC_SUPABASE_URL="https://rswebvxvtppfopegedfb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

### Ejecutar Localmente
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Levantar el servidor Next.js en desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 🛡 Verificación y Compilación

Para compilar y verificar que no existen fallos de tipado o de Next.js antes de desplegar en Vercel:
```bash
npm run build
```
