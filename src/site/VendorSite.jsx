import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { authError, useAuth } from '../lib/auth';
import { useCol, useDocData } from '../lib/hooks';
import { BrandMark, Empty, Field, Icon, Loading, Pill, useToast } from '../components/ui';
import { IVA, fdate, fmt, initials, net } from '../lib/format';
import { createOrder } from '../lib/orders';
import { quote } from '../lib/terms';
import Breakdown from '../components/Breakdown';
import Footer from '../components/Footer';
import VendorHome from './VendorHome';
import { InstallCard, useAppManifest } from '../components/Install';

const MAIN_HOST = (import.meta.env.VITE_MAIN_HOSTS || '').split(',')[0].trim();

export default function VendorSite({ vendorId: vid, base }) {
  const vendor = useDocData(`vendors/${vid}`);
  const brandsQ = useCol(`vendors/${vid}/brands`);
  const { user, profile, logout } = useAuth();
  const client = useDocData(user && user.uid !== vid ? `vendors/${vid}/clients/${user.uid}` : null);
  const [carts, setCarts] = useState({});
  useAppManifest({ start: (base || '') + '/tienda', name: vendor.data?.business || 'Tienda', color: vendor.data?.color });
  useEffect(() => { if (vendor.data) document.title = vendor.data.business; }, [vendor.data]);

  if (vendor.loading) return <Loading />;
  const v = vendor.data;
  if (!v || v.status === 'suspendido') return <div className="authwrap"><div className="card authcard"><h1>Sitio no disponible</h1><p className="muted">Este sitio no está disponible por el momento.</p></div></div>;

  const isOwner = user?.uid === vid;
  const approved = isOwner || client.data?.status === 'activo';
  const brands = [...brandsQ.data].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));
  const ctx = { vid, v, base, brands, user, client: client.data, isOwner, approved, carts, setCarts };
  const to = p => (base + p) || '/';

  return (
    <div style={{ '--primary': v.color || '#1B5E86', '--primary-hover': v.color || '#1B5E86', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="shead"><div className="in">
        <Link to={to('/')} className="row" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'nowrap', gap: 12, minWidth: 0, flex: 1 }}>
          <div className="me" style={{ padding: 0 }}><div className="logo" style={{ background: v.color }}>{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(v.business)}</div></div>
          <b style={{ fontSize: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.business}</b>
        </Link>
        <nav className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <NavLink to={to('/tienda')} className="btn sm primary">Tienda</NavLink>
          {user && client.data && <NavLink to={to('/mis-pedidos')} className="btn sm hide-m">Mis pedidos</NavLink>}
          {user ? <button className="btn sm hide-m" onClick={logout}>Salir</button> : <NavLink to={to('/ingresar')} className="btn sm">Ingresar</NavLink>}
        </nav>
      </div></header>
      {isOwner && <div style={{ background: 'var(--accent-soft)', padding: '10px 16px', textAlign: 'center', fontSize: 16 }}>Estás viendo tu sitio como lo ven tus clientes. <Link to="/panel"><b>Volver a mi panel</b></Link></div>}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route index element={<VendorHome ctx={ctx} to={to} />} />
          <Route path="tienda" element={<ShopHome ctx={ctx} to={to} />} />
          <Route path="tienda/:brandId" element={<BrandShop ctx={ctx} to={to} />} />
          <Route path="ingresar" element={<ClientLogin ctx={ctx} to={to} />} />
          <Route path="registro" element={<ClientSignup ctx={ctx} to={to} />} />
          <Route path="mis-pedidos" element={user ? <MyOrders ctx={ctx} to={to} /> : <Navigate to={to('/ingresar')} replace />} />
          <Route path="*" element={<Navigate to={to('/')} replace />} />
        </Routes>
      </div>
      <Footer color={v.color}
        d={{ name: v.business, logoUrl: v.logoUrl, tagline: v.heroSubtitle || 'Representaciones comerciales', legalName: v.legalName, cuit: v.cuit, ivaCond: v.ivaCond,
          address: v.address, city: v.city, phone: v.phone, whatsapp: v.whatsapp, email: v.email, hours: v.hours, instagram: v.instagram, facebook: v.facebook, linkedin: v.linkedin, website: v.website }}
        links={[{ label: 'Inicio', to: to('/') }, { label: 'Tienda y catálogos', to: to('/tienda') }, ...(client.data ? [{ label: 'Mis pedidos', to: to('/mis-pedidos') }] : []), user ? { label: 'Salir', onClick: logout } : { label: 'Ingresar', to: to('/ingresar') }, ...(!user ? [{ label: 'Quiero ser cliente', to: to('/registro') }] : [])]}
        bottom={<span>Sitio hecho con <a href={MAIN_HOST && !window.location.pathname.startsWith('/v/') ? 'https://' + MAIN_HOST : '/'}>Representaciones comerciales</a></span>} />
    </div>
  );
}

const waLink = (num, text) => { const n = String(num || '').replace(/\D/g, ''); return `https://wa.me/${n.startsWith('54') ? n : '549' + n}${text ? '?text=' + encodeURIComponent(text) : ''}`; };

function AccessNotice({ ctx, to }) {
  const { user, client } = ctx;
  if (!user) return (
    <div className="notice"><div className="grow"><b>Para ver precios y hacer pedidos, ingresá con tu cuenta</b>Si todavía no sos cliente, registrate: te aprobamos en el día.</div>
      <div className="row" style={{ flexWrap: 'nowrap' }}><Link className="btn sm primary" to={to('/ingresar')}>Ingresar</Link><Link className="btn sm" to={to('/registro')}>Registrarme</Link></div></div>
  );
  if (!client) return <div className="notice warn"><div className="grow"><b>Tu usuario todavía no es cliente de esta tienda</b>Completá tus datos para pedir el alta.</div><Link className="btn sm" to={to('/registro')}>Pedir el alta</Link></div>;
  if (client.status === 'pendiente') return <div className="notice warn"><div><b>Tu solicitud está en revisión</b>Cuando te aprueben, vas a ver los precios acá mismo.</div></div>;
  return <div className="notice bad"><div><b>Tu cuenta de cliente está pausada</b>Comunicate con tu representante.</div></div>;
}

function ShopHome({ ctx, to }) {
  const { brands, approved, client } = ctx;
  return (
    <div className="swrap">
      <div className="stack" style={{ gap: 6 }}><h1>{client?.name ? `Hola, ${client.contact?.split(' ')[0] || client.name}` : 'Tienda'}</h1><p className="muted">Elegí una marca para ver su catálogo y armar tu pedido. Cada marca factura por separado.</p></div>
      {!approved && <AccessNotice ctx={ctx} to={to} />}
      {approved && <InstallCard title="Tené esta tienda en tu celular" text="Instalala como app para hacer pedidos y ver tus facturas con un toque." storageKey={'rc-install-shop-' + ctx.vid} />}
      <div className="logowall">{brands.map(b => (
        <Link key={b.id} to={to('/tienda/' + b.id)} className="card lw">
          <BrandMark b={b} size="l" /><b style={{ fontSize: 19 }}>{b.name}</b><span className="muted small">{b.tag}</span>
          {b.cond?.minimo > 0 && <span className="pill plain">Mínimo {fmt(b.cond.minimo)}</span>}
        </Link>
      ))}</div>
    </div>
  );
}

function BrandShop({ ctx, to }) {
  const { brandId } = useParams();
  const { vid, v, brands, approved, isOwner, client, carts, setCarts, user } = ctx;
  const toast = useToast();
  const b = brands.find(x => x.id === brandId);
  const prodsQ = useCol(approved ? `vendors/${vid}/products` : null, [where('brandId', '==', brandId)], brandId);
  const [sent, setSent] = useState(null);
  const [notes, setNotes] = useState('');
  const [pay, setPay] = useState('');
  const [busy, setBusy] = useState(false);
  if (!b) return <div className="swrap"><Empty title="Marca no encontrada" action={<Link className="btn" to={to('/tienda')}>Volver a la tienda</Link>} /></div>;
  const prods = prodsQ.data.filter(p => p.active !== false).sort((a, c) => a.name.localeCompare(c.name));
  const cart = carts[brandId] || {};
  const setQty = (id, q) => setCarts(cs => ({ ...cs, [brandId]: { ...(cs[brandId] || {}), [id]: Math.max(0, q) } }));
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => { const p = prods.find(x => x.id === id); return p && { productId: id, sku: p.sku, name: p.name, price: p.price, qty }; }).filter(Boolean);
  const q = quote(b, client, items, pay);
  const tm = q.terms;
  const unitFactor = (1 - tm.base / 100) * (1 - tm.extra / 100);
  const disc = Math.round((1 - unitFactor) * 10000) / 100;
  const n = q.net;
  const min = q.minimo;
  const pesos = v => '$ ' + Number(v).toLocaleString('es-AR');
  const conds = [['Lista', b.cond?.lista], [tm.hasSpecial ? 'Tu bonificación' : 'Bonificación', disc ? disc + '% sobre lista' : ''], ['Plazo de pago', tm.plazo], ['Pedido mínimo', min ? fmt(min) + ' sin IVA' : ''], ['Flete', b.cond?.flete], ['Entrega', b.cond?.entrega],
    ['Formas de pago', tm.pagos.length ? tm.pagos.map(x => x.nombre + (Number(x.ajuste) ? ` (${Number(x.ajuste) > 0 ? '-' + x.ajuste : '+' + Math.abs(x.ajuste)}%)` : '')).join(' · ') : b.cond?.pago],
    ['Bonificación por volumen', tm.escalas.map(e => `${e.extra}% extra desde ${pesos(e.desde)}`).join(' · ')], ['IVA', b.cond?.iva]].filter(([, x]) => x);

  const send = async () => {
    if (isOwner) { toast('Estás viendo tu propia tienda. Los pedidos los hacen tus clientes.'); return; }
    setBusy(true);
    try {
      const r = await createOrder(vid, { clientId: user.uid, clientName: client.name, brandId, brandName: b.name, status: 'recibido', origin: 'cliente', items, discount: q.effective, discountSteps: q.steps, payOption: pay || '', plazo: q.plazo || '', commissionRate: Number(b.commission) || 0, docs: [], commissionPaid: false, notes });
      setCarts(cs => ({ ...cs, [brandId]: {} })); setNotes(''); setSent(r.number); window.scrollTo(0, 0);
    } catch (e) { console.error(e); toast('No se pudo enviar el pedido. Probá de nuevo.'); }
    setBusy(false);
  };

  return (
    <>
      <div className="swrap">
        <Link to={to('/tienda')} className="btn sm" style={{ alignSelf: 'flex-start' }}><Icon n="back" />Todas las marcas</Link>
        <div className="row" style={{ gap: 18, flexWrap: 'nowrap' }}><BrandMark b={b} size="l" /><div><h1>{b.name}</h1><p className="muted">{b.tag}</p></div></div>
        {sent && (
          <div className="notice ok"><div className="grow"><b>¡Listo! Tu pedido {sent} le llegó a {v.name}.</b>Te avisan cuando esté confirmado. Podés seguirlo en “Mis pedidos”.</div>
            <div className="row">{v.whatsapp && <a className="btn sm ok" href={waLink(v.whatsapp, `Hola, te acabo de mandar el pedido ${sent} de ${b.name} desde la tienda.`)} target="_blank" rel="noreferrer">Avisar por WhatsApp</a>}<Link className="btn sm" to={to('/mis-pedidos')}>Mis pedidos</Link></div></div>
        )}
        {conds.length > 0 && <div className="conds">{conds.map(([k, x]) => <div key={k} className="card cond"><span className="label">{k}</span><b>{x}</b></div>)}</div>}
        {!approved ? <AccessNotice ctx={ctx} to={to} /> : prodsQ.loading ? <Loading text="Cargando catálogo…" /> : prods.length === 0 ? <div className="card"><Empty title="Esta marca todavía no tiene artículos cargados" /></div> : (
          <div className="pgrid">{prods.map(p => {
            const q = cart[p.id] || 0; const pack = p.pack || 1;
            return (
              <div key={p.id} className="card pcard">
                <div className="pimg" style={{ background: `color-mix(in srgb, ${b.color || '#1B5E86'} 12%, #fff)`, color: b.color }}>{p.imageUrl ? <img src={p.imageUrl} alt="" /> : b.name.slice(0, 1)}<span className="sku">{p.sku}</span></div>
                <div className="pbody">
                  <span className="name">{p.name}</span>
                  <span className="muted small">Bulto de {pack} · lista {fmt(p.price)}</span>
                  <span className="price">{fmt(p.price * (1 - disc / 100))} <span className="muted small" style={{ fontWeight: 400 }}>+ IVA</span></span>
                  <div style={{ marginTop: 'auto' }}>
                    {q === 0 ? <button className="btn primary block" onClick={() => setQty(p.id, pack)}><Icon n="plus" />Agregar</button> : (
                      <div className="stepper" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <button aria-label="Sacar un bulto" onClick={() => setQty(p.id, q - pack)}>−</button>
                        <input aria-label="Cantidad" inputMode="numeric" value={q} onChange={e => setQty(p.id, parseInt(e.target.value) || 0)} />
                        <button aria-label="Sumar un bulto" onClick={() => setQty(p.id, q + pack)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}</div>
        )}
        {items.length > 0 && (
          <div className="card pad stack">
            <h2>Tu pedido</h2>
            {tm.pagos.length > 0 && <Field label="¿Cómo vas a pagar?">
              <select id="sh-pay" className="input" value={pay} onChange={e => setPay(e.target.value)}>
                <option value="">{tm.plazo || 'Elegí una opción'}</option>
                {tm.pagos.map(x => <option key={x.nombre} value={x.nombre}>{x.nombre}{Number(x.ajuste) ? ` (${Number(x.ajuste) > 0 ? x.ajuste + '% de descuento' : Math.abs(x.ajuste) + '% de recargo'})` : ''}</option>)}
              </select></Field>}
            <Breakdown subtotal={q.subtotal} steps={q.steps} effective={q.effective} net={n} />
            {q.nextTier && <div className="notice">Si sumás {fmt(q.nextTier.desde - q.subtotal)} más (a precio de lista) tenés <b style={{ display: 'inline' }}>{q.nextTier.extra}% de bonificación extra</b>.</div>}
          </div>
        )}
        {items.length > 0 && <Field label="Comentarios para tu pedido (opcional)"><textarea id="sh-notes" className="input" placeholder="Horario de entrega, dirección, etc." value={notes} onChange={e => setNotes(e.target.value)} /></Field>}
      </div>
      {items.length > 0 && (
        <div className="cartbar"><div className="in">
          <div className="stack" style={{ gap: 0 }}><span className="muted small">{items.length} artículos · sin IVA</span><span style={{ fontSize: 26, fontWeight: 700 }}>{fmt(n)}</span><span className="muted small">Con IVA: {fmt(n * (1 + IVA))}</span></div>
          {min > 0 && <div className="stack grow" style={{ gap: 6, minWidth: 180 }}>
            <div className="bar" style={{ '--c': n >= min ? 'var(--ok)' : 'var(--accent)' }}><i style={{ width: Math.min(100, n / min * 100) + '%' }} /></div>
            <span className="small" style={{ fontWeight: 700, color: n >= min ? 'var(--ok)' : 'var(--warn)' }}>{n >= min ? '✓ Llegaste al pedido mínimo' : 'Te faltan ' + fmt(min - n) + ' para el mínimo'}</span>
          </div>}
          <button className="btn primary" disabled={busy || n < min} onClick={send}><Icon n="send" />{busy ? 'Enviando…' : 'Enviar pedido'}</button>
        </div></div>
      )}
    </>
  );
}

function ClientLogin({ ctx, to }) {
  const { user, client, v } = ctx;
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (user && client) nav(to('/tienda'), { replace: true }); }, [user, client]);
  const submit = async e => {
    e.preventDefault(); setMsg(null); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), pass); } catch (err) { setMsg({ t: 'bad', m: authError(err) }); }
    setBusy(false);
  };
  const reset = async () => {
    if (!email) { setMsg({ t: 'warn', m: 'Escribí tu email arriba y tocá otra vez “Olvidé mi contraseña”.' }); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setMsg({ t: 'ok', m: 'Te mandamos un email para crear una contraseña nueva.' }); } catch (err) { setMsg({ t: 'bad', m: authError(err) }); }
  };
  return (
    <div className="authwrap" style={{ minHeight: 'auto', paddingBlock: 48 }}>
      <form className="card authcard" onSubmit={submit} noValidate>
        <div className="stack" style={{ gap: 6 }}><h1>Ingresar</h1><p className="muted">Entrá a la tienda de {v.business}.</p></div>
        {user && !client && <div className="notice warn">Ya ingresaste, pero todavía no sos cliente de esta tienda. <Link to={to('/registro')}><b style={{ display: 'inline' }}>Pedí el alta acá</b></Link>.</div>}
        <Field label="Email"><input id="cl-email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><input id="cl-pass" className="input" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} /></Field>
        {msg && <div className={'notice ' + msg.t}>{msg.m}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <button type="button" className="btn link" onClick={reset}>Olvidé mi contraseña</button>
        <p className="muted" style={{ textAlign: 'center' }}>¿No tenés cuenta? <Link to={to('/registro')}><b>Registrate</b></Link></p>
      </form>
    </div>
  );
}

function ClientSignup({ ctx, to }) {
  const { vid, v, user, client } = ctx;
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', cuit: '', contact: '', phone: '', city: '', address: '', email: '', pass: '' });
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k, val) => setF(x => ({ ...x, [k]: val }));
  if (user?.uid === vid) return <div className="swrap"><div className="notice">Estás en tu propia tienda. Tus clientes se registran desde esta página.</div></div>;
  if (client) return <div className="swrap"><div className={'notice ' + (client.status === 'activo' ? 'ok' : 'warn')}><div className="grow"><b>{client.status === 'activo' ? 'Ya sos cliente de esta tienda' : 'Tu solicitud ya fue enviada'}</b>{client.status === 'activo' ? 'Podés ver precios y hacer pedidos.' : 'Te avisamos cuando te aprueben.'}</div><Link className="btn sm" to={to('/tienda')}>Ir a la tienda</Link></div></div>;
  const submit = async e => {
    e.preventDefault(); setMsg(null);
    if (!f.name.trim() || !f.contact.trim() || !f.phone.trim()) return setMsg('Completá el nombre del comercio, tu nombre y tu WhatsApp.');
    if (!user && (!f.email || f.pass.length < 6)) return setMsg('Poné tu email y una contraseña de al menos 6 caracteres.');
    setBusy(true);
    try {
      const u = user || (await createUserWithEmailAndPassword(auth, f.email.trim(), f.pass)).user;
      const uref = doc(db, 'users', u.uid);
      const us = await getDoc(uref);
      if (!us.exists()) await setDoc(uref, { role: 'cliente', vendorId: vid, vendorSlug: v.slug, name: f.contact.trim(), email: u.email });
      else if (us.data().role === 'cliente') await updateDoc(uref, { vendorId: vid, vendorSlug: v.slug });
      await setDoc(doc(db, 'vendors', vid, 'clients', u.uid), {
        name: f.name.trim(), cuit: f.cuit.trim(), iva: 'Responsable inscripto', contact: f.contact.trim(), phone: f.phone.trim(), city: f.city.trim(), address: f.address.trim(),
        email: u.email, status: 'pendiente', web: true, createdAt: new Date().toISOString().slice(0, 10),
      });
      nav(to('/tienda'), { replace: true });
    } catch (err) { console.error(err); setMsg(authError(err)); setBusy(false); }
  };
  return (
    <div className="authwrap" style={{ minHeight: 'auto', paddingBlock: 48 }}>
      <form className="card authcard" style={{ width: 'min(640px,100%)' }} onSubmit={submit} noValidate>
        <div className="stack" style={{ gap: 6 }}><h1>Quiero ser cliente</h1><p className="muted">Completá los datos de tu comercio. {v.name} te aprueba y ya podés ver precios y pedir.</p></div>
        <Field label="Nombre del comercio o razón social"><input id="cs-name" className="input" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <div className="grid g2">
          <Field label="CUIT"><input id="cs-cuit" className="input" inputMode="numeric" placeholder="30-00000000-0" value={f.cuit} onChange={e => set('cuit', e.target.value)} /></Field>
          <Field label="Tu nombre"><input id="cs-con" className="input" autoComplete="name" value={f.contact} onChange={e => set('contact', e.target.value)} /></Field>
          <Field label="WhatsApp"><input id="cs-ph" className="input" inputMode="tel" autoComplete="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Localidad"><input id="cs-city" className="input" value={f.city} onChange={e => set('city', e.target.value)} /></Field>
        </div>
        <Field label="Dirección de entrega"><input id="cs-addr" className="input" autoComplete="street-address" value={f.address} onChange={e => set('address', e.target.value)} /></Field>
        {!user && <div className="grid g2">
          <Field label="Email"><input id="cs-em" className="input" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Contraseña" hint="Mínimo 6 caracteres"><input id="cs-pass" className="input" type="password" autoComplete="new-password" value={f.pass} onChange={e => set('pass', e.target.value)} /></Field>
        </div>}
        {msg && <div className="notice bad">{msg}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mis datos'}</button>
        {!user && <p className="muted" style={{ textAlign: 'center' }}>¿Ya tenés cuenta? <Link to={to('/ingresar')}><b>Ingresá</b></Link></p>}
      </form>
    </div>
  );
}

function MyOrders({ ctx, to }) {
  const { vid, user, brands } = ctx;
  const q = useCol(`vendors/${vid}/orders`, [where('clientId', '==', user.uid)], user.uid);
  const list = [...q.data].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || ''));
  return (
    <div className="swrap">
      <h1>Mis pedidos</h1>
      <div className="card">
        {q.loading ? <Loading /> : list.length === 0 ? <Empty title="Todavía no hiciste pedidos" action={<Link className="btn primary" to={to('/tienda')}>Ir a la tienda</Link>} /> : (
          <div className="list">{list.map(o => (
            <div key={o.id} className="item" style={{ alignItems: 'flex-start' }}>
              <BrandMark b={brands.find(x => x.id === o.brandId) || { name: o.brandName }} size="s" />
              <div className="grow stack" style={{ gap: 6 }}>
                <div><div className="t">{o.brandName}</div><div className="s">{o.number} · {fdate(o.date)} · {(o.items || []).length} artículos</div></div>
                {(o.docs || []).length > 0 && <div className="row" style={{ gap: 8 }}>{o.docs.map((d, i) => d.url
                  ? <a key={i} className="btn sm" href={d.url} target="_blank" rel="noreferrer"><Icon n="file" />{d.type} {d.number}</a>
                  : <span key={i} className="pill plain">{d.type} {d.number}</span>)}</div>}
              </div>
              <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}><Pill k={o.status} /><span className="amount">{fmt(net(o) * (1 + IVA))}</span></div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
