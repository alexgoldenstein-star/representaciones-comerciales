import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePanel } from './Panel';
import { BrandMark, Empty, Icon, useToast } from '../components/ui';
import { MESES, STAGES, commOf, fdate, fmt, longDate, net, stageOf, today } from '../lib/format';
import { loadSampleData } from '../lib/orders';

export default function Dashboard() {
  const { vid, v, orders, brands, clients, products, loading } = usePanel();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const month = today().slice(0, 7);
  const mOrders = orders.filter(o => o.date?.startsWith(month));
  const byStage = Object.fromEntries(STAGES.map(s => [s.k, 0]));
  orders.forEach(o => { byStage[stageOf(o)] += commOf(o); });
  const pend = orders.filter(o => o.status === 'recibido');

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(month + '-15T12:00:00'); d.setMonth(d.getMonth() - i);
    const k = d.toISOString().slice(0, 7);
    months.push({ k, l: MESES[d.getMonth()], v: orders.filter(o => o.date?.startsWith(k)).reduce((a, o) => a + net(o), 0) });
  }
  const max = Math.max(1, ...months.map(m => m.v));
  const perBrand = brands.map(b => {
    const os = orders.filter(o => o.brandId === b.id);
    return { b, n: os.length, sold: os.reduce((a, o) => a + net(o), 0), comm: os.reduce((a, o) => a + commOf(o), 0) };
  }).sort((a, b) => b.sold - a.sold);

  const sample = async () => {
    setBusy(true);
    try { await loadSampleData(vid); toast('Listo: cargamos 3 marcas, artículos, clientes y pedidos de ejemplo'); }
    catch (e) { console.error(e); toast('No se pudieron cargar los ejemplos. Probá de nuevo.'); }
    setBusy(false);
  };

  const isNew = !loading && brands.length === 0 && orders.length === 0;

  return (
    <>
      <div className="head">
        <div className="grow"><span className="label">{longDate(today())}</span><h1>Hola, {v.name.split(' ')[0]}</h1></div>
        <button className="btn primary" onClick={() => nav('/panel/pedidos?nuevo=1')}><Icon n="plus" />Cargar un pedido</button>
      </div>

      {isNew && (
        <div className="card pad stack">
          <h2>Primeros pasos</h2>
          <p className="muted">Seguí estos pasos para dejar tu tienda lista. Podés hacerlos en cualquier orden.</p>
          <div className="list card">
            {[
              ['Cargá las marcas que representás', 'Logo, condiciones y tu comisión', '/panel/marcas', brands.length > 0],
              ['Subí el catálogo de cada marca', 'Podés pegar la lista desde Excel', '/panel/catalogo', products.length > 0],
              ['Sumá a tus clientes', 'Mandales el link de tu tienda para que se registren', '/panel/clientes', clients.length > 0],
              ['Completá tu sitio', 'Tu logo, tu zona y tu dominio', '/panel/mi-sitio', !!v.logoUrl],
            ].map(([t, s, to, done], i) => (
              <Link key={to} to={to} className="item">
                <span className={'pill ' + (done ? 'activo' : 'plain')} style={{ minWidth: 44, justifyContent: 'center' }}>{done ? '✓' : i + 1}</span>
                <div className="grow"><div className="t">{t}</div><div className="s">{s}</div></div>
                <Icon n="next" size={22} />
              </Link>
            ))}
          </div>
          <div className="notice">
            <div className="grow"><b>¿Querés ver cómo funciona antes de cargar lo tuyo?</b>Cargamos 3 marcas, artículos, clientes y pedidos de ejemplo. Después los podés borrar.</div>
          </div>
          <div><button className="btn" onClick={sample} disabled={busy}>{busy ? 'Cargando ejemplos…' : 'Cargar datos de ejemplo'}</button></div>
        </div>
      )}

      <div className="kpis">
        <div className="card kpi"><span className="label">Vendido este mes</span><span className="v">{fmt(mOrders.reduce((a, o) => a + net(o), 0))}</span><span className="muted small">{mOrders.length} pedidos, sin IVA</span></div>
        <div className="card kpi"><span className="label">Pedidos para revisar</span><span className="v">{pend.length}</span><span className="muted small">Llegaron desde la tienda</span></div>
        <div className="card kpi"><span className="label">Comisión a cobrar</span><span className="v">{fmt(byStage.aliquidar)}</span><span className="muted small">La empresa ya cobró</span></div>
        <div className="card kpi"><span className="label">Clientes</span><span className="v">{clients.filter(c => c.status === 'activo').length}</span><span className="muted small">{clients.filter(c => c.status === 'pendiente').length} esperando tu aprobación</span></div>
      </div>

      <section className="stack">
        <div className="row between"><h2>Tus comisiones, etapa por etapa</h2><Link to="/panel/comisiones" className="btn sm">Ver el detalle</Link></div>
        <div className="stages">
          {STAGES.map(s => (
            <div key={s.k} className="card stage" style={{ '--c': s.c }}>
              <span className="label">{s.l}</span><span className="v">{fmt(byStage[s.k])}</span><span className="muted small">{s.d}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="pad row between" style={{ paddingBottom: 10 }}><h2>Para revisar</h2>{pend.length > 0 && <span className="pill recibido">{pend.length} nuevos</span>}</div>
          {pend.length === 0 ? <Empty title="No hay pedidos nuevos" text="Cuando un cliente haga un pedido desde tu tienda, aparece acá." /> : (
            <div className="list">
              {pend.map(o => {
                const b = brands.find(x => x.id === o.brandId);
                return (
                  <button key={o.id} className="item" onClick={() => nav('/panel/pedidos?ver=' + o.id)}>
                    <BrandMark b={b || { name: o.brandName }} size="s" />
                    <div className="grow"><div className="t">{o.clientName}</div><div className="s">{o.number} · {fdate(o.date)}</div></div>
                    <span className="amount">{fmt(net(o))}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="card pad stack">
          <h2>Ventas de los últimos 6 meses</h2>
          <div className="stack" style={{ gap: 12 }}>
            {months.map((m, i) => (
              <div key={m.k} className="stack" style={{ gap: 4 }}>
                <div className="row between"><span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{m.l}</span><span className="num">{fmt(m.v)}</span></div>
                <div className="bar" style={{ '--c': i === months.length - 1 ? 'var(--primary)' : '#8FB5CC' }}><i style={{ width: (m.v / max * 100) + '%' }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {perBrand.length > 0 && (
        <div className="card">
          <div className="pad" style={{ paddingBottom: 8 }}><h2>Cómo te va con cada marca</h2></div>
          <div className="list">
            {perBrand.map(r => (
              <div key={r.b.id} className="item">
                <BrandMark b={r.b} size="s" />
                <div className="grow"><div className="t">{r.b.name}</div><div className="s">{r.n} pedidos · comisión {r.b.commission}%</div></div>
                <div style={{ textAlign: 'right' }}><div className="amount">{fmt(r.sold)}</div><div className="s muted">Ganaste {fmt(r.comm)}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
