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
        // Migration: ensure legendary_bought array exists
        if (!Array.isArray(state.legendary_bought)) state.legendary_bought = [];
        // Migration: onboarding_seen
        if (state.onboarding_seen === undefined) state.onboarding_seen = false;
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
        try { GameAudio.toggleMute(); } catch (e) {}
      };
      const muteBtn = document.getElementById('btn-mute');
      if (muteBtn && GameAudio.isMuted()) muteBtn.textContent = '🔇';
      const musicBtn = document.getElementById('btn-music-style');
      if (musicBtn) {
        musicBtn.onclick = () => {
          try {
            const style = GameAudio.cycleStyle();
            const labels = { pads: 'Pads 🎹', musicbox: 'Music Box 🎶', chiptune: 'Chiptune 🕹️' };
            showToast(labels[style] || style);
          } catch (e) {}
        };
      }
      document.getElementById('btn-collection').onclick = () => openCollection();
      document.getElementById('btn-stats').onclick = () => openStats();
      document.getElementById('btn-save-menu').onclick = () => openSaveMenu();

      // Set up hidden parent unlock trigger
      setupUnlockTrigger();

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
      try { GameAudio.sfx.ready(); } catch (e) {}
      // Trigger onboarding for first-time players
      if (!state.onboarding_seen) {
        setTimeout(() => startOnboarding(), 1000);
      }
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
    try { GameAudio.sfx.click(); } catch (e) {}
    currentMode = mode;

    // Clean up previous mode
    try { Fashion.onExit(); } catch (e) {}
    try { Particles.stop(); } catch (e) {}

    switch (mode) {
      case 'hub':
        showScreen('hub-screen');
        try { GameAudio.startMusic('hub'); } catch (e) {}
        break;
      case 'creatures':
        showScreen('creatures-screen');
        try { CreatureWorld.onEnter(); } catch (e) { console.error('Creatures onEnter error:', e); }
        try { GameAudio.startMusic('creatures'); } catch (e) {}
        break;
      case 'fashion':
        showScreen('fashion-screen');
        try { Fashion.onEnter(); } catch (e) { console.error('Fashion onEnter error:', e); }
        try { GameAudio.startMusic('fashion'); } catch (e) {}
        break;
      // Room mode hidden temporarily
      // case 'room':
      //   showScreen('room-screen');
      //   try { Room.onEnter(); } catch (e) { console.error('Room onEnter error:', e); }
      //   try { GameAudio.startMusic('room'); } catch (e) {}
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
      try { GameAudio.sfx.coin(); } catch (e) {}
      showFloatingCoins(amount);
    }
    updateCoinsDisplay();
    updateHubStats();
  }

  function showFloatingCoins(amount) {
    const coinEls = document.querySelectorAll('.coins-val, #hub-coins');
    let anchor = null;
    coinEls.forEach(el => {
      if (!anchor && el.offsetParent !== null) anchor = el;
    });
    if (!anchor) return;
    const floater = document.createElement('div');
    floater.className = 'floating-coins';
    floater.textContent = `+${amount}`;
    const rect = anchor.getBoundingClientRect();
    floater.style.left = rect.left + 'px';
    floater.style.top = rect.top + 'px';
    document.body.appendChild(floater);
    floater.addEventListener('animationend', () => floater.remove());
    setTimeout(() => { if (floater.parentNode) floater.remove(); }, 1500);
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
    updateCollectionBadge();
  }

  function updateCollectionBadge() {
    const badge = document.getElementById('collection-badge');
    if (!badge || !state) return;
    const caught = (state.creatures || []).length;
    const total = typeof CREATURES !== 'undefined' ? CREATURES.length : 30;
    if (caught === 0) { badge.classList.add('hidden'); return; }
    badge.classList.remove('hidden');
    const pct = Math.round((caught / total) * 100);
    const fill = document.getElementById('collection-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const starCount = Math.min(4, Math.floor(pct / 25));
    const starsEl = document.getElementById('collection-stars');
    if (starsEl) starsEl.textContent = '⭐'.repeat(starCount) + '☆'.repeat(4 - starCount);
    const pctEl = document.getElementById('collection-pct');
    if (pctEl) pctEl.textContent = pct + '%';
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
    try { GameAudio.sfx.click(); } catch (e) {}
    const overlay = document.getElementById('collection-overlay');
    overlay.classList.remove('hidden');
    showCollectionTab('collection');
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

  function showCollectionTab(tab) {
    try { GameAudio.sfx.click(); } catch (e) {}
    document.getElementById('tab-collection').classList.toggle('active', tab === 'collection');
    document.getElementById('tab-legendary-shop').classList.toggle('active', tab === 'legendary-shop');
    document.getElementById('collection-view').classList.toggle('hidden', tab !== 'collection');
    document.getElementById('legendary-shop-view').classList.toggle('hidden', tab !== 'legendary-shop');
    if (tab === 'legendary-shop') renderLegendaryShop();
  }

  function renderLegendaryShop() {
    const grid = document.getElementById('legendary-shop-grid');
    grid.innerHTML = '';
    const svgCache = typeof CreatureWorld !== 'undefined' ? CreatureWorld.getSvgCache() : new Map();
    const legendaries = CREATURES.filter(c => c.rarity === 'legendary');

    legendaries.forEach(creature => {
      const caught = state.creatures.includes(creature.id);
      const bought = state.legendary_bought.includes(creature.id);
      const canAfford = state.coins >= creature.coins;
      const location = LOCATIONS.find(l => l.id === creature.location);

      const card = document.createElement('div');
      card.className = `legendary-shop-card${bought ? ' owned' : ''}${!caught ? ' locked' : ''}`;

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
          <circle cx="15" cy="17" r="2.5" fill="#333"/><circle cx="25" cy="17" r="2.5" fill="#333"/>
          <path d="M16 24 Q20 28 24 24" stroke="#FF69B4" stroke-width="1.5" fill="none"/>
        </svg>`;
      }

      const statusHTML = bought
        ? '<div class="legendary-status owned-label">Costume Owned</div>'
        : caught
          ? `<button class="btn small legendary-buy-btn${canAfford ? '' : ' disabled'}">Buy Costume \uD83E\uDE99 ${creature.coins}</button>`
          : `<div class="legendary-status locked-label">Catch ${creature.name} to unlock costume</div>`;

      card.innerHTML = `
        <div class="legendary-thumb">${thumbHTML}</div>
        <div class="legendary-info">
          <div class="legendary-name" style="color:${RARITY.legendary.color}">${creature.name}</div>
          <div class="legendary-location">${location ? location.name : creature.location}</div>
          ${statusHTML}
        </div>
      `;

      if (caught && !bought) {
        const buyBtn = card.querySelector('.legendary-buy-btn');
        if (buyBtn) {
          buyBtn.onclick = (e) => {
            e.stopPropagation();
            buyLegendary(creature);
          };
        }
      }

      grid.appendChild(card);
    });
  }

  function buyLegendary(creature) {
    if (state.coins < creature.coins) {
      showToast('Not enough coins!');
      return;
    }
    if (state.legendary_bought.includes(creature.id)) return;
    GameAudio.sfx.buy();
    addCoins(-creature.coins);
    state.legendary_bought.push(creature.id);
    // Unlock the matching costume in the wardrobe
    const costume = FASHION_ITEMS.find(i => i.legendary === creature.id);
    if (costume && !state.wardrobe_unlocked.includes(costume.id)) {
      state.wardrobe_unlocked.push(costume.id);
    }
    SaveManager.autoSave(state);
    renderLegendaryShop();
    showToast(`Bought ${creature.name} costume!`);
  }

  // --- Stats ---
  function openStats() {
    try { GameAudio.sfx.click(); } catch (e) {}
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
        const row = document.createElement('div');
        row.className = 'score-row';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        const scoreSpan = document.createElement('span');
        scoreSpan.textContent = `🪙 ${score}`;
        row.appendChild(nameSpan);
        row.appendChild(scoreSpan);
        lb.appendChild(row);
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
    try { GameAudio.sfx.click(); } catch (e) {}
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
    try { GameAudio.sfx.click(); } catch (e) {}
    const menu = document.getElementById('quick-menu');
    if (menu) menu.classList.remove('hidden');
  }

  function closeQuickMenu(e) {
    if (e && e.target !== e.currentTarget) return;
    const menu = document.getElementById('quick-menu');
    if (menu) menu.classList.add('hidden');
  }

  // --- Parent Unlock Menu ---
  const UNLOCK_PASSCODE = 'yeldah';
  let titleTapCount = 0;
  let titleTapTimer = null;

  function setupUnlockTrigger() {
    const title = document.querySelector('.hub-title');
    if (!title) return;
    title.addEventListener('click', () => {
      titleTapCount++;
      if (titleTapTimer) clearTimeout(titleTapTimer);
      titleTapTimer = setTimeout(() => { titleTapCount = 0; }, 2000);
      if (titleTapCount >= 5) {
        titleTapCount = 0;
        openUnlockMenu();
      }
    });
  }

  function openUnlockMenu() {
    const overlay = document.getElementById('unlock-overlay');
    const passcodeView = document.getElementById('unlock-passcode-view');
    const menuView = document.getElementById('unlock-menu-view');
    const input = document.getElementById('unlock-passcode-input');
    const error = document.getElementById('unlock-passcode-error');
    passcodeView.classList.remove('hidden');
    menuView.classList.add('hidden');
    overlay.classList.remove('hidden');
    input.value = '';
    error.textContent = '';
    input.onkeydown = (e) => { if (e.key === 'Enter') submitPasscode(); };
    setTimeout(() => input.focus(), 100);
  }

  function submitPasscode() {
    const input = document.getElementById('unlock-passcode-input');
    const error = document.getElementById('unlock-passcode-error');
    if (input.value.trim().toLowerCase() === UNLOCK_PASSCODE) {
      document.getElementById('unlock-passcode-view').classList.add('hidden');
      document.getElementById('unlock-menu-view').classList.remove('hidden');
      renderUnlockMenu();
    } else {
      error.textContent = 'Incorrect passcode';
      input.value = '';
      input.focus();
    }
  }

  function closeUnlockMenu(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('unlock-overlay').classList.add('hidden');
  }

  function renderUnlockMenu() {
    const container = document.getElementById('unlock-options');
    const allCreatureIds = CREATURES.map(c => c.id);
    const mainLegendaryIds = CREATURES.filter(c => c.rarity === 'legendary' && c.location !== 'dream-nexus').map(c => c.id);
    const allFashionIds = FASHION_ITEMS.map(i => i.id);
    const allFurnitureIds = FURNITURE_ITEMS.map(i => i.id);
    const allThemeIds = (typeof ROOM_THEMES !== 'undefined' ? ROOM_THEMES : []).map(t => 'theme-' + t.id);

    const allCreaturesCaught = allCreatureIds.every(id => state.creatures.includes(id));
    const nexusReady = mainLegendaryIds.every(id => state.creatures.includes(id));
    const allFashionOwned = allFashionIds.every(id => state.wardrobe_unlocked.includes(id));
    const allFurnitureOwned = allFurnitureIds.every(id => state.furniture_unlocked.includes(id)) &&
                              allThemeIds.every(id => state.furniture_unlocked.includes(id));

    // --- Unlock helper functions ---
    function mergeIds(arr, ids) {
      ids.forEach(id => { if (!arr.includes(id)) arr.push(id); });
    }

    function unlockCreatures() {
      mergeIds(state.creatures, allCreatureIds);
    }

    function unlockNexus() {
      mergeIds(state.creatures, mainLegendaryIds);
      const commonIds = CREATURES.filter(c => c.rarity === 'common').map(c => c.id);
      mergeIds(state.creatures, commonIds);
    }

    function unlockFashion() {
      mergeIds(state.wardrobe_unlocked, allFashionIds);
      FASHION_ITEMS.forEach(item => {
        if (item.legendary && !state.legendary_bought.includes(item.legendary)) {
          state.legendary_bought.push(item.legendary);
        }
      });
    }

    function unlockFurniture() {
      mergeIds(state.furniture_unlocked, allFurnitureIds);
      mergeIds(state.furniture_unlocked, allThemeIds);
    }

    function finishAction(msg) {
      SaveManager.autoSave(state);
      showToast(msg);
      renderUnlockMenu();
      updateHubStats();
    }

    const options = [
      {
        label: 'Unlock Dream Nexus',
        desc: 'Catch the 5 main legendaries to open the secret area',
        done: nexusReady,
        action: () => { unlockNexus(); finishAction('Dream Nexus unlocked!'); }
      },
      {
        label: 'Unlock All Creatures',
        desc: 'Mark every creature as caught',
        done: allCreaturesCaught,
        action: () => { unlockCreatures(); finishAction('All creatures unlocked!'); }
      },
      {
        label: 'Add 1000 Coins',
        desc: 'Current balance: ' + state.coins,
        done: false,
        action: () => { addCoins(1000); finishAction('+1000 coins!'); }
      },
      {
        label: 'Unlock All Outfits',
        desc: 'Unlock every fashion item and legendary costume',
        done: allFashionOwned,
        action: () => { unlockFashion(); finishAction('All outfits unlocked!'); }
      },
      {
        label: 'Unlock All Furniture & Themes',
        desc: 'Unlock every furniture item and room theme',
        done: allFurnitureOwned,
        action: () => { unlockFurniture(); finishAction('All furniture & themes unlocked!'); }
      },
      {
        label: 'Unlock Everything',
        desc: 'All creatures, outfits, furniture, themes + 1000 coins',
        done: allCreaturesCaught && allFashionOwned && allFurnitureOwned,
        action: () => {
          unlockCreatures();
          unlockFashion();
          unlockFurniture();
          addCoins(1000);
          finishAction('Everything unlocked!');
        }
      },
      {
        label: 'Reset All Progress',
        desc: 'Erase all progress and start fresh',
        done: false,
        danger: true,
        action: () => {
          if (!confirm('Are you sure? This will erase ALL progress and cannot be undone.')) return;
          state = JSON.parse(JSON.stringify(DEFAULT_STATE));
          SaveManager.save(state);
          showToast('Progress reset!');
          renderUnlockMenu();
          updateCoinsDisplay();
          updateHubStats();
        }
      }
    ];

    container.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'unlock-option-btn' + (opt.done ? ' done' : '') + (opt.danger ? ' danger' : '');
      btn.innerHTML = `
        <span class="unlock-option-label">${opt.done ? '&#10003; ' : ''}${opt.label}</span>
        <span class="unlock-option-desc">${opt.done ? 'Already unlocked' : opt.desc}</span>
      `;
      if (!opt.done) {
        btn.onclick = opt.action;
      }
      container.appendChild(btn);
    });
  }

  // --- Onboarding System ---
  const ONBOARDING_STEPS = [
    { title: "Welcome to Hadley's Dream!", text: "This is your dream world! Let's take a quick tour.", target: null, icon: '🌟' },
    { title: 'Your Coins', text: 'You earn coins by catching creatures. Use them to buy outfits and furniture!', target: '.hub-stats', icon: '🪙' },
    { title: 'Creature World', text: 'Explore magical places and catch cute creatures! Tap a creature and time the ring to catch it.', target: '.hub-modes .mode-card:first-child, .hub-modes > :first-child', icon: '🌿' },
    { title: 'Fashion Studio', text: 'Dress up your avatar with cool outfits! Complete challenges to earn extra coins.', target: '.hub-modes .mode-card:last-child, .hub-modes > :last-child', icon: '👗' }
  ];

  let currentOnboardingStep = 0;

  function startOnboarding() {
    currentOnboardingStep = 0;
    showOnboardingStep();
  }

  function showOnboardingStep() {
    const step = ONBOARDING_STEPS[currentOnboardingStep];
    if (!step) {
      finishOnboarding();
      return;
    }

    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    const box = document.getElementById('onboarding-box');
    const dotsContainer = document.querySelector('.onboarding-dots') || (() => {
      const div = document.createElement('div');
      div.className = 'onboarding-dots';
      return div;
    })();

    box.innerHTML = `
      <div class="onboarding-icon">${step.icon}</div>
      <div class="onboarding-title">${step.title}</div>
      <div class="onboarding-text">${step.text}</div>
      <div class="onboarding-dots"></div>
      <button class="btn onboarding-next" onclick="Game.nextOnboardingStep()">Next →</button>
      <button class="onboarding-skip" onclick="Game.skipOnboarding()">Skip</button>
    `;

    // Update dots
    const dotsEl = box.querySelector('.onboarding-dots');
    for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'onboarding-dot' + (i === currentOnboardingStep ? ' active' : '');
      dotsEl.appendChild(dot);
    }

    // Highlight target element if specified
    if (step.target) {
      const targets = document.querySelectorAll(step.target);
      if (targets.length > 0) {
        const target = targets[0];
        target.classList.add('onboarding-highlight');
        setTimeout(() => target.classList.remove('onboarding-highlight'), 500);
      }
    }

    overlay.classList.remove('hidden');
  }

  function nextOnboardingStep() {
    currentOnboardingStep++;
    if (currentOnboardingStep < ONBOARDING_STEPS.length) {
      showOnboardingStep();
    } else {
      finishOnboarding();
    }
  }

  function skipOnboarding() {
    finishOnboarding();
  }

  function finishOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.add('hidden');
    state.onboarding_seen = true;
    SaveManager.autoSave(state);
  }

  // Make state accessible
  return {
    get state() { return state; },
    init, switchMode, addCoins, showToast, updateCoinsDisplay,
    openCollection, closeCollection, showCollectionTab, openStats, closeStats,
    openSaveMenu, closeSaveMenu,
    getCurrentMode, openQuickMenu, closeQuickMenu,
    openUnlockMenu, submitPasscode, closeUnlockMenu,
    nextOnboardingStep, skipOnboarding
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
    try { GameAudio.stopMusic(); } catch (e) {}
    try { Particles.pause(); } catch (e) {}
  } else {
    // Resume music and particles for current mode
    const mode = Game.getCurrentMode();
    if (mode) {
      try { GameAudio.startMusic(mode); } catch (e) {}
    }
    try { Particles.resume(); } catch (e) {}
  }
});
