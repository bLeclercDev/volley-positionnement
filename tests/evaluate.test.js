import { describe, it, expect } from 'vitest';
import { distance, isHit, TOLERANCE } from '../src/evaluate.js';

describe('évaluation d un tap par rapport à la position attendue', () => {
  it('la tolérance vaut environ 1 m sur un terrain de 9 m', () => {
    expect(TOLERANCE).toBeGreaterThanOrEqual(0.1);
    expect(TOLERANCE).toBeLessThanOrEqual(0.13);
  });

  it('calcule une distance euclidienne en coordonnées normalisées', () => {
    expect(distance([0, 0], [0.3, 0.4])).toBeCloseTo(0.5);
    expect(distance([0.5, 0.5], [0.5, 0.5])).toBe(0);
  });

  it('accepte un tap exactement sur la cible', () => {
    expect(isHit([0.4, 0.6], [0.4, 0.6])).toBe(true);
  });

  it('accepte un tap dans le cercle et au bord exact', () => {
    expect(isHit([0.4, 0.6], [0.4 + 0.05, 0.6])).toBe(true);
    expect(isHit([0.4, 0.6], [0.4, 0.6 + TOLERANCE])).toBe(true);
  });

  it('refuse un tap juste hors du cercle', () => {
    expect(isHit([0.4, 0.6], [0.4, 0.6 + TOLERANCE + 0.001])).toBe(false);
    expect(isHit([0.4, 0.6], [0.4 + TOLERANCE, 0.6 + TOLERANCE])).toBe(false);
  });

  it('accepte un rayon personnalisé', () => {
    expect(isHit([0.5, 0.5], [0.5, 0.8], 0.3)).toBe(true);
    expect(isHit([0.5, 0.5], [0.5, 0.8], 0.2)).toBe(false);
  });
});
