import { useState } from 'react';
import { useLocation } from 'wouter';
import { db, majSettings } from '../../db/schema';
import { draftDepuisRoutine, draftVide, dupliquerRoutine } from '../../domain/blocs';
import { pluriel } from '../../domain/format';
import { adapterAuLieu, type Lieu } from '../../domain/lieu';
import { compteSemaine, seanceDuJour } from '../../domain/stats';
import type { Draft, Routine } from '../../domain/types';
import { useCatalogue, useRoutines, useSettings, useWorkouts } from '../../state/data';
import { draftStore } from '../../state/draft';
import { Icon } from '../../ui/Icon';
import { ActionSheet, ConfirmSheet, Sheet } from '../../ui/Sheet';
import { panneauOuvert } from '../../ui/hooks';
import { toast } from '../../ui/toast';
import { AdaptiveSheet } from './AdaptiveSheet';

const OBJECTIF_HEBDO = 2;

function Jauge({ label, n }: { label: string; n: number }) {
  return (
    <div className="jauge">
      <span className="jauge__label">{label}</span>
      <span className="jauge__pips" aria-hidden="true">
        {Array.from({ length: OBJECTIF_HEBDO }, (_, i) => (
          <i key={i} className={i < n ? 'on' : undefined} />
        ))}
      </span>
      <span className="jauge__compte">
        {n}/{OBJECTIF_HEBDO}
      </span>
    </div>
  );
}

export function SeancePage() {
  const routines = useRoutines();
  const workouts = useWorkouts();
  const catalogue = useCatalogue();
  const { lieu } = useSettings();
  const [, naviguer] = useLocation();
  const [adaptee, setAdaptee] = useState(false);
  const [menu, setMenu] = useState<Routine | null>(null);
  const [aSupprimer, setASupprimer] = useState<Routine | null>(null);
  const [enAttente, setEnAttente] = useState<Draft | null>(null);

  function lancer(d: Draft) {
    draftStore.set(d);
    naviguer('/en-cours', { replace: panneauOuvert() });
  }

  /** Une séance déjà en cours n'est jamais écrasée sans qu'on le demande. */
  function demarrer(d: Draft) {
    if (draftStore.get()) setEnAttente(d);
    else lancer(d);
  }

  if (!routines || !workouts || !catalogue) return <div className="page" />;

  const resume = (r: Routine) => r.exercises.map((b) => catalogue.nomDe(b.exerciseId)).join(', ');
  /** la routine telle qu'elle se fait au lieu choisi (à la maison : exercices remplacés) */
  const auLieu = (r: Routine) => adapterAuLieu(r, lieu, catalogue.liste, catalogue.kindDe);
  const jour = seanceDuJour(workouts, routines);
  const duJour = jour.routine ? auLieu(jour.routine) : null;
  const PARTIE = { haut: 'Haut du corps', bas: 'Bas du corps' } as const;
  const changerLieu = (l: Lieu) => void majSettings({ lieu: l });

  return (
    <div className="page">
      <header className="tete">
        <h1>Séance</h1>
      </header>

      {/* L'app choisit la séance : l'inverse de la dernière. Un seul geste pour la lancer. */}
      <section className="du-jour" aria-label="Séance du jour">
        <div className="lieu" role="group" aria-label="Lieu de la séance">
          {(['salle', 'maison'] as const).map((l) => (
            <button key={l} type="button" className="lieu__choix" aria-pressed={lieu === l} onClick={() => changerLieu(l)}>
              {l === 'salle' ? 'Salle' : 'Maison'}
            </button>
          ))}
        </div>
        {jour.faite ? (
          <>
            <p className="du-jour__label du-jour__label--fait">
              <Icon name="coche" size={16} /> Séance du jour faite : {jour.faite.titre}
            </p>
            <p className="du-jour__suite">
              Prochaine fois : <strong>{jour.routine?.titre ?? PARTIE[jour.partie]}</strong>
            </p>
          </>
        ) : duJour ? (
          <>
            <p className="du-jour__label">Aujourd'hui</p>
            <h2 className="du-jour__titre">{duJour.routine.titre}</h2>
            <p className="routine__exos">{resume(duJour.routine)}</p>
            {duJour.changes.length > 0 && (
              <p className="du-jour__suite">
                {pluriel(duJour.changes.filter((c) => c.vers).length, 'exercice remplacé', 'exercices remplacés')} pour la maison
                {duJour.changes.some((c) => !c.vers) && `, ${pluriel(duJour.changes.filter((c) => !c.vers).length, 'retiré', 'retirés')} faute d'équivalent`}
              </p>
            )}
            <button type="button" className="btn btn--primary btn--bloc" onClick={() => demarrer(draftDepuisRoutine(duJour.routine, Date.now()))}>
              Démarrer
            </button>
          </>
        ) : (
          <>
            <p className="du-jour__label">Aujourd'hui : {PARTIE[jour.partie]}</p>
            <p className="du-jour__suite">Aucune routine « {PARTIE[jour.partie]} » avec des exercices. Indique la partie dans une de tes routines.</p>
          </>
        )}
      </section>

      <div className="pile">
        <button type="button" className="btn btn--ghost btn--bloc" onClick={() => demarrer(draftVide(Date.now()))}>
          <Icon name="plus" size={20} />
          Démarrer une séance vide
        </button>
        <button type="button" className="btn btn--ghost btn--bloc" onClick={() => setAdaptee(true)}>
          <Icon name="horloge" size={20} />
          Séance adaptée à mon temps
        </button>
      </div>

      <section className="equilibre" aria-label="Équilibre de la semaine">
        <Jauge label="Haut du corps" n={compteSemaine(workouts, 'haut')} />
        <Jauge label="Bas du corps" n={compteSemaine(workouts, 'bas')} />
        <p className="discret">Cette semaine. Repère : chaque partie au moins {OBJECTIF_HEBDO} fois.</p>
      </section>

      <div className="section-tete">
        <h2>Routines</h2>
        <button type="button" className="btn btn--soft btn--sm" onClick={() => naviguer('/routine/nouvelle')}>
          <Icon name="plus" size={18} />
          Nouvelle
        </button>
      </div>

      {routines.length === 0 ? (
        <div className="vide">
          <p>Une routine, c'est une séance prête à lancer : tes exercices, tes séries, tes temps de repos. Crée la première, tu n'auras plus qu'à cocher.</p>
          <button type="button" className="btn btn--soft" onClick={() => naviguer('/routine/nouvelle')}>
            Créer une routine
          </button>
        </div>
      ) : (
        <ul className="routines">
          {routines.map((r) => (
            <li key={r.id} className="routine">
              <div className="routine__tete">
                <h3>{r.titre}</h3>
                <button type="button" className="iconbtn" onClick={() => setMenu(r)} aria-label={`Options de la routine ${r.titre}`}>
                  <Icon name="plusOptions" />
                </button>
              </div>
              <p className="routine__exos">{r.exercises.length ? resume(auLieu(r).routine) : 'Aucun exercice pour le moment.'}</p>
              <button type="button" className="btn btn--soft btn--bloc" disabled={r.exercises.length === 0} onClick={() => demarrer(draftDepuisRoutine(auLieu(r).routine, Date.now()))}>
                Démarrer la routine
              </button>
            </li>
          ))}
        </ul>
      )}

      <AdaptiveSheet open={adaptee} onClose={() => setAdaptee(false)} routines={routines.map((r) => auLieu(r).routine)} workouts={workouts} catalogue={catalogue} onDemarrer={demarrer} />

      <ActionSheet
        open={menu !== null}
        onClose={() => setMenu(null)}
        titre={menu?.titre}
        actions={
          menu
            ? [
                { label: 'Modifier', icon: 'crayon', onSelect: () => naviguer(`/routine/${menu.id}`, { replace: true }) },
                {
                  label: 'Dupliquer',
                  icon: 'copier',
                  onSelect: async () => {
                    const ordre = Math.max(-1, ...routines.map((x) => x.ordre)) + 1;
                    await db.routines.add(dupliquerRoutine(menu, ordre, Date.now()));
                    toast('Routine dupliquée');
                  },
                },
                { label: 'Supprimer', icon: 'corbeille', danger: true, onSelect: () => setASupprimer(menu) },
              ]
            : []
        }
      />

      <ConfirmSheet
        open={aSupprimer !== null}
        onClose={() => setASupprimer(null)}
        titre="Supprimer cette routine ?"
        message={`« ${aSupprimer?.titre ?? ''} » (${pluriel(aSupprimer?.exercises.length ?? 0, 'exercice')}) sera supprimée. Les séances déjà enregistrées avec elle restent dans ton historique.`}
        confirmer="Supprimer la routine"
        danger
        onConfirm={async () => {
          if (!aSupprimer) return;
          await db.routines.delete(aSupprimer.id);
          toast('Routine supprimée');
        }}
      />

      <Sheet open={enAttente !== null} onClose={() => setEnAttente(null)} titre="Une séance est déjà en cours">
        <p className="sheet__message">« {draftStore.get()?.titre} » n'est pas terminée. Si tu en démarres une autre, ses séries seront perdues.</p>
        <div className="pile">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEnAttente(null);
              naviguer('/en-cours', { replace: true });
            }}
          >
            Reprendre la séance en cours
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              const d = enAttente;
              setEnAttente(null);
              if (d) {
                draftStore.set(d);
                naviguer('/en-cours', { replace: true });
              }
            }}
          >
            La remplacer par la nouvelle
          </button>
        </div>
      </Sheet>
    </div>
  );
}
