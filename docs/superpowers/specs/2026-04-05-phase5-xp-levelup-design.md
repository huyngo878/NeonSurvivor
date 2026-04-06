# Phase 5 — XP Gems & Level-Up System Design

**Date:** 2026-04-05  
**Status:** Approved

---

## Overview

Phase 5 adds an XP economy and level-up loop. Enemies drop XP gems on death; the player collects them by walking over them; when enough XP accumulates the game pauses and offers 3 upgrade cards. The upgrade pool is fully data-driven — adding a new upgrade is one object in a flat array.

---

## 1. XP Gems

### Entity shape
```js
{
  id,
  type: 'gem',
  value: Number,       // XP awarded on collect (chaser=1, tank=3)
  pos: { x, y },
  radius: Number,      // chaser gem: 6, tank gem: 8
  bobTimer: 0,
  color: String,       // chaser gem: '#00ff88', tank gem: '#ffd700'
}
```

### Drop rules (in `ENEMY_TYPES`)
```js
chaser: { ..., gemValue: 1, gemRadius: 6, gemColor: '#00ff88' }
tank:   { ..., gemValue: 3, gemRadius: 8, gemColor: '#ffd700' }
```

Every enemy always drops a gem on death (no RNG). Weapon drops keep their 5% RNG from Phase 4.

### New factory in `src/entities.js`
```js
export function createGem(value, radius, color, x, y) { ... }
```

### Collection system — `src/systems/gems.js`
```js
export function updateGems(entities, player, dt)
```
- Advances `bobTimer` on all gems each frame (bob animation)
- Spatial hash query at `player.pos` with radius `player.radius + 10`
- On overlap: splice gem from entities, `player.xp += gem.value`, trigger level-up check
- Level-up check: `if (player.xp >= player.xpToNext) { _levelUp(player, gameState) }` — one level-up per gem collection; if enough XP remains for another level-up, it triggers on the next gem collect (or immediately if collecting multiple gems in one frame)

### `_levelUp(player, gameState)`
```js
player.xp -= player.xpToNext
player.level++
player.xpToNext = Math.floor(50 * Math.pow(player.level, 1.2))
gameState.upgradeChoices = pickUpgrades(player, 3)
gameState.state = 'levelup'
```

---

## 2. XP Curve & Player Fields

### New player fields (added in `createPlayer`)
```js
xp: 0,
level: 1,
xpToNext: 50,
regenRate: 0,   // HP per second, used by upgrades
```

### XP curve
`xpToNext = Math.floor(50 * Math.pow(level, 1.2))`

| Level | XP to next |
|-------|-----------|
| 1     | 50        |
| 2     | 57        |
| 3     | 64        |
| 5     | 80        |
| 10    | 130       |
| 20    | 221       |

No level cap — game runs indefinitely.

### HP regen (applied in main loop during `'playing'` state)
```js
if (player.regenRate > 0) player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt)
```

---

## 3. Upgrade Registry

### File: `src/upgrades.js`

Flat array export. Each upgrade object:

```js
{
  id: String,          // unique, stable ID
  label: String,       // short name shown on card (e.g. 'SPEED BOOST')
  desc: String,        // one-line description
  rarity: 'common' | 'rare' | 'epic',
  icon: String,        // emoji shown on card
  requires?: String,   // weapon type that must be in player.weapons (e.g. 'wand')
  excludes?: String,   // weapon type that must NOT be in player.weapons
  apply: (player) => void,  // mutation function, no return value needed
}
```

### Rarity weights
| Rarity | Weight | Approx. chance (3-pick pool) |
|--------|--------|-------------------------------|
| common | 60     | ~60%                          |
| rare   | 30     | ~30%                          |
| epic   | 10     | ~10%                          |

### Upgrade pool (Phase 5 initial set)

**Player stats**
| id | label | desc | rarity |
|----|-------|------|--------|
| `speed_1` | SPEED BOOST | +15% move speed | common |
| `hp_up` | HP BOOST | +25 max HP, heal +25 | common |
| `hp_regen` | REGEN | +1 HP/sec regen | rare |

**Weapon power** (gated by `requires`)
| id | label | desc | rarity | requires |
|----|-------|------|--------|----------|
| `wand_dmg` | WAND POWER | +10 wand damage | common | wand |
| `wand_cd` | RAPID FIRE | Wand fires 20% faster | rare | wand |
| `wand_shots` | MULTISHOT | +1 wand projectile | rare | wand |
| `whip_dmg` | WHIP POWER | +8 whip damage | common | whip |
| `whip_cd` | WHIP SPEED | Whip swings 20% faster | rare | whip |
| `whip_arc` | WIDER ARC | +30° whip sweep | rare | whip |

**New weapons** (gated by `excludes`)
| id | label | desc | rarity | excludes |
|----|-------|------|--------|----------|
| `get_wand` | MAGIC WAND | Add the wand weapon | epic | wand |
| `get_whip` | WHIP | Add the whip weapon | epic | whip |

### Picker function — `pickUpgrades(player, n)`
```js
// in src/upgrades.js
export function pickUpgrades(player, n) {
  const eligible = UPGRADES.filter(u => {
    if (u.requires && !player.weapons.some(w => w.type === u.requires)) return false
    if (u.excludes && player.weapons.some(w => w.type === u.excludes)) return false
    return true
  })
  // weighted random sample without replacement
  // weight map: common=60, rare=30, epic=10
  return weightedSample(eligible, n)
}
```

**Adding a new upgrade:** append one object to the `UPGRADES` array in `src/upgrades.js`. No other file needs to change.

**Edge case:** if the eligible pool has fewer than `n` items, `pickUpgrades` returns all eligible upgrades (no duplicates, no padding).

---

## 4. Level-Up Screen UI

### File: `src/ui/levelUpScreen.js`

```js
export function drawLevelUpScreen(ctx, canvas, player, gameState)
```

**Layout:** Dark overlay (`rgba(0,0,0,0.75)`) → title "LEVEL UP!" in gold → subtitle "Level N" → 3 cards centered horizontally.

**Card style (Option C from brainstorm):**
- Width 180px, height 220px, gap 24px
- Rarity border colors: COMMON `#888`, RARE `#00ffc8`, EPIC `#ffd700`
- EPIC/RARE cards have `shadowBlur` glow on border
- Rarity badge bottom of card: small pill with text
- Icon (emoji, 36px) at top of card
- Bold label, description text below

**Input handling (in `src/main.js` keydown):**
- Keys `1`, `2`, `3` → select corresponding card
- Mouse click: hit-test card rects stored in `gameState.cardRects`
- On select: `upgrade.apply(player)`, `gameState.state = 'playing'`, clear `upgradeChoices`

### State flow
```
'playing' → gem collect → xp >= xpToNext → _levelUp() → 'levelup'
'levelup' → player picks card → apply upgrade → 'playing'
```

If a single gem collect pushes XP past two thresholds, only one level-up fires per frame. The next level-up fires on the subsequent gem collect (or at the start of the next playing frame if XP already exceeds the new threshold).

---

## 5. HUD Changes

### XP bar — bottom-center
```
canvas bottom edge
├── 8px gap
├── "LVL N" label (centered, gold, 12px monospace)
├── 4px gap
└── XP bar: full canvas width − 32px margin, 6px tall, gold gradient
    filled portion = player.xp / player.xpToNext
```

Only shown during `'playing'` and `'paused'` states.

---

## 6. Rendering — Gem Visuals

In `src/render.js`, add `_drawGem(ctx, gem)`:
- Circle fill with `gem.color`, `shadowBlur: 12`, bob offset from `bobTimer`
- Small white inner shine dot (same pattern as pickup orbs)
- Tank gems (radius 8) are slightly larger and brighter gold

---

## 7. File Map

| File | Change |
|------|--------|
| `src/entities.js` | Add `createGem()`, new player fields (`xp`, `level`, `xpToNext`, `regenRate`), gem values in `ENEMY_TYPES` |
| `src/upgrades.js` | **New** — `UPGRADES` array + `pickUpgrades(player, n)` |
| `src/systems/gems.js` | **New** — `updateGems(entities, player, dt)` |
| `src/systems/collision.js` | Drop gem on enemy kill (alongside existing weapon drop roll) |
| `src/render.js` | `_drawGem()`, add `gem` branch in render loop |
| `src/ui/hud.js` | XP bar bottom-center, only during playing/paused |
| `src/ui/levelUpScreen.js` | **New** — card UI, rarity styling |
| `src/main.js` | `'levelup'` state routing, 1/2/3 + click input, `updateGems` call, HP regen tick |
| `tests/entities.test.js` | `createGem` shape tests, updated `createPlayer` fields |
| `tests/upgrades.test.js` | **New** — `pickUpgrades` eligibility + weighted sampling |
| `tests/systems/gems.test.js` | **New** — collect, XP increment, level-up trigger |

---

## 8. Out of Scope (Phase 5)

- Persistent upgrades across runs (localStorage — Phase 7)
- Upgrade preview tooltips / animations
- More than 3 cards per level-up
- Reroll mechanic
