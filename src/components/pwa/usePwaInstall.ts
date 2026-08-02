'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredPwaPrompt?: BeforeInstallPromptEvent;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // 1. Check if running as standalone PWA (already installed & opened as App)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    // 2. Check if iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // 3. Check local storage install state
    if (localStorage.getItem('turf_pwa_installed') === 'true') {
      setIsInstalled(true);
    }

    // 4. Check if prompt was captured early on window
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
    }

    // 5. Listen for beforeinstallprompt event (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 6. Listen for appinstalled event
    const handleAppInstalled = () => {
      window.deferredPwaPrompt = undefined;
      setDeferredPrompt(null);
      setIsInstalled(true);
      localStorage.setItem('turf_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    const promptEvent = deferredPrompt || window.deferredPwaPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('turf_pwa_installed', 'true');
          setDeferredPrompt(null);
          window.deferredPwaPrompt = undefined;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      alert('To install Orion Turf app:\nOpen your browser menu (⋮ or ⋯) and select "Install App" or "Add to Home Screen".');
    }
  }, [deferredPrompt, isIos]);

  // Icon should ONLY show for website (browser) users:
  // - MUST NOT be in standalone mode
  // - MUST NOT be already installed
  // - MUST be mounted in browser
  const showInstallIcon = mounted && !isStandalone && !isInstalled;

  return {
    showInstallIcon,
    triggerInstall,
    isIos,
    showIosModal,
    setShowIosModal,
    isPromptReady: Boolean(deferredPrompt || window.deferredPwaPrompt),
  };
}
