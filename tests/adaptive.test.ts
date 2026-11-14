import { describe, expect, it } from 'vitest';
import { estimeBlocs, genSeance, type PlanItem } from '../src/domain/adaptive';
import { draftDepuisPlan, itemsDuPlan } from '../src/domain/blocs';
import { routinesDeBase } from '../src/db/seed';

const [haut, bas] = routinesDeBase(0);

function items(r: typeof haut): PlanItem[] {
  return itemsDuPlan(r);
}

describe('séance adaptée au temps (mêmes résultats que Sir_Fit)', () => {
  it('programme haut : 45 min tiennent en mode complet', () => {
    // 6 min d'échauffement + 2×4×(40+90) + 2×3×(40+75) + 2×3×(40+60) = 2 690 s → 45 min
    const p = genSeance(items(haut), 45)!;
    expect(p.mode).toBe('complet');
    expect(p.estMin).toBe(45);
    expect(p.blocs).toHaveLength(6);
    expect(p.blocs.every((b) => b.type === 'solo')).toBe(true);
  });

  it('60 et 90 min restent en mode complet, sans rien ajouter', () => {
    for (const m of [60, 90]) {
      const p = genSeance(items(haut), m)!;
      expect(p.mode).toBe('complet');
      expect(p.estMin).toBe(45);
    }
  });

  it('programme haut : 30 min passent en express, 3 super sets, 28 min', () => {
    // paires (4,4) (3,3) (3,3) : 5 min + 4×155 + 3×155 + 3×155 = 1 850 s → 31 min, trop long.
    // On retire une série aux deux accessoires du dernier bloc → 300 + 620 + 465 + 310 = 1 695 s → 28 min.
    const p = genSeance(items(haut), 30)!;
    expect(p.mode).toBe('express');
    expect(p.estMin).toBe(28);
    expect(p.blocs.map((b) => b.type)).toEqual(['super', 'super', 'super']);
    expect(p.blocs.map((b) => b.exos.map((x) => x.series))).toEqual([
      [4, 4],
      [3, 3],
      [2, 2],
    ]);
  });

  it('programme bas : 45 min en complet', () => {
    // 360 + 520 + 345 + 520 + 340 + 345 + 255 = 2 685 s → 45 min
    const p = genSeance(items(bas), 45)!;
    expect(p.mode).toBe('complet');
    expect(p.estMin).toBe(45);
  });

  it('ne descend jamais sous 2 séries ni sous 2 blocs', () => {
    for (const r of [haut, bas]) {
      for (const m of [5, 10, 15, 20, 30]) {
        const p = genSeance(items(r), m)!;
        expect(p.blocs.length).toBeGreaterThanOrEqual(2);
        for (const b of p.blocs) for (const x of b.exos) expect(x.series).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("tient dans le temps demandé dès que c'est possible", () => {
    for (const r of [haut, bas]) {
      for (const m of [30, 45, 60, 90]) {
        expect(genSeance(items(r), m)!.estMin).toBeLessThanOrEqual(m);
      }
    }
  });

  it('routine vide : pas de plan', () => {
    expect(genSeance([], 45)).toBeNull();
  });

  it("l'estimation d'un super set compte les transitions et le repos entre les tours", () => {
    const blocs = [{ type: 'super' as const, exos: [{ uid: 'a', series: 3, repos: 90 }, { uid: 'b', series: 2, repos: 90 }] }];
    // 3 tours × (2×(40+15) − 15 + 60) = 465 s → 8 min sans échauffement
    expect(estimeBlocs(blocs, 0)).toBe(8);
  });
});

describe('du plan à la séance en cours', () => {
  it('express : super sets liés, 15 s de transition puis 60 s de repos', () => {
    const p = genSeance(items(haut), 30)!;
    const d = draftDepuisPlan(haut, p, 1_000);
    expect(d.mode).toBe('express');
    expect(d.exercises).toHaveLength(6);
    expect(d.exercises.map((b) => b.reposS)).toEqual([15, 60, 15, 60, 15, 60]);
    expect(d.exercises[0].supersetId).toBeTruthy();
    expect(d.exercises[0].supersetId).toBe(d.exercises[1].supersetId);
    expect(d.exercises[1].supersetId).not.toBe(d.exercises[2].supersetId);
    expect(d.exercises.map((b) => b.sets.length)).toEqual([4, 4, 3, 3, 2, 2]);
    expect(d.echauffement).toHaveLength(4);
    expect(d.routineId).toBe(haut.id);
  });

  it('complet : la routine est jouée telle quelle', () => {
    const p = genSeance(items(haut), 60)!;
    const d = draftDepuisPlan(haut, p, 1_000);
    expect(d.exercises.map((b) => b.reposS)).toEqual([90, 90, 75, 75, 60, 60]);
    expect(d.exercises.every((b) => b.supersetId === null)).toBe(true);
    expect(d.exercises.every((b) => b.sets.every((s) => !s.done))).toBe(true);
  });
});
