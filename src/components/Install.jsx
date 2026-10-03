import { useEffect, useState } from 'react';
import { Icon } from './ui';

// Guarda el aviso de instalación de Chrome/Android para mostrar nuestro propio botón.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; window.dispatchEvent(new Event('rc-install-ready')); });
}

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Cambia el manifest de la página para que la app instalada abra en la dirección correcta.
export function useAppManifest({ start, name, color }) {
  useEffect(() => {
    const link = document.getElementById('app-manifest');
    const title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!link) return;
    const prev = link.getAttribute('href'); const prevTitle = title?.getAttribute('content');
    if (import.meta.env.PROD) link.setAttribute('href', `/api/manifest?start=${encodeURIComponent(start)}&name=${encodeURIComponent(name)}&color=${encodeURIComponent(color || '#1F4FD8')}`);
    if (title) title.setAttribute('content', name);
    return () => { link.setAttribute('href', prev); if (title && prevTitle) title.setAttribute('content', prevTitle); };
  }, [start, name, color]);
}

// Tarjeta "Instalá la app": botón en Android/Chrome e instrucciones en iPhone.
export function InstallCard({ title = 'Instalá la app en tu celular', text, storageKey = 'rc-install-hidden' }) {
  const [ready, setReady] = useState(!!(typeof window !== 'undefined' && window.__installPrompt));
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(storageKey) === '1'; } catch (e) { return false; } });
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => { const f = () => setReady(true); window.addEventListener('rc-install-ready', f); return () => window.removeEventListener('rc-install-ready', f); }, []);
  if (hidden || isStandalone()) return null;
  const install = async () => {
    const p = window.__installPrompt;
    if (!p) { setShowHelp(true); return; }
    p.prompt(); await p.userChoice.catch(() => null); window.__installPrompt = null; setReady(false);
  };
  const hide = () => { setHidden(true); try { localStorage.setItem(storageKey, '1'); } catch (e) { /* nada */ } };
  return (
    <div className="card pad stack install-card" style={{ gap: 12 }}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="install-ico"><Icon n="store" /></span>
        <div className="grow"><h3>{title}</h3><p className="muted">{text || 'Queda como un ícono en la pantalla de inicio y abre directo, sin buscar el link.'}</p></div>
      </div>
      <div className="row">
        {ready ? <button className="btn primary" onClick={install}>Instalar la app</button> : <button className="btn primary" onClick={() => setShowHelp(s => !s)}>Cómo instalarla</button>}
        <button className="btn link" onClick={hide}>No mostrar más</button>
      </div>
      {showHelp && (
        isIOS() ? <ol className="install-steps"><li>Abrí esta página en <b>Safari</b>.</li><li>Tocá el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li><li>Elegí <b>“Agregar a inicio”</b> y tocá <b>Agregar</b>.</li></ol>
          : <ol className="install-steps"><li>Abrí esta página en <b>Chrome</b>.</li><li>Tocá los <b>tres puntitos</b> arriba a la derecha.</li><li>Elegí <b>“Instalar app”</b> o <b>“Agregar a la pantalla principal”</b>.</li></ol>
      )}
    </div>
  );
}
