import { useState } from 'react';
import { addDoc, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { BrandMark, ConfirmButton, Drawer, Empty, Field, FileButton, Icon, RowsEditor, useToast } from '../components/ui';
import { fmt } from '../lib/format';
import { uploadPublicImage } from '../lib/upload';

export const COLORS = ['#1F4FD8', '#1B5E86', '#1F6F5C', '#8C5A06', '#9A3D4E', '#5B4A8C', '#2B5C9E', '#8A5A2B', '#3E4A5C'];

export default function Brands() {
  const { brands, products, limits } = usePanel();
  const [edit, setEdit] = useState(null);
  const full = limits.maxBrands > 0 && brands.length >= limits.maxBrands;
  return (
    <>
      <div className="head">
        <div className="grow"><h1>Marcas que representás</h1><p>Cada marca tiene su logo, sus condiciones y tu comisión.</p></div>
        <button className="btn primary" disabled={full} onClick={() => setEdit('nueva')}><Icon n="plus" />Agregar una marca</button>
      </div>
      {full && <div className="notice warn"><div className="grow"><b>Llegaste al máximo de {limits.maxBrands} marcas de tu plan {limits.name}</b>Para sumar más marcas, pasate a un plan superior.</div><a className="btn sm" href="/panel/plan">Ver planes</a></div>}
      {brands.length === 0 ? <div className="card"><Empty title="Todavía no cargaste marcas" text="Empezá por la empresa que más vendés." action={<button className="btn primary" onClick={() => setEdit('nueva')}>Agregar mi primera marca</button>} /></div> : (
        <div className="bgrid">
          {brands.map(b => (
            <button key={b.id} className="card bcard" onClick={() => setEdit(b.id)}>
              <div className="row" style={{ flexWrap: 'nowrap', width: '100%' }}>
                <BrandMark b={b} size="m" />
                <div className="grow"><h3>{b.name}</h3><div className="muted small">{b.tag}</div></div>
                <span className="comm">{b.commission || 0}%</span>
              </div>
              <dl className="dl" style={{ width: '100%' }}>
                <dt>Bonificación</dt><dd>{b.cond?.descuento || 0}%</dd>
                <dt>Plazo</dt><dd>{b.cond?.plazo || '—'}</dd>
                <dt>Mínimo</dt><dd>{fmt(b.cond?.minimo)}</dd>
                <dt>Artículos</dt><dd>{products.filter(p => p.brandId === b.id).length}</dd>
              </dl>
              <span className="btn sm" style={{ alignSelf: 'flex-start' }}>Editar</span>
            </button>
          ))}
        </div>
      )}
      {edit && <BrandEdit id={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

const EMPTY = { name: '', tag: '', color: COLORS[0], logoUrl: null, commission: 5, order: 99, cond: { lista: '', descuento: 0, plazo: '30 días', minimo: 0, flete: '', pago: '', entrega: '', iva: 'Precios + IVA 21%', escalas: [], pagos: [] } };

function BrandEdit({ id, onClose }) {
  const { vid, brands, products } = usePanel();
  const toast = useToast();
  const isNew = id === 'nueva';
  const [b, setB] = useState(() => isNew ? { ...EMPTY, order: brands.length } : { ...EMPTY, ...brands.find(x => x.id === id), cond: { ...EMPTY.cond, ...(brands.find(x => x.id === id)?.cond || {}) } });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const set = (k, val) => setB(x => ({ ...x, [k]: val }));
  const setC = (k, val) => setB(x => ({ ...x, cond: { ...x.cond, [k]: val } }));

  const onLogo = async f => {
    setUp(true);
    try { set('logoUrl', await uploadPublicImage(vid, 'marcas', f)); } catch (e) { console.error(e); toast('No se pudo subir el logo. Usá una imagen JPG o PNG.'); }
    setUp(false);
  };
  const save = async () => {
    if (!b.name.trim()) { toast('Escribí el nombre de la marca'); return; }
    setBusy(true);
    const { id: _id, ...rest } = b;
    const data = { ...rest, name: b.name.trim(), commission: Number(b.commission) || 0, cond: { ...b.cond, descuento: Number(b.cond.descuento) || 0, minimo: Number(String(b.cond.minimo).replace(/\./g, '')) || 0,
      escalas: (b.cond.escalas || []).map(e => ({ desde: Number(String(e.desde).replace(/\./g, '')) || 0, extra: Number(String(e.extra).replace(',', '.')) || 0 })).filter(e => e.desde > 0 && e.extra),
      pagos: (b.cond.pagos || []).map(p => ({ nombre: String(p.nombre || '').trim(), ajuste: Number(String(p.ajuste).replace(',', '.')) || 0 })).filter(p => p.nombre) }, productCount: products.filter(p => p.brandId === id).length };
    try {
      if (isNew) await addDoc(collection(db, 'vendors', vid, 'brands'), data);
      else await updateDoc(doc(db, 'vendors', vid, 'brands', id), data);
      toast(isNew ? 'Marca agregada' : 'Cambios guardados'); onClose();
    } catch (e) { console.error(e); toast('No se pudo guardar. Probá de nuevo.'); setBusy(false); }
  };
  const remove = async () => {
    const batch = writeBatch(db);
    products.filter(p => p.brandId === id).forEach(p => batch.delete(doc(db, 'vendors', vid, 'products', p.id)));
    batch.delete(doc(db, 'vendors', vid, 'brands', id));
    await batch.commit(); toast('Marca borrada'); onClose();
  };

  return (
    <Drawer title={isNew ? 'Nueva marca' : b.name} sub={<span className="label">Marca</span>} onClose={onClose}
      foot={<>
        {!isNew && <span className="grow"><ConfirmButton question="¿Borrar la marca y sus artículos?" yes="Sí, borrar" onConfirm={remove}>Borrar marca</ConfirmButton></span>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <BrandMark b={{ ...b, name: b.name || '?' }} size="l" />
        <div className="stack" style={{ gap: 10 }}>
          <div className="row"><FileButton label={b.logoUrl ? 'Cambiar logo' : 'Subir logo'} accept="image/*" onFile={onLogo} busy={up} />
            {b.logoUrl && <button className="btn sm link" onClick={() => set('logoUrl', null)}>Quitar logo</button>}</div>
          <div><span className="label">Color (si no hay logo)</span>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>{COLORS.map(c => <button key={c} aria-label={'Color ' + c} onClick={() => set('color', c)} style={{ width: 40, height: 40, borderRadius: 10, background: c, border: b.color === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />)}</div></div>
        </div>
      </div>
      <div className="grid g2">
        <Field label="Nombre de la marca"><input id="b-name" className="input" value={b.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Qué vende" hint="Ej.: Iluminación LED"><input id="b-tag" className="input" value={b.tag} onChange={e => set('tag', e.target.value)} /></Field>
      </div>
      <div className="card pad" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
        <Field label="Tu comisión (% sobre el neto)" hint="Lo que te paga esta empresa por cada venta."><input id="b-comm" className="input" inputMode="decimal" style={{ maxWidth: 180 }} value={b.commission} onChange={e => set('commission', e.target.value)} /></Field>
      </div>
      <h3>Condiciones comerciales</h3>
      <p className="muted" style={{ marginTop: -12 }}>Tus clientes las ven en la tienda de esta marca.</p>
      <div className="grid g2">
        <Field label="Lista de precios vigente"><input id="c-lista" className="input" placeholder="Lista N° 14" value={b.cond.lista} onChange={e => setC('lista', e.target.value)} /></Field>
        <Field label="Bonificación general (%)"><input id="c-desc" className="input" inputMode="decimal" value={b.cond.descuento} onChange={e => setC('descuento', e.target.value)} /></Field>
        <Field label="Plazo de pago"><input id="c-plazo" className="input" value={b.cond.plazo} onChange={e => setC('plazo', e.target.value)} /></Field>
        <Field label="Pedido mínimo ($ sin IVA)"><input id="c-min" className="input" inputMode="numeric" value={b.cond.minimo} onChange={e => setC('minimo', e.target.value)} /></Field>
        <Field label="Flete"><input id="c-flete" className="input" placeholder="Sin cargo desde $ 500.000" value={b.cond.flete} onChange={e => setC('flete', e.target.value)} /></Field>
        <Field label="Formas de pago"><input id="c-pago" className="input" placeholder="Transferencia o e-cheq" value={b.cond.pago} onChange={e => setC('pago', e.target.value)} /></Field>
        <Field label="Plazo de entrega"><input id="c-ent" className="input" placeholder="5 a 7 días hábiles" value={b.cond.entrega} onChange={e => setC('entrega', e.target.value)} /></Field>
        <Field label="IVA"><input id="c-iva" className="input" value={b.cond.iva} onChange={e => setC('iva', e.target.value)} /></Field>
      </div>
      <section className="card pad stack" style={{ background: 'var(--surface-2)' }}>
        <h3>Formas de pago con descuento o recargo</h3>
        <p className="muted small">El cliente elige una al hacer el pedido. Poné un número positivo para descuento (ej.: Contado <b>5</b>) o negativo para recargo (ej.: 90 días <b>-3</b>). Dejá 0 si no cambia el precio.</p>
        <RowsEditor idPrefix="pg" rows={b.cond.pagos || []} onChange={v => setC('pagos', v)} addLabel="Agregar forma de pago"
          empty="Sin formas de pago cargadas: se usa el plazo de arriba."
          cols={[{ k: 'nombre', label: 'Forma de pago', placeholder: 'Contado / 30 días / e-cheq 60', width: 2 }, { k: 'ajuste', label: 'Ajuste (%)', placeholder: '5', type: 'num' }]} />
      </section>
      <section className="card pad stack" style={{ background: 'var(--surface-2)' }}>
        <h3>Escalas por monto del pedido</h3>
        <p className="muted small">Bonificación extra cuando el pedido (a precio de lista) llega a cierto monto. Se aplica la escala más alta alcanzada.</p>
        <RowsEditor idPrefix="es" rows={b.cond.escalas || []} onChange={v => setC('escalas', v)} addLabel="Agregar escala"
          empty="Sin escalas: no hay bonificación por volumen."
          cols={[{ k: 'desde', label: 'Desde ($ de lista)', placeholder: '1000000', type: 'num', width: 2 }, { k: 'extra', label: 'Extra (%)', placeholder: '3', type: 'num' }]} />
      </section>
      <p className="muted small">¿Un cliente tiene un trato distinto? Cargalo en <b>Clientes → el cliente → Condiciones especiales</b>.</p>
      <Field label="Orden en la tienda" hint="Las marcas con número más chico aparecen primero."><input id="b-order" className="input" inputMode="numeric" style={{ maxWidth: 140 }} value={b.order} onChange={e => set('order', parseInt(e.target.value) || 0)} /></Field>
    </Drawer>
  );
}

export async function refreshBrandCount(vid, brandId, count) {
  try { await updateDoc(doc(db, 'vendors', vid, 'brands', brandId), { productCount: count }); } catch (e) { /* no crítico */ }
}
