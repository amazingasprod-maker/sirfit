import { Link, useLocation } from 'wouter';
import { fmtChrono } from '../domain/format';
import { useRestant } from '../features/seance/Rest';
import { useDraft } from '../state/draft';
import { Icon } from './Icon';
import { useNow } from './hooks';

const ONGLETS = [
  { href: '/', label: 'Profil', icon: 'profil' },
  { href: '/seance', label: 'Séance', icon: 'haltere' },
  { href: '/exercices', label: 'Exercices', icon: 'liste' },
];

export const CHEMINS_ONGLETS = ONGLETS.map((o) => o.href);

/** Rappel de la séance en cours quand on navigue ailleurs : un toucher y ramène. */
function SeanceEnCours() {
  const draft = useDraft();
  const now = useNow(draft !== null, 1000);
  const restant = useRestant(draft?.repos ?? null);
  if (!draft) return null;
  return (
    <Link href="/en-cours" className="encours">
      <span className="encours__point" aria-hidden="true" />
      <span className="encours__texte">
        <strong>{draft.titre || 'Séance en cours'}</strong>
        <span>{draft.repos ? `Repos : ${fmtChrono(restant)}` : fmtChrono((now - draft.debut) / 1000)}</span>
      </span>
      <span className="encours__action">Reprendre</span>
    </Link>
  );
}

export function TabBar() {
  const [chemin] = useLocation();
  return (
    <div className="bas-fixe">
      <SeanceEnCours />
      <nav className="onglets" aria-label="Navigation principale">
        {ONGLETS.map((o) => (
          <Link key={o.href} href={o.href} className="onglet" aria-current={chemin === o.href ? 'page' : undefined}>
            <Icon name={o.icon} />
            <span>{o.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
