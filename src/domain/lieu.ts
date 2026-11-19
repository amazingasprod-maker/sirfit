// Séance à la salle ou à la maison. À la maison, Lamine a des haltères, une
// barre et des disques : ni banc, ni barre de traction, ni rack, ni machine,
// ni poulie (réponse du 14/11/2026). Chaque exercice impossible chez lui est
// remplacé par un équivalent du même muscle, sans rien changer à la routine.
import type { KindDe } from './stats';
import type { Bloc, Exercise, ExerciseKind, Routine } from './types';

export type Lieu = 'salle' | 'maison';

/** Exercices de la bibliothèque faisables à la maison avec ce matériel. */
const FAISABLES = new Set([
  // Pectoraux
  'pom',
  // Dos
  'row', 'rowb', 'shrug',
  // Épaules
  'dm', 'dmb', 'arn', 'el', 'elf', 'ois',
  // Biceps
  'curl', 'curlb', 'curlez', 'curlm', 'curlc',
  // Triceps
  'ext', 'kick', 'dipsb',
  // Avant-bras
  'poig', 'farm',
  // Abdos
  'gai', 'gail', 'crunch', 'reljs', 'russ', 'mount',
  // Quadriceps
  'sq', 'sqf', 'sqpc', 'sqbul',
  // Ischios
  'sdt', 'sdtb', 'sdtc', 'gm',
  // Fessiers
  'fen', 'fens', 'pont', 'step',
  // Mollets
  'mol',
]);

/** Remplaçants à la maison, du plus proche au plus éloigné (même muscle). */
const REMPLACANTS: Record<string, string[]> = {
  // Pectoraux : sans banc, il reste les pompes
  dc: ['pom'], dcb: ['pom'], dci: ['pom'], dcib: ['pom'], dcd: ['pom'], dcm: ['pom'],
  ecar: ['pom'], pec: ['pom'], ecp: ['pom'], pull: ['pom'],
  ecpb: ['pom'], ecari: ['pom'], dcim: ['pom'], pecbas: ['dipsb', 'pom'],
  // Dos
  rowt: ['rowb', 'row'], rowm: ['row', 'rowb'], rowp: ['row', 'rowb'],
  tir: ['row', 'rowb'], tirs: ['rowb', 'row'], trac: ['row', 'rowb'], tracs: ['rowb', 'row'],
  pullp: ['row', 'rowb'], lomb: ['gm', 'sdtb'],
  // Épaules
  dmm: ['dm', 'dmb'], elp: ['el'], rdelt: ['ois'], face: ['ois'],
  // Biceps
  curli: ['curl', 'curlm'], curlpu: ['curlc', 'curl'], curlp: ['curlb', 'curl'],
  // Triceps
  extp: ['kick', 'ext'], extc: ['ext', 'kick'], bf: ['ext', 'kick'], dcs: ['dipsb', 'ext'], dips: ['dipsb', 'kick'],
  // Abdos
  roue: ['gai', 'mount'], relj: ['reljs', 'crunch'], crunchp: ['crunch', 'russ'],
  // Quadriceps
  sqb: ['sq', 'sqf'], hack: ['sq', 'sqbul', 'fens'], pre: ['sqbul', 'sq'], legext: ['sqbul', 'fen'],
  sqm: ['sq', 'sqf', 'sqbul'], pend: ['sqf', 'sqbul', 'fen'],
  // Ischios
  lc: ['sdt', 'sdtb'], lca: ['sdtb', 'sdt'],
  // Fessiers
  ht: ['pont'], abd: ['fens', 'pont'], kickf: ['pont', 'fens'],
  // Adducteurs : pas de machine, les fentes les sollicitent
  add: ['fen', 'sqbul'],
  // Mollets
  molm: ['mol'], mola: ['mol'], molp: ['mol'],
};

/** Exercices personnels : faisables à la maison selon leur matériel. */
const MATERIEL_MAISON = new Set(['Haltères', 'Barre', 'Poids du corps', 'Autre']);

export function faisableALaMaison(exo: Pick<Exercise, 'id' | 'materiel' | 'custom'>): boolean {
  return exo.custom ? MATERIEL_MAISON.has(exo.materiel) : FAISABLES.has(exo.id);
}

function repsPour(reps: number | null, de: ExerciseKind, vers: ExerciseKind): number | null {
  if (de === vers) return reps;
  if (vers === 'duree') return 40;
  if (de === 'duree') return 12;
  return reps;
}

export interface Adaptation {
  routine: Routine;
  /** exercice d'origine → remplaçant, ou null s'il a été retiré faute d'équivalent */
  changes: { de: string; vers: string | null }[];
}

/**
 * La routine telle qu'elle se fait au lieu choisi. À la salle, rien ne change.
 * À la maison, chaque exercice impossible prend la place d'un remplaçant pas
 * déjà dans la séance ; les charges sont vidées (la colonne « Précédent » donne
 * celles de la dernière fois), les séries et le repos sont gardés.
 */
export function adapterAuLieu(r: Routine, lieu: Lieu, exercices: Exercise[], kindDe: KindDe): Adaptation {
  if (lieu === 'salle') return { routine: r, changes: [] };
  const parId = new Map(exercices.map((e) => [e.id, e]));
  const presents = new Set(r.exercises.map((b) => b.exerciseId));
  const changes: Adaptation['changes'] = [];
  const exercises: Bloc[] = [];
  for (const b of r.exercises) {
    const exo = parId.get(b.exerciseId);
    if (!exo || faisableALaMaison(exo)) {
      exercises.push(b);
      continue;
    }
    const candidats = REMPLACANTS[b.exerciseId] ?? exercices.filter((e) => !e.custom && e.groupe === exo.groupe && FAISABLES.has(e.id)).map((e) => e.id);
    const vers = candidats.find((id) => !presents.has(id) && parId.has(id)) ?? null;
    changes.push({ de: b.exerciseId, vers });
    if (!vers) continue;
    presents.add(vers);
    const de = kindDe(b.exerciseId);
    const k = kindDe(vers);
    exercises.push({ ...b, exerciseId: vers, sets: b.sets.map((s) => ({ ...s, kg: null, reps: repsPour(s.reps, de, k) })) });
  }
  const routine: Routine = { ...r, titre: `${r.titre} (maison)`, exercises };
  if (r.finitions) routine.finitions = finitionsAuLieu(r.finitions, parId);
  return { routine, changes };
}

/**
 * Finitions à la maison : chacune prend son premier remplaçant faisable, même
 * s'il est déjà dans la séance (une finition se fait en plus), jamais en double.
 */
function finitionsAuLieu(ids: string[], parId: Map<string, Exercise>): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const exo = parId.get(id);
    const vers = !exo || faisableALaMaison(exo) ? id : (REMPLACANTS[id] ?? []).find((c) => parId.has(c));
    if (vers && !out.includes(vers)) out.push(vers);
  }
  return out;
}
