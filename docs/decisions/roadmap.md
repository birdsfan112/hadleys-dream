# Development Roadmap

**Project:** Hadley's Dream World
**Last Updated:** 2026-03-04 (status refresh)

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

### 2026-03-05 — Phase 3 Completed

**What we built:**
- Fashion timer cleanup: Added `Fashion.onExit()` that clears the challenge interval. Called from `Game.switchMode()` so leaving Fashion Studio mid-challenge no longer awards ghost coins.
- Mute persistence: Mute state now saves to `localStorage` (separate from game save) and restores on page load, including the correct button icon.
- Dynamic creature count: Hub stat now shows actual `CREATURES.length` instead of hardcoded `/30`, so adding creatures to `data.js` automatically updates the display.

**Code review findings:** No high-risk issues. One minor fix applied (null-check on mute button element to avoid disproportionate error recovery). Reviewer noted the `onExit()` pattern should track previous mode if more modes get exit handlers later.

**Status:** All phases (1-3) complete. Phase 4 is deferred items. Next steps: plan new features or activate Room mode.
