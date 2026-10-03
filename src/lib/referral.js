// Código de quien recomendó la plataforma (?ref=codigo). Se guarda en el navegador por si la persona navega antes de registrarse.
export function captureRef() {
  try {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r) localStorage.setItem('rc-ref', r.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40));
  } catch (e) { /* nada */ }
}
export function getRef() {
  try { return localStorage.getItem('rc-ref') || ''; } catch (e) { return ''; }
}
export const refLink = code => `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
