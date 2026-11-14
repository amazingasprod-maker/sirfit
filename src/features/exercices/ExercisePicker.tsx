import { useEffect, useState } from 'react';
import { pluriel } from '../../domain/format';
import type { Exercise } from '../../domain/types';
import { Sheet } from '../../ui/Sheet';
import { ExerciseList } from './ExerciseList';
import { ExerciseForm } from './ExerciseSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  /** un seul : le premier toucher choisit (remplacement d'un exercice) */
  unSeul?: boolean;
  onChoisir: (ids: string[]) => void;
}

export function ExercisePicker({ open, onClose, exercises, unSeul = false, onChoisir }: Props) {
  const [selection, setSelection] = useState<string[]>([]);
  const [creation, setCreation] = useState(false);

  useEffect(() => {
    if (open) setSelection([]);
  }, [open]);

  function basculer(e: Exercise) {
    if (unSeul) {
      onClose();
      onChoisir([e.id]);
      return;
    }
    setSelection((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]));
  }

  return (
    <>
      <Sheet
        open={open && !creation}
        onClose={onClose}
        plein
        titre={unSeul ? "Remplacer l'exercice" : 'Ajouter des exercices'}
        pied={
          unSeul ? undefined : (
            <button
              type="button"
              className="btn btn--primary btn--bloc"
              disabled={selection.length === 0}
              onClick={() => {
                onClose();
                onChoisir(selection);
              }}
            >
              {selection.length === 0 ? 'Choisis un exercice' : `Ajouter ${pluriel(selection.length, 'exercice')}`}
            </button>
          )
        }
      >
        <ExerciseList exercises={exercises} selection={unSeul ? undefined : new Set(selection)} onPick={basculer} onCreer={() => setCreation(true)} />
      </Sheet>
      <ExerciseForm
        open={creation}
        onClose={() => setCreation(false)}
        onSaved={(e) => {
          if (unSeul) {
            onClose();
            onChoisir([e.id]);
          } else setSelection((s) => [...s, e.id]);
        }}
      />
    </>
  );
}
