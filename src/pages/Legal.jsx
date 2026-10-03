import { Link } from 'react-router-dom';
import { useCompany } from '../lib/siteConfig';
import PortalFooter from './PortalFooter';
import { BrandLine } from './Login';

export default function Legal({ kind }) {
  const { company } = useCompany();
  const title = kind === 'terminos' ? 'Términos y condiciones' : 'Política de privacidad';
  const text = kind === 'terminos' ? company.terms : company.privacy;
  return (
    <div style={{ background: 'var(--surface)', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid var(--line)' }}><div className="swrap" style={{ paddingBlock: 18 }}><BrandLine /></div></header>
      <main className="swrap" style={{ maxWidth: 820 }}>
        <Link to="/" className="btn sm" style={{ alignSelf: 'flex-start' }}>Volver al inicio</Link>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40 }}>{title}</h1>
        <div style={{ whiteSpace: 'pre-line', fontSize: 19, color: 'var(--ink-2)', lineHeight: 1.7 }}>{text}</div>
      </main>
      <PortalFooter />
    </div>
  );
}
