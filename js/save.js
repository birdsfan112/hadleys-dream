// ============================================================
// Hadley's Dream — Save Manager (localStorage for now)
// Firebase can be added later as an enhancement
// ============================================================

const SaveManager = (() => {
  const SAVE_KEY = 'hadley-dream-world-save';
  let saveTimeout = null;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load save:', e);
      return null;
    }
  }

  function save(state) {
    try {
      state.last_save = new Date().toISOString();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      showSaveIndicator();
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  // Debounced auto-save
  function autoSave(state) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => save(state), 500);
  }

  function showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    el.className = 'save-indicator visible saving';
    document.getElementById('save-icon').textContent = '☁️';
    document.getElementById('save-text').textContent = 'Saving...';

    setTimeout(() => {
      el.className = 'save-indicator visible saved';
      document.getElementById('save-text').textContent = 'Saved!';
      setTimeout(() => { el.className = 'save-indicator'; }, 1500);
    }, 400);
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  // Check for daily login bonus
  function checkDailyBonus(state) {
    const now = new Date();
    const last = state.last_login ? new Date(state.last_login) : null;
    if (!last || now.toDateString() !== last.toDateString()) {
      state.last_login = now.toISOString();
      return true; // Eligible for daily bonus
    }
    return false;
  }

  // Export save to a downloadable JSON file
  function exportSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        Game.showToast('No save data found!');
        return;
      }
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hadleys-dream-save-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Game.showToast('Save file downloaded!');
    } catch (e) {
      console.error('Export failed:', e);
      Game.showToast('Export failed!');
    }
  }

  // Import save from a JSON file input
  function importSave(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        // Basic validation: check for expected fields
        if (!data.coins && data.coins !== 0) throw new Error('Invalid save file');
        if (!Array.isArray(data.creatures)) throw new Error('Invalid save file');
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        Game.showToast('Save loaded! Reloading...');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        console.error('Import failed:', err);
        Game.showToast('Invalid save file!');
      }
      // Reset file input so same file can be re-selected
      fileInput.value = '';
    };
    reader.readAsText(file);
  }

  return { load, save, autoSave, clearSave, checkDailyBonus, exportSave, importSave };
})();
