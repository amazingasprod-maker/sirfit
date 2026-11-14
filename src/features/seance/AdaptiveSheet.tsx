import { useEffect, useMemo, useState } from 'react';
import { genSeance } from '../../domain/adaptive';
import { draftDepuisPlan, itemsDuPlan } from '../../domain/blocs';
import { pluriel } from '../../domain/format';
import { suggestionPartie } from '../../domain/stats';
import type { Draft, Routine, Workout } from '../../domain/types';
import type { Catalogue } from '../../state/data';
import { Sheet } from '../../ui/Sheet';

const DUREES = [30, 45, 60, 90];

interface Props {
  open: boolean;
  onClose: () => void;
  routines: Routine[];
  workouts: Workout[];
  catalogue: Catalogue;
  onDemarrer: (d: Draft) => void;
}

/** Choisir une routine et un temps disponible : l'app raccourcit la séance pour qu'elle tienne. */
export function AdaptiveSheet({ open, onClose, routines, workouts, catalogue, onDemarrer }: Props) {
  const suggestion = useMemo(() => suggestionPartie(workouts), [workouts]);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(45);

  useEffect(() => {
    if (!open) return;
    setRoutineId((routines.find((r) => r.partie === suggestion) ?? routines[0])?.id ?? null);
  }, [open, routines, suggestion]);

  const routine = routines.find((r) => r.id === routineId);
  const plan = useMemo(() => (routine ? genSeance(itemsDuPlan(routine), minutes) : null), [routine, minutes]);

  const nomDuBloc = (uid: string) => {
    const b = routine?.exercises.find((x) => x.uid === uid);
    return b ? catalogue.nomDe(b.exerciseId) : '';
  };
  const seriesPrevues = routine?.exercises.reduce((t, b) => t + b.sets.length, 0) ?? 0;
  const seriesGardees = plan?.blocs.reduce((t, b) => t + b.exos.reduce((u, x) => u + x.series, 0), 0) ?? 0;
  const retirees = seriesPrevues - seriesGardees;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      plein
      titre="Séance adaptée à mon temps"
      pied={
        <button
          type="button"
          className="btn btn--primary btn--bloc"
          disabled={!routine || !plan}
          onClick={() => {
            if (!routine || !plan) return;
            onClose();
            onDemarrer(draftDepuisPlan(routine, plan, Date.now()));
          }}
        >
          Démarrer la séance
        </button>
      }
    >
      {routines.length === 0 ? (
        <p className="sheet__message">Crée d'abord une routine : la séance adaptée part de l'une d'elles et la raccourcit pour tenir dans ton temps.</p>
      ) : (
        <div className="formulaire">
          <div className="champ">
            <span>Routine de départ</span>
            <div className="chips chips--retour" role="group" aria-label="Routine de départ">
              {routines.map((r) => (
                <button key={r.id} type="button" className="chip" aria-pressed={r.id === routineId} onClick={() => setRoutineId(r.id)}>
                  {r.titre}
                </button>
              ))}
            </div>
            {routine?.partie === suggestion && (
              <small className="discret">Suggérée : l'inverse de ta dernière séance.</small>
            )}
          </div>

          <div className="champ">
            <span>Temps disponible</span>
            <div className="seg" role="group" aria-label="Temps disponible">
              {DUREES.map((m) => (
                <button key={m} type="button" aria-pressed={m === minutes} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {plan ? (
            <section className="apercu">
              <h3>
                {plan.mode === 'complet' ? 'Séance complète' : 'Mode express'} · environ {plan.estMin} min
              </h3>
              <p className="discret">
                {plan.mode === 'complet'
                  ? 'Tout tient : la routine est jouée telle quelle, avec ses temps de repos.'
                  : "Pour tenir, les exercices s'enchaînent par deux : 15 s de transition, puis 60 s de repos entre les tours."}
                {plan.mode === 'express' && retirees > 0 && ` ${pluriel(retirees, 'série retirée', 'séries retirées')} aux derniers exercices.`}
                {plan.estMin > minutes && ' Même raccourcie au maximum, elle dépasse un peu le temps demandé.'}
              </p>
              <ol className="apercu__liste">
                {plan.blocs.map((b, i) => (
                  <li key={i}>
                    {b.type === 'super' ? (
                      <>
                        <span className="apercu__nom">{b.exos.map((x) => nomDuBloc(x.uid)).join(' + ')}</span>
                        <span className="apercu__meta">Super set · {Math.max(...b.exos.map((x) => x.series))} tours</span>
                      </>
                    ) : (
                      <>
                        <span className="apercu__nom">{nomDuBloc(b.exos[0].uid)}</span>
                        <span className="apercu__meta">{pluriel(b.exos[0].series, 'série')}</span>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            routine && <p className="avis">Cette routine n'a aucune série : ajoute-lui des exercices avant de la lancer.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
