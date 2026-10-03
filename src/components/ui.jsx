import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { initials, stLabel } from '../lib/format';

const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  orders: 'M7 3h10l3 3v15H4V3h3zM8 9h8M8 13h8M8 17h5',
  brands: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  catalog: 'M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4',
  clients: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  money: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  site: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5 9-10', back: 'M15 18l-6-6 6-6', next: 'M9 18l6-6-6-6',
  upload: 'M12 15V3M7 8l5-5 5 5M4 15v5h16v-5', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  more: 'M4 6h16M4 12h16M4 18h16', store: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  shield: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z', inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v7H2v-7z', file: 'M14 3H6v18h12V7zM14 3v4h4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  cart: 'M3 4h2l2.4 11h11L21 7H6.2M9 20h.01M18 20h.01', trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
};
export const Icon = ({ n, size }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
    <path d={P[n]} />
  </svg>
);

export function BrandMark({ b, size = 'm' }) {
  if (!b) return null;
  return (
    <div className={'bm bm-' + size} style={{ '--c': b.color || '#1B5E86' }} title={b.name}>
      {b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : initials(b.name)}
    </div>
  );
}

export const Pill = ({ k, children }) => <span className={'pill ' + k}>{children || stLabel(k)}</span>;

export function Field({ label, hint, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Drawer({ title, sub, onClose, children, foot }) {
  useEffect(() => {
    const f = e => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', f); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="dhead">
          <div className="stack" style={{ gap: 6 }}>{sub}<h2>{title}</h2></div>
          <button className="btn sm close" onClick={onClose}><Icon n="x" />Cerrar</button>
        </div>
        <div className="dbody">{children}</div>
        {foot && <div className="dfoot">{foot}</div>}
      </div>
    </div>
  );
}

// Botón que pide confirmación en el mismo lugar (sin ventanitas del navegador).
export function ConfirmButton({ children, question = '¿Seguro?', yes = 'Sí, confirmar', onConfirm, className = 'btn danger' }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={className} onClick={() => setAsk(true)}>{children}</button>;
  return (
    <span className="row" style={{ gap: 8 }}>
      <b style={{ color: 'var(--bad)' }}>{question}</b>
      <button type="button" className="btn danger sm" onClick={() => { setAsk(false); onConfirm(); }}>{yes}</button>
      <button type="button" className="btn sm" onClick={() => setAsk(false)}>No</button>
    </span>
  );
}

export const Loading = ({ text = 'Cargando…' }) => <div className="loading" role="status">{text}</div>;

export function Empty({ title, text, action }) {
  return <div className="empty"><b style={{ color: 'var(--ink)', fontSize: 20 }}>{title}</b>{text && <p>{text}</p>}{action}</div>;
}

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  const show = m => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 3200); };
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export function FileButton({ label, accept, onFile, busy }) {
  return (
    <label className="btn sm" style={{ cursor: 'pointer' }}>
      <Icon n="upload" />{busy ? 'Subiendo…' : label}
      <input type="file" accept={accept} hidden disabled={busy} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
    </label>
  );
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}
