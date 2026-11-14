import { useMemo, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { db } from '../../db/schema';
import { reporterDansRoutine, terminer } from '../../domain/blocs';
import { fmtDuree, fmtKg, pluriel } from '../../domain/format';
import { seriesSeance, volumeSeance } from '../../domain/stats';
import { useCatalogue, useRoutines } from '../../state/data';
import { draftStore, useDraft, useDraftCharge } from '../../state/draft';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { toast } from '../../ui/toast';

export function FinishScreen() {
  const draft = useDraft();
  const charge = useDraftCharge();
  const catalogue = useCatalogue();
  const routines = useRoutines();
  const [, naviguer] = useLocation();

  // l'heure de fin est figée à l'arrivée sur l'écran : relire son résumé n'allonge pas la séance
  const [arrivee] = useState(() => Date.now());
  const [titre, setTitre] = useState(draft?.titre ?? '');
  const [note, setNote] = useState(draft?.note ?? '');
  const [minutes, setMinutes] = useState<number | null>(() => (draft ? Math.max(1, Math.round((arrivee - draft.debut) / 60000)) : null));
  const [reporter, setReporter] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  const routine = useMemo(() => routines?.find((r) => r.id === draft?.routineId), [routines, draft?.routineId]);

  if (!charge || !catalogue) return null;
  if (!draft) return <Redirect to="/" replace />;

  const faites = seriesSeance({ exercises: draft.exercises.map((b) => ({ ...b, sets: b.sets.filter((s) => s.done) })) });
  const toutes = draft.exercises.reduce((t, b) => t + b.sets.length, 0);
  const cochees = draft.exercises.reduce((t, b) => t + b.sets.filter((s) => s.done).length, 0);
  const oubliees = toutes - cochees;
  const duree = minutes ?? 0;

  async function enregistrer() {
    if (!draft || envoi) return;
    const w = terminer(draft, draft.debut + Math.max(1, duree) * 60000, titre, note);
    if (!w) return;
    setEnvoi(true);
    try {
      await db.workouts.add(w);
      if (reporter && routine) await db.routines.put(reporterDansRoutine(routine, w, Date.now()));
      draftStore.set(null);
      toast('Séance enregistrée');
      naviguer('/', { replace: true });
    } catch (e) {
      console.error(e);
      setEnvoi(false);
      toast("La séance n'a pas pu être enregistrée. Elle reste en cours : réessaie.", true);
    }
  }

  return (
    <div className="page page--plein">
      <header className="barre">
        <button type="button" className="iconbtn" onClick={() => window.history.back()} aria-label="Revenir à la séance">
          <Icon name="retour" />
        </button>
        <span className="barre__titre">Terminer la séance</span>
        <span className="barre__vide" />
      </header>

      {cochees === 0 ? (
        <div className="vide">
          <p>Aucune série n'est cochée. Valide au moins une série pour enregistrer cette séance, ou abandonne-la depuis l'écran précédent.</p>
          <button type="button" className="btn btn--soft" onClick={() => window.history.back()}>
            Revenir à la séance
          </button>
        </div>
      ) : (
        <>
          <dl className="compteurs">
            <div>
              <dt>Durée</dt>
              <dd>{fmtDuree(duree)}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{fmtKg(volumeSeance(draft, catalogue.kindDe))}</dd>
            </div>
            <div>
              <dt>Séries</dt>
              <dd>{faites}</dd>
            </div>
          </dl>

          <div className="formulaire">
            <label className="champ">
              <span>Titre</span>
              <input className="saisie" type="text" value={titre} maxLength={60} onChange={(e) => setTitre(e.currentTarget.value)} />
            </label>
            <label className="champ">
              <span>Durée, en minutes</span>
              <NumberField className="saisie" value={minutes} onChange={setMinutes} label="Durée en minutes" max={600} />
            </label>
            <label className="champ">
              <span>Note</span>
              <textarea
                className="saisie saisie--zone"
                value={note}
                rows={3}
                maxLength={500}
                placeholder="Forme du jour, douleur, charge à monter la prochaine fois"
                onChange={(e) => setNote(e.currentTarget.value)}
              />
            </label>

            {routine && (
              <label className={`case case--carte${reporter ? ' case--faite' : ''}`}>
                <input type="checkbox" checked={reporter} onChange={() => setReporter((r) => !r)} />
                <span className="case__boite">
                  <Icon name="coche" size={16} />
                </span>
                <span>
                  Reporter ces charges dans la routine « {routine.titre} »<small>La prochaine fois, elles seront déjà remplies.</small>
                </span>
              </label>
            )}

            {oubliees > 0 && (
              <p className="avis">
                {pluriel(oubliees, 'série non cochée', 'séries non cochées')} : {oubliees > 1 ? 'elles ne seront pas enregistrées' : 'elle ne sera pas enregistrée'}.
              </p>
            )}
          </div>

          <div className="pied-fixe">
            <button type="button" className="btn btn--primary btn--bloc" disabled={envoi || duree < 1} onClick={enregistrer}>
              Enregistrer la séance
            </button>
          </div>
        </>
      )}
    </div>
  );
}
