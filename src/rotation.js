// Ordre de rotation d'un 5-1 : P, R4a, Ca, O, R4b, Cb (dans le sens des aiguilles d'une montre).
// "a" / "b" distinguent les deux R4 et les deux centraux par leur place dans cet ordre :
// R4a et Cb sont voisins du passeur, Ca et R4b sont voisins du pointu.
// Le libéro (L) remplace le central arrière, sauf quand celui-ci sert (règle 19.3.1.3 : le libéro ne sert pas).

export const ROLE_ORDER = ['P', 'R4a', 'Ca', 'O', 'R4b', 'Cb'];

export const ROLES = {
  P: { short: 'P', label: 'Passeur' },
  R4a: { short: 'R4', label: 'R4 côté passeur' },
  Ca: { short: 'C', label: 'Central côté pointu' },
  O: { short: 'O', label: 'Pointu' },
  R4b: { short: 'R4', label: 'R4 côté pointu' },
  Cb: { short: 'C', label: 'Central côté passeur' },
  L: { short: 'L', label: 'Libéro' },
};

// Centres des zones en coordonnées normalisées : x de 0 (gauche) à 1 (droite), y de 0 (filet) à 1 (fond).
export const ZONE_CENTER = {
  4: [1 / 6, 1 / 6],
  3: [1 / 2, 1 / 6],
  2: [5 / 6, 1 / 6],
  5: [1 / 6, 2 / 3],
  6: [1 / 2, 2 / 3],
  1: [5 / 6, 2 / 3],
};

const FRONT_ROW = new Set([2, 3, 4]);

/** Zone (1..6) occupée par `role` quand le passeur est en `rotation`. */
export function zoneOf(role, rotation) {
  const offset = ROLE_ORDER.indexOf(role);
  if (offset < 0) throw new Error(`Rôle sans zone : ${role}`);
  return ((rotation - 1 + offset) % 6) + 1;
}

/** Lineup légal : zone → rôle. */
export function lineup(rotation) {
  const result = {};
  for (const role of ROLE_ORDER) result[zoneOf(role, rotation)] = role;
  return result;
}

export function isFrontRow(zone) {
  return FRONT_ROW.has(zone);
}

export function serverOf(rotation) {
  return lineup(rotation)[1];
}

export function backRowCentral(rotation) {
  return isFrontRow(zoneOf('Ca', rotation)) ? 'Cb' : 'Ca';
}

export function frontRowCentral(rotation) {
  return backRowCentral(rotation) === 'Ca' ? 'Cb' : 'Ca';
}

export function frontRowR4(rotation) {
  return isFrontRow(zoneOf('R4a', rotation)) ? 'R4a' : 'R4b';
}
