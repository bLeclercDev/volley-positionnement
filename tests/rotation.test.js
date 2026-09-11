import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ROLE_ORDER,
  zoneOf,
  lineup,
  isFrontRow,
  serverOf,
  backRowCentral,
  frontRowCentral,
  frontRowR4,
  ZONE_CENTER,
} from '../src/rotation.js';

describe('ordre de rotation (5-1 : P, R4a, Ca, O, R4b, Cb)', () => {
  it('liste les 6 rôles de terrain dans l ordre de rotation', () => {
    expect(ROLE_ORDER).toEqual(['P', 'R4a', 'Ca', 'O', 'R4b', 'Cb']);
  });

  it('expose les 7 rôles jouables (libéro inclus)', () => {
    expect(Object.keys(ROLES)).toEqual(['P', 'R4a', 'Ca', 'O', 'R4b', 'Cb', 'L']);
  });

  it('place le passeur en k et les suivants en k+1 … k+5 modulo 6', () => {
    expect(zoneOf('P', 1)).toBe(1);
    expect(zoneOf('R4a', 1)).toBe(2);
    expect(zoneOf('Ca', 1)).toBe(3);
    expect(zoneOf('O', 1)).toBe(4);
    expect(zoneOf('R4b', 1)).toBe(5);
    expect(zoneOf('Cb', 1)).toBe(6);
    expect(zoneOf('R4a', 6)).toBe(1);
    expect(zoneOf('Cb', 4)).toBe(3);
  });

  it('donne le lineup P1 conforme à la fiche : 4=O 3=Ca 2=R4a / 5=R4b 6=Cb 1=P', () => {
    expect(lineup(1)).toEqual({ 1: 'P', 2: 'R4a', 3: 'Ca', 4: 'O', 5: 'R4b', 6: 'Cb' });
  });

  it('distingue avants (2,3,4) et arrières (5,6,1)', () => {
    expect(isFrontRow(2)).toBe(true);
    expect(isFrontRow(3)).toBe(true);
    expect(isFrontRow(4)).toBe(true);
    expect(isFrontRow(5)).toBe(false);
    expect(isFrontRow(6)).toBe(false);
    expect(isFrontRow(1)).toBe(false);
  });

  it('le serveur est le joueur en zone 1 : le central sert en P2 et P5', () => {
    expect(serverOf(1)).toBe('P');
    expect(serverOf(2)).toBe('Cb');
    expect(serverOf(3)).toBe('R4b');
    expect(serverOf(4)).toBe('O');
    expect(serverOf(5)).toBe('Ca');
    expect(serverOf(6)).toBe('R4a');
  });

  it('identifie le central arrière (remplacé par le libéro) et le central avant', () => {
    expect(backRowCentral(1)).toBe('Cb');
    expect(frontRowCentral(1)).toBe('Ca');
    expect(backRowCentral(4)).toBe('Ca');
    expect(frontRowCentral(4)).toBe('Cb');
    for (let k = 1; k <= 6; k++) {
      expect(isFrontRow(zoneOf(backRowCentral(k), k))).toBe(false);
      expect(isFrontRow(zoneOf(frontRowCentral(k), k))).toBe(true);
    }
  });

  it('identifie le R4 avant : R4a en P1-P3, R4b en P4-P6', () => {
    expect(frontRowR4(1)).toBe('R4a');
    expect(frontRowR4(3)).toBe('R4a');
    expect(frontRowR4(4)).toBe('R4b');
    expect(frontRowR4(6)).toBe('R4b');
  });

  it('donne le centre de chaque zone en coordonnées normalisées (filet en haut)', () => {
    expect(ZONE_CENTER[4]).toEqual([1 / 6, 1 / 6]);
    expect(ZONE_CENTER[3]).toEqual([1 / 2, 1 / 6]);
    expect(ZONE_CENTER[2]).toEqual([5 / 6, 1 / 6]);
    expect(ZONE_CENTER[5]).toEqual([1 / 6, 2 / 3]);
    expect(ZONE_CENTER[6]).toEqual([1 / 2, 2 / 3]);
    expect(ZONE_CENTER[1]).toEqual([5 / 6, 2 / 3]);
  });
});
