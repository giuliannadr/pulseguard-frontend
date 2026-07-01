# Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Spotlight-based onboarding tour (8 steps) that auto-starts on first login, is skippable, replayable from Settings, and fixes sonner toast visibility.

**Architecture:** Custom TourContext + TourSpotlight component using the box-shadow hole technique. No external library. `data-tour` attributes anchor spotlight to DOM elements.

**Tech Stack:** React context, CSS box-shadow trick, localStorage for persistence, sonner for toasts.

---

### Task 1: Fix Toaster visibility

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] Replace the Toaster block — remove `toastOptions.style` override (causes white-on-white in light mode). Keep `richColors`, `closeButton`, `position`:

```tsx
<Toaster
  position="bottom-right"
  richColors
  closeButton
/>
```

- [ ] Commit:
```bash
git add src/app/layout.tsx
git commit -m "fix: remove toastOptions style override — richColors handles contrast"
```

---

### Task 2: Create tour step definitions

**Files:**
- Create: `src/lib/tour-steps.ts`

- [ ] Create the file:

```ts
export interface TourStep {
  id: string;
  target: string | null; // data-tour value, null = centered modal
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: '¡Bienvenido a PulseGuard! 👋',
    description: 'En 2 minutos te mostramos todo lo que podés hacer: monitorear servicios, detectar vulnerabilidades en código y recibir alertas automáticas.',
  },
  {
    id: 'stats',
    target: 'stats',
    title: 'Estado global de tus servicios',
    description: 'Uptime, latencia promedio, incidentes activos y monitores corriendo — todo en tiempo real.',
    position: 'bottom',
  },
  {
    id: 'monitors',
    target: 'monitors',
    title: 'Tus monitores',
    description: 'Cada card es un servicio que PulseGuard chequea automáticamente. Podés pausarlo, chequearlo ahora mismo o ver métricas detalladas.',
    position: 'bottom',
  },
  {
    id: 'add-monitor',
    target: 'add-monitor',
    title: 'Agregá tu primer servicio',
    description: 'Creá un monitor con solo la URL de tu API o sitio web. También podés conectar un repo de GitHub para análisis de seguridad.',
    position: 'bottom',
  },
  {
    id: 'nav-security',
    target: 'nav-security',
    title: 'Seguridad con IA',
    description: 'PulseGuard analiza cada commit de tus repos de GitHub con Gemini AI y detecta vulnerabilidades automáticamente antes de que lleguen a prod.',
    position: 'right',
  },
  {
    id: 'nav-playground',
    target: 'nav-playground',
    title: 'Consola de auditoría',
    description: 'Testea endpoints, auditá código con SAST, inspeccioná DNS/SSL o simulá ataques — todo desde acá.',
    position: 'right',
  },
  {
    id: 'nav-settings',
    target: 'nav-settings',
    title: 'Alertas y notificaciones',
    description: 'Configurá alertas por email o webhook (Discord, Slack) para que te avisen cuando un servicio cae o se detecta una vulnerabilidad.',
    position: 'right',
  },
  {
    id: 'done',
    target: null,
    title: '¡Ya conocés PulseGuard! 🚀',
    description: 'Estás listo para empezar. Creá tu primer monitor y conectá un repo de GitHub para verlo todo en acción.',
  },
];

export const TOUR_STORAGE_KEY = 'pg_tour_done';
```

- [ ] Commit:
```bash
git add src/lib/tour-steps.ts
git commit -m "feat: add tour step definitions"
```

---

### Task 3: Create TourProvider (context + state)

**Files:**
- Create: `src/components/Tour/TourProvider.tsx`

- [ ] Create the file:

```tsx
'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { TOUR_STEPS, TOUR_STORAGE_KEY } from '@/lib/tour-steps';

interface TourContextValue {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  startTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!done) {
      // Small delay so the dashboard has time to render its elements
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const startTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setStepIndex(0);
    setActive(true);
  }, []);

  const skipTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setActive(false);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex(prev => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        setActive(false);
        return 0;
      }
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <TourContext.Provider value={{ active, stepIndex, totalSteps: TOUR_STEPS.length, startTour, skipTour, nextStep, prevStep }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}
```

- [ ] Commit:
```bash
git add src/components/Tour/TourProvider.tsx
git commit -m "feat: add TourProvider context"
```

---

### Task 4: Create TourSpotlight (overlay + tooltip UI)

**Files:**
- Create: `src/components/Tour/TourSpotlight.tsx`

- [ ] Create the file:

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTour } from './TourProvider';
import { TOUR_STEPS } from '@/lib/tour-steps';
import Link from 'next/link';

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 12; // padding around spotlight hole

function getTargetRect(target: string | null): Rect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function getTooltipStyle(rect: Rect | null, position?: string): React.CSSProperties {
  if (!rect) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9100, width: 420, maxWidth: 'calc(100vw - 32px)' };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipW = 340;
  const tooltipH = 200;
  const gap = 16;

  if (position === 'right') {
    const left = Math.min(rect.left + rect.width + gap, vw - tooltipW - 16);
    const top = Math.max(16, Math.min(rect.top + rect.height / 2 - tooltipH / 2, vh - tooltipH - 16));
    return { position: 'fixed', top, left, zIndex: 9100, width: tooltipW };
  }
  if (position === 'top') {
    const top = Math.max(16, rect.top - tooltipH - gap);
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - 16));
    return { position: 'fixed', top, left, zIndex: 9100, width: tooltipW };
  }
  // default: bottom
  const top = Math.min(rect.top + rect.height + gap, vh - tooltipH - 16);
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - 16));
  return { position: 'fixed', top, left, zIndex: 9100, width: tooltipW };
}

export function TourSpotlight() {
  const { active, stepIndex, totalSteps, skipTour, nextStep, prevStep } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);

  const step = TOUR_STEPS[stepIndex];
  const isCentered = !step?.target;
  const isLast = stepIndex === totalSteps - 1;

  const updateRect = useCallback(() => {
    if (!step) return;
    setRect(getTargetRect(step.target));
  }, [step]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [active, updateRect]);

  useEffect(() => {
    if (!active) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, skipTour, nextStep, prevStep]);

  if (!active || !step) return null;

  const tooltipStyle = getTooltipStyle(rect, step.position);

  return (
    <>
      {/* Dark overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: isCentered ? 'rgba(0,0,0,0.7)' : 'transparent',
          pointerEvents: 'all',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight hole (only when there's a target element) */}
      {!isCentered && rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            zIndex: 9001,
            pointerEvents: 'none',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{
          ...tooltipStyle,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(124,58,237,0.15)',
          animation: 'pg-fade-in 0.25s ease-out both',
        }}
      >
        {/* Skip button */}
        <button
          onClick={skipTour}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', padding: 4, lineHeight: 1, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Saltar tour"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Step counter */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7C3AED',
          fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10,
          background: '#EEE9FF', display: 'inline-block',
          padding: '2px 8px', borderRadius: 6,
        }}>
          {stepIndex + 1} / {totalSteps}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800,
          color: '#0F0A1E', margin: '0 0 8px', lineHeight: 1.3,
        }}>
          {step.title}
        </h3>

        {/* Description */}
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: '#4B5563',
          margin: '0 0 20px', lineHeight: 1.65,
        }}>
          {step.description}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stepIndex > 0 && (
            <button
              onClick={prevStep}
              style={{
                height: 36, padding: '0 16px', borderRadius: 8,
                background: 'transparent', border: '1px solid #E5E7EB',
                color: '#6B7280', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ← Anterior
            </button>
          )}

          {isLast ? (
            <Link href="/import" onClick={skipTour} style={{ textDecoration: 'none', flex: 1 }}>
              <button
                style={{
                  width: '100%', height: 36, padding: '0 20px', borderRadius: 8,
                  background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                }}
              >
                Crear mi primer monitor →
              </button>
            </Link>
          ) : (
            <button
              onClick={nextStep}
              style={{
                flex: 1, height: 36, padding: '0 20px', borderRadius: 8,
                background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
                border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
              }}
            >
              {stepIndex === 0 ? 'Empezar recorrido →' : 'Siguiente →'}
            </button>
          )}

          {!isLast && (
            <button
              onClick={skipTour}
              style={{
                background: 'transparent', border: 'none',
                color: '#9CA3AF', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-body)', padding: '0 4px',
              }}
            >
              Saltar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] Commit:
```bash
git add src/components/Tour/TourSpotlight.tsx
git commit -m "feat: add TourSpotlight overlay component"
```

---

### Task 5: Create Tour index re-export

**Files:**
- Create: `src/components/Tour/index.ts`

- [ ] Create the file:

```ts
export { TourProvider, useTour } from './TourProvider';
export { TourSpotlight } from './TourSpotlight';
```

- [ ] Commit:
```bash
git add src/components/Tour/index.ts
git commit -m "feat: add Tour barrel export"
```

---

### Task 6: Wire TourProvider + TourSpotlight into dashboard layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] Add imports at top of file (after existing imports):

```tsx
import { TourProvider, TourSpotlight } from '@/components/Tour';
```

- [ ] Wrap the return with TourProvider and add TourSpotlight inside dashboard-main:

Replace:
```tsx
  return (
    <ScanProvider>
    <div className="dashboard-container">
```

With:
```tsx
  return (
    <TourProvider>
    <ScanProvider>
    <div className="dashboard-container">
```

And replace closing tags:
```tsx
    </div>
    </ScanProvider>
  );
```

With:
```tsx
      <TourSpotlight />
    </div>
    </ScanProvider>
    </TourProvider>
  );
```

- [ ] Commit:
```bash
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat: wire TourProvider and TourSpotlight into dashboard layout"
```

---

### Task 7: Add data-tour attributes to dashboard page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] Add `data-tour="stats"` to the stats grid div. Find:
```tsx
      {/* ── Global Stats Row ── */}
      <div className="grid-stats-4">
```
Replace with:
```tsx
      {/* ── Global Stats Row ── */}
      <div className="grid-stats-4" data-tour="stats">
```

- [ ] Add `data-tour="monitors"` to the monitors grid. Find:
```tsx
      <div className="grid-monitor-cards">
```
Replace with:
```tsx
      <div className="grid-monitor-cards" data-tour="monitors">
```

- [ ] Add `data-tour="add-monitor"` to the "Agregar" button. Find the button with `btn-solid-glow` class that leads to import. Look for:
```tsx
href="/import"
```
Add the attribute to its parent or the button itself. Find the Link that wraps the "+ Agregar" button near the top of the page and add `data-tour="add-monitor"` to the Link element:
```tsx
<Link href="/import" data-tour="add-monitor" style={{ textDecoration: 'none' }}>
```

- [ ] Commit:
```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add data-tour attributes to dashboard page"
```

---

### Task 8: Add data-tour attributes to DashboardNav

**Files:**
- Modify: `src/components/DashboardNav.tsx`

- [ ] In the `links` array, add a `tourId` field to security, playground and settings entries:

```tsx
  const links = [
    {
      href: '/dashboard',
      label: t('nav_projects'),
      badge: 0,
      // ... icon unchanged
    },
    {
      href: '/security',
      label: t('nav_security'),
      badge: alertCount,
      tourId: 'nav-security',
      // ... icon unchanged
    },
    {
      href: '/playground',
      label: t('nav_playground'),
      badge: 0,
      tourId: 'nav-playground',
      scanStatus: scan.status,
      scanCount: scan.count,
      // ... icon unchanged
    },
    {
      href: '/status',
      label: t('nav_status'),
      badge: 0,
      // ... icon unchanged
    },
    {
      href: '/settings',
      label: t('nav_settings'),
      badge: 0,
      tourId: 'nav-settings',
      // ... icon unchanged
    },
  ];
```

- [ ] In the Link render, add `data-tour` when `tourId` exists. Find:
```tsx
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onCloseMobile?.()}
              className={`sidebar-link ${active ? 'active-link' : ''}`}
```
Replace with:
```tsx
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onCloseMobile?.()}
              className={`sidebar-link ${active ? 'active-link' : ''}`}
              {...('tourId' in link && link.tourId ? { 'data-tour': link.tourId } : {})}
```

- [ ] Commit:
```bash
git add src/components/DashboardNav.tsx
git commit -m "feat: add data-tour attributes to DashboardNav links"
```

---

### Task 9: Add "Repasar tour" button in Settings

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] Add import at top:
```tsx
import { useTour } from '@/components/Tour';
```

- [ ] Inside the component, add:
```tsx
  const { startTour } = useTour();
```

- [ ] Find the preferences tab content and add the button somewhere visible (e.g. near the top of the tab). After the tab header section, add:
```tsx
        {/* Tour replay */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'var(--color-bg-card-hover)',
          borderRadius: 12, border: '1px solid var(--color-border-main)',
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--color-txt-primary)', marginBottom: 2 }}>
              Tour de bienvenida
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-muted)' }}>
              Repasá las funcionalidades de PulseGuard
            </div>
          </div>
          <button
            onClick={startTour}
            className="btn-glass"
            style={{ height: 34, fontSize: 12, padding: '0 14px', borderRadius: 8, flexShrink: 0 }}
          >
            Repasar tour
          </button>
        </div>
```

- [ ] Commit:
```bash
git add "src/app/(dashboard)/settings/page.tsx"
git commit -m "feat: add replay tour button in Settings"
```

---

### Task 10: Push all changes

- [ ] Push:
```bash
git push
```
