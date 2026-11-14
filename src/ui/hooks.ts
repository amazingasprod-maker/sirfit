import { useEffect, useRef, useState } from 'react';

// ---------- bouton retour ----------
// Un panneau ouvert ajoute une entrée dans l'historique : le bouton retour du
// téléphone le referme au lieu de quitter l'écran. Une pile garantit que seul
// le panneau du dessus réagit quand plusieurs sont empilés.

interface Entree {
  jeton: string;
  surRetour: () => void;
}

const pile: Entree[] = [];
/** entrées d'historique que l'app a ajoutées pour ses panneaux */
let profondeur = 0;
/** retours déclenchés par l'app elle-même, à ne pas interpréter */
let retoursInternes = 0;
let reconciliation = 0;
/** actions à lancer une fois l'historique des panneaux remis d'aplomb */
const ensuite: (() => void)[] = [];

function vider(): void {
  for (const f of ensuite.splice(0)) f();
}

if (typeof window !== 'undefined') {
  // Un seul écouteur : l'ordre de traitement ne dépend pas de l'ordre de montage des panneaux.
  window.addEventListener('popstate', () => {
    if (retoursInternes > 0) {
      retoursInternes -= 1;
      if (retoursInternes === 0) vider();
      return;
    }
    const haut = pile[pile.length - 1];
    if (!haut) return; // navigation ordinaire entre deux pages
    profondeur = Math.max(0, profondeur - 1);
    haut.surRetour();
  });
}

/**
 * Retire les entrées d'historique des panneaux fermés par un bouton de
 * l'interface. Différé d'un tour : si un panneau en remplace un autre dans le
 * même rendu, il réutilise l'entrée au lieu d'en empiler une seconde.
 */
function reconcilier(): void {
  reconciliation = 0;
  const trop = profondeur - pile.length;
  profondeur = Math.min(profondeur, pile.length);
  // rien à retirer, ou une vraie navigation est passée par-dessus : l'entrée courante n'est plus la nôtre
  if (trop <= 0 || !window.history.state?.panneau) {
    vider();
    return;
  }
  retoursInternes += 1;
  window.history.go(-trop);
}

/**
 * Vrai si l'entrée d'historique courante appartient à un panneau. Une navigation
 * lancée dans le geste même qui ferme le panneau doit alors la remplacer
 * (`replace`), sinon le bouton retour repasserait par une entrée vide.
 */
export function panneauOuvert(): boolean {
  return Boolean(window.history.state?.panneau);
}

/**
 * Lance `f` une fois le panneau en train de se fermer sorti de l'historique.
 * À utiliser pour quitter la page ou naviguer après une confirmation : sans
 * cela, le retour du panneau et celui de la page se doubleraient au hasard.
 */
export function apresPanneaux(f: () => void): void {
  ensuite.push(f);
  window.setTimeout(() => {
    // une fermeture est en route : `reconcilier` ou l'écouteur de retour videront la file
    if (reconciliation || retoursInternes > 0 || panneauOuvert()) return;
    vider();
  }, 0);
}

export function useBackClose(open: boolean, onClose: () => void): void {
  const fermer = useRef(onClose);
  fermer.current = onClose;

  useEffect(() => {
    if (!open) return;
    const jeton = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const entree: Entree = { jeton, surRetour: () => fermer.current() };
    const etat = { ...(window.history.state ?? {}), panneau: jeton };
    if (profondeur > pile.length) {
      window.history.replaceState(etat, '');
    } else {
      window.history.pushState(etat, '');
      profondeur += 1;
    }
    pile.push(entree);

    return () => {
      const i = pile.indexOf(entree);
      if (i >= 0) pile.splice(i, 1);
      if (!reconciliation) reconciliation = window.setTimeout(reconcilier, 0);
    };
  }, [open]);
}

// ---------- horloge ----------

/** Heure courante, rafraîchie tant que `actif` est vrai. */
export function useNow(actif: boolean, intervalleMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!actif) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalleMs);
    const surRetour = () => setNow(Date.now());
    document.addEventListener('visibilitychange', surRetour);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', surRetour);
    };
  }, [actif, intervalleMs]);
  return now;
}

// ---------- écran allumé ----------

/** Empêche l'écran de s'éteindre pendant la séance, là où le navigateur le permet. */
export function useWakeLock(actif: boolean): void {
  useEffect(() => {
    if (!actif || !('wakeLock' in navigator)) return;
    let verrou: WakeLockSentinel | null = null;
    let annule = false;

    const prendre = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const v = await navigator.wakeLock.request('screen');
        if (annule) void v.release();
        else verrou = v;
      } catch {
        // batterie faible ou refus du système : la séance continue sans verrou
      }
    };
    void prendre();
    document.addEventListener('visibilitychange', prendre);
    return () => {
      annule = true;
      document.removeEventListener('visibilitychange', prendre);
      void verrou?.release();
    };
  }, [actif]);
}

/** Bloque le défilement de la page sous un panneau ouvert. */
export function useScrollLock(actif: boolean): void {
  useEffect(() => {
    if (!actif) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = avant;
    };
  }, [actif]);
}
