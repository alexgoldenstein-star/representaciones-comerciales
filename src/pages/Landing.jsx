import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../lib/auth';
import { usePricing, useCompany } from '../lib/siteConfig';
import { CountUp } from '../lib/motion';
import Logo from '../components/Logo';
import PortalFooter from './PortalFooter';
import './landing.css';

const FEATURES = [
  ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', 'Una vidriera por marca', 'Cada empresa que representás tiene su tienda con logo, catálogo, fotos y condiciones. Tus clientes ven sólo lo vigente.'],
  ['M7 3h10l3 3v15H4V3h3zM8 9h8M8 13h8M8 17h5', 'Pedidos sin papeles', 'Los clientes piden solos desde la tienda y vos cargás los tuyos en la visita, desde el celular. Todo numerado y ordenado.'],
  ['M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h4', 'Factura y remito al instante', 'Adjuntás los comprobantes que emite cada empresa y se los mandás al cliente por WhatsApp con un toque.'],
  ['M3 12h4l3-8 4 16 3-8h4', 'Condiciones inteligentes', 'Bonificaciones por cliente, escalas por volumen y descuentos por forma de pago. El cálculo se hace solo, en cascada.'],
  ['M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4', 'Listas que se actualizan solas', 'Llega el aumento: copiás la lista de Excel, la pegás y todos los precios se actualizan por código en segundos.'],
  ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20', 'Tu marca, tu dominio', 'Un sitio profesional con tu nombre, tus marcas y tu contacto, en tudominio.com.ar. Y el panel instalado como app.'],
];

const FAQ = [
  ['¿Tengo que facturar desde la plataforma?', 'No. La factura la sigue emitiendo cada empresa. Vos cargás el número y el PDF; la plataforma se lo envía al cliente y lo usa para calcular tu comisión.'],
  ['¿Es difícil de usar?', 'Está pensada para usarse sin capacitación: letra grande, botones claros y todo en castellano. Si necesitás una mano, te ayudamos por WhatsApp.'],
  ['¿Mis clientes tienen que instalar algo?', 'No. Entran desde el navegador con el link de tu tienda. Si quieren, la agregan a la pantalla del celular como una app.'],
  ['¿Puedo usar mi propio dominio?', 'Sí. Lo pedís desde tu panel y lo conectamos por vos. Te indicamos exactamente qué datos cargar donde compraste el dominio.'],
  ['¿Las empresas que represento ven mis datos?', 'No. Tus clientes, tus pedidos y tus comisiones son tuyos. Cada cuenta está aislada y protegida.'],
  ['¿Qué pasa si dejo de usarla?', 'Tu tienda se pausa, pero no se borra nada. Si volvés, encontrás todo como lo dejaste.'],
];

const TICKER = ['Catálogos por marca', 'Pedidos online las 24 h', 'Factura y remito por WhatsApp', 'Comisiones por etapa', 'Condiciones por cliente', 'Escalas por volumen', 'Tu dominio propio', 'App en el celular', 'Listas desde Excel'];

const Ico = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function Landing() {
  const { user } = useAuth();
  const { pricing } = usePricing();
  const { company } = useCompany();
  const WA = String(company.whatsapp || '').replace(/\D/g, '');
  const days = pricing.trialDays;
  return (
    <div className="lp">
      <header className="lp-nav"><div className="lp-wrap">
        <Link to="/" aria-label="Inicio" style={{ textDecoration: 'none' }}><Logo size={42} /></Link>
        <nav className="lp-links"><a href="#como">Cómo funciona</a><a href="#funciones">Funciones</a><a href="#precios">Precios</a><a href="#preguntas">Preguntas</a></nav>
        {user ? <Link className="btn primary" to="/panel">Ir a mi panel</Link> : <><Link className="btn lp-hide-s" to="/ingresar">Ingresar</Link><a className="btn primary" href="#empezar">Probar gratis</a></>}
      </div></header>

      <section className="lp-hero">
        <div className="lp-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="lp-grid gridbg" aria-hidden="true" />
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-text">
            <span className="lp-badge"><span className="live" /> Plataforma B2B para representantes comerciales</span>
            <h1>Todas tus marcas. Todos tus pedidos. <span className="grad-text">Una sola plataforma.</span></h1>
            <p className="lp-lead">Tus clientes compran online a cualquier hora, vos seguís cada pedido hasta el cobro y sabés en todo momento cuánto ganaste con cada empresa.</p>
            <div className="row"><a className="btn primary lp-big" href="#empezar">Empezar gratis</a><Link className="btn lp-big" to="/v/ejemplo">Ver una tienda de ejemplo</Link></div>
            <p className="lp-trust">✓ {days} días gratis &nbsp; ✓ Sin tarjeta &nbsp; ✓ Datos protegidos en Google Cloud</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      <div className="lp-ticker" aria-hidden="true"><div>{[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}<b>◆</b></span>)}</div></div>

      <section id="como" className="lp-sec"><div className="lp-wrap">
        <div className="lp-sh reveal"><span className="lp-eyebrow">Cómo funciona</span><h2>Conectás a tus marcas con tus clientes, sin intermediarios ni planillas.</h2></div>
        <div className="lp-flow reveal">
          <div className="lp-node card"><span className="lp-node-k">1</span><h3>Las marcas</h3><p className="muted">Cargás el catálogo, las condiciones y tu comisión de cada empresa que representás.</p></div>
          <FlowLine />
          <div className="lp-node card lp-node-main"><span className="lp-node-k">2</span><h3>Vos, en el centro</h3><p className="muted">Tu panel ordena pedidos, comprobantes y comisiones. Desde la compu o el celular.</p></div>
          <FlowLine />
          <div className="lp-node card"><span className="lp-node-k">3</span><h3>Tus clientes</h3><p className="muted">Entran a tu tienda, ven sus precios y condiciones, y te mandan el pedido cuando quieren.</p></div>
        </div>
      </div></section>

      <section id="funciones" className="lp-sec lp-alt"><div className="lp-wrap">
        <div className="lp-sh reveal"><span className="lp-eyebrow">Funciones</span><h2>Todo lo que hace un representante, en una herramienta pensada para el rubro.</h2></div>
        <div className="lp-feats">{FEATURES.map(([d, t, x], i) => (
          <div key={t} className="card lp-feat reveal" style={{ transitionDelay: (i % 3) * 80 + 'ms' }}><span className="lp-ico"><Ico d={d} /></span><h3>{t}</h3><p className="muted">{x}</p></div>
        ))}</div>
      </div></section>

      <section className="lp-sec"><div className="lp-wrap lp-split">
        <div className="stack reveal" style={{ gap: 16 }}>
          <span className="lp-eyebrow">Comisiones</span>
          <h2>Dejá de cruzar facturas para saber cuánto te deben.</h2>
          <p className="lp-lead">Cargás el porcentaje de cada empresa y la plataforma sigue cada peso: lo que está en pedido, lo facturado, lo que la empresa ya cobró y lo que ya te pagaron.</p>
        </div>
        <div className="card lp-comm reveal">
          <div className="row between"><b>Comisiones del año</b><span className="pill plain">Ejemplo</span></div>
          {[['En pedido', 321858, 38, '#1F4FD8'], ['Facturada', 407981, 49, '#12B5CB'], ['A cobrar', 318151, 38, '#C47F12'], ['Cobrada', 434498, 52, '#1B7249']].map(([l, v, w, c]) => (
            <div key={l} className="lp-bar"><div className="row between"><span>{l}</span><b className="num"><CountUp to={v} prefix="$ " /></b></div><div className="bar"><i style={{ width: w + '%', background: c }} /></div></div>
          ))}
        </div>
      </div></section>

      <section className="lp-sec lp-alt"><div className="lp-wrap">
        <div className="lp-sh reveal"><span className="lp-eyebrow">En marcha en una tarde</span><h2>Cuatro pasos y tu tienda está online.</h2></div>
        <ol className="lp-steps">
          {[['Creá tu cuenta', 'Elegís la dirección de tu sitio, subís tu logo y ponés tu WhatsApp.'], ['Cargá tus marcas', 'Logo, condiciones, tu comisión y la lista de precios de cada empresa.'], ['Invitá a tus clientes', 'Les mandás el link. Se registran, los aprobás y ya pueden pedir.'], ['Seguí cada pedido', 'De recibido a cobrado, con comprobantes y tu comisión calculada.']].map(([t, x]) => (
            <li key={t} className="reveal"><b>{t}</b><span>{x}</span></li>
          ))}
        </ol>
      </div></section>

      <section id="precios" className="lp-sec"><div className="lp-wrap">
        <div className="lp-sh reveal"><span className="lp-eyebrow">Precios</span><h2>{pricing.title}</h2>{pricing.subtitle && <p className="muted">{pricing.subtitle}</p>}</div>
        <div className="lp-plans" style={{ '--cols': Math.min(pricing.plans.length, 3) }}>
          {pricing.plans.map(pl => (
            <div key={pl.key || pl.name} className={'card lp-plan reveal' + (pl.highlight ? ' lp-pro' : '')}>
              {pl.highlight && <span className="lp-tag">El más elegido</span>}
              <h3>{pl.name}</h3>
              <div className="lp-price">{pl.price}{pl.period && <small> {pl.period}</small>}</div>
              <ul>{(pl.features || []).filter(Boolean).map(f => <li key={f}>{f}</li>)}</ul>
              <a className={'btn block' + (pl.highlight ? ' primary' : '')} href="#empezar">{pl.cta || 'Empezar gratis'}</a>
            </div>
          ))}
        </div>
        {pricing.note && <p className="muted" style={{ marginTop: 16 }}>{pricing.note}</p>}
      </div></section>

      <section id="preguntas" className="lp-sec lp-alt"><div className="lp-wrap">
        <div className="lp-sh reveal"><span className="lp-eyebrow">Preguntas frecuentes</span><h2>Lo que nos preguntan los representantes.</h2></div>
        <div className="lp-faq">{FAQ.map(([q, a]) => <details key={q} className="card"><summary>{q}</summary><p>{a}</p></details>)}</div>
      </div></section>

      <section id="empezar" className="lp-cta">
        <div className="lp-aurora dark" aria-hidden="true"><i /><i /></div>
        <div className="lp-wrap lp-cta-grid">
          <div className="stack" style={{ gap: 18 }}>
            <span className="lp-badge dark"><span className="live" /> Prueba gratis de {days} días</span>
            <h2>Llevá tu representación al siguiente nivel.</h2>
            <p className="lp-lead">Creá tu cuenta y empezá a cargar tus marcas hoy. Si preferís que te acompañemos, dejanos tus datos y te escribimos en el día.</p>
            <div className="row"><Link className="btn lp-big lp-white" to="/registro">Crear mi cuenta gratis</Link>
              {WA && <a className="btn lp-big lp-ghost" href={`https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero saber más sobre Representaciones comerciales.')}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>}</div>
          </div>
          <LeadForm />
        </div>
      </section>

      <PortalFooter />
    </div>
  );
}

function FlowLine() {
  return (
    <svg className="lp-flowline" viewBox="0 0 120 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 10 H120" stroke="#B8C5D8" strokeWidth="2" fill="none" />
      <path d="M0 10 H120" stroke="#12B5CB" strokeWidth="3" fill="none" strokeDasharray="8 12" style={{ animation: 'dash 1.2s linear infinite' }} />
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className="lp-visual" aria-hidden="true">
      <svg className="lp-net" viewBox="0 0 420 420">
        {[[70, 70], [350, 60], [380, 300], [60, 330], [210, 400]].map(([x, y], i) => (
          <g key={i}><path d={`M210 210 L${x} ${y}`} stroke="#9DB4F0" strokeWidth="1.5" strokeDasharray="5 7" style={{ animation: `dash ${1.6 + i * 0.3}s linear infinite` }} /><circle cx={x} cy={y} r="6" fill="#12B5CB" opacity=".75" /></g>
        ))}
        <circle cx="210" cy="210" r="14" fill="#1F4FD8" opacity=".2" />
      </svg>
      <div className="lp-card glass lp-c1">
        <div className="row between"><small>Pedido NP 000231 · Termo Andino</small><span className="pill confirmado plain">Facturado</span></div>
        <b style={{ fontSize: 20 }}>Ferretería El Tornillo</b>
        <div className="lp-steps-mini">{['Recibido', 'Confirmado', 'Facturado', 'Entregado', 'Cobrado'].map((s, i) => <span key={s} className={i < 3 ? 'on' : ''}>{s}</span>)}</div>
        <div className="row between"><span className="muted">Neto con bonificación</span><b className="num">$ 1.223.312</b></div>
      </div>
      <div className="lp-card glass lp-c2"><span className="live" /><div><small>Nuevo pedido desde la tienda</small><b>Casa Moreno Bazar · $ 919.220</b></div></div>
      <span className="lp-sample">Vista de ejemplo del panel</span>
      <div className="lp-card glass lp-c3"><small>Tu comisión este mes</small><b className="grad-text" style={{ fontSize: 30 }}><CountUp to={186420} prefix="$ " /></b><span className="muted small">+ 18% vs. mes anterior</span></div>
    </div>
  );
}

function LeadForm() {
  const [f, setF] = useState({ nombre: '', whatsapp: '', email: '', marcas: '1 a 3', rubro: '' });
  const [st, setSt] = useState(null);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault();
    if (!f.nombre.trim()) return setSt({ t: 'bad', m: 'Poné tu nombre para saber a quién escribirle.' });
    if (!f.whatsapp.trim() && !f.email.trim()) return setSt({ t: 'bad', m: 'Dejanos un WhatsApp o un email.' });
    setSt({ t: 'busy' });
    try {
      await addDoc(collection(db, 'leads'), { ...f, nombre: f.nombre.trim().slice(0, 110), createdAt: serverTimestamp(), estado: 'nuevo' });
      setSt({ t: 'ok', m: `¡Gracias, ${f.nombre.split(' ')[0]}! Te escribimos en el día.` });
    } catch (err) { console.error(err); setSt({ t: 'bad', m: 'No se pudo enviar. Probá de nuevo en un minuto.' }); }
  };
  if (st?.t === 'ok') return <div className="card pad"><div className="notice ok" style={{ fontSize: 20 }}><b>{st.m}</b></div></div>;
  return (
    <form className="card pad stack" onSubmit={submit} noValidate>
      <h3>Prefiero que me ayuden</h3>
      <label className="field"><span>Nombre y apellido</span><input id="ld-n" className="input" autoComplete="name" value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
      <div className="grid g2">
        <label className="field"><span>WhatsApp</span><input id="ld-w" className="input" inputMode="tel" autoComplete="tel" value={f.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></label>
        <label className="field"><span>Email</span><input id="ld-e" className="input" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
        <label className="field"><span>¿Cuántas marcas representás?</span><select id="ld-m" className="input" value={f.marcas} onChange={e => set('marcas', e.target.value)}><option>1 a 3</option><option>4 a 8</option><option>Más de 8</option></select></label>
        <label className="field"><span>Rubro</span><input id="ld-r" className="input" placeholder="Ferretería, bazar…" value={f.rubro} onChange={e => set('rubro', e.target.value)} /></label>
      </div>
      {st?.t === 'bad' && <div className="notice bad">{st.m}</div>}
      <button className="btn primary block" disabled={st?.t === 'busy'}>{st?.t === 'busy' ? 'Enviando…' : 'Quiero que me contacten'}</button>
    </form>
  );
}
