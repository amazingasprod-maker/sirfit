import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { indexPrecedents } from '../domain/previous';
import { kindDepuis, type KindDe } from '../domain/stats';
import { SETTINGS_DEFAUT, type Exercise, type Routine, type SetEntry, type Settings, type Workout } from '../domain/types';

// Lectures réactives : l'écran se met à jour tout seul quand la base change.
// `undefined` = pas encore lu (quelques millisecondes au démarrage).

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(() => db.exercises.toArray(), []);
}

export interface Catalogue {
  liste: Exercise[];
  parId: Map<string, Exercise>;
  kindDe: KindDe;
  nomDe: (id: string) => string;
}

export function useCatalogue(): Catalogue | undefined {
  const liste = useExercises();
  return useMemo(() => {
    if (!liste) return undefined;
    const parId = new Map(liste.map((e) => [e.id, e]));
    return {
      liste,
      parId,
      kindDe: kindDepuis(liste),
      nomDe: (id: string) => parId.get(id)?.nom ?? 'Exercice supprimé',
    };
  }, [liste]);
}

/** Toutes les séances, de la plus récente à la plus ancienne. */
export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(() => db.workouts.orderBy('debut').reverse().toArray(), []);
}

export function useWorkout(id: string): Workout | null | undefined {
  return useLiveQuery(async () => (await db.workouts.get(id)) ?? null, [id]);
}

export function useRoutines(): Routine[] | undefined {
  return useLiveQuery(() => db.routines.orderBy('ordre').toArray(), []);
}

export function useSettings(): Settings {
  return useLiveQuery(async () => ({ ...SETTINGS_DEFAUT, ...((await db.settings.get('app')) ?? {}) }), []) ?? SETTINGS_DEFAUT;
}

/** Séries de la dernière fois, par exercice (colonne « PRÉCÉDENT »). */
export function usePrecedents(workouts: Workout[] | undefined, avant?: number): Map<string, SetEntry[]> {
  return useMemo(() => (workouts ? indexPrecedents(workouts, avant) : new Map()), [workouts, avant]);
}
