import { useState } from 'react';
import { useCatalogue } from '../../state/data';
import { Icon } from '../../ui/Icon';
import { ExerciseList } from './ExerciseList';
import { ExerciseForm, ExerciseSheet } from './ExerciseSheet';

export function ExercisesPage() {
  const catalogue = useCatalogue();
  const [fiche, setFiche] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  return (
    <div className="page">
      <header className="tete">
        <h1>Exercices</h1>
        <button type="button" className="iconbtn" onClick={() => setCreation(true)} aria-label="Créer un exercice">
          <Icon name="plus" />
        </button>
      </header>

      {catalogue && <ExerciseList exercises={catalogue.liste} onPick={(e) => setFiche(e.id)} onCreer={() => setCreation(true)} />}

      <ExerciseSheet exerciseId={fiche} onClose={() => setFiche(null)} />
      <ExerciseForm open={creation} onClose={() => setCreation(false)} />
    </div>
  );
}
