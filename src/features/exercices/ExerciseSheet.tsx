import { useEffect, useMemo, useState } from 'react';
import { db } from '../../db/schema';
import { partieDuGroupe } from '../../db/seed';
import { numeros, uid } from '../../domain/blocs';
import { etiquetteSerie, fmtDate, fmtSerie } from '../../domain/format';
import { GROUPES, MATERIELS, type Exercise, type ExerciseKind, type Groupe, type Materiel } from '../../domain/types';
import { useCatalogue, useRoutines, useWorkouts } from '../../state/data';
import { draftStore } from '../../state/draft';
import { ConfirmSheet, Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/toast';
import { ExerciseVisual } from './ExerciseVisual';
import { VIS } from './vis';

const TYPES: { kind: ExerciseKind; label: string }[] = [
  { kind: 'charge', label: 'Charge et répétitions' },
  { kind: 'corps', label: 'Poids du corps (lest facultatif)' },
  { kind: 'duree', label: 'Durée tenue, en secondes' },
];

export function typeEnClair(kind: ExerciseKind): string {
  return TYPES.find((t) => t.kind === kind)?.label ?? '';
}

// ---------- création et modification d'un exercice personnel ----------

interface FormProps {
  open: boolean;
  onClose: () => void;
  initial?: Exercise;
  nomInitial?: string;
  onSaved?: (e: Exercise) => void;
}

export function ExerciseForm({ open, onClose, initial, nomInitial = '', onSaved }: FormProps) {
  const [nom, setNom] = useState('');
  const [groupe, setGroupe] = useState<Groupe>('Pectoraux');
  const [materiel, setMateriel] = useState<Materiel>('Haltères');
  const [kind, setKind] = useState<ExerciseKind>('charge');

  useEffect(() => {
    if (!open) return;
    setNom(initial?.nom ?? nomInitial);
    setGroupe(initial?.groupe ?? 'Pectoraux');
    setMateriel(initial?.materiel ?? 'Haltères');
    setKind(initial?.kind ?? 'charge');
  }, [open, initial, nomInitial]);

  const valide = nom.trim().length > 0;

  async function enregistrer() {
    if (!valide) return;
    const e: Exercise = {
      id: initial?.id ?? `perso-${uid()}`,
      nom: nom.trim(),
      groupe,
      partie: partieDuGroupe(groupe),
      materiel,
      kind,
      visKey: initial?.visKey,
      custom: true,
    };
    await db.exercises.put(e);
    toast(initial ? 'Exercice modifié' : 'Exercice créé');
    onClose();
    onSaved?.(e);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      titre={initial ? "Modifier l'exercice" : 'Nouvel exercice'}
      pied={
        <button type="button" className="btn btn--primary btn--bloc" disabled={!valide} onClick={enregistrer}>
          Enregistrer
        </button>
      }
    >
      <div className="formulaire">
        <label className="champ">
          <span>Nom</span>
          <input className="saisie" type="text" value={nom} maxLength={60} placeholder="Tirage menton à la poulie" onChange={(e) => setNom(e.currentTarget.value)} />
        </label>
        <label className="champ">
          <span>Groupe musculaire</span>
          <select className="saisie" value={groupe} onChange={(e) => setGroupe(e.currentTarget.value as Groupe)}>
            {GROUPES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="champ">
          <span>Matériel</span>
          <select className="saisie" value={materiel} onChange={(e) => setMateriel(e.currentTarget.value as Materiel)}>
            {MATERIELS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="champ">
          <span>Ce que tu notes à chaque série</span>
          <select className="saisie" value={kind} onChange={(e) => setKind(e.currentTarget.value as ExerciseKind)}>
            {TYPES.map((t) => (
              <option key={t.kind} value={t.kind}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Sheet>
  );
}

// ---------- fiche d'un exercice ----------

export function ExerciseSheet({ exerciseId, onClose }: { exerciseId: string | null; onClose: () => void }) {
  const catalogue = useCatalogue();
  const workouts = useWorkouts();
  const routines = useRoutines();
  const [edition, setEdition] = useState(false);
  const [suppression, setSuppression] = useState(false);

  // la fiche garde son contenu pendant qu'elle se ferme
  const [dernierId, setDernierId] = useState(exerciseId);
  useEffect(() => {
    if (exerciseId) setDernierId(exerciseId);
  }, [exerciseId]);
  const e = dernierId ? catalogue?.parId.get(dernierId) : undefined;

  const derniere = useMemo(() => {
    if (!e || !workouts) return null;
    for (const w of workouts) {
      const sets = w.exercises.filter((b) => b.exerciseId === e.id).flatMap((b) => b.sets.filter((s) => s.done));
      if (sets.length) return { date: w.debut, sets };
    }
    return null;
  }, [e, workouts]);

  const utilisations = useMemo(() => {
    if (!e) return 0;
    const dans = (blocs: { exerciseId: string }[]) => blocs.some((b) => b.exerciseId === e.id);
    const n = (workouts ?? []).filter((w) => dans(w.exercises)).length + (routines ?? []).filter((r) => dans(r.exercises)).length;
    return n + (draftStore.get() && dans(draftStore.get()!.exercises) ? 1 : 0);
  }, [e, workouts, routines]);

  const conseils = e && VIS[e.id] ? VIS[e.id].conseils : [];

  async function supprimer() {
    if (!e) return;
    await db.exercises.delete(e.id);
    toast('Exercice supprimé');
    onClose();
  }

  return (
    <>
      <Sheet open={exerciseId !== null && !edition} onClose={onClose} titre={e?.nom ?? 'Exercice'}>
        {e && (
          <div className="fiche">
            <div className="fiche__visuel">
              <ExerciseVisual exerciseId={e.id} visKey={e.visKey} grand />
            </div>
            <p className="fiche__meta">
              {e.groupe} · {e.materiel} · {typeEnClair(e.kind)}
            </p>

            {conseils.length > 0 && (
              <ol className="conseils">
                {conseils.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            )}

            <section className="fiche__bloc">
              <h3>Dernière fois</h3>
              {derniere ? (
                <>
                  <p className="fiche__date">{fmtDate(derniere.date)}</p>
                  <ul className="series-lues">
                    {derniere.sets.map((s, i) => (
                      <li key={i}>
                        <span className="series-lues__n">{etiquetteSerie(s.type, numeros(derniere.sets)[i])}</span>
                        <span>{fmtSerie(s, e.kind)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="discret">Pas encore travaillé. Tes séries apparaîtront ici après ta première séance.</p>
              )}
            </section>

            {e.custom && (
              <div className="pile">
                <button type="button" className="btn btn--ghost" onClick={() => setEdition(true)}>
                  Modifier
                </button>
                <button type="button" className="btn btn--danger" onClick={() => setSuppression(true)}>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <ExerciseForm open={edition} onClose={() => setEdition(false)} initial={e} />

      <ConfirmSheet
        open={suppression && utilisations === 0}
        onClose={() => setSuppression(false)}
        titre="Supprimer cet exercice ?"
        message={`« ${e?.nom ?? ''} » sera retiré de ta bibliothèque.`}
        confirmer="Supprimer"
        danger
        onConfirm={supprimer}
      />
      <Sheet open={suppression && utilisations > 0} onClose={() => setSuppression(false)} titre="Exercice utilisé">
        <p className="sheet__message">
          « {e?.nom ?? ''} » figure dans {utilisations} séance{utilisations > 1 ? 's' : ''} ou routine{utilisations > 1 ? 's' : ''}. Le supprimer
          laisserait des séries sans nom : retire-le d'abord de tes routines, ou garde-le.
        </p>
        <button type="button" className="btn btn--ghost btn--bloc" onClick={() => setSuppression(false)}>
          Compris
        </button>
      </Sheet>
    </>
  );
}
