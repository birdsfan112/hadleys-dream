# Hadley's Dream (2D) — Roadmap Archive

Completed and retired items moved here from roadmap.md.

---

## Archived — 2026-04-06 (Session Logs, March 5–6)

> **Reason:** Session logs from 2026-03-05 and 2026-03-06 exceeded the 30-day retention threshold.

---

### 2026-03-05 — Phase 3 Completed

**What we built:**
- Fashion timer cleanup: Added `Fashion.onExit()` that clears the challenge interval. Called from `Game.switchMode()` so leaving Fashion Studio mid-challenge no longer awards ghost coins.
- Mute persistence: Mute state now saves to `localStorage` (separate from game save) and restores on page load, including the correct button icon.
- Dynamic creature count: Hub stat now shows actual `CREATURES.length` instead of hardcoded `/30`, so adding creatures to `data.js` automatically updates the display.

**Code review findings:** No high-risk issues. One minor fix applied (null-check on mute button element to avoid disproportionate error recovery). Reviewer noted the `onExit()` pattern should track previous mode if more modes get exit handlers later.

**Status:** All phases (1-3) complete. Phase 4 is deferred items. Next steps: plan new features or activate Room mode.

### 2026-03-05 — Full Creature & Scene Artwork

**What we built:**
- 24 new creature SVGs across 4 locations: Crystal Beach (6), Cloud Garden (6), Moon Cave (6), Rainbow Meadow (6). All match Sparkle Forest art style (200x200 viewBox, CSS style blocks, eye shines, blush, curved smiles).
- 4 new scene background SVGs (800x600 viewBox) with layered compositions and animated sparkle particles for Crystal Beach, Cloud Garden, Moon Cave, and Rainbow Meadow.
- All `data.js` creature entries now have `svg:` paths, all locations have `scene:` paths.
- Fixed spots bug: Cloud Garden and Moon Cave had `spots: 5` but 6 creatures each — now both are `spots: 6`.
- All `<defs>` IDs in new SVGs are prefixed with creature initials to avoid collisions in collection view.
- Updated `sw.js` ASSETS list with all 28 new files, bumped cache to v5.
- Bumped `index.html` version to v4.
- Added error logging to silent SVG fetch catch in `creatures.js`.

**Infrastructure:**
- Initialized git repo, first commit (55 files, 6349 lines), pushed to GitHub at github.com/birdsfan112/Hadley-s-Game.
- Full art spec written to `SPEC.md` for future reference.

**Known issues:**
- Dewdrop Fairy (Sparkle Forest) still uses unprefixed `<defs>` IDs (`wingL`, `wingR`) — could collide if another creature reuses those IDs. Low priority since no other creature does currently.

**Status:** All 5 locations now have full illustrated artwork. Next steps: test on mobile, plan new features, or activate Room mode.

### 2026-03-05 — Fashion Studio SVG Overhaul + Evolving Pad Music

**What we built:**

*Fashion Studio SVG Overhaul:*
- Created `assets/fashion/avatar-base.svg` — full SVG character body (200x340 viewBox) replacing the old CSS-colored-div stack.
- Created 21 clothing item SVGs (3 per category: hair, top, bottom, dress, shoes, accessory, hat) with proper layering groups (`<g id="clothing">` front layer, `<g id="back-layer">` for hair behind body and fairy wings).
- Rewrote `js/fashion.js` — SVG fetch/cache/sanitize pipeline, layered `renderAvatar()` that composites one inline SVG from base + equipped items with correct z-ordering, SVG thumbnails in wardrobe and shop.
- Updated `css/fashion.css` — removed all old `.avatar-head`, `.avatar-torso`, `.avatar-legs` etc. CSS-art rules, added SVG container sizing.
- Trimmed `js/data.js` FASHION_ITEMS from 56 to 21 starter items with `svg` paths. Remaining items commented out for future expansion.

*Evolving Pad Music:*
- Rewrote `js/audio.js` music system — replaced single-note `setInterval` beep loops with rich pad chords (3 detuned oscillators per note for warm chorus effect).
- 4 chord progressions: hub (major 7ths), creatures (sus/add9), fashion (high-register major), room (minor 7ths).
- Chords crossfade smoothly using gain ramps. All SFX unchanged.

*Infrastructure:*
- Updated `sw.js` with 22 new fashion SVG asset paths, bumped cache to v6.
- Updated `index.html` version to v6.

**Code review findings:**
- Critical bug found and fixed: `getSVGGroup()` was silently dropping `<defs>` and `<style>` blocks from SVGs, causing missing gradients and CSS classes. Fixed by separating defs/styles during sanitization and collecting them into the combined SVG.
- Race condition fixed: `renderAvatar()` now guards against avatar-base not being loaded yet, shows "Loading..." and retries.
- CSS class collision fixed: boots and basic tee both used `bt-` prefix — boots renamed to `bo-`.
- Fairy wings SVG fixed: moved wing content from `<g id="clothing">` (front) to `<g id="back-layer">` (behind body).
- Medium issue noted: some challenge themes (Space Explorer, Rock Concert, etc.) have near-zero matching items in the trimmed inventory — gameplay balance concern for later.

**Save compatibility:** No save structure changes. Old `wardrobe_unlocked` IDs persist harmlessly.

**Status:** Fashion Studio now has full SVG artwork. Music system upgraded. Next steps: browser testing, then Room mode or new features.

### 2026-03-06 — Music Styles, Photo Album, Underwear, Thumbnail Fix

**What we built:**

*Feature 1: Music Style System*
- Rewrote `js/audio.js` to support 3 toggleable music styles: Pads (original warm chords), Music Box (plucked triangle-wave melody with shimmer harmonics), Chiptune (square-wave arpeggiated chords).
- Added music style toggle button in hub settings bar (next to mute).
- Style persists in localStorage across sessions. Tap to cycle with toast feedback.

*Feature 2: Photo Album*
- Added "My Outfits" button on fashion main menu, opens a 3-column grid album view.
- "Save" camera button in free dress mode (hidden during challenges). Saves current outfit (7 item IDs + timestamp).
- 12-outfit max. Tap to load outfit into free dress, X button to delete.
- Data stored in `Game.state.saved_outfits[]`. Old saves gracefully migrate from `outfits:{}`.
- Mini avatar previews rendered from saved item IDs using same layering as main avatar.

*Feature 3: Default Underwear*
- Added permanent camisole + shorts shapes to `avatar-base.svg` as `.ab-underwear` class elements.
- Light pink-white fill (#FFF0F0), sits between torso skin and clothing layers. Naturally hidden by any equipped items.
- SVG-only change, no JS needed.

*Feature 4: Thumbnail Bug Fix*
- Fixed `buildThumbnail()` in `fashion.js` — was putting raw JSON string into SVG innerHTML. Now properly parses defs + groups via `parseCached()`.

*Infrastructure:*
- Bumped `sw.js` cache to v7, `index.html` version to v7.
- `DEFAULT_STATE.outfits` renamed to `saved_outfits: []`.
- Deep-merge migration in `Game.init()` for old saves.

**Open issue:**
- Avatar transparency bug: user reports tops become "mostly transparent" when equipping a bottom. All SVG main fills are fully opaque, no CSS opacity on avatar elements. Could not reproduce from code analysis alone. Needs screenshot or live debugging to identify root cause.

**Status:** All 4 features implemented. Code review running. Transparency bug needs live testing.

### 2026-03-06 — Expanded Test Coverage

**What we built:**
- Expanded test suite from 67 tests to 146 tests (79 new tests across 7 new suites).
- Estimated coverage increased from ~25-30% to ~65-70% of meaningful game logic.

**New test suites:**
1. **Creature Catch Mini-Game** (24 tests) — Rarity selection (weighted random), catch result thresholds (perfect < 8, good < 20, miss >= 20), perfect catch 1.5x coin bonus, cooldown mechanics (miss = 5s, success = rarity-based), catchActive guard flag, SVG sanitization (script tags + on* handlers), duplicate creature prevention, sessionStorage cooldown persistence.
2. **Fashion Challenge Scoring** (14 tests) — 3-component scoring algorithm (completeness/30 + theme match/50 + color coord/20), star thresholds (90%/75%/55%/35%), coin rewards by star count, dress vs top+bottom slot counting for completeness, timer clearing, challenge mode guard.
3. **Fashion Shop** (9 tests) — Buy logic with sufficient/insufficient/exact coins, Game.addCoins(-cost) flow, wardrobe_unlocked push, autoSave call, shop filter (cost > 0 only).
4. **SaveManager** (13 tests) — Save key constant, load/save/autoSave/clearSave logic, daily bonus (first login, same day, next day), debounce at 500ms, module exports.
5. **Outfit Equip Logic** (7 tests) — Dress clears top+bottom, top/bottom clears dress, toggle-off same item, hat has no side effects on other slots.
6. **Game.addCoins** (8 tests) — Coin floor at 0 (including extreme -99999), positive earnings tracking in stats, Fashion.onExit() called on mode switch.
7. **Challenge Themes Data** (4 tests) — Required fields, 10+ themes for variety, unique IDs, minimum 2 tags per theme.

**Remaining uncovered:** DOM/rendering code, Web Audio API calls, service worker — these require a browser environment and can't be tested with Python/pytest.

**Status:** 146 tests, all passing. Next steps: address transparency bug with live testing, or plan new features.

### 2026-03-06 — Bug Fixes, Features, Avatar Rework (Session 2)

**What we built (8 items):**

*Fashion Studio:*
- **F1 (Music on un-mute):** `toggleMute()` now saves `currentMode` before stopping and calls `startMusic(wasMode)` when un-muting. `unlock()` retries until AudioContext is running instead of using `{ once: true }`.
- **F2 (SVG thumbnail race condition):** `fetchSVG()` calls debounced `refreshVisiblePanels()` when a fetch completes. `buildThumbnail()` shows "..." loading placeholder instead of permanent colored block.
- **F3 (Hoodie hood in front):** Hood moved to `<g id="back-layer">` in top-hoodie.svg. Added top back-layer support in `buildAvatarSVG()`.
- **F4 (Softer chibi avatar):** Replaced rect torso + detached arm ellipses with curved path torso with shoulder slopes. Refitted 11 clothing SVGs (tops, bottoms, dresses, 2 accessories). Head, legs, hats, shoes, hair unchanged.
- **F5b (Submit button prominence):** Challenge-mode CSS class makes Submit larger/pulsing, Done smaller/dimmed. Confirm dialog on Done during active challenges. `closeResult()` resets `isChallenge` before exit.

*Creature Catcher:*
- **C1 (SVG overlaps name):** `#catch-info` gets z-index 25. Creature SVG pushed higher with adjusted transform. Small screen media query shrinks SVG to 120px.
- **C2 (Capture tutorial):** New `startPracticeRound()` — half-speed ring, retry on miss, auto-transitions to real catch after one successful tap. `tutorial_completed` flag in game state.
- **C3 (Creature SVG fallback):** `<img>` onerror handler hides container. `hasSVG` checked dynamically each animation frame so canvas circle fallback kicks in.

**Code review fixes applied (4 items):**
- Practice timeout stored in `practiceTimeout`, cancelled in `closeCatch()`, guards check creatures screen is active
- `pickCreature()` null guard in `discoverCreature()`
- `renderAvatar()` retry capped at 25 attempts (5 seconds), shows error instead of infinite loop
- `refreshVisiblePanels()` debounced at 150ms to prevent 21+ consecutive DOM rebuilds

**Tests:** 191 total (45 new), all passing. 25 test suites covering practice tutorial, music unmute, SVG refresh, avatar back-layer, challenge-mode buttons, catch robustness, avatar retry cap, and state migration.

**Open issues:**
- Hair and some accessories reported not loading on iPhone Safari. Investigation found all SVGs are valid and paths correct. Most likely stale service worker cache. Debug toast added to `onEnter()` to diagnose (marked for removal). User clearing Safari cache and retesting.
- Avatar transparency bug (from prior session) still needs live debugging/screenshot.

**Versions:** sw.js cache v8, index.html v8.
