// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { buildSession } from '../src/session.js';
import { positionsFor } from '../src/positions.js';

// Écran de question : animation du ballon, frise des phases, bande adverse. jsdom n'exécute pas le CSS :
// on vérifie la structure (classes, variables de trajet, couche non tapable), pas le mouvement.
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
const $$ = (sel) => document.querySelectorAll(sel);
const text = () => document.getElementById('app').textContent;
const click = (sel) => $(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
function tapCourt([x, y]) {
  for (const type of ['pointerdown', 'pointerup']) {
    $('svg.answer').dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: x * 100, clientY: y * 100 }));
  }
}

const VIEWBOX = '-8 -16 116 127';
const session = buildSession({ role: 'P' });

beforeAll(async () => {
  stubSvgGeometry();
  document.body.innerHTML = '<main id="app"></main>';
  await import('../src/app.js');
});

describe('animation du ballon et frise des phases', () => {
  it('tous les terrains ont la même viewBox avec la bande adverse', () => {
    expect($('svg.pick').getAttribute('viewBox')).toBe(VIEWBOX);
    expect($('svg.pick rect.them')).not.toBeNull();
    click('#roles button[data-role="P"]');
    $('#random').checked = false;
    $('#random').dispatchEvent(new window.Event('change', { bubbles: true }));
    click('#start');
    const courts = $$('svg.court');
    expect(courts.length).toBe(2); // terrain de réponse + inset
    courts.forEach((svg) => {
      expect(svg.getAttribute('viewBox')).toBe(VIEWBOX);
      expect(svg.querySelector('rect.them')).not.toBeNull();
    });
  });

  it('service : notre serveur avec le ballon qui part, couche non tapable, frise sur Service', () => {
    const anim = $('svg.answer .anim');
    expect(anim.getAttribute('pointer-events')).toBe('none');
    const b = anim.querySelector('.ball.fly-1');
    expect(b.getAttribute('style')).toContain('--x0:');
    expect(b.getAttribute('style')).toContain('--x1:');
    expect(b.classList.contains('token')).toBe(false);
    expect(anim.querySelector('.ghosts')).toBeNull();
    expect(anim.querySelector('.token[data-id="P"]')).not.toBeNull(); // P en 1 : le passeur sert
    expect($$('.phases li')).toHaveLength(3);
    expect($('.phases li.current').textContent).toContain('Service');
    expect($$('.phases li.done')).toHaveLength(0);
  });

  it('« revoir » rejoue l’animation sans changer de situation', () => {
    click('#rewatch');
    expect(text()).toContain('Situation 1/18');
    expect($('svg.answer .anim .ball')).not.toBeNull();
  });

  it('le feedback garde la frise mais pas la couche animée', () => {
    tapCourt(session.situations[0].expected);
    expect(text()).toContain('Bien placé');
    expect($('.anim')).toBeNull();
    expect($('.phases li.current').textContent).toContain('Service');
  });

  it('réception : leur serveur et le ballon qui arrive', () => {
    click('#next');
    const anim = $('svg.answer .anim');
    expect(anim.querySelector('circle.opp')).not.toBeNull();
    expect(anim.querySelector('.ball.fly-1')).not.toBeNull();
    expect(anim.querySelector('.ghosts')).toBeNull();
    expect($$('.phases li.done')).toHaveLength(1);
    expect($('.phases li.current').textContent).toContain('Réception');
  });

  it('après réception : formation de réception en fantômes, ballon en 4 sauts, tap qui traverse', () => {
    tapCourt(session.situations[1].expected);
    click('#next');
    expect(text()).toContain('Situation 3/18');
    const anim = $('svg.answer .anim');
    const ghosts = anim.querySelectorAll('.ghosts .token');
    expect(ghosts).toHaveLength(6);
    expect(anim.querySelector('.ghosts .token[data-id="P"]')).not.toBeNull();
    const R = positionsFor(1, 'reception');
    expect(anim.querySelector('.ghosts .token[data-id="L"]').getAttribute('transform')).toBe(`translate(${R.L[0] * 100} ${R.L[1] * 100})`);
    const b = anim.querySelector('.ball.fly-4');
    expect(b.getAttribute('style')).toContain('--x4:');
    expect($$('.phases li.done')).toHaveLength(2);
    expect($('.phases li.current').textContent).toContain('Après réception');
    tapCourt(session.situations[2].expected);
    expect(text()).toContain('Bien placé');
  });
});
