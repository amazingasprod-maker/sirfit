import type { ThemeChoice } from '../domain/types';

const CLE = 'sir-fit:theme';
const FONDS = { sombre: '#0c0d0f', clair: '#f2f3f5' } as const;

function resoudre(choix: ThemeChoice): 'sombre' | 'clair' {
  if (choix !== 'systeme') return choix;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
}

/** Applique le thème à la page et à la barre d'état du téléphone. */
export function appliquerTheme(choix: ThemeChoice): void {
  const theme = resoudre(choix);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', FONDS[theme]);
  try {
    // copie lue par index.html avant le premier rendu, pour éviter un éclair de mauvais thème
    localStorage.setItem(CLE, choix);
  } catch {
    // stockage indisponible : le thème sera réappliqué au prochain démarrage
  }
}

/** Suit le réglage du système tant que le choix est « système ». */
export function suivreSysteme(choix: ThemeChoice): () => void {
  if (choix !== 'systeme') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const maj = () => appliquerTheme('systeme');
  mq.addEventListener('change', maj);
  return () => mq.removeEventListener('change', maj);
}
