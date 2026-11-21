// Solara Bay — pedestrians, enemies with name tags + health bars, on-foot player.
// Faceless low-poly figures only: no drawn faces, no round head on a square body
// in any hero framing.
import * as THREE from '../vendor/three.module.js';

const SHIRT = [0xd94f3d, 0x3d7dd9, 0x4caf50, 0xe8a33d, 0x8e44ad, 0x16a085, 0xf2f2f2, 0x37474f];

export function makeFigure(shirt, pants = 0x23262b, skin = 0xc98d64) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  // legs
  for (const z of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), mat(pants));
    leg.position.set(0, 0.36, z); g.add(leg);
  }
  // torso (slightly tapered by a second smaller box on top)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.5), mat(shirt));
  torso.position.y = 1.11; g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.54), mat(shirt));
  shoulders.position.y = 1.5; g.add(shoulders);
  // arms
  for (const z of [-0.36, 0.36]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.18), mat(shirt));
    arm.position.set(0, 1.12, z); g.add(arm);
  }
  // head: small dark cap/hair block, no face
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), mat(skin));
  head.position.y = 1.78; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), mat(0x1c1c1c));
  hair.position.y = 1.98; g.add(hair);
  return g;
}

// Name tag + health bar as one billboard sprite above a figure's head.
export function makeNameTag(name, hp = 100, color = '#ff5b5b') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const draw = (hpNow) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 72);
    g.fillStyle = 'rgba(8,10,16,0.85)'; g.fillRect(8, 4, 240, 30);
    g.fillStyle = '#ffffff'; g.font = 'bold 22px Arial'; g.textAlign = 'center';
    g.fillText(name, 128, 28);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(28, 42, 200, 12);
    g.fillStyle = color; g.fillRect(28, 42, 200 * Math.max(0, hpNow) / 100, 12);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.strokeRect(28, 42, 200, 12);
  };
  draw(hp);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.scale.set(3.4, 0.96, 1);
  spr.position.y = 2.75;
  spr.userData.redraw = (hpNow) => { draw(hpNow); tex.needsUpdate = true; };
  return spr;
}

export function makePed(scene, x, z, axis, lane) {
  const fig = makeFigure(SHIRT[Math.floor(Math.random() * SHIRT.length)]);
  fig.position.set(x, 0, z);
  fig.scale.setScalar(0.95 + Math.random() * 0.15);
  scene.add(fig);
  return {
    mesh: fig, axis, lane, dir: Math.random() < 0.5 ? 1 : -1,
    speed: 1.1 + Math.random() * 0.9, x, z, phase: Math.random() * 6,
  };
}

export function makeEnemy(scene, name, x, z, heading) {
  const fig = makeFigure(0xb03a2e, 0x1c1c1c);
  fig.position.set(x, 0, z);
  fig.rotation.y = heading;
  scene.add(fig);
  const tag = makeNameTag(name, 100);
  fig.add(tag);
  return { mesh: fig, tag, name, x, z, hp: 100, alive: true };
}
