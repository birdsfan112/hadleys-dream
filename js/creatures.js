// ============================================================
// Hadley's Dream — Creature World
// ============================================================

const CreatureWorld = (() => {
  let currentLocation = null;
  let catchAnimFrame = null;
  let catchState = null;
  let catchActive = false;
  let legendaryEscapeUsed = false; // tracks whether the legendary has already used its escape power this encounter
  let legendaryEscapeTimeout = null;
  let practiceTimeout = null;
  let cooldowns = {}; // spotKey -> timestamp when available
  let parallaxMoveHandler = null;
  let parallaxTouchHandler = null;
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
    'rainbow-meadow': ['🌱', '🍀', '🌿', '🪨', '🌱', '🍀', '🌾', '🌿']
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
          .catch(e => console.warn('SVG load failed:', creature.id, e));
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
        setTimeout(() => {
          spot.classList.remove('on-cooldown');
        }, cooldowns[key] - now);
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
        spot.style.animationDelay = `${2 + i * 0.5}s`;
      }

      spot.innerHTML = `
        <div class="spot-hint"></div>
        ${icons[i % icons.length]}
      `;
      spot.onclick = () => discoverCreature(i, spot);
      container.appendChild(spot);
    }
  }

  function pickCreature() {
    // Get creatures for current location
    const locCreatures = CREATURES.filter(c => c.location === currentLocation.id);
    const caught = Game.state.creatures || [];

    // Weighted random by rarity
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity;
    for (const [r, cfg] of Object.entries(RARITY)) {
      cumulative += cfg.chance;
      if (roll <= cumulative) { selectedRarity = r; break; }
    }

    // Filter by rarity
    let pool = locCreatures.filter(c => c.rarity === selectedRarity);
    if (pool.length === 0) {
      pool = locCreatures.filter(c => c.rarity === 'common');
    }

    // Smart weighting: uncaught creatures get 4x the weight
    const weighted = [];
    pool.forEach(c => {
      const weight = caught.includes(c.id) ? 1 : 4;
      for (let i = 0; i < weight; i++) weighted.push(c);
    });

    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  function discoverCreature(spotIndex, spotEl) {
    if (spotEl.classList.contains('on-cooldown')) return;
    Audio.sfx.discover();

    const creature = pickCreature();
    if (!creature) return;
    legendaryEscapeUsed = false; // fresh encounter
    startCatchGame(creature, spotIndex);
  }

  // --- Practice Round (first-time tutorial) ---
  function startPracticeRound(creature, spotIndex) {
    if (catchActive) return;
    catchActive = true;

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
      const baseColor = rarityColor.replace(')', ', 0.15)').replace('rgb', 'rgba');
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
      const baseColor = rarityColor.replace(')', ', 0.15)').replace('rgb', 'rgba');
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
      Audio.sfx.catchMiss();
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
      Audio.sfx.catchMiss();
      playLegendaryEscapeEffect(creature, document.getElementById('catch-creature-svg'), canvas, ctxC);
      resultText.innerHTML = `
        <span style="font-size:0.7em;color:${creature.escapePower.color}">${creature.escapePower.name}!</span><br>
        <span style="font-size:0.6em">${creature.escapePower.message}</span><br>
        <span style="font-size:0.6em;color:#FFF">Get ready to try again...</span>
      `;
      resultEl.classList.remove('hidden');
      document.getElementById('catch-instruction').textContent = '';

      // After a dramatic pause, restart the catch minigame for a second attempt
      legendaryEscapeTimeout = setTimeout(() => {
        legendaryEscapeTimeout = null;
        const creaturesScreen = document.getElementById('creatures-screen');
        if (!creaturesScreen || !creaturesScreen.classList.contains('active')) return;
        const overlay = document.getElementById('catch-overlay');
        if (overlay.classList.contains('hidden')) return;
        resultEl.classList.add('hidden');
        catchActive = false;
        startCatchGame(creature, spotIndex);
      }, 2500);
      return;
    }

    // Catch success!
    const isNew = !Game.state.creatures.includes(creature.id);
    let coins = creature.coins;
    if (result === 'perfect') coins = Math.floor(coins * 1.5);

    Audio.sfx.catchSuccess();

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

    // Set cooldown
    const key = `${currentLocation.id}-${spotIndex}`;
    cooldowns[key] = Date.now() + RARITY[creature.rarity].cooldown;
    saveCooldowns();

    // Reset legendary escape state
    legendaryEscapeUsed = false;

    SaveManager.autoSave(Game.state);
    updateCatchProgress();
    catchActive = false;
  }

  function closeCatch() {
    catchActive = false;
    legendaryEscapeUsed = false;
    if (legendaryEscapeTimeout) { clearTimeout(legendaryEscapeTimeout); legendaryEscapeTimeout = null; }
    if (practiceTimeout) { clearTimeout(practiceTimeout); practiceTimeout = null; }
    Audio.sfx.click();
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
    renderSpots(); // Refresh cooldown states
  }

  function backToLocations() {
    Audio.sfx.click();
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

  function playLegendaryEscapeEffect(creature, svgContainer, canvas, ctxC) {
    const power = creature.escapePower;
    const cx = 130, cy = 130;

    // SVG creature does a dramatic shake then fades
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
      }, 1800);
    }

    // Flash overlay with the power's color
    const overlay = document.getElementById('catch-overlay');
    overlay.classList.add('catch-overlay-flash');
    setTimeout(() => overlay.classList.remove('catch-overlay-flash'), 400);

    // Draw expanding energy ring in the power's color
    const powerColor = power.color;
    let startTime = performance.now();

    function animateEscape(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed > 1.2) return;

      ctxC.clearRect(0, 0, 260, 260);
      const progress = elapsed / 1.2;

      // Expanding shockwave ring
      const ringR = 20 + progress * 120;
      const alpha = Math.max(0, 1 - progress);
      ctxC.save();
      ctxC.globalAlpha = alpha;
      ctxC.shadowBlur = 25;
      ctxC.shadowColor = powerColor;
      ctxC.strokeStyle = powerColor;
      ctxC.lineWidth = 6 * (1 - progress);
      ctxC.beginPath();
      ctxC.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctxC.stroke();
      ctxC.restore();

      // Energy particles spiraling outward
      const particleCount = 16;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + elapsed * 4;
        const dist = 20 + progress * 100 + Math.sin(i * 1.7) * 15;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const size = 3 * (1 - progress * 0.7);

        ctxC.save();
        ctxC.globalAlpha = alpha * 0.8;
        ctxC.fillStyle = powerColor;
        ctxC.shadowBlur = 10;
        ctxC.shadowColor = powerColor;
        ctxC.beginPath();
        ctxC.arc(px, py, size, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.restore();
      }

      // Inner flash that fades
      if (elapsed < 0.3) {
        const flashAlpha = (1 - elapsed / 0.3) * 0.4;
        ctxC.save();
        ctxC.globalAlpha = flashAlpha;
        ctxC.fillStyle = powerColor;
        ctxC.beginPath();
        ctxC.arc(cx, cy, 60, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.restore();
      }

      requestAnimationFrame(animateEscape);
    }
    requestAnimationFrame(animateEscape);
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

      requestAnimationFrame(animateConfetti);
    }
    requestAnimationFrame(animateConfetti);
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
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // --- Parallax Touch Interaction ---
  function setupParallax() {
    removeParallax(); // Clean up any existing listeners
    const sceneEl = document.getElementById('location-scene');
    if (!sceneEl) return;

    parallaxMoveHandler = function(e) {
      const touch = e.touches ? e.touches[0] : e;
      const rect = sceneEl.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (touch.clientY - rect.top) / rect.height - 0.5;
      sceneEl.style.backgroundPosition = `calc(50% + ${x * 20}px) calc(100% + ${y * 10}px)`;
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
