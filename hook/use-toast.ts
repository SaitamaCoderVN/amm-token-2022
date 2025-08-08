import { useState, useEffect, useCallback } from 'react';

type ToastType = 'default' | 'destructive' | 'success';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: React.ReactNode;
}

interface ToastOptions {
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: React.ReactNode;
}

const TOAST_TIMEOUT = 5000;

let count = 0;

function generateToastId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${count}`;
}

const toastState = {
  toasts: [] as Toast[],
  subscribers: new Set<(toasts: Toast[]) => void>(),
};

function notify(options: ToastOptions) {
  const toast: Toast = {
    id: generateToastId(),
    title: options.title,
    description: options.description,
    type: options.type || 'default',
    duration: options.duration || TOAST_TIMEOUT,
    action: options.action,
  };

  toastState.toasts = [...toastState.toasts, toast];
  toastState.subscribers.forEach((subscriber) => subscriber(toastState.toasts));

  if (toast.duration && toast.duration > 0) {
    setTimeout(() => {
      dismiss(toast.id);
    }, toast.duration);
  }

  return toast.id;
}

function dismiss(toastId: string) {
  toastState.toasts = toastState.toasts.filter((t) => t.id !== toastId);
  toastState.subscribers.forEach((subscriber) => subscriber(toastState.toasts));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState.toasts);

  useEffect(() => {
    function handleToastsChange(newToasts: Toast[]) {
      setToasts([...newToasts]);
    }

    toastState.subscribers.add(handleToastsChange);
    return () => {
      toastState.subscribers.delete(handleToastsChange);
    };
  }, []);

  const toast = useCallback((options: ToastOptions) => notify(options), []);
  const dismissToast = useCallback((toastId: string) => dismiss(toastId), []);

  return {
    toast,
    dismiss: dismissToast,
    toasts,
  };
}
