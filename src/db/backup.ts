import { SETTINGS_DEFAUT, type Exercise, type Routine, type Settings, type Workout } from '../domain/types';
import { db, type SportDB } from './schema';
import { exercicesDeBase, routinesDeBase } from './seed';

export const FORMAT = 'sir-fit';
export const VERSION_SAUVEGARDE = 1;

export interface Sauvegarde {
  format: typeof FORMAT;
  version: number;
  exporteLe: number;
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  settings: Settings;
}

export async function exporter(base: SportDB = db, now: number = Date.now()): Promise<Sauvegarde> {
  const [exercises, routines, workouts, settings] = await Promise.all([
    base.exercises.toArray(),
    base.routines.toArray(),
    base.workouts.toArray(),
    base.settings.get('app'),
  ]);
  return {
    format: FORMAT,
    version: VERSION_SAUVEGARDE,
    exporteLe: now,
    exercises,
    routines,
    workouts,
    settings: { ...SETTINGS_DEFAUT, ...(settings ?? {}) },
  };
}

export class SauvegardeInvalide extends Error {}

function estObjet(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function blocsValides(x: unknown): boolean {
  return (
    Array.isArray(x) &&
    x.every(
      (b) =>
        estObjet(b) &&
        typeof b.uid === 'string' &&
        typeof b.exerciseId === 'string' &&
        Array.isArray(b.sets) &&
        b.sets.every((s) => estObjet(s) && typeof s.type === 'string' && typeof s.done === 'boolean'),
    )
  );
}

/** Vérifie la forme d'un fichier avant d'écraser quoi que ce soit. */
export function valider(brut: unknown): Sauvegarde {
  if (!estObjet(brut) || brut.format !== FORMAT) {
    throw new SauvegardeInvalide("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  if (typeof brut.version !== 'number' || brut.version > VERSION_SAUVEGARDE) {
    throw new SauvegardeInvalide("Cette sauvegarde vient d'une version plus récente de l'application. Mets l'app à jour puis réessaie.");
  }
  const { exercises, routines, workouts } = brut;
  const exosOk =
    Array.isArray(exercises) && exercises.every((e) => estObjet(e) && typeof e.id === 'string' && typeof e.nom === 'string');
  const routinesOk =
    Array.isArray(routines) && routines.every((r) => estObjet(r) && typeof r.id === 'string' && blocsValides(r.exercises));
  const seancesOk =
    Array.isArray(workouts) &&
    workouts.every(
      (w) => estObjet(w) && typeof w.id === 'string' && typeof w.debut === 'number' && typeof w.fin === 'number' && blocsValides(w.exercises),
    );
  if (!exosOk || !routinesOk || !seancesOk) {
    throw new SauvegardeInvalide('Le fichier est abîmé ou incomplet : rien n\'a été modifié.');
  }
  return {
    format: FORMAT,
    version: brut.version,
    exporteLe: typeof brut.exporteLe === 'number' ? brut.exporteLe : 0,
    exercises: exercises as Exercise[],
    routines: routines as Routine[],
    workouts: workouts as Workout[],
    settings: { ...SETTINGS_DEFAUT, ...(estObjet(brut.settings) ? (brut.settings as Partial<Settings>) : {}), id: 'app' },
  };
}

/** Remplace tout le contenu par celui de la sauvegarde, en une seule transaction. */
export async function importer(brut: unknown, base: SportDB = db): Promise<Sauvegarde> {
  const s = valider(brut);
  await base.transaction('rw', [base.exercises, base.routines, base.workouts, base.settings, base.draft], async () => {
    await Promise.all([base.exercises.clear(), base.routines.clear(), base.workouts.clear(), base.settings.clear(), base.draft.clear()]);
    await base.exercises.bulkAdd(s.exercises);
    await base.routines.bulkAdd(s.routines);
    await base.workouts.bulkAdd(s.workouts);
    await base.settings.put(s.settings);
  });
  return s;
}

export function nomDeFichier(now: number = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `sir-fit-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/**
 * Efface séances, routines et exercices personnels, puis remet l'app dans son
 * état de départ. Fait dans une transaction plutôt qu'en supprimant la base :
 * les écrans ouverts se mettent à jour sans rechargement.
 */
export async function toutEffacer(base: SportDB = db, now: number = Date.now()): Promise<void> {
  await base.transaction('rw', [base.exercises, base.routines, base.workouts, base.settings, base.draft], async () => {
    await Promise.all([base.exercises.clear(), base.routines.clear(), base.workouts.clear(), base.settings.clear(), base.draft.clear()]);
    const routines = routinesDeBase(now);
    await base.exercises.bulkAdd(exercicesDeBase());
    await base.routines.bulkAdd(routines);
    await base.settings.put({ ...SETTINGS_DEFAUT, routinesProposees: routines.map((r) => r.id) });
  });
}
