'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Orion Turf PWA ServiceWorker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Orion Turf PWA ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
