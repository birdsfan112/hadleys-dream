// ============================================================
// Hadley's Dream — Fashion Studio
// ============================================================

const Fashion = (() => {
  let currentOutfit = { hair: null, top: null, bottom: null, dress: null, shoes: null, accessory: null, hat: null };
  let isChallenge = false;
  let challengeTheme = null;
  let timerInterval = null;
  let timeLeft = 60;
  let activeTab = 'hair';

  // SVG cache: itemId or 'avatar-base' -> SVG string
  const svgCache = {};

  function init() {
    preloadSVGs();
  }

  // Preload the base avatar and all unlocked item SVGs
  function preloadSVGs() {
    fetchSVG('avatar-base', 'assets/fashion/avatar-base.svg');
    FASHION_ITEMS.forEach(item => {
      if (item.svg) fetchSVG(item.id, item.svg);
    });
  }

  function fetchSVG(id, url) {
    if (svgCache[id]) return Promise.resolve(svgCache[id]);
    return fetch(url)
      .then(r => { if (!r.ok) console.warn('SVG fetch failed:', id, url, r.status); return r.ok ? r.text() : ''; })
      .then(text => {
        svgCache[id] = sanitizeSVG(text);
        if (!svgCache[id]) console.warn('SVG sanitize returned empty for:', id);
        refreshVisiblePanels();
        return svgCache[id];
      })
      .catch(e => { console.warn('SVG fetch error:', id, e); svgCache[id] = ''; });
  }

  let refreshTimeout = null;
  function refreshVisiblePanels() {
    if (refreshTimeout) return;
    refreshTimeout = setTimeout(() => {
      refreshTimeout = null;
      const dressup = document.getElementById('fashion-dressup');
      const shop = document.getElementById('fashion-shop');
      if (dressup && !dressup.classList.contains('hidden')) renderWardrobeItems();
      if (shop && !shop.classList.contains('hidden')) renderShopItems();
    }, 150);
  }

  // Parse SVG, separate defs/style from content groups
  // Returns { defs: string, groups: string } where defs has <defs>+<style>, groups has everything else
  function sanitizeSVG(raw) {
    if (!raw) return '';
    const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return '';
    let defs = '';
    let groups = '';
    const ser = new XMLSerializer();
    for (const child of svg.children) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'defs' || tag === 'style') {
        defs += ser.serializeToString(child);
      } else {
        groups += ser.serializeToString(child);
      }
    }
    return JSON.stringify({ defs, groups });
  }

  // Parse cached entry back into { defs, groups }
  function parseCached(itemId) {
    const raw = svgCache[itemId];
    if (!raw) return { defs: '', groups: '' };
    try { return JSON.parse(raw); } catch (e) { return { defs: '', groups: '' }; }
  }

  // Extract a specific group from cached SVG groups content
  function getSVGGroup(itemId, groupId) {
    const { groups } = parseCached(itemId);
    if (!groups) return '';
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapper.innerHTML = groups;
    const g = wrapper.querySelector('#' + groupId);
    return g ? new XMLSerializer().serializeToString(g) : '';
  }

  // Get all defs+style from a cached item
  function getSVGDefs(itemId) {
    return parseCached(itemId).defs || '';
  }

  // Get full groups content (no defs/style — those go separately)
  function getSVGContent(itemId) {
    return parseCached(itemId).groups || '';
  }

  function onEnter() {
    document.getElementById('fashion-main').classList.remove('hidden');
    document.getElementById('fashion-dressup').classList.add('hidden');
    document.getElementById('fashion-shop').classList.add('hidden');
    document.getElementById('fashion-album').classList.add('hidden');
    document.getElementById('challenge-result').classList.add('hidden');
    renderScores();
  }

  function renderScores() {
    const el = document.getElementById('fashion-recent');
    const scores = Game.state.fashion_scores;
    const entries = Object.entries(scores);
    if (entries.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px;">Complete challenges to see your scores!</p>';
      return;
    }
    el.innerHTML = '<h3>Your Best Scores</h3>';
    entries.forEach(([themeId, stars]) => {
      const theme = CHALLENGE_THEMES.find(t => t.id === themeId);
      if (!theme) return;
      el.innerHTML += `
        <div class="score-row">
          <span class="theme-name">${theme.icon} ${theme.name}</span>
          <span class="theme-stars">${'\u2605'.repeat(stars)}${'\u2606'.repeat(5 - stars)}</span>
        </div>
      `;
    });
  }

  // --- Free Dress Mode ---
  function startFreeMode() {
    GameAudio.sfx.click();
    isChallenge = false;
    challengeTheme = null;
    resetOutfit();
    showDressup();
    document.getElementById('btn-submit-outfit').classList.add('hidden');
    document.getElementById('btn-save-outfit').classList.remove('hidden');
    document.getElementById('challenge-timer').classList.add('hidden');
    document.getElementById('challenge-theme-label').classList.add('hidden');
    document.querySelector('.dressup-actions').classList.remove('challenge-mode');
  }

  // --- Challenge Mode ---
  function startChallenge() {
    GameAudio.sfx.click();
    isChallenge = true;
    challengeTheme = CHALLENGE_THEMES[Math.floor(Math.random() * CHALLENGE_THEMES.length)];
    resetOutfit();
    showDressup();
    document.getElementById('btn-submit-outfit').classList.remove('hidden');
    document.getElementById('btn-save-outfit').classList.add('hidden');
    document.querySelector('.dressup-actions').classList.add('challenge-mode');
    document.getElementById('challenge-timer').classList.remove('hidden');
    document.getElementById('challenge-theme-label').classList.remove('hidden');
    document.getElementById('challenge-theme-label').textContent = `${challengeTheme.icon} ${challengeTheme.name}`;

    timeLeft = 60;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 10) {
        document.getElementById('challenge-timer').classList.add('warning');
      }
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        submitChallenge();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    document.getElementById('timer-display').textContent = timeLeft;
  }

  function resetOutfit() {
    currentOutfit = { hair: null, top: null, bottom: null, dress: null, shoes: null, accessory: null, hat: null };
  }

  function showDressup() {
    document.getElementById('fashion-main').classList.add('hidden');
    document.getElementById('fashion-dressup').classList.remove('hidden');
    // Reset wardrobe tab to first category each time
    activeTab = 'hair';
    renderAvatar();
    renderWardrobeTabs();
    renderWardrobeItems();
  }

  function exitDressup() {
    if (isChallenge) {
      if (!confirm('Leave without submitting? Your outfit won\'t be scored.')) return;
    }
    GameAudio.sfx.click();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    document.querySelector('.dressup-actions').classList.remove('challenge-mode');
    document.getElementById('fashion-dressup').classList.add('hidden');
    document.getElementById('fashion-main').classList.remove('hidden');
    document.getElementById('challenge-timer').classList.remove('warning');
  }

  // --- Avatar Rendering (SVG layers) ---
  // Shared layering logic: builds SVG string from an outfit object
  function buildAvatarSVG(o) {
    let allDefs = getSVGDefs('avatar-base');
    Object.values(o).filter(Boolean).forEach(id => { allDefs += getSVGDefs(id); });

    let layers = '';
    if (o.hair) { const b = getSVGGroup(o.hair, 'back-layer'); if (b) layers += b; }
    if (o.accessory) { const b = getSVGGroup(o.accessory, 'back-layer'); if (b) layers += b; }
    if (!o.dress && o.top) { const b = getSVGGroup(o.top, 'back-layer'); if (b) layers += b; }
    layers += getSVGContent('avatar-base');
    if (o.dress) { layers += getSVGGroup(o.dress, 'clothing') || getSVGContent(o.dress); }
    else if (o.bottom) { layers += getSVGGroup(o.bottom, 'clothing') || getSVGContent(o.bottom); }
    if (!o.dress && o.top) { layers += getSVGGroup(o.top, 'clothing') || getSVGContent(o.top); }
    if (o.shoes) { layers += getSVGGroup(o.shoes, 'clothing') || getSVGContent(o.shoes); }
    if (o.hair) { const f = getSVGGroup(o.hair, 'clothing'); if (f) layers += f; }
    if (o.hat) { layers += getSVGGroup(o.hat, 'clothing') || getSVGContent(o.hat); }
    if (o.accessory) { const f = getSVGGroup(o.accessory, 'clothing'); if (f) layers += f; }

    return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">${allDefs}${layers}</svg>`;
  }

  let avatarRetries = 0;
  function renderAvatar() {
    const el = document.getElementById('avatar-display');
    if (!svgCache['avatar-base']) {
      if (avatarRetries++ > 25) { el.innerHTML = '<p style="color:#aaa;font-size:0.8em;">Could not load avatar</p>'; return; }
      el.innerHTML = '<p style="color:#aaa;font-size:0.8em;">Loading...</p>';
      setTimeout(renderAvatar, 200);
      return;
    }
    avatarRetries = 0;
    el.innerHTML = buildAvatarSVG(currentOutfit);
  }

  // --- Wardrobe ---
  function renderWardrobeTabs() {
    const tabs = document.getElementById('wardrobe-tabs');
    const catLabels = { hair: 'Hair', top: 'Top', bottom: 'Bottom', dress: 'Dress', shoes: 'Shoes', accessory: 'Acc', hat: 'Hat' };
    tabs.innerHTML = '';
    FASHION_CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `wardrobe-tab${cat === activeTab ? ' active' : ''}`;
      btn.textContent = catLabels[cat] || cat;
      btn.onclick = () => { activeTab = cat; renderWardrobeTabs(); renderWardrobeItems(); GameAudio.sfx.click(); };
      tabs.appendChild(btn);
    });
  }

  function renderWardrobeItems() {
    const container = document.getElementById('wardrobe-items');
    container.innerHTML = '';
    const unlocked = Game.state.wardrobe_unlocked;
    const items = FASHION_ITEMS.filter(i => i.cat === activeTab && unlocked.includes(i.id));

    if (items.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888;font-size:0.8em;padding:20px;">Visit the shop!</p>';
      return;
    }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `wardrobe-item${currentOutfit[activeTab] === item.id ? ' equipped' : ''}`;
      div.innerHTML = `
        <div class="item-preview">${buildThumbnail(item)}</div>
        <div>${item.name}</div>
      `;
      div.onclick = () => {
        if (currentOutfit[activeTab] === item.id) {
          currentOutfit[activeTab] = null;
        } else {
          currentOutfit[activeTab] = item.id;
          if (activeTab === 'dress') {
            currentOutfit.top = null;
            currentOutfit.bottom = null;
          } else if (activeTab === 'top' || activeTab === 'bottom') {
            currentOutfit.dress = null;
          }
        }
        GameAudio.sfx.equip();
        renderAvatar();
        renderWardrobeItems();
      };
      container.appendChild(div);
    });
  }

  // Build SVG thumbnail for wardrobe/shop items
  function buildThumbnail(item) {
    if (svgCache[item.id]) {
      const { defs, groups } = parseCached(item.id);
      return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">${defs}${groups}</svg>`;
    }
    // SVG still loading — show placeholder (refreshVisiblePanels will re-render when ready)
    if (item.svg) {
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.7em;">...</div>`;
    }
    // Fallback: colored square (for items without SVG)
    const color = item.color || '#CCC';
    return `<div style="width:100%;height:100%;background:${color};border-radius:6px;"></div>`;
  }

  function clearOutfit() {
    GameAudio.sfx.click();
    resetOutfit();
    renderAvatar();
    renderWardrobeItems();
  }

  // --- Challenge Scoring ---
  function submitChallenge() {
    if (!isChallenge || !challengeTheme) return;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    let score = 0;
    let maxScore = 0;
    const equipped = Object.values(currentOutfit).filter(Boolean);

    // 1. Completeness (max 30)
    const slots = ['hair', 'shoes', 'accessory', 'hat'];
    const bodySlots = currentOutfit.dress ? ['dress'] : ['top', 'bottom'];
    const allSlots = [...slots, ...bodySlots];
    const filled = allSlots.filter(s => currentOutfit[s]).length;
    score += Math.round((filled / allSlots.length) * 30);
    maxScore += 30;

    // 2. Theme match (max 50)
    maxScore += 50;
    if (equipped.length > 0) {
      let tagMatches = 0;
      equipped.forEach(itemId => {
        const item = FASHION_ITEMS.find(i => i.id === itemId);
        if (item) {
          const overlap = item.tags.filter(t => challengeTheme.tags.includes(t)).length;
          if (overlap > 0) tagMatches++;
        }
      });
      score += Math.round((tagMatches / equipped.length) * 50);
    }

    // 3. Color coordination (max 20)
    maxScore += 20;
    if (equipped.length >= 2) {
      score += Math.min(20, equipped.length * 4);
    }

    const pct = score / maxScore;
    let stars;
    if (pct >= 0.9) stars = 5;
    else if (pct >= 0.75) stars = 4;
    else if (pct >= 0.55) stars = 3;
    else if (pct >= 0.35) stars = 2;
    else stars = 1;

    const coinReward = stars >= 4 ? 50 : stars >= 3 ? 30 : stars >= 2 ? 15 : 10;

    const prev = Game.state.fashion_scores[challengeTheme.id] || 0;
    if (stars > prev) Game.state.fashion_scores[challengeTheme.id] = stars;
    Game.addCoins(coinReward);
    Game.state.stats.challenges_completed++;
    SaveManager.autoSave(Game.state);

    showResult(stars, score, maxScore, coinReward);
  }

  function showResult(stars, score, maxScore, coins) {
    GameAudio.sfx.fanfare();
    document.getElementById('challenge-result').classList.remove('hidden');
    document.getElementById('challenge-result-title').textContent = `${challengeTheme.icon} ${challengeTheme.name}`;
    document.getElementById('challenge-score-text').textContent = `Score: ${score}/${maxScore}`;
    document.getElementById('challenge-coins-earned').textContent = `+${coins} coins`;

    const starsEl = document.getElementById('challenge-stars');
    starsEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '\u2B50';
      if (i < stars) {
        star.classList.add('earned');
        star.style.animationDelay = `${i * 0.15}s`;
      }
      starsEl.appendChild(star);
    }
  }

  function closeResult() {
    GameAudio.sfx.click();
    document.getElementById('challenge-result').classList.add('hidden');
    isChallenge = false;
    exitDressup();
  }

  // --- Shop ---
  let shopTab = 'hair';

  function openShop() {
    GameAudio.sfx.click();
    document.getElementById('fashion-main').classList.add('hidden');
    document.getElementById('fashion-shop').classList.remove('hidden');
    shopTab = 'hair';
    renderShopTabs();
    renderShopItems();
  }

  function closeShop() {
    GameAudio.sfx.click();
    document.getElementById('fashion-shop').classList.add('hidden');
    document.getElementById('fashion-main').classList.remove('hidden');
  }

  function renderShopTabs() {
    const tabs = document.getElementById('shop-tabs');
    const catLabels = { hair: 'Hair', top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', shoes: 'Shoes', accessory: 'Acc', hat: 'Hats' };
    tabs.innerHTML = '';
    FASHION_CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `shop-tab${cat === shopTab ? ' active' : ''}`;
      btn.textContent = catLabels[cat] || cat;
      btn.onclick = () => { shopTab = cat; renderShopTabs(); renderShopItems(); GameAudio.sfx.click(); };
      tabs.appendChild(btn);
    });
  }

  function renderShopItems() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const items = FASHION_ITEMS.filter(i => i.cat === shopTab && i.cost > 0);

    items.forEach(item => {
      const owned = Game.state.wardrobe_unlocked.includes(item.id);
      const canAfford = Game.state.coins >= item.cost;
      const div = document.createElement('div');
      div.className = `shop-item${owned ? ' owned' : ''}`;
      div.innerHTML = `
        <div class="item-preview">${buildThumbnail(item)}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-cost">${owned ? 'Owned' : '\uD83E\uDE99 ' + item.cost}</div>
      `;
      if (!owned) {
        div.onclick = () => buyItem(item);
        if (!canAfford) div.style.opacity = '0.5';
      }
      grid.appendChild(div);
    });
  }

  function buyItem(item) {
    if (Game.state.coins < item.cost) {
      Game.showToast('Not enough coins!');
      return;
    }
    GameAudio.sfx.buy();
    Game.addCoins(-item.cost);
    Game.state.wardrobe_unlocked.push(item.id);
    SaveManager.autoSave(Game.state);
    renderShopItems();
    Game.showToast(`Bought ${item.name}!`);
  }

  // --- Photo Album ---
  const MAX_OUTFITS = 12;

  function renderMiniAvatar(outfitItems) {
    if (!svgCache['avatar-base']) return '<p style="color:#aaa;font-size:0.7em;">...</p>';
    return buildAvatarSVG(outfitItems);
  }

  function saveOutfit() {
    GameAudio.sfx.click();
    const outfits = Game.state.saved_outfits;
    if (outfits.length >= MAX_OUTFITS) {
      Game.showToast('Album is full! Delete an outfit first.');
      return;
    }
    // Check if at least one item is equipped
    const hasItem = Object.values(currentOutfit).some(Boolean);
    if (!hasItem) {
      Game.showToast('Put on some clothes first!');
      return;
    }
    outfits.push({ items: { ...currentOutfit }, timestamp: Date.now() });
    SaveManager.autoSave(Game.state);
    Game.showToast('Outfit saved!');
    try { GameAudio.sfx.fanfare(); } catch (e) {}
  }

  function openAlbum() {
    GameAudio.sfx.click();
    document.getElementById('fashion-main').classList.add('hidden');
    document.getElementById('fashion-album').classList.remove('hidden');
    renderAlbum();
  }

  function closeAlbum() {
    GameAudio.sfx.click();
    document.getElementById('fashion-album').classList.add('hidden');
    document.getElementById('fashion-main').classList.remove('hidden');
  }

  function renderAlbum() {
    const grid = document.getElementById('album-grid');
    const empty = document.getElementById('album-empty');
    const outfits = Game.state.saved_outfits;

    grid.innerHTML = '';
    if (!outfits || outfits.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    outfits.forEach((outfit, idx) => {
      const cell = document.createElement('div');
      cell.className = 'album-cell';
      cell.innerHTML = `
        <button class="album-delete" onclick="event.stopPropagation(); Fashion.deleteOutfit(${idx});">&times;</button>
        <div class="album-preview">${renderMiniAvatar(outfit.items)}</div>
      `;
      cell.onclick = () => loadOutfit(idx);
      grid.appendChild(cell);
    });
  }

  function loadOutfit(index) {
    GameAudio.sfx.click();
    const outfits = Game.state.saved_outfits;
    if (index < 0 || index >= outfits.length) return;
    const saved = outfits[index];
    // Strip item IDs that no longer exist in FASHION_ITEMS
    const cleaned = { ...saved.items };
    const validIds = FASHION_ITEMS.map(i => i.id);
    for (const slot in cleaned) {
      if (cleaned[slot] && !validIds.includes(cleaned[slot])) cleaned[slot] = null;
    }
    currentOutfit = cleaned;
    isChallenge = false;
    challengeTheme = null;
    document.getElementById('fashion-album').classList.add('hidden');
    showDressup();
    document.getElementById('btn-submit-outfit').classList.add('hidden');
    document.getElementById('btn-save-outfit').classList.remove('hidden');
    document.getElementById('challenge-timer').classList.add('hidden');
    document.getElementById('challenge-theme-label').classList.add('hidden');
  }

  function deleteOutfit(index) {
    if (!confirm('Delete this outfit?')) return;
    GameAudio.sfx.click();
    const outfits = Game.state.saved_outfits;
    if (index < 0 || index >= outfits.length) return;
    outfits.splice(index, 1);
    SaveManager.autoSave(Game.state);
    renderAlbum();
    Game.showToast('Outfit deleted.');
  }

  function onExit() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // Build avatar SVG from a given outfit (for use by other modules)
  function getAvatarSVG(outfit) {
    if (!svgCache['avatar-base']) return '';
    return buildAvatarSVG(outfit || {});
  }

  return { init, onEnter, onExit, startFreeMode, startChallenge, openShop, closeShop, clearOutfit, submitChallenge, exitDressup, closeResult, openAlbum, closeAlbum, saveOutfit, loadOutfit, deleteOutfit, getAvatarSVG };
})();
