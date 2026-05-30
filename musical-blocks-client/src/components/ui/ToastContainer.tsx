'use client';

import { useToastStore } from '@/src/stores/toastStore';
import { AlertIcon, CheckIcon, MusicIcon } from './Icons';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'error' ? (
              <AlertIcon size={16} />
            ) : toast.type === 'success' ? (
              <CheckIcon size={16} />
            ) : (
              <MusicIcon size={16} />
            )}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

