import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCol } from '../lib/hooks';
import { Field, Icon } from '../components/ui';
import { initials } from '../lib/format';

// Pregunta primero quién es la persona, para que un comercio no se registre como vendedor por error.
export function RoleChooser({ role, setRole, repLabel }) {
  const opt = (k, title, text) => (
    <button type="button" onClick={() => setRole(k)} className="card" aria-pressed={role === k}
      style={{ textAlign: 'left', padding: '16px 18px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center', borderWidth: 2,
        borderColor: role === k ? 'var(--primary)' : 'var(--line)', background: role === k ? 'var(--primary-soft)' : 'var(--surface)' }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid ' + (role === k ? 'var(--primary)' : 'var(--line-2)'), display: 'grid', placeItems: 'center', flex: 'none' }}>
        {role === k && <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)' }} />}
      </span>
      <span><b style={{ display: 'block', fontSize: 19 }}>{title}</b><span className="muted small">{text}</span></span>
    </button>
  );
  return (
    <div className="stack" style={{ gap: 10 }}>
      <span className="label">¿Quién sos?</span>
      {opt('rep', 'Soy representante o vendedor', repLabel)}
      {opt('client', 'Soy un comercio y quiero comprar', 'Entrá a la tienda de tu representante')}
    </div>
  );
}

export function ClientFinder() {
  const [q, setQ] = useState('');
  const vendors = useCol('vendors');
  const term = q.trim().toLowerCase();
  const list = term.length < 2 ? [] : vendors.data
    .filter(v => v.status !== 'suspendido' && [v.business, v.name, v.slug].join(' ').toLowerCase().includes(term))
    .slice(0, 8);
  return (
    <div className="stack">
      <div className="notice"><div><b>Los comercios entran por la tienda de su representante</b>Así quedás conectado con él, ves sus precios y le llegan tus pedidos. Buscalo por su nombre o el de su empresa.</div></div>
      <Field label="Nombre de tu representante o de su empresa"><input id="rc-find" className="input" placeholder="Ej.: García Representaciones" value={q} onChange={e => setQ(e.target.value)} autoFocus /></Field>
      {term.length >= 2 && (
        <div className="card">
          {list.length === 0 ? <div className="empty"><b style={{ color: 'var(--ink)' }}>No encontramos a nadie con ese nombre</b><p>Probá con otra palabra o pedile el link de su tienda a tu representante.</p></div> : (
            <div className="list">{list.map(v => (
              <div key={v.id} className="item">
                <div className="me" style={{ padding: 0 }}><div className="logo" style={{ background: v.color }}>{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(v.business)}</div></div>
                <div className="grow"><div className="t">{v.business}</div><div className="s">{v.name}{v.zone ? ' · ' + v.zone : ''}</div></div>
                <div className="row" style={{ gap: 8 }}>
                  <Link className="btn sm" to={`/v/${v.slug}/ingresar`}>Ya soy cliente</Link>
                  <Link className="btn sm primary" to={`/v/${v.slug}/registro`}>Registrarme</Link>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}
      <p className="muted small">¿Tenés el link que te mandó tu representante? Abrilo directamente: te lleva a su tienda.</p>
    </div>
  );
}
