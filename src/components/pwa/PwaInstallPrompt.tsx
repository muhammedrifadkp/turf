'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if app is already in standalone mode (installed & opened as app)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Don't prompt if user dismissed recently (in last 7 days)
    const lastDismissed = localStorage.getItem('turf_pwa_dismissed');
    if (lastDismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 3600 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for beforeinstallprompt event (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show iOS tip if iOS and not standalone
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('turf_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-16 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-50"
      >
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex flex-col space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-emerald-400/30 shrink-0">
                ⚽
              </div>
              <div>
                <h4 className="font-bold text-sm text-white leading-tight">Install TurfArena App</h4>
                <p className="text-xs text-slate-300">
                  Launch directly from your home screen like a native app.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prompt Action: Chrome/Android Native Prompt */}
          {deferredPrompt && (
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-emerald-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Install Application</span>
              </button>
              <button
                onClick={handleDismiss}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors"
              >
                Not Now
              </button>
            </div>
          )}

          {/* Prompt Action: iOS Instructions */}
          {isIos && !deferredPrompt && (
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50 text-[11px] text-slate-200 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
                <Smartphone className="w-3.5 h-3.5" />
                <span>How to install on iOS:</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="flex items-center space-x-1">
                  1. Tap Share <Share className="w-3 h-3 inline text-emerald-400 mx-0.5" />
                </span>
                <span>2. Select Add to Home Screen <PlusSquare className="w-3 h-3 inline text-emerald-400 mx-0.5" /></span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
