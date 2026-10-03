import { createContext, useContext, useState } from 'react';
import { NavLink, Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useCol, useDocData } from '../lib/hooks';
import { Icon, Loading, Drawer } from '../components/ui';
import { initials } from '../lib/format';
import Dashboard from './Dashboard';
import Orders from './Orders';
import Brands from './Brands';
import Catalog from './Catalog';
import Clients from './Clients';
import Commissions from './Commissions';
import MySite from './MySite';
import MyPlan from './MyPlan';
import { usePricing, planLimits } from '../lib/siteConfig';
import { today } from '../lib/format';

const Ctx = createContext(null);
export const usePanel = () => useContext(Ctx);

export const NAV = [
  { to: '/panel', end: true, l: 'Inicio', i: 'home' },
  { to: '/panel/pedidos', l: 'Pedidos', i: 'orders' },
  { to: '/panel/marcas', l: 'Marcas', i: 'brands' },
  { to: '/panel/catalogo', l: 'Catálogo', i: 'catalog' },
  { to: '/panel/clientes', l: 'Clientes', i: 'clients' },
  { to: '/panel/comisiones', l: 'Comisiones', i: 'money' },
  { to: '/panel/mi-sitio', l: 'Mi sitio', i: 'site' },
  { to: '/panel/plan', l: 'Mi plan', i: 'card' },
];

export default function Panel() {
  const { user, isSuper, logout } = useAuth();
  const vid = user.uid;
  const vendor = useDocData(`vendors/${vid}`);
  const orders = useCol(`vendors/${vid}/orders`);
  const brands = useCol(`vendors/${vid}/brands`);
  const products = useCol(`vendors/${vid}/products`);
  const clients = useCol(`vendors/${vid}/clients`);
  const [more, setMore] = useState(false);
  const { pricing } = usePricing();

  if (vendor.loading) return <Loading />;
  if (!vendor.data) return <Navigate to="/registro" replace />;
  const v = vendor.data;
  const sortedBrands = [...brands.data].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));
  const pending = orders.data.filter(o => o.status === 'recibido').length;
  const pendingClients = clients.data.filter(c => c.status === 'pendiente').length;
  const limits = planLimits(pricing, v.plan);
  const ctx = { vid, v, pricing, limits, orders: orders.data, brands: sortedBrands, products: products.data, clients: clients.data, loading: orders.loading || brands.loading };
  const badge = to => (to === '/panel/pedidos' ? pending : to === '/panel/clientes' ? pendingClients : 0);
  const siteUrl = `/v/${v.slug}`;

  if (v.status === 'suspendido') {
    return (
      <div className="authwrap"><div className="card authcard">
        <h1>Tu cuenta está pausada</h1>
        <p>Tu tienda y tu panel no están disponibles por el momento. No se perdió ningún dato.</p>
        <p className="muted">Escribinos para reactivarla.</p>
        <button className="btn" onClick={logout}><Icon n="out" />Salir</button>
      </div></div>
    );
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <aside className="side">
          <div className="me">
            <div className="logo">{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(v.business)}</div>
            <div className="grow"><b>{v.business}</b><span className="muted small">{v.name}</span></div>
          </div>
          <nav className="nav" aria-label="Menú principal">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end}><Icon n={n.i} />{n.l}{badge(n.to) > 0 && <span className="count">{badge(n.to)}</span>}</NavLink>
            ))}
          </nav>
          <div className="stack" style={{ marginTop: 'auto', gap: 10 }}>
            <a className="btn sm" href={siteUrl} target="_blank" rel="noreferrer"><Icon n="store" />Ver mi tienda</a>
            {isSuper && <Link className="btn sm" to="/admin"><Icon n="shield" />Administración</Link>}
            <button className="btn sm" onClick={logout}><Icon n="out" />Salir</button>
          </div>
        </aside>
        <main className="main">
          <div className="topm">
            <div className="me grow" style={{ padding: 0 }}>
              <div className="logo" style={{ width: 40, height: 40 }}>{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(v.business)}</div>
              <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.business}</b>
            </div>
          </div>
          {v.plan === 'prueba' && v.trialEnds && v.trialEnds >= today() && (
            <div style={{ background: 'var(--accent-soft)', padding: '10px 20px', fontSize: 16, textAlign: 'center' }}>
              Estás usando la <b>prueba gratis</b> hasta el {v.trialEnds.split('-').reverse().join('/')}. <Link to="/panel/plan"><b>Elegir un plan</b></Link>
            </div>
          )}
          {v.plan === 'prueba' && v.trialEnds && v.trialEnds < today() && (
            <div style={{ background: 'var(--bad-soft)', padding: '12px 20px', fontSize: 17, textAlign: 'center' }}>
              <b>Tu prueba gratis terminó.</b> Para seguir usando la plataforma, <Link to="/panel/plan"><b>elegí un plan</b></Link>.
            </div>
          )}
          {v.subscription && ['paused', 'cancelled'].includes(v.subscription.status) && (
            <div style={{ background: 'var(--bad-soft)', padding: '12px 20px', fontSize: 17, textAlign: 'center' }}>
              <b>Tu suscripción está {v.subscription.status === 'paused' ? 'pausada' : 'cancelada'}.</b> <Link to="/panel/plan"><b>Revisá tu plan</b></Link>.
            </div>
          )}
          <div className="content">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="pedidos" element={<Orders />} />
              <Route path="marcas" element={<Brands />} />
              <Route path="catalogo" element={<Catalog />} />
              <Route path="clientes" element={<Clients />} />
              <Route path="comisiones" element={<Commissions />} />
              <Route path="mi-sitio" element={<MySite />} />
              <Route path="plan" element={<MyPlan />} />
              <Route path="*" element={<Navigate to="/panel" replace />} />
            </Routes>
          </div>
        </main>
        <nav className="bnav" aria-label="Menú">
          {NAV.slice(0, 4).map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}><Icon n={n.i} />{n.l}{badge(n.to) > 0 && <span className="count">{badge(n.to)}</span>}</NavLink>
          ))}
          <button onClick={() => setMore(true)}><Icon n="more" />Más{pendingClients > 0 && <span className="count">{pendingClients}</span>}</button>
        </nav>
        {more && (
          <Drawer title="Más opciones" onClose={() => setMore(false)}>
            <nav className="nav" onClick={() => setMore(false)}>
              {NAV.slice(4).map(n => <NavLink key={n.to} to={n.to}><Icon n={n.i} />{n.l}{badge(n.to) > 0 && <span className="count">{badge(n.to)}</span>}</NavLink>)}
            </nav>
            <a className="btn" href={siteUrl} target="_blank" rel="noreferrer"><Icon n="store" />Ver mi tienda</a>
            {isSuper && <Link className="btn" to="/admin"><Icon n="shield" />Administración</Link>}
            <button className="btn" onClick={logout}><Icon n="out" />Salir</button>
          </Drawer>
        )}
      </div>
    </Ctx.Provider>
  );
}
