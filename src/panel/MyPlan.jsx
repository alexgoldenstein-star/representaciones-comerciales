import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auth } from '../firebase';
import { usePanel } from './Panel';
import { Field, Icon, useToast } from '../components/ui';
import { PLANS, fdate, fmt, today } from '../lib/format';

const SUB_STATUS = { pending: 'Esperando que autorices el pago', authorized: 'Activa · se cobra todos los meses', paused: 'Pausada', cancelled: 'Cancelada' };

export default function MyPlan() {
  const { v, pricing, limits, brands, clients } = usePanel();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(v.subscription?.payerEmail || v.email || '');
  const [busy, setBusy] = useState('');
  const current = pricing.plans.find(p => p.key === v.plan);
  const sub = v.subscription;
  const activeClients = clients.filter(c => c.status === 'activo').length;

  const subscribe = async plan => {
    if (!email.includes('@')) { toast('Escribí el email de tu cuenta de Mercado Pago'); return; }
    setBusy(plan.key);
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch('/api/mp/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ planKey: plan.key, payerEmail: email.trim() }) });
      if (r.status === 404) throw new Error('El cobro automático todavía no está activado. Escribinos y te damos de alta el plan.');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'No se pudo iniciar el pago.');
      window.location.href = j.url;
    } catch (e) { toast(e.message); setBusy(''); }
  };

  return (
    <>
      <div className="head"><div className="grow"><h1>Mi plan</h1><p>Tu plan, tus límites y el pago mensual con Mercado Pago.</p></div></div>
      {sp.get('pago') === 'ok' && <div className="notice ok"><div><b>¡Gracias! Recibimos tu autorización.</b>En unos minutos Mercado Pago nos confirma el pago y tu plan se actualiza solo.</div></div>}

      <section className="card pad stack">
        <div className="row between"><h2>{v.plan === 'prueba' ? 'Prueba gratis' : current?.name || PLANS[v.plan] || v.plan}</h2>
          {v.plan === 'prueba' && v.trialEnds && <span className={'pill ' + (v.trialEnds < today() ? 'suspendido' : 'pendiente')}>{v.trialEnds < today() ? 'Terminó el ' : 'Hasta el '}{fdate(v.trialEnds)}</span>}</div>
        <div className="kpis">
          <div className="card kpi"><span className="label">Marcas</span><span className="v">{brands.length}{limits.maxBrands ? ' / ' + limits.maxBrands : ''}</span><span className="muted small">{limits.maxBrands ? 'del máximo del plan' : 'sin límite'}</span></div>
          <div className="card kpi"><span className="label">Clientes activos</span><span className="v">{activeClients}{limits.maxClients ? ' / ' + limits.maxClients : ''}</span><span className="muted small">{limits.maxClients ? 'del máximo del plan' : 'sin límite'}</span></div>
          <div className="card kpi"><span className="label">Dominio propio</span><span className="v">{limits.customDomain ? 'Sí' : 'No'}</span><span className="muted small">{limits.customDomain ? 'incluido' : 'disponible en planes superiores'}</span></div>
          <div className="card kpi"><span className="label">Suscripción</span><span className="v" style={{ fontSize: 20 }}>{sub ? (SUB_STATUS[sub.status] || sub.status) : 'Sin suscripción'}</span>
            <span className="muted small">{sub?.amount ? fmt(sub.amount) + ' por mes' : ''}{sub?.nextPaymentDate ? ' · próximo cobro ' + fdate(sub.nextPaymentDate.slice(0, 10)) : ''}</span></div>
        </div>
        {v.lastPayment && <p className="muted">Último cobro: {fmt(v.lastPayment.amount)} · {fdate(String(v.lastPayment.date).slice(0, 10))} · {v.lastPayment.paymentStatus === 'approved' || v.lastPayment.status === 'processed' ? 'aprobado' : v.lastPayment.paymentStatus || v.lastPayment.status}</p>}
        {sub?.status === 'authorized' && <p className="muted">Para pausar o cancelar la suscripción, entrá a tu cuenta de Mercado Pago → Suscripciones, o escribinos.</p>}
      </section>

      <section className="stack">
        <h2>{sub?.status === 'authorized' ? 'Cambiar de plan' : 'Elegí tu plan'}</h2>
        <Field label="Email de tu cuenta de Mercado Pago" hint="Tiene que ser el mismo con el que vas a pagar.">
          <input id="mp-email" className="input" type="email" style={{ maxWidth: 420 }} value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        <div className="bgrid">
          {pricing.plans.map(p => {
            const isCurrent = p.key === v.plan && sub?.status === 'authorized';
            return (
              <div key={p.key} className="card pad stack" style={p.highlight ? { borderColor: 'var(--primary)', borderWidth: 2 } : undefined}>
                <h3>{p.name}</h3>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{p.price} <span className="muted small" style={{ fontWeight: 400 }}>{p.period}</span></div>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>{(p.features || []).map(x => <li key={x}>{x}</li>)}</ul>
                {isCurrent ? <span className="pill activo">Tu plan actual</span>
                  : Number(p.amount) > 0 ? <button className="btn primary" disabled={!!busy} onClick={() => subscribe(p)}><Icon n="card" />{busy === p.key ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}</button>
                  : <span className="muted">Consultanos por WhatsApp para este plan.</span>}
              </div>
            );
          })}
        </div>
        <p className="muted small">El cobro es mensual y automático con Mercado Pago (tarjeta de crédito, débito o dinero en cuenta). Lo podés cancelar cuando quieras.</p>
      </section>
    </>
  );
}
