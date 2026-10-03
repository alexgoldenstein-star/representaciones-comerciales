// Manifest de la app instalable, personalizado por vendedor:
// /api/manifest?start=/v/garcia/tienda&name=García%20Representaciones&color=%231F4FD8
export default function handler(req, res) {
  const q = req.query || {};
  const start = typeof q.start === 'string' && q.start.startsWith('/') && !q.start.startsWith('//') ? q.start : '/panel';
  const name = String(q.name || 'Representaciones comerciales').slice(0, 60);
  const color = /^#[0-9a-fA-F]{6}$/.test(q.color || '') ? q.color : '#1F4FD8';
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(JSON.stringify({
    id: start,
    name,
    short_name: name.length > 14 ? name.split(' ')[0] : name,
    start_url: start,
    scope: '/',
    display: 'standalone',
    background_color: '#F5F8FC',
    theme_color: color,
    lang: 'es-AR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }));
}
