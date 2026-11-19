import { useEffect, useRef, useState } from 'react';
import { SauvegardeInvalide, exporter, importer, nomDeFichier, toutEffacer, valider, type Sauvegarde } from '../../db/backup';
import { completerBibliotheque, completerRoutines, majSettings } from '../../db/schema';
import { fmtDate, fmtHeure, fmtRepos, pluriel } from '../../domain/format';
import type { Settings, ThemeChoice } from '../../domain/types';
import { useRoutines, useSettings, useWorkouts } from '../../state/data';
import { draftStore } from '../../state/draft';
import { Icon } from '../../ui/Icon';
import { ActionSheet, ConfirmSheet } from '../../ui/Sheet';
import { toast } from '../../ui/toast';

const REPOS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const THEMES: { valeur: ThemeChoice; label: string }[] = [
  { valeur: 'sombre', label: 'Sombre' },
  { valeur: 'clair', label: 'Clair' },
  { valeur: 'systeme', label: 'Système' },
];

function Bascule({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="bascule">
      <span className="bascule__texte">
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span className="bascule__piste" aria-hidden="true" />
    </label>
  );
}

function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function SettingsPage() {
  const settings = useSettings();
  const workouts = useWorkouts();
  const routines = useRoutines();
  const fichier = useRef<HTMLInputElement>(null);

  const [nom, setNom] = useState<string | null>(null);
  const [choixRepos, setChoixRepos] = useState(false);
  const [aImporter, setAImporter] = useState<Sauvegarde | null>(null);
  const [effacer, setEffacer] = useState(false);
  const [protege, setProtege] = useState<boolean | null>(null);
  const [partageable, setPartageable] = useState(false);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setProtege);
    try {
      const essai = new File(['{}'], 'essai.json', { type: 'application/json' });
      setPartageable(Boolean(navigator.canShare?.({ files: [essai] })));
    } catch {
      setPartageable(false);
    }
  }, []);

  const maj = (patch: Partial<Settings>) => void majSettings(patch);

  async function fabriquer(): Promise<File> {
    const contenu = JSON.stringify(await exporter());
    return new File([contenu], nomDeFichier(), { type: 'application/json' });
  }

  async function exporterFichier() {
    try {
      const f = await fabriquer();
      telecharger(f, f.name);
      await majSettings({ derniereSauvegarde: Date.now() });
      toast(`Sauvegarde enregistrée : ${f.name}`);
    } catch (e) {
      console.error(e);
      toast("La sauvegarde n'a pas pu être créée. Réessaie.", true);
    }
  }

  async function partagerFichier() {
    try {
      const f = await fabriquer();
      await navigator.share({ files: [f], title: 'Sauvegarde Sir Fit' });
      await majSettings({ derniereSauvegarde: Date.now() });
      toast('Sauvegarde envoyée');
    } catch (e) {
      // l'utilisateur a refermé la feuille de partage : ce n'est pas une erreur
      if ((e as DOMException)?.name !== 'AbortError') toast("Le partage n'a pas abouti. Utilise « Exporter » à la place.", true);
    }
  }

  async function lireFichier(f: File | undefined) {
    if (!f) return;
    try {
      setAImporter(valider(JSON.parse(await f.text())));
    } catch (e) {
      toast(e instanceof SauvegardeInvalide ? e.message : "Ce fichier n'a pas pu être lu : ce n'est pas une sauvegarde valide.", true);
    } finally {
      if (fichier.current) fichier.current.value = '';
    }
  }

  async function demanderProtection() {
    const ok = await navigator.storage?.persist?.();
    setProtege(Boolean(ok));
    toast(ok ? 'Stockage protégé' : "Le navigateur n'a pas accordé la protection. Installe l'app sur l'écran d'accueil puis réessaie.", !ok);
  }

  return (
    <div className="page page--plein">
      <header className="barre">
        <button type="button" className="iconbtn" onClick={() => window.history.back()} aria-label="Retour">
          <Icon name="retour" />
        </button>
        <span className="barre__titre">Réglages</span>
        <span className="barre__vide" />
      </header>

      <section className="reglages">
        <h2>Profil</h2>
        <label className="champ">
          <span>Nom affiché</span>
          <input
            className="saisie"
            type="text"
            maxLength={30}
            autoComplete="off"
            placeholder="Ton prénom"
            value={nom ?? settings.nom}
            onChange={(e) => setNom(e.currentTarget.value)}
            onBlur={() => {
              if (nom !== null) maj({ nom: nom.trim() });
              setNom(null);
            }}
          />
        </label>
      </section>

      <section className="reglages">
        <h2>Séance</h2>
        <button type="button" className="ligne-reglage" onClick={() => setChoixRepos(true)}>
          <span className="bascule__texte">
            <span>Repos par défaut</span>
            <small>Appliqué à chaque exercice ajouté. Se règle ensuite exercice par exercice.</small>
          </span>
          <span className="ligne-reglage__valeur">{fmtRepos(settings.reposDefautS)}</span>
        </button>
        <Bascule label="Son à la fin du repos" checked={settings.son} onChange={(son) => maj({ son })} />
        <Bascule label="Vibration" detail="À la validation d'une série et à la fin du repos." checked={settings.vibration} onChange={(vibration) => maj({ vibration })} />
        <Bascule
          label="Garder l'écran allumé"
          detail="Pendant une séance, là où le téléphone le permet."
          checked={settings.ecranAllume}
          onChange={(ecranAllume) => maj({ ecranAllume })}
        />
      </section>

      <section className="reglages">
        <h2>Apparence</h2>
        <div className="seg" role="group" aria-label="Thème">
          {THEMES.map((t) => (
            <button key={t.valeur} type="button" aria-pressed={settings.theme === t.valeur} onClick={() => maj({ theme: t.valeur })}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="reglages">
        <h2>Sauvegarde</h2>
        <p className="discret">
          Tes {pluriel(workouts?.length ?? 0, 'séance')} et tes {pluriel(routines?.length ?? 0, 'routine')} vivent uniquement sur cet appareil. Une sauvegarde est un
          fichier que tu gardes ailleurs (Drive, mail, ordinateur) et que tu peux réimporter ici ou sur un autre téléphone.
        </p>
        <p className="etat-sauvegarde">
          Dernière sauvegarde :{' '}
          <strong>
            {settings.derniereSauvegarde === null
              ? 'jamais'
              : `${fmtDate(settings.derniereSauvegarde).toLowerCase()} à ${fmtHeure(settings.derniereSauvegarde)}`}
          </strong>
        </p>
        <div className="pile">
          <button type="button" className="btn btn--primary" onClick={exporterFichier}>
            <Icon name="exporter" size={20} />
            Exporter une sauvegarde
          </button>
          {partageable && (
            <button type="button" className="btn btn--ghost" onClick={partagerFichier}>
              Envoyer la sauvegarde vers une autre app
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => fichier.current?.click()}>
            <Icon name="importer" size={20} />
            Importer une sauvegarde
          </button>
          <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => void lireFichier(e.currentTarget.files?.[0])} />
        </div>

        {protege !== null && (
          <div className="protection">
            <p className="discret">
              {protege
                ? "Stockage protégé : le navigateur ne videra pas tes données pour faire de la place."
                : "Stockage non protégé : le navigateur peut effacer les données d'un site peu utilisé quand le téléphone manque de place."}
            </p>
            {!protege && (
              <button type="button" className="btn btn--soft btn--sm" onClick={demanderProtection}>
                Protéger mes données
              </button>
            )}
          </div>
        )}
      </section>

      <section className="reglages">
        <h2>Remise à zéro</h2>
        <button type="button" className="btn btn--danger-discret btn--bloc" onClick={() => setEffacer(true)}>
          Tout effacer
        </button>
      </section>

      <p className="version">Sir Fit {__APP_VERSION__}</p>
      <p className="version">
        Illustrations d'exercices :{' '}
        <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noreferrer">
          Workout Guide
        </a>{' '}
        par Bryl Lim, en partie d'après{' '}
        <a href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">
          Everkinetic
        </a>
        , licence{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        . Trait recoloré pour l'app.
      </p>

      <ActionSheet
        open={choixRepos}
        onClose={() => setChoixRepos(false)}
        titre="Repos par défaut"
        actions={REPOS.map((s) => ({ label: fmtRepos(s), actif: settings.reposDefautS === s, onSelect: () => maj({ reposDefautS: s }) }))}
      />

      <ConfirmSheet
        open={aImporter !== null}
        onClose={() => setAImporter(null)}
        titre="Remplacer toutes les données ?"
        message={
          aImporter
            ? `Cette sauvegarde contient ${pluriel(aImporter.workouts.length, 'séance')} et ${pluriel(aImporter.routines.length, 'routine')}${
                aImporter.exporteLe ? `, exportées ${fmtDate(aImporter.exporteLe).toLowerCase()}` : ''
              }. Elle remplacera tout ce qui se trouve actuellement dans l'app, séance en cours comprise.`
            : ''
        }
        confirmer="Remplacer par la sauvegarde"
        danger
        onConfirm={async () => {
          if (!aImporter) return;
          try {
            await importer(aImporter);
            await completerBibliotheque();
            await completerRoutines();
            await draftStore.charger();
            toast('Sauvegarde importée');
          } catch (e) {
            console.error(e);
            toast("L'import a échoué : rien n'a été modifié.", true);
          }
        }}
      />

      <ConfirmSheet
        open={effacer}
        onClose={() => setEffacer(false)}
        titre="Tout effacer ?"
        message={`${pluriel(workouts?.length ?? 0, 'séance')}, toutes les routines et les exercices personnels seront supprimés définitivement. Exporte une sauvegarde avant si tu veux pouvoir revenir en arrière.`}
        confirmer="Tout effacer définitivement"
        danger
        onConfirm={async () => {
          await toutEffacer();
          await draftStore.charger();
          toast("L'app est revenue à son état de départ");
        }}
      />
    </div>
  );
}
