import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { authError, useAuth } from '../lib/auth';
import { slugify, today } from '../lib/format';
import { mergePricing } from '../lib/siteConfig';
import { getRef } from '../lib/referral';
import { Field } from '../components/ui';
import { BrandLine } from './Login';
import { RoleChooser, ClientFinder } from './RoleChooser';

const RESERVED = ['admin', 'panel', 'ingresar', 'registro', 'api', 'www', 'v', 'demo', 'soporte'];

export async function createVendor(uid, f) {
  const slug = slugify(f.slug);
  let days = 14;
  try { days = Number(mergePricing((await getDoc(doc(db, 'config', 'pricing'))).data()).trialDays) || 14; } catch (e) { /* usa 14 */ }
  const trial = new Date(today() + 'T12:00:00'); trial.setDate(trial.getDate() + days);
  await runTransaction(db, async tx => {
    const sref = doc(db, 'slugs', slug);
    if ((await tx.get(sref)).exists()) throw new Error('slug-taken');
    tx.set(sref, { vendorId: uid });
    tx.set(doc(db, 'vendors', uid), {
      ownerUid: uid, name: f.name.trim(), business: f.business.trim(), whatsapp: f.whatsapp.replace(/\D/g, ''), email: f.email.trim(),
      zone: '', about: '', slug, logoUrl: null, color: '#1F4FD8',
      status: 'activo', plan: 'prueba', trialEnds: trial.toISOString().slice(0, 10),
      domain: '', domainStatus: 'sin', createdAt: serverTimestamp(), ref: getRef() && getRef() !== slug ? getRef() : '',
    });
    tx.set(doc(db, 'users', uid), { role: 'vendedor', vendorId: uid, name: f.name.trim(), email: f.email.trim() });
  });
}

export default function Signup() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [f, setF] = useState({ name: '', business: '', whatsapp: '', email: '', pass: '', slug: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugFree, setSlugFree] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('rep');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => { if (!loading && profile?.role === 'vendedor') nav('/panel', { replace: true }); }, [profile, loading]);
  useEffect(() => { if (user?.email) set('email', user.email); }, [user]);
  useEffect(() => { if (!slugTouched) set('slug', slugify(f.business)); }, [f.business]);
  useEffect(() => {
    const s = slugify(f.slug);
    if (s.length < 3) { setSlugFree(null); return; }
    if (RESERVED.includes(s)) { setSlugFree(false); return; }
    const t = setTimeout(() => getDoc(doc(db, 'slugs', s)).then(d => setSlugFree(!d.exists())).catch(() => setSlugFree(null)), 400);
    return () => clearTimeout(t);
  }, [f.slug]);

  const submit = async e => {
    e.preventDefault(); setMsg(null);
    if (!f.name.trim() || !f.business.trim()) return setMsg('Completá tu nombre y el nombre de tu representación.');
    if (!f.whatsapp.trim()) return setMsg('Poné tu WhatsApp: es por donde te escriben tus clientes.');
    if (slugify(f.slug).length < 3) return setMsg('La dirección de tu sitio tiene que tener al menos 3 letras.');
    if (slugFree === false) return setMsg('Esa dirección ya está en uso. Probá con otra.');
    if (!user && (!f.email || f.pass.length < 6)) return setMsg('Poné tu email y una contraseña de al menos 6 caracteres.');
    setBusy(true);
    try {
      const uid = user ? user.uid : (await createUserWithEmailAndPassword(auth, f.email.trim(), f.pass)).user.uid;
      await createVendor(uid, f);
      nav('/panel', { replace: true });
    } catch (err) {
      setMsg(err.message === 'slug-taken' ? 'Esa dirección se acaba de ocupar. Elegí otra.' : authError(err));
      setBusy(false);
    }
  };

  return (
    <div className="authwrap">
      <form className="card authcard" style={{ width: 'min(620px,100%)' }} onSubmit={submit} noValidate>
        <BrandLine />
        <div className="stack" style={{ gap: 6 }}>
          <h1>{user ? 'Completá tus datos' : role === 'client' ? 'Buscá a tu representante' : 'Creá tu cuenta'}</h1>
          {role === 'rep' && <p className="muted">Empezás con una prueba gratis. No hace falta tarjeta.</p>}
        </div>
        {!user && <RoleChooser role={role} setRole={setRole} repLabel="Creá tu tienda para tus marcas y tus clientes" />}
        {role === 'client' && !user ? <ClientFinder /> : <>
        <div className="grid g2">
          <Field label="Tu nombre y apellido"><input id="s-name" className="input" autoComplete="name" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Nombre de tu representación" hint="Ej.: García Representaciones"><input id="s-bus" className="input" value={f.business} onChange={e => set('business', e.target.value)} /></Field>
        </div>
        <Field label="WhatsApp" hint="Con código de área. Ej.: 11 5555 5555"><input id="s-wa" className="input" inputMode="tel" autoComplete="tel" value={f.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>
        <Field label="Dirección de tu sitio" hint={slugFree === false ? '✗ Esa dirección no está disponible.' : slugFree ? '✓ Disponible.' : 'Sólo letras, números y guiones.'}>
          <div className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
            <span className="input" style={{ width: 'auto', borderRight: 0, borderRadius: '10px 0 0 10px', background: 'var(--surface-2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{window.location.host}/v/</span>
            <input id="s-slug" className="input" style={{ borderRadius: '0 10px 10px 0' }} value={f.slug} onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
          </div>
        </Field>
        {!user && <div className="grid g2">
          <Field label="Email"><input id="s-email" className="input" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Contraseña" hint="Mínimo 6 caracteres."><input id="s-pass" className="input" type="password" autoComplete="new-password" value={f.pass} onChange={e => set('pass', e.target.value)} /></Field>
        </div>}
        {msg && <div className="notice bad">{msg}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creando tu cuenta…' : 'Crear mi cuenta'}</button>
        </>}
        {!user && <p className="muted" style={{ textAlign: 'center' }}>¿Ya tenés cuenta? <Link to="/ingresar"><b>Ingresá</b></Link></p>}
      </form>
    </div>
  );
}
