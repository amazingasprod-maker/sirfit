// Modèle de données. Tout ce qui est statistique se calcule à partir de `Workout` :
// rien de dérivé n'est stocké, pour pouvoir ajouter records, calendrier et stats
// par exercice sans migration.

export type Partie = 'haut' | 'bas';

export const GROUPES = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Biceps',
  'Triceps',
  'Avant-bras',
  'Abdos',
  'Quadriceps',
  'Ischios',
  'Fessiers',
  'Adducteurs',
  'Mollets',
] as const;
export type Groupe = (typeof GROUPES)[number];

export const MATERIELS = [
  'Haltères',
  'Barre',
  'Machine',
  'Poulie',
  'Poids du corps',
  'Autre',
] as const;
export type Materiel = (typeof MATERIELS)[number];

/** charge = kg × reps · corps = reps, lest facultatif · duree = secondes tenues */
export type ExerciseKind = 'charge' | 'corps' | 'duree';

export type SetType = 'normale' | 'echauffement' | 'degressive' | 'echec';

export interface Exercise {
  id: string;
  nom: string;
  groupe: Groupe;
  partie: Partie;
  materiel: Materiel;
  kind: ExerciseKind;
  /** clé du pictogramme animé (voir features/exercices/vis.ts) */
  visKey?: string;
  custom?: boolean;
}

export interface SetEntry {
  type: SetType;
  kg: number | null;
  /** répétitions, ou secondes pour un exercice de type « duree » */
  reps: number | null;
  /** toujours false dans une routine */
  done: boolean;
}

/** Un exercice posé dans une routine, une séance en cours ou une séance passée. */
export interface Bloc {
  uid: string;
  exerciseId: string;
  note: string;
  /** repos après une série, en secondes. 0 = pas de minuteur */
  reposS: number;
  supersetId: string | null;
  sets: SetEntry[];
}

export interface Routine {
  id: string;
  titre: string;
  note: string;
  /** sert à la séance adaptée au temps et à l'équilibre haut / bas */
  partie: Partie | null;
  ordre: number;
  exercises: Bloc[];
  /** exercices proposés en fin de séance, à prendre ou non (une série à l'échec chacun) */
  finitions?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Workout {
  id: string;
  titre: string;
  debut: number;
  fin: number;
  note: string;
  routineId: string | null;
  partie: Partie | null;
  exercises: Bloc[];
}

export interface WarmupItem {
  txt: string;
  fait: boolean;
}

export interface RestState {
  /** heure de fin (ms). Le temps restant se recalcule, il ne se décompte pas. */
  finAt: number;
  totalS: number;
  blocUid: string;
}

export interface Draft {
  id: 'courant';
  titre: string;
  debut: number;
  note: string;
  routineId: string | null;
  partie: Partie | null;
  mode: 'libre' | 'complet' | 'express';
  exercises: Bloc[];
  /** finitions de la routine pas encore ajoutées à la séance */
  finitions?: string[];
  echauffement: WarmupItem[] | null;
  repos: RestState | null;
}

export type ThemeChoice = 'sombre' | 'clair' | 'systeme';

export interface Settings {
  id: 'app';
  nom: string;
  reposDefautS: number;
  son: boolean;
  vibration: boolean;
  ecranAllume: boolean;
  theme: ThemeChoice;
  derniereSauvegarde: number | null;
  /** où se fait la séance : à la maison, les exercices impossibles sont remplacés (domain/lieu.ts) */
  lieu: 'salle' | 'maison';
  /** routines de départ déjà proposées : une routine supprimée ne revient pas (db/schema.ts) */
  routinesProposees: string[];
}

export const SETTINGS_DEFAUT: Settings = {
  id: 'app',
  nom: '',
  reposDefautS: 90,
  son: true,
  vibration: true,
  ecranAllume: true,
  theme: 'sombre',
  derniereSauvegarde: null,
  lieu: 'salle',
  routinesProposees: [],
};
