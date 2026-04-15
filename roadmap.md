## Status

| Field | Value |
|-------|-------|
| **Priority** | parked |
| **Phase** |  |
| **Updated** | 2026-04-08 |
| **Summary** | All planned fixes done. 146 tests passing. Full SVG artwork for 5 locations, 3 music styles, fashion studio overhaul complete. No active development — focus has shifted to the 3D version. |
| **Needs Scott** | Decide whether to invest further in 2D version or focus entirely on 3D; provide screenshot/reproduction steps for transparency bug |
| **Autonomous** | Fix open bugs (avatar transparency, iPhone Safari hair loading) if reproducible, activate Room mode |
| **Blockers** | Avatar transparency bug and iPhone Safari loading issue both need live debugging with a device |

# Hadley's Dream — Roadmap

## Current Status

Three game modes are implemented and functional as a static PWA (no build step, no bundler):

- **Creature World** — explore locations, catch creatures via a timing mini-game; creature rarity affects difficulty and coin reward
- **Fashion Studio** — dress-up with challenge scoring based on tag-matching between equipped items and challenge theme
- **Dream Room** — grid-based furniture placement

State is persisted to localStorage via `SaveManager`. Audio is fully generated at runtime via Web Audio API (no audio files). Service worker cache is at `dream-world-v5`.

## Open Next Steps

- Add new tests to `tests/test_game_logic.py` whenever game logic, CSS structure, or asset conventions change
- Keep `DEFAULT_STATE` in `data.js` in sync when adding new state fields
- Bump `CACHE_NAME` in `sw.js` and the version label in `index.html` when updating cached assets

---

## Phase 1: Data Safety (COMPLETED)

Quick, low-risk changes that protect player progress.

| Task | File(s) | Status |
|------|---------|--------|
| Remove version-gate save wipe | `js/game.js` | Done |
| Floor coins at zero in `addCoins()` | `js/game.js` | Done |
| Fix service worker registration | `index.html`, `sw.js` | Done |

---

## Phase 2: Creature Catcher Optimization (COMPLETED)

Primary focus — make the catch mini-game robust before building more on top of it.

| Task | File(s) | Status |
|------|---------|--------|
| Prevent catch listener stacking (guard flag) | `js/creatures.js` | Done |
| Persist cooldowns to sessionStorage | `js/creatures.js` | Done |
| Sanitize SVG innerHTML injection | `js/creatures.js`, `js/game.js` | Done |

### Details

- **Listener stacking:** `catchActive` flag guards `startCatchGame()`. Set true on entry, false on close/result.
- **Cooldown persistence:** Cooldowns stored in `sessionStorage` with expired-entry cleanup on load. `saveCooldowns()` helper writes after every cooldown set.
- **SVG sanitization:** `sanitizeSVG()` strips `<script>` tags and `on*` attributes. Used in creature catch display and collection modal.

---

## Phase 3: Cross-Cutting Fixes (COMPLETED)

Important fixes that span multiple game modes.

| Task | File(s) | Status |
|------|---------|--------|
| Clear fashion challenge timer on mode switch | `js/fashion.js`, `js/game.js` | Done |
| Persist mute state to localStorage | `js/audio.js`, `js/game.js` | Done |
| Make hub creature count dynamic | `index.html`, `js/game.js` | Done |

### Details

- **Timer leak:** Add `Fashion.onExit()` that clears the challenge interval. Call it from `Game.switchMode()` to prevent ghost challenges awarding coins.
- **Mute persistence:** Save mute preference to localStorage, restore on load.
- **Dynamic count:** Replace hardcoded `/30` in `index.html` with a `<span id="hub-creatures-total">` updated from `CREATURES.length`.

---

## Phase 4: Deferred (Do Not Fix Now)

These are real issues but belong to WIP systems. Fix when those systems are actively being built.

| Issue | Rationale |
|-------|-----------|
| `Audio` module shadows `window.Audio` | No actual bug; rename is high-churn across all files |
| No furniture overlap detection in Room | Room mode is commented out / WIP |
| `DEFAULT_STATE` shared arrays | Investigated — not actually a bug |

---

## Verification Checklist

After all phases are complete, test in browser:

- [x] Open game, check console for SW registration (not unregister) — Phase 1
- [x] Catch a creature, refresh, verify cooldown persists — Phase 2
- [x] Double-tap a creature spot rapidly — should not stack catch games — Phase 2
- [x] Start a fashion challenge, go back to hub, wait 60s — no ghost coins — Phase 3
- [x] Toggle mute, refresh — mute state persists — Phase 3
- [x] Hub creature count denominator matches `CREATURES.length` — Phase 3
- [x] Run `Game.addCoins(-99999)` in DevTools — coins floor at 0 — Phase 1

---

## Not In Scope

- No refactoring of the IIFE module pattern
- No CSS or visual changes
- No new features
- No Room mode changes (commented out, WIP)
- No build system or tooling changes

---

## Session Log

> March 5–6 sessions archived to `archive/roadmap-archive.md` on 2026-04-06.

### 2026-04-15 — Parked

- Priority flipped maintenance → parked. Phase cleared. Focus remains on 3D version (which was also parked today). Open bugs and feature ideas retained in existing sections.

### 2026-03-23 — CLAUDE.md audit and roadmap creation

CLAUDE.md audit: removed copy-pasted end-of-session protocol block, added tiered approval gate posture, created roadmap.md.

### 2026-04-01 — Claude ignore file
- Created `.claudeignore` (excludes tests/__pycache__, .pytest_cache, .claude/, creature PNG images)
- No git changes needed — .gitignore was already adequate.
