// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { buildSession } from '../src/session.js';

// jsdom n'implémente pas la géométrie SVG : on mappe clientX/clientY (en unités SVG) directement.
function stubSvgGeometry() {
  const proto = window.SVGSVGElement?.prototype ?? window.SVGElement.prototype;
  proto.createSVGPoint = function () {
    return {
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      },
    };
  };
  proto.getScreenCTM = () => ({ inverse: () => ({}) });
  window.scrollTo = () => {};
}

const $ = (sel) => document.querySelector(sel);
const farFrom = ([x, y]) => [x > 0.5 ? x - 0.5 : x + 0.5, y];
const text = () => document.getElementById('app').textContent;
const click = (sel) => $(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
function tapCourt([x, y]) {
  const svg = $('svg.answer');
  svg.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: x * 100, clientY: y * 100 }));
}

beforeAll(async () => {
  stubSvgGeometry();
  document.body.innerHTML = '<main id="app"></main>';
  await import('../src/app.js');
});

describe('interface : du choix du poste au bilan', () => {
  it('affiche le choix du poste avec les 7 rôles et un bouton Commencer désactivé', () => {
    expect(text()).toContain('Positionnement 5-1');
    expect(document.querySelectorAll('#roles button')).toHaveLength(7);
    expect($('#start').disabled).toBe(true);
    expect(document.querySelectorAll('svg.pick .token')).toHaveLength(6);
  });

  it('sélectionner un poste sur le schéma active Commencer et lance la première situation', () => {
    $('svg.pick .token[data-id="P"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect($('#roles button[data-role="P"]').classList.contains('selected')).toBe(true);
    expect($('#start').disabled).toBe(false);
    // Rotation aléatoire cochée par défaut : on la décoche pour un déroulé déterministe (P en 1).
    expect($('#random').checked).toBe(true);
    $('#random').checked = false;
    $('#random').dispatchEvent(new window.Event('change', { bubbles: true }));
    click('#start');
    expect(text()).toContain('Situation 1/18');
    expect(text()).toContain('Nous 0 – 0 Eux');
    expect(text()).toContain('Nous servons');
    expect(text()).toContain('P en 1');
    expect(text()).toContain('Simple rappel');
  });

  it('un tap sur la bonne position donne un feedback positif, un tap loin un feedback négatif', () => {
    const session = buildSession({ role: 'P' });
    tapCourt(session.situations[0].expected);
    expect(text()).toContain('Bien placé');
    expect($('#next').textContent).toBe('Situation suivante');
    click('#next');
    expect(text()).toContain('Situation 2/18');
    expect(text()).toContain('Ils servent');
    expect(text()).toContain('Contrainte à la frappe adverse');
    tapCourt(farFrom(session.situations[1].expected));
    expect(text()).toContain('Pas là');
    expect(text()).toMatch(/passeur/i); // note pédagogique de la fiche
    expect(document.querySelectorAll('svg.court circle').length).toBeGreaterThan(6); // cercle de tolérance + pions
    click('#next');
  });

  it('arrive au bilan avec le compte des erreurs et permet de les rejouer', () => {
    const session = buildSession({ role: 'P' });
    for (let i = 2; i < 18; i++) {
      const sit = session.situations[i];
      tapCourt(sit.phase === 'reception' ? farFrom(sit.expected) : sit.expected);
      if (i < 17) click('#next');
    }
    expect($('#next').textContent).toBe('Voir le bilan');
    click('#next');
    expect(text()).toContain('Bilan');
    expect(text()).toContain('12 / 18');
    expect(document.querySelectorAll('ul.failed li')).toHaveLength(6);
    expect(localStorage.getItem('volley-positionnement:best:P')).toBe('{"correct":12,"total":18}');
    click('#replay');
    expect(text()).toContain('Situation 1/6');
    expect($('.phases li.current').textContent).toContain('Réception');
  });

  it('Changer de poste ramène au choix du poste', () => {
    const session = buildSession({ role: 'P' });
    const failed = session.situations.filter((s) => s.phase === 'reception');
    failed.forEach((sit, i) => {
      tapCourt(sit.expected);
      click('#next');
    });
    expect(text()).toContain('6 / 6');
    click('#restart');
    expect(text()).toContain('Positionnement 5-1');
    expect(text()).toContain('Meilleurs scores');
  });

  it('en cours de série, Réinitialiser le quiz et Changer de poste demandent confirmation puis agissent', () => {
    click('#roles button[data-role="P"]');
    click('#start');
    expect(text()).toContain('Situation 1/18');
    const session = buildSession({ role: 'P' });
    tapCourt(session.situations[0].expected);
    expect(text()).toContain('Bien placé');

    window.confirm = () => false;
    click('#reset');
    expect(text()).toContain('Bien placé'); // refus : rien ne change
    window.confirm = () => true;
    click('#reset');
    expect(text()).toContain('Situation 1/18');
    expect(text()).toContain('Nous 0 – 0 Eux');
    expect($('svg.answer')).not.toBeNull();

    window.confirm = () => false;
    click('#change'); // série vierge : pas de confirmation demandée
    expect(text()).toContain('Positionnement 5-1');
    expect(document.querySelectorAll('#roles button')).toHaveLength(7);
  });
});
