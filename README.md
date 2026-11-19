# SUNCOAST — Grand Theft Auto VI (PS5) Offline Trophy Guide & Tracker

[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/arklarp/suncoast-gta6-trophies/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/arklarp/suncoast-gta6-trophies/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

**SUNCOAST** is a fast, 100% offline, zero-build-step PlayStation 5 trophy guide and progress tracker for *Grand Theft Auto VI*, authored for the [`gta6-trophy-guide-01`](https://make.fun/bounty/gta6-trophy-guide-01) bounty on make.fun.

## Highlights

- **Complete Official PS5 List (55/55):** 1 Platinum, 2 Gold, 6 Silver, 46 Bronze (28 hidden on PSN, 0 online), preserving every verbatim official PlayStation title (including `"T**s Ass Drug Money"`), description, grade, and target count in [app/data/trophies.json](app/data/trophies.json).
- **100% Original Cited Guidance:** Every trophy pairs original, non-copied walkthrough prose and numbered action steps with inline `[1][2][3]` citations backed by specific article URLs and `"Backs:"` summaries (links open only when clicked; zero runtime network calls).
- **7-Stage Platinum Roadmap & Watchlist:** Full stage-by-stage path (`S1`–`S7`), Platinum specs (`~200h`, `4/10`, `1 playthrough`, `0 online`, `no mission replay`, `15 save slots`, `cheats off`), dynamic `NEXT UP` spotlight, and honest separation of the 2 potentially missable watch entries (*Positive Mental Attitude* & *Strangers & Freaks*) from the 5 launch-unconfirmed secret triggers.
- **Zero-Leak Story Spoiler Shield:** Enabled by default (`Spoilers: Hidden until earned`). Masks unearned story trophy names, official descriptions, guides, roadmap callouts, and search hits until earned or individually revealed without marking earned.
- **Offline Persistence & JSON Backup:** Automatic `localStorage` persistence for earned toggles, progress counters, and spoiler state, plus styled one-click `Export JSON` / `Import JSON` (`suncoast-progress.json`) and `Reset`.
- **Zero External Assets or Build Steps:** Pure static HTML, CSS, and modular vanilla ES modules (`app/js/*.js`), zero webfonts, zero third-party bundles, zero Rockstar logos or official artwork.

## Local Usage

Serve `app/` locally with Node 22+:

```bash
node serve.ts
# Open http://localhost:8080
```

Build the submission dossier locally:

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
