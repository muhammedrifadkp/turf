'use client';

import React from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePwaInstall } from './usePwaInstall';
import { motion, AnimatePresence } from 'framer-motion';

interface InstallAppButtonProps {
  variant?: 'navbar' | 'sidebar' | 'icon-only';
  className?: string;
}

export default function InstallAppButton({ variant = 'navbar', className = '' }: InstallAppButtonProps) {
  const { showInstallIcon, triggerInstall, showIosModal, setShowIosModal } = usePwaInstall();

  if (!showInstallIcon) return null;

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={triggerInstall}
          title="Install Orion Turf App"
          className={`w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/80 text-emerald-700 font-extrabold text-xs transition-all flex items-center justify-center space-x-2 shadow-2xs active:scale-[0.98] ${className}`}
        >
          <Download className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Install App</span>
        </button>
      ) : variant === 'icon-only' ? (
        <button
          onClick={triggerInstall}
          title="Install App"
          className={`p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 transition-all flex items-center justify-center shadow-2xs active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4 text-emerald-600" />
        </button>
      ) : (
        <button
          onClick={triggerInstall}
          title="Install App"
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-bold transition-all shadow-2xs active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0" />
          <span className="hidden sm:inline text-xs font-extrabold text-emerald-800">Install</span>
        </button>
      )}

      {/* iOS Step-by-Step Installation Modal */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Install on iOS Safari</h3>
                </div>
                <button
                  onClick={() => setShowIosModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <p>Follow these simple steps to install Orion Turf on your iPhone or iPad:</p>
                <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>
                      Tap the <Share className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" /> <strong>Share</strong> icon in Safari bottom bar.
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>
                      Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" /> <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>
                      Tap <strong>Add</strong> in the top right corner.
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
