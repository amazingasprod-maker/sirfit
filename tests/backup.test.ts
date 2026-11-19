import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { SportDB, completerBibliotheque, completerRoutines, lireSettings, majSettings } from '../src/db/schema';
import { SauvegardeInvalide, exporter, importer, toutEffacer, valider } from '../src/db/backup';
import { exercicesDeBase } from '../src/db/seed';
import type { Workout } from '../src/domain/types';

let compteur = 0;
const ouvertes: SportDB[] = [];
function nouvelleBase(): SportDB {
  const b = new SportDB(`test-${++compteur}`);
  ouvertes.push(b);
  return b;
}

afterEach(async () => {
  for (const b of ouvertes.splice(0)) await b.delete();
});

const seance: Workout = {
  id: 'w1',
  titre: 'Haut du corps',
  debut: 1_000,
  fin: 3_601_000,
  note: 'Bonne forme',
  routineId: 'routine-haut',
  partie: 'haut',
  exercises: [
    {
      uid: 'b1',
      exerciseId: 'dc',
      note: '',
      reposS: 90,
      supersetId: null,
      sets: [
        { type: 'echauffement', kg: 20, reps: 12, done: true },
        { type: 'normale', kg: 32.5, reps: 8, done: true },
      ],
    },
  ],
};

describe('première ouverture', () => {
  it('installe la bibliothèque, les quatre routines et les réglages', async () => {
    const base = nouvelleBase();
    expect(await base.exercises.count()).toBe(exercicesDeBase().length);
    expect((await base.routines.orderBy('ordre').toArray()).map((r) => r.titre)).toEqual(['Haut du corps', 'Bas du corps', 'Pectoraux 30 min', 'Jambes 20 min']);
    expect((await lireSettings(base)).reposDefautS).toBe(90);
  });

  it('la bibliothèque a des identifiants uniques et chaque routine pointe vers un exercice existant', async () => {
    const exos = exercicesDeBase();
    expect(new Set(exos.map((e) => e.id)).size).toBe(exos.length);
    const base = nouvelleBase();
    const ids = new Set(exos.map((e) => e.id));
    for (const r of await base.routines.toArray()) for (const b of r.exercises) expect(ids.has(b.exerciseId)).toBe(true);
  });

  it('complète une bibliothèque ancienne sans toucher aux exercices personnels', async () => {
    const base = nouvelleBase();
    await base.exercises.delete('dcb');
    await base.exercises.add({ id: 'perso-1', nom: 'Mon exercice', groupe: 'Dos', partie: 'haut', materiel: 'Autre', kind: 'charge', custom: true });
    expect(await completerBibliotheque(base)).toBe(1);
    expect(await base.exercises.get('dcb')).toBeTruthy();
    expect(await base.exercises.get('perso-1')).toBeTruthy();
    expect(await completerBibliotheque(base)).toBe(0);
  });

  it('remet à jour le pictogramme des exercices de base, jamais celui des exercices personnels', async () => {
    const base = nouvelleBase();
    await base.exercises.update('trac', { visKey: undefined });
    await base.exercises.update('dcb', { visKey: 'ancien', nom: 'Mon développé' });
    await base.exercises.add({ id: 'perso-2', nom: 'Perso', groupe: 'Dos', partie: 'haut', materiel: 'Autre', kind: 'charge', custom: true, visKey: 'row' });
    expect(await completerBibliotheque(base)).toBe(0);
    expect((await base.exercises.get('trac'))?.visKey).toBe('trac');
    const dcb = await base.exercises.get('dcb');
    expect(dcb?.visKey).toBe('dc');
    expect(dcb?.nom).toBe('Mon développé');
    expect((await base.exercises.get('perso-2'))?.visKey).toBe('row');
  });
});

describe('sauvegarde', () => {
  it('aller-retour sans perte, en passant par du JSON', async () => {
    const source = nouvelleBase();
    await source.workouts.add(seance);
    await source.exercises.add({ id: 'perso-1', nom: 'Mon exercice', groupe: 'Dos', partie: 'haut', materiel: 'Autre', kind: 'charge', custom: true });
    await majSettings({ nom: 'Test', reposDefautS: 120 }, source);
    const fichier = JSON.parse(JSON.stringify(await exporter(source, 42)));

    const cible = nouvelleBase();
    await cible.workouts.add({ ...seance, id: 'a-ecraser' });
    await importer(fichier, cible);

    expect(await cible.workouts.toArray()).toEqual([seance]);
    expect(await cible.exercises.count()).toBe(exercicesDeBase().length + 1);
    expect(await cible.routines.count()).toBe(4);
    expect(await lireSettings(cible)).toMatchObject({ nom: 'Test', reposDefautS: 120 });
    expect(await exporter(cible, 42)).toEqual(await exporter(source, 42));
  });

  it("refuse un fichier étranger sans rien modifier", async () => {
    const base = nouvelleBase();
    await base.workouts.add(seance);
    await expect(importer({ hello: 'world' }, base)).rejects.toBeInstanceOf(SauvegardeInvalide);
    await expect(importer('pas du json', base)).rejects.toBeInstanceOf(SauvegardeInvalide);
    expect(await base.workouts.count()).toBe(1);
  });

  it('refuse une sauvegarde abîmée', () => {
    const bon = { format: 'sir-fit', version: 1, exporteLe: 0, exercises: [], routines: [], workouts: [], settings: {} };
    expect(() => valider(bon)).not.toThrow();
    expect(() => valider({ ...bon, workouts: [{ id: 'x' }] })).toThrow(SauvegardeInvalide);
    expect(() => valider({ ...bon, routines: 'non' })).toThrow(SauvegardeInvalide);
    expect(() => valider({ ...bon, version: 99 })).toThrow(SauvegardeInvalide);
  });

  it('une sauvegarde sans réglages retrouve les réglages par défaut', () => {
    const s = valider({ format: 'sir-fit', version: 1, exercises: [], routines: [], workouts: [] });
    expect(s.settings).toMatchObject({ id: 'app', reposDefautS: 90, theme: 'sombre' });
  });

  it('tout effacer remet la base dans son état de départ', async () => {
    const base = nouvelleBase();
    await base.workouts.add(seance);
    await base.routines.clear();
    await toutEffacer(base);
    expect(await base.workouts.count()).toBe(0);
    expect(await base.routines.count()).toBe(4);
    expect(await base.exercises.count()).toBe(exercicesDeBase().length);
    // rien à reproposer après un effacement : la routine pectoraux y est déjà
    expect(await completerRoutines(base)).toBe(0);
  });
});

describe('routines ajoutées après coup', () => {
  it("une installation d'avant reçoit les routines pectoraux et jambes une fois, en fin de liste", async () => {
    const base = nouvelleBase();
    await base.routines.bulkDelete(['routine-pecs', 'routine-jambes']);
    await majSettings({ routinesProposees: [] }, base);
    expect(await completerRoutines(base)).toBe(2);
    const routines = await base.routines.orderBy('ordre').toArray();
    expect(routines.map((r) => r.id)).toEqual(['routine-haut', 'routine-bas', 'routine-pecs', 'routine-jambes']);
    expect(await completerRoutines(base)).toBe(0);
  });

  it('une routine supprimée par Lamine ne revient pas', async () => {
    const base = nouvelleBase();
    await base.routines.count();
    await base.routines.delete('routine-pecs');
    expect(await completerRoutines(base)).toBe(0);
    expect(await base.routines.get('routine-pecs')).toBeUndefined();
  });

  it("garde l'ordre choisi : ajoutée après la dernière routine existante", async () => {
    const base = nouvelleBase();
    await base.routines.bulkDelete(['routine-pecs', 'routine-jambes']);
    await base.routines.update('routine-bas', { ordre: 7 });
    await majSettings({ routinesProposees: [] }, base);
    await completerRoutines(base);
    expect((await base.routines.get('routine-pecs'))?.ordre).toBe(8);
  });
});
