# Hadley's Dream -- Bug & Feature Spec
**Date:** 2026-03-06
**Type:** Bug Fix + Feature
**Priority:** Mixed (see table)
**Estimated Complexity:** Medium (4-8hr total)

---

## Summary Table

| ID  | Issue | Priority | Complexity | Status |
|-----|-------|----------|------------|--------|
| F1  | Music doesn't start until button press | P3 | Small | Feasible with limits -- see analysis |
| F2  | Some clothing items show as colored blocks | P1 | Small | **False alarm** -- all SVGs exist on disk |
| F3  | Hoodie SVG hood renders in front of body | P1 | Small | Confirmed -- needs back-layer group |
| F4  | Avatar should be more human-like with rounded shoulders | P2 | Medium | Ready -- softer chibi first |
| F5a | Saved outfits should be deletable | P3 | None | **Already implemented** |
| F5b | Submit button not prominent enough vs Done | P1 | Small | Confirmed -- CSS-only fix |
| C1  | Creature SVG overlaps creature name text | P2 | Small | Confirmed -- layout/z-index issue |
| C2  | "How to capture" instructions needed | P2 | Medium | Ready -- practice round |
| C3  | One creature missing its SVG image | P3 | Small | **All 30 SVGs verified on disk** -- likely a load timing issue |

---

## Detailed Analysis

---

### F1: Music doesn't start until button press

**Current state:**

`js/audio.js` lines 16-22: The unlock function listens for a single `touchstart` or `click` event to resume a suspended AudioContext. This is correct -- iOS and most mobile browsers require a user gesture to unlock audio. The listeners use `{ once: true }`, so after the first tap anywhere on the page, the AudioContext resumes.

`js/audio.js` lines 296-305: `startMusic(mode)` is called from `Game.init()` (line 78 of game.js) when the hub loads, and again on every `switchMode()` call. If the user has never tapped anything yet (AudioContext still suspended), `startMusic` will silently fail because tones cannot play on a suspended context.

`js/audio.js` lines 319-325: `toggleMute()` toggles the `muted` flag and calls `stopMusic()` if muting. But when un-muting, it does NOT call `startMusic()` -- it just flips the flag and updates the button icon. So un-muting alone will not resume music.

**Root cause:** Two separate issues:
1. AudioContext requires a user gesture to unlock. This is a hard browser requirement and cannot be bypassed. Volume buttons do not count as user gestures.
2. Un-muting does not restart music for the current mode.

**Recommendation:**
- Fix #2: When `toggleMute()` un-mutes, it should call `startMusic(currentMode)` if there is an active mode. This requires exposing `currentMode` or passing it in.
- For #1: Add additional unlock listeners (not just the first tap) -- re-register the unlock function on `touchstart` if AudioContext is still suspended. This handles the case where the first touch happened before AudioContext was created.
- Cannot do anything about device volume buttons -- they are not user gestures and do not fire DOM events that can resume AudioContext.

**Files to change:** `js/audio.js` -- `toggleMute()` function (line 319), `unlock()` function (line 16)

---

### F2: Some clothing items show as colored blocks

**Current state:**

Every one of the 21 FASHION_ITEMS in `js/data.js` (lines 169-203) has an `svg:` path pointing to `assets/fashion/`. I verified all 21 SVG files exist on disk:

- hair-long-straight.svg, hair-pigtails.svg, hair-space-buns.svg
- top-basic-tee.svg, top-hoodie.svg, top-princess-blouse.svg
- bottom-jeans.svg, bottom-pink-skirt.svg, bottom-tutu.svg
- dress-sundress.svg, dress-party-dress.svg, dress-ball-gown.svg
- shoes-sneakers.svg, shoes-boots.svg, shoes-glass-slippers.svg
- acc-heart-necklace.svg, acc-sunglasses.svg, acc-fairy-wings.svg
- hat-flower-crown.svg, hat-beanie.svg, hat-tiara.svg

**Fallback logic** (`js/fashion.js` lines 264-272): `buildThumbnail()` checks `svgCache[item.id]`. If the cache entry is empty/falsy, it renders a colored `<div>` rectangle using `item.color`. This fallback triggers when:
1. The SVG fetch failed (network error, wrong path, 404)
2. The SVG hasn't finished loading yet (race condition on first render)
3. `sanitizeSVG()` returned an empty string (malformed SVG)

**Most likely cause:** A race condition. `preloadSVGs()` fires fetches for all items at init time, but if the user navigates to the wardrobe or shop before all fetches complete, `buildThumbnail()` finds an empty cache and falls back to the colored block. This is especially likely on slow connections or first load before the service worker caches files.

**Recommendation:**
- Add a check in `buildThumbnail()`: if the cache is empty but the item has an `svg` path, show a loading placeholder instead of the permanent colored block, and re-render when the fetch completes.
- Alternatively, await the fetch in `renderWardrobeItems()`/`renderShopItems()` before rendering thumbnails.

**Files to change:** `js/fashion.js` -- `buildThumbnail()` (line 264), possibly `fetchSVG()` (line 28) to support a callback/re-render on completion

---

### F3: Hoodie SVG hood renders in front of body

**Current state:**

`assets/fashion/top-hoodie.svg` has all content inside a single `<g id="clothing">` group (line 18). The hood shape is the very first element (lines 20-35), followed by sleeves (lines 53-93), then the hoodie body (lines 95-111).

The Fashion module's `buildAvatarSVG()` (`js/fashion.js` line 192) renders tops like this:
```
layers += getSVGGroup(o.top, 'clothing') || getSVGContent(o.top);
```
It looks for a `#clothing` group and inserts the whole thing. Since the hood is inside `#clothing`, it gets rendered as a single block -- and within that block, the hood is drawn first (behind the body) which is correct SVG paint order.

**However**, the hood sits at y=68-138, which overlaps with the avatar's head (centered at y=75, rx=42, ry=46, so spanning roughly y=29 to y=121). The avatar base head is rendered BEFORE clothing in `buildAvatarSVG()` (line 189: `layers += getSVGContent('avatar-base')`), so the hood should appear ON TOP of the head.

**The real bug:** The hood should be BEHIND the head (like a real hoodie hood that sits behind your head when down). It needs to be in a `<g id="back-layer">` group, similar to how hair back-layers work. Currently the hoodie has no `back-layer` group.

`buildAvatarSVG()` layer order (lines 186-196):
1. Hair back-layer
2. Accessory back-layer
3. Avatar base (body, head, face)
4. Dress or bottom
5. Top (clothing group)
6. Shoes
7. Hair front
8. Hat
9. Accessory front

**Fix:** Split the hoodie SVG into two groups:
- `<g id="back-layer">` containing the hood shape and hood shading
- `<g id="clothing">` containing sleeves, body, pocket, neckline, drawstrings, etc.

The back-layer will render at step 1-2 (behind avatar), and the clothing group will render at step 5 (over avatar body).

**Files to change:** `assets/fashion/top-hoodie.svg` -- restructure groups

---

### F4: Avatar should be more human-like with rounded shoulders

**Current state:**

`assets/fashion/avatar-base.svg`: The torso is a `<rect>` with `rx="20"` (line 23): `<rect x="68" y="130" width="64" height="105" rx="20">`. The arms are `<ellipse>` shapes at cx=52/148, ry=40 (lines 11-12). There is no explicit shoulder connection between the torso and arms -- they overlap but there's a visible gap/seam between the rectangular torso top and the elliptical arms.

The head is an ellipse (rx=42, ry=46) at cy=75. The neck is a small rect at y=115 with width=20. The proportions are chibi-style (large head, compact body) which is appropriate for a children's game.

**This needs an interview before implementation.** Questions to ask:
- How much more human-like? Full anatomical proportions, or just softer shoulders on the existing chibi proportions?
- Should the torso become a path with shoulder curves instead of a rounded rectangle?
- Does the head size need to change?
- Are legs/feet okay as-is, or do those also need reworking?
- Any reference images for the desired look?

**Impact:** Changing the avatar base is high-risk because all 21 clothing SVGs are designed to fit the current body proportions. If the torso shape changes, every clothing item may need coordinate adjustments.

**Files affected:** `assets/fashion/avatar-base.svg`, and potentially all 21 `assets/fashion/*.svg` clothing items

---

### F5a: Saved outfits should be deletable

**Already implemented.** `js/fashion.js` lines 517-526: `deleteOutfit(index)` exists with a `confirm()` dialog, splices the outfit from the array, auto-saves, re-renders the album, and shows a toast. The delete button is rendered in `renderAlbum()` at line 487 as a small X button in the top-right corner of each album cell. CSS styling is at `css/fashion.css` lines 282-301.

No work needed.

---

### F5b: Submit button not prominent enough vs Done button

**Current state:**

`index.html` lines 150-155, the dressup-actions bar:
```html
<button class="btn small" onclick="Fashion.clearOutfit()">Clear</button>
<button class="btn small teal" id="btn-save-outfit" onclick="Fashion.saveOutfit()">Save</button>
<button class="btn small pink" id="btn-submit-outfit" onclick="Fashion.submitChallenge()">Submit</button>
<button class="btn small" onclick="Fashion.exitDressup()">Done</button>
```

All four buttons use `class="btn small"` with minor color variations. The Submit button has `pink` class, and the Done button has no color class (default gray/white). Both are the same size. In challenge mode, Submit and Done sit side by side with identical sizing -- easy to hit Done accidentally, which exits without scoring.

`css/fashion.css` lines 166-175: The `.dressup-actions` bar uses `display: flex; gap: 8px; justify-content: center`. No special sizing for any button.

**Recommendation:**
- In challenge mode, make Submit significantly larger (bigger font, more padding, maybe full-width or at least 2x wider than Done)
- Make Done smaller/muted in challenge mode (smaller text, grayed out, or move it to the left edge away from Submit)
- Consider hiding the Done button entirely during challenges and only showing it after submitting or when time runs out
- Add a confirmation dialog to Done during active challenges ("Are you sure? Your outfit won't be scored.")

**Files to change:** `css/fashion.css` (add challenge-mode button styles), `js/fashion.js` (toggle button classes in `startChallenge()` and `startFreeMode()`), possibly `index.html` (add data attributes or extra classes)

---

### C1: Creature SVG image covers creature name text

**Current state:**

`index.html` lines 102-114, the catch overlay structure:
```
#catch-overlay (flex column, centered)
  #catch-creature-svg (absolute positioned, z-index 21)
  #catch-canvas (z-index 22)
  #catch-info (contains name, rarity, instruction)
  #catch-result
```

`css/creatures.css` lines 136-145:
```css
#catch-creature-svg {
  position: absolute;
  width: 160px;
  height: 160px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -65%);
  z-index: 21;
  pointer-events: none;
}
```

The SVG container is absolutely positioned at `top: 50%; transform: translate(-50%, -65%)`. The `#catch-info` div sits below `#catch-canvas` in the flex flow. On smaller screens, the creature SVG (160x160px, positioned relative to the overlay center) can overlap downward into the `#catch-info` area where the creature name text is displayed.

The `#catch-canvas` is 260x260px at z-index 22, and `#catch-creature-svg` is at z-index 21 (behind the canvas). But `#catch-info` has no explicit z-index, so it sits at the default stacking context -- potentially behind the SVG overlay.

**Recommendation:**
- Give `#catch-info` a `position: relative; z-index: 23` so it always renders above the creature SVG
- Alternatively, adjust the creature SVG transform to move it higher (change `-65%` to `-75%` or `-80%`) so it doesn't extend into the text area
- Consider reducing `#catch-creature-svg` size from 160px to 120px on small screens via media query

**Files to change:** `css/creatures.css` -- `#catch-creature-svg` and `#catch-info` styles

---

### C2: "How to capture" instructions needed

**Current state:**

The only instruction is the static text "Tap when the circles align!" shown in `#catch-instruction` (html line 108, set in creatures.js line 186). There is no tutorial, first-time detection, or animated guide.

**This needs an interview before implementation.** Key questions:
- Should this be a one-time tutorial that shows on the very first catch attempt, or always available?
- Text-only overlay, or animated demonstration?
- Should it pause the ring animation while instructions are shown?
- Where should the "how to play" prompt appear -- before the catch starts, or as an overlay during it?
- Should there be a "?" help button that can be tapped anytime during catch?

**Marking as needs-interview.** Will not spec implementation until user provides answers.

---

### C3: One creature appears to lack an original image

**Current state:**

I verified all 30 creature entries in `data.js` have `svg:` paths, and all 30 corresponding SVG files exist in `assets/creatures/`. File list matches perfectly. No creature is missing its SVG file.

**Possible explanations for what the user saw:**
1. **Race condition:** The SVG hadn't loaded into `svgCache` yet when the catch overlay opened. `js/creatures.js` lines 190-197: if `svgCache.has(creature.id)` is false, it falls back to an `<img>` tag. If that also fails to load, only the canvas-drawn circle (lines 222-258) would show -- but `hasSVG` would still be true so the canvas creature drawing is skipped (line 293). This means a failed SVG load would show an empty SVG container + no canvas creature = nothing visible except the catch ring.
2. **Specific creature:** The canvas fallback drawing (lines 222-258) only fires when `hasSVG` is false. If a particular creature's SVG file is corrupt or has a parsing error, the `<img>` fallback would show a broken image, not the canvas circle.

**Recommendation:**
- Improve the fallback chain in `startCatchGame()`: if the SVG cache miss AND the img load fails, fall back to the canvas drawing
- Add an `onerror` handler on the `<img>` fallback to switch to canvas rendering
- This is a minor robustness improvement, not a blocking bug

**Files to change:** `js/creatures.js` -- `startCatchGame()` around lines 189-202

---

## What We're NOT Doing

- Not redesigning the catch mini-game mechanics
- Not adding new clothing items or creatures
- Not changing the music system architecture (Web Audio API oscillators)
- Not implementing the Dream Room mode
- Not changing save data structure
- Not addressing the avatar transparency bug (noted in MEMORY.md -- needs live debugging/screenshot, separate issue)

## Open Questions

1. **F2 (Colored blocks):** Can the user identify WHICH specific items appeared as colored blocks? This would help distinguish between "SVG exists but didn't load in time" vs "SVG has rendering issues."

## Interview Results

### F4 -- Avatar Proportions (RESOLVED)

**Decision:** Start with "softer chibi" -- keep the big-head cute proportions but smooth out the blocky torso. Add shoulder curves, smoother neck transition, rounder arms. May upgrade to "stylized human" in a future session.

**Scope:**
- Replace the rect torso with a path that has curved shoulder slopes
- Smooth the neck-to-shoulder-to-arm transitions
- Round the arm shapes (currently ellipses with sharp visual boundaries)
- Keep the large head and overall chibi proportions
- All 21 clothing SVGs will need minor coordinate adjustments to match the new shoulder curves
- User is willing to redo outfits as needed

**Files:** `assets/fashion/avatar-base.svg` + all 21 `assets/fashion/*.svg` clothing items

### C2 -- Capture Tutorial (RESOLVED)

**Decision:** Practice round at half speed, auto-ends after 1 successful tap, then real catch starts.

**Behavior:**
1. First time a player ever taps a creature spot, instead of jumping straight to the catch game, show a practice round
2. Practice round: ring shrinks at half speed (0.5x normal), no creature at stake, no cooldown on miss
3. Player taps -- if they land it (diff < 20, i.e. "good" or "perfect"), show "Nice!" feedback and auto-transition to the real catch after a brief pause
4. If they miss, ring resets and they try again (unlimited attempts in practice)
5. After the first successful practice tap, real catch starts normally with the creature they discovered
6. Track `tutorial_completed: true` in `Game.state` (persisted to save). Only show practice round when this flag is false
7. Second encounter onward: show text-only "Tap when the circles align!" (already exists). After a few more catches, show nothing (or keep the text -- it's unobtrusive)

**Files:** `js/creatures.js` (practice round logic), `js/data.js` (add `tutorial_completed` to DEFAULT_STATE), `js/game.js` (migration for old saves), `css/creatures.css` (practice UI styling)

## Success Criteria

- F1: Un-muting sound while in any game mode immediately starts that mode's music
- F2: All wardrobe/shop items show SVG thumbnails even on slow first load
- F3: Hoodie hood appears behind the avatar's head, not in front
- F5b: During challenges, Submit button is visually dominant and hard to confuse with Done
- C1: Creature name text is always readable and never obscured by the creature SVG
- C3: If any creature SVG fails to load, the canvas fallback circle is shown instead of nothing

---

## Agent Task List

**Run in this order:**

### 1. F3 -- Fix hoodie SVG layering (smallest, most clear-cut fix)

> Read `assets/fashion/top-hoodie.svg` and `js/fashion.js` (the `buildAvatarSVG` function around line 182).
> Move the hood shape (the first path inside `<g id="clothing">`, lines 19-51 of top-hoodie.svg) into a new `<g id="back-layer">` group.
> Keep everything else (sleeves, body, pocket, neckline, drawstrings, cuff hems) inside `<g id="clothing">`.
> The hood shading path (lines 37-45) should also go in `back-layer`.
> The hood rim detail line (lines 47-51) should stay in `clothing` since it's the visible rim on the front of the neckline.
> Test: equip hoodie in Fashion Studio, verify hood appears behind the head but hoodie body appears over avatar body.

### 2. F5b -- Make Submit button prominent in challenge mode (CSS + minor JS)

> Read `index.html` lines 150-155 (dressup-actions), `css/fashion.css` lines 166-175 (dressup-actions), and `js/fashion.js` lines 128-154 (startChallenge, startFreeMode).
> In `css/fashion.css`, add styles for a `.challenge-active` state on the dressup-actions bar: make Submit button larger (font-size 1.1em, padding 12px 24px, min-width 140px), make Done button smaller and grayed (font-size 0.75em, opacity 0.6).
> In `js/fashion.js` `startChallenge()`, add the `.challenge-active` class to the dressup-actions div. In `startFreeMode()` and `exitDressup()`, remove it.
> Consider adding `onclick` confirm dialog to the Done button when challenge is active: "Leave without submitting? Your outfit won't be scored."
> Test: start a challenge, verify Submit is large/obvious, Done is small/muted. Start free dress, verify both are normal size.

### 3. C1 -- Fix creature SVG overlapping name text (CSS fix)

> Read `css/creatures.css` lines 122-180 (catch overlay styling) and `index.html` lines 102-114 (catch overlay HTML).
> Add `position: relative; z-index: 23;` to `#catch-info` so text always renders above the creature SVG.
> Adjust `#catch-creature-svg` transform from `translate(-50%, -65%)` to `translate(-50%, -75%)` to push the image higher.
> Add a media query for small screens (max-height: 500px): reduce `#catch-creature-svg` to 120px width/height.
> Test: trigger a catch on a small viewport, verify name is readable and not covered.

### 4. F1 -- Fix music not restarting on un-mute (JS fix)

> Read `js/audio.js` lines 278-331 (stopMusic, startMusic, toggleMute, return object).
> In `toggleMute()` (line 319): after setting `muted = false`, check if there was an active mode. Problem: `stopMusic()` sets `currentMode = null` (line 292). So we need to save the mode before stopping.
> Fix approach: In `toggleMute()`, before `if (muted) stopMusic()`, capture `const wasMode = currentMode;`. After the muted flag is toggled, if un-muting and `wasMode` is set, call `startMusic(wasMode)`.
> Also: the `unlock()` function (line 16) uses `{ once: true }` which means if the first click happens before AudioContext exists, the unlock is lost. Add a more robust unlock: re-register the listener if ctx is still suspended after the first attempt.
> Test: start game, mute, navigate to creatures mode, un-mute -- music should start playing creatures mode music.

### 5. F2 -- Fix race condition for SVG thumbnails (JS fix)

> Read `js/fashion.js` lines 22-34 (preloadSVGs, fetchSVG) and lines 264-272 (buildThumbnail).
> Modify `fetchSVG()` to accept an optional callback parameter, or return the Promise more usefully.
> In `buildThumbnail()`: if `svgCache[item.id]` is falsy but `item.svg` exists, show a small loading indicator instead of the colored block, and schedule a re-render check (e.g., setTimeout that calls renderWardrobeItems/renderShopItems after 500ms if the cache has populated).
> Alternative simpler fix: in `renderWardrobeItems()` and `renderShopItems()`, await all SVG fetches for visible items before rendering. Use `Promise.all()` on `fetchSVG()` calls for the items being displayed.
> Test: clear browser cache, load game, immediately open fashion shop -- items should show SVGs (possibly after a brief loading state), not permanent colored blocks.

### 6. C3 -- Improve creature SVG fallback chain (JS fix)

> Read `js/creatures.js` lines 173-326 (startCatchGame).
> At line 196, the `<img>` fallback has no `onerror` handler. If the image fails to load, the SVG container stays visible but empty, AND `hasSVG` is true so the canvas creature is skipped.
> Fix: add `onerror` handler on the img element that hides `svgContainer` and sets a flag so the canvas fallback draws. Or: restructure so `hasSVG` is re-evaluated after image load/error.
> Test: temporarily rename one creature SVG file, trigger its catch, verify the canvas circle fallback appears.

### 7. F4 -- Softer chibi avatar (SVG rework -- avatar-base + 21 clothing items)

> Read `assets/fashion/avatar-base.svg` and understand the current body structure: rect torso (x=68, y=130, w=64, h=105, rx=20), ellipse arms (cx=52/148), ellipse head (cx=100, cy=75).
> Replace the rect torso with a `<path>` that has curved shoulder slopes flowing naturally from the neck into the arms. Smooth the neck-to-shoulder-to-arm transitions. Round the arm shapes so they blend with the shoulders instead of floating as separate ellipses.
> Keep the large head (rx=42, ry=46) and overall chibi proportions -- do NOT make the head smaller or body taller.
> Keep the underwear shapes (.ab-underwear camisole + shorts) -- adjust their coordinates to match the new torso path.
> After editing avatar-base.svg, check all 21 clothing SVGs in assets/fashion/ and adjust their coordinates so they align with the new shoulder curves. Most items reference the torso area (x=68-132, y=130-235) -- these need to follow the new path shape.
> Do NOT change the viewBox (200x340), the head, the face features, or the legs/feet unless necessary for proportional consistency.

### 8. C2 -- Capture tutorial practice round

> Read `js/creatures.js` (startCatchGame, handleCatchResult), `js/data.js` (DEFAULT_STATE), `js/game.js` (state migration), `css/creatures.css`, and `index.html` (catch-overlay).
> Add a `tutorial_completed: false` field to DEFAULT_STATE in data.js.
> In game.js init migration, add: `if (state.tutorial_completed === undefined) state.tutorial_completed = false;`
> In creatures.js, before startCatchGame runs the real catch, check `Game.state.tutorial_completed`. If false, run a practice round instead:
> - Practice round uses half speed: `const speed = 100 * cfg.ringSpeed * 0.5;`
> - Show text "PRACTICE -- Tap when the circles line up!" in catch-instruction
> - On tap: if diff < 20 (good or perfect), show "Nice!" text, set `Game.state.tutorial_completed = true`, SaveManager.autoSave, then after 1.5s auto-start the real catch for the same creature
> - On tap: if diff >= 20 (miss), show "Try again!" text, reset ring to maxRadius, let them retry (unlimited)
> - No cooldown set on practice misses, no coins awarded
> - Practice ring color uses same green/yellow/red feedback as real catch
> After tutorial_completed is true, all future catches go straight to the normal catch game (existing behavior unchanged).
> Bump sw.js cache version and index.html version after changes.

---

**Exact prompts to paste:**

**F3 (Hoodie fix):**
```
Read assets/fashion/top-hoodie.svg and js/fashion.js (the buildAvatarSVG function).
The hood of the hoodie renders in front of the avatar's head. Fix this by splitting the SVG into two groups:
1. <g id="back-layer"> containing the hood shape (lines 20-35) and hood shading (lines 37-45)
2. <g id="clothing"> containing everything else (sleeves, body, pocket, neckline, drawstrings, hems)
The hood rim detail (lines 47-51) should stay in clothing since it's visible on the front neckline.
buildAvatarSVG already handles back-layer groups for tops -- see line 192.
Only modify top-hoodie.svg. Do not change any JS or CSS.
```

**F5b (Submit button prominence):**
```
Read index.html lines 150-155, css/fashion.css lines 166-175, and js/fashion.js (startChallenge and startFreeMode functions).
During challenge mode, the Submit button needs to be MUCH more prominent than the Done button. Users are accidentally hitting Done instead of Submit.
1. In fashion.css, add a .challenge-mode class for .dressup-actions that makes #btn-submit-outfit larger (bigger font, more padding, min-width 140px, bold) and makes the Done button smaller and muted (smaller font, opacity 0.6, reduced padding).
2. In fashion.js startChallenge(), add 'challenge-mode' class to the dressup-actions div. In startFreeMode() and exitDressup(), remove it.
3. Add a confirm() dialog on the Done button click when a challenge is active: "Leave without submitting? Your outfit won't be scored."
Test by starting a challenge and verifying Submit is visually dominant.
```

**C1 (Creature SVG overlap):**
```
Read css/creatures.css lines 122-180 and index.html lines 102-114.
The creature SVG image (#catch-creature-svg) overlaps the creature name text (#catch-info) on small screens.
Fix:
1. Add position: relative; z-index: 23; to #catch-info
2. Change #catch-creature-svg transform from translate(-50%, -65%) to translate(-50%, -75%)
3. Add a media query for max-height: 500px that reduces #catch-creature-svg to 120px x 120px
Only modify css/creatures.css.
```

**F1 (Music on un-mute):**
```
Read js/audio.js fully, focusing on toggleMute() (line 319), stopMusic() (line 279), and startMusic() (line 296).
Bug: when user un-mutes, music does not restart because stopMusic() sets currentMode to null and toggleMute() never calls startMusic().
Fix toggleMute(): before calling stopMusic(), save the current mode. After toggling muted to false, call startMusic(savedMode) if a mode was active.
Also improve the unlock() function: instead of { once: true }, keep re-registering the listener until ctx.state is 'running', so audio unlock works even if the first tap happens before AudioContext is ready.
Only modify js/audio.js.
```

**F2 (SVG thumbnail race condition):**
```
Read js/fashion.js lines 22-34 (preloadSVGs, fetchSVG) and lines 264-272 (buildThumbnail) and lines 225-261 (renderWardrobeItems) and lines 395-416 (renderShopItems).
Some items show as colored blocks because the SVG cache hasn't been populated when buildThumbnail runs.
Fix: modify buildThumbnail() so that when svgCache[item.id] is falsy but item.svg exists, it returns a small loading spinner placeholder. Then modify fetchSVG() to trigger a re-render of the active wardrobe/shop view when a fetch completes. Use a simple approach: after setting svgCache[id], check if the wardrobe or shop panel is currently visible and re-render it.
Only modify js/fashion.js.
```

**C3 (Creature SVG fallback):**
```
Read js/creatures.js lines 173-326 (startCatchGame function).
At line 196, the <img> fallback for creature SVGs has no onerror handler. If the image fails, the SVG container shows as empty AND the canvas fallback creature is skipped (because hasSVG is true).
Fix: add an onerror handler on the img that hides svgContainer and triggers a re-evaluation of hasSVG so the canvas circle fallback draws instead. The simplest approach: set svgContainer.classList.add('hidden') in onerror, and check hasSVG dynamically in the animate() function rather than caching it as a const.
Only modify js/creatures.js.
```

---

**Skip steps if:**
- F5a (outfit deletion): Already done, skip entirely.
- F4 (avatar proportions): Blocked on interview. Do not start.
- C2 (catch tutorial): Blocked on interview. Do not start.
- If only fixing the most impactful bugs: do F3, F5b, and C1 first (all CSS/SVG-only, low risk). Then F1 and F2 (JS changes, moderate risk). Then C3 (JS, lowest priority).

---

## Post-F4 Investigation: Hair and Accessory Loading Issue (2026-03-06)

### Investigation Summary

User reported that hair items and some accessories don't load/display in Fashion Studio after the F4 avatar rework (softer chibi with curved shoulders). The hypothesis was that the F4 agent may have corrupted hair/accessory SVGs or shifted the avatar head coordinates.

### Files Examined

**Code:**
- `js/fashion.js` -- full file (565 lines), focusing on `fetchSVG()`, `sanitizeSVG()`, `buildAvatarSVG()`, `buildThumbnail()`
- `js/data.js` -- all FASHION_ITEMS entries (lines 169-203)
- `sw.js` -- ASSETS list (lines 1-82)

**SVG files read in full:**
- `assets/fashion/avatar-base.svg` (the new F4 version)
- `assets/fashion/hair-long-straight.svg`
- `assets/fashion/hair-pigtails.svg`
- `assets/fashion/hair-space-buns.svg`
- `assets/fashion/acc-heart-necklace.svg`
- `assets/fashion/acc-sunglasses.svg`
- `assets/fashion/acc-fairy-wings.svg`
- `assets/fashion/hat-flower-crown.svg`
- `assets/fashion/hat-beanie.svg`
- `assets/fashion/hat-tiara.svg`
- `assets/fashion/shoes-sneakers.svg`
- `assets/fashion/shoes-boots.svg`
- `assets/fashion/shoes-glass-slippers.svg`
- `assets/fashion/top-basic-tee.svg`
- `assets/fashion/bottom-jeans.svg`
- `assets/fashion/dress-sundress.svg`

### Findings

**1. All SVG files are structurally valid -- NO corruption detected.**

Every hair, accessory, hat, and shoe SVG has:
- A valid `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 340">` root element
- Properly formed `<defs>` and/or `<style>` blocks
- Correct `<g id="clothing">` and/or `<g id="back-layer">` groups
- Well-formed XML that DOMParser will parse without error
- No broken tags, unclosed elements, or missing attributes

The F4 agent did NOT corrupt any of these files. They are intact.

**2. Avatar head coordinates are UNCHANGED.**

The new F4 avatar-base.svg has `<ellipse cx="100" cy="75" rx="42" ry="46">` for the head (line 71). This is identical to the old avatar. Hair SVGs position their content relative to this head center (bangs around y=30-75, back hair from y=40 downward). Alignment is preserved -- hair will render in the correct position.

**3. data.js paths all match actual filenames on disk.**

All 21 items in FASHION_ITEMS have `svg:` paths that exactly match files in `assets/fashion/`. No typos, no mismatches.

**4. sw.js ASSETS list includes all 21 fashion SVGs.**

Lines 60-81 of `sw.js` list every fashion SVG file. Cache version was bumped to `dream-world-v8`.

**5. sanitizeSVG() will NOT reject any of these files.**

The function (lines 54-71 of fashion.js) runs `DOMParser().parseFromString(raw, 'image/svg+xml')`, then `doc.querySelector('svg')`. Since every file has a valid `<svg>` root, this will succeed. It then separates `<defs>` and `<style>` children from content groups and returns a JSON string. All files have the expected structure for this to work.

**6. buildAvatarSVG() layering logic is correct for these items.**

- Hair: line 209 extracts `back-layer` group, line 217 extracts `clothing` group. All 3 hair SVGs have both groups.
- Accessories: line 210 extracts `back-layer`, line 219 extracts `clothing`. Heart necklace has only `clothing`. Sunglasses have only `clothing`. Fairy wings have both `back-layer` and `clothing` (empty front layer, all content in back).
- Hats: line 218 extracts `clothing`. All 3 hat SVGs have `clothing` groups.
- Shoes: line 216 extracts `clothing`. All 3 shoe SVGs have `clothing` groups.

### Root Cause Assessment

**There is no code-level or file-level bug that would prevent hair and accessories from loading.** The SVGs are valid, the paths are correct, the parsing logic handles them properly, and the layering logic places them at the right z-order.

**Most likely cause: stale service worker cache.**

The sw.js cache was bumped from v7 to v8, but the service worker lifecycle means:
1. The old v7 service worker may still be controlling the page if the user hasn't closed all tabs and reopened
2. The old v7 cache may contain stale versions of the fashion SVGs (or no versions if they were recently added)
3. Even after the new v8 service worker installs, it waits for activation until all old tabs are closed
4. If the v8 service worker's `cache.addAll(ASSETS)` fails for ANY single file (network hiccup, 404 for one file), the ENTIRE install fails and the old v7 cache persists

**Secondary possibility: the "not loading" is actually a visual alignment issue, not a loading failure.**

If the user sees a bare avatar with no hair visible, they might interpret that as "hair didn't load" when actually hair IS loaded but renders at coordinates that look wrong or are hidden behind the head. However, since head coordinates are unchanged, this is unlikely for the existing hair SVGs.

**Third possibility: browser needs a hard refresh.**

After F4 changes to 12+ SVG files, if the browser serves any cached (pre-F4) version of a file while other files are the new F4 version, visual mismatches could occur. A hard refresh (Ctrl+Shift+R) or clearing site data would resolve this.

### Recommended Fix

**No code changes needed for the SVG files or JS logic.** The fix is operational:

1. **Hard refresh the browser** (Ctrl+Shift+R on desktop, or clear site data on mobile)
2. **Unregister and re-register the service worker** to force a clean v8 cache install
3. **Verify in DevTools** (Application tab > Service Workers) that the active service worker is v8 and not v7

If the issue persists after a clean cache:
- Open DevTools Network tab, filter by SVG, navigate to Fashion Studio and equip a hair item
- Check if the hair SVG fetch returns 200 (or 304), and whether the response body is valid SVG
- Check the Console for any DOMParser errors or fetch failures
- Add a `console.log` inside `fetchSVG()` to confirm all 21 items are being fetched and cached

### Files Involved (for reference)

- `C:\Users\scott\Documents\HAD Game\js\fashion.js` -- SVG loading/parsing/rendering logic
- `C:\Users\scott\Documents\HAD Game\js\data.js` -- FASHION_ITEMS definitions (lines 169-203)
- `C:\Users\scott\Documents\HAD Game\sw.js` -- service worker cache (ASSETS list, CACHE_NAME)
- `C:\Users\scott\Documents\HAD Game\assets\fashion\avatar-base.svg` -- new F4 avatar
- `C:\Users\scott\Documents\HAD Game\assets\fashion\hair-long-straight.svg` -- verified intact
- `C:\Users\scott\Documents\HAD Game\assets\fashion\hair-pigtails.svg` -- verified intact
- `C:\Users\scott\Documents\HAD Game\assets\fashion\hair-space-buns.svg` -- verified intact
- `C:\Users\scott\Documents\HAD Game\assets\fashion\acc-heart-necklace.svg` -- verified intact
- `C:\Users\scott\Documents\HAD Game\assets\fashion\acc-sunglasses.svg` -- verified intact
- `C:\Users\scott\Documents\HAD Game\assets\fashion\acc-fairy-wings.svg` -- verified intact
