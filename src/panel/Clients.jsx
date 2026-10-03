import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { ConfirmButton, Drawer, Empty, Field, Icon, Pill, copyText, useToast } from '../components/ui';
import { fmt, net } from '../lib/format';

export function siteBase(v) {
  return v.domainStatus === 'activo' && v.domain ? `https://${v.domain}` : `${window.location.origin}/v/${v.slug}`;
}

export default function Clients() {
  const { vid, v, clients, orders } = usePanel();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const pending = clients.filter(c => c.status === 'pendiente');
  const rest = clients.filter(c => c.status !== 'pendiente').filter(c => !q || (c.name + ' ' + (c.city || '') + ' ' + (c.cuit || '')).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const link = siteBase(v) + '/registro';
  const setStatus = async (c, status) => {
    await updateDoc(doc(db, 'vendors', vid, 'clients', c.id), { status });
    toast(status === 'activo' ? `${c.name} ya puede ver precios y pedir` : `${c.name} quedó pausado`);
  };
  const bought = id => orders.filter(o => o.clientId === id).reduce((a, o) => a + net(o), 0);

  return (
    <>
      <div className="head">
        <div className="grow"><h1>Clientes</h1><p>Sólo los clientes aprobados ven precios y pueden hacer pedidos.</p></div>
        <button className="btn primary" onClick={() => setEdit('nuevo')}><Icon n="plus" />Agregar un cliente</button>
      </div>

      <div className="card pad stack" style={{ gap: 12 }}>
        <h3>Invitá a tus clientes a tu tienda</h3>
        <p className="muted">Mandales este link. Se registran, te aparecen acá abajo y vos los aprobás.</p>
        <div className="input" style={{ wordBreak: 'break-all', background: 'var(--surface-2)' }}>{link}</div>
        <div className="row">
          <button className="btn" onClick={async () => toast(await copyText(link) ? 'Link copiado' : 'No se pudo copiar')}><Icon n="copy" />Copiar link</button>
          <a className="btn ok" target="_blank" rel="noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(`Hola, te invito a mi tienda online de ${v.business}. Registrate acá para ver precios y hacer pedidos: ${link}`)}><Icon n="send" />Mandar por WhatsApp</a>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warn)', borderWidth: 2 }}>
          <div className="pad" style={{ paddingBottom: 8 }}><h2>Esperando tu aprobación ({pending.length})</h2></div>
          <div className="list">{pending.map(c => (
            <div key={c.id} className="item">
              <div className="grow"><div className="t">{c.name}</div><div className="s">{[c.contact, c.city, c.cuit, c.phone].filter(Boolean).join(' · ')}</div></div>
              <button className="btn ok sm" onClick={() => setStatus(c, 'activo')}><Icon n="check" />Aprobar</button>
              <ConfirmButton className="btn sm danger" question="¿Rechazar?" yes="Rechazar" onConfirm={async () => { await deleteDoc(doc(db, 'vendors', vid, 'clients', c.id)); toast('Solicitud rechazada'); }}>Rechazar</ConfirmButton>
            </div>
          ))}</div>
        </div>
      )}

      <Field label="Buscar"><input id="cl-q" className="input" placeholder="Nombre, localidad o CUIT" value={q} onChange={e => setQ(e.target.value)} /></Field>
      <div className="card">
        {rest.length === 0 ? <Empty title="No hay clientes para mostrar" text="Agregalos a mano o invitalos con el link de arriba." /> : (
          <div className="list">{rest.map(c => (
            <button key={c.id} className="item" onClick={() => setEdit(c.id)}>
              <div className="grow"><div className="t">{c.name}</div><div className="s">{[c.city, c.cuit, c.web ? 'Entra a la tienda' : 'Sin acceso a la tienda'].filter(Boolean).join(' · ')}</div></div>
              <Pill k={c.status}>{c.status === 'activo' ? 'Activo' : 'Pausado'}</Pill>
              <span className="amount hide-m" style={{ minWidth: 130 }}>{fmt(bought(c.id))}</span>
            </button>
          ))}</div>
        )}
      </div>
      {edit && <ClientEdit id={edit} onClose={() => setEdit(null)} setStatus={setStatus} />}
    </>
  );
}

function ClientEdit({ id, onClose, setStatus }) {
  const { vid, clients } = usePanel();
  const toast = useToast();
  const isNew = id === 'nuevo';
  const orig = clients.find(x => x.id === id);
  const [c, setC] = useState(() => isNew ? { name: '', cuit: '', iva: 'Responsable inscripto', city: '', address: '', contact: '', phone: '', email: '', status: 'activo', web: false } : { ...orig });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setC(x => ({ ...x, [k]: v }));
  const save = async () => {
    if (!c.name.trim()) { toast('Escribí la razón social o el nombre del comercio'); return; }
    setBusy(true);
    const { id: _id, ...data } = c;
    try {
      if (isNew) await addDoc(collection(db, 'vendors', vid, 'clients'), data);
      else await updateDoc(doc(db, 'vendors', vid, 'clients', id), data);
      toast(isNew ? 'Cliente agregado' : 'Cambios guardados'); onClose();
    } catch (e) { console.error(e); toast('No se pudo guardar'); setBusy(false); }
  };
  return (
    <Drawer title={isNew ? 'Nuevo cliente' : c.name} sub={<span className="label">Cliente</span>} onClose={onClose}
      foot={<>
        {!isNew && <span className="grow row">
          {orig?.status === 'activo' ? <button className="btn" onClick={() => { setStatus(orig, 'pausado'); onClose(); }}>Pausar</button> : <button className="btn ok" onClick={() => { setStatus(orig, 'activo'); onClose(); }}>Activar</button>}
          <ConfirmButton question="¿Borrar cliente?" yes="Borrar" onConfirm={async () => { await deleteDoc(doc(db, 'vendors', vid, 'clients', id)); toast('Cliente borrado'); onClose(); }}>Borrar</ConfirmButton>
        </span>}
        <button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save} disabled={busy}>Guardar</button>
      </>}>
      <Field label="Razón social o nombre del comercio"><input id="k-name" className="input" value={c.name} onChange={e => set('name', e.target.value)} /></Field>
      <div className="grid g2">
        <Field label="CUIT"><input id="k-cuit" className="input" inputMode="numeric" placeholder="30-00000000-0" value={c.cuit} onChange={e => set('cuit', e.target.value)} /></Field>
        <Field label="Condición de IVA"><select id="k-iva" className="input" value={c.iva} onChange={e => set('iva', e.target.value)}><option>Responsable inscripto</option><option>Monotributo</option><option>Exento</option><option>Consumidor final</option></select></Field>
        <Field label="Persona de contacto"><input id="k-con" className="input" value={c.contact} onChange={e => set('contact', e.target.value)} /></Field>
        <Field label="WhatsApp"><input id="k-ph" className="input" inputMode="tel" value={c.phone} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input id="k-em" className="input" type="email" value={c.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Localidad"><input id="k-city" className="input" value={c.city} onChange={e => set('city', e.target.value)} /></Field>
      </div>
      <Field label="Dirección de entrega"><input id="k-addr" className="input" value={c.address || ''} onChange={e => set('address', e.target.value)} /></Field>
      {isNew && <p className="muted small">Si querés que este cliente haga pedidos solo, mandale el link de registro de la pantalla anterior.</p>}
    </Drawer>
  );
}
