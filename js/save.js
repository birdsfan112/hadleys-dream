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

  return { load, save, autoSave, clearSave, checkDailyBonus };
})();
