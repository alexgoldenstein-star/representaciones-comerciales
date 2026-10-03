import { useDocData } from './hooks';

// Precios y textos comerciales. Se editan desde Administración → Precios
// y se guardan en Firestore en config/pricing. Si todavía no se guardó nada, se usan estos.
export const DEFAULT_PRICING = {
  trialDays: 14,
  title: 'Precios claros, en pesos.',
  subtitle: 'Pagás por mes con Mercado Pago. Lo cancelás cuando quieras.',
  note: 'Precios de lanzamiento, más IVA.',
  plans: [
    { key: 'inicial', name: 'Inicial', price: '$ 19.900', period: 'por mes', highlight: false, cta: 'Empezar gratis',
      features: ['Hasta 3 marcas', 'Hasta 40 clientes', 'Tu tienda en nuestra dirección', 'Pedidos y comisiones', 'App en el celular'] },
    { key: 'profesional', name: 'Profesional', price: '$ 39.900', period: 'por mes', highlight: true, cta: 'Empezar gratis',
      features: ['Marcas y clientes sin límite', 'Tu dominio propio', 'Factura y remito al cliente', 'Listas desde Excel', 'Página de presentación'] },
    { key: 'agencia', name: 'Agencia', price: 'A medida', period: '', highlight: false, cta: 'Consultar',
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
