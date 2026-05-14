'use client';

import { useToastStore } from '@/src/stores/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : '🎵'}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
