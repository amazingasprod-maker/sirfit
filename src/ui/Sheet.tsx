import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useBackClose, useScrollLock } from './hooks';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  titre?: string;
  /** plein : occupe presque tout l'écran (listes longues, formulaires) */
  plein?: boolean;
  pied?: ReactNode;
  children: ReactNode;
}

/** Panneau qui monte du bas de l'écran. Se ferme au bouton retour, à Échap et au toucher du fond. */
export function Sheet({ open, onClose, titre, plein = false, pied, children }: SheetProps) {
  useBackClose(open, onClose);
  useScrollLock(open);
  const boite = useRef<HTMLDivElement>(null);
  // la référence évite de rejouer l'effet (et de voler le focus d'un champ) à chaque rendu du parent
  const fermer = useRef(onClose);
  fermer.current = onClose;

  useEffect(() => {
    if (!open) return;
    const avant = document.activeElement as HTMLElement | null;
    boite.current?.focus({ preventScroll: true });
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer.current();
    };
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('keydown', surTouche);
      avant?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-couche">
      <div className="sheet-fond" onClick={onClose} />
      <div
        ref={boite}
        className={`sheet${plein ? ' sheet--plein' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        tabIndex={-1}
      >
        {titre !== undefined && (
          <header className="sheet__tete">
            <h2>{titre}</h2>
            <button type="button" className="iconbtn" onClick={onClose} aria-label="Fermer">
              <Icon name="fermer" />
            </button>
          </header>
        )}
        <div className="sheet__corps">{children}</div>
        {pied && <footer className="sheet__pied">{pied}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export interface Action {
  label: string;
  icon?: string;
  detail?: string;
  danger?: boolean;
  actif?: boolean;
  onSelect: () => void;
}

/** Liste d'actions dans un panneau : le menu « ⋯ » de l'app. */
export function ActionSheet({ open, onClose, titre, actions }: { open: boolean; onClose: () => void; titre?: string; actions: Action[] }) {
  return (
    <Sheet open={open} onClose={onClose} titre={titre}>
      <ul className="actions">
        {actions.map((a) => (
          <li key={a.label}>
            <button
              type="button"
              className={`action${a.danger ? ' action--danger' : ''}`}
              onClick={() => {
                onClose();
                a.onSelect();
              }}
            >
              {a.icon && <Icon name={a.icon} size={22} />}
              <span className="action__texte">
                <span>{a.label}</span>
                {a.detail && <small>{a.detail}</small>}
              </span>
              {a.actif && <Icon name="coche" size={20} />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  titre: string;
  message?: string;
  confirmer: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function ConfirmSheet({ open, onClose, titre, message, confirmer, danger = false, onConfirm }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} titre={titre}>
      {message && <p className="sheet__message">{message}</p>}
      <div className="pile">
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmer}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Annuler
        </button>
      </div>
    </Sheet>
  );
}
