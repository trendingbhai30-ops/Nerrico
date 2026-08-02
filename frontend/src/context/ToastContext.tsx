import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { TOAST_DURATION_MS } from '../config/constants';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after a few seconds
    setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION_MS);
  }, [removeToast]);

  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-[#1C0F13]/95 border-red-500/40 text-red-200'
                : toast.type === 'success'
                ? 'bg-[#0F1C14]/95 border-emerald-500/40 text-emerald-200'
                : 'bg-[#18181B]/95 border-zinc-700 text-zinc-200'
            }`}
          >
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-[#FFD60A] shrink-0 mt-0.5" />}
            
            <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
