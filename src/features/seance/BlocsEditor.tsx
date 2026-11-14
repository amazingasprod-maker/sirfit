import { useState } from 'react';
import {
  ajouterExercices,
  ajouterSerie,
  basculerSuperset,
  cocherSerie,
  deplacerBloc,
  majBloc,
  majSerie,
  numeros,
  remplacerExercice,
  retirerBloc,
  retirerSerie,
} from '../../domain/blocs';
import { TYPES_DE_SERIE, etiquetteSerie, fmtRepos, fmtSerie } from '../../domain/format';
import type { Bloc, ExerciseKind, SetEntry } from '../../domain/types';
import type { Catalogue } from '../../state/data';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { ActionSheet, type Action } from '../../ui/Sheet';
import { ExercisePicker } from '../exercices/ExercisePicker';
import { ExerciseSheet } from '../exercices/ExerciseSheet';
import { ExerciseVisual } from '../exercices/ExerciseVisual';

export type ModeEdition = 'live' | 'routine' | 'passee';

const REPOS_PROPOSES = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

const COLONNES: Record<ExerciseKind, [string, string]> = {
  charge: ['KG', 'REPS'],
  corps: ['+KG', 'REPS'],
  duree: ['+KG', 'SEC'],
};

interface Props {
  mode: ModeEdition;
  blocs: Bloc[];
  onChange: (blocs: Bloc[]) => void;
  catalogue: Catalogue;
  /** séries de la dernière fois, par exercice (mode live) */
  precedents?: Map<string, SetEntry[]>;
  reposDefautS: number;
  /** mode live : une série vient d'être validée */
  onValidee?: (bloc: Bloc) => void;
}

/**
 * L'éditeur d'exercices et de séries, commun à la séance en direct, aux
 * routines et à la correction d'une séance passée. Seules les colonnes changent.
 */
export function BlocsEditor({ mode, blocs, onChange, catalogue, precedents, reposDefautS, onValidee }: Props) {
  const live = mode === 'live';
  const [selecteur, setSelecteur] = useState<{ remplace: string | null } | null>(null);
  const [menuBloc, setMenuBloc] = useState<string | null>(null);
  const [menuSerie, setMenuSerie] = useState<{ uid: string; index: number } | null>(null);
  const [reposDe, setReposDe] = useState<string | null>(null);
  const [fiche, setFiche] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);

  // lettre de chaque super set, dans l'ordre d'apparition
  const lettres = new Map<string, string>();
  for (const b of blocs) {
    if (b.supersetId && !lettres.has(b.supersetId)) lettres.set(b.supersetId, String.fromCharCode(65 + lettres.size));
  }

  function valider(b: Bloc, index: number) {
    const precedent = precedents?.get(b.exerciseId)?.[index];
    const r = cocherSerie(blocs, b.uid, index, precedent);
    if (!r.ok) {
      const cle = `${b.uid}:${index}`;
      setRefus(cle);
      window.setTimeout(() => setRefus((c) => (c === cle ? null : c)), 420);
      document.getElementById(`reps-${b.uid}-${index}`)?.focus();
      return;
    }
    onChange(r.blocs);
    if (r.validee) onValidee?.(b);
  }

  const blocMenu = blocs.find((b) => b.uid === menuBloc);
  const indexMenu = blocMenu ? blocs.indexOf(blocMenu) : -1;
  const actionsBloc: Action[] = blocMenu
    ? [
        { label: "Remplacer l'exercice", icon: 'remplacer', onSelect: () => setSelecteur({ remplace: blocMenu.uid }) },
        ...(indexMenu > 0 ? [{ label: 'Monter', icon: 'monter', onSelect: () => onChange(deplacerBloc(blocs, blocMenu.uid, -1)) }] : []),
        ...(indexMenu < blocs.length - 1
          ? [{ label: 'Descendre', icon: 'descendre', onSelect: () => onChange(deplacerBloc(blocs, blocMenu.uid, 1)) }]
          : []),
        ...(blocMenu.supersetId
          ? [{ label: 'Retirer du super set', icon: 'lien', onSelect: () => onChange(basculerSuperset(blocs, blocMenu.uid)) }]
          : indexMenu < blocs.length - 1
            ? [
                {
                  label: 'Super set avec le suivant',
                  detail: catalogue.nomDe(blocs[indexMenu + 1].exerciseId),
                  icon: 'lien',
                  onSelect: () => onChange(basculerSuperset(blocs, blocMenu.uid)),
                },
              ]
            : []),
        { label: "Supprimer l'exercice", icon: 'corbeille', danger: true, onSelect: () => onChange(retirerBloc(blocs, blocMenu.uid)) },
      ]
    : [];

  const serieMenu = menuSerie ? blocs.find((b) => b.uid === menuSerie.uid)?.sets[menuSerie.index] : undefined;
  const actionsSerie: Action[] =
    menuSerie && serieMenu
      ? [
          ...TYPES_DE_SERIE.map((t) => ({
            label: t.label,
            detail: t.detail,
            actif: serieMenu.type === t.type,
            onSelect: () => onChange(majSerie(blocs, menuSerie.uid, menuSerie.index, { type: t.type })),
          })),
          {
            label: 'Supprimer la série',
            icon: 'corbeille',
            danger: true,
            onSelect: () => onChange(retirerSerie(blocs, menuSerie.uid, menuSerie.index)),
          },
        ]
      : [];

  const blocRepos = blocs.find((b) => b.uid === reposDe);
  const actionsRepos: Action[] = blocRepos
    ? REPOS_PROPOSES.map((s) => ({
        label: fmtRepos(s),
        actif: blocRepos.reposS === s,
        onSelect: () => onChange(majBloc(blocs, blocRepos.uid, { reposS: s })),
      }))
    : [];

  return (
    <div className="blocs">
      {blocs.length === 0 && (
        <div className="vide">
          <p>{live ? 'Ta séance est vide. Ajoute ton premier exercice pour commencer à noter tes séries.' : 'Aucun exercice pour le moment.'}</p>
        </div>
      )}

      {blocs.map((b) => {
        const exo = catalogue.parId.get(b.exerciseId);
        const kind = exo?.kind ?? 'charge';
        const nom = catalogue.nomDe(b.exerciseId);
        const nums = numeros(b.sets);
        const prec = live ? precedents?.get(b.exerciseId) : undefined;
        const [colKg, colReps] = COLONNES[kind];

        return (
          <section key={b.uid} className="bloc">
            <header className="bloc__tete">
              <button type="button" className="bloc__titre" onClick={() => setFiche(b.exerciseId)}>
                <span className="vignette vignette--sm">
                  <ExerciseVisual exerciseId={exo?.id} visKey={exo?.visKey} />
                </span>
                <span className="bloc__nom">{nom}</span>
              </button>
              <button type="button" className="iconbtn" onClick={() => setMenuBloc(b.uid)} aria-label={`Options pour ${nom}`}>
                <Icon name="plusOptions" />
              </button>
            </header>

            {b.supersetId && (
              <p className="etiquette">
                <Icon name="lien" size={14} />
                Super set {lettres.get(b.supersetId)}
              </p>
            )}

            <input
              className="bloc__note"
              type="text"
              value={b.note}
              maxLength={200}
              placeholder="Ajouter une note"
              aria-label={`Note pour ${nom}`}
              onChange={(e) => onChange(majBloc(blocs, b.uid, { note: e.currentTarget.value }))}
            />

            <button type="button" className="bloc__repos" onClick={() => setReposDe(b.uid)}>
              <Icon name="chrono" size={18} />
              Repos : {fmtRepos(b.reposS)}
            </button>

            <div className={`series series--${mode}`} role="table" aria-label={`Séries de ${nom}`}>
              <div className="series__tete" role="row">
                <span role="columnheader">SÉRIE</span>
                {live && <span role="columnheader">PRÉCÉDENT</span>}
                <span role="columnheader">{colKg}</span>
                <span role="columnheader">{colReps}</span>
                {live && (
                  <span role="columnheader" aria-label="Validée">
                    <Icon name="coche" size={16} />
                  </span>
                )}
              </div>

              {b.sets.map((s, i) => {
                const p = prec?.[i];
                const cle = `${b.uid}:${i}`;
                const label = etiquetteSerie(s.type, nums[i]);
                return (
                  <div key={i} role="row" className={`serie${live && s.done ? ' serie--faite' : ''}${refus === cle ? ' serie--refus' : ''}`}>
                    <button
                      type="button"
                      className={`serie__n serie__n--${s.type}`}
                      onClick={() => setMenuSerie({ uid: b.uid, index: i })}
                      aria-label={`Série ${label} : changer le type ou supprimer`}
                    >
                      {label}
                    </button>
                    {live && (
                      <button
                        type="button"
                        className="serie__prec"
                        disabled={!p}
                        onClick={() => p && onChange(majSerie(blocs, b.uid, i, { kg: p.kg, reps: p.reps }))}
                        aria-label={p ? `Reprendre la dernière fois : ${fmtSerie(p, kind)}` : 'Pas de série précédente'}
                      >
                        {p ? fmtSerie(p, kind) : '-'}
                      </button>
                    )}
                    <NumberField
                      id={`kg-${b.uid}-${i}`}
                      value={s.kg}
                      placeholder={p?.kg ?? null}
                      decimal
                      max={999}
                      label={`Charge en kilos, série ${label}`}
                      onChange={(kg) => onChange(majSerie(blocs, b.uid, i, { kg }))}
                    />
                    <NumberField
                      id={`reps-${b.uid}-${i}`}
                      value={s.reps}
                      placeholder={p?.reps ?? null}
                      max={kind === 'duree' ? 3600 : 999}
                      label={kind === 'duree' ? `Secondes, série ${label}` : `Répétitions, série ${label}`}
                      onChange={(reps) => onChange(majSerie(blocs, b.uid, i, { reps }))}
                    />
                    {live && (
                      <button
                        type="button"
                        className="serie__coche"
                        aria-pressed={s.done}
                        aria-label={s.done ? `Série ${label} validée : décocher` : `Valider la série ${label}`}
                        onClick={() => valider(b, i)}
                      >
                        <Icon name="coche" size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="button" className="btn btn--discret btn--bloc" onClick={() => onChange(ajouterSerie(blocs, b.uid))}>
              <Icon name="plus" size={18} />
              Ajouter une série
            </button>
          </section>
        );
      })}

      <button type="button" className="btn btn--soft btn--bloc" onClick={() => setSelecteur({ remplace: null })}>
        <Icon name="plus" size={20} />
        Ajouter un exercice
      </button>

      <ExercisePicker
        open={selecteur !== null}
        onClose={() => setSelecteur(null)}
        exercises={catalogue.liste}
        unSeul={!!selecteur?.remplace}
        onChoisir={(ids) => {
          if (selecteur?.remplace) onChange(remplacerExercice(blocs, selecteur.remplace, ids[0]));
          else onChange(ajouterExercices(blocs, ids, reposDefautS));
        }}
      />
      <ActionSheet open={!!blocMenu} onClose={() => setMenuBloc(null)} titre={blocMenu ? catalogue.nomDe(blocMenu.exerciseId) : ''} actions={actionsBloc} />
      <ActionSheet open={!!serieMenu} onClose={() => setMenuSerie(null)} titre="Type de série" actions={actionsSerie} />
      <ActionSheet open={!!blocRepos} onClose={() => setReposDe(null)} titre="Repos après chaque série" actions={actionsRepos} />
      <ExerciseSheet exerciseId={fiche} onClose={() => setFiche(null)} />
    </div>
  );
}
