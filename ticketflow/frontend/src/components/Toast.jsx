import { useEffect } from 'react';

// Piccola notifica temporanea (successo/errore).
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return <div className={`toast toast--${toast.type}`}>{toast.message}</div>;
}
