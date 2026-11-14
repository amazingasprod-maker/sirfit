import type { ExerciseKind, SetType } from './types';

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** espace insécable entre un nombre et son unité : « 62,5 kg » ne se coupe pas en fin de ligne */
const ESPACE_FINE = ' ';
/** espace fine insécable entre les milliers */
const SEPARATEUR_MILLIERS = ' ';

/** 62.5 → « 62,5 » · 1395 → « 1 395 » */
export function fmtNombre(n: number, decimales = 2): string {
  const arrondi = Math.round(n * 10 ** decimales) / 10 ** decimales;
  const [ent, dec] = String(arrondi).split('.');
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);
  return dec ? `${groupes},${dec}` : groupes;
}

export function fmtKg(n: number): string {
  return `${fmtNombre(n)}${ESPACE_FINE}kg`;
}

/** « 62,5 » → 62.5 · chaîne vide ou invalide → null */
export function parseNombre(txt: string): number | null {
  const propre = txt.replace(/\s/g, '').replace(',', '.');
  if (propre === '' || propre === '.') return null;
  const n = Number(propre);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** durée d'une séance, en minutes → « 48 min » · « 1 h 05 » */
export function fmtDuree(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}${ESPACE_FINE}min`;
  return `${Math.floor(m / 60)}${ESPACE_FINE}h${ESPACE_FINE}${String(m % 60).padStart(2, '0')}`;
}

/** chrono en secondes → « 18:19 » · « 1:02:03 » */
export function fmtChrono(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/** temps de repos → « 45 s » · « 1 min 30 » · « 2 min » */
export function fmtRepos(secondes: number): string {
  if (secondes <= 0) return 'Sans minuteur';
  if (secondes < 60) return `${secondes}${ESPACE_FINE}s`;
  const m = Math.floor(secondes / 60);
  const r = secondes % 60;
  return r === 0 ? `${m}${ESPACE_FINE}min` : `${m}${ESPACE_FINE}min${ESPACE_FINE}${String(r).padStart(2, '0')}`;
}

function memeJour(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** « Aujourd'hui » · « Hier » · « jeu. 12 nov. » · « jeu. 12 nov. 2025 » */
export function fmtDate(ts: number, ref: number = Date.now()): string {
  const d = new Date(ts);
  const r = new Date(ref);
  if (memeJour(d, r)) return "Aujourd'hui";
  const hier = new Date(r);
  hier.setDate(hier.getDate() - 1);
  if (memeJour(d, hier)) return 'Hier';
  const base = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  return d.getFullYear() === r.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function fmtHeure(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** étiquette courte d'un lundi de semaine → « 3 nov. » */
export function fmtJourMois(d: Date): string {
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** valeur pour un <input type="datetime-local"> en heure locale */
export function versChampDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** une série en clair → « 80 kg × 5 » · « 12 reps » · « +10 kg × 8 » · « 45 s » */
export function fmtSerie(s: { kg: number | null; reps: number | null }, kind: ExerciseKind): string {
  const reps = s.reps ?? 0;
  const kg = s.kg !== null && s.kg > 0 ? `${fmtNombre(s.kg)}${ESPACE_FINE}kg` : null;
  if (kind === 'duree') return kg ? `${kg} · ${reps}${ESPACE_FINE}s` : `${reps}${ESPACE_FINE}s`;
  if (kind === 'corps') return kg ? `+${kg} × ${reps}` : `${reps} reps`;
  return kg ? `${kg} × ${reps}` : `${reps} reps`;
}

/** étiquette d'une série : son numéro, ou une lettre pour les séries particulières */
export function etiquetteSerie(type: SetType, numero: number | null): string {
  if (type === 'echauffement') return 'É';
  if (type === 'degressive') return 'D';
  if (type === 'echec') return 'X';
  return String(numero ?? '');
}

export const TYPES_DE_SERIE: { type: SetType; label: string; detail: string }[] = [
  { type: 'normale', label: 'Normale', detail: 'Une série de travail, numérotée' },
  { type: 'echauffement', label: 'Échauffement', detail: 'Ne compte ni dans le volume ni dans les séries' },
  { type: 'degressive', label: 'Dégressive', detail: 'Enchaînée sans repos avec une charge plus légère' },
  { type: 'echec', label: "Jusqu'à l'échec", detail: 'Aucune répétition de plus possible' },
];

/** texte sans accents ni majuscules, pour la recherche */
export function normaliser(txt: string): string {
  return txt
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function pluriel(n: number, singulier: string, plurielMot?: string): string {
  return `${n} ${n > 1 ? (plurielMot ?? `${singulier}s`) : singulier}`;
}
