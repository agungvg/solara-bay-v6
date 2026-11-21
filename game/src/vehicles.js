// Solara Bay — modeled low-poly vehicles + helicopter. Fresh code, round 6.
import * as THREE from '../vendor/three.module.js';

function box(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    opts.basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

function wheel(x, z, r = 0.42) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 12),
    new THREE.MeshLambertMaterial({ color: 0x141414 }));
  w.rotation.x = Math.PI / 2;
  w.position.set(x, r, z);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.36, 8),
    new THREE.MeshLambertMaterial({ color: 0xb8bcc2 }));
  hub.rotation.x = Math.PI / 2;
  hub.position.set(x, r, z);
  const g = new THREE.Group();
  g.add(w); g.add(hub);
  return g;
}

// A proper car: body + cabin + glass + wheels + lights + bumpers + spoiler.
// Length along X, width along Z. Faces +X.
export function makeCar(color, opts = {}) {
  const g = new THREE.Group();
  const body = box(4.4, 0.72, 2.0, color, 0, 0.62, 0);
  g.add(body);
  // hood + trunk deck shaping
  g.add(box(1.1, 0.22, 1.86, color, 1.65, 0.98, 0));
  g.add(box(0.9, 0.2, 1.86, color, -1.7, 0.96, 0));
  // cabin with dark glass band
  g.add(box(2.3, 0.5, 1.78, opts.glass ?? 0x1a2028, -0.25, 1.22, 0));
  g.add(box(2.34, 0.1, 1.8, color, -0.25, 1.5, 0)); // roof
  // glass pillars are implied by the dark cabin; add windshield tint strip
  g.add(box(0.1, 0.42, 1.7, 0x2e4a5e, 0.92, 1.2, 0));
  // bumpers
  g.add(box(0.3, 0.3, 2.02, 0x222222, 2.2, 0.4, 0));
  g.add(box(0.3, 0.3, 2.02, 0x222222, -2.2, 0.4, 0));
  // headlights (front = +X) + taillights
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
  for (const z of [-0.68, 0.68]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.42), hl);
    h.position.set(2.36, 0.72, z); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.5), tl);
    t.position.set(-2.36, 0.74, z); g.add(t);
  }
  // wheels, tucked under arches
  for (const [x, z] of [[1.45, -0.95], [1.45, 0.95], [-1.45, -0.95], [-1.45, 0.95]]) g.add(wheel(x, z));
  if (opts.spoiler) {
    g.add(box(0.16, 0.5, 1.9, 0x1c1c1c, -2.05, 1.25, 0));
    g.add(box(0.7, 0.08, 1.9, 0x1c1c1c, -2.05, 1.52, 0));
  }
  if (opts.police) {
    // black-and-white SBP livery: white doors band + roof light bar
    g.add(box(2.2, 0.5, 2.02, 0xe8e8e8, -0.2, 0.62, 0));
    g.add(box(2.2, 0.12, 2.04, 0x111111, -0.2, 0.9, 0));
    const bar = box(0.5, 0.22, 1.5, 0x222222, -0.25, 1.72, 0);
    g.add(bar);
    const r = box(0.56, 0.26, 0.62, 0xff2222, -0.25, 1.74, -0.4, { basic: true });
    const b = box(0.56, 0.26, 0.62, 0x2266ff, -0.25, 1.74, 0.4, { basic: true });
    g.add(r); g.add(b);
    g.userData.flash = { red: r, blue: b };
  }
  if (opts.taxi) g.add(box(0.9, 0.18, 1.2, 0xf5b942, -0.25, 1.68, 0, { basic: true }));
  g.userData.wheels = [];
  g.traverse((o) => { if (o.geometry && o.geometry.type === 'CylinderGeometry') g.userData.wheels.push(o); });
  return g;
}

export function makeRegent() {
  // gold luxury target car: longer body, chrome grille, big wheels
  const g = makeCar(0xd4a017, { glass: 0x14181f });
  g.scale.set(1.18, 1, 1.05);
  const grille = box(0.1, 0.3, 1.2, 0xc8c8c8, 2.32, 0.62, 0);
  g.add(grille);
  return g;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  const body = box(3.4, 1.5, 1.9, 0x4a5258, 0, 0, 0);
  g.add(body);
  g.add(box(1.3, 1.0, 1.7, 0x5a7a8e, 1.9, -0.1, 0)); // glass nose
  // red anti-collision beacon + white nav light (readable against a night sky)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222, fog: false }));
  beacon.position.set(0, -0.95, 0); g.add(beacon);
  const nav = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  nav.position.set(-5.0, 0.4, 0); g.add(nav);
  g.userData.beacon = beacon;
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 3.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x2e3438 }));
  boom.rotation.z = Math.PI / 2; boom.position.set(-3.2, 0.25, 0); g.add(boom);
  g.add(box(0.2, 1.3, 0.9, 0x2e3438, -4.9, 0.7, 0)); // tail fin
  // skids
  for (const z of [-0.85, 0.85]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x555555 }));
    skid.rotation.z = Math.PI / 2; skid.position.set(0.2, -1.05, z); g.add(skid);
  }
  // main rotor (spins) + tail rotor
  const rotor = new THREE.Group();
  rotor.add(box(5.6, 0.08, 0.34, 0x1a1a1a, 0, 0, 0));
  rotor.add(box(0.34, 0.08, 5.6, 0x1a1a1a, 0, 0, 0));
  rotor.position.y = 1.05; g.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.add(box(0.08, 1.5, 0.2, 0x1a1a1a, 0, 0, 0));
  tailRotor.add(box(0.08, 0.2, 1.5, 0x1a1a1a, 0, 0, 0));
  tailRotor.position.set(-4.9, 0.4, 0.35); g.add(tailRotor);
  // searchlight cone (visible at night)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 16, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI; cone.position.set(1.2, -9, 0); g.add(cone);
  g.userData.rotor = rotor; g.userData.tailRotor = tailRotor; g.userData.cone = cone;
  return g;
}
