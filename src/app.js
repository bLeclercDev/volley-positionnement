// Rendu DOM/SVG et branchement des événements. Toute la logique métier vit dans les autres modules.
import { ROLES, lineup, ZONE_CENTER, zoneOf, isFrontRow, serverOf, backRowCentral, frontRowR4 } from './rotation.js';
import { POSITIONS, DATA_ROLES, PHASES, positionsFor } from './positions.js';
import { PHASE_LABEL, PHASE_SHORT } from './session.js';
import { TOLERANCE } from './evaluate.js';
import * as S from './state.js';

const app = document.getElementById('app');
const EDIT_MODE = new URLSearchParams(location.search).has('edit');
const SCALE = 100;

let state = S.initialState();
let selectedRole = null;
let randomStart = true;

function dispatch(fn) {
  state = fn(state);
  render();
}

function pickStartRotation() {
  return randomStart ? 1 + Math.floor(Math.random() * 6) : 1;
}

// ---------- localStorage (meilleur score par rôle) ----------
function bestKey(role) {
  return `volley-positionnement:best:${role}`;
}
function readBest(role) {
  try {
    const raw = localStorage.getItem(bestKey(role));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveBest(role, correct, total) {
  try {
    const prev = readBest(role);
    if (!prev || correct / total > prev.correct / prev.total) {
      localStorage.setItem(bestKey(role), JSON.stringify({ correct, total }));
    }
  } catch {
    /* stockage indisponible : on ignore */
  }
}

// ---------- SVG ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function token({ x, y, label, kind = 'back', id = '', r = 5.5 }) {
  const fill = { front: 'var(--front)', back: 'var(--back)', me: 'var(--accent)', ghost: '#e6e9ec' }[kind];
  const color = kind === 'me' ? '#fff' : kind === 'ghost' ? 'var(--ghost)' : 'var(--ink)';
  const stroke = kind === 'ghost' ? 'var(--ghost)' : 'var(--ink)';
  return `<g class="token" data-id="${esc(id)}" transform="translate(${x * SCALE} ${y * SCALE})">
    <circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>
    <text text-anchor="middle" dominant-baseline="central" font-size="${label.length > 1 ? 4.6 : 5.4}" font-weight="700" fill="${color}">${esc(label)}</text>
  </g>`;
}

// Bande « camp adverse » au-dessus du filet (TOP) et marge sous la ligne de fond (BOTTOM) pour le pion
// du serveur : identiques sur tous les terrains, pour que le dessin ne bouge jamais entre les écrans.
const TOP = -16;
const BOTTOM = 111;

function courtSvg({ tokens = [], extra = '', tappable = false, cls = '' }) {
  const third = SCALE / 3;
  return `<svg class="court ${tappable ? 'tappable' : ''} ${cls}" viewBox="-8 ${TOP} 116 ${BOTTOM - TOP}" role="img" aria-label="Terrain de volley">
    <rect class="them" x="0" y="${TOP}" width="${SCALE}" height="${-TOP}" fill="var(--ink)" opacity="0.06"/>
    <line x1="-8" y1="0" x2="${SCALE + 8}" y2="0" stroke="var(--ink)" stroke-width="2"/>
    <rect x="0" y="0" width="${SCALE}" height="${third}" fill="var(--front)" opacity="0.55"/>
    <rect x="0" y="${third}" width="${SCALE}" height="${SCALE - third}" fill="var(--back)" opacity="0.55"/>
    <rect x="0" y="0" width="${SCALE}" height="${SCALE}" fill="none" stroke="var(--ink)" stroke-width="0.9"/>
    <line x1="0" y1="${third}" x2="${SCALE}" y2="${third}" stroke="var(--ink)" stroke-width="0.9"/>
    <text x="${SCALE / 2}" y="-3" text-anchor="middle" font-size="4" fill="var(--muted)">filet</text>
    ${extra}
    ${tokens.map(token).join('')}
  </svg>`;
}

function svgPoint(svg, event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [p.x / SCALE, p.y / SCALE];
}

// ---------- animation du ballon (écran de question) ----------
// Ballon : cercle + 3 arcs (panneaux). Le trajet est piloté en CSS par les variables --x0/--y0 … --xN/--yN
// (unités SVG suffixées « px »), lues dans les @keyframes de index.html. Pas de classe « token ».
function ball({ points, cls }) {
  const px = (v) => `${Math.round(v * SCALE * 100) / 100}px`;
  const vars = points.map(([x, y], i) => `--x${i}:${px(x)};--y${i}:${px(y)}`).join(';');
  const seam = '<path d="M-3.3 -1.1 Q0 0.9 3.3 -1.1" fill="none" stroke="var(--ink)" stroke-width="0.55"/>';
  return `<g class="ball ${cls}" style="${vars}" aria-hidden="true">
    <g class="ball-arc"><g class="ball-spin">
      <circle r="3.5" fill="#fff" stroke="var(--ink)" stroke-width="0.7"/>
      ${seam}<g transform="rotate(120)">${seam}</g><g transform="rotate(240)">${seam}</g>
    </g></g>
  </g>`;
}

const OPP_SERVER = [0.12, -0.16]; // serveur adverse, demi-visible en haut de la bande (leur zone 1 vue de chez nous)
const OPP_BALL = [0.16, -0.12];

// Couche animée qui raconte la phase : ne capte aucun tap (pointer-events="none").
function animationLayer(sit) {
  const { rotation, phase } = sit;
  const me = (role) => (role === state.role ? 'me' : 'ghost');
  const opp = `<circle class="opp" cx="${OPP_SERVER[0] * SCALE}" cy="${OPP_SERVER[1] * SCALE}" r="5.5" fill="#e6e9ec" stroke="var(--ghost)" stroke-width="0.8"/>`;
  let inner = '';
  if (phase === 'service') {
    // Notre serveur derrière la ligne de fond : le ballon tourne dans sa main, puis part chez eux.
    const server = serverOf(rotation);
    inner =
      token({ x: 0.88, y: 1.04, label: ROLES[server].short, id: server, kind: me(server) }) +
      ball({ cls: 'fly-1', points: [[0.92, 0.995], [0.45, -0.12]] });
  } else if (phase === 'reception') {
    // Leur serveur : le ballon franchit le filet et tombe au fond (point fixe, pour ne pas souffler la réponse).
    inner = opp + ball({ cls: 'fly-1', points: [OPP_BALL, [0.5, 0.72]] });
  } else {
    // Après réception : formation de réception en fantômes, réception (L) → passe (P) → attaque du R4 avant
    // au filet → le ballon repart chez eux, puis les fantômes s'effacent : à toi de te replacer.
    const R = positionsFor(rotation, 'reception');
    const attack = [R[frontRowR4(rotation)][0], 0.08];
    const ghosts = Object.entries(R)
      .map(([role, [x, y]]) => token({ x, y, label: ROLES[role].short, id: role, kind: me(role) }))
      .join('');
    inner = opp + `<g class="ghosts">${ghosts}</g>` + ball({ cls: 'fly-4', points: [OPP_BALL, R.L, R.P, attack, [1 - attack[0], -0.13]] });
  }
  return `<g class="anim" pointer-events="none">${inner}</g>`;
}

// Frise des 3 phases du point, étape en cours surlignée.
const PHASE_HINT = { service: 'on sert', reception: 'ils servent', apresReception: 'on a attaqué, on se replace' };

function phaseStrip(phase) {
  const i = PHASES.indexOf(phase);
  return `<ol class="phases" aria-label="Déroulé du point">${PHASES.map(
    (p, k) =>
      `<li class="${k < i ? 'done' : k === i ? 'current' : ''}"${k === i ? ' aria-current="step"' : ''}><strong>${esc(PHASE_SHORT[p])}</strong><span>${esc(PHASE_HINT[p])}</span></li>`,
  ).join('')}</ol>`;
}

function lineupTokens(rotation, { highlight = null, hideBackCentral = false } = {}) {
  const zones = lineup(rotation);
  return Object.entries(zones).map(([zone, role]) => {
    const [x, y] = ZONE_CENTER[zone];
    let label = ROLES[role].short;
    if (hideBackCentral && role === backRowCentral(rotation)) label = 'C/L';
    return { x, y, label, id: role, kind: role === highlight ? 'me' : isFrontRow(Number(zone)) ? 'front' : 'back' };
  });
}

// ---------- écrans ----------
function renderRole() {
  const bests = Object.keys(ROLES)
    .map((r) => [r, readBest(r)])
    .filter(([, b]) => b);
  app.innerHTML = `
    <h1>Positionnement 5-1</h1>
    <p class="muted">Réception et base 1, rotation par rotation. Choisis ton poste : le score tourne, à toi de te placer.</p>
    <div class="card">
      <p class="muted">Tape ton poste sur le schéma (ordre de rotation, passeur en 1) ou dans la liste. « Côté passeur » / « côté pointu » = voisin dans l’ordre de rotation.</p>
      ${courtSvg({ tokens: lineupTokens(1, { highlight: selectedRole }), tappable: true, cls: 'pick' })}
      <div class="roles" id="roles">
        ${Object.entries(ROLES)
          .map(([id, r]) => {
            const front = id !== 'L' && isFrontRow(zoneOf(id, 1));
            return `<button data-role="${id}" class="${selectedRole === id ? 'selected' : ''}"><span class="chip ${front ? 'front' : 'back'}">${r.short}</span><span>${esc(r.label)}</span></button>`;
          })
          .join('')}
      </div>
      <label class="check"><input type="checkbox" id="random" ${randomStart ? 'checked' : ''}> Rotation de départ aléatoire</label>
      <button class="primary wide" id="start" ${selectedRole ? '' : 'disabled'}>Commencer</button>
    </div>
    ${bests.length ? `<p class="muted">Meilleurs scores : ${bests.map(([r, b]) => `${esc(ROLES[r].label)} ${b.correct}/${b.total}`).join(' · ')}</p>` : ''}
    <p class="kbd">Astuce coach : ajoute <code>?edit</code> à l’adresse pour ajuster les positions.</p>`;

  const pick = (role) => {
    selectedRole = role;
    render();
  };
  app.querySelectorAll('#roles button').forEach((b) => b.addEventListener('click', () => pick(b.dataset.role)));
  app.querySelectorAll('svg.pick .token').forEach((t) => t.addEventListener('click', () => pick(t.dataset.id)));
  app.querySelector('#random').addEventListener('change', (e) => {
    randomStart = e.target.checked;
  });
  app.querySelector('#start').addEventListener('click', () => {
    dispatch((s) => S.start(s, { role: selectedRole, startRotation: pickStartRotation() }));
  });
}

function header(sit) {
  const { us, them } = sit.score;
  return `<div class="row between">
      <span class="score">Nous ${us} – ${them} Eux</span>
      <span class="badge ${sit.weServe ? 'serve' : 'receive'}">${sit.weServe ? 'Nous servons' : 'Ils servent'}</span>
    </div>
    <div class="row between muted">
      <span>Situation ${sit.index + 1}/${state.situations.length} · ${esc(PHASE_SHORT[sit.phase])}</span>
      <span class="badge">P en ${sit.rotation}</span>
    </div>
    ${phaseStrip(sit.phase)}`;
}

function inset(sit) {
  const constraint = sit.phase === 'reception';
  const server = sit.weServe ? ROLES[serverOf(sit.rotation)].label : null;
  return `<div class="inset card">
      ${courtSvg({ tokens: lineupTokens(sit.rotation, { highlight: state.role, hideBackCentral: true }).map((t) => ({ ...t, r: 7 })) })}
      <div class="muted">
        <strong>Ordre de rotation</strong><br>
        ${constraint ? 'Contrainte à la frappe adverse : avants devant leurs arrières, ordre gauche/droite (règle 7.4).' : 'Simple rappel : l’équipe au service se place librement (règle 7.4, 2025).'}
        ${server ? `<br>Serveur : ${esc(server)}.` : ''}
      </div>
    </div>`;
}

// Barre d'actions commune aux écrans de jeu : recommencer la série ou changer de poste.
function tools() {
  return `<div class="row tools">
      <button id="reset">Réinitialiser le quiz</button>
      <button id="change">Changer de poste</button>
    </div>`;
}

function bindTools() {
  const started = state.current > 0 || state.results.length > 0;
  const ok = (msg) => !started || window.confirm(msg);
  app.querySelector('#reset').addEventListener('click', () => {
    if (ok('Recommencer la série depuis le début ?')) dispatch((s) => S.start(s, { role: s.role, startRotation: pickStartRotation() }));
  });
  app.querySelector('#change').addEventListener('click', () => {
    if (ok('Abandonner la série en cours et changer de poste ?')) dispatch(S.restart);
  });
}

function renderQuestion() {
  const sit = S.currentSituation(state);
  app.innerHTML = `
    ${header(sit)}
    <p class="question">${esc(PHASE_LABEL[sit.phase])}</p>
    <p class="lead muted">Tu es <strong>${esc(ROLES[state.role].label)}</strong>. Tape ta position sur le terrain. <button type="button" id="rewatch" class="link">↻ revoir</button></p>
    ${courtSvg({ tappable: true, cls: 'answer', extra: animationLayer(sit) })}
    ${inset(sit)}
    ${tools()}`;
  const svg = app.querySelector('svg.answer');
  svg.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dispatch((s) => S.tap(s, svgPoint(svg, e)));
  });
  // Re-rendre recrée les nœuds SVG : les animations CSS repartent de zéro.
  app.querySelector('#rewatch').addEventListener('click', renderQuestion);
  bindTools();
}

function renderFeedback() {
  const sit = S.currentSituation(state);
  const result = state.results.at(-1);
  const everyone = positionsFor(sit.rotation, sit.phase);
  const ghosts = Object.entries(everyone)
    .filter(([role]) => role !== state.role)
    .map(([role, [x, y]]) => ({ x, y, label: ROLES[role].short, kind: 'ghost', id: role }));
  const [ex, ey] = sit.expected;
  const [tx, ty] = result.tap;
  const color = result.hit ? 'var(--ok)' : 'var(--ko)';
  const extra = `
    <circle cx="${ex * SCALE}" cy="${ey * SCALE}" r="${TOLERANCE * SCALE}" fill="${color}" opacity="0.18" stroke="${color}" stroke-width="0.8" stroke-dasharray="2 1.5"/>
    <g transform="translate(${tx * SCALE} ${ty * SCALE})" stroke="${color}" stroke-width="1.4">
      <line x1="-3" y1="-3" x2="3" y2="3"/><line x1="-3" y1="3" x2="3" y2="-3"/>
    </g>`;
  const tokens = [...ghosts, { x: ex, y: ey, label: ROLES[state.role].short, kind: 'me', id: state.role }];
  app.innerHTML = `
    ${header(sit)}
    <p class="question">${esc(PHASE_LABEL[sit.phase])}</p>
    <p class="lead"><span class="verdict ${result.hit ? 'ok' : 'ko'}">${result.hit ? 'Bien placé !' : 'Pas là.'}</span> <span class="muted">La croix est ton tap, le cercle la zone attendue.</span></p>
    ${courtSvg({ tokens, extra })}
    ${sit.note ? `<p class="note">${esc(sit.note)}</p>` : ''}
    <button class="primary wide" id="next">${state.current + 1 < state.situations.length ? 'Situation suivante' : 'Voir le bilan'}</button>
    ${inset(sit)}
    ${tools()}`;
  app.querySelector('#next').addEventListener('click', () => dispatch(S.next));
  bindTools();
}

function renderSummary() {
  const sum = S.summary(state);
  if (!state.replay) saveBest(state.role, sum.correct, sum.total);
  const best = readBest(state.role);
  app.innerHTML = `
    <h1>Bilan · ${esc(ROLES[state.role].label)}</h1>
    <div class="card">
      <p class="score">${sum.correct} / ${sum.total}</p>
      ${best ? `<p class="muted">Meilleur score pour ce poste : ${best.correct}/${best.total}</p>` : ''}
      ${
        sum.failed.length
          ? `<h2>À revoir</h2><ul class="failed">${sum.failed.map((s) => `<li>P${s.rotation} · ${esc(PHASE_SHORT[s.phase])}</li>`).join('')}</ul>`
          : '<p>Sans faute. Passe au niveau supérieur : rotation de départ aléatoire, ou un autre poste.</p>'
      }
    </div>
    <div class="row">
      ${sum.failed.length ? '<button class="primary" id="replay">Rejouer mes erreurs</button>' : ''}
      <button id="again">Refaire la série</button>
      <button id="restart">Changer de poste</button>
    </div>`;
  app.querySelector('#replay')?.addEventListener('click', () => dispatch(S.replayErrors));
  app.querySelector('#again').addEventListener('click', () => {
    dispatch((s) => S.start(s, { role: s.role, startRotation: pickStartRotation() }));
  });
  app.querySelector('#restart').addEventListener('click', () => dispatch(S.restart));
}

// ---------- mode calibrage (?edit) ----------
const edit = { rotation: 1, formation: 'reception', data: structuredClone(POSITIONS) };

function exportJson() {
  const out = {};
  for (const k of [1, 2, 3, 4, 5, 6]) {
    out[k] = {};
    for (const f of ['reception', 'base1']) {
      out[k][f] = {};
      for (const role of DATA_ROLES) out[k][f][role] = edit.data[k][f][role].map((v) => Math.round(v * 1000) / 1000);
    }
  }
  return JSON.stringify(out, null, 2);
}

function renderEdit() {
  const formation = edit.data[edit.rotation][edit.formation];
  const tokens = DATA_ROLES.map((role) => {
    const [x, y] = formation[role];
    const front = role === 'C' || (role !== 'L' && isFrontRow(zoneOf(role, edit.rotation)));
    return { x, y, label: role === 'C' ? 'C' : ROLES[role].short, kind: front ? 'front' : 'back', id: role, r: 6.5 };
  });
  app.innerHTML = `
    <h1>Calibrage des positions</h1>
    <p class="muted">Glisse les pions, puis copie le JSON et remplace les coordonnées dans <code>src/positions.js</code> (ou envoie-le au dev). C = central avant, L = place du central arrière.</p>
    <div class="row">
      <label>Rotation <select id="rot">${[1, 2, 3, 4, 5, 6].map((k) => `<option value="${k}" ${k === edit.rotation ? 'selected' : ''}>P en ${k}</option>`).join('')}</select></label>
      <label>Formation <select id="form"><option value="reception" ${edit.formation === 'reception' ? 'selected' : ''}>Réception</option><option value="base1" ${edit.formation === 'base1' ? 'selected' : ''}>Base 1</option></select></label>
    </div>
    ${courtSvg({ tokens, tappable: true, cls: 'edit' })}
    <div class="row"><button class="primary" id="copy">Copier le JSON</button><span id="copied" class="muted"></span></div>
    <textarea id="json" readonly>${esc(exportJson())}</textarea>`;

  const svg = app.querySelector('svg.edit');
  let dragging = null;
  svg.querySelectorAll('.token').forEach((t) => {
    t.addEventListener('pointerdown', (e) => {
      dragging = t.dataset.id;
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const [x, y] = svgPoint(svg, e).map((v) => Math.min(1.05, Math.max(-0.05, v)));
    formation[dragging] = [x, y];
    svg.querySelector(`.token[data-id="${dragging}"]`).setAttribute('transform', `translate(${x * SCALE} ${y * SCALE})`);
  });
  const stop = () => {
    if (!dragging) return;
    dragging = null;
    app.querySelector('#json').value = exportJson();
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  app.querySelector('#rot').addEventListener('change', (e) => {
    edit.rotation = Number(e.target.value);
    renderEdit();
  });
  app.querySelector('#form').addEventListener('change', (e) => {
    edit.formation = e.target.value;
    renderEdit();
  });
  app.querySelector('#copy').addEventListener('click', async () => {
    const text = exportJson();
    try {
      await navigator.clipboard.writeText(text);
      app.querySelector('#copied').textContent = 'Copié.';
    } catch {
      app.querySelector('#json').select();
      app.querySelector('#copied').textContent = 'Sélectionne le texte et copie-le.';
    }
  });
}

// ---------- routeur ----------
function render() {
  if (EDIT_MODE) return renderEdit();
  ({ role: renderRole, question: renderQuestion, feedback: renderFeedback, summary: renderSummary })[state.screen]();
  window.scrollTo({ top: 0 });
}

render();
