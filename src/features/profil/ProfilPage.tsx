import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { fmtDate, pluriel } from '../../domain/format';
import { semaines, semainesDAffilee } from '../../domain/stats';
import { useCatalogue, useSettings, useWorkouts } from '../../state/data';
import { Icon } from '../../ui/Icon';
import { WeeklyChart } from './WeeklyChart';
import { WorkoutCard } from './WorkoutCard';

const PAR_PAGE = 20;
const RAPPEL_SAUVEGARDE_JOURS = 14;

export function ProfilPage() {
  const workouts = useWorkouts();
  const catalogue = useCatalogue();
  const settings = useSettings();
  const [montrees, setMontrees] = useState(PAR_PAGE);

  const agg = useMemo(() => (workouts && catalogue ? semaines(workouts, catalogue.kindDe, 12) : null), [workouts, catalogue]);
  const affilee = useMemo(() => (workouts ? semainesDAffilee(workouts) : 0), [workouts]);

  if (!workouts || !catalogue || !agg) return <div className="page" />;

  const sauvegardeAncienne =
    workouts.length >= 3 &&
    (settings.derniereSauvegarde === null || Date.now() - settings.derniereSauvegarde > RAPPEL_SAUVEGARDE_JOURS * 86_400_000);

  return (
    <div className="page">
      <header className="tete">
        <h1>{settings.nom.trim() || 'Profil'}</h1>
        <Link href="/reglages" className="iconbtn" aria-label="Réglages">
          <Icon name="reglages" />
        </Link>
      </header>

      {workouts.length === 0 ? (
        <div className="vide vide--accueil">
          <h2>Ta progression commence ici</h2>
          <p>
            Lance une routine ou une séance vide, coche tes séries au fur et à mesure. Chaque séance enregistrée s'ajoute à ton historique et au graphique
            de tes semaines.
          </p>
          <Link href="/seance" className="btn btn--primary">
            Démarrer ma première séance
          </Link>
        </div>
      ) : (
        <>
          <p className="resume">
            <strong>{pluriel(workouts.length, 'séance')}</strong>
            {affilee > 1 && <span>{affilee} semaines d'affilée</span>}
          </p>

          <section className="carte" aria-label="Progression sur 12 semaines">
            <WeeklyChart semaines={agg} />
          </section>

          {sauvegardeAncienne && (
            <Link href="/reglages" className="rappel">
              <span>
                <strong>Pense à sauvegarder.</strong>{' '}
                {settings.derniereSauvegarde === null
                  ? "Tes séances n'existent que sur cet appareil, et aucune sauvegarde n'a encore été faite."
                  : `Dernière sauvegarde : ${fmtDate(settings.derniereSauvegarde).toLowerCase()}.`}
              </span>
              <Icon name="suivant" size={20} />
            </Link>
          )}

          <div className="section-tete">
            <h2>Séances</h2>
          </div>
          <ul className="seances">
            {workouts.slice(0, montrees).map((w) => (
              <li key={w.id}>
                <WorkoutCard w={w} catalogue={catalogue} />
              </li>
            ))}
          </ul>
          {workouts.length > montrees && (
            <button type="button" className="btn btn--ghost btn--bloc" onClick={() => setMontrees((n) => n + PAR_PAGE)}>
              Afficher les séances plus anciennes
            </button>
          )}
        </>
      )}
    </div>
  );
}
