import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

// Escucha una colección en vivo. `path` puede ser null para no escuchar nada.
export function useCol(path, constraints = [], key = '') {
  const [state, setState] = useState({ data: [], loading: !!path, error: null });
  useEffect(() => {
    if (!path) { setState({ data: [], loading: false, error: null }); return; }
    setState(s => ({ ...s, loading: true }));
    const q = query(collection(db, path), ...constraints);
    return onSnapshot(q,
      snap => setState({ data: snap.docs.map(d => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      error => { console.error(path, error); setState({ data: [], loading: false, error }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return state;
}

export function useDocData(path) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: null }); return; }
    setState(s => ({ ...s, loading: true }));
    return onSnapshot(doc(db, path),
      snap => setState({ data: snap.exists() ? { id: snap.id, ...snap.data() } : null, loading: false, error: null }),
      error => { console.error(path, error); setState({ data: null, loading: false, error }); });
  }, [path]);
  return state;
}
