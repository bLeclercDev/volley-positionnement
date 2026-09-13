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

## A. Données : positions sur les attaques adverses

- [ ] Décider ce qu'on couvre : défense quand l'adversaire attaque depuis leur zone 4, 3 (ou pipe)
      et 2. La base 1 est le même dessin dans les 6 rotations, avec 6 places (avant gauche/centre/
      droite, arrière gauche/droite/fond). Définir la défense **par place et par origine d'attaque** :
      3 × 6 = 18 coordonnées, au lieu de 6 rotations × 3 origines × 6 rôles.
- [ ] Étendre `positionsFor` avec une phase `defense` et un paramètre `from`, en réutilisant le
      mapping place → rôle de la fonction `base1`. Vérifier sur la fiche si passeur arrière et pointu
      arrière défendent différemment en zone 1 ; si oui, indexer par rôle pour cette place.
- [ ] Étendre le mode `?edit` aux 3 formations de défense (sélecteur d'origine, export JSON).
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

- [ ] Écran de départ : choix « Tour complet » ou « Fin de set », affichage de la graine.
- [ ] Frise des phases dynamique par échange (service → défense, ou réception → base 1 → défense).
- [ ] Libellé et animation par origine : « Ils attaquent en 4, où es-tu ? », balle partant de leur
      attaquant dans la bande adverse.
- [x] Ergonomie mobile, défilement : le tap est validé au relâchement si le doigt n'a pas bougé
      (`bindTap` dans `src/app.js`), et `touch-action: pan-y` laisse le navigateur défiler depuis le terrain.
- [x] Ergonomie mobile, agencement : encart « Ordre de rotation » repliable, ouvert par défaut (serveur dans son titre), ligne
      sous la question sur une seule hauteur, légende du feedback sous le terrain, frise sans sous-titres
      sur petit écran. À 390 px de large, question et feedback tiennent sans défiler.

## E. Tests

- [ ] Avec un `random` stubé par séquence : progression du score, rotation seulement sur side-out,
      fin de set correcte, libéro absent quand le central sert, position attendue présente partout.
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
