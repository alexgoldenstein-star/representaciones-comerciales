import { useState } from 'react';
import { doc, getDoc, runTransaction, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { ConfirmButton, Field, FileButton, Icon, RowsEditor, copyText, useToast } from '../components/ui';
import { DEFAULT_SERVICES } from '../site/VendorHome';
import { PLANS, cleanHost, fdate, initials, slugify } from '../lib/format';
import { uploadPublicImage } from '../lib/upload';
import { COLORS } from './Brands';
import { siteBase } from './Clients';

export default function MySite() {
  const { vid, v, orders, brands, products, clients, limits } = usePanel();
  const toast = useToast();
  const vref = doc(db, 'vendors', vid);
  const FIELDS = ['business', 'name', 'whatsapp', 'email', 'zone', 'about', 'aboutTitle', 'heroTitle', 'heroSubtitle', 'since', 'legalName', 'cuit', 'ivaCond', 'address', 'city', 'phone', 'hours', 'instagram', 'facebook', 'linkedin', 'website'];
  const [f, setF] = useState(() => ({ ...Object.fromEntries(FIELDS.map(k => [k, v[k] || ''])), color: v.color || COLORS[0], services: v.services?.length ? v.services : DEFAULT_SERVICES }));
  const [upImg, setUpImg] = useState('');
  const [up, setUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState(v.slug);
  const [domain, setDomain] = useState(v.domain || '');
  const set = (k, val) => setF(x => ({ ...x, [k]: val }));
  const link = siteBase(v);

  const saveData = async () => {
    if (!f.business.trim()) { toast('El nombre de tu representación no puede quedar vacío'); return; }
    setBusy(true);
    try { await updateDoc(vref, { ...f, whatsapp: f.whatsapp.replace(/\D/g, ''), services: (f.services || []).filter(x => x.title) }); toast('Cambios guardados. Ya se ven en tu sitio.'); } catch (e) { toast('No se pudo guardar'); }
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
        <div className="grow"><h1>Mi sitio</h1><p>Armá tu sitio: portada, quiénes somos, contacto, datos de la empresa, dirección y dominio.</p></div>
        <a className="btn" href={link} target="_blank" rel="noreferrer"><Icon n="store" />Ver mi sitio</a>
      </div>

      <div className="notice"><div className="grow"><b>Todo lo que cargues acá se ve en tu sitio</b>Completalo como lo pondrías en un folleto de tu empresa: datos reales, fotos propias y tus redes. Al terminar tocá “Guardar cambios”.</div>
        <button className="btn primary" onClick={saveData} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>

      <section className="card pad stack">
        <h2>1. Tu marca</h2>
        <div className="row" style={{ alignItems: 'center' }}>
          <div className="me"><div className="logo" style={{ width: 80, height: 80, fontSize: 26, background: f.color }}>{v.logoUrl ? <img src={v.logoUrl} alt="" /> : initials(f.business)}</div></div>
          <FileButton label={v.logoUrl ? 'Cambiar mi logo' : 'Subir mi logo'} accept="image/*" busy={up} onFile={async file => { setUp(true); try { await updateDoc(vref, { logoUrl: await uploadPublicImage(vid, 'logo', file) }); toast('Logo actualizado'); } catch (e) { toast('No se pudo subir el logo'); } setUp(false); }} />
          {v.logoUrl && <button className="btn sm link" onClick={() => updateDoc(vref, { logoUrl: null })}>Quitar logo</button>}
        </div>
        <div className="grid g2">
          <Field label="Nombre de tu representación"><input id="m-bus" className="input" value={f.business} onChange={e => set('business', e.target.value)} /></Field>
          <Field label="Tu nombre"><input id="m-name" className="input" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        </div>
        <div><span className="label">Color de tu sitio</span>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>{COLORS.map(c => <button key={c} aria-label={'Color ' + c} onClick={() => set('color', c)} style={{ width: 44, height: 44, borderRadius: 10, background: c, border: f.color === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />)}</div></div>
      </section>

      <section className="card pad stack">
        <h2>2. Portada</h2>
        <p className="muted">Es lo primero que ven al entrar. Usá una foto horizontal de buena calidad: tu depósito, un local, productos de tus marcas.</p>
        <div className="row">
          {v.bannerUrl && <img src={v.bannerUrl} alt="" style={{ width: 220, aspectRatio: '16/7', objectFit: 'cover', borderRadius: 10 }} />}
          <FileButton label={v.bannerUrl ? 'Cambiar foto de portada' : 'Subir foto de portada'} accept="image/*" busy={upImg === 'bannerUrl'} onFile={async file => { setUpImg('bannerUrl'); try { await updateDoc(vref, { bannerUrl: await uploadPublicImage(vid, 'sitio', file) }); toast('Imagen actualizada'); } catch (e) { toast('No se pudo subir la imagen'); } setUpImg(''); }} />
            {v.bannerUrl && <button className="btn sm link" onClick={() => updateDoc(vref, { bannerUrl: null })}>Quitar</button>}
        </div>
        <Field label="Título principal" hint={`Si lo dejás vacío se muestra “${f.business}”.`}><input id="m-ht" className="input" placeholder="Ej.: Representación comercial de fábricas argentinas" value={f.heroTitle} onChange={e => set('heroTitle', e.target.value)} /></Field>
        <Field label="Bajada" hint="Una o dos líneas: qué hacés y para quién."><textarea id="m-hs" className="input" style={{ minHeight: 80 }} placeholder="Ej.: Llevamos las mejores marcas de bazar e iluminación a ferreterías y bazares de AMBA y el interior." value={f.heroSubtitle} onChange={e => set('heroSubtitle', e.target.value)} /></Field>
        <Field label="Año en que empezaste" hint="Se muestra como “X años de trayectoria”."><input id="m-since" className="input" inputMode="numeric" style={{ maxWidth: 160 }} placeholder="2011" value={f.since} onChange={e => set('since', e.target.value.replace(/\D/g, '').slice(0, 4))} /></Field>
      </section>

      <section className="card pad stack">
        <h2>3. Quiénes somos</h2>
        <Field label="Título de la sección"><input id="m-at" className="input" placeholder="Quiénes somos" value={f.aboutTitle} onChange={e => set('aboutTitle', e.target.value)} /></Field>
        <Field label="Texto" hint="Contá tu historia, tu experiencia y cómo trabajás. Podés usar varios párrafos."><textarea id="m-about" className="input" style={{ minHeight: 160 }} value={f.about} onChange={e => set('about', e.target.value)} /></Field>
        <div className="row">
          {v.aboutImageUrl && <img src={v.aboutImageUrl} alt="" style={{ width: 160, aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10 }} />}
          <FileButton label={v.aboutImageUrl ? 'Cambiar foto (opcional)' : 'Subir foto (opcional)'} accept="image/*" busy={upImg === 'aboutImageUrl'} onFile={async file => { setUpImg('aboutImageUrl'); try { await updateDoc(vref, { aboutImageUrl: await uploadPublicImage(vid, 'sitio', file) }); toast('Imagen actualizada'); } catch (e) { toast('No se pudo subir la imagen'); } setUpImg(''); }} />
            {v.aboutImageUrl && <button className="btn sm link" onClick={() => updateDoc(vref, { aboutImageUrl: null })}>Quitar</button>}
        </div>
      </section>

      <section className="card pad stack">
        <h2>4. Qué ofrecemos</h2>
        <p className="muted">Tres o cuatro puntos fuertes de tu servicio.</p>
        <RowsEditor idPrefix="sv" rows={f.services} onChange={val => set('services', val)} addLabel="Agregar punto"
          cols={[{ k: 'title', label: 'Título', placeholder: 'Atención personalizada' }, { k: 'text', label: 'Descripción', placeholder: 'Visitamos tu comercio…', width: 2 }]} />
      </section>

      <section className="card pad stack">
        <h2>5. Contacto y datos de la empresa</h2>
        <p className="muted">Aparecen en la sección Contacto y en el pie de página de tu sitio.</p>
        <div className="grid g2">
          <Field label="WhatsApp para pedidos"><input id="m-wa" className="input" inputMode="tel" value={f.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>
          <Field label="Teléfono fijo (opcional)"><input id="m-ph" className="input" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input id="m-em" className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Horario de atención"><input id="m-hours" className="input" placeholder="Lunes a viernes de 9 a 18 h" value={f.hours} onChange={e => set('hours', e.target.value)} /></Field>
          <Field label="Dirección"><input id="m-addr" className="input" placeholder="Av. Rivadavia 1234, piso 3" value={f.address} onChange={e => set('address', e.target.value)} /></Field>
          <Field label="Localidad"><input id="m-city" className="input" placeholder="CABA" value={f.city} onChange={e => set('city', e.target.value)} /></Field>
        </div>
        <Field label="Zonas que cubrís" hint="Separadas por coma. Ej.: CABA, GBA Sur, Rosario"><input id="m-zone" className="input" value={f.zone} onChange={e => set('zone', e.target.value)} /></Field>
        <div className="grid g3">
          <Field label="Razón social"><input id="m-legal" className="input" placeholder="García Representaciones SRL" value={f.legalName} onChange={e => set('legalName', e.target.value)} /></Field>
          <Field label="CUIT"><input id="m-cuit" className="input" inputMode="numeric" placeholder="30-00000000-0" value={f.cuit} onChange={e => set('cuit', e.target.value)} /></Field>
          <Field label="Condición de IVA"><select id="m-iva" className="input" value={f.ivaCond} onChange={e => set('ivaCond', e.target.value)}><option value="">—</option><option>Responsable inscripto</option><option>Monotributo</option><option>Exento</option></select></Field>
        </div>
        <h3>Redes sociales</h3>
        <div className="grid g2">
          <Field label="Instagram" hint="Usuario o link"><input id="m-ig" className="input" placeholder="@garciarepresentaciones" value={f.instagram} onChange={e => set('instagram', e.target.value)} /></Field>
          <Field label="Facebook"><input id="m-fb" className="input" value={f.facebook} onChange={e => set('facebook', e.target.value)} /></Field>
          <Field label="LinkedIn"><input id="m-li" className="input" value={f.linkedin} onChange={e => set('linkedin', e.target.value)} /></Field>
          <Field label="Otro sitio web"><input id="m-web" className="input" value={f.website} onChange={e => set('website', e.target.value)} /></Field>
        </div>
        <div><button className="btn primary" onClick={saveData} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
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
            <p className="muted">Si ya tenés un dominio (por ejemplo, garciarepresentaciones.com.ar), lo conectamos para que tu sitio se vea ahí. </p>
            <Field label="Tu dominio"><input id="m-dom" className="input" placeholder="tuempresa.com.ar" value={domain} onChange={e => setDomain(e.target.value)} /></Field>
            {limits.customDomain ? <div><button className="btn primary" onClick={requestDomain}>Pedir que conecten mi dominio</button></div>
              : <div className="notice warn"><div className="grow"><b>Tu plan {limits.name} no incluye dominio propio</b>Pasate a un plan superior para usar tu dominio.</div><a className="btn sm" href="/panel/plan">Ver planes</a></div>}
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
