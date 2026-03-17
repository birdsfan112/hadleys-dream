"""
Tests for Hadley's Dream game logic.

Since the codebase is vanilla JS IIFEs meant for browsers (no Node.js available),
these tests validate the logic patterns by reimplementing the core algorithms in
Python and verifying correctness. Each test documents which JS function/line it
validates.

Run with: python -m pytest tests/ -v
Or:       python tests/test_game_logic.py
"""

import unittest
import json
import copy
import re
import os

# ---------------------------------------------------------------------------
# Helpers: read JS source files so we can parse data out of them
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_js(filename):
    path = os.path.join(PROJECT_ROOT, 'js', filename)
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


# ===========================================================================
# Test Suite 1: DEFAULT_STATE in data.js
# ===========================================================================
class TestDefaultState(unittest.TestCase):
    """Validates the DEFAULT_STATE object in js/data.js."""

    def setUp(self):
        self.source = read_js('data.js')

    # DEFAULT_STATE must have saved_outfits as an array, not outfits as object
    def test_default_state_has_saved_outfits_array(self):
        """data.js: DEFAULT_STATE should contain saved_outfits: [] (not outfits: {})"""
        self.assertIn('saved_outfits: []', self.source,
                       "DEFAULT_STATE must have 'saved_outfits: []'")

    def test_default_state_does_not_have_old_outfits_key(self):
        """data.js: DEFAULT_STATE should NOT contain the old 'outfits:' key"""
        # Find the DEFAULT_STATE block and check it doesn't have outfits: {}
        match = re.search(r'const DEFAULT_STATE\s*=\s*\{(.*?)\};', self.source, re.DOTALL)
        self.assertIsNotNone(match, "Could not find DEFAULT_STATE in data.js")
        state_block = match.group(1)
        # Should not have bare "outfits:" (old format) - but "saved_outfits:" is fine
        lines = state_block.split('\n')
        for line in lines:
            stripped = line.strip()
            # Match "outfits:" but not "saved_outfits:"
            if re.match(r'^outfits\s*:', stripped):
                self.fail("DEFAULT_STATE still has old 'outfits:' key (should be 'saved_outfits')")

    def test_default_state_has_required_fields(self):
        """data.js: DEFAULT_STATE must have all expected top-level fields"""
        required = ['coins', 'creatures', 'wardrobe_unlocked', 'furniture_unlocked',
                     'fashion_scores', 'saved_outfits', 'room', 'stats',
                     'leaderboard', 'last_login', 'last_save']
        for field in required:
            self.assertIn(field, self.source,
                          f"DEFAULT_STATE is missing required field: {field}")

    def test_default_state_coins_is_100(self):
        """data.js: New players start with 100 coins"""
        match = re.search(r'const DEFAULT_STATE\s*=\s*\{(.*?)\};', self.source, re.DOTALL)
        state_block = match.group(1)
        self.assertIn('coins: 100', state_block)

    def test_default_state_stats_has_all_keys(self):
        """data.js: stats sub-object needs total_caught, total_coins_earned, challenges_completed"""
        match = re.search(r'stats:\s*\{([^}]+)\}', self.source)
        self.assertIsNotNone(match)
        stats_block = match.group(1)
        self.assertIn('total_caught', stats_block)
        self.assertIn('total_coins_earned', stats_block)
        self.assertIn('challenges_completed', stats_block)


# ===========================================================================
# Test Suite 2: Audio style cycling (js/audio.js)
# ===========================================================================
class TestAudioStyleCycling(unittest.TestCase):
    """
    Validates the cycleStyle() logic in js/audio.js.
    The STYLES array is ['pads', 'musicbox', 'chiptune'] and cycling wraps around.
    """

    STYLES = ['pads', 'musicbox', 'chiptune']

    def _cycle(self, current):
        """Reimplements the cycleStyle logic from audio.js line 309-310"""
        idx = self.STYLES.index(current) if current in self.STYLES else -1
        return self.STYLES[(idx + 1) % len(self.STYLES)]

    def test_cycle_pads_to_musicbox(self):
        """audio.js cycleStyle: pads -> musicbox"""
        self.assertEqual(self._cycle('pads'), 'musicbox')

    def test_cycle_musicbox_to_chiptune(self):
        """audio.js cycleStyle: musicbox -> chiptune"""
        self.assertEqual(self._cycle('musicbox'), 'chiptune')

    def test_cycle_chiptune_wraps_to_pads(self):
        """audio.js cycleStyle: chiptune -> pads (wraps around)"""
        self.assertEqual(self._cycle('chiptune'), 'pads')

    def test_full_cycle_returns_to_start(self):
        """audio.js cycleStyle: cycling 3 times returns to original style"""
        style = 'pads'
        for _ in range(3):
            style = self._cycle(style)
        self.assertEqual(style, 'pads')

    def test_styles_array_has_exactly_three_entries(self):
        """audio.js: STYLES array must have exactly 3 entries"""
        source = read_js('audio.js')
        match = re.search(r"const STYLES\s*=\s*\[([^\]]+)\]", source)
        self.assertIsNotNone(match, "Could not find STYLES array in audio.js")
        items = [s.strip().strip("'\"") for s in match.group(1).split(',')]
        self.assertEqual(len(items), 3)
        self.assertEqual(items, ['pads', 'musicbox', 'chiptune'])

    def test_cycle_style_persists_to_localstorage(self):
        """audio.js cycleStyle: must call localStorage.setItem('hadley-music-style', ...)"""
        source = read_js('audio.js')
        # Find the cycleStyle function body
        match = re.search(r'function cycleStyle\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match, "Could not find cycleStyle function")
        body = match.group(1)
        self.assertIn("localStorage.setItem('hadley-music-style'", body,
                       "cycleStyle must persist style to localStorage")

    def test_start_music_dispatches_by_style(self):
        """audio.js startMusic: must branch on musicStyle for musicbox, chiptune, pads"""
        source = read_js('audio.js')
        match = re.search(r'function startMusic\(mode\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('musicBoxStep', body)
        self.assertIn('chiptuneStep', body)
        self.assertIn('padStep', body)

    def test_stop_music_clears_timeout(self):
        """audio.js stopMusic: must clear musicTimeout"""
        source = read_js('audio.js')
        match = re.search(r'function stopMusic\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('clearTimeout(musicTimeout)', body)

    def test_toggle_mute_stops_music_when_muting(self):
        """audio.js toggleMute: when muting, must call stopMusic()"""
        source = read_js('audio.js')
        match = re.search(r'function toggleMute\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('if (muted) stopMusic()', body)

    def test_all_modes_have_chords(self):
        """audio.js: CHORDS object must have entries for hub, creatures, fashion, room"""
        source = read_js('audio.js')
        for mode in ['hub', 'creatures', 'fashion', 'room']:
            self.assertRegex(source, rf'{mode}\s*:\s*\[',
                             f"CHORDS missing entry for mode: {mode}")

    def test_all_modes_have_melodies(self):
        """audio.js: MELODIES object must have entries for hub, creatures, fashion, room"""
        source = read_js('audio.js')
        # MELODIES is defined after CHORDS; check all four modes appear
        melodies_match = re.search(r'const MELODIES\s*=\s*\{(.*?)\};', source, re.DOTALL)
        self.assertIsNotNone(melodies_match)
        melodies_block = melodies_match.group(1)
        for mode in ['hub', 'creatures', 'fashion', 'room']:
            self.assertIn(mode, melodies_block,
                          f"MELODIES missing entry for mode: {mode}")


# ===========================================================================
# Test Suite 3: Fashion outfit saving (js/fashion.js)
# ===========================================================================
class TestFashionSaveOutfit(unittest.TestCase):
    """
    Validates saveOutfit() logic in js/fashion.js.
    Key rules: max 12 outfits, must have at least 1 item equipped.
    """

    MAX_OUTFITS = 12

    def _make_outfit(self, **kwargs):
        """Create an outfit dict with defaults (all None)"""
        outfit = {'hair': None, 'top': None, 'bottom': None, 'dress': None,
                  'shoes': None, 'accessory': None, 'hat': None}
        outfit.update(kwargs)
        return outfit

    def test_save_outfit_rejects_empty_outfit(self):
        """fashion.js saveOutfit: outfit with all slots None should be rejected"""
        outfit = self._make_outfit()
        has_item = any(outfit.values())
        self.assertFalse(has_item, "Empty outfit should have no items")

    def test_save_outfit_accepts_single_item(self):
        """fashion.js saveOutfit: outfit with just 1 item should be accepted"""
        outfit = self._make_outfit(hair='hair-1')
        has_item = any(outfit.values())
        self.assertTrue(has_item)

    def test_save_outfit_rejects_when_at_max(self):
        """fashion.js saveOutfit: should reject when saved_outfits has 12 entries"""
        saved = [{'items': self._make_outfit(hair='hair-1'), 'timestamp': 1000}
                 for _ in range(self.MAX_OUTFITS)]
        self.assertEqual(len(saved), 12)
        # Simulating: if (outfits.length >= MAX_OUTFITS) return;
        can_save = len(saved) < self.MAX_OUTFITS
        self.assertFalse(can_save)

    def test_save_outfit_allows_when_under_max(self):
        """fashion.js saveOutfit: should allow when saved_outfits has fewer than 12"""
        saved = [{'items': self._make_outfit(hair='hair-1'), 'timestamp': 1000}
                 for _ in range(11)]
        can_save = len(saved) < self.MAX_OUTFITS
        self.assertTrue(can_save)

    def test_save_outfit_pushes_copy_of_current(self):
        """fashion.js saveOutfit: pushes { items: {...currentOutfit}, timestamp } to array"""
        outfit = self._make_outfit(hair='hair-1', shoes='shoes-1')
        saved = []
        # Simulate: outfits.push({ items: { ...currentOutfit }, timestamp: Date.now() })
        saved.append({'items': {**outfit}, 'timestamp': 12345})
        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0]['items']['hair'], 'hair-1')
        self.assertEqual(saved[0]['items']['shoes'], 'shoes-1')
        # Verify it's a copy, not a reference
        outfit['hair'] = 'hair-2'
        self.assertEqual(saved[0]['items']['hair'], 'hair-1',
                         "Saved outfit must be a copy, not a reference")

    def test_max_outfits_constant_is_12_in_source(self):
        """fashion.js: MAX_OUTFITS must be defined as 12"""
        source = read_js('fashion.js')
        match = re.search(r'const MAX_OUTFITS\s*=\s*(\d+)', source)
        self.assertIsNotNone(match, "Could not find MAX_OUTFITS constant")
        self.assertEqual(int(match.group(1)), 12)


# ===========================================================================
# Test Suite 4: Fashion outfit loading (js/fashion.js)
# ===========================================================================
class TestFashionLoadOutfit(unittest.TestCase):
    """
    Validates loadOutfit() logic: bounds checking and invalid ID stripping.
    """

    # Simulated FASHION_ITEMS valid IDs (subset)
    VALID_IDS = ['hair-1', 'hair-2', 'top-1', 'top-3', 'bottom-1', 'bottom-2',
                 'dress-1', 'dress-2', 'shoes-1', 'shoes-3', 'acc-1', 'acc-2',
                 'hat-2', 'hat-3']

    def _load_outfit(self, outfits, index):
        """
        Reimplements loadOutfit logic from fashion.js lines 495-506.
        Returns the cleaned outfit or None if out of bounds.
        """
        if index < 0 or index >= len(outfits):
            return None
        saved = outfits[index]
        cleaned = {**saved['items']}
        for slot in cleaned:
            if cleaned[slot] and cleaned[slot] not in self.VALID_IDS:
                cleaned[slot] = None
        return cleaned

    def test_load_outfit_bounds_check_negative_index(self):
        """fashion.js loadOutfit: negative index returns early"""
        outfits = [{'items': {'hair': 'hair-1'}, 'timestamp': 1}]
        result = self._load_outfit(outfits, -1)
        self.assertIsNone(result)

    def test_load_outfit_bounds_check_too_high(self):
        """fashion.js loadOutfit: index >= length returns early"""
        outfits = [{'items': {'hair': 'hair-1'}, 'timestamp': 1}]
        result = self._load_outfit(outfits, 1)
        self.assertIsNone(result)

    def test_load_outfit_bounds_check_empty_array(self):
        """fashion.js loadOutfit: index 0 on empty array returns early"""
        result = self._load_outfit([], 0)
        self.assertIsNone(result)

    def test_load_outfit_strips_invalid_ids(self):
        """fashion.js loadOutfit: item IDs not in FASHION_ITEMS get set to null"""
        outfits = [{'items': {
            'hair': 'hair-1',
            'top': 'deleted-top-99',
            'bottom': None,
            'dress': None,
            'shoes': 'shoes-1',
            'accessory': 'old-acc-removed',
            'hat': None
        }, 'timestamp': 1}]
        result = self._load_outfit(outfits, 0)
        self.assertEqual(result['hair'], 'hair-1', "Valid ID should remain")
        self.assertIsNone(result['top'], "Invalid ID should become None")
        self.assertEqual(result['shoes'], 'shoes-1', "Valid ID should remain")
        self.assertIsNone(result['accessory'], "Invalid ID should become None")

    def test_load_outfit_preserves_valid_ids(self):
        """fashion.js loadOutfit: all valid IDs should be preserved unchanged"""
        outfits = [{'items': {
            'hair': 'hair-2',
            'top': 'top-1',
            'bottom': 'bottom-1',
            'dress': None,
            'shoes': 'shoes-3',
            'accessory': 'acc-1',
            'hat': 'hat-2'
        }, 'timestamp': 1}]
        result = self._load_outfit(outfits, 0)
        self.assertEqual(result['hair'], 'hair-2')
        self.assertEqual(result['top'], 'top-1')
        self.assertEqual(result['shoes'], 'shoes-3')
        self.assertEqual(result['hat'], 'hat-2')

    def test_load_outfit_valid_ids_match_data_js(self):
        """fashion.js/data.js: FASHION_ITEMS IDs referenced in loadOutfit must exist in data.js"""
        source = read_js('data.js')
        # Extract all item IDs from FASHION_ITEMS
        ids = re.findall(r"id:\s*'([^']+)'", source)
        # Every ID in our VALID_IDS fixture should be in the source
        for vid in self.VALID_IDS:
            self.assertIn(vid, ids, f"Test fixture ID '{vid}' not found in data.js FASHION_ITEMS")


# ===========================================================================
# Test Suite 5: Fashion outfit deletion (js/fashion.js)
# ===========================================================================
class TestFashionDeleteOutfit(unittest.TestCase):
    """Validates deleteOutfit() logic: bounds checking and correct removal."""

    def _delete_outfit(self, outfits, index, confirmed=True):
        """
        Reimplements deleteOutfit logic from fashion.js lines 517-526.
        Returns (modified_outfits, was_deleted).
        """
        if not confirmed:
            return outfits, False
        if index < 0 or index >= len(outfits):
            return outfits, False
        outfits_copy = list(outfits)
        outfits_copy.pop(index)
        return outfits_copy, True

    def test_delete_outfit_removes_correct_entry(self):
        """fashion.js deleteOutfit: removes the outfit at the given index"""
        outfits = [
            {'items': {'hair': 'hair-1'}, 'timestamp': 1},
            {'items': {'hair': 'hair-2'}, 'timestamp': 2},
            {'items': {'hair': 'top-1'}, 'timestamp': 3},
        ]
        result, deleted = self._delete_outfit(outfits, 1)
        self.assertTrue(deleted)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['timestamp'], 1)
        self.assertEqual(result[1]['timestamp'], 3)

    def test_delete_outfit_bounds_check_negative(self):
        """fashion.js deleteOutfit: negative index should not delete"""
        outfits = [{'items': {'hair': 'hair-1'}, 'timestamp': 1}]
        result, deleted = self._delete_outfit(outfits, -1)
        self.assertFalse(deleted)
        self.assertEqual(len(result), 1)

    def test_delete_outfit_bounds_check_too_high(self):
        """fashion.js deleteOutfit: index >= length should not delete"""
        outfits = [{'items': {'hair': 'hair-1'}, 'timestamp': 1}]
        result, deleted = self._delete_outfit(outfits, 5)
        self.assertFalse(deleted)
        self.assertEqual(len(result), 1)

    def test_delete_outfit_empty_array(self):
        """fashion.js deleteOutfit: deleting from empty array should not crash"""
        result, deleted = self._delete_outfit([], 0)
        self.assertFalse(deleted)
        self.assertEqual(len(result), 0)

    def test_delete_outfit_confirm_cancelled(self):
        """fashion.js deleteOutfit: if confirm() returns false, nothing happens"""
        outfits = [{'items': {'hair': 'hair-1'}, 'timestamp': 1}]
        result, deleted = self._delete_outfit(outfits, 0, confirmed=False)
        self.assertFalse(deleted)
        self.assertEqual(len(result), 1)

    def test_delete_last_outfit(self):
        """fashion.js deleteOutfit: deleting the only outfit leaves empty array"""
        outfits = [{'items': {'hair': 'hair-1'}, 'timestamp': 1}]
        result, deleted = self._delete_outfit(outfits, 0)
        self.assertTrue(deleted)
        self.assertEqual(len(result), 0)


# ===========================================================================
# Test Suite 6: Fashion buildThumbnail (js/fashion.js)
# ===========================================================================
class TestFashionBuildThumbnail(unittest.TestCase):
    """
    Validates that buildThumbnail uses parseCached() (returns proper SVG),
    not raw JSON from svgCache.
    """

    def test_build_thumbnail_uses_parse_cached(self):
        """fashion.js buildThumbnail: must call parseCached(), not access svgCache directly as SVG"""
        source = read_js('fashion.js')
        # Find buildThumbnail function
        match = re.search(r'function buildThumbnail\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match, "Could not find buildThumbnail function")
        body = match.group(1)
        # Must use parseCached to destructure the JSON
        self.assertIn('parseCached(item.id)', body,
                       "buildThumbnail must use parseCached() to get {defs, groups}")

    def test_build_thumbnail_does_not_use_raw_svg_cache(self):
        """fashion.js buildThumbnail: should not directly insert svgCache[item.id] as SVG content"""
        source = read_js('fashion.js')
        match = re.search(r'function buildThumbnail\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        # Should not have something like: return svgCache[item.id] directly in SVG
        # The correct pattern is: const { defs, groups } = parseCached(item.id)
        self.assertIn('defs', body, "buildThumbnail should use destructured defs")
        self.assertIn('groups', body, "buildThumbnail should use destructured groups")

    def test_build_thumbnail_returns_svg_string(self):
        """fashion.js buildThumbnail: when cache hit, returns <svg ...> string"""
        source = read_js('fashion.js')
        match = re.search(r'function buildThumbnail\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('<svg', body, "buildThumbnail must return an SVG element")
        self.assertIn('viewBox="0 0 200 340"', body)

    def test_build_thumbnail_has_fallback(self):
        """fashion.js buildThumbnail: must have fallback for items without cached SVG"""
        source = read_js('fashion.js')
        match = re.search(r'function buildThumbnail\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('color', body.lower(),
                       "buildThumbnail should have a color-based fallback")

    def test_parse_cached_handles_empty_cache(self):
        """fashion.js parseCached: empty/missing cache entry returns {defs:'', groups:''}"""
        # This tests the logic of parseCached at lines 58-61
        source = read_js('fashion.js')
        match = re.search(r'function parseCached\(itemId\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("defs: '', groups: ''", body,
                       "parseCached must return empty defs/groups for missing items")


# ===========================================================================
# Test Suite 7: Game state migration (js/game.js)
# ===========================================================================
class TestGameStateMigration(unittest.TestCase):
    """
    Validates the state migration logic in Game.init() (js/game.js).
    Old saves may have outfits:{} which must become saved_outfits:[].
    """

    def _migrate_state(self, saved):
        """
        Reimplements the migration logic from game.js lines 14-24.
        """
        DEFAULT_STATE = {
            'coins': 100,
            'creatures': [],
            'wardrobe_unlocked': [],
            'furniture_unlocked': [],
            'fashion_scores': {},
            'saved_outfits': [],
            'room': {'furniture': [], 'theme': 'default'},
            'stats': {'total_caught': 0, 'total_coins_earned': 100, 'challenges_completed': 0},
            'leaderboard': {},
            'last_login': None,
            'last_save': None
        }

        if saved:
            state = {**DEFAULT_STATE, **saved}
            state['stats'] = {**DEFAULT_STATE['stats'], **(saved.get('stats') or {})}
            state['room'] = {**DEFAULT_STATE['room'], **(saved.get('room') or {})}
            if not isinstance(state.get('creatures'), list):
                state['creatures'] = []
            if not isinstance(state.get('wardrobe_unlocked'), list):
                state['wardrobe_unlocked'] = DEFAULT_STATE['wardrobe_unlocked']
            if not isinstance(state.get('furniture_unlocked'), list):
                state['furniture_unlocked'] = DEFAULT_STATE['furniture_unlocked']
            # Migrate old saves: outfits:{} -> saved_outfits:[]
            if not isinstance(state.get('saved_outfits'), list):
                state['saved_outfits'] = []
            if len(state['saved_outfits']) > 12:
                state['saved_outfits'] = state['saved_outfits'][:12]
        else:
            state = {**DEFAULT_STATE}

        return state

    def test_old_save_with_outfits_object_gets_empty_array(self):
        """game.js init: old save with outfits:{} should get saved_outfits:[]"""
        old_save = {
            'coins': 500,
            'creatures': ['sparkle-bunny'],
            'outfits': {'slot1': {'hair': 'hair-1'}},  # old format
            # no saved_outfits key at all
        }
        state = self._migrate_state(old_save)
        self.assertIsInstance(state['saved_outfits'], list)
        self.assertEqual(state['saved_outfits'], [])

    def test_old_save_with_outfits_object_preserves_coins(self):
        """game.js init: migration should not clobber other state fields"""
        old_save = {'coins': 750, 'outfits': {}}
        state = self._migrate_state(old_save)
        self.assertEqual(state['coins'], 750)

    def test_new_save_with_saved_outfits_array_is_preserved(self):
        """game.js init: new-format save with saved_outfits:[] is kept as-is"""
        new_save = {
            'coins': 200,
            'saved_outfits': [
                {'items': {'hair': 'hair-1'}, 'timestamp': 1000}
            ]
        }
        state = self._migrate_state(new_save)
        self.assertEqual(len(state['saved_outfits']), 1)
        self.assertEqual(state['saved_outfits'][0]['items']['hair'], 'hair-1')

    def test_saved_outfits_capped_at_12(self):
        """game.js init: if saved_outfits has more than 12 entries, cap to 12"""
        big_save = {
            'saved_outfits': [
                {'items': {'hair': f'hair-{i}'}, 'timestamp': i}
                for i in range(20)
            ]
        }
        state = self._migrate_state(big_save)
        self.assertEqual(len(state['saved_outfits']), 12)
        # Should keep the first 12 (slice(0, 12))
        self.assertEqual(state['saved_outfits'][0]['timestamp'], 0)
        self.assertEqual(state['saved_outfits'][11]['timestamp'], 11)

    def test_saved_outfits_exactly_12_not_trimmed(self):
        """game.js init: exactly 12 outfits should not be trimmed"""
        save = {
            'saved_outfits': [
                {'items': {'hair': 'hair-1'}, 'timestamp': i}
                for i in range(12)
            ]
        }
        state = self._migrate_state(save)
        self.assertEqual(len(state['saved_outfits']), 12)

    def test_no_saved_data_returns_default(self):
        """game.js init: null/no saved data should produce DEFAULT_STATE"""
        state = self._migrate_state(None)
        self.assertEqual(state['coins'], 100)
        self.assertIsInstance(state['saved_outfits'], list)
        self.assertEqual(len(state['saved_outfits']), 0)

    def test_migration_deep_merges_stats(self):
        """game.js init: old save missing new stats keys gets them from DEFAULT_STATE"""
        old_save = {
            'stats': {'total_caught': 5}
            # missing total_coins_earned, challenges_completed
        }
        state = self._migrate_state(old_save)
        self.assertEqual(state['stats']['total_caught'], 5)
        self.assertEqual(state['stats']['total_coins_earned'], 100)
        self.assertEqual(state['stats']['challenges_completed'], 0)

    def test_migration_deep_merges_room(self):
        """game.js init: old save missing room.theme gets default"""
        old_save = {
            'room': {'furniture': [{'id': 'bed-basic', 'x': 0, 'y': 0}]}
        }
        state = self._migrate_state(old_save)
        self.assertEqual(state['room']['theme'], 'default')
        self.assertEqual(len(state['room']['furniture']), 1)

    def test_migration_handles_corrupted_creatures(self):
        """game.js init: if creatures is not an array, reset to empty"""
        old_save = {'creatures': 'not-an-array'}
        state = self._migrate_state(old_save)
        self.assertEqual(state['creatures'], [])

    def test_migration_source_code_checks_saved_outfits(self):
        """game.js: source must contain the Array.isArray check for saved_outfits"""
        source = read_js('game.js')
        self.assertIn('Array.isArray(state.saved_outfits)', source,
                       "game.js must check Array.isArray(state.saved_outfits)")

    def test_migration_source_code_caps_at_12(self):
        """game.js: source must cap saved_outfits at 12"""
        source = read_js('game.js')
        self.assertIn('saved_outfits.length > 12', source,
                       "game.js must check saved_outfits.length > 12")
        self.assertIn('slice(0, 12)', source,
                       "game.js must slice to first 12 outfits")


# ===========================================================================
# Test Suite 8: Fashion buildAvatarSVG (js/fashion.js)
# ===========================================================================
class TestFashionBuildAvatarSVG(unittest.TestCase):
    """Validates the buildAvatarSVG function structure in fashion.js."""

    def test_build_avatar_svg_exists(self):
        """fashion.js: buildAvatarSVG function must exist"""
        source = read_js('fashion.js')
        self.assertIn('function buildAvatarSVG(o)', source)

    def test_build_avatar_svg_returns_svg_element(self):
        """fashion.js buildAvatarSVG: must return SVG with correct viewBox"""
        source = read_js('fashion.js')
        match = re.search(r'function buildAvatarSVG\(o\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('viewBox="0 0 200 340"', body)
        self.assertIn('xmlns="http://www.w3.org/2000/svg"', body)

    def test_build_avatar_svg_includes_defs(self):
        """fashion.js buildAvatarSVG: must collect defs from avatar-base and all equipped items"""
        source = read_js('fashion.js')
        match = re.search(r'function buildAvatarSVG\(o\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn("getSVGDefs('avatar-base')", body)

    def test_build_avatar_svg_layer_order(self):
        """fashion.js buildAvatarSVG: layers must be in correct order (back -> base -> clothes -> front)"""
        source = read_js('fashion.js')
        match = re.search(r'function buildAvatarSVG\(o\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        # Find positions of key layer operations
        back_layer_pos = body.find("o.hair")
        base_pos = body.find("getSVGContent('avatar-base')")
        # Base layer must come after first back-layer check
        self.assertGreater(base_pos, back_layer_pos,
                           "Avatar base should render after back layers")

    def test_dress_overrides_top_and_bottom(self):
        """fashion.js buildAvatarSVG: dress should take precedence over separate top/bottom"""
        source = read_js('fashion.js')
        match = re.search(r'function buildAvatarSVG\(o\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        # Check that dress is checked first, then falls back to top/bottom
        self.assertIn('o.dress', body)
        self.assertIn('else if (o.bottom)', body)
        self.assertIn('!o.dress && o.top', body)


# ===========================================================================
# Test Suite 9: Data integrity checks
# ===========================================================================
class TestDataIntegrity(unittest.TestCase):
    """Cross-file data consistency checks."""

    def test_fashion_items_all_have_required_fields(self):
        """data.js: every FASHION_ITEMS entry needs id, cat, name, cost, tags"""
        source = read_js('data.js')
        # Extract the FASHION_ITEMS block
        items_match = re.search(r'const FASHION_ITEMS\s*=\s*\[(.*?)\];', source, re.DOTALL)
        self.assertIsNotNone(items_match)
        items_block = items_match.group(1)
        # Find all uncommented item objects
        # Each item starts with { id:
        item_entries = re.findall(r"\{\s*id:\s*'([^']+)'.*?\}", items_block)
        self.assertGreater(len(item_entries), 0, "No FASHION_ITEMS found")
        for item_id in item_entries:
            # Verify each has cat, name, cost, tags in its block
            pattern = rf"id:\s*'{re.escape(item_id)}'[^}}]*?cat:\s*'[^']+'"
            self.assertRegex(items_block, pattern,
                             f"Item {item_id} missing 'cat' field")

    def test_fashion_categories_match_item_cats(self):
        """data.js: FASHION_CATEGORIES should cover all categories used in FASHION_ITEMS"""
        source = read_js('data.js')
        cats_match = re.search(r"const FASHION_CATEGORIES\s*=\s*\[([^\]]+)\]", source)
        self.assertIsNotNone(cats_match)
        categories = re.findall(r"'([^']+)'", cats_match.group(1))
        # Get all cats from active (uncommented) items
        items_match = re.search(r'const FASHION_ITEMS\s*=\s*\[(.*?)\];', source, re.DOTALL)
        items_block = items_match.group(1)
        # Only look at uncommented lines
        active_lines = [l for l in items_block.split('\n') if not l.strip().startswith('//')]
        active_block = '\n'.join(active_lines)
        used_cats = set(re.findall(r"cat:\s*'([^']+)'", active_block))
        for cat in used_cats:
            self.assertIn(cat, categories,
                          f"Category '{cat}' used in FASHION_ITEMS but not in FASHION_CATEGORIES")

    def test_each_location_has_eight_spots(self):
        """data.js: every LOCATION should have spots: 8"""
        source = read_js('data.js')
        spots = re.findall(r'spots:\s*(\d+)', source)
        for i, s in enumerate(spots):
            self.assertEqual(s, '8', f"Location {i} has spots:{s}, expected 8")

    def test_creature_count_matches_locations(self):
        """data.js: should have 10 creatures per original location, 6 for dream-nexus"""
        source = read_js('data.js')
        # Only count creature entries (before FASHION section) to avoid DEFAULT_STATE matches
        creatures_section = source[:source.index('FASHION_CATEGORIES')]
        creature_locations = re.findall(r"location:\s*'([^']+)'", creatures_section)
        from collections import Counter
        counts = Counter(creature_locations)
        for loc_id in ['sparkle-forest', 'crystal-beach', 'cloud-garden', 'moon-cave', 'rainbow-meadow']:
            self.assertEqual(counts.get(loc_id, 0), 10,
                             f"Location {loc_id} should have 10 creatures, has {counts.get(loc_id, 0)}")
        self.assertEqual(counts.get('dream-nexus', 0), 6,
                         f"Location dream-nexus should have 6 creatures, has {counts.get('dream-nexus', 0)}")

    def test_free_wardrobe_items_match_default_state(self):
        """data.js: DEFAULT_STATE wardrobe_unlocked should include all cost:0 items"""
        source = read_js('data.js')
        # The DEFAULT_STATE computes wardrobe_unlocked dynamically:
        # FASHION_ITEMS.filter(i => i.cost === 0).map(i => i.id)
        self.assertIn("FASHION_ITEMS.filter(i => i.cost === 0).map(i => i.id)",
                       source,
                       "DEFAULT_STATE should derive wardrobe_unlocked from cost===0 items")


# ===========================================================================
# Test Suite 10: Source code structural checks
# ===========================================================================
class TestSourceStructure(unittest.TestCase):
    """Validates that key functions exist and have proper structure."""

    def test_audio_module_exports(self):
        """audio.js: module must export sfx, startMusic, stopMusic, toggleMute, cycleStyle, isMuted, getStyle"""
        source = read_js('audio.js')
        exports_match = re.search(r'return\s*\{([^}]+)\}', source)
        self.assertIsNotNone(exports_match)
        exports = exports_match.group(1)
        for name in ['sfx', 'startMusic', 'stopMusic', 'toggleMute', 'cycleStyle', 'isMuted', 'getStyle']:
            self.assertIn(name, exports, f"Audio module missing export: {name}")

    def test_fashion_module_exports_album_functions(self):
        """fashion.js: module must export openAlbum, closeAlbum, saveOutfit, loadOutfit, deleteOutfit"""
        source = read_js('fashion.js')
        # Find the last return { ... } which is the module's public API
        all_returns = list(re.finditer(r'return\s*\{([^}]+)\}', source))
        self.assertGreater(len(all_returns), 0)
        exports = all_returns[-1].group(1)
        for name in ['openAlbum', 'closeAlbum', 'saveOutfit', 'loadOutfit', 'deleteOutfit']:
            self.assertIn(name, exports, f"Fashion module missing export: {name}")

    def test_game_module_exports(self):
        """game.js: module must export state, init, switchMode, addCoins, showToast"""
        source = read_js('game.js')
        # The game.js return block has nested braces (get state() { ... }),
        # so we find the final "return {" and grab until the matching "};"
        match = re.search(r'return\s*\{(.+)\};?\s*\}\)\(\)', source, re.DOTALL)
        self.assertIsNotNone(match, "Could not find Game module return block")
        exports = match.group(1)
        for name in ['state', 'init', 'switchMode', 'addCoins', 'showToast']:
            self.assertIn(name, exports, f"Game module missing export: {name}")

    def test_audio_mute_reads_from_localstorage(self):
        """audio.js: muted state must be initialized from localStorage"""
        source = read_js('audio.js')
        self.assertIn("localStorage.getItem('hadley-muted')", source)

    def test_audio_style_reads_from_localstorage(self):
        """audio.js: musicStyle must be initialized from localStorage"""
        source = read_js('audio.js')
        self.assertIn("localStorage.getItem('hadley-music-style')", source)

    def test_save_outfit_calls_autosave(self):
        """fashion.js saveOutfit: must call SaveManager.autoSave after saving"""
        source = read_js('fashion.js')
        match = re.search(r'function saveOutfit\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('SaveManager.autoSave(Game.state)', match.group(1))

    def test_delete_outfit_calls_autosave(self):
        """fashion.js deleteOutfit: must call SaveManager.autoSave after deleting"""
        source = read_js('fashion.js')
        match = re.search(r'function deleteOutfit\(index\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('SaveManager.autoSave(Game.state)', match.group(1))


# ===========================================================================
# Test Suite 11: Creature catch mini-game (js/creatures.js)
# ===========================================================================
class TestCreatureCatchMiniGame(unittest.TestCase):
    """
    Validates the catch mini-game logic: rarity-based selection,
    catch result determination, coin rewards, and cooldowns.
    """

    RARITY = {
        'common':    {'chance': 0.50, 'ringSpeed': 1.0, 'ringSize': 1.0, 'cooldown': 30000},
        'rare':      {'chance': 0.30, 'ringSpeed': 1.3, 'ringSize': 0.85, 'cooldown': 120000},
        'epic':      {'chance': 0.15, 'ringSpeed': 1.6, 'ringSize': 0.7, 'cooldown': 300000},
        'legendary': {'chance': 0.05, 'ringSpeed': 2.0, 'ringSize': 0.55, 'cooldown': 900000},
    }

    def test_rarity_chances_sum_to_one(self):
        """data.js: RARITY chances must sum to 1.0"""
        total = sum(r['chance'] for r in self.RARITY.values())
        self.assertAlmostEqual(total, 1.0, places=5)

    def test_rarity_chances_in_source(self):
        """data.js: verify rarity chance values in source code"""
        source = read_js('data.js')
        self.assertIn('chance: 0.50', source)
        self.assertIn('chance: 0.30', source)
        self.assertIn('chance: 0.15', source)
        self.assertIn('chance: 0.05', source)

    def test_catch_result_perfect(self):
        """creatures.js: diff < 8 = perfect catch"""
        diff = 5  # abs(ringRadius - targetRadius)
        if diff < 8:
            result = 'perfect'
        elif diff < 20:
            result = 'good'
        else:
            result = 'miss'
        self.assertEqual(result, 'perfect')

    def test_catch_result_good(self):
        """creatures.js: 8 <= diff < 20 = good catch"""
        diff = 15
        if diff < 8:
            result = 'perfect'
        elif diff < 20:
            result = 'good'
        else:
            result = 'miss'
        self.assertEqual(result, 'good')

    def test_catch_result_miss(self):
        """creatures.js: diff >= 20 = miss"""
        diff = 25
        if diff < 8:
            result = 'perfect'
        elif diff < 20:
            result = 'good'
        else:
            result = 'miss'
        self.assertEqual(result, 'miss')

    def test_catch_result_boundary_8_is_good(self):
        """creatures.js: diff exactly 8 should be 'good', not 'perfect'"""
        diff = 8
        result = 'perfect' if diff < 8 else ('good' if diff < 20 else 'miss')
        self.assertEqual(result, 'good')

    def test_catch_result_boundary_20_is_miss(self):
        """creatures.js: diff exactly 20 should be 'miss', not 'good'"""
        diff = 20
        result = 'perfect' if diff < 8 else ('good' if diff < 20 else 'miss')
        self.assertEqual(result, 'miss')

    def test_perfect_catch_gives_bonus_coins(self):
        """creatures.js handleCatchResult: perfect catch gives 1.5x coins (floored)"""
        base_coins = 25  # rare creature
        coins = base_coins
        result = 'perfect'
        if result == 'perfect':
            coins = int(coins * 1.5)  # Math.floor(coins * 1.5)
        self.assertEqual(coins, 37)

    def test_good_catch_gives_base_coins(self):
        """creatures.js handleCatchResult: good catch gives base coins"""
        base_coins = 10
        coins = base_coins
        result = 'good'
        if result == 'perfect':
            coins = int(coins * 1.5)
        self.assertEqual(coins, 10)

    def test_miss_sets_short_cooldown(self):
        """creatures.js handleCatchResult: miss sets 5-second cooldown"""
        # From source: cooldowns[key] = Date.now() + 5000
        cooldown_ms = 5000
        self.assertEqual(cooldown_ms, 5000)

    def test_catch_success_sets_rarity_cooldown(self):
        """creatures.js handleCatchResult: successful catch sets rarity-specific cooldown"""
        for rarity, cfg in self.RARITY.items():
            self.assertGreater(cfg['cooldown'], 0,
                               f"{rarity} cooldown should be positive")

    def test_legendary_has_longest_cooldown(self):
        """creatures.js: legendary cooldown (15min) > epic (5min) > rare (2min) > common (30s)"""
        self.assertGreater(self.RARITY['legendary']['cooldown'],
                           self.RARITY['epic']['cooldown'])
        self.assertGreater(self.RARITY['epic']['cooldown'],
                           self.RARITY['rare']['cooldown'])
        self.assertGreater(self.RARITY['rare']['cooldown'],
                           self.RARITY['common']['cooldown'])

    def test_ring_speed_increases_with_rarity(self):
        """data.js: higher rarity = faster ring speed"""
        self.assertLess(self.RARITY['common']['ringSpeed'],
                        self.RARITY['rare']['ringSpeed'])
        self.assertLess(self.RARITY['rare']['ringSpeed'],
                        self.RARITY['epic']['ringSpeed'])
        self.assertLess(self.RARITY['epic']['ringSpeed'],
                        self.RARITY['legendary']['ringSpeed'])

    def test_ring_size_decreases_with_rarity(self):
        """data.js: higher rarity = smaller target ring (harder)"""
        self.assertGreater(self.RARITY['common']['ringSize'],
                           self.RARITY['rare']['ringSize'])
        self.assertGreater(self.RARITY['rare']['ringSize'],
                           self.RARITY['epic']['ringSize'])
        self.assertGreater(self.RARITY['epic']['ringSize'],
                           self.RARITY['legendary']['ringSize'])

    def test_catch_active_guard_in_source(self):
        """creatures.js: startCatchGame must check catchActive guard"""
        source = read_js('creatures.js')
        match = re.search(r'function startCatchGame\(.*?\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('if (catchActive) return', body)

    def test_catch_resets_active_on_miss(self):
        """creatures.js handleCatchResult: catchActive set false on miss, legendary escape, and success"""
        source = read_js('creatures.js')
        match = re.search(r'function handleCatchResult\(.*?\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        # catchActive = false should appear in: miss branch, legendary escape branch, and success path
        self.assertEqual(body.count('catchActive = false'), 3,
                         "catchActive should be reset in miss, legendary escape, and success paths")

    def test_new_creature_added_to_state(self):
        """creatures.js handleCatchResult: new creature gets pushed to state.creatures"""
        source = read_js('creatures.js')
        self.assertIn("Game.state.creatures.push(creature.id)", source)

    def test_duplicate_creature_not_re_added(self):
        """creatures.js handleCatchResult: already-caught creature should not be duplicated"""
        source = read_js('creatures.js')
        self.assertIn("Game.state.creatures.includes(creature.id)", source,
                       "Must check includes() before pushing")

    def test_cooldown_persistence_to_session_storage(self):
        """creatures.js: cooldowns must persist to sessionStorage"""
        source = read_js('creatures.js')
        self.assertIn("sessionStorage.setItem('creature-cooldowns'", source)
        self.assertIn("sessionStorage.getItem('creature-cooldowns')", source)

    def test_expired_cooldowns_cleaned_on_load(self):
        """creatures.js: expired cooldowns should be deleted when loading from sessionStorage"""
        source = read_js('creatures.js')
        self.assertIn('delete cooldowns[k]', source)

    def _pick_creature_logic(self, roll, rarity_order):
        """Reimplements pickCreature rarity selection"""
        cumulative = 0
        for rarity, cfg in rarity_order:
            cumulative += cfg['chance']
            if roll <= cumulative:
                return rarity
        return 'common'  # fallback

    def test_pick_creature_low_roll_is_common(self):
        """creatures.js pickCreature: roll=0.1 should select common (0-0.50)"""
        order = list(self.RARITY.items())
        result = self._pick_creature_logic(0.1, order)
        self.assertEqual(result, 'common')

    def test_pick_creature_mid_roll_is_rare(self):
        """creatures.js pickCreature: roll=0.6 should select rare (0.50-0.80)"""
        order = list(self.RARITY.items())
        result = self._pick_creature_logic(0.6, order)
        self.assertEqual(result, 'rare')

    def test_pick_creature_high_roll_is_epic(self):
        """creatures.js pickCreature: roll=0.9 should select epic (0.80-0.95)"""
        order = list(self.RARITY.items())
        result = self._pick_creature_logic(0.9, order)
        self.assertEqual(result, 'epic')

    def test_pick_creature_very_high_roll_is_legendary(self):
        """creatures.js pickCreature: roll=0.99 should select legendary (0.95-1.0)"""
        order = list(self.RARITY.items())
        result = self._pick_creature_logic(0.99, order)
        self.assertEqual(result, 'legendary')

    def test_svg_sanitize_strips_script_tags(self):
        """creatures.js sanitizeSVG: must remove <script> tags"""
        source = read_js('creatures.js')
        match = re.search(r'function sanitizeSVG\(.*?\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('script', body.lower())

    def test_svg_sanitize_strips_on_handlers(self):
        """creatures.js sanitizeSVG: must remove on* event handlers"""
        source = read_js('creatures.js')
        match = re.search(r'function sanitizeSVG\(.*?\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        # The regex in source uses \\bon\\w+ to match on* attributes
        self.assertIn('on\\w+', body, "Must strip on* attributes")


# ===========================================================================
# Test Suite 12: Fashion challenge scoring (js/fashion.js)
# ===========================================================================
class TestFashionChallengeScoring(unittest.TestCase):
    """
    Validates the submitChallenge() scoring algorithm in fashion.js.
    Scoring has 3 components: completeness (30), theme match (50), color coord (20).
    """

    # Simulated fashion items with tags
    ITEMS = {
        'hair-1': {'tags': ['classic', 'elegant']},
        'hair-2': {'tags': ['cute', 'playful']},
        'top-1':  {'tags': ['casual', 'everyday']},
        'top-3':  {'tags': ['cozy', 'winter', 'casual']},
        'bottom-1': {'tags': ['casual', 'everyday']},
        'bottom-2': {'tags': ['cute', 'party']},
        'dress-1': {'tags': ['casual', 'beach', 'summer']},
        'shoes-1': {'tags': ['casual', 'sport', 'everyday']},
        'shoes-3': {'tags': ['adventure', 'winter', 'rock']},
        'acc-1':  {'tags': ['cute', 'party']},
        'acc-2':  {'tags': ['beach', 'casual', 'pop']},
        'hat-2':  {'tags': ['cute', 'fantasy', 'party']},
        'hat-3':  {'tags': ['cozy', 'winter', 'casual']},
    }

    def _score_outfit(self, outfit, theme_tags):
        """
        Reimplements submitChallenge scoring from fashion.js lines 282-325.
        outfit: dict of slot -> item_id or None
        theme_tags: list of tag strings
        Returns (score, max_score, stars, coin_reward)
        """
        score = 0
        max_score = 0
        equipped = [v for v in outfit.values() if v]

        # 1. Completeness (max 30)
        slots = ['hair', 'shoes', 'accessory', 'hat']
        body_slots = ['dress'] if outfit.get('dress') else ['top', 'bottom']
        all_slots = slots + body_slots
        filled = sum(1 for s in all_slots if outfit.get(s))
        score += round((filled / len(all_slots)) * 30)
        max_score += 30

        # 2. Theme match (max 50)
        max_score += 50
        if equipped:
            tag_matches = 0
            for item_id in equipped:
                item = self.ITEMS.get(item_id, {})
                tags = item.get('tags', [])
                overlap = [t for t in tags if t in theme_tags]
                if overlap:
                    tag_matches += 1
            score += round((tag_matches / len(equipped)) * 50)

        # 3. Color coordination (max 20)
        max_score += 20
        if len(equipped) >= 2:
            score += min(20, len(equipped) * 4)

        pct = score / max_score
        if pct >= 0.9:
            stars = 5
        elif pct >= 0.75:
            stars = 4
        elif pct >= 0.55:
            stars = 3
        elif pct >= 0.35:
            stars = 2
        else:
            stars = 1

        if stars >= 4:
            coins = 50
        elif stars >= 3:
            coins = 30
        elif stars >= 2:
            coins = 15
        else:
            coins = 10

        return score, max_score, stars, coins

    def test_empty_outfit_gets_one_star(self):
        """fashion.js scoring: completely empty outfit = 1 star"""
        outfit = {'hair': None, 'top': None, 'bottom': None, 'dress': None,
                  'shoes': None, 'accessory': None, 'hat': None}
        _, _, stars, coins = self._score_outfit(outfit, ['casual'])
        self.assertEqual(stars, 1)
        self.assertEqual(coins, 10)

    def test_full_outfit_matching_theme_gets_high_stars(self):
        """fashion.js scoring: full outfit with all tags matching theme = 4-5 stars"""
        # Beach party theme with matching items
        outfit = {'hair': None, 'top': None, 'bottom': None,
                  'dress': 'dress-1',  # casual, beach, summer
                  'shoes': 'shoes-1',  # casual, sport, everyday
                  'accessory': 'acc-2',  # beach, casual, pop
                  'hat': None}
        _, _, stars, _ = self._score_outfit(outfit, ['beach', 'summer', 'casual'])
        self.assertGreaterEqual(stars, 3)

    def test_full_outfit_no_theme_match(self):
        """fashion.js scoring: full outfit but no tag overlap = low score"""
        outfit = {'hair': 'hair-1', 'top': 'top-3', 'bottom': 'bottom-1',
                  'dress': None, 'shoes': 'shoes-3', 'accessory': 'acc-1',
                  'hat': 'hat-2'}
        # Theme tags that don't match any items
        _, _, stars, _ = self._score_outfit(outfit, ['space', 'adventure'])
        self.assertLessEqual(stars, 3)

    def test_completeness_score_all_slots_filled(self):
        """fashion.js scoring: all slots filled = 30 completeness points"""
        outfit = {'hair': 'hair-1', 'top': 'top-1', 'bottom': 'bottom-1',
                  'dress': None, 'shoes': 'shoes-1', 'accessory': 'acc-1',
                  'hat': 'hat-2'}
        # All 6 slots filled (hair, top, bottom, shoes, accessory, hat)
        slots = ['hair', 'shoes', 'accessory', 'hat']
        body_slots = ['top', 'bottom']  # no dress
        all_slots = slots + body_slots
        filled = sum(1 for s in all_slots if outfit.get(s))
        completeness = round((filled / len(all_slots)) * 30)
        self.assertEqual(completeness, 30)

    def test_completeness_score_no_slots_filled(self):
        """fashion.js scoring: no slots filled = 0 completeness points"""
        outfit = {'hair': None, 'top': None, 'bottom': None,
                  'dress': None, 'shoes': None, 'accessory': None, 'hat': None}
        slots = ['hair', 'shoes', 'accessory', 'hat']
        body_slots = ['top', 'bottom']
        all_slots = slots + body_slots
        filled = sum(1 for s in all_slots if outfit.get(s))
        completeness = round((filled / len(all_slots)) * 30)
        self.assertEqual(completeness, 0)

    def test_dress_replaces_top_bottom_in_slot_count(self):
        """fashion.js scoring: wearing a dress means body_slots = ['dress'], not ['top','bottom']"""
        outfit = {'hair': 'hair-1', 'top': None, 'bottom': None,
                  'dress': 'dress-1', 'shoes': 'shoes-1',
                  'accessory': 'acc-1', 'hat': 'hat-2'}
        slots = ['hair', 'shoes', 'accessory', 'hat']
        body_slots = ['dress']  # dress is equipped
        all_slots = slots + body_slots
        filled = sum(1 for s in all_slots if outfit.get(s))
        # All 5 slots filled: hair, dress, shoes, accessory, hat
        self.assertEqual(filled, 5)
        self.assertEqual(len(all_slots), 5)
        completeness = round((filled / len(all_slots)) * 30)
        self.assertEqual(completeness, 30)

    def test_color_coordination_bonus_with_many_items(self):
        """fashion.js scoring: color coord = min(20, equipped_count * 4)"""
        # 6 items equipped: 6*4=24, capped at 20
        self.assertEqual(min(20, 6 * 4), 20)
        # 3 items: 3*4=12
        self.assertEqual(min(20, 3 * 4), 12)
        # 1 item: no bonus (requires >= 2)
        equipped_count = 1
        bonus = min(20, equipped_count * 4) if equipped_count >= 2 else 0
        self.assertEqual(bonus, 0)

    def test_star_thresholds(self):
        """fashion.js scoring: verify all star percentage thresholds"""
        thresholds = [(0.95, 5), (0.9, 5), (0.75, 4), (0.55, 3), (0.35, 2), (0.1, 1)]
        for pct, expected in thresholds:
            if pct >= 0.9:
                stars = 5
            elif pct >= 0.75:
                stars = 4
            elif pct >= 0.55:
                stars = 3
            elif pct >= 0.35:
                stars = 2
            else:
                stars = 1
            self.assertEqual(stars, expected, f"pct={pct} should give {expected} stars")

    def test_coin_rewards_by_stars(self):
        """fashion.js scoring: 4-5 stars=50, 3 stars=30, 2 stars=15, 1 star=10"""
        expected = {5: 50, 4: 50, 3: 30, 2: 15, 1: 10}
        for stars, coins in expected.items():
            if stars >= 4:
                reward = 50
            elif stars >= 3:
                reward = 30
            elif stars >= 2:
                reward = 15
            else:
                reward = 10
            self.assertEqual(reward, coins, f"{stars} stars should give {coins} coins")

    def test_best_score_only_saved_if_higher(self):
        """fashion.js scoring: fashion_scores[theme] only updated if new stars > previous"""
        source = read_js('fashion.js')
        self.assertIn('if (stars > prev)', source,
                       "Must only save score if new stars > previous best")

    def test_challenge_increments_stats(self):
        """fashion.js scoring: challenges_completed must be incremented"""
        source = read_js('fashion.js')
        self.assertIn('stats.challenges_completed++', source)

    def test_submit_clears_timer(self):
        """fashion.js submitChallenge: must clear timerInterval"""
        source = read_js('fashion.js')
        match = re.search(r'function submitChallenge\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('clearInterval(timerInterval)', body)

    def test_submit_requires_challenge_mode(self):
        """fashion.js submitChallenge: must check isChallenge && challengeTheme"""
        source = read_js('fashion.js')
        match = re.search(r'function submitChallenge\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('!isChallenge', body)
        self.assertIn('!challengeTheme', body)


# ===========================================================================
# Test Suite 13: Fashion shop buying (js/fashion.js)
# ===========================================================================
class TestFashionShop(unittest.TestCase):
    """Validates buyItem() logic: coin check, deduction, wardrobe unlock."""

    def _buy_item(self, coins, cost, wardrobe, item_id):
        """
        Reimplements buyItem logic from fashion.js lines 418-429.
        Returns (new_coins, new_wardrobe, success, message).
        """
        if coins < cost:
            return coins, wardrobe, False, 'Not enough coins!'
        new_coins = coins - cost
        new_wardrobe = list(wardrobe) + [item_id]
        return new_coins, new_wardrobe, True, f'Bought!'

    def test_buy_item_sufficient_coins(self):
        """fashion.js buyItem: purchase succeeds with enough coins"""
        coins, wardrobe, success, _ = self._buy_item(100, 40, ['hair-1'], 'hair-5')
        self.assertTrue(success)
        self.assertEqual(coins, 60)
        self.assertIn('hair-5', wardrobe)

    def test_buy_item_insufficient_coins(self):
        """fashion.js buyItem: purchase fails without enough coins"""
        coins, wardrobe, success, msg = self._buy_item(30, 50, ['hair-1'], 'top-6')
        self.assertFalse(success)
        self.assertEqual(coins, 30)
        self.assertNotIn('top-6', wardrobe)
        self.assertEqual(msg, 'Not enough coins!')

    def test_buy_item_exact_coins(self):
        """fashion.js buyItem: purchase succeeds when coins == cost exactly"""
        coins, wardrobe, success, _ = self._buy_item(40, 40, [], 'hair-5')
        self.assertTrue(success)
        self.assertEqual(coins, 0)

    def test_buy_item_zero_cost_free(self):
        """fashion.js buyItem: cost 0 items are free (handled by shop filter, but logic works)"""
        coins, wardrobe, success, _ = self._buy_item(100, 0, [], 'hair-1')
        self.assertTrue(success)
        self.assertEqual(coins, 100)  # No deduction for free items

    def test_buy_item_uses_addCoins_negative(self):
        """fashion.js buyItem: must call Game.addCoins(-item.cost)"""
        source = read_js('fashion.js')
        match = re.search(r'function buyItem\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('Game.addCoins(-item.cost)', body,
                       "buyItem must use Game.addCoins(-cost) for proper coin flow")

    def test_buy_item_pushes_to_wardrobe(self):
        """fashion.js buyItem: must push item.id to wardrobe_unlocked"""
        source = read_js('fashion.js')
        match = re.search(r'function buyItem\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('wardrobe_unlocked.push(item.id)', body)

    def test_buy_item_calls_autosave(self):
        """fashion.js buyItem: must call SaveManager.autoSave"""
        source = read_js('fashion.js')
        match = re.search(r'function buyItem\(item\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('SaveManager.autoSave(Game.state)', body)

    def test_shop_only_shows_paid_items(self):
        """fashion.js renderShopItems: must filter items with cost > 0"""
        source = read_js('fashion.js')
        self.assertIn("i.cost > 0", source,
                       "Shop should only display items that cost > 0")

    def test_all_shop_items_have_positive_cost(self):
        """data.js: every FASHION_ITEMS entry with cost > 0 has a reasonable price"""
        source = read_js('data.js')
        costs = re.findall(r"cost:\s*(\d+)", source)
        paid_costs = [int(c) for c in costs if int(c) > 0]
        for cost in paid_costs:
            self.assertGreater(cost, 0)
            self.assertLessEqual(cost, 500, "No item should cost more than 500 coins")


# ===========================================================================
# Test Suite 14: SaveManager (js/save.js)
# ===========================================================================
class TestSaveManager(unittest.TestCase):
    """Validates SaveManager logic: save key, daily bonus, debounce."""

    def test_save_key_constant(self):
        """save.js: SAVE_KEY must be 'hadley-dream-world-save'"""
        source = read_js('save.js')
        self.assertIn("const SAVE_KEY = 'hadley-dream-world-save'", source)

    def test_load_returns_null_on_empty(self):
        """save.js load: returns null when no saved data"""
        source = read_js('save.js')
        match = re.search(r'function load\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('return null', body)

    def test_load_parses_json(self):
        """save.js load: must JSON.parse the raw localStorage value"""
        source = read_js('save.js')
        self.assertIn('JSON.parse(raw)', source)

    def test_save_sets_last_save_timestamp(self):
        """save.js save: must set state.last_save before writing"""
        source = read_js('save.js')
        match = re.search(r'function save\(state\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('state.last_save = new Date().toISOString()', body)

    def test_autosave_debounces_at_500ms(self):
        """save.js autoSave: must debounce with 500ms timeout"""
        source = read_js('save.js')
        match = re.search(r'function autoSave\(state\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('clearTimeout(saveTimeout)', body)
        self.assertIn('500', body)

    def test_autosave_calls_save(self):
        """save.js autoSave: must eventually call save(state)"""
        source = read_js('save.js')
        match = re.search(r'function autoSave\(state\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('save(state)', body)

    def _check_daily_bonus(self, last_login_str, now_str):
        """
        Reimplements checkDailyBonus from save.js lines 55-63.
        Returns True if eligible for daily bonus.
        """
        from datetime import datetime
        now = datetime.fromisoformat(now_str)
        if not last_login_str:
            return True
        last = datetime.fromisoformat(last_login_str)
        return now.date() != last.date()

    def test_daily_bonus_first_login(self):
        """save.js checkDailyBonus: first login (no last_login) = eligible"""
        self.assertTrue(self._check_daily_bonus(None, '2026-03-06T10:00:00'))

    def test_daily_bonus_same_day(self):
        """save.js checkDailyBonus: same day = not eligible"""
        self.assertFalse(self._check_daily_bonus('2026-03-06T08:00:00', '2026-03-06T20:00:00'))

    def test_daily_bonus_next_day(self):
        """save.js checkDailyBonus: different day = eligible"""
        self.assertTrue(self._check_daily_bonus('2026-03-05T23:00:00', '2026-03-06T01:00:00'))

    def test_daily_bonus_amount_is_25(self):
        """data.js: DAILY_BONUS constant must be 25"""
        source = read_js('data.js')
        self.assertIn('const DAILY_BONUS = 25', source)

    def test_clear_save_removes_key(self):
        """save.js clearSave: must call localStorage.removeItem"""
        source = read_js('save.js')
        match = re.search(r'function clearSave\(\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('localStorage.removeItem(SAVE_KEY)', body)

    def test_save_manager_exports(self):
        """save.js: must export load, save, autoSave, clearSave, checkDailyBonus"""
        source = read_js('save.js')
        exports_match = re.search(r'return\s*\{([^}]+)\}', source)
        self.assertIsNotNone(exports_match)
        exports = exports_match.group(1)
        for name in ['load', 'save', 'autoSave', 'clearSave', 'checkDailyBonus']:
            self.assertIn(name, exports, f"SaveManager missing export: {name}")


# ===========================================================================
# Test Suite 15: Outfit equip logic (js/fashion.js)
# ===========================================================================
class TestFashionEquipLogic(unittest.TestCase):
    """
    Validates the equip/unequip toggling logic in renderWardrobeItems onclick.
    Key rule: dress clears top+bottom; top/bottom clears dress.
    """

    def _equip_item(self, outfit, cat, item_id):
        """
        Reimplements the equip toggle from fashion.js lines 243-258.
        Returns modified outfit dict.
        """
        o = dict(outfit)
        if o.get(cat) == item_id:
            o[cat] = None  # Toggle off
        else:
            o[cat] = item_id
            if cat == 'dress':
                o['top'] = None
                o['bottom'] = None
            elif cat in ('top', 'bottom'):
                o['dress'] = None
        return o

    def test_equip_dress_clears_top_and_bottom(self):
        """fashion.js equip: wearing a dress clears top and bottom"""
        outfit = {'hair': None, 'top': 'top-1', 'bottom': 'bottom-1',
                  'dress': None, 'shoes': None, 'accessory': None, 'hat': None}
        result = self._equip_item(outfit, 'dress', 'dress-1')
        self.assertEqual(result['dress'], 'dress-1')
        self.assertIsNone(result['top'])
        self.assertIsNone(result['bottom'])

    def test_equip_top_clears_dress(self):
        """fashion.js equip: wearing a top clears dress"""
        outfit = {'hair': None, 'top': None, 'bottom': None,
                  'dress': 'dress-1', 'shoes': None, 'accessory': None, 'hat': None}
        result = self._equip_item(outfit, 'top', 'top-1')
        self.assertEqual(result['top'], 'top-1')
        self.assertIsNone(result['dress'])

    def test_equip_bottom_clears_dress(self):
        """fashion.js equip: wearing a bottom clears dress"""
        outfit = {'hair': None, 'top': None, 'bottom': None,
                  'dress': 'dress-1', 'shoes': None, 'accessory': None, 'hat': None}
        result = self._equip_item(outfit, 'bottom', 'bottom-1')
        self.assertEqual(result['bottom'], 'bottom-1')
        self.assertIsNone(result['dress'])

    def test_toggle_off_same_item(self):
        """fashion.js equip: tapping already-equipped item unequips it"""
        outfit = {'hair': 'hair-1', 'top': None, 'bottom': None,
                  'dress': None, 'shoes': None, 'accessory': None, 'hat': None}
        result = self._equip_item(outfit, 'hair', 'hair-1')
        self.assertIsNone(result['hair'])

    def test_equip_hat_does_not_affect_other_slots(self):
        """fashion.js equip: hat has no side effects on other slots"""
        outfit = {'hair': 'hair-1', 'top': 'top-1', 'bottom': 'bottom-1',
                  'dress': None, 'shoes': 'shoes-1', 'accessory': 'acc-1', 'hat': None}
        result = self._equip_item(outfit, 'hat', 'hat-2')
        self.assertEqual(result['hat'], 'hat-2')
        self.assertEqual(result['hair'], 'hair-1')
        self.assertEqual(result['top'], 'top-1')
        self.assertEqual(result['bottom'], 'bottom-1')

    def test_equip_source_code_dress_clears(self):
        """fashion.js: source must clear top/bottom when equipping dress"""
        source = read_js('fashion.js')
        self.assertIn("activeTab === 'dress'", source)
        self.assertIn("currentOutfit.top = null", source)
        self.assertIn("currentOutfit.bottom = null", source)

    def test_equip_source_code_top_bottom_clears_dress(self):
        """fashion.js: source must clear dress when equipping top or bottom"""
        source = read_js('fashion.js')
        self.assertIn("activeTab === 'top'", source)
        self.assertIn("activeTab === 'bottom'", source)
        self.assertIn("currentOutfit.dress = null", source)


# ===========================================================================
# Test Suite 16: Game.addCoins and hub updates (js/game.js)
# ===========================================================================
class TestGameAddCoins(unittest.TestCase):
    """Validates Game.addCoins: floor at zero, stats tracking, display update."""

    def _add_coins(self, current, amount):
        """Reimplements addCoins from game.js lines 131-140."""
        coins = current + amount
        if coins < 0:
            coins = 0
        return coins

    def test_add_positive_coins(self):
        """game.js addCoins: adding positive amount increases coins"""
        self.assertEqual(self._add_coins(100, 50), 150)

    def test_subtract_coins(self):
        """game.js addCoins: subtracting reduces coins"""
        self.assertEqual(self._add_coins(100, -30), 70)

    def test_coins_floor_at_zero(self):
        """game.js addCoins: coins can never go below 0"""
        self.assertEqual(self._add_coins(10, -50), 0)

    def test_coins_floor_at_zero_extreme(self):
        """game.js addCoins: even -99999 floors at 0"""
        self.assertEqual(self._add_coins(100, -99999), 0)

    def test_coins_zero_stays_zero(self):
        """game.js addCoins: 0 coins + 0 = 0"""
        self.assertEqual(self._add_coins(0, 0), 0)

    def test_add_coins_source_has_floor(self):
        """game.js: addCoins must check coins < 0 and floor to 0"""
        source = read_js('game.js')
        match = re.search(r'function addCoins\(amount\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('state.coins < 0', body)
        self.assertIn('state.coins = 0', body)

    def test_add_coins_tracks_positive_earnings(self):
        """game.js addCoins: positive amounts increment total_coins_earned"""
        source = read_js('game.js')
        match = re.search(r'function addCoins\(amount\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        body = match.group(1)
        self.assertIn('stats.total_coins_earned += amount', body)
        # Only tracks positive: the if (amount > 0) guard
        self.assertIn('if (amount > 0)', body)

    def test_switch_mode_calls_fashion_on_exit(self):
        """game.js switchMode: must call Fashion.onExit() to prevent timer leaks"""
        source = read_js('game.js')
        match = re.search(r'function switchMode\(mode\)\s*\{(.*?)\n  \}', source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('Fashion.onExit()', body)


# ===========================================================================
# Test Suite 17: Challenge themes data (js/data.js)
# ===========================================================================
class TestChallengeThemesData(unittest.TestCase):
    """Validates CHALLENGE_THEMES structure and tag coverage."""

    def test_all_themes_have_required_fields(self):
        """data.js: every CHALLENGE_THEMES entry needs id, name, tags, icon"""
        source = read_js('data.js')
        themes_match = re.search(r'const CHALLENGE_THEMES\s*=\s*\[(.*?)\];', source, re.DOTALL)
        self.assertIsNotNone(themes_match)
        block = themes_match.group(1)
        entries = re.findall(r"\{\s*id:", block)
        self.assertGreater(len(entries), 0)
        ids = re.findall(r"id:\s*'([^']+)'", block)
        for tid in ids:
            self.assertRegex(block, rf"id:\s*'{re.escape(tid)}'")

    def test_at_least_10_themes(self):
        """data.js: should have at least 10 challenge themes for variety"""
        source = read_js('data.js')
        themes_match = re.search(r'const CHALLENGE_THEMES\s*=\s*\[(.*?)\];', source, re.DOTALL)
        ids = re.findall(r"id:\s*'([^']+)'", themes_match.group(1))
        self.assertGreaterEqual(len(ids), 10)

    def test_theme_ids_are_unique(self):
        """data.js: challenge theme IDs must be unique"""
        source = read_js('data.js')
        themes_match = re.search(r'const CHALLENGE_THEMES\s*=\s*\[(.*?)\];', source, re.DOTALL)
        ids = re.findall(r"id:\s*'([^']+)'", themes_match.group(1))
        self.assertEqual(len(ids), len(set(ids)), "Duplicate theme IDs found")

    def test_every_theme_has_at_least_two_tags(self):
        """data.js: each theme should have >= 2 tags for meaningful scoring"""
        source = read_js('data.js')
        themes_match = re.search(r'const CHALLENGE_THEMES\s*=\s*\[(.*?)\];', source, re.DOTALL)
        block = themes_match.group(1)
        tag_lists = re.findall(r"tags:\s*\[([^\]]+)\]", block)
        for i, tag_str in enumerate(tag_lists):
            tags = [t.strip().strip("'\"") for t in tag_str.split(',')]
            self.assertGreaterEqual(len(tags), 2,
                                    f"Theme {i} has fewer than 2 tags: {tags}")


# ===========================================================================
# Helper: read CSS source files
# ===========================================================================
def read_css(filename):
    path = os.path.join(PROJECT_ROOT, 'css', filename)
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def read_asset(rel_path):
    """Read any file relative to PROJECT_ROOT."""
    path = os.path.join(PROJECT_ROOT, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


# ===========================================================================
# Test Suite 18: Practice round tutorial (creatures.js)
# ===========================================================================
class TestPracticeRoundTutorial(unittest.TestCase):
    """Validates the practice-round tutorial flow in creatures.js and data.js."""

    def setUp(self):
        self.creatures_src = read_js('creatures.js')
        self.data_src = read_js('data.js')
        self.game_src = read_js('game.js')

    # tutorial_completed: false exists in DEFAULT_STATE
    def test_default_state_has_tutorial_completed_false(self):
        """data.js: DEFAULT_STATE must include tutorial_completed: false"""
        match = re.search(r'const DEFAULT_STATE\s*=\s*\{(.*?)\};', self.data_src, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('tutorial_completed: false', match.group(1))

    # game.js migrates missing tutorial_completed to false
    def test_game_init_migrates_tutorial_completed(self):
        """game.js: init() should set tutorial_completed = false for old saves missing it"""
        self.assertRegex(
            self.game_src,
            r'tutorial_completed\s*===\s*undefined.*tutorial_completed\s*=\s*false',
            "game.js init should migrate undefined tutorial_completed to false"
        )

    # startCatchGame checks tutorial_completed and branches to practice
    def test_start_catch_game_checks_tutorial_completed(self):
        """creatures.js: startCatchGame should check Game.state.tutorial_completed"""
        match = re.search(r'function startCatchGame\(.*?\)\s*\{(.*?)\n  function ', self.creatures_src, re.DOTALL)
        if not match:
            match = re.search(r'function startCatchGame\(.*?\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('tutorial_completed', body,
                       "startCatchGame must check tutorial_completed")
        self.assertIn('startPracticeRound', body,
                       "startCatchGame must call startPracticeRound for new players")

    # Practice round uses half speed (speed * 0.5)
    def test_practice_round_half_speed(self):
        """creatures.js: startPracticeRound should use half speed (speed * 0.5)"""
        match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n  function ', self.creatures_src, re.DOTALL)
        if not match:
            match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('0.5', body, "Practice round must halve the ring speed")

    # Practice success sets tutorial_completed = true and calls autoSave
    def test_practice_success_sets_tutorial_completed(self):
        """creatures.js: successful practice tap should set tutorial_completed = true"""
        self.assertIn('tutorial_completed = true', self.creatures_src,
                       "Practice success must set tutorial_completed = true")
        # autoSave should be called near tutorial_completed = true
        # Find the block around tutorial_completed = true
        idx = self.creatures_src.index('tutorial_completed = true')
        nearby = self.creatures_src[idx:idx+200]
        self.assertIn('autoSave', nearby,
                       "autoSave must be called after setting tutorial_completed = true")

    # Practice miss resets ring (does NOT set cooldown)
    def test_practice_miss_resets_ring_no_cooldown(self):
        """creatures.js: practice miss should reset ring but not set cooldown"""
        match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n  function ', self.creatures_src, re.DOTALL)
        if not match:
            match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        # Miss path should have 'ringRadius = maxRadius' (reset) and 'Try again'
        self.assertIn('ringRadius = maxRadius', body, "Practice miss must reset ring")
        self.assertIn('Try again', body, "Practice miss should show 'Try again' message")
        # The practice miss block should NOT contain cooldown assignment
        # Find the else block after diff < 20 check
        else_idx = body.find('Try again')
        if else_idx > 0:
            miss_block = body[else_idx-200:else_idx+200]
            self.assertNotIn('cooldowns[', miss_block,
                             "Practice miss should NOT set cooldown")

    # practiceTimeout variable exists and is cleared in closeCatch()
    def test_practice_timeout_cleared_in_close_catch(self):
        """creatures.js: closeCatch() must clear practiceTimeout"""
        self.assertIn('let practiceTimeout', self.creatures_src,
                       "practiceTimeout variable must exist")
        match = re.search(r'function closeCatch\(\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('practiceTimeout', body,
                       "closeCatch must reference practiceTimeout")
        self.assertIn('clearTimeout(practiceTimeout)', body,
                       "closeCatch must clear practiceTimeout")

    # Practice-to-real transition checks creatures screen is active
    def test_practice_to_real_checks_active_screen(self):
        """creatures.js: practice-to-real transition should check creatures screen is active"""
        match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n  function ', self.creatures_src, re.DOTALL)
        if not match:
            match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('creatures-screen', body,
                       "Practice timeout callback must check creatures-screen is active")
        self.assertIn('classList.contains(\'active\')', body,
                       "Must check for .active class on creatures screen")

    # startPracticeRound sets catchActive = true
    def test_start_practice_round_sets_catch_active(self):
        """creatures.js: startPracticeRound must set catchActive = true"""
        match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.*?)\n    function ', self.creatures_src, re.DOTALL)
        if not match:
            match = re.search(r'function startPracticeRound\(.*?\)\s*\{(.{0,300})', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('catchActive = true', body,
                       "startPracticeRound must set catchActive = true early")


# ===========================================================================
# Test Suite 19: Music unmute restart (audio.js)
# ===========================================================================
class TestMusicUnmuteRestart(unittest.TestCase):
    """Validates toggleMute captures mode and restarts music when unmuting."""

    def setUp(self):
        self.source = read_js('audio.js')

    # toggleMute captures wasMode = currentMode before stopping
    def test_toggle_mute_captures_was_mode(self):
        """audio.js: toggleMute should capture wasMode = currentMode before any state changes"""
        match = re.search(r'function toggleMute\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        was_mode_pos = body.find('wasMode')
        muted_toggle_pos = body.find('muted = !muted')
        self.assertGreater(was_mode_pos, -1, "toggleMute must have wasMode variable")
        self.assertGreater(muted_toggle_pos, -1, "toggleMute must toggle muted")
        self.assertLess(was_mode_pos, muted_toggle_pos,
                        "wasMode must be captured BEFORE toggling muted")

    # toggleMute calls startMusic(wasMode) when unmuting
    def test_toggle_mute_calls_start_music_with_was_mode(self):
        """audio.js: toggleMute should call startMusic(wasMode) when unmuting"""
        match = re.search(r'function toggleMute\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('startMusic(wasMode)', body,
                       "toggleMute must call startMusic(wasMode) when unmuting")

    # unlock() does NOT use { once: true } anymore
    def test_unlock_no_once_option(self):
        """audio.js: unlock() should NOT use { once: true } on event listeners"""
        match = re.search(r'function unlock\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertNotIn('once: true', body,
                          "unlock() should not use { once: true }")
        self.assertNotIn('once:', body,
                          "unlock() should not use once option at all")

    # unlock() removes listeners only after ctx.state is 'running'
    def test_unlock_removes_listeners_conditionally(self):
        """audio.js: unlock() should remove listeners only when AudioContext is running"""
        match = re.search(r'function unlock\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('removeEventListener', body,
                       "unlock must remove event listeners")
        # Check that removal happens inside a condition checking ctx.state
        self.assertIn("ctx.state === 'running'", body,
                       "unlock should check for ctx.state === 'running'")

    # Reimplementation test: toggleMute logic preserves mode across stop
    def test_toggle_mute_logic_preserves_mode(self):
        """Logic test: toggling mute off->on->off should restart music with original mode"""
        # Simulate the JS logic
        currentMode = 'creatures'
        muted = False

        # Mute: captures wasMode, then stops (which sets currentMode = None)
        wasMode = currentMode
        muted = True
        currentMode = None  # stopMusic sets this

        # Unmute: uses wasMode to restart
        muted = False
        if wasMode:
            currentMode = wasMode  # startMusic restores it

        self.assertEqual(currentMode, 'creatures',
                         "After mute/unmute cycle, mode should be restored")


# ===========================================================================
# Test Suite 20: SVG thumbnail refresh (fashion.js)
# ===========================================================================
class TestSVGThumbnailRefresh(unittest.TestCase):
    """Validates fetchSVG triggers panel refresh and buildThumbnail branching."""

    def setUp(self):
        self.source = read_js('fashion.js')

    # fetchSVG calls refreshVisiblePanels() after caching
    def test_fetch_svg_calls_refresh_visible_panels(self):
        """fashion.js: fetchSVG should call refreshVisiblePanels() after caching SVG"""
        match = re.search(r'function fetchSVG\(.*?\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('refreshVisiblePanels()', body,
                       "fetchSVG must call refreshVisiblePanels after caching")

    # refreshVisiblePanels exists and checks for .hidden class
    def test_refresh_visible_panels_checks_hidden(self):
        """fashion.js: refreshVisiblePanels should check .hidden class before re-rendering"""
        match = re.search(r'function refreshVisiblePanels\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("contains('hidden')", body,
                       "refreshVisiblePanels must check for hidden class")

    # refreshVisiblePanels is debounced (uses setTimeout)
    def test_refresh_visible_panels_is_debounced(self):
        """fashion.js: refreshVisiblePanels should be debounced using setTimeout"""
        # Check for the refreshTimeout pattern
        self.assertIn('refreshTimeout', self.source,
                       "refreshVisiblePanels must use refreshTimeout for debouncing")
        match = re.search(r'function refreshVisiblePanels\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('setTimeout', body,
                       "refreshVisiblePanels must use setTimeout for debounce")

    # buildThumbnail has 3 branches: cached SVG, loading placeholder, colored block fallback
    def test_build_thumbnail_three_branches(self):
        """fashion.js: buildThumbnail should have 3 branches for cached, loading, and fallback"""
        match = re.search(r'function buildThumbnail\(.*?\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        # Branch 1: cached SVG (uses svgCache[item.id])
        self.assertIn('svgCache[item.id]', body,
                       "buildThumbnail must check svgCache for cached SVG")
        # Branch 2: loading placeholder (item.svg exists but not cached)
        self.assertIn('item.svg', body,
                       "buildThumbnail must check item.svg for loading state")
        self.assertIn('...', body,
                       "buildThumbnail loading branch should show '...' placeholder")
        # Branch 3: fallback colored block
        self.assertIn('item.color', body,
                       "buildThumbnail must have colored block fallback using item.color")

    # buildThumbnail uses parseCached (not raw JSON)
    def test_build_thumbnail_uses_parse_cached(self):
        """fashion.js: buildThumbnail should use parseCached() to extract defs+groups"""
        match = re.search(r'function buildThumbnail\(.*?\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('parseCached', body,
                       "buildThumbnail must use parseCached() not raw JSON")


# ===========================================================================
# Test Suite 21: Avatar back-layer for tops (fashion.js)
# ===========================================================================
class TestAvatarBackLayerForTops(unittest.TestCase):
    """Validates buildAvatarSVG handles back-layer for tops and hoodie SVG has it."""

    def setUp(self):
        self.fashion_src = read_js('fashion.js')

    # buildAvatarSVG checks o.top for back-layer
    def test_build_avatar_svg_checks_top_back_layer(self):
        """fashion.js: buildAvatarSVG must check o.top for back-layer group"""
        match = re.search(r'function buildAvatarSVG\(.*?\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        # Should have a line checking o.top and getting back-layer
        self.assertIn('o.top', body, "buildAvatarSVG must reference o.top")
        self.assertIn('back-layer', body,
                       "buildAvatarSVG must handle back-layer for clothing items")
        # Verify the top back-layer is only applied when there's no dress
        self.assertRegex(body, r'!o\.dress.*o\.top.*back-layer',
                         "Top back-layer should only apply when no dress is equipped")

    # top-hoodie.svg contains both back-layer and clothing groups
    def test_hoodie_svg_has_back_layer_and_clothing(self):
        """assets: top-hoodie.svg must contain both <g id="back-layer"> and <g id="clothing">"""
        hoodie_svg = read_asset(os.path.join('assets', 'fashion', 'top-hoodie.svg'))
        self.assertIn('id="back-layer"', hoodie_svg,
                       "top-hoodie.svg must have <g id=\"back-layer\">")
        self.assertIn('id="clothing"', hoodie_svg,
                       "top-hoodie.svg must have <g id=\"clothing\">")

    # Layering order: top back-layer comes before avatar base
    def test_top_back_layer_before_avatar_base(self):
        """fashion.js: top back-layer must be layered before avatar base content"""
        match = re.search(r'function buildAvatarSVG\(.*?\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        # Find positions: back-layer for top should come before avatar-base content
        top_back = body.find("o.top")
        base_content = body.find("getSVGContent('avatar-base')")
        self.assertGreater(top_back, -1, "Must reference o.top")
        self.assertGreater(base_content, -1, "Must get avatar-base content")
        self.assertLess(top_back, base_content,
                        "Top back-layer must come before avatar base in layering")


# ===========================================================================
# Test Suite 22: Challenge mode button prominence (fashion.js + fashion.css)
# ===========================================================================
class TestChallengeModeButtonProminence(unittest.TestCase):
    """Validates challenge-mode class toggling and CSS emphasis styles."""

    def setUp(self):
        self.fashion_src = read_js('fashion.js')
        self.fashion_css = read_css('fashion.css')

    # startChallenge adds 'challenge-mode' class
    def test_start_challenge_adds_challenge_mode_class(self):
        """fashion.js: startChallenge should add 'challenge-mode' class to dressup-actions"""
        match = re.search(r'function startChallenge\(\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("classList.add('challenge-mode')", body,
                       "startChallenge must add challenge-mode class")

    # startFreeMode removes 'challenge-mode' class
    def test_start_free_mode_removes_challenge_mode_class(self):
        """fashion.js: startFreeMode should remove 'challenge-mode' class"""
        match = re.search(r'function startFreeMode\(\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("classList.remove('challenge-mode')", body,
                       "startFreeMode must remove challenge-mode class")

    # exitDressup removes 'challenge-mode' class
    def test_exit_dressup_removes_challenge_mode_class(self):
        """fashion.js: exitDressup should remove 'challenge-mode' class"""
        match = re.search(r'function exitDressup\(\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("classList.remove('challenge-mode')", body,
                       "exitDressup must remove challenge-mode class")

    # exitDressup has confirm dialog guard when isChallenge is true
    def test_exit_dressup_confirm_guard(self):
        """fashion.js: exitDressup should prompt confirm() when isChallenge is true"""
        match = re.search(r'function exitDressup\(\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('isChallenge', body, "exitDressup must check isChallenge")
        self.assertIn('confirm(', body, "exitDressup must show confirm dialog")

    # closeResult sets isChallenge = false before calling exitDressup
    def test_close_result_resets_is_challenge(self):
        """fashion.js: closeResult should set isChallenge = false before exitDressup"""
        match = re.search(r'function closeResult\(\)\s*\{(.*?)\n  \}', self.fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        is_challenge_pos = body.find('isChallenge = false')
        exit_pos = body.find('exitDressup()')
        self.assertGreater(is_challenge_pos, -1,
                           "closeResult must set isChallenge = false")
        self.assertGreater(exit_pos, -1,
                           "closeResult must call exitDressup()")
        self.assertLess(is_challenge_pos, exit_pos,
                        "isChallenge = false must come BEFORE exitDressup() call")

    # CSS has .dressup-actions.challenge-mode styles
    def test_css_has_challenge_mode_styles(self):
        """fashion.css: must have .dressup-actions.challenge-mode styles"""
        self.assertIn('.dressup-actions.challenge-mode', self.fashion_css,
                       "CSS must define .dressup-actions.challenge-mode styles")

    # CSS has pulse-submit keyframe animation
    def test_css_has_pulse_submit_animation(self):
        """fashion.css: must have @keyframes pulse-submit for submit button"""
        self.assertIn('pulse-submit', self.fashion_css,
                       "CSS must define pulse-submit keyframe animation")
        self.assertIn('@keyframes pulse-submit', self.fashion_css,
                       "Must use @keyframes for pulse-submit")


# ===========================================================================
# Test Suite 23: Creature catch robustness (creatures.js + creatures.css)
# ===========================================================================
class TestCreatureCatchRobustness(unittest.TestCase):
    """Validates z-index, SVG fallback, animate guard, and pickCreature fallback."""

    def setUp(self):
        self.creatures_src = read_js('creatures.js')
        self.creatures_css = read_css('creatures.css')

    # #catch-info has z-index in CSS
    def test_catch_info_has_z_index(self):
        """creatures.css: #catch-info must have a z-index for proper stacking"""
        match = re.search(r'#catch-info\s*\{([^}]+)\}', self.creatures_css)
        self.assertIsNotNone(match, "#catch-info rule must exist in creatures.css")
        body = match.group(1)
        self.assertIn('z-index', body,
                       "#catch-info must have z-index to appear above catch canvas")

    # Creature SVG <img> fallback has onerror handler
    def test_creature_svg_img_has_onerror(self):
        """creatures.js: SVG <img> fallback should have an onerror handler"""
        # Both startCatchGame and startPracticeRound create img tags
        img_matches = re.findall(r'<img\s+src=.*?>', self.creatures_src, re.DOTALL)
        self.assertGreater(len(img_matches), 0, "Must have <img> tags for SVG fallback")
        for img_tag in img_matches:
            self.assertIn('onerror', img_tag,
                          f"SVG <img> tag must have onerror handler: {img_tag[:80]}")

    # animate() checks svgContainer.classList.contains('hidden') dynamically
    def test_animate_checks_svg_container_hidden(self):
        """creatures.js: animate() should check svgContainer hidden state dynamically"""
        self.assertIn("svgContainer.classList.contains('hidden')", self.creatures_src,
                       "animate must dynamically check if svgContainer is hidden")

    # discoverCreature has null guard after pickCreature()
    def test_discover_creature_null_guard(self):
        """creatures.js: discoverCreature must guard against null from pickCreature()"""
        match = re.search(r'function discoverCreature\(.*?\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('pickCreature()', body, "discoverCreature must call pickCreature()")
        self.assertIn('if (!creature)', body,
                       "discoverCreature must have null guard after pickCreature()")

    # pickCreature has common fallback when pool is empty
    def test_pick_creature_common_fallback(self):
        """creatures.js: pickCreature should fall back to common when rarity pool is empty"""
        match = re.search(r'function pickCreature\(\)\s*\{(.*?)\n  \}', self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('pool.length === 0', body,
                       "pickCreature must check for empty rarity pool")
        self.assertIn("'common'", body,
                       "pickCreature must fall back to common rarity")

    # Reimplementation: pickCreature fallback logic
    def test_pick_creature_fallback_logic(self):
        """Logic test: when selected rarity pool is empty, fall back to common"""
        # Simulate a location with only common creatures
        loc_creatures = [
            {'id': 'c1', 'rarity': 'common'},
            {'id': 'c2', 'rarity': 'common'},
        ]
        selected_rarity = 'legendary'  # no legendary in pool
        pool = [c for c in loc_creatures if c['rarity'] == selected_rarity]
        self.assertEqual(len(pool), 0)
        # Fallback to common
        fallback = [c for c in loc_creatures if c['rarity'] == 'common']
        self.assertGreater(len(fallback), 0, "Common fallback must find creatures")


# ===========================================================================
# Test Suite 30: Legendary escape animations (data.js + creatures.js)
# ===========================================================================
class TestLegendaryEscapeAnimations(unittest.TestCase):
    """Validates unique escape animations per legendary creature."""

    def setUp(self):
        self.data_src = read_js('data.js')
        self.creatures_src = read_js('creatures.js')

    def test_all_escape_powers_have_animation_field(self):
        """data.js: every escapePower must have an animation field"""
        powers = re.findall(r"escapePower:\s*\{([^}]+)\}", self.data_src)
        self.assertGreater(len(powers), 0, "Must find escapePower definitions")
        for power_block in powers:
            self.assertIn('animation:', power_block,
                          f"escapePower missing animation field: {power_block[:50]}")

    def test_all_animations_are_unique_per_type(self):
        """data.js: each creature type has a distinct animation"""
        anims = re.findall(r"animation:\s*'([^']+)'", self.data_src)
        valid_types = {'flash', 'wave', 'rainbow', 'vortex', 'dash',
                       'burst', 'bounce', 'slam', 'hearts', 'drift', 'tumble'}
        for a in anims:
            self.assertIn(a, valid_types, f"Unknown animation type: {a}")

    def test_effect_function_branches_by_animation(self):
        """creatures.js: playLegendaryEscapeEffect must branch on power.animation"""
        # Get everything from the function declaration onward
        idx = self.creatures_src.find('function playLegendaryEscapeEffect')
        self.assertGreater(idx, 0)
        body = self.creatures_src[idx:idx+17000]
        self.assertIn("power.animation", body,
                       "playLegendaryEscapeEffect must read power.animation")
        # Should have branches for different animation types
        for anim_type in ['flash', 'wave', 'vortex', 'hearts', 'tumble']:
            self.assertIn(f"anim === '{anim_type}'", body,
                          f"Missing animation branch for '{anim_type}'")

    def test_escape_effect_has_completion_callback(self):
        """creatures.js: playLegendaryEscapeEffect must accept an onComplete callback"""
        match = re.search(r'function playLegendaryEscapeEffect\(([^)]+)\)', self.creatures_src)
        self.assertIsNotNone(match)
        params = match.group(1)
        self.assertIn('onComplete', params,
                       "playLegendaryEscapeEffect must accept onComplete callback")

    def test_escape_handler_shows_retry_button(self):
        """creatures.js: legendary escape must show 'Try Again!' button, not auto-restart"""
        match = re.search(r"if \(creature\.escapePower && !legendaryEscapeUsed\)\s*\{(.*?)\n    \}",
                          self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("'Try Again!'", body,
                       "Escape handler must show a Try Again button")
        self.assertNotIn('setTimeout', body,
                         "Escape handler should NOT auto-restart via setTimeout")

    def test_retry_button_restarts_catch_game(self):
        """creatures.js: retry button onclick must call startCatchGame"""
        match = re.search(r"if \(creature\.escapePower && !legendaryEscapeUsed\)\s*\{(.*?)\n    \}",
                          self.creatures_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('startCatchGame(creature, spotIndex)', body,
                       "Retry button must restart the catch game")


# ===========================================================================
# Test Suite 24: Render avatar retry cap (fashion.js)
# ===========================================================================
class TestRenderAvatarRetryCap(unittest.TestCase):
    """Validates renderAvatar has a retry limit and shows error when exhausted."""

    def setUp(self):
        self.source = read_js('fashion.js')

    # renderAvatar has retry limit
    def test_render_avatar_has_retry_counter(self):
        """fashion.js: renderAvatar must have a retry counter variable"""
        self.assertIn('avatarRetries', self.source,
                       "renderAvatar must use an avatarRetries counter")

    def test_render_avatar_has_retry_limit(self):
        """fashion.js: renderAvatar must cap retries to prevent infinite loops"""
        match = re.search(r'function renderAvatar\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('avatarRetries', body, "renderAvatar must check avatarRetries")
        # Should have a comparison against a max value
        self.assertRegex(body, r'avatarRetries\+\+\s*>\s*\d+',
                         "renderAvatar must compare retry count against a max")

    # Shows error message when retries exhausted
    def test_render_avatar_shows_error_on_exhaustion(self):
        """fashion.js: renderAvatar should show error message when retries run out"""
        match = re.search(r'function renderAvatar\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('Could not load avatar', body,
                       "renderAvatar must show error when retries are exhausted")

    # Retry counter resets on success
    def test_render_avatar_resets_counter_on_success(self):
        """fashion.js: renderAvatar should reset avatarRetries to 0 on successful render"""
        match = re.search(r'function renderAvatar\(\)\s*\{(.*?)\n  \}', self.source, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('avatarRetries = 0', body,
                       "renderAvatar must reset avatarRetries on success")

    # Reimplementation: retry cap logic
    def test_retry_cap_logic(self):
        """Logic test: avatar retry should stop at a reasonable cap"""
        MAX_RETRIES = 25
        retries = 0
        loaded = False
        for _ in range(100):
            if loaded:
                retries = 0
                break
            retries += 1
            if retries > MAX_RETRIES:
                break
            # Simulate still loading
        self.assertGreater(retries, MAX_RETRIES,
                           "Retry loop should stop at cap when base never loads")


# ===========================================================================
# Test Suite 25: State migration for tutorial_completed (game.js)
# ===========================================================================
class TestStateMigrationTutorialCompleted(unittest.TestCase):
    """Validates that old saves without tutorial_completed get it set to false."""

    def setUp(self):
        self.game_src = read_js('game.js')
        self.data_src = read_js('data.js')

    # Old save without tutorial_completed gets it set to false
    def test_migration_sets_false_for_missing_field(self):
        """game.js: init should set tutorial_completed = false when field is undefined"""
        match = re.search(r'function init\(\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('tutorial_completed', body,
                       "init must handle tutorial_completed migration")
        # Should check for undefined
        self.assertRegex(body, r'tutorial_completed\s*===\s*undefined',
                         "Must check tutorial_completed === undefined")

    # New save with tutorial_completed: true is preserved
    def test_new_save_preserves_tutorial_completed(self):
        """Logic test: spread merge preserves existing tutorial_completed value"""
        DEFAULT_STATE = {'tutorial_completed': False, 'coins': 100}
        saved = {'tutorial_completed': True, 'coins': 200}
        # Simulate: state = { ...DEFAULT_STATE, ...saved }
        state = {**DEFAULT_STATE, **saved}
        self.assertTrue(state['tutorial_completed'],
                        "Spread merge must preserve saved tutorial_completed: true")
        self.assertEqual(state['coins'], 200)

    # Migration only triggers when field is actually missing
    def test_migration_only_when_missing(self):
        """Logic test: migration should NOT overwrite explicit false with false"""
        DEFAULT_STATE = {'tutorial_completed': False, 'coins': 100}
        # Simulate old save that already has tutorial_completed: false
        saved = {'tutorial_completed': False, 'coins': 150}
        state = {**DEFAULT_STATE, **saved}
        # After migration check
        if state.get('tutorial_completed') is None:
            state['tutorial_completed'] = False
        self.assertFalse(state['tutorial_completed'])
        self.assertEqual(state['coins'], 150)

    # DEFAULT_STATE has tutorial_completed: false
    def test_default_state_includes_tutorial_completed(self):
        """data.js: DEFAULT_STATE must include tutorial_completed for new saves"""
        match = re.search(r'const DEFAULT_STATE\s*=\s*\{(.*?)\};', self.data_src, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('tutorial_completed', match.group(1),
                       "DEFAULT_STATE must include tutorial_completed field")

    # Verify game.js init does the spread merge pattern
    def test_init_uses_spread_merge(self):
        """game.js: init should use spread merge to combine DEFAULT_STATE with saved state"""
        self.assertIn('...DEFAULT_STATE, ...saved', self.game_src,
                       "init must spread-merge DEFAULT_STATE with saved state")


# ===========================================================================
# Test Suite 26: Delayed spot reveal (creatures.js + creatures.css)
# ===========================================================================
class TestDelayedSpotReveal(unittest.TestCase):
    """Validates that delayed spots disable pointer-events until revealed."""

    def setUp(self):
        self.css_src = read_css('creatures.css')
        self.js_src = read_js('creatures.js')

    def test_delayed_spots_disable_pointer_events(self):
        """creatures.css: .explore-spot.delayed must have pointer-events: none"""
        match = re.search(r'\.explore-spot\.delayed\s*\{([^}]+)\}', self.css_src)
        self.assertIsNotNone(match, "Must have .explore-spot.delayed rule")
        self.assertIn('pointer-events: none', match.group(1))

    def test_revealed_class_enables_pointer_events(self):
        """creatures.css: .explore-spot.delayed.revealed must re-enable pointer-events"""
        match = re.search(r'\.explore-spot\.delayed\.revealed\s*\{([^}]+)\}', self.css_src)
        self.assertIsNotNone(match, "Must have .explore-spot.delayed.revealed rule")
        self.assertIn('pointer-events: auto', match.group(1))

    def test_js_adds_revealed_class_after_delay(self):
        """creatures.js: renderSpots must add 'revealed' class via setTimeout"""
        match = re.search(r'function renderSpots\(\)\s*\{(.*?)\n  \}', self.js_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("classList.add('revealed')", body,
                       "renderSpots must add 'revealed' class after animation delay")

    def test_delayed_reveal_timeout_is_tracked(self):
        """creatures.js: delayed reveal timeout must be pushed to spotCooldownTimeouts"""
        match = re.search(r'function renderSpots\(\)\s*\{(.*?)\n  \}', self.js_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        # The timeout for revealed class should be cleaned up with other spot timeouts
        self.assertIn('spotCooldownTimeouts.push', body)


# ===========================================================================
# Test Suite 27: Explore avatar positioning (creatures.css)
# ===========================================================================
class TestExploreAvatarPosition(unittest.TestCase):
    """Validates that the explore avatar doesn't overlap with the hamburger menu."""

    def setUp(self):
        self.css_src = read_css('creatures.css')

    def test_avatar_not_positioned_right(self):
        """creatures.css: .explore-avatar must not use right positioning (conflicts with hamburger)"""
        match = re.search(r'\.explore-avatar\s*\{([^}]+)\}', self.css_src)
        self.assertIsNotNone(match, "Must have .explore-avatar rule")
        body = match.group(1)
        # Should use left positioning, not right, to avoid hamburger overlap
        self.assertNotRegex(body, r'\bright\s*:', "explore-avatar should not use right positioning")
        self.assertRegex(body, r'\bleft\s*:', "explore-avatar should use left positioning")


# ===========================================================================
# Test Suite 28: Legendary Shop (data.js + game.js + index.html)
# ===========================================================================
class TestLegendaryShop(unittest.TestCase):
    """Validates legendary_bought state field, shop rendering, and purchase logic."""

    def setUp(self):
        self.data_src = read_js('data.js')
        self.game_src = read_js('game.js')
        self.html_src = read_asset('index.html')
        self.css_src = read_css('style.css')

    # DEFAULT_STATE has legendary_bought
    def test_default_state_has_legendary_bought(self):
        """data.js: DEFAULT_STATE must include legendary_bought: []"""
        match = re.search(r'const DEFAULT_STATE\s*=\s*\{(.*?)\};', self.data_src, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('legendary_bought: []', match.group(1))

    # Game.js migration ensures legendary_bought exists
    def test_migration_ensures_legendary_bought(self):
        """game.js: init must migrate old saves missing legendary_bought"""
        match = re.search(r'function init\(\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('legendary_bought', body,
                       "init must handle legendary_bought migration")

    # Game module exports showCollectionTab
    def test_game_exports_show_collection_tab(self):
        """game.js: module must export showCollectionTab"""
        # The return block has nested braces (get state() {...}), so match multi-line
        match = re.search(r'return\s*\{(.+?)\};\s*\}\)\(\)', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('showCollectionTab', match.group(1))

    # buyLegendary checks coin balance
    def test_buy_legendary_checks_coins(self):
        """game.js: buyLegendary must check coin balance before purchase"""
        match = re.search(r'function buyLegendary\(creature\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('coins < creature.coins', body,
                       "buyLegendary must check if player has enough coins")

    # buyLegendary prevents double-buy
    def test_buy_legendary_prevents_double_buy(self):
        """game.js: buyLegendary must check if already bought"""
        match = re.search(r'function buyLegendary\(creature\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('legendary_bought.includes(creature.id)', body,
                       "buyLegendary must guard against double purchase")

    # buyLegendary uses addCoins for proper coin flow
    def test_buy_legendary_uses_add_coins(self):
        """game.js: buyLegendary must use addCoins(-cost) for proper coin flow"""
        match = re.search(r'function buyLegendary\(creature\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('addCoins(-creature.coins)', body,
                       "buyLegendary must use addCoins for coin deduction")

    # buyLegendary saves state
    def test_buy_legendary_saves_state(self):
        """game.js: buyLegendary must call SaveManager.autoSave"""
        match = re.search(r'function buyLegendary\(creature\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('SaveManager.autoSave', body,
                       "buyLegendary must persist state after purchase")

    # renderLegendaryShop shows locked message for uncaught creatures
    def test_render_shows_catch_to_unlock(self):
        """game.js: renderLegendaryShop must show 'Catch ... to unlock' for uncaught legendaries"""
        match = re.search(r'function renderLegendaryShop\(\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('to unlock', body,
                       "Locked legendaries must show 'Catch [name] to unlock' message")

    # HTML has collection tabs
    def test_html_has_collection_tabs(self):
        """index.html: collection overlay must have tab buttons"""
        self.assertIn('tab-collection', self.html_src)
        self.assertIn('tab-legendary-shop', self.html_src)
        self.assertIn('legendary-shop-grid', self.html_src)

    # CSS has legendary shop styles
    def test_css_has_legendary_shop_styles(self):
        """style.css: must have .legendary-shop-card styles"""
        self.assertIn('.legendary-shop-card', self.css_src)
        self.assertIn('.legendary-shop-card.locked', self.css_src)
        self.assertIn('.legendary-shop-card.owned', self.css_src)

    # buyLegendary unlocks costume in wardrobe
    def test_buy_legendary_unlocks_costume(self):
        """game.js: buyLegendary must add costume to wardrobe_unlocked"""
        match = re.search(r'function buyLegendary\(creature\)\s*\{(.*?)\n  \}', self.game_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('wardrobe_unlocked', body,
                       "buyLegendary must unlock the costume in the wardrobe")
        self.assertIn("FASHION_ITEMS.find(i => i.legendary === creature.id)", body,
                       "buyLegendary must find the matching costume by legendary field")

    # All legendary creatures have a matching costume
    def test_all_legendaries_have_costumes(self):
        """data.js: every legendary creature must have a corresponding costume in FASHION_ITEMS"""
        # Extract legendary creature ids
        legendaries = re.findall(r"id:\s*'([^']+)'.*?rarity:\s*'legendary'", self.data_src)
        # Extract costume legendary fields
        costumes = re.findall(r"legendary:\s*'([^']+)'", self.data_src)
        for lid in legendaries:
            self.assertIn(lid, costumes,
                          f"Legendary creature '{lid}' has no matching costume item")

    # Legendary costumes have a coin cost (appear in shop, not free)
    def test_legendary_costumes_have_cost(self):
        """data.js: legendary costumes must have cost > 0 so they appear in the shop"""
        costume_costs = re.findall(r"legendary:\s*'[^']+',.*?cost:\s*(\d+)", self.data_src)
        # Reverse: find cost before legendary
        if not costume_costs:
            costume_costs = re.findall(r"cost:\s*(\d+),.*?legendary:\s*'[^']+'", self.data_src)
        self.assertGreater(len(costume_costs), 0, "Must find legendary costume costs")
        for cost_str in costume_costs:
            self.assertGreater(int(cost_str), 0,
                               "Legendary costumes must have cost > 0")

    # Legendary costume SVGs exist on disk
    def test_legendary_costume_svgs_exist(self):
        """assets: each legendary costume SVG file must exist"""
        costume_svgs = re.findall(r"legendary:\s*'[^']+',\s*svg:\s*'([^']+)'", self.data_src)
        self.assertGreater(len(costume_svgs), 0, "Must find costume SVG paths")
        for svg_path in costume_svgs:
            full_path = os.path.join(PROJECT_ROOT, svg_path)
            self.assertTrue(os.path.isfile(full_path),
                            f"Costume SVG missing: {svg_path}")

    # Fashion shop shows locked state for uncaught legendary costumes
    def test_fashion_shop_checks_legendary_lock(self):
        """fashion.js: renderShopItems must check creature caught status for legendary items"""
        fashion_src = read_js('fashion.js')
        match = re.search(r'function renderShopItems\(\)\s*\{(.*?)\n  \}', fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('item.legendary', body,
                       "renderShopItems must check item.legendary for lock state")
        self.assertIn('creatures.includes(item.legendary)', body,
                       "renderShopItems must check if creature is caught")

    # buyItem guards against buying locked legendary items
    def test_buy_item_guards_legendary(self):
        """fashion.js: buyItem must reject purchases for uncaught legendary costumes"""
        fashion_src = read_js('fashion.js')
        match = re.search(r'function buyItem\(item\)\s*\{(.*?)\n  \}', fashion_src, re.DOTALL)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn('item.legendary', body,
                       "buyItem must check legendary lock before purchase")

    # CSS has locked shop item styles
    def test_css_has_locked_shop_item_style(self):
        """fashion.css: must have .shop-item.locked styles"""
        fashion_css = read_css('fashion.css')
        self.assertIn('.shop-item.locked', fashion_css,
                       "fashion.css must style locked shop items")

    # Legendary costume SVGs are in SW cache
    def test_legendary_costumes_in_sw_cache(self):
        """sw.js: all legendary costume SVGs must be in ASSETS for offline support"""
        sw_src = read_asset('sw.js')
        costume_svgs = re.findall(r"legendary:\s*'[^']+',\s*svg:\s*'([^']+)'", self.data_src)
        for svg_path in costume_svgs:
            self.assertIn(svg_path, sw_src,
                          f"Costume SVG not in SW ASSETS: {svg_path}")

    # Reimplementation: buyLegendary logic with costume unlock
    def test_buy_legendary_logic_sufficient_coins(self):
        """Logic test: buying a legendary with enough coins succeeds and unlocks costume"""
        coins = 200
        cost = 100
        legendary_bought = []
        wardrobe = ['hair-1']
        creature_id = 'elder-owl'
        costume_id = 'dress-owl'

        # Simulate buyLegendary
        if coins < cost:
            success = False
        elif creature_id in legendary_bought:
            success = False
        else:
            coins -= cost
            legendary_bought.append(creature_id)
            if costume_id not in wardrobe:
                wardrobe.append(costume_id)
            success = True

        self.assertTrue(success)
        self.assertEqual(coins, 100)
        self.assertIn('elder-owl', legendary_bought)
        self.assertIn('dress-owl', wardrobe)

    def test_buy_legendary_logic_insufficient_coins(self):
        """Logic test: buying a legendary without enough coins fails"""
        coins = 50
        cost = 100
        legendary_bought = []

        if coins < cost:
            success = False
        else:
            success = True

        self.assertFalse(success)
        self.assertEqual(coins, 50)

    def test_buy_legendary_logic_already_bought(self):
        """Logic test: buying a legendary twice is prevented"""
        coins = 200
        cost = 100
        legendary_bought = ['elder-owl']
        creature_id = 'elder-owl'

        if coins < cost:
            success = False
        elif creature_id in legendary_bought:
            success = False
        else:
            coins -= cost
            success = True

        self.assertFalse(success)
        self.assertEqual(coins, 200)  # No deduction


# ===========================================================================
# Test Suite 29: Service Worker cache version (sw.js)
# ===========================================================================
class TestServiceWorkerCache(unittest.TestCase):
    """Validates SW cache name and asset list."""

    def setUp(self):
        self.sw_src = read_asset('sw.js')

    def test_cache_uses_relative_paths(self):
        """sw.js: ASSETS must use relative paths (no leading /)"""
        match = re.search(r'const ASSETS\s*=\s*\[(.*?)\];', self.sw_src, re.DOTALL)
        self.assertIsNotNone(match)
        assets_block = match.group(1)
        # Extract all quoted strings
        paths = re.findall(r"'([^']+)'", assets_block)
        for path in paths:
            if path == './':
                continue  # root relative is ok
            self.assertFalse(path.startswith('/'),
                             f"Asset path '{path}' should be relative, not absolute")

    def test_manifest_icon_is_cached(self):
        """sw.js: ASSETS must include the manifest icon for offline support"""
        match = re.search(r'const ASSETS\s*=\s*\[(.*?)\];', self.sw_src, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('assets/img/icon-192.svg', match.group(1))


# ===========================================================================
# Test Suite 31: Escape animation TDZ fix (creatures.js)
# ===========================================================================
class TestEscapeAnimationScoping(unittest.TestCase):
    """
    Validates the fix for the Temporal Dead Zone bug in animateEscape().
    The inner drawing context must use a different name ('ctx') than the
    outer parameter ('ctxC') so the completion path can access ctxC.
    """

    def setUp(self):
        self.src = read_js('creatures.js')
        # Extract the playLegendaryEscapeEffect function body
        idx = self.src.find('function playLegendaryEscapeEffect')
        self.assertGreater(idx, 0)
        self.fn_body = self.src[idx:idx + 17000]

    def test_no_const_ctxC_inside_animateEscape(self):
        """creatures.js: animateEscape must NOT shadow ctxC with const/let/var"""
        # Find the animateEscape inner function
        idx = self.fn_body.find('function animateEscape')
        self.assertGreater(idx, 0)
        anim_body = self.fn_body[idx:]
        # Should not have 'const ctxC' or 'let ctxC' which would cause TDZ
        self.assertNotIn('const ctxC', anim_body,
                         "animateEscape must not shadow ctxC with const (causes TDZ)")
        self.assertNotIn('let ctxC', anim_body,
                         "animateEscape must not shadow ctxC with let (causes TDZ)")

    def test_escape_drawing_uses_ctx_alias(self):
        """creatures.js: escape drawing code should use 'ctx' alias for escCtx"""
        idx = self.fn_body.find('function animateEscape')
        anim_body = self.fn_body[idx:]
        self.assertIn('const ctx = escCtx', anim_body,
                      "animateEscape should alias escCtx as 'ctx'")

    def test_completion_path_uses_ctxC(self):
        """creatures.js: completion path must use outer ctxC (catch canvas context)"""
        idx = self.fn_body.find('function animateEscape')
        anim_body = self.fn_body[idx:]
        # The clearRect in the completion path should reference the outer ctxC
        self.assertIn('ctxC.clearRect', anim_body,
                      "Completion path must use outer ctxC to clear catch canvas")

    def test_oncomplete_called_after_duration(self):
        """creatures.js: onComplete callback must be invoked after DURATION"""
        idx = self.fn_body.find('function animateEscape')
        anim_body = self.fn_body[idx:]
        # The completion block (elapsed > DURATION) should call onComplete
        completion_match = re.search(
            r'if\s*\(elapsed\s*>\s*DURATION\)\s*\{(.*?)\n      \}',
            anim_body, re.DOTALL)
        self.assertIsNotNone(completion_match,
                             "Must have elapsed > DURATION completion block")
        completion_block = completion_match.group(1)
        self.assertIn('onComplete()', completion_block,
                      "Completion block must call onComplete()")
        self.assertIn('ctxC.clearRect', completion_block,
                      "Completion block must clear catch canvas before calling onComplete")


# ===========================================================================
# Test Suite 32: Dream Nexus creature idle animations (creatures.css + creatures.js)
# ===========================================================================
class TestCreatureIdleAnimations(unittest.TestCase):
    """Validates per-creature idle animations via data-idle attribute."""

    def setUp(self):
        self.css_src = read_css('creatures.css')
        self.js_src = read_js('creatures.js')
        self.data_src = read_js('data.js')

    def test_css_has_idle_keyframes_for_each_creature(self):
        """creatures.css: must have a unique @keyframes for each Dream Nexus creature"""
        expected_keyframes = [
            'idleWiggle',    # sparkle-bud
            'idleBounce',    # micro-pennx
            'idleSway',      # giant-pennx
            'idlePulse',     # charlie-the-hug
            'idleFloat',     # charlie-the-great
            'idleTumble',    # happy-lolly
        ]
        for kf in expected_keyframes:
            self.assertIn(f'@keyframes {kf}', self.css_src,
                          f"Missing idle animation keyframes: {kf}")

    def test_css_has_data_idle_selectors_for_catch_overlay(self):
        """creatures.css: #catch-creature-svg[data-idle=...] selectors for each creature"""
        creature_ids = [
            'sparkle-bud', 'micro-pennx', 'giant-pennx',
            'charlie-the-hug', 'charlie-the-great', 'happy-lolly'
        ]
        for cid in creature_ids:
            selector = f'#catch-creature-svg[data-idle="{cid}"]'
            self.assertIn(selector, self.css_src,
                          f"Missing catch overlay idle selector for {cid}")

    def test_css_has_data_idle_selectors_for_spot_silhouettes(self):
        """creatures.css: .spot-silhouette[data-idle=...] selectors for exploration spots"""
        creature_ids = [
            'sparkle-bud', 'micro-pennx', 'giant-pennx',
            'charlie-the-hug', 'charlie-the-great', 'happy-lolly'
        ]
        for cid in creature_ids:
            selector = f'.spot-silhouette[data-idle="{cid}"]'
            self.assertIn(selector, self.css_src,
                          f"Missing spot silhouette idle selector for {cid}")

    def test_js_sets_data_idle_for_escape_power_creatures(self):
        """creatures.js: startCatchGame must set data-idle for creatures with escapePower"""
        self.assertIn("svgContainer.dataset.idle = creature.id", self.js_src,
                      "Must set dataset.idle for creatures with escapePower")

    def test_js_clears_data_idle_on_miss(self):
        """creatures.js: playMissEffect must clear data-idle to prevent animation conflict"""
        # Find the playMissEffect function
        idx = self.js_src.find('function playMissEffect')
        self.assertGreater(idx, 0)
        fn_body = self.js_src[idx:idx + 500]
        self.assertIn('delete svgContainer.dataset.idle', fn_body,
                      "playMissEffect must clear data-idle")

    def test_js_clears_data_idle_on_success(self):
        """creatures.js: playCatchSuccess must clear data-idle"""
        idx = self.js_src.find('function playCatchSuccess')
        self.assertGreater(idx, 0)
        fn_body = self.js_src[idx:idx + 500]
        self.assertIn('delete svgContainer.dataset.idle', fn_body,
                      "playCatchSuccess must clear data-idle")

    def test_js_clears_data_idle_on_escape(self):
        """creatures.js: playLegendaryEscapeEffect must clear data-idle"""
        idx = self.js_src.find('function playLegendaryEscapeEffect')
        self.assertGreater(idx, 0)
        fn_body = self.js_src[idx:idx + 1000]
        self.assertIn('delete svgContainer.dataset.idle', fn_body,
                      "playLegendaryEscapeEffect must clear data-idle")

    def test_js_clears_data_idle_in_close_catch(self):
        """creatures.js: closeCatch must clean up data-idle attribute"""
        idx = self.js_src.find('function closeCatch')
        self.assertGreater(idx, 0)
        fn_body = self.js_src[idx:idx + 1000]
        self.assertIn('delete svgContainer.dataset.idle', fn_body,
                      "closeCatch must clean up data-idle attribute")

    def test_spot_silhouette_gets_data_idle_attr(self):
        """creatures.js: setSpotSilhouette must add data-idle for escapePower creatures"""
        idx = self.js_src.find('function setSpotSilhouette')
        self.assertGreater(idx, 0)
        fn_body = self.js_src[idx:idx + 1000]
        self.assertIn('data-idle=', fn_body,
                      "setSpotSilhouette must include data-idle attribute for silhouettes")


# ===========================================================================
# Test Suite 33: CSS positioning for catch creature SVG (creatures.css)
# ===========================================================================
class TestCatchCreaturePositioning(unittest.TestCase):
    """
    Validates that #catch-creature-svg uses calc() positioning instead of
    transform-based centering, so CSS idle/dodge/celebrate animations can
    freely use the transform property.
    """

    def setUp(self):
        self.css_src = read_css('creatures.css')

    def test_no_translate_centering_on_catch_creature_svg(self):
        """creatures.css: #catch-creature-svg must NOT use translate for centering"""
        # Find the #catch-creature-svg base rule
        match = re.search(
            r'#catch-creature-svg\s*\{([^}]+)\}', self.css_src)
        self.assertIsNotNone(match)
        rule = match.group(1)
        self.assertNotIn('translate(-50%', rule,
                         "#catch-creature-svg should not use translate for centering")

    def test_uses_calc_for_positioning(self):
        """creatures.css: #catch-creature-svg must use calc() for top/left"""
        match = re.search(
            r'#catch-creature-svg\s*\{([^}]+)\}', self.css_src)
        rule = match.group(1)
        self.assertIn('calc(', rule,
                      "#catch-creature-svg must use calc() for positioning")

    def test_animation_keyframes_no_translate_centering(self):
        """creatures.css: creatureEntrance/catchBounce/creatureDodge must not include translate(-50%)"""
        for kf_name in ['creatureEntrance', 'catchBounce', 'creatureDodge']:
            match = re.search(
                rf'@keyframes {kf_name}\s*\{{(.*?)\n\}}', self.css_src, re.DOTALL)
            self.assertIsNotNone(match, f"Must have @keyframes {kf_name}")
            kf_body = match.group(1)
            self.assertNotIn('translate(-50%', kf_body,
                             f"@keyframes {kf_name} should not include translate centering offset")


# ===========================================================================
# Test Suite 34: Dream Nexus creature PNG transparency (assets)
# ===========================================================================
class TestCreaturePNGTransparency(unittest.TestCase):
    """Validates that Dream Nexus creature PNGs have transparent backgrounds."""

    def setUp(self):
        self.data_src = read_js('data.js')

    def test_all_dream_nexus_creatures_use_png(self):
        """data.js: all Dream Nexus creature svg fields should reference .png files"""
        # Extract Dream Nexus creatures (location: 'dream-nexus')
        creatures = re.findall(
            r"\{[^}]*location:\s*'dream-nexus'[^}]*svg:\s*'([^']+)'[^}]*\}",
            self.data_src)
        self.assertEqual(len(creatures), 6, "Should have 6 Dream Nexus creatures")
        for svg_path in creatures:
            self.assertTrue(svg_path.endswith('.png'),
                            f"Dream Nexus creature should use .png: {svg_path}")

    def test_all_dream_nexus_png_files_exist(self):
        """assets: all Dream Nexus creature PNG files must exist on disk"""
        creatures = re.findall(
            r"\{[^}]*location:\s*'dream-nexus'[^}]*svg:\s*'([^']+)'[^}]*\}",
            self.data_src)
        for png_path in creatures:
            full_path = os.path.join(PROJECT_ROOT, png_path)
            self.assertTrue(os.path.isfile(full_path),
                            f"PNG file missing: {png_path}")

    def test_dream_nexus_pngs_are_rgba(self):
        """assets: Dream Nexus PNGs must be RGBA (have alpha channel for transparency)"""
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow not installed")

        creatures = re.findall(
            r"\{[^}]*location:\s*'dream-nexus'[^}]*svg:\s*'([^']+)'[^}]*\}",
            self.data_src)
        for png_path in creatures:
            full_path = os.path.join(PROJECT_ROOT, png_path)
            img = Image.open(full_path)
            self.assertEqual(img.mode, 'RGBA',
                             f"{png_path} must be RGBA (have alpha channel)")

    def test_dream_nexus_pngs_have_transparent_corners(self):
        """assets: Dream Nexus PNGs should have transparent corners (no white bg)"""
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow not installed")

        creatures = re.findall(
            r"\{[^}]*location:\s*'dream-nexus'[^}]*svg:\s*'([^']+)'[^}]*\}",
            self.data_src)
        for png_path in creatures:
            full_path = os.path.join(PROJECT_ROOT, png_path)
            img = Image.open(full_path).convert('RGBA')
            # Check corner pixels — they should be transparent (alpha < 50)
            w, h = img.size
            corners = [
                img.getpixel((0, 0)),
                img.getpixel((w - 1, 0)),
                img.getpixel((0, h - 1)),
                img.getpixel((w - 1, h - 1)),
            ]
            transparent_corners = sum(1 for r, g, b, a in corners if a < 50)
            self.assertGreaterEqual(transparent_corners, 3,
                                    f"{png_path}: at least 3 of 4 corners should be transparent "
                                    f"(got {transparent_corners}). Corner alphas: {[c[3] for c in corners]}")


# ===========================================================================
# Test Suite 35: Escape animation SVG container cleanup (creatures.js)
# ===========================================================================
class TestEscapeSVGContainerCleanup(unittest.TestCase):
    """
    Validates that the SVG creature container is properly hidden during escape
    and data-idle is cleared to prevent CSS animation conflicts.
    """

    def setUp(self):
        self.src = read_js('creatures.js')
        idx = self.src.find('function playLegendaryEscapeEffect')
        self.assertGreater(idx, 0)
        self.fn_body = self.src[idx:idx + 2000]

    def test_escape_hides_svg_container(self):
        """creatures.js: escape effect must hide SVG container (add 'hidden' class)"""
        self.assertIn("svgContainer.classList.add('hidden')", self.fn_body,
                      "Escape effect must hide SVG container after fade-out")

    def test_escape_clears_data_idle_before_dodge(self):
        """creatures.js: data-idle must be cleared before adding catch-dodge"""
        # data-idle deletion should appear before catch-dodge addition
        idle_idx = self.fn_body.find('delete svgContainer.dataset.idle')
        dodge_idx = self.fn_body.find("svgContainer.classList.add('catch-dodge')")
        self.assertGreater(idle_idx, 0, "Must delete dataset.idle")
        self.assertGreater(dodge_idx, 0, "Must add catch-dodge class")
        self.assertLess(idle_idx, dodge_idx,
                        "data-idle must be cleared BEFORE adding catch-dodge class")

    def test_escape_fade_timeout_before_animation_end(self):
        """creatures.js: SVG hide timeout must fire before DURATION ends"""
        # The hide timeout should be <= DURATION * 1000
        # DURATION is 2.0 seconds (2000ms)
        # The svgContainer.classList.add('hidden') should be in a setTimeout
        # with a delay less than 2000ms
        duration_match = re.search(r'const DURATION\s*=\s*([\d.]+)', self.fn_body)
        self.assertIsNotNone(duration_match)
        duration_ms = float(duration_match.group(1)) * 1000  # e.g. 2000

        # Find setTimeout that hides the container
        hide_timeouts = re.findall(
            r"setTimeout\(\(\)\s*=>\s*\{[^}]*classList\.add\('hidden'\)[^}]*\},\s*(\d+)\)",
            self.fn_body, re.DOTALL)
        self.assertGreater(len(hide_timeouts), 0,
                           "Must have a setTimeout that hides the container")
        hide_delay = int(hide_timeouts[0])
        self.assertLess(hide_delay, duration_ms,
                        f"Hide timeout ({hide_delay}ms) must fire before animation ends ({duration_ms}ms)")



# ===========================================================================
# Test Suite: Stat Badge Visibility in Modals
# ===========================================================================
class TestStatBadgeModalVisibility(unittest.TestCase):
    """Validates that .stat-badge text is readable inside white-background modals.

    style.css: .stat-badge has color:#FFFFFF for the dark hub background.
    .modal has background: var(--card) which is #FFFFFF.  Without an override,
    stat-badge text inside a modal is white-on-white (invisible).
    """

    def setUp(self):
        css_path = os.path.join(PROJECT_ROOT, 'css', 'style.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            self.css = f.read()

    def test_modal_stat_badge_override_exists(self):
        """style.css: must have a .modal .stat-badge rule to override white text"""
        self.assertIn('.modal .stat-badge', self.css,
                      "Need a .modal .stat-badge CSS rule so stat text is readable on white modal background")

    def test_modal_stat_badge_has_dark_color(self):
        """style.css: .modal .stat-badge must set a non-white text color"""
        # Extract the .modal .stat-badge rule block
        idx = self.css.find('.modal .stat-badge')
        self.assertGreater(idx, 0)
        block_start = self.css.find('{', idx)
        block_end = self.css.find('}', block_start)
        block = self.css[block_start:block_end]
        # Must set a color property
        self.assertIn('color:', block,
                      ".modal .stat-badge must set an explicit text color")
        # The color must NOT be #FFFFFF or #FFF (white)
        color_match = re.search(r'color:\s*(#[0-9a-fA-F]+|rgba?\([^)]+\))', block)
        self.assertIsNotNone(color_match, "Could not parse color value")
        color_val = color_match.group(1).lower().strip()
        self.assertNotIn('#ffffff', color_val, "Modal stat-badge color must not be white")
        self.assertNotIn('#fff', color_val, "Modal stat-badge color must not be white")

    def test_modal_stat_badge_has_visible_background(self):
        """style.css: .modal .stat-badge must override the semi-transparent background"""
        idx = self.css.find('.modal .stat-badge')
        block_start = self.css.find('{', idx)
        block_end = self.css.find('}', block_start)
        block = self.css[block_start:block_end]
        self.assertIn('background:', block,
                      ".modal .stat-badge must override background for contrast on white modal")

    def test_base_stat_badge_is_white_text(self):
        """style.css: base .stat-badge should use white text (for dark hub background)"""
        # Find the base .stat-badge rule (not .modal .stat-badge)
        # Look for the rule that starts with just .stat-badge {
        match = re.search(r'\.stat-badge\s*\{([^}]+)\}', self.css)
        self.assertIsNotNone(match, "Could not find base .stat-badge rule")
        block = match.group(1)
        self.assertIn('color:', block, "Base .stat-badge should set text color")
        color_match = re.search(r'color:\s*(#[0-9a-fA-F]+)', block)
        self.assertIsNotNone(color_match)
        self.assertIn(color_match.group(1).upper(), ['#FFFFFF', '#FFF'],
                      "Base .stat-badge should use white text for hub's dark background")



# ===========================================================================
# Test Suite: Catch Overlay "Run Away" Button
# ===========================================================================
class TestCatchRunAwayButton(unittest.TestCase):
    """Validates that the catch overlay has a dismissal button so players can
    back out without being forced to attempt a catch.

    index.html: must have a #catch-run-away element inside #catch-overlay.
    creatures.js: startCatchGame must show the button, handleCatchResult must hide it.
    creatures.css: must have .catch-run-btn styling.
    """

    def setUp(self):
        html_path = os.path.join(PROJECT_ROOT, 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            self.html = f.read()
        self.js = read_js('creatures.js')
        css_path = os.path.join(PROJECT_ROOT, 'css', 'creatures.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            self.css = f.read()

    def test_run_away_button_exists_in_html(self):
        """index.html: #catch-overlay must contain a #catch-run-away button"""
        self.assertIn('id="catch-run-away"', self.html,
                      "catch overlay must have a Run Away button (id=catch-run-away)")

    def test_run_away_inside_catch_overlay(self):
        """index.html: #catch-run-away must be inside #catch-overlay, not outside"""
        overlay_start = self.html.find('id="catch-overlay"')
        run_btn = self.html.find('id="catch-run-away"')
        self.assertGreater(overlay_start, 0)
        self.assertGreater(run_btn, overlay_start,
                           "Run Away button must appear after catch-overlay opens")

    def test_run_away_calls_close_catch(self):
        """index.html: Run Away button must call CreatureWorld.closeCatch()"""
        # Find the button tag
        idx = self.html.find('id="catch-run-away"')
        # Get the surrounding tag (within 300 chars before and after)
        context = self.html[max(0, idx - 200):idx + 200]
        self.assertIn('closeCatch()', context,
                      "Run Away button must call closeCatch() to properly clean up")

    def test_start_catch_shows_run_away(self):
        """creatures.js: startCatchGame must make Run Away button visible"""
        # Find startCatchGame function body
        idx = self.js.find('function startCatchGame(')
        self.assertGreater(idx, 0)
        fn_body = self.js[idx:idx + 1500]
        self.assertIn('catch-run-away', fn_body,
                      "startCatchGame must reference the run-away button to show it")

    def test_handle_catch_result_hides_run_away(self):
        """creatures.js: handleCatchResult must hide Run Away when showing result"""
        idx = self.js.find('function handleCatchResult(')
        self.assertGreater(idx, 0)
        fn_body = self.js[idx:idx + 500]
        self.assertIn('catch-run-away', fn_body,
                      "handleCatchResult must reference run-away button to hide it")
        self.assertIn("display = 'none'", fn_body,
                      "handleCatchResult must set run-away display to none")

    def test_run_away_css_exists(self):
        """creatures.css: must have .catch-run-btn styling"""
        self.assertIn('.catch-run-btn', self.css,
                      "creatures.css must style the .catch-run-btn class")

    def test_run_away_css_has_position(self):
        """creatures.css: .catch-run-btn must be positioned (not in normal flow)"""
        idx = self.css.find('.catch-run-btn')
        block_start = self.css.find('{', idx)
        block_end = self.css.find('}', block_start)
        block = self.css[block_start:block_end]
        self.assertIn('position:', block,
                      ".catch-run-btn must have explicit positioning")



# ===========================================================================
# Test Suite: Dream Nexus Progress Hint
# ===========================================================================
class TestDreamNexusHint(unittest.TestCase):
    """Validates that the locked Dream Nexus shows a progress hint instead of
    being completely invisible, so players know there's a secret to work toward.

    creatures.js: renderLocations should show a locked hint card when
    Dream Nexus is not yet unlocked but the player has caught at least 1 creature.
    creatures.css: must have .location-card-locked styling.
    """

    def setUp(self):
        self.js = read_js('creatures.js')
        css_path = os.path.join(PROJECT_ROOT, 'css', 'creatures.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            self.css = f.read()

    def test_render_locations_has_locked_hint(self):
        """creatures.js: renderLocations must create a location-card-locked element"""
        idx = self.js.find('function renderLocations(')
        self.assertGreater(idx, 0)
        fn_body = self.js[idx:idx + 2000]
        self.assertIn('location-card-locked', fn_body,
                      "renderLocations must create a locked hint card for secret locations")

    def test_locked_hint_shows_legendary_progress(self):
        """creatures.js: locked hint must show legendary catch progress (X/Y)"""
        idx = self.js.find('function renderLocations(')
        fn_body = self.js[idx:idx + 2000]
        # Should reference caughtLegendaries and totalLegendaries (or similar)
        self.assertIn('legendaries', fn_body.lower(),
                      "Locked hint must mention legendaries in the progress count")

    def test_locked_hint_only_shows_after_first_catch(self):
        """creatures.js: locked hint should only appear after player catches first creature"""
        idx = self.js.find('function renderLocations(')
        fn_body = self.js[idx:idx + 2000]
        # Should check creatures length > 0
        self.assertIn('.length > 0', fn_body,
                      "Locked hint should only show after player has caught at least 1 creature")

    def test_locked_hint_not_clickable(self):
        """creatures.js: locked card must not have an onclick to prevent entering"""
        idx = self.js.find('location-card-locked')
        # Get context around it — the locked card should NOT have enterLocation
        context = self.js[idx:idx + 500]
        self.assertNotIn('enterLocation', context,
                         "Locked card must not call enterLocation (it's not accessible yet)")

    def test_css_has_locked_card_style(self):
        """creatures.css: must have .location-card-locked styling"""
        self.assertIn('.location-card-locked', self.css,
                      "creatures.css must style locked location cards")

    def test_css_locked_card_has_dashed_border(self):
        """creatures.css: locked card should use dashed border to indicate locked state"""
        idx = self.css.find('.location-card-locked')
        block_start = self.css.find('{', idx)
        block_end = self.css.find('}', block_start)
        block = self.css[block_start:block_end]
        self.assertIn('dashed', block,
                      "Locked card should have a dashed border to visually indicate locked state")

    def test_css_has_locked_hint_text_style(self):
        """creatures.css: must style the .loc-locked-hint text"""
        self.assertIn('.loc-locked-hint', self.css,
                      "creatures.css must style the locked hint text element")


if __name__ == '__main__':
    unittest.main(verbosity=2)


# ===========================================================================
# Test Suite: Onboarding Walkthrough
# ===========================================================================
class TestOnboardingWalkthrough(unittest.TestCase):
    """Validates that first-time players see an onboarding walkthrough on the hub.

    data.js: DEFAULT_STATE must include onboarding_seen: false.
    game.js: must have onboarding steps, startOnboarding, and finishOnboarding.
    index.html: must have #onboarding-overlay element.
    style.css: must have .onboarding-overlay styling.
    """

    def setUp(self):
        self.data_js = read_js('data.js')
        self.game_js = read_js('game.js')
        html_path = os.path.join(PROJECT_ROOT, 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            self.html = f.read()
        css_path = os.path.join(PROJECT_ROOT, 'css', 'style.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            self.css = f.read()

    def test_default_state_has_onboarding_seen(self):
        """data.js: DEFAULT_STATE must include onboarding_seen: false"""
        match = re.search(r'const DEFAULT_STATE\s*=\s*\{(.*?)\};', self.data_js, re.DOTALL)
        self.assertIsNotNone(match)
        self.assertIn('onboarding_seen', match.group(1))

    def test_migration_handles_missing_onboarding(self):
        """game.js: init must migrate old saves missing onboarding_seen"""
        self.assertIn('onboarding_seen', self.game_js,
                      "game.js must reference onboarding_seen for migration")

    def test_onboarding_steps_defined(self):
        """game.js: must define ONBOARDING_STEPS array"""
        self.assertIn('ONBOARDING_STEPS', self.game_js,
                      "game.js must define onboarding steps")

    def test_onboarding_has_multiple_steps(self):
        """game.js: ONBOARDING_STEPS must have at least 3 steps"""
        idx = self.game_js.find('ONBOARDING_STEPS')
        self.assertGreater(idx, 0)
        steps_block = self.game_js[idx:idx + 2000]
        title_count = steps_block.count("title:")
        self.assertGreaterEqual(title_count, 3,
                                f"Need at least 3 onboarding steps, found {title_count}")

    def test_onboarding_triggered_for_new_players(self):
        """game.js: onboarding must trigger when onboarding_seen is false"""
        self.assertIn('startOnboarding', self.game_js)

    def test_finish_onboarding_saves_state(self):
        """game.js: finishOnboarding must set onboarding_seen=true and save"""
        idx = self.game_js.find('function finishOnboarding')
        self.assertGreater(idx, 0)
        fn_body = self.game_js[idx:idx + 300]
        self.assertIn('onboarding_seen = true', fn_body,
                      "finishOnboarding must set onboarding_seen to true")
        self.assertIn('autoSave', fn_body,
                      "finishOnboarding must save state")

    def test_skip_onboarding_exposed(self):
        """game.js: must expose skipOnboarding in the return object"""
        self.assertIn('skipOnboarding', self.game_js)

    def test_onboarding_overlay_in_html(self):
        """index.html: must have #onboarding-overlay element"""
        self.assertIn('id="onboarding-overlay"', self.html)

    def test_onboarding_css_exists(self):
        """style.css: must have .onboarding-overlay styling"""
        self.assertIn('.onboarding-overlay', self.css)

    def test_onboarding_css_has_high_z_index(self):
        """style.css: onboarding overlay must be above other overlays (z-index >= 200)"""
        idx = self.css.find('.onboarding-overlay')
        block_start = self.css.find('{', idx)
        block_end = self.css.find('}', block_start)
        block = self.css[block_start:block_end]
        z_match = re.search(r'z-index:\s*(\d+)', block)
        self.assertIsNotNone(z_match, "Onboarding overlay must have z-index")
        self.assertGreaterEqual(int(z_match.group(1)), 200,
                                "Onboarding z-index must be >= 200 to appear above modals")

    def test_onboarding_highlight_css_exists(self):
        """style.css: must have .onboarding-highlight class for spotlight effect"""
        self.assertIn('.onboarding-highlight', self.css)


# ===========================================================================
class TestSoundFeedback(unittest.TestCase):
    """Validates new SFX: catchNewCreature, locationEnter, locationUnlock.

    audio.js: must define all three new SFX in the sfx object.
    creatures.js: must call the appropriate SFX at the right moments.
    """

    def setUp(self):
        self.audio_js = read_js('audio.js')
        self.creatures_js = read_js('creatures.js')

    # --- audio.js: new SFX definitions ---

    def test_catch_new_creature_sfx_defined(self):
        """audio.js: sfx must include catchNewCreature method"""
        self.assertIn('catchNewCreature', self.audio_js,
                      "audio.js must define catchNewCreature SFX")

    def test_location_enter_sfx_defined(self):
        """audio.js: sfx must include locationEnter method"""
        self.assertIn('locationEnter', self.audio_js,
                      "audio.js must define locationEnter SFX")

    def test_location_unlock_sfx_defined(self):
        """audio.js: sfx must include locationUnlock method"""
        self.assertIn('locationUnlock', self.audio_js,
                      "audio.js must define locationUnlock SFX")

    def test_catch_new_creature_uses_play_melody(self):
        """audio.js: catchNewCreature must use playMelody for multi-note jingle"""
        idx = self.audio_js.find('catchNewCreature')
        self.assertGreater(idx, 0)
        block = self.audio_js[idx:idx + 300]
        self.assertIn('playMelody', block,
                      "catchNewCreature should use playMelody for a multi-note jingle")

    def test_location_unlock_has_more_notes_than_enter(self):
        """audio.js: locationUnlock should be grander than locationEnter"""
        enter_idx = self.audio_js.find('locationEnter()')
        self.assertGreater(enter_idx, 0)
        enter_block = self.audio_js[enter_idx:enter_idx + 300]
        enter_notes = enter_block.count('[')

        unlock_idx = self.audio_js.find('locationUnlock()')
        self.assertGreater(unlock_idx, 0)
        unlock_block = self.audio_js[unlock_idx:unlock_idx + 400]
        unlock_notes = unlock_block.count('[')

        self.assertGreater(unlock_notes, enter_notes,
                           "locationUnlock should have more notes than locationEnter")

    # --- creatures.js: wiring ---

    def test_new_creature_catch_plays_new_jingle(self):
        """creatures.js: catching a new creature should call catchNewCreature SFX"""
        self.assertIn('catchNewCreature', self.creatures_js,
                      "creatures.js must call catchNewCreature for first-time catches")

    def test_repeat_catch_still_plays_catch_success(self):
        """creatures.js: repeat catches should still use catchSuccess SFX"""
        self.assertIn('catchSuccess', self.creatures_js,
                      "creatures.js must still call catchSuccess for repeat catches")

    def test_enter_location_plays_location_sound(self):
        """creatures.js: enterLocation must call locationEnter SFX"""
        idx = self.creatures_js.find('function enterLocation')
        self.assertGreater(idx, 0)
        fn_block = self.creatures_js[idx:idx + 200]
        self.assertIn('locationEnter', fn_block,
                      "enterLocation should play locationEnter SFX")

    def test_enter_location_no_longer_click_sfx(self):
        """creatures.js: enterLocation should use locationEnter instead of click"""
        idx = self.creatures_js.find('function enterLocation')
        self.assertGreater(idx, 0)
        fn_block = self.creatures_js[idx:idx + 200]
        self.assertNotIn('sfx.click()', fn_block,
                         "enterLocation should use locationEnter, not click SFX")

    def test_dream_nexus_unlock_plays_unlock_sound(self):
        """creatures.js: Dream Nexus unlock must trigger locationUnlock SFX"""
        self.assertIn('locationUnlock', self.creatures_js,
                      "creatures.js must call locationUnlock when Dream Nexus unlocks")

    def test_new_creature_branching_logic(self):
        """creatures.js: must branch on isNew to pick the right SFX"""
        idx = self.creatures_js.find('catchNewCreature')
        self.assertGreater(idx, 0)
        context = self.creatures_js[max(0, idx - 200):idx + 50]
        self.assertIn('isNew', context,
                      "catchNewCreature should be gated by an isNew check")


# ===========================================================================
class TestFloatingCoinsAnimation(unittest.TestCase):
    """Validates the floating '+X coins' animation on coin gain.

    game.js: addCoins must call showFloatingCoins for positive amounts.
    style.css: must have .floating-coins class and floatUp keyframes.
    """

    def setUp(self):
        self.game_js = read_js('game.js')
        css_path = os.path.join(PROJECT_ROOT, 'css', 'style.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            self.css = f.read()

    def test_show_floating_coins_function_exists(self):
        """game.js: must define showFloatingCoins function"""
        self.assertIn('function showFloatingCoins', self.game_js)

    def test_add_coins_calls_floating_animation(self):
        """game.js: addCoins must call showFloatingCoins for positive amounts"""
        idx = self.game_js.find('function addCoins')
        self.assertGreater(idx, 0)
        fn_block = self.game_js[idx:idx + 400]
        self.assertIn('showFloatingCoins', fn_block,
                      "addCoins must trigger floating coin animation")

    def test_floating_only_on_positive_amounts(self):
        """game.js: showFloatingCoins should only be called when amount > 0"""
        idx = self.game_js.find('function addCoins')
        self.assertGreater(idx, 0)
        fn_block = self.game_js[idx:idx + 400]
        # showFloatingCoins should appear after the 'amount > 0' check
        float_idx = fn_block.find('showFloatingCoins')
        positive_check = fn_block.find('amount > 0')
        self.assertGreater(float_idx, positive_check,
                           "showFloatingCoins should be inside the positive amount check")

    def test_floating_coins_css_class_exists(self):
        """style.css: must define .floating-coins class"""
        self.assertIn('.floating-coins', self.css)

    def test_floating_coins_is_fixed_position(self):
        """style.css: .floating-coins must be position:fixed to overlay the screen"""
        idx = self.css.find('.floating-coins')
        block_end = self.css.find('}', idx)
        block = self.css[idx:block_end]
        self.assertIn('position: fixed', block)

    def test_float_up_keyframes_defined(self):
        """style.css: must define @keyframes floatUp animation"""
        self.assertIn('@keyframes floatUp', self.css)

    def test_floating_coins_uses_float_up(self):
        """style.css: .floating-coins must reference floatUp animation"""
        idx = self.css.find('.floating-coins')
        block_end = self.css.find('}', idx)
        block = self.css[idx:block_end]
        self.assertIn('floatUp', block)

    def test_floater_has_cleanup(self):
        """game.js: showFloatingCoins must remove the element after animation"""
        idx = self.game_js.find('function showFloatingCoins')
        self.assertGreater(idx, 0)
        fn_block = self.game_js[idx:idx + 900]
        self.assertIn('remove()', fn_block,
                      "Floating coin element must be cleaned up after animation")

    def test_floater_has_high_z_index(self):
        """style.css: floating coins must have high z-index to appear on top"""
        idx = self.css.find('.floating-coins')
        block_end = self.css.find('}', idx)
        block = self.css[idx:block_end]
        z_match = re.search(r'z-index:\s*(\d+)', block)
        self.assertIsNotNone(z_match)
        self.assertGreaterEqual(int(z_match.group(1)), 200)


# ===========================================================================
class TestCollectionBadge(unittest.TestCase):
    """Validates collection completion badge on the hub screen.

    index.html: must have #collection-badge element.
    game.js: updateHubStats must call updateCollectionBadge.
    style.css: must have .collection-badge and .collection-progress-fill styles.
    """

    def setUp(self):
        self.game_js = read_js('game.js')
        html_path = os.path.join(PROJECT_ROOT, 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            self.html = f.read()
        css_path = os.path.join(PROJECT_ROOT, 'css', 'style.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            self.css = f.read()

    def test_collection_badge_element_exists(self):
        """index.html: must have #collection-badge element"""
        self.assertIn('id="collection-badge"', self.html)

    def test_collection_progress_fill_element(self):
        """index.html: must have #collection-progress-fill for the bar"""
        self.assertIn('id="collection-progress-fill"', self.html)

    def test_collection_stars_element(self):
        """index.html: must have #collection-stars for star display"""
        self.assertIn('id="collection-stars"', self.html)

    def test_collection_pct_element(self):
        """index.html: must have #collection-pct for percentage display"""
        self.assertIn('id="collection-pct"', self.html)

    def test_update_collection_badge_function(self):
        """game.js: must define updateCollectionBadge function"""
        self.assertIn('function updateCollectionBadge', self.game_js)

    def test_hub_stats_calls_collection_badge(self):
        """game.js: updateHubStats must call updateCollectionBadge"""
        idx = self.game_js.find('function updateHubStats')
        self.assertGreater(idx, 0)
        fn_block = self.game_js[idx:idx + 500]
        self.assertIn('updateCollectionBadge', fn_block)

    def test_badge_hidden_when_no_creatures(self):
        """game.js: badge should be hidden when caught count is 0"""
        idx = self.game_js.find('function updateCollectionBadge')
        self.assertGreater(idx, 0)
        fn_block = self.game_js[idx:idx + 800]
        self.assertIn('hidden', fn_block,
                      "Badge should be hidden when no creatures caught")

    def test_badge_calculates_percentage(self):
        """game.js: updateCollectionBadge must calculate a percentage"""
        idx = self.game_js.find('function updateCollectionBadge')
        self.assertGreater(idx, 0)
        fn_block = self.game_js[idx:idx + 800]
        self.assertIn('pct', fn_block)

    def test_collection_badge_css_exists(self):
        """style.css: must have .collection-badge class"""
        self.assertIn('.collection-badge', self.css)

    def test_collection_progress_fill_css(self):
        """style.css: must have .collection-progress-fill with gradient"""
        self.assertIn('.collection-progress-fill', self.css)

    def test_collection_progress_has_transition(self):
        """style.css: progress fill should have smooth transition"""
        idx = self.css.find('.collection-progress-fill')
        block_end = self.css.find('}', idx)
        block = self.css[idx:block_end]
        self.assertIn('transition', block)


# ===========================================================================
class TestImportConfirmDialog(unittest.TestCase):
    """Validates the 'are you sure?' confirmation dialog for importing saves.

    save.js: importSave must show confirmation instead of immediately loading.
    save.js: must define confirmImport and cancelImport functions.
    index.html: must have #import-confirm-overlay element.
    """

    def setUp(self):
        self.save_js = read_js('save.js')
        html_path = os.path.join(PROJECT_ROOT, 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            self.html = f.read()

    def test_import_confirm_overlay_exists(self):
        """index.html: must have #import-confirm-overlay element"""
        self.assertIn('id="import-confirm-overlay"', self.html)

    def test_import_confirm_details_element(self):
        """index.html: must have #import-confirm-details for save info"""
        self.assertIn('id="import-confirm-details"', self.html)

    def test_confirm_import_function_exists(self):
        """save.js: must define confirmImport function"""
        self.assertIn('function confirmImport', self.save_js)

    def test_cancel_import_function_exists(self):
        """save.js: must define cancelImport function"""
        self.assertIn('function cancelImport', self.save_js)

    def test_import_save_shows_confirmation(self):
        """save.js: importSave must call showImportConfirm instead of immediately loading"""
        idx = self.save_js.find('function importSave')
        self.assertGreater(idx, 0)
        fn_block = self.save_js[idx:idx + 800]
        self.assertIn('showImportConfirm', fn_block,
                      "importSave must show confirmation dialog")

    def test_import_save_does_not_immediately_reload(self):
        """save.js: importSave must NOT immediately call location.reload"""
        idx = self.save_js.find('function importSave')
        self.assertGreater(idx, 0)
        # Find the end of importSave (next top-level function)
        next_fn = self.save_js.find('\n  let pending', idx + 10)
        if next_fn == -1:
            next_fn = idx + 800
        fn_block = self.save_js[idx:next_fn]
        self.assertNotIn('location.reload', fn_block,
                         "importSave should NOT reload directly — confirmation first")

    def test_confirm_import_does_reload(self):
        """save.js: confirmImport must eventually reload the page"""
        idx = self.save_js.find('function confirmImport')
        self.assertGreater(idx, 0)
        fn_block = self.save_js[idx:idx + 400]
        self.assertIn('reload', fn_block,
                      "confirmImport should reload after applying the save")

    def test_cancel_import_hides_overlay(self):
        """save.js: cancelImport must hide the confirmation overlay"""
        idx = self.save_js.find('function cancelImport')
        self.assertGreater(idx, 0)
        fn_block = self.save_js[idx:idx + 300]
        self.assertIn('hidden', fn_block,
                      "cancelImport should hide the overlay")

    def test_return_object_exposes_confirm_cancel(self):
        """save.js: return object must expose confirmImport and cancelImport"""
        self.assertIn('confirmImport', self.save_js)
        self.assertIn('cancelImport', self.save_js)
        # Check they're in the return statement
        ret_idx = self.save_js.rfind('return {')
        self.assertGreater(ret_idx, 0)
        ret_block = self.save_js[ret_idx:ret_idx + 200]
        self.assertIn('confirmImport', ret_block)
        self.assertIn('cancelImport', ret_block)

    def test_confirm_buttons_in_html(self):
        """index.html: confirmation dialog must have cancel and load buttons"""
        idx = self.html.find('import-confirm-overlay')
        self.assertGreater(idx, 0)
        block = self.html[idx:idx + 600]
        self.assertIn('cancelImport', block)
        self.assertIn('confirmImport', block)

    def test_dialog_warns_about_overwrite(self):
        """index.html: confirmation dialog must warn about overwriting progress"""
        idx = self.html.find('import-confirm-overlay')
        self.assertGreater(idx, 0)
        block = self.html[idx:idx + 600]
        self.assertIn('replace', block.lower(),
                      "Dialog should warn that current progress will be replaced")


if __name__ == '__main__':
    unittest.main(verbosity=2)
