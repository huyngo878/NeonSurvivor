# Phase 4 — Weapons & Multi-Weapon System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the whip weapon (180° melee arc sweep), a start screen for weapon selection, weapon drops from enemies (5% chance), and full multi-weapon stacking support.

**Architecture:** The existing `player.weapons` array already handles multiple weapons; `weapons.js` gains type dispatching. The whip introduces an `active` time-window for arc collision and a `facing` direction on the player. A new `pickup.js` system handles weapon orb collection. The start screen is a pure canvas UI driven by `gameState.state === 'start'`.

**Tech Stack:** Vanilla JS ES modules, HTML5 Canvas, Vitest.

---

## File Map

| File | Change |
|------|--------|
| `src/entities.js` | Add `createWeapon(type)`, `createPickup(weaponType, x, y)`, `facing:{x,y}` to player, no default weapons on player (weapons array starts empty — initGame passes the chosen weapon) |
| `src/systems/movement.js` | Update `player.facing` when player moves |
| `src/systems/weapons.js` | Dispatch by `weapon.type`: wand unchanged, whip active-window logic |
| `src/systems/collision.js` | Whip arc cone hit detection, weapon drop roll on enemy kill |
| `src/systems/pickup.js` | New — pickup proximity check, add weapon to player, remove pickup |
| `src/ui/startScreen.js` | New — canvas weapon select UI |
| `src/render.js` | Draw whip arc, draw pickup orbs with bob |
| `src/ui/hud.js` | Weapon inventory icons bottom-left |
| `src/main.js` | `'start'` state routing, weapon selection keys, `initGame(weaponType)`, `updatePickup` call |
| `tests/entities.test.js` | Add `createWeapon` and `createPickup` tests |
| `tests/systems/weapons.test.js` | Add whip timer and arc activation tests |
| `tests/systems/pickup.test.js` | New — proximity, weapon add, no-duplicate |
| `tests/systems/movement.test.js` | Add `player.facing` update tests |

---

## Task 1: Entity Factories — createWeapon, createPickup, facing

**Files:**
- Modify: `src/entities.js`
- Modify: `tests/entities.test.js`

- [ ] **Step 1: Add tests for `createWeapon` and `createPickup` to `tests/entities.test.js`**

Append after the existing tests:

```js
import { createWeapon, createPickup } from '../src/entities.js'

describe('createWeapon', () => {
  it('creates wand with correct shape', () => {
    const w = createWeapon('wand')
    expect(w.type).toBe('wand')
    expect(w.cooldown).toBe(0.8)
    expect(w.timer).toBe(0)
    expect(w.damage).toBe(20)
    expect(w.range).toBe(400)
  })

  it('creates whip with correct shape', () => {
    const w = createWeapon('whip')
    expect(w.type).toBe('whip')
    expect(w.cooldown).toBe(0.6)
    expect(w.timer).toBe(0)
    expect(w.damage).toBe(15)
    expect(w.range).toBe(120)
    expect(w.sweepAngle).toBe(Math.PI)
    expect(w.active).toBe(false)
    expect(w.activeTimer).toBe(0)
    expect(w.activeDuration).toBe(0.12)
    expect(w.hitIds).toBeInstanceOf(Set)
  })

  it('throws on unknown weapon type', () => {
    expect(() => createWeapon('laser')).toThrow('Unknown weapon type: laser')
  })
})

describe('createPickup', () => {
  it('creates a weapon pickup with correct shape', () => {
    const p = createPickup('wand', 100, 200)
    expect(p.type).toBe('pickup')
    expect(p.pickupType).toBe('weapon')
    expect(p.weaponType).toBe('wand')
    expect(p.pos).toEqual({ x: 100, y: 200 })
    expect(p.radius).toBe(10)
    expect(p.bobTimer).toBe(0)
  })
})

describe('createPlayer — facing', () => {
  it('has default facing direction right', () => {
    const p = createPlayer()
    expect(p.facing).toEqual({ x: 1, y: 0 })
  })

  it('starts with empty weapons array', () => {
    const p = createPlayer()
    expect(p.weapons).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test tests/entities.test.js
```

Expected: FAIL — `createWeapon is not a function`

- [ ] **Step 3: Update `src/entities.js`**

Replace the entire file:

```js
import { WORLD_W, WORLD_H, POOL_SIZE } from './constants.js'

export const ENEMY_TYPES = {
  chaser: { speed: 120, hp: 30,  maxHp: 30,  radius: 8,  color: '#ff0080', damage: 10 },
  tank:   { speed: 55,  hp: 120, maxHp: 120, radius: 14, color: '#ff4400', damage: 20 },
}

const WEAPON_CONFIGS = {
  wand: { type: 'wand', cooldown: 0.8, damage: 20, range: 400 },
  whip: {
    type: 'whip', cooldown: 0.6, damage: 15, range: 120,
    sweepAngle: Math.PI, activeDuration: 0.12,
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

- [ ] **Step 4: Fix the existing `createPlayer` test — it now expects `weapons` to be empty**

In `tests/entities.test.js`, find the test `'has exactly one wand weapon with correct config'` and replace it:

```js
  it('starts with empty weapons array', () => {
    const p = createPlayer()
    expect(p.weapons).toHaveLength(0)
  })
```

Also update the import line at the top of the test file to include the new exports:

```js
import { createPlayer, createEnemy, initProjectilePool, ENEMY_TYPES, createWeapon, createPickup } from '../src/entities.js'
```

Remove the duplicate `describe('createPlayer — facing', ...)` block you appended (since it's now covered by the updated test above — keep one or the other, not both). The cleanest result is:

```js
describe('createPlayer', () => {
  it('spawns at world center with correct defaults', () => {
    const p = createPlayer()
    expect(p.type).toBe('player')
    expect(p.pos.x).toBe(WORLD_W / 2)
    expect(p.pos.y).toBe(WORLD_H / 2)
    expect(p.hp).toBe(100)
    expect(p.maxHp).toBe(100)
    expect(p.speed).toBe(200)
    expect(p.iframes).toBe(0)
  })

  it('starts with empty weapons array and default facing right', () => {
    const p = createPlayer()
    expect(p.weapons).toHaveLength(0)
    expect(p.facing).toEqual({ x: 1, y: 0 })
  })
})
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
npm test tests/entities.test.js
```

Expected: PASS — all entity tests including new `createWeapon`, `createPickup` tests.

- [ ] **Step 6: Run full suite — verify no regressions**

```bash
npm test
```

Expected: PASS — all tests. Note: the weapons tests may fail because `createPlayer()` no longer has a default weapon — that's expected and will be fixed in Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/entities.js tests/entities.test.js
git commit -m "feat: createWeapon, createPickup factories; player facing and empty weapons"
```

---

## Task 2: Movement — update player.facing

**Files:**
- Modify: `src/systems/movement.js`
- Modify: `tests/systems/movement.test.js`

- [ ] **Step 1: Add `facing` tests to `tests/systems/movement.test.js`**

Append after the existing tests:

```js
describe('updateMovement — player facing', () => {
  it('updates facing when moving right', () => {
    const player = createPlayer()
    updateMovement([player], 0.1, { ...noInput, right: true })
    expect(player.facing.x).toBeCloseTo(1, 5)
    expect(player.facing.y).toBeCloseTo(0, 5)
  })

  it('updates facing when moving down-left (diagonal)', () => {
    const player = createPlayer()
    updateMovement([player], 0.1, { up: false, down: true, left: true, right: false })
    const len = Math.hypot(player.facing.x, player.facing.y)
    expect(len).toBeCloseTo(1, 5)
    expect(player.facing.x).toBeLessThan(0)
    expect(player.facing.y).toBeGreaterThan(0)
  })

  it('does not update facing when stationary', () => {
    const player = createPlayer()
    player.facing = { x: 0.5, y: 0.5 }
    updateMovement([player], 0.1, noInput)
    expect(player.facing.x).toBe(0.5)
    expect(player.facing.y).toBe(0.5)
  })
})
```

- [ ] **Step 2: Run — verify new tests fail**

```bash
npm test tests/systems/movement.test.js
```

Expected: FAIL — `facing` not updated (no assertion on `player.facing` before this task)

- [ ] **Step 3: Update `_movePlayer` in `src/systems/movement.js`**

Add facing update inside the `if (len > 0)` block:

```js
function _movePlayer(player, dt, input) {
  let dx = 0, dy = 0
  if (input.up)    dy -= 1
  if (input.down)  dy += 1
  if (input.left)  dx -= 1
  if (input.right) dx += 1
  const len = Math.hypot(dx, dy)
  if (len > 0) {
    player.pos.x += (dx / len) * player.speed * dt
    player.pos.y += (dy / len) * player.speed * dt
    player.pos.x = Math.max(0, Math.min(WORLD_W, player.pos.x))
    player.pos.y = Math.max(0, Math.min(WORLD_H, player.pos.y))
    player.facing.x = dx / len
    player.facing.y = dy / len
  }
  if (player.iframes > 0) player.iframes = Math.max(0, player.iframes - dt)
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test tests/systems/movement.test.js
```

Expected: PASS — all 16 tests (13 existing + 3 new facing tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/movement.js tests/systems/movement.test.js
git commit -m "feat: update player.facing direction on movement"
```

---

## Task 3: Weapons System — whip dispatch

**Files:**
- Modify: `src/systems/weapons.js`
- Modify: `tests/systems/weapons.test.js`

- [ ] **Step 1: Add whip tests to `tests/systems/weapons.test.js`**

Append after the existing tests:

```js
import { createWeapon } from '../../src/entities.js'

describe('updateWeapons — wand with explicit createWeapon', () => {
  it('wand still fires when added via createWeapon', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    expect(pool.find(p => p.active)).toBeDefined()
  })
})

describe('updateWeapons — whip', () => {
  it('whip timer ticks down by dt', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0.5
    updateWeapons([player], 0.1)
    expect(player.weapons[0].timer).toBeCloseTo(0.4, 5)
  })

  it('whip becomes active when timer <= 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].active).toBe(true)
  })

  it('whip resets timer to cooldown when it fires', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].timer).toBe(player.weapons[0].cooldown)
  })

  it('whip activeTimer counts down while active', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    updateWeapons([player], 0.05)
    expect(player.weapons[0].activeTimer).toBeCloseTo(0.05, 5)
  })

  it('whip becomes inactive when activeTimer reaches 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.01
    updateWeapons([player], 0.05)
    expect(player.weapons[0].active).toBe(false)
  })

  it('whip clears hitIds on new swing', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].hitIds.add(99)
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].hitIds.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run — verify new tests fail**

```bash
npm test tests/systems/weapons.test.js
```

Expected: FAIL — whip dispatch not implemented yet, and existing wand tests may fail because `createPlayer()` now has empty `weapons`.

- [ ] **Step 3: Replace `src/systems/weapons.js`**

```js
import { PROJ_SPEED } from '../constants.js'

export function updateWeapons(entities, dt) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile')

  for (const weapon of player.weapons) {
    if (weapon.type === 'wand') {
      _tickWand(weapon, dt, player, enemies, projectiles)
    } else if (weapon.type === 'whip') {
      _tickWhip(weapon, dt)
    }
  }
}

function _tickWand(weapon, dt, player, enemies, projectiles) {
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  let nearest = null
  let nearestDist = weapon.range
  for (const enemy of enemies) {
    const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
    if (dist < nearestDist) { nearest = enemy; nearestDist = dist }
  }
  if (!nearest) return

  const proj = projectiles.find(p => !p.active)
  if (!proj) return

  const dx = nearest.pos.x - player.pos.x
  const dy = nearest.pos.y - player.pos.y
  const dist = Math.hypot(dx, dy)
  proj.active = true
  proj.pos.x = player.pos.x
  proj.pos.y = player.pos.y
  proj.vel.x = (dx / dist) * PROJ_SPEED
  proj.vel.y = (dy / dist) * PROJ_SPEED
  proj.age = 0
  proj.damage = weapon.damage
}

function _tickWhip(weapon, dt) {
  if (weapon.active) {
    weapon.activeTimer -= dt
    if (weapon.activeTimer <= 0) weapon.active = false
    return
  }
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown
  weapon.active = true
  weapon.activeTimer = weapon.activeDuration
  weapon.hitIds = new Set()
}
```

- [ ] **Step 4: Fix existing wand tests — they use `createPlayer()` which now has empty weapons**

In `tests/systems/weapons.test.js`, the existing 9 wand tests use `createPlayer()` and rely on `player.weapons[0]` being the wand. Add `player.weapons = [createWeapon('wand')]` after each `createPlayer()` call in the existing describe block, OR simply add the line once in a `beforeEach`. The simplest fix — add `import { createWeapon } from '../../src/entities.js'` (if not already there) and add `player.weapons = [createWeapon('wand')]` right after each `const player = createPlayer()` in the existing 9 tests.

The cleanest approach: replace the import line at the top of the test to include `createWeapon`, then add `player.weapons = [createWeapon('wand')]` after each `const player = createPlayer()` in the original 9 tests.

- [ ] **Step 5: Run tests — verify all pass**

```bash
npm test tests/systems/weapons.test.js
```

Expected: PASS — all tests (9 original wand + 7 new whip tests).

- [ ] **Step 6: Run full suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 7: Commit**

```bash
git add src/systems/weapons.js tests/systems/weapons.test.js
git commit -m "feat: whip weapon dispatch — active-window timer, hitIds reset"
```

---

## Task 4: Collision — whip arc hit detection + weapon drops

**Files:**
- Modify: `src/systems/collision.js`
- Modify: `tests/systems/collision.test.js`

- [ ] **Step 1: Add whip and drop tests to `tests/systems/collision.test.js`**

Append after the existing hit detection tests:

```js
import { createWeapon } from '../../src/entities.js'

describe('updateCollision — whip arc', () => {
  it('damages enemy directly in front of player (within arc)', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }   // facing right
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    // Enemy directly to the right, within range 120
    const enemy = createEnemy('chaser', 550, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBeLessThan(enemy.maxHp)
  })

  it('does not damage enemy behind player (outside arc)', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }   // facing right
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    // Enemy directly to the left (180° opposite facing) — outside the 180° arc
    const enemy = createEnemy('chaser', 450, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(enemy.maxHp)
  })

  it('does not damage same enemy twice in one swing', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    const enemy = createEnemy('chaser', 550, 500)
    enemy.hp = 100  // high HP so it survives first hit
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    const hpAfterFirst = enemy.hp
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(hpAfterFirst)  // no second hit
  })

  it('does not damage enemy when whip is inactive', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = false
    const enemy = createEnemy('chaser', 550, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(enemy.maxHp)
  })
})
```

- [ ] **Step 2: Run — verify new tests fail**

```bash
npm test tests/systems/collision.test.js
```

Expected: FAIL — whip arc not implemented.

- [ ] **Step 3: Update `src/systems/collision.js` — add whip detection and weapon drop**

Replace the entire file:

```js
import { CELL_SIZE } from '../constants.js'
import { ENEMY_TYPES, createPickup } from '../entities.js'

const MAX_ENEMY_RADIUS = Math.max(...Object.values(ENEMY_TYPES).map(e => e.radius))

// --- Spatial Hash ---

export function createSpatialHash() {
  return new Map()
}

export function shInsert(hash, entity) {
  const key = cellKey(Math.floor(entity.pos.x / CELL_SIZE), Math.floor(entity.pos.y / CELL_SIZE))
  if (!hash.has(key)) hash.set(key, [])
  hash.get(key).push(entity)
}

export function shQuery(hash, x, y, radius) {
  const results = []
  const minCx = Math.floor((x - radius) / CELL_SIZE)
  const maxCx = Math.floor((x + radius) / CELL_SIZE)
  const minCy = Math.floor((y - radius) / CELL_SIZE)
  const maxCy = Math.floor((y + radius) / CELL_SIZE)
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const bucket = hash.get(cellKey(cx, cy))
      if (bucket) results.push(...bucket)
    }
  }
  return results
}

function cellKey(cx, cy) { return `${cx},${cy}` }

// --- Hit Detection ---

export function updateCollision(entities, gameState) {
  const player = entities.find(e => e.type === 'player')
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile' && e.active)

  const hash = createSpatialHash()
  for (const enemy of enemies) shInsert(hash, enemy)

  // Projectile vs Enemy
  for (const proj of projectiles) {
    const candidates = shQuery(hash, proj.pos.x, proj.pos.y, proj.radius + MAX_ENEMY_RADIUS)
    for (const enemy of candidates) {
      const dist = Math.hypot(proj.pos.x - enemy.pos.x, proj.pos.y - enemy.pos.y)
      if (dist < proj.radius + enemy.radius) {
        enemy.hp -= proj.damage
        proj.active = false
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _rollWeaponDrop(enemy, entities)
        }
        break
      }
    }
  }

  // Whip arc vs Enemy
  if (player) {
    for (const weapon of player.weapons) {
      if (weapon.type !== 'whip' || !weapon.active) continue
      const facingAngle = Math.atan2(player.facing.y, player.facing.x)
      const candidates = shQuery(hash, player.pos.x, player.pos.y, weapon.range + MAX_ENEMY_RADIUS)
      for (const enemy of candidates) {
        if (weapon.hitIds.has(enemy.id)) continue
        const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
        if (dist > weapon.range + enemy.radius) continue
        const angleToEnemy = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x)
        let diff = angleToEnemy - facingAngle
        // Normalize to [-PI, PI]
        while (diff > Math.PI)  diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        if (Math.abs(diff) > weapon.sweepAngle / 2) continue
        enemy.hp -= weapon.damage
        weapon.hitIds.add(enemy.id)
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _rollWeaponDrop(enemy, entities)
        }
      }
    }
  }

  // Enemy vs Player
  if (player && player.iframes <= 0) {
    const nearby = shQuery(hash, player.pos.x, player.pos.y, MAX_ENEMY_RADIUS + player.radius)
    for (const enemy of nearby) {
      const dist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y)
      if (dist < enemy.radius + player.radius) {
        player.hp -= enemy.damage
        player.iframes = 0.5
        break
      }
    }
  }

  // Remove dead entities
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].dead) entities.splice(i, 1)
  }
}

function _rollWeaponDrop(enemy, entities) {
  if (Math.random() >= 0.05) return
  const dropType = Math.random() < 0.5 ? 'wand' : 'whip'
  entities.push(createPickup(dropType, enemy.pos.x, enemy.pos.y))
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test tests/systems/collision.test.js
```

Expected: PASS — all 13 tests (9 original + 4 new whip tests).

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
git add src/systems/collision.js tests/systems/collision.test.js
git commit -m "feat: whip arc collision, weapon drop on enemy kill"
```

---

## Task 5: Pickup System (TDD)

**Files:**
- Create: `src/systems/pickup.js`
- Create: `tests/systems/pickup.test.js`

- [ ] **Step 1: Create `tests/systems/pickup.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { updatePickup } from '../../src/systems/pickup.js'
import { createPlayer, createPickup, createWeapon, initProjectilePool } from '../../src/entities.js'

describe('updatePickup', () => {
  it('adds weapon to player when pickup is within range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('wand', 105, 100)  // dist=5, < player.radius(12) + pickup.radius(10)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(1)
    expect(player.weapons[0].type).toBe('wand')
  })

  it('removes pickup from entities after collection', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('wand', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === pickup)).toBeUndefined()
  })

  it('does not add duplicate weapon type', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.weapons = [createWeapon('wand')]  // already has wand
    const pickup = createPickup('wand', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(1)  // still just one wand
  })

  it('removes pickup even when weapon is duplicate', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.weapons = [createWeapon('wand')]
    const pickup = createPickup('wand', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === pickup)).toBeUndefined()
  })

  it('does not collect pickup out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('whip', 500, 500)  // far away
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(0)
    expect(entities.find(e => e === pickup)).toBeDefined()
  })

  it('advances bobTimer each frame', () => {
    const player = createPlayer()
    player.pos = { x: 1000, y: 1000 }  // far from pickup
    const pickup = createPickup('whip', 100, 100)
    const entities = [player, pickup]
    updatePickup(entities, player, 0.1)
    expect(pickup.bobTimer).toBeCloseTo(0.1, 5)
  })

  it('can collect whip pickup', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('whip', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons[0].type).toBe('whip')
    expect(player.weapons[0].hitIds).toBeInstanceOf(Set)
  })
})
```

- [ ] **Step 2: Run — verify tests fail**

```bash
npm test tests/systems/pickup.test.js
```

Expected: FAIL — `Cannot find module '../../src/systems/pickup.js'`

- [ ] **Step 3: Create `src/systems/pickup.js`**

```js
import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { createWeapon } from '../entities.js'

export function updatePickup(entities, player, dt) {
  if (!player) return

  // Advance bob timers
  for (const e of entities) {
    if (e.type === 'pickup') e.bobTimer += dt
  }

  const pickups = entities.filter(e => e.type === 'pickup')
  if (pickups.length === 0) return

  const hash = createSpatialHash()
  for (const p of pickups) shInsert(hash, p)

  const pickupRadius = player.radius + 10
  const nearby = shQuery(hash, player.pos.x, player.pos.y, pickupRadius)

  for (const pickup of nearby) {
    const dist = Math.hypot(pickup.pos.x - player.pos.x, pickup.pos.y - player.pos.y)
    if (dist > player.radius + pickup.radius) continue
    // Remove pickup from entities
    const idx = entities.indexOf(pickup)
    if (idx !== -1) entities.splice(idx, 1)
    // Add weapon if not already owned
    if (pickup.pickupType === 'weapon') {
      const alreadyOwned = player.weapons.some(w => w.type === pickup.weaponType)
      if (!alreadyOwned) player.weapons.push(createWeapon(pickup.weaponType))
    }
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test tests/systems/pickup.test.js
```

Expected: PASS — all 7 tests.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
git add src/systems/pickup.js tests/systems/pickup.test.js
git commit -m "feat: pickup system — weapon orb collection, no duplicates, bob timer"
```

---

## Task 6: Rendering — whip arc and pickup orbs

**Files:**
- Modify: `src/render.js`

No unit tests — visually verified in browser.

- [ ] **Step 1: Replace `src/render.js`**

```js
export function renderWorld(ctx, canvas, entities, camera) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  for (const e of entities) {
    if (e.type === 'enemy') _drawEnemy(ctx, e)
    else if (e.type === 'projectile' && e.active) _drawProjectile(ctx, e)
    else if (e.type === 'pickup') _drawPickup(ctx, e)
  }

  const player = entities.find(e => e.type === 'player')
  if (player) _drawPlayer(ctx, player)

  ctx.restore()
}

function _drawPlayer(ctx, player) {
  const { x, y } = player.pos
  ctx.save()
  ctx.shadowBlur = 20
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = player.iframes > 0 ? 'rgba(0,255,200,0.3)' : '#00ffc8'
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()

  // Whip arc overlay
  for (const weapon of player.weapons) {
    if (weapon.type === 'whip' && weapon.active) {
      const angle = Math.atan2(player.facing.y, player.facing.x)
      ctx.save()
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.shadowBlur = 15
      ctx.shadowColor = '#ffd700'
      ctx.globalAlpha = weapon.activeTimer / weapon.activeDuration
      ctx.beginPath()
      ctx.arc(x, y, weapon.range, angle - Math.PI / 2, angle + Math.PI / 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  ctx.restore()
}

function _drawEnemy(ctx, enemy) {
  const { x, y } = enemy.pos
  ctx.save()
  ctx.shadowBlur = 15
  ctx.shadowColor = enemy.color
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.arc(x, y, enemy.radius, 0, Math.PI * 2)
  ctx.fill()
  if (enemy.hp < enemy.maxHp) {
    const bw = enemy.radius * 2
    ctx.shadowBlur = 0
    ctx.fillStyle = '#222'
    ctx.fillRect(x - enemy.radius, y - enemy.radius - 8, bw, 4)
    ctx.fillStyle = enemy.color
    ctx.fillRect(x - enemy.radius, y - enemy.radius - 8, bw * (enemy.hp / enemy.maxHp), 4)
  }
  ctx.restore()
}

function _drawProjectile(ctx, proj) {
  const { x, y } = proj.pos
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, proj.radius, 0, Math.PI * 2)
  ctx.fill()
  const speed = Math.hypot(proj.vel.x, proj.vel.y)
  if (speed > 0) {
    const nx = proj.vel.x / speed
    const ny = proj.vel.y / speed
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(x - nx * 8, y - ny * 8, proj.radius * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.arc(x - nx * 16, y - ny * 16, proj.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function _drawPickup(ctx, pickup) {
  const color = pickup.weaponType === 'whip' ? '#ffd700' : '#00ffc8'
  const yOff = Math.sin(pickup.bobTimer * 3) * 4
  const { x, y } = pickup.pos
  ctx.save()
  ctx.shadowBlur = 16
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y + yOff, pickup.radius, 0, Math.PI * 2)
  ctx.fill()
  // Inner shine
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - 3, y + yOff - 3, pickup.radius * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
git add src/render.js
git commit -m "feat: render whip arc and pickup orbs with bob animation"
```

---

## Task 7: HUD — weapon inventory

**Files:**
- Modify: `src/ui/hud.js`

No unit tests.

- [ ] **Step 1: Add weapon inventory to `drawHud` in `src/ui/hud.js`**

Add after the kill count section (before the paused overlay block):

```js
  // Weapon inventory — bottom-left
  if (player.weapons.length > 0) {
    ctx.save()
    ctx.font = '13px monospace'
    ctx.textAlign = 'left'
    player.weapons.forEach((weapon, i) => {
      const color = weapon.type === 'whip' ? '#ffd700' : '#00ffc8'
      const label = weapon.type === 'whip' ? 'WHIP' : 'WAND'
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.fillStyle = color
      ctx.fillText(label, 16, canvas.height - 16 - i * 20)
    })
    ctx.restore()
  }
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
git add src/ui/hud.js
git commit -m "feat: HUD weapon inventory icons bottom-left"
```

---

## Task 8: Start Screen

**Files:**
- Create: `src/ui/startScreen.js`

No unit tests — visually verified.

- [ ] **Step 1: Create `src/ui/startScreen.js`**

```js
export function drawStartScreen(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  // Title
  ctx.save()
  ctx.font = 'bold 52px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText('NEON SURVIVE', cx, cy - 120)
  ctx.restore()

  // Subtitle
  ctx.save()
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,255,200,0.5)'
  ctx.fillText('Choose your starting weapon', cx, cy - 75)
  ctx.restore()

  const cardW = 200, cardH = 160, gap = 40
  const totalW = cardW * 2 + gap
  const startX = cx - totalW / 2

  const weapons = [
    {
      type: 'wand',
      label: 'MAGIC WAND',
      color: '#00ffc8',
      stats: 'Cooldown: 0.8s\nDamage: 20\nRange: 400px',
      desc: 'Ranged — fires at nearest enemy',
    },
    {
      type: 'whip',
      label: 'WHIP',
      color: '#ffd700',
      stats: 'Cooldown: 0.6s\nDamage: 15\nRange: 120px',
      desc: 'Melee — 180° arc sweep',
    },
  ]

  weapons.forEach((w, i) => {
    const x = startX + i * (cardW + gap)
    const y = cy - 40
    const selected = gameState.selectedWeapon === w.type

    ctx.save()
    // Card background
    ctx.fillStyle = selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'
    ctx.strokeStyle = w.color
    ctx.lineWidth = selected ? 2 : 1
    ctx.globalAlpha = selected ? 1 : 0.45
    if (selected) {
      ctx.shadowBlur = 20
      ctx.shadowColor = w.color
    }
    ctx.beginPath()
    ctx.roundRect(x, y, cardW, cardH, 6)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = selected ? 1 : 0.45
    // Weapon label
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = w.color
    ctx.shadowBlur = selected ? 10 : 0
    ctx.shadowColor = w.color
    ctx.fillText(w.label, x + cardW / 2, y + 30)

    // Stats
    ctx.font = '12px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.shadowBlur = 0
    w.stats.split('\n').forEach((line, li) => {
      ctx.fillText(line, x + cardW / 2, y + 60 + li * 18)
    })

    // Desc
    ctx.font = '11px monospace'
    ctx.fillStyle = w.color
    ctx.globalAlpha = (selected ? 1 : 0.45) * 0.7
    ctx.fillText(w.desc, x + cardW / 2, y + 135)

    ctx.restore()
  })

  // Controls hint
  ctx.save()
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,255,200,0.4)'
  ctx.fillText('← → to select   ·   ENTER or SPACE to start', cx, cy + 145)
  ctx.restore()
}
```

- [ ] **Step 2: Run full suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
git add src/ui/startScreen.js
git commit -m "feat: start screen — weapon select UI on canvas"
```

---

## Task 9: Main Loop — wire everything together

**Files:**
- Modify: `src/main.js`

No unit tests — integration verified in browser.

- [ ] **Step 1: Replace `src/main.js`**

```js
import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, createWeapon, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { updatePickup } from './systems/pickup.js'
import { renderWorld } from './render.js'
import { drawHud } from './ui/hud.js'
import { drawStartScreen } from './ui/startScreen.js'

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

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    updateMovement(entities, dt, input)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState)
    updateSpawner(entities, spawnerState, dt, gameState.time)
    if (player) updatePickup(entities, player, dt)
    if (player) updateCamera(player)

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

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: PASS — all tests.

- [ ] **Step 3: Open `http://localhost:3000` and smoke test**

Checklist:
- [ ] Start screen appears with title "NEON SURVIVE" and two weapon cards
- [ ] Left/right arrow or A/D switches selection (selected card glows)
- [ ] Enter/Space starts the run with the selected weapon
- [ ] Wand fires projectiles at enemies automatically
- [ ] Whip swings a gold arc in the movement direction, hits enemies in range
- [ ] Enemies occasionally drop a glowing orb on death
- [ ] Walking over an orb adds the weapon (shown bottom-left of HUD)
- [ ] With both weapons equipped, both fire simultaneously
- [ ] R key on death returns to start screen (not directly into the game)
- [ ] P still pauses/unpauses during play

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: wire start screen, weapon selection, pickup system into main loop"
```

---

## Self-Review

**Spec coverage:**
- ✅ Start screen with weapon select (Task 8)
- ✅ Wand unchanged, whip added (Tasks 3, 6)
- ✅ player.facing updated on movement (Task 2)
- ✅ Whip arc collision with hitIds (Task 4)
- ✅ 5% weapon drop on enemy kill (Task 4)
- ✅ Pickup proximity + weapon add + no-duplicate (Task 5)
- ✅ Pickup bob animation (Task 6)
- ✅ HUD weapon inventory (Task 7)
- ✅ Multi-weapon stacking, no cap (Tasks 3, 5, 9)
- ✅ R key → start screen, not direct restart (Task 9)
- ✅ `initGame(weaponType)` takes selected weapon (Task 9)

**Placeholder scan:** None found.

**Type consistency:**
- `createWeapon(type)` defined Task 1, used Tasks 3, 5, 9 ✅
- `createPickup(weaponType, x, y)` defined Task 1, used Tasks 4, 5 ✅
- `updatePickup(entities, player, dt)` defined Task 5, called Task 9 ✅
- `drawStartScreen(ctx, canvas, gameState)` defined Task 8, called Task 9 ✅
- `player.facing` added Task 1, updated Task 2, read Tasks 4, 6 ✅
- `weapon.hitIds` (Set) created Task 1, populated Task 4, cleared Task 3 ✅
