import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CADRES, ILLUSTRATION } from './illustrations';
import { EP, cadrer, interpoler, pointsDe, visuelDe, type Decor, type Fleche as F, type Pose, type Visuel } from './vis';

const image = (slug: string, n: number) => `${import.meta.env.BASE_URL}illustrations/${slug}/${n}.svg`;
/** ordre de lecture des trois poses dans la fiche : aller puis retour */
const SEQUENCE = [1, 2, 3, 2];

/**
 * Dessin d'exercice de la banque Workout Guide (Bryl Lim, CC BY-SA 4.0) :
 * pose 1 recadrée dans les vignettes, les trois poses enchaînées dans la fiche.
 */
function Illustration({ slug, grand }: { slug: string; grand: boolean }) {
  const [etape, setEtape] = useState(0);
  const cadre = CADRES[slug] ?? { v: [0, 0, 512], f: [0, 0, 512] };
  const [x, y, c] = grand ? cadre.f : cadre.v;

  useEffect(() => {
    if (!grand) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setEtape((e) => (e + 1) % SEQUENCE.length), 650);
    return () => window.clearInterval(t);
  }, [grand]);

  const visibles = grand ? [1, 2, 3] : [1];
  return (
    <svg viewBox={`${x} ${y} ${c} ${c}`} className="vis illu" aria-hidden="true" focusable="false">
      {visibles.map((n) => (
        <image key={n} href={image(slug, n)} width={512} height={512} opacity={!grand || SEQUENCE[etape] === n ? 1 : 0} />
      ))}
    </svg>
  );
}

function DecorSvg({ d }: { d: Decor }) {
  switch (d[0]) {
    case 'r':
      return <rect x={d[1]} y={d[2]} width={d[3]} height={d[4]} rx={d[5]} />;
    case 'l':
      return <line x1={d[1]} y1={d[2]} x2={d[3]} y2={d[4]} />;
    case 'L':
      return <line className="epais" x1={d[1]} y1={d[2]} x2={d[3]} y2={d[4]} strokeWidth={d[5]} />;
    default:
      return <circle cx={d[1]} cy={d[2]} r={d[3]} />;
  }
}

const rond = (k: string) => k === 'tete' || k === 'charge';
const avecHalo = (k: string) => k === 'buste' || k === 'membre' || k === 'barre' || rond(k);

/** Le personnage : chaque élément porte `data-i` pour être déplacé par l'animation. */
function Corps({ v, pose }: { v: Visuel; pose: Pose }) {
  return (
    <>
      {v.traits.map((k, i) => {
        const p = pose[i];
        const t = v.tailles[i];
        if (rond(k)) {
          return (
            <g key={i}>
              <circle className="v-halo" data-i={i} cx={p[0]} cy={p[1]} r={t + EP.halo} />
              <circle className={`v-${k}`} data-i={i} cx={p[0]} cy={p[1]} r={t} />
              {k === 'charge' && <circle className="v-trou" data-i={i} cx={p[0]} cy={p[1]} r={t * 0.3} />}
            </g>
          );
        }
        const pts = pointsDe(p);
        return (
          <g key={i}>
            {avecHalo(k) && <polyline className="v-halo" data-i={i} points={pts} strokeWidth={t + EP.halo * 2} />}
            <polyline className={`v-${k}`} data-i={i} points={pts} strokeWidth={t} />
          </g>
        );
      })}
    </>
  );
}

/** Pose de départ en filigrane (fiche seulement). */
function Fantome({ v }: { v: Visuel }) {
  return (
    <g className="ghost">
      {v.traits.map((k, i) => {
        if (k === 'cible' || k === 'cable') return null;
        const p = v.A[i];
        const t = v.tailles[i];
        return rond(k) ? <circle key={i} cx={p[0]} cy={p[1]} r={t} /> : <polyline key={i} points={pointsDe(p)} strokeWidth={t} />;
      })}
    </g>
  );
}

function Fleche({ f }: { f: F }) {
  const [x1, y1, x2, y2] = f;
  const an = Math.atan2(y2 - y1, x2 - x1);
  const p = (a: number, d: number) => `${(x2 - Math.cos(an + a) * d).toFixed(1)},${(y2 - Math.sin(an + a) * d).toFixed(1)}`;
  return (
    <g className="fleche">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={`${x2},${y2} ${p(0.45, 7)} ${p(-0.45, 7)}`} />
    </g>
  );
}

interface Props {
  /** exercice de la bibliothèque : son illustration, s'il en a une */
  exerciseId?: string;
  /** pictogramme dessiné par l'app : pour les exercices sans illustration */
  visKey?: string;
  /** grand : scène entière, mouvement animé */
  grand?: boolean;
}

export const ExerciseVisual = memo(function ExerciseVisual({ exerciseId, visKey, grand = false }: Props) {
  const slug = exerciseId ? ILLUSTRATION[exerciseId] : undefined;
  if (slug) return <Illustration slug={slug} grand={grand} />;
  return <Pictogramme visKey={visKey} grand={grand} />;
});

function Pictogramme({ visKey, grand }: { visKey?: string; grand: boolean }) {
  const v = visuelDe(visKey);
  const svg = useRef<SVGSVGElement>(null);
  const anime = grand && !v.statique;
  const vue = useMemo(() => (grand ? '0 0 120 100' : cadrer(v).map((n) => n.toFixed(1)).join(' ')), [grand, v]);

  useEffect(() => {
    if (!anime) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const g = svg.current?.querySelector('g.pz');
    if (!g) return;
    const noeuds: SVGElement[][] = [];
    g.querySelectorAll<SVGElement>('[data-i]').forEach((n) => {
      const i = Number(n.dataset.i);
      (noeuds[i] ??= []).push(n);
    });
    const t0 = performance.now();
    const CYCLE = 2100;
    let raf = 0;
    const tick = (now: number) => {
      let k = ((now - t0) % CYCLE) / CYCLE;
      k = k < 0.5 ? k * 2 : 2 - k * 2;
      k = 0.5 - Math.cos(Math.PI * k) / 2;
      interpoler(v.A, v.B, k).forEach((p, i) => {
        for (const n of noeuds[i] ?? []) {
          if (n.tagName === 'circle') {
            n.setAttribute('cx', p[0].toFixed(1));
            n.setAttribute('cy', p[1].toFixed(1));
          } else n.setAttribute('points', pointsDe(p));
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anime, v]);

  return (
    <svg ref={svg} viewBox={vue} className="vis" aria-hidden="true" focusable="false">
      {grand && <line className="sol" x1={6} y1={88} x2={114} y2={88} />}
      <g className="decor">{(v.decor ?? []).map((d, i) => <DecorSvg key={i} d={d} />)}</g>
      {anime && <Fantome v={v} />}
      <g className="pz">
        <Corps v={v} pose={grand || v.vignette !== 'A' ? v.B : v.A} />
      </g>
      {grand && v.F?.map((f, i) => <Fleche key={i} f={f} />)}
    </svg>
  );
}
