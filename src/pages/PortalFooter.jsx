import Footer from '../components/Footer';
import { LogoMark } from '../components/Logo';
import { useCompany } from '../lib/siteConfig';

export default function PortalFooter() {
  const { company } = useCompany();
  return (
    <Footer color="#1F4FD8" mark={<LogoMark size={46} />} d={{ ...company, name: company.name, logoUrl: null }}
      links={[{ label: 'Cómo funciona', href: '/#como' }, { label: 'Precios', href: '/#precios' }, { label: 'Preguntas frecuentes', href: '/#preguntas' }, { label: 'Ingresar', to: '/ingresar' }, { label: 'Crear cuenta', to: '/registro' }]}
      bottom={<span><a href="/terminos">Términos y condiciones</a> · <a href="/privacidad">Política de privacidad</a></span>} />
  );
}
