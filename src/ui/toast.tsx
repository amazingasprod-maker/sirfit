import { useSyncExternalStore } from 'react';

interface Toast {
  id: number;
  texte: string;
  erreur: boolean;
}

let courant: Toast | null = null;
let minuterie = 0;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

export function toast(texte: string, erreur = false): void {
  window.clearTimeout(minuterie);
  courant = { id: Date.now(), texte, erreur };
  prevenir();
  minuterie = window.setTimeout(() => {
    courant = null;
    prevenir();
  }, erreur ? 5000 : 2600);
}

export function ToastHote() {
  const t = useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => courant,
  );
  return (
    <div className="toast-zone" aria-live="polite">
      {t && (
        <div key={t.id} className={`toast${t.erreur ? ' toast--erreur' : ''}`} role={t.erreur ? 'alert' : 'status'}>
          {t.texte}
        </div>
      )}
    </div>
  );
}
