# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Hadley's Dream World — a PWA game for a child named Hadley with three game modes: Creature World (explore locations, catch creatures via timing mini-game), Fashion Studio (dress-up with challenge scoring), and Dream Room (grid-based furniture placement).

## Development

This is a static PWA with no build step, no bundler, no framework. To run it, serve the root directory with any static HTTP server:

```
npx serve .
# or
python -m http.server 8000
```

There are no tests, linter, or CI. Changes are verified by opening in a browser.

When updating cached assets, bump `CACHE_NAME` in `sw.js` (currently `'dream-world-v2'`) and update the version label in `index.html`.

## Architecture

**Module pattern:** Every JS file is a global IIFE (`const ModuleName = (() => { ... })()`). Modules communicate through their public return objects. There is no import/export system.

**Script load order matters** (defined in `index.html`): `data.js` → `audio.js` → `save.js` → `creatures.js` → `fashion.js` → `room.js` → `game.js`. Each file can reference globals defined by files loaded before it.

**Screen switching:** Only one `.screen` element is visible at a time. `Game.showScreen(id)` sets `display:flex` + `.active` on the target and hides all others. Sub-views within a screen use `.hidden` class (`display:none !important`).

**State & persistence:** All game state lives in `Game.state` (exposed as a getter). `SaveManager` reads/writes the entire state object to localStorage under key `hadley-dream-world-save`. Mutations should call `SaveManager.autoSave(Game.state)` which debounces writes at 500ms.

**Currency flow:** All coin changes must go through `Game.addCoins(amount)` — it updates state, triggers the coin SFX, and refreshes all coin displays.

**Audio:** Entirely generated at runtime via Web Audio API oscillators. No audio files. All SFX are in `Audio.sfx.*`, background music is looping note patterns per mode. Audio calls are always wrapped in try/catch since AudioContext may not be available.

**Data constants:** All game content (creatures, fashion items, furniture, themes, challenge definitions) is in `data.js` as global `const` arrays. `DEFAULT_STATE` at the bottom of `data.js` defines the initial save structure — keep it in sync when adding new state fields.

## Key Conventions

- CSS is split per-mode: `style.css` (shared + hub), `creatures.css`, `fashion.css`, `room.css`
- Inline `onclick` handlers in HTML call module methods directly (e.g., `onclick="Game.switchMode('hub')"`)
- Deep-merge saved state on load to handle old saves missing new keys (see `Game.init()`)
- Fashion challenge scoring uses tag-matching between equipped items and the challenge theme
- Creature rarity affects catch difficulty (ring speed/size) and coin reward
