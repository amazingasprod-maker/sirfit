import { useSyncExternalStore } from 'react';
import { db } from '../db/schema';
import type { Draft } from '../domain/types';

// La séance en cours vit en mémoire (mise à jour immédiate de l'écran) et est
// recopiée dans IndexedDB à chaque modification : l'app peut être fermée ou
// tuée en pleine séance sans rien perdre.

let courant: Draft | null = null;
let charge = false;
const abonnes = new Set<() => void>();

let ecritureEnCours = false;
let aReecrire = false;

async function ecrire(): Promise<void> {
  if (ecritureEnCours) {
    aReecrire = true;
    return;
  }
  ecritureEnCours = true;
  try {
    do {
      aReecrire = false;
      const instantane = courant;
      if (instantane) await db.draft.put(instantane);
      else await db.draft.delete('courant');
    } while (aReecrire);
  } catch (e) {
    console.error('Séance en cours non enregistrée', e);
  } finally {
    ecritureEnCours = false;
  }
}

function prevenir(): void {
  abonnes.forEach((f) => f());
}

export const draftStore = {
  get: (): Draft | null => courant,
  estCharge: (): boolean => charge,

  /** Relit la séance en cours depuis la base (démarrage, import d'une sauvegarde). */
  async charger(): Promise<void> {
    courant = (await db.draft.get('courant')) ?? null;
    charge = true;
    prevenir();
  },

  set(suivant: Draft | null): void {
    courant = suivant;
    prevenir();
    void ecrire();
  },

  update(f: (d: Draft) => Draft): void {
    if (courant) draftStore.set(f(courant));
  },

  subscribe(f: () => void): () => void {
    abonnes.add(f);
    return () => abonnes.delete(f);
  },
};

export function useDraft(): Draft | null {
  return useSyncExternalStore(draftStore.subscribe, draftStore.get);
}

export function useDraftCharge(): boolean {
  return useSyncExternalStore(draftStore.subscribe, draftStore.estCharge);
}
