// Firebase con permisos de servidor (sólo se usa en las funciones de /api, nunca en el navegador).
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function admin() {
  if (!getApps().length) {
    if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-rc' }); // pruebas locales
    else initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export const MP_API = process.env.MP_API_URL || 'https://api.mercadopago.com';
export const mpFetch = (path, opts = {}) => fetch(MP_API + path, {
  ...opts,
  headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
});

// Precios por defecto si todavía no se publicaron desde Administración → Precios.
export const FALLBACK_PLANS = [
  { key: 'inicial', name: 'Inicial', amount: 19900 },
  { key: 'profesional', name: 'Profesional', amount: 39900 },
];
