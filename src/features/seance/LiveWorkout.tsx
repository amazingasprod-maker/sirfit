import { useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { ajouterFinition } from '../../domain/blocs';
import { fmtChrono, fmtKg } from '../../domain/format';
import { seriesSeance, volumeSeance } from '../../domain/stats';
import type { Bloc } from '../../domain/types';
import { useCatalogue, usePrecedents, useSettings, useWorkouts } from '../../state/data';
import { draftStore, useDraft, useDraftCharge } from '../../state/draft';
import { Icon } from '../../ui/Icon';
import { ConfirmSheet } from '../../ui/Sheet';
import { useNow, useWakeLock } from '../../ui/hooks';
import { preparerAudio, vibrer } from '../../ui/signal';
import { toast } from '../../ui/toast';
import { BlocsEditor } from './BlocsEditor';
import { RestBar } from './Rest';

export function LiveWorkout() {
  const draft = useDraft();
  const charge = useDraftCharge();
  const catalogue = useCatalogue();
  const workouts = useWorkouts();
  const settings = useSettings();
  const precedents = usePrecedents(workouts);
  const [, naviguer] = useLocation();
  const [abandon, setAbandon] = useState(false);
  const [echaufOuvert, setEchaufOuvert] = useState(true);
  const now = useNow(draft !== null, 1000);
  useWakeLock(draft !== null && settings.ecranAllume);

  if (!charge || !catalogue) return null;
  if (!draft) return <Redirect to="/seance" replace />;

  const echauf = draft.echauffement;
  const echaufFaits = echauf?.filter((x) => x.fait).length ?? 0;
  const blocRepos = draft.repos ? draft.exercises.find((b) => b.uid === draft.repos!.blocUid) : undefined;

  function surValidee(b: Bloc) {
    // la coche est le geste qui autorise le son du minuteur
    preparerAudio();
    if (settings.vibration) vibrer(12);
    draftStore.update((d) => ({
      ...d,
      repos: b.reposS > 0 ? { finAt: Date.now() + b.reposS * 1000, totalS: b.reposS, blocUid: b.uid } : d.repos,
    }));
  }

  return (
    <div className={`page page--plein${draft.repos ? ' page--repos' : ''}`}>
      <header className="barre">
        <button type="button" className="iconbtn" onClick={() => naviguer('/seance', { replace: true })} aria-label="Réduire la séance">
          <Icon name="bas" />
        </button>
        <span className="barre__titre">Séance en cours</span>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => naviguer('/en-cours/fin')}>
          Terminer
        </button>
      </header>

      <dl className="compteurs">
        <div>
          <dt>Durée</dt>
          <dd className="compteurs__vif">{fmtChrono((now - draft.debut) / 1000)}</dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>{fmtKg(volumeSeance(draft, catalogue.kindDe))}</dd>
        </div>
        <div>
          <dt>Séries</dt>
          <dd>{seriesSeance(draft)}</dd>
        </div>
      </dl>

      <input
        className="titre-seance"
        type="text"
        value={draft.titre}
        maxLength={60}
        aria-label="Titre de la séance"
        placeholder="Titre de la séance"
        onChange={(e) => {
          const titre = e.currentTarget.value;
          draftStore.update((d) => ({ ...d, titre }));
        }}
      />

      {draft.mode === 'express' && (
        <p className="note-mode">
          Mode express : les exercices s'enchaînent en super sets, 15 s de transition puis 60 s de repos entre les tours.
        </p>
      )}

      {echauf && (
        <section className="echauf">
          <button type="button" className="echauf__tete" aria-expanded={echaufOuvert} onClick={() => setEchaufOuvert((o) => !o)}>
            <span>Échauffement</span>
            <span className="echauf__compte">
              {echaufFaits}/{echauf.length}
            </span>
            <span className={`echauf__fleche${echaufOuvert ? ' echauf__fleche--ouvert' : ''}`}>
              <Icon name="bas" size={20} />
            </span>
          </button>
          {echaufOuvert && (
            <ul className="echauf__liste">
              {echauf.map((x, i) => (
                <li key={x.txt}>
                  <label className={`case${x.fait ? ' case--faite' : ''}`}>
                    <input
                      type="checkbox"
                      checked={x.fait}
                      onChange={() =>
                        draftStore.update((d) => ({
                          ...d,
                          echauffement: d.echauffement?.map((y, k) => (k === i ? { ...y, fait: !y.fait } : y)) ?? null,
                        }))
                      }
                    />
                    <span className="case__boite">
                      <Icon name="coche" size={16} />
                    </span>
                    <span>{x.txt}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <BlocsEditor
        mode="live"
        blocs={draft.exercises}
        onChange={(exercises) => draftStore.update((d) => ({ ...d, exercises }))}
        catalogue={catalogue}
        precedents={precedents}
        reposDefautS={settings.reposDefautS}
        onValidee={surValidee}
      />

      {/* finitions de la routine : rien n'est imposé, un geste en ajoute une à la séance */}
      {draft.finitions && draft.finitions.length > 0 && (
        <section className="finitions" aria-label="Finitions au choix">
          <p className="finitions__titre">Pour finir, si tu es en forme</p>
          <p className="finitions__aide">Une série à l'échec chacune. Prends l'une, les deux, ou aucune.</p>
          <div className="finitions__choix">
            {draft.finitions.map((id) => (
              <button key={id} type="button" className="btn btn--soft btn--sm" onClick={() => draftStore.update((d) => ajouterFinition(d, id))}>
                <Icon name="plus" size={18} />
                {catalogue.nomDe(id)} à l'échec
              </button>
            ))}
          </div>
        </section>
      )}

      <button type="button" className="btn btn--danger-discret btn--bloc" onClick={() => setAbandon(true)}>
        Abandonner la séance
      </button>

      {draft.repos && <RestBar repos={draft.repos} nom={blocRepos ? catalogue.nomDe(blocRepos.exerciseId) : 'Repos'} />}

      <ConfirmSheet
        open={abandon}
        onClose={() => setAbandon(false)}
        titre="Abandonner cette séance ?"
        message="Les séries notées depuis le début seront perdues. Pour les garder, utilise plutôt « Terminer »."
        confirmer="Abandonner la séance"
        danger
        onConfirm={() => {
          draftStore.set(null);
          toast('Séance abandonnée');
          naviguer('/seance', { replace: true });
        }}
      />
    </div>
  );
}
