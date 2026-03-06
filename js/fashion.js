// ============================================================
// Hadley's Dream World — Fashion Studio
// ============================================================

const Fashion = (() => {
  let currentOutfit = { hair: null, top: null, bottom: null, dress: null, shoes: null, accessory: null, hat: null };
  let isChallenge = false;
  let challengeTheme = null;
  let timerInterval = null;
  let timeLeft = 60;
  let activeTab = 'hair';

  function init() {}

  function onEnter() {
    document.getElementById('fashion-main').classList.remove('hidden');
    document.getElementById('fashion-dressup').classList.add('hidden');
    document.getElementById('fashion-shop').classList.add('hidden');
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
          <span class="theme-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>
        </div>
      `;
    });
  }

  // --- Free Dress Mode ---
  function startFreeMode() {
    Audio.sfx.click();
    isChallenge = false;
    challengeTheme = null;
    resetOutfit();
    showDressup();
    document.getElementById('btn-submit-outfit').classList.add('hidden');
    document.getElementById('challenge-timer').classList.add('hidden');
    document.getElementById('challenge-theme-label').classList.add('hidden');
  }

  // --- Challenge Mode ---
  function startChallenge() {
    Audio.sfx.click();
    isChallenge = true;
    // Pick random theme
    challengeTheme = CHALLENGE_THEMES[Math.floor(Math.random() * CHALLENGE_THEMES.length)];
    resetOutfit();
    showDressup();
    document.getElementById('btn-submit-outfit').classList.remove('hidden');
    document.getElementById('challenge-timer').classList.remove('hidden');
    document.getElementById('challenge-theme-label').classList.remove('hidden');
    document.getElementById('challenge-theme-label').textContent = `${challengeTheme.icon} ${challengeTheme.name}`;

    // Start timer
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
    renderAvatar();
    renderWardrobeTabs();
    renderWardrobeItems();
  }

  function exitDressup() {
    Audio.sfx.click();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    document.getElementById('fashion-dressup').classList.add('hidden');
    document.getElementById('fashion-main').classList.remove('hidden');
    document.getElementById('challenge-timer').classList.remove('warning');
  }

  // --- Avatar Rendering ---
  function renderAvatar() {
    const el = document.getElementById('avatar-display');
    const o = currentOutfit;

    // Determine body color (torso/legs) from equipped items
    const topColor = o.top ? getItemColor(o.top) : (o.dress ? getItemColor(o.dress) : '#87CEEB');
    const bottomColor = o.bottom ? getItemColor(o.bottom) : (o.dress ? getItemColor(o.dress) : '#4169E1');
    const shoeColor = o.shoes ? getItemColor(o.shoes) : '#FFF';
    const hairColor = o.hair ? getItemColor(o.hair) : '#5C3317';

    el.innerHTML = `
      <!-- Hair back layer -->
      <div class="avatar-hair" style="width:70px;height:40px;background:${hairColor};border-radius:50% 50% 20% 20%;"></div>
      <!-- Head -->
      <div class="avatar-head"></div>
      <!-- Eyes -->
      <div class="avatar-eyes"><div class="avatar-eye"></div><div class="avatar-eye"></div></div>
      <!-- Mouth -->
      <div class="avatar-mouth"></div>
      <!-- Torso -->
      <div class="avatar-torso" style="background:${topColor};"></div>
      <!-- Legs -->
      <div class="avatar-legs">
        <div class="avatar-leg" style="background:${bottomColor};"></div>
        <div class="avatar-leg" style="background:${bottomColor};"></div>
      </div>
      <!-- Feet -->
      <div class="avatar-feet">
        <div class="avatar-foot" style="background:${shoeColor};"></div>
        <div class="avatar-foot" style="background:${shoeColor};"></div>
      </div>
      ${o.hat ? `<div class="avatar-hat" style="width:50px;height:20px;background:${getItemColor(o.hat)};border-radius:10px 10px 0 0;"></div>` : ''}
      ${o.accessory ? `<div class="avatar-accessory" style="width:12px;height:12px;background:${getItemColor(o.accessory)};border-radius:50%;box-shadow:0 0 6px ${getItemColor(o.accessory)};"></div>` : ''}
    `;
  }

  function getItemColor(itemId) {
    const item = FASHION_ITEMS.find(i => i.id === itemId);
    return item ? item.color : '#CCC';
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
      btn.onclick = () => { activeTab = cat; renderWardrobeTabs(); renderWardrobeItems(); Audio.sfx.click(); };
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
        <div class="item-preview" style="background:${item.color};"></div>
        <div>${item.name}</div>
      `;
      div.onclick = () => {
        if (currentOutfit[activeTab] === item.id) {
          currentOutfit[activeTab] = null; // Unequip
        } else {
          currentOutfit[activeTab] = item.id;
          // If equipping a dress, clear top+bottom; if equipping top/bottom, clear dress
          if (activeTab === 'dress') {
            currentOutfit.top = null;
            currentOutfit.bottom = null;
          } else if (activeTab === 'top' || activeTab === 'bottom') {
            currentOutfit.dress = null;
          }
        }
        Audio.sfx.equip();
        renderAvatar();
        renderWardrobeItems();
      };
      container.appendChild(div);
    });
  }

  function clearOutfit() {
    Audio.sfx.click();
    resetOutfit();
    renderAvatar();
    renderWardrobeItems();
  }

  // --- Challenge Scoring ---
  function submitChallenge() {
    if (!isChallenge || !challengeTheme) return;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    // Score the outfit
    let score = 0;
    let maxScore = 0;
    const equipped = Object.values(currentOutfit).filter(Boolean);

    // 1. Completeness (max 30 points): points per filled slot
    const slots = ['hair', 'shoes', 'accessory', 'hat'];
    const bodySlots = currentOutfit.dress ? ['dress'] : ['top', 'bottom'];
    const allSlots = [...slots, ...bodySlots];
    const filled = allSlots.filter(s => currentOutfit[s]).length;
    score += Math.round((filled / allSlots.length) * 30);
    maxScore += 30;

    // 2. Theme match (max 50 points): how many equipped items have matching tags
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

    // 3. Color coordination (max 20 points): check if colors are harmonious
    maxScore += 20;
    if (equipped.length >= 2) {
      // Simple: give points for having items, bonus if colors are similar
      score += Math.min(20, equipped.length * 4);
    }

    // Calculate stars (1-5)
    const pct = score / maxScore;
    let stars;
    if (pct >= 0.9) stars = 5;
    else if (pct >= 0.75) stars = 4;
    else if (pct >= 0.55) stars = 3;
    else if (pct >= 0.35) stars = 2;
    else stars = 1;

    // Bonus coins
    const coinReward = stars >= 4 ? 50 : stars >= 3 ? 30 : stars >= 2 ? 15 : 10;

    // Update state
    const prev = Game.state.fashion_scores[challengeTheme.id] || 0;
    if (stars > prev) Game.state.fashion_scores[challengeTheme.id] = stars;
    Game.addCoins(coinReward);
    Game.state.stats.challenges_completed++;
    SaveManager.autoSave(Game.state);

    // Show result
    showResult(stars, score, maxScore, coinReward);
  }

  function showResult(stars, score, maxScore, coins) {
    Audio.sfx.fanfare();
    document.getElementById('challenge-result').classList.remove('hidden');
    document.getElementById('challenge-result-title').textContent = `${challengeTheme.icon} ${challengeTheme.name}`;
    document.getElementById('challenge-score-text').textContent = `Score: ${score}/${maxScore}`;
    document.getElementById('challenge-coins-earned').textContent = `+${coins} coins 🪙`;

    const starsEl = document.getElementById('challenge-stars');
    starsEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '⭐';
      if (i < stars) {
        star.classList.add('earned');
        star.style.animationDelay = `${i * 0.15}s`;
      }
      starsEl.appendChild(star);
    }
  }

  function closeResult() {
    Audio.sfx.click();
    document.getElementById('challenge-result').classList.add('hidden');
    exitDressup();
  }

  // --- Shop ---
  let shopTab = 'hair';

  function openShop() {
    Audio.sfx.click();
    document.getElementById('fashion-main').classList.add('hidden');
    document.getElementById('fashion-shop').classList.remove('hidden');
    shopTab = 'hair';
    renderShopTabs();
    renderShopItems();
  }

  function closeShop() {
    Audio.sfx.click();
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
      btn.onclick = () => { shopTab = cat; renderShopTabs(); renderShopItems(); Audio.sfx.click(); };
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
        <div class="item-preview" style="background:${item.color};"></div>
        <div class="item-name">${item.name}</div>
        <div class="item-cost">${owned ? 'Owned' : `🪙 ${item.cost}`}</div>
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
    Audio.sfx.buy();
    Game.addCoins(-item.cost);
    Game.state.wardrobe_unlocked.push(item.id);
    SaveManager.autoSave(Game.state);
    renderShopItems();
    Game.showToast(`Bought ${item.name}!`);
  }

  function onExit() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  return { init, onEnter, onExit, startFreeMode, startChallenge, openShop, closeShop, clearOutfit, submitChallenge, exitDressup, closeResult };
})();
