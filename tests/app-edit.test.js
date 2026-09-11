// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://localhost/?edit" }
import { describe, it, expect, beforeAll } from 'vitest';
import { POSITIONS } from '../src/positions.js';

beforeAll(async () => {
  window.scrollTo = () => {};
  document.body.innerHTML = '<main id="app"></main>';
  await import('../src/app.js');
});

describe('mode calibrage (?edit)', () => {
  it('affiche les 6 pions de la formation et le JSON exportable', () => {
    expect(document.querySelector('h1').textContent).toContain('Calibrage');
    expect(document.querySelectorAll('svg.edit .token')).toHaveLength(6);
    const json = JSON.parse(document.querySelector('#json').value);
    expect(Object.keys(json)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(json[1].reception.P).toEqual(POSITIONS[1].reception.P);
    expect(json[3].base1.L).toEqual(POSITIONS[3].base1.L);
  });

  it('change de rotation et de formation', () => {
    const rot = document.querySelector('#rot');
    rot.value = '4';
    rot.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.querySelector('#rot').value).toBe('4');
    const form = document.querySelector('#form');
    form.value = 'base1';
    form.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.querySelector('#form').value).toBe('base1');
    const p = document.querySelector('svg.edit .token[data-id="P"]').getAttribute('transform');
    expect(p).toBe(`translate(${POSITIONS[4].base1.P[0] * 100} ${POSITIONS[4].base1.P[1] * 100})`);
  });
});
