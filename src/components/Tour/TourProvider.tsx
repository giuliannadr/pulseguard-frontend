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
