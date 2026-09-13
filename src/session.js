import { ROLES, isCentral } from './rotation.js';
import { PHASES, positionsFor, noteFor } from './positions.js';

export const PHASE_LABEL = {
  service: 'Nous servons. Dès la frappe, où te places-tu ?',
  reception: 'Nous avons perdu le point, l’adversaire sert. Où es-tu à la frappe ?',
  apresReception: 'Nous avons réceptionné et attaqué, l’adversaire a la balle. Où te replaces-tu ?',
};

export const PHASE_SHORT = {
  service: 'Service',
  reception: 'Réception',
  apresReception: 'Après réception',
};

/**
 * Construit la séquence d'entraînement d'un rôle : pour chaque rotation à partir de `startRotation`,
 * service (on perd le point) → réception → après réception (on gagne le point) → rotation suivante.
 * La rotation est horaire : le passeur passe de la zone 1 à la 6, puis 5, 4, 3, 2.
 * Les situations où le rôle n'est pas sur le terrain sont omises.
 * Un central s'entraîne sans libéro : il doit connaître les 18 places, au cas où il n'y en a pas.
 */
export function buildSession({ role, startRotation = 1, libero = !isCentral(role) }) {
  if (!ROLES[role]) throw new Error(`Rôle inconnu : ${role}`);
  const situations = [];
  for (let i = 0; i < 6; i++) {
    const rotation = ((startRotation - 1 - i + 6) % 6) + 1;
    for (const phase of PHASES) {
      const expected = positionsFor(rotation, phase, { libero })[role];
      if (!expected) continue;
      const weServe = phase === 'service';
      situations.push({
        id: `P${rotation}-${phase}`,
        index: situations.length,
        rotation,
        phase,
        weServe,
        score: { us: i, them: weServe ? i : i + 1 },
        expected,
        note: noteFor(rotation, phase),
      });
    }
  }
  return { role, startRotation, libero, situations };
}
