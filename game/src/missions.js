// Solara Bay — mission state machine + autopilot (drives mission 1 end to end).
import { MISSIONS, DIALOGUE } from './config.js';

export function createMissionState() {
  return {
    index: 0,
    stage: 0,
    done: false,
    stageProgress: 0, // 0..1 within the current stage
    cleared: 0, // enemies cleared in a clear stage
    regentHp: null,
    payout: 0,
    stars: 0,
    startedAt: 0,
    finishedAt: 0,
  };
}

export function currentStage(ms) {
  return MISSIONS[ms.index].stages[ms.stage];
}

export function startMission(ms, index, state) {
  ms.index = index;
  ms.stage = 0;
  ms.done = false;
  ms.stageProgress = 0;
  ms.cleared = 0;
  ms.regentHp = null;
  ms.payout = 0;
  ms.stars = 0;
  ms.startedAt = state.gameTime;
  state.dialogue = MISSIONS[index].intro;
  state.wanted = index === 0 ? 1 : Math.min(5, 2 + Math.floor(index / 2));
  state.enemies.forEach((e) => { e.alive = true; e.hp = 100; e.mesh.visible = false; e.tag.visible = false; });
  state.regentHp = null;
  if (state.regent) state.regent.visible = false;
  const st = currentStage(ms);
  if (st.kind === 'ram') {
    state.regent.visible = true;
    state.regentHp = 100;
    state.regent.position.set(st.at[0] + 30, 0, st.at[1]);
  }
  if (st.kind === 'clear') {
    placeEnemiesAt(state, st.at[0], st.at[1], st.count);
  }
  moveBeacon(state);
}

// Place the first `count` enemies in a row at the clear-stage site.
function placeEnemiesAt(state, x, z, count) {
  state.enemies.forEach((e, i) => {
    const on = i < count;
    e.mesh.visible = on; e.tag.visible = on;
    if (on) {
      e.alive = true; e.hp = 100;
      e.x = x - (count - 1) * 3 + i * 6;
      e.z = z;
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.PI;
      e.tag.userData.redraw(100);
    }
  });
}

export function moveBeacon(state) {
  if (!state.world || !state.world.beacon) return;
  const st = currentStage(state.mission);
  const b = state.world.beacon;
  if (st.kind === 'ram') {
    b.position.set(state.regent.position.x, 0, state.regent.position.z);
    b.visible = true;
  } else if (st.kind === 'clear') {
    b.position.set(st.at[0], 0, st.at[1]);
    b.visible = true;
  } else {
    b.position.set(st.at[0], 0, st.at[1]);
    b.visible = true;
  }
}

function dist(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }

export function updateMission(state, dt) {
  const ms = state.mission;
  if (ms.done) return;
  const st = currentStage(ms);
  const p = state.player;
  const target = st.kind === 'ram'
    ? { x: state.regent.position.x, z: state.regent.position.z }
    : { x: st.at[0], z: st.at[1] };
  const d = dist(p.x, p.z, target.x, target.z);

  if (st.kind === 'drive' || st.kind === 'foot') {
    const needCar = st.kind === 'drive';
    const inRightMode = needCar ? p.inCar : !p.inCar;
    ms.stageProgress = Math.max(0, Math.min(1, 1 - d / 160));
    if (d <= st.radius && inRightMode) advanceStage(state);
    else if (d <= st.radius && !inRightMode) ms.stageProgress = 0.92; // at the spot, wrong mode
  } else if (st.kind === 'clear') {
    ms.stageProgress = ms.cleared / st.count;
    if (ms.cleared >= st.count) advanceStage(state);
  } else if (st.kind === 'ram') {
    ms.stageProgress = 1 - (state.regentHp ?? 100) / 100;
    if ((state.regentHp ?? 100) <= 0) advanceStage(state);
  }
  // keep the beacon on a moving ram target
  if (st.kind === 'ram' && state.world) {
    state.world.beacon.position.set(state.regent.position.x, 0, state.regent.position.z);
  }
}

function advanceStage(state) {
  const ms = state.mission;
  const m = MISSIONS[ms.index];
  const bonus = 150 + ms.stage * 200;
  state.cash += bonus;
  state.xp = Math.min(5000, state.xp + 250);
  state.dialogue = DIALOGUE.stageDone;
  if (ms.stage + 1 >= m.stages.length) {
    ms.done = true;
    ms.payout = m.payout;
    ms.stars = state.wanted >= 4 ? 3 : state.wanted >= 2 ? 2 : 1;
    ms.finishedAt = state.gameTime;
    state.cash += m.payout;
    state.dialogue = DIALOGUE.complete;
    state.mode = 'complete';
    state.world.beacon.visible = false;
    console.log('[solara] MISSION COMPLETE', JSON.stringify({
      mission: m.title, payout: m.payout, stars: ms.stars,
      timeSec: +(ms.finishedAt - ms.startedAt).toFixed(1), cash: state.cash, wanted: state.wanted,
    }));
  } else {
    ms.stage += 1;
    ms.stageProgress = 0;
    ms.cleared = 0;
    const st = currentStage(ms);
    if (st.kind === 'ram') {
      state.regent.visible = true;
      state.regentHp = 100;
      state.regent.position.set(st.at[0] + 30, 0, st.at[1]);
    }
    if (st.kind === 'clear') {
      placeEnemiesAt(state, st.at[0], st.at[1], st.count);
    }
    moveBeacon(state);
    console.log('[solara] STAGE', ms.stage, 'reached', JSON.stringify({ mission: m.title, stage: ms.stage, text: st.text }));
  }
}

// --- autopilot: steers the car / walks the player to the current objective ---
// Used only by the headless playtest (?playtest=1). Never in screenshots.
export function autopilot(state, dt) {
  const ms = state.mission;
  if (ms.done) return { throttle: 0, steer: 0, wantExit: false, wantEnter: false };
  const st = currentStage(ms);
  const p = state.player;
  const target = st.kind === 'ram'
    ? { x: state.regent.position.x, z: state.regent.position.z }
    : { x: st.at[0], z: st.at[1] };
  const d = dist(p.x, p.z, target.x, target.z);

  if (st.kind === 'foot' && p.inCar) return { throttle: 0, steer: 0, wantExit: d < 16, wantEnter: false };
  if (st.kind !== 'foot' && !p.inCar) {
    // walk back to the car, then enter it
    const cd = dist(p.x, p.z, state.car.x, state.car.z);
    if (cd < 3.5) return { throttle: 0, steer: 0, wantExit: false, wantEnter: true };
    return steerToward(state, state.car.x, state.car.z, true);
  }
  if (st.kind === 'clear') {
    // walk to the nearest living enemy and "defeat" it by touching it
    const live = state.enemies.filter((e) => e.alive && e.mesh.visible);
    if (!live.length) return { throttle: 0, steer: 0, wantExit: false, wantEnter: false };
    live.sort((a, b) => dist(p.x, p.z, a.x, a.z) - dist(p.x, p.z, b.x, b.z));
    const e = live[0];
    if (dist(p.x, p.z, e.x, e.z) < 2.2) {
      e.hp = 0; e.alive = false; e.mesh.visible = false; e.tag.visible = false;
      ms.cleared += 1;
      console.log('[solara] enemy down', e.name, 'cleared', ms.cleared + '/' + st.count);
    }
    return steerToward(state, e.x, e.z, true);
  }
  // In the car, follow the road grid; on foot, walk straight at the target
  // (the kiosk / stall is metres off the road on open ground — road routing
  // would drag a walker east along the avenue forever).
  if (p.inCar) return driveWaypoints(state, target.x, target.z);
  return steerToward(state, target.x, target.z, true);
}

// Driving uses the road grid: nearest horizontal road, then the vertical road
// nearest the target, then the horizontal road nearest the target, then the
// target itself. Straight-line driving cuts through building blocks.
function driveWaypoints(state, tx, tz) {
  const p = state.player;
  const roads = [-120, -40, 40, 120];
  const nearest = (v) => roads.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  const zr = nearest(p.z);
  const xr = nearest(tx);
  const ztr = nearest(tz);
  const wps = [[p.x, zr], [xr, zr], [xr, ztr], [tx, tz]];
  let wp = wps[wps.length - 1];
  for (const w of wps) {
    if (Math.hypot(w[0] - p.x, w[1] - p.z) > 5) { wp = w; break; }
  }
  return steerToward(state, wp[0], wp[1], false);
}

function steerToward(state, tx, tz, onFoot) {
  const p = state.player;
  const dx = tx - p.x, dz = tz - p.z;
  const want = Math.atan2(dz, dx);
  let diff = want - p.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const d = Math.hypot(dx, dz);
  const throttle = d < 4 ? 0.35 : (Math.abs(diff) > 1.2 ? 0.25 : 1);
  return { throttle, steer: Math.max(-1, Math.min(1, diff * 1.6)), wantExit: false, wantEnter: false };
}
