'use client';

import { Toaster } from 'sileo';
import { useEffect, useState } from 'react';

export function SileoToaster() {
  const [offset, setOffset] = useState(16);

  useEffect(() => {
    function update() {
      setOffset(window.innerWidth <= 768 ? 72 : 16);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return <Toaster position="top-center" theme="system" offset={offset} />;
}
