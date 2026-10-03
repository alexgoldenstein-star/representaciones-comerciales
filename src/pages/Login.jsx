import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { authError, useAuth } from '../lib/auth';
import { Field } from '../components/ui';
import { RoleChooser, ClientFinder } from './RoleChooser';
import Logo from '../components/Logo';

export function BrandLine() {
  return <Link to="/" className="brandline" aria-label="Representaciones comerciales — inicio"><Logo size={44} /></Link>;
}

export default function Login() {
  const nav = useNavigate();
  const { user, profile, isSuper, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('rep');

  useEffect(() => {
    if (loading || !user) return;
    if (isSuper && profile?.role !== 'vendedor') nav('/admin', { replace: true });
    else if (profile?.role === 'vendedor') nav('/panel', { replace: true });
    else if (profile?.role === 'cliente' && profile.vendorSlug) nav(`/v/${profile.vendorSlug}/tienda`, { replace: true });
    else if (!profile) nav('/registro', { replace: true });
  }, [user, profile, isSuper, loading]);

  const submit = async e => {
    e.preventDefault(); setMsg(null);
    if (!email || !pass) { setMsg({ t: 'bad', m: 'Completá tu email y tu contraseña.' }); return; }
    setBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), pass); }
    catch (err) { setMsg({ t: 'bad', m: authError(err) }); setBusy(false); }
  };
  const reset = async () => {
    if (!email) { setMsg({ t: 'warn', m: 'Escribí tu email arriba y después tocá “Olvidé mi contraseña”.' }); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setMsg({ t: 'ok', m: 'Te mandamos un email para crear una contraseña nueva. Revisá también la carpeta de spam.' }); }
    catch (err) { setMsg({ t: 'bad', m: authError(err) }); }
  };

  return (
    <div className="authwrap">
      <form className="card authcard" style={{ width: 'min(600px,100%)' }} onSubmit={submit} noValidate>
        <BrandLine />
        <div className="stack" style={{ gap: 6 }}><h1>Ingresar</h1></div>
        <RoleChooser role={role} setRole={setRole} repLabel="Tu panel de marcas, pedidos y comisiones (también para administración)" />
        {role === 'client' ? <ClientFinder /> : <>
        <Field label="Email"><input id="l-email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><input id="l-pass" className="input" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} /></Field>
        {msg && <div className={'notice ' + msg.t}>{msg.m}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <button type="button" className="btn link" onClick={reset}>Olvidé mi contraseña</button>
        </>}
        {role === 'rep' && <p className="muted" style={{ textAlign: 'center' }}>¿Todavía no tenés cuenta? <Link to="/registro"><b>Creala gratis</b></Link></p>}
      </form>
    </div>
  );
}
