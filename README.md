# Positionnement 5-1

Appli minimaliste pour s'entraîner à se placer au volley (système 5-1) : on choisit son poste,
le score tourne, et à chaque situation on tape sa position sur le terrain.

- 3 phases par rotation : **service** (on se place directement en base 1, règle FIVB 7.4 2025),
  **réception** (ordre de rotation obligatoire à la frappe adverse), **après réception** (retour en base 1).
- 6 rotations × 3 phases = 18 situations (16 pour le libéro, absent quand le central sert). Un
  central s'entraîne sans libéro : en arrière il prend la place du libéro, les autres ne bougent pas.
- Tolérance : un cercle d'environ 1 m autour de la position attendue.
- Bilan de fin, rejeu des erreurs, meilleur score par poste mémorisé dans le navigateur.

## Ouvrir en local

Le code utilise des modules ES : il faut un serveur statique (pas `file://`).

```
npm install
npm run serve      # puis http://localhost:5173
```

Ou le serveur intégré de WebStorm (clic droit sur `index.html` → Open in browser).

## Tests

```
npm test
```

Le hook `.githooks/pre-commit` lance les tests avant chaque commit. Après un clone :

```
git config core.hooksPath .githooks
```

## Héberger (GitHub Pages)

1. Créer un repo `volley-positionnement` sur github.com.
2. `git remote add origin https://github.com/<compte>/volley-positionnement.git && git push -u origin main`
3. Settings → Pages → Source : branche `main`, dossier `/ (root)`.
4. Partager `https://<compte>.github.io/volley-positionnement/`.

## Ajuster les positions

Les coordonnées de `src/positions.js` sont lues sur la photo de la fiche : elles sont approximatives.
Modifier les valeurs dans `POSITIONS` ; le test `tests/positions.test.js` vérifie que chaque
réception reste légale (règle 7.4).

## Structure

```
index.html          page + styles
src/rotation.js     ordre de rotation 5-1, lineup, serveur, centraux/R4 avant-arrière
src/positions.js    données transcrites de la fiche (réception, base 1) + notes
src/session.js      séquence des situations et score
src/evaluate.js     tolérance du tap
src/state.js        machine à états pure
src/app.js          rendu DOM/SVG (aucune logique métier)
tests/              Vitest
```
