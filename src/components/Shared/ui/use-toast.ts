import { useState } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((current) => [...current, { ...newToast, id }]);
  };

  const dismiss = (id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  return { toast, dismiss, toasts };
} 