// Machine à états pure de l'entraînement. Chaque fonction rend un nouvel état (ou le même si l'action
// n'a pas de sens sur l'écran courant). Aucun accès au DOM ici.
import { buildSession } from './session.js';
import { isHit } from './evaluate.js';

export function initialState() {
  return { screen: 'role', role: null, startRotation: 1, libero: true, situations: [], current: 0, results: [], replay: false };
}

export function currentSituation(state) {
  return state.situations[state.current];
}

export function start(state, { role, startRotation = 1 }) {
  const session = buildSession({ role, startRotation });
  return { ...state, screen: 'question', role, startRotation, libero: session.libero, situations: session.situations, current: 0, results: [], replay: false };
}

export function tap(state, point) {
  if (state.screen !== 'question') return state;
  const situation = currentSituation(state);
  const result = { situationId: situation.id, tap: point, hit: isHit(situation.expected, point) };
  return { ...state, screen: 'feedback', results: [...state.results, result] };
}

export function next(state) {
  if (state.screen !== 'feedback') return state;
  const following = state.current + 1;
  if (following >= state.situations.length) return { ...state, screen: 'summary' };
  return { ...state, screen: 'question', current: following };
}

export function summary(state) {
  const byId = new Map(state.results.map((r) => [r.situationId, r]));
  const failed = state.situations.filter((s) => byId.get(s.id)?.hit === false);
  const correct = state.results.filter((r) => r.hit).length;
  return { total: state.situations.length, correct, failed };
}

export function replayErrors(state) {
  const { failed } = summary(state);
  if (failed.length === 0) return state;
  const situations = failed.map((s, index) => ({ ...s, index }));
  // `replay` : ce n'est pas une série complète du poste, le bilan ne doit pas compter comme meilleur score.
  return { ...state, screen: 'question', situations, current: 0, results: [], replay: true };
}

export function restart(state) {
  return { ...initialState(), startRotation: state.startRotation };
}
