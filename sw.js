// Hadley's Dream World — Service Worker
const CACHE_NAME = 'dream-world-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/creatures.css',
  '/css/fashion.css',
  '/css/room.css',
  '/js/data.js',
  '/js/audio.js',
  '/js/save.js',
  '/js/creatures.js',
  '/js/fashion.js',
  '/js/room.js',
  '/js/game.js',
  '/manifest.json',
  // Scenes
  '/assets/scenes/sparkle-forest.svg',
  '/assets/scenes/crystal-beach.svg',
  '/assets/scenes/cloud-garden.svg',
  '/assets/scenes/moon-cave.svg',
  '/assets/scenes/rainbow-meadow.svg',
  // Sparkle Forest creatures
  '/assets/creatures/sparkle-bunny.svg',
  '/assets/creatures/leaf-sprite.svg',
  '/assets/creatures/mushroom-pip.svg',
  '/assets/creatures/acorn-fox.svg',
  '/assets/creatures/dewdrop-fairy.svg',
  '/assets/creatures/ancient-treant.svg',
  // Crystal Beach creatures
  '/assets/creatures/bubble-seal.svg',
  '/assets/creatures/sand-crab.svg',
  '/assets/creatures/starfish-dancer.svg',
  '/assets/creatures/pearl-otter.svg',
  '/assets/creatures/coral-seahorse.svg',
  '/assets/creatures/tide-dragon.svg',
  // Cloud Garden creatures
  '/assets/creatures/cloud-kitten.svg',
  '/assets/creatures/petal-bird.svg',
  '/assets/creatures/rainbow-snail.svg',
  '/assets/creatures/sky-jellyfish.svg',
  '/assets/creatures/storm-phoenix.svg',
  '/assets/creatures/aurora-unicorn.svg',
  // Moon Cave creatures
  '/assets/creatures/glow-bat.svg',
  '/assets/creatures/crystal-mouse.svg',
  '/assets/creatures/shadow-cat.svg',
  '/assets/creatures/gem-spider.svg',
  '/assets/creatures/moon-wolf.svg',
  '/assets/creatures/void-wyrm.svg',
  // Rainbow Meadow creatures
  '/assets/creatures/flower-hamster.svg',
  '/assets/creatures/candy-frog.svg',
  '/assets/creatures/honey-bee.svg',
  '/assets/creatures/butterfly-pixie.svg',
  '/assets/creatures/sunset-deer.svg',
  '/assets/creatures/dream-dragon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Cache-first, then network
      return cached || fetch(e.request).then(response => {
        // Cache new resources dynamically
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (e.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
