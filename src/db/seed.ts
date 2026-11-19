import type { Bloc, Exercise, Groupe, Materiel, ExerciseKind, Partie, Routine } from '../domain/types';

const PARTIE_DU_GROUPE: Record<Groupe, Partie> = {
  Pectoraux: 'haut',
  Dos: 'haut',
  Épaules: 'haut',
  Biceps: 'haut',
  Triceps: 'haut',
  'Avant-bras': 'haut',
  // les abdos suivent la séance du bas, comme dans Sir_Fit (le gainage clôt le programme bas)
  Abdos: 'bas',
  Quadriceps: 'bas',
  Ischios: 'bas',
  Fessiers: 'bas',
  Adducteurs: 'bas',
  Mollets: 'bas',
};

export function partieDuGroupe(g: Groupe): Partie {
  return PARTIE_DU_GROUPE[g];
}

type Ligne = [id: string, nom: string, materiel: Materiel, kind?: ExerciseKind, visKey?: string];

const H: Materiel = 'Haltères';
const B: Materiel = 'Barre';
const M: Materiel = 'Machine';
const P: Materiel = 'Poulie';
const C: Materiel = 'Poids du corps';

// Chaque exercice porte la clé de son pictogramme (features/exercices/vis.ts).
// Les variantes d'un même geste (barre, haltères, machine) partagent le dessin.
const BIBLIOTHEQUE: Record<Groupe, Ligne[]> = {
  Pectoraux: [
    ['dc', 'Développé couché haltères', H, 'charge', 'dc'],
    ['dcb', 'Développé couché barre', B, 'charge', 'dc'],
    ['dci', 'Développé incliné haltères', H, 'charge', 'dc'],
    ['dcib', 'Développé incliné barre', B, 'charge', 'dc'],
    ['dcd', 'Développé décliné barre', B, 'charge', 'dc'],
    ['dcm', 'Développé couché machine', M, 'charge', 'dc'],
    ['ecar', 'Écarté couché haltères', H, 'charge', 'ecar'],
    ['pec', 'Pec deck', M, 'charge', 'pec'],
    ['ecp', 'Écarté à la poulie vis-à-vis', P, 'charge', 'ecp'],
    ['pom', 'Pompes', C, 'corps', 'pom'],
    ['pull', 'Pull-over haltère', H, 'charge', 'pull'],
    // ajoutés le 19/11/2026 pour la routine « Pectoraux 30 min »
    ['ecpb', 'Écarté poulie basse', P, 'charge', 'ecp'],
    ['ecari', 'Écarté incliné haltères', H, 'charge', 'ecar'],
    ['dcim', 'Développé incliné machine', M, 'charge', 'dc'],
    ['pecbas', 'Machine bas des pecs', M, 'charge', 'dips'],
  ],
  Dos: [
    ['row', 'Rowing haltère', H, 'charge', 'row'],
    ['rowb', 'Rowing barre', B, 'charge', 'rowb'],
    ['rowt', 'Rowing barre en T', B, 'charge', 'rowb'],
    ['rowm', 'Rowing assis machine', M, 'charge', 'rows'],
    ['rowp', 'Tirage horizontal poulie basse', P, 'charge', 'rows'],
    ['tir', 'Tirage vertical', P, 'charge', 'tir'],
    ['tirs', 'Tirage vertical prise serrée', P, 'charge', 'tir'],
    ['trac', 'Tractions', C, 'corps', 'trac'],
    ['tracs', 'Tractions supination', C, 'corps', 'trac'],
    ['pullp', 'Pull-over poulie haute', P, 'charge', 'pullp'],
    ['lomb', 'Extensions lombaires', C, 'corps', 'lomb'],
    ['shrug', 'Shrugs haltères', H, 'charge', 'shrug'],
  ],
  Épaules: [
    ['dm', 'Développé militaire', H, 'charge', 'dm'],
    ['dmb', 'Développé militaire barre', B, 'charge', 'dm'],
    ['arn', 'Développé Arnold', H, 'charge', 'dm'],
    ['dmm', 'Développé épaules machine', M, 'charge', 'dm'],
    ['el', 'Élévations latérales', H, 'charge', 'el'],
    ['elp', 'Élévations latérales poulie', P, 'charge', 'el'],
    ['elf', 'Élévations frontales', H, 'charge', 'elf'],
    ['ois', 'Oiseau haltères', H, 'charge', 'ois'],
    ['rdelt', 'Pec deck inversé', M, 'charge', 'ois'],
    ['face', 'Face pull', P, 'charge', 'face'],
  ],
  Biceps: [
    ['curl', 'Curl biceps', H, 'charge', 'curl'],
    ['curlb', 'Curl barre', B, 'charge', 'curl'],
    ['curlez', 'Curl barre EZ', B, 'charge', 'curl'],
    ['curlm', 'Curl marteau', H, 'charge', 'curl'],
    ['curlp', 'Curl poulie basse', P, 'charge', 'curl'],
    ['curli', 'Curl incliné haltères', H, 'charge', 'curl'],
    ['curlpu', 'Curl pupitre', M, 'charge', 'curl'],
    ['curlc', 'Curl concentré', H, 'charge', 'curlc'],
  ],
  Triceps: [
    ['ext', 'Extensions triceps', H, 'charge', 'ext'],
    ['extp', 'Extension triceps poulie haute', P, 'charge', 'push'],
    ['extc', 'Extension triceps à la corde', P, 'charge', 'push'],
    ['bf', 'Barre au front', B, 'charge', 'bf'],
    ['dcs', 'Développé couché prise serrée', B, 'charge', 'dc'],
    ['kick', 'Kickback triceps', H, 'charge', 'kick'],
    ['dips', 'Dips', C, 'corps', 'dips'],
    ['dipsb', 'Dips sur banc', C, 'corps', 'dips'],
  ],
  'Avant-bras': [
    ['poig', 'Flexion des poignets', H, 'charge', 'poig'],
    ['farm', 'Marche du fermier', H, 'duree', 'farm'],
  ],
  Abdos: [
    ['gai', 'Gainage planche', C, 'duree', 'gai'],
    ['gail', 'Gainage latéral', C, 'duree', 'gail'],
    ['crunch', 'Crunch', C, 'corps', 'crunch'],
    ['crunchp', 'Crunch à la poulie', P, 'charge', 'crunchp'],
    ['relj', 'Relevé de jambes suspendu', C, 'corps', 'relj'],
    ['reljs', 'Relevé de jambes au sol', C, 'corps', 'reljs'],
    ['russ', 'Rotation russe', C, 'corps', 'russ'],
    ['roue', 'Roulette abdominale', C, 'corps', 'roue'],
    ['mount', 'Mountain climbers', C, 'duree', 'mount'],
  ],
  Quadriceps: [
    ['sq', 'Squat gobelet', H, 'charge', 'sq'],
    ['sqb', 'Squat barre', B, 'charge', 'sqb'],
    ['sqf', 'Squat avant', B, 'charge', 'sq'],
    ['sqpc', 'Squat au poids du corps', C, 'corps', 'sqpc'],
    ['hack', 'Hack squat', M, 'charge', 'sqb'],
    ['pre', 'Presse à cuisses', M, 'charge', 'pre'],
    ['legext', 'Leg extension', M, 'charge', 'legext'],
    ['sqbul', 'Squat bulgare', H, 'charge', 'sqbul'],
    // ajoutés le 19/11/2026 pour la routine « Jambes 20 min »
    ['sqm', 'Squat machine', M, 'charge', 'sqb'],
    ['pend', 'Pendule squat', M, 'charge', 'sqb'],
  ],
  Ischios: [
    ['lc', 'Leg curl', M, 'charge', 'lc'],
    ['lca', 'Leg curl assis', M, 'charge', 'lca'],
    ['sdt', 'Soulevé de terre roumain', H, 'charge', 'sdt'],
    ['sdtb', 'Soulevé de terre roumain barre', B, 'charge', 'sdtb'],
    ['sdtc', 'Soulevé de terre', B, 'charge', 'sdtc'],
    ['gm', 'Good morning', B, 'charge', 'gm'],
  ],
  Fessiers: [
    ['fen', 'Fentes marchées', H, 'charge', 'fen'],
    ['fens', 'Fentes arrière', H, 'charge', 'fen'],
    ['ht', 'Hip thrust', B, 'charge', 'ht'],
    ['pont', 'Pont fessier', C, 'corps', 'ht'],
    ['abd', 'Abduction de hanche machine', M, 'charge', 'abd'],
    ['kickf', 'Kickback fessier à la poulie', P, 'charge', 'kickf'],
    ['step', 'Step-up', H, 'charge', 'step'],
  ],
  Adducteurs: [['add', 'Adduction de hanche machine', M, 'charge', 'add']],
  Mollets: [
    ['mol', 'Extensions mollets', H, 'charge', 'mol'],
    ['molm', 'Mollets debout machine', M, 'charge', 'mol'],
    ['mola', 'Mollets assis machine', M, 'charge', 'mola'],
    ['molp', 'Mollets à la presse', M, 'charge', 'pre'],
  ],
};

export function exercicesDeBase(): Exercise[] {
  const out: Exercise[] = [];
  for (const groupe of Object.keys(BIBLIOTHEQUE) as Groupe[]) {
    for (const [id, nom, materiel, kind, visKey] of BIBLIOTHEQUE[groupe]) {
      out.push({ id, nom, groupe, partie: PARTIE_DU_GROUPE[groupe], materiel, kind: kind ?? 'charge', visKey });
    }
  }
  return out;
}

type Item = [exId: string, series: number, reps: number, repos: number];

function blocsDepuis(prefixe: string, items: Item[]): Bloc[] {
  return items.map(([exerciseId, series, reps, reposS], i) => ({
    uid: `${prefixe}-${i}`,
    exerciseId,
    note: '',
    reposS,
    supersetId: null,
    sets: Array.from({ length: series }, () => ({ type: 'normale' as const, kg: null, reps, done: false })),
  }));
}

type ItemNote = [exId: string, series: number, reps: number, repos: number, note: string];

/** Blocs liés en un seul super set (giant set au-delà de deux exercices). */
function superset(prefixe: string, items: ItemNote[]): Bloc[] {
  return items.map(([exerciseId, series, reps, reposS, note], i) => ({
    uid: `${prefixe}-${i}`,
    exerciseId,
    note,
    reposS,
    supersetId: items.length > 1 ? prefixe : null,
    sets: Array.from({ length: series }, () => ({ type: 'normale' as const, kg: null, reps, done: false })),
  }));
}

/**
 * Séance pectoraux d'Essan (vidéo « Comment exploser les pectoraux en 30
 * minutes », demandée par Lamine le 19/11/2026). Trois parties : giant set
 * 20/15/10, un exercice lourd, super set pour finir. Le repos est porté par
 * chaque exercice : 30 s entre les exercices d'un tour, 3 min après le dernier.
 * Notes de 40 caractères au plus : le champ tient sur une ligne en 390 px.
 */
function routinePecs(now: number, ordre: number): Routine {
  return {
    id: 'routine-pecs',
    titre: 'Pectoraux 30 min',
    note: '',
    partie: 'haut',
    ordre,
    exercises: [
      ...superset('pecs-a', [
        ['ecpb', 2, 20, 30, 'Tension avant la 1re rep, 1 s serré'],
        ['dcm', 2, 15, 30, 'Repos tenu : baisse plutôt la charge'],
        ['ecari', 2, 10, 180, 'Fin du tour : 3 min, puis 2e tour'],
      ]),
      ...superset('pecs-b', [['dcim', 2, 10, 180, 'Lourd. Descente lente, montée vive']]),
      ...superset('pecs-c', [
        ['ecp', 2, 10, 30, 'Poulies prises : pec deck'],
        ['pecbas', 2, 10, 180, '1 s en bas. Sinon : dips penché'],
      ]),
    ],
    finitions: ['dips', 'pom'],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Séance jambes d'Essan (vidéo « Séance jambes 20 min ultra efficace »,
 * demandée par Lamine le 19/11/2026). Giant set 20/15/10 fait deux fois, puis
 * pendule squat et hack squat, une série chacun. Mollets : au choix en fin de
 * séance (lui les fait ce jour là ou un autre).
 */
function routineJambes(now: number, ordre: number): Routine {
  return {
    id: 'routine-jambes',
    titre: 'Jambes 20 min',
    note: '',
    partie: 'bas',
    ordre,
    exercises: [
      ...superset('jambes-a', [
        ['legext', 2, 20, 30, '2e tour : ne baisse pas les charges'],
        ['pre', 2, 15, 30, 'Amplitude complète, gainé'],
        ['sqm', 2, 10, 180, 'Fin du tour : 3 min. Sinon : squat'],
      ]),
      ...superset('jambes-b', [['pend', 1, 10, 180, 'Explosif en montée. Sinon : squat']]),
      ...superset('jambes-c', [['hack', 1, 10, 0, 'Puis 10 s de pause et 5 reps de plus']]),
    ],
    finitions: ['molm'],
    createdAt: now,
    updatedAt: now,
  };
}

/** Routines ajoutées après la première version : proposées une fois aux installations existantes. */
export const ROUTINES_NOUVELLES = ['routine-pecs', 'routine-jambes'];

/** Les deux programmes de Sir_Fit, devenus les routines de départ, puis les séances pectoraux et jambes. */
export function routinesDeBase(now: number): Routine[] {
  return [
    {
      id: 'routine-haut',
      titre: 'Haut du corps',
      note: '',
      partie: 'haut',
      ordre: 0,
      exercises: blocsDepuis('haut', [
        ['dc', 4, 8, 90],
        ['row', 4, 10, 90],
        ['dm', 3, 10, 75],
        ['tir', 3, 10, 75],
        ['curl', 3, 12, 60],
        ['ext', 3, 12, 60],
      ]),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'routine-bas',
      titre: 'Bas du corps',
      note: '',
      partie: 'bas',
      ordre: 1,
      exercises: blocsDepuis('bas', [
        ['sq', 4, 8, 90],
        ['lc', 3, 12, 75],
        ['sdt', 4, 10, 90],
        ['mol', 4, 15, 45],
        ['fen', 3, 10, 75],
        ['gai', 3, 45, 45],
      ]),
      createdAt: now,
      updatedAt: now,
    },
    routinePecs(now, 2),
    routineJambes(now, 3),
  ];
}
