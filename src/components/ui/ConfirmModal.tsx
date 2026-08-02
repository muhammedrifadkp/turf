'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm?: () => void | Promise<void>;
  isAlertOnly?: boolean;
}

export interface AlertOptions {
  title?: string;
  message: string;
  variant?: ConfirmVariant;
  buttonText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (messageOrOptions: string | AlertOptions, title?: string, variant?: ConfirmVariant) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
    isLoading: false,
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options: { ...options, isAlertOnly: false },
        resolve,
        isLoading: false,
      });
    });
  };

  const alert = (
    messageOrOptions: string | AlertOptions,
    title?: string,
    variant?: ConfirmVariant
  ): Promise<void> => {
    return new Promise((resolve) => {
      let opts: ConfirmOptions;
      if (typeof messageOrOptions === 'string') {
        opts = {
          title: title || 'Notice',
          message: messageOrOptions,
          confirmText: 'OK',
          variant: variant || 'info',
          isAlertOnly: true,
        };
      } else {
        opts = {
          title: messageOrOptions.title || 'Notice',
          message: messageOrOptions.message,
          confirmText: messageOrOptions.buttonText || 'OK',
          variant: messageOrOptions.variant || 'info',
          isAlertOnly: true,
        };
      }

      setModalState({
        isOpen: true,
        options: opts,
        resolve: () => resolve(),
        isLoading: false,
      });
    });
  };

  const handleClose = (result: boolean) => {
    if (modalState.resolve) {
      modalState.resolve(result);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: null, isLoading: false }));
  };

  const handleConfirmAction = async () => {
    if (modalState.options.onConfirm) {
      try {
        setModalState((prev) => ({ ...prev, isLoading: true }));
        await modalState.options.onConfirm();
      } catch (err) {
        console.error('Confirmation action error:', err);
      }
    }
    handleClose(true);
  };

  const variant = modalState.options.variant || (modalState.options.isAlertOnly ? 'info' : 'danger');

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          Icon: AlertTriangle,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
          confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20',
          Icon: AlertCircle,
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
          Icon: CheckCircle2,
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-sky-100 text-sky-600 border-sky-200',
          confirmBtn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
          Icon: Info,
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = styles.Icon;

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Confirmation & Alert Modal Popup Overlay */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 transform transition-all animate-slide-up sm:animate-fade-in">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Top Close Button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-7 space-y-5">
              {/* Variant Icon Header */}
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${styles.iconBg}`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {modalState.options.title}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    {modalState.options.isAlertOnly ? 'System Notification' : 'Confirmation Required'}
                  </span>
                </div>
              </div>

              {/* Message Description */}
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {modalState.options.message}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                {!modalState.options.isAlertOnly && (
                  <button
                    type="button"
                    disabled={modalState.isLoading}
                    onClick={() => handleClose(false)}
                    className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {modalState.options.cancelText || 'Cancel'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={modalState.isLoading}
                  onClick={handleConfirmAction}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wide shadow-md transition-all cursor-pointer flex items-center space-x-2 ${styles.confirmBtn} disabled:opacity-50`}
                >
                  {modalState.isLoading ? (
                    <span className="inline-block animate-spin">⏳</span>
                  ) : null}
                  <span>{modalState.options.confirmText || (modalState.options.isAlertOnly ? 'OK' : 'Confirm')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function useAlert() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useAlert must be used within a ConfirmProvider');
  }
  return context.alert;
}

export function usePopup() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('usePopup must be used within a ConfirmProvider');
  }
  return {
    confirm: context.confirm,
    alert: context.alert,
  };
}
