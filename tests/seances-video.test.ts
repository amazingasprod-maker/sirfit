import { describe, expect, it } from 'vitest';
import { exercicesDeBase, routinesDeBase } from '../src/db/seed';
import { REPOS_FINITION, ajouterFinition, draftDepuisRoutine, nettoyerSupersets, terminer } from '../src/domain/blocs';
import { adapterAuLieu } from '../src/domain/lieu';
import { kindDepuis } from '../src/domain/stats';

const exos = exercicesDeBase();
const kindDe = kindDepuis(exos);
const pecs = routinesDeBase(0).find((r) => r.id === 'routine-pecs')!;
const jambes = routinesDeBase(0).find((r) => r.id === 'routine-jambes')!;

describe('routine Pectoraux 30 min (vidéo du 19/11)', () => {
  it('suit la séance : giant set 20/15/10, un exercice lourd, super set 10/10', () => {
    expect(pecs.partie).toBe('haut');
    const resume = pecs.exercises.map((b) => [b.exerciseId, b.sets.length, b.sets[0].reps, b.reposS]);
    expect(resume).toEqual([
      ['ecpb', 2, 20, 30],
      ['dcm', 2, 15, 30],
      ['ecari', 2, 10, 180],
      ['dcim', 2, 10, 180],
      ['ecp', 2, 10, 30],
      ['pecbas', 2, 10, 180],
    ]);
  });

  it('deux super sets, et le développé incliné seul entre les deux', () => {
    const ids = pecs.exercises.map((b) => b.supersetId);
    expect(ids).toEqual(['pecs-a', 'pecs-a', 'pecs-a', null, 'pecs-c', 'pecs-c']);
    expect(nettoyerSupersets(pecs.exercises)).toEqual(pecs.exercises);
  });

  it('tous ses exercices existent dans la bibliothèque, et les notes sont sans tiret long', () => {
    const connus = new Set(exos.map((e) => e.id));
    for (const id of [...pecs.exercises.map((b) => b.exerciseId), ...(pecs.finitions ?? [])]) expect(connus.has(id), id).toBe(true);
    for (const b of pecs.exercises) {
      expect(b.note, b.exerciseId).not.toMatch(/[–—]/);
      expect(b.note.length, b.exerciseId).toBeLessThanOrEqual(40);
    }
  });
});

describe('finitions au choix en fin de séance', () => {
  it('la séance lancée propose les deux finitions, sans les ajouter', () => {
    const d = draftDepuisRoutine(pecs, 0);
    expect(d.finitions).toEqual(['dips', 'pom']);
    expect(d.exercises.some((b) => b.exerciseId === 'dips' || b.exerciseId === 'pom')).toBe(false);
  });

  it("en prendre une l'ajoute en fin de séance : une série à l'échec, l'autre reste proposée", () => {
    const d = ajouterFinition(draftDepuisRoutine(pecs, 0), 'dips');
    const der = d.exercises[d.exercises.length - 1];
    expect(der.exerciseId).toBe('dips');
    expect(der.sets).toEqual([{ type: 'echec', kg: null, reps: null, done: false }]);
    expect(der.reposS).toBe(REPOS_FINITION);
    expect(der.supersetId).toBeNull();
    expect(d.finitions).toEqual(['pom']);
    // la même finition ne s'ajoute pas deux fois
    expect(ajouterFinition(d, 'dips')).toBe(d);
  });

  it('une finition non faite ne laisse aucune trace dans la séance enregistrée', () => {
    const d = ajouterFinition(draftDepuisRoutine(pecs, 0), 'pom');
    const coche = { ...d, exercises: d.exercises.map((b, i) => (i === 0 ? { ...b, sets: b.sets.map((s) => ({ ...s, kg: 10, done: true })) } : b)) };
    const w = terminer(coche, 1, 'Pecs', '');
    expect(w?.exercises.map((b) => b.exerciseId)).toEqual(['ecpb']);
  });

  it('à la maison : les dips deviennent des dips sur banc, les pompes restent', () => {
    const { routine } = adapterAuLieu(pecs, 'maison', exos, kindDe);
    expect(routine.finitions).toEqual(['dipsb', 'pom']);
    expect(adapterAuLieu(pecs, 'salle', exos, kindDe).routine.finitions).toEqual(['dips', 'pom']);
  });
});

describe('routine Jambes 20 min (vidéo du 19/11)', () => {
  it('giant set 20/15/10 deux fois, puis pendule squat et hack squat, une série chacun', () => {
    expect(jambes.partie).toBe('bas');
    const resume = jambes.exercises.map((b) => [b.exerciseId, b.sets.length, b.sets[0].reps, b.reposS, b.supersetId]);
    expect(resume).toEqual([
      ['legext', 2, 20, 30, 'jambes-a'],
      ['pre', 2, 15, 30, 'jambes-a'],
      ['sqm', 2, 10, 180, 'jambes-a'],
      ['pend', 1, 10, 180, null],
      ['hack', 1, 10, 0, null],
    ]);
  });

  it('exercices connus, notes courtes et sans tiret long', () => {
    const connus = new Set(exos.map((e) => e.id));
    for (const id of [...jambes.exercises.map((b) => b.exerciseId), ...(jambes.finitions ?? [])]) expect(connus.has(id), id).toBe(true);
    for (const b of jambes.exercises) {
      expect(b.note, b.exerciseId).not.toMatch(/[–—]/);
      expect(b.note.length, b.exerciseId).toBeLessThanOrEqual(40);
    }
  });

  it('les mollets sont proposés en fin de séance, et à la maison avec des haltères', () => {
    expect(draftDepuisRoutine(jambes, 0).finitions).toEqual(['molm']);
    expect(adapterAuLieu(jambes, 'maison', exos, kindDe).routine.finitions).toEqual(['mol']);
  });

  it('à la maison, les 5 exercices ont un remplaçant faisable, sans doublon', () => {
    const { routine } = adapterAuLieu(jambes, 'maison', exos, kindDe);
    const ids = routine.exercises.map((b) => b.exerciseId);
    expect(ids).toEqual(['sqbul', 'sq', 'sqf', 'fen', 'fens']);
  });
});
