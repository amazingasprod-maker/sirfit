import { Link } from 'wouter';
import { fmtDate, fmtDuree, fmtHeure, fmtKg, pluriel } from '../../domain/format';
import { compte, dureeMin, seriesSeance, volumeSeance } from '../../domain/stats';
import type { Workout } from '../../domain/types';
import type { Catalogue } from '../../state/data';
import { ExerciseVisual } from '../exercices/ExerciseVisual';

const VISIBLES = 4;

export function Compteurs({ w, catalogue }: { w: Workout; catalogue: Catalogue }) {
  return (
    <dl className="compteurs compteurs--carte">
      <div>
        <dt>Durée</dt>
        <dd>{fmtDuree(dureeMin(w))}</dd>
      </div>
      <div>
        <dt>Volume</dt>
        <dd>{fmtKg(volumeSeance(w, catalogue.kindDe))}</dd>
      </div>
      <div>
        <dt>Séries</dt>
        <dd>{seriesSeance(w)}</dd>
      </div>
    </dl>
  );
}

export function WorkoutCard({ w, catalogue }: { w: Workout; catalogue: Catalogue }) {
  const reste = w.exercises.length - VISIBLES;
  return (
    <Link href={`/seances/${w.id}`} className="seance">
      <div className="seance__tete">
        <h3>{w.titre}</h3>
        <span>
          {fmtDate(w.debut)} · {fmtHeure(w.debut)}
        </span>
      </div>
      <Compteurs w={w} catalogue={catalogue} />
      <ul className="seance__exos">
        {w.exercises.slice(0, VISIBLES).map((b) => (
          <li key={b.uid}>
            <span className="vignette vignette--xs">
              <ExerciseVisual exerciseId={b.exerciseId} visKey={catalogue.parId.get(b.exerciseId)?.visKey} />
            </span>
            <span className="seance__n">{b.sets.filter(compte).length || b.sets.length} ×</span>
            <span className="seance__nom">{catalogue.nomDe(b.exerciseId)}</span>
          </li>
        ))}
      </ul>
      {reste > 0 && <p className="seance__reste">et {pluriel(reste, 'autre exercice', 'autres exercices')}</p>}
    </Link>
  );
}
