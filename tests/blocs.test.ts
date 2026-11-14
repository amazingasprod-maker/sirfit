import { describe, expect, it } from 'vitest';
import {
  ajouterExercices,
  ajouterSerie,
  basculerSuperset,
  cocherSerie,
  deplacerBloc,
  draftDepuisRoutine,
  draftVide,
  majSerie,
  numeros,
  remplacerExercice,
  reporterDansRoutine,
  retirerBloc,
  retirerSerie,
  terminer,
} from '../src/domain/blocs';
import { indexPrecedents, seriesPrecedentes } from '../src/domain/previous';
import type { SetEntry, Workout } from '../src/domain/types';
import { routinesDeBase } from '../src/db/seed';

const [haut] = routinesDeBase(0);
const fait = (kg: number | null, reps: number, type: SetEntry['type'] = 'normale'): SetEntry => ({ type, kg, reps, done: true });

describe('cocher une série', () => {
  it('valide avec les valeurs saisies', () => {
    let blocs = ajouterExercices([], ['dc'], 90);
    const u = blocs[0].uid;
    blocs = majSerie(blocs, u, 0, { kg: 62.5, reps: 8 });
    const r = cocherSerie(blocs, u, 0);
    expect(r).toMatchObject({ ok: true, validee: true });
    expect(r.blocs[0].sets[0]).toEqual({ type: 'normale', kg: 62.5, reps: 8, done: true });
  });

  it('un champ vide reprend la valeur de la dernière fois', () => {
    const blocs = ajouterExercices([], ['dc'], 90);
    const r = cocherSerie(blocs, blocs[0].uid, 0, fait(30, 8));
    expect(r.blocs[0].sets[0]).toMatchObject({ kg: 30, reps: 8, done: true });
  });

  it('ce qui est saisi passe avant la dernière fois', () => {
    let blocs = ajouterExercices([], ['dc'], 90);
    blocs = majSerie(blocs, blocs[0].uid, 0, { kg: 32.5 });
    const r = cocherSerie(blocs, blocs[0].uid, 0, fait(30, 8));
    expect(r.blocs[0].sets[0]).toMatchObject({ kg: 32.5, reps: 8 });
  });

  it('refuse une série sans répétitions', () => {
    const blocs = ajouterExercices([], ['dc'], 90);
    const r = cocherSerie(blocs, blocs[0].uid, 0);
    expect(r.ok).toBe(false);
    expect(r.blocs[0].sets[0].done).toBe(false);
  });

  it('décoche une série déjà validée sans toucher à ses valeurs', () => {
    let blocs = ajouterExercices([], ['dc'], 90);
    blocs = majSerie(blocs, blocs[0].uid, 0, { kg: 30, reps: 8, done: true });
    const r = cocherSerie(blocs, blocs[0].uid, 0);
    expect(r).toMatchObject({ ok: true, validee: false });
    expect(r.blocs[0].sets[0]).toEqual({ type: 'normale', kg: 30, reps: 8, done: false });
  });
});

describe('séries et blocs', () => {
  it('une nouvelle série reprend les valeurs de la dernière', () => {
    let blocs = ajouterExercices([], ['dc'], 90);
    const u = blocs[0].uid;
    blocs = majSerie(blocs, u, 2, { kg: 40, reps: 6, done: true });
    blocs = ajouterSerie(blocs, u);
    expect(blocs[0].sets).toHaveLength(4);
    expect(blocs[0].sets[3]).toEqual({ type: 'normale', kg: 40, reps: 6, done: false });
  });

  it('retire la bonne série', () => {
    let blocs = ajouterExercices([], ['dc'], 90);
    const u = blocs[0].uid;
    blocs = majSerie(blocs, u, 1, { kg: 99 });
    blocs = retirerSerie(blocs, u, 1);
    expect(blocs[0].sets).toHaveLength(2);
    expect(blocs[0].sets.some((s) => s.kg === 99)).toBe(false);
  });

  it('les échauffements ne prennent pas de numéro', () => {
    expect(numeros([fait(20, 10, 'echauffement'), fait(40, 8), fait(40, 8, 'echec'), fait(30, 10, 'degressive')])).toEqual([null, 1, 2, 3]);
  });

  it('déplacer aux extrémités ne change rien', () => {
    const blocs = ajouterExercices([], ['dc', 'row', 'dm'], 90);
    expect(deplacerBloc(blocs, blocs[0].uid, -1)).toBe(blocs);
    expect(deplacerBloc(blocs, blocs[2].uid, 1)).toBe(blocs);
    expect(deplacerBloc(blocs, blocs[0].uid, 1).map((b) => b.exerciseId)).toEqual(['row', 'dc', 'dm']);
  });

  it('remplacer un exercice garde les séries et efface les charges', () => {
    let blocs = ajouterExercices([], ['dc'], 90);
    blocs = majSerie(blocs, blocs[0].uid, 0, { kg: 30, reps: 8, done: true });
    blocs = remplacerExercice(blocs, blocs[0].uid, 'dcb');
    expect(blocs[0].exerciseId).toBe('dcb');
    expect(blocs[0].sets[0]).toEqual({ type: 'normale', kg: null, reps: 8, done: false });
  });
});

describe('super sets', () => {
  it('lie un bloc au suivant, puis le délie', () => {
    let blocs = ajouterExercices([], ['dc', 'row', 'dm'], 90);
    blocs = basculerSuperset(blocs, blocs[0].uid);
    expect(blocs[0].supersetId).toBeTruthy();
    expect(blocs[1].supersetId).toBe(blocs[0].supersetId);
    expect(blocs[2].supersetId).toBeNull();
    blocs = basculerSuperset(blocs, blocs[0].uid);
    expect(blocs.every((b) => b.supersetId === null)).toBe(true);
  });

  it('le dernier bloc ne peut pas ouvrir un super set', () => {
    const blocs = ajouterExercices([], ['dc', 'row'], 90);
    expect(basculerSuperset(blocs, blocs[1].uid)).toBe(blocs);
  });

  it('un membre resté seul perd son étiquette', () => {
    let blocs = ajouterExercices([], ['dc', 'row', 'dm'], 90);
    blocs = basculerSuperset(blocs, blocs[0].uid);
    blocs = retirerBloc(blocs, blocs[1].uid);
    expect(blocs.every((b) => b.supersetId === null)).toBe(true);
  });

  it('séparer deux membres en déplaçant un bloc défait le super set', () => {
    let blocs = ajouterExercices([], ['dc', 'row', 'dm'], 90);
    blocs = basculerSuperset(blocs, blocs[0].uid);
    blocs = deplacerBloc(blocs, blocs[1].uid, 1); // dc, dm, row
    expect(blocs.every((b) => b.supersetId === null)).toBe(true);
  });
});

describe('terminer une séance', () => {
  it('ne garde que les séries cochées et les exercices travaillés', () => {
    let d = draftDepuisRoutine(haut, 1_000);
    const [a, b] = d.exercises;
    let blocs = majSerie(d.exercises, a.uid, 0, { kg: 30, reps: 8, done: true });
    blocs = majSerie(blocs, a.uid, 1, { kg: 30, reps: 7, done: true });
    blocs = majSerie(blocs, b.uid, 0, { kg: 20, reps: 10, done: true });
    d = { ...d, exercises: blocs };
    const w = terminer(d, 1_000 + 50 * 60000, '  Ma séance ', ' RAS ')!;
    expect(w.titre).toBe('Ma séance');
    expect(w.note).toBe('RAS');
    expect(w.exercises.map((x) => x.exerciseId)).toEqual(['dc', 'row']);
    expect(w.exercises.map((x) => x.sets.length)).toEqual([2, 1]);
    expect(w.partie).toBe('haut');
    expect(w.routineId).toBe(haut.id);
    expect(w.fin - w.debut).toBe(50 * 60000);
  });

  it('rien de coché : pas de séance enregistrée', () => {
    expect(terminer(draftDepuisRoutine(haut, 1_000), 2_000, 'x', '')).toBeNull();
    expect(terminer(draftVide(1_000), 2_000, 'x', '')).toBeNull();
  });

  it('un titre vide retombe sur un titre par défaut', () => {
    let d = draftVide(new Date('2026-11-12T07:30:00').getTime());
    let blocs = ajouterExercices([], ['dc'], 90);
    blocs = majSerie(blocs, blocs[0].uid, 0, { kg: 30, reps: 8, done: true });
    d = { ...d, exercises: blocs };
    expect(terminer(d, d.debut + 60000, '   ', '')!.titre).toBe('Séance du matin');
  });
});

describe('reporter les charges dans la routine', () => {
  const seance = (exercises: Workout['exercises']): Workout => ({
    id: 'w',
    titre: 'T',
    debut: 0,
    fin: 1,
    note: '',
    routineId: haut.id,
    partie: 'haut',
    exercises,
  });
  const bloc = (exerciseId: string, sets: SetEntry[]) => ({ uid: `w-${exerciseId}`, exerciseId, note: '', reposS: 90, supersetId: null, sets });

  it('met à jour les séries faites et laisse les autres', () => {
    const r = reporterDansRoutine(haut, seance([bloc('dc', [fait(30, 8), fait(32.5, 6)])]), 99);
    const dc = r.exercises[0];
    expect(dc.sets).toHaveLength(4);
    expect(dc.sets[0]).toEqual({ type: 'normale', kg: 30, reps: 8, done: false });
    expect(dc.sets[1]).toEqual({ type: 'normale', kg: 32.5, reps: 6, done: false });
    expect(dc.sets[2]).toEqual({ type: 'normale', kg: null, reps: 8, done: false });
    expect(r.updatedAt).toBe(99);
  });

  it('un exercice sauté reste tel quel', () => {
    const r = reporterDansRoutine(haut, seance([bloc('dc', [fait(30, 8)])]), 99);
    expect(r.exercises[1]).toEqual(haut.exercises[1]);
  });

  it('une série faite en plus est ajoutée', () => {
    const r = reporterDansRoutine(haut, seance([bloc('curl', [fait(10, 12), fait(10, 12), fait(10, 12), fait(8, 15, 'degressive')])]), 99);
    const curl = r.exercises[4];
    expect(curl.sets).toHaveLength(4);
    expect(curl.sets[3]).toEqual({ type: 'degressive', kg: 8, reps: 15, done: false });
  });

  it("un exercice ajouté pendant la séance n'entre pas dans la routine", () => {
    const r = reporterDansRoutine(haut, seance([bloc('pom', [fait(null, 20)])]), 99);
    expect(r.exercises.map((b) => b.exerciseId)).toEqual(haut.exercises.map((b) => b.exerciseId));
  });

  it("la routine d'origine n'est pas modifiée", () => {
    reporterDansRoutine(haut, seance([bloc('dc', [fait(30, 8)])]), 99);
    expect(haut.exercises[0].sets[0].kg).toBeNull();
  });
});

describe('colonne « précédent »', () => {
  const w = (id: string, debut: number, exerciseId: string, sets: SetEntry[]): Workout => ({
    id,
    titre: id,
    debut,
    fin: debut + 1,
    note: '',
    routineId: null,
    partie: null,
    exercises: [{ uid: id, exerciseId, note: '', reposS: 90, supersetId: null, sets }],
  });
  const ws = [w('a', 100, 'dc', [fait(30, 8)]), w('b', 300, 'dc', [fait(35, 6), fait(35, 5)]), w('c', 200, 'row', [fait(20, 10)])];

  it('rend les séries de la séance la plus récente', () => {
    expect(seriesPrecedentes(ws, 'dc')).toEqual([fait(35, 6), fait(35, 5)]);
  });
  it('ignore les séances postérieures à la date donnée', () => {
    expect(seriesPrecedentes(ws, 'dc', 300)).toEqual([fait(30, 8)]);
  });
  it('rien pour un exercice jamais travaillé', () => {
    expect(seriesPrecedentes(ws, 'sq')).toBeNull();
  });
  it("l'index donne le même résultat que la recherche unitaire", () => {
    const idx = indexPrecedents(ws);
    expect(idx.get('dc')).toEqual(seriesPrecedentes(ws, 'dc'));
    expect(idx.get('row')).toEqual(seriesPrecedentes(ws, 'row'));
    expect(idx.has('sq')).toBe(false);
  });
  it('une séance où rien n\'a été coché ne compte pas', () => {
    const avecVide = [...ws, w('d', 400, 'dc', [{ type: 'normale', kg: 50, reps: 5, done: false }])];
    expect(seriesPrecedentes(avecVide, 'dc')).toEqual([fait(35, 6), fait(35, 5)]);
    expect(indexPrecedents(avecVide).get('dc')).toEqual([fait(35, 6), fait(35, 5)]);
  });
});
