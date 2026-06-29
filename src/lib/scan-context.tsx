'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ScanStatus = 'idle' | 'scanning' | 'done';

interface ScanState {
  status: ScanStatus;
  count: number;
}

interface ScanContextValue {
  scan: ScanState;
  startScan: (task: () => Promise<{ count: number }>) => void;
  clearDone: () => void;
}

const ScanContext = createContext<ScanContextValue>({
  scan: { status: 'idle', count: 0 },
  startScan: () => {},
  clearDone: () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scan, setScan] = useState<ScanState>({ status: 'idle', count: 0 });
  const runningRef = useRef(false);

  const startScan = useCallback((task: () => Promise<{ count: number }>) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setScan({ status: 'scanning', count: 0 });
    task()
      .then(({ count }) => setScan({ status: 'done', count }))
      .catch(() => setScan({ status: 'done', count: 0 }))
      .finally(() => { runningRef.current = false; });
  }, []);

  const clearDone = useCallback(() => {
    setScan({ status: 'idle', count: 0 });
  }, []);

  return (
    <ScanContext.Provider value={{ scan, startScan, clearDone }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  return useContext(ScanContext);
}
