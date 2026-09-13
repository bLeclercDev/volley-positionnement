import { describe, it, expect } from 'vitest';
import { initialState, start, tap, next, replayErrors, restart, summary, currentSituation } from '../src/state.js';
import { TOLERANCE } from '../src/evaluate.js';

const far = ([x, y]) => [x > 0.5 ? x - 0.5 : x + 0.5, y];
const startedP = () => start(initialState(), { role: 'P', startRotation: 1 });

function playAll(state, decide) {
  let s = state;
  while (s.screen === 'question') {
    const sit = currentSituation(s);
    s = next(tap(s, decide(sit) ? sit.expected : far(sit.expected)));
  }
  return s;
}

describe('machine à états de l entraînement', () => {
  it('démarre sur l écran de choix du rôle', () => {
    expect(initialState().screen).toBe('role');
  });

  it('start construit la session et pose la première question', () => {
    const s = startedP();
    expect(s.screen).toBe('question');
    expect(s.role).toBe('P');
    expect(s.situations).toHaveLength(18);
    expect(s.current).toBe(0);
    expect(currentSituation(s).id).toBe('P1-service');
    expect(s.results).toEqual([]);
    expect(s.replay).toBe(false);
  });

  it('tap évalue la position et passe en feedback sans avancer', () => {
    const s = startedP();
    const good = tap(s, currentSituation(s).expected);
    expect(good.screen).toBe('feedback');
    expect(good.current).toBe(0);
    expect(good.results).toHaveLength(1);
    expect(good.results[0]).toMatchObject({ hit: true, situationId: 'P1-service' });
    expect(good.results[0].tap).toEqual(currentSituation(s).expected);

    const bad = tap(s, far(currentSituation(s).expected));
    expect(bad.results[0].hit).toBe(false);
  });

  it('un tap à la limite de la tolérance est accepté', () => {
    const s = startedP();
    const [x, y] = currentSituation(s).expected;
    expect(tap(s, [x, y - TOLERANCE + 0.001]).results[0].hit).toBe(true);
  });

  it('ignore un tap hors de l écran question', () => {
    const s = startedP();
    const fb = tap(s, [0.5, 0.5]);
    expect(tap(fb, [0.1, 0.1])).toBe(fb);
    expect(tap(initialState(), [0.1, 0.1]).screen).toBe('role');
  });

  it('next passe à la question suivante, puis au bilan après la dernière', () => {
    const s = startedP();
    const s2 = next(tap(s, [0.5, 0.5]));
    expect(s2.screen).toBe('question');
    expect(s2.current).toBe(1);
    const end = playAll(s, () => true);
    expect(end.screen).toBe('summary');
    expect(end.results).toHaveLength(18);
  });

  it('next sans feedback ne fait rien', () => {
    const s = startedP();
    expect(next(s)).toBe(s);
  });

  it('summary compte les bonnes réponses et liste les situations ratées', () => {
    const end = playAll(startedP(), (sit) => sit.phase !== 'reception');
    const sum = summary(end);
    expect(sum.total).toBe(18);
    expect(sum.correct).toBe(12);
    expect(sum.failed.map((x) => x.id)).toEqual(['P1-reception', 'P6-reception', 'P5-reception', 'P4-reception', 'P3-reception', 'P2-reception']);
  });

  it('replayErrors rejoue uniquement les situations ratées, dans l ordre', () => {
    const end = playAll(startedP(), (sit) => sit.rotation !== 4);
    const replay = replayErrors(end);
    expect(replay.screen).toBe('question');
    expect(replay.situations.map((x) => x.id)).toEqual(['P4-service', 'P4-reception', 'P4-apresReception']);
    expect(replay.situations.map((x) => x.index)).toEqual([0, 1, 2]);
    expect(replay.results).toEqual([]);
    expect(replay.role).toBe('P');
    expect(replay.replay).toBe(true);
    expect(replay.startRotation).toBe(1);
    const end2 = playAll(replay, () => true);
    expect(summary(end2)).toMatchObject({ total: 3, correct: 3, failed: [] });
  });

  it('start après un rejeu redonne une série complète, sans le marqueur replay', () => {
    const end = playAll(startedP(), (sit) => sit.rotation !== 4);
    const again = start(replayErrors(end), { role: 'P', startRotation: 1 });
    expect(again.replay).toBe(false);
    expect(again.situations).toHaveLength(18);
  });

  it('replayErrors sans erreur laisse le bilan tel quel', () => {
    const end = playAll(startedP(), () => true);
    expect(replayErrors(end)).toBe(end);
  });

  it('restart revient au choix du rôle', () => {
    const end = playAll(startedP(), () => true);
    expect(restart(end).screen).toBe('role');
  });

  it('start avec un rôle partiel (libéro) fonctionne de bout en bout', () => {
    const end = playAll(start(initialState(), { role: 'L', startRotation: 4 }), () => true);
    expect(summary(end)).toMatchObject({ total: 16, correct: 16 });
  });

  it('start avec un central joue sans libéro : 18 situations', () => {
    const started = start(initialState(), { role: 'Ca', startRotation: 2 });
    expect(started.libero).toBe(false);
    const end = playAll(started, () => true);
    expect(summary(end)).toMatchObject({ total: 18, correct: 18 });
  });
});
