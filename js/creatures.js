// ============================================================
// Hadley's Dream World — Creature World
// ============================================================

const CreatureWorld = (() => {
  let currentLocation = null;
  let catchAnimFrame = null;
  let catchState = null;
  let catchActive = false;
  let cooldowns = {}; // spotKey -> timestamp when available
  try {
    const savedCD = sessionStorage.getItem('creature-cooldowns');
    if (savedCD) {
      cooldowns = JSON.parse(savedCD);
      const now = Date.now();
      Object.keys(cooldowns).forEach(k => { if (cooldowns[k] <= now) delete cooldowns[k]; });
    }
  } catch (e) {}

  function saveCooldowns() {
    try { sessionStorage.setItem('creature-cooldowns', JSON.stringify(cooldowns)); } catch (e) {}
  }

  function sanitizeSVG(svgText) {
    let clean = svgText.replace(/<script[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    return clean;
  }

  const svgCache = new Map(); // creatureId -> svg text

  // Spot icons per location
  const SPOT_ICONS = {
    'sparkle-forest': ['🌳', '🍄', '🌸', '🪨', '🌿', '🦋'],
    'crystal-beach':  ['🐚', '🪸', '🌊', '🏝️', '⛱️', '🪨'],
    'cloud-garden':   ['☁️', '🌸', '🌈', '💫', '🦋'],
    'moon-cave':      ['🪨', '💎', '🌙', '🕯️', '✨'],
    'rainbow-meadow': ['🌻', '🌺', '🍀', '🌷', '🦋', '🌼']
  };

  function init() {
    renderLocations();
  }

  // Preload SVGs for a location's creatures
  function preloadSVGs(locationId) {
    const locCreatures = CREATURES.filter(c => c.location === locationId && c.svg);
    locCreatures.forEach(creature => {
      if (!svgCache.has(creature.id)) {
        fetch(creature.svg)
          .then(r => r.text())
          .then(text => svgCache.set(creature.id, text))
          .catch(() => {}); // Silently fail — canvas fallback still works
      }
    });
  }

  function renderLocations() {
    const grid = document.getElementById('location-grid');
    grid.innerHTML = '';
    LOCATIONS.forEach(loc => {
      const caught = Game.state.creatures.filter(id =>
        CREATURES.find(c => c.id === id && c.location === loc.id)
      ).length;
      const total = CREATURES.filter(c => c.location === loc.id).length;

      const card = document.createElement('div');
      card.className = 'location-card';
      card.dataset.loc = loc.id;
      card.style.background = loc.bg;
      card.innerHTML = `
        <div class="loc-icon">${loc.icon}</div>
        <div class="loc-name">${loc.name}</div>
        <div class="loc-count">${caught}/${total} caught</div>
      `;
      card.onclick = () => enterLocation(loc);
      grid.appendChild(card);
    });
  }

  function enterLocation(loc) {
    Audio.sfx.click();
    currentLocation = loc;
    document.getElementById('location-select').classList.add('hidden');
    const explore = document.getElementById('location-explore');
    explore.classList.remove('hidden');

    const scene = document.getElementById('location-scene');
    // Use illustrated scene if available, otherwise gradient
    if (loc.scene) {
      scene.style.background = loc.bg;
      scene.style.backgroundImage = `url('${loc.scene}')`;
      scene.style.backgroundSize = 'cover';
      scene.style.backgroundPosition = 'center bottom';
    } else {
      scene.style.background = loc.bg;
      scene.style.backgroundImage = '';
    }
    document.getElementById('location-name-display').textContent = loc.name;

    // Preload creature SVGs for this location
    preloadSVGs(loc.id);

    renderSpots();
  }

  function renderSpots() {
    const container = document.getElementById('explore-spots');
    container.innerHTML = '';
    const icons = SPOT_ICONS[currentLocation.id] || ['✨'];
    const spotCount = currentLocation.spots;

    for (let i = 0; i < spotCount; i++) {
      const spot = document.createElement('div');
      spot.className = 'explore-spot';
      const key = `${currentLocation.id}-${i}`;
      const now = Date.now();
      if (cooldowns[key] && cooldowns[key] > now) {
        spot.classList.add('on-cooldown');
        // Set timeout to re-enable
        setTimeout(() => {
          spot.classList.remove('on-cooldown');
        }, cooldowns[key] - now);
      }

      // Position spots semi-randomly but spread out
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 15 + col * 30 + (Math.sin(i * 2.5) * 10);
      const y = 10 + row * 35 + (Math.cos(i * 3.1) * 8);
      spot.style.left = `${x}%`;
      spot.style.top = `${y}%`;

      spot.innerHTML = `
        <div class="spot-glow"></div>
        ${icons[i % icons.length]}
      `;
      spot.onclick = () => discoverCreature(i, spot);
      container.appendChild(spot);
    }
  }

  function pickCreature() {
    // Get creatures for current location
    const locCreatures = CREATURES.filter(c => c.location === currentLocation.id);
    // Weighted random by rarity
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity;
    for (const [r, cfg] of Object.entries(RARITY)) {
      cumulative += cfg.chance;
      if (roll <= cumulative) { selectedRarity = r; break; }
    }
    // Filter by rarity
    const pool = locCreatures.filter(c => c.rarity === selectedRarity);
    if (pool.length === 0) {
      // Fallback to common
      const fallback = locCreatures.filter(c => c.rarity === 'common');
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function discoverCreature(spotIndex, spotEl) {
    if (spotEl.classList.contains('on-cooldown')) return;
    Audio.sfx.discover();

    const creature = pickCreature();
    startCatchGame(creature, spotIndex);
  }

  // --- Catch Mini-Game ---
  function startCatchGame(creature, spotIndex) {
    if (catchActive) return;
    catchActive = true;

    const overlay = document.getElementById('catch-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('catch-result').classList.add('hidden');

    document.getElementById('catch-creature-name').textContent = creature.name;
    const rarityEl = document.getElementById('catch-rarity');
    rarityEl.textContent = RARITY[creature.rarity].label;
    rarityEl.style.background = RARITY[creature.rarity].color;
    rarityEl.style.color = '#FFF';
    document.getElementById('catch-instruction').textContent = 'Tap when the circles align!';

    // Show creature SVG image if available
    const svgContainer = document.getElementById('catch-creature-svg');
    if (svgContainer) {
      if (svgCache.has(creature.id)) {
        svgContainer.innerHTML = sanitizeSVG(svgCache.get(creature.id));
        svgContainer.classList.remove('hidden');
      } else if (creature.svg) {
        // Try loading on-demand
        svgContainer.innerHTML = `<img src="${creature.svg}" alt="${creature.name}" style="width:100%;height:100%;">`;
        svgContainer.classList.remove('hidden');
      } else {
        svgContainer.innerHTML = '';
        svgContainer.classList.add('hidden');
      }
    }

    const canvas = document.getElementById('catch-canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 260 * dpr;
    canvas.height = 260 * dpr;
    canvas.style.width = '260px';
    canvas.style.height = '260px';
    const ctxC = canvas.getContext('2d');
    ctxC.scale(dpr, dpr);

    const cfg = RARITY[creature.rarity];
    const targetRadius = 50 * cfg.ringSize;
    const maxRadius = 120;
    let ringRadius = maxRadius;
    let caught = false;
    let tapped = false;
    const speed = 100 * cfg.ringSpeed; // pixels per second shrink rate
    let lastTime = performance.now();

    function drawCreatureCanvas(cx, cy) {
      // Fallback: draw a simple kawaii circle creature on canvas
      const c1 = creature.colors[0];
      const c2 = creature.colors[1];

      ctxC.beginPath();
      ctxC.arc(cx, cy, 30, 0, Math.PI * 2);
      ctxC.fillStyle = c1;
      ctxC.fill();
      ctxC.strokeStyle = c2;
      ctxC.lineWidth = 2;
      ctxC.stroke();

      ctxC.fillStyle = '#333';
      ctxC.beginPath();
      ctxC.arc(cx - 10, cy - 5, 4, 0, Math.PI * 2);
      ctxC.arc(cx + 10, cy - 5, 4, 0, Math.PI * 2);
      ctxC.fill();

      ctxC.fillStyle = '#FFF';
      ctxC.beginPath();
      ctxC.arc(cx - 8, cy - 7, 2, 0, Math.PI * 2);
      ctxC.arc(cx + 12, cy - 7, 2, 0, Math.PI * 2);
      ctxC.fill();

      ctxC.beginPath();
      ctxC.arc(cx, cy + 5, 6, 0, Math.PI);
      ctxC.strokeStyle = '#FF69B4';
      ctxC.lineWidth = 1.5;
      ctxC.stroke();

      ctxC.fillStyle = 'rgba(255,105,180,0.3)';
      ctxC.beginPath();
      ctxC.ellipse(cx - 18, cy + 2, 6, 4, 0, 0, Math.PI * 2);
      ctxC.ellipse(cx + 18, cy + 2, 6, 4, 0, 0, Math.PI * 2);
      ctxC.fill();
    }

    // Determine if SVG is shown (skip canvas creature drawing)
    const hasSVG = svgContainer && !svgContainer.classList.contains('hidden');

    function animate(now) {
      if (tapped) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      ringRadius -= speed * dt;
      if (ringRadius <= 0) {
        ringRadius = maxRadius; // Reset
      }

      const cx = 130, cy = 130;
      ctxC.clearRect(0, 0, 260, 260);

      // Target ring
      ctxC.beginPath();
      ctxC.arc(cx, cy, targetRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = 'rgba(255,255,255,0.4)';
      ctxC.lineWidth = 3;
      ctxC.stroke();

      // Shrinking ring
      ctxC.beginPath();
      ctxC.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      const diff = Math.abs(ringRadius - targetRadius);
      const color = diff < 8 ? '#4CAF50' : diff < 20 ? '#FFC107' : '#F44336';
      ctxC.strokeStyle = color;
      ctxC.lineWidth = 4;
      ctxC.stroke();

      // Only draw canvas creature if no SVG overlay
      if (!hasSVG) {
        drawCreatureCanvas(cx, cy);
      }

      catchAnimFrame = requestAnimationFrame(animate);
    }

    function onTap() {
      if (tapped) return;
      tapped = true;
      cancelAnimationFrame(catchAnimFrame);
      canvas.removeEventListener('click', onTap);
      canvas.removeEventListener('touchstart', onTouchTap, { passive: false });

      const diff = Math.abs(ringRadius - targetRadius);
      let result;
      if (diff < 8) {
        result = 'perfect';
      } else if (diff < 20) {
        result = 'good';
      } else {
        result = 'miss';
      }

      handleCatchResult(result, creature, spotIndex);
    }

    function onTouchTap(e) { e.preventDefault(); onTap(); }

    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', onTouchTap, { passive: false });

    catchAnimFrame = requestAnimationFrame(animate);
  }

  function handleCatchResult(result, creature, spotIndex) {
    const resultEl = document.getElementById('catch-result');
    const resultText = document.getElementById('catch-result-text');
    document.getElementById('catch-instruction').textContent = '';

    if (result === 'miss') {
      Audio.sfx.catchMiss();
      resultText.innerHTML = `${creature.name} escaped! 💨<br><span style="font-size:0.6em">Try again!</span>`;
      resultEl.classList.remove('hidden');
      // Short cooldown
      const key = `${currentLocation.id}-${spotIndex}`;
      cooldowns[key] = Date.now() + 5000;
      saveCooldowns();
      catchActive = false;
      return;
    }

    // Catch success!
    const isNew = !Game.state.creatures.includes(creature.id);
    let coins = creature.coins;
    if (result === 'perfect') coins = Math.floor(coins * 1.5);

    Audio.sfx.catchSuccess();

    if (isNew) {
      Game.state.creatures.push(creature.id);
    }
    Game.addCoins(coins);
    Game.state.stats.total_caught++;

    const perfectLabel = result === 'perfect' ? '⭐ PERFECT! ' : '';
    const newLabel = isNew ? '✨ NEW! ' : '';
    resultText.innerHTML = `
      ${perfectLabel}${newLabel}Caught!<br>
      <span style="font-size:0.8em">${creature.name}</span><br>
      <span style="font-size:0.7em;color:var(--gold)">+${coins} coins</span>
    `;
    resultEl.classList.remove('hidden');

    // Set cooldown
    const key = `${currentLocation.id}-${spotIndex}`;
    cooldowns[key] = Date.now() + RARITY[creature.rarity].cooldown;
    saveCooldowns();

    SaveManager.autoSave(Game.state);
    catchActive = false;
  }

  function closeCatch() {
    catchActive = false;
    Audio.sfx.click();
    document.getElementById('catch-overlay').classList.add('hidden');
    // Hide creature SVG
    const svgContainer = document.getElementById('catch-creature-svg');
    if (svgContainer) {
      svgContainer.innerHTML = '';
      svgContainer.classList.add('hidden');
    }
    cancelAnimationFrame(catchAnimFrame);
    renderSpots(); // Refresh cooldown states
  }

  function backToLocations() {
    Audio.sfx.click();
    currentLocation = null;
    document.getElementById('location-explore').classList.add('hidden');
    document.getElementById('location-select').classList.remove('hidden');
    renderLocations(); // Refresh counts
  }

  function onEnter() {
    document.getElementById('location-select').classList.remove('hidden');
    document.getElementById('location-explore').classList.add('hidden');
    document.getElementById('catch-overlay').classList.add('hidden');
    renderLocations();
  }

  // Expose svgCache for collection modal
  function getSvgCache() { return svgCache; }

  return { init, onEnter, backToLocations, closeCatch, getSvgCache, sanitizeSVG };
})();
