import { useEffect } from 'react';
import { fmtChrono } from '../../domain/format';
import type { RestState } from '../../domain/types';
import { useSettings } from '../../state/data';
import { draftStore, useDraft } from '../../state/draft';
import { useNow } from '../../ui/hooks';
import { bip, vibrer } from '../../ui/signal';
import { toast } from '../../ui/toast';

/** Décale la fin du repos. En dessous de zéro, le repos s'arrête sans sonner. */
function ajuster(deltaS: number): void {
  draftStore.update((d) => {
    if (!d.repos) return d;
    const finAt = d.repos.finAt + deltaS * 1000;
    if (finAt <= Date.now()) return { ...d, repos: null };
    return { ...d, repos: { ...d.repos, finAt, totalS: Math.max(1, d.repos.totalS + deltaS) } };
  });
}

function passer(): void {
  draftStore.update((d) => ({ ...d, repos: null }));
}

/**
 * Surveille la fin du repos, où qu'on soit dans l'app. Le temps restant se
 * calcule à partir de l'heure de fin : il reste juste après une mise en veille.
 * Monté une seule fois, à la racine.
 */
export function RestWatcher() {
  const draft = useDraft();
  const { son, vibration } = useSettings();
  const finAt = draft?.repos?.finAt ?? null;

  useEffect(() => {
    if (finAt === null) return;
    let minuterie = 0;
    const finir = () => {
      const d = draftStore.get();
      if (!d?.repos || d.repos.finAt !== finAt) return;
      const manque = finAt - Date.now();
      if (manque > 0) {
        // un minuteur peut sonner quelques millisecondes trop tôt : on le réarme au lieu de rater la fin
        window.clearTimeout(minuterie);
        minuterie = window.setTimeout(finir, manque + 4);
        return;
      }
      // de retour bien après la fin (téléphone verrouillé) : on ne fait pas sursauter, on prévient
      if (-manque < 3000) {
        if (son) bip();
        if (vibration) vibrer();
      }
      toast('Repos terminé');
      draftStore.set({ ...d, repos: null });
    };
    minuterie = window.setTimeout(finir, Math.max(0, finAt - Date.now()));
    const surRetour = () => {
      if (document.visibilityState === 'visible') finir();
    };
    document.addEventListener('visibilitychange', surRetour);
    return () => {
      window.clearTimeout(minuterie);
      document.removeEventListener('visibilitychange', surRetour);
    };
  }, [finAt, son, vibration]);

  return null;
}

export function useRestant(repos: RestState | null): number {
  const now = useNow(repos !== null, 250);
  return repos ? Math.max(0, Math.ceil((repos.finAt - now) / 1000)) : 0;
}

/** Barre de repos de la séance en direct : décompte, plus ou moins 15 secondes, passer. */
export function RestBar({ repos, nom }: { repos: RestState; nom: string }) {
  const now = useNow(true, 200);
  const restantMs = Math.max(0, repos.finAt - now);
  const restant = Math.ceil(restantMs / 1000);
  const part = Math.min(1, Math.max(0, 1 - restantMs / (repos.totalS * 1000)));

  return (
    <div className="repos" role="timer" aria-label={`Repos : ${restant} secondes`}>
      <div className="repos__jauge" aria-hidden="true">
        <div className="repos__plein" style={{ transform: `scaleX(${part})` }} />
      </div>
      <div className="repos__ligne">
        <button type="button" className="btn btn--discret btn--sm" onClick={() => ajuster(-15)} aria-label="Retirer 15 secondes">
          -15 s
        </button>
        <div className="repos__centre">
          <span className="repos__temps">{fmtChrono(restant)}</span>
          <span className="repos__nom">{nom}</span>
        </div>
        <button type="button" className="btn btn--discret btn--sm" onClick={() => ajuster(15)} aria-label="Ajouter 15 secondes">
          +15 s
        </button>
        <button type="button" className="btn btn--soft btn--sm" onClick={passer}>
          Passer
        </button>
      </div>
    </div>
  );
}
