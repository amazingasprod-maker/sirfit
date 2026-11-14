import type { Partie, WarmupItem } from './types';

// Mini-échauffement par partie du corps, repris de Sir_Fit.
export const ECHAUFFEMENTS: Record<Partie, string[]> = {
  haut: [
    '2 min de cardio léger (corde, rameur ou marche rapide)',
    '10 cercles de bras dans chaque sens',
    "10 rotations d'épaules avec élastique ou bâton",
    '1 série légère du premier exercice (environ 50 % de ta charge)',
  ],
  bas: [
    '2 min de cardio léger (vélo ou marche rapide)',
    '15 squats au poids du corps',
    '10 fentes dynamiques (5 par jambe)',
    '1 série légère du premier exercice (environ 50 % de ta charge)',
  ],
};

export function echauffementPour(partie: Partie | null): WarmupItem[] | null {
  if (!partie) return null;
  return ECHAUFFEMENTS[partie].map((txt) => ({ txt, fait: false }));
}
