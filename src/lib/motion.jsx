import { useEffect, useRef, useState } from 'react';

// Hace aparecer suavemente los elementos con clase "reveal" cuando entran en pantalla.
export function initReveal() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-reveal');
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  const scan = root => root.querySelectorAll?.('.reveal:not(.in)').forEach(el => io.observe(el));
  scan(document);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.classList.contains('reveal')) io.observe(n); scan(n); } })))
    .observe(document.body, { childList: true, subtree: true });
  // Por si algo quedó oculto (pestaña en segundo plano, captura de pantalla), lo mostramos igual.
  setTimeout(() => document.querySelectorAll('.reveal:not(.in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight) el.classList.add('in'); }), 1500);
}

// Número que cuenta hasta su valor cuando aparece.
export function CountUp({ to, prefix = '', suffix = '', duration = 1400, decimals = 0 }) {
  const ref = useRef(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    setV(0);
    let raf; const el = ref.current;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const tick = t => { const k = Math.min(1, (t - t0) / duration); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{prefix}{Number(v).toLocaleString('es-AR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>;
}
