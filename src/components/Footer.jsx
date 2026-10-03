import { Link } from 'react-router-dom';
import { initials } from '../lib/format';

const ext = u => (!u ? '' : /^https?:\/\//.test(u) ? u : 'https://' + u.replace(/^@/, ''));
const social = (kind, v) => {
  if (!v) return null;
  if (/^https?:\/\//.test(v)) return v;
  const h = v.replace(/^@/, '');
  return kind === 'instagram' ? `https://instagram.com/${h}` : kind === 'facebook' ? `https://facebook.com/${h}` : kind === 'linkedin' ? `https://linkedin.com/company/${h}` : ext(v);
};
const waUrl = n => { const d = String(n || '').replace(/\D/g, ''); return d ? `https://wa.me/${d.startsWith('54') ? d : '549' + d}` : ''; };

// Pie de página corporativo: datos de la empresa, contacto, navegación y redes.
export default function Footer({ d, links = [], bottom, color }) {
  const year = new Date().getFullYear();
  const nets = [['Instagram', social('instagram', d.instagram)], ['Facebook', social('facebook', d.facebook)], ['LinkedIn', social('linkedin', d.linkedin)], ['Sitio web', ext(d.website)]].filter(([, u]) => u);
  return (
    <footer className="cfoot">
      <div className="cfoot-in">
        <div className="cfoot-col" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
            <div className="cfoot-logo" style={{ background: color || '#1B5E86' }}>{d.logoUrl ? <img src={d.logoUrl} alt="" /> : initials(d.name)}</div>
            <b style={{ fontSize: 20 }}>{d.name}</b>
          </div>
          {d.tagline && <p>{d.tagline}</p>}
          {(d.legalName || d.cuit) && <p className="cfoot-legal">{d.legalName}{d.legalName && d.cuit ? ' · ' : ''}{d.cuit ? 'CUIT ' + d.cuit : ''}{d.ivaCond ? <><br />{d.ivaCond}</> : null}</p>}
        </div>
        <div className="cfoot-col">
          <h4>Contacto</h4>
          {d.address && <span>{d.address}{d.city ? ', ' + d.city : ''}</span>}
          {d.phone && <span>Tel.: {d.phone}</span>}
          {d.whatsapp && <a href={waUrl(d.whatsapp)} target="_blank" rel="noreferrer">WhatsApp: {d.whatsapp}</a>}
          {d.email && <span>{d.email}</span>}
          {d.hours && <span>{d.hours}</span>}
        </div>
        {links.length > 0 && <div className="cfoot-col">
          <h4>Secciones</h4>
          {links.map(l => l.onClick ? <a key={l.label} href="#" onClick={e => { e.preventDefault(); l.onClick(); }}>{l.label}</a> : l.href ? <a key={l.label} href={l.href}>{l.label}</a> : <Link key={l.label} to={l.to}>{l.label}</Link>)}
        </div>}
        {nets.length > 0 && <div className="cfoot-col">
          <h4>Seguinos</h4>
          {nets.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer">{l}</a>)}
        </div>}
      </div>
      <div className="cfoot-bottom">
        <span>© {year} {d.legalName || d.name}. Todos los derechos reservados.</span>
        {bottom}
      </div>
    </footer>
  );
}
