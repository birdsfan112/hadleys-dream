// ============================================================
// Hadley's Dream — Particle System
// ============================================================

const Particles = (() => {
  let canvas = null;
  let ctx = null;
  let animationFrameId = null;
  let particles = [];
  let currentLocationId = null;
  let resizeObserver = null;
  let isRunning = false;

  // Particle configuration per location
  const PARTICLE_CONFIGS = {
    'sparkle-forest': {
      count: 40,
      particles: [
        {
          type: 'firefly',
          colors: ['#FFD700', '#FFC700', '#FFAA00'],
          sizeRange: [3, 8],
          speedRange: [15, 35],
          glow: true,
          glowColor: 'rgba(255, 215, 0, 0.6)',
          wobbleAmplitude: 8,
          wobbleSpeed: 1.2
        },
        {
          type: 'leaf',
          colors: ['#228B22', '#32CD32', '#90EE90', '#DAA520'],
          sizeRange: [4, 10],
          speedRange: [8, 20],
          glow: false,
          wobbleAmplitude: 12,
          wobbleSpeed: 0.8
        }
      ]
    },
    'crystal-beach': {
      count: 35,
      particles: [
        {
          type: 'bubble',
          colors: ['rgba(173, 216, 230, 0.7)', 'rgba(135, 206, 235, 0.7)', 'rgba(240, 248, 255, 0.8)'],
          sizeRange: [5, 15],
          speedRange: [10, 25],
          glow: true,
          glowColor: 'rgba(135, 206, 250, 0.4)',
          wobbleAmplitude: 10,
          wobbleSpeed: 1.5
        },
        {
          type: 'foam',
          colors: ['#FFFFFF', '#E8F4F8', '#B0E0E6'],
          sizeRange: [2, 6],
          speedRange: [5, 15],
          glow: false,
          wobbleAmplitude: 8,
          wobbleSpeed: 1.0
        }
      ]
    },
    'cloud-garden': {
      count: 38,
      particles: [
        {
          type: 'petal',
          colors: ['#FFB7C5', '#FF91A4', '#DDA0DD', '#EE82EE'],
          sizeRange: [3, 8],
          speedRange: [12, 28],
          glow: false,
          wobbleAmplitude: 14,
          wobbleSpeed: 0.9
        },
        {
          type: 'sparkle-mote',
          colors: ['#FF1493', '#FF69B4', '#FFB6C1', '#E6B0FF'],
          sizeRange: [2, 5],
          speedRange: [20, 40],
          glow: true,
          glowColor: 'rgba(255, 105, 180, 0.5)',
          wobbleAmplitude: 6,
          wobbleSpeed: 2.0
        }
      ]
    },
    'moon-cave': {
      count: 32,
      particles: [
        {
          type: 'crystal-shard',
          colors: ['#9370DB', '#8A2BE2', '#BA55D3', '#9932CC'],
          sizeRange: [4, 12],
          speedRange: [8, 20],
          glow: true,
          glowColor: 'rgba(138, 43, 226, 0.5)',
          wobbleAmplitude: 10,
          wobbleSpeed: 1.1
        },
        {
          type: 'stardust',
          colors: ['#C0C0C0', '#E8E8FF', '#B0C4DE'],
          sizeRange: [1, 4],
          speedRange: [15, 35],
          glow: true,
          glowColor: 'rgba(192, 192, 192, 0.4)',
          wobbleAmplitude: 5,
          wobbleSpeed: 1.8
        }
      ]
    },
    'rainbow-meadow': {
      count: 45,
      particles: [
        {
          type: 'butterfly-wing',
          colors: ['#FFD700', '#FF69B4', '#00CED1', '#98FB98', '#FFB6C1'],
          sizeRange: [5, 11],
          speedRange: [10, 25],
          glow: false,
          wobbleAmplitude: 12,
          wobbleSpeed: 1.0
        },
        {
          type: 'petal-confetti',
          colors: ['#FF6347', '#FFD700', '#FF1493', '#32CD32', '#87CEEB'],
          sizeRange: [2, 7],
          speedRange: [8, 22],
          glow: false,
          wobbleAmplitude: 10,
          wobbleSpeed: 1.2
        }
      ]
    }
  };

  function init(locationId) {
    if (!locationId || !PARTICLE_CONFIGS[locationId]) {
      console.warn('Particles: Invalid location:', locationId);
      return;
    }

    stop(); // Clean up any existing particles

    currentLocationId = locationId;
    canvas = document.getElementById('particle-canvas');
    if (!canvas) {
      console.warn('Particles: canvas element not found');
      return;
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Particles: Could not get canvas context');
      return;
    }

    // Set up ResizeObserver to handle canvas sizing
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => {
      resizeCanvasSize();
    });
    resizeObserver.observe(canvas.parentElement);

    // Initial canvas sizing
    resizeCanvasSize();

    // Create particles
    createParticles(locationId);

    isRunning = true;
    animate();
  }

  function resizeCanvasSize() {
    if (!canvas || !canvas.parentElement) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  function createParticles(locationId) {
    particles = [];
    const config = PARTICLE_CONFIGS[locationId];
    if (!config) return;

    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;

    for (let i = 0; i < config.count; i++) {
      // Randomly select particle type based on distribution
      const particleTypeDef = config.particles[Math.floor(Math.random() * config.particles.length)];

      const particle = {
        type: particleTypeDef.type,
        x: Math.random() * containerWidth,
        y: Math.random() * containerHeight,
        vx: (Math.random() - 0.5) * 20, // Horizontal drift
        vy: -(Math.random() * (particleTypeDef.speedRange[1] - particleTypeDef.speedRange[0]) + particleTypeDef.speedRange[0]),
        size: Math.random() * (particleTypeDef.sizeRange[1] - particleTypeDef.sizeRange[0]) + particleTypeDef.sizeRange[0],
        baseSize: 0,
        color: particleTypeDef.colors[Math.floor(Math.random() * particleTypeDef.colors.length)],
        opacity: Math.random() * 0.5 + 0.3,
        opacityWave: Math.random() * Math.PI * 2,
        opacitySpeed: 1.5 + Math.random() * 1.5,
        time: 0,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleAmplitude: particleTypeDef.wobbleAmplitude,
        wobbleSpeed: particleTypeDef.wobbleSpeed,
        glow: particleTypeDef.glow,
        glowColor: particleTypeDef.glowColor,
        ...particleTypeDef
      };
      particle.baseSize = particle.size;
      particles.push(particle);
    }
  }

  function animate() {
    if (!isRunning || !ctx || !canvas) return;

    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // Update and draw particles
    particles.forEach((p) => {
      // Update position with wind drift
      p.x += p.vx * 0.016; // ~60fps
      p.y += p.vy * 0.016;
      p.time += 0.016;

      // Sine wave wobble for horizontal drift
      const wobble = Math.sin(p.time * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmplitude;
      const wobbleX = p.x + wobble;

      // Opacity oscillation (fade in/out)
      const opacityWave = Math.sin(p.time * p.opacitySpeed + p.opacityWave) * 0.5 + 0.5;
      const alpha = p.opacity * opacityWave;

      // Size variation based on opacity for depth effect
      const sizeVariation = p.baseSize * (opacityWave * 0.3 + 0.7);

      // Draw glow if enabled
      if (p.glow && alpha > 0.1) {
        ctx.shadowBlur = sizeVariation * 2.5;
        ctx.shadowColor = p.glowColor;
      } else {
        ctx.shadowBlur = 0;
      }

      // Draw particle
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(wobbleX, p.y, sizeVariation, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Respawn if particle goes off screen
      if (p.y < -20 || p.x < -20 || p.x > containerWidth + 20) {
        p.y = containerHeight + 10;
        p.x = Math.random() * containerWidth;
        p.opacity = Math.random() * 0.5 + 0.3;
      }
    });

    animationFrameId = requestAnimationFrame(animate);
  }

  function stop() {
    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    particles = [];
    currentLocationId = null;
  }

  return { init, stop };
})();
