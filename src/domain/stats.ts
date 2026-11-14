import type { Bloc, Exercise, ExerciseKind, Partie, Routine, SetEntry, Workout } from './types';

export type KindDe = (exerciseId: string) => ExerciseKind;

export function kindDepuis(exercises: Exercise[]): KindDe {
  const m = new Map(exercises.map((e) => [e.id, e.kind]));
  return (id) => m.get(id) ?? 'charge';
}

/** lundi 00:00 de la semaine qui contient `d` (repris de Sir_Fit) */
export function lundiDe(d: Date | number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

function ajouterJours(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Une série compte dans les statistiques si elle est faite et n'est pas un échauffement. */
export function compte(s: SetEntry): boolean {
  return s.done && s.type !== 'echauffement';
}

export function volumeSet(s: SetEntry, kind: ExerciseKind): number {
  if (!compte(s) || kind === 'duree') return 0;
  return (s.kg ?? 0) * (s.reps ?? 0);
}

export function volumeBloc(b: Bloc, kind: ExerciseKind): number {
  return b.sets.reduce((t, s) => t + volumeSet(s, kind), 0);
}

/** tonnage : somme des kg × reps des séries comptées */
export function volumeSeance(w: Pick<Workout, 'exercises'>, kindDe: KindDe): number {
  return w.exercises.reduce((t, b) => t + volumeBloc(b, kindDe(b.exerciseId)), 0);
}

export function repsSeance(w: Pick<Workout, 'exercises'>, kindDe: KindDe): number {
  let t = 0;
  for (const b of w.exercises) {
    if (kindDe(b.exerciseId) === 'duree') continue;
    for (const s of b.sets) if (compte(s)) t += s.reps ?? 0;
  }
  return t;
}

export function seriesSeance(w: Pick<Workout, 'exercises'>): number {
  return w.exercises.reduce((t, b) => t + b.sets.filter(compte).length, 0);
}

export function dureeMin(w: Pick<Workout, 'debut' | 'fin'>): number {
  return Math.max(0, Math.round((w.fin - w.debut) / 60000));
}

export interface SemaineAgg {
  debut: Date;
  seances: number;
  dureeMin: number;
  volume: number;
  reps: number;
}

/** Les `n` dernières semaines (lundi → dimanche), la plus ancienne en premier, la semaine en cours en dernier. */
export function semaines(workouts: Workout[], kindDe: KindDe, n = 12, ref: number = Date.now()): SemaineAgg[] {
  const lundiCourant = lundiDe(ref);
  const out: SemaineAgg[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push({ debut: ajouterJours(lundiCourant, -7 * i), seances: 0, dureeMin: 0, volume: 0, reps: 0 });
  }
  const index = new Map(out.map((s, i) => [s.debut.getTime(), i]));
  for (const w of workouts) {
    const i = index.get(lundiDe(w.debut).getTime());
    if (i === undefined) continue;
    const s = out[i];
    s.seances += 1;
    s.dureeMin += dureeMin(w);
    s.volume += volumeSeance(w, kindDe);
    s.reps += repsSeance(w, kindDe);
  }
  return out;
}

/**
 * Nombre de semaines d'affilée avec au moins une séance. La semaine en cours
 * compte si elle a déjà une séance ; sinon on part de la semaine dernière, pour
 * ne pas remettre le compteur à zéro chaque lundi matin.
 */
export function semainesDAffilee(workouts: Workout[], ref: number = Date.now()): number {
  const actives = new Set(workouts.map((w) => lundiDe(w.debut).getTime()));
  let curseur = lundiDe(ref);
  if (!actives.has(curseur.getTime())) curseur = ajouterJours(curseur, -7);
  let n = 0;
  while (actives.has(curseur.getTime())) {
    n += 1;
    curseur = ajouterJours(curseur, -7);
  }
  return n;
}

export function seancesDeLaSemaine(workouts: Workout[], ref: number = Date.now()): Workout[] {
  const l = lundiDe(ref).getTime();
  const fin = ajouterJours(lundiDe(ref), 7).getTime();
  return workouts.filter((w) => w.debut >= l && w.debut < fin);
}

export function compteSemaine(workouts: Workout[], partie: Partie, ref: number = Date.now()): number {
  return seancesDeLaSemaine(workouts, ref).filter((w) => w.partie === partie).length;
}

/** Dernière séance faite sur une partie du corps (les séances vides, sans partie, ne comptent pas). */
export function derniereSeance(workouts: Workout[], ref: number = Date.now()): Workout | null {
  return workouts
    .filter((w) => w.partie !== null && w.debut <= ref)
    .reduce<Workout | null>((m, w) => (m === null || w.debut > m.debut ? w : m), null);
}

/**
 * Quelle partie faire maintenant : l'inverse de la dernière séance (haut hier,
 * bas aujourd'hui), haut si rien n'a encore été fait. Règle de Lamine du 14/11 :
 * l'app décide, il n'a pas à réfléchir.
 */
export function suggestionPartie(workouts: Workout[], ref: number = Date.now()): Partie {
  const d = derniereSeance(workouts, ref);
  return d?.partie === 'haut' ? 'bas' : 'haut';
}

export interface SeanceDuJour {
  /** partie à faire (si `faite` : celle de la prochaine fois) */
  partie: Partie;
  /** routine à lancer, ou null s'il n'existe aucune routine non vide pour cette partie */
  routine: Routine | null;
  /** séance déjà faite aujourd'hui, s'il y en a une */
  faite: Workout | null;
}

const memeJour = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/**
 * La séance du jour, sans rien demander : la partie inverse de la dernière séance,
 * et parmi les routines de cette partie, celle faite il y a le plus longtemps
 * (à égalité, la première de la liste).
 */
export function seanceDuJour(workouts: Workout[], routines: Routine[], ref: number = Date.now()): SeanceDuJour {
  const d = derniereSeance(workouts, ref);
  const faite = d && memeJour(d.debut, ref) ? d : null;
  const partie = suggestionPartie(workouts, ref);
  const derniereFois = (r: Routine) =>
    workouts.reduce((m, w) => (w.routineId === r.id && w.debut <= ref ? Math.max(m, w.debut) : m), -Infinity);
  const routine =
    routines
      .filter((r) => r.partie === partie && r.exercises.length > 0)
      .sort((a, b) => derniereFois(a) - derniereFois(b) || a.ordre - b.ordre)[0] ?? null;
  return { partie, routine, faite };
}
