import { useId } from 'react';

// Isotipo: un nodo central (el representante) conectado a marcas y clientes.
export function LogoMark({ size = 40, light = false }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Representaciones comerciales" style={{ flex: 'none', display: 'block' }}>
      <defs>
        <linearGradient id={'g' + id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F4FD8" />
          <stop offset="1" stopColor="#12B5CB" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={light ? '#FFFFFF' : `url(#g${id})`} />
      <g stroke={light ? '#1F4FD8' : '#FFFFFF'} strokeWidth="3.2" strokeLinecap="round" opacity=".9">
        <path d="M32 33 L17 19" /><path d="M32 33 L47 19" /><path d="M32 33 L20 48" /><path d="M32 33 L44 48" />
      </g>
      <g fill={light ? '#1F4FD8' : '#FFFFFF'}>
        <circle cx="17" cy="19" r="4.6" /><circle cx="47" cy="19" r="4.6" />
        <circle cx="20" cy="48" r="4" opacity=".85" /><circle cx="44" cy="48" r="4" opacity=".85" />
      </g>
      <circle cx="32" cy="33" r="7.5" fill={light ? '#12B5CB' : '#FFFFFF'} />
      <circle cx="32" cy="33" r="3.2" fill={light ? '#FFFFFF' : '#12B5CB'} />
    </svg>
  );
}

export default function Logo({ size = 40, light = false, compact = false }) {
  return (
    <span className="logo-full" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: light ? '#fff' : 'var(--ink)' }}>
      <LogoMark size={size} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.02 }}>
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: size * 0.5, letterSpacing: '-.02em' }}>Representaciones</span>
        {!compact && <span style={{ fontFamily: 'var(--display)', fontWeight: 500, fontSize: size * 0.36, letterSpacing: '.18em', textTransform: 'uppercase', color: light ? '#9FE7F2' : 'var(--accent-2)' }}>comerciales</span>}
      </span>
    </span>
  );
}
