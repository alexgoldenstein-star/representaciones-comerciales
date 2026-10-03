import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { collection, deleteDoc, doc, getCountFromServer, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { DEFAULT_PRICING, usePricing } from '../lib/siteConfig';
import { db, firebaseConfig } from '../firebase';
import { useAuth } from '../lib/auth';
import { useCol } from '../lib/hooks';
import { ConfirmButton, Drawer, Empty, Field, Icon, Pill, useToast } from '../components/ui';
import { PLANS, cleanHost, fdate, initials } from '../lib/format';

const tsDate = t => (t?.toDate ? t.toDate().toISOString().slice(0, 10) : typeof t === 'string' ? t : '');

export default function Admin() {
  const { profile, logout } = useAuth();
  const vendors = useCol('vendors');
  const domains = useCol('domains');
  const leads = useCol('leads');
  const pendingDomains = vendors.data.filter(v => v.domainStatus === 'pendiente').length;
  const newLeads = leads.data.filter(l => (l.estado || 'nuevo') === 'nuevo').length;
  const tabs = [
    { to: '/admin', end: true, l: 'Vendedores', i: 'clients', n: 0 },
    { to: '/admin/dominios', l: 'Dominios', i: 'site', n: pendingDomains },
    { to: '/admin/interesados', l: 'Interesados', i: 'inbox', n: newLeads },
    { to: '/admin/precios', l: 'Precios', i: 'money', n: 0 },
  ];
  return (
    <div className="app">
      <aside className="side">
        <div className="me"><div className="logo"><Icon n="shield" /></div><div><b>Administración</b><span className="muted small">Representaciones comerciales</span></div></div>
        <nav className="nav">{tabs.map(t => <NavLink key={t.to} to={t.to} end={t.end}><Icon n={t.i} />{t.l}{t.n > 0 && <span className="count">{t.n}</span>}</NavLink>)}</nav>
        <div className="stack" style={{ marginTop: 'auto', gap: 10 }}>
          {profile?.role === 'vendedor' && <Link className="btn sm" to="/panel"><Icon n="home" />Mi panel de vendedor</Link>}
          <button className="btn sm" onClick={logout}><Icon n="out" />Salir</button>
        </div>
      </aside>
      <main className="main">
        <div className="topm"><b className="grow">Administración</b><button className="btn sm" onClick={logout}>Salir</button></div>
        <div className="content">
          <Routes>
            <Route index element={<Vendors vendors={vendors.data} />} />
            <Route path="dominios" element={<Domains vendors={vendors.data} domains={domains.data} />} />
            <Route path="interesados" element={<Leads leads={leads.data} />} />
            <Route path="precios" element={<Pricing />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </main>
      <nav className="bnav">{tabs.map(t => <NavLink key={t.to} to={t.to} end={t.end}><Icon n={t.i} />{t.l}{t.n > 0 && <span className="count">{t.n}</span>}</NavLink>)}</nav>
    </div>
  );
}

function Vendors({ vendors }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('todos');
  const [open, setOpen] = useState(null);
  const list = useMemo(() => vendors
    .filter(v => f === 'todos' || v.status === f || v.plan === f)
    .filter(v => !q || [v.business, v.name, v.email, v.slug, v.domain].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => tsDate(b.createdAt).localeCompare(tsDate(a.createdAt))), [vendors, q, f]);
  const count = k => vendors.filter(v => v.status === k || v.plan === k).length;
  return (
    <>
      <div className="head"><div className="grow"><h1>Vendedores</h1><p>{vendors.length} cuentas en total.</p></div></div>
      <div className="kpis">
        <div className="card kpi"><span className="label">Activos</span><span className="v">{count('activo')}</span></div>
        <div className="card kpi"><span className="label">En prueba</span><span className="v">{count('prueba')}</span></div>
        <div className="card kpi"><span className="label">Pagando</span><span className="v">{vendors.filter(v => ['inicial', 'profesional', 'agencia'].includes(v.plan) && v.status === 'activo').length}</span></div>
        <div className="card kpi"><span className="label">Suspendidos</span><span className="v">{count('suspendido')}</span></div>
      </div>
      <div className="filters">{[['todos', 'Todos'], ['activo', 'Activos'], ['prueba', 'En prueba'], ['suspendido', 'Suspendidos']].map(([k, l]) => <button key={k} className={'fbtn ' + (f === k ? 'on' : '')} onClick={() => setF(k)}>{l}</button>)}</div>
      <Field label="Buscar"><input id="a-q" className="input" placeholder="Nombre, email, dirección o dominio" value={q} onChange={e => setQ(e.target.value)} /></Field>
      <div className="card">
        {list.length === 0 ? <Empty title="No hay vendedores para mostrar" /> : (
          <div className="list">{list.map(v => (
            <button key={v.id} className="item" onClick={() => setOpen(v.id)}>
              <div className="me" style={{ padding: 0 }}><div className="logo" style={{ background: v.color }}>{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(v.business)}</div></div>
              <div className="grow"><div className="t">{v.business}</div><div className="s">{v.name} · {v.email} · /v/{v.slug}{v.domain ? ' · ' + v.domain : ''}</div></div>
              <span className="pill plain hide-m">{PLANS[v.plan] || v.plan}</span>
              <Pill k={v.status}>{v.status === 'activo' ? 'Activo' : 'Suspendido'}</Pill>
            </button>
          ))}</div>
        )}
      </div>
      {open && <VendorDrawer v={vendors.find(x => x.id === open)} onClose={() => setOpen(null)} />}
    </>
  );
}

function VendorDrawer({ v, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ plan: v.plan, status: v.status, trialEnds: v.trialEnds || '', adminNotes: v.adminNotes || '' });
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    Promise.all(['brands', 'products', 'clients', 'orders'].map(c => getCountFromServer(collection(db, 'vendors', v.id, c)).then(s => s.data().count).catch(() => '—')))
      .then(([b, p, c, o]) => setCounts({ b, p, c, o }));
  }, [v.id]);
  const save = async () => { await updateDoc(doc(db, 'vendors', v.id), f); toast('Cuenta actualizada'); onClose(); };
  const wa = String(v.whatsapp || '').replace(/\D/g, '');
  const [dom, setDom] = useState(v.domain || '');
  const connectDomain = async () => {
    const d = cleanHost(dom);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) { toast('Escribí el dominio así: tuempresa.com.ar'); return; }
    const b = writeBatch(db);
    if (v.domain && v.domain !== d) b.delete(doc(db, 'domains', v.domain));
    b.set(doc(db, 'domains', d), { vendorId: v.id, status: 'activo', business: v.business, connectedAt: serverTimestamp() });
    b.update(doc(db, 'vendors', v.id), { domain: d, domainStatus: 'activo' });
    await b.commit(); toast(d + ' quedó conectado a ' + v.business);
  };
  const removeDomain = async () => {
    const b = writeBatch(db);
    if (v.domain) b.delete(doc(db, 'domains', v.domain));
    b.update(doc(db, 'vendors', v.id), { domain: '', domainStatus: 'sin' });
    await b.commit(); setDom(''); toast('Dominio desconectado');
  };
  return (
    <Drawer title={v.business} sub={<span className="label">Vendedor</span>} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Guardar cambios</button></>}>
      <dl className="dl">
        <dt>Titular</dt><dd>{v.name}</dd><dt>Email</dt><dd>{v.email}</dd><dt>WhatsApp</dt><dd>{v.whatsapp}</dd>
        <dt>Dirección</dt><dd>/v/{v.slug}</dd><dt>Dominio</dt><dd>{v.domain || '—'} {v.domain && `(${v.domainStatus})`}</dd><dt>Alta</dt><dd>{fdate(tsDate(v.createdAt))}</dd>
      </dl>
      {counts && <div className="kpis">
        <div className="card kpi"><span className="label">Marcas</span><span className="v">{counts.b}</span></div>
        <div className="card kpi"><span className="label">Artículos</span><span className="v">{counts.p}</span></div>
        <div className="card kpi"><span className="label">Clientes</span><span className="v">{counts.c}</span></div>
        <div className="card kpi"><span className="label">Pedidos</span><span className="v">{counts.o}</span></div>
      </div>}
      <div className="row">
        <a className="btn sm" href={`/v/${v.slug}`} target="_blank" rel="noreferrer"><Icon n="store" />Ver su sitio</a>
        {wa && <a className="btn sm ok" href={`https://wa.me/${wa.startsWith('54') ? wa : '549' + wa}`} target="_blank" rel="noreferrer"><Icon n="send" />Escribirle</a>}
      </div>
      <div className="grid g2">
        <Field label="Estado de la cuenta"><select id="v-st" className="input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="activo">Activa</option><option value="suspendido">Suspendida</option></select></Field>
        <Field label="Plan"><select id="v-pl" className="input" value={f.plan} onChange={e => setF({ ...f, plan: e.target.value })}>{Object.entries(PLANS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Prueba gratis hasta"><input id="v-tr" className="input" type="date" value={f.trialEnds} onChange={e => setF({ ...f, trialEnds: e.target.value })} /></Field>
      </div>
      <section className="card pad stack" style={{ background: 'var(--surface-2)' }}>
        <div className="row between"><h3>Dominio propio</h3>{v.domainStatus === 'activo' ? <span className="pill activo">Conectado</span> : v.domainStatus === 'pendiente' ? <span className="pill pendiente">Pedido por el vendedor</span> : null}</div>
        <p className="muted small">Primero agregá el dominio en Vercel (Settings → Domains). Después escribilo acá y tocá “Conectar”: desde ese momento el dominio abre la tienda de este vendedor.</p>
        <Field label="Dominio"><input id="v-dom" className="input" placeholder="tuempresa.com.ar" value={dom} onChange={e => setDom(e.target.value)} /></Field>
        <div className="row">
          <button className="btn ok sm" onClick={connectDomain}><Icon n="check" />Conectar este dominio</button>
          {v.domain && <ConfirmButton className="btn sm danger" question="¿Desconectar?" yes="Desconectar" onConfirm={removeDomain}>Desconectar</ConfirmButton>}
          {v.domainStatus === 'activo' && <a className="btn sm" href={`https://${v.domain}`} target="_blank" rel="noreferrer">Abrir {v.domain}</a>}
        </div>
      </section>
      <Field label="Nota para el vendedor" hint="La ve en “Mi sitio” si rechazás su dominio."><textarea id="v-note" className="input" value={f.adminNotes} onChange={e => setF({ ...f, adminNotes: e.target.value })} /></Field>
      {f.status === 'suspendido' && <div className="notice warn">Con la cuenta suspendida, el vendedor no puede entrar a su panel y su tienda deja de estar disponible. No se borra ningún dato.</div>}
    </Drawer>
  );
}

function Domains({ vendors, domains }) {
  const toast = useToast();
  const pending = vendors.filter(v => v.domainStatus === 'pendiente');
  const [dns, setDns] = useState({});
  const consoleUrl = 'https://vercel.com/dashboard';
  const VERCEL_DNS = 'Tipo A  ·  Nombre: @  ·  Valor: 76.76.21.21\nTipo CNAME  ·  Nombre: www  ·  Valor: cname.vercel-dns.com';
  const saveDns = async v => { await updateDoc(doc(db, 'vendors', v.id), { dnsRecords: dns[v.id] ?? v.dnsRecords ?? VERCEL_DNS }); toast('Datos enviados al vendedor'); };
  const connect = async v => {
    const b = writeBatch(db);
    b.set(doc(db, 'domains', v.domain), { vendorId: v.id, status: 'activo', business: v.business, connectedAt: serverTimestamp() });
    b.update(doc(db, 'vendors', v.id), { domainStatus: 'activo' });
    await b.commit(); toast(v.domain + ' conectado');
  };
  const reject = async v => { await updateDoc(doc(db, 'vendors', v.id), { domainStatus: 'rechazado', adminNotes: v.adminNotes || 'No pudimos conectar ese dominio. Revisá que sea tuyo y escribinos.' }); toast('Pedido rechazado'); };
  const disconnect = async d => {
    const b = writeBatch(db);
    b.delete(doc(db, 'domains', d.id));
    const v = vendors.find(x => x.id === d.vendorId);
    if (v && v.domain === d.id) b.update(doc(db, 'vendors', v.id), { domainStatus: 'sin', domain: '' });
    await b.commit(); toast('Dominio desconectado');
  };
  return (
    <>
      <div className="head"><div className="grow"><h1>Dominios</h1><p>Los vendedores piden conectar su dominio y vos lo habilitás.</p></div>
        <a className="btn" href={consoleUrl} target="_blank" rel="noreferrer">Abrir Vercel</a></div>

      <div className="card pad stack">
        <h2>Cómo se conecta un dominio</h2>
        <ol style={{ margin: 0, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>En <b>Vercel → tu proyecto → Settings → Domains → Add</b>, cargá el dominio del vendedor (y también la versión con <b>www</b>).</li>
          <li>Vercel te muestra los registros DNS (normalmente un <b>A</b> a 76.76.21.21 y un <b>CNAME</b> a cname.vercel-dns.com). Ya vienen cargados abajo en <b>“Datos para el vendedor”</b>: revisalos y tocá <b>“Enviar datos al vendedor”</b>. El vendedor los ve en su panel.</li>
          <li>Cuando Vercel diga <b>“Valid Configuration”</b>, tocá <b>“Marcar como conectado”</b>. Desde ese momento el dominio abre la tienda del vendedor.</li>
          <li>También podés conectar un dominio sin que lo pida el vendedor: en <b>Vendedores</b>, abrí al vendedor y usá “Dominio propio”.</li>
        </ol>
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 8 }}><h2>Pedidos pendientes ({pending.length})</h2></div>
        {pending.length === 0 ? <Empty title="No hay pedidos de dominio" /> : (
          <div className="list">{pending.map(v => (
            <div key={v.id} className="item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
              <div className="row between"><div><div className="t">{v.domain}</div><div className="s">{v.business} · {v.email} · pedido el {fdate(v.domainRequestedAt)}</div></div><Pill k="pendiente">Pendiente</Pill></div>
              <Field label="Datos para el vendedor (registros DNS)"><textarea id={'dns-' + v.id} className="input" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 16 }} placeholder={'Tipo A  ·  @  ·  199.36.158.100\nTipo TXT  ·  @  ·  hosting-site=...'} value={dns[v.id] ?? v.dnsRecords ?? VERCEL_DNS} onChange={e => setDns({ ...dns, [v.id]: e.target.value })} /></Field>
              <div className="row">
                <button className="btn" onClick={() => saveDns(v)}>Enviar datos al vendedor</button>
                <button className="btn ok" onClick={() => connect(v)}><Icon n="check" />Marcar como conectado</button>
                <ConfirmButton question="¿Rechazar?" yes="Rechazar" onConfirm={() => reject(v)}>Rechazar</ConfirmButton>
              </div>
            </div>
          ))}</div>
        )}
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 8 }}><h2>Dominios conectados ({domains.length})</h2></div>
        {domains.length === 0 ? <Empty title="Todavía no hay dominios conectados" /> : (
          <div className="list">{domains.map(d => {
            const v = vendors.find(x => x.id === d.vendorId);
            const orphan = !v || v.domain !== d.id;
            return (
              <div key={d.id} className="item">
                <div className="grow"><div className="t">{d.id}</div><div className="s">{v ? v.business : 'Vendedor borrado'}{orphan ? ' · el vendedor ya no lo usa' : ''}</div></div>
                <a className="btn sm" href={`https://${d.id}`} target="_blank" rel="noreferrer">Abrir</a>
                <ConfirmButton className="btn sm danger" question="¿Desconectar?" yes="Desconectar" onConfirm={() => disconnect(d)}>Desconectar</ConfirmButton>
              </div>
            );
          })}</div>
        )}
      </div>
    </>
  );
}

function Leads({ leads }) {
  const toast = useToast();
  const list = [...leads].sort((a, b) => tsDate(b.createdAt).localeCompare(tsDate(a.createdAt)));
  const setEstado = async (l, estado) => { await updateDoc(doc(db, 'leads', l.id), { estado }); toast('Guardado'); };
  return (
    <>
      <div className="head"><div className="grow"><h1>Interesados</h1><p>Personas que dejaron sus datos en la página de venta.</p></div></div>
      <div className="card">
        {list.length === 0 ? <Empty title="Todavía no hay interesados" text="Cuando alguien complete el formulario de la página principal, aparece acá." /> : (
          <div className="list">{list.map(l => {
            const wa = String(l.whatsapp || '').replace(/\D/g, '');
            return (
              <div key={l.id} className="item">
                <div className="grow"><div className="t">{l.nombre}</div><div className="s">{[l.whatsapp, l.email, l.rubro, l.marcas && l.marcas + ' marcas', fdate(tsDate(l.createdAt))].filter(Boolean).join(' · ')}</div></div>
                <select aria-label="Estado" className="input" style={{ width: 'auto' }} value={l.estado || 'nuevo'} onChange={e => setEstado(l, e.target.value)}>
                  <option value="nuevo">Nuevo</option><option value="contactado">Contactado</option><option value="cliente">Ya es cliente</option><option value="descartado">Descartado</option>
                </select>
                {wa && <a className="btn sm ok" target="_blank" rel="noreferrer" href={`https://wa.me/${wa.startsWith('54') ? wa : '549' + wa}?text=${encodeURIComponent('Hola ' + l.nombre.split(' ')[0] + ', te escribo de Representaciones comerciales por tu consulta.')}`}>WhatsApp</a>}
                <ConfirmButton className="btn sm danger" question="¿Borrar?" yes="Borrar" onConfirm={() => deleteDoc(doc(db, 'leads', l.id))}>Borrar</ConfirmButton>
              </div>
            );
          })}</div>
        )}
      </div>
    </>
  );
}

function Pricing() {
  const toast = useToast();
  const { pricing, loading } = usePricing();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && !f) setF(JSON.parse(JSON.stringify(pricing))); }, [loading]);
  if (!f) return <p className="muted">Cargando…</p>;
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const setPlan = (i, k, v) => setF(x => ({ ...x, plans: x.plans.map((p, j) => j === i ? { ...p, [k]: v } : (k === 'highlight' && v ? { ...p, highlight: false } : p)) }));
  const move = (i, d) => setF(x => { const pl = [...x.plans]; const [it] = pl.splice(i, 1); pl.splice(i + d, 0, it); return { ...x, plans: pl }; });
  const save = async () => {
    setBusy(true);
    const clean = { ...f, trialDays: parseInt(f.trialDays) || 14, plans: f.plans.map(p => ({ ...p, key: p.key || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), features: (p.features || []).map(x => x.trim()).filter(Boolean) })) };
    try { await setDoc(doc(db, 'config', 'pricing'), clean); toast('Precios publicados en la página'); } catch (e) { console.error(e); toast('No se pudo guardar'); }
    setBusy(false);
  };
  return (
    <>
      <div className="head">
        <div className="grow"><h1>Precios</h1><p>Lo que cambies acá se ve en la página de venta apenas tocás “Publicar”.</p></div>
        <div className="row"><a className="btn" href="/#precios" target="_blank" rel="noreferrer">Ver la página</a><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Publicando…' : 'Publicar cambios'}</button></div>
      </div>
      <section className="card pad stack">
        <h2>Textos generales</h2>
        <div className="grid g2">
          <Field label="Título de la sección"><input id="pr-t" className="input" value={f.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Días de prueba gratis" hint="Se aplica a las cuentas nuevas."><input id="pr-d" className="input" inputMode="numeric" value={f.trialDays} onChange={e => set('trialDays', e.target.value)} /></Field>
        </div>
        <Field label="Bajada"><input id="pr-s" className="input" value={f.subtitle} onChange={e => set('subtitle', e.target.value)} /></Field>
        <Field label="Aclaración al pie"><input id="pr-n" className="input" value={f.note} onChange={e => set('note', e.target.value)} /></Field>
      </section>
      {f.plans.map((p, i) => (
        <section key={i} className="card pad stack" style={p.highlight ? { borderColor: 'var(--primary)', borderWidth: 2 } : undefined}>
          <div className="row between"><h2>Plan {i + 1}: {p.name || 'sin nombre'}</h2>
            <div className="row" style={{ gap: 8 }}>
              {i > 0 && <button className="btn sm" onClick={() => move(i, -1)}>Subir</button>}
              {i < f.plans.length - 1 && <button className="btn sm" onClick={() => move(i, 1)}>Bajar</button>}
              <ConfirmButton className="btn sm danger" question="¿Quitar este plan?" yes="Quitar" onConfirm={() => set('plans', f.plans.filter((_, j) => j !== i))}>Quitar</ConfirmButton>
            </div></div>
          <div className="grid g3">
            <Field label="Nombre"><input id={'pl-n' + i} className="input" value={p.name} onChange={e => setPlan(i, 'name', e.target.value)} /></Field>
            <Field label="Precio" hint="Ej.: $ 19.900 o A medida"><input id={'pl-p' + i} className="input" value={p.price} onChange={e => setPlan(i, 'price', e.target.value)} /></Field>
            <Field label="Período" hint="Ej.: por mes"><input id={'pl-per' + i} className="input" value={p.period} onChange={e => setPlan(i, 'period', e.target.value)} /></Field>
          </div>
          <Field label="Qué incluye" hint="Una cosa por renglón."><textarea id={'pl-f' + i} className="input" style={{ minHeight: 150 }} value={(p.features || []).join('\n')} onChange={e => setPlan(i, 'features', e.target.value.split('\n'))} /></Field>
          <div className="grid g2">
            <Field label="Texto del botón"><input id={'pl-c' + i} className="input" value={p.cta} onChange={e => setPlan(i, 'cta', e.target.value)} /></Field>
            <label className="check" style={{ alignSelf: 'end', minHeight: 50 }}><input type="checkbox" checked={!!p.highlight} onChange={e => setPlan(i, 'highlight', e.target.checked)} />Destacar como “El más elegido”</label>
          </div>
        </section>
      ))}
      <div className="row">
        {f.plans.length < 4 && <button className="btn" onClick={() => set('plans', [...f.plans, { key: '', name: 'Nuevo plan', price: '$ 0', period: 'por mes', features: [], cta: 'Empezar gratis', highlight: false }])}><Icon n="plus" />Agregar un plan</button>}
        <ConfirmButton className="btn" question="¿Volver a los precios originales?" yes="Sí, restaurar" onConfirm={() => setF(JSON.parse(JSON.stringify(DEFAULT_PRICING)))}>Restaurar precios originales</ConfirmButton>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Publicando…' : 'Publicar cambios'}</button>
      </div>
    </>
  );
}
