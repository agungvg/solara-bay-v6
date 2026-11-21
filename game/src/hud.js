// Solara Bay — dense HUD + real minimap. Fresh code, round 6.
import { DISTRICTS, POLICE_UNITS, WEAPONS, CREW, VEHICLE, RADIO, MISSIONS } from './config.js';

const $ = (id) => document.getElementById(id);

export function buildStaticHud(state) {
  // weapon slots
  $('weapons').innerHTML = WEAPONS.map((w, i) => `
    <div class="wslot${i === state.weapon ? ' sel' : ''}" data-i="${i}">
      <span class="k">${i + 1}</span><span class="ic">${w.icon}</span><br>
      ${w.name}<span class="ammo">${w.ammo}</span>
    </div>`).join('');
  // crew cards
  $('crew').innerHTML = CREW.map((c) => `
    <div class="crewcard">
      <div class="face" style="background:${c.face}"></div>
      <div><b>${c.name}</b><span>${c.who}</span></div>
      <div class="key">${c.key}</div>
    </div>`).join('');
  $('veh').textContent = VEHICLE.name;
  $('tune').textContent = VEHICLE.tune;
  $('radio').innerHTML = '&#9834; ' + RADIO;
}

export function setDialogue(d) {
  $('dlg-name').innerHTML = `${d.name} <i>${d.role}</i>`;
  $('dlg-text').textContent = d.text;
}

let lastDialogue = null;
export function updateHud(state) {
  const ms = state.mission;
  const m = MISSIONS[ms.index];
  const st = m.stages[ms.stage];
  $('m-chapter').textContent = m.chapter;
  $('m-stage').textContent = `STAGE ${ms.stage + 1}/${m.stages.length}`;
  $('m-title').textContent = m.title;
  $('m-bar').style.width = `${Math.round(ms.stageProgress * 100)}%`;
  $('m-obj').textContent = st.kind === 'clear'
    ? st.text.replace(/0\/\d+/, `${ms.cleared}/${st.count}`)
    : st.text;
  $('m-next').textContent = 'NEXT ' + st.next;

  // police panel: live distances, sorted nearest first (visible units only)
  const units = state.police.filter((u) => u.mesh.visible).map((u, i) => ({
    name: POLICE_UNITS[i % POLICE_UNITS.length].name,
    role: POLICE_UNITS[i % POLICE_UNITS.length].role,
    d: Math.round(Math.hypot(u.x - state.player.x, u.z - state.player.z)),
  })).sort((a, b) => a.d - b.d);
  $('p-count').textContent = `${units.length} UNITS`;
  $('p-table').innerHTML = units.map((u) => {
    const cls = u.role === 'RAMMING' ? 'ram' : u.role === 'PURSUIT' ? 'pur' : 'flk';
    return `<tr><td>${u.name}</td><td><span class="role ${cls}">${u.role}</span></td><td class="dist">${u.d} m</td></tr>`;
  }).join('');
  $('p-foot').textContent = state.wanted >= 4 ? 'AIR UNIT DEPLOYED · OSPREY-1 OVERHEAD' : 'UNITS RESPONDING';

  // district
  const dist = DISTRICTS.find((d) => d.test(state.player.x, state.player.z));
  $('d-name').textContent = dist.name;
  $('d-sub').textContent = dist.sub;
  $('d-grip').textContent = dist.grip + '%';
  $('d-bar').style.width = dist.grip + '%';

  // vitals
  $('v-hp').style.width = state.health + '%';
  $('v-hp-n').textContent = Math.round(state.health);
  $('v-ar').style.width = state.armour + '%';
  $('v-ar-n').textContent = Math.round(state.armour);

  // cash / rank / wanted
  $('clock').textContent = state.clock;
  $('cash').textContent = '$' + state.cash.toLocaleString('en-US');
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < state.wanted ? '★' : '<span class="off">★</span>';
  $('stars').innerHTML = stars;
  $('rank-name').textContent = state.rankName;
  $('rank-xp').textContent = `${state.xp.toLocaleString('en-US')} / 5,000 XP`;
  $('rank-bar').style.width = (state.xp / 50) + '%';

  // speed / vehicle / condition
  const kmh = Math.round(Math.abs(state.player.speed) * 3.6);
  $('spd').textContent = state.player.inCar ? kmh : 0;
  $('veh').textContent = state.player.inCar ? VEHICLE.name : 'ON FOOT';
  $('tune').textContent = state.player.inCar ? VEHICLE.tune : 'WALKING · SOLARA BAY';
  $('cond-bar').style.width = state.condition + '%';
  $('cond-n').textContent = `${Math.round(state.condition)}% ${state.condition > 60 ? 'CLEAN' : state.condition > 30 ? 'DENTED' : 'WRECKED'}`;

  // dialogue (only re-render on change)
  if (state.dialogue !== lastDialogue) {
    setDialogue(state.dialogue);
    lastDialogue = state.dialogue;
  }

  // weapon selection highlight
  document.querySelectorAll('.wslot').forEach((el) => {
    el.classList.toggle('sel', Number(el.dataset.i) === state.weapon);
  });

  $('cross').style.display = state.player.inCar ? 'none' : 'block';
  drawMinimap(state);
  if (state.mode === 'complete') {
    $('banner').style.display = 'block';
    $('banner-h').textContent = 'MISSION COMPLETE';
    $('banner-p').textContent = `${m.title} · +$${ms.payout.toLocaleString('en-US')} · ${'★'.repeat(ms.stars)}${'☆'.repeat(3 - ms.stars)}`;
  } else {
    $('banner').style.display = 'none';
  }
}

export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.style.display = 'none'; }, 2600);
}

// --- real minimap: streets + district labels + markers + blips + player arrow ---
const MM_LABELS = [
  { t: 'STRAND', x: 126, z: 134 },
  { t: 'PASARU', x: -100, z: 92 },
  { t: 'MARINA', x: 100, z: -88 },
  { t: 'HEIGHTS', x: -20, z: -128 },
  { t: 'HARBOR', x: -70, z: 148 },
  { t: 'CENTRAL', x: 0, z: 8 },
];

export function drawMinimap(state) {
  const cv = $('mm');
  const g = cv.getContext('2d');
  const S = 168, W = 340; // world -170..170 maps to 0..168
  const px = (x) => (x + 170) / W * S;
  const pz = (z) => (z + 170) / W * S;
  g.clearRect(0, 0, S, S);
  // base + water + beach
  g.fillStyle = '#16222e'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#1d4e63'; g.fillRect(px(205), 0, S - px(205), S);
  g.fillStyle = '#8a744e'; g.fillRect(px(150), 0, px(205) - px(150), S);
  // blocks
  g.fillStyle = '#2b3644';
  for (const bx of [-80, 0, 80]) for (const bz of [-80, 0, 80]) {
    g.fillRect(px(bx - 32), pz(bz - 32), 64 / W * S, 64 / W * S);
  }
  // streets
  g.strokeStyle = '#9aa7b5'; g.lineWidth = 3;
  for (const c of [-120, -40, 40, 120]) {
    g.beginPath(); g.moveTo(0, pz(c)); g.lineTo(S, pz(c)); g.stroke();
    g.beginPath(); g.moveTo(px(c), 0); g.lineTo(px(c), S); g.stroke();
  }
  g.strokeStyle = '#e8b93c'; g.lineWidth = 1;
  g.setLineDash([4, 4]);
  for (const c of [-120, -40, 40, 120]) {
    g.beginPath(); g.moveTo(0, pz(c)); g.lineTo(S, pz(c)); g.stroke();
    g.beginPath(); g.moveTo(px(c), 0); g.lineTo(px(c), S); g.stroke();
  }
  g.setLineDash([]);
  // district labels
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = 'bold 7px Arial'; g.textAlign = 'center';
  for (const L of MM_LABELS) g.fillText(L.t, px(L.x), pz(L.z));
  // roadblock marker
  if (state.roadblock && state.roadblock.visible) {
    g.fillStyle = '#ff7a1a';
    g.fillRect(px(state.roadblock.position.x) - 4, pz(state.roadblock.position.z) - 4, 8, 8);
  }
  // mission marker (pulsing yellow diamond)
  const st = MISSIONS[state.mission.index].stages[state.mission.stage];
  const mx = state.mission.done ? null : (st.kind === 'ram'
    ? state.regent.position.x : st.at[0]);
  const mz = state.mission.done ? null : (st.kind === 'ram'
    ? state.regent.position.z : st.at[1]);
  if (mx !== null) {
    const r = 5 + Math.sin(state.gameTime * 4) * 1.5;
    g.fillStyle = '#ffd23c';
    g.beginPath();
    g.moveTo(px(mx), pz(mz) - r); g.lineTo(px(mx) + r, pz(mz));
    g.lineTo(px(mx), pz(mz) + r); g.lineTo(px(mx) - r, pz(mz));
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,210,60,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.arc(px(mx), pz(mz), 10, 0, Math.PI * 2); g.stroke();
  }
  // police blips
  for (const u of state.police) {
    g.fillStyle = '#ff4444';
    g.beginPath(); g.arc(px(u.x), pz(u.z), 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#5db8ff'; g.lineWidth = 1;
    g.beginPath(); g.arc(px(u.x), pz(u.z), 4.5, 0, Math.PI * 2); g.stroke();
  }
  // player arrow
  const hx = Math.cos(state.player.heading), hz = Math.sin(state.player.heading);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(px(state.player.x) + hx * 7, pz(state.player.z) + hz * 7);
  g.lineTo(px(state.player.x) - hz * 4.5 - hx * 4, pz(state.player.z) + hx * 4.5 - hz * 4);
  g.lineTo(px(state.player.x) + hz * 4.5 - hx * 4, pz(state.player.z) - hx * 4.5 - hz * 4);
  g.closePath(); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 1; g.stroke();
  // north
  g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.textAlign = 'center';
  g.fillText('N', S - 8, 10);
}
