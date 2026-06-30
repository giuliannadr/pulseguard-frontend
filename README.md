# PulseGuard — Frontend

> Plataforma DevSecOps de monitoreo de disponibilidad e inteligencia de seguridad en tiempo real.

**Demo en vivo:** https://pulseguard-frontend.vercel.app  
**Repositorio backend:** https://github.com/giuliannadr/pulseguard-backend

---

## ¿De qué trata el proyecto?

PulseGuard es un sistema de monitoreo de uptime y seguridad para desarrolladores y equipos de producto. Permite:

- **Monitorear la disponibilidad** de APIs y sitios web con checks automáticos cada N minutos
- **Detectar vulnerabilidades** en commits de GitHub usando análisis estático con IA (Gemini)
- **Auditar APIs y código** en tiempo real desde una consola interactiva (Playground)
- **Recibir alertas** por email o webhook (Discord/Slack) cuando un servicio cae
- **Compartir una página de estado pública** con clientes (`/s/[userId]`)

---

## Tecnologías elegidas y por qué

| Tecnología | Rol | Motivo |
|---|---|---|
| **Next.js 15 (App Router)** | Framework frontend | Server components, routing basado en archivos, excelente DX |
| **TypeScript** | Lenguaje | Tipado estricto, menor superficie de bugs en runtime |
| **Supabase** | Auth + Realtime | BaaS que maneja autenticación JWT y suscripciones Postgres en tiempo real sin servidor propio |
| **Recharts** | Gráficos | Componentes React nativos para el historial de latencia |
| **NestJS (backend)** | API REST | Arquitectura modular con inyección de dependencias, ideal para servicios escalables |

**Decisión de arquitectura clave:** Se eligió separar completamente el frontend (Vercel) del backend (Railway) para poder escalar cada capa independientemente y mantener la lógica de negocio (checks, AI scanning, notificaciones) fuera del browser.

---

## Pantallas principales

1. **Dashboard** — Vista general de todos los monitores con uptime, latencia y estado en tiempo real (Supabase Realtime)
2. **Monitor Detail** — Métricas históricas, gráfico de respuesta, security headers, incidentes de seguridad detectados por IA, panel de alertas
3. **Security** — Vista consolidada de todos los incidentes de seguridad con filtros por severidad
4. **Playground / Consola** — Herramientas de auditoría: API Auditor, Code Auditor (SAST), DNS/SSL Inspector, Attack Simulator
5. **Import** — Creación de monitores con presets rápidos (Vercel, Railway, Supabase, etc.)
6. **Settings** — Configuración global de notificaciones webhook
7. **Página de estado pública** (`/s/[userId]`) — Página sin autenticación para compartir con clientes, con auto-refresh cada 60s

---

## Uso de herramientas de IA

Este proyecto fue desarrollado usando **Claude Code (Anthropic)** como asistente principal de desarrollo durante toda la semana del challenge.

**Cómo se usó la IA:**
- **Generación de componentes:** Los componentes de UI complejos (gráficos, skeletons, tablas) se generaron con Claude y luego se ajustaron manualmente para seguir el sistema de diseño del proyecto
- **Arquitectura del backend:** Se usó IA para proponer la estructura modular de NestJS y los DTOs, validando cada decisión contra las convenciones del framework
- **Debugging:** Cuando el build de Vercel fallaba por keys i18n faltantes o cuando Railway deployaba código viejo (dist/ commiteado), se usó Claude para diagnosticar y corregir
- **Auditoría de código:** La IA generó código que fue revisado y corregido — por ejemplo, se detectó un bug donde `setCodeResult()` en el `finally` block bloqueaba la pantalla de scan-done, y otro donde `new URL('')` causaba crash en modo repo-only
- **Prompts de Gemini:** Los prompts para el análisis de seguridad de commits fueron iterados con IA para obtener respuestas en español, concisas y en formato JSON estructurado

**El criterio humano aplicado:**
- Revisión de cada componente generado para consistencia con el sistema de diseño
- QA de flujos completos (login → crear monitor → scan → alertas)
- Corrección de bugs que la IA introdujo o no detectó
- Decisiones de arquitectura (separación frontend/backend, uso de ScanContext global, paralelización de llamadas a Gemini)

---

## Instalación local

### Prerrequisitos
- Node.js v20+
- Backend de PulseGuard corriendo (ver [pulseguard-backend](https://github.com/giuliannadr/pulseguard-backend))

### Variables de entorno (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### Pasos

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

### Build de producción

```bash
npm run build
npm start
```

---

## CI/CD

GitHub Actions corre en cada push a `main`:
- **Type check** — `tsc --noEmit`
- **Build** — `next build`

Ver [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
