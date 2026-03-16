// Hadley's Dream — Service Worker
const CACHE_NAME = 'dream-world-v16';
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
  '/js/particles.js',
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
  // Sparkle Forest creatures (10)
  '/assets/creatures/sparkle-bunny.svg',
  '/assets/creatures/leaf-sprite.svg',
  '/assets/creatures/mushroom-pip.svg',
  '/assets/creatures/moss-turtle.svg',
  '/assets/creatures/acorn-fox.svg',
  '/assets/creatures/dewdrop-fairy.svg',
  '/assets/creatures/berry-hedgehog.svg',
  '/assets/creatures/ancient-treant.svg',
  '/assets/creatures/fern-phoenix.svg',
  '/assets/creatures/elder-owl.svg',
  // Crystal Beach creatures (10)
  '/assets/creatures/bubble-seal.svg',
  '/assets/creatures/sand-crab.svg',
  '/assets/creatures/shell-snail.svg',
  '/assets/creatures/jellyblob.svg',
  '/assets/creatures/starfish-dancer.svg',
  '/assets/creatures/pearl-otter.svg',
  '/assets/creatures/wave-dolphin.svg',
  '/assets/creatures/coral-seahorse.svg',
  '/assets/creatures/crystal-turtle.svg',
  '/assets/creatures/tide-dragon.svg',
  // Cloud Garden creatures (10)
  '/assets/creatures/cloud-kitten.svg',
  '/assets/creatures/petal-bird.svg',
  '/assets/creatures/fluff-lamb.svg',
  '/assets/creatures/breeze-butterfly.svg',
  '/assets/creatures/rainbow-snail.svg',
  '/assets/creatures/sky-jellyfish.svg',
  '/assets/creatures/wind-fox.svg',
  '/assets/creatures/storm-phoenix.svg',
  '/assets/creatures/nimbus-dragon.svg',
  '/assets/creatures/aurora-unicorn.svg',
  // Moon Cave creatures (10)
  '/assets/creatures/glow-bat.svg',
  '/assets/creatures/crystal-mouse.svg',
  '/assets/creatures/cave-mushroom.svg',
  '/assets/creatures/echo-moth.svg',
  '/assets/creatures/shadow-cat.svg',
  '/assets/creatures/gem-spider.svg',
  '/assets/creatures/glimmer-snake.svg',
  '/assets/creatures/moon-wolf.svg',
  '/assets/creatures/stalagmite-golem.svg',
  '/assets/creatures/void-wyrm.svg',
  // Rainbow Meadow creatures (10)
  '/assets/creatures/flower-hamster.svg',
  '/assets/creatures/candy-frog.svg',
  '/assets/creatures/honey-bee.svg',
  '/assets/creatures/daisy-ladybug.svg',
  '/assets/creatures/butterfly-pixie.svg',
  '/assets/creatures/clover-bunny.svg',
  '/assets/creatures/pollen-sprite.svg',
  '/assets/creatures/sunset-deer.svg',
  '/assets/creatures/dream-dragon.svg',
  '/assets/creatures/prism-pegasus.svg',
  // Dream Nexus creatures (6 of 10)
  '/assets/creatures/292B2E44-E8C7-4D85-AC85-D490B9733D38.png',
  '/assets/creatures/390F02B2-AEDF-4513-ADDC-F15AE3D5386A.png',
  '/assets/creatures/165C9F33-D8F5-4A63-8987-BB9B2E35B404.png',
  '/assets/creatures/388189EF-BAA1-4FEA-85DA-CF5B9779E181.png',
  '/assets/creatures/IMG_8342.png',
  '/assets/creatures/IMG_8343.png',
  // Dream Nexus scene
  '/assets/scenes/dream-nexus.svg',
  // Fashion Studio SVGs (original)
  '/assets/fashion/avatar-base.svg',
  '/assets/fashion/hair-long-straight.svg',
  '/assets/fashion/hair-pigtails.svg',
  '/assets/fashion/hair-space-buns.svg',
  '/assets/fashion/top-basic-tee.svg',
  '/assets/fashion/top-hoodie.svg',
  '/assets/fashion/top-princess-blouse.svg',
  '/assets/fashion/bottom-jeans.svg',
  '/assets/fashion/bottom-pink-skirt.svg',
  '/assets/fashion/bottom-tutu.svg',
  '/assets/fashion/dress-sundress.svg',
  '/assets/fashion/dress-party-dress.svg',
  '/assets/fashion/dress-ball-gown.svg',
  '/assets/fashion/shoes-sneakers.svg',
  '/assets/fashion/shoes-boots.svg',
  '/assets/fashion/shoes-glass-slippers.svg',
  '/assets/fashion/acc-heart-necklace.svg',
  '/assets/fashion/acc-sunglasses.svg',
  '/assets/fashion/acc-fairy-wings.svg',
  '/assets/fashion/hat-flower-crown.svg',
  '/assets/fashion/hat-beanie.svg',
  '/assets/fashion/hat-tiara.svg',
  // Fashion Studio SVGs (expanded)
  '/assets/fashion/hair-short-bob.svg',
  '/assets/fashion/hair-curly-long.svg',
  '/assets/fashion/hair-braided-crown.svg',
  '/assets/fashion/hair-punk-spikes.svg',
  '/assets/fashion/hair-mermaid-waves.svg',
  '/assets/fashion/top-striped-shirt.svg',
  '/assets/fashion/top-sparkle-crop.svg',
  '/assets/fashion/top-denim-jacket.svg',
  '/assets/fashion/top-space-suit.svg',
  '/assets/fashion/top-cozy-sweater.svg',
  '/assets/fashion/bottom-leggings.svg',
  '/assets/fashion/bottom-cargo-shorts.svg',
  '/assets/fashion/bottom-glitter-pants.svg',
  '/assets/fashion/bottom-flowy-skirt.svg',
  '/assets/fashion/bottom-space-pants.svg',
  '/assets/fashion/dress-overalls.svg',
  '/assets/fashion/dress-mermaid.svg',
  '/assets/fashion/dress-rock-star.svg',
  '/assets/fashion/dress-winter-coat.svg',
  '/assets/fashion/dress-fairy.svg',
  '/assets/fashion/shoes-sandals.svg',
  '/assets/fashion/shoes-platform-stars.svg',
  '/assets/fashion/shoes-fairy-flats.svg',
  '/assets/fashion/shoes-space-boots.svg',
  '/assets/fashion/shoes-fuzzy-slippers.svg',
  '/assets/fashion/acc-flower-bracelet.svg',
  '/assets/fashion/acc-star-earrings.svg',
  '/assets/fashion/acc-princess-wand.svg',
  '/assets/fashion/acc-guitar.svg',
  '/assets/fashion/acc-scarf.svg',
  '/assets/fashion/hat-baseball-cap.svg',
  '/assets/fashion/hat-witch-hat.svg',
  '/assets/fashion/hat-sun-hat.svg',
  '/assets/fashion/hat-space-helmet.svg',
  '/assets/fashion/hat-cat-ears.svg'
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
