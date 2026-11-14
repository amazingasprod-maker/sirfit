// Pictogrammes d'exécution, dessinés pour Sir Fit (aucune image reprise d'une
// autre application). Chaque geste = deux poses (A départ, B arrivée) construites
// à partir d'un squelette, puis interpolées pour l'animation de la fiche.
//
// Repère : viewBox 0 0 120 100, sol à y = 88.
// Angles en degrés, dans le sens de l'écran : 0 = vers la droite, 90 = vers le
// bas, -90 = vers le haut, 180 = vers la gauche. Le personnage regarde à droite.
// Planche de contrôle de tous les dessins : `npm run dev`, puis /planche.html.

export type Pt = [number, number];

/** Ce qu'un élément dessine : un trait (polyligne) ou un disque. */
export type Trait = 'buste' | 'membre' | 'tete' | 'cible' | 'charge' | 'barre' | 'cable';

/** Décor fixe : rectangle, trait fin, trait épais, poulie. */
export type Decor =
  | ['r', number, number, number, number, number]
  | ['l', number, number, number, number]
  | ['L', number, number, number, number, number]
  | ['c', number, number, number];

/** Flèche de trajectoire : [x1, y1, x2, y2] */
export type Fleche = [number, number, number, number];

/** Une pose = les points de chaque élément, dans l'ordre de dessin. */
export type Pose = number[][];

export interface Visuel {
  conseils: string[];
  traits: Trait[];
  /** épaisseur du trait, ou rayon du disque, pour chaque élément */
  tailles: number[];
  A: Pose;
  B: Pose;
  decor?: Decor[];
  F?: Fleche[];
  statique?: boolean;
  /** pose montrée dans les vignettes (B par défaut) */
  vignette?: 'A' | 'B';
}

/** Épaisseurs, en unités du repère. */
export const EP = { buste: 11, busteFace: 13, membre: 7, tete: 6.2, halo: 1.8, barre: 3.2, cable: 1.3 };

const L = { buste: 20, cou: 8.5, bras: 12, avant: 11.5, main: 4, cuisse: 15.5, tibia: 15, pied: 6.5 };

/* ------------------------------------------------------------------ squelette */

export type Muscle =
  | 'pecs'
  | 'abdos'
  | 'dos'
  | 'lombaires'
  | 'trapezes'
  | 'deltoides'
  | 'biceps'
  | 'triceps'
  | 'avantbras'
  | 'quadriceps'
  | 'ischios'
  | 'fessiers'
  | 'adducteurs'
  | 'mollets';

type Segment = 'buste' | 'bras' | 'avant' | 'cuisse' | 'tibia';

/** Zone colorée de chaque muscle : segment, début et fin (0 à 1), côté (1 avant, -1 arrière, 0 centre). */
const ZONES: Record<Muscle, [Segment, number, number, -1 | 0 | 1]> = {
  pecs: ['buste', 0.5, 0.95, 1],
  abdos: ['buste', 0.08, 0.55, 1],
  dos: ['buste', 0.3, 0.95, -1],
  lombaires: ['buste', 0, 0.42, -1],
  trapezes: ['buste', 0.78, 1.05, -1],
  deltoides: ['bras', 0, 0.45, 0],
  biceps: ['bras', 0.2, 0.92, 1],
  triceps: ['bras', 0.2, 0.92, -1],
  avantbras: ['avant', 0.1, 0.85, 0],
  quadriceps: ['cuisse', 0.12, 0.9, 1],
  ischios: ['cuisse', 0.15, 0.9, -1],
  fessiers: ['cuisse', -0.12, 0.38, -1],
  adducteurs: ['cuisse', 0.1, 0.75, 0],
  mollets: ['tibia', 0.08, 0.6, -1],
};

/**
 * Un membre : angles absolus des segments [haut, bas, extrémité], ou un point à
 * atteindre (`vers`), le coude ou le genou pliant du côté `pli`, ou des angles
 * avec le segment du haut vu en raccourci (`k` : part de sa longueur).
 */
export type Membre = number[] | { vers: Pt; pli?: 1 | -1; fin?: number } | { a: number[]; k: number };

interface Elt {
  k: Trait;
  p: number[];
  t: number;
}

interface Joints {
  hanche: Pt;
  epaule: Pt;
  tete: Pt;
  /** chaque bras : épaule, coude, poignet (, main) */
  bras: Pt[][];
  /** chaque jambe : hanche, genou, cheville (, pointe) */
  jambes: Pt[][];
}

interface Corps {
  /** vue de face au lieu de profil */
  face?: boolean;
  /** hanche, ou épaule (la hanche s'en déduit) */
  h?: Pt;
  e?: Pt;
  /** angle du buste, de la hanche vers l'épaule (profil) */
  t?: number;
  /** angle du cou, de l'épaule vers la tête (défaut : celui du buste) */
  c?: number;
  /** côté de la poitrine (profil) : 1 ou -1 */
  f?: 1 | -1;
  /** longueur du buste (vue de face, buste vu en raccourci) */
  buste?: number;
  /** épaules haussées (vue de face) */
  hausse?: number;
  /** du plus loin au plus près ; de face : gauche puis droite */
  bras?: Membre[];
  jambes?: Membre[];
  /** rayon de la charge tenue par chaque bras (0 : rien) */
  ch?: number[];
  /** tous les bras passent derrière le buste et la tête (profil) */
  derriere?: boolean;
  /** éléments dessinés sous le corps, ou par-dessus */
  sous?: (j: Joints) => Elt[];
  plus?: (j: Joints) => Elt[];
}

const rad = (d: number) => (d * Math.PI) / 180;
const vers = (p: Pt, a: number, l: number): Pt => [p[0] + Math.cos(rad(a)) * l, p[1] + Math.sin(rad(a)) * l];
const angle = (a: Pt, b: Pt) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
const bout = (ch: Pt[]): Pt => ch[ch.length - 1];

/** Point décalé de `d` sur le côté avant du segment p0 → p1, à hauteur de p1. */
function decaler(p0: Pt, p1: Pt, d: number): Pt {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const n = Math.hypot(dx, dy) || 1;
  return [p1[0] + (dy / n) * d, p1[1] - (dx / n) * d];
}

function chaine(racine: Pt, m: Membre, l1: number, l2: number, l3: number): Pt[] {
  if (Array.isArray(m) || 'a' in m) {
    const a = Array.isArray(m) ? m : m.a;
    const j1 = vers(racine, a[0], Array.isArray(m) ? l1 : l1 * m.k);
    const j2 = vers(j1, a[1], l2);
    return a[2] === undefined ? [racine, j1, j2] : [racine, j1, j2, vers(j2, a[2], l3)];
  }
  // deux segments qui doivent atteindre un point : on plie au milieu
  const dx = m.vers[0] - racine[0];
  const dy = m.vers[1] - racine[1];
  const d0 = Math.hypot(dx, dy) || 1e-6;
  const d = Math.min(d0, (l1 + l2) * 0.999);
  const ux = dx / d0;
  const uy = dy / d0;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const s = m.pli ?? 1;
  const j1: Pt = [racine[0] + ux * a - uy * h * s, racine[1] + uy * a + ux * h * s];
  const j2 = vers(j1, angle(j1, m.vers), l2);
  return m.fin === undefined ? [racine, j1, j2] : [racine, j1, j2, vers(j2, m.fin, l3)];
}

/** Bande colorée sur une portion de segment, décalée vers un côté. */
function bande(p0: Pt, p1: Pt, de: number, a: number, base: number, normale: Pt): Elt {
  const x0 = p0[0] + (p1[0] - p0[0]) * de;
  const y0 = p0[1] + (p1[1] - p0[1]) * de;
  const x1 = p0[0] + (p1[0] - p0[0]) * a;
  const y1 = p0[1] + (p1[1] - p0[1]) * a;
  const o = 0.19 * base;
  return { k: 'cible', p: [x0 + normale[0] * o, y0 + normale[1] * o, x1 + normale[0] * o, y1 + normale[1] * o], t: base * 0.62 };
}

/** Normale unitaire (-dy, dx) du segment p0 → p1. */
function perp(p0: Pt, p1: Pt): Pt {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const n = Math.hypot(dx, dy) || 1;
  return [-dy / n, dx / n];
}

const SEGMENTS: Record<'bras' | 'jambe', Partial<Record<Segment, number>>> = {
  bras: { bras: 0, avant: 1 },
  jambe: { cuisse: 0, tibia: 1 },
};

function profil(c: Corps, cibles: Muscle[]): Elt[] {
  const f = c.f ?? 1;
  const t = c.t ?? -90;
  const hanche: Pt = c.h ?? vers(c.e as Pt, t + 180, L.buste);
  const epaule: Pt = c.e ?? vers(hanche, t, L.buste);
  const tete = vers(epaule, c.c ?? t, L.cou);
  const bras = (c.bras ?? []).map((m) => chaine(epaule, m, L.bras, L.avant, L.main));
  const jambes = (c.jambes ?? []).map((m) => chaine(hanche, m, L.cuisse, L.tibia, L.pied));
  const j: Joints = { hanche, epaule, tete, bras, jambes };
  const out: Elt[] = [...(c.sous?.(j) ?? [])];

  const membre = (ch: Pt[], type: 'bras' | 'jambe') => {
    out.push({ k: 'membre', p: ch.flat(), t: EP.membre });
    for (const m of cibles) {
      const [seg, de, a, cote] = ZONES[m];
      const i = SEGMENTS[type][seg];
      if (i === undefined) continue;
      const n = perp(ch[i], ch[i + 1]);
      // sur un membre, l'avant est du côté opposé à celui du buste
      const s = -f * cote;
      out.push(bande(ch[i], ch[i + 1], de, a, EP.membre, [n[0] * s, n[1] * s]));
    }
  };
  const charge = (i: number) => {
    const r = c.ch?.[i];
    if (r) out.push({ k: 'charge', p: [...bout(bras[i])], t: r });
  };

  const nArriere = c.derriere ? bras.length : bras.length - 1;
  jambes.slice(0, -1).forEach((ch) => membre(ch, 'jambe'));
  bras.slice(0, nArriere).forEach((ch, i) => {
    membre(ch, 'bras');
    charge(i);
  });
  out.push({ k: 'buste', p: [...hanche, ...epaule], t: EP.buste });
  for (const m of cibles) {
    const [seg, de, a, cote] = ZONES[m];
    if (seg !== 'buste') continue;
    const n = perp(hanche, epaule);
    out.push(bande(hanche, epaule, de, a, EP.buste, [n[0] * f * cote, n[1] * f * cote]));
  }
  out.push({ k: 'tete', p: [...tete], t: EP.tete });
  if (jambes.length) membre(jambes[jambes.length - 1], 'jambe');
  if (bras.length > nArriere) {
    membre(bras[bras.length - 1], 'bras');
    charge(bras.length - 1);
  }
  out.push(...(c.plus?.(j) ?? []));
  return out;
}

function face(c: Corps, cibles: Muscle[]): Elt[] {
  const h = c.h as Pt;
  const cou: Pt = [h[0], h[1] - (c.buste ?? L.buste)];
  const y = cou[1] + 2 - (c.hausse ?? 0);
  const eg: Pt = [h[0] - 8.5, y];
  const ed: Pt = [h[0] + 8.5, y];
  const tete: Pt = [h[0], cou[1] - L.cou];
  const bras = (c.bras ?? []).map((m, i) => chaine(i === 0 ? eg : ed, m, L.bras, L.avant, L.main));
  const jambes = (c.jambes ?? []).map((m, i) => chaine([h[0] + (i === 0 ? -4.5 : 4.5), h[1]], m, L.cuisse, L.tibia, L.pied));
  const j: Joints = { hanche: h, epaule: cou, tete, bras, jambes };
  const out: Elt[] = [...(c.sous?.(j) ?? [])];
  const zones = cibles.map((m) => ZONES[m]);

  const membre = (ch: Pt[], type: 'bras' | 'jambe') => {
    out.push({ k: 'membre', p: ch.flat(), t: EP.membre });
    for (const [seg, de, a] of zones) {
      const i = SEGMENTS[type][seg];
      if (i !== undefined) out.push(bande(ch[i], ch[i + 1], de, a, EP.membre, [0, 0]));
    }
  };

  jambes.forEach((ch) => membre(ch, 'jambe'));
  out.push({ k: 'buste', p: [...h, ...cou], t: EP.busteFace });
  for (const m of cibles) {
    const [seg, de, a] = ZONES[m];
    if (seg === 'buste' && m !== 'trapezes') out.push(bande(h, cou, de, a, EP.busteFace, [0, 0]));
  }
  out.push({ k: 'membre', p: [...eg, h[0], y - 0.5, ...ed], t: EP.membre });
  if (cibles.includes('trapezes')) out.push({ k: 'cible', p: [eg[0] + 3, y - 1.5, h[0], cou[1] - 3, ed[0] - 3, y - 1.5], t: 4.6 });
  out.push({ k: 'tete', p: [...tete], t: EP.tete });
  bras.forEach((ch, i) => {
    membre(ch, 'bras');
    const r = c.ch?.[i];
    if (r) out.push({ k: 'charge', p: [...bout(ch)], t: r });
  });
  out.push(...(c.plus?.(j) ?? []));
  return out;
}

/** Gestes dont les deux poses ne se correspondent pas (doit rester vide, voir les tests). */
export const ERREURS: string[] = [];

interface Options {
  decor?: Decor[];
  F?: Fleche[];
  vignette?: 'A' | 'B';
}

function geste(conseils: string[], cibles: Muscle[], a: Corps, b: Corps, o: Options = {}, statique = false): Visuel {
  const ea = (a.face ? face : profil)(a, cibles);
  const eb = (b.face ? face : profil)(b, cibles);
  const accord = ea.length === eb.length && ea.every((e, i) => e.k === eb[i].k && e.p.length === eb[i].p.length);
  if (!accord) ERREURS.push(conseils[0] ?? '?');
  return {
    conseils,
    traits: ea.map((e) => e.k),
    tailles: ea.map((e) => e.t),
    A: ea.map((e) => e.p),
    B: accord ? eb.map((e) => e.p) : ea.map((e) => e.p),
    statique: statique || !accord,
    ...o,
  };
}

function fixe(conseils: string[], cibles: Muscle[], c: Corps, o: Options = {}): Visuel {
  return geste(conseils, cibles, c, c, o, true);
}

/* ------------------------------------------------------------- petits outils */

const cable = (a: Pt, b: Pt): Elt => ({ k: 'cable', p: [...a, ...b], t: EP.cable });
const disque = (c: Pt, r: number): Elt => ({ k: 'charge', p: [...c], t: r });
const barre = (a: Pt, b: Pt, t = EP.barre): Elt => ({ k: 'barre', p: [...a, ...b], t });
const main = (j: Joints, i = 0): Pt => bout(j.bras[i]);
const banc = (x: number, y: number, w: number): Decor[] => [
  ['r', x, y, w, 5, 2],
  ['l', x + 5, y + 5, x + 5, 88],
  ['l', x + w - 5, y + 5, x + w - 5, 88],
];
const colonne = (x: number, py: number, px = x - 4): Decor[] => [
  ['l', x, 2, x, 88],
  ['c', px, py, 2.6],
];

/** Plateau de la presse, perpendiculaire à la glissière, sous les pieds. */
function plateau(j: Joints): Elt {
  const ch = j.jambes[j.jambes.length - 1];
  const c = vers(vers(ch[2], -35, 4.5), angle(ch[2], ch[3]), 3);
  const d = vers([0, 0], 55, 10);
  return barre([c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]], 3.5);
}

/** debout, de profil */
const H0: Pt = [60, 54.5];
const JD: Membre[] = [
  [92, 89, 0],
  [88, 91, 0],
];
/** debout, de face */
const JF: Membre[] = [
  [94, 90, 180],
  [86, 90, 0],
];
/** allongé sur le dos sur un banc plat, tête à gauche */
const COUCHE: Corps = {
  h: [74, 71],
  t: 180,
  c: 185,
  jambes: [
    [-4, 90, 0],
    [-1, 92, 0],
  ],
};
const BANC_COUCHE = banc(34, 76.5, 48);
/** penché en avant, une main en appui sur le banc */
const PENCHE: Corps = {
  h: [50, 55],
  t: -12,
  c: -18,
  jambes: [
    [100, 82, 0],
    [96, 86, 0],
  ],
};
/** assis sur une machine, cuisses à l'horizontale */
const ASSIS: Corps = {
  h: [52, 68],
  t: -96,
  c: -92,
  bras: [[95, 40]],
};
const SIEGE: Decor[] = [
  ['L', 38, 76, 64, 76, 5],
  ['L', 41, 73, 43, 42, 5],
  ['l', 52, 78.5, 52, 88],
];

/* ----------------------------------------------------------------- les gestes */

const squat = (bras: [Membre, Membre], ch: number, conseils: string[], sous?: Corps['sous']): Visuel =>
  geste(
    conseils,
    ['quadriceps', 'fessiers'],
    { h: H0, t: -88, c: -88, jambes: JD, bras: [bras[0]], ch: [ch], sous },
    {
      h: [48, 68],
      t: -62,
      c: -60,
      jambes: [
        { vers: [59, 85], pli: -1, fin: 0 },
        { vers: [61, 85], pli: -1, fin: 0 },
      ],
      bras: [bras[1]],
      ch: [ch],
      sous,
    },
    { F: [[86, 44, 86, 64]] },
  );

const souleve = (ch: number, conseils: string[]): Visuel => {
  const jambes: Membre[] = [
    { vers: [56, 85], pli: -1, fin: 0 },
    { vers: [58.5, 85], pli: -1, fin: 0 },
  ];
  return geste(
    conseils,
    ['ischios', 'fessiers'],
    { h: [55, 57], t: -18, c: -25, jambes, bras: [{ vers: [66, 73] }], ch: [ch] },
    { h: [58, 54.5], t: -88, c: -88, jambes, bras: [{ vers: [60, 58] }], ch: [ch] },
    { F: [[90, 58, 90, 38]], vignette: 'A' },
  );
};

const machineHanche = (conseils: string[], cibles: Muscle[], serre: boolean): Visuel => {
  const ouvert: Membre[] = [
    [140, 95, 180],
    [40, 85, 0],
  ];
  const ferme: Membre[] = [
    [105, 90, 180],
    [75, 90, 0],
  ];
  const cote = serre ? 5 : -5;
  const coussins = (j: Joints): Elt[] => {
    const g = j.jambes[0][1];
    const d = j.jambes[1][1];
    return [barre([g[0] + cote, g[1] - 5], [g[0] + cote, g[1] + 5], 4), barre([d[0] - cote, d[1] - 5], [d[0] - cote, d[1] + 5], 4)];
  };
  const base: Corps = {
    face: true,
    h: [60, 52],
    bras: [
      [145, 100],
      [35, 80],
    ],
    plus: coussins,
  };
  return geste(
    conseils,
    cibles,
    { ...base, jambes: serre ? ouvert : ferme },
    { ...base, jambes: serre ? ferme : ouvert },
    {
      decor: [
        ['r', 47, 22, 26, 32, 4],
        ['r', 44, 54, 32, 6, 2],
        ['l', 60, 60, 60, 88],
      ],
    },
  );
};

export const VIS: Record<string, Visuel> = {
  /* Pectoraux */
  dc: geste(
    ['Omoplates serrées, pieds ancrés au sol', 'Descends les haltères au niveau de la poitrine', "Pousse jusqu'à l'extension, sans verrouiller brutalement"],
    ['pecs'],
    { ...COUCHE, bras: [{ vers: [56, 62], pli: 1 }], ch: [4.6] },
    { ...COUCHE, bras: [[-88, -90]], ch: [4.6] },
    { decor: BANC_COUCHE, F: [[24, 70, 24, 50]] },
  ),
  ecar: geste(
    ['Coudes légèrement fléchis, fixes du début à la fin', "Ouvre jusqu'à sentir l'étirement des pectoraux", 'Remonte en arc de cercle, comme pour serrer un tronc'],
    ['pecs'],
    {
      face: true,
      h: [60, 70],
      buste: 4,
      bras: [
        [170, 165],
        [10, 15],
      ],
      ch: [4.4, 4.4],
    },
    {
      face: true,
      h: [60, 70],
      buste: 4,
      bras: [
        [-62, -80],
        [-118, -100],
      ],
      ch: [4.4, 4.4],
    },
    {
      decor: [
        ['r', 52, 74, 16, 5, 2],
        ['l', 60, 79, 60, 88],
        ['l', 52, 88, 68, 88],
      ],
      F: [
        [30, 64, 44, 50],
        [90, 64, 76, 50],
      ],
    },
  ),
  pec: geste(
    ['Dos plaqué au dossier, épaules basses', 'Rapproche les bras devant la poitrine', 'Reviens lentement sans laisser claquer les charges'],
    ['pecs'],
    {
      face: true,
      h: [60, 55],
      jambes: JF,
      bras: [
        [180, -90],
        [0, -90],
      ],
    },
    {
      face: true,
      h: [60, 55],
      jambes: JF,
      bras: [
        { a: [-20, -90], k: 0.45 },
        { a: [-160, -90], k: 0.45 },
      ],
    },
    {
      decor: [
        ['r', 47, 20, 26, 38, 4],
        ['r', 44, 55, 32, 6, 2],
      ],
    },
  ),
  ecp: geste(
    ['Un pied devant, buste légèrement penché', 'Bras presque tendus, les mains se rejoignent devant le bassin', 'Contrôle le retour, épaules basses'],
    ['pecs'],
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        [195, 200],
        [-15, -20],
      ],
      sous: (j) => [cable([22, 8], main(j, 0)), cable([98, 8], main(j, 1))],
    },
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        { vers: [59, 56], pli: 1 },
        { vers: [61, 56], pli: -1 },
      ],
      sous: (j) => [cable([22, 8], main(j, 0)), cable([98, 8], main(j, 1))],
    },
    { decor: [...colonne(18, 8, 22), ...colonne(102, 8, 98)] },
  ),
  pom: geste(
    ['Corps gainé et aligné des épaules aux chevilles', 'Poitrine près du sol en bas', 'Pousse le sol loin de toi'],
    ['pecs', 'triceps'],
    {
      e: [85.4, 72],
      t: -10,
      c: -8,
      bras: [{ vers: [82, 84], pli: 1 }],
      jambes: [
        [170, 170, 110],
        [168, 172, 110],
      ],
    },
    {
      e: [82, 60.5],
      t: -23,
      c: -20,
      bras: [[90, 90]],
      jambes: [
        [157, 157, 110],
        [155, 159, 110],
      ],
    },
    { F: [[102, 80, 102, 62]] },
  ),
  pull: geste(
    ['Haut du dos bien calé sur le banc', 'Bras presque tendus, descends derrière la tête', 'Ramène au-dessus de la poitrine sans plier les coudes'],
    ['pecs', 'dos'],
    { ...COUCHE, bras: [[190, 190]], ch: [5] },
    { ...COUCHE, bras: [[-80, -86]], ch: [5] },
    { decor: BANC_COUCHE, F: [[30, 62, 42, 46]] },
  ),

  /* Dos */
  row: geste(
    ['Dos plat, regard vers le sol', 'Tire le coude vers la hanche', 'Aucune rotation du buste'],
    ['dos'],
    {
      ...PENCHE,
      bras: [
        [62, 78],
        [100, 93],
      ],
      ch: [0, 4.6],
    },
    {
      ...PENCHE,
      bras: [
        [62, 78],
        [192, 96],
      ],
      ch: [0, 4.6],
    },
    { decor: banc(68, 76, 34), F: [[92, 68, 92, 50]] },
  ),
  rowb: geste(
    ['Buste penché, dos plat, genoux légèrement fléchis', 'Tire la barre vers le nombril', 'Serre les omoplates en haut, descends sous contrôle'],
    ['dos'],
    { ...PENCHE, t: -25, c: -25, h: [52, 55], bras: [{ vers: [70, 70] }], ch: [6.5] },
    { ...PENCHE, t: -25, c: -25, h: [52, 55], bras: [{ vers: [62, 56], pli: 1 }], ch: [6.5] },
    { F: [[90, 72, 90, 54]] },
  ),
  rows: geste(
    ['Buste droit, poitrine sortie', 'Tire la poignée vers le ventre, coudes près du corps', 'Serre les omoplates sans basculer en arrière'],
    ['dos'],
    {
      h: [46, 74],
      t: -78,
      c: -75,
      jambes: [
        [-15, 15, -80],
        [-12, 13, -80],
      ],
      bras: [{ vers: [73, 58] }],
      sous: (j) => [cable([86, 62], main(j))],
    },
    {
      h: [46, 74],
      t: -98,
      c: -95,
      jambes: [
        [-15, 15, -80],
        [-12, 13, -80],
      ],
      bras: [{ vers: [52, 64], pli: 1 }],
      sous: (j) => [cable([86, 62], main(j))],
    },
    {
      decor: [['L', 30, 82, 58, 82, 5], ['l', 34, 84.5, 34, 88], ['l', 54, 84.5, 54, 88], ['L', 81, 62, 81, 80, 4], ...colonne(90, 62)],
      F: [[80, 46, 62, 46]],
    },
  ),
  tir: geste(
    ['Tire la barre vers le haut des pectoraux', 'Coudes vers le bas, poitrine sortie', 'Remonte en contrôlant, sans te pencher'],
    ['dos'],
    {
      h: [56, 70],
      t: -100,
      c: -95,
      jambes: [
        [0, 90, 0],
        [3, 88, 0],
      ],
      bras: [{ vers: [58, 27] }],
      sous: (j) => [cable([62, 8], main(j))],
      plus: (j) => [barre([main(j)[0] - 12, main(j)[1]], [main(j)[0] + 10, main(j)[1]])],
    },
    {
      h: [56, 70],
      t: -100,
      c: -95,
      jambes: [
        [0, 90, 0],
        [3, 88, 0],
      ],
      bras: [{ vers: [57, 52], pli: 1 }],
      sous: (j) => [cable([62, 8], main(j))],
      plus: (j) => [barre([main(j)[0] - 12, main(j)[1]], [main(j)[0] + 10, main(j)[1]])],
    },
    {
      decor: [['r', 44, 75.5, 24, 5, 2], ['l', 56, 80.5, 56, 88], ['r', 64, 60, 14, 5, 2], ['l', 62, 2.5, 90, 2.5], ...colonne(90, 6, 62)],
      F: [[100, 26, 100, 46]],
    },
  ),
  trac: geste(
    ['Prise un peu plus large que les épaules', "Monte jusqu'à passer le menton au-dessus de la barre", 'Redescends bras tendus, sans balancer'],
    ['dos', 'biceps'],
    {
      e: [61, 41.5],
      t: -90,
      bras: [{ vers: [61, 18], pli: 1 }],
      jambes: [
        [95, 150, 160],
        [100, 145, 160],
      ],
    },
    {
      e: [59, 21.5],
      t: -88,
      c: -86,
      bras: [{ vers: [61, 18], pli: 1 }],
      jambes: [
        [95, 150, 160],
        [100, 145, 160],
      ],
    },
    { decor: [['L', 40, 18, 84, 18, 3]], F: [[94, 48, 94, 30]] },
  ),
  pullp: geste(
    ['Bras presque tendus du début à la fin', "Ramène la barre jusqu'aux cuisses", 'Le buste reste fixe, seuls les bras bougent'],
    ['dos'],
    {
      h: [52, 55],
      t: -70,
      c: -60,
      jambes: [
        [95, 88, 0],
        [90, 92, 0],
      ],
      bras: [[-25, -25]],
      sous: (j) => [cable([96, 10], main(j))],
    },
    {
      h: [52, 55],
      t: -70,
      c: -60,
      jambes: [
        [95, 88, 0],
        [90, 92, 0],
      ],
      bras: [[80, 82]],
      sous: (j) => [cable([96, 10], main(j))],
    },
    { decor: colonne(100, 10), F: [[88, 34, 80, 56]] },
  ),
  lomb: geste(
    ['Bassin calé sur le support', "Remonte jusqu'à aligner le buste avec les jambes", "Pas d'hyperextension en haut"],
    ['lombaires'],
    {
      h: [62, 46],
      t: 70,
      c: 75,
      bras: [[220, 80]],
      jambes: [
        [130, 130, 40],
        [128, 132, 40],
      ],
    },
    {
      h: [62, 46],
      t: -50,
      c: -50,
      bras: [[100, -40]],
      jambes: [
        [130, 130, 40],
        [128, 132, 40],
      ],
    },
    {
      decor: [
        ['r', 33, 71, 13, 4, 1],
        ['L', 63, 56, 72, 46, 5],
        ['l', 40, 75, 56, 88],
        ['l', 70, 52, 72, 88],
      ],
      F: [[94, 72, 98, 46]],
    },
  ),
  shrug: geste(
    ['Bras tendus, haltères le long du corps', 'Monte les épaules vers les oreilles', 'Pause en haut, redescends lentement'],
    ['trapezes'],
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        [95, 92],
        [85, 88],
      ],
      ch: [4.4, 4.4],
    },
    {
      face: true,
      h: H0,
      hausse: 4,
      jambes: JF,
      bras: [
        [95, 92],
        [85, 88],
      ],
      ch: [4.4, 4.4],
    },
    { F: [[84, 40, 84, 28]] },
  ),

  /* Épaules */
  dm: geste(
    ['Gainage serré, ne cambre pas le bas du dos', 'Coudes sous les poignets', "Pousse à la verticale jusqu'à l'extension"],
    ['deltoides'],
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        [180, -90],
        [0, -90],
      ],
      ch: [4.6, 4.6],
    },
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        [-105, -95],
        [-75, -85],
      ],
      ch: [4.6, 4.6],
    },
    {
      F: [
        [24, 30, 24, 12],
        [96, 30, 96, 12],
      ],
    },
  ),
  el: geste(
    ["Monte jusqu'à l'horizontale, pas plus", 'Coudes légèrement fléchis', "Pas d'élan : le buste reste immobile"],
    ['deltoides'],
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        [100, 96],
        [80, 84],
      ],
      ch: [4.4, 4.4],
    },
    {
      face: true,
      h: H0,
      jambes: JF,
      bras: [
        [180, 184],
        [0, -4],
      ],
      ch: [4.4, 4.4],
    },
    {
      F: [
        [20, 58, 20, 44],
        [100, 58, 100, 44],
      ],
    },
  ),
  elf: geste(
    ["Monte devant toi jusqu'à hauteur des yeux", 'Bras presque tendus', "Pas d'élan : le buste ne bouge pas"],
    ['deltoides'],
    { h: H0, t: -90, jambes: JD, bras: [[88, 86]], ch: [4.4] },
    { h: H0, t: -90, jambes: JD, bras: [[-2, -4]], ch: [4.4] },
    { F: [[94, 56, 94, 38]] },
  ),
  ois: geste(
    ['Buste penché, dos plat', 'Écarte les bras sur les côtés, coudes légèrement fléchis', 'Serre le haut du dos, redescends sous contrôle'],
    ['deltoides', 'dos'],
    {
      h: [52, 55],
      t: -18,
      c: -25,
      jambes: [
        [98, 84, 0],
        [94, 88, 0],
      ],
      bras: [[88, 90]],
      ch: [4.2],
    },
    {
      h: [52, 55],
      t: -18,
      c: -25,
      jambes: [
        [98, 84, 0],
        [94, 88, 0],
      ],
      bras: [[-100, -95]],
      ch: [4.2],
    },
    { F: [[92, 70, 92, 50]] },
  ),
  face: geste(
    ['Poulie à hauteur du visage', 'Tire la corde vers le front, coudes hauts', 'Écarte les mains en fin de mouvement'],
    ['deltoides'],
    {
      h: H0,
      t: -90,
      jambes: [
        [96, 88, 0],
        [84, 92, 0],
      ],
      bras: [{ vers: [83, 33], pli: 1 }],
      sous: (j) => [cable([94, 26], main(j))],
    },
    {
      h: H0,
      t: -90,
      jambes: [
        [96, 88, 0],
        [84, 92, 0],
      ],
      bras: [{ vers: [66, 25], pli: -1 }],
      sous: (j) => [cable([94, 26], main(j))],
    },
    { decor: colonne(98, 26), F: [[86, 14, 70, 14]] },
  ),

  /* Biceps */
  curl: geste(
    ['Coudes collés au buste, ils ne bougent pas', 'Monte en serrant le biceps', 'Contrôle la descente'],
    ['biceps'],
    { h: H0, t: -90, jambes: JD, bras: [[96, 88]], ch: [4.4] },
    { h: H0, t: -90, jambes: JD, bras: [[96, -55]], ch: [4.4] },
    { F: [[80, 58, 80, 40]] },
  ),
  curlc: geste(
    ["Assis, coude calé contre l'intérieur de la cuisse", 'Monte en serrant le biceps', "Descends jusqu'à l'extension complète"],
    ['biceps'],
    {
      h: [50, 70],
      t: -55,
      c: -40,
      jambes: [
        [0, 90, 0],
        [4, 88, 0],
      ],
      bras: [[88, 96]],
      ch: [4.4],
    },
    {
      h: [50, 70],
      t: -55,
      c: -40,
      jambes: [
        [0, 90, 0],
        [4, 88, 0],
      ],
      bras: [[88, -62]],
      ch: [4.4],
    },
    { decor: banc(36, 75.5, 28), F: [[86, 76, 86, 58]] },
  ),

  /* Triceps */
  ext: geste(
    ['Coudes vers le ciel, proches de la tête', "Seul l'avant-bras bouge", 'Étire sans cambrer le dos'],
    ['triceps'],
    { h: H0, t: -90, jambes: JD, bras: [[-112, 155]], ch: [4.4], derriere: true },
    { h: H0, t: -90, jambes: JD, bras: [[-112, -80]], ch: [4.4], derriere: true },
    { F: [[78, 30, 78, 12]] },
  ),
  push: geste(
    ['Coudes collés au buste', "Pousse vers le bas jusqu'à bras tendus", 'Seuls les avant-bras bougent'],
    ['triceps'],
    { h: H0, t: -82, c: -80, jambes: JD, bras: [[94, -45]], sous: (j) => [cable([86, 6], main(j))] },
    { h: H0, t: -82, c: -80, jambes: JD, bras: [[94, 88]], sous: (j) => [cable([86, 6], main(j))] },
    { decor: colonne(90, 6), F: [[102, 40, 102, 58]] },
  ),
  bf: geste(
    ['Bras verticaux, coudes serrés', 'Descends la barre vers le front en pliant les coudes', 'Remonte sans écarter les coudes'],
    ['triceps'],
    { ...COUCHE, bras: [[-78, 200]], ch: [5.5] },
    { ...COUCHE, bras: [[-78, -82]], ch: [5.5] },
    { decor: BANC_COUCHE, F: [[30, 60, 30, 44]] },
  ),
  kick: geste(
    ['Buste penché, bras collé au corps', "Tends le bras vers l'arrière", "Le coude reste fixe, seul l'avant-bras bouge"],
    ['triceps'],
    {
      ...PENCHE,
      bras: [
        [62, 78],
        [178, 92],
      ],
      ch: [0, 4.4],
    },
    {
      ...PENCHE,
      bras: [
        [62, 78],
        [178, 176],
      ],
      ch: [0, 4.4],
    },
    { decor: banc(68, 76, 34), F: [[56, 38, 40, 38]] },
  ),
  dips: geste(
    ["Descends jusqu'à avoir les bras à angle droit", "Buste légèrement penché vers l'avant", "Pousse jusqu'à bras tendus, épaules basses"],
    ['triceps', 'pecs'],
    {
      e: [62, 39],
      t: -74,
      c: -70,
      bras: [{ vers: [60, 52.5], pli: 1 }],
      jambes: [
        [98, 150, 160],
        [102, 148, 160],
      ],
    },
    {
      e: [60, 29],
      t: -86,
      c: -88,
      bras: [{ vers: [60, 52.5], pli: 1 }],
      jambes: [
        [98, 150, 160],
        [102, 148, 160],
      ],
    },
    {
      decor: [
        ['r', 40, 54, 44, 3, 1.5],
        ['l', 46, 57, 46, 88],
        ['l', 78, 57, 78, 88],
      ],
      F: [[92, 46, 92, 30]],
    },
  ),

  /* Avant-bras */
  poig: geste(
    ['Avant-bras posés sur les cuisses, poignets dans le vide', 'Monte en fléchissant seulement les poignets', 'Amplitude complète, sans à-coup'],
    ['avantbras'],
    {
      h: [50, 70],
      t: -58,
      c: -45,
      jambes: [
        [0, 90, 0],
        [3, 88, 0],
      ],
      bras: [[93, 0, 60]],
      ch: [3.6],
    },
    {
      h: [50, 70],
      t: -58,
      c: -45,
      jambes: [
        [0, 90, 0],
        [3, 88, 0],
      ],
      bras: [[93, 0, -50]],
      ch: [3.6],
    },
    { decor: banc(34, 75.5, 30), F: [[86, 74, 86, 58]] },
  ),
  farm: geste(
    ['Charges lourdes, bras tendus le long du corps', 'Buste droit, épaules basses', 'Petits pas réguliers, regard devant'],
    ['avantbras', 'trapezes'],
    {
      h: [60, 54],
      t: -90,
      jambes: [
        [110, 95, 0],
        [70, 90, 0],
      ],
      bras: [[90, 90]],
      ch: [5.2],
    },
    {
      h: [60, 54],
      t: -90,
      jambes: [
        [70, 90, 0],
        [110, 95, 0],
      ],
      bras: [[90, 90]],
      ch: [5.2],
    },
  ),

  /* Abdos */
  gai: fixe(['Coudes sous les épaules', 'Alignement épaules, bassin, chevilles', 'Respire normalement, ne bloque pas'], ['abdos'], {
    e: [74, 72],
    t: -8,
    c: -10,
    bras: [[90, 0]],
    jambes: [
      [172, 172, 100],
      [170, 174, 100],
    ],
  }),
  gail: fixe(["Coude sous l'épaule", 'Corps aligné de la tête aux pieds', "Bassin haut, il ne s'affaisse pas"], ['abdos'], {
    e: [70, 72],
    t: -18,
    c: -15,
    bras: [
      [90, 0],
      [-90, -90],
    ],
    jambes: [
      [167, 167, 180],
      [165, 169, 180],
    ],
  }),
  crunch: geste(
    ['Bas du dos plaqué au sol', 'Enroule le haut du dos vers le bassin', 'Souffle en montant, ne tire pas sur la nuque'],
    ['abdos'],
    {
      h: [62, 82.5],
      t: 180,
      c: 182,
      jambes: [
        { vers: [78, 84.5], pli: -1, fin: 0 },
        { vers: [80, 84.5], pli: -1, fin: 0 },
      ],
      bras: [[-20, -15]],
    },
    {
      h: [62, 82.5],
      t: -150,
      c: -145,
      jambes: [
        { vers: [78, 84.5], pli: -1, fin: 0 },
        { vers: [80, 84.5], pli: -1, fin: 0 },
      ],
      bras: [[-15, -10]],
    },
    { F: [[26, 74, 34, 60]] },
  ),
  crunchp: geste(
    ['À genoux, corde tenue près de la tête', 'Enroule le buste vers le sol', 'Les hanches ne bougent pas'],
    ['abdos'],
    {
      h: [56, 68.5],
      t: -85,
      c: -80,
      jambes: [
        [90, 180, 180],
        [88, 180, 180],
      ],
      bras: [{ vers: [62, 44], pli: 1 }],
      sous: (j) => [cable([60, 6], main(j))],
    },
    {
      h: [56, 68.5],
      t: -20,
      c: 30,
      jambes: [
        [90, 180, 180],
        [88, 180, 180],
      ],
      bras: [{ vers: [80, 70], pli: 1 }],
      sous: (j) => [cable([60, 6], main(j))],
    },
    {
      decor: [
        ['l', 40, 2.5, 80, 2.5],
        ['c', 60, 6, 2.6],
      ],
      F: [[96, 40, 96, 60]],
    },
  ),
  relj: geste(
    ['Suspendu, bras tendus, sans balancer', "Monte les jambes jusqu'à l'horizontale", 'Redescends lentement'],
    ['abdos'],
    {
      e: [61, 33.5],
      t: -90,
      bras: [{ vers: [61, 10] }],
      jambes: [
        [90, 90, 10],
        [92, 90, 10],
      ],
    },
    {
      e: [61, 33.5],
      t: -90,
      bras: [{ vers: [61, 10] }],
      jambes: [
        [0, 0, -80],
        [2, 0, -80],
      ],
    },
    { decor: [['L', 40, 10, 84, 10, 3]], F: [[100, 80, 100, 58]] },
  ),
  reljs: geste(
    ['Bas du dos plaqué au sol', "Monte les jambes tendues jusqu'à la verticale", 'Redescends sans toucher le sol'],
    ['abdos'],
    {
      h: [60, 82.5],
      t: 180,
      bras: [[2, 0]],
      jambes: [
        [-5, -5, -80],
        [-3, -5, -80],
      ],
    },
    {
      h: [60, 82.5],
      t: 180,
      bras: [[2, 0]],
      jambes: [
        [-88, -88, 0],
        [-86, -88, 0],
      ],
    },
    { F: [[98, 72, 84, 50]] },
  ),
  russ: geste(
    ['Buste incliné en arrière, dos droit', 'Pieds décollés si tu peux', "Tourne les épaules d'un côté puis de l'autre"],
    ['abdos'],
    {
      h: [56, 80],
      t: -120,
      c: -110,
      jambes: [
        [-35, 20, 0],
        [-32, 22, 0],
      ],
      bras: [{ vers: [60, 82], pli: 1 }],
      ch: [4.8],
    },
    {
      h: [56, 80],
      t: -120,
      c: -110,
      jambes: [
        [-35, 20, 0],
        [-32, 22, 0],
      ],
      bras: [{ vers: [64, 62], pli: 1 }],
      ch: [4.8],
    },
    { F: [[76, 82, 76, 64]] },
  ),
  roue: geste(
    ['À genoux, gainage serré', 'Roule devant toi sans creuser le dos', 'Reviens en contractant les abdos'],
    ['abdos'],
    {
      h: [46.7, 68.7],
      t: -30,
      c: 30,
      jambes: [
        [100, 180, 180],
        [98, 182, 180],
      ],
      bras: [{ vers: [65, 83.5], pli: -1 }],
      ch: [4.5],
    },
    {
      h: [58.6, 78.7],
      t: -6,
      c: 10,
      jambes: [
        [160, 180, 180],
        [158, 182, 180],
      ],
      bras: [{ vers: [100, 83.5], pli: -1 }],
      ch: [4.5],
    },
    { F: [[72, 62, 94, 62]] },
  ),
  mount: geste(
    ['Position de pompe, mains sous les épaules', "Ramène un genou vers la poitrine, puis l'autre", 'Bassin bas et stable'],
    ['abdos'],
    {
      e: [82, 60.5],
      t: -23,
      c: -20,
      bras: [[90, 90]],
      jambes: [
        [157, 157, 110],
        [20, 150, 100],
      ],
    },
    {
      e: [82, 60.5],
      t: -23,
      c: -20,
      bras: [[90, 90]],
      jambes: [
        [20, 150, 100],
        [157, 157, 110],
      ],
    },
  ),

  /* Quadriceps */
  sq: squat(
    [
      [75, -70],
      [70, -75],
    ],
    5,
    ['Talons au sol, dos droit', 'Descends cuisses parallèles au sol', "Genoux dans l'axe des pieds"],
  ),
  sqb: squat(
    [
      [120, -80],
      [150, -50],
    ],
    0,
    ['Barre sur le haut du dos, pas sur la nuque', 'Descends cuisses parallèles au sol', "Genoux dans l'axe des pieds"],
    (j) => [disque(main(j), 7)],
  ),
  sqpc: squat(
    [
      [-2, 0],
      [-10, -5],
    ],
    0,
    ["Bras devant pour l'équilibre", 'Descends cuisses parallèles au sol', 'Talons au sol, dos droit'],
  ),
  pre: geste(
    ['Dos et bassin plaqués au dossier', 'Pousse sans verrouiller les genoux', "Genoux dans l'axe des pieds"],
    ['quadriceps', 'fessiers'],
    {
      h: [46, 70],
      t: -135,
      c: -128,
      bras: [[60, 20]],
      jambes: [
        [-70, 0, -95],
        [-66, -4, -95],
      ],
      plus: (j) => [plateau(j)],
    },
    {
      h: [46, 70],
      t: -135,
      c: -128,
      bras: [[60, 20]],
      jambes: [
        [-38, -32, -125],
        [-35, -34, -125],
      ],
      plus: (j) => [plateau(j)],
    },
    {
      decor: [
        ['l', 54, 88, 98, 57],
        ['L', 21, 56.5, 41, 76.5, 5],
        ['L', 40, 78, 58, 78, 5],
        ['l', 44, 80.5, 44, 88],
        ['l', 56, 80.5, 56, 88],
      ],
      F: [[84, 64, 96, 54]],
    },
  ),
  legext: geste(
    ['Dos calé au dossier', "Tends les jambes jusqu'à l'horizontale", 'Redescends lentement'],
    ['quadriceps'],
    {
      ...ASSIS,
      jambes: [
        [0, 95, 0],
        [3, 93, 0],
      ],
      plus: (j) => [disque(decaler(j.jambes[1][1], j.jambes[1][2], 6), 3.8)],
    },
    {
      ...ASSIS,
      jambes: [
        [0, 8, -80],
        [3, 10, -80],
      ],
      plus: (j) => [disque(decaler(j.jambes[1][1], j.jambes[1][2], 6), 3.8)],
    },
    { decor: SIEGE, F: [[96, 84, 96, 66]] },
  ),
  sqbul: geste(
    ['Pied arrière posé sur le banc', 'Descends droit, le genou arrière frôle le sol', 'Pousse sur le talon avant'],
    ['quadriceps', 'fessiers'],
    {
      h: [60, 66],
      t: -88,
      jambes: [
        { vers: [38, 68.5], pli: -1, fin: 180 },
        { vers: [72, 85], pli: -1, fin: 0 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    {
      h: [64, 55],
      t: -88,
      jambes: [
        { vers: [38, 68.5], pli: -1, fin: 180 },
        { vers: [72, 85], pli: -1, fin: 0 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    { decor: banc(18, 72, 24), F: [[90, 64, 90, 46]] },
  ),

  /* Ischios */
  lc: geste(
    ['Bassin plaqué au banc', 'Monte le talon vers les fessiers', 'Redescends lentement, sans à-coup'],
    ['ischios'],
    {
      h: [64, 70],
      t: 180,
      c: 186,
      f: -1,
      bras: [[175, 178]],
      jambes: [
        [0, 4, 90],
        [2, 6, 90],
      ],
      plus: (j) => [disque(decaler(j.jambes[1][1], j.jambes[1][2], 6), 3.8)],
    },
    {
      h: [64, 70],
      t: 180,
      c: 186,
      f: -1,
      bras: [[175, 178]],
      jambes: [
        [0, -82, 8],
        [2, -78, 8],
      ],
      plus: (j) => [disque(decaler(j.jambes[1][1], j.jambes[1][2], 6), 3.8)],
    },
    { decor: banc(18, 75.5, 66), F: [[106, 68, 96, 52]] },
  ),
  lca: geste(
    ["Genoux alignés avec l'axe de la machine", 'Ramène les talons sous le siège', 'Remonte lentement'],
    ['ischios'],
    {
      ...ASSIS,
      jambes: [
        [0, 20, -60],
        [3, 22, -60],
      ],
      plus: (j) => [disque(decaler(j.jambes[1][1], j.jambes[1][2], -6), 3.8)],
    },
    {
      ...ASSIS,
      jambes: [
        [0, 115, 30],
        [3, 117, 30],
      ],
      plus: (j) => [disque(decaler(j.jambes[1][1], j.jambes[1][2], -6), 3.8)],
    },
    { decor: [...SIEGE, ['L', 58, 60.5, 76, 60.5, 4]], F: [[94, 70, 80, 86]] },
  ),
  sdt: souleve(4.4, ["Hanches vers l'arrière, dos plat", 'Haltères qui frôlent les jambes', 'Jambes presque tendues, remonte avec les hanches']),
  sdtb: souleve(6.5, ["Hanches vers l'arrière, dos plat", 'La barre frôle les jambes', 'Jambes presque tendues, remonte avec les hanches']),
  sdtc: geste(
    ['Barre contre les tibias, dos plat', 'Pousse le sol avec les jambes, la barre frôle les cuisses', 'Verrouille debout sans te pencher en arrière'],
    ['ischios', 'fessiers', 'lombaires'],
    {
      h: [50, 68],
      t: -38,
      c: -30,
      jambes: [
        { vers: [57, 85], pli: -1, fin: 0 },
        { vers: [59, 85], pli: -1, fin: 0 },
      ],
      bras: [{ vers: [64, 80] }],
      ch: [7.5],
    },
    {
      h: [57, 54.5],
      t: -86,
      c: -88,
      jambes: [
        { vers: [57, 85], pli: -1, fin: 0 },
        { vers: [59, 85], pli: -1, fin: 0 },
      ],
      bras: [{ vers: [60, 58] }],
      ch: [7.5],
    },
    { F: [[90, 74, 90, 52]], vignette: 'A' },
  ),
  gm: geste(
    ['Barre sur le haut du dos', "Pousse les hanches vers l'arrière, dos plat", 'Remonte en serrant les fessiers'],
    ['ischios', 'fessiers'],
    {
      h: [58, 54.5],
      t: -88,
      c: -88,
      jambes: [
        { vers: [56, 85], pli: -1, fin: 0 },
        { vers: [58.5, 85], pli: -1, fin: 0 },
      ],
      bras: [[120, -80]],
      sous: (j) => [disque(main(j), 7)],
    },
    {
      h: [54, 56],
      t: -12,
      c: -10,
      jambes: [
        { vers: [56, 85], pli: -1, fin: 0 },
        { vers: [58.5, 85], pli: -1, fin: 0 },
      ],
      bras: [[196, -4]],
      sous: (j) => [disque(main(j), 7)],
    },
    { F: [[92, 42, 92, 58]] },
  ),

  /* Fessiers */
  fen: geste(
    ['Grand pas, buste bien droit', 'Le genou arrière frôle le sol', 'Pousse sur le talon avant pour remonter'],
    ['quadriceps', 'fessiers'],
    {
      h: [58, 67],
      t: -90,
      jambes: [
        { vers: [38, 83], pli: -1, fin: 100 },
        { vers: [74, 85], pli: -1, fin: 0 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    {
      h: [66, 55],
      t: -90,
      jambes: [
        { vers: [50, 82], pli: -1, fin: 110 },
        { vers: [74, 85], pli: -1, fin: 0 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    { F: [[92, 52, 92, 70]], vignette: 'A' },
  ),
  ht: geste(
    ['Haut du dos posé sur le banc, menton rentré', 'Pousse sur les talons', 'Serre fort les fessiers en haut'],
    ['fessiers'],
    {
      h: [57, 77.2],
      t: -41,
      c: -30,
      f: -1,
      jambes: [
        { vers: [37, 84.5], pli: 1, fin: 180 },
        { vers: [39, 84.5], pli: 1, fin: 180 },
      ],
      bras: [{ vers: [59, 70], pli: 1 }],
      plus: (j) => [disque([j.hanche[0], j.hanche[1] - 8.5], 7.5)],
    },
    {
      h: [52, 64],
      t: 0,
      c: 0,
      f: -1,
      jambes: [
        { vers: [37, 84.5], pli: 1, fin: 180 },
        { vers: [39, 84.5], pli: 1, fin: 180 },
      ],
      bras: [{ vers: [54, 57], pli: 1 }],
      plus: (j) => [disque([j.hanche[0], j.hanche[1] - 8.5], 7.5)],
    },
    { decor: banc(66, 69.5, 30), F: [[24, 80, 24, 60]] },
  ),
  abd: machineHanche(['Dos calé au dossier', 'Écarte les genoux en poussant les coussins', 'Reviens lentement, sans laisser claquer'], ['fessiers'], false),
  kickf: geste(
    ['Tiens le poteau, buste légèrement penché', "Pousse la jambe vers l'arrière et le haut", 'Le dos ne se creuse pas'],
    ['fessiers'],
    {
      h: [52, 55],
      t: -80,
      c: -75,
      bras: [{ vers: [78, 40] }],
      jambes: [
        [95, 90, 0],
        [92, 90, 0],
      ],
      sous: (j) => [cable([79, 84], j.jambes[0][2])],
    },
    {
      h: [52, 55],
      t: -80,
      c: -75,
      bras: [{ vers: [78, 40] }],
      jambes: [
        [150, 160, 180],
        [92, 90, 0],
      ],
      sous: (j) => [cable([79, 84], j.jambes[0][2])],
    },
    { decor: colonne(83, 84, 79), F: [[34, 88, 22, 74]] },
  ),
  step: geste(
    ['Pied entier posé sur la marche', 'Monte en poussant sur la jambe avant', 'Redescends en contrôlant'],
    ['quadriceps', 'fessiers'],
    {
      h: [54, 55],
      t: -88,
      jambes: [
        { vers: [46, 85], pli: -1, fin: 0 },
        { vers: [70, 70.5], pli: -1, fin: 0 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    {
      h: [70, 40],
      t: -88,
      jambes: [
        { vers: [58, 62], pli: -1, fin: 60 },
        { vers: [70, 70.5], pli: -1, fin: 0 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    { decor: [['r', 62, 74, 30, 14, 2]], F: [[100, 58, 100, 40]] },
  ),

  /* Adducteurs */
  add: machineHanche(['Dos calé au dossier', 'Serre les genoux en poussant les coussins', 'Reviens lentement, sans laisser claquer'], ['adducteurs'], true),

  /* Mollets */
  mol: geste(
    ['Monte le plus haut possible sur la pointe', "Pause d'une seconde en haut", 'Amplitude complète à la descente'],
    ['mollets'],
    {
      h: [57, 48.5],
      t: -90,
      jambes: [
        { vers: [57, 79], pli: -1, fin: -20 },
        { vers: [58, 79], pli: -1, fin: -20 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    {
      h: [60.5, 40.5],
      t: -90,
      jambes: [
        { vers: [60.2, 70.9], pli: -1, fin: 60 },
        { vers: [61, 70.9], pli: -1, fin: 60 },
      ],
      bras: [[92, 90]],
      ch: [4.4],
    },
    { decor: [['r', 60, 80, 26, 8, 1]], F: [[84, 62, 84, 44]] },
  ),
  mola: geste(
    ['Genoux calés sous les coussins', 'Monte sur la pointe des pieds', 'Descends le talon au plus bas'],
    ['mollets'],
    {
      h: [50, 68],
      t: -95,
      c: -90,
      bras: [{ vers: [64, 60], pli: -1 }],
      jambes: [
        [0, 90, -20],
        [3, 88, -20],
      ],
      plus: (j) => [barre([j.jambes[1][1][0] - 8, j.jambes[1][1][1] - 5.5], [j.jambes[1][1][0] + 6, j.jambes[1][1][1] - 5.5], 4)],
    },
    {
      h: [50, 68],
      t: -95,
      c: -90,
      bras: [{ vers: [63, 54], pli: -1 }],
      jambes: [
        [-22, 90, 35],
        [-19, 88, 35],
      ],
      plus: (j) => [barre([j.jambes[1][1][0] - 8, j.jambes[1][1][1] - 5.5], [j.jambes[1][1][0] + 6, j.jambes[1][1][1] - 5.5], 4)],
    },
    {
      decor: [
        ['r', 66, 83, 14, 5, 1],
        ['L', 36, 76, 60, 76, 5],
        ['l', 48, 78.5, 48, 88],
      ],
      F: [[88, 76, 88, 60]],
    },
  ),
};

/** Silhouette debout, pour les exercices personnels. */
export const VIS_GENERIQUE: Visuel = fixe([], [], { h: H0, t: -90, jambes: JD, bras: [[93, 90]] });

export function visuelDe(visKey?: string): Visuel {
  return (visKey && VIS[visKey]) || VIS_GENERIQUE;
}

/** Position intermédiaire entre deux poses, k de 0 (départ) à 1 (arrivée). */
export function interpoler(a: Pose, b: Pose, k: number): Pose {
  return a.map((pa, i) => pa.map((v, j) => v + ((b[i]?.[j] ?? v) - v) * k));
}

/** Cadre carré serré autour d'une pose (vignettes) : [x, y, côté, côté]. */
export function cadrer(v: Visuel, pose: Pose = v.vignette === 'A' ? v.A : v.B, marge = 3): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  pose.forEach((p, i) => {
    const k = v.traits[i];
    if (k === 'cable') return;
    const r = (k === 'tete' || k === 'charge' ? v.tailles[i] : v.tailles[i] / 2) + EP.halo;
    for (let j = 0; j + 1 < p.length; j += 2) {
      x0 = Math.min(x0, p[j] - r);
      x1 = Math.max(x1, p[j] + r);
      y0 = Math.min(y0, p[j + 1] - r);
      y1 = Math.max(y1, p[j + 1] + r);
    }
  });
  const cote = Math.max(x1 - x0, y1 - y0) + marge * 2;
  return [(x0 + x1) / 2 - cote / 2, (y0 + y1) / 2 - cote / 2, cote, cote];
}

export function pointsDe(pl: number[]): string {
  const s: string[] = [];
  for (let j = 0; j + 1 < pl.length; j += 2) s.push(`${pl[j].toFixed(1)},${pl[j + 1].toFixed(1)}`);
  return s.join(' ');
}
