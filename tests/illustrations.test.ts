import { describe, expect, it } from 'vitest';
import { exercicesDeBase } from '../src/db/seed';
import { CADRES, ILLUSTRATION } from '../src/features/exercices/illustrations';
import licence from '../public/illustrations/LICENCE.md?raw';

/** contenu des fichiers, par chemin relatif ("../public/illustrations/<slug>/<n>.svg") */
const FICHIERS = import.meta.glob<string>('../public/illustrations/*/*.svg', { query: '?raw', import: 'default', eager: true });
const fichier = (slug: string, n: number) => FICHIERS[`../public/illustrations/${slug}/${n}.svg`];

/** exercices sans équivalent dans la banque : ils gardent le pictogramme dessiné par l'app */
const SANS = ['pull'];

describe('illustrations', () => {
  it('chaque exercice de base a son illustration, sauf ceux listés à part', () => {
    const manquants = exercicesDeBase()
      .filter((e) => !ILLUSTRATION[e.id])
      .map((e) => e.id);
    expect(manquants).toEqual(SANS);
  });

  it('chaque illustration a ses trois poses et ses cadres', () => {
    for (const slug of new Set(Object.values(ILLUSTRATION))) {
      for (const n of [1, 2, 3]) expect(fichier(slug, n), `${slug} ${n}`).toBeTruthy();
      const c = CADRES[slug];
      expect(c, slug).toBeTruthy();
      for (const [x, y, cote] of [c.v, c.f]) {
        expect(cote, slug).toBeGreaterThan(50);
        expect(x + cote / 2, slug).toBeGreaterThan(0);
        expect(y + cote / 2, slug).toBeLessThan(512);
      }
    }
  });

  it('les fichiers ne contiennent que du dessin, et la mention de licence est là', () => {
    for (const [chemin, svg] of Object.entries(FICHIERS)) {
      expect(svg, chemin).not.toMatch(/<script|href=|on[a-z]+=|<image|<style/i);
    }
    expect(licence).toContain('CC BY-SA 4.0');
  });
});
