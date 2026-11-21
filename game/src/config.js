// Solara Bay — static game data. Written fresh for round 6.
export const WORLD = {
  roads: [-120, -40, 40, 120], // grid road centre lines, both axes
  roadHalf: 6,
  bound: 170,
  beachX: 150, // sand starts here (east)
  oceanX: 205, // water starts here
};

export const DISTRICTS = [
  { name: 'KUMALA STRAND', sub: 'Strand Boulevard · Beachfront strip', grip: 58, test: (x, z) => x >= 140 },
  { name: 'KUMALA STRAND', sub: 'Strand Boulevard · Beachfront strip', grip: 58, test: (x, z) => z >= 110 && x > -20 },
  { name: 'OLD PASARU', sub: 'Pasar Lane · Night market', grip: 74, test: (x, z) => x < -40 && z > 40 },
  { name: 'MARINA', sub: 'Yacht Basin · Pier 9', grip: 66, test: (x, z) => x > 80 && z < -40 },
  { name: 'HEIGHTS', sub: 'Ridge Road · Hilltop homes', grip: 41, test: (x, z) => z <= -80 },
  { name: 'HARBOR', sub: 'Container Row · Dockside', grip: 33, test: (x, z) => z >= 140 },
  { name: 'SOLARA CENTRAL', sub: 'Downtown · City core', grip: 52, test: () => true },
];

export const POLICE_UNITS = [
  { name: 'KITE-1', role: 'RAMMING' },
  { name: 'CORAL-48', role: 'PURSUIT' },
  { name: 'CORAL-85', role: 'FLANKING' },
  { name: 'MARLIN-3', role: 'RAMMING' },
  { name: 'HERON-2', role: 'PURSUIT' },
  { name: 'CORAL-43', role: 'FLANKING' },
  { name: 'TERN-5', role: 'RAMMING' },
];

export const WEAPONS = [
  { name: 'FISTS', icon: '\u270A', ammo: '\u221E' },
  { name: '.38 REVOLVER', icon: '\u26AC', ammo: 60 },
  { name: 'SMG', icon: '\u25AC', ammo: 90 },
  { name: '12G PUMP', icon: '\u25AC', ammo: 18 },
];

export const CREW = [
  { name: 'SWAP PLATES', who: 'Mira · Driver', key: 'Z', color: '#2b6cb0', face: '#2b6cb0' },
  { name: 'QUICK FIX', who: 'Lio · Mechanic', key: 'X', color: '#b7791f', face: '#b7791f' },
  { name: 'EYES OUT', who: 'Kiki · Lookout', key: 'C', color: '#6b46c1', face: '#6b46c1' },
];

export const VEHICLE = { name: 'RUKAN PELO GT', tune: 'TUNE 3 · SPORTS' };
export const RADIO = 'RADIO OMBO 98.4 — Tide Runner — Sol Mara';

// stage kinds: drive (reach a point in the car), foot (reach a point on foot),
// clear (defeat N named enemies), ram (damage the target car to 0 hp)
export const MISSIONS = [
  {
    chapter: 'CH.1 · LOW TIDE', title: 'FIRST SCORE', payout: 1200,
    intro: { name: 'MIRA KESANG', role: 'Crew · Driver', text: "Deal's on the Strand. Drive smooth, Tomo — the SBP is already sniffing around." },
    stages: [
      { kind: 'drive', text: 'Drive to the deal on Strand Blvd', next: 'Pick up the package', at: [100, 120], radius: 9 },
      { kind: 'foot', text: 'Pick up the package at the kiosk', next: 'Deliver to Old Pasaru', at: [104, 128], radius: 3.5 },
      { kind: 'drive', text: 'Deliver to the drop in Old Pasaru', next: 'Mission complete', at: [-40, 40], radius: 9 },
    ],
  },
  {
    chapter: 'CH.2 · UNDERTOW', title: 'MARKET SQUEEZE', payout: 2400,
    intro: { name: 'MIRA KESANG', role: 'Crew · Driver', text: 'Two down the left aisle! I have got the stall side, Tomo.' },
    stages: [
      { kind: 'clear', text: 'Clear the aisles of Keron crew 0/5', next: 'Get back to the car', at: [-64, 44], count: 5 },
      { kind: 'foot', text: 'Get back to the car', next: 'Reach the garage', at: [-40, 40], radius: 4 },
      { kind: 'drive', text: 'Lose the tail — reach the garage', next: 'Mission complete', at: [-120, -40], radius: 9 },
    ],
  },
  {
    chapter: 'CH.3 · HIGH WATER', title: 'WRECK THE REGENT', payout: 3200,
    intro: { name: 'MIRA KESANG', role: 'Crew · Driver', text: "He's making for Kumala Pier! Ram the Regent before it reaches the water!" },
    stages: [
      { kind: 'drive', text: 'Catch up to the gold Regent', next: 'Ram it until it breaks', at: [80, 120], radius: 14 },
      { kind: 'ram', text: 'Wreck the Regent — ram it until it breaks', next: 'Lose the heat', at: [80, 120], radius: 14 },
      { kind: 'drive', text: 'Lose the heat — reach the pier', next: 'Mission complete', at: [200, 120], radius: 9 },
    ],
  },
  {
    chapter: 'CH.4 · SPRING TIDE', title: 'BANCO SOLARA', payout: 5000,
    intro: { name: 'CAPT. VANCE', role: 'SBP Dispatch', text: 'All units, suspect is southbound on the Strand. Osprey One has the light.' },
    stages: [
      { kind: 'drive', text: 'Reach Banco Solara on Ridge Row', next: 'Grab the vault bag', at: [40, -40], radius: 9 },
      { kind: 'drive', text: 'Escape to the safehouse — roadblock ahead', next: 'Reach the safehouse', at: [120, 120], radius: 9 },
      { kind: 'drive', text: 'Reach the safehouse in Old Pasaru', next: 'Mission complete', at: [-120, 120], radius: 9 },
    ],
  },
  {
    chapter: 'CH.5 · NIGHT MARKET', title: 'NEON LEDGER', payout: 2800,
    intro: { name: 'KIKI', role: 'Crew · Lookout', text: 'Ledger changes hands at midnight under the neon. Eyes out, Tomo.' },
    stages: [
      { kind: 'drive', text: 'Drive to the neon row after dark', next: 'Grab the ledger', at: [0, -120], radius: 9 },
      { kind: 'foot', text: 'Grab the ledger from the stall', next: 'Deliver to the Marina', at: [4, -116], radius: 3.5 },
      { kind: 'drive', text: 'Deliver the ledger to the Marina', next: 'Mission complete', at: [120, -40], radius: 9 },
    ],
  },
  {
    chapter: 'CH.6 · KING TIDE', title: 'PIER PRESSURE', payout: 3600,
    intro: { name: 'LIO', role: 'Crew · Mechanic', text: 'Pier is hot. Take it fast and do not stop on the boards.' },
    stages: [
      { kind: 'drive', text: 'Drive to the end of Kumala Pier', next: 'Take the pier', at: [190, 120], radius: 9 },
      { kind: 'clear', text: 'Take the pier — clear the dock crew 0/3', next: 'Escape down the Strand', at: [190, 120], count: 3 },
      { kind: 'drive', text: 'Escape down the Strand', next: 'Mission complete', at: [-40, -120], radius: 9 },
    ],
  },
  {
    chapter: 'CH.7 · EBB', title: 'THE LONG WAY HOME', payout: 1800,
    intro: { name: 'MIRA KESANG', role: 'Crew · Driver', text: 'Heat is everywhere. Three quiet streets, then home. No sirens, Tomo.' },
    stages: [
      { kind: 'drive', text: 'Slip through the back streets — checkpoint 1', next: 'Checkpoint 2', at: [-120, 40], radius: 9 },
      { kind: 'drive', text: 'Checkpoint 2 — stay off the Strand', next: 'Checkpoint 3', at: [-40, -120], radius: 9 },
      { kind: 'drive', text: 'Checkpoint 3 — home stretch', next: 'Mission complete', at: [40, 120], radius: 9 },
    ],
  },
  {
    chapter: 'CH.8 · STORM SURGE', title: 'KING TIDE', payout: 8000,
    intro: { name: 'CAPT. VANCE', role: 'SBP Dispatch', text: 'Every unit in the city is on this one. Bring him down.' },
    stages: [
      { kind: 'drive', text: 'Chase the kingpin convoy down the Strand', next: 'Wreck the lead car', at: [120, 120], radius: 14 },
      { kind: 'ram', text: 'Wreck the lead car of the convoy', next: 'Reach the extraction', at: [120, 120], radius: 14 },
      { kind: 'drive', text: 'Reach the extraction at the Harbor', next: 'Mission complete', at: [-40, 140], radius: 9 },
    ],
  },
];

export const DIALOGUE = {
  stageDone: { name: 'MIRA KESANG', role: 'Crew · Driver', text: 'Good. Next step — keep it moving, Tomo.' },
  wantedUp: { name: 'CAPT. VANCE', role: 'SBP Dispatch', text: 'Suspect is escalating. All units, converge on the Strand.' },
  complete: { name: 'MIRA KESANG', role: 'Crew · Driver', text: 'Clean run. That is how you do it in Solara Bay.' },
};
