// SOLARA BAY — GTA 6 fan game. Open-world crime sandbox in Solara Bay.
// Written fresh in-session for round 6. Three.js vendored locally, no network.
import * as THREE from '../vendor/three.module.js';
import { MISSIONS, POLICE_UNITS, WORLD } from './config.js';
import { buildWorld, buildRoadblock } from './world.js';
import { makeCar, makeRegent, makeHelicopter } from './vehicles.js';
import { makeFigure, makePed, makeEnemy } from './people.js';
import { buildStaticHud, updateHud, toast } from './hud.js';
import { createMissionState, startMission, updateMission, autopilot } from './missions.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const PLAYTEST = params.get('playtest') === '1';

// ---------- state ----------
const state = {
  mode: 'playing',
  mission: createMissionState(),
  gameTime: 0,
  cash: 18450, xp: 3900, rankName: 'FIXER',
  wanted: 1, health: 100, armour: 40, condition: 88,
  clock: '16:00', timeOfDay: 'sunset',
  dialogue: MISSIONS[0].intro,
  weapon: 0,
  frozen: false, shotMode: null,
  cameraMode: 'chase',
  errors: [],
  player: { x: 40, z: 120, heading: 0, speed: 0, inCar: true },
  car: null, carMesh: null,
  onFootMesh: null,
  police: [], traffic: [], peds: [], enemies: [],
  regent: null, regentHp: null,
  heli: null, roadblock: null, world: null,
};
window.addEventListener('error', (e) => { state.errors.push(String(e.message)); });

// ---------- renderer / scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

state.world = buildWorld(scene, state.timeOfDay);

// ---------- player car + on-foot figure ----------
state.carMesh = makeCar(0xd9481f, { spoiler: true });
scene.add(state.carMesh);
state.car = { x: 40, z: 120, heading: 0, speed: 0 };
state.onFootMesh = makeFigure(0x2b6cb0, 0x23262b);
state.onFootMesh.visible = false;
scene.add(state.onFootMesh);

// ---------- traffic ----------
const TRAFFIC_COLORS = [0x2e86c1, 0xf2f2f2, 0x1c1c1c, 0xe8b93c, 0x7a4a9e, 0x4caf50, 0x888888];
function spawnTraffic() {
  for (let i = 0; i < 7; i++) {
    const mesh = makeCar(TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]);
    scene.add(mesh);
    const horiz = i % 2 === 0;
    const road = WORLD.roads[i % 4];
    const lane = (i % 2 === 0 ? 1 : -1) * 3;
    state.traffic.push({
      mesh, horiz, road, lane,
      pos: -140 + i * 42, dir: i % 3 === 0 ? -1 : 1,
      speed: 7 + (i % 4) * 1.5, color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
    });
  }
}
spawnTraffic();

// ---------- police ----------
function spawnPolice(n) {
  for (let i = 0; i < n; i++) {
    const mesh = makeCar(0x111111, { police: true });
    scene.add(mesh);
    state.police.push({
      mesh, x: 40 + (i - 3) * 14, z: 120 + (i % 2 ? 18 : -18),
      heading: 0, speed: 0, flashPhase: i * 0.7,
    });
  }
}
spawnPolice(7);

// ---------- helicopter ----------
state.heli = makeHelicopter();
scene.add(state.heli);

// ---------- regent (ram target) ----------
state.regent = makeRegent();
state.regent.visible = false;
scene.add(state.regent);

// ---------- roadblock ----------
state.roadblock = buildRoadblock(scene);

// ---------- pedestrians (sidewalks only — never on the road) ----------
function spawnPeds() {
  const spots = [];
  const nearRoad = (v) => WORLD.roads.some((c) => Math.abs(v - c) < 9);
  for (const c of WORLD.roads) {
    for (let v = -130; v <= 130; v += 34) {
      if (nearRoad(v)) continue; // never stand where a sidewalk crosses a road
      spots.push([v, c + 8.5, true, 8.5]);
      spots.push([v + 17, c - 8.5, true, -8.5]);
      spots.push([c + 8.5, v, false, 8.5]);
      spots.push([c - 8.5, v + 17, false, -8.5]);
    }
  }
  for (let i = 0; i < 14; i++) {
    const s = spots[(i * 7) % spots.length];
    state.peds.push(makePed(scene, s[0], s[1], s[2] ? 'x' : 'z', s[3]));
  }
}
spawnPeds();

// ---------- market stalls (Pasar Lane street market, on the z=40 road) + enemies ----------
function buildMarket() {
  const stallMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const awnMat = new THREE.MeshLambertMaterial({ color: 0xd94f3d });
  for (let i = 0; i < 5; i++) {
    const x = -76 + i * 6;
    const stall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 3), stallMat);
    stall.position.set(x, 1.2, 40); scene.add(stall);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 3.6), awnMat);
    awn.position.set(x, 2.7, 40); scene.add(awn);
  }
}
buildMarket();
for (let i = 0; i < 5; i++) {
  state.enemies.push(makeEnemy(scene, `KERON-${i + 1}`, -76 + i * 6, 44, Math.PI));
  state.enemies[i].mesh.visible = false;
  state.enemies[i].tag.visible = false;
}

// ---------- input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'e' || e.key === 'E') toggleCar();
  if (e.key >= '1' && e.key <= '4') { state.weapon = Number(e.key) - 1; }
  if (e.key.toLowerCase() === 'z') { state.wanted = Math.max(0, state.wanted - 1); state.condition = 100; toast('SWAP PLATES — Mira swapped the plates. Heat down, car fixed.'); }
  if (e.key.toLowerCase() === 'x') { state.condition = 100; toast('QUICK FIX — Lio patched the car. Condition 100%.'); }
  if (e.key.toLowerCase() === 'c') { toast('EYES OUT — Kiki: roadblock on the Strand, two units flanking east.'); }
  if (e.key.toLowerCase() === 'r') { startMission(state.mission, state.mission.index, state); resetPlayerToStart(); toast('Mission restarted.'); }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function resetPlayerToStart() {
  state.player.x = 40; state.player.z = 120; state.player.heading = 0; state.player.speed = 0;
  state.player.inCar = true;
  state.car.x = 40; state.car.z = 120; state.car.heading = 0; state.car.speed = 0;
  state.health = 100; state.condition = 88;
}

function toggleCar() {
  if (state.player.inCar) {
    state.player.inCar = false;
    state.player.x = state.car.x - Math.sin(state.car.heading) * 2.5;
    state.player.z = state.car.z + Math.cos(state.car.heading) * 2.5;
    state.player.heading = state.car.heading;
    state.player.speed = 0;
    state.onFootMesh.visible = true;
  } else {
    const d = Math.hypot(state.player.x - state.car.x, state.player.z - state.car.z);
    if (d < 4) {
      state.player.inCar = true;
      state.onFootMesh.visible = false;
      state.player.heading = state.car.heading;
    }
  }
}

// ---------- physics helpers ----------
function collideBuildings(x, z, r) {
  for (const b of state.world.colliders) {
    if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true;
  }
  return false;
}
function clampWorld(v) { return Math.max(-168, Math.min(168, v)); }

function driveCar(dt, throttle, steer) {
  const c = state.car;
  const accel = 14, brake = 26, maxF = 34, maxR = -10;
  if (throttle > 0) c.speed += accel * throttle * dt;
  else if (throttle < 0) c.speed -= brake * dt;
  // Rolling drag, always on: without it the car only ever accelerates while
  // throttling, so a small throttle still ends at 122 km/h and every
  // 90-degree turn overshoots into the buildings. Equilibrium speed is
  // 14 * throttle / 0.41, i.e. 34 m/s at full throttle, ~8 m/s at 0.25.
  c.speed -= c.speed * 0.41 * dt;
  if (Math.abs(c.speed) < 0.2 && throttle === 0) c.speed = 0;
  c.speed = Math.max(maxR, Math.min(maxF, c.speed));
  const turn = steer * 1.9 * dt * Math.min(1, 0.35 + Math.abs(c.speed) / 10) * Math.sign(c.speed || 1);
  c.heading += turn;
  const nx = c.x + Math.cos(c.heading) * c.speed * dt;
  const nz = c.z + Math.sin(c.heading) * c.speed * dt;
  if (!collideBuildings(nx, c.z, 2.2)) c.x = nx; else c.speed *= 0.4;
  if (!collideBuildings(c.x, nz, 2.2)) c.z = nz; else c.speed *= 0.4;
  c.x = clampWorld(c.x); c.z = clampWorld(c.z);
  state.player.x = c.x; state.player.z = c.z; state.player.heading = c.heading;
  state.player.speed = c.speed;
}

function walkPlayer(dt, throttle, steer) {
  const p = state.player;
  p.heading += steer * 2.6 * dt;
  const sp = 7.5 * throttle;
  const nx = p.x + Math.cos(p.heading) * sp * dt;
  const nz = p.z + Math.sin(p.heading) * sp * dt;
  if (!collideBuildings(nx, p.z, 0.8)) p.x = nx;
  if (!collideBuildings(p.x, nz, 0.8)) p.z = nz;
  p.x = clampWorld(p.x); p.z = clampWorld(p.z);
  p.speed = sp;
}

// ---------- AI ----------
function updateTraffic(dt) {
  for (const t of state.traffic) {
    t.pos += t.dir * t.speed * dt;
    if (t.pos > 165) t.pos = -165;
    if (t.pos < -165) t.pos = 165;
    if (t.horiz) { t.mesh.position.set(t.pos, 0, t.road + t.lane); t.mesh.rotation.y = t.dir > 0 ? 0 : Math.PI; }
    else { t.mesh.position.set(t.road + t.lane, 0, t.pos); t.mesh.rotation.y = t.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
  }
}

function updatePolice(dt) {
  // Live play: the number of units on the street scales with the wanted
  // level (2 at wanted 1, up to all 7 at wanted 5+). Shot presets place
  // their own units and freeze the sim, so this never touches a screenshot.
  const active = Math.min(state.police.length, state.wanted + 1);
  state.police.forEach((u, i) => { u.mesh.visible = i < active; });
  const p = state.player;
  for (const u of state.police) {
    if (!u.mesh.visible) continue;
    const dx = p.x - u.x, dz = p.z - u.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dz, dx);
    let diff = want - u.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    u.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 2.2 * dt));
    const targetSpeed = d > 34 ? 30 : d < 11 ? 6 : 16;
    u.speed += (targetSpeed - u.speed) * dt * 0.8;
    const nx = u.x + Math.cos(u.heading) * u.speed * dt;
    const nz = u.z + Math.sin(u.heading) * u.speed * dt;
    if (!collideBuildings(nx, u.z, 2.2)) u.x = nx;
    if (!collideBuildings(u.x, nz, 2.2)) u.z = nz;
    u.mesh.position.set(u.x, 0, u.z);
    u.mesh.rotation.y = -u.heading;
    // ramming contact (light damage — a full surround still lets you escape)
    if (d < 4.5 && state.player.inCar && state.mode === 'playing') {
      state.condition = Math.max(0, state.condition - 2.5 * dt);
      state.car.speed *= (1 - 0.6 * dt);
    }
    // light bar flash
    const f = state.gameTime * 6 + u.flashPhase;
    const on = Math.sin(f) > 0;
    if (u.mesh.userData.flash) {
      u.mesh.userData.flash.red.material.color.setHex(on ? 0xff2222 : 0x550000);
      u.mesh.userData.flash.blue.material.color.setHex(on ? 0x112266 : 0x2266ff);
    }
  }
}

function updateHeli(dt) {
  const p = state.player;
  const a = state.gameTime * 0.25;
  const hx = p.x + Math.cos(a) * 26, hz = p.z + Math.sin(a) * 26;
  state.heli.position.set(hx, 30 + Math.sin(state.gameTime * 0.8) * 1.5, hz);
  state.heli.rotation.y = -Math.atan2(p.z - hz, p.x - hx);
  state.heli.userData.rotor.rotation.y += dt * 22;
  state.heli.userData.tailRotor.rotation.x += dt * 30;
  state.heli.userData.cone.visible = state.timeOfDay === 'night' || state.timeOfDay === 'dusk';
  state.heli.visible = state.wanted >= 2;
}

function updatePeds(dt) {
  for (const pd of state.peds) {
    pd.phase += dt * pd.speed * 0.6;
    if (pd.axis === 'x') {
      pd.x += pd.dir * pd.speed * dt;
      if (pd.x > 160) pd.dir = -1;
      if (pd.x < -160) pd.dir = 1;
    } else {
      pd.z += pd.dir * pd.speed * dt;
      if (pd.z > 160) pd.dir = -1;
      if (pd.z < -160) pd.dir = 1;
    }
    pd.mesh.position.set(pd.x, 0, pd.z);
    pd.mesh.rotation.y = pd.axis === 'x' ? (pd.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (pd.dir > 0 ? 0 : Math.PI);
    // little walk bob
    pd.mesh.position.y = Math.abs(Math.sin(pd.phase)) * 0.06;
  }
}

function updateRegent(dt) {
  if (!state.regent.visible) return;
  const p = state.player;
  // the Regent flees east along the Strand
  state.regent.position.x += 9 * dt;
  if (state.regent.position.x > 200) state.regent.position.x = 60;
  state.regent.rotation.y = 0;
  const d = Math.hypot(p.x - state.regent.position.x, p.z - state.regent.position.z);
  if (d < 5 && p.inCar && Math.abs(p.speed) > 4) {
    state.regentHp = Math.max(0, (state.regentHp ?? 100) - 34 * dt);
    state.condition = Math.max(0, state.condition - 2 * dt);
    state.car.speed *= (1 - 0.5 * dt);
  }
}

// ---------- camera ----------
function updateCamera(dt) {
  const p = state.player;
  const fx = Math.cos(p.heading), fz = Math.sin(p.heading);
  let tx, ty, tz, lx, ly, lz;
  if (state.cameraMode === 'foot' || !p.inCar) {
    tx = p.x - fx * 7; ty = 3.4; tz = p.z - fz * 7;
    lx = p.x + fx * 8; ly = 1.6; lz = p.z + fz * 8;
  } else {
    const back = 11, up = 4.6;
    tx = p.x - fx * back; ty = up; tz = p.z - fz * back;
    lx = p.x + fx * 14; ly = 1.4; lz = p.z + fz * 14;
  }
  const k = 1 - Math.pow(0.0001, dt);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (ty - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(lx, ly, lz);
}

// ---------- shot placement hooks ----------
const hooks = {
  placePlayer(pp, cc) {
    state.player.x = pp.x; state.player.z = pp.z; state.player.heading = pp.heading;
    state.player.inCar = pp.inCar; state.player.speed = pp.speed ?? 0;
    state.car.x = cc.x; state.car.z = cc.z; state.car.heading = cc.heading; state.car.speed = pp.speed ?? 0;
    state.onFootMesh.visible = !pp.inCar;
    state.onFootMesh.position.set(pp.x, 0, pp.z);
    state.onFootMesh.rotation.y = -pp.heading;
    state.cameraMode = 'chase';
  },
  placePolice(list) {
    list.forEach(([x, z, d], i) => {
      const u = state.police[i];
      if (!u) return;
      u.x = x; u.z = z; u.speed = 0;
      u.heading = Math.atan2(state.player.z - z, state.player.x - x);
      u.mesh.position.set(x, 0, z);
      u.mesh.rotation.y = -u.heading;
    });
    state.police.forEach((u, i) => { u.mesh.visible = i < list.length; });
  },
  placeTraffic(list) {
    list.forEach(([x, z, h], i) => {
      const t = state.traffic[i];
      if (!t) return;
      t.mesh.position.set(x, 0, z);
      t.mesh.rotation.y = -h;
      t.mesh.visible = true;
    });
    state.traffic.forEach((t, i) => { t.mesh.visible = i < list.length; });
  },
  placePeds(list) {
    list.forEach(([x, z], i) => {
      const pd = state.peds[i];
      if (!pd) return;
      pd.x = x; pd.z = z; pd.mesh.position.set(x, 0, z);
      pd.mesh.visible = true;
    });
    state.peds.forEach((pd, i) => { pd.mesh.visible = i < list.length; });
  },
  placeRegent(r) {
    if (!r) { state.regent.visible = false; state.regentHp = null; return; }
    state.regent.visible = true;
    state.regent.position.set(r.x, 0, r.z);
    state.regent.rotation.y = 0;
    state.regentHp = r.hp;
  },
  placeHeli(h) {
    if (!h) { state.heli.visible = false; return; }
    state.heli.visible = true;
    state.heli.position.set(state.player.x + h.dx, h.h, state.player.z + h.dz);
  },
  placeRoadblock(rb) {
    if (!rb) { state.roadblock.visible = false; return; }
    state.roadblock.visible = true;
    state.roadblock.position.set(rb.x, 0, rb.z);
  },
  placeEnemies(list) {
    state.enemies.forEach((e) => { e.mesh.visible = false; e.tag.visible = false; });
    list.forEach((def, i) => {
      const e = state.enemies[i];
      if (!e) return;
      e.name = def.name; e.x = def.x; e.z = def.z; e.hp = 100; e.alive = true;
      e.mesh.position.set(def.x, 0, def.z);
      e.mesh.rotation.y = Math.PI / 2;
      e.mesh.visible = true; e.tag.visible = true;
      e.tag.userData.redraw(100);
    });
  },
  setCamera(mode) { state.cameraMode = mode; },
};

// ---------- debug / playtest hook ----------
window.__solara = {
  state,
  startMission: (i) => startMission(state.mission, i, state),
  toggleCar,
  snapshot() {
    const ms = state.mission;
    const st = MISSIONS[ms.index].stages[ms.stage];
    return {
      mode: state.mode, mission: ms.index, stage: ms.stage, missionDone: ms.done,
      player: { x: +state.player.x.toFixed(1), z: +state.player.z.toFixed(1), heading: +state.player.heading.toFixed(2), speed: +state.player.speed.toFixed(1), inCar: state.player.inCar },
      car: { x: +state.car.x.toFixed(1), z: +state.car.z.toFixed(1) },
      speedSigned: +state.car.speed.toFixed(2),
      gameTime: +state.gameTime.toFixed(2),
      objective: { x: st.kind === 'ram' ? +state.regent.position.x.toFixed(1) : st.at[0], z: st.kind === 'ram' ? +state.regent.position.z.toFixed(1) : st.at[1], radius: st.radius ?? 9 },
      wanted: state.wanted, cash: state.cash,
      enemiesAlive: state.enemies.filter((e) => e.alive && e.mesh.visible).length,
      stageCount: st.count ?? 0, stageProgress: +ms.stageProgress.toFixed(2),
      regentHp: state.regentHp, pedsOnRoad: state.peds.filter((pd) => pd.mesh.visible).filter((pd) => {
        const onRoadX = WORLD.roads.some((c) => Math.abs(pd.z - c) < 6);
        const onRoadZ = WORLD.roads.some((c) => Math.abs(pd.x - c) < 6);
        return onRoadX || onRoadZ;
      }).length,
      police: state.police.filter((u) => u.mesh.visible).length,
      roadblock: state.roadblock.visible,
      errors: state.errors.slice(),
    };
  },
};

// ---------- boot ----------
buildStaticHud(state);
startMission(state.mission, 0, state);
resetPlayerToStart();
state.player.heading = 0; state.car.heading = 0;

// apply time-of-day + shot staging
if (SHOT) {
  const s = SHOT;
  // rebuild the world lighting for the shot's time of day
  if (s !== 'sunset') {
    while (scene.children.length) scene.remove(scene.children[0]);
    state.world = buildWorld(scene, ({ cover: 'sunset', chase: 'dusk', foot: 'day', night: 'night' })[s] || 'sunset');
    scene.add(state.carMesh); scene.add(state.onFootMesh); scene.add(state.heli); scene.add(state.regent);
    state.traffic.forEach((t) => scene.add(t.mesh));
    state.police.forEach((u) => scene.add(u.mesh));
    state.peds.forEach((pd) => scene.add(pd.mesh));
    state.enemies.forEach((e) => scene.add(e.mesh));
    scene.add(state.roadblock);
    // market stalls were children of the old scene; rebuild them (Pasar Lane, z=40 road)
    const stallMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
    const awnMat = new THREE.MeshLambertMaterial({ color: 0xd94f3d });
    for (let i = 0; i < 5; i++) {
      const x = -76 + i * 6;
      const stall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 3), stallMat);
      stall.position.set(x, 1.2, 40); scene.add(stall);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 3.6), awnMat);
      awn.position.set(x, 2.7, 40); scene.add(awn);
    }
  }
  state.timeOfDay = ({ cover: 'sunset', chase: 'dusk', foot: 'day', night: 'night' })[s] || 'sunset';
  applyShot(state, s, hooks);
  // snap camera immediately for a stable first frame
  const p = state.player;
  const fx = Math.cos(p.heading), fz = Math.sin(p.heading);
  if (state.cameraMode === 'foot' || !p.inCar) {
    camera.position.set(p.x - fx * 7, 3.4, p.z - fz * 7);
    camera.lookAt(p.x + fx * 8, 1.6, p.z + fz * 8);
  } else {
    camera.position.set(p.x - fx * 11, 4.6, p.z - fz * 11);
    camera.lookAt(p.x + fx * 14, 1.4, p.z + fz * 14);
  }
  // beacon pulse + rotor still animate while frozen
  document.getElementById('help').style.display = 'none';
}

if (PLAYTEST) {
  state.autopilot = true;
  console.log('[solara] playtest mode: autopilot ON, mission 0');
}

// ---------- main loop ----------
const clock = new THREE.Clock();
let hudTimer = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!state.frozen) state.gameTime += dt;

  if (!state.frozen && state.mode === 'playing') {
    let throttle = 0, steer = 0;
    if (state.autopilot) {
      const a = autopilot(state, dt);
      throttle = a.throttle; steer = a.steer;
      if (a.wantExit && state.player.inCar) toggleCar();
      if (a.wantEnter && !state.player.inCar) toggleCar();
    } else {
      throttle = (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0);
      steer = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);
    }
    if (state.player.inCar) driveCar(dt, throttle, steer);
    else walkPlayer(dt, throttle, steer);
    updateTraffic(dt);
    updatePolice(dt);
    updatePeds(dt);
    updateRegent(dt);
    updateHeli(dt);
    updateMission(state, dt);
    // wanted eases back when the player stays clean
    if (state.wanted > 1 && state.gameTime % 30 < dt) state.wanted -= 1;
    // roadblock shows at wanted 4+ during live play
    if (state.wanted >= 4 && !state.roadblock.visible && state.mode === 'playing') {
      const p = state.player;
      const fx = Math.cos(p.heading), fz = Math.sin(p.heading);
      state.roadblock.position.set(p.x + fx * 55, 0, p.z + fz * 55);
      state.roadblock.visible = true;
      if (state.dialogue !== MISSIONS[state.mission.index].intro) state.dialogue = { name: 'CAPT. VANCE', role: 'SBP Dispatch', text: 'Roadblock on the Strand. All units, hold the line.' };
    }
  }

  // always-on animation: rotor, beacon pulse, light flash, heli bob
  if (state.heli.visible) {
    state.heli.userData.rotor.rotation.y += dt * 22;
    state.heli.userData.tailRotor.rotation.x += dt * 30;
  }
  if (state.world.beacon.visible) {
    const s = 1 + Math.sin(state.gameTime * 3) * 0.08;
    state.world.beacon.scale.set(s, 1, s);
  }
  if (state.roadblock.visible && state.roadblock.userData.flash) {
    const on = Math.sin(state.gameTime * 7) > 0;
    state.roadblock.userData.flash.red.material.color.setHex(on ? 0xff2222 : 0x550000);
    state.roadblock.userData.flash.blue.material.color.setHex(on ? 0x112266 : 0x2266ff);
  }

  // sync meshes to state
  state.carMesh.position.set(state.car.x, 0, state.car.z);
  state.carMesh.rotation.y = -state.car.heading;
  // wheel spin
  const spin = state.car.speed * dt * 2.4;
  state.carMesh.userData.wheels.forEach((w) => { w.rotation.y += spin; });
  if (!state.player.inCar) {
    state.onFootMesh.position.set(state.player.x, 0, state.player.z);
    state.onFootMesh.rotation.y = -state.player.heading;
    state.onFootMesh.position.y = Math.abs(Math.sin(state.gameTime * 9)) * (state.player.speed > 0.5 ? 0.08 : 0);
  }
  updateCamera(dt);

  hudTimer += dt;
  if (hudTimer > 0.12) { updateHud(state); hudTimer = 0; }
  renderer.render(scene, camera);
}
loop();
