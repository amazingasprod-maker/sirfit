import { describe, expect, it } from 'vitest';
import { ERREURS, VIS, VIS_GENERIQUE, cadrer, interpoler } from '../src/features/exercices/vis';
import { exercicesDeBase } from '../src/db/seed';

describe('pictogrammes', () => {
  it('chaque exercice de base a son propre dessin', () => {
    const sans = exercicesDeBase().filter((e) => !e.visKey || !VIS[e.visKey]);
    expect(sans.map((e) => e.id)).toEqual([]);
  });

  it('les deux poses de chaque geste se correspondent élément par élément', () => {
    expect(ERREURS).toEqual([]);
    for (const [cle, v] of Object.entries({ ...VIS, generique: VIS_GENERIQUE })) {
      expect(v.A.length, cle).toBe(v.traits.length);
      expect(v.B.length, cle).toBe(v.traits.length);
      expect(v.tailles.length, cle).toBe(v.traits.length);
      v.A.forEach((p, i) => {
        expect(p.length, `${cle} élément ${i}`).toBe(v.B[i].length);
        expect(p.every(Number.isFinite) && v.B[i].every(Number.isFinite), `${cle} élément ${i}`).toBe(true);
      });
    }
  });

  it("chaque geste animé bouge vraiment, avec au moins un muscle en couleur et trois conseils", () => {
    for (const [cle, v] of Object.entries(VIS)) {
      expect(v.traits.includes('cible'), cle).toBe(true);
      expect(v.conseils.length, cle).toBe(3);
      if (v.statique) continue;
      const ecart = v.A.flat().reduce((s, x, i) => s + Math.abs(x - v.B.flat()[i]), 0);
      expect(ecart, cle).toBeGreaterThan(5);
    }
  });

  it('le cadre des vignettes est carré et contient toute la pose', () => {
    for (const [cle, v] of Object.entries(VIS)) {
      const [x, y, w, h] = cadrer(v);
      expect(w, cle).toBe(h);
      expect(w, cle).toBeGreaterThan(20);
      expect(w, cle).toBeLessThan(130);
      const pose = v.vignette === 'A' ? v.A : v.B;
      pose.forEach((p, i) => {
        if (v.traits[i] === 'cable') return;
        for (let j = 0; j + 1 < p.length; j += 2) {
          expect(p[j] >= x && p[j] <= x + w && p[j + 1] >= y && p[j + 1] <= y + h, `${cle} élément ${i}`).toBe(true);
        }
      });
    }
  });

  it("l'interpolation va de la pose de départ à celle d'arrivée", () => {
    const v = VIS.curl;
    expect(interpoler(v.A, v.B, 0)).toEqual(v.A);
    expect(interpoler(v.A, v.B, 1).flat().map((n) => +n.toFixed(6))).toEqual(v.B.flat().map((n) => +n.toFixed(6)));
  });
});
