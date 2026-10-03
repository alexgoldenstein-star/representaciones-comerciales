import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon, copyText, useToast } from '../components/ui';
import { firebaseConfig } from '../firebase';

// Se muestra cuando alguien logueado entra a /admin sin ser administrador todavía.
export default function AdminSetup() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const base = `https://console.firebase.google.com/project/${firebaseConfig.projectId}`;
  return (
    <div className="authwrap">
      <div className="card authcard" style={{ width: 'min(720px,100%)' }}>
        <h1>Activar la administración</h1>
        <p className="muted">Estás ingresado como <b>{user.email}</b>, pero esta cuenta todavía no es administradora. Se activa una sola vez desde Firebase:</p>
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Tu código de usuario (UID)</span>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <code className="input" style={{ fontSize: 17, wordBreak: 'break-all', background: 'var(--surface-2)' }}>{user.uid}</code>
            <button className="btn" onClick={async () => toast(await copyText(user.uid) ? 'Código copiado' : 'No se pudo copiar: seleccionalo a mano')}><Icon n="copy" />Copiar</button>
          </div>
        </div>
        <ol style={{ margin: 0, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 18 }}>
          <li>Abrí <a href={`${base}/firestore/databases/-default-/data`} target="_blank" rel="noreferrer"><b>Firestore → Datos</b></a> en Firebase.</li>
          <li>Tocá <b>“+ Iniciar colección”</b>. En “ID de la colección” escribí <b>admins</b> y tocá Siguiente.</li>
          <li>En “ID del documento” <b>pegá el código de arriba</b> (no uses “ID automático”).</li>
          <li>Agregá un campo: nombre <b>email</b>, tipo <b>string</b>, valor <b>{user.email}</b>. Tocá <b>Guardar</b>.</li>
          <li>Volvé acá y tocá <b>“Ya lo hice”</b>.</li>
        </ol>
        <div className="row">
          <button className="btn primary" onClick={() => window.location.reload()}>Ya lo hice</button>
          <Link className="btn" to="/panel">Ir a mi panel de vendedor</Link>
          <button className="btn link" onClick={logout}>Salir</button>
        </div>
        <p className="muted small">Si después de hacerlo sigue apareciendo esta pantalla, revisá que el ID del documento sea exactamente el código de arriba y que las reglas de Firestore estén publicadas.</p>
      </div>
    </div>
  );
}
