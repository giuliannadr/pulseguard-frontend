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
| **Sileo** | Notificaciones | Toast notifications con soporte de éxito, error, warning e info |

**Decisión de arquitectura clave:** Se eligió separar completamente el frontend (Vercel) del backend (Railway) para poder escalar cada capa independientemente y mantener la lógica de negocio (checks, AI scanning, notificaciones) fuera del browser.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Página de login (email/password + OAuth GitHub/Google)
│   │   └── signup/         # Página de registro
│   ├── (dashboard)/        # Layout protegido con sidebar
│   │   ├── dashboard/      # Vista general — todos los monitores, stats globales
│   │   ├── monitors/[id]/  # Detalle de monitor — métricas, gráficos, seguridad, alertas
│   │   ├── security/       # Consola de incidentes de seguridad con filtros
│   │   ├── playground/     # Herramientas de auditoría en tiempo real
│   │   ├── import/         # Creación de monitores con presets
│   │   ├── settings/       # Configuración de notificaciones y cuenta
│   │   └── status/         # Vista previa de la página de estado pública
│   ├── auth/
│   │   ├── callback/       # Handler del OAuth flow de Supabase
│   │   └── signout/        # Endpoint de cierre de sesión
│   └── s/[userId]/         # Página de estado pública (sin autenticación)
├── components/
│   ├── DashboardNav.tsx    # Sidebar de navegación
│   └── ui/
│       ├── GlassCard.tsx
│       ├── GlowingButton.tsx
│       ├── StatusBadge.tsx
│       └── UptimeBar.tsx
└── lib/
    ├── api.ts              # Cliente HTTP tipado para el backend
    ├── toast.ts            # Helper de notificaciones (notify.success/error/warning/...)
    ├── i18n.tsx            # Internacionalización (ES/EN)
    ├── scan-context.tsx    # Context global para el estado del scan de seguridad
    ├── utils.ts
    └── supabase/
        ├── client.ts       # Cliente Supabase para componentes client-side
        └── server.ts       # Cliente Supabase para server components y middleware
```

---

## Pantallas principales

1. **Dashboard** — Vista general de todos los monitores con uptime, latencia y estado en tiempo real (Supabase Realtime)
2. **Monitor Detail** — Métricas históricas, gráfico de respuesta, security headers, heatmap de disponibilidad, incidentes de seguridad detectados por IA, panel de alertas, exportación CSV
3. **Security** — Vista consolidada de todos los incidentes de seguridad con filtros por severidad, resolución en lote
4. **Playground / Consola** — Herramientas de auditoría: API Auditor, Code Auditor (SAST), DNS/SSL Inspector, Attack Simulator, Network Diagnostics
5. **Import** — Creación de monitores con presets rápidos (Vercel, Railway, Supabase, etc.) y selección de repo GitHub
6. **Settings** — Configuración global de notificaciones webhook, integración GitHub
7. **Página de estado pública** (`/s/[userId]`) — Página sin autenticación para compartir con clientes, con auto-refresh cada 60s

---

## Uso de herramientas de IA

Este proyecto fue desarrollado usando **Claude Code (Anthropic)** como asistente principal de desarrollo durante toda la semana del challenge.

**Cómo se usó la IA:**
- **Generación de componentes:** Los componentes de UI complejos (gráficos, skeletons, tablas, heatmaps) se generaron con Claude y luego se ajustaron manualmente para seguir el sistema de diseño del proyecto
- **Arquitectura del backend:** Se usó IA para proponer la estructura modular de NestJS y los DTOs, validando cada decisión contra las convenciones del framework
- **Debugging:** Cuando el build de Vercel fallaba por keys i18n faltantes o cuando Railway deployaba código viejo (dist/ commiteado), se usó Claude para diagnosticar y corregir
- **Auditoría de código:** La IA generó código que fue revisado y corregido — por ejemplo, se detectó un bug donde `setCodeResult()` en el `finally` block bloqueaba la pantalla de scan-done, y otro donde `new URL('')` causaba crash en modo repo-only
- **Prompts de Gemini:** Los prompts para el análisis de seguridad de commits fueron iterados con IA para obtener respuestas en español, concisas y en formato JSON estructurado
- **Auditoría de seguridad:** Análisis completo del codebase que identificó y corrigió SSRF en webhooks, webhook spoofing en GitHub, HTML injection en emails, y datos expuestos en endpoints públicos

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
# Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Web3Forms — para el email de prueba de notificaciones (gratuito en web3forms.com)
NEXT_PUBLIC_WEB3FORMS_KEY=tu_key
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

## Notificaciones UI

Las notificaciones de la app usan **Sileo** (wrapper sobre una librería de toasts). Para mostrar notificaciones en cualquier componente:

```ts
import { notify } from '@/lib/toast';

notify.success('Monitor activado');
notify.error('Error al guardar', err.message);
notify.warning('Sin email configurado');
notify.info('Escaneo en progreso');
```

---

## CI/CD

GitHub Actions corre en cada push a `main`:
- **Type check** — `tsc --noEmit`
- **Build** — `next build`

Ver [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
