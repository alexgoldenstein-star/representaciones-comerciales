import { useMemo, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { BrandMark, ConfirmButton, Drawer, Empty, Field, FileButton, Icon, useToast } from '../components/ui';
import { fmt } from '../lib/format';
import { uploadPublicImage } from '../lib/upload';
import { refreshBrandCount } from './Brands';

export default function Catalog() {
  const { brands, products } = usePanel();
  const [bf, setBf] = useState(brands[0]?.id || 'todas');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [imp, setImp] = useState(false);
  const list = useMemo(() => products
    .filter(p => bf === 'todas' || p.brandId === bf)
    .filter(p => !q || (p.name + ' ' + p.sku).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [products, bf, q]);

  if (!brands.length) return <><div className="head"><div className="grow"><h1>Catálogo</h1></div></div>
    <div className="card"><Empty title="Primero cargá una marca" text="El catálogo se arma marca por marca." /></div></>;

  return (
    <>
      <div className="head">
        <div className="grow"><h1>Catálogo</h1><p>{products.length} artículos de {brands.length} marcas.</p></div>
        <div className="row">
          <button className="btn" onClick={() => setImp(true)}><Icon n="upload" />Pegar lista de Excel</button>
          <button className="btn primary" onClick={() => setEdit('nuevo')}><Icon n="plus" />Agregar artículo</button>
        </div>
      </div>
      <div className="filters">
        <button className={'fbtn ' + (bf === 'todas' ? 'on' : '')} onClick={() => setBf('todas')}>Todas</button>
        {brands.map(b => <button key={b.id} className={'fbtn ' + (bf === b.id ? 'on' : '')} onClick={() => setBf(b.id)}><BrandMark b={b} size="s" />{b.name}</button>)}
      </div>
      <Field label="Buscar"><input id="c-q" className="input" placeholder="Nombre o código del artículo" value={q} onChange={e => setQ(e.target.value)} /></Field>
      {list.length === 0 ? <div className="card"><Empty title="No hay artículos para mostrar" text="Agregalos de a uno o pegá la lista completa desde Excel." /></div> : (
        <div className="pgrid">
          {list.map(p => {
            const b = brands.find(x => x.id === p.brandId);
            return (
              <button key={p.id} className="card pcard" style={{ textAlign: 'left', cursor: 'pointer', padding: 0 }} onClick={() => setEdit(p.id)}>
                <div className="pimg" style={{ background: `color-mix(in srgb, ${b?.color || '#1B5E86'} 12%, #fff)`, color: b?.color }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt="" /> : (b?.name || '').slice(0, 1)}
                  <span className="sku">{p.sku}</span>
                </div>
                <div className="pbody">
                  <span className="muted small">{b?.name}</span>
                  <span className="name">{p.name}</span>
                  <div className="row between" style={{ marginTop: 'auto' }}><span className="price">{fmt(p.price)}</span><span className="muted small">Bulto x{p.pack || 1}</span></div>
                  {p.active === false && <span className="pill suspendido">No se muestra</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {edit && <ProductEdit id={edit} defBrand={bf === 'todas' ? brands[0].id : bf} onClose={() => setEdit(null)} />}
      {imp && <ImportList defBrand={bf === 'todas' ? brands[0].id : bf} onClose={() => setImp(false)} />}
    </>
  );
}

function ProductEdit({ id, defBrand, onClose }) {
  const { vid, brands, products } = usePanel();
  const toast = useToast();
  const isNew = id === 'nuevo';
  const [p, setP] = useState(() => isNew ? { brandId: defBrand, sku: '', name: '', price: '', pack: 1, imageUrl: null, active: true } : { ...products.find(x => x.id === id) });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const set = (k, v) => setP(x => ({ ...x, [k]: v }));
  const save = async () => {
    if (!p.name.trim()) { toast('Escribí el nombre del artículo'); return; }
    setBusy(true);
    const { id: _id, ...rest } = p;
    const data = { ...rest, name: p.name.trim(), sku: String(p.sku || '').trim(), price: Number(String(p.price).replace(/\./g, '').replace(',', '.')) || 0, pack: parseInt(p.pack) || 1 };
    try {
      const batch = writeBatch(db);
      const ref = isNew ? doc(collection(db, 'vendors', vid, 'products')) : doc(db, 'vendors', vid, 'products', id);
      batch.set(ref, data, { merge: true });
      await batch.commit();
      await refreshBrandCount(vid, data.brandId, products.filter(x => x.brandId === data.brandId && x.id !== id).length + 1);
      toast(isNew ? 'Artículo agregado' : 'Cambios guardados'); onClose();
    } catch (e) { console.error(e); toast('No se pudo guardar. Probá de nuevo.'); setBusy(false); }
  };
  const remove = async () => {
    const batch = writeBatch(db); batch.delete(doc(db, 'vendors', vid, 'products', id)); await batch.commit();
    await refreshBrandCount(vid, p.brandId, products.filter(x => x.brandId === p.brandId).length - 1);
    toast('Artículo borrado'); onClose();
  };
  return (
    <Drawer title={isNew ? 'Nuevo artículo' : p.name} sub={<span className="label">Catálogo</span>} onClose={onClose}
      foot={<>
        {!isNew && <span className="grow"><ConfirmButton question="¿Borrar este artículo?" yes="Sí, borrar" onConfirm={remove}>Borrar</ConfirmButton></span>}
        <button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="pimg card" style={{ width: 180 }}>{p.imageUrl ? <img src={p.imageUrl} alt="" /> : 'Sin foto'}</div>
        <div className="stack" style={{ gap: 8 }}>
          <FileButton label={p.imageUrl ? 'Cambiar foto' : 'Subir foto'} accept="image/*" busy={up} onFile={async f => { setUp(true); try { set('imageUrl', await uploadPublicImage(vid, 'productos', f)); } catch (e) { toast('No se pudo subir la foto'); } setUp(false); }} />
          {p.imageUrl && <button className="btn sm link" onClick={() => set('imageUrl', null)}>Quitar foto</button>}
        </div>
      </div>
      <Field label="Marca"><select id="p-br" className="input" value={p.brandId} onChange={e => set('brandId', e.target.value)}>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Nombre del artículo"><input id="p-name" className="input" value={p.name} onChange={e => set('name', e.target.value)} /></Field>
      <div className="grid g3">
        <Field label="Código"><input id="p-sku" className="input" value={p.sku} onChange={e => set('sku', e.target.value)} /></Field>
        <Field label="Precio de lista ($)" hint="Sin IVA"><input id="p-price" className="input" inputMode="decimal" value={p.price} onChange={e => set('price', e.target.value)} /></Field>
        <Field label="Unidades por bulto"><input id="p-pack" className="input" inputMode="numeric" value={p.pack} onChange={e => set('pack', e.target.value)} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={p.active !== false} onChange={e => set('active', e.target.checked)} />Mostrar este artículo en la tienda</label>
    </Drawer>
  );
}

function ImportList({ defBrand, onClose }) {
  const { vid, brands, products } = usePanel();
  const toast = useToast();
  const [brandId, setBrandId] = useState(defBrand);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = txt.split('\n').map(l => l.split(/\t|;/).map(x => x.trim())).filter(r => r.length >= 3 && r[0] && r[1]);
  const parsePrice = s => Number(String(s).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  const existing = products.filter(p => p.brandId === brandId);
  const run = async () => {
    setBusy(true);
    try {
      let batch = writeBatch(db); let n = 0; let added = 0;
      for (const r of rows) {
        const ex = existing.find(p => p.sku === r[0]);
        const data = { brandId, sku: r[0], name: r[1], price: parsePrice(r[2]), pack: parseInt(r[3]) || ex?.pack || 1, active: true };
        if (ex) batch.update(doc(db, 'vendors', vid, 'products', ex.id), data);
        else { batch.set(doc(collection(db, 'vendors', vid, 'products')), { ...data, imageUrl: null }); added++; }
        if (++n % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
      }
      await batch.commit();
      await refreshBrandCount(vid, brandId, existing.length + added);
      toast(`Listo: ${rows.length - added} precios actualizados y ${added} artículos nuevos`); onClose();
    } catch (e) { console.error(e); toast('No se pudo importar. Revisá el formato.'); setBusy(false); }
  };
  return (
    <Drawer title="Pegar lista desde Excel" sub={<span className="label">Catálogo</span>} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!rows.length || busy} onClick={run}>{busy ? 'Importando…' : `Importar ${rows.length} artículos`}</button></>}>
      <div className="notice"><div><b>Cómo se hace</b>En Excel, seleccioná 4 columnas en este orden: <b style={{ display: 'inline' }}>código, nombre, precio y unidades por bulto</b>. Copiá (Ctrl+C) y pegá acá abajo (Ctrl+V). Si el código ya existe, se actualiza el precio.</div></div>
      <Field label="Marca"><select id="i-br" className="input" value={brandId} onChange={e => setBrandId(e.target.value)}>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Lista"><textarea id="i-txt" className="input" style={{ minHeight: 180, fontFamily: 'ui-monospace, monospace', fontSize: 16 }} placeholder={'TA-100\tTermo acero 1 L\t28900\t6'} value={txt} onChange={e => setTxt(e.target.value)} /></Field>
      {rows.length > 0 && (
        <div className="card scroll"><table className="lines">
          <thead><tr><th>Código</th><th>Nombre</th><th className="r">Precio</th><th className="r">Bulto</th><th></th></tr></thead>
          <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td className="r num">{fmt(parsePrice(r[2]))}</td><td className="r">{r[3] || 1}</td><td>{existing.some(p => p.sku === r[0]) ? <span className="pill confirmado">Actualiza</span> : <span className="pill activo">Nuevo</span>}</td></tr>)}</tbody>
        </table>{rows.length > 50 && <p className="pad muted">…y {rows.length - 50} más.</p>}</div>
      )}
    </Drawer>
  );
}
