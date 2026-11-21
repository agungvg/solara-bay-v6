// Solara Bay — deterministic screenshot presets. Fresh code, round 6.
// Each preset stages the world, freezes the simulation, and parks the camera
// so the shot is stable and repeatable. Never used during live play.
import { MISSIONS } from './config.js';
export const SHOTS = {
  cover: {
    time: 'sunset', clock: '16:00', mission: 2, stage: 1, wanted: 4, cash: 18450, xp: 3900, rankName: 'FIXER',
    player: { x: 30, z: 120, heading: 0, inCar: true, speed: 31 },
    car: { x: 30, z: 120, heading: 0 },
    police: [[18, 132, -11], [52, 112, 24], [12, 108, 32], [68, 129, 33], [44, 138, 35], [8, 122, 37]],
    traffic: [[58, 116.5, 0], [76, 123.5, 0], [96, 117, 0], [46, 123.5, 0], [112, 123, 0], [-6, 117, 0]],
    peds: [[20, 111.5], [34, 128.5], [52, 111.5], [70, 128.5], [88, 111.5], [104, 128.5]],
    regent: { x: 96, z: 120, hp: 62 },
    heli: { dx: 26, dz: -8, h: 14 },
    roadblock: null,
    camera: 'chase',
    dialogue: { name: 'MIRA KESANG', role: 'Crew · Driver', text: "He's making for Kumala Pier! Ram the Regent before it reaches the water!" },
  },
  chase: {
    time: 'dusk', clock: '18:40', mission: 3, stage: 1, wanted: 5, cash: 19320, xp: 5100, rankName: 'SHOT CALLER',
    player: { x: 55, z: 120, heading: 0, inCar: true, speed: 23.3 },
    car: { x: 55, z: 120, heading: 0 },
    police: [[42, 131, -11], [76, 111, 21], [36, 109, 27], [88, 128, 32], [64, 138, 34], [28, 120, 35], [96, 112, 37]],
    traffic: [[74, 116.5, 0], [86, 123.5, 0], [108, 117, 0], [40, 123.5, 0]],
    peds: [[30, 111.5], [48, 128.5], [66, 111.5], [84, 128.5]],
    regent: null,
    heli: { dx: 22, dz: -10, h: 18 },
    roadblock: { x: 88, z: 120 },
    camera: 'chase',
    dialogue: { name: 'CAPT. VANCE', role: 'SBP Dispatch', text: 'All units, suspect is southbound on the Strand. Osprey One has the light.' },
  },
  foot: {
    time: 'day', clock: '15:20', mission: 1, stage: 0, wanted: 2, cash: 7270, xp: 1675, rankName: 'WHEELMAN',
    player: { x: -58, z: 56, heading: -Math.PI / 2, inCar: false, speed: 0 },
    car: { x: -44, z: 44, heading: 0 },
    police: [[-60, 108, -9], [-40, 60, 25], [-110, 40, 34], [-20, 120, 45]],
    traffic: [[-40, 116.5, 0], [40, 123.5, 0]],
    peds: [[-84, 48.5], [-36, 31.5], [-100, 48.5]],
    enemies: [
      { name: 'KERON-1', x: -66, z: 44 }, { name: 'KERON-2', x: -62, z: 44 },
      { name: 'KERON-3', x: -58, z: 44 }, { name: 'KERON-4', x: -54, z: 44 },
      { name: 'KERON-5', x: -50, z: 44 },
    ],
    heli: null,
    roadblock: null,
    camera: 'foot',
    dialogue: { name: 'MIRA KESANG', role: 'Crew · Driver', text: 'Two down the left aisle! I have got the stall side, Tomo.' },
  },
  night: {
    time: 'night', clock: '23:10', mission: 4, stage: 0, wanted: 3, cash: 24100, xp: 4400, rankName: 'FIXER',
    player: { x: -40, z: -60, heading: -Math.PI / 2, inCar: true, speed: 25 },
    car: { x: -40, z: -60, heading: -Math.PI / 2 },
    police: [[-52, -44, -11], [-28, -78, 24], [-56, -84, 32], [-20, -40, 35]],
    traffic: [[-44, -36, 0], [-36, -92, 0], [-44, -104, 0]],
    peds: [[-48, -52], [-32, -70], [-48, -88]],
    regent: null,
    heli: { dx: 2, dz: -30, h: 16 },
    roadblock: null,
    camera: 'chase',
    dialogue: { name: 'KIKI', role: 'Crew · Lookout', text: 'Ledger changes hands at midnight under the neon. Eyes out, Tomo.' },
  },
};

// Apply a preset to the live state. `apply` is defined in main.js and passed in
// as a set of hooks so this file stays pure data + placement logic.
export function applyShot(state, name, hooks) {
  const s = SHOTS[name];
  if (!s) return false;
  state.shotMode = name;
  state.frozen = true;
  state.timeOfDay = s.time;
  state.clock = s.clock;
  state.cash = s.cash;
  state.xp = s.xp;
  state.rankName = s.rankName;
  state.wanted = s.wanted;
  state.dialogue = s.dialogue;
  state.mission.index = s.mission;
  state.mission.stage = s.stage;
  state.mission.done = false;
  state.mission.stageProgress = name === 'cover' ? 0.62 : name === 'chase' ? 0.5 : name === 'foot' ? 0.0 : 0.3;
  state.mission.cleared = 0;
  hooks.placePlayer(s.player, s.car);
  hooks.placePolice(s.police);
  hooks.placeTraffic(s.traffic);
  hooks.placePeds(s.peds);
  hooks.placeRegent(s.regent);
  hooks.placeHeli(s.heli);
  hooks.placeRoadblock(s.roadblock);
  hooks.placeEnemies(s.enemies || []);
  hooks.setCamera(s.camera);
  // stage-specific beacon
  const st = MISSIONS[state.mission.index].stages[state.mission.stage];
  if (st && state.world) {
    state.world.beacon.visible = true;
    if (st.kind === 'ram' && s.regent) state.world.beacon.position.set(s.regent.x, 0, s.regent.z);
    else state.world.beacon.position.set(st.at[0], 0, st.at[1]);
  }
  return true;
}
