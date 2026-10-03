// Mercado Pago avisa acá cada vez que cambia una suscripción o se cobra una cuota.
// Siempre volvemos a consultar a Mercado Pago (no confiamos en lo que llega) y respondemos 200.
import { admin, mpFetch } from '../_firebase.js';

export default async function handler(req, res) {
  try {
    if (!process.env.MP_ACCESS_TOKEN || !process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(200).json({ ok: false });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = body.type || body.topic || req.query.type || req.query.topic;
    const id = body?.data?.id || req.query['data.id'] || req.query.id;
    if (!type || !id) return res.status(200).json({ ok: true });
    const { db } = admin();

    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const pre = await (await mpFetch(`/preapproval/${id}`)).json();
      const [uid, planKey] = String(pre.external_reference || '').split('|');
      if (!uid) return res.status(200).json({ ok: true });
      const vref = db.doc(`vendors/${uid}`);
      const patch = {
        'subscription.id': pre.id, 'subscription.status': pre.status, 'subscription.planKey': planKey,
        'subscription.amount': pre.auto_recurring?.transaction_amount || null,
        'subscription.nextPaymentDate': pre.next_payment_date || null, 'subscription.updatedAt': new Date().toISOString(),
      };
      if (pre.status === 'authorized') { patch.plan = planKey; patch.status = 'activo'; }
      await vref.update(patch);
    }

    if (type === 'subscription_authorized_payment' || type === 'authorized_payment') {
      const pay = await (await mpFetch(`/authorized_payments/${id}`)).json();
      const snap = await db.collection('vendors').where('subscription.id', '==', pay.preapproval_id).limit(1).get();
      if (!snap.empty) {
        const vref = snap.docs[0].ref;
        const p = { id: String(pay.id), status: pay.status, paymentStatus: pay.payment?.status || null, amount: pay.transaction_amount, date: pay.date_created || new Date().toISOString() };
        await vref.update({ lastPayment: p });
        await vref.collection('payments').doc(String(pay.id)).set(p, { merge: true });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook', e);
    return res.status(200).json({ ok: false });
  }
}
