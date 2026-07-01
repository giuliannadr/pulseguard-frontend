'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useTour } from './TourProvider';
import { TOUR_STEPS } from '@/lib/tour-steps';

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 12;

function getTargetRect(target: string | null): Rect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (
    r.width === 0 || r.height === 0 ||
    r.right < 0 || r.left > window.innerWidth ||
    r.bottom < 0 || r.top > window.innerHeight
  ) return null;
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

export function TourSpotlight() {
  const { active, stepIndex, totalSteps, skipTour, nextStep, prevStep } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);

  const step = TOUR_STEPS[stepIndex];
  const isCentered = !step?.target;
  const isLast = stepIndex === totalSteps - 1;
  const hasSpotlight = !isCentered && rect !== null;

  const updateRect = useCallback(() => {
    if (!step) return;
    setRect(getTargetRect(step.target));
  }, [step]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, updateRect]);

  // Open/close the sidebar drawer for nav steps (works on mobile AND desktop drawer)
  useEffect(() => {
    if (!active || !step) {
      window.dispatchEvent(new CustomEvent('pg:tour-sidebar', { detail: { open: false } }));
      return;
    }
    const isNavStep = !!step.target?.startsWith('nav-');
    window.dispatchEvent(new CustomEvent('pg:tour-sidebar', { detail: { open: isNavStep } }));
    if (isNavStep) {
      // Re-measure after drawer animation completes
      const t = setTimeout(() => updateRect(), 350);
      return () => clearTimeout(t);
    }
  }, [active, step, updateRect]);

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

  // The card is ALWAYS centered using a flex wrapper — never positioned
  // relative to the spotlight. This avoids cut-off on any screen size.
  // The spotlight hole is rendered independently behind the card.
  const card = (
    <div
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 20,
        padding: '24px 28px',
        width: 420,
        maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(124,58,237,0.15)',
        animation: 'pg-fade-in 0.25s ease-out both',
        position: 'relative',
      }}
    >
      {/* X */}
      <button
        onClick={skipTour}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#9CA3AF', padding: 4, lineHeight: 1, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        title="Saltar tour"
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Counter */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7C3AED',
        fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12,
        background: '#EEE9FF', display: 'inline-block',
        padding: '3px 10px', borderRadius: 20,
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
        margin: '0 0 20px', lineHeight: 1.7,
      }}>
        {step.description}
      </p>

      {/* Nav buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {stepIndex > 0 && (
          <button
            onClick={prevStep}
            style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid #E5E7EB',
              color: '#6B7280', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}
          >
            ← Anterior
          </button>
        )}

        {isLast ? (
          <Link href="/import" onClick={skipTour} style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{
              width: '100%', height: 36, padding: '0 20px', borderRadius: 8,
              background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
              border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            }}>
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
              fontFamily: 'var(--font-body)', padding: '0 4px', flexShrink: 0,
            }}
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(
    <>
      {/* Layer 1 — dark overlay. When spotlight active, it's transparent so
          the hole's box-shadow provides the dimming instead. */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: hasSpotlight ? 'transparent' : 'rgba(0,0,0,0.65)',
          pointerEvents: 'all',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Layer 2 — spotlight hole. box-shadow creates the dim ring around it. */}
      {hasSpotlight && rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top, left: rect.left,
            width: rect.width, height: rect.height,
            borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            zIndex: 10000,
            pointerEvents: 'none',
            transition: 'top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1), width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* Layer 3 — card, always flex-centered so it's never clipped */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'all' }}>{card}</div>
      </div>
    </>,
    document.body
  );
}
