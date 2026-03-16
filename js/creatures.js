// ============================================================
// Hadley's Dream — Creature World
// ============================================================

const CreatureWorld = (() => {
  let currentLocation = null;
  let catchAnimFrame = null;
  let effectAnimFrames = [];
  let catchState = null;
  let catchActive = false;
  let legendaryEscapeUsed = false; // tracks whether the legendary has already used its escape power this encounter
  let legendaryEscapeTimeout = null;
  let practiceTimeout = null;
  let cooldowns = {}; // spotKey -> timestamp when available
  let spotCreatures = []; // pre-assigned creature per spot index
  let spotCooldownTimeouts = []; // timeout IDs for cooldown-expiry re-rolls
  let parallaxMoveHandler = null;
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

  // Camouflage spot icons per location — blend into the scene
  const SPOT_ICONS = {
    'sparkle-forest': ['🌿', '🍃', '🪨', '🌳', '🍂', '🌱', '🪵', '🌳'],
    'crystal-beach':  ['🐚', '🪨', '🌊', '🪸', '🏝️', '🐚', '🪨', '🌊'],
    'cloud-garden':   ['☁️', '💨', '🌸', '☁️', '🌿', '💨', '☁️', '🌸'],
    'moon-cave':      ['🪨', '💎', '🌑', '🪨', '🕳️', '💎', '🪨', '🌑'],
    'rainbow-meadow': ['🌱', '🍀', '🌿', '🪨', '🌱', '🍀', '🌾', '🌿'],
    'dream-nexus':    ['🌀', '✨', '💫', '🌀', '⭐', '✨', '💫', '⭐']
  };

  function init() {
    renderLocations();
  }

  // Preload SVGs for a location's creatures
  function preloadSVGs(locationId) {
    const locCreatures = CREATURES.filter(c => c.location === locationId && c.svg && c.svg.endsWith('.svg'));
    locCreatures.forEach(creature => {
      if (!svgCache.has(creature.id)) {
        fetch(creature.svg)
          .then(r => r.text())
          .then(text => svgCache.set(creature.id, text))
          .catch(e => console.warn('SVG load failed:', creature.id, e));
      }
    });
  }

  // Check whether the secret Dream Nexus is unlocked
  // Requires catching all legendary creatures from the 5 main locations
  function dreamNexusUnlocked() {
    const caught = Game.state.creatures || [];
    const mainLegendaries = CREATURES.filter(c =>
      c.rarity === 'legendary' && c.location !== 'dream-nexus'
    );
    return mainLegendaries.every(c => caught.includes(c.id));
  }

  function renderLocations() {
    const grid = document.getElementById('location-grid');
    grid.innerHTML = '';
    LOCATIONS.forEach(loc => {
      // Hide secret locations until unlocked
      if (loc.secret && !dreamNexusUnlocked()) return;

      const caught = Game.state.creatures.filter(id =>
        CREATURES.find(c => c.id === id && c.location === loc.id)
      ).length;
      const total = CREATURES.filter(c => c.location === loc.id).length;

      const card = document.createElement('div');
      card.className = 'location-card';
      if (loc.secret) card.classList.add('location-card-secret');
      card.dataset.loc = loc.id;
      card.style.background = loc.bg;
      const unlocked = legendariesUnlocked(loc.id);
      card.innerHTML = `
        <div class="loc-icon">${loc.icon}</div>
        <div class="loc-name">${loc.name}</div>
        <div class="loc-count">${caught}/${total} caught</div>
        ${loc.secret ? '<div class="loc-legendary-badge">Secret Area</div>' : ''}
        ${!loc.secret && unlocked ? '<div class="loc-legendary-badge">Legendary unlocked</div>' : ''}
      `;
      card.onclick = () => enterLocation(loc);
      grid.appendChild(card);
    });
  }

  function enterLocation(loc) {
    GameAudio.sfx.click();
    currentLocation = loc;
    // Save last location
    Game.state.last_location = loc.id;
    SaveManager.autoSave(Game.state);

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

    // Initialize particle system for this location
    Particles.init(loc.id);

    // Setup parallax touch interaction
    setupParallax();

    // Update catch progress counter
    updateCatchProgress();

    // Show fashion avatar in the scene
    renderExploreAvatar();

    renderSpots();
  }

  // Check whether legendary creatures are unlocked for a location
  // Requires all common creatures in that location to be caught first
  function legendariesUnlocked(locationId) {
    // Dream Nexus legendaries are always available (the location itself is gated)
    if (locationId === 'dream-nexus') return true;
    const caught = Game.state.creatures || [];
    const commons = CREATURES.filter(c => c.location === locationId && c.rarity === 'common');
    return commons.every(c => caught.includes(c.id));
  }

  // Pick a creature for a spot, avoiding duplicates already assigned to other spots
  function pickCreatureForSpot(usedIds) {
    const locCreatures = CREATURES.filter(c => c.location === currentLocation.id);
    const caught = Game.state.creatures || [];

    // Check if this is a legendary-only location (e.g. Dream Nexus)
    const allLegendary = locCreatures.length > 0 && locCreatures.every(c => c.rarity === 'legendary');

    let pool;
    if (allLegendary) {
      // Skip rarity roll entirely — all creatures here are always available
      pool = locCreatures.filter(c => !usedIds.has(c.id));
      if (pool.length === 0) pool = locCreatures;
    } else {
      // Weighted random by rarity
      const roll = Math.random();
      let cumulative = 0;
      let selectedRarity;
      for (const [r, cfg] of Object.entries(RARITY)) {
        cumulative += cfg.chance;
        if (roll <= cumulative) { selectedRarity = r; break; }
      }
      if (!selectedRarity) selectedRarity = 'common';

      // Legendaries only appear once all commons in this area are caught
      if (selectedRarity === 'legendary' && !legendariesUnlocked(currentLocation.id)) {
        selectedRarity = 'common';
      }

      // Filter by rarity, then remove already-used creatures
      pool = locCreatures.filter(c => c.rarity === selectedRarity && !usedIds.has(c.id));
      if (pool.length === 0) {
        // Fallback: try same rarity but allow duplicates
        pool = locCreatures.filter(c => c.rarity === selectedRarity);
      }
      if (pool.length === 0) {
        // Fallback: any creature at this location
        pool = locCreatures.filter(c => !usedIds.has(c.id));
      }
      if (pool.length === 0) {
        pool = locCreatures;
      }
    }

    // Smart weighting: uncaught creatures get 4x the weight
    const weighted = [];
    pool.forEach(c => {
      const weight = caught.includes(c.id) ? 1 : 4;
      for (let i = 0; i < weight; i++) weighted.push(c);
    });

    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  // Inject a silhouette SVG thumbnail into a spot element
  function setSpotSilhouette(spot, creature) {
    const rarityColor = RARITY[creature.rarity].color;
    spot.dataset.rarity = creature.rarity;
    spot.style.setProperty('--rarity-color', rarityColor);

    let silhouetteHTML = '';
    if (svgCache.has(creature.id)) {
      silhouetteHTML = `<div class="spot-silhouette">${sanitizeSVG(svgCache.get(creature.id))}</div>`;
    } else if (creature.svg) {
      silhouetteHTML = `<div class="spot-silhouette"><img src="${creature.svg}" alt="" style="width:100%;height:100%;" onerror="this.parentElement.innerHTML='?'"></div>`;
    } else {
      // Fallback: use the location emoji icon
      const icons = SPOT_ICONS[currentLocation.id] || ['✨'];
      silhouetteHTML = icons[0];
    }

    spot.innerHTML = `<div class="spot-hint"></div>${silhouetteHTML}`;
  }

  function renderSpots() {
    const container = document.getElementById('explore-spots');
    container.innerHTML = '';
    const spotCount = currentLocation.spots;

    // Clear any pending cooldown re-roll timeouts from a previous render
    spotCooldownTimeouts.forEach(id => clearTimeout(id));
    spotCooldownTimeouts = [];

    // Pre-assign a creature to each spot
    spotCreatures = [];
    const usedIds = new Set();
    for (let i = 0; i < spotCount; i++) {
      const creature = pickCreatureForSpot(usedIds);
      spotCreatures.push(creature);
      if (creature) usedIds.add(creature.id);
    }

    for (let i = 0; i < spotCount; i++) {
      const spot = document.createElement('div');
      spot.className = 'explore-spot';
      const key = `${currentLocation.id}-${i}`;
      const now = Date.now();
      if (cooldowns[key] && cooldowns[key] > now) {
        spot.classList.add('on-cooldown');
        // When cooldown expires, re-roll and refresh this spot's creature
        const cooldownRemaining = cooldowns[key] - now;
        ((spotIndex, spotEl) => {
          const tid = setTimeout(() => {
            spotEl.classList.remove('on-cooldown');
            // Re-roll creature for this spot
            const currentUsed = new Set(spotCreatures.filter((c, j) => c && j !== spotIndex).map(c => c.id));
            const newCreature = pickCreatureForSpot(currentUsed);
            spotCreatures[spotIndex] = newCreature;
            if (newCreature) setSpotSilhouette(spotEl, newCreature);
          }, cooldownRemaining);
          spotCooldownTimeouts.push(tid);
        })(i, spot);
      }

      // Spread spots across the scene with more variety
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 8 + col * 22 + (Math.sin(i * 2.7 + 1.3) * 8);
      const y = 8 + row * 38 + (Math.cos(i * 3.4 + 0.7) * 10);
      spot.style.left = `${x}%`;
      spot.style.top = `${y}%`;

      // Some spots appear after a delay (harder to find)
      if (i >= spotCount - 2) {
        spot.classList.add('delayed');
        const delay = 2 + i * 0.5;
        spot.style.animationDelay = `${delay}s`;
        // Enable clicks only after spot finishes revealing (delay + 0.6s animation)
        const tid = setTimeout(() => spot.classList.add('revealed'), (delay + 0.6) * 1000);
        spotCooldownTimeouts.push(tid);
      }

      // Set silhouette content
      if (spotCreatures[i]) {
        setSpotSilhouette(spot, spotCreatures[i]);
      } else {
        const icons = SPOT_ICONS[currentLocation.id] || ['✨'];
        spot.innerHTML = `<div class="spot-hint"></div>${icons[i % icons.length]}`;
      }

      spot.onclick = () => discoverCreature(i, spot);
      container.appendChild(spot);
    }
  }

  // Fallback creature picker (delegates to pickCreatureForSpot)
  function pickCreature() {
    const locCreatures = CREATURES.filter(c => c.location === currentLocation.id);
    const caught = Game.state.creatures || [];

    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity;
    for (const [r, cfg] of Object.entries(RARITY)) {
      cumulative += cfg.chance;
      if (roll <= cumulative) { selectedRarity = r; break; }
    }
    if (!selectedRarity) selectedRarity = 'common';

    if (selectedRarity === 'legendary' && !legendariesUnlocked(currentLocation.id)) {
      selectedRarity = 'common';
    }

    let pool = locCreatures.filter(c => c.rarity === selectedRarity);
    if (pool.length === 0) {
      // Fallback: any creature at this location (handles legendary-only locations like Dream Nexus)
      pool = locCreatures;
    }

    const weighted = [];
    pool.forEach(c => {
      const weight = caught.includes(c.id) ? 1 : 4;
      for (let i = 0; i < weight; i++) weighted.push(c);
    });

    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  function discoverCreature(spotIndex, spotEl) {
    if (spotEl.classList.contains('on-cooldown')) return;
    GameAudio.sfx.discover();

    const creature = spotCreatures[spotIndex] || pickCreature();
    if (!creature) return;
    legendaryEscapeUsed = false; // fresh encounter
    startCatchGame(creature, spotIndex);
  }

  // --- Practice Round (first-time tutorial) ---
  function startPracticeRound(creature, spotIndex) {
    if (catchActive) return;
    catchActive = true;
    try { Particles.pause(); } catch (e) {}

    const overlay = document.getElementById('catch-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('practice-mode');
    document.getElementById('catch-result').classList.add('hidden');

    // Set rarity-based overlay tint
    setRarityOverlayTheme(overlay, creature.rarity);

    document.getElementById('catch-creature-name').textContent = creature.name;
    const rarityEl = document.getElementById('catch-rarity');
    rarityEl.textContent = RARITY[creature.rarity].label;
    rarityEl.style.background = RARITY[creature.rarity].color;
    rarityEl.style.color = '#FFF';
    document.getElementById('catch-instruction').textContent = 'PRACTICE -- Tap when the circles line up!';

    // Show creature SVG image if available
    const svgContainer = document.getElementById('catch-creature-svg');
    if (svgContainer) {
      // Reset all animation classes before adding new content
      svgContainer.classList.remove('catch-creature-entrance', 'catch-celebrate', 'catch-dodge');
      if (svgCache.has(creature.id)) {
        svgContainer.innerHTML = sanitizeSVG(svgCache.get(creature.id));
        svgContainer.classList.remove('hidden');
        void svgContainer.offsetWidth;
        svgContainer.classList.add('catch-creature-entrance');
      } else if (creature.svg) {
        svgContainer.innerHTML = `<img src="${creature.svg}" alt="${creature.name}" style="width:100%;height:100%;" onerror="this.parentElement.classList.add('hidden')">`;
        svgContainer.classList.remove('hidden');
        void svgContainer.offsetWidth;
        svgContainer.classList.add('catch-creature-entrance');
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
    let tapped = false;
    const speed = 100 * cfg.ringSpeed * 0.5; // halved for practice
    let lastTime = performance.now();
    let targetRingRotation = 0;

    function drawRichRings() {
      const cx = 130, cy = 130;
      const rarityColor = RARITY[creature.rarity].color;

      // Draw radial gradient background
      const gradient = ctxC.createRadialGradient(cx, cy, 0, cx, cy, 130);
      const baseColor = rarityColor + '26'; // hex with ~15% alpha
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctxC.fillStyle = gradient;
      ctxC.beginPath();
      ctxC.arc(cx, cy, 130, 0, Math.PI * 2);
      ctxC.fill();

      // Target ring with glow and dashed pattern
      ctxC.save();
      ctxC.shadowBlur = 15;
      ctxC.shadowColor = rarityColor;
      ctxC.setLineDash([8, 4]);
      ctxC.beginPath();
      ctxC.arc(cx, cy, targetRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = 'rgba(255,255,255,0.6)';
      ctxC.lineWidth = 3;
      ctxC.stroke();
      ctxC.restore();

      // Shrinking ring with glow and color interpolation
      const diff = Math.abs(ringRadius - targetRadius);
      let hue;
      if (diff < 8) {
        hue = 120; // green
      } else if (diff < 20) {
        hue = 60; // yellow
      } else {
        hue = 0; // red
      }

      const hsla = `hsla(${hue}, 100%, 50%, 0.8)`;

      // Draw glow (softer)
      ctxC.save();
      ctxC.shadowBlur = 20;
      ctxC.shadowColor = `hsla(${hue}, 100%, 50%, 0.6)`;
      ctxC.beginPath();
      ctxC.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = hsla;
      ctxC.lineWidth = 6;
      ctxC.stroke();
      ctxC.restore();

      // Draw crisp ring on top
      ctxC.beginPath();
      ctxC.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = hsla;
      ctxC.lineWidth = 6;
      ctxC.stroke();

      // Draw sparkle dots on shrinking ring
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i;
        const px = cx + Math.cos(angle) * ringRadius;
        const py = cy + Math.sin(angle) * ringRadius;
        const sparkleSize = 2 + Math.sin(Date.now() / 100) * 1;
        ctxC.fillStyle = 'rgba(255,255,255,0.8)';
        ctxC.beginPath();
        ctxC.arc(px, py, sparkleSize, 0, Math.PI * 2);
        ctxC.fill();
      }
    }

    function animate(now) {
      if (tapped) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      ringRadius -= speed * dt;
      if (ringRadius <= 0) {
        ringRadius = maxRadius;
      }

      targetRingRotation += dt * 20; // Subtle rotation

      const cx = 130, cy = 130;
      ctxC.clearRect(0, 0, 260, 260);

      drawRichRings();

      // Only draw canvas creature if no SVG overlay
      if (!svgContainer || svgContainer.classList.contains('hidden')) {
        // Fallback creature drawing (same as real catch)
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

      catchAnimFrame = requestAnimationFrame(animate);
    }

    function onTap() {
      if (tapped) return;
      tapped = true;
      cancelAnimationFrame(catchAnimFrame);
      canvas.removeEventListener('click', onTap);
      canvas.removeEventListener('touchstart', onTouchTap, { passive: false });

      const diff = Math.abs(ringRadius - targetRadius);

      if (diff < 20) {
        // Success (good or perfect) -- complete tutorial
        playCatchSuccess(creature, svgContainer, canvas, ctxC);

        const resultEl = document.getElementById('catch-result');
        const resultText = document.getElementById('catch-result-text');
        resultText.innerHTML = 'Nice! You got it!';
        resultEl.classList.remove('hidden');
        document.getElementById('catch-instruction').textContent = '';

        Game.state.tutorial_completed = true;
        SaveManager.autoSave(Game.state);

        // After 1500ms, close practice and start real catch
        practiceTimeout = setTimeout(() => {
          practiceTimeout = null;
          // Only proceed if still on creatures screen with overlay visible
          const creaturesScreen = document.getElementById('creatures-screen');
          if (!creaturesScreen || !creaturesScreen.classList.contains('active')) return;
          if (overlay.classList.contains('hidden')) return;
          overlay.classList.add('hidden');
          overlay.classList.remove('practice-mode');
          resultEl.classList.add('hidden');
          if (svgContainer) {
            svgContainer.innerHTML = '';
            svgContainer.classList.add('hidden');
            svgContainer.classList.remove('catch-creature-entrance');
          }
          catchActive = false;
          startCatchGame(creature, spotIndex);
        }, 1500);
      } else {
        // Miss -- let them try again with dodge effect
        playMissEffect(creature, svgContainer, canvas, ctxC);
        document.getElementById('catch-instruction').textContent = 'Try again!';
        ringRadius = maxRadius;
        tapped = false;
        lastTime = performance.now();
        setTimeout(() => {
          svgContainer.classList.remove('catch-dodge');
          canvas.addEventListener('click', onTap);
          canvas.addEventListener('touchstart', onTouchTap, { passive: false });
          catchAnimFrame = requestAnimationFrame(animate);
        }, 500);
      }
    }

    function onTouchTap(e) { e.preventDefault(); onTap(); }

    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', onTouchTap, { passive: false });

    catchAnimFrame = requestAnimationFrame(animate);
  }

  // --- Catch Mini-Game ---
  function startCatchGame(creature, spotIndex) {
    // Tutorial check: first-time players get a practice round
    if (!Game.state.tutorial_completed) {
      startPracticeRound(creature, spotIndex);
      return;
    }

    if (catchActive) return;
    catchActive = true;

    // Pause particles while catch overlay is active to save CPU
    try { Particles.pause(); } catch (e) {}

    const overlay = document.getElementById('catch-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.remove('practice-mode');
    document.getElementById('catch-result').classList.add('hidden');

    // Set rarity-based overlay tint
    setRarityOverlayTheme(overlay, creature.rarity);

    document.getElementById('catch-creature-name').textContent = creature.name;
    const rarityEl = document.getElementById('catch-rarity');
    rarityEl.textContent = RARITY[creature.rarity].label;
    rarityEl.style.background = RARITY[creature.rarity].color;
    rarityEl.style.color = '#FFF';
    document.getElementById('catch-instruction').textContent = 'Tap when the circles align!';

    // Show creature SVG image if available
    const svgContainer = document.getElementById('catch-creature-svg');
    if (svgContainer) {
      // Reset all animation classes and inline styles before adding new content
      svgContainer.classList.remove('catch-creature-entrance', 'catch-celebrate', 'catch-dodge');
      svgContainer.style.transition = '';
      svgContainer.style.opacity = '';
      svgContainer.style.transform = '';
      if (svgCache.has(creature.id)) {
        svgContainer.innerHTML = sanitizeSVG(svgCache.get(creature.id));
        svgContainer.classList.remove('hidden');
        // Force reflow so the animation replays even if class was already present
        void svgContainer.offsetWidth;
        svgContainer.classList.add('catch-creature-entrance');
      } else if (creature.svg) {
        // Try loading on-demand
        svgContainer.innerHTML = `<img src="${creature.svg}" alt="${creature.name}" style="width:100%;height:100%;" onerror="this.parentElement.classList.add('hidden')">`;
        svgContainer.classList.remove('hidden');
        void svgContainer.offsetWidth;
        svgContainer.classList.add('catch-creature-entrance');
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
    let targetRingRotation = 0;

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

    function drawRichRings() {
      const cx = 130, cy = 130;
      const rarityColor = RARITY[creature.rarity].color;

      // Draw radial gradient background
      const gradient = ctxC.createRadialGradient(cx, cy, 0, cx, cy, 130);
      const baseColor = rarityColor + '26'; // hex with ~15% alpha
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctxC.fillStyle = gradient;
      ctxC.beginPath();
      ctxC.arc(cx, cy, 130, 0, Math.PI * 2);
      ctxC.fill();

      // Target ring with glow and dashed pattern
      ctxC.save();
      ctxC.shadowBlur = 15;
      ctxC.shadowColor = rarityColor;
      ctxC.setLineDash([8, 4]);
      ctxC.beginPath();
      ctxC.arc(cx, cy, targetRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = 'rgba(255,255,255,0.6)';
      ctxC.lineWidth = 3;
      ctxC.stroke();
      ctxC.restore();

      // Shrinking ring with glow and color interpolation
      const diff = Math.abs(ringRadius - targetRadius);
      let hue;
      if (diff < 8) {
        hue = 120; // green
      } else if (diff < 20) {
        hue = 60; // yellow
      } else {
        hue = 0; // red
      }

      const hsla = `hsla(${hue}, 100%, 50%, 0.8)`;

      // Draw glow (softer)
      ctxC.save();
      ctxC.shadowBlur = 20;
      ctxC.shadowColor = `hsla(${hue}, 100%, 50%, 0.6)`;
      ctxC.beginPath();
      ctxC.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = hsla;
      ctxC.lineWidth = 6;
      ctxC.stroke();
      ctxC.restore();

      // Draw crisp ring on top
      ctxC.beginPath();
      ctxC.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctxC.strokeStyle = hsla;
      ctxC.lineWidth = 6;
      ctxC.stroke();

      // Draw sparkle dots on shrinking ring
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i;
        const px = cx + Math.cos(angle) * ringRadius;
        const py = cy + Math.sin(angle) * ringRadius;
        const sparkleSize = 2 + Math.sin(Date.now() / 100) * 1;
        ctxC.fillStyle = 'rgba(255,255,255,0.8)';
        ctxC.beginPath();
        ctxC.arc(px, py, sparkleSize, 0, Math.PI * 2);
        ctxC.fill();
      }
    }

    function animate(now) {
      if (tapped) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      ringRadius -= speed * dt;
      if (ringRadius <= 0) {
        ringRadius = maxRadius; // Reset
      }

      targetRingRotation += dt * 20; // Subtle rotation

      const cx = 130, cy = 130;
      ctxC.clearRect(0, 0, 260, 260);

      drawRichRings();

      // Only draw canvas creature if no SVG overlay
      if (!svgContainer || svgContainer.classList.contains('hidden')) {
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

      handleCatchResult(result, creature, spotIndex, canvas, ctxC);
    }

    function onTouchTap(e) { e.preventDefault(); onTap(); }

    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', onTouchTap, { passive: false });

    catchAnimFrame = requestAnimationFrame(animate);
  }

  function handleCatchResult(result, creature, spotIndex, canvas, ctxC) {
    const resultEl = document.getElementById('catch-result');
    const resultText = document.getElementById('catch-result-text');
    document.getElementById('catch-instruction').textContent = '';

    if (result === 'miss') {
      GameAudio.sfx.catchMiss();
      playMissEffect(creature, document.getElementById('catch-creature-svg'), canvas, ctxC);
      resultText.innerHTML = `${creature.name} escaped! 💨<br><span style="font-size:0.6em">Try again!</span>`;
      resultEl.classList.remove('hidden');
      // Short cooldown
      const key = `${currentLocation.id}-${spotIndex}`;
      cooldowns[key] = Date.now() + 5000;
      saveCooldowns();
      catchActive = false;
      return;
    }

    // Legendary escape: if creature has an escapePower and hasn't used it yet, escape and restart
    if (creature.escapePower && !legendaryEscapeUsed) {
      legendaryEscapeUsed = true;
      GameAudio.sfx.catchMiss();
      const svgEl = document.getElementById('catch-creature-svg');
      playLegendaryEscapeEffect(creature, svgEl, canvas, ctxC, () => {
        // Callback fires after the animation finishes — show message + retry button
        resultText.innerHTML = `
          <span class="escape-power-name" style="color:${creature.escapePower.color}">${creature.escapePower.name}!</span>
          <span class="escape-power-message">${creature.escapePower.message}</span>
        `;
        resultEl.classList.remove('hidden');
        // Swap the OK button for a Retry button
        const btn = resultEl.querySelector('button');
        if (btn) {
          btn.textContent = 'Try Again!';
          btn.onclick = () => {
            btn.textContent = 'OK!';
            btn.onclick = () => CreatureWorld.closeCatch();
            resultEl.classList.add('hidden');
            catchActive = false;
            startCatchGame(creature, spotIndex);
          };
        }
      });
      document.getElementById('catch-instruction').textContent = '';
      return;
    }

    // Catch success!
    const isNew = !Game.state.creatures.includes(creature.id);
    let coins = creature.coins;
    if (result === 'perfect') coins = Math.floor(coins * 1.5);

    GameAudio.sfx.catchSuccess();

    // Play celebration effects
    playCatchSuccess(creature, document.getElementById('catch-creature-svg'), canvas, ctxC, result === 'perfect');

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

    // Set cooldown — shorter for legendary-only locations (Dream Nexus) so spots stay active
    const key = `${currentLocation.id}-${spotIndex}`;
    const locCreatures = CREATURES.filter(c => c.location === currentLocation.id);
    const allLegendary = locCreatures.length > 0 && locCreatures.every(c => c.rarity === 'legendary');
    const cooldownMs = allLegendary ? 60000 : RARITY[creature.rarity].cooldown;
    cooldowns[key] = Date.now() + cooldownMs;
    saveCooldowns();

    // Reset legendary escape state
    legendaryEscapeUsed = false;

    // Check if this catch just unlocked legendaries for this location
    if (isNew && creature.rarity === 'common' && legendariesUnlocked(currentLocation.id)) {
      setTimeout(() => Game.showToast('Legendary creature unlocked in ' + currentLocation.name + '!'), 1500);
    }

    // Check if this catch just unlocked the Dream Nexus
    if (isNew && creature.rarity === 'legendary' && creature.location !== 'dream-nexus' && dreamNexusUnlocked()) {
      setTimeout(() => Game.showToast('The Dream Nexus has been unlocked!'), 2000);
    }

    SaveManager.autoSave(Game.state);
    updateCatchProgress();
    catchActive = false;
  }

  function closeCatch() {
    catchActive = false;
    legendaryEscapeUsed = false;
    if (legendaryEscapeTimeout) { clearTimeout(legendaryEscapeTimeout); legendaryEscapeTimeout = null; }
    if (practiceTimeout) { clearTimeout(practiceTimeout); practiceTimeout = null; }
    GameAudio.sfx.click();
    const overlayEl = document.getElementById('catch-overlay');
    overlayEl.classList.add('hidden');
    overlayEl.classList.remove('practice-mode');
    // Hide creature SVG and reset all animation classes + inline styles
    const svgContainer = document.getElementById('catch-creature-svg');
    if (svgContainer) {
      svgContainer.innerHTML = '';
      svgContainer.classList.add('hidden');
      svgContainer.classList.remove('catch-creature-entrance', 'catch-celebrate', 'catch-dodge');
      svgContainer.style.transition = '';
      svgContainer.style.opacity = '';
      svgContainer.style.transform = '';
    }
    cancelAnimationFrame(catchAnimFrame);
    effectAnimFrames.forEach(id => cancelAnimationFrame(id));
    effectAnimFrames = [];
    // Clean up any leftover fullscreen escape canvas
    const escapeCanvas = overlayEl.querySelector('.legendary-escape-canvas');
    if (escapeCanvas) escapeCanvas.remove();
    // Restore catch canvas visibility
    const catchCanvas = document.getElementById('catch-canvas');
    if (catchCanvas) catchCanvas.style.opacity = '';
    // Resume particles now that the catch overlay is closed
    try { if (currentLocation) Particles.resume(); } catch (e) {}
    renderSpots(); // Refresh cooldown states
  }

  function backToLocations() {
    GameAudio.sfx.click();
    // Clear pending cooldown timeouts before leaving (prevents TypeError on null currentLocation)
    spotCooldownTimeouts.forEach(id => clearTimeout(id));
    spotCooldownTimeouts = [];
    currentLocation = null;
    Particles.stop();
    removeParallax();
    document.getElementById('location-explore').classList.add('hidden');
    document.getElementById('location-select').classList.remove('hidden');
    renderLocations(); // Refresh counts
  }

  function enterLastLocation() {
    const lastLocId = Game.state.last_location;
    const loc = LOCATIONS.find(l => l.id === lastLocId);
    if (!loc) {
      // Fallback to first location if not found
      enterLocation(LOCATIONS[0]);
      return;
    }
    enterLocation(loc);
  }

  function onEnter() {
    // Show the location picker so the player can choose where to explore
    document.getElementById('location-select').classList.remove('hidden');
    document.getElementById('location-explore').classList.add('hidden');
    document.getElementById('catch-overlay').classList.add('hidden');
    Particles.stop();
    removeParallax();
    renderLocations();
  }

  // --- Visual Effects Helpers ---
  function setRarityOverlayTheme(overlay, rarity) {
    overlay.dataset.rarity = rarity;
  }

  function playCatchSuccess(creature, svgContainer, canvas, ctxC, isPerfect = false) {
    if (svgContainer && !svgContainer.classList.contains('hidden')) {
      svgContainer.classList.add('catch-celebrate');
      setTimeout(() => {
        svgContainer.classList.remove('catch-celebrate');
      }, 500);
    }

    // Flash overlay
    const overlay = document.getElementById('catch-overlay');
    overlay.classList.add('catch-overlay-flash');
    setTimeout(() => {
      overlay.classList.remove('catch-overlay-flash');
    }, 400);

    // Draw confetti burst
    drawConfettiBurst(canvas, ctxC);

    // For perfect, add starburst effect
    if (isPerfect) {
      drawGoldenStarburst(canvas, ctxC);
    }
  }

  function playMissEffect(creature, svgContainer, canvas, ctxC) {
    if (svgContainer && !svgContainer.classList.contains('hidden')) {
      svgContainer.classList.add('catch-dodge');
    }

    // Draw whoosh speed lines
    drawWhoosh(canvas, ctxC);

    // Draw ring shatter
    drawRingShatter(canvas, ctxC);
  }

  function playLegendaryEscapeEffect(creature, svgContainer, canvas, ctxC, onComplete) {
    const power = creature.escapePower;
    const cx = 130, cy = 130;
    const powerColor = power.color;
    const anim = power.animation || 'flash';
    const DURATION = 2.0; // seconds (longer for dramatic fullscreen effect)

    // SVG creature does a dramatic exit
    if (svgContainer && !svgContainer.classList.contains('hidden')) {
      svgContainer.classList.add('catch-dodge');
      setTimeout(() => {
        svgContainer.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        svgContainer.style.opacity = '0';
        svgContainer.style.transform = 'scale(1.5)';
      }, 400);
      setTimeout(() => {
        svgContainer.style.transition = '';
        svgContainer.style.opacity = '';
        svgContainer.style.transform = '';
        svgContainer.classList.remove('catch-dodge');
      }, 2200);
    }

    // Flash overlay with the power's color
    const overlay = document.getElementById('catch-overlay');
    overlay.classList.add('catch-overlay-flash');
    setTimeout(() => overlay.classList.remove('catch-overlay-flash'), 400);

    // Create a fullscreen canvas for the escape effect
    const escapeCanvas = document.createElement('canvas');
    escapeCanvas.className = 'legendary-escape-canvas';
    const rect = overlay.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    escapeCanvas.width = rect.width * dpr;
    escapeCanvas.height = rect.height * dpr;
    escapeCanvas.style.width = rect.width + 'px';
    escapeCanvas.style.height = rect.height + 'px';
    overlay.appendChild(escapeCanvas);
    const escCtx = escapeCanvas.getContext('2d');
    // Scale so the 260×260 coordinate system fills the screen
    const scale = Math.min(rect.width, rect.height) / 260;
    const rawW = rect.width;
    const rawH = rect.height;

    // Hide the small catch canvas during the escape
    canvas.style.opacity = '0';

    let startTime = performance.now();
    const rainbowColors = ['#FF6B6B','#FFB347','#FFFF6B','#6BCB77','#6B9FFF','#BA68C8'];

    function animateEscape(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed > DURATION) {
        // Clean up fullscreen canvas
        escapeCanvas.remove();
        canvas.style.opacity = '';
        ctxC.clearRect(0, 0, 260, 260);
        if (onComplete) onComplete();
        return;
      }

      // Guard: if closeCatch removed the canvas, stop the animation loop
      if (!escapeCanvas.parentNode) return;

      // Clear raw canvas, then apply transform for 260×260 → fullscreen mapping
      escCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      escCtx.clearRect(0, 0, rawW, rawH);
      escCtx.translate(rawW / 2, rawH / 2);
      escCtx.scale(scale, scale);
      escCtx.translate(-130, -130);

      // Shadow outer ctxC so all animation drawing code renders on the fullscreen canvas
      const ctxC = escCtx;
      const p = elapsed / DURATION;
      const alpha = Math.max(0, 1 - p);

      if (anim === 'flash') {
        // Ancient Wisdom: expanding golden rings of light
        for (let r = 0; r < 3; r++) {
          const rp = Math.min(1, p + r * 0.15);
          const ringR = 15 + rp * 120;
          const a = Math.max(0, 1 - rp) * 0.8;
          ctxC.save();
          ctxC.globalAlpha = a;
          ctxC.shadowBlur = 30;
          ctxC.shadowColor = powerColor;
          ctxC.strokeStyle = powerColor;
          ctxC.lineWidth = 4 * (1 - rp);
          ctxC.beginPath();
          ctxC.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctxC.stroke();
          ctxC.restore();
        }
        // Radial light rays
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12 + elapsed * 0.5;
          const len = 30 + p * 100;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.5;
          ctxC.strokeStyle = powerColor;
          ctxC.lineWidth = 2;
          ctxC.beginPath();
          ctxC.moveTo(cx + Math.cos(angle) * 20, cy + Math.sin(angle) * 20);
          ctxC.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
          ctxC.stroke();
          ctxC.restore();
        }

      } else if (anim === 'wave') {
        // Tidal Surge: horizontal wave lines sweep upward
        for (let w = 0; w < 6; w++) {
          const wy = 260 - (p * 300 + w * 40);
          const a = Math.max(0, alpha - w * 0.1);
          ctxC.save();
          ctxC.globalAlpha = a * 0.7;
          ctxC.strokeStyle = powerColor;
          ctxC.lineWidth = 3;
          ctxC.shadowBlur = 15;
          ctxC.shadowColor = powerColor;
          ctxC.beginPath();
          for (let x = 0; x < 260; x += 5) {
            const y = wy + Math.sin((x + elapsed * 200) * 0.04) * 12;
            x === 0 ? ctxC.moveTo(x, y) : ctxC.lineTo(x, y);
          }
          ctxC.stroke();
          ctxC.restore();
        }
        // Water droplets rising
        for (let i = 0; i < 10; i++) {
          const dx = 40 + (i * 20);
          const dy = 260 - p * 300 - Math.sin(i * 2.3 + elapsed * 3) * 30;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.6;
          ctxC.fillStyle = '#E0FFFF';
          ctxC.beginPath();
          ctxC.arc(dx, dy, 2, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }

      } else if (anim === 'rainbow') {
        // Aurora Veil: concentric rainbow arcs shimmer
        for (let i = 0; i < 6; i++) {
          const arcR = 30 + i * 18 + p * 40;
          const startAngle = -Math.PI * 0.8 + Math.sin(elapsed * 2 + i) * 0.3;
          const endAngle = Math.PI * 0.8 + Math.sin(elapsed * 2.5 + i) * 0.3;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.6;
          ctxC.strokeStyle = rainbowColors[i];
          ctxC.lineWidth = 4;
          ctxC.shadowBlur = 12;
          ctxC.shadowColor = rainbowColors[i];
          ctxC.beginPath();
          ctxC.arc(cx, cy + 20, arcR, startAngle, endAngle);
          ctxC.stroke();
          ctxC.restore();
        }
        // Shimmer sparkles
        for (let i = 0; i < 14; i++) {
          const angle = (Math.PI * 2 * i) / 14 + elapsed * 1.5;
          const dist = 30 + Math.sin(elapsed * 3 + i) * 40 + p * 50;
          const sx = cx + Math.cos(angle) * dist;
          const sy = cy + Math.sin(angle) * dist;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.8;
          ctxC.fillStyle = rainbowColors[i % 6];
          ctxC.beginPath();
          ctxC.arc(sx, sy, 2, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }

      } else if (anim === 'vortex') {
        // Void Shift: dark spiraling portal
        for (let i = 0; i < 4; i++) {
          const spiralR = 20 + i * 30 - p * 15;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.4;
          ctxC.strokeStyle = i % 2 === 0 ? powerColor : '#1A0033';
          ctxC.lineWidth = 6 - i;
          ctxC.shadowBlur = 20;
          ctxC.shadowColor = powerColor;
          ctxC.beginPath();
          for (let a = 0; a < Math.PI * 4; a += 0.1) {
            const sr = spiralR + a * (8 - i * 1.5);
            const sa = a + elapsed * (3 + i) * (i % 2 ? -1 : 1);
            const x = cx + Math.cos(sa) * sr;
            const y = cy + Math.sin(sa) * sr;
            a === 0 ? ctxC.moveTo(x, y) : ctxC.lineTo(x, y);
          }
          ctxC.stroke();
          ctxC.restore();
        }
        // Dark center that grows
        const holeR = 10 + p * 30;
        ctxC.save();
        ctxC.globalAlpha = alpha * 0.6;
        const grad = ctxC.createRadialGradient(cx, cy, 0, cx, cy, holeR);
        grad.addColorStop(0, '#000');
        grad.addColorStop(1, 'transparent');
        ctxC.fillStyle = grad;
        ctxC.beginPath();
        ctxC.arc(cx, cy, holeR, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.restore();

      } else if (anim === 'dash') {
        // Prism Dash: rainbow streaks zooming across
        for (let i = 0; i < 6; i++) {
          const y = 60 + i * 30;
          const x = -40 + p * 340;
          const trailLen = 80;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.7;
          const g = ctxC.createLinearGradient(x - trailLen, y, x, y);
          g.addColorStop(0, 'transparent');
          g.addColorStop(1, rainbowColors[i]);
          ctxC.strokeStyle = g;
          ctxC.lineWidth = 3;
          ctxC.shadowBlur = 10;
          ctxC.shadowColor = rainbowColors[i];
          ctxC.beginPath();
          ctxC.moveTo(x - trailLen, y + Math.sin(elapsed * 6 + i * 2) * 8);
          ctxC.lineTo(x, y + Math.sin(elapsed * 6 + i * 2 + 1) * 5);
          ctxC.stroke();
          ctxC.restore();
        }
        // Main streak with star
        const mx = -20 + p * 300;
        ctxC.save();
        ctxC.globalAlpha = alpha;
        ctxC.fillStyle = powerColor;
        ctxC.shadowBlur = 20;
        ctxC.shadowColor = powerColor;
        ctxC.beginPath();
        ctxC.arc(mx, cy, 5, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.restore();

      } else if (anim === 'burst') {
        // Prism Burst: explosion of colorful sparks
        const count = 24;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          const speed = 60 + (i % 3) * 30;
          const dist = p * speed * 2;
          const bx = cx + Math.cos(angle) * dist;
          const by = cy + Math.sin(angle) * dist;
          const size = 4 * (1 - p * 0.6);
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.8;
          ctxC.fillStyle = rainbowColors[i % 6];
          ctxC.shadowBlur = 8;
          ctxC.shadowColor = rainbowColors[i % 6];
          ctxC.beginPath();
          ctxC.arc(bx, by, size, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }
        // Central flash
        if (p < 0.3) {
          ctxC.save();
          ctxC.globalAlpha = (1 - p / 0.3) * 0.5;
          ctxC.fillStyle = '#FFF';
          ctxC.beginPath();
          ctxC.arc(cx, cy, 40 * (1 - p), 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }

      } else if (anim === 'bounce') {
        // Tiny Bounce: bouncing ball ricochet paths
        const bounces = 5;
        for (let b = 0; b < bounces; b++) {
          const bt = (elapsed * 3 + b * 0.6) % 2;
          const bx = 30 + (b * 45);
          const bounceY = cy + 50 - Math.abs(Math.sin(bt * Math.PI)) * 100;
          const size = 5 * (1 - p * 0.5);
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.7;
          ctxC.fillStyle = rainbowColors[b % 6];
          ctxC.shadowBlur = 8;
          ctxC.shadowColor = powerColor;
          ctxC.beginPath();
          ctxC.arc(bx, bounceY, size, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }
        // Impact lines at bounce points
        for (let b = 0; b < bounces; b++) {
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.3;
          ctxC.strokeStyle = powerColor;
          ctxC.lineWidth = 1;
          const bx = 30 + (b * 45);
          ctxC.beginPath();
          ctxC.moveTo(bx - 8, cy + 50);
          ctxC.lineTo(bx + 8, cy + 50);
          ctxC.stroke();
          ctxC.restore();
        }

      } else if (anim === 'slam') {
        // Rainbow Slam: downward impact + horizontal shockwave
        const impactT = Math.min(1, p * 3); // fast impact in first third
        // Falling streak
        if (p < 0.35) {
          const fy = -20 + impactT * (cy + 50);
          ctxC.save();
          ctxC.globalAlpha = 0.8;
          ctxC.fillStyle = powerColor;
          ctxC.shadowBlur = 20;
          ctxC.shadowColor = powerColor;
          ctxC.beginPath();
          ctxC.arc(cx, fy, 8, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }
        // Horizontal shockwave after impact
        if (p > 0.3) {
          const sp = (p - 0.3) / 0.7;
          const waveWidth = sp * 140;
          const waveAlpha = Math.max(0, 1 - sp);
          for (let i = 0; i < 6; i++) {
            ctxC.save();
            ctxC.globalAlpha = waveAlpha * 0.5;
            ctxC.strokeStyle = rainbowColors[i];
            ctxC.lineWidth = 3 - i * 0.3;
            ctxC.beginPath();
            const wy = cy + 50 - i * 4;
            ctxC.moveTo(cx - waveWidth, wy);
            ctxC.quadraticCurveTo(cx, wy - 15 * (1 - sp), cx + waveWidth, wy);
            ctxC.stroke();
            ctxC.restore();
          }
          // Ground debris particles
          for (let i = 0; i < 8; i++) {
            const dx = cx + (i - 4) * 20 * sp;
            const dy = cy + 50 - sp * 40 * Math.sin(i * 1.5);
            ctxC.save();
            ctxC.globalAlpha = waveAlpha * 0.6;
            ctxC.fillStyle = powerColor;
            ctxC.beginPath();
            ctxC.arc(dx, dy, 2.5, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.restore();
          }
        }

      } else if (anim === 'hearts') {
        // Love Shield: floating hearts in a protective dome
        const heartCount = 12;
        for (let i = 0; i < heartCount; i++) {
          const angle = (Math.PI * 2 * i) / heartCount + elapsed * 1.2;
          const dist = 30 + Math.sin(elapsed * 2 + i) * 15 + p * 40;
          const hx = cx + Math.cos(angle) * dist;
          const hy = cy + Math.sin(angle) * dist - p * 30;
          const hs = 6 * (1 - p * 0.4);
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.7;
          ctxC.fillStyle = i % 2 === 0 ? powerColor : '#FF99C4';
          ctxC.beginPath();
          ctxC.moveTo(hx, hy + hs * 0.3);
          ctxC.bezierCurveTo(hx - hs, hy - hs * 0.5, hx - hs, hy - hs, hx, hy - hs * 0.3);
          ctxC.bezierCurveTo(hx + hs, hy - hs, hx + hs, hy - hs * 0.5, hx, hy + hs * 0.3);
          ctxC.fill();
          ctxC.restore();
        }
        // Warm glow center
        if (p < 0.5) {
          const glowR = 40 + p * 30;
          ctxC.save();
          ctxC.globalAlpha = (1 - p * 2) * 0.3;
          const g = ctxC.createRadialGradient(cx, cy, 0, cx, cy, glowR);
          g.addColorStop(0, powerColor);
          g.addColorStop(1, 'transparent');
          ctxC.fillStyle = g;
          ctxC.beginPath();
          ctxC.arc(cx, cy, glowR, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        }

      } else if (anim === 'drift') {
        // Cloud Drift: fluffy cloud puffs floating upward
        const clouds = [
          { x: cx - 30, y: cy, r: 20 },
          { x: cx + 25, y: cy - 15, r: 16 },
          { x: cx, y: cy + 20, r: 22 },
          { x: cx - 15, y: cy - 30, r: 14 },
          { x: cx + 35, y: cy + 10, r: 18 }
        ];
        clouds.forEach((c, i) => {
          const dy = c.y - p * 120 - Math.sin(elapsed * 2 + i) * 15;
          const dx = c.x + Math.sin(elapsed * 1.5 + i * 2) * 20;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.6;
          ctxC.fillStyle = '#FFF8DC';
          ctxC.shadowBlur = 15;
          ctxC.shadowColor = powerColor;
          // Draw a cloud shape with overlapping circles
          ctxC.beginPath();
          ctxC.arc(dx, dy, c.r, 0, Math.PI * 2);
          ctxC.arc(dx - c.r * 0.6, dy + 4, c.r * 0.7, 0, Math.PI * 2);
          ctxC.arc(dx + c.r * 0.6, dy + 4, c.r * 0.7, 0, Math.PI * 2);
          ctxC.fill();
          ctxC.restore();
        });
        // Rainbow trail
        for (let i = 0; i < 6; i++) {
          const ry = cy + 60 - p * 80 - i * 3;
          ctxC.save();
          ctxC.globalAlpha = alpha * 0.3;
          ctxC.strokeStyle = rainbowColors[i];
          ctxC.lineWidth = 2;
          ctxC.beginPath();
          ctxC.moveTo(40, ry + Math.sin(elapsed * 3 + i) * 5);
          ctxC.quadraticCurveTo(cx, ry - 10, 220, ry + Math.sin(elapsed * 3 + i + 1) * 5);
          ctxC.stroke();
          ctxC.restore();
        }

      } else if (anim === 'tumble') {
        // Berry Tumble: rolling creature silhouette + scattered berries
        const rollX = cx - 80 + p * 200;
        const rollY = cy + 30 + Math.sin(elapsed * 8) * 15;
        const rollAngle = elapsed * 10;
        // Rolling dust cloud
        ctxC.save();
        ctxC.globalAlpha = alpha * 0.3;
        ctxC.fillStyle = '#DEB887';
        ctxC.beginPath();
        ctxC.arc(rollX - 15, rollY + 10, 12 * (1 - p * 0.3), 0, Math.PI * 2);
        ctxC.fill();
        ctxC.restore();
        // Rolling ball
        ctxC.save();
        ctxC.translate(rollX, rollY);
        ctxC.rotate(rollAngle);
        ctxC.globalAlpha = alpha * 0.8;
        ctxC.fillStyle = powerColor;
        ctxC.shadowBlur = 10;
        ctxC.shadowColor = powerColor;
        ctxC.beginPath();
        ctxC.arc(0, 0, 10, 0, Math.PI * 2);
        ctxC.fill();
        // Spike marks on the ball
        for (let s = 0; s < 5; s++) {
          const sa = (Math.PI * 2 * s) / 5;
          ctxC.fillStyle = '#6B3410';
          ctxC.beginPath();
          ctxC.arc(Math.cos(sa) * 6, Math.sin(sa) * 6, 2, 0, Math.PI * 2);
          ctxC.fill();
        }
        ctxC.restore();
        // Scattered berries behind
        const berryColors = ['#DC143C', '#FF4500', '#FF6347', '#8B0000'];
        for (let i = 0; i < 6; i++) {
          const bx = rollX - 20 - i * 15 - Math.sin(i * 3) * 10;
          const by = cy + 20 + Math.cos(i * 2.7 + elapsed) * 15;
          if (bx > 0) {
            ctxC.save();
            ctxC.globalAlpha = alpha * 0.6;
            ctxC.fillStyle = berryColors[i % 4];
            ctxC.beginPath();
            ctxC.arc(bx, by, 3.5, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.restore();
          }
        }
      }

      effectAnimFrames.push(requestAnimationFrame(animateEscape));
    }
    effectAnimFrames.push(requestAnimationFrame(animateEscape));
  }

  function drawConfettiBurst(canvas, ctxC) {
    const particles = [];
    const confettiColors = ['#FF6B9D', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
    const dpr = window.devicePixelRatio || 1;

    // Create 30-40 confetti pieces
    for (let i = 0; i < 35; i++) {
      const angle = (Math.PI * 2 * i) / 35;
      const speed = 150 + Math.random() * 100;
      particles.push({
        x: 130,
        y: 130,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50, // slight upward bias
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        size: 3 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        alpha: 1,
        life: 1.5 // seconds
      });
    }

    let startTime = performance.now();
    function animateConfetti(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed > 1.5) {
        ctxC.clearRect(0, 0, 260, 260);
        return;
      }

      const dt = 1 / 60; // approximate frame delta
      particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt + 300 * dt * dt; // gravity
        p.vy += 300 * dt; // gravity accumulation
        p.rotation += 0.1;
      });

      ctxC.clearRect(0, 0, 260, 260);

      const t = elapsed / 1.5;
      particles.forEach(p => {
        if (elapsed > p.life) return;
        p.alpha = Math.max(0, 1 - t * t);

        ctxC.save();
        ctxC.globalAlpha = p.alpha;
        ctxC.translate(p.x, p.y);
        ctxC.rotate(p.rotation);
        ctxC.fillStyle = p.color;
        ctxC.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctxC.restore();
      });

      effectAnimFrames.push(requestAnimationFrame(animateConfetti));
    }
    effectAnimFrames.push(requestAnimationFrame(animateConfetti));
  }

  function drawGoldenStarburst(canvas, ctxC) {
    const dpr = window.devicePixelRatio || 1;
    const cx = 130, cy = 130;
    const maxRadius = 120;
    let radius = 0;
    let startTime = performance.now();

    function animate(now) {
      const elapsed = (now - startTime) / 1000;
      radius = 30 + elapsed * 200; // grows to ~60 in 0.15s
      if (elapsed > 0.15) return;

      ctxC.save();
      ctxC.globalAlpha = Math.max(0, 1 - elapsed * 8);

      // Draw star rays
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i;
        ctxC.save();
        ctxC.strokeStyle = 'rgba(255, 215, 0, 0.7)';
        ctxC.lineWidth = 3;
        ctxC.beginPath();
        ctxC.moveTo(cx, cy);
        ctxC.lineTo(
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius
        );
        ctxC.stroke();
        ctxC.restore();
      }

      ctxC.restore();
      effectAnimFrames.push(requestAnimationFrame(animate));
    }
    effectAnimFrames.push(requestAnimationFrame(animate));
  }

  function drawWhoosh(canvas, ctxC) {
    const cx = 130, cy = 130;
    let startTime = performance.now();
    const direction = Math.random() > 0.5 ? 1 : -1;

    function animate(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed > 0.3) return;

      const progress = elapsed / 0.3;
      ctxC.save();
      ctxC.globalAlpha = Math.max(0, 1 - progress);
      ctxC.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctxC.lineWidth = 4;
      ctxC.lineCap = 'round';

      // Draw multiple speed lines
      for (let i = 0; i < 3; i++) {
        const offset = i * 15;
        ctxC.beginPath();
        ctxC.moveTo(cx + direction * (50 + progress * 60) - offset, cy - 20);
        ctxC.lineTo(cx + direction * (80 + progress * 80) - offset, cy + 20);
        ctxC.stroke();
      }

      ctxC.restore();
      effectAnimFrames.push(requestAnimationFrame(animate));
    }
    effectAnimFrames.push(requestAnimationFrame(animate));
  }

  function drawRingShatter(canvas, ctxC) {
    const cx = 130, cy = 130;
    const shards = [];
    const shardCount = 12;

    // Create ring shatter fragments
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount;
      shards.push({
        angle: angle,
        distance: 0,
        maxDistance: 100 + Math.random() * 40,
        speed: 400 + Math.random() * 200,
        size: 8 + Math.random() * 8,
        life: 0.4 // seconds
      });
    }

    let startTime = performance.now();
    function animate(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed > 0.4) return;

      ctxC.save();
      shards.forEach(s => {
        s.distance = Math.min(s.maxDistance, (elapsed / s.life) * s.maxDistance);
        const px = cx + Math.cos(s.angle) * s.distance;
        const py = cy + Math.sin(s.angle) * s.distance;
        ctxC.globalAlpha = Math.max(0, 1 - (elapsed / s.life));
        ctxC.fillStyle = 'rgba(200, 200, 200, 0.6)';
        ctxC.beginPath();
        ctxC.arc(px, py, s.size / 2, 0, Math.PI * 2);
        ctxC.fill();
      });
      ctxC.restore();
      effectAnimFrames.push(requestAnimationFrame(animate));
    }
    effectAnimFrames.push(requestAnimationFrame(animate));
  }

  // --- Parallax Touch Interaction (throttled for performance) ---
  function setupParallax() {
    removeParallax(); // Clean up any existing listeners
    const sceneEl = document.getElementById('location-scene');
    if (!sceneEl) return;

    let parallaxRAF = null;
    parallaxMoveHandler = function(e) {
      if (parallaxRAF) return; // throttle to animation frame rate
      parallaxRAF = requestAnimationFrame(() => {
        parallaxRAF = null;
        const touch = e.touches ? e.touches[0] : e;
        const rect = sceneEl.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width - 0.5;
        const y = (touch.clientY - rect.top) / rect.height - 0.5;
        sceneEl.style.backgroundPosition = `calc(50% + ${x * 20}px) calc(100% + ${y * 10}px)`;
      });
    };

    sceneEl.addEventListener('mousemove', parallaxMoveHandler);
    sceneEl.addEventListener('touchmove', parallaxMoveHandler, { passive: true });
  }

  function removeParallax() {
    const sceneEl = document.getElementById('location-scene');
    if (!sceneEl) return;
    if (parallaxMoveHandler) {
      sceneEl.removeEventListener('mousemove', parallaxMoveHandler);
      sceneEl.removeEventListener('touchmove', parallaxMoveHandler);
      parallaxMoveHandler = null;
    }
  }

  // --- Fashion Avatar in Explore Scene ---
  function renderExploreAvatar() {
    const el = document.getElementById('explore-avatar');
    if (!el) return;
    try {
      // Use the most recently saved outfit, if any
      const outfits = Game.state.saved_outfits;
      const outfit = outfits && outfits.length > 0
        ? outfits[outfits.length - 1].items
        : null;
      const svg = outfit ? Fashion.getAvatarSVG(outfit) : '';
      el.innerHTML = svg;
    } catch (e) {
      el.innerHTML = '';
    }
  }

  // --- Catch Progress Counter ---
  function updateCatchProgress() {
    if (!currentLocation) return;
    const el = document.getElementById('catch-progress');
    if (!el) return;
    const locCreatures = CREATURES.filter(c => c.location === currentLocation.id);
    const caught = locCreatures.filter(c => Game.state.creatures.includes(c.id)).length;
    el.textContent = `${caught}/${locCreatures.length} caught`;
  }

  // Expose svgCache for collection modal
  function getSvgCache() { return svgCache; }

  return { init, onEnter, backToLocations, closeCatch, getSvgCache, sanitizeSVG, enterLocation, enterLastLocation };
})();
