import { describe, it, expect } from 'vitest';
import { buildSession, PHASE_LABEL } from '../src/session.js';
import { positionsFor } from '../src/positions.js';

const phasesOf = (s) => s.situations.map((x) => x.phase);
const rotationsOf = (s) => s.situations.map((x) => x.rotation);

describe('buildSession : la séquence service → réception → après réception, rotation par rotation', () => {
  it('donne 18 situations au passeur, dans l ordre des 3 phases', () => {
    const s = buildSession({ role: 'P' });
    expect(s.situations).toHaveLength(18);
    expect(phasesOf(s).slice(0, 3)).toEqual(['service', 'reception', 'apresReception']);
    expect(phasesOf(s)).toEqual(Array(6).fill(['service', 'reception', 'apresReception']).flat());
  });

  it('tourne dans le sens horaire (P en 1 → 6 → 5 → 4 → 3 → 2), seulement après le point gagné en réception', () => {
    const s = buildSession({ role: 'P' });
    expect(rotationsOf(s)).toEqual([1, 1, 1, 6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2]);
  });

  it('accepte une rotation de départ et boucle de 1 à 6', () => {
    const s = buildSession({ role: 'P', startRotation: 5 });
    expect(rotationsOf(s)).toEqual([5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 6, 6, 6]);
  });

  it('fait tourner le score : on perd au service, on gagne en réception', () => {
    const s = buildSession({ role: 'P' });
    const [serve1, rec1, after1, serve2] = s.situations;
    expect(serve1.score).toEqual({ us: 0, them: 0 });
    expect(serve1.weServe).toBe(true);
    expect(rec1.score).toEqual({ us: 0, them: 1 });
    expect(rec1.weServe).toBe(false);
    expect(after1.score).toEqual({ us: 0, them: 1 });
    expect(after1.weServe).toBe(false);
    expect(serve2.score).toEqual({ us: 1, them: 1 });
    expect(s.situations.at(-1).score).toEqual({ us: 5, them: 6 });
  });

  it('attend la position du rôle dans la formation de la phase', () => {
    const s = buildSession({ role: 'R4b', startRotation: 3 });
    const rec = s.situations.find((x) => x.rotation === 3 && x.phase === 'reception');
    expect(rec.expected).toEqual(positionsFor(3, 'reception').R4b);
    const after = s.situations.find((x) => x.rotation === 4 && x.phase === 'apresReception');
    expect(after.expected).toEqual(positionsFor(4, 'apresReception').R4b);
  });

  it('numérote les situations et leur donne un id unique et stable', () => {
    const s = buildSession({ role: 'O' });
    expect(s.situations.map((x) => x.index)).toEqual([...Array(18).keys()]);
    expect(new Set(s.situations.map((x) => x.id)).size).toBe(18);
    expect(s.situations[4].id).toBe('P6-reception');
  });

  it('donne 16 situations au libéro : absent au service en P2 et P5', () => {
    const s = buildSession({ role: 'L' });
    expect(s.situations).toHaveLength(16);
    const missing = [2, 5].map((k) => s.situations.find((x) => x.rotation === k && x.phase === 'service'));
    expect(missing).toEqual([undefined, undefined]);
    expect(s.situations.map((x) => x.index)).toEqual([...Array(16).keys()]);
  });

  it('donne 10 situations à chaque central : 3 rotations en avant, plus le service de sa rotation en 1', () => {
    const ca = buildSession({ role: 'Ca' });
    expect(ca.situations).toHaveLength(10);
    expect(ca.situations.filter((x) => x.rotation === 5).map((x) => x.phase)).toEqual(['service']);
    expect(new Set(ca.situations.map((x) => x.rotation))).toEqual(new Set([6, 1, 2, 5]));
    const cb = buildSession({ role: 'Cb' });
    expect(cb.situations).toHaveLength(10);
    expect(cb.situations.filter((x) => x.rotation === 2).map((x) => x.phase)).toEqual(['service']);
    expect(new Set(cb.situations.map((x) => x.rotation))).toEqual(new Set([3, 4, 5, 2]));
  });

  it('garde le score global cohérent même quand des situations sont sautées', () => {
    const s = buildSession({ role: 'L' });
    const rec6 = s.situations.find((x) => x.rotation === 6 && x.phase === 'reception');
    expect(rec6.score).toEqual({ us: 1, them: 2 });
  });

  it('joint la note pédagogique de la fiche quand elle existe', () => {
    const s = buildSession({ role: 'P' });
    expect(s.situations[1].note).toMatch(/passeur/i);
    expect(s.situations[2].note).toBeUndefined();
  });

  it('refuse un rôle inconnu', () => {
    expect(() => buildSession({ role: 'X' })).toThrow(/rôle/i);
  });

  it('a un libellé pour chaque phase', () => {
    expect(Object.keys(PHASE_LABEL)).toEqual(['service', 'reception', 'apresReception']);
  });
});
