# Spec: Creature & Scene Artwork for 4 Remaining Locations

**Date:** 2026-03-05
**Type:** Feature
**Priority:** High
**Estimated Complexity:** Large (8-12 hours of SVG authoring + data wiring)

## Background

Sparkle Forest is the only location with illustrated SVG artwork (1 scene background + 6 creature SVGs). The remaining 4 locations -- Crystal Beach, Cloud Garden, Moon Cave, and Rainbow Meadow -- show only gradient backgrounds and fall back to canvas-drawn shapes for creatures. This makes them feel unfinished compared to Sparkle Forest.

## Current State

**Sparkle Forest (the reference implementation):**
- Scene SVG: `assets/scenes/sparkle-forest.svg` -- 800x600 viewBox, layered composition (sky gradient, sun, clouds, hills, trees, mushrooms, flowers, animated sparkle particles). ~164 lines of SVG.
- Creature SVGs: `assets/creatures/*.svg` -- 200x200 viewBox, 30-60 lines each. Style uses CSS classes for fill/stroke, simple geometric shapes (circles, ellipses, paths), eye shine highlights, blush marks, and occasional SVG animations for sparkle effects.
- Data wiring: Each creature has `svg: 'assets/creatures/{id}.svg'` property. Location has `scene: 'assets/scenes/{id}.svg'` property.

**How SVGs are used in-game (`js/creatures.js`):**
- Scene backgrounds: Set as CSS `background-image` on `#location-scene`, sized with `background-size: cover` and `background-position: center bottom`. Must look good at various mobile aspect ratios.
- Creature SVGs: Fetched and cached as text, then inserted as inline SVG via `sanitizeSVG()` into a container in the catch overlay and collection modal. Also used as `<img>` fallback. Displayed at roughly 120-160px in the catch overlay and 80x80px in collection thumbnails.

**Data structure gaps:**
- The 24 creatures across 4 locations already exist in `data.js` with `id`, `name`, `location`, `rarity`, `coins`, `colors`, `shape`, `eyes`, and `accessory` properties -- but none have `svg:` paths.
- The 4 location entries exist with `bg:` gradients but no `scene:` property.

**Bug found during review:** `cloud-garden` and `moon-cave` have `spots: 5` in LOCATIONS (data.js lines 29, 35) but each has 6 creatures defined in CREATURES (lines 88-99, 102-113). This should be fixed to `spots: 6` when adding artwork, otherwise the 6th creature in each location may never appear in exploration.

## Goal

After this work is done:
1. All 4 locations have illustrated scene backgrounds that match Sparkle Forest's quality and style.
2. All 24 creatures have individual SVG artwork that is cute, recognizable at 80x80px, and uses the creature's defined `colors`.
3. Data.js is updated so all creatures have `svg:` paths and all locations have `scene:` paths.
4. The `spots` count bug is fixed for Cloud Garden and Moon Cave (both should be 6).

## Art Direction: General Guidelines

Based on the existing Sparkle Forest SVGs, these are the style rules every new asset must follow:

**Creatures (200x200 viewBox):**
- Use CSS `<style>` block for repeated fills/strokes (`.body`, `.eye`, `.shine`, `.blush`)
- Primary color from `colors[0]` for body fill, `colors[1]` for stroke/accents
- Round, chunky proportions -- big heads, small bodies, stubby limbs
- Eyes always have white shine circles (2-3px radius) at upper-left of pupil
- Pink/colored blush ellipses on cheeks at 0.2-0.3 opacity
- Simple curved-path mouths (happy smiles)
- Accessories should be distinct but not overpower the silhouette
- Rarer creatures can have slightly more detail (gradients, animations, extra elements)
- Keep total element count under ~50 for performance
- No `<script>`, no event handlers, no external references
- Any `<defs>` IDs must be prefixed with the creature's initials to avoid collisions when multiple SVGs are inlined on the same page (e.g., `id="td-glow"` for Tide Dragon)

**Scenes (800x600 viewBox):**
- Layered depth: sky/background gradient -> far elements -> mid elements -> foreground -> ground
- Use `<defs>` for gradients and filters (prefix IDs with location abbreviation, e.g., `cb-sky` for Crystal Beach)
- Include 6-8 animated sparkle/glow particles (`<animate>` on opacity, 1.5-3s duration)
- Color palette should match the location's `bg` gradient colors
- Must work with `background-size: cover` at various aspect ratios -- keep important elements in the center 70% horizontally
- Avoid fine detail that disappears at small sizes

---

## Location 1: Crystal Beach

### Scene Background (`assets/scenes/crystal-beach.svg`)

**Palette:** Sky blue (#87CEEB) -> light aqua (#b8e4f0) -> warm sand (#f0e6c8)
**Mood:** Bright, sparkling, warm. A magical beach at golden hour.

**Composition (back to front):**
- Sky with gradient from blue to aqua, soft sun low on horizon with radial glow
- 2-3 small fluffy clouds
- Distant ocean line with gentle wave curves
- Crystal formations rising from the water (translucent geometric shapes with sparkle -- use polygon/path shapes with low opacity fills and white stroke)
- Mid-ground: wet sand with shallow tide pools (ellipses with light blue fill at 0.3 opacity)
- Foreground: dry sandy beach with scattered shells (small spiral paths), a starfish (small 5-point polygon), small crystal clusters
- Animated sparkles on crystals and water surface (8 particles, staggered timing 1.5-3s)

### Creatures

**1. Bubble Seal (`bubble-seal.svg`) -- Common**
- Colors: #B0C4DE body, #87CEEB accents
- Round, plump seal body lying on belly. Flippers to sides (ellipses angled outward).
- Round happy eyes, small oval nose, whisker dots (3 tiny circles each side of nose)
- 2-3 floating soap-bubble circles near head (circles with very thin stroke, no fill, 0.3-0.5 opacity)
- Blush on cheeks

**2. Sand Crab (`sand-crab.svg`) -- Common**
- Colors: #FFA07A body, #FF7F50 accents
- Wide oval body, two front claws raised cheerfully (pincer shapes made from two curved paths each), 4 small legs underneath (short lines with round tips)
- Stalk eyes (two circles on short line segments above body)
- Small shell balanced on top of head like a hat (spiral shape)
- Sandy texture dots at feet (3-4 tiny tan circles)

**3. Starfish Dancer (`starfish-dancer.svg`) -- Rare**
- Colors: #FFD700 body, #FFA500 accents
- Five-pointed starfish shape, slightly rounded/puffy points (use path with quadratic curves rather than sharp polygon)
- Two of the upper points raised like arms in a dance pose (angled upward)
- Face in center: happy crescent eyes (curved lines), small smile
- Tiny tiara on top point (3 small triangles with dots at tips)
- Subtle texture dots on body surface (8-10 small circles at 0.3 opacity)

**4. Pearl Otter (`pearl-otter.svg`) -- Rare**
- Colors: #DEB887 body, #D2B48C accents
- Lying on back (classic otter pose), oval body wider at middle, small tail visible at bottom
- Paws held up holding a glowing pearl (white circle with radial gradient for glow effect, prefix ID `po-glow`)
- Playful squinting eyes (gentle downward curves, not fully closed -- like `~` shapes)
- Lighter belly patch (ellipse in lighter shade)
- Small round ears on sides of head

**5. Coral Seahorse (`coral-seahorse.svg`) -- Epic**
- Colors: #FF69B4 body, #FF1493 accents
- Classic seahorse S-curve silhouette built from an elliptical body + curled tail path
- Elegant almond-shaped eyes with 2 curved lines above as lashes
- Small coral-branch crown on head (3 short forking paths in coral pink)
- Textured body with horizontal ridge lines (5-6 thin curved lines across torso)
- Subtle gradient from lighter pink at belly to deeper pink at back (use linearGradient, prefix ID `cs-grad`)

**6. Tide Dragon (`tide-dragon.svg`) -- Legendary**
- Colors: #00CED1 body, #20B2AA accents
- Compact dragon sitting upright, medium wings spread slightly to sides
- Wings styled as wave-crests (wavy top edge using quadratic curves instead of bat-wing points)
- Fierce but still cute eyes (slightly angled eyebrow lines but round pupils with shine)
- Small horns (2 small triangles on head), curled tail
- Water droplet particles around it (3-4 teardrop shapes with animated opacity, staggered)
- More complex than common creatures (~45-50 elements)

---

## Location 2: Cloud Garden

### Scene Background (`assets/scenes/cloud-garden.svg`)

**Palette:** Soft lavender (#e8d5f5) -> pale purple (#f0e0ff) -> white (#fff)
**Mood:** Dreamy, ethereal, soft. A garden floating among clouds.

**Composition (back to front):**
- Pale lavender sky gradient with distant tiny stars (white circles, 1-2px, faint 0.3 opacity)
- Far clouds as soft ellipse clusters (3 overlapping ellipses each, white at 0.4 opacity)
- A rainbow arc in the upper portion (7 concentric arc paths in pastel ROYGBIV, thin strokes, 0.4 opacity)
- Mid-ground: 2-3 floating garden islands (cloud-shaped bases made of overlapping ellipses, green grass rectangles on top)
- Colorful flowers on islands (simple circle + short line stem, pink/purple/yellow, 5-6 flowers)
- Foreground: large cloud platform as the "ground" (wide cluster of white ellipses)
- Vine/tendril curves hanging down from islands (thin green curved paths)
- Animated sparkles among the flowers (8 particles, pastel colors)

### Creatures

**1. Cloud Kitten (`cloud-kitten.svg`) -- Common**
- Colors: #FFF body, #E8E8E8 accents/stroke
- Fluffy round kitten -- body made of 3-4 overlapping circles to create cloud-like silhouette
- Sleepy eyes (gentle downward curves, thicker stroke, relaxed expression)
- Tiny triangle ears poking up from head circle
- Faint golden halo: circle above head with thin gold stroke (#FFD700) and no fill, 0.4 opacity
- Soft pink blush, tiny pink triangle nose, small curved smile

**2. Petal Bird (`petal-bird.svg`) -- Common**
- Colors: #FFB7C5 body, #FF91A4 accents
- Round circle body, small triangular beak pointing right, short tail feathers (2 small ovals at back)
- Bead eyes (small solid circles, 4px radius)
- Wings folded at sides shaped like flower petals (teardrop/ellipse shapes)
- Flower hat: simple 5-petal flower on top of head (5 small ellipses in a ring + center circle)
- Two small stick-line feet

**3. Rainbow Snail (`rainbow-snail.svg`) -- Rare**
- Colors: #DDA0DD body, #DA70D6 accents
- Soft elongated body blob with two eye stalks (lines with circles on top)
- Shell is a spiral with rainbow colors -- concentric arcs in pastel red/orange/yellow/green/blue/purple (6 arc paths, each a different color, or use a single spiral path with gradient)
- Curious eyes looking slightly upward (pupils positioned high in eye circles)
- Small smile, blush marks
- Slime trail hint: 2-3 small translucent circles behind body at 0.2 opacity

**4. Sky Jellyfish (`sky-jellyfish.svg`) -- Rare**
- Colors: #E6E6FA body, #D8BFD8 accents
- Dome/bell top (half-ellipse), 4-5 flowing tentacles below (wavy path elements with stroke, no fill)
- Dreamy half-lidded eyes (circles with upper eyelid curves drawn as arcs cutting across top third)
- Body at 0.7 opacity with radial gradient (lighter center, prefix ID `sj-glow`)
- Sparkle trail: 3-4 small dots below tentacles with animated opacity
- Soft overall feel, everything slightly transparent

**5. Storm Phoenix (`storm-phoenix.svg`) -- Epic**
- Colors: #9370DB body, #8A2BE2 accents
- Bird body with spread wings (wing shapes as large curved paths extending to sides), tail feathers fanning downward (3 elongated ovals)
- Electric eyes: bright yellow (#FFD700) iris circles inside dark (#333) pupils
- Small lightning bolt shapes near wing tips (2 zigzag paths in yellow)
- Feather texture on wings: 4-5 overlapping curved lines suggesting layered feathers
- Slight eyebrow angles (short angled lines above eyes) but round face keeps it cute
- One lightning bolt has opacity animation (flicker effect, 0.5-1.0, 0.8s duration)

**6. Aurora Unicorn (`aurora-unicorn.svg`) -- Legendary**
- Colors: #FFD1DC body, #C8A2C8 accents
- Standing unicorn three-quarter view, compact proportions (large round head, small oval body)
- Spiraling horn on forehead (tapered triangle with spiral line drawn inside it)
- Mane flowing down neck: 4-5 wavy path strips in aurora gradient colors (pink -> lavender -> light blue -> mint green)
- Large magical eyes with star-shaped shine (small 4-point star polygon inside eye instead of circle shine)
- Tail also aurora-colored: 3 wavy paths fanning out
- 4-5 sparkle particles around horn (animated opacity, staggered timing)
- Most complex creature in this location (~50 elements)

---

## Location 3: Moon Cave

### Scene Background (`assets/scenes/moon-cave.svg`)

**Palette:** Deep navy (#1a1a3e) -> indigo (#2d2d6b) -> muted purple (#4a4a8a)
**Mood:** Mysterious, glowing, cozy-dark. Not scary -- magical and wondrous.

**Composition (back to front):**
- Dark gradient background (navy to deep purple)
- Cave ceiling: irregular stalactite shapes hanging from top (3-4 dark triangular/jagged paths in colors slightly darker than background)
- Glowing moonstone crystals on walls: 5-6 geometric faceted shapes (pentagons/hexagons) in pale blue (#B0C4DE) and white, 0.6 opacity, with a glow filter (feGaussianBlur, prefix ID `mc-glow`)
- Mid-ground: cave floor (rocky wavy line in dark gray), a still underground pool (ellipse with dark blue fill and faint reflection highlights)
- Small bioluminescent mushrooms on cave floor: 4-5 tiny mushroom shapes (rect stem + ellipse cap) in teal (#20B2AA) and purple (#9370DB) at 0.7 opacity
- A crescent moon visible through a hole in the cave ceiling (circle with overlapping circle to create crescent, pale yellow, upper-center area)
- Animated glow pulses on 6-8 crystals (opacity animation cycling between 0.4 and 0.9, staggered timing 1.5-3s)

### Creatures

**1. Glow Bat (`glow-bat.svg`) -- Common**
- Colors: #483D8B body, #6A5ACD accents
- Round circle body with spread bat wings (wing shapes: paths with 3 scalloped curves along bottom edge, finger-bone lines as thin paths from body to wing tips)
- Glowing eyes: light purple circles (#9370DB) with white shine dots
- Small fangs peeking from smile (2 tiny white triangles below mouth curve -- cute, not scary)
- Moon charm: small crescent shape hanging from a short line below body center
- Wing edges have faint lighter stroke (#7B68EE)

**2. Crystal Mouse (`crystal-mouse.svg`) -- Common**
- Colors: #C0C0C0 body, #A9A9A9 accents
- Small round body with large round ears (circles, 20px radius), long thin curved tail
- Twinkle eyes: solid dark circles with cross-shaped shine (white `+` shape: 2 small crossing lines)
- Holding a small crystal: geometric diamond shape (rotated square) in pale blue (#B0E0E6) with slight transparency
- Whiskers: 3 thin lines each side of nose
- Tiny pink inner ear fills (#FFB6C1) and pink nose triangle

**3. Shadow Cat (`shadow-cat.svg`) -- Rare**
- Colors: #2F2F4F body, #4F4F6F accents
- Sitting cat shape: oval body, round head, pointed ears, tail curled around to front
- Mysterious eyes: larger than usual (10px radius), pale aqua iris (#7FFFD4) with vertical slit pupils (thin dark ellipses)
- Star collar: thin line path around neck with 3 tiny 4-point star polygons attached
- Very dark body with 2-3 subtle darker stripe curves on back
- Faint purple aura: duplicate of body outline 2px larger, in #6A5ACD at 0.15 opacity (creates glow effect without filters)

**4. Gem Spider (`gem-spider.svg`) -- Rare**
- Colors: #7B68EE body, #6959CD accents
- Round central body (circle, 30px radius), 8 legs curving outward (thin paths, 4 per side, gently curved)
- Many eyes: 6 small circles in two rows on face (top row: 4 circles at 3px radius, bottom row: 2 circles at 4px radius), all with tiny white shine dots
- Body has 2-3 geometric lines across surface suggesting faceted gem texture
- 3-4 short silk strand lines radiating from body with tiny jewel dots (#E6E6FA) at tips
- Despite being a spider, round proportions and small size keep it cute

**5. Moon Wolf (`moon-wolf.svg`) -- Epic**
- Colors: #4169E1 body, #1E90FF accents
- Sitting wolf: oval body, angular head shape, pointed ears, fluffy chest ruff (wavy path across chest)
- Head slightly tilted upward (subtle howl pose -- nose points up-left)
- Piercing eyes: bright ice-blue irises (#87CEFA) with small dark pupils and white shine
- Moon aura: faint crescent moon shape behind/above head in pale yellow (#FFF8DC) at 0.25 opacity
- Fur texture: 3-4 wavy lines along body and tail suggesting fluffiness
- Lighter underbelly gradient (use linearGradient, prefix ID `mw-fur`)

**6. Void Wyrm (`void-wyrm.svg`) -- Legendary**
- Colors: #191970 body, #000080 accents
- Serpentine body in loose S-curve, no legs (body is a thick wavy path with rounded stroke-linecap)
- Small head with two horns (small triangles), long flowing whiskers (2 wavy thin paths from snout)
- Cosmic eyes: dark circles with 2-3 tiny white dots inside each (like a starfield)
- Star dust particles: 6-8 tiny white/gold circles scattered around body with animated opacity (staggered 1.5-3s)
- Body has subtle scale texture: overlapping small curved lines along one side
- Faint nebula patches: 2-3 small circles in purple (#9370DB) at 0.15 opacity placed along body
- Most complex Moon Cave creature (~50 elements)

---

## Location 4: Rainbow Meadow

### Scene Background (`assets/scenes/rainbow-meadow.svg`)

**Palette:** Pink (#ffd6e0) -> yellow (#ffe8a8) -> green (#d4f0c0) -> blue (#c8e8ff)
**Mood:** Joyful, colorful, warm. The happiest place in the dream world.

**Composition (back to front):**
- Multi-stop gradient sky (pink at top -> warm yellow -> soft green -> light blue) using 4-stop linearGradient
- Full rainbow arc across upper sky (7 concentric arc paths in pastel ROYGBIV colors, each 4px stroke, 0.45 opacity)
- Distant rolling hills: 2-3 ellipses in pastel green with scattered tiny color-dot flowers
- Mid-ground: dense flower field -- 12-15 simple flowers (circle + short line stem) in pink, red, orange, yellow, blue, purple scattered across mid-height
- A winding tan path through the meadow (curved path with rounded stroke, similar to Sparkle Forest's)
- Foreground: 4-5 larger flowers, grass tufts (small green triangle clusters), 2 butterflies (simple paired-ellipse wings on thin body lines)
- Animated sparkles among flowers (8 particles in mixed pastel colors, staggered 1.5-3s)

### Creatures

**1. Flower Hamster (`flower-hamster.svg`) -- Common**
- Colors: #FFDAB9 body, #FFE4B5 accents
- Very round circle body (the roundest creature in the game), tiny paw ovals at front-bottom
- Beady eyes (small solid 4px circles), round ears on top of head
- Flower crown: 3 small simple flowers across top of head (circle + 4-5 petal circles around it, in pink/yellow/blue)
- Extra-round cheeks (body circle is wide, cheek blush ellipses are prominent)
- Short stubby tail (tiny circle at back), whisker lines

**2. Candy Frog (`candy-frog.svg`) -- Common**
- Colors: #98FB98 body, #00FA9A accents
- Round sitting frog body, wide mouth path in a big grin
- Big round eyes on top of head (classic frog -- two large circles sitting on top edge of head circle)
- Lighter belly patch (ellipse, lighter green)
- Holding a lollipop: thin line stick + small circle with spiral path inside using 3-4 rainbow colors
- Spotted pattern: 3-4 darker green circles on back at 0.3 opacity
- Webbed feet visible at base (fan-shaped paths)

**3. Honey Bee (`honey-bee.svg`) -- Common**
- Colors: #FFD700 body, #DAA520 accents
- Oval/ellipse body with 3 horizontal black (#333) stripe rectangles across it
- Small translucent wings: 2 teardrop-shaped paths above body at 0.35 opacity with light blue tint (#E0F0FF)
- Cute round eyes (6px), small antennae: 2 thin lines from top of head with small circles at tips
- Tiny honey jar held in front: small rounded rectangle in amber (#DAA520) with a drip shape below it
- Stinger: tiny triangle at back (not threatening -- very small)
- 6 small legs: thin short lines along bottom of body

**4. Butterfly Pixie (`butterfly-pixie.svg`) -- Rare**
- Colors: #FF69B4 body, #FF1493 accents
- Small humanoid fairy body (similar proportions to Dewdrop Fairy -- ellipse body, circle head, tiny feet)
- 4 butterfly wings: upper pair larger (teardrop paths curving outward), lower pair smaller, all with symmetrical dot patterns inside (3-4 small circles per wing)
- Wings use gradient fill (prefix ID `bp-wing`)
- Twinkle eyes with small star-shaped shine (4-point star polygon instead of circle)
- Antennae with small heart shapes at tips (two tiny overlapping circles forming hearts)
- Sparkle trail: 3 dots below with animated opacity

**5. Sunset Deer (`sunset-deer.svg`) -- Epic**
- Colors: #FF6347 body, #FF4500 accents
- Standing deer, compact proportions: large round head, slender oval body, 4 thin legs with small hoof ovals
- Gentle eyes: large (8px radius), with long lash lines (2 curved lines above each eye)
- Antlers styled as sunset rays: branching paths upward with gradient from orange at base to gold (#FFD700) to yellow (#FFEB3B) at tips (linearGradient, prefix ID `sd-antler`)
- Lighter belly area
- Small white tail spot (circle)
- Warm overall palette, blush marks

**6. Dream Dragon (`dream-dragon.svg`) -- Epic**
- Colors: #FFB6C1 body, #DDA0DD accents
- Sitting baby dragon: round body, round head, small stubby wings at sides
- Dreamy half-lidded eyes (circles with upper eyelid arcs cutting across top -- relaxed/happy)
- Flower wreath around neck: circle path with 5-6 tiny alternating pink/purple/yellow circle-flowers along it
- Soft pastel coloring, lighter belly ellipse
- Small curled tail with a tiny flower (circle + petals) at the tip
- 2-3 floating heart shapes nearby: small heart paths at 0.4 opacity with animated opacity (1.5-2.5s)

---

## Data.js Changes

### Location updates (add `scene:` property)

Lines to modify in `data.js`:
- Crystal Beach (line ~20): add `scene: 'assets/scenes/crystal-beach.svg',`
- Cloud Garden (line ~28): add `scene: 'assets/scenes/cloud-garden.svg',`
- Moon Cave (line ~35): add `scene: 'assets/scenes/moon-cave.svg',`
- Rainbow Meadow (line ~43): add `scene: 'assets/scenes/rainbow-meadow.svg',`

### Location bug fix

- Cloud Garden (line 29): change `spots: 5` to `spots: 6`
- Moon Cave (line 35): change `spots: 5` to `spots: 6`

### Creature updates (add `svg:` property to each)

All 24 creatures need `svg: 'assets/creatures/{id}.svg'` added to their object in data.js. The creature IDs are:

Crystal Beach (lines 74-85): `bubble-seal`, `sand-crab`, `starfish-dancer`, `pearl-otter`, `coral-seahorse`, `tide-dragon`
Cloud Garden (lines 88-99): `cloud-kitten`, `petal-bird`, `rainbow-snail`, `sky-jellyfish`, `storm-phoenix`, `aurora-unicorn`
Moon Cave (lines 102-113): `glow-bat`, `crystal-mouse`, `shadow-cat`, `gem-spider`, `moon-wolf`, `void-wyrm`
Rainbow Meadow (lines 116-127): `flower-hamster`, `candy-frog`, `honey-bee`, `butterfly-pixie`, `sunset-deer`, `dream-dragon`

### Service worker cache bump

`sw.js`: Bump `CACHE_NAME` to the next version since 28 new assets are being added.

---

## What We're NOT Doing

- Not adding new creatures or locations -- only illustrating existing ones
- Not changing creature stats, rarity, coins, or catch mechanics
- Not adding new game features, animations outside of SVG, or UI changes
- Not modifying how creatures.js renders SVGs -- the existing fetch/cache/inline system works fine
- Not adding legendary creatures to Rainbow Meadow (it has two epics and no legendary -- that is intentional per existing data)

## Risks and Tricky Parts

1. **Volume of work.** 28 SVG files (24 creatures + 4 scenes). Each creature SVG should be 30-60 lines, each scene ~120-170 lines. Estimated total: ~2,000-3,000 lines of hand-authored SVG. Batch by location to keep it manageable.

2. **Visual consistency.** All creatures must feel like they belong in the same game. Strict adherence to the patterns from Sparkle Forest: 200x200 viewBox, CSS style blocks, circle-based shine highlights, ellipse blush, path-based smiles. Use existing creature SVGs as starting templates.

3. **Moon Cave contrast.** Dark creatures (#2F2F4F, #191970) on a dark background could be hard to see. The creature SVGs themselves are shown in the catch overlay which has its own background, but they need enough internal contrast to read clearly. Ensure Glow Bat, Shadow Cat, and Void Wyrm have visible lighter accents (glowing eyes, lighter strokes, aura effects).

4. **SVG `<defs>` ID collisions.** When multiple creature SVGs are inlined on the same page (collection view), generic IDs like `id="glow"` will collide and cause one SVG to steal another's gradient definition. Every `<defs>` ID must be prefixed with the creature's initials. Example prefixes: `bs-` (Bubble Seal), `po-` (Pearl Otter), `cs-` (Coral Seahorse), `td-` (Tide Dragon), `au-` (Aurora Unicorn), `mw-` (Moon Wolf), `vw-` (Void Wyrm), etc. The existing Sparkle Forest scene uses generic IDs (`sky`, `hill1`, `glow`) -- these are safe because scene SVGs are loaded as background images (not inlined). But creature SVGs with defs MUST use unique prefixes.

5. **`sanitizeSVG()` compatibility.** The sanitizer strips `<script>` tags and `on*` event handlers. It does NOT strip `<animate>`, `<defs>`, `<linearGradient>`, `<radialGradient>`, `<filter>`, or `<style>` elements. These are all safe to use in creature SVGs. (Verify this during the pre-implementation review step.)

6. **Cache invalidation.** After all assets are added, `sw.js` cache name must be bumped or returning users will never see the new art. Also check whether `sw.js` has a hardcoded asset list in its install handler that needs updating.

7. **File size.** Each creature SVG should stay under 5KB. Scene SVGs can be up to 10KB. Keep shapes simple -- this is not about detail density, it is about charm and readability at small sizes.

## Open Questions

None. All design decisions are specified above. This is ready for implementation.

## Success Criteria

1. Loading each of the 4 locations shows an illustrated scene background (not just a gradient).
2. Encountering any creature in these locations shows its SVG artwork in the catch overlay.
3. Caught creatures display their SVG in the collection view at 80x80px and remain visually recognizable.
4. All creatures within a location feel thematically cohesive with their scene.
5. No SVG rendering errors, ID collisions, or broken images in Chrome, Safari, and Firefox mobile.
6. Cloud Garden and Moon Cave can spawn all 6 of their creatures (spots bug fixed).

---

## Agent Task List

**Run in this order. Each location is a self-contained batch.**

### 1. Pre-implementation review

> Read `js/creatures.js` fully -- especially `sanitizeSVG()`, `preloadSVGs()`, and the collection rendering code. Confirm that `<animate>`, `<defs>`, `<linearGradient>`, `<radialGradient>`, `<filter>`, and `<style>` elements survive sanitization. If `sanitizeSVG()` strips any of these, fix it first before creating artwork that relies on them. Also read `sw.js` to check if it has a hardcoded file list for pre-caching.

### 2. Crystal Beach (batch 1 of 4)

> Create `assets/scenes/crystal-beach.svg` following the scene spec.
> Create 6 creature SVGs in `assets/creatures/`: `bubble-seal.svg`, `sand-crab.svg`, `starfish-dancer.svg`, `pearl-otter.svg`, `coral-seahorse.svg`, `tide-dragon.svg`.
> Use 200x200 viewBox for creatures, 800x600 for scene.
> Use creature-prefixed IDs in any `<defs>` blocks.
> Update `data.js`: add `svg:` to the 6 creatures, add `scene:` to crystal-beach location.
> Test in browser: visit Crystal Beach, verify scene loads, catch a creature, verify SVG displays.

### 3. Cloud Garden (batch 2 of 4)

> Create `assets/scenes/cloud-garden.svg` + 6 creature SVGs: `cloud-kitten.svg`, `petal-bird.svg`, `rainbow-snail.svg`, `sky-jellyfish.svg`, `storm-phoenix.svg`, `aurora-unicorn.svg`.
> Update `data.js`: add `svg:` paths, add `scene:` path, fix `spots: 5` to `spots: 6`.
> Test in browser.

### 4. Moon Cave (batch 3 of 4)

> Create `assets/scenes/moon-cave.svg` + 6 creature SVGs: `glow-bat.svg`, `crystal-mouse.svg`, `shadow-cat.svg`, `gem-spider.svg`, `moon-wolf.svg`, `void-wyrm.svg`.
> Pay special attention to contrast -- dark creatures need visible lighter accents and glowing features.
> Update `data.js`: add `svg:` paths, add `scene:` path, fix `spots: 5` to `spots: 6`.
> Test in browser.

### 5. Rainbow Meadow (batch 4 of 4)

> Create `assets/scenes/rainbow-meadow.svg` + 6 creature SVGs: `flower-hamster.svg`, `candy-frog.svg`, `honey-bee.svg`, `butterfly-pixie.svg`, `sunset-deer.svg`, `dream-dragon.svg`.
> Update `data.js`: add `svg:` paths, add `scene:` path.
> Test in browser.

### 6. Final pass

> Bump `CACHE_NAME` in `sw.js`.
> Update version label in `index.html` if one exists.
> Open collection view and verify no SVG ID collisions when multiple creatures are displayed.
> Test on narrow mobile viewport (375px wide) -- scene backgrounds with `background-size: cover`.
> Spot-check one creature from each rarity tier at 80x80px thumbnail size for readability.

---

**Exact prompts to paste for each step:**

**Pre-review prompt:**
```
Read these files and report findings:
1. js/creatures.js - find sanitizeSVG() and confirm these SVG elements survive: <animate>, <defs>, <linearGradient>, <radialGradient>, <filter>, <style>. Show me the sanitizer code.
2. js/creatures.js - find where SVGs are injected (innerHTML assignments using svgCache). List all injection points.
3. sw.js - check if it hardcodes a list of files to pre-cache, or if it caches dynamically on fetch.
Report what you find so we know if anything needs fixing before we start creating SVGs.
```

**Batch prompt (use for each location -- replace LOCATION_NAME, location-id, and creature list):**
```
Read SPEC.md for full art direction details, then read all 6 existing Sparkle Forest creature SVGs in assets/creatures/ and the scene SVG in assets/scenes/sparkle-forest.svg for style reference.

Then implement the CRYSTAL BEACH batch:
1. Create assets/scenes/crystal-beach.svg (800x600 viewBox, follow scene composition in spec)
2. Create these 6 creature SVGs in assets/creatures/ (200x200 viewBox, follow creature descriptions in spec):
   - bubble-seal.svg
   - sand-crab.svg
   - starfish-dancer.svg
   - pearl-otter.svg
   - coral-seahorse.svg
   - tide-dragon.svg
3. Prefix all <defs> IDs with creature initials (bs-, sc-, sd-, po-, cs-, td-)
4. Update data.js: add svg: 'assets/creatures/{id}.svg' to each of the 6 Crystal Beach creatures, and add scene: 'assets/scenes/crystal-beach.svg' to the crystal-beach location entry
5. Match the art style of existing Sparkle Forest creatures exactly: CSS <style> blocks, round proportions, eye shines, blush ellipses, curved-path smiles

List all files created/modified when done so I can test.
```

**Final pass prompt:**
```
All 4 location artwork batches are complete. Do the final review:
1. Bump CACHE_NAME in sw.js to the next version
2. Check index.html for a version label and bump it if present
3. Review data.js: confirm all 24 non-Sparkle-Forest creatures have svg: paths and all 5 locations have scene: paths
4. Scan all 28 new SVG files in assets/ for <defs> ID collisions -- list any duplicate IDs found
5. Confirm cloud-garden and moon-cave spots values are 6 (not 5)
6. Check that no SVG file contains <script> tags or on* event handlers
Report all findings and flag any issues.
```

---

**Skip steps if:**
- If only doing one location at a time and testing as you go: run pre-review once, then one batch at a time, final pass after the last batch
- If sanitizeSVG() needs fixing: do that as a standalone task before any batches
- If sw.js has a hardcoded file list: update it in the final pass step rather than per-batch
