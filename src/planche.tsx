// Planche de contrôle des dessins (outil de développement, absent du build) :
// chaque exercice de la bibliothèque en vignette 46 px et 28 px, et en grand
// animé. `npm run dev`, puis /planche.html (?theme=clair, ?id=dc pour un seul).
import { createRoot } from 'react-dom/client';
import { exercicesDeBase } from './db/seed';
import { ExerciseVisual } from './features/exercices/ExerciseVisual';
import './styles/tokens.css';
import './styles/app.css';

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') === 'clair' ? 'clair' : 'sombre';
const seul = params.get('id');
const exos = exercicesDeBase().filter((e) => !seul || e.id === seul);

function Planche() {
  return (
    <main style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', background: 'var(--bg)', minHeight: '100vh' }}>
      {exos.map((e) => (
        <section key={e.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: 10, color: 'var(--ink)', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="vignette">
              <ExerciseVisual exerciseId={e.id} visKey={e.visKey} />
            </span>
            <span className="vignette vignette--xs">
              <ExerciseVisual exerciseId={e.id} visKey={e.visKey} />
            </span>
            <strong>{e.nom}</strong>
          </div>
          <div className="fiche__visuel" style={{ marginTop: 8 }}>
            <ExerciseVisual exerciseId={e.id} visKey={e.visKey} grand />
          </div>
        </section>
      ))}
    </main>
  );
}

createRoot(document.getElementById('racine') as HTMLElement).render(<Planche />);
