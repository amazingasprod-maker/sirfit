import { useState } from 'react';
import { fmtDuree, fmtJourMois, fmtKg, fmtNombre, pluriel } from '../../domain/format';
import type { SemaineAgg } from '../../domain/stats';

type Mesure = 'duree' | 'volume' | 'reps';

const MESURES: { cle: Mesure; label: string }[] = [
  { cle: 'duree', label: 'Durée' },
  { cle: 'volume', label: 'Volume' },
  { cle: 'reps', label: 'Répétitions' },
];

const PALIERS_MIN = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480, 600, 900, 1200];

function valeur(s: SemaineAgg, m: Mesure): number {
  return m === 'duree' ? s.dureeMin : m === 'volume' ? s.volume : s.reps;
}

/** Pas de graduation : deux pas couvrent le maximum, avec des nombres ronds. */
function pasRond(max: number, m: Mesure): number {
  if (m === 'duree') return PALIERS_MIN.find((p) => p * 2 >= max) ?? Math.ceil(max / 2 / 600) * 600;
  if (max <= 0) return m === 'volume' ? 500 : 50;
  const brut = max / 2;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const base = [1, 2, 2.5, 5, 10].find((b) => b * puissance >= brut) ?? 10;
  return base * puissance;
}

function enClair(v: number, m: Mesure): string {
  if (m === 'duree') return fmtDuree(v);
  if (m === 'volume') return fmtKg(Math.round(v));
  return `${fmtNombre(v)} ${v > 1 ? 'répétitions' : 'répétition'}`;
}

/** Graduation : en entier sous 10 000, abrégée dès que l'axe l'atteint. Un seul style par axe. */
function graduation(v: number, m: Mesure, sommet: number): string {
  if (m === 'duree') return v === 0 ? '0' : v % 60 === 0 ? `${v / 60} h` : fmtDuree(v);
  if (sommet >= 10000) return v === 0 ? '0' : `${fmtNombre(v / 1000)} k`;
  return fmtNombre(v);
}

// repère du tracé
const L = 340;
const H = 168;
const GAUCHE = 46;
const DROITE = 6;
const HAUT = 10;
const BAS = 24;
const LARGEUR_BARRE_MAX = 24;

interface Props {
  semaines: SemaineAgg[];
}

/**
 * Les 12 dernières semaines en colonnes. Une seule série : pas de légende, le
 * sélecteur dit ce qui est mesuré. La semaine touchée s'affiche en clair au-dessus,
 * car sur un téléphone le doigt cacherait une infobulle.
 */
export function WeeklyChart({ semaines }: Props) {
  const [mesure, setMesure] = useState<Mesure>('duree');
  const dernier = semaines.length - 1;
  const [choisie, setChoisie] = useState(dernier);
  const index = Math.min(choisie, dernier);

  const max = Math.max(0, ...semaines.map((s) => valeur(s, mesure)));
  const pas = pasRond(max, mesure);
  const sommet = pas * 2;
  const largeurZone = L - GAUCHE - DROITE;
  const hauteurZone = H - HAUT - BAS;
  const tranche = largeurZone / semaines.length;
  const largeurBarre = Math.min(LARGEUR_BARRE_MAX, tranche * 0.62);
  const y = (v: number) => HAUT + hauteurZone * (1 - v / sommet);
  const base = y(0);

  const sel = semaines[index];
  const titreSemaine = index === dernier ? 'Cette semaine' : `Semaine du ${fmtJourMois(sel.debut)}`;

  return (
    <div className="graphe">
      <div className="seg" role="group" aria-label="Mesure affichée">
        {MESURES.map((m) => (
          <button key={m.cle} type="button" aria-pressed={m.cle === mesure} onClick={() => setMesure(m.cle)}>
            {m.label}
          </button>
        ))}
      </div>

      <p className="graphe__lecture" aria-live="polite">
        <strong>{enClair(valeur(sel, mesure), mesure)}</strong>
        <span>
          {titreSemaine} · {pluriel(sel.seances, 'séance')}
        </span>
      </p>

      <svg className="graphe__trace" viewBox={`0 0 ${L} ${H}`} role="group" aria-label={`${MESURES.find((m) => m.cle === mesure)!.label} par semaine, 12 dernières semaines`}>
        {[0, pas, sommet].map((t) => (
          <g key={t}>
            <line className="graphe__grille" x1={GAUCHE} x2={L - DROITE} y1={y(t)} y2={y(t)} />
            <text className="graphe__gradu" x={GAUCHE - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {graduation(t, mesure, sommet)}
            </text>
          </g>
        ))}

        {semaines.map((s, i) => {
          const v = valeur(s, mesure);
          const cx = GAUCHE + tranche * (i + 0.5);
          const x = cx - largeurBarre / 2;
          const h = v > 0 ? Math.max(3, base - y(v)) : 0;
          const r = Math.min(4, h);
          const actif = i === index;
          const nom = i === dernier ? 'Cette semaine' : `Semaine du ${fmtJourMois(s.debut)}`;
          return (
            <g key={s.debut.getTime()}>
              {v > 0 ? (
                // extrémité arrondie côté valeur, pied carré sur la ligne de base
                <path
                  className={`graphe__barre${actif ? ' graphe__barre--active' : ''}`}
                  d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + largeurBarre - r} Q${x + largeurBarre},${base - h} ${x + largeurBarre},${base - h + r} V${base} Z`}
                />
              ) : (
                <rect className={`graphe__zero${actif ? ' graphe__zero--actif' : ''}`} x={x} y={base - 2} width={largeurBarre} height={2} />
              )}
              {/* la cible tactile couvre toute la tranche, pas seulement l'encre */}
              <rect
                className="graphe__cible"
                x={GAUCHE + tranche * i}
                y={HAUT}
                width={tranche}
                height={hauteurZone + BAS}
                tabIndex={0}
                role="button"
                aria-pressed={actif}
                aria-label={`${nom} : ${enClair(v, mesure)}, ${pluriel(s.seances, 'séance')}`}
                onPointerDown={() => setChoisie(i)}
                onFocus={() => setChoisie(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') setChoisie(Math.max(0, i - 1));
                  if (e.key === 'ArrowRight') setChoisie(Math.min(dernier, i + 1));
                }}
              />
            </g>
          );
        })}

        {semaines.map((s, i) =>
          (dernier - i) % 4 === 0 ? (
            <text
              key={i}
              className={`graphe__date${i === index ? ' graphe__date--active' : ''}`}
              x={i === dernier ? L - DROITE : GAUCHE + tranche * (i + 0.5)}
              y={H - 6}
              textAnchor={i === dernier ? 'end' : 'middle'}
            >
              {fmtJourMois(s.debut)}
            </text>
          ) : null,
        )}
      </svg>

      <table className="sr-seul">
        <caption>{MESURES.find((m) => m.cle === mesure)!.label} par semaine</caption>
        <thead>
          <tr>
            <th scope="col">Semaine du</th>
            <th scope="col">Valeur</th>
            <th scope="col">Séances</th>
          </tr>
        </thead>
        <tbody>
          {semaines.map((s) => (
            <tr key={s.debut.getTime()}>
              <th scope="row">{fmtJourMois(s.debut)}</th>
              <td>{enClair(valeur(s, mesure), mesure)}</td>
              <td>{s.seances}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
