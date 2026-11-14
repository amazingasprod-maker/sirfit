import { describe, expect, it } from 'vitest';
import {
  dureeMin,
  kindDepuis,
  lundiDe,
  repsSeance,
  semaines,
  semainesDAffilee,
  seanceDuJour,
  seriesSeance,
  suggestionPartie,
  volumeSeance,
} from '../src/domain/stats';
import type { Bloc, Partie, Routine, SetEntry, Workout } from '../src/domain/types';
import { exercicesDeBase } from '../src/db/seed';

const kindDe = kindDepuis(exercicesDeBase());

const s = (kg: number | null, reps: number, type: SetEntry['type'] = 'normale', done = true): SetEntry => ({ type, kg, reps, done });

function bloc(exerciseId: string, sets: SetEntry[]): Bloc {
  return { uid: `${exerciseId}-${Math.random()}`, exerciseId, note: '', reposS: 90, supersetId: null, sets };
}

function seance(date: string, exercises: Bloc[], minutes = 60, partie: Partie | null = null): Workout {
  const debut = new Date(date).getTime();
  return { id: date, titre: 'T', debut, fin: debut + minutes * 60000, note: '', routineId: null, partie, exercises };
}

describe('lundiDe', () => {
  it('ramène au lundi 00:00', () => {
    expect(lundiDe(new Date('2026-11-12T20:09:00')).toDateString()).toBe(new Date('2026-11-09T00:00:00').toDateString());
  });
  it('un dimanche appartient à la semaine qui se termine', () => {
    expect(lundiDe(new Date('2026-11-15T23:59:00')).getDate()).toBe(9);
  });
  it('un lundi est son propre lundi', () => {
    const l = lundiDe(new Date('2026-11-09T00:00:00'));
    expect(l.getDate()).toBe(9);
    expect(l.getHours()).toBe(0);
  });
  it("passe le changement d'année", () => {
    // le jeudi 1er janvier 2026 appartient à la semaine du lundi 29 décembre 2025
    const l = lundiDe(new Date('2026-01-01T10:00:00'));
    expect([l.getFullYear(), l.getMonth(), l.getDate()]).toEqual([2025, 11, 29]);
  });
});

describe('volume, répétitions, séries', () => {
  const w = seance('2026-11-10T18:00:00', [
    bloc('dc', [s(20, 12, 'echauffement'), s(30, 8), s(30, 8), s(32.5, 6), s(32.5, 6, 'normale', false)]),
    bloc('pom', [s(null, 15), s(10, 10)]),
    bloc('gai', [s(null, 45), s(null, 45)]),
  ]);

  it('le volume ignore échauffements, séries non faites et exercices chronométrés', () => {
    // dc : 30×8 + 30×8 + 32,5×6 = 675 · pompes : 0 + 10×10 = 100
    expect(volumeSeance(w, kindDe)).toBe(775);
  });
  it('les répétitions ne comptent pas les secondes de gainage', () => {
    expect(repsSeance(w, kindDe)).toBe(8 + 8 + 6 + 15 + 10);
  });
  it('les séries comptent tout ce qui est fait hors échauffement', () => {
    expect(seriesSeance(w)).toBe(3 + 2 + 2);
  });
  it('la durée est en minutes entières', () => {
    expect(dureeMin(w)).toBe(60);
  });
});

describe('semaines', () => {
  const ref = new Date('2026-11-12T20:00:00').getTime();
  const ws = [
    seance('2026-11-10T18:00:00', [bloc('dc', [s(30, 10)])], 50),
    seance('2026-11-12T07:00:00', [bloc('sq', [s(40, 10)])], 40),
    seance('2026-11-08T23:30:00', [bloc('dc', [s(20, 10)])], 30), // dimanche soir : semaine d'avant
    seance('2026-08-17T10:00:00', [bloc('dc', [s(50, 10)])], 30), // 13e semaine en arrière : hors fenêtre
  ];
  const agg = semaines(ws, kindDe, 12, ref);

  it('rend 12 semaines, de la plus ancienne à la semaine en cours', () => {
    expect(agg).toHaveLength(12);
    expect(agg[11].debut.getDate()).toBe(9);
    expect(agg[0].debut.getTime()).toBeLessThan(agg[11].debut.getTime());
    expect(agg[0].debut.getDay()).toBe(1);
  });
  it('range chaque séance dans sa semaine', () => {
    expect(agg[11]).toMatchObject({ seances: 2, dureeMin: 90, volume: 700, reps: 20 });
    expect(agg[10]).toMatchObject({ seances: 1, dureeMin: 30, volume: 200, reps: 10 });
  });
  it('laisse de côté ce qui est hors fenêtre', () => {
    expect(agg.reduce((t, x) => t + x.seances, 0)).toBe(3);
  });
  it('traverse le passage à l\'heure d\'hiver sans décaler les lundis', () => {
    // le 25/10/2026 l'Allemagne recule d'une heure : chaque début de semaine doit rester un lundi à minuit
    for (const x of agg) {
      expect(x.debut.getDay()).toBe(1);
      expect(x.debut.getHours()).toBe(0);
    }
  });
});

describe("semaines d'affilée", () => {
  const ref = new Date('2026-11-12T20:00:00').getTime();
  const une = (d: string) => seance(d, [bloc('dc', [s(30, 10)])]);

  it('zéro sans séance', () => {
    expect(semainesDAffilee([], ref)).toBe(0);
  });
  it('compte la semaine en cours si elle a une séance', () => {
    expect(semainesDAffilee([une('2026-11-10T18:00:00'), une('2026-11-04T18:00:00'), une('2026-10-28T18:00:00')], ref)).toBe(3);
  });
  it("ne retombe pas à zéro le lundi : repart de la semaine dernière", () => {
    expect(semainesDAffilee([une('2026-11-04T18:00:00'), une('2026-10-28T18:00:00')], ref)).toBe(2);
  });
  it("s'arrête au premier trou", () => {
    expect(semainesDAffilee([une('2026-11-10T18:00:00'), une('2026-10-28T18:00:00')], ref)).toBe(1);
  });
});

describe('suggestion haut / bas', () => {
  const ref = new Date('2026-11-12T20:00:00').getTime();
  const p = (d: string, partie: Partie) => seance(d, [bloc('dc', [s(30, 10)])], 60, partie);

  it('haut par défaut', () => {
    expect(suggestionPartie([], ref)).toBe('haut');
  });
  it("l'inverse de la dernière séance, quel que soit le compte de la semaine", () => {
    expect(suggestionPartie([p('2026-11-10T18:00:00', 'haut')], ref)).toBe('bas');
    expect(suggestionPartie([p('2026-11-10T18:00:00', 'bas')], ref)).toBe('haut');
    // haut lundi, haut mardi, bas mercredi : jeudi, c'est le haut (plus de bas deux jours de suite)
    expect(suggestionPartie([p('2026-11-09T18:00:00', 'haut'), p('2026-11-10T18:00:00', 'haut'), p('2026-11-11T18:00:00', 'bas')], ref)).toBe('haut');
    expect(suggestionPartie([p('2026-11-03T18:00:00', 'haut')], ref)).toBe('bas');
  });
  it('une séance vide (sans partie) ne change pas la suggestion', () => {
    expect(suggestionPartie([p('2026-11-10T18:00:00', 'haut'), seance('2026-11-11T18:00:00', [])], ref)).toBe('bas');
  });
});

describe('séance du jour', () => {
  const ref = new Date('2026-11-12T08:00:00').getTime();
  const routine = (id: string, partie: Partie, ordre: number, vide = false): Routine => ({
    id,
    titre: id,
    note: '',
    partie,
    ordre,
    exercises: vide ? [] : [bloc('dc', [s(30, 10, 'normale', false)])],
    createdAt: 0,
    updatedAt: 0,
  });
  const fait = (d: string, partie: Partie, routineId: string): Workout => ({ ...seance(d, [bloc('dc', [s(30, 10)])], 60, partie), routineId });
  const routines = [routine('haut-a', 'haut', 0), routine('bas-a', 'bas', 1), routine('haut-b', 'haut', 2), routine('bas-vide', 'bas', 3, true)];

  it('haut hier : la routine du bas, sans rien demander', () => {
    const j = seanceDuJour([fait('2026-11-11T18:00:00', 'haut', 'haut-a')], routines, ref);
    expect(j.partie).toBe('bas');
    expect(j.routine?.id).toBe('bas-a');
    expect(j.faite).toBeNull();
  });
  it('plusieurs routines pour la même partie : celle faite il y a le plus longtemps', () => {
    const w = [fait('2026-11-09T18:00:00', 'haut', 'haut-a'), fait('2026-11-11T18:00:00', 'bas', 'bas-a')];
    expect(seanceDuJour(w, routines, ref).routine?.id).toBe('haut-b');
  });
  it("déjà entraîné aujourd'hui : la séance est marquée faite, la suivante est annoncée", () => {
    const j = seanceDuJour([fait('2026-11-12T07:00:00', 'bas', 'bas-a')], routines, ref);
    expect(j.faite?.routineId).toBe('bas-a');
    expect(j.partie).toBe('haut');
  });
  it('aucune routine utilisable pour la partie : pas de routine proposée', () => {
    const j = seanceDuJour([fait('2026-11-11T18:00:00', 'haut', 'haut-a')], [routine('haut-a', 'haut', 0), routine('bas-vide', 'bas', 1, true)], ref);
    expect(j.partie).toBe('bas');
    expect(j.routine).toBeNull();
  });
});
