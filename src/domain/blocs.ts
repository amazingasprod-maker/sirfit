// Opérations pures sur les blocs d'exercices. Les trois éditeurs (routine,
// séance en cours, séance passée) passent par ici, ce qui les rend testables
// sans interface.

import { REPOS_SUPER, T_TRANSITION, type Plan, type PlanItem } from './adaptive';
import { echauffementPour } from './warmup';
import type { Bloc, Draft, Routine, SetEntry, SetType, Workout } from './types';

/** Identifiant court. `crypto.randomUUID` n'existe qu'en contexte sécurisé, d'où le repli. */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function setVide(type: SetType = 'normale'): SetEntry {
  return { type, kg: null, reps: null, done: false };
}

export function nouveauBloc(exerciseId: string, reposS: number, nbSeries = 3): Bloc {
  return {
    uid: uid(),
    exerciseId,
    note: '',
    reposS,
    supersetId: null,
    sets: Array.from({ length: nbSeries }, () => setVide()),
  };
}

function remplacer(blocs: Bloc[], blocUid: string, f: (b: Bloc) => Bloc): Bloc[] {
  return blocs.map((b) => (b.uid === blocUid ? f(b) : b));
}

/** Un super set n'existe qu'entre blocs voisins : un bloc isolé perd son étiquette. */
export function nettoyerSupersets(blocs: Bloc[]): Bloc[] {
  return blocs.map((b, i) => {
    if (!b.supersetId) return b;
    const voisin = blocs[i - 1]?.supersetId === b.supersetId || blocs[i + 1]?.supersetId === b.supersetId;
    return voisin ? b : { ...b, supersetId: null };
  });
}

export function ajouterExercices(blocs: Bloc[], exerciseIds: string[], reposS: number): Bloc[] {
  return [...blocs, ...exerciseIds.map((id) => nouveauBloc(id, reposS))];
}

export function retirerBloc(blocs: Bloc[], blocUid: string): Bloc[] {
  return nettoyerSupersets(blocs.filter((b) => b.uid !== blocUid));
}

export function deplacerBloc(blocs: Bloc[], blocUid: string, sens: -1 | 1): Bloc[] {
  const i = blocs.findIndex((b) => b.uid === blocUid);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= blocs.length) return blocs;
  const out = blocs.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return nettoyerSupersets(out);
}

/** Change l'exercice d'un bloc : la structure des séries reste, les charges repartent de zéro. */
export function remplacerExercice(blocs: Bloc[], blocUid: string, exerciseId: string): Bloc[] {
  return remplacer(blocs, blocUid, (b) => ({
    ...b,
    exerciseId,
    sets: b.sets.map((s) => ({ ...s, kg: null, done: false })),
  }));
}

export function majBloc(blocs: Bloc[], blocUid: string, patch: Partial<Pick<Bloc, 'note' | 'reposS'>>): Bloc[] {
  return remplacer(blocs, blocUid, (b) => ({ ...b, ...patch }));
}

/** Nouvelle série : reprend les valeurs de la dernière, pour n'avoir qu'à cocher. */
export function ajouterSerie(blocs: Bloc[], blocUid: string): Bloc[] {
  return remplacer(blocs, blocUid, (b) => {
    const der = b.sets[b.sets.length - 1];
    const nouvelle: SetEntry = der
      ? { type: der.type === 'echauffement' ? 'normale' : der.type, kg: der.kg, reps: der.reps, done: false }
      : setVide();
    return { ...b, sets: [...b.sets, nouvelle] };
  });
}

export function retirerSerie(blocs: Bloc[], blocUid: string, index: number): Bloc[] {
  return remplacer(blocs, blocUid, (b) => ({ ...b, sets: b.sets.filter((_, i) => i !== index) }));
}

export function majSerie(blocs: Bloc[], blocUid: string, index: number, patch: Partial<SetEntry>): Bloc[] {
  return remplacer(blocs, blocUid, (b) => ({
    ...b,
    sets: b.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)),
  }));
}

/** Lie le bloc au suivant en super set, ou le délie s'il y est déjà. */
export function basculerSuperset(blocs: Bloc[], blocUid: string): Bloc[] {
  const i = blocs.findIndex((b) => b.uid === blocUid);
  if (i < 0) return blocs;
  if (blocs[i].supersetId) {
    return nettoyerSupersets(remplacer(blocs, blocUid, (b) => ({ ...b, supersetId: null })));
  }
  const suivant = blocs[i + 1];
  if (!suivant) return blocs;
  const id = suivant.supersetId ?? uid();
  return blocs.map((b, k) => (k === i || k === i + 1 ? { ...b, supersetId: id } : b));
}

export interface ResultatCoche {
  blocs: Bloc[];
  /** false : il manque les répétitions, la série n'a pas pu être validée */
  ok: boolean;
  /** true si la série vient d'être validée (et non décochée) */
  validee: boolean;
}

/**
 * Coche ou décoche une série. Un champ laissé vide reprend la valeur de la
 * dernière fois : une série identique à la précédente se valide en un geste.
 */
export function cocherSerie(blocs: Bloc[], blocUid: string, index: number, precedent?: SetEntry): ResultatCoche {
  const bloc = blocs.find((b) => b.uid === blocUid);
  const serie = bloc?.sets[index];
  if (!serie) return { blocs, ok: false, validee: false };
  if (serie.done) {
    return { blocs: majSerie(blocs, blocUid, index, { done: false }), ok: true, validee: false };
  }
  const reps = serie.reps ?? precedent?.reps ?? null;
  if (reps === null || reps <= 0) return { blocs, ok: false, validee: false };
  const kg = serie.kg ?? precedent?.kg ?? null;
  return { blocs: majSerie(blocs, blocUid, index, { kg, reps, done: true }), ok: true, validee: true };
}

/** Numéro affiché de chaque série : les échauffements ne comptent pas dans la numérotation. */
export function numeros(sets: SetEntry[]): (number | null)[] {
  let n = 0;
  return sets.map((s) => (s.type === 'echauffement' ? null : ++n));
}

// ---------- séance en cours ----------

export function titreParDefaut(ts: number): string {
  const h = new Date(ts).getHours();
  if (h < 12) return 'Séance du matin';
  if (h < 18) return "Séance de l'après-midi";
  return 'Séance du soir';
}

function copieBloc(b: Bloc, garderSeries = b.sets.length): Bloc {
  return {
    ...b,
    uid: uid(),
    sets: b.sets.slice(0, garderSeries).map((s) => ({ ...s, done: false })),
  };
}

export function draftVide(now: number): Draft {
  return {
    id: 'courant',
    titre: titreParDefaut(now),
    debut: now,
    note: '',
    routineId: null,
    partie: null,
    mode: 'libre',
    exercises: [],
    echauffement: null,
    repos: null,
  };
}

export function draftDepuisRoutine(r: Routine, now: number): Draft {
  return {
    id: 'courant',
    titre: r.titre,
    debut: now,
    note: '',
    routineId: r.id,
    partie: r.partie,
    mode: 'libre',
    exercises: nettoyerSupersets(r.exercises.map((b) => copieBloc(b))),
    finitions: [...(r.finitions ?? [])],
    echauffement: echauffementPour(r.partie),
    repos: null,
  };
}

/** Repos après une finition : le temps de passer à la suivante. */
export const REPOS_FINITION = 30;

/**
 * Ajoute à la séance une finition proposée par la routine : une série à
 * l'échec, que Lamine prend ou non en fin de séance. Elle sort de la liste.
 */
export function ajouterFinition(d: Draft, exerciseId: string): Draft {
  if (!d.finitions?.includes(exerciseId)) return d;
  const bloc = { ...nouveauBloc(exerciseId, REPOS_FINITION, 0), sets: [setVide('echec')] };
  return { ...d, exercises: [...d.exercises, bloc], finitions: d.finitions.filter((id) => id !== exerciseId) };
}

/** Les items de la routine que l'algorithme adaptatif sait raccourcir. */
export function itemsDuPlan(r: Routine): PlanItem[] {
  return r.exercises.map((b) => ({ uid: b.uid, series: b.sets.length, repos: b.reposS }));
}

export function draftDepuisPlan(r: Routine, plan: Plan, now: number): Draft {
  const parUid = new Map(r.exercises.map((b) => [b.uid, b]));
  const exercises: Bloc[] = [];
  for (const pb of plan.blocs) {
    const superId = pb.type === 'super' ? uid() : null;
    pb.exos.forEach((it, k) => {
      const source = parUid.get(it.uid);
      if (!source) return;
      const copie = copieBloc(source, it.series);
      if (plan.mode === 'complet') {
        // rien n'est raccourci : la routine est jouée telle quelle, super sets compris
        exercises.push(copie);
        return;
      }
      // dans un super set : transition courte après le premier exercice, vrai repos après le dernier
      const reposS = superId ? (k < pb.exos.length - 1 ? T_TRANSITION : REPOS_SUPER) : it.repos;
      exercises.push({ ...copie, supersetId: superId, reposS });
    });
  }
  return {
    id: 'courant',
    titre: `${r.titre} · ${plan.minutes} min`,
    debut: now,
    note: '',
    routineId: r.id,
    partie: r.partie,
    mode: plan.mode,
    exercises: nettoyerSupersets(exercises),
    finitions: [...(r.finitions ?? [])],
    echauffement: echauffementPour(r.partie),
    repos: null,
  };
}

/** Clôt la séance : seules les séries cochées sont gardées. `null` si aucune n'a été validée. */
export function terminer(d: Draft, fin: number, titre: string, note: string): Workout | null {
  const exercises = nettoyerSupersets(
    d.exercises.map((b) => ({ ...b, sets: b.sets.filter((s) => s.done) })).filter((b) => b.sets.length > 0),
  );
  if (!exercises.length) return null;
  return {
    id: uid(),
    titre: titre.trim() || titreParDefaut(d.debut),
    debut: d.debut,
    fin: Math.max(fin, d.debut),
    note: note.trim(),
    routineId: d.routineId,
    partie: d.partie,
    exercises,
  };
}

/**
 * Reporte les charges et répétitions d'une séance dans sa routine. La structure
 * de la routine est préservée : seules les séries réellement faites changent, et
 * une série faite en plus est ajoutée. Un exercice sauté ce jour-là reste tel quel.
 */
export function reporterDansRoutine(r: Routine, w: Workout, now: number): Routine {
  const utilises = new Set<string>();
  const exercises = r.exercises.map((rb) => {
    const wb = w.exercises.find((b) => b.exerciseId === rb.exerciseId && !utilises.has(b.uid));
    if (!wb) return rb;
    utilises.add(wb.uid);
    const sets = rb.sets.slice();
    wb.sets.forEach((s, i) => {
      sets[i] = { type: s.type, kg: s.kg, reps: s.reps, done: false };
    });
    return { ...rb, sets };
  });
  return { ...r, exercises, updatedAt: now };
}

export function routineDepuisSeance(w: Workout, ordre: number, now: number): Routine {
  return {
    id: uid(),
    titre: w.titre,
    note: '',
    partie: w.partie,
    ordre,
    exercises: nettoyerSupersets(w.exercises.map((b) => copieBloc(b))),
    createdAt: now,
    updatedAt: now,
  };
}

export function dupliquerRoutine(r: Routine, ordre: number, now: number): Routine {
  return {
    ...r,
    id: uid(),
    titre: `${r.titre} (copie)`,
    ordre,
    exercises: r.exercises.map((b) => ({ ...b, uid: uid(), sets: b.sets.map((s) => ({ ...s })) })),
    createdAt: now,
    updatedAt: now,
  };
}
