import Dexie, { type Table } from 'dexie';
import { SETTINGS_DEFAUT, type Draft, type Exercise, type Routine, type Settings, type Workout } from '../domain/types';
import { exercicesDeBase, routinesDeBase } from './seed';

export class SportDB extends Dexie {
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  workouts!: Table<Workout, string>;
  draft!: Table<Draft, string>;
  settings!: Table<Settings, string>;

  constructor(nom = 'sir-fit') {
    super(nom);
    this.version(1).stores({
      exercises: 'id, groupe',
      routines: 'id, ordre',
      workouts: 'id, debut',
      draft: 'id',
      settings: 'id',
    });
    // première ouverture : bibliothèque, routines de départ, réglages
    this.on('populate', (tx) => {
      const now = Date.now();
      tx.table('exercises').bulkAdd(exercicesDeBase());
      tx.table('routines').bulkAdd(routinesDeBase(now));
      tx.table('settings').add({ ...SETTINGS_DEFAUT });
    });
  }
}

export const db = new SportDB();

/**
 * Ajoute les exercices de base apparus dans une version plus récente de l'app,
 * et remet à jour leur pictogramme, sans rien toucher d'autre (ni aux exercices
 * personnels). Renvoie le nombre d'exercices ajoutés.
 */
export async function completerBibliotheque(base: SportDB = db): Promise<number> {
  const existants = new Map((await base.exercises.toArray()).map((e) => [e.id, e]));
  const reference = exercicesDeBase();
  const manquants = reference.filter((e) => !existants.has(e.id));
  const pictos = reference.flatMap((e) => {
    const x = existants.get(e.id);
    return x && !x.custom && x.visKey !== e.visKey ? [{ ...x, visKey: e.visKey }] : [];
  });
  if (manquants.length || pictos.length) {
    await base.transaction('rw', base.exercises, async () => {
      if (manquants.length) await base.exercises.bulkAdd(manquants);
      if (pictos.length) await base.exercises.bulkPut(pictos);
    });
  }
  return manquants.length;
}

export async function lireSettings(base: SportDB = db): Promise<Settings> {
  const s = await base.settings.get('app');
  return { ...SETTINGS_DEFAUT, ...(s ?? {}) };
}

export async function majSettings(patch: Partial<Settings>, base: SportDB = db): Promise<void> {
  const courant = await lireSettings(base);
  await base.settings.put({ ...courant, ...patch, id: 'app' });
}
