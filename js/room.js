// ============================================================
// Hadley's Dream — Dream Room
// ============================================================

const Room = (() => {
  const GRID_SIZE = 8;
  let activeTab = 'furniture';
  let selectedFurniture = null;
  let dragState = null;

  // Furniture category icons
  const FURN_ICONS = {
    bed: '🛏️', desk: '🪑', shelf: '📚', plant: '🌱', rug: '🟣',
    lamp: '💡', decor: '🧸', seating: '🛋️'
  };

  function init() {}

  function onEnter() {
    applyTheme();
    renderRoom();
    renderPanel();
  }

  function applyTheme() {
    const themeId = Game.state.room.theme || 'default';
    const theme = ROOM_THEMES.find(t => t.id === themeId) || ROOM_THEMES[0];
    const grid = document.getElementById('room-grid');
    grid.style.background = theme.floor;
    // Wall (top portion)
    document.getElementById('room-container').style.background =
      `linear-gradient(180deg, ${theme.wall} 0%, ${theme.wall} 40%, ${adjustColor(theme.wall, -10)} 100%)`;
  }

  function adjustColor(hex, amount) {
    // Simple brightness adjustment
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function renderRoom() {
    const grid = document.getElementById('room-grid');
    grid.innerHTML = '';

    // Create cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'room-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.onclick = () => placeFurniture(r, c);
        grid.appendChild(cell);
      }
    }

    // Place furniture
    const cellW = grid.offsetWidth / GRID_SIZE;
    const cellH = grid.offsetHeight / GRID_SIZE;

    Game.state.room.furniture.forEach((f, idx) => {
      const item = FURNITURE_ITEMS.find(fi => fi.id === f.id);
      if (!item) return;

      const el = document.createElement('div');
      el.className = 'room-furniture';
      el.style.left = `${f.x * (100 / GRID_SIZE)}%`;
      el.style.top = `${f.y * (100 / GRID_SIZE)}%`;
      el.style.width = `${item.w * (100 / GRID_SIZE)}%`;
      el.style.height = `${item.h * (100 / GRID_SIZE)}%`;
      el.style.background = item.color;
      el.innerHTML = `
        ${FURN_ICONS[item.cat] || '📦'}
        <span class="furn-label">${item.name}</span>
        <button class="furn-remove" onclick="event.stopPropagation();Room.removeFurniture(${idx})">✕</button>
      `;
      el.dataset.idx = idx;

      // Tap to select
      el.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.room-furniture').forEach(f => f.classList.remove('selected'));
        el.classList.add('selected');
      };

      // Drag support
      enableDrag(el, idx);
      grid.appendChild(el);
    });

    // Render creatures in room
    renderRoomCreatures();
  }

  function enableDrag(el, idx) {
    let startX, startY, origX, origY;
    const grid = document.getElementById('room-grid');

    function onStart(e) {
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      const rect = grid.getBoundingClientRect();
      startX = touch.clientX;
      startY = touch.clientY;
      const f = Game.state.room.furniture[idx];
      origX = f.x;
      origY = f.y;
      el.classList.add('dragging');

      function onMove(e2) {
        const t = e2.touches ? e2.touches[0] : e2;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const cellW = rect.width / GRID_SIZE;
        const cellH = rect.height / GRID_SIZE;
        const newX = Math.round(origX + dx / cellW);
        const newY = Math.round(origY + dy / cellH);
        const item = FURNITURE_ITEMS.find(fi => fi.id === Game.state.room.furniture[idx].id);
        const clampedX = Math.max(0, Math.min(GRID_SIZE - (item ? item.w : 1), newX));
        const clampedY = Math.max(0, Math.min(GRID_SIZE - (item ? item.h : 1), newY));
        el.style.left = `${clampedX * (100 / GRID_SIZE)}%`;
        el.style.top = `${clampedY * (100 / GRID_SIZE)}%`;
        Game.state.room.furniture[idx].x = clampedX;
        Game.state.room.furniture[idx].y = clampedY;
      }

      function onEnd() {
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        GameAudio.sfx.place();
        SaveManager.autoSave(Game.state);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    }

    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
  }

  function placeFurniture(row, col) {
    if (!selectedFurniture) return;
    const item = FURNITURE_ITEMS.find(f => f.id === selectedFurniture);
    if (!item) return;

    // Check bounds
    if (col + item.w > GRID_SIZE || row + item.h > GRID_SIZE) {
      Game.showToast('Doesn\'t fit there!');
      return;
    }

    GameAudio.sfx.place();
    Game.state.room.furniture.push({ id: item.id, x: col, y: row, rotation: 0 });
    selectedFurniture = null;
    SaveManager.autoSave(Game.state);
    renderRoom();
    renderPanel();
  }

  function removeFurniture(idx) {
    GameAudio.sfx.click();
    Game.state.room.furniture.splice(idx, 1);
    SaveManager.autoSave(Game.state);
    renderRoom();
  }

  function renderRoomCreatures() {
    const container = document.getElementById('room-creatures');
    container.innerHTML = '';
    // Show first 5 caught creatures wandering in the room
    const caught = Game.state.creatures.slice(0, 5);
    caught.forEach((cId, i) => {
      const creature = CREATURES.find(c => c.id === cId);
      if (!creature) return;
      const el = document.createElement('div');
      el.className = 'room-creature';
      el.style.left = `${20 + (i * 15) % 60}%`;
      el.style.top = `${30 + (i * 20) % 50}%`;
      el.style.animationDelay = `${i * 0.5}s`;
      el.innerHTML = drawMiniCreature(creature);
      el.onclick = () => Game.showToast(`${creature.name} (${RARITY[creature.rarity].label})`);
      container.appendChild(el);
    });
  }

  function drawMiniCreature(creature) {
    return `<svg viewBox="0 0 30 30" width="30" height="30">
      <circle cx="15" cy="15" r="12" fill="${creature.colors[0]}" stroke="${creature.colors[1]}" stroke-width="1.5"/>
      <circle cx="11" cy="13" r="2" fill="#333"/>
      <circle cx="19" cy="13" r="2" fill="#333"/>
      <circle cx="12" cy="12" r="1" fill="#FFF"/>
      <circle cx="20" cy="12" r="1" fill="#FFF"/>
      <path d="M12 19 Q15 22 18 19" stroke="#FF69B4" stroke-width="1" fill="none"/>
    </svg>`;
  }

  // --- Panel rendering ---
  function switchTab(tab) {
    GameAudio.sfx.click();
    activeTab = tab;
    document.querySelectorAll('.toolbar-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    renderPanel();
  }

  function renderPanel() {
    const content = document.getElementById('room-panel-content');
    switch (activeTab) {
      case 'furniture': renderFurniturePanel(content); break;
      case 'creatures': renderCreaturesPanel(content); break;
      case 'themes': renderThemesPanel(content); break;
      case 'shop': renderShopPanel(content); break;
    }
  }

  function renderFurniturePanel(el) {
    const unlocked = Game.state.furniture_unlocked;
    const items = FURNITURE_ITEMS.filter(f => unlocked.includes(f.id));
    el.innerHTML = '<div class="panel-items" id="furniture-panel-items"></div>';
    const container = el.querySelector('#furniture-panel-items');
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `panel-item${selectedFurniture === item.id ? ' selected' : ''}`;
      div.innerHTML = `
        <span class="panel-icon">${FURN_ICONS[item.cat] || '📦'}</span>
        <span class="panel-label">${item.name}</span>
      `;
      div.onclick = () => {
        selectedFurniture = selectedFurniture === item.id ? null : item.id;
        GameAudio.sfx.click();
        renderPanel();
      };
      container.appendChild(div);
    });
    if (items.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:0.85em;">No furniture yet!</p>';
    }
    if (selectedFurniture) {
      container.insertAdjacentHTML('beforeend', '<p style="font-size:0.75em;color:var(--teal);margin-top:8px;">Tap a cell in the room to place!</p>');
    }
  }

  function renderCreaturesPanel(el) {
    const caught = Game.state.creatures;
    if (caught.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Catch creatures first!</p>';
      return;
    }
    el.innerHTML = '<div class="panel-items"></div>';
    const container = el.querySelector('.panel-items');
    caught.forEach(cId => {
      const creature = CREATURES.find(c => c.id === cId);
      if (!creature) return;
      const div = document.createElement('div');
      div.className = 'panel-item';
      div.innerHTML = `
        <span class="panel-icon">${drawMiniCreature(creature)}</span>
        <span class="panel-label">${creature.name}</span>
      `;
      container.appendChild(div);
    });
  }

  function renderThemesPanel(el) {
    el.innerHTML = '<div class="panel-items"></div>';
    const container = el.querySelector('.panel-items');
    ROOM_THEMES.forEach(theme => {
      const owned = theme.cost === 0 || Game.state.furniture_unlocked.includes('theme-' + theme.id);
      const active = Game.state.room.theme === theme.id;
      const div = document.createElement('div');
      div.className = `theme-item${active ? ' active' : ''}`;
      div.innerHTML = `
        <div class="theme-preview" style="background:linear-gradient(180deg, ${theme.wall}, ${theme.floor});"></div>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-cost">${owned || theme.cost === 0 ? (active ? 'Active' : 'Owned') : `🪙 ${theme.cost}`}</div>
      `;
      div.onclick = () => {
        if (!owned && theme.cost > 0) {
          if (Game.state.coins < theme.cost) {
            Game.showToast('Not enough coins!');
            return;
          }
          GameAudio.sfx.buy();
          Game.addCoins(-theme.cost);
          Game.state.furniture_unlocked.push('theme-' + theme.id);
        }
        GameAudio.sfx.click();
        Game.state.room.theme = theme.id;
        applyTheme();
        SaveManager.autoSave(Game.state);
        renderPanel();
      };
      container.appendChild(div);
    });
  }

  function renderShopPanel(el) {
    const unlocked = Game.state.furniture_unlocked;
    const items = FURNITURE_ITEMS.filter(f => f.cost > 0 && !unlocked.includes(f.id));
    el.innerHTML = '<div class="panel-items"></div>';
    const container = el.querySelector('.panel-items');

    if (items.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:0.85em;">Everything unlocked!</p>';
      return;
    }

    items.forEach(item => {
      const canAfford = Game.state.coins >= item.cost;
      const div = document.createElement('div');
      div.className = 'panel-item';
      div.style.opacity = canAfford ? '1' : '0.5';
      div.innerHTML = `
        <span class="panel-icon">${FURN_ICONS[item.cat] || '📦'}</span>
        <span class="panel-label">${item.name}</span>
        <span class="panel-cost">🪙 ${item.cost}</span>
      `;
      div.onclick = () => {
        if (!canAfford) { Game.showToast('Not enough coins!'); return; }
        GameAudio.sfx.buy();
        Game.addCoins(-item.cost);
        Game.state.furniture_unlocked.push(item.id);
        SaveManager.autoSave(Game.state);
        renderPanel();
        Game.showToast(`Bought ${item.name}!`);
      };
      container.appendChild(div);
    });
  }

  return { init, onEnter, switchTab, removeFurniture };
})();
