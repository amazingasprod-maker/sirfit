# Sir Fit

Carnet d'entraînement personnel, en application web installable (PWA) :
routines, séance en direct, séance du jour choisie automatiquement, séances à
la salle ou à la maison, progression sur 12 semaines. Les données restent sur
l'appareil (aucun compte, aucun serveur) et l'app fonctionne hors ligne.

## Développement

```
npm install
npm run dev        serveur de développement
npm test           tests (Vitest)
npm run typecheck  vérification des types
npm run build      construction dans dist/
```

La publication sur GitHub Pages est automatique à chaque push sur `main`
(`.github/workflows/pages.yml`).

## Illustrations

Les illustrations d'exercices viennent de
[Workout Guide](https://github.com/bryllim/workout-guide) par
[Bryl Lim](https://bryllim.com), en partie d'après
[Everkinetic](https://github.com/everkinetic/data), sous licence
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Elles ont été
recolorées pour l'app ; les fichiers modifiés restent sous la même licence.
Détail : `public/illustrations/LICENCE.md`.
