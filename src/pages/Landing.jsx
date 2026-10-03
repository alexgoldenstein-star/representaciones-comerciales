import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../lib/auth';
import { usePricing, useCompany } from '../lib/siteConfig';
import PortalFooter from './PortalFooter';
import './landing.css';


const FEATURES = [
  ['Una tienda por cada marca', 'Subís el logo de cada empresa que representás y armás su vidriera con catálogo, fotos y condiciones.'],
  ['Pedidos ordenados', 'Tus clientes piden solos desde la tienda y vos cargás los tuyos en la visita, desde el celular.'],
  ['Factura y remito al cliente', 'Adjuntás los comprobantes que emite la empresa y se los mandás al cliente por WhatsApp, con un toque.'],
  ['Las condiciones de cada empresa', 'Bonificación, pedido mínimo, plazo y flete quedan cargados. La tienda los aplica sola.'],
  ['Listas de precios desde Excel', 'Llega el aumento: copiás la lista de Excel, la pegás y los precios se actualizan por código.'],
  ['Tu sitio con tu dominio', 'Tu página de presentación y tu tienda en tunombre.com.ar, y el panel instalado en el celular.'],
];

const FAQ = [
  ['¿Tengo que facturar desde el sistema?', 'No. La factura la sigue haciendo cada empresa. Vos cargás el número y el PDF, y el sistema se lo manda al cliente y lo usa para calcular tu comisión.'],
  ['¿Es difícil de usar?', 'No. Está pensado para usarlo sin capacitación: letras grandes, botones claros y todo en castellano. Y si necesitás ayuda, te la damos por WhatsApp.'],
  ['¿Mis clientes tienen que instalar algo?', 'No. Entran desde el navegador con el link de tu tienda. Si quieren, la agregan a la pantalla del celular como una aplicación.'],
  ['¿Puedo usar mi propio dominio?', 'Sí. Lo pedís desde tu panel y nosotros lo conectamos. Te decimos exactamente qué datos cargar donde compraste el dominio.'],
  ['¿Las empresas que represento ven mis datos?', 'No. Tus clientes, tus pedidos y tus comisiones son tuyos y sólo los ves vos.'],
  ['¿Qué pasa si dejo de usarlo?', 'Tu tienda se pausa, pero no se borra nada. Si volvés, está todo como lo dejaste.'],
];

export default function Landing() {
  const { user } = useAuth();
  const { pricing } = usePricing();
  const { company } = useCompany();
  const WA = String(company.whatsapp || '').replace(/\D/g, '');
  const days = pricing.trialDays;
  return (
    <div className="lp">
      <header className="lp-nav"><div className="lp-wrap">
        <Link to="/" className="brandline"><i>RC</i><span>Representaciones <span className="lp-hide-s">comerciales</span></span></Link>
        <nav className="lp-links"><a href="#como">Cómo funciona</a><a href="#precios">Precios</a><a href="#preguntas">Preguntas</a></nav>
        {user ? <Link className="btn primary" to="/panel">Ir a mi panel</Link> : <><Link className="btn lp-hide-s" to="/ingresar">Ingresar</Link><a className="btn primary" href="#empezar">Probar gratis</a></>}
      </div></header>

      <section className="lp-hero"><div className="lp-wrap">
        <div className="lp-hero-text">
          <p className="lp-kicker">Para representantes de comercio y vendedores de varias marcas</p>
          <h1>Tus marcas, tus clientes y tus <span className="lp-hl">comisiones</span>, en un solo lugar.</h1>
          <p className="lp-lead">Una tienda online con el catálogo de cada empresa que representás. Tus clientes piden solos, vos cargás tus pedidos, mandás factura y remito, y sabés en todo momento cuánto te deben.</p>
          <div className="row"><a className="btn primary lp-big" href="#empezar">Quiero probarlo gratis</a><Link className="btn lp-big" to="/v/ejemplo">Ver un ejemplo</Link></div>
          <p className="muted">{days} días gratis · Sin tarjeta · Funciona en la computadora y en el celular</p>
        </div>
        <div className="lp-pad" aria-hidden="true">
          <div className="lp-ticket">
            <div className="lp-t-head"><div><small>NOTA DE PEDIDO</small><b>Ferretería El Tornillo</b></div><div style={{ textAlign: 'right' }}><small>NP 000231</small><span>Termo Andino</span></div></div>
            <div className="lp-t-rows">
              <span>Termo acero 1 L</span><span>24</span><span>$ 693.600</span>
              <span>Mate doble pared</span><span>48</span><span>$ 427.200</span>
              <span>Botella térmica</span><span>12</span><span>$ 208.800</span>
            </div>
            <div className="lp-t-tot"><span>Total con bonificación</span><b>$ 1.223.312</b></div>
            <div className="row" style={{ gap: 8 }}><span className="pill confirmado plain">Factura A enviada</span><span className="pill activo plain">Remito enviado</span></div>
          </div>
          <div className="lp-stamp"><small>Tu comisión · 6%</small><b>$ 73.399</b><small>Facturada · a cobrar</small></div>
        </div>
      </div></section>

      <section className="lp-sec lp-alt"><div className="lp-wrap">
        <div className="lp-sh"><h2>Vendés para varias empresas y cada una trabaja distinto.</h2></div>
        <div className="lp-vs">
          <div className="lp-before"><h3>Hoy</h3><ul>
            <li>Mandás la lista en PDF por WhatsApp y a la semana ya está vieja.</li>
            <li>Los pedidos llegan por audio, por foto del cuaderno o por planilla.</li>
            <li>La bonificación, el mínimo y el plazo de cada empresa los tenés en la cabeza.</li>
            <li>Para saber cuánta comisión te deben tenés que cruzar facturas a mano.</li>
          </ul></div>
          <div className="lp-after"><h3>Con Representaciones comerciales</h3><ul>
            <li>Cada cliente entra a tu tienda y ve el catálogo vigente de cada marca.</li>
            <li>Los pedidos entran ordenados, con número, y los seguís hasta que se cobran.</li>
            <li>Las condiciones de cada empresa se aplican solas.</li>
            <li>Ves tu comisión: en pedido, facturada, a cobrar y cobrada.</li>
          </ul></div>
        </div>
      </div></section>

      <section className="lp-sec"><div className="lp-wrap">
        <div className="lp-sh"><h2>Todo lo que hace un representante, en una sola herramienta.</h2></div>
        <div className="lp-comm card">
          <div className="stack" style={{ gap: 10 }}><h3>Tu comisión, etapa por etapa</h3><p className="muted">Cargás el porcentaje que te paga cada empresa y el sistema calcula cuánto ganaste con cada pedido y en qué etapa está la plata.</p></div>
          <div className="lp-stages">
            {[['En pedido', '$ 321.858', 'var(--primary)'], ['Facturada', '$ 407.981', 'var(--accent)'], ['A cobrar', '$ 318.151', 'var(--warn)'], ['Cobrada', '$ 434.498', 'var(--ok)']].map(([l, v, c]) => (
              <div key={l} style={{ '--c': c }}><span className="label">{l}</span><b>{v}</b></div>
            ))}
          </div>
        </div>
        <div className="lp-feats">{FEATURES.map(([t, d]) => <div key={t} className="card lp-feat"><h3>{t}</h3><p className="muted">{d}</p></div>)}</div>
      </div></section>

      <section id="como" className="lp-sec lp-alt"><div className="lp-wrap">
        <div className="lp-sh"><h2>En una tarde tenés tu tienda funcionando.</h2></div>
        <ol className="lp-steps">
          <li><b>Creá tu cuenta</b><span>Elegís la dirección de tu sitio, subís tu logo y ponés tu WhatsApp.</span></li>
          <li><b>Cargá tus marcas</b><span>Logo, condiciones, tu comisión y la lista de precios de cada empresa.</span></li>
          <li><b>Invitá a tus clientes</b><span>Les mandás el link. Se registran, los aprobás y ya pueden pedir.</span></li>
          <li><b>Seguí cada pedido</b><span>De recibido a cobrado, con sus comprobantes y tu comisión calculada.</span></li>
        </ol>
      </div></section>

      <section id="precios" className="lp-sec"><div className="lp-wrap">
        <div className="lp-sh"><h2>{pricing.title}</h2>{pricing.subtitle && <p className="muted">{pricing.subtitle}</p>}</div>
        <div className="lp-plans" style={{ '--cols': Math.min(pricing.plans.length, 3) }}>
          {pricing.plans.map(pl => (
            <div key={pl.key || pl.name} className={'card lp-plan' + (pl.highlight ? ' lp-pro' : '')}>
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
        <div className="lp-sh"><h2>Preguntas frecuentes</h2></div>
        <div className="lp-faq">{FAQ.map(([q, a]) => <details key={q} className="card"><summary>{q}</summary><p>{a}</p></details>)}</div>
      </div></section>

      <section id="empezar" className="lp-sec lp-cta"><div className="lp-wrap lp-cta-grid">
        <div className="stack" style={{ gap: 18 }}>
          <h2>Probalo {days} días con tus marcas.</h2>
          <p className="lp-lead">Creá tu cuenta ahora y empezá a cargar tus marcas. Si preferís que te ayudemos, dejanos tus datos y te escribimos en el día.</p>
          <div className="row"><Link className="btn primary lp-big" to="/registro">Crear mi cuenta gratis</Link>
            {WA && <a className="btn lp-big" href={`https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero saber más sobre Representaciones comerciales.')}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>}</div>
        </div>
        <LeadForm />
      </div></section>

      <PortalFooter />
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
