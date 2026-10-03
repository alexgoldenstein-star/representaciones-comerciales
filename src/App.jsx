import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { cleanHost } from './lib/format';
import { useAuth } from './lib/auth';
import { Loading } from './components/ui';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Panel from './panel/Panel';
import Admin from './admin/Admin';
import VendorSite from './site/VendorSite';
import Legal from './pages/Legal';

const MAIN_HOSTS = (import.meta.env.VITE_MAIN_HOSTS || '').split(',').map(cleanHost).filter(Boolean);
const host = cleanHost(window.location.hostname);
const isMainHost = ['localhost', '127.0.0.1'].includes(host) || host.endsWith('.web.app') || host.endsWith('.firebaseapp.com') || host.endsWith('.vercel.app') || MAIN_HOSTS.includes(host);

export default function App() {
  if (!isMainHost) return <CustomDomainSite />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/ingresar" element={<Login />} />
      <Route path="/registro" element={<Signup />} />
      <Route path="/terminos" element={<Legal kind="terminos" />} />
      <Route path="/privacidad" element={<Legal kind="privacidad" />} />
      <Route path="/panel/*" element={<RequireRole role="vendedor"><Panel /></RequireRole>} />
      <Route path="/admin/*" element={<RequireRole role="super"><Admin /></RequireRole>} />
      <Route path="/v/:slug/*" element={<SiteBySlug />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireRole({ role, children }) {
  const { user, profile, isSuper, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/ingresar" replace />;
  if (role === 'super' && !isSuper) return <Navigate to="/panel" replace />;
  if (role === 'vendedor' && profile?.role !== 'vendedor' && !isSuper) return <Navigate to="/ingresar" replace />;
  if (role === 'vendedor' && isSuper && profile?.role !== 'vendedor') return <Navigate to="/admin" replace />;
  return children;
}

function SiteBySlug() {
  const { slug } = useParams();
  const [vid, setVid] = useState(undefined);
  useEffect(() => {
    getDoc(doc(db, 'slugs', slug)).then(s => setVid(s.exists() ? s.data().vendorId : null)).catch(() => setVid(null));
  }, [slug]);
  if (vid === undefined) return <Loading />;
  if (!vid) return <NotFound text="No encontramos este representante. Revisá la dirección." />;
  return <VendorSite vendorId={vid} base={`/v/${slug}`} />;
}

function CustomDomainSite() {
  const [vid, setVid] = useState(undefined);
  useEffect(() => {
    getDoc(doc(db, 'domains', host)).then(s => setVid(s.exists() && s.data().status !== 'pausado' ? s.data().vendorId : null)).catch(() => setVid(null));
  }, []);
  if (vid === undefined) return <Loading />;
  if (!vid) return <NotFound text="Este dominio todavía no está conectado a ningún representante." />;
  return <Routes><Route path="/*" element={<VendorSite vendorId={vid} base="" />} /></Routes>;
}

export function NotFound({ text }) {
  return (
    <div className="authwrap"><div className="card authcard" style={{ textAlign: 'center' }}>
      <h1>Página no disponible</h1><p className="muted">{text}</p>
    </div></div>
  );
}
