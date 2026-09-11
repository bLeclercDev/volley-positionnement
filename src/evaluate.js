// Le terrain est normalisé : x et y dans [0, 1], le terrain étant carré (9 m × 9 m),
// une distance de 1 correspond à 9 m. TOLERANCE ≈ 1 m.
export const TOLERANCE = 0.115;

export function distance([x1, y1], [x2, y2]) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Vrai si `tap` est dans le cercle de rayon `tolerance` centré sur `expected` (bord inclus). */
export function isHit(expected, tap, tolerance = TOLERANCE) {
  return distance(expected, tap) <= tolerance + 1e-9;
}
