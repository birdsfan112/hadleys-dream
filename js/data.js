// ============================================================
// Hadley's Dream — Game Data
// ============================================================

// --- Locations ---
const LOCATIONS = [
  {
    id: 'sparkle-forest',
    name: 'Sparkle Forest',
    icon: '🌳',
    bg: 'linear-gradient(180deg, #a8e6cf 0%, #88d8a8 40%, #6bc48d 100%)',
    scene: 'assets/scenes/sparkle-forest.svg',
    spots: 6,
    description: 'A magical forest where the trees shimmer with fairy dust'
  },
  {
    id: 'crystal-beach',
    name: 'Crystal Beach',
    icon: '🏖️',
    bg: 'linear-gradient(180deg, #87CEEB 0%, #b8e4f0 40%, #f0e6c8 100%)',
    scene: 'assets/scenes/crystal-beach.svg',
    spots: 6,
    description: 'Sandy shores with sparkling crystal tide pools'
  },
  {
    id: 'cloud-garden',
    name: 'Cloud Garden',
    icon: '☁️',
    bg: 'linear-gradient(180deg, #c4a6e0 0%, #d8b8f0 40%, #e8d5f5 100%)',
    scene: 'assets/scenes/cloud-garden.svg',
    spots: 6,
    description: 'A floating garden above the clouds with rainbow flowers'
  },
  {
    id: 'moon-cave',
    name: 'Moon Cave',
    icon: '🌙',
    bg: 'linear-gradient(180deg, #1a1a3e 0%, #2d2d6b 40%, #4a4a8a 100%)',
    scene: 'assets/scenes/moon-cave.svg',
    spots: 6,
    description: 'A glowing cave lit by moonstone crystals'
  },
  {
    id: 'rainbow-meadow',
    name: 'Rainbow Meadow',
    icon: '🌈',
    bg: 'linear-gradient(180deg, #f0a0b8 0%, #e8c878 30%, #90d090 60%, #80b8e0 100%)',
    scene: 'assets/scenes/rainbow-meadow.svg',
    spots: 6,
    description: 'A meadow where flowers bloom in every color of the rainbow'
  }
];

// --- Creatures ---
// Rarities: common (50%), rare (30%), epic (15%), legendary (5%)
const CREATURES = [
  // Sparkle Forest (6)
  { id: 'sparkle-bunny', name: 'Sparkle Bunny', location: 'sparkle-forest', rarity: 'common', coins: 10,
    colors: ['#FFB6C1', '#FF69B4'], shape: 'bunny', eyes: 'round', accessory: 'bow',
    svg: 'assets/creatures/sparkle-bunny.svg' },
  { id: 'leaf-sprite', name: 'Leaf Sprite', location: 'sparkle-forest', rarity: 'common', coins: 10,
    colors: ['#90EE90', '#32CD32'], shape: 'sprite', eyes: 'sparkle', accessory: 'leaf',
    svg: 'assets/creatures/leaf-sprite.svg' },
  { id: 'mushroom-pip', name: 'Mushroom Pip', location: 'sparkle-forest', rarity: 'common', coins: 10,
    colors: ['#FF6347', '#FFF'], shape: 'mushroom', eyes: 'dot', accessory: 'spots',
    svg: 'assets/creatures/mushroom-pip.svg' },
  { id: 'acorn-fox', name: 'Acorn Fox', location: 'sparkle-forest', rarity: 'rare', coins: 25,
    colors: ['#D2691E', '#F4A460'], shape: 'fox', eyes: 'sly', accessory: 'acorn-hat',
    svg: 'assets/creatures/acorn-fox.svg' },
  { id: 'dewdrop-fairy', name: 'Dewdrop Fairy', location: 'sparkle-forest', rarity: 'rare', coins: 25,
    colors: ['#ADD8E6', '#87CEEB'], shape: 'fairy', eyes: 'big', accessory: 'wings',
    svg: 'assets/creatures/dewdrop-fairy.svg' },
  { id: 'ancient-treant', name: 'Ancient Treant', location: 'sparkle-forest', rarity: 'epic', coins: 50,
    colors: ['#8B4513', '#228B22'], shape: 'treant', eyes: 'wise', accessory: 'crown',
    svg: 'assets/creatures/ancient-treant.svg' },

  // Crystal Beach (6)
  { id: 'bubble-seal', name: 'Bubble Seal', location: 'crystal-beach', rarity: 'common', coins: 10,
    colors: ['#B0C4DE', '#87CEEB'], shape: 'seal', eyes: 'round', accessory: 'bubble',
    svg: 'assets/creatures/bubble-seal.svg' },
  { id: 'sand-crab', name: 'Sand Crab', location: 'crystal-beach', rarity: 'common', coins: 10,
    colors: ['#FFA07A', '#FF7F50'], shape: 'crab', eyes: 'stalks', accessory: 'shell-hat',
    svg: 'assets/creatures/sand-crab.svg' },
  { id: 'starfish-dancer', name: 'Starfish Dancer', location: 'crystal-beach', rarity: 'rare', coins: 25,
    colors: ['#FFD700', '#FFA500'], shape: 'starfish', eyes: 'happy', accessory: 'tiara',
    svg: 'assets/creatures/starfish-dancer.svg' },
  { id: 'pearl-otter', name: 'Pearl Otter', location: 'crystal-beach', rarity: 'rare', coins: 25,
    colors: ['#DEB887', '#D2B48C'], shape: 'otter', eyes: 'playful', accessory: 'pearl',
    svg: 'assets/creatures/pearl-otter.svg' },
  { id: 'coral-seahorse', name: 'Coral Seahorse', location: 'crystal-beach', rarity: 'epic', coins: 50,
    colors: ['#FF69B4', '#FF1493'], shape: 'seahorse', eyes: 'elegant', accessory: 'coral-crown',
    svg: 'assets/creatures/coral-seahorse.svg' },
  { id: 'tide-dragon', name: 'Tide Dragon', location: 'crystal-beach', rarity: 'legendary', coins: 100,
    colors: ['#00CED1', '#20B2AA'], shape: 'dragon', eyes: 'fierce', accessory: 'wave-wings',
    svg: 'assets/creatures/tide-dragon.svg' },

  // Cloud Garden (6)
  { id: 'cloud-kitten', name: 'Cloud Kitten', location: 'cloud-garden', rarity: 'common', coins: 10,
    colors: ['#FFF', '#E8E8E8'], shape: 'kitten', eyes: 'sleepy', accessory: 'halo',
    svg: 'assets/creatures/cloud-kitten.svg' },
  { id: 'petal-bird', name: 'Petal Bird', location: 'cloud-garden', rarity: 'common', coins: 10,
    colors: ['#FFB7C5', '#FF91A4'], shape: 'bird', eyes: 'bead', accessory: 'flower-hat',
    svg: 'assets/creatures/petal-bird.svg' },
  { id: 'rainbow-snail', name: 'Rainbow Snail', location: 'cloud-garden', rarity: 'rare', coins: 25,
    colors: ['#DDA0DD', '#DA70D6'], shape: 'snail', eyes: 'curious', accessory: 'rainbow-shell',
    svg: 'assets/creatures/rainbow-snail.svg' },
  { id: 'sky-jellyfish', name: 'Sky Jellyfish', location: 'cloud-garden', rarity: 'rare', coins: 25,
    colors: ['#E6E6FA', '#D8BFD8'], shape: 'jellyfish', eyes: 'dreamy', accessory: 'sparkle-trail',
    svg: 'assets/creatures/sky-jellyfish.svg' },
  { id: 'storm-phoenix', name: 'Storm Phoenix', location: 'cloud-garden', rarity: 'epic', coins: 50,
    colors: ['#9370DB', '#8A2BE2'], shape: 'phoenix', eyes: 'electric', accessory: 'lightning',
    svg: 'assets/creatures/storm-phoenix.svg' },
  { id: 'aurora-unicorn', name: 'Aurora Unicorn', location: 'cloud-garden', rarity: 'legendary', coins: 100,
    colors: ['#FFD1DC', '#C8A2C8'], shape: 'unicorn', eyes: 'magical', accessory: 'aurora-mane',
    svg: 'assets/creatures/aurora-unicorn.svg' },

  // Moon Cave (6)
  { id: 'glow-bat', name: 'Glow Bat', location: 'moon-cave', rarity: 'common', coins: 10,
    colors: ['#483D8B', '#6A5ACD'], shape: 'bat', eyes: 'glowing', accessory: 'moon-charm',
    svg: 'assets/creatures/glow-bat.svg' },
  { id: 'crystal-mouse', name: 'Crystal Mouse', location: 'moon-cave', rarity: 'common', coins: 10,
    colors: ['#C0C0C0', '#A9A9A9'], shape: 'mouse', eyes: 'twinkle', accessory: 'crystal',
    svg: 'assets/creatures/crystal-mouse.svg' },
  { id: 'shadow-cat', name: 'Shadow Cat', location: 'moon-cave', rarity: 'rare', coins: 25,
    colors: ['#2F2F4F', '#4F4F6F'], shape: 'cat', eyes: 'mysterious', accessory: 'star-collar',
    svg: 'assets/creatures/shadow-cat.svg' },
  { id: 'gem-spider', name: 'Gem Spider', location: 'moon-cave', rarity: 'rare', coins: 25,
    colors: ['#7B68EE', '#6959CD'], shape: 'spider', eyes: 'many', accessory: 'web-jewels',
    svg: 'assets/creatures/gem-spider.svg' },
  { id: 'moon-wolf', name: 'Moon Wolf', location: 'moon-cave', rarity: 'epic', coins: 50,
    colors: ['#4169E1', '#1E90FF'], shape: 'wolf', eyes: 'piercing', accessory: 'moon-aura',
    svg: 'assets/creatures/moon-wolf.svg' },
  { id: 'void-wyrm', name: 'Void Wyrm', location: 'moon-cave', rarity: 'legendary', coins: 100,
    colors: ['#191970', '#000080'], shape: 'wyrm', eyes: 'cosmic', accessory: 'star-dust',
    svg: 'assets/creatures/void-wyrm.svg' },

  // Rainbow Meadow (6)
  { id: 'flower-hamster', name: 'Flower Hamster', location: 'rainbow-meadow', rarity: 'common', coins: 10,
    colors: ['#FFDAB9', '#FFE4B5'], shape: 'hamster', eyes: 'beady', accessory: 'flower-crown',
    svg: 'assets/creatures/flower-hamster.svg' },
  { id: 'candy-frog', name: 'Candy Frog', location: 'rainbow-meadow', rarity: 'common', coins: 10,
    colors: ['#98FB98', '#00FA9A'], shape: 'frog', eyes: 'big-round', accessory: 'lollipop',
    svg: 'assets/creatures/candy-frog.svg' },
  { id: 'honey-bee', name: 'Honey Bee', location: 'rainbow-meadow', rarity: 'common', coins: 10,
    colors: ['#FFD700', '#DAA520'], shape: 'bee', eyes: 'cute', accessory: 'honey-jar',
    svg: 'assets/creatures/honey-bee.svg' },
  { id: 'butterfly-pixie', name: 'Butterfly Pixie', location: 'rainbow-meadow', rarity: 'rare', coins: 25,
    colors: ['#FF69B4', '#FF1493'], shape: 'pixie', eyes: 'twinkle', accessory: 'butterfly-wings',
    svg: 'assets/creatures/butterfly-pixie.svg' },
  { id: 'sunset-deer', name: 'Sunset Deer', location: 'rainbow-meadow', rarity: 'epic', coins: 50,
    colors: ['#FF6347', '#FF4500'], shape: 'deer', eyes: 'gentle', accessory: 'sunset-antlers',
    svg: 'assets/creatures/sunset-deer.svg' },
  { id: 'dream-dragon', name: 'Dream Dragon', location: 'rainbow-meadow', rarity: 'epic', coins: 50,
    colors: ['#FFB6C1', '#DDA0DD'], shape: 'dragon', eyes: 'dreamy', accessory: 'flower-wreath',
    svg: 'assets/creatures/dream-dragon.svg' }
];

// Rarity config
const RARITY = {
  common:    { chance: 0.50, color: '#8BC34A', ringSpeed: 1.0, ringSize: 1.0, cooldown: 30000, label: 'Common' },
  rare:      { chance: 0.30, color: '#2196F3', ringSpeed: 1.3, ringSize: 0.85, cooldown: 120000, label: 'Rare' },
  epic:      { chance: 0.15, color: '#9C27B0', ringSpeed: 1.6, ringSize: 0.7, cooldown: 300000, label: 'Epic' },
  legendary: { chance: 0.05, color: '#FF9800', ringSpeed: 2.0, ringSize: 0.55, cooldown: 900000, label: 'Legendary' }
};

// --- Fashion Items ---
const FASHION_CATEGORIES = ['hair', 'top', 'bottom', 'dress', 'shoes', 'accessory', 'hat'];

const FASHION_ITEMS = [
  // Hair (2 free + 1 shop)
  { id: 'hair-1', cat: 'hair', name: 'Long Straight', cost: 0, tags: ['classic','elegant'], color: '#5C3317', svg: 'assets/fashion/hair-long-straight.svg' },
  { id: 'hair-2', cat: 'hair', name: 'Pigtails', cost: 0, tags: ['cute','playful'], color: '#FFD700', svg: 'assets/fashion/hair-pigtails.svg' },
  { id: 'hair-5', cat: 'hair', name: 'Space Buns', cost: 40, tags: ['space','pop'], color: '#FF69B4', svg: 'assets/fashion/hair-space-buns.svg' },

  // Tops (2 free + 1 shop)
  { id: 'top-1', cat: 'top', name: 'Basic Tee', cost: 0, tags: ['casual','everyday'], color: '#87CEEB', svg: 'assets/fashion/top-basic-tee.svg' },
  { id: 'top-3', cat: 'top', name: 'Hoodie', cost: 0, tags: ['cozy','winter','casual'], color: '#DDA0DD', svg: 'assets/fashion/top-hoodie.svg' },
  { id: 'top-6', cat: 'top', name: 'Princess Blouse', cost: 50, tags: ['princess','elegant'], color: '#FFC0CB', svg: 'assets/fashion/top-princess-blouse.svg' },

  // Bottoms (2 free + 1 shop)
  { id: 'bottom-1', cat: 'bottom', name: 'Jeans', cost: 0, tags: ['casual','everyday'], color: '#4169E1', svg: 'assets/fashion/bottom-jeans.svg' },
  { id: 'bottom-2', cat: 'bottom', name: 'Pink Skirt', cost: 0, tags: ['cute','party'], color: '#FF69B4', svg: 'assets/fashion/bottom-pink-skirt.svg' },
  { id: 'bottom-4', cat: 'bottom', name: 'Tutu', cost: 40, tags: ['princess','party','dance'], color: '#FFB6C1', svg: 'assets/fashion/bottom-tutu.svg' },

  // Dresses (2 free + 1 shop)
  { id: 'dress-1', cat: 'dress', name: 'Sundress', cost: 0, tags: ['casual','beach','summer'], color: '#FFFFE0', svg: 'assets/fashion/dress-sundress.svg' },
  { id: 'dress-2', cat: 'dress', name: 'Party Dress', cost: 0, tags: ['party','pop'], color: '#FF69B4', svg: 'assets/fashion/dress-party-dress.svg' },
  { id: 'dress-4', cat: 'dress', name: 'Ball Gown', cost: 100, tags: ['princess','elegant','party'], color: '#FFD700', svg: 'assets/fashion/dress-ball-gown.svg' },

  // Shoes (2 free + 1 shop)
  { id: 'shoes-1', cat: 'shoes', name: 'Sneakers', cost: 0, tags: ['casual','sport','everyday'], color: '#FFF', svg: 'assets/fashion/shoes-sneakers.svg' },
  { id: 'shoes-3', cat: 'shoes', name: 'Boots', cost: 0, tags: ['adventure','winter','rock'], color: '#8B4513', svg: 'assets/fashion/shoes-boots.svg' },
  { id: 'shoes-4', cat: 'shoes', name: 'Glass Slippers', cost: 80, tags: ['princess','elegant','party'], color: '#E0FFFF', svg: 'assets/fashion/shoes-glass-slippers.svg' },

  // Accessories (2 free + 1 shop)
  { id: 'acc-1', cat: 'accessory', name: 'Heart Necklace', cost: 0, tags: ['cute','party'], color: '#FF69B4', svg: 'assets/fashion/acc-heart-necklace.svg' },
  { id: 'acc-2', cat: 'accessory', name: 'Sunglasses', cost: 0, tags: ['beach','casual','pop'], color: '#2F2F2F', svg: 'assets/fashion/acc-sunglasses.svg' },
  { id: 'acc-7', cat: 'accessory', name: 'Fairy Wings', cost: 80, tags: ['fantasy','princess','party'], color: '#E6E6FA', svg: 'assets/fashion/acc-fairy-wings.svg' },

  // Hats (2 free + 1 shop)
  { id: 'hat-2', cat: 'hat', name: 'Flower Crown', cost: 0, tags: ['cute','fantasy','party'], color: '#FF69B4', svg: 'assets/fashion/hat-flower-crown.svg' },
  { id: 'hat-3', cat: 'hat', name: 'Beanie', cost: 0, tags: ['cozy','winter','casual'], color: '#DDA0DD', svg: 'assets/fashion/hat-beanie.svg' },
  { id: 'hat-4', cat: 'hat', name: 'Tiara', cost: 70, tags: ['princess','elegant','party'], color: '#FFD700', svg: 'assets/fashion/hat-tiara.svg' }

  // --- Remaining items (commented out for future expansion) ---
  // { id: 'hair-3', cat: 'hair', name: 'Short Bob', cost: 0, tags: ['modern','casual'], color: '#8B0000' },
  // { id: 'hair-4', cat: 'hair', name: 'Curly Long', cost: 30, tags: ['fancy','princess'], color: '#D2691E' },
  // { id: 'hair-6', cat: 'hair', name: 'Braided Crown', cost: 50, tags: ['princess','elegant'], color: '#C0C0C0' },
  // { id: 'hair-7', cat: 'hair', name: 'Punk Spikes', cost: 35, tags: ['rock','edgy'], color: '#9400D3' },
  // { id: 'hair-8', cat: 'hair', name: 'Mermaid Waves', cost: 60, tags: ['beach','fantasy'], color: '#40E0D0' },
  // { id: 'top-2', cat: 'top', name: 'Striped Shirt', cost: 0, tags: ['casual','nautical'], color: '#FF6347' },
  // { id: 'top-4', cat: 'top', name: 'Sparkle Crop', cost: 25, tags: ['pop','party'], color: '#FFD700' },
  // { id: 'top-5', cat: 'top', name: 'Denim Jacket', cost: 35, tags: ['casual','rock'], color: '#4682B4' },
  // { id: 'top-7', cat: 'top', name: 'Space Suit Top', cost: 60, tags: ['space','adventure'], color: '#C0C0C0' },
  // { id: 'top-8', cat: 'top', name: 'Cozy Sweater', cost: 30, tags: ['cozy','winter'], color: '#F5DEB3' },
  // { id: 'bottom-3', cat: 'bottom', name: 'Leggings', cost: 0, tags: ['casual','cozy','sport'], color: '#2F4F4F' },
  // { id: 'bottom-5', cat: 'bottom', name: 'Cargo Shorts', cost: 25, tags: ['adventure','beach','casual'], color: '#D2B48C' },
  // { id: 'bottom-6', cat: 'bottom', name: 'Glitter Pants', cost: 50, tags: ['pop','party','rock'], color: '#FFD700' },
  // { id: 'bottom-7', cat: 'bottom', name: 'Flowy Skirt', cost: 35, tags: ['elegant','beach'], color: '#E6E6FA' },
  // { id: 'bottom-8', cat: 'bottom', name: 'Space Pants', cost: 55, tags: ['space','adventure'], color: '#191970' },
  // { id: 'dress-3', cat: 'dress', name: 'Overalls', cost: 0, tags: ['casual','adventure'], color: '#4682B4' },
  // { id: 'dress-5', cat: 'dress', name: 'Mermaid Dress', cost: 80, tags: ['beach','fantasy'], color: '#40E0D0' },
  // { id: 'dress-6', cat: 'dress', name: 'Rock Star Outfit', cost: 70, tags: ['rock','pop','edgy'], color: '#2F2F2F' },
  // { id: 'dress-7', cat: 'dress', name: 'Winter Coat Dress', cost: 60, tags: ['winter','cozy','elegant'], color: '#B22222' },
  // { id: 'dress-8', cat: 'dress', name: 'Fairy Dress', cost: 120, tags: ['fantasy','princess','party'], color: '#DDA0DD' },
  // { id: 'shoes-2', cat: 'shoes', name: 'Sandals', cost: 0, tags: ['beach','casual','summer'], color: '#D2691E' },
  // { id: 'shoes-5', cat: 'shoes', name: 'Platform Stars', cost: 50, tags: ['pop','rock','party'], color: '#FFD700' },
  // { id: 'shoes-6', cat: 'shoes', name: 'Fairy Flats', cost: 40, tags: ['fantasy','cute','elegant'], color: '#FF69B4' },
  // { id: 'shoes-7', cat: 'shoes', name: 'Space Boots', cost: 55, tags: ['space','adventure'], color: '#C0C0C0' },
  // { id: 'shoes-8', cat: 'shoes', name: 'Fuzzy Slippers', cost: 25, tags: ['cozy','winter','cute'], color: '#FFB6C1' },
  // { id: 'acc-3', cat: 'accessory', name: 'Flower Bracelet', cost: 0, tags: ['cute','fantasy'], color: '#FF6347' },
  // { id: 'acc-4', cat: 'accessory', name: 'Star Earrings', cost: 30, tags: ['space','pop','party'], color: '#FFD700' },
  // { id: 'acc-5', cat: 'accessory', name: 'Princess Wand', cost: 60, tags: ['princess','fantasy'], color: '#FFD700' },
  // { id: 'acc-6', cat: 'accessory', name: 'Guitar', cost: 50, tags: ['rock','pop'], color: '#8B0000' },
  // { id: 'acc-8', cat: 'accessory', name: 'Scarf', cost: 20, tags: ['winter','cozy','casual'], color: '#FF6347' },
  // { id: 'hat-1', cat: 'hat', name: 'Baseball Cap', cost: 0, tags: ['casual','sport'], color: '#FF6347' },
  // { id: 'hat-5', cat: 'hat', name: 'Witch Hat', cost: 45, tags: ['fantasy','edgy'], color: '#4B0082' },
  // { id: 'hat-6', cat: 'hat', name: 'Sun Hat', cost: 30, tags: ['beach','summer','elegant'], color: '#F5DEB3' },
  // { id: 'hat-7', cat: 'hat', name: 'Space Helmet', cost: 65, tags: ['space','adventure'], color: '#E0E0E0' },
  // { id: 'hat-8', cat: 'hat', name: 'Cat Ears', cost: 35, tags: ['cute','pop','party'], color: '#FFB6C1' }
];

// --- Fashion Challenges ---
const CHALLENGE_THEMES = [
  { id: 'beach-party', name: 'Beach Party', tags: ['beach','summer','casual'], icon: '🏖️' },
  { id: 'princess-ball', name: 'Princess Ball', tags: ['princess','elegant','party'], icon: '👑' },
  { id: 'space-explorer', name: 'Space Explorer', tags: ['space','adventure'], icon: '🚀' },
  { id: 'cozy-winter', name: 'Cozy Winter', tags: ['winter','cozy'], icon: '❄️' },
  { id: 'pop-star', name: 'Pop Star', tags: ['pop','party','rock'], icon: '⭐' },
  { id: 'fairy-garden', name: 'Fairy Garden', tags: ['fantasy','cute'], icon: '🧚' },
  { id: 'rock-concert', name: 'Rock Concert', tags: ['rock','edgy','pop'], icon: '🎸' },
  { id: 'tropical-vacation', name: 'Tropical Vacation', tags: ['beach','summer','casual'], icon: '🌺' },
  { id: 'enchanted-forest', name: 'Enchanted Forest', tags: ['fantasy','adventure'], icon: '🌲' },
  { id: 'dance-recital', name: 'Dance Recital', tags: ['elegant','party','cute'], icon: '💃' },
  { id: 'sleepover', name: 'Sleepover', tags: ['cozy','cute','casual'], icon: '🌙' },
  { id: 'red-carpet', name: 'Red Carpet', tags: ['elegant','party','pop'], icon: '🎬' },
  { id: 'garden-tea-party', name: 'Garden Tea Party', tags: ['elegant','cute','summer'], icon: '🫖' },
  { id: 'sporty-chic', name: 'Sporty Chic', tags: ['sport','casual'], icon: '⚽' },
  { id: 'mermaid-lagoon', name: 'Mermaid Lagoon', tags: ['beach','fantasy'], icon: '🧜' },
  { id: 'candy-land', name: 'Candy Land', tags: ['cute','party','pop'], icon: '🍭' },
  { id: 'pirate-adventure', name: 'Pirate Adventure', tags: ['adventure','edgy'], icon: '🏴‍☠️' },
  { id: 'rainbow-festival', name: 'Rainbow Festival', tags: ['party','pop','cute'], icon: '🌈' },
  { id: 'ice-queen', name: 'Ice Queen', tags: ['winter','elegant','princess'], icon: '🧊' },
  { id: 'mystical-night', name: 'Mystical Night', tags: ['fantasy','elegant','edgy'], icon: '✨' }
];

// --- Furniture ---
const FURNITURE_ITEMS = [
  // Beds
  { id: 'bed-basic', cat: 'bed', name: 'Basic Bed', cost: 0, w: 2, h: 3, color: '#DEB887' },
  { id: 'bed-princess', cat: 'bed', name: 'Princess Canopy', cost: 80, w: 2, h: 3, color: '#FFB6C1' },
  { id: 'bed-cloud', cat: 'bed', name: 'Cloud Bed', cost: 100, w: 2, h: 3, color: '#E8E8E8' },
  { id: 'bed-bunk', cat: 'bed', name: 'Bunk Bed', cost: 120, w: 2, h: 3, color: '#8B4513' },

  // Desks
  { id: 'desk-basic', cat: 'desk', name: 'Study Desk', cost: 0, w: 2, h: 1, color: '#D2B48C' },
  { id: 'desk-vanity', cat: 'desk', name: 'Vanity Table', cost: 60, w: 2, h: 1, color: '#FFB6C1' },
  { id: 'desk-art', cat: 'desk', name: 'Art Table', cost: 70, w: 2, h: 1, color: '#87CEEB' },

  // Shelves
  { id: 'shelf-books', cat: 'shelf', name: 'Bookshelf', cost: 30, w: 1, h: 2, color: '#8B4513' },
  { id: 'shelf-display', cat: 'shelf', name: 'Display Shelf', cost: 40, w: 2, h: 1, color: '#DEB887' },
  { id: 'shelf-cute', cat: 'shelf', name: 'Cloud Shelf', cost: 50, w: 1, h: 1, color: '#E8E8E8' },

  // Plants
  { id: 'plant-pot', cat: 'plant', name: 'Potted Plant', cost: 15, w: 1, h: 1, color: '#228B22' },
  { id: 'plant-cactus', cat: 'plant', name: 'Cute Cactus', cost: 20, w: 1, h: 1, color: '#32CD32' },
  { id: 'plant-tree', cat: 'plant', name: 'Mini Tree', cost: 35, w: 1, h: 2, color: '#2E8B57' },

  // Rugs
  { id: 'rug-round', cat: 'rug', name: 'Round Rug', cost: 25, w: 2, h: 2, color: '#DDA0DD' },
  { id: 'rug-star', cat: 'rug', name: 'Star Rug', cost: 40, w: 3, h: 3, color: '#FFD700' },
  { id: 'rug-heart', cat: 'rug', name: 'Heart Rug', cost: 35, w: 2, h: 2, color: '#FF69B4' },

  // Lamps
  { id: 'lamp-desk', cat: 'lamp', name: 'Desk Lamp', cost: 20, w: 1, h: 1, color: '#FFD700' },
  { id: 'lamp-floor', cat: 'lamp', name: 'Floor Lamp', cost: 35, w: 1, h: 1, color: '#FFA500' },
  { id: 'lamp-fairy', cat: 'lamp', name: 'Fairy Lights', cost: 30, w: 2, h: 1, color: '#FFE4B5' },
  { id: 'lamp-lava', cat: 'lamp', name: 'Lava Lamp', cost: 45, w: 1, h: 1, color: '#FF6347' },

  // Decor
  { id: 'poster-stars', cat: 'decor', name: 'Star Poster', cost: 15, w: 1, h: 1, color: '#191970' },
  { id: 'poster-cat', cat: 'decor', name: 'Cat Poster', cost: 15, w: 1, h: 1, color: '#FFB6C1' },
  { id: 'mirror-heart', cat: 'decor', name: 'Heart Mirror', cost: 30, w: 1, h: 1, color: '#E0FFFF' },
  { id: 'plush-bear', cat: 'decor', name: 'Teddy Bear', cost: 25, w: 1, h: 1, color: '#D2691E' },
  { id: 'plush-bunny', cat: 'decor', name: 'Plush Bunny', cost: 25, w: 1, h: 1, color: '#FFB6C1' },
  { id: 'aquarium', cat: 'decor', name: 'Mini Aquarium', cost: 60, w: 1, h: 1, color: '#00CED1' },

  // Seating
  { id: 'chair-bean', cat: 'seating', name: 'Bean Bag', cost: 30, w: 1, h: 1, color: '#FF69B4' },
  { id: 'chair-swing', cat: 'seating', name: 'Hanging Chair', cost: 50, w: 1, h: 1, color: '#DEB887' },
  { id: 'sofa-mini', cat: 'seating', name: 'Mini Sofa', cost: 60, w: 2, h: 1, color: '#DDA0DD' }
];

// --- Room Themes ---
const ROOM_THEMES = [
  { id: 'default', name: 'Classic', cost: 0, wall: '#FFF5EE', floor: '#DEB887' },
  { id: 'beach', name: 'Beach', cost: 100, wall: '#E0F7FA', floor: '#F5DEB3' },
  { id: 'forest', name: 'Forest', cost: 100, wall: '#E8F5E9', floor: '#8B7355' },
  { id: 'space', name: 'Space', cost: 150, wall: '#1A1A2E', floor: '#2D2D44' },
  { id: 'castle', name: 'Castle', cost: 200, wall: '#F3E5F5', floor: '#9E9E9E' },
  { id: 'candy', name: 'Candy', cost: 150, wall: '#FFF0F5', floor: '#FFB6C1' },
  { id: 'ocean', name: 'Ocean', cost: 200, wall: '#006994', floor: '#F0E68C' },
  { id: 'cloud', name: 'Cloud', cost: 250, wall: '#F0F8FF', floor: '#E8E8E8' }
];

// --- Daily Login ---
const DAILY_BONUS = 25;

// --- Starting state ---
const DEFAULT_STATE = {
  coins: 100,
  creatures: [],
  wardrobe_unlocked: FASHION_ITEMS.filter(i => i.cost === 0).map(i => i.id),
  furniture_unlocked: FURNITURE_ITEMS.filter(i => i.cost === 0).map(i => i.id),
  fashion_scores: {},
  saved_outfits: [],
  room: { furniture: [], theme: 'default' },
  stats: { total_caught: 0, total_coins_earned: 100, challenges_completed: 0 },
  leaderboard: {},
  last_login: null,
  last_save: null,
  tutorial_completed: false,
  last_location: 'sparkle-forest'
};
