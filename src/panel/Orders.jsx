import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { BrandMark, ConfirmButton, Drawer, Empty, Field, FileButton, Icon, Pill, copyText, useToast } from '../components/ui';
import { DOC_TYPES, IVA, STATUSES, commOf, fdate, fmt, net, stageOf, STAGES, subtotal, today } from '../lib/format';
import { createOrder } from '../lib/orders';
import { quote, describeTerms } from '../lib/terms';
import Breakdown from '../components/Breakdown';
import { uploadDoc } from '../lib/upload';

export default function Orders() {
  const { orders, brands } = usePanel();
  const [sp, setSp] = useSearchParams();
  const [f, setF] = useState('todos');
  const [q, setQ] = useState('');
  const openId = sp.get('ver');
  const creating = sp.get('nuevo') === '1';
  const close = () => setSp({}, { replace: true });

  const list = useMemo(() => orders
    .filter(o => f === 'todos' || o.status === f)
    .filter(o => !q || (o.number + ' ' + o.clientName + ' ' + o.brandName).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || '')), [orders, f, q]);

  return (
    <>
      <div className="head">
        <div className="grow"><h1>Pedidos</h1><p>Los que cargás vos y los que te mandan tus clientes desde la tienda.</p></div>
        <button className="btn primary" onClick={() => setSp({ nuevo: '1' })}><Icon n="plus" />Cargar un pedido</button>
      </div>
      <div className="filters" role="group" aria-label="Filtrar por estado">
        <button className={'fbtn ' + (f === 'todos' ? 'on' : '')} onClick={() => setF('todos')}>Todos ({orders.length})</button>
        {STATUSES.map(s => <button key={s.k} className={'fbtn ' + (f === s.k ? 'on' : '')} onClick={() => setF(s.k)}>{s.l} ({orders.filter(o => o.status === s.k).length})</button>)}
      </div>
      <Field label="Buscar"><input id="o-q" className="input" placeholder="Nombre del cliente, marca o número de pedido" value={q} onChange={e => setQ(e.target.value)} /></Field>
      <div className="card">
        {list.length === 0 ? <Empty title="No hay pedidos para mostrar" text={orders.length ? 'Probá con otro filtro.' : 'Cargá tu primer pedido con el botón de arriba.'} /> : (
          <div className="list">
            {list.map(o => {
              const b = brands.find(x => x.id === o.brandId);
              return (
                <button key={o.id} className="item" onClick={() => setSp({ ver: o.id })}>
                  <BrandMark b={b || { name: o.brandName }} size="s" />
                  <div className="grow">
                    <div className="t">{o.clientName}</div>
                    <div className="s">{o.number} · {o.brandName} · {fdate(o.date)}{o.origin === 'cliente' ? ' · desde la tienda' : ''}</div>
                  </div>
                  <Pill k={o.status} />
                  <span className="amount" style={{ minWidth: 130 }}>{fmt(net(o))}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {openId && <OrderDetail id={openId} onClose={close} />}
      {creating && <NewOrder onClose={close} onCreated={id => setSp({ ver: id }, { replace: true })} />}
    </>
  );
}

function OrderDetail({ id, onClose }) {
  const { vid, v, orders, brands, clients } = usePanel();
  const toast = useToast();
  const o = orders.find(x => x.id === id);
  const [docType, setDocType] = useState('Factura A');
  const [docNum, setDocNum] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(o?.notes || '');
  if (!o) return <Drawer title="Pedido" onClose={onClose}><Empty title="Este pedido ya no existe" /></Drawer>;

  const ref = doc(db, 'vendors', vid, 'orders', id);
  const b = brands.find(x => x.id === o.brandId) || { name: o.brandName };
  const c = clients.find(x => x.id === o.clientId) || { name: o.clientName };
  const idx = STATUSES.findIndex(s => s.k === o.status);
  const next = STATUSES[idx + 1];
  const prev = STATUSES[idx - 1];
  const iva = net(o) * IVA;
  const save = async (patch, msg) => { try { await updateDoc(ref, patch); if (msg) toast(msg); } catch (e) { console.error(e); toast('No se pudo guardar. Revisá tu conexión.'); } };

  const addDoc = async () => {
    if (!docNum.trim()) { toast('Escribí el número del comprobante'); return; }
    setBusy(true);
    try {
      const url = file ? await uploadDoc(vid, o.clientId, file) : null;
      const d = { type: docType, number: docNum.trim(), url, fileName: file?.name || null, date: today() };
      const patch = { docs: [...(o.docs || []), d] };
      if (docType.startsWith('Factura') && idx < 2) patch.status = 'facturado';
      if (docType === 'Remito' && idx < 3) patch.status = 'entregado';
      await updateDoc(ref, patch);
      setDocNum(''); setFile(null); toast(docType + ' guardada');
    } catch (e) { console.error(e); toast('No se pudo subir el archivo. Probá de nuevo.'); }
    setBusy(false);
  };

  const text = `Hola ${(c.contact || c.name || '').split(' ')[0]}, te paso la documentación del pedido ${o.number} de ${o.brandName}:\n`
    + (o.docs || []).map(d => `• ${d.type} ${d.number}${d.url ? '\n  ' + d.url : ''}`).join('\n')
    + `\nTotal: ${fmt(net(o) + iva)} con IVA.\n${v.business}`;
  const phone = String(c.phone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${phone.startsWith('54') ? phone : '549' + phone}?text=${encodeURIComponent(text)}`;

  return (
    <Drawer onClose={onClose} title={o.clientName} sub={<div className="row"><span className="label">{o.number}</span><Pill k={o.status} /></div>}
      foot={<>
        {prev && <button className="btn" onClick={() => save({ status: prev.k }, 'Volvió a ' + prev.l.toLowerCase())}>Volver a “{prev.l}”</button>}
        {next ? <button className="btn primary" onClick={() => save({ status: next.k }, 'Pedido marcado como ' + next.l.toLowerCase())}><Icon n="check" />Marcar como {next.l.toLowerCase()}</button>
          : <span className="pill cobrado">Pedido terminado</span>}
      </>}>
      <div className="stack" style={{ gap: 10 }}>
        <div className="steps">{STATUSES.map((s, i) => <div key={s.k} className={'stp ' + (i <= idx ? 'done' : '')}><i />{s.l}</div>)}</div>
        <p className="muted small">{STATUSES[idx]?.help}</p>
      </div>

      <div className="card">
        <div className="pad row" style={{ paddingBottom: 12 }}>
          <BrandMark b={b} size="m" />
          <div className="grow"><h3>{o.brandName}</h3><div className="muted small">{fdate(o.date)} · {o.origin === 'cliente' ? 'Lo hizo el cliente desde la tienda' : 'Lo cargaste vos'}</div></div>
        </div>
        <div className="scroll"><table className="lines">
          <thead><tr><th>Artículo</th><th className="r">Cant.</th><th className="r">Precio</th><th className="r">Importe</th></tr></thead>
          <tbody>{(o.items || []).map((it, i) => (
            <tr key={i}><td><b>{it.name}</b><div className="muted small">{it.sku}</div></td><td className="r num">{it.qty}</td><td className="r num">{fmt(it.price)}</td><td className="r num">{fmt(it.qty * it.price)}</td></tr>
          ))}</tbody>
        </table></div>
        <Breakdown subtotal={subtotal(o)} steps={o.discountSteps || (o.discount ? [{ label: 'Bonificación', pct: Number(o.discount) }] : [])} effective={o.discount} net={net(o)} />
        {(o.payOption || o.plazo) && <p className="pad muted" style={{ paddingTop: 0 }}>Forma de pago: <b>{o.payOption || o.plazo}</b></p>}
      </div>

      <div className="card pad stack" style={{ background: 'var(--accent-soft)', borderColor: 'transparent', gap: 10 }}>
        <div className="row between">
          <div><span className="label">Tu comisión ({o.commissionRate || 0}% del neto)</span><div style={{ fontSize: 26, fontWeight: 700 }}>{fmt(commOf(o))}</div></div>
          <span className="pill plain">{STAGES.find(s => s.k === stageOf(o)).l}</span>
        </div>
        {o.status === 'cobrado' && (
          <label className="check"><input type="checkbox" checked={!!o.commissionPaid} onChange={e => save({ commissionPaid: e.target.checked }, e.target.checked ? 'Comisión marcada como cobrada' : 'Comisión marcada como pendiente')} />Ya me pagaron esta comisión</label>
        )}
      </div>

      <section className="stack">
        <h3>Factura y remito</h3>
        {(o.docs || []).length === 0 && <p className="muted">Todavía no cargaste comprobantes para este pedido.</p>}
        {(o.docs || []).map((d, i) => (
          <div key={i} className="card pad row" style={{ padding: 14 }}>
            <Icon n="file" size={28} />
            <div className="grow"><b>{d.type} {d.number}</b><div className="muted small">{d.fileName || 'Sin archivo adjunto'} · {fdate(d.date)}</div></div>
            {d.url && <a className="btn sm" href={d.url} target="_blank" rel="noreferrer">Abrir</a>}
            <ConfirmButton className="btn sm danger" question="¿Quitar?" yes="Quitar" onConfirm={() => save({ docs: o.docs.filter((_, j) => j !== i) }, 'Comprobante quitado')}>Quitar</ConfirmButton>
          </div>
        ))}
        <div className="card pad stack" style={{ background: 'var(--surface-2)' }}>
          <div className="grid g2">
            <Field label="Tipo de comprobante"><select id="d-type" className="input" value={docType} onChange={e => setDocType(e.target.value)}>{DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Número"><input id="d-num" className="input" placeholder="0003-00014458" value={docNum} onChange={e => setDocNum(e.target.value)} /></Field>
          </div>
          <div className="row between">
            <FileButton label={file ? file.name : 'Adjuntar PDF o foto'} accept=".pdf,image/*" onFile={setFile} />
            <button className="btn primary sm" onClick={addDoc} disabled={busy}>{busy ? 'Guardando…' : 'Guardar comprobante'}</button>
          </div>
        </div>
      </section>

      <section className="stack">
        <h3>Mandárselo al cliente</h3>
        <p className="muted">{c.contact || c.name}{c.phone ? ' · ' + c.phone : ''}{c.email ? ' · ' + c.email : ''}</p>
        <div className="row">
          {phone ? <a className="btn ok" href={wa} target="_blank" rel="noreferrer"><Icon n="send" />Enviar por WhatsApp</a> : <span className="muted">Cargale un WhatsApp al cliente para enviarle los comprobantes.</span>}
          <button className="btn" onClick={async () => toast(await copyText(text) ? 'Mensaje copiado. Pegalo en un mail.' : 'No se pudo copiar')}><Icon n="copy" />Copiar mensaje</button>
        </div>
      </section>

      <Field label="Notas del pedido">
        <textarea id="o-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (o.notes || '') && save({ notes }, 'Nota guardada')} />
      </Field>

      <div><ConfirmButton question="¿Borrar este pedido?" yes="Sí, borrar" onConfirm={async () => { await deleteDoc(ref); toast('Pedido borrado'); onClose(); }}><Icon n="trash" />Borrar pedido</ConfirmButton></div>
    </Drawer>
  );
}

function NewOrder({ onClose, onCreated }) {
  const { vid, brands, products, clients } = usePanel();
  const toast = useToast();
  const active = clients.filter(c => c.status === 'activo');
  const [clientSel, setClientId] = useState('');
  const [brandSel, setBrandId] = useState('');
  const clientId = clientSel || active[0]?.id || '';
  const brandId = brandSel || brands[0]?.id || '';
  const b = brands.find(x => x.id === brandId);
  const client = clients.find(x => x.id === clientId);
  const prods = products.filter(p => p.brandId === brandId && p.active !== false).sort((a, c) => a.name.localeCompare(c.name));
  const [lines, setLines] = useState([]);
  const [pay, setPay] = useState('');
  const [manual, setManual] = useState(false);
  const [manualDisc, setManualDisc] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setLines([]); setPay(''); setManual(false); }, [brandId]);

  if (!b || !client) {
    return <Drawer title="Cargar un pedido" onClose={onClose}>
      <Empty title="Faltan datos para cargar pedidos" text={!brands.length ? 'Primero cargá al menos una marca con sus artículos.' : 'Primero cargá o aprobá al menos un cliente.'} />
    </Drawer>;
  }
  const add = pid => {
    const p = prods.find(x => x.id === pid); if (!p) return;
    setLines(ls => ls.find(l => l.productId === pid) ? ls.map(l => l.productId === pid ? { ...l, qty: l.qty + (p.pack || 1) } : l)
      : [...ls, { productId: p.id, sku: p.sku, name: p.name, price: p.price, qty: p.pack || 1 }]);
  };
  const q = quote(b, client, lines, pay);
  const steps = manual ? [{ label: 'Bonificación acordada en este pedido', pct: Number(String(manualDisc).replace(',', '.')) || 0 }] : q.steps;
  const effective = manual ? (Number(String(manualDisc).replace(',', '.')) || 0) : q.effective;
  const n = manual ? q.subtotal * (1 - effective / 100) : q.net;
  const submit = async () => {
    const items = lines.filter(l => l.qty > 0);
    if (!items.length) { toast('Agregá al menos un artículo'); return; }
    setBusy(true);
    try {
      const r = await createOrder(vid, { clientId, clientName: client.name, brandId, brandName: b.name, status: 'confirmado', origin: 'vendedor', items,
        discount: effective, discountSteps: steps, payOption: pay || '', plazo: q.plazo || '', commissionRate: Number(b.commission) || 0, notes });
      toast('Pedido ' + r.number + ' guardado'); onCreated(r.id);
    } catch (e) { console.error(e); toast('No se pudo guardar el pedido. Probá de nuevo.'); setBusy(false); }
  };

  return (
    <Drawer title="Cargar un pedido" onClose={onClose}
      foot={<><span className="grow">Neto: <b style={{ fontSize: 20 }}>{fmt(n)}</b></span><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Guardar pedido'}</button></>}>
      <div className="grid g2">
        <Field label="1. Cliente"><select id="n-cl" className="input" value={clientId} onChange={e => setClientId(e.target.value)}>{active.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="2. Marca"><select id="n-br" className="input" value={brandId} onChange={e => setBrandId(e.target.value)}>{brands.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      </div>
      <div className={'notice' + (q.terms.hasSpecial ? ' ok' : '')}><div>
        <b>{q.terms.hasSpecial ? `Condiciones especiales de ${client?.name} con ${b.name}` : `Condiciones generales de ${b.name}`}</b>
        {describeTerms(q.terms) || 'Sin bonificación'}{b.cond?.flete ? ' · ' + b.cond.flete : ''}{q.terms.notas ? ' · ' + q.terms.notas : ''}
      </div></div>
      <Field label="3. Agregá artículos" hint="Cada vez que elegís uno se suma un bulto.">
        <select id="n-add" className="input" value="" onChange={e => add(e.target.value)}>
          <option value="">Elegí un artículo de {b?.name}…</option>
          {prods.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name} · {fmt(p.price)}</option>)}
        </select>
      </Field>
      <div className="card">
        {lines.length === 0 ? <Empty title="Todavía no agregaste artículos" /> : (
          <div className="list">
            {lines.map(l => (
              <div key={l.productId} className="item">
                <div className="grow"><div className="t">{l.name}</div><div className="s">{l.sku} · {fmt(l.price)} c/u</div></div>
                <div className="stepper">
                  <button aria-label="Menos" onClick={() => setLines(ls => ls.map(x => x.productId === l.productId ? { ...x, qty: Math.max(0, x.qty - 1) } : x))}>−</button>
                  <input aria-label="Cantidad" inputMode="numeric" value={l.qty} onChange={e => setLines(ls => ls.map(x => x.productId === l.productId ? { ...x, qty: Math.max(0, parseInt(e.target.value) || 0) } : x))} />
                  <button aria-label="Más" onClick={() => setLines(ls => ls.map(x => x.productId === l.productId ? { ...x, qty: x.qty + 1 } : x))}>+</button>
                </div>
                <span className="amount" style={{ minWidth: 110 }}>{fmt(l.qty * l.price)}</span>
              </div>
            ))}
          </div>
        )}
        {lines.length > 0 && <Breakdown subtotal={q.subtotal} steps={steps} effective={effective} net={n} />}
      </div>
      {q.terms.pagos.length > 0 && (
        <Field label="4. Forma de pago">
          <select id="n-pay" className="input" value={pay} onChange={e => setPay(e.target.value)}>
            <option value="">{q.terms.plazo || 'Sin especificar'}</option>
            {q.terms.pagos.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}{Number(p.ajuste) ? ` (${Number(p.ajuste) > 0 ? p.ajuste + '% desc.' : Math.abs(p.ajuste) + '% recargo'})` : ''}</option>)}
          </select>
        </Field>
      )}
      {q.nextTier && lines.length > 0 && !manual && <div className="notice">Sumando {fmt(q.nextTier.desde - q.subtotal)} más de lista llega a la escala de <b style={{ display: 'inline' }}>{q.nextTier.extra}% extra</b>.</div>}
      <div className="card pad stack" style={{ gap: 10 }}>
        <label className="check"><input type="checkbox" checked={manual} onChange={e => { setManual(e.target.checked); setManualDisc(String(q.effective)); }} />Poner a mano la bonificación de este pedido</label>
        {manual && <Field label="Bonificación total (%)"><input id="n-disc" className="input" inputMode="decimal" style={{ maxWidth: 180 }} value={manualDisc} onChange={e => setManualDisc(e.target.value)} /></Field>}
        <div><span className="label">Tu comisión estimada</span><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(n * (b?.commission || 0) / 100)}</div></div>
      </div>
      {n > 0 && q.minimo > n && <div className="notice warn">Faltan <b style={{ display: 'inline' }}>{fmt(q.minimo - n)}</b> para llegar al pedido mínimo.</div>}
      <Field label="Notas (opcional)"><textarea id="n-notes" className="input" placeholder="Horario de entrega, condiciones especiales…" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
    </Drawer>
  );
}
