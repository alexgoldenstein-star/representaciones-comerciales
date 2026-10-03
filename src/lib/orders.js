import { collection, doc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { today } from './format';

// Crea un pedido con número correlativo (NP 000001, NP 000002…).
export async function createOrder(vid, data) {
  const cref = doc(db, 'vendors', vid, 'counters', 'orders');
  const oref = doc(collection(db, 'vendors', vid, 'orders'));
  let number = '';
  await runTransaction(db, async tx => {
    const c = await tx.get(cref);
    const n = c.exists() ? (c.data().n || 0) + 1 : 1;
    if (c.exists()) tx.update(cref, { n }); else tx.set(cref, { n });
    number = 'NP ' + String(n).padStart(6, '0');
    tx.set(oref, { date: today(), docs: [], commissionPaid: false, notes: '', ...data, number, createdAt: serverTimestamp() });
  });
  return { id: oref.id, number };
}

// Carga marcas, artículos, clientes y pedidos de ejemplo para probar el sistema.
export async function loadSampleData(vid) {
  const b = writeBatch(db);
  const brands = [
    { key: 'ta', name: 'Termo Andino', tag: 'Termos, mates y botellas térmicas', color: '#1F6F5C', commission: 6, cond: { lista: 'Lista N° 14', descuento: 8, plazo: '30 días fecha factura', minimo: 300000, flete: 'Sin cargo desde $ 500.000 en AMBA', pago: 'Transferencia o e-cheq', entrega: '5 a 7 días hábiles', iva: 'Precios + IVA 21%' },
      items: [['TA-100', 'Termo acero 1 L pico cebador', 28900, 6], ['TA-110', 'Termo acero 1,2 L con manija', 31500, 6], ['TA-205', 'Mate de acero doble pared', 8900, 12], ['TA-300', 'Botella térmica 750 ml', 17400, 12]] },
    { key: 'lp', name: 'Luz del Plata', tag: 'Iluminación LED', color: '#8C5A06', commission: 5, cond: { lista: 'Lista N° 31', descuento: 12, plazo: '30 y 60 días', minimo: 250000, flete: 'Expreso a cargo del cliente', pago: 'Cheque o transferencia', entrega: '48 a 72 horas', iva: 'Precios + IVA 21%' },
      items: [['LP-09W', 'Lámpara LED 9 W luz fría', 1450, 50], ['LP-12W', 'Lámpara LED 12 W luz cálida', 1890, 50], ['LP-P18', 'Panel LED 18 W de embutir', 6900, 20], ['LP-R50', 'Reflector LED 50 W exterior', 11800, 10]] },
    { key: 'tp', name: 'Textil Pampa', tag: 'Blanquería, sábanas y toallas', color: '#9A3D4E', commission: 7, cond: { lista: 'Primavera-verano', descuento: 10, plazo: '30, 60 y 90 días', minimo: 350000, flete: 'Sin cargo desde $ 600.000', pago: 'E-cheq', entrega: '10 días hábiles', iva: 'Precios + IVA 21%' },
      items: [['TP-S2P', 'Juego de sábanas 2 plazas', 24500, 6], ['TP-TB5', 'Toallón 500 g algodón', 9900, 12], ['TP-AC2', 'Acolchado reversible 2 plazas', 52400, 4]] },
  ];
  const prodIds = {};
  brands.forEach((br, i) => {
    const bref = doc(collection(db, 'vendors', vid, 'brands'));
    br.id = bref.id;
    b.set(bref, { name: br.name, tag: br.tag, color: br.color, logoUrl: null, commission: br.commission, cond: br.cond, order: i, productCount: br.items.length, sample: true });
    prodIds[br.key] = br.items.map(([sku, name, price, pack]) => {
      const pref = doc(collection(db, 'vendors', vid, 'products'));
      b.set(pref, { brandId: bref.id, sku, name, price, pack, imageUrl: null, active: true, sample: true });
      return { id: pref.id, sku, name, price };
    });
  });
  const clients = [
    ['Ferretería El Tornillo', '30-71234567-8', 'Lanús', 'Marcelo Ríos', '1151234478'],
    ['Casa Moreno Bazar', '20-28765432-1', 'Rosario', 'Laura Moreno', '3416120098'],
    ['Hogar y Deco Palermo', '30-70987654-3', 'CABA', 'Julián Pérez', '1140332211'],
  ].map(([name, cuit, city, contact, phone]) => {
    const cref = doc(collection(db, 'vendors', vid, 'clients'));
    b.set(cref, { name, cuit, iva: 'Responsable inscripto', city, contact, phone, email: '', status: 'activo', web: false, sample: true });
    return { id: cref.id, name };
  });
  await b.commit();
  const mk = async (ci, bi, status, qtys, paid) => {
    const br = brands[bi]; const ps = prodIds[br.key];
    await createOrder(vid, {
      clientId: clients[ci].id, clientName: clients[ci].name, brandId: br.id, brandName: br.name, status, origin: 'vendedor',
      items: qtys.map((q, i) => ({ productId: ps[i].id, sku: ps[i].sku, name: ps[i].name, qty: q, price: ps[i].price })),
      discount: br.cond.descuento, commissionRate: br.commission, commissionPaid: !!paid, sample: true,
      docs: ['facturado', 'entregado', 'cobrado'].includes(status) ? [{ type: 'Factura A', number: '0003-00014' + (400 + ci * 10 + bi), url: null, fileName: null, date: today() }] : [],
    });
  };
  await mk(0, 0, 'cobrado', [24, 12, 48], true);
  await mk(1, 1, 'cobrado', [300, 200, 40]);
  await mk(2, 2, 'entregado', [12, 24, 4]);
  await mk(0, 1, 'confirmado', [200, 200, 20, 10]);
  await mk(1, 0, 'recibido', [12, 12, 24, 12]);
}
