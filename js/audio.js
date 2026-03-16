// ============================================================
// Hadley's Dream — Audio Manager
// ============================================================

const GameAudio = (() => {
  let muted = localStorage.getItem('hadley-muted') === 'true';
  let ctx = null;

  // Safely create AudioContext
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  } catch (e) { /* audio not supported */ }

  // Unlock audio context on first touch (iOS requirement)
  function unlock() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('click', unlock);
      });
    } else if (ctx && ctx.state === 'running') {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    }
  }
  document.addEventListener('touchstart', unlock);
  document.addEventListener('click', unlock);

  // --- Simple tone for SFX ---
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

  // ==========================================================
  // Music Style System — 3 styles: pads, musicbox, chiptune
  // ==========================================================
  const STYLES = ['pads', 'musicbox', 'chiptune'];
  let musicStyle = localStorage.getItem('hadley-music-style') || 'pads';
  let activeVoices = [];      // currently sounding oscillators + gains
  let musicTimeout = null;    // timeout for next step
  let stepIndex = 0;
  let currentMode = null;

  // --- Shared chord/melody data per mode ---
  const CHORDS = {
    hub: [
      [261.6, 329.6, 392.0, 493.9],  // Cmaj7
      [349.2, 440.0, 523.3, 659.3],  // Fmaj7
      [392.0, 493.9, 587.3, 740.0],  // Gmaj7
      [329.6, 415.3, 493.9, 622.3],  // Emaj7
    ],
    creatures: [
      [261.6, 349.2, 392.0, 293.7],  // Csus4 add9
      [220.0, 329.6, 293.7, 440.0],  // Am add9
      [349.2, 523.3, 440.0, 392.0],  // F add9
      [293.7, 440.0, 349.2, 587.3],  // Dm add9
      [392.0, 493.9, 587.3, 440.0],  // G add9
    ],
    fashion: [
      [523.3, 659.3, 784.0, 987.8],  // C5 maj7
      [587.3, 740.0, 880.0, 1047],   // D5 maj7
      [440.0, 554.4, 659.3, 830.6],  // A4 maj7
      [493.9, 622.3, 740.0, 932.3],  // B4 maj7
    ],
    room: [
      [220.0, 261.6, 329.6, 415.3],  // Am7
      [196.0, 246.9, 293.7, 370.0],  // Gm7
      [261.6, 311.1, 392.0, 493.9],  // Cm7
      [174.6, 220.0, 261.6, 329.6],  // Fm7
    ]
  };

  const TEMPOS = { hub: 4000, creatures: 5000, fashion: 3500, room: 5500 };

  // Pentatonic melodies per mode (for music box / chiptune)
  // Each entry = frequency in Hz; played sequentially
  const MELODIES = {
    hub: [523.3, 587.3, 659.3, 784.0, 659.3, 587.3, 523.3, 493.9,
          440.0, 493.9, 523.3, 659.3, 784.0, 659.3, 523.3, 440.0],
    creatures: [440.0, 523.3, 587.3, 659.3, 523.3, 440.0, 392.0, 349.2,
                392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 659.3, 523.3],
    fashion: [784.0, 880.0, 987.8, 1047, 880.0, 784.0, 659.3, 784.0,
              880.0, 987.8, 1047, 1175, 1047, 987.8, 880.0, 784.0],
    room: [329.6, 349.2, 392.0, 440.0, 392.0, 349.2, 329.6, 293.7,
           261.6, 293.7, 329.6, 392.0, 440.0, 392.0, 329.6, 261.6]
  };

  // ==========================================================
  // Style 1: PADS — warm evolving chords (original)
  // ==========================================================
  function createPadVoice(freq, gainNode) {
    if (!ctx) return [];
    const oscs = [];
    [-6, 0, 6].forEach(d => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime(d, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      oscs.push(osc);
    });
    return oscs;
  }

  function padStep() {
    if (!ctx || muted || !currentMode) return;
    try {
      const prog = CHORDS[currentMode] || CHORDS.hub;
      const tempo = TEMPOS[currentMode] || 4000;
      const fadeTime = Math.min(2.5, tempo / 2000);
      const now = ctx.currentTime;
      const perVoiceGain = 0.03;

      // Fade out old
      activeVoices.forEach(({ oscs, gain }) => {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeTime);
        oscs.forEach(o => { try { o.stop(now + fadeTime + 0.1); } catch (e) {} });
      });

      // New chord
      const chord = prog[stepIndex % prog.length];
      const newVoices = [];
      chord.forEach(freq => {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(perVoiceGain, now + fadeTime);
        gain.connect(ctx.destination);
        const oscs = createPadVoice(freq, gain);
        newVoices.push({ oscs, gain });
      });
      activeVoices = newVoices;
      stepIndex++;
      musicTimeout = setTimeout(padStep, tempo);
    } catch (e) { /* ignore */ }
  }

  // ==========================================================
  // Style 2: MUSIC BOX — plucked melodic notes with decay
  // ==========================================================
  function musicBoxNote(freq, vol) {
    if (!ctx || muted) return;
    try {
      const now = ctx.currentTime;
      // Triangle wave for soft bell-like tone
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Slight shimmer with a second detuned oscillator
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now); // octave up for sparkle
      osc2.detune.setValueAtTime(5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      // Quick pluck envelope: instant attack, exponential decay
      gain.gain.exponentialRampToValueAtTime(vol * 0.3, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(vol * 0.15, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.start();
      osc.stop(now + 0.9);
      osc2.start();
      osc2.stop(now + 0.6);
    } catch (e) { /* ignore */ }
  }

  function musicBoxStep() {
    if (muted || !currentMode) return;
    const melody = MELODIES[currentMode] || MELODIES.hub;
    const note = melody[stepIndex % melody.length];

    // Play main note
    musicBoxNote(note, 0.08);

    // Every 4th step, add a soft harmony note (a fifth above)
    if (stepIndex % 4 === 0) {
      setTimeout(() => musicBoxNote(note * 1.5, 0.04), 60);
    }

    stepIndex++;
    // Tempo varies slightly per mode — music box plays individual notes faster
    const baseDelay = currentMode === 'creatures' ? 450 : currentMode === 'room' ? 500 : 380;
    // Add gentle swing (alternating long/short)
    const swing = stepIndex % 2 === 0 ? 30 : -30;
    musicTimeout = setTimeout(musicBoxStep, baseDelay + swing);
  }

  // ==========================================================
  // Style 3: CHIPTUNE — square wave arpeggiated chords
  // ==========================================================
  function chiptuneStep() {
    if (!ctx || muted || !currentMode) return;
    try {
      const prog = CHORDS[currentMode] || CHORDS.hub;
      const chord = prog[stepIndex % prog.length];
      const now = ctx.currentTime;

      // Arpeggiate: play each note of the chord sequentially
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        const gain = ctx.createGain();
        const noteStart = now + i * 0.1; // 100ms between notes
        const noteVol = 0.025;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(noteVol, noteStart);
        gain.gain.exponentialRampToValueAtTime(noteVol * 0.5, noteStart + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });

      stepIndex++;
      // Arpeggios cycle faster than pads
      const tempo = (TEMPOS[currentMode] || 4000) * 0.4;
      musicTimeout = setTimeout(chiptuneStep, tempo);
    } catch (e) { /* ignore */ }
  }

  // ==========================================================
  // Music control
  // ==========================================================
  function stopMusic() {
    if (musicTimeout) { clearTimeout(musicTimeout); musicTimeout = null; }
    if (ctx && activeVoices.length > 0) {
      const now = ctx.currentTime;
      activeVoices.forEach(({ oscs, gain }) => {
        try {
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          oscs.forEach(o => { try { o.stop(now + 0.4); } catch (e) {} });
        } catch (e) {}
      });
      activeVoices = [];
    }
    currentMode = null;
    stepIndex = 0;
  }

  function startMusic(mode) {
    stopMusic();
    if (muted) return;
    currentMode = mode;
    stepIndex = 0;

    if (musicStyle === 'musicbox') musicBoxStep();
    else if (musicStyle === 'chiptune') chiptuneStep();
    else padStep(); // default: pads
  }

  // Cycle to next music style, restart current music
  function cycleStyle() {
    const idx = STYLES.indexOf(musicStyle);
    musicStyle = STYLES[(idx + 1) % STYLES.length];
    localStorage.setItem('hadley-music-style', musicStyle);
    if (currentMode) {
      const mode = currentMode;
      startMusic(mode);
    }
    return musicStyle;
  }

  function toggleMute() {
    const wasMode = currentMode;
    muted = !muted;
    if (muted) stopMusic();
    else if (wasMode) startMusic(wasMode);
    localStorage.setItem('hadley-muted', muted);
    document.getElementById('btn-mute').textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    return muted;
  }

  return {
    sfx, startMusic, stopMusic, toggleMute, cycleStyle,
    isMuted: () => muted,
    getStyle: () => musicStyle
  };
})();
