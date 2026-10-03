export const fmt = n => '$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR');
export const fmtShort = n => (n >= 1e6 ? '$ ' + (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M' : '$ ' + Math.round(n / 1e3).toLocaleString('es-AR') + ' mil');
export const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const fdate = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const longDate = d => { const x = new Date(d + 'T12:00:00'); return `${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`; };
export const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const initials = s => String(s || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
export const cleanHost = h => String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

export const STATUSES = [
  { k: 'recibido', l: 'Recibido', help: 'El cliente lo mandó desde la tienda. Revisalo y confirmalo.' },
  { k: 'confirmado', l: 'Confirmado', help: 'Ya se lo pasaste a la empresa.' },
  { k: 'facturado', l: 'Facturado', help: 'La empresa emitió la factura.' },
  { k: 'entregado', l: 'Entregado', help: 'El cliente recibió la mercadería.' },
  { k: 'cobrado', l: 'Cobrado', help: 'La empresa cobró el pedido.' },
];
export const stLabel = k => (STATUSES.find(s => s.k === k) || {}).l || k;

export const STAGES = [
  { k: 'pedido', l: 'En pedido', d: 'Pedidos todavía sin facturar', c: 'var(--primary)' },
  { k: 'facturada', l: 'Facturada', d: 'Facturado o entregado, sin cobrar', c: 'var(--accent)' },
  { k: 'aliquidar', l: 'A cobrar', d: 'La empresa cobró; te tiene que pagar', c: 'var(--warn)' },
  { k: 'liquidada', l: 'Cobrada', d: 'Comisión que ya te pagaron', c: 'var(--ok)' },
];
export const stageOf = o => (o.commissionPaid ? 'liquidada' : o.status === 'cobrado' ? 'aliquidar' : ['facturado', 'entregado'].includes(o.status) ? 'facturada' : 'pedido');

export const subtotal = o => (o.items || []).reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
export const net = o => subtotal(o) * (1 - (Number(o.discount) || 0) / 100);
export const commOf = o => net(o) * (Number(o.commissionRate) || 0) / 100;
export const IVA = 0.21;

export const DOC_TYPES = ['Factura A', 'Factura B', 'Remito', 'Nota de crédito'];
export const PLANS = { prueba: 'Prueba gratis', inicial: 'Inicial', profesional: 'Profesional', agencia: 'Agencia' };
