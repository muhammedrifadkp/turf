'use client';

import { useEffect } from 'react';

// Capture beforeinstallprompt early if it fires before React mounts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as unknown as { deferredPwaPrompt?: Event }).deferredPwaPrompt = e;
  });
}

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
