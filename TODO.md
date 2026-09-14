# TODO

## Format du match : décisions à prendre

- **Points en % : pour le résultat du quiz, pas pour le score volley.** Dès que le nombre de questions
  varie, le résultat et le meilleur score par poste passent en pourcentage. Le score affiché sur le
  terrain reste un vrai score (12–9), sinon on perd le repère « qui sert, on tourne ou pas ».
- **Un set complet à 15 avec 70 % de side-out est trop long** : environ 28 à 30 échanges, soit 40 à
  55 questions avec les phases de défense (18 aujourd'hui).
- **Recommandation : jouer une fin de set**, comme à l'entraînement. On tire un score de départ
  (10–10 en tie-break, ou entre 18–18 et 21–21 en set de 25) et une rotation de départ, puis on joue
  jusqu'à 15 ou 25 avec 2 points d'écart. Ça donne 5 à 12 échanges, donc 10 à 20 questions : nombre
  variable mais borné.
- Garder le mode actuel (« Tour complet », 18 situations déterministes) : meilleur pour apprendre,
  le match aléatoire sert à tester.

## Architecture : pas de refacto global avant les features

Conclusion : l'archi actuelle (700 lignes, séparation pure / DOM) suffit pour finir ce backlog.
Chaque bloc a déjà sa place : A dans `positions.js`, B dans un nouveau module à côté de `session.js`,
C dans `state.js` + stockage, E en tests purs avec `random` injecté. On ne refactore que ce que la
feature touche, au moment où elle le touche :

- **Contrat de `situation` à figer avant B** (conception, pas refacto) : ajouter `rally` (index
  d'échange), `origin` (origine d'attaque) et la liste des phases de l'échange. `buildSession` et
  `simulateSet` produisent la même forme, l'interface n'a qu'un seul cas à gérer.
- **Frise des phases** : `phaseStrip` lit `PHASES` en dur ; pour D elle lira la liste portée par la
  situation. Un paramètre de plus.
- **Meilleur score** : sortir `readBest`/`saveBest` d'`app.js` vers un `best.js` avec le stockage
  injecté, au moment de passer au % (C). Testable sans jsdom, `app.js` perd 40 lignes.
- **`state.start`** appelle `buildSession` en dur : ajouter un champ `mode` (tour complet / fin de
  set) et la graine dans l'état pour B.
- Si `app.js` dépasse ~500 lignes avec D, découper en un fichier par écran, sans toucher à la logique.

## Structure : menu et trois pages

Décision : **plusieurs fichiers HTML** plutôt qu'un routeur. Pas de composants : les fonctions qui
rendent des chaînes de template (`courtSvg`, `phaseStrip`) jouent déjà ce rôle. Compatible GitHub
Pages tel quel (chemins relatifs). Un routeur par hash marcherait aussi, un routeur par chemin
(`/cours`) ferait 404 sur GitHub Pages : à éviter.

Pourquoi le multi-page : le cours est surtout du texte, plus simple en HTML direct qu'en chaînes JS
échappées ; chaque page ne charge que son JS ; retour navigateur et liens partageables natifs ; aucun
code de routage à tester.

- [ ] `index.html` : menu vers les trois pages.
- [ ] `cours.html` : théorie des positions et explications (rotation 5-1, règle 7.4, rôles), avec des
      terrains statiques en illustration via `courtSvg` + `positionsFor`.
- [ ] `placements.html` : explorateur des placements de base. Sélecteur de rotation et onglets
      service / réception / replacement, tous les pions affichés. ~60 lignes, tout est dans
      `positions.js`. Bouton « Tester ce poste » qui ouvre `jeu.html?role=P` (paramètre d'URL lu
      au démarrage).
- [ ] `jeu.html` : l'actuel `app.js` inchangé (tour complet + fin de set aléatoire quand B sera fait).
- [ ] Travaux préparatoires : sortir le CSS d'`index.html` vers un `style.css` partagé (mettre à jour
      CLAUDE.md, qui dit « tout le CSS dans index.html ») ; extraire `src/court.js` (`courtSvg`,
      `token`, `lineupTokens`, `esc`, `SCALE`), ~80 lignes déplacées, `app.js` les importe.
- Tests jsdom : ils importent `src/app.js` et construisent leur propre `#app`, indépendants
  d'`index.html`. Rien ne casse.

## A. Données : positions sur les attaques adverses

- [ ] Décider ce qu'on couvre : défense quand l'adversaire attaque depuis leur zone 4, 3 (ou pipe)
      et 2. La base 1 est le même dessin dans les 6 rotations, avec 6 places (avant gauche/centre/
      droite, arrière gauche/droite/fond). Définir la défense **par place et par origine d'attaque** :
      3 × 6 = 18 coordonnées, au lieu de 6 rotations × 3 origines × 6 rôles.
- [ ] Étendre `positionsFor` avec une phase `defense` et un paramètre `from`, en réutilisant le
      mapping place → rôle de la fonction `base1`. Vérifier sur la fiche si passeur arrière et pointu
      arrière défendent différemment en zone 1 ; si oui, indexer par rôle pour cette place.
- [ ] Test de cohérence : contreurs au filet, tous les points dans [0, 1]. La règle 7.4 ne s'applique
      pas à l'attaque, pas de test de légalité.

## B. Générateur de match aléatoire

- [ ] Écrire `simulateSet({ role, startRotation, startScore, target, random })` qui rend le même
      format de `situations` qu'aujourd'hui, plus l'index d'échange et l'origine d'attaque. Tout est
      généré au départ : pure, testable, et « Situation n/N » reste possible.
- [ ] Grammaire d'un échange, paramètres regroupés dans un objet `RULES` :
  - Nous servons : question service. Puis 15 % point direct (ace ou faute, pas d'autre question),
    sinon question défense avec origine tirée au sort. Issue globale : 30 % pour nous.
  - Ils servent : question réception. Puis 10 % ace, 10 % faute au service (fin), sinon on attaque :
    70 % side-out (fin), sinon ils relancent : question après réception (base 1) puis question défense.
  - Après une défense, 25 % de chance que l'échange continue (nouvelle défense), 2 relances max.
- [ ] Score réel avec rotation uniquement sur side-out, fin de set à 15 ou 25 avec 2 points d'écart,
      plafond de sécurité à 30 questions en cas de long deuce.
- [ ] Aléatoire injecté : `random` en paramètre, dérivé d'une graine (mulberry32) stockée dans
      l'état. Permet des tests déterministes, un bouton « Rejouer le même match » et un partage par
      URL `?seed=`.
- [ ] Les identifiants `P3-reception` ne sont plus uniques : ajouter l'index d'échange, et
      dédoublonner « Rejouer les erreurs » par clé rotation + phase + origine.

## C. Résultat et score

- [ ] Résultat en % et liste des erreurs groupées par situation avec un compteur.
- [ ] Meilleur score par poste stocké en %, avec une version dans la clé localStorage pour ignorer
      l'ancien format `{ correct, total }`.
- [ ] Afficher le résultat du set (gagné 15–12) dans le bilan, comme habillage.

## D. Interface

- [ ] Écran de départ de `jeu.html` : choix « Tour complet » ou « Fin de set », affichage de la
      graine, rôle présélectionné si `?role=` est présent.
- [ ] Frise des phases dynamique par échange (service → défense, ou réception → base 1 → défense).
- [ ] Libellé et animation par origine : « Ils attaquent en 4, où es-tu ? », balle partant de leur
      attaquant dans la bande adverse.

## E. Tests

- [ ] Avec un `random` stubé par séquence : progression du score, rotation seulement sur side-out,
      fin de set correcte, libéro absent quand le central sert (ou sur toute la série d'un central),
      position attendue présente partout.
- [ ] Test statistique : sur 1000 sets, le serveur perd 70 % ± 3 %.

## Autres idées

- **Répétition espacée légère** : stocker les échecs par situation et pondérer le tirage vers ce
  qu'on rate.
- **Chrono par question** : le placement doit être un réflexe, afficher le temps moyen et un mode
  « réflexe » à 2 secondes.
- **Mode « Tous les postes »** : le rôle change à chaque échange, pour valider la compréhension
  globale.
- **Couverture d'attaque** : quand nous attaquons, où se placent les autres autour de l'attaquant.
  Plus de données, car ça dépend de qui attaque.
- **Niveaux de tolérance** (1 m / 0,7 m) et distance en mètres affichée dans le feedback.
- **PWA** (manifest + service worker) pour un usage hors ligne sur téléphone depuis GitHub Pages.
- **Vibration** sur erreur via `navigator.vibrate`, coût quasi nul.
