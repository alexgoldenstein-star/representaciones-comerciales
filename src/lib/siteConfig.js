import { useDocData } from './hooks';

// Precios y textos comerciales. Se editan desde Administración → Precios
// y se guardan en Firestore en config/pricing. Si todavía no se guardó nada, se usan estos.
export const DEFAULT_PRICING = {
  trialDays: 14,
  title: 'Precios claros, en pesos.',
  subtitle: 'Pagás por mes con Mercado Pago. Lo cancelás cuando quieras.',
  note: 'Precios de lanzamiento, más IVA.',
  plans: [
    { key: 'inicial', name: 'Inicial', price: '$ 19.900', amount: 19900, maxBrands: 3, maxClients: 40, customDomain: false, period: 'por mes', highlight: false, cta: 'Empezar gratis',
      features: ['Hasta 3 marcas', 'Hasta 40 clientes', 'Tu tienda en nuestra dirección', 'Pedidos y comisiones', 'App en el celular'] },
    { key: 'profesional', name: 'Profesional', price: '$ 39.900', amount: 39900, maxBrands: 0, maxClients: 0, customDomain: true, period: 'por mes', highlight: true, cta: 'Empezar gratis',
      features: ['Marcas y clientes sin límite', 'Tu dominio propio', 'Factura y remito al cliente', 'Listas desde Excel', 'Página de presentación'] },
    { key: 'agencia', name: 'Agencia', price: 'A medida', amount: 0, maxBrands: 0, maxClients: 0, customDomain: true, period: '', highlight: false, cta: 'Consultar',
      features: ['Varios vendedores en una cuenta', 'Comisión por vendedor', 'Zonas y carteras de clientes', 'Te ayudamos con la carga inicial'] },
  ],
};

export function mergePricing(data) {
  if (!data) return DEFAULT_PRICING;
  return { ...DEFAULT_PRICING, ...data, plans: Array.isArray(data.plans) && data.plans.length ? data.plans : DEFAULT_PRICING.plans };
}

export function usePricing() {
  const { data, loading } = useDocData('config/pricing');
  return { pricing: mergePricing(data), loading };
}

// Datos de la empresa dueña de la plataforma (vos). Se editan en Administración → Empresa.
export const DEFAULT_COMPANY = {
  name: 'Representaciones comerciales',
  tagline: 'El sistema para representantes de comercio: tienda por marca, pedidos, comprobantes y comisiones.',
  legalName: '', cuit: '', ivaCond: '', address: '', city: 'Buenos Aires', phone: '', email: '',
  whatsapp: import.meta.env.VITE_CONTACT_WHATSAPP || '', hours: 'Lunes a viernes de 9 a 18 h',
  instagram: '', facebook: '', linkedin: '', website: '',
  terms: `1. Objeto
La plataforma permite a representantes comerciales publicar el catálogo de las empresas que representan, recibir y gestionar pedidos de sus clientes y registrar sus comisiones.

2. Cuentas
Cada usuario es responsable de la veracidad de los datos que carga y de mantener su contraseña en reserva. Podemos suspender cuentas que hagan un uso indebido del servicio.

3. Precios y pedidos
Los precios, condiciones comerciales y la disponibilidad de los productos son informados por cada representante. La plataforma no vende productos ni emite facturas: las facturas las emite cada empresa representada.

4. Suscripción
El uso de la plataforma por parte de los representantes se abona por mes según el plan elegido. La suscripción puede cancelarse en cualquier momento; no se reintegran períodos ya abonados.

5. Responsabilidad
La plataforma se ofrece como una herramienta de gestión. No somos parte de las operaciones comerciales entre representantes, empresas y clientes.

6. Cambios
Podemos actualizar estos términos. Los cambios se informan en este mismo sitio.

7. Contacto
Para cualquier consulta, escribinos a los datos de contacto que figuran al pie de esta página.`,
  privacy: `Qué datos guardamos
Los datos que cada usuario carga al registrarse (nombre, empresa, CUIT, email, teléfono y dirección) y la información de catálogos, pedidos y comprobantes.

Para qué los usamos
Sólo para prestar el servicio: mostrar catálogos, procesar pedidos, enviar comprobantes y comunicarnos con vos. No vendemos ni cedemos tus datos a terceros.

Quién los ve
Cada representante ve únicamente sus propios clientes y pedidos. Cada cliente ve únicamente sus propios pedidos.

Dónde se guardan
En servidores de Google Cloud (Firebase) con acceso protegido.

Tus derechos
Podés pedir el acceso, la corrección o la eliminación de tus datos escribiéndonos. La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, atiende las denuncias y reclamos relacionados con el incumplimiento de las normas sobre protección de datos personales.`,
};

export function useCompany() {
  const { data, loading } = useDocData('config/company');
  return { company: { ...DEFAULT_COMPANY, ...(data || {}) }, loading };
}

// Límites del plan de un vendedor. Durante la prueba gratis no hay límites.
export function planLimits(pricing, planKey) {
  if (!planKey || planKey === 'prueba') return { name: 'Prueba gratis', maxBrands: 0, maxClients: 0, customDomain: true };
  const p = pricing.plans.find(x => x.key === planKey);
  if (!p) return { name: planKey, maxBrands: 0, maxClients: 0, customDomain: true };
  return { name: p.name, maxBrands: Number(p.maxBrands) || 0, maxClients: Number(p.maxClients) || 0, customDomain: p.customDomain !== false };
}
