import type { SetEntry, Workout } from './types';

/**
 * Les séries faites la dernière fois que cet exercice a été travaillé
 * (colonne « PRÉCÉDENT »). Les échauffements sont gardés : ils s'alignent sur
 * les lignes d'échauffement de la séance en cours.
 */
export function seriesPrecedentes(workouts: Workout[], exerciseId: string, avant: number = Infinity): SetEntry[] | null {
  let meilleur: { debut: number; sets: SetEntry[] } | null = null;
  for (const w of workouts) {
    if (w.debut >= avant) continue;
    if (meilleur && w.debut <= meilleur.debut) continue;
    const faites: SetEntry[] = [];
    for (const b of w.exercises) {
      if (b.exerciseId !== exerciseId) continue;
      for (const s of b.sets) if (s.done) faites.push(s);
    }
    if (faites.length) meilleur = { debut: w.debut, sets: faites };
  }
  return meilleur ? meilleur.sets : null;
}

/** Index des séries précédentes pour tous les exercices, en un seul passage. */
export function indexPrecedents(workouts: Workout[], avant: number = Infinity): Map<string, SetEntry[]> {
  const tri = workouts.filter((w) => w.debut < avant).sort((a, b) => b.debut - a.debut);
  const out = new Map<string, SetEntry[]>();
  for (const w of tri) {
    const parExo = new Map<string, SetEntry[]>();
    for (const b of w.exercises) {
      if (out.has(b.exerciseId)) continue;
      const faites = b.sets.filter((s) => s.done);
      if (!faites.length) continue;
      parExo.set(b.exerciseId, [...(parExo.get(b.exerciseId) ?? []), ...faites]);
    }
    for (const [id, sets] of parExo) out.set(id, sets);
  }
  return out;
}
