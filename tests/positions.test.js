import { describe, it, expect } from 'vitest';
import { POSITIONS, positionsFor, DATA_ROLES } from '../src/positions.js';
import { lineup, isFrontRow, zoneOf, backRowCentral, serverOf, ROLE_ORDER } from '../src/rotation.js';

const ROTATIONS = [1, 2, 3, 4, 5, 6];
const inUnit = ([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1;

describe('données de positions (transcription de la fiche)', () => {
  it('couvre les 6 rotations avec une réception et une base 1', () => {
    for (const k of ROTATIONS) {
      expect(POSITIONS[k], `rotation ${k}`).toBeDefined();
      expect(POSITIONS[k].reception, `réception ${k}`).toBeDefined();
      expect(POSITIONS[k].base1, `base1 ${k}`).toBeDefined();
    }
  });

  it('donne, par formation, une coordonnée dans [0,1]² pour les 6 places (P, O, R4a, R4b, C, L)', () => {
    expect(DATA_ROLES).toEqual(['P', 'O', 'R4a', 'R4b', 'C', 'L']);
    for (const k of ROTATIONS) {
      for (const formation of ['reception', 'base1']) {
        for (const role of DATA_ROLES) {
          const p = POSITIONS[k][formation][role];
          expect(p, `${formation} P${k} ${role}`).toHaveLength(2);
          expect(inUnit(p), `${formation} P${k} ${role} hors terrain`).toBe(true);
        }
      }
    }
  });

  it('en réception, respecte l ordre de rotation (règle 7.4) : avant devant son arrière, gauche/droite dans chaque ligne', () => {
    for (const k of ROTATIONS) {
      const pos = positionsFor(k, 'reception');
      const zones = lineup(k);
      const at = (zone) => {
        const role = zones[zone];
        const onCourt = role === backRowCentral(k) ? 'L' : role;
        return pos[onCourt];
      };
      // avant/arrière : 4 devant 5, 3 devant 6, 2 devant 1 (y plus petit = plus près du filet)
      for (const [front, back] of [[4, 5], [3, 6], [2, 1]]) {
        expect(at(front)[1], `P${k} zone ${front} doit être devant zone ${back}`).toBeLessThan(at(back)[1]);
      }
      // gauche/droite : 4 < 3 < 2 et 5 < 6 < 1 en x
      expect(at(4)[0], `P${k} 4 à gauche de 3`).toBeLessThan(at(3)[0]);
      expect(at(3)[0], `P${k} 3 à gauche de 2`).toBeLessThan(at(2)[0]);
      expect(at(5)[0], `P${k} 5 à gauche de 6`).toBeLessThan(at(6)[0]);
      expect(at(6)[0], `P${k} 6 à gauche de 1`).toBeLessThan(at(1)[0]);
    }
  });

  it('en base 1, les trois avants sont au filet (zone avant) et le R4 arrière est au fond', () => {
    for (const k of ROTATIONS) {
      const pos = positionsFor(k, 'apresReception');
      const frontRoles = ROLE_ORDER.filter((r) => isFrontRow(zoneOf(r, k)));
      for (const r of frontRoles) expect(pos[r][1], `P${k} ${r} avant au filet`).toBeLessThan(1 / 3);
      const backR4 = frontRoles.includes('R4a') ? 'R4b' : 'R4a';
      expect(pos[backR4][1], `P${k} ${backR4} au fond`).toBeGreaterThan(0.7);
    }
  });
});

describe('positionsFor : qui est sur le terrain', () => {
  it('remplace le central arrière par le libéro en réception et après réception', () => {
    for (const k of ROTATIONS) {
      for (const phase of ['reception', 'apresReception']) {
        const pos = positionsFor(k, phase);
        expect(pos[backRowCentral(k)], `P${k} ${phase}`).toBeUndefined();
        expect(pos.L, `P${k} ${phase} libéro présent`).toBeDefined();
        expect(Object.keys(pos)).toHaveLength(6);
      }
    }
  });

  it('au service, le central sert en P2 et P5 : il prend la place du libéro, qui est absent', () => {
    for (const k of [2, 5]) {
      const pos = positionsFor(k, 'service');
      const c = backRowCentral(k);
      expect(serverOf(k)).toBe(c);
      expect(pos.L).toBeUndefined();
      expect(pos[c]).toEqual(POSITIONS[k].base1.L);
    }
    for (const k of [1, 3, 4, 6]) {
      const pos = positionsFor(k, 'service');
      expect(pos.L).toBeDefined();
      expect(pos[backRowCentral(k)]).toBeUndefined();
    }
  });

  it('associe le C de la formation au central avant de la rotation', () => {
    expect(positionsFor(1, 'reception').Ca).toEqual(POSITIONS[1].reception.C);
    expect(positionsFor(4, 'reception').Cb).toEqual(POSITIONS[4].reception.C);
  });

  it('apresReception et service pointent sur base1', () => {
    expect(positionsFor(3, 'apresReception').P).toEqual(POSITIONS[3].base1.P);
    expect(positionsFor(3, 'service').P).toEqual(POSITIONS[3].base1.P);
  });

  it('refuse une phase inconnue', () => {
    expect(() => positionsFor(1, 'defense')).toThrow();
  });
});
