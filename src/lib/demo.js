// Demo completa para mostrar la plataforma funcionando.
// Marcas, artículos, clientes y pedidos son inventados (marcas ficticias) y quedan marcados con sample: true
// para poder borrarlos de una vez desde Mi sitio → Datos de ejemplo.
import { collection, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { createOrder } from './orders';
import { quote } from './terms';

const svgUrl = svg => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

// Logo simple de marca ficticia: isotipo + nombre.
function brandLogo(name, color, shape) {
  const shapes = {
    drop: '<path d="M40 14c10 13 16 22 16 30a16 16 0 0 1-32 0c0-8 6-17 16-30z" fill="#fff"/>',
    bulb: '<circle cx="40" cy="36" r="14" fill="#fff"/><rect x="33" y="52" width="14" height="8" rx="2" fill="#fff"/>',
    leaf: '<path d="M22 54C22 32 38 20 60 20c0 22-12 38-34 38z" fill="#fff"/>',
    wave: '<path d="M14 44c8-10 16-10 24 0s16 10 24 0" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M14 30c8-10 16-10 24 0s16 10 24 0" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>',
    pot: '<rect x="18" y="32" width="44" height="22" rx="6" fill="#fff"/><rect x="12" y="28" width="56" height="6" rx="3" fill="#fff"/>',
  };
  const words = name.split(' ');
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/><g transform="translate(50 18) scale(1.25)"><rect width="80" height="80" rx="20" fill="${color}"/>${shapes[shape]}</g><text x="100" y="150" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${color}">${words[0]}</text><text x="100" y="178" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="400" fill="${color}">${words.slice(1).join(' ')}</text></svg>`);
}

// Imagen de producto ilustrada (sin fotos reales).
const ICONS = {
  termo: '<rect x="150" y="70" width="100" height="170" rx="22"/><rect x="165" y="44" width="70" height="30" rx="8"/>',
  mate: '<path d="M140 120h120l-14 110a20 20 0 0 1-20 18h-52a20 20 0 0 1-20-18z"/><rect x="215" y="60" width="10" height="90" rx="5"/>',
  botella: '<rect x="160" y="90" width="80" height="160" rx="26"/><rect x="178" y="56" width="44" height="40" rx="8"/>',
  lampara: '<circle cx="200" cy="130" r="62"/><rect x="172" y="186" width="56" height="50" rx="8"/>',
  panel: '<rect x="110" y="80" width="180" height="140" rx="14"/><rect x="128" y="98" width="144" height="104" rx="6" opacity=".55"/>',
  reflector: '<rect x="120" y="80" width="160" height="110" rx="14"/><rect x="190" y="190" width="20" height="50"/><rect x="150" y="236" width="100" height="12" rx="6"/>',
  canilla: '<rect x="180" y="150" width="40" height="100" rx="10"/><path d="M200 150V90h80v30" fill="none" stroke-width="22" stroke-linecap="round"/>',
  ducha: '<circle cx="230" cy="100" r="44"/><path d="M200 120V250" stroke-width="18" fill="none" stroke-linecap="round"/>',
  sabana: '<rect x="100" y="110" width="200" height="110" rx="18"/><rect x="100" y="110" width="200" height="34" rx="14" opacity=".55"/>',
  toalla: '<rect x="130" y="80" width="140" height="170" rx="16"/><rect x="130" y="210" width="140" height="16" opacity=".55"/>',
  olla: '<rect x="120" y="130" width="160" height="100" rx="20"/><rect x="104" y="118" width="192" height="18" rx="9"/><rect x="180" y="96" width="40" height="18" rx="9"/>',
  sarten: '<circle cx="180" cy="160" r="70"/><rect x="240" y="150" width="100" height="20" rx="10"/>',
  plato: '<circle cx="200" cy="160" r="80"/><circle cx="200" cy="160" r="48" opacity=".55"/>',
};
function productImage(kind, color) {
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3F6FB"/><stop offset="1" stop-color="#E3EAF5"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="330" cy="40" r="90" fill="${color}" opacity=".08"/><g fill="${color}" stroke="${color}">${ICONS[kind] || ICONS.plato}</g></svg>`);
}

const BRANDS = [
  { key: 'ta', name: 'Termo Andino', tag: 'Termos, mates y botellas térmicas', color: '#1F6F5C', shape: 'leaf', commission: 6,
    cond: { lista: 'Lista N° 14 · octubre', descuento: 8, plazo: '30 días fecha factura', minimo: 300000, flete: 'Sin cargo desde $ 500.000 en AMBA', pago: 'Transferencia o e-cheq', entrega: '5 a 7 días hábiles', iva: 'Precios + IVA 21%',
      pagos: [{ nombre: 'Contado (transferencia)', ajuste: 5 }, { nombre: '30 días', ajuste: 0 }, { nombre: 'e-cheq 60 días', ajuste: -3 }], escalas: [{ desde: 800000, extra: 3 }, { desde: 1500000, extra: 5 }] },
    items: [['TA-100', 'Termo acero 1 L pico cebador', 28900, 6, 'termo'], ['TA-110', 'Termo acero 1,2 L con manija', 31500, 6, 'termo'], ['TA-205', 'Mate de acero doble pared', 8900, 12, 'mate'], ['TA-210', 'Mate de calabaza forrado', 7400, 12, 'mate'], ['TA-300', 'Botella térmica 750 ml', 17400, 12, 'botella'], ['TA-310', 'Botella térmica 500 ml infantil', 13900, 12, 'botella']] },
  { key: 'lp', name: 'Luz del Plata', tag: 'Iluminación LED residencial y comercial', color: '#B45309', shape: 'bulb', commission: 5,
    cond: { lista: 'Lista N° 31 · septiembre', descuento: 12, plazo: '30 y 60 días', minimo: 250000, flete: 'Expreso a cargo del cliente', pago: 'Cheque o transferencia', entrega: '48 a 72 horas', iva: 'Precios + IVA 21%',
      pagos: [{ nombre: 'Contado', ajuste: 4 }, { nombre: '30 y 60 días', ajuste: 0 }], escalas: [{ desde: 600000, extra: 2 }] },
    items: [['LP-09W', 'Lámpara LED 9 W E27 luz fría', 1450, 50, 'lampara'], ['LP-12W', 'Lámpara LED 12 W E27 luz cálida', 1890, 50, 'lampara'], ['LP-P18', 'Panel LED 18 W de embutir', 6900, 20, 'panel'], ['LP-P24', 'Panel LED 24 W de aplicar', 8600, 20, 'panel'], ['LP-R50', 'Reflector LED 50 W exterior', 11800, 10, 'reflector'], ['LP-R100', 'Reflector LED 100 W exterior', 19900, 6, 'reflector']] },
  { key: 'dg', name: 'Delta Grifería', tag: 'Grifería y accesorios de baño y cocina', color: '#1D4ED8', shape: 'drop', commission: 4,
    cond: { lista: 'Lista N° 9 · agosto', descuento: 5, plazo: '45 días', minimo: 400000, flete: 'Sin cargo en CABA y GBA', pago: 'Transferencia o e-cheq', entrega: '7 días hábiles', iva: 'Precios + IVA 21%',
      pagos: [{ nombre: 'Contado', ajuste: 6 }, { nombre: '45 días', ajuste: 0 }], escalas: [] },
    items: [['DG-MC1', 'Monocomando cocina pico alto', 68500, 4, 'canilla'], ['DG-LV2', 'Monocomando lavatorio', 42900, 6, 'canilla'], ['DG-DU3', 'Juego de ducha con transferencia', 87300, 4, 'ducha'], ['DG-DU5', 'Flor de ducha cuadrada 20 cm', 23400, 6, 'ducha'], ['DG-FL4', 'Flexible mallado 40 cm', 2900, 30, 'canilla']] },
  { key: 'tp', name: 'Textil Pampa', tag: 'Blanquería, sábanas y toallas', color: '#9A3D4E', shape: 'wave', commission: 7,
    cond: { lista: 'Temporada primavera-verano', descuento: 10, plazo: '30, 60 y 90 días', minimo: 350000, flete: 'Sin cargo desde $ 600.000', pago: 'E-cheq', entrega: '10 días hábiles', iva: 'Precios + IVA 21%',
      pagos: [{ nombre: 'Contado', ajuste: 8 }, { nombre: '30/60/90 días', ajuste: 0 }], escalas: [{ desde: 1000000, extra: 4 }] },
    items: [['TP-S2P', 'Juego de sábanas 2 plazas 180 hilos', 24500, 6, 'sabana'], ['TP-S1P', 'Juego de sábanas 1½ plaza', 19800, 6, 'sabana'], ['TP-TB5', 'Toallón 500 g algodón', 9900, 12, 'toalla'], ['TP-TO5', 'Toalla de mano 500 g', 5400, 12, 'toalla'], ['TP-AC2', 'Acolchado reversible 2 plazas', 52400, 4, 'sabana']] },
  { key: 'bn', name: 'Bazar Norte', tag: 'Bazar, cocina y vajilla', color: '#5B4A8C', shape: 'pot', commission: 5,
    cond: { lista: 'Lista N° 22 · octubre', descuento: 6, plazo: '30 días', minimo: 200000, flete: 'Expreso a cargo del cliente', pago: 'Transferencia o e-cheq', entrega: '5 días hábiles', iva: 'Precios + IVA 21%',
      pagos: [{ nombre: 'Contado', ajuste: 5 }, { nombre: '30 días', ajuste: 0 }], escalas: [{ desde: 500000, extra: 3 }] },
    items: [['BN-OL24', 'Olla de acero 24 cm con tapa de vidrio', 33900, 6, 'olla'], ['BN-OL20', 'Olla de acero 20 cm', 27400, 6, 'olla'], ['BN-SA28', 'Sartén antiadherente 28 cm', 19500, 6, 'sarten'], ['BN-SA24', 'Sartén antiadherente 24 cm', 16200, 6, 'sarten'], ['BN-VJ18', 'Set de vajilla 18 piezas', 41200, 4, 'plato'], ['BN-CU24', 'Set de 24 cubiertos de acero', 15600, 8, 'plato']] },
];

const CLIENTS = [
  { k: 'c1', name: 'Ferretería El Tornillo', cuit: '30-71234567-8', city: 'Lanús, Buenos Aires', contact: 'Marcelo Ríos', phone: '1151234478', address: 'Av. Hipólito Yrigoyen 4520', status: 'activo',
    terms: { ta: { descuento: 12, extra: 2, plazo: '45 días', notas: 'Cliente histórico: paga siempre con e-cheq.' }, lp: { extra: 3 } } },
  { k: 'c2', name: 'Casa Moreno Bazar', cuit: '20-28765432-1', city: 'Rosario, Santa Fe', contact: 'Laura Moreno', phone: '3416120098', address: 'Córdoba 1850', status: 'activo',
    terms: { bn: { descuento: 10, minimo: 150000 } } },
  { k: 'c3', name: 'Hogar y Deco Palermo', cuit: '30-70987654-3', city: 'CABA', contact: 'Julián Pérez', phone: '1140332211', address: 'Gorriti 4870', status: 'activo', terms: {} },
  { k: 'c4', name: 'Distribuidora Sur', cuit: '30-69876543-2', city: 'Bahía Blanca, Buenos Aires', contact: 'Andrea Luna', phone: '2914557710', address: 'Brown 980', status: 'activo',
    terms: { tp: { descuento: 15, plazo: '60 días' }, ta: { extra: 2 } } },
  { k: 'c5', name: 'Mayorista La 25', cuit: '30-71555888-9', city: 'La Plata, Buenos Aires', contact: 'Paula Gómez', phone: '2215308812', address: 'Calle 25 N° 1340', status: 'activo', terms: {} },
  { k: 'c6', name: 'Mueblería Rivadavia', cuit: '20-31456789-0', city: 'Morón, Buenos Aires', contact: 'Sergio Díaz', phone: '1162113040', address: 'Rivadavia 17500', status: 'pendiente', terms: {} },
];

// Pedidos: [cliente, marca, meses atrás, día, estado, cantidades por artículo, forma de pago, comisión cobrada]
const ORDERS = [
  ['c1', 'ta', 5, 6, 'cobrado', [24, 12, 48, 0, 24], 'e-cheq 60 días', true],
  ['c2', 'bn', 5, 19, 'cobrado', [18, 12, 24, 0, 8, 16], 'Contado', true],
  ['c4', 'tp', 4, 4, 'cobrado', [24, 18, 36, 24, 8], '30/60/90 días', true],
  ['c3', 'lp', 4, 22, 'cobrado', [300, 200, 40, 20, 10], 'Contado', true],
  ['c5', 'dg', 3, 3, 'cobrado', [8, 12, 4, 6, 60], '45 días', true],
  ['c1', 'lp', 3, 17, 'cobrado', [250, 250, 40, 0, 20, 6], '30 y 60 días', true],
  ['c2', 'ta', 2, 8, 'cobrado', [36, 24, 60, 24, 24], 'Contado (transferencia)', false],
  ['c4', 'ta', 2, 15, 'cobrado', [48, 24, 72, 0, 36], '30 días', false],
  ['c5', 'tp', 2, 24, 'cobrado', [18, 12, 24, 12, 8], 'Contado', false],
  ['c3', 'bn', 1, 5, 'entregado', [12, 12, 18, 12, 8, 16], '30 días', false],
  ['c1', 'dg', 1, 12, 'entregado', [8, 12, 8, 6, 90], 'Contado', false],
  ['c2', 'lp', 1, 20, 'facturado', [500, 400, 80, 40, 20, 12], '30 y 60 días', false],
  ['c4', 'bn', 1, 27, 'facturado', [24, 12, 24, 12, 8], 'Contado', false],
  ['c5', 'ta', 0, 2, 'confirmado', [48, 24, 72, 36, 24, 12], '30 días', false],
  ['c3', 'tp', 0, 4, 'confirmado', [24, 18, 36, 24, 4], '30/60/90 días', false],
  ['c1', 'bn', 0, 6, 'recibido', [12, 12, 12, 6, 4, 8], 'Contado', false],
  ['c4', 'lp', 0, 7, 'recibido', [200, 300, 40, 20, 10], '30 y 60 días', false],
];

const dateAgo = (monthsAgo, day) => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - monthsAgo);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const today = new Date();
  let dd = Math.min(day, last);
  if (monthsAgo === 0) dd = Math.min(dd, today.getDate());
  d.setDate(dd);
  return d.toISOString().slice(0, 10);
};

export async function loadDemo(vid) {
  // 1) Marcas y artículos
  const b = writeBatch(db);
  const brandDocs = {}; const prodDocs = {};
  BRANDS.forEach((br, i) => {
    const ref = doc(collection(db, 'vendors', vid, 'brands'));
    const data = { name: br.name, tag: br.tag, color: br.color, logoUrl: brandLogo(br.name, br.color, br.shape), commission: br.commission, cond: br.cond, order: i, productCount: br.items.length, sample: true };
    b.set(ref, data);
    brandDocs[br.key] = { id: ref.id, ...data };
    prodDocs[br.key] = br.items.map(([sku, name, price, pack, kind]) => {
      const pref = doc(collection(db, 'vendors', vid, 'products'));
      b.set(pref, { brandId: ref.id, sku, name, price, pack, imageUrl: productImage(kind, br.color), active: true, sample: true });
      return { id: pref.id, sku, name, price };
    });
  });
  // 2) Clientes con condiciones especiales (las claves de marca se traducen a sus IDs)
  const clientDocs = {};
  CLIENTS.forEach(c => {
    const ref = doc(collection(db, 'vendors', vid, 'clients'));
    const terms = Object.fromEntries(Object.entries(c.terms).map(([bk, t]) => [brandDocs[bk].id, t]));
    const data = { name: c.name, cuit: c.cuit, iva: 'Responsable inscripto', city: c.city, contact: c.contact, phone: c.phone, email: '', address: c.address, status: c.status, web: false, terms, sample: true };
    b.set(ref, data);
    clientDocs[c.k] = { id: ref.id, ...data };
  });
  await b.commit();

  // 3) Pedidos con el motor de condiciones real (bonificaciones en cascada, escalas y forma de pago)
  let fc = 14200, rm = 5300;
  for (const [ck, bk, ago, day, status, qtys, pay, paid] of ORDERS) {
    const br = brandDocs[bk]; const cl = clientDocs[ck];
    const items = qtys.map((q, i) => q && prodDocs[bk][i] ? { productId: prodDocs[bk][i].id, sku: prodDocs[bk][i].sku, name: prodDocs[bk][i].name, qty: q, price: prodDocs[bk][i].price } : null).filter(Boolean);
    const q = quote(br, cl, items, pay);
    const date = dateAgo(ago, day);
    const docs = [];
    if (['facturado', 'entregado', 'cobrado'].includes(status)) docs.push({ type: 'Factura A', number: '0003-000' + (fc++), url: null, fileName: null, date });
    if (['entregado', 'cobrado'].includes(status)) docs.push({ type: 'Remito', number: '0003-000' + (rm++), url: null, fileName: null, date });
    await createOrder(vid, {
      clientId: cl.id, clientName: cl.name, brandId: br.id, brandName: br.name, status, origin: status === 'recibido' ? 'cliente' : 'vendedor', date,
      items, discount: q.effective, discountSteps: q.steps, payOption: pay, plazo: q.plazo, commissionRate: br.commission, commissionPaid: paid, docs,
      notes: status === 'recibido' && ck === 'c1' ? 'Entregar por la mañana. Depósito por calle lateral.' : '', sample: true,
    });
  }

  // 4) Contenido del sitio: sólo completa lo que está vacío
  const vref = doc(db, 'vendors', vid);
  const v = (await getDoc(vref)).data() || {};
  const fill = {
    heroTitle: 'Representación comercial de fábricas argentinas',
    heroSubtitle: 'Llevamos marcas líderes de bazar, iluminación, grifería y blanquería a comercios de AMBA y el interior del país.',
    aboutTitle: 'Quiénes somos',
    about: 'Somos una representación comercial con más de quince años en el rubro. Trabajamos junto a fábricas argentinas para acercar sus productos a ferreterías, bazares, casas de decoración y distribuidores.\n\nVisitamos a cada cliente, lo asesoramos en la elección de productos y seguimos cada pedido hasta que la mercadería llega a su local.',
    since: '2010', zone: 'CABA, GBA Norte, GBA Sur, GBA Oeste, Rosario, La Plata, Bahía Blanca',
    hours: 'Lunes a viernes de 9 a 18 h', city: 'CABA',
    services: [
      { title: 'Atención personalizada', text: 'Visitas periódicas, asesoramiento sobre novedades y armado del pedido junto a vos.' },
      { title: 'Pedidos online 24 h', text: 'Tu tienda con precios, bonificaciones y condiciones siempre actualizados.' },
      { title: 'Seguimiento completo', text: 'Factura y remito por WhatsApp y aviso cuando sale la mercadería.' },
    ],
  };
  const patch = Object.fromEntries(Object.entries(fill).filter(([k]) => !v[k] || (Array.isArray(v[k]) && !v[k].length)));
  if (Object.keys(patch).length) await updateDoc(vref, patch);
}
