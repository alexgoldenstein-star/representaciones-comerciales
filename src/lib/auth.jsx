import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, isSuper: false, loading: true });
  useEffect(() => {
    let unsubProfile = () => {};
    const unsub = onAuthStateChanged(auth, async user => {
      unsubProfile();
      if (!user) { setState({ user: null, profile: null, isSuper: false, loading: false }); return; }
      let isSuper = false;
      try { isSuper = (await getDoc(doc(db, 'admins', user.uid))).exists(); } catch (e) { isSuper = false; }
      unsubProfile = onSnapshot(doc(db, 'users', user.uid),
        snap => setState({ user, profile: snap.exists() ? snap.data() : null, isSuper, loading: false }),
        () => setState({ user, profile: null, isSuper, loading: false }));
    });
    return () => { unsub(); unsubProfile(); };
  }, []);
  return <Ctx.Provider value={{ ...state, logout: () => signOut(auth) }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

// Traduce los errores de Firebase a mensajes claros.
export function authError(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'El email o la contraseña no coinciden. Revisalos y probá de nuevo.';
  if (c.includes('email-already-in-use')) return 'Ya existe una cuenta con ese email. Probá ingresar o recuperar la contraseña.';
  if (c.includes('weak-password')) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (c.includes('invalid-email')) return 'El email no parece válido. Revisalo.';
  if (c.includes('too-many-requests')) return 'Hubo muchos intentos seguidos. Esperá unos minutos y probá de nuevo.';
  if (c.includes('network')) return 'No hay conexión a internet. Revisala y probá de nuevo.';
  if (c.includes('permission-denied')) return 'No tenés permiso para hacer esto.';
  return 'Algo salió mal. Probá de nuevo en un momento.';
}
