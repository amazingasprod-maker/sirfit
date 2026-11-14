import { describe, expect, it } from 'vitest';
import { exercicesDeBase, routinesDeBase } from '../src/db/seed';
import { adapterAuLieu, faisableALaMaison } from '../src/domain/lieu';
import { kindDepuis } from '../src/domain/stats';
import type { Bloc, Routine } from '../src/domain/types';

const exos = exercicesDeBase();
const kindDe = kindDepuis(exos);
const bloc = (exerciseId: string, kg: number | null = 40, reps = 10): Bloc => ({
  uid: exerciseId,
  exerciseId,
  note: '',
  reposS: 75,
  supersetId: null,
  sets: [
    { type: 'normale', kg, reps, done: false },
    { type: 'normale', kg, reps, done: false },
  ],
});
const routine = (...ids: string[]): Routine => ({ id: 'r', titre: 'Haut du corps', note: '', partie: 'haut', ordre: 0, exercises: ids.map((i) => bloc(i)), createdAt: 0, updatedAt: 0 });

describe('séance à la maison', () => {
  it('à la salle, la routine ne change pas', () => {
    const r = routine('tir', 'dcm');
    expect(adapterAuLieu(r, 'salle', exos, kindDe).routine).toBe(r);
  });

  it('remplace les exercices impossibles par un équivalent du même muscle, charges vidées', () => {
    const { routine: m, changes } = adapterAuLieu(routine('dcb', 'tir', 'curl'), 'maison', exos, kindDe);
    expect(m.exercises.map((b) => b.exerciseId)).toEqual(['pom', 'row', 'curl']);
    expect(changes).toEqual([
      { de: 'dcb', vers: 'pom' },
      { de: 'tir', vers: 'row' },
    ]);
    expect(m.exercises[1].sets.every((s) => s.kg === null && s.reps === 10)).toBe(true);
    // l'exercice faisable garde ses charges
    expect(m.exercises[2].sets[0].kg).toBe(40);
    expect(m.titre).toBe('Haut du corps (maison)');
  });

  it('ne met jamais deux fois le même exercice : passe au remplaçant suivant, sinon retire', () => {
    const { routine: m, changes } = adapterAuLieu(routine('tir', 'rowm', 'trac', 'dc', 'pec'), 'maison', exos, kindDe);
    expect(m.exercises.map((b) => b.exerciseId)).toEqual(['row', 'rowb', 'pom']);
    expect(changes.filter((c) => c.vers === null).map((c) => c.de)).toEqual(['trac', 'pec']);
  });

  it('passe des répétitions aux secondes quand le remplaçant est tenu (roulette → gainage)', () => {
    const { routine: m } = adapterAuLieu(routine('roue'), 'maison', exos, kindDe);
    expect(m.exercises[0].exerciseId).toBe('gai');
    expect(m.exercises[0].sets[0].reps).toBe(40);
  });

  it('chaque exercice de la bibliothèque est faisable à la maison ou a un remplaçant faisable', () => {
    for (const e of exos) {
      if (faisableALaMaison(e)) continue;
      const { routine: m, changes } = adapterAuLieu(routine(e.id), 'maison', exos, kindDe);
      expect(changes[0]?.vers, e.id).toBeTruthy();
      expect(faisableALaMaison(exos.find((x) => x.id === m.exercises[0].exerciseId)!), e.id).toBe(true);
    }
  });

  it('les routines de départ restent complètes à la maison', () => {
    for (const r of routinesDeBase(0)) {
      const { routine: m } = adapterAuLieu(r, 'maison', exos, kindDe);
      expect(m.exercises.length, r.titre).toBeGreaterThan(0);
      expect(new Set(m.exercises.map((b) => b.exerciseId)).size, r.titre).toBe(m.exercises.length);
    }
  });

  it('exercice personnel : selon son matériel', () => {
    expect(faisableALaMaison({ id: 'perso-1', materiel: 'Haltères', custom: true })).toBe(true);
    expect(faisableALaMaison({ id: 'perso-2', materiel: 'Poulie', custom: true })).toBe(false);
  });
});
