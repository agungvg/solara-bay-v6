# SOLARA BAY — Make GTA 6 (gta6-01)

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/agungvg/solara-bay-v6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/agungvg/solara-bay-v6/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime sandbox set in Solara Bay — a sun-soaked beachfront city
with a full story campaign, a live police response, and a dense GTA-style HUD.

**Play it:** open `game/index.html` in a desktop browser (or `node serve.ts`
and visit http://localhost:8080). No network needed — three.js is vendored
under `game/vendor/`.

## What is in the game

- **Open world:** a grid city with lane-marked streets, sidewalks, palms,
  a beachfront Strand, the ocean, Kumala Pier, and a SOLARA BAY billboard.
- **Driving:** arcade handling in the Rukan Pelo GT, traffic, and SBP police
  units that pursue, flank, and ram — with a helicopter overhead at wanted 2+.
- **Wanted system:** 5 stars, roadblocks with SBP CHECKPOINT signage at
  wanted 4+, crew abilities (Swap Plates / Quick Fix / Eyes Out).
- **8 story missions** with staged objectives: driving, on-foot pickups,
  clearing enemy crews, and ramming the gold Regent.
- **Dense HUD in every frame:** mission card with stage progress, police
  panel with named units and live distances, wanted stars, cash + rank/XP,
  weapon slots, crew cards, dialogue, a real minimap (streets, district
  labels, mission marker, police blips, player arrow), speed, vehicle,
  condition, and radio.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive / walk |
| E | Enter / exit car |
| 1–4 | Weapons |
| Z / X / C | Swap Plates / Quick Fix / Eyes Out |
| R | Restart mission |

## Screenshots

1. Cover — mid-chase on the Strand at sunset (wanted 4)
2. Chase — dusk escape past an SBP roadblock (wanted 5)
3. On foot — clearing the Keron crew in Old Pasaru market
4. Night — neon run through the night market

## Tech

- three.js 0.160.0 (vendored, MIT) — no CDN, no network requests
- Plain ES modules under `game/src/`, static files only
- Entry for the [gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01)

## License

MIT — see `LICENSE`.
