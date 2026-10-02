// contexts/ToastContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_CONFIG: Record<ToastType, { icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  error: { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  success: { icon: CheckCircle, color: 'var(--primary)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
  info: { icon: Info, color: 'var(--muted-foreground)', bg: 'var(--muted)', border: 'var(--border)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 2000,
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
        }}
      >
        {toasts.map((toast) => {
          const cfg = TOAST_CONFIG[toast.type];
          const Icon = cfg.icon;
          return (
            <div
              key={toast.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                backgroundColor: 'var(--card)', border: `1px solid ${cfg.border}`,
                borderRadius: 10, padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                fontFamily: 'Inter, sans-serif', animation: 'toastSlideIn 0.2s ease-out',
              }}
            >
              <div style={{
                backgroundColor: cfg.bg, borderRadius: 6, padding: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} style={{ color: cfg.color }} />
              </div>
              <p style={{
                fontSize: '0.83rem', color: 'var(--foreground)', lineHeight: 1.4,
                flex: 1, marginTop: 2,
              }}>
                {toast.message}
              </p>
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted-foreground)', padding: 2, flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}