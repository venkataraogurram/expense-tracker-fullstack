import { useEffect } from 'react';

// Small self-dismissing notification, bottom-centre. One at a time is enough here.
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;

  return (
    <div key={toast.id} className={`toast ${toast.tone}`} role="status">
      {toast.message}
    </div>
  );
}
