# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Règles

- **Ne jamais `git push`.** Les commits sont locaux ; c'est l'utilisateur qui pousse.
- Code, commentaires, tests et UI sont en français ; garder ce ton (comments courts qui expliquent le *pourquoi* volley).

## Commandes

```
npm test                         # Vitest, toute la suite (le hook pre-commit la relance et bloque si rouge)
npm run test:watch
npx vitest run tests/state.test.js                    # un seul fichier
npx vitest run tests/state.test.js -t "replayErrors"  # un seul test par nom (fichiers purs seulement, voir Tests)
npm run serve                    # serveur statique sur http://localhost:5173 (modules ES : pas de file://)
```

Pas de build, pas de bundler, pas de lint : vanilla JS en modules ES chargés par `index.html`.
Le hook `.githooks/pre-commit` n'est actif qu'après `git config core.hooksPath .githooks`.

## Architecture

Appli mono-page : `index.html` contient la page et **tout le CSS** (un seul bloc `<style>`, variables
sur `:root`, pas de dark mode). Le rendu se fait par `innerHTML` de templates de chaînes, échappées
avec `esc()`.

Séparation stricte logique / DOM, dans cet ordre de dépendance :

- `src/rotation.js` : ordre de rotation 5-1 (`ROLE_ORDER`), `ROLES` (ids `P`, `R4a`, `Ca`, `O`, `R4b`,
  `Cb`, `L`), zone de chaque rôle par rotation, serveur, central/R4 avant ou arrière.
  Convention : `a` = voisin du passeur, `b` = voisin du pointu.
- `src/positions.js` : données transcrites de la fiche (`POSITIONS[rotation].reception` et `.base1`),
  en coordonnées normalisées `[x, y]` dans `[0, 1]²` (x gauche→droite, y filet→fond). Les formations
  sont indexées par **place** (`C` = central avant, `L` = place du central arrière, tenue par le
  libéro), et `positionsFor(rotation, phase, { libero })` les traduit en **rôles** réels sur le
  terrain (le libéro disparaît quand le central arrière sert ; avec `libero: false` le central arrière
  prend la place `L` partout, mêmes coordonnées).
- `src/session.js` : `buildSession({ role, startRotation, libero })` construit la séquence déterministe
  des situations (6 rotations × 3 phases `service` / `reception` / `apresReception`, en omettant celles
  où le rôle n'est pas sur le terrain : 18 pour tous sauf 16 pour le libéro). Un central s'entraîne
  sans libéro par défaut (`libero = !isCentral(role)`), pour apprendre les 18 places.
- `src/evaluate.js` : `isHit` avec `TOLERANCE` ≈ 1 m (0.115 en unités normalisées).
- `src/state.js` : machine à états **pure** (`role` → `question` → `feedback` → `summary`),
  `replayErrors` pose `replay: true` pour que le bilan ne compte pas comme meilleur score.
- `src/app.js` : seul module qui touche le DOM/SVG. `dispatch(fn)` applique une fonction d'état puis
  `render()` choisit l'écran selon `state.screen`. Contient aussi le meilleur score par rôle en
  localStorage (`volley-positionnement:best:<role>`, `{ correct, total }`, purgé si `total` ne
  correspond plus à la longueur de série du rôle).

Le terrain SVG est normalisé : coordonnées × `SCALE` (100), avec une bande adverse au-dessus du filet
(y négatif) pour l'animation.

## Tests

- Tests purs (`rotation`, `positions`, `session`, `evaluate`, `state`) sans DOM.
- Tests d'interface (`app*.test.js`) en jsdom via le commentaire `// @vitest-environment jsdom`.
  jsdom n'a pas de géométrie SVG : chaque fichier stubbe `createSVGPoint`/`getScreenCTM` et simule un tap par
  `pointerdown` + `pointerup` au même point. Les tests d'`app.test.js` s'enchaînent dans l'ordre
  (un seul `import` de `src/app.js` dans `beforeAll`), donc l'état DOM d'un test dépend du précédent :
  ne pas les filtrer avec `-t`, lancer le fichier entier.
- `tests/positions.test.js` vérifie la légalité de chaque réception (règle FIVB 7.4) : à respecter
  quand on ajuste `POSITIONS`.

## Où sont les décisions

`TODO.md` tient le backlog et les décisions de format (passage au %, fin de set aléatoire,
défense). Le lire avant d'ajouter une fonctionnalité.
