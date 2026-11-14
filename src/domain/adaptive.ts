// Séance adaptée au temps disponible. Algorithme repris tel quel de Sir_Fit
// (règle validée le 05/08/2026 : « repos raccourcis mais présents ») :
//  1. mode complet : chaque exercice seul, repos de la routine ;
//  2. si ça dépasse : mode express, super sets par paires, 15 s de transition
//     dans le super set, 60 s de repos entre les tours ;
//  3. si ça dépasse encore : on retire une série aux blocs accessoires en
//     partant de la fin (jamais en dessous de 2), puis des blocs entiers
//     (jamais en dessous de 2 blocs).

export const T_SERIE = 40;
export const T_TRANSITION = 15;
export const REPOS_SUPER = 60;
export const ECHAUF_COMPLET_MIN = 6;
export const ECHAUF_EXPRESS_MIN = 5;

export interface PlanItem {
  /** uid du bloc de la routine dont l'item est tiré */
  uid: string;
  series: number;
  repos: number;
}

export interface PlanBloc {
  type: 'solo' | 'super';
  exos: PlanItem[];
}

export interface Plan {
  minutes: number;
  mode: 'complet' | 'express';
  estMin: number;
  blocs: PlanBloc[];
}

export function estimeBlocs(blocs: PlanBloc[], echaufMin: number): number {
  let sec = echaufMin * 60;
  for (const b of blocs) {
    if (b.type === 'solo') {
      const it = b.exos[0];
      sec += it.series * (T_SERIE + it.repos);
    } else {
      const tours = Math.max(...b.exos.map((x) => x.series));
      sec += tours * (b.exos.length * (T_SERIE + T_TRANSITION) - T_TRANSITION + REPOS_SUPER);
    }
  }
  return Math.round(sec / 60);
}

export function genSeance(source: PlanItem[], minutes: number): Plan | null {
  const items = source.filter((it) => it.series > 0).map((it) => ({ ...it }));
  if (!items.length) return null;

  let blocs: PlanBloc[] = items.map((it) => ({ type: 'solo', exos: [it] }));
  let est = estimeBlocs(blocs, ECHAUF_COMPLET_MIN);
  let mode: Plan['mode'] = 'complet';

  if (est > minutes) {
    mode = 'express';
    blocs = [];
    for (let i = 0; i < items.length; i += 2) {
      const grp = items.slice(i, i + 2).map((it) => ({ ...it }));
      blocs.push({ type: grp.length === 2 ? 'super' : 'solo', exos: grp });
    }
    est = estimeBlocs(blocs, ECHAUF_EXPRESS_MIN);

    let garde = 24;
    while (est > minutes && garde-- > 0) {
      let coupe = false;
      for (let i = blocs.length - 1; i >= 0 && !coupe; i--) {
        for (const x of blocs[i].exos) {
          if (x.series > 2) {
            x.series--;
            coupe = true;
            break;
          }
        }
      }
      if (!coupe) {
        if (blocs.length > 2) blocs.pop();
        else break;
      }
      est = estimeBlocs(blocs, ECHAUF_EXPRESS_MIN);
    }
  }

  return { minutes, mode, estMin: est, blocs };
}
