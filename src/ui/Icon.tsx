import type { ReactNode } from 'react';

// Un seul jeu d'icônes, dessiné pour l'app : grille 24, trait 1,75, bouts ronds.
const TRACES: Record<string, ReactNode> = {
  profil: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6" />
    </>
  ),
  haltere: <path d="M3 9.5v5M6.5 7v10M17.5 7v10M21 9.5v5M6.5 12h11" />,
  liste: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.6" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  coche: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  retour: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  suivant: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  bas: <path d="M5.5 9.5L12 16l6.5-6.5" />,
  plusOptions: (
    <>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  chrono: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 9.5v4l2.5 2M9.5 3h5M12 3v3.5" />
    </>
  ),
  horloge: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  reglages: (
    <>
      <path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20" />
      <circle cx="15" cy="7" r="2.5" />
      <circle cx="9" cy="17" r="2.5" />
    </>
  ),
  corbeille: <path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10 11v5M14 11v5" />,
  crayon: <path d="M4.5 19.5l1-4L16 5a1.8 1.8 0 012.6 0l.4.4a1.8 1.8 0 010 2.6L8.5 18.5l-4 1zM14.5 6.5l3 3" />,
  copier: (
    <>
      <rect x="8" y="8" width="11.5" height="11.5" rx="2" />
      <path d="M16 8V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8.5A1.5 1.5 0 006 16h2" />
    </>
  ),
  loupe: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  fermer: <path d="M6 6l12 12M18 6L6 18" />,
  monter: <path d="M12 19V5M6 11l6-6 6 6" />,
  descendre: <path d="M12 5v14M6 13l6 6 6-6" />,
  remplacer: <path d="M4 8h13M14 4.5L17.5 8 14 11.5M20 16H7M10 12.5L6.5 16l3.5 3.5" />,
  lien: <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />,
  lecture: <path d="M8 5.5v13l10.5-6.5L8 5.5z" />,
  exporter: <path d="M12 15.5V4.5M7 9l5-4.5L17 9M5 19.5h14" />,
  importer: <path d="M12 4.5v11M7 11l5 4.5 5-4.5M5 19.5h14" />,
};

export type IconName = keyof typeof TRACES;

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      className="ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRACES[name]}
    </svg>
  );
}
