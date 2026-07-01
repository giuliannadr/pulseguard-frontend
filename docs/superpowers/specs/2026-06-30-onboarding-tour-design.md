# Onboarding Tour — Design Spec
**Date:** 2026-06-30

## Overview

An interactive spotlight-based onboarding tour for new PulseGuard users. Activates automatically on first login, skippable at any step, replayable from Settings. Implemented with a custom overlay (no external library) to match the glassmorphism design system.

Also fixes the sonner toast visibility issue (white-on-white in light mode).

---

## Tour Steps

| # | ID | Target (`data-tour`) | Title | Description |
|---|----|--------------------|-------|-------------|
| 1 | `welcome` | — (centered, no spotlight) | Bienvenido a PulseGuard | Explica qué hace la plataforma en 2 líneas. CTA: "Empezar recorrido" |
| 2 | `stats` | `data-tour="stats"` | Estado global de tus servicios | Las 4 cards muestran uptime, latencia promedio, incidentes activos y monitores activos en tiempo real |
| 3 | `monitors` | `data-tour="monitors"` | Tus monitores | Cada card es un servicio que PulseGuard chequea automáticamente. Podés pausar, chequear ahora o ver el detalle |
| 4 | `add-monitor` | `data-tour="add-monitor"` | Agregá tu primer servicio | Desde acá podés crear un monitor nuevo: sólo necesitás la URL de tu API o sitio |
| 5 | `nav-security` | `data-tour="nav-security"` | Seguridad con IA | PulseGuard analiza cada commit de tus repos de GitHub y detecta vulnerabilidades automáticamente |
| 6 | `nav-playground` | `data-tour="nav-playground"` | Consola de auditoría | Herramientas para testear endpoints, auditar código, inspeccionar DNS/SSL y simular ataques |
| 7 | `nav-settings` | `data-tour="nav-settings"` | Alertas y notificaciones | Configurá alertas por email o webhook (Discord/Slack) cuando un servicio cambia de estado |
| 8 | `done` | — (centered, no spotlight) | ¡Ya conocés PulseGuard! | Resumen de lo visto. CTA: "Crear mi primer monitor" → navega a /import |

---

## Behavior

- **Auto-start:** Se activa al entrar al dashboard si `localStorage.getItem('pg_tour_done')` no existe
- **Skip:** Botón "Saltar tour" en cada paso + ícono X arriba a la derecha. Ambos setean `pg_tour_done = true` y cierran el tour
- **Navigation:** Botones `← Anterior` / `Siguiente →` + contador `2 / 8`
- **Click outside tooltip:** No hace nada (evita cierre accidental)
- **Replay:** Botón "Repasar tour" en Settings que llama `startTour()` y navega a /dashboard
- **Keyboard:** Escape = skip, ArrowRight = next, ArrowLeft = prev

---

## Architecture

### Files to create

```
src/
  lib/
    tour-steps.ts          # Step definitions (id, target, title, description, position)
  components/
    Tour/
      TourProvider.tsx     # Context: step index, visible, startTour, skipTour, nextStep, prevStep
      TourSpotlight.tsx    # Overlay + animated hole + tooltip card
      index.ts             # Re-exports
```

### Files to modify

| File | Change |
|------|--------|
| `src/app/(dashboard)/layout.tsx` | Wrap children with `TourProvider`, render `TourSpotlight` |
| `src/app/(dashboard)/dashboard/page.tsx` | Add `data-tour="stats"`, `data-tour="monitors"`, `data-tour="add-monitor"` |
| `src/components/DashboardNav.tsx` | Add `data-tour="nav-security"`, `data-tour="nav-playground"`, `data-tour="nav-settings"` |
| `src/app/(dashboard)/settings/page.tsx` | Add "Repasar tour" button that calls `startTour()` |
| `src/app/layout.tsx` | Fix Toaster styles (hardcode dark bg/white text to work in both themes) |

---

## Spotlight Implementation

The "hole" effect uses a full-screen fixed overlay + a positioned div over the target element with a massive `box-shadow`:

```css
/* Overlay (darkens everything) */
.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  pointer-events: all;
}

/* Spotlight hole — positioned over target element */
.tour-spotlight-hole {
  position: fixed;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
  border-radius: 16px;
  pointer-events: none;
  z-index: 9001;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
```

The `TourSpotlight` component reads `data-tour="id"` via `document.querySelector`, gets `getBoundingClientRect()`, and positions the hole div accordingly. On step change, the hole animates to the new position.

For steps 1 and 8 (welcome/done) the overlay is full-screen with a centered glass modal (no hole).

---

## Tooltip Card Design

Glass card matching PulseGuard design system:
- `backdrop-filter: blur(20px)`
- `background: rgba(255,255,255,0.92)` / dark: `rgba(26,15,66,0.85)`
- `border: 1px solid rgba(255,255,255,0.85)`
- `border-radius: 20px`
- `padding: 24px 28px`
- Max width: `360px`
- Positioned above/below/left/right the spotlight hole, auto-calculated to stay in viewport

Contents:
- Step indicator chip: `2 / 8` (small, monospace, muted)
- Title: `font-display`, `18px`, `700`
- Description: `font-body`, `13px`, secondary color
- Buttons row: `← Anterior` (ghost) + `Siguiente →` (primary) + `Saltar` (text, muted)

---

## Toast Fix

Current issue: `toastOptions.style` sets `background: var(--color-bg-card)` = `#FFFFFF` in light mode, making toasts invisible.

Fix: remove the custom `style` override. `richColors` in sonner already provides beautiful, high-contrast colors for success/error/warning/info in both light and dark modes. Keep only `position`, `richColors`, and `closeButton`.

---

## Out of Scope

- Animated illustrations per step
- Backend tracking of tour completion (localStorage is sufficient)
- Tour on mobile (tour is hidden on screens < 768px — mobile has different nav UX)
