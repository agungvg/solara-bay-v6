// SOLARA BAY — make.fun gta6-01 entrypoint.
// Copies this entry's game/ and screenshots/ into the output directory and
// writes /output/dossier.json, the summary the judge reads. The game itself
// is plain static files under game/ (game/index.html + vendored three.js),
// so it runs offline in a desktop browser with no build step.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game for play with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// dossier bytes; the rest refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files in all; or a path under game/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Solara Bay dossier written to ${join(out, 'dossier.json')}`);

// Local sanity report (not part of the dossier): game file count + size and
// screenshot sizes, so a bad bundle is visible before the kit check runs.
function walk(dir) {
  let files = 0, bytes = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { const r = walk(p); files += r.files; bytes += r.bytes; }
    else { files += 1; bytes += statSync(p).size; }
  }
  return { files, bytes };
}
const gameStats = walk(join(out, 'game'));
const shotStats = walk(join(out, 'screenshots'));
console.log(`game/: ${gameStats.files} files, ${(gameStats.bytes / 1048576).toFixed(2)} MiB (caps: 993 files, 48 MiB)`);
console.log(`screenshots/: ${shotStats.files} files, ${(shotStats.bytes / 1024).toFixed(0)} KiB total (cap: 4 files, 256 KiB each)`);
