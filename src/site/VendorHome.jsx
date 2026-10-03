import { Link } from 'react-router-dom';
import { BrandMark, Empty, Icon } from '../components/ui';

export const DEFAULT_SERVICES = [
  { title: 'Atención personalizada', text: 'Visitamos tu comercio, te asesoramos sobre productos y novedades de cada marca.' },
  { title: 'Pedidos online', text: 'Hacé tus pedidos a cualquier hora desde la tienda, con precios y condiciones siempre actualizados.' },
  { title: 'Seguimiento de cada pedido', text: 'Te mandamos la factura y el remito, y te avisamos cuando sale la mercadería.' },
];

const waLink = (num, text) => { const n = String(num || '').replace(/\D/g, ''); return `https://wa.me/${n.startsWith('54') ? n : '549' + n}${text ? '?text=' + encodeURIComponent(text) : ''}`; };

export default function VendorHome({ ctx, to }) {
  const { v, brands, user, client } = ctx;
  const zones = (v.zone || '').split(',').map(s => s.trim()).filter(Boolean);
  const services = (v.services || []).filter(s => s.title);
  const year = new Date().getFullYear();
  const stats = [
    brands.length ? [brands.length, brands.length === 1 ? 'marca representada' : 'marcas representadas'] : null,
    v.since && Number(v.since) < year ? [year - Number(v.since) + ' años', 'de trayectoria'] : null,
    zones.length ? [zones.length, zones.length === 1 ? 'zona de cobertura' : 'zonas de cobertura'] : null,
    ['24 h', 'para hacer pedidos online'],
  ].filter(Boolean);
  const mapUrl = v.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address + (v.city ? ', ' + v.city : '')) : null;

  return (
    <>
      <section className="vhero">
        {v.bannerUrl && <div className="vhero-bg" style={{ backgroundImage: `url(${v.bannerUrl})` }} />}
        <div className="vhero-in">
          <span className="kick">Representaciones comerciales{v.since ? ' · desde ' + v.since : ''}</span>
          <h1>{v.heroTitle || v.business}</h1>
          <p>{v.heroSubtitle || `Representamos ${brands.length || 'varias'} marcas para comercios. Conocé los catálogos y hacé tu pedido online.`}</p>
          <div className="row">
            <Link className="btn primary" to={to('/tienda')}>Ver catálogos y precios</Link>
            {!user && <Link className="btn" to={to('/registro')}>Quiero ser cliente</Link>}
            {v.whatsapp && <a className="btn" href={waLink(v.whatsapp, 'Hola, te escribo desde tu sitio.')} target="_blank" rel="noreferrer"><Icon n="send" />WhatsApp</a>}
          </div>
          {client?.status === 'pendiente' && <div className="notice warn" style={{ color: 'var(--ink)', maxWidth: 560 }}>Tu solicitud de cliente está en revisión.</div>}
        </div>
      </section>

      <div className="vstats"><div className="vstats-in">{stats.map(([n, l]) => <div key={l}><b>{n}</b><span className="muted">{l}</span></div>)}</div></div>

      <section className="vsec" id="marcas">
        <h2>Marcas que representamos</h2>
        {brands.length === 0 ? <div className="card"><Empty title="Pronto vas a ver las marcas acá" /></div> : (
          <div className="logowall">{brands.map(b => (
            <Link key={b.id} to={to('/tienda/' + b.id)} className="card lw">
              <BrandMark b={b} size="l" /><b style={{ fontSize: 19 }}>{b.name}</b><span className="muted small">{b.tag}</span>
            </Link>
          ))}</div>
        )}
      </section>

      {(v.about || v.aboutImageUrl) && (
        <section className="vsec" id="nosotros">
          <div className="vabout">
            <div className="stack">
              <h2>{v.aboutTitle || 'Quiénes somos'}</h2>
              <p>{v.about}</p>
            </div>
            {v.aboutImageUrl && <img src={v.aboutImageUrl} alt="" />}
          </div>
        </section>
      )}

      <section className="vsec">
        <h2>Qué ofrecemos</h2>
        <div className="vserv">{(services.length ? services : DEFAULT_SERVICES).map(s => (
          <div key={s.title} className="card"><h3>{s.title}</h3><p className="muted">{s.text}</p></div>
        ))}</div>
      </section>

      <section className="vsec">
        <h2>Cómo comprar</h2>
        <div className="vserv">
          <div className="card"><h3>1. Registrate</h3><p className="muted">Completás los datos de tu comercio y te damos de alta.</p></div>
          <div className="card"><h3>2. Elegí la marca</h3><p className="muted">Ves el catálogo, tus precios y las condiciones de cada una.</p></div>
          <div className="card"><h3>3. Mandá el pedido</h3><p className="muted">Te confirmamos y te enviamos la factura y el remito.</p></div>
        </div>
      </section>

      {zones.length > 0 && (
        <section className="vsec">
          <h2>Zonas de cobertura</h2>
          <div className="row">{zones.map(z => <span key={z} className="pill confirmado plain" style={{ fontSize: 17, padding: '8px 16px' }}>{z}</span>)}</div>
        </section>
      )}

      <section className="vsec" id="contacto" style={{ paddingBottom: 8 }}>
        <h2>Contacto</h2>
        <div className="vcontact">
          <div className="card pad stack" style={{ gap: 10 }}>
            <b style={{ fontSize: 20 }}>{v.name}</b>
            {v.address && <span>{v.address}{v.city ? ', ' + v.city : ''}</span>}
            {v.phone && <span>Teléfono: <b>{v.phone}</b></span>}
            {v.email && <span>Email: <b>{v.email}</b></span>}
            {v.hours && <span>Horario: <b>{v.hours}</b></span>}
            <div className="row">
              {v.whatsapp && <a className="btn ok" href={waLink(v.whatsapp, 'Hola, te escribo desde tu sitio.')} target="_blank" rel="noreferrer"><Icon n="send" />Escribir por WhatsApp</a>}
              {mapUrl && <a className="btn" href={mapUrl} target="_blank" rel="noreferrer">Ver en el mapa</a>}
            </div>
          </div>
          <div className="card pad stack" style={{ gap: 10, background: 'var(--primary-soft)', borderColor: 'transparent' }}>
            <h3>¿Tenés un comercio?</h3>
            <p>Registrate como cliente para ver precios mayoristas, condiciones y hacer pedidos online.</p>
            <div className="row">{user ? <Link className="btn primary" to={to('/tienda')}>Ir a la tienda</Link> : <><Link className="btn primary" to={to('/registro')}>Quiero ser cliente</Link><Link className="btn" to={to('/ingresar')}>Ya soy cliente</Link></>}</div>
          </div>
        </div>
      </section>
    </>
  );
}
