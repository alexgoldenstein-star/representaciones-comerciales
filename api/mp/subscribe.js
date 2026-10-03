// Crea una suscripción mensual en Mercado Pago para el vendedor que está logueado
// y devuelve el link de pago (init_point) para que la autorice.
import { admin, mpFetch, FALLBACK_PLANS } from '../_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.MP_ACCESS_TOKEN || !process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(501).json({ error: 'El cobro automático todavía no está configurado. Escribinos y te damos de alta el plan.' });
  }
  const { auth, db } = admin();
  let user;
  try { user = await auth.verifyIdToken(String(req.headers.authorization || '').replace('Bearer ', '')); }
  catch (e) { return res.status(401).json({ error: 'Tu sesión venció. Volvé a ingresar.' }); }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const vref = db.doc(`vendors/${user.uid}`);
  const vendor = (await vref.get()).data();
  if (!vendor) return res.status(404).json({ error: 'No encontramos tu cuenta de vendedor.' });

  const pricing = (await db.doc('config/pricing').get()).data();
  const plans = pricing?.plans?.length ? pricing.plans : FALLBACK_PLANS;
  const plan = plans.find(p => p.key === body.planKey);
  const amount = Number(plan?.amount) || 0;
  if (!plan || amount <= 0) return res.status(400).json({ error: 'Ese plan no tiene un precio para cobro automático.' });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const payerEmail = String(body.payerEmail || vendor.email || user.email || '').trim();
  const r = await mpFetch('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: `Representaciones comerciales · Plan ${plan.name}`,
      external_reference: `${user.uid}|${plan.key}`,
      payer_email: payerEmail,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'ARS' },
      back_url: `${origin}/panel/plan?pago=ok`,
      status: 'pending',
    }),
  });
  const j = await r.json();
  if (!r.ok) return res.status(502).json({ error: j.message || 'Mercado Pago no aceptó el pedido. Revisá el email de tu cuenta de Mercado Pago.' });

  await vref.set({ subscription: { id: j.id, status: j.status || 'pending', planKey: plan.key, planName: plan.name, amount, payerEmail, createdAt: new Date().toISOString() } }, { merge: true });
  return res.status(200).json({ url: j.init_point });
}
