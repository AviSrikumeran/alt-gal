'use client';
import { useEffect } from 'react';
import { useToastStore } from './toastStore';

function ToastRow({ id }: { id: number }) {
  const toast = useToastStore((s) => s.toasts.find((t) => t.id === id));
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(id), toast.ttl);
    return () => clearTimeout(timer);
  }, [id, toast, dismiss]);

  if (!toast) return null;
  return (
    <div className="alt-toast" data-tone={toast.tone} role="status">
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          className="alt-btn"
          data-kind="ghost"
          onClick={() => {
            toast.onAction?.();
            dismiss(id);
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button type="button" className="alt-toast__close" aria-label="Dismiss" onClick={() => dismiss(id)}>
        ×
      </button>
    </div>
  );
}

export default function Toasts() {
  const ids = useToastStore((s) => s.toasts.map((t) => t.id).join(','));
  const list = ids ? ids.split(',').map(Number) : [];
  return (
    <div className="alt-toastrail" aria-live="polite">
      {list.map((id) => (
        <ToastRow key={id} id={id} />
      ))}
    </div>
  );
}
