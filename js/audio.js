// ============================================================
// Hadley's Dream World — Audio Manager
// ============================================================

const Audio = (() => {
  let muted = localStorage.getItem('hadley-muted') === 'true';
  let currentMusic = null;
  let ctx = null;

  // Safely create AudioContext (may not exist on all browsers/environments)
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  } catch (e) { /* audio not supported */ }

  // Unlock audio context on first touch (iOS requirement)
  function unlock() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('click', unlock);
  }
  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });

  // Generate simple tones for SFX (no external files needed)
  function playTone(freq, duration, type = 'sine', volume = 0.3) {
    if (muted || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  }

  // Play a sequence of notes
  function playMelody(notes, tempo = 0.15) {
    if (muted) return;
    notes.forEach(([freq, dur, delay], i) => {
      setTimeout(() => playTone(freq, dur || 0.2, 'sine', 0.25), (delay || i * tempo * 1000));
    });
  }

  // --- SFX ---
  const sfx = {
    click() { playTone(800, 0.08, 'sine', 0.15); },
    coin() { playMelody([[880, 0.1, 0], [1100, 0.15, 80]]); },
    discover() { playMelody([[600, 0.1, 0], [800, 0.1, 100], [1000, 0.15, 200]]); },
    catchSuccess() {
      playMelody([
        [523, 0.15, 0], [659, 0.15, 120], [784, 0.15, 240],
        [1047, 0.3, 360]
      ]);
    },
    catchMiss() { playMelody([[400, 0.2, 0], [300, 0.3, 150]]); },
    star() { playTone(1200, 0.15, 'sine', 0.2); },
    equip() { playTone(600, 0.1, 'triangle', 0.15); },
    place() { playTone(300, 0.15, 'triangle', 0.2); },
    buy() { playMelody([[500, 0.1, 0], [700, 0.1, 80], [900, 0.15, 160]]); },
    fanfare() {
      playMelody([
        [523, 0.15, 0], [523, 0.1, 150], [523, 0.1, 300],
        [659, 0.15, 450], [784, 0.2, 600], [1047, 0.4, 800]
      ]);
    },
    ready() { playMelody([[660, 0.1, 0], [880, 0.15, 100]]); }
  };

  // --- Background Music (generated oscillator loops) ---
  let musicInterval = null;

  function stopMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  function startMusic(mode) {
    stopMusic();
    if (muted) return;

    // Simple ambient loops using oscillators
    const patterns = {
      hub: { notes: [392, 440, 494, 523, 494, 440], tempo: 400, type: 'sine' },
      creatures: { notes: [330, 392, 440, 494, 523, 494, 440, 392], tempo: 350, type: 'sine' },
      fashion: { notes: [523, 587, 659, 698, 784, 698, 659, 587], tempo: 300, type: 'triangle' },
      room: { notes: [262, 294, 330, 349, 330, 294], tempo: 500, type: 'sine' }
    };

    const p = patterns[mode] || patterns.hub;
    let i = 0;
    musicInterval = setInterval(() => {
      if (!muted) playTone(p.notes[i % p.notes.length], 0.3, p.type, 0.08);
      i++;
    }, p.tempo);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) stopMusic();
    localStorage.setItem('hadley-muted', muted);
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
    return muted;
  }

  return { sfx, startMusic, stopMusic, toggleMute, isMuted: () => muted };
})();
