import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Achica imágenes grandes antes de subirlas (más rápido con conexiones lentas).
async function shrink(file, max = 1200) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  if (k === 1 && file.size < 600000) return file;
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return await new Promise(r => c.toBlob(b => r(new File([b], file.name, { type })), type, 0.86));
}

export async function uploadPublicImage(vendorId, folder, file) {
  const f = await shrink(file);
  const r = ref(storage, `vendors/${vendorId}/public/${folder}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`);
  await uploadBytes(r, f, { contentType: f.type });
  return await getDownloadURL(r);
}

export async function uploadDoc(vendorId, clientId, file) {
  const r = ref(storage, `vendors/${vendorId}/docs/${clientId || 'sin-cliente'}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`);
  await uploadBytes(r, file, { contentType: file.type || 'application/pdf' });
  return await getDownloadURL(r);
}
