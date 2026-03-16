// ============================================================
// Hadley's Dream — Main Game Controller
// ============================================================

const Game = (() => {
  let state = null;
  let currentMode = 'hub';

  function init() {
    try {
      // Load or create state
      const saved = SaveManager.load();
      if (saved) {
        state = { ...DEFAULT_STATE, ...saved };
        // Deep-merge nested objects so old saves don't lose new keys
        state.stats = { ...DEFAULT_STATE.stats, ...(saved.stats || {}) };
        state.room = { ...DEFAULT_STATE.room, ...(saved.room || {}) };
        // Ensure arrays exist
        if (!Array.isArray(state.creatures)) state.creatures = [];
        if (!Array.isArray(state.wardrobe_unlocked)) state.wardrobe_unlocked = DEFAULT_STATE.wardrobe_unlocked;
        if (!Array.isArray(state.furniture_unlocked)) state.furniture_unlocked = DEFAULT_STATE.furniture_unlocked;
        // Migrate old saves: outfits:{} -> saved_outfits:[]
        if (!Array.isArray(state.saved_outfits)) state.saved_outfits = [];
        if (state.saved_outfits.length > 12) state.saved_outfits = state.saved_outfits.slice(0, 12);
        // Migrate old saves: add tutorial_completed flag
        if (state.tutorial_completed === undefined) state.tutorial_completed = false;
        // Migration: ensure last_location exists
        if (!state.last_location) state.last_location = 'sparkle-forest';
        // Migration: ensure all free fashion items are in wardrobe_unlocked
        const freeItems = FASHION_ITEMS.filter(i => i.cost === 0).map(i => i.id);
        if (!Array.isArray(state.wardrobe_unlocked)) state.wardrobe_unlocked = [];
        freeItems.forEach(id => { if (!state.wardrobe_unlocked.includes(id)) state.wardrobe_unlocked.push(id); });
      } else {
        state = { ...DEFAULT_STATE };
      }

      // Check daily bonus
      if (SaveManager.checkDailyBonus(state)) {
        state.coins += DAILY_BONUS;
        state.stats.total_coins_earned += DAILY_BONUS;
        setTimeout(() => showToast(`Daily bonus: +${DAILY_BONUS} coins! 🪙`), 1200);
      }

      SaveManager.save(state);

      // Init modules
      CreatureWorld.init();
      Fashion.init();
      // Room.init(); // Room mode hidden temporarily

      // Set up hub buttons
      document.getElementById('btn-mute').onclick = () => {
        try { Audio.toggleMute(); } catch (e) {}
      };
      const muteBtn = document.getElementById('btn-mute');
      if (muteBtn && Audio.isMuted()) muteBtn.textContent = '🔇';
      const musicBtn = document.getElementById('btn-music-style');
      if (musicBtn) {
        musicBtn.onclick = () => {
          try {
            const style = Audio.cycleStyle();
            const labels = { pads: 'Pads 🎹', musicbox: 'Music Box 🎶', chiptune: 'Chiptune 🕹️' };
            showToast(labels[style] || style);
          } catch (e) {}
        };
      }
      document.getElementById('btn-collection').onclick = () => openCollection();
      document.getElementById('btn-stats').onclick = () => openStats();
      document.getElementById('btn-save-menu').onclick = () => openSaveMenu();

      // Update displays
      updateCoinsDisplay();
      updateHubStats();
      const totalEl = document.getElementById('hub-creatures-total');
      if (totalEl) totalEl.textContent = CREATURES.length;

    } catch (e) {
      // If anything fails during init, reset state to defaults
      console.error('Init error:', e);
      state = { ...DEFAULT_STATE };
    }

    // Boot into the hub (title screen)
    setTimeout(() => {
      switchMode('hub');
      try { Audio.sfx.ready(); } catch (e) {}
    }, 500);
  }

  // Show a specific screen, hide all others
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
      if (s.id === screenId) {
        s.style.display = 'flex';
        s.classList.add('active');
      } else {
        s.style.display = 'none';
        s.classList.remove('active');
      }
    });
  }

  function switchMode(mode) {
    try { Audio.sfx.click(); } catch (e) {}
    currentMode = mode;

    // Clean up previous mode
    try { Fashion.onExit(); } catch (e) {}
    try { Particles.stop(); } catch (e) {}

    switch (mode) {
      case 'hub':
        showScreen('hub-screen');
        try { Audio.startMusic('hub'); } catch (e) {}
        break;
      case 'creatures':
        showScreen('creatures-screen');
        try { CreatureWorld.onEnter(); } catch (e) { console.error('Creatures onEnter error:', e); }
        try { Audio.startMusic('creatures'); } catch (e) {}
        break;
      case 'fashion':
        showScreen('fashion-screen');
        try { Fashion.onEnter(); } catch (e) { console.error('Fashion onEnter error:', e); }
        try { Audio.startMusic('fashion'); } catch (e) {}
        break;
      // Room mode hidden temporarily
      // case 'room':
      //   showScreen('room-screen');
      //   try { Room.onEnter(); } catch (e) { console.error('Room onEnter error:', e); }
      //   try { Audio.startMusic('room'); } catch (e) {}
      //   break;
    }

    // Update displays (safe even if state is weird)
    try { updateCoinsDisplay(); } catch (e) {}
    try { updateHubStats(); } catch (e) {}
  }

  function addCoins(amount) {
    state.coins += amount;
    if (state.coins < 0) state.coins = 0;
    if (amount > 0) {
      state.stats.total_coins_earned += amount;
      try { Audio.sfx.coin(); } catch (e) {}
    }
    updateCoinsDisplay();
    updateHubStats();
  }

  function updateCoinsDisplay() {
    if (!state) return;
    document.querySelectorAll('.coins-val').forEach(el => {
      el.textContent = state.coins;
    });
    const hubCoins = document.getElementById('hub-coins');
    if (hubCoins) hubCoins.textContent = state.coins;
  }

  function updateHubStats() {
    if (!state) return;
    const hubCoins = document.getElementById('hub-coins');
    const hubCreatures = document.getElementById('hub-creatures');
    const hubOutfits = document.getElementById('hub-outfits');
    if (hubCoins) hubCoins.textContent = state.coins;
    if (hubCreatures) hubCreatures.textContent = (state.creatures || []).length;
    if (hubOutfits) hubOutfits.textContent = (state.wardrobe_unlocked || []).length;
  }

  function showToast(msg) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // --- Collection ---
  function openCollection() {
    try { Audio.sfx.click(); } catch (e) {}
    const overlay = document.getElementById('collection-overlay');
    overlay.classList.remove('hidden');
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    const svgCache = typeof CreatureWorld !== 'undefined' ? CreatureWorld.getSvgCache() : new Map();

    CREATURES.forEach(creature => {
      const caught = state.creatures.includes(creature.id);
      const card = document.createElement('div');
      card.className = `creature-card${caught ? '' : ' uncaught'}`;

      // Use SVG artwork if available, otherwise fall back to generic circle
      let thumbHTML;
      if (creature.svg && svgCache.has(creature.id)) {
        thumbHTML = typeof CreatureWorld !== 'undefined' && CreatureWorld.sanitizeSVG
          ? CreatureWorld.sanitizeSVG(svgCache.get(creature.id))
          : svgCache.get(creature.id);
      } else if (creature.svg) {
        thumbHTML = `<img src="${creature.svg}" alt="${creature.name}" style="width:100%;height:100%;">`;
      } else {
        thumbHTML = `<svg viewBox="0 0 40 40" width="40" height="40">
            <circle cx="20" cy="20" r="16" fill="${creature.colors[0]}" stroke="${creature.colors[1]}" stroke-width="2"/>
            <circle cx="15" cy="17" r="2.5" fill="#333"/>
            <circle cx="25" cy="17" r="2.5" fill="#333"/>
            <circle cx="16" cy="16" r="1" fill="#FFF"/>
            <circle cx="26" cy="16" r="1" fill="#FFF"/>
            <path d="M16 24 Q20 28 24 24" stroke="#FF69B4" stroke-width="1.5" fill="none"/>
          </svg>`;
      }

      card.innerHTML = `
        <div class="creature-rarity-dot" style="background:${RARITY[creature.rarity].color}"></div>
        <div class="creature-thumb">${thumbHTML}</div>
        <div class="creature-name">${caught ? creature.name : '???'}</div>
      `;
      if (caught) {
        card.onclick = () => showToast(`${creature.name} — ${RARITY[creature.rarity].label}`);
      }
      grid.appendChild(card);
    });
  }

  function closeCollection(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('collection-overlay').classList.add('hidden');
  }

  // --- Stats ---
  function openStats() {
    try { Audio.sfx.click(); } catch (e) {}
    document.getElementById('stats-overlay').classList.remove('hidden');
    const content = document.getElementById('stats-content');

    // Find rarest catch
    let rarestCatch = 'None yet';
    const rarityOrder = ['legendary', 'epic', 'rare', 'common'];
    for (const r of rarityOrder) {
      const found = state.creatures.find(id => {
        const c = CREATURES.find(cr => cr.id === id);
        return c && c.rarity === r;
      });
      if (found) {
        const c = CREATURES.find(cr => cr.id === found);
        rarestCatch = `${c.name} (${RARITY[r].label})`;
        break;
      }
    }

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="stat-badge" style="justify-content:center;">🐾 ${state.creatures.length} creatures</div>
        <div class="stat-badge" style="justify-content:center;">🪙 ${state.stats.total_coins_earned} total coins</div>
        <div class="stat-badge" style="justify-content:center;">👗 ${state.wardrobe_unlocked.length} outfits</div>
        <div class="stat-badge" style="justify-content:center;">🏆 ${state.stats.challenges_completed} challenges</div>
      </div>
      <p style="text-align:center;margin-top:12px;font-size:0.85em;color:#666;">
        Rarest catch: <strong>${rarestCatch}</strong>
      </p>
    `;

    // Leaderboard
    const lb = document.getElementById('leaderboard-content');
    const entries = Object.entries(state.leaderboard || {});
    if (entries.length > 0) {
      lb.innerHTML = '<h3 style="text-align:center;">Family Leaderboard</h3>';
      entries.sort((a, b) => b[1] - a[1]).forEach(([name, score]) => {
        lb.innerHTML += `<div class="score-row"><span>${name}</span><span>🪙 ${score}</span></div>`;
      });
    } else {
      lb.innerHTML = '<p style="text-align:center;color:#888;font-size:0.85em;">No leaderboard entries yet</p>';
    }
  }

  function closeStats(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('stats-overlay').classList.add('hidden');
  }

  // --- Save Menu ---
  function openSaveMenu() {
    try { Audio.sfx.click(); } catch (e) {}
    document.getElementById('save-menu-overlay').classList.remove('hidden');
  }

  function closeSaveMenu(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('save-menu-overlay').classList.add('hidden');
  }

  // --- Current Mode ---
  function getCurrentMode() {
    return currentMode;
  }

  // --- Quick Menu ---
  function openQuickMenu() {
    try { Audio.sfx.click(); } catch (e) {}
    const menu = document.getElementById('quick-menu');
    if (menu) menu.classList.remove('hidden');
  }

  function closeQuickMenu(e) {
    if (e && e.target !== e.currentTarget) return;
    const menu = document.getElementById('quick-menu');
    if (menu) menu.classList.add('hidden');
  }

  // Make state accessible
  return {
    get state() { return state; },
    init, switchMode, addCoins, showToast, updateCoinsDisplay,
    openCollection, closeCollection, openStats, closeStats,
    openSaveMenu, closeSaveMenu,
    getCurrentMode, openQuickMenu, closeQuickMenu
  };
})();

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  Game.init();
});

// --- Pause/resume on visibility change to save battery ---
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause music and particles when app is backgrounded
    try { Audio.stopMusic(); } catch (e) {}
    try { Particles.stop(); } catch (e) {}
  } else {
    // Resume music for current mode
    const mode = Game.getCurrentMode();
    if (mode) {
      try { Audio.startMusic(mode); } catch (e) {}
    }
    // Particles will resume on next location enter — no need to restart here
    // since the user may have left the explore screen
  }
});
