import { useMemo, useState } from 'react';
import { normaliser } from '../../domain/format';
import { GROUPES, MATERIELS, type Exercise, type Groupe, type Materiel } from '../../domain/types';
import { Icon } from '../../ui/Icon';
import { ExerciseVisual } from './ExerciseVisual';

interface Props {
  exercises: Exercise[];
  /** mode sélection multiple : les exercices cochés */
  selection?: Set<string>;
  onPick: (e: Exercise) => void;
  onCreer?: () => void;
}

/** Recherche, filtre par groupe musculaire et liste. Sert à la bibliothèque et au sélecteur. */
export function ExerciseList({ exercises, selection, onPick, onCreer }: Props) {
  const [recherche, setRecherche] = useState('');
  const [groupe, setGroupe] = useState<Groupe | null>(null);
  const [materiel, setMateriel] = useState<Materiel | ''>('');

  const visibles = useMemo(() => {
    const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
    return exercises
      .filter((e) => !groupe || e.groupe === groupe)
      .filter((e) => !materiel || e.materiel === materiel)
      .filter((e) => {
        if (!mots.length) return true;
        const cible = normaliser(`${e.nom} ${e.groupe} ${e.materiel}`);
        return mots.every((m) => cible.includes(m));
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [exercises, recherche, groupe, materiel]);

  return (
    <div className="exos">
      <div className="exos__filtres">
        <label className="recherche">
          <Icon name="loupe" size={20} />
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Chercher un exercice"
            aria-label="Chercher un exercice"
            value={recherche}
            onChange={(e) => setRecherche(e.currentTarget.value)}
          />
        </label>
        <div className="chips" role="group" aria-label="Filtres">
          <select
            className={`chip chip--choix${materiel ? ' chip--choisi' : ''}`}
            aria-label="Matériel"
            value={materiel}
            onChange={(e) => setMateriel(e.currentTarget.value as Materiel | '')}
          >
            <option value="">Tout le matériel</option>
            {MATERIELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button type="button" className="chip" aria-pressed={groupe === null} onClick={() => setGroupe(null)}>
            Tous les muscles
          </button>
          {GROUPES.map((g) => (
            <button key={g} type="button" className="chip" aria-pressed={groupe === g} onClick={() => setGroupe(groupe === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="vide">
          <p>
            {recherche.trim()
              ? `Aucun exercice ne correspond à « ${recherche.trim()} » avec ces filtres.`
              : 'Aucun exercice ne correspond à ces filtres.'}
          </p>
          {onCreer && (
            <button type="button" className="btn btn--soft" onClick={onCreer}>
              Créer cet exercice
            </button>
          )}
        </div>
      ) : (
        <ul className="liste">
          {visibles.map((e) => {
            const coche = selection?.has(e.id) ?? false;
            return (
              <li key={e.id}>
                <button type="button" className="exo-ligne" aria-pressed={selection ? coche : undefined} onClick={() => onPick(e)}>
                  <span className="vignette">
                    <ExerciseVisual exerciseId={e.id} visKey={e.visKey} />
                  </span>
                  <span className="exo-ligne__texte">
                    <span className="exo-ligne__nom">{e.nom}</span>
                    <span className="exo-ligne__meta">
                      {e.groupe} · {e.materiel}
                      {e.custom ? ' · Perso' : ''}
                    </span>
                  </span>
                  {selection ? (
                    <span className={`pastille${coche ? ' pastille--on' : ''}`}>{coche && <Icon name="coche" size={16} />}</span>
                  ) : (
                    <span className="exo-ligne__fin">
                      <Icon name="suivant" size={18} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
