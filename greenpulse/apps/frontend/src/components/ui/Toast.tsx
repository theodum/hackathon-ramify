// =============================================================
// GREENPULSE — Toast / Notification system
// =============================================================

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

// ─────────────────────────────────────────
// Context
// ─────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─────────────────────────────────────────
// Config
// ─────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, {
  icon: React.ElementType;
  accent: string;
  bg: string;
  border: string;
  iconColor: string;
}> = {
  success: {
    icon: CheckCircle2,
    accent: '#10b981',
    bg: 'bg-gray-900',
    border: 'border-emerald-500/40',
    iconColor: 'text-emerald-400',
  },
  error: {
    icon: XCircle,
    accent: '#ef4444',
    bg: 'bg-gray-900',
    border: 'border-red-500/40',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    accent: '#f59e0b',
    bg: 'bg-gray-900',
    border: 'border-amber-500/40',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    accent: '#3b82f6',
    bg: 'bg-gray-900',
    border: 'border-blue-500/40',
    iconColor: 'text-blue-400',
  },
};

const AUTO_DISMISS_MS = 4_000;

// ─────────────────────────────────────────
// Single Toast item component
// ─────────────────────────────────────────

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const cfg = TOAST_CONFIG[item.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-xl shadow-black/40
        min-w-[300px] max-w-[400px] cursor-default select-none
        ${cfg.bg} ${cfg.border}
      `}
      style={{ borderLeftWidth: 3, borderLeftColor: cfg.accent }}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.iconColor}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
        {item.message && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.message}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-0.5 rounded text-gray-600 hover:text-gray-300 transition-colors"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Provider
// ─────────────────────────────────────────

let _counter = 0;
function uniqueId() {
  return `toast-${++_counter}-${Date.now()}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = uniqueId();
      setToasts((prev) => [...prev, { id, type, title, message }]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const toast = {
    success: (title: string, message?: string) => add('success', title, message),
    error: (title: string, message?: string) => add('error', title, message),
    warning: (title: string, message?: string) => add('warning', title, message),
    info: (title: string, message?: string) => add('info', title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — bottom right */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((item) => (
            <div key={item.id} className="pointer-events-auto">
              <ToastCard item={item} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────
// Hook
// ─────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
