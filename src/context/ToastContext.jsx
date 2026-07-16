import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full p-4" dir="rtl">
        {toasts.map(toast => {
          let bgClass = "bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-500/20 text-emerald-700 dark:text-emerald-300";
          let Icon = CheckCircle2;
          
          if (toast.type === 'error') {
            bgClass = "bg-red-50/90 dark:bg-red-950/90 border-red-500/20 text-red-700 dark:text-red-300";
            Icon = AlertCircle;
          } else if (toast.type === 'info') {
            bgClass = "bg-primary-container/90 border-primary/20 text-primary";
            Icon = Info;
          }

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 animate-scale-up ${bgClass}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className="shrink-0" />
                <span className="text-xs font-bold leading-relaxed">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
