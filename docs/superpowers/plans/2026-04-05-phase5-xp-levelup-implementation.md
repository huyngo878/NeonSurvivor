# Phase 5 — XP Gems & Level-Up System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add XP gems that drop on enemy kill, an XP curve that triggers level-up, and a data-driven upgrade card screen (3 cards, rarity tiers, keyboard + mouse input).

**Architecture:** Gems are plain entities collected by a new `updateGems` system. The upgrade pool lives in `src/upgrades.js` — a flat array of objects with an `apply(player)` function. The level-up screen is a pure canvas UI, triggered by `gameState.state = 'levelup'`. Everything connects in `main.js`.

**Tech Stack:** Vanilla JS ES modules, HTML5 Canvas, Vitest.

---

## File Map

| File | Change |
|------|--------|
| `src/entities.js` | Add `createGem()`, add `xp/level/xpToNext/regenRate` to `createPlayer`, add `gemValue/gemRadius/gemColor` to `ENEMY_TYPES` |
| `src/upgrades.js` | **New** — `UPGRADES` array + `pickUpgrades(player, n)` + `weightedSample()` |
| `src/systems/gems.js` | **New** — `updateGems(entities, player, dt, gameState)` |
| `src/systems/collision.js` | Call `_dropGem(enemy, entities)` on kill alongside weapon drop |
| `src/render.js` | Add `_drawGem()` and gem branch in render loop |
| `src/ui/hud.js` | Add XP bar bottom-center; shift weapon inventory up to avoid overlap |
| `src/ui/levelUpScreen.js` | **New** — `drawLevelUpScreen(ctx, canvas, player, gameState)` |
| `src/main.js` | `'levelup'` state routing, 1/2/3 + click input, `updateGems` call, HP regen tick |
| `tests/entities.test.js` | `createGem` shape + updated `createPlayer` fields |
| `tests/upgrades.test.js` | **New** — eligibility filtering + weighted sample |
| `tests/systems/gems.test.js` | **New** — collect, XP increment, level-up trigger, bob timer |

---

## Task 1: Entity Factories — createGem, player XP fields, ENEMY_TYPES gem data

**Files:**
- Modify: `src/entities.js`
- Modify: `tests/entities.test.js`

- [ ] **Step 1: Add failing tests to `tests/entities.test.js`**

Append after all existing tests:

```js
describe('createGem', () => {
  it('creates a gem with correct shape', () => {
    const g = createGem(1, 6, '#00ff88', 100, 200)
    expect(g.type).toBe('gem')
    expect(g.value).toBe(1)
    expect(g.radius).toBe(6)
    expect(g.color).toBe('#00ff88')
    expect(g.pos).toEqual({ x: 100, y: 200 })
    expect(g.bobTimer).toBe(0)
    expect(typeof g.id).toBe('number')
  })
})

describe('createPlayer — XP fields', () => {
  it('starts with xp=0, level=1, xpToNext=50, regenRate=0', () => {
    const p = createPlayer()
    expect(p.xp).toBe(0)
    expect(p.level).toBe(1)
    expect(p.xpToNext).toBe(50)
    expect(p.regenRate).toBe(0)
  })
})

describe('ENEMY_TYPES — gem data', () => {
  it('chaser has gemValue=1, gemRadius=6, gemColor=#00ff88', () => {
    expect(ENEMY_TYPES.chaser.gemValue).toBe(1)
    expect(ENEMY_TYPES.chaser.gemRadius).toBe(6)
    expect(ENEMY_TYPES.chaser.gemColor).toBe('#00ff88')
  })

  it('tank has gemValue=3, gemRadius=8, gemColor=#ffd700', () => {
    expect(ENEMY_TYPES.tank.gemValue).toBe(3)
    expect(ENEMY_TYPES.tank.gemRadius).toBe(8)
    expect(ENEMY_TYPES.tank.gemColor).toBe('#ffd700')
  })
})
```

Also update the import line at the top of the test file to include `createGem`:

```js
import { createPlayer, createEnemy, createWeapon, createPickup, createGem, initProjectilePool, ENEMY_TYPES } from '../src/entities.js'
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -15
```

Expected: FAIL — `createGem is not a function`

- [ ] **Step 3: Update `src/entities.js`**

Replace the entire file:

```js
import { WORLD_W, WORLD_H, POOL_SIZE } from './constants.js'

export const ENEMY_TYPES = {
  chaser: { speed: 120, hp: 30,  maxHp: 30,  radius: 8,  color: '#ff0080', damage: 10, gemValue: 1, gemRadius: 6, gemColor: '#00ff88' },
  tank:   { speed: 55,  hp: 120, maxHp: 120, radius: 14, color: '#ff4400', damage: 20, gemValue: 3, gemRadius: 8, gemColor: '#ffd700' },
}

const WEAPON_CONFIGS = {
  wand: { type: 'wand', cooldown: 0.8, damage: 20, range: 400, shots: 1 },
  whip: {
    type: 'whip', cooldown: 0.6, damage: 15, range: 120,
    sweepAngle: Math.PI, activeDuration: 0.12, aimAngle: 0,
  },
}

let nextId = 1

export function createWeapon(type) {
  const cfg = WEAPON_CONFIGS[type]
  if (!cfg) throw new Error(`Unknown weapon type: ${type}`)
  const base = { ...cfg, timer: 0 }
  if (type === 'whip') {
    base.active = false
    base.activeTimer = 0
    base.hitIds = new Set()
  }
  return base
}

export function createPickup(weaponType, x, y) {
  return {
    id: nextId++,
    type: 'pickup',
    pickupType: 'weapon',
    weaponType,
    pos: { x, y },
    radius: 10,
    bobTimer: 0,
  }
}

export function createGem(value, radius, color, x, y) {
  return {
    id: nextId++,
    type: 'gem',
    value,
    radius,
    color,
    pos: { x, y },
    bobTimer: 0,
  }
}

export function createPlayer() {
  return {
    id: nextId++,
    type: 'player',
    pos: { x: WORLD_W / 2, y: WORLD_H / 2 },
    vel: { x: 0, y: 0 },
    hp: 100,
    maxHp: 100,
    speed: 200,
    iframes: 0,
    radius: 12,
    facing: { x: 1, y: 0 },
    weapons: [],
    xp: 0,
    level: 1,
    xpToNext: 50,
    regenRate: 0,
  }
}

export function createEnemy(enemyType, x, y) {
  const cfg = ENEMY_TYPES[enemyType]
  if (!cfg) throw new Error(`Unknown enemy type: ${enemyType}`)
  return {
    id: nextId++,
    type: 'enemy',
    enemyType,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    hp: cfg.hp,
    maxHp: cfg.maxHp,
    radius: cfg.radius,
    color: cfg.color,
    damage: cfg.damage,
    speed: cfg.speed,
  }
}

export function initProjectilePool() {
  const pool = []
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      id: nextId++,
      type: 'projectile',
      active: false,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      damage: 0,
      radius: 4,
      lifetime: 2.0,
      age: 0,
    })
  }
  return pool
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -15
```

Expected: PASS — all entity tests including new `createGem`, player XP fields, ENEMY_TYPES gem data.

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js tests/entities.test.js && git commit -m "feat: createGem factory, player XP fields, gem drop data in ENEMY_TYPES"
```

---

## Task 2: Upgrade Registry — UPGRADES array + pickUpgrades

**Files:**
- Create: `src/upgrades.js`
- Create: `tests/upgrades.test.js`

- [ ] **Step 1: Create `tests/upgrades.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { pickUpgrades, UPGRADES } from '../src/upgrades.js'
import { createPlayer, createWeapon } from '../src/entities.js'

describe('UPGRADES', () => {
  it('every upgrade has required fields', () => {
    for (const u of UPGRADES) {
      expect(typeof u.id).toBe('string')
      expect(typeof u.label).toBe('string')
      expect(typeof u.desc).toBe('string')
      expect(['common', 'rare', 'epic']).toContain(u.rarity)
      expect(typeof u.icon).toBe('string')
      expect(typeof u.apply).toBe('function')
    }
  })

  it('all upgrade ids are unique', () => {
    const ids = UPGRADES.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('pickUpgrades', () => {
  it('returns at most n upgrades', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('whip')]
    const picks = pickUpgrades(player, 3)
    expect(picks.length).toBeLessThanOrEqual(3)
  })

  it('filters out requires-gated upgrades when weapon not owned', () => {
    const player = createPlayer()
    // player has no weapons — wand/whip specific upgrades should not appear
    const picks = pickUpgrades(player, 100)
    for (const p of picks) {
      expect(p.requires).toBeUndefined()
    }
  })

  it('filters out excludes-gated upgrades when weapon already owned', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('whip')]
    const picks = pickUpgrades(player, 100)
    for (const p of picks) {
      if (p.excludes === 'wand') fail('get_wand should not appear when wand is owned')
      if (p.excludes === 'whip') fail('get_whip should not appear when whip is owned')
    }
  })

  it('returns full eligible pool when pool is smaller than n', () => {
    const player = createPlayer()
    // No weapons owned — only stat upgrades are eligible (speed_1, hp_up, hp_regen = 3 upgrades)
    // plus get_wand and get_whip (excludes weapons player doesn't have yet = both eligible)
    const picks = pickUpgrades(player, 100)
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.length).toBeLessThanOrEqual(UPGRADES.length)
  })

  it('does not return duplicate upgrades', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('whip')]
    const picks = pickUpgrades(player, 3)
    const ids = picks.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('applies speed upgrade correctly', () => {
    const player = createPlayer()
    const speedUpgrade = UPGRADES.find(u => u.id === 'speed_1')
    const before = player.speed
    speedUpgrade.apply(player)
    expect(player.speed).toBeCloseTo(before * 1.15, 5)
  })

  it('applies hp_up upgrade correctly', () => {
    const player = createPlayer()
    player.hp = 50
    const hpUpgrade = UPGRADES.find(u => u.id === 'hp_up')
    hpUpgrade.apply(player)
    expect(player.maxHp).toBe(125)
    expect(player.hp).toBe(75)
  })

  it('applies wand_dmg upgrade correctly', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const upgrade = UPGRADES.find(u => u.id === 'wand_dmg')
    upgrade.apply(player)
    expect(player.weapons[0].damage).toBe(30)
  })

  it('applies get_wand upgrade and adds wand weapon', () => {
    const player = createPlayer()
    const upgrade = UPGRADES.find(u => u.id === 'get_wand')
    upgrade.apply(player)
    expect(player.weapons.some(w => w.type === 'wand')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/upgrades.test.js 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../src/upgrades.js'`

- [ ] **Step 3: Create `src/upgrades.js`**

```js
import { createWeapon } from './entities.js'

const WEIGHTS = { common: 60, rare: 30, epic: 10 }

export const UPGRADES = [
  // Player stats
  {
    id: 'speed_1', label: 'SPEED BOOST', desc: '+15% move speed',
    rarity: 'common', icon: '⚡',
    apply: (p) => { p.speed *= 1.15 },
  },
  {
    id: 'hp_up', label: 'HP BOOST', desc: '+25 max HP, heal +25',
    rarity: 'common', icon: '❤️',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp) },
  },
  {
    id: 'hp_regen', label: 'REGEN', desc: '+1 HP/sec regen',
    rarity: 'rare', icon: '💚',
    apply: (p) => { p.regenRate += 1 },
  },

  // Wand upgrades
  {
    id: 'wand_dmg', label: 'WAND POWER', desc: '+10 wand damage',
    rarity: 'common', icon: '🔮', requires: 'wand',
    apply: (p) => { p.weapons.find(w => w.type === 'wand').damage += 10 },
  },
  {
    id: 'wand_cd', label: 'RAPID FIRE', desc: 'Wand fires 20% faster',
    rarity: 'rare', icon: '💨', requires: 'wand',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'wand')
      w.cooldown = Math.max(0.2, w.cooldown * 0.8)
    },
  },
  {
    id: 'wand_shots', label: 'MULTISHOT', desc: '+1 wand projectile',
    rarity: 'rare', icon: '✦', requires: 'wand',
    apply: (p) => { p.weapons.find(w => w.type === 'wand').shots += 1 },
  },

  // Whip upgrades
  {
    id: 'whip_dmg', label: 'WHIP POWER', desc: '+8 whip damage',
    rarity: 'common', icon: '🌀', requires: 'whip',
    apply: (p) => { p.weapons.find(w => w.type === 'whip').damage += 8 },
  },
  {
    id: 'whip_cd', label: 'WHIP SPEED', desc: 'Whip swings 20% faster',
    rarity: 'rare', icon: '⚔️', requires: 'whip',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'whip')
      w.cooldown = Math.max(0.15, w.cooldown * 0.8)
    },
  },
  {
    id: 'whip_arc', label: 'WIDER ARC', desc: '+30° whip sweep',
    rarity: 'rare', icon: '🔱', requires: 'whip',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'whip')
      w.sweepAngle = Math.min(2 * Math.PI, w.sweepAngle + Math.PI / 6)
    },
  },

  // New weapons
  {
    id: 'get_wand', label: 'MAGIC WAND', desc: 'Add the wand weapon',
    rarity: 'epic', icon: '✨', excludes: 'wand',
    apply: (p) => { p.weapons.push(createWeapon('wand')) },
  },
  {
    id: 'get_whip', label: 'WHIP', desc: 'Add the whip weapon',
    rarity: 'epic', icon: '🔱', excludes: 'whip',
    apply: (p) => { p.weapons.push(createWeapon('whip')) },
  },
]

export function pickUpgrades(player, n) {
  const eligible = UPGRADES.filter(u => {
    if (u.requires && !player.weapons.some(w => w.type === u.requires)) return false
    if (u.excludes && player.weapons.some(w => w.type === u.excludes)) return false
    return true
  })
  return _weightedSample(eligible, n)
}

function _weightedSample(pool, n) {
  const result = []
  const remaining = [...pool]
  while (result.length < n && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, u) => sum + WEIGHTS[u.rarity], 0)
    let r = Math.random() * totalWeight
    for (let i = 0; i < remaining.length; i++) {
      r -= WEIGHTS[remaining[i].rarity]
      if (r <= 0) {
        result.push(remaining[i])
        remaining.splice(i, 1)
        break
      }
    }
  }
  return result
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/upgrades.test.js 2>&1 | tail -15
```

Expected: PASS — all upgrade tests.

- [ ] **Step 5: Run full suite**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/upgrades.js tests/upgrades.test.js && git commit -m "feat: upgrade registry — UPGRADES array, pickUpgrades with rarity weighting"
```

---

## Task 3: Gem System — updateGems (TDD)

**Files:**
- Create: `src/systems/gems.js`
- Create: `tests/systems/gems.test.js`

- [ ] **Step 1: Create `tests/systems/gems.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { updateGems } from '../../src/systems/gems.js'
import { createPlayer, createGem } from '../../src/entities.js'
import { createWeapon } from '../../src/entities.js'

describe('updateGems', () => {
  it('advances bobTimer on all gems each frame', () => {
    const player = createPlayer()
    player.pos = { x: 1000, y: 1000 }
    const gem = createGem(1, 6, '#00ff88', 100, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.1, gameState)
    expect(gem.bobTimer).toBeCloseTo(0.1, 5)
  })

  it('collects gem within range and adds XP to player', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(1)
  })

  it('removes collected gem from entities', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(entities.find(e => e === gem)).toBeUndefined()
  })

  it('does not collect gem out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 500, 500)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(0)
    expect(entities.find(e => e === gem)).toBeDefined()
  })

  it('collects tank gem worth 3 XP', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(3, 8, '#ffd700', 106, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(3)
  })

  it('triggers level-up when xp reaches xpToNext', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 49
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(gameState.state).toBe('levelup')
    expect(gameState.upgradeChoices).toBeDefined()
    expect(gameState.upgradeChoices.length).toBeGreaterThan(0)
  })

  it('increments player level on level-up', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 49
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.level).toBe(2)
  })

  it('carries over excess XP after level-up', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 48
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem = createGem(3, 6, '#00ff88', 105, 100)  // +3 XP, overshoots by 1
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(1)  // 48+3=51, 51-50=1 carries over
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/gems.test.js 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../../src/systems/gems.js'`

- [ ] **Step 3: Create `src/systems/gems.js`**

```js
import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { pickUpgrades } from '../upgrades.js'

export function updateGems(entities, player, dt, gameState) {
  if (!player) return

  // Advance bob timers
  for (const e of entities) {
    if (e.type === 'gem') e.bobTimer += dt
  }

  const gems = entities.filter(e => e.type === 'gem')
  if (gems.length === 0) return

  const hash = createSpatialHash()
  for (const g of gems) shInsert(hash, g)

  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10)

  for (const gem of nearby) {
    const dist = Math.hypot(gem.pos.x - player.pos.x, gem.pos.y - player.pos.y)
    if (dist > player.radius + gem.radius) continue
    const idx = entities.indexOf(gem)
    if (idx !== -1) entities.splice(idx, 1)
    player.xp += gem.value
    if (player.xp >= player.xpToNext) {
      _levelUp(player, gameState)
    }
  }
}

function _levelUp(player, gameState) {
  player.xp -= player.xpToNext
  player.level++
  player.xpToNext = Math.floor(50 * Math.pow(player.level, 1.2))
  gameState.upgradeChoices = pickUpgrades(player, 3)
  gameState.state = 'levelup'
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/gems.test.js 2>&1 | tail -15
```

Expected: PASS — all 8 gem tests.

- [ ] **Step 5: Run full suite**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/systems/gems.js tests/systems/gems.test.js && git commit -m "feat: gem collection system — XP pickup, level-up trigger, bob timer"
```

---

## Task 4: Collision — drop gem on enemy kill

**Files:**
- Modify: `src/systems/collision.js`

No new tests needed — gem drop is a side effect alongside existing weapon drop. The existing collision tests are sufficient.

- [ ] **Step 1: Update `src/systems/collision.js`**

Change the import line at top to add `createGem`:

```js
import { ENEMY_TYPES, createPickup, createGem } from '../entities.js'
```

Add a `_dropGem` function at the bottom of the file:

```js
function _dropGem(enemy, entities) {
  const cfg = ENEMY_TYPES[enemy.enemyType]
  if (!cfg) return
  entities.push(createGem(cfg.gemValue, cfg.gemRadius, cfg.gemColor, enemy.pos.x, enemy.pos.y))
}
```

In `updateCollision`, add `_dropGem(enemy, entities)` call alongside `_rollWeaponDrop` in both kill locations (projectile kill and whip kill):

**Projectile kill block** — change from:
```js
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _rollWeaponDrop(enemy, entities)
        }
```
to:
```js
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _dropGem(enemy, entities)
          _rollWeaponDrop(enemy, entities)
        }
```

**Whip kill block** — change from:
```js
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _rollWeaponDrop(enemy, entities)
        }
```
to:
```js
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _dropGem(enemy, entities)
          _rollWeaponDrop(enemy, entities)
        }
```

- [ ] **Step 2: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/systems/collision.js && git commit -m "feat: drop XP gem on every enemy kill"
```

---

## Task 5: Rendering — draw gems

**Files:**
- Modify: `src/render.js`

No unit tests — visually verified in browser.

- [ ] **Step 1: Update `src/render.js`**

In `renderWorld`, add a `gem` branch to the render loop — place it alongside `pickup`, before drawing the player:

```js
  for (const e of entities) {
    if (e.type === 'enemy') _drawEnemy(ctx, e)
    else if (e.type === 'projectile' && e.active) _drawProjectile(ctx, e)
    else if (e.type === 'pickup') _drawPickup(ctx, e)
    else if (e.type === 'gem') _drawGem(ctx, e)
  }
```

Add `_drawGem` at the end of the file:

```js
function _drawGem(ctx, gem) {
  const yOff = Math.sin(gem.bobTimer * 4) * 3
  const { x, y } = gem.pos
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = gem.color
  ctx.fillStyle = gem.color
  ctx.beginPath()
  ctx.arc(x, y + yOff, gem.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - gem.radius * 0.3, y + yOff - gem.radius * 0.3, gem.radius * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
```

- [ ] **Step 2: Run full suite**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/render.js && git commit -m "feat: render XP gems with bob animation and inner shine"
```

---

## Task 6: HUD — XP bar bottom-center

**Files:**
- Modify: `src/ui/hud.js`

No unit tests — visually verified.

- [ ] **Step 1: Update `src/ui/hud.js`**

Add the XP bar section just before the `// Paused overlay` block, guarded to only show during `playing` and `paused` states. Also shift the weapon inventory up by 36px to avoid overlap with the XP bar.

Change the weapon inventory Y from `canvas.height - 16 - i * 20` to `canvas.height - 52 - i * 20`:

```js
      ctx.fillText(label, 16, canvas.height - 52 - i * 20)
```

Add the XP bar section before `// Paused overlay`:

```js
  // XP bar — bottom-center (playing and paused only)
  if (gameState.state === 'playing' || gameState.state === 'paused') {
    const xpBarW = canvas.width - 32
    const xpBarH = 6
    const xpBarX = 16
    const xpBarY = canvas.height - 14
    const xpRatio = Math.max(0, Math.min(1, player.xp / player.xpToNext))

    ctx.save()
    // Level label
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,215,0,0.7)'
    ctx.fillText(`LVL ${player.level}`, canvas.width / 2, canvas.height - 20)
    // Bar background
    ctx.fillStyle = '#111'
    ctx.fillRect(xpBarX, xpBarY, xpBarW, xpBarH)
    // Bar fill
    ctx.shadowBlur = 8
    ctx.shadowColor = '#ffd700'
    ctx.fillStyle = '#ffd700'
    ctx.fillRect(xpBarX, xpBarY, xpBarW * xpRatio, xpBarH)
    ctx.restore()
  }
```

- [ ] **Step 2: Run full suite**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/hud.js && git commit -m "feat: XP bar bottom-center with level badge in HUD"
```

---

## Task 7: Level-Up Screen UI

**Files:**
- Create: `src/ui/levelUpScreen.js`

No unit tests — visually verified.

- [ ] **Step 1: Create `src/ui/levelUpScreen.js`**

```js
const RARITY_COLORS = { common: '#888888', rare: '#00ffc8', epic: '#ffd700' }
const CARD_W = 180
const CARD_H = 220
const CARD_GAP = 24

export function drawLevelUpScreen(ctx, canvas, player, gameState) {
  const choices = gameState.upgradeChoices || []

  // Dark overlay
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  // Title
  ctx.save()
  ctx.font = 'bold 40px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#ffd700'
  ctx.fillStyle = '#ffd700'
  ctx.fillText('LEVEL UP!', cx, cy - 130)
  ctx.font = '16px monospace'
  ctx.shadowBlur = 10
  ctx.fillStyle = 'rgba(255,215,0,0.6)'
  ctx.fillText(`Level ${player.level}`, cx, cy - 100)
  ctx.restore()

  // Cards
  const totalW = choices.length * CARD_W + (choices.length - 1) * CARD_GAP
  const startX = cx - totalW / 2

  gameState.cardRects = []

  choices.forEach((upgrade, i) => {
    const x = startX + i * (CARD_W + CARD_GAP)
    const y = cy - 80
    const color = RARITY_COLORS[upgrade.rarity]
    const isEpic = upgrade.rarity === 'epic'
    const isRare = upgrade.rarity === 'rare'

    gameState.cardRects.push({ x, y, w: CARD_W, h: CARD_H })

    ctx.save()
    // Card background
    ctx.fillStyle = 'rgba(10,10,20,0.95)'
    ctx.strokeStyle = color
    ctx.lineWidth = isEpic ? 2 : 1
    if (isEpic || isRare) {
      ctx.shadowBlur = isEpic ? 24 : 12
      ctx.shadowColor = color
    }
    ctx.beginPath()
    ctx.roundRect(x, y, CARD_W, CARD_H, 6)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.save()
    // Icon
    ctx.font = '36px serif'
    ctx.textAlign = 'center'
    ctx.fillText(upgrade.icon, x + CARD_W / 2, y + 52)

    // Hotkey number
    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText(`[${i + 1}]`, x + CARD_W / 2, y + 20)

    // Label
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = color
    ctx.shadowBlur = isEpic || isRare ? 8 : 0
    ctx.shadowColor = color
    ctx.fillText(upgrade.label, x + CARD_W / 2, y + 90)

    // Description
    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.shadowBlur = 0
    // Word-wrap description to fit card width
    _wrapText(ctx, upgrade.desc, x + CARD_W / 2, y + 115, CARD_W - 20, 16)

    // Rarity badge
    ctx.font = 'bold 9px monospace'
    ctx.fillStyle = color
    ctx.shadowBlur = 0
    ctx.fillText(upgrade.rarity.toUpperCase(), x + CARD_W / 2, y + CARD_H - 14)

    ctx.restore()
  })

  // Hint
  ctx.save()
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillText('Press 1 · 2 · 3 or click a card', cx, cy + 160)
  ctx.restore()
}

function _wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, y)
      line = word
      y += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, cx, y)
}
```

- [ ] **Step 2: Run full suite**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/levelUpScreen.js && git commit -m "feat: level-up screen — rarity cards with glow, 1/2/3 hotkeys hint"
```

---

## Task 8: Main Loop — wire everything together

**Files:**
- Modify: `src/main.js`

No unit tests — integration verified in browser.

- [ ] **Step 1: Replace `src/main.js` with the complete wired version**

```js
import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, createWeapon, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { updatePickup } from './systems/pickup.js'
import { updateGems } from './systems/gems.js'
import { renderWorld } from './render.js'
import { drawHud } from './ui/hud.js'
import { drawStartScreen } from './ui/startScreen.js'
import { drawLevelUpScreen } from './ui/levelUpScreen.js'

// --- Canvas ---
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

function resize() {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
}
resize()
window.addEventListener('resize', resize)

// --- Input ---
const input = { up: false, down: false, left: false, right: false }
const keyMap = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
}

document.addEventListener('keydown', e => {
  if (keyMap[e.code]) { input[keyMap[e.code]] = true; e.preventDefault() }

  // Start screen navigation
  if (gameState.state === 'start') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      gameState.selectedWeapon = gameState.selectedWeapon === 'whip' ? 'wand' : 'whip'
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      gameState.selectedWeapon = gameState.selectedWeapon === 'wand' ? 'whip' : 'wand'
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      initGame(gameState.selectedWeapon)
    }
    return
  }

  // Level-up card selection
  if (gameState.state === 'levelup') {
    const choices = gameState.upgradeChoices || []
    let picked = null
    if (e.code === 'Digit1' && choices[0]) picked = choices[0]
    if (e.code === 'Digit2' && choices[1]) picked = choices[1]
    if (e.code === 'Digit3' && choices[2]) picked = choices[2]
    if (picked) _applyUpgrade(picked)
    return
  }

  if (e.code === 'KeyP') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
  }
  if (e.code === 'KeyR' && gameState.state === 'dead') {
    gameState.state = 'start'
    gameState.selectedWeapon = 'wand'
  }
})

document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false
})

canvas.addEventListener('click', e => {
  if (gameState.state !== 'levelup') return
  const rects = gameState.cardRects || []
  const choices = gameState.upgradeChoices || []
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (e.clientX >= r.x && e.clientX <= r.x + r.w &&
        e.clientY >= r.y && e.clientY <= r.y + r.h) {
      if (choices[i]) _applyUpgrade(choices[i])
      break
    }
  }
})

function _applyUpgrade(upgrade) {
  const player = entities.find(e => e.type === 'player')
  if (player) upgrade.apply(player)
  gameState.upgradeChoices = null
  gameState.cardRects = null
  gameState.state = 'playing'
}

// --- Game state ---
let entities = []
let gameState = { state: 'start', selectedWeapon: 'wand', time: 0, kills: 0 }
let spawnerState = {}
let camera = { x: 0, y: 0 }

function initGame(selectedWeapon) {
  const player = createPlayer()
  player.weapons = [createWeapon(selectedWeapon)]
  const pool = initProjectilePool()
  entities     = [player, ...pool]
  gameState    = { state: 'playing', selectedWeapon, time: 0, kills: 0 }
  spawnerState = createSpawnerState()
  camera       = { x: 0, y: 0 }
}

// --- Camera ---
function updateCamera(player) {
  camera.x = Math.max(0, Math.min(player.pos.x - canvas.width  / 2, WORLD_W - canvas.width))
  camera.y = Math.max(0, Math.min(player.pos.y - canvas.height / 2, WORLD_H - canvas.height))
}

// --- Game Loop ---
let lastTime = null

function loop(timestamp) {
  requestAnimationFrame(loop)

  const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05)
  lastTime = timestamp

  if (gameState.state === 'start') {
    drawStartScreen(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'levelup') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera)
    drawHud(ctx, canvas, player, gameState)
    drawLevelUpScreen(ctx, canvas, player, gameState)
    return
  }

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    updateMovement(entities, dt, input)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState)
    updateSpawner(entities, spawnerState, dt, gameState.time)
    if (player) {
      updatePickup(entities, player, dt)
      updateGems(entities, player, dt, gameState)
      if (player.regenRate > 0) {
        player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt)
      }
      updateCamera(player)
    }

    if (player && player.hp <= 0) {
      player.hp = 0
      gameState.state = 'dead'
    }
  }

  const player = entities.find(e => e.type === 'player')
  renderWorld(ctx, canvas, entities, camera)
  drawHud(ctx, canvas, player, gameState)
}

requestAnimationFrame(loop)
```

- [ ] **Step 2: Run full suite**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -12
```

Expected: PASS — all tests.

- [ ] **Step 3: Browser smoke test**

Open `http://localhost:3000` and verify:
- [ ] Start screen appears, weapon selection works
- [ ] Enemies drop small green orbs (chasers) and gold orbs (tanks) on death
- [ ] Walking over gems increases the XP bar at the bottom of the screen
- [ ] Level number shown above the XP bar ("LVL 1")
- [ ] On level-up: game pauses, dark overlay, 3 upgrade cards appear with rarity glow
- [ ] Pressing 1/2/3 picks a card and resumes game
- [ ] Clicking a card picks it and resumes game
- [ ] Upgrade is applied (e.g. speed boost makes player visibly faster)
- [ ] HP regen upgrade causes HP bar to slowly refill
- [ ] P still pauses/unpauses
- [ ] R on death returns to start screen

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/main.js && git commit -m "feat: wire XP gems, level-up screen, upgrade selection into main loop"
```

---

## Self-Review

**Spec coverage:**
- ✅ XP gems drop on every kill (Task 4 — `_dropGem`)
- ✅ Chaser drops value=1, tank drops value=3 (Task 1 — `ENEMY_TYPES`)
- ✅ `createGem` factory (Task 1)
- ✅ Player `xp/level/xpToNext/regenRate` fields (Task 1)
- ✅ `updateGems` — collect, XP add, level-up trigger, bob timer (Task 3)
- ✅ XP curve `Math.floor(50 * Math.pow(level, 1.2))` (Task 3)
- ✅ Excess XP carried over after level-up (Task 3)
- ✅ `UPGRADES` array — all 11 upgrades (Task 2)
- ✅ `pickUpgrades` — eligibility filter, weighted sample, small pool edge case (Task 2)
- ✅ XP bar bottom-center with LVL badge (Task 6)
- ✅ Level-up screen — Option C cards with rarity glow (Task 7)
- ✅ 1/2/3 keyboard input for card selection (Task 8)
- ✅ Mouse click hit-test using `gameState.cardRects` (Task 8)
- ✅ HP regen tick in main loop (Task 8)
- ✅ Gem rendering with bob animation (Task 5)
- ✅ Weapon inventory shifted up to avoid XP bar overlap (Task 6)

**Placeholder scan:** None found. All code is complete.

**Type consistency:**
- `createGem(value, radius, color, x, y)` defined Task 1, called Task 4 ✅
- `updateGems(entities, player, dt, gameState)` defined Task 3, called Task 8 ✅
- `pickUpgrades(player, n)` defined Task 2, called Task 3 ✅
- `drawLevelUpScreen(ctx, canvas, player, gameState)` defined Task 7, called Task 8 ✅
- `gameState.cardRects` set by Task 7, read by Task 8 click handler ✅
- `gameState.upgradeChoices` set by Task 3 `_levelUp`, read by Task 7 and Task 8 ✅
- `player.regenRate` defined Task 1, incremented by upgrade Task 2, ticked Task 8 ✅
- `upgrade.apply(player)` called Task 8 `_applyUpgrade`, defined on all upgrades Task 2 ✅
