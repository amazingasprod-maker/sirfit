import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { db } from '../../db/schema';
import { nettoyerSupersets, numeros, routineDepuisSeance } from '../../domain/blocs';
import { etiquetteSerie, fmtDate, fmtHeure, fmtSerie, versChampDate } from '../../domain/format';
import { dureeMin } from '../../domain/stats';
import type { Workout } from '../../domain/types';
import { useCatalogue, useRoutines, useSettings, useWorkout } from '../../state/data';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { ActionSheet, ConfirmSheet } from '../../ui/Sheet';
import { apresPanneaux, useBackClose } from '../../ui/hooks';
import { toast } from '../../ui/toast';
import { ExerciseSheet } from '../exercices/ExerciseSheet';
import { ExerciseVisual } from '../exercices/ExerciseVisual';
import { BlocsEditor } from '../seance/BlocsEditor';
import { Compteurs } from './WorkoutCard';

export function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const w = useWorkout(id);
  const catalogue = useCatalogue();
  const routines = useRoutines();
  const settings = useSettings();
  const [, naviguer] = useLocation();

  const [menu, setMenu] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [fiche, setFiche] = useState<string | null>(null);
  const [copie, setCopie] = useState<Workout | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [supprimee, setSupprimee] = useState(false);

  // le bouton retour annule la correction au lieu de quitter la séance
  useBackClose(copie !== null, () => setCopie(null));

  if (w === undefined || !catalogue || supprimee) return <div className="page page--plein" />;
  if (w === null) {
    return (
      <div className="page page--plein">
        <div className="vide">
          <p>Cette séance n'existe plus.</p>
          <button type="button" className="btn btn--soft" onClick={() => naviguer('/', { replace: true })}>
            Revenir au profil
          </button>
        </div>
      </div>
    );
  }

  function commencerEdition() {
    if (!w) return;
    setCopie(structuredClone(w));
    setMinutes(Math.max(1, dureeMin(w)));
  }

  async function enregistrer() {
    if (!copie) return;
    // une séance passée ne contient que des séries faites : les lignes sans répétitions sont écartées
    const exercises = nettoyerSupersets(
      copie.exercises
        .map((b) => ({ ...b, sets: b.sets.filter((s) => s.reps !== null && s.reps > 0).map((s) => ({ ...s, done: true })) }))
        .filter((b) => b.sets.length > 0),
    );
    if (!exercises.length) {
      toast('Il faut garder au moins une série avec des répétitions.', true);
      return;
    }
    await db.workouts.put({
      ...copie,
      titre: copie.titre.trim() || w!.titre,
      note: copie.note.trim(),
      fin: copie.debut + Math.max(1, minutes ?? 1) * 60000,
      exercises,
    });
    toast('Séance corrigée');
    setCopie(null);
  }

  // ---------- correction ----------
  if (copie) {
    const changer = (patch: Partial<Workout>) => setCopie((c) => (c ? { ...c, ...patch } : c));
    return (
      <div className="page page--plein">
        <header className="barre">
          <button type="button" className="iconbtn" onClick={() => setCopie(null)} aria-label="Annuler la correction">
            <Icon name="fermer" />
          </button>
          <span className="barre__titre">Corriger la séance</span>
          <button type="button" className="btn btn--primary btn--sm" onClick={enregistrer}>
            Enregistrer
          </button>
        </header>

        <div className="formulaire">
          <label className="champ">
            <span>Titre</span>
            <input className="saisie" type="text" value={copie.titre} maxLength={60} onChange={(e) => changer({ titre: e.currentTarget.value })} />
          </label>
          <div className="champs-2">
            <label className="champ">
              <span>Début</span>
              <input
                className="saisie"
                type="datetime-local"
                value={versChampDate(copie.debut)}
                onChange={(e) => {
                  const t = new Date(e.currentTarget.value).getTime();
                  if (Number.isFinite(t)) changer({ debut: t });
                }}
              />
            </label>
            <label className="champ">
              <span>Durée (min)</span>
              <NumberField className="saisie" value={minutes} onChange={setMinutes} label="Durée en minutes" max={600} />
            </label>
          </div>
          <label className="champ">
            <span>Note</span>
            <textarea className="saisie saisie--zone" rows={3} maxLength={500} value={copie.note} onChange={(e) => changer({ note: e.currentTarget.value })} />
          </label>
        </div>

        <BlocsEditor mode="passee" blocs={copie.exercises} onChange={(exercises) => changer({ exercises })} catalogue={catalogue} reposDefautS={settings.reposDefautS} />
      </div>
    );
  }

  // ---------- lecture ----------
  const lettres = new Map<string, string>();
  for (const b of w.exercises) {
    if (b.supersetId && !lettres.has(b.supersetId)) lettres.set(b.supersetId, String.fromCharCode(65 + lettres.size));
  }

  return (
    <div className="page page--plein">
      <header className="barre">
        <button type="button" className="iconbtn" onClick={() => window.history.back()} aria-label="Retour">
          <Icon name="retour" />
        </button>
        <span className="barre__titre">Séance</span>
        <button type="button" className="iconbtn" onClick={() => setMenu(true)} aria-label="Options de la séance">
          <Icon name="plusOptions" />
        </button>
      </header>

      <h1 className="titre-page">{w.titre}</h1>
      <p className="discret">
        {fmtDate(w.debut)} · {fmtHeure(w.debut)}
      </p>
      <Compteurs w={w} catalogue={catalogue} />
      {w.note && <p className="note-lue">{w.note}</p>}

      <div className="blocs">
        {w.exercises.map((b) => {
          const exo = catalogue.parId.get(b.exerciseId);
          const nums = numeros(b.sets);
          return (
            <section key={b.uid} className="bloc">
              <header className="bloc__tete">
                <button type="button" className="bloc__titre" onClick={() => setFiche(b.exerciseId)}>
                  <span className="vignette vignette--sm">
                    <ExerciseVisual exerciseId={exo?.id} visKey={exo?.visKey} />
                  </span>
                  <span className="bloc__nom">{catalogue.nomDe(b.exerciseId)}</span>
                </button>
              </header>
              {b.supersetId && (
                <p className="etiquette">
                  <Icon name="lien" size={14} />
                  Super set {lettres.get(b.supersetId)}
                </p>
              )}
              {b.note && <p className="note-lue note-lue--bloc">{b.note}</p>}
              <ul className="series-lues">
                {b.sets.map((s, i) => (
                  <li key={i}>
                    <span className={`series-lues__n serie__n--${s.type}`}>{etiquetteSerie(s.type, nums[i])}</span>
                    <span>{fmtSerie(s, exo?.kind ?? 'charge')}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        titre={w.titre}
        actions={[
          { label: 'Corriger la séance', icon: 'crayon', onSelect: commencerEdition },
          {
            label: 'En faire une routine',
            icon: 'copier',
            detail: 'Mêmes exercices, mêmes séries, prêtes à relancer',
            onSelect: async () => {
              const ordre = Math.max(-1, ...(routines ?? []).map((x) => x.ordre)) + 1;
              await db.routines.add(routineDepuisSeance(w, ordre, Date.now()));
              toast('Routine créée dans l\'onglet Séance');
            },
          },
          { label: 'Supprimer la séance', icon: 'corbeille', danger: true, onSelect: () => setSuppression(true) },
        ]}
      />
      <ConfirmSheet
        open={suppression}
        onClose={() => setSuppression(false)}
        titre="Supprimer cette séance ?"
        message="Elle disparaîtra de ton historique et de tes graphiques. Cette suppression est définitive."
        confirmer="Supprimer la séance"
        danger
        onConfirm={() =>
          apresPanneaux(async () => {
            setSupprimee(true);
            await db.workouts.delete(w.id);
            toast('Séance supprimée');
            window.history.back();
          })
        }
      />
      <ExerciseSheet exerciseId={fiche} onClose={() => setFiche(null)} />
    </div>
  );
}
