import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { Router } from 'wouter';
import { App } from './App';
import { completerBibliotheque, completerRoutines } from './db/schema';
import { draftStore } from './state/draft';
import './styles/tokens.css';
import './styles/app.css';

// mise à jour silencieuse : la nouvelle version est prise au prochain lancement
registerSW({ immediate: true });

// Chemin de base : `/` en local, `/sirfit/` sur GitHub Pages. Les routes de
// l'app restent écrites depuis la racine (`/seance`), wouter ajoute la base.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// L'app s'ouvre sur la séance du jour (demande de Lamine du 14/11 : zéro geste
// inutile). Seulement au lancement : l'onglet Profil reste joignable ensuite.
if (location.pathname === `${BASE}/` || location.pathname === BASE) history.replaceState(null, '', `${BASE}/seance`);

void draftStore.charger();
void completerBibliotheque()
  .then(() => completerRoutines())
  .catch((e) => console.error('Bibliothèque non complétée', e));

// Demande au navigateur de ne pas vider les données quand le téléphone manque de place.
// Sans effet visible : accordé d'office à une app installée, sinon simplement refusé.
void navigator.storage?.persisted?.().then((deja) => {
  if (!deja) void navigator.storage.persist?.();
});

createRoot(document.getElementById('racine')!).render(
  <Router base={BASE}>
    <App />
  </Router>,
);
