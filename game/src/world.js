// Solara Bay — world building: streets, blocks, beach, props. Fresh code, round 6.
import * as THREE from '../vendor/three.module.js';
import { WORLD } from './config.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export const TIMES = {
  day:    { sky: 0x87b5d6, fog: 0x9fc3d8, sun: 0xfff2d0, sunI: 1.15, amb: 0xaab4c0, ambI: 0.9, hemi: 0.6, lamps: false, disc: null, discPos: null, fogNear: 170, fogFar: 540 },
  sunset: { sky: 0xe8965a, fog: 0xe08a4e, sun: 0xffb36b, sunI: 1.35, amb: 0xb09a80, ambI: 0.9, hemi: 0.65, lamps: false, disc: 0xffd9a0, discPos: [250, 48, 96], fogNear: 150, fogFar: 540 },
  dusk:   { sky: 0x7a5aa8, fog: 0x8a63a8, sun: 0xc9a0ff, sunI: 0.7, amb: 0x8a7a9e, ambI: 0.8, hemi: 0.5, lamps: true, disc: 0xf5ead0, discPos: [250, 64, 40], fogNear: 150, fogFar: 500 },
  night:  { sky: 0x0b1026, fog: 0x111736, sun: 0x8fa8ff, sunI: 0.28, amb: 0x4a5578, ambI: 0.7, hemi: 0.4, lamps: true, disc: 0xe8ecff, discPos: [-120, 90, -280], fogNear: 140, fogFar: 480 },
};

export function buildWorld(scene, timeOfDay) {
  const T = TIMES[timeOfDay] || TIMES.sunset;
  scene.background = new THREE.Color(T.sky);
  scene.fog = new THREE.Fog(T.fog, T.fogNear, T.fogFar);

  const sun = new THREE.DirectionalLight(T.sun, T.sunI);
  sun.position.set(timeOfDay === 'sunset' ? 180 : -120, timeOfDay === 'night' ? 60 : 140, 60);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(T.amb, T.ambI));
  scene.add(new THREE.HemisphereLight(T.sky, 0x40342a, T.hemi));

  const colliders = []; // {x0,z0,x1,z1} building footprints
  const add = (m) => { scene.add(m); return m; };

  // --- ground base (dry city ground) ---
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x6f6455 })
  );
  base.rotation.x = -Math.PI / 2; base.position.y = -0.05; add(base);

  // --- road texture: asphalt + dashed centre + edge lines ---
  const roadTex = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#2f2c2b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3635'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    g.fillStyle = '#e8e4da'; g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h);
    g.fillStyle = '#e8b93c';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 2, y + 8, 4, 34);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;

  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9a8a76 });
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x7d7264 });
  const roadLen = 360;
  for (const c of WORLD.roads) {
    for (const horiz of [true, false]) {
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, roadLen / 22);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, 12), new THREE.MeshLambertMaterial({ map: tex }));
      road.rotation.x = -Math.PI / 2;
      if (horiz) { road.position.set(0, 0.02, c); } else { road.position.set(c, 0.02, 0); road.rotation.z = Math.PI / 2; }
      add(road);
      // sidewalks both sides
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, 5), walkMat);
        w.rotation.x = -Math.PI / 2;
        if (horiz) w.position.set(0, 0.03, c + s * 8.5);
        else { w.position.set(c + s * 8.5, 0.03, 0); w.rotation.z = Math.PI / 2; }
        add(w);
        const curb = new THREE.Mesh(new THREE.BoxGeometry(horiz ? roadLen : 0.4, 0.35, horiz ? 0.4 : roadLen), curbMat);
        if (horiz) curb.position.set(0, 0.1, c + s * 6.2);
        else curb.position.set(c + s * 6.2, 0.1, 0);
        add(curb);
      }
    }
  }

  // --- beach + ocean + pier ---
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 360), new THREE.MeshLambertMaterial({ color: 0xd9b380 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(180, 0.04, 0); add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 380), new THREE.MeshLambertMaterial({ color: 0x2e6f8e }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(320, 0.0, 0); add(sea);
  // pier planks out to sea on the Strand axis
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(70, 0.6, 8), pierMat);
  pier.position.set(240, 0.5, 120); add(pier);
  for (let x = 212; x <= 268; x += 14) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.4, 6), pierMat);
    post.position.set(x, 0, 116.5); add(post);
    const post2 = post.clone(); post2.position.z = 123.5; add(post2);
  }

  // --- buildings: 3x3 blocks between roads ---
  const winTex = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#20242e';
    for (let y = 10; y < h - 10; y += 22)
      for (let x = 10; x < w - 10; x += 20) g.fillRect(x, y, 11, 14);
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const palette = [0xc98d5f, 0xb98a68, 0x9c8a7a, 0xd9a066, 0x7a8ba0, 0xa88a7a, 0xc2b49a, 0x8a6f5c];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blockC = [-80, 0, 80];
  for (const bx of blockC) for (const bz of blockC) {
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const bw = 14 + rnd() * 18, bd = 14 + rnd() * 18, bh = 9 + rnd() * 22;
      const ox = bx + (rnd() - 0.5) * (64 - bw), oz = bz + (rnd() - 0.5) * (64 - bd);
      const col = palette[Math.floor(rnd() * palette.length)];
      const tex = winTex.clone(); tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(bw / 12)), Math.max(1, Math.round(bh / 12)));
      const mat = new THREE.MeshLambertMaterial({ color: col, map: tex });
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      b.position.set(ox, bh / 2, oz); add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.3, 1.2, bd * 0.3), new THREE.MeshLambertMaterial({ color: 0x5a5148 }));
      roof.position.set(ox + bw * 0.2, bh + 0.6, oz); add(roof);
      colliders.push({ x0: ox - bw / 2 - 0.6, z0: oz - bd / 2 - 0.6, x1: ox + bw / 2 + 0.6, z1: oz + bd / 2 + 0.6 });
    }
  }

  // --- palms along the Strand + beach ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5c38 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.42 * s, 7 * s, 6), trunkMat);
    trunk.position.y = 3.5 * s; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 4.2 * s, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      f.position.set(Math.cos(a) * 1.6 * s, 7.2 * s, Math.sin(a) * 1.6 * s);
      f.rotation.z = Math.cos(a) * 1.1; f.rotation.x = -Math.sin(a) * 1.1;
      g.add(f);
    }
    g.position.set(x, 0, z);
    return g;
  }
  for (let x = -140; x <= 140; x += 28) { add(palm(x, 110.5, 1)); add(palm(x + 14, 129.5, 0.9)); }
  for (let z = -100; z <= 100; z += 40) add(palm(112, z, 0.95));
  add(palm(158, 60, 1.1)); add(palm(162, -20, 1)); add(palm(156, -90, 1.1));

  // --- billboard: SOLARA BAY, spanning the Strand at x=150 ---
  const bbTex = canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#a33327'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23c'; g.font = 'bold 58px Arial'; g.textAlign = 'center';
    g.fillText('SOLARA BAY', w / 2, 64);
    g.font = 'bold 28px Arial'; g.fillStyle = '#fff2cf';
    g.fillText('VISIT THE STRAND', w / 2, 106);
  });
  const bb = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 13, 48), new THREE.MeshBasicMaterial({ map: bbTex, fog: false }));
  panel.position.y = 13; bb.add(panel);
  for (const dz of [-19, 19]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8, 6), new THREE.MeshLambertMaterial({ color: 0x444444 }));
    post.position.set(0, 4, dz); bb.add(post);
  }
  bb.position.set(135, 0, 120);
  add(bb);

  // --- neon signs on the night row (visible at night, dim by day) ---
  const neonDefs = [
    { text: 'OMBO', color: '#ff5db1', x: -46, z: -98, ry: 0 },
    { text: 'TACOS', color: '#4ade80', x: -30, z: -104, ry: 0 },
    { text: 'PIER 9', color: '#5db8ff', x: 118, z: -52, ry: Math.PI / 2 },
  ];
  const neonMeshes = [];
  for (const n of neonDefs) {
    const t = canvasTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#11131a'; g.fillRect(0, 0, w, h);
      g.fillStyle = n.color; g.font = 'bold 40px Arial'; g.textAlign = 'center';
      g.fillText(n.text, w / 2, 46);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false }));
    m.position.set(n.x, 7, n.z); m.rotation.y = n.ry; add(m); neonMeshes.push(m);
  }

  // --- streetlights ---
  const lampMat = new THREE.MeshBasicMaterial({ color: T.lamps ? 0xffe9a8 : 0x8a8578 });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const lamps = [];
  for (const c of WORLD.roads) {
    for (let v = -140; v <= 140; v += 56) {
      for (const [x, z] of [[v, c + 6.4], [v + 28, c - 6.4]]) {
        if (Math.abs(x) > 165 || Math.abs(z) > 165) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6.4, 6), poleMat);
        pole.position.set(x, 3.2, z); add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), lampMat);
        lamp.position.set(x, 6.5, z); add(lamp); lamps.push(lamp);
      }
    }
  }

  // --- big sky disc (sun / moon) for dusk + night ---
  let disc = null;
  if (T.disc) {
    disc = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: T.disc, fog: false }));
    disc.position.set(T.discPos[0], T.discPos[1], T.discPos[2]);
    disc.lookAt(0, 20, 0);
    add(disc);
  }

  // --- objective beacon: light pillar + ground ring ---
  const beacon = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 30, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, fog: false })
  );
  pillar.position.y = 15; beacon.add(pillar);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 3.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; beacon.add(ring);
  beacon.visible = false;
  add(beacon);

  return { colliders, beacon, lamps, neonMeshes, time: T };
}

// Roadblock: barriers + cones + SBP CHECKPOINT sign + flashing light bar.
// Built once, positioned per shot / mission stage.
export function buildRoadblock(scene) {
  const g = new THREE.Group();
  const stripeTex = canvasTexture(128, 32, (gc, w, h) => {
    gc.fillStyle = '#e8e4da'; gc.fillRect(0, 0, w, h);
    gc.fillStyle = '#d23c2e';
    for (let x = -16; x < w; x += 32) {
      gc.beginPath(); gc.moveTo(x, h); gc.lineTo(x + 16, 0); gc.lineTo(x + 32, 0); gc.lineTo(x + 16, h); gc.fill();
    }
  });
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 4.6), new THREE.MeshLambertMaterial({ map: stripeTex }));
    bar.position.set(i * 0.2, 0.85, i * 3.4); g.add(bar);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    leg.position.set(i * 0.2, 0.25, i * 3.4 - 1.8); g.add(leg);
    const leg2 = leg.clone(); leg2.position.z = i * 3.4 + 1.8; g.add(leg2);
  }
  const coneMat = new THREE.MeshLambertMaterial({ color: 0xe86a1e });
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 8), coneMat);
    cone.position.set(-4 - i * 1.2, 0.55, -6 + (i % 2) * 12); g.add(cone);
  }
  const signTex = canvasTexture(512, 128, (gc, w, h) => {
    gc.fillStyle = '#f5b942'; gc.fillRect(0, 0, w, h);
    gc.fillStyle = '#111111'; gc.font = 'bold 44px Arial'; gc.textAlign = 'center';
    gc.fillText('SBP CHECKPOINT', w / 2, 58);
    gc.font = 'bold 26px Arial'; gc.fillText('ALL VEHICLES STOP', w / 2, 98);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 12), new THREE.MeshLambertMaterial({ map: signTex }));
  sign.position.set(0, 4.6, 0); g.add(sign);
  for (const dz of [-5, 5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    post.position.set(0, 1.7, dz); g.add(post);
  }
  // flashing light bar on a pole
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 2.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  barBase.position.set(-2.4, 5.4, 0); g.add(barBase);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 1.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  red.position.set(-2.4, 5.85, -0.65); g.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 1.1), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
  blue.position.set(-2.4, 5.85, 0.65); g.add(blue);
  g.userData.flash = { red, blue };
  g.visible = false;
  scene.add(g);
  return g;
}
