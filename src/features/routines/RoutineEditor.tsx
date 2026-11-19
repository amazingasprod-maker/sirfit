import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { db } from '../../db/schema';
import { uid } from '../../domain/blocs';
import type { Partie, Routine } from '../../domain/types';
import { useCatalogue, useRoutines, useSettings } from '../../state/data';
import { Icon } from '../../ui/Icon';
import { ConfirmSheet } from '../../ui/Sheet';
import { apresPanneaux } from '../../ui/hooks';
import { toast } from '../../ui/toast';
import { BlocsEditor } from '../seance/BlocsEditor';

const PARTIES: { valeur: Partie | null; label: string }[] = [
  { valeur: 'haut', label: 'Haut du corps' },
  { valeur: 'bas', label: 'Bas du corps' },
  { valeur: null, label: 'Libre' },
];

function routineVide(ordre: number): Routine {
  const now = Date.now();
  return { id: uid(), titre: '', note: '', partie: null, ordre, exercises: [], createdAt: now, updatedAt: now };
}

export function RoutineEditor() {
  const { id } = useParams<{ id: string }>();
  const nouvelle = id === 'nouvelle';
  const routines = useRoutines();
  const catalogue = useCatalogue();
  const settings = useSettings();
  const [, naviguer] = useLocation();

  const [r, setR] = useState<Routine | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [modifiee, setModifiee] = useState(false);
  const [quitter, setQuitter] = useState(false);
  const [suppression, setSuppression] = useState(false);

  // copie de travail : rien n'est écrit tant qu'on n'a pas enregistré
  useEffect(() => {
    if (r || !routines) return;
    if (nouvelle) {
      setR(routineVide(Math.max(-1, ...routines.map((x) => x.ordre)) + 1));
      return;
    }
    const trouvee = routines.find((x) => x.id === id);
    if (trouvee) setR(structuredClone(trouvee));
    else setIntrouvable(true);
  }, [r, routines, nouvelle, id]);

  const changer = (patch: Partial<Routine>) => {
    setR((c) => (c ? { ...c, ...patch } : c));
    setModifiee(true);
  };

  const sortir = () => window.history.back();

  if (introuvable) {
    return (
      <div className="page page--plein">
        <div className="vide">
          <p>Cette routine n'existe plus.</p>
          <button type="button" className="btn btn--soft" onClick={() => naviguer('/seance', { replace: true })}>
            Revenir aux routines
          </button>
        </div>
      </div>
    );
  }
  if (!r || !catalogue) return <div className="page page--plein" />;

  const valide = r.titre.trim().length > 0 && r.exercises.length > 0;

  async function enregistrer() {
    if (!r || !valide) return;
    await db.routines.put({ ...r, titre: r.titre.trim(), updatedAt: Date.now() });
    toast(nouvelle ? 'Routine créée' : 'Routine enregistrée');
    sortir();
  }

  return (
    <div className="page page--plein">
      <header className="barre">
        <button type="button" className="iconbtn" onClick={() => (modifiee ? setQuitter(true) : sortir())} aria-label="Fermer sans enregistrer">
          <Icon name="fermer" />
        </button>
        <span className="barre__titre">{nouvelle ? 'Nouvelle routine' : 'Modifier la routine'}</span>
        <button type="button" className="btn btn--primary btn--sm" disabled={!valide} onClick={enregistrer}>
          Enregistrer
        </button>
      </header>

      <div className="formulaire">
        <label className="champ">
          <span>Titre</span>
          <input className="saisie" type="text" value={r.titre} maxLength={60} placeholder="Haut du corps, jour A" onChange={(e) => changer({ titre: e.currentTarget.value })} />
        </label>
        <div className="champ">
          <span>Partie travaillée</span>
          <div className="seg" role="group" aria-label="Partie travaillée">
            {PARTIES.map((p) => (
              <button key={p.label} type="button" aria-pressed={r.partie === p.valeur} onClick={() => changer({ partie: p.valeur })}>
                {p.label}
              </button>
            ))}
          </div>
          <small className="discret">Sert à l'équilibre haut / bas de la semaine et au mini-échauffement proposé en début de séance.</small>
        </div>
      </div>

      <BlocsEditor mode="routine" blocs={r.exercises} onChange={(exercises) => changer({ exercises })} catalogue={catalogue} reposDefautS={settings.reposDefautS} />

      {r.finitions && r.finitions.length > 0 && (
        <section className="finitions" aria-label="Finitions au choix">
          <p className="finitions__titre">Finitions au choix</p>
          <p className="finitions__aide">Proposées en fin de séance, une série à l'échec chacune.</p>
          <div className="finitions__choix">
            {r.finitions.map((fid) => (
              <button
                key={fid}
                type="button"
                className="btn btn--soft btn--sm"
                aria-label={`Retirer ${catalogue.nomDe(fid)} des finitions`}
                onClick={() => changer({ finitions: r.finitions?.filter((x) => x !== fid) })}
              >
                {catalogue.nomDe(fid)}
                <Icon name="fermer" size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      {!valide && modifiee && <p className="avis">Il faut un titre et au moins un exercice pour enregistrer.</p>}

      {!nouvelle && (
        <button type="button" className="btn btn--danger-discret btn--bloc" onClick={() => setSuppression(true)}>
          Supprimer la routine
        </button>
      )}

      <ConfirmSheet
        open={quitter}
        onClose={() => setQuitter(false)}
        titre="Quitter sans enregistrer ?"
        message="Les changements faits sur cette routine seront perdus."
        confirmer="Quitter sans enregistrer"
        danger
        onConfirm={() => apresPanneaux(sortir)}
      />
      <ConfirmSheet
        open={suppression}
        onClose={() => setSuppression(false)}
        titre="Supprimer cette routine ?"
        message="Les séances déjà enregistrées avec elle restent dans ton historique."
        confirmer="Supprimer la routine"
        danger
        onConfirm={async () => {
          await db.routines.delete(r.id);
          toast('Routine supprimée');
          apresPanneaux(sortir);
        }}
      />
    </div>
  );
}
