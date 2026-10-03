import { useState } from 'react';
import { doc, getDoc, runTransaction, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { ConfirmButton, Field, FileButton, Icon, copyText, useToast } from '../components/ui';
import { PLANS, cleanHost, fdate, initials, slugify } from '../lib/format';
import { uploadPublicImage } from '../lib/upload';
import { COLORS } from './Brands';
import { siteBase } from './Clients';

export default function MySite() {
  const { vid, v, orders, brands, products, clients } = usePanel();
  const toast = useToast();
  const vref = doc(db, 'vendors', vid);
  const [f, setF] = useState({ business: v.business, name: v.name, whatsapp: v.whatsapp || '', email: v.email || '', zone: v.zone || '', about: v.about || '', color: v.color || COLORS[0] });
  const [up, setUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState(v.slug);
  const [domain, setDomain] = useState(v.domain || '');
  const set = (k, val) => setF(x => ({ ...x, [k]: val }));
  const link = siteBase(v);

  const saveData = async () => {
    if (!f.business.trim()) { toast('El nombre de tu representación no puede quedar vacío'); return; }
    setBusy(true);
    try { await updateDoc(vref, { ...f, whatsapp: f.whatsapp.replace(/\D/g, '') }); toast('Datos guardados'); } catch (e) { toast('No se pudo guardar'); }
    setBusy(false);
  };
  const changeSlug = async () => {
    const s = slugify(slug);
    if (s === v.slug) return;
    if (s.length < 3) { toast('La dirección tiene que tener al menos 3 letras'); return; }
    try {
      await runTransaction(db, async tx => {
        const nref = doc(db, 'slugs', s);
        if ((await tx.get(nref)).exists()) throw new Error('taken');
        tx.set(nref, { vendorId: vid }); tx.delete(doc(db, 'slugs', v.slug)); tx.update(vref, { slug: s });
      });
      toast('Tu nueva dirección ya funciona');
    } catch (e) { toast(e.message === 'taken' ? 'Esa dirección ya está en uso' : 'No se pudo cambiar la dirección'); }
  };
  const requestDomain = async () => {
    const d = cleanHost(domain);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) { toast('Escribí el dominio así: tuempresa.com.ar'); return; }
    const taken = await getDoc(doc(db, 'domains', d)).catch(() => null);
    if (taken?.exists() && taken.data().vendorId !== vid) { toast('Ese dominio ya está conectado a otra cuenta'); return; }
    await updateDoc(vref, { domain: d, domainStatus: 'pendiente', domainRequestedAt: new Date().toISOString().slice(0, 10) });
    toast('Pedido enviado. Te avisamos cuando esté listo.');
  };
  const cancelDomain = async () => { await updateDoc(vref, { domain: '', domainStatus: 'sin' }); setDomain(''); toast('Listo'); };
  const hasSample = [...orders, ...brands, ...products, ...clients].some(x => x.sample);
  const removeSample = async () => {
    const b = writeBatch(db);
    orders.filter(x => x.sample).forEach(x => b.delete(doc(db, 'vendors', vid, 'orders', x.id)));
    brands.filter(x => x.sample).forEach(x => b.delete(doc(db, 'vendors', vid, 'brands', x.id)));
    products.filter(x => x.sample).forEach(x => b.delete(doc(db, 'vendors', vid, 'products', x.id)));
    clients.filter(x => x.sample).forEach(x => b.delete(doc(db, 'vendors', vid, 'clients', x.id)));
    await b.commit(); toast('Borramos los datos de ejemplo');
  };

  return (
    <>
      <div className="head">
        <div className="grow"><h1>Mi sitio</h1><p>Tus datos, la dirección de tu tienda y tu dominio propio.</p></div>
        <a className="btn" href={link} target="_blank" rel="noreferrer"><Icon n="store" />Ver mi sitio</a>
      </div>

      <section className="card pad stack">
        <h2>Tus datos</h2>
        <div className="row" style={{ alignItems: 'center' }}>
          <div className="me"><div className="logo" style={{ width: 80, height: 80, fontSize: 26, background: f.color }}>{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(f.business)}</div></div>
          <FileButton label={v.logoUrl ? 'Cambiar mi logo' : 'Subir mi logo'} accept="image/*" busy={up} onFile={async file => { setUp(true); try { await updateDoc(vref, { logoUrl: await uploadPublicImage(vid, 'logo', file) }); toast('Logo actualizado'); } catch (e) { toast('No se pudo subir el logo'); } setUp(false); }} />
          {v.logoUrl && <button className="btn sm link" onClick={() => updateDoc(vref, { logoUrl: null })}>Quitar logo</button>}
        </div>
        <div className="grid g2">
          <Field label="Nombre de tu representación"><input id="m-bus" className="input" value={f.business} onChange={e => set('business', e.target.value)} /></Field>
          <Field label="Tu nombre"><input id="m-name" className="input" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="WhatsApp para pedidos"><input id="m-wa" className="input" inputMode="tel" value={f.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>
          <Field label="Email"><input id="m-em" className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
        </div>
        <Field label="Zonas que cubrís" hint="Separadas por coma. Ej.: CABA, GBA Sur, Rosario"><input id="m-zone" className="input" value={f.zone} onChange={e => set('zone', e.target.value)} /></Field>
        <Field label="Presentación" hint="Aparece en la portada de tu sitio. Contá qué hacés y para quién."><textarea id="m-about" className="input" value={f.about} onChange={e => set('about', e.target.value)} /></Field>
        <div><span className="label">Color de tu sitio</span>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>{COLORS.map(c => <button key={c} aria-label={'Color ' + c} onClick={() => set('color', c)} style={{ width: 44, height: 44, borderRadius: 10, background: c, border: f.color === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />)}</div></div>
        <div><button className="btn primary" onClick={saveData} disabled={busy}>{busy ? 'Guardando…' : 'Guardar mis datos'}</button></div>
      </section>

      <section className="card pad stack">
        <h2>Dirección de tu sitio</h2>
        <p className="muted">Esta dirección funciona siempre, tengas o no dominio propio.</p>
        <Field label="Tu dirección">
          <div className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
            <span className="input hide-m" style={{ width: 'auto', borderRight: 0, borderRadius: '10px 0 0 10px', background: 'var(--surface-2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{window.location.host}/v/</span>
            <input id="m-slug" className="input" style={{ borderRadius: 10 }} value={slug} onChange={e => setSlug(slugify(e.target.value))} />
          </div>
        </Field>
        <div className="row">
          {slug !== v.slug && <button className="btn primary" onClick={changeSlug}>Guardar nueva dirección</button>}
          <button className="btn" onClick={async () => toast(await copyText(`${window.location.origin}/v/${v.slug}`) ? 'Dirección copiada' : 'No se pudo copiar')}><Icon n="copy" />Copiar dirección</button>
        </div>
      </section>

      <section className="card pad stack">
        <div className="row between"><h2>Dominio propio</h2>
          {v.domainStatus === 'activo' && <span className="pill activo">Conectado</span>}
          {v.domainStatus === 'pendiente' && <span className="pill pendiente">En proceso</span>}
          {v.domainStatus === 'rechazado' && <span className="pill rechazado">No se pudo conectar</span>}
        </div>
        {v.domainStatus === 'activo' ? (
          <>
            <div className="notice ok"><div><b>Tu sitio ya funciona en {v.domain}</b>Tus clientes pueden entrar directamente con tu dominio.</div></div>
            <div className="row"><a className="btn" href={`https://${v.domain}`} target="_blank" rel="noreferrer">Abrir {v.domain}</a>
              <ConfirmButton question="¿Desconectar tu dominio?" yes="Desconectar" onConfirm={cancelDomain}>Desconectar dominio</ConfirmButton></div>
          </>
        ) : v.domainStatus === 'pendiente' ? (
          <>
            <p>Pediste conectar <b>{v.domain}</b>{v.domainRequestedAt ? ` el ${fdate(v.domainRequestedAt)}` : ''}.</p>
            {v.dnsRecords ? (
              <div className="stack" style={{ gap: 10 }}>
                <div className="notice warn"><div><b>Falta un paso tuyo</b>Entrá a donde compraste el dominio (NIC Argentina, DonWeb, GoDaddy, etc.) y cargá estos datos en la sección “DNS”. Si no sabés cómo, reenviáselos a quien te maneja el dominio.</div></div>
                <pre className="input" style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', fontSize: 16, background: 'var(--surface-2)', margin: 0 }}>{v.dnsRecords}</pre>
                <div><button className="btn" onClick={async () => toast(await copyText(v.dnsRecords) ? 'Datos copiados' : 'No se pudo copiar')}><Icon n="copy" />Copiar datos</button></div>
              </div>
            ) : <div className="notice"><div><b>Estamos preparando tu dominio</b>En menos de 24 horas te dejamos acá los datos que tenés que cargar. También te avisamos por WhatsApp.</div></div>}
            <div><ConfirmButton className="btn" question="¿Cancelar el pedido?" yes="Cancelar pedido" onConfirm={cancelDomain}>Cancelar el pedido</ConfirmButton></div>
          </>
        ) : (
          <>
            {v.domainStatus === 'rechazado' && v.adminNotes && <div className="notice bad"><div><b>Mensaje del equipo</b>{v.adminNotes}</div></div>}
            <p className="muted">Si ya tenés un dominio (por ejemplo, garciarepresentaciones.com.ar), lo conectamos para que tu sitio se vea ahí. Disponible en el plan Profesional.</p>
            <Field label="Tu dominio"><input id="m-dom" className="input" placeholder="tuempresa.com.ar" value={domain} onChange={e => setDomain(e.target.value)} /></Field>
            <div><button className="btn primary" onClick={requestDomain}>Pedir que conecten mi dominio</button></div>
          </>
        )}
      </section>

      <section className="card pad stack">
        <h2>Tu plan</h2>
        <div className="row"><span className="pill plain" style={{ fontSize: 17 }}>{PLANS[v.plan] || v.plan}</span>{v.plan === 'prueba' && v.trialEnds && <span className="muted">hasta el {fdate(v.trialEnds)}</span>}</div>
        <p className="muted">Para cambiar de plan escribinos por WhatsApp.</p>
      </section>

      {hasSample && (
        <section className="card pad stack">
          <h2>Datos de ejemplo</h2>
          <p className="muted">Tenés cargados marcas, artículos, clientes y pedidos de ejemplo. Borralos cuando empieces con lo tuyo.</p>
          <div><ConfirmButton question="¿Borrar todos los datos de ejemplo?" yes="Sí, borrar" onConfirm={removeSample}>Borrar datos de ejemplo</ConfirmButton></div>
        </section>
      )}
    </>
  );
}
