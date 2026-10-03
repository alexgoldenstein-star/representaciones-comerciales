// Motor de condiciones comerciales.
// Cada marca tiene condiciones generales; cada cliente puede tener condiciones especiales por marca.
// Los descuentos se aplican en cascada, como se usa en el rubro: 10% + 5% = 14,5% efectivo.
//
// brand.cond = { descuento, minimo, plazo, escalas: [{ desde, extra }], pagos: [{ nombre, ajuste }] }
//   escalas: si el subtotal de lista llega a "desde", se suma "extra"% de bonificación (se toma la escala más alta alcanzada)
//   pagos:   formas de pago; ajuste positivo = descuento, negativo = recargo
// client.terms[brandId] = { descuento, extra, minimo, plazo, notas }
//   descuento: reemplaza la bonificación general de la marca (vacío = usa la general)
//   extra:     bonificación adicional sólo para este cliente

const num = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

export function termsFor(brand, client) {
  const c = brand?.cond || {};
  const t = (client?.terms || {})[brand?.id] || {};
  return {
    base: num(t.descuento) ?? (Number(c.descuento) || 0),
    baseIsSpecial: num(t.descuento) !== null,
    extra: num(t.extra) || 0,
    minimo: num(t.minimo) ?? (Number(c.minimo) || 0),
    plazo: t.plazo || c.plazo || '',
    notas: t.notas || '',
    escalas: (c.escalas || []).filter(e => Number(e.desde) > 0 && Number(e.extra)).sort((a, b) => a.desde - b.desde),
    pagos: (c.pagos || []).filter(p => p.nombre),
    hasSpecial: !!(t && (num(t.descuento) !== null || num(t.extra) || num(t.minimo) !== null || t.plazo || t.notas)),
  };
}

export function quote(brand, client, items, payName) {
  const tm = termsFor(brand, client);
  const subtotal = items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const steps = [];
  if (tm.base) steps.push({ label: tm.baseIsSpecial ? 'Bonificación acordada' : 'Bonificación general', pct: tm.base });
  if (tm.extra) steps.push({ label: 'Bonificación adicional del cliente', pct: tm.extra });
  const tier = [...tm.escalas].reverse().find(e => subtotal >= Number(e.desde));
  if (tier) steps.push({ label: `Escala por monto (desde $ ${Number(tier.desde).toLocaleString('es-AR')})`, pct: Number(tier.extra) });
  const next = tm.escalas.find(e => subtotal < Number(e.desde));
  const pay = tm.pagos.find(p => p.nombre === payName) || null;
  if (pay && Number(pay.ajuste)) steps.push({ label: (Number(pay.ajuste) > 0 ? 'Descuento ' : 'Recargo ') + pay.nombre, pct: Number(pay.ajuste) });
  const factor = steps.reduce((f, s) => f * (1 - s.pct / 100), 1);
  const effective = Math.round((1 - factor) * 1e6) / 1e4; // 4 decimales para que el neto guardado coincida
  return { subtotal, steps, effective, net: subtotal * factor, minimo: tm.minimo, plazo: pay?.nombre || tm.plazo, terms: tm, nextTier: next || null, pay };
}

// Texto corto para mostrar las condiciones de un cliente en una marca.
export function describeTerms(tm) {
  const parts = [];
  if (tm.base) parts.push(`${tm.base}% bonif.`);
  if (tm.extra) parts.push(`+${tm.extra}% adicional`);
  if (tm.plazo) parts.push(tm.plazo);
  if (tm.minimo) parts.push(`mín. $ ${Number(tm.minimo).toLocaleString('es-AR')}`);
  return parts.join(' · ');
}
