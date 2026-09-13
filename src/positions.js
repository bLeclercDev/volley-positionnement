// Positions transcrites de la fiche « P1 … P6 (passeur en k) ».
// Coordonnées normalisées : x de 0 (ligne de côté gauche, zone 4/5) à 1 (droite, zone 2/1),
// y de 0 (filet) à 1 (ligne de fond). La ligne des 3 m est à y = 1/3.
//
// Chaque formation donne 6 places :
//   P, O, R4a, R4b : les rôles eux-mêmes
//   C : le central AVANT de la rotation (Ca ou Cb, voir rotation.js)
//   L : la place du central arrière, occupée par le libéro, ou par le central lui-même quand il sert
//       (P2 et P5) ou quand l'équipe joue sans libéro (mêmes coordonnées, les 5 autres ne bougent pas)
// `base1` sert pour les phases `service` et `apresReception` ; `reception` pour la phase `reception`.
// Les coordonnées sont approximatives (lecture d'une photo).

import { backRowCentral, frontRowCentral, serverOf } from './rotation.js';

export const DATA_ROLES = ['P', 'O', 'R4a', 'R4b', 'C', 'L'];

// BASE 1 : même dessin dans les 6 rotations. Avants au filet (R4 à gauche, C au centre, P ou O à droite),
// libéro/central arrière en 5, P ou O arrière en 1, R4 arrière au fond en 6.
const FRONT_LEFT = [0.15, 0.1];
const FRONT_CENTER = [0.5, 0.1];
const FRONT_RIGHT = [0.85, 0.1];
const BACK_LEFT = [0.15, 0.42];
const BACK_RIGHT = [0.85, 0.42];
const BACK_DEEP = [0.5, 0.82];

function base1({ frontR4, setterFront }) {
  return {
    R4a: frontR4 === 'R4a' ? FRONT_LEFT : BACK_DEEP,
    R4b: frontR4 === 'R4b' ? FRONT_LEFT : BACK_DEEP,
    C: FRONT_CENTER,
    P: setterFront ? FRONT_RIGHT : BACK_RIGHT,
    O: setterFront ? BACK_RIGHT : FRONT_RIGHT,
    L: BACK_LEFT,
  };
}

export const POSITIONS = {
  1: {
    // 4=O 3=C 2=R4a / 5=R4b 6=L 1=P
    reception: {
      C: [0.51, 0.15],
      R4a: [0.89, 0.4],
      P: [0.95, 0.52],
      O: [0.11, 0.62],
      L: [0.73, 0.63],
      R4b: [0.41, 0.71],
      note: 'Le R4 avant couvre le passeur, qui file au filet à la frappe. Le pointu attaque en 4 et le R4 en 2. Réceptionneurs principaux : pointu, R4 arrière, libéro.',
    },
    base1: base1({ frontR4: 'R4a', setterFront: false }),
  },
  2: {
    // 4=Ca 3=R4a 2=P / 5=O 6=R4b 1=Cb(sert) → L
    reception: {
      C: [0.07, 0.09],
      P: [0.8, 0.09],
      R4a: [0.23, 0.56],
      L: [0.79, 0.56],
      R4b: [0.51, 0.75],
      O: [0.09, 0.91],
      note: 'Le R4 avant doit rester à droite du central avant ! Le pointu recule mais reste vigilant aux ballons qui lobent. Réceptionneurs principaux : les R4 et le libéro. Le R4 avant se décale à gauche pour attaquer directement à son poste.',
    },
    base1: base1({ frontR4: 'R4a', setterFront: true }),
    serviceNote: 'Le central sert : il ne sera pas remplacé par le libéro tant que sa série au service ne s’arrête pas.',
  },
  3: {
    // 4=R4a 3=P 2=Cb / 5=Ca→L 6=O 1=R4b
    reception: {
      P: [0.72, 0.1],
      C: [0.93, 0.37],
      R4a: [0.15, 0.545],
      R4b: [0.72, 0.55],
      L: [0.43, 0.63],
      O: [0.58, 0.91],
      note: 'Le pointu recule (« sort » de la réception) en restant entre le libéro et le R4 arrière, vigilant aux ballons qui lobent. Réceptionneurs principaux : les R4 et le libéro. Le R4 avant doit être devant le libéro.',
    },
    base1: base1({ frontR4: 'R4a', setterFront: true }),
  },
  4: {
    // 4=P 3=Cb 2=R4b / 5=R4a 6=Ca→L 1=O
    reception: {
      P: [0.06, 0.07],
      C: [0.13, 0.2],
      R4b: [0.24, 0.58],
      L: [0.75, 0.58],
      R4a: [0.48, 0.69],
      O: [0.9, 0.88],
      note: 'Le pointu recule (« sort » de la réception) mais reste vigilant aux ballons qui lobent. Réceptionneurs principaux : les R4 et le libéro. Le R4 avant se décale à gauche pour attaquer directement à son poste.',
    },
    base1: base1({ frontR4: 'R4b', setterFront: true }),
  },
  5: {
    // 4=Cb 3=R4b 2=O / 5=P 6=R4a 1=Ca(sert) → L
    reception: {
      C: [0.06, 0.09],
      P: [0.145, 0.19],
      O: [0.91, 0.26],
      R4b: [0.24, 0.6],
      L: [0.79, 0.6],
      R4a: [0.49, 0.72],
      note: 'Le passeur doit rester derrière le central avant, puis file au filet à la frappe. Réceptionneurs principaux : les R4 et le libéro. Le R4 avant se décale à gauche pour attaquer directement à son poste.',
    },
    base1: base1({ frontR4: 'R4b', setterFront: false }),
    serviceNote: 'Le central sert : il ne sera pas remplacé par le libéro tant que sa série au service ne s’arrête pas.',
  },
  6: {
    // 4=R4b 3=O 2=Ca / 5=Cb→L 6=P 1=R4a
    reception: {
      O: [0.51, 0.08],
      P: [0.62, 0.2],
      C: [0.93, 0.35],
      R4b: [0.14, 0.58],
      R4a: [0.75, 0.58],
      L: [0.45, 0.72],
      note: 'Le passeur doit rester derrière le pointu, et entre le central arrière et le R4 arrière ; il file au filet à la frappe. Réceptionneurs principaux : les R4 et le libéro.',
    },
    base1: base1({ frontR4: 'R4b', setterFront: false }),
  },
};

export const PHASES = ['service', 'reception', 'apresReception'];

/**
 * Positions des joueurs effectivement sur le terrain pour une rotation et une phase,
 * indexées par rôle (P, O, R4a, R4b, Ca ou Cb, L ou le central qui sert).
 * `libero: false` : pas de libéro, le central arrière prend sa place dans toutes les phases.
 */
export function positionsFor(rotation, phase, { libero = true } = {}) {
  if (!PHASES.includes(phase)) throw new Error(`Phase inconnue : ${phase}`);
  const formation = phase === 'reception' ? POSITIONS[rotation].reception : POSITIONS[rotation].base1;
  const result = {
    P: formation.P,
    O: formation.O,
    R4a: formation.R4a,
    R4b: formation.R4b,
    [frontRowCentral(rotation)]: formation.C,
  };
  const backC = backRowCentral(rotation);
  if (!libero || (phase === 'service' && serverOf(rotation) === backC)) result[backC] = formation.L;
  else result.L = formation.L;
  return result;
}

/** Note pédagogique de la fiche pour une rotation et une phase (peut être undefined). */
export function noteFor(rotation, phase) {
  if (phase === 'reception') return POSITIONS[rotation].reception.note;
  if (phase === 'service') return POSITIONS[rotation].serviceNote;
  return undefined;
}
