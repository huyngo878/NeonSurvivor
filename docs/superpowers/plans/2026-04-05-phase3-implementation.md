# Phase 3 Vampire Survivor Clone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable browser survival game — player moves in a 3000×3000 world, a magic wand auto-fires at enemies, two enemy types chase the player, difficulty ramps over time.

**Architecture:** Flat ECS — all entities are plain objects in a single array, systems are pure functions that filter and mutate. Spatial hash grid handles collision. No build step for the game; Vitest handles testing.

**Tech Stack:** Vanilla JS ES modules, HTML5 Canvas, Vitest for unit tests.

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Canvas element, CSS fullscreen, loads `src/main.js` as module |
| `src/constants.js` | WORLD_W, WORLD_H, PROJ_SPEED, POOL_SIZE, CELL_SIZE, SPAWN_RADIUS, DIFFICULTY_INTERVAL |
| `src/entities.js` | ENEMY_TYPES config, createPlayer(), createEnemy(type, x, y), initProjectilePool() |
| `src/render.js` | renderWorld(), drawPlayer(), drawEnemy(), drawProjectile() — neon canvas drawing |
| `src/main.js` | rAF game loop, input state, camera, game state machine, wires all systems |
| `src/systems/movement.js` | updateMovement(entities, dt, input) — player, enemy, projectile movement |
| `src/systems/collision.js` | Spatial hash (createSpatialHash, shInsert, shQuery) + updateCollision(entities, gameState) |
| `src/systems/weapons.js` | updateWeapons(entities, dt) — wand cooldown, nearest-enemy targeting, pool emit |
| `src/systems/spawner.js` | WAVES config, createSpawnerState(), updateSpawner(entities, state, dt, gameTime) |
| `src/ui/hud.js` | drawHud(ctx, canvas, player, gameState) — HP bar, timer, kills, death/pause overlays |
| `tests/entities.test.js` | Unit tests for entity factories |
| `tests/systems/movement.test.js` | Unit tests for movement system |
| `tests/systems/collision.test.js` | Unit tests for spatial hash + hit detection |
| `tests/systems/weapons.test.js` | Unit tests for weapon system |
| `tests/systems/spawner.test.js` | Unit tests for spawner system |
| `package.json` | Vitest dev dependency, `test` and `test:watch` scripts |
| `.gitignore` | node_modules, .superpowers |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/constants.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "claude-game",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.superpowers/
```

- [ ] **Step 3: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neon Survive</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      overflow: hidden;
      background-image: radial-gradient(rgba(0,255,200,0.08) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `src/constants.js`**

```js
export const WORLD_W = 3000
export const WORLD_H = 3000
export const PROJ_SPEED = 400
export const POOL_SIZE = 500
export const CELL_SIZE = 64
export const SPAWN_RADIUS = 600
export const DIFFICULTY_INTERVAL = 30
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore index.html src/constants.js
git commit -m "feat: project scaffold — index.html, constants, package.json"
```

---

## Task 2: Entity Factories (TDD)

**Files:**
- Create: `tests/entities.test.js`
- Create: `src/entities.js`

- [ ] **Step 1: Write `tests/entities.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, initProjectilePool, ENEMY_TYPES } from '../src/entities.js'
import { POOL_SIZE, WORLD_W, WORLD_H } from '../src/constants.js'

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

  it('has exactly one wand weapon with correct config', () => {
    const p = createPlayer()
    expect(p.weapons).toHaveLength(1)
    expect(p.weapons[0].type).toBe('wand')
    expect(p.weapons[0].cooldown).toBe(0.8)
    expect(p.weapons[0].damage).toBe(20)
    expect(p.weapons[0].range).toBe(400)
    expect(p.weapons[0].timer).toBe(0)
  })
})

describe('createEnemy', () => {
  it('creates chaser with correct stats', () => {
    const e = createEnemy('chaser', 100, 200)
    expect(e.type).toBe('enemy')
    expect(e.enemyType).toBe('chaser')
    expect(e.pos).toEqual({ x: 100, y: 200 })
    expect(e.hp).toBe(ENEMY_TYPES.chaser.hp)
    expect(e.maxHp).toBe(ENEMY_TYPES.chaser.maxHp)
    expect(e.radius).toBe(ENEMY_TYPES.chaser.radius)
    expect(e.speed).toBe(ENEMY_TYPES.chaser.speed)
    expect(e.color).toBe(ENEMY_TYPES.chaser.color)
    expect(e.damage).toBe(ENEMY_TYPES.chaser.damage)
  })

  it('creates tank with correct stats', () => {
    const e = createEnemy('tank', 0, 0)
    expect(e.hp).toBe(ENEMY_TYPES.tank.hp)
    expect(e.radius).toBe(ENEMY_TYPES.tank.radius)
    expect(e.speed).toBe(ENEMY_TYPES.tank.speed)
  })

  it('throws on unknown enemy type', () => {
    expect(() => createEnemy('dragon', 0, 0)).toThrow('Unknown enemy type: dragon')
  })
})

describe('initProjectilePool', () => {
  it(`returns exactly ${POOL_SIZE} projectiles`, () => {
    const pool = initProjectilePool()
    expect(pool).toHaveLength(POOL_SIZE)
  })

  it('all projectiles are inactive with correct shape', () => {
    const pool = initProjectilePool()
    for (const p of pool) {
      expect(p.type).toBe('projectile')
      expect(p.active).toBe(false)
      expect(p.radius).toBe(4)
      expect(p.lifetime).toBe(2.0)
      expect(p.age).toBe(0)
    }
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/entities.js'`

- [ ] **Step 3: Create `src/entities.js`**

```js
import { WORLD_W, WORLD_H, POOL_SIZE } from './constants.js'

export const ENEMY_TYPES = {
  chaser: { speed: 120, hp: 30,  maxHp: 30,  radius: 8,  color: '#ff0080', damage: 10 },
  tank:   { speed: 55,  hp: 120, maxHp: 120, radius: 14, color: '#ff4400', damage: 20 },
}

let nextId = 1

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
    weapons: [{ type: 'wand', cooldown: 0.8, timer: 0, damage: 20, range: 400 }],
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

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: PASS — all 7 tests in `tests/entities.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/entities.js tests/entities.test.js
git commit -m "feat: entity factories — createPlayer, createEnemy, initProjectilePool"
```

---

## Task 3: Spatial Hash (TDD)

**Files:**
- Create: `tests/systems/collision.test.js` (spatial hash section only)
- Create: `src/systems/collision.js` (spatial hash functions only — hit detection added in Task 6)

- [ ] **Step 1: Create `tests/systems/collision.test.js`** (spatial hash only — hit detection tests added later)

```js
import { describe, it, expect } from 'vitest'
import { createSpatialHash, shInsert, shQuery } from '../../src/systems/collision.js'

describe('spatial hash', () => {
  it('query returns entity inserted in same cell', () => {
    const hash = createSpatialHash()
    const entity = { pos: { x: 10, y: 10 } }
    shInsert(hash, entity)
    const results = shQuery(hash, 10, 10, 5)
    expect(results).toContain(entity)
  })

  it('query returns entity from a neighboring cell', () => {
    const hash = createSpatialHash()
    // entity at pos (63, 10) falls in cell (0, 0) with CELL_SIZE=64
    const entity = { pos: { x: 63, y: 10 } }
    shInsert(hash, entity)
    // query from (65, 10) — cell (1, 0) — with radius 5 should reach cell (0, 0)
    const results = shQuery(hash, 65, 10, 5)
    expect(results).toContain(entity)
  })

  it('returns empty array when hash is empty', () => {
    const hash = createSpatialHash()
    expect(shQuery(hash, 100, 100, 50)).toEqual([])
  })

  it('multiple entities in same cell are all returned', () => {
    const hash = createSpatialHash()
    const a = { pos: { x: 10, y: 10 } }
    const b = { pos: { x: 15, y: 15 } }
    shInsert(hash, a)
    shInsert(hash, b)
    const results = shQuery(hash, 10, 10, 5)
    expect(results).toContain(a)
    expect(results).toContain(b)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test tests/systems/collision.test.js
```

Expected: FAIL — `Cannot find module '../../src/systems/collision.js'`

- [ ] **Step 3: Create `src/systems/collision.js`** (spatial hash only for now)

```js
import { CELL_SIZE } from '../constants.js'

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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test tests/systems/collision.test.js
```

Expected: PASS — all 4 spatial hash tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/collision.js tests/systems/collision.test.js
git commit -m "feat: spatial hash — createSpatialHash, shInsert, shQuery"
```

---

## Task 4: Movement System (TDD)

**Files:**
- Create: `tests/systems/movement.test.js`
- Create: `src/systems/movement.js`

- [ ] **Step 1: Create `tests/systems/movement.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { updateMovement } from '../../src/systems/movement.js'
import { createPlayer, createEnemy } from '../../src/entities.js'

const noInput = { up: false, down: false, left: false, right: false }

describe('updateMovement — player', () => {
  it('moves up when input.up is true', () => {
    const player = createPlayer()
    const startY = player.pos.y
    updateMovement([player], 0.1, { ...noInput, up: true })
    expect(player.pos.y).toBeLessThan(startY)
  })

  it('moves down when input.down is true', () => {
    const player = createPlayer()
    const startY = player.pos.y
    updateMovement([player], 0.1, { ...noInput, down: true })
    expect(player.pos.y).toBeGreaterThan(startY)
  })

  it('does not move when no input', () => {
    const player = createPlayer()
    const { x, y } = player.pos
    updateMovement([player], 0.016, noInput)
    expect(player.pos.x).toBe(x)
    expect(player.pos.y).toBe(y)
  })

  it('normalizes diagonal movement to speed * dt distance', () => {
    const player = createPlayer()
    const startX = player.pos.x
    const startY = player.pos.y
    updateMovement([player], 1, { up: true, down: false, left: false, right: true })
    const dist = Math.hypot(player.pos.x - startX, player.pos.y - startY)
    expect(dist).toBeCloseTo(player.speed, 0)
  })

  it('ticks iframes down each frame', () => {
    const player = createPlayer()
    player.iframes = 0.5
    updateMovement([player], 0.1, noInput)
    expect(player.iframes).toBeCloseTo(0.4, 5)
  })

  it('clamps iframes to 0, not negative', () => {
    const player = createPlayer()
    player.iframes = 0.05
    updateMovement([player], 0.1, noInput)
    expect(player.iframes).toBe(0)
  })
})

describe('updateMovement — enemy', () => {
  it('moves enemy toward player', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', player.pos.x + 200, player.pos.y)
    const startX = enemy.pos.x
    updateMovement([player, enemy], 0.1, noInput)
    expect(enemy.pos.x).toBeLessThan(startX)
  })

  it('enemy moves at its own speed, not player speed', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', player.pos.x + 200, player.pos.y)
    const startX = enemy.pos.x
    updateMovement([player, enemy], 1, noInput)
    const dist = Math.abs(enemy.pos.x - startX)
    expect(dist).toBeCloseTo(enemy.speed, 0)
  })
})

describe('updateMovement — projectile', () => {
  it('advances projectile position by vel * dt', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: true,
      pos: { x: 100, y: 100 }, vel: { x: 400, y: 0 },
      age: 0, lifetime: 2,
    }
    updateMovement([player, proj], 0.1, noInput)
    expect(proj.pos.x).toBeCloseTo(140, 5)
    expect(proj.pos.y).toBeCloseTo(100, 5)
  })

  it('deactivates projectile when age >= lifetime', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: true,
      pos: { x: 1500, y: 1500 }, vel: { x: 0, y: 0 },
      age: 1.99, lifetime: 2,
    }
    updateMovement([player, proj], 0.02, noInput)
    expect(proj.active).toBe(false)
  })

  it('deactivates projectile when it leaves world bounds', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: true,
      pos: { x: -1, y: 100 }, vel: { x: -100, y: 0 },
      age: 0, lifetime: 10,
    }
    updateMovement([player, proj], 0.016, noInput)
    expect(proj.active).toBe(false)
  })

  it('ignores inactive projectiles', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: false,
      pos: { x: 100, y: 100 }, vel: { x: 400, y: 0 },
      age: 0, lifetime: 2,
    }
    updateMovement([player, proj], 0.1, noInput)
    expect(proj.pos.x).toBe(100) // unchanged
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test tests/systems/movement.test.js
```

Expected: FAIL — `Cannot find module '../../src/systems/movement.js'`

- [ ] **Step 3: Create `src/systems/movement.js`**

```js
import { WORLD_W, WORLD_H } from '../constants.js'

export function updateMovement(entities, dt, input) {
  const player = entities.find(e => e.type === 'player')

  for (const e of entities) {
    if (e.type === 'player') {
      _movePlayer(e, dt, input)
    } else if (e.type === 'enemy') {
      if (player) _chasePlayer(e, dt, player)
    } else if (e.type === 'projectile' && e.active) {
      _moveProjectile(e, dt)
    }
  }
}

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
  }
  if (player.iframes > 0) player.iframes = Math.max(0, player.iframes - dt)
}

function _chasePlayer(enemy, dt, player) {
  const dx = player.pos.x - enemy.pos.x
  const dy = player.pos.y - enemy.pos.y
  const dist = Math.hypot(dx, dy)
  if (dist > 0) {
    enemy.pos.x += (dx / dist) * enemy.speed * dt
    enemy.pos.y += (dy / dist) * enemy.speed * dt
  }
}

function _moveProjectile(proj, dt) {
  proj.pos.x += proj.vel.x * dt
  proj.pos.y += proj.vel.y * dt
  proj.age += dt
  if (
    proj.age >= proj.lifetime ||
    proj.pos.x < 0 || proj.pos.x > WORLD_W ||
    proj.pos.y < 0 || proj.pos.y > WORLD_H
  ) {
    proj.active = false
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test tests/systems/movement.test.js
```

Expected: PASS — all 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/movement.js tests/systems/movement.test.js
git commit -m "feat: movement system — player input, enemy chase, projectile travel"
```

---

## Task 5: Weapon System (TDD)

**Files:**
- Create: `tests/systems/weapons.test.js`
- Create: `src/systems/weapons.js`

- [ ] **Step 1: Create `tests/systems/weapons.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { updateWeapons } from '../../src/systems/weapons.js'
import { createPlayer, createEnemy, initProjectilePool } from '../../src/entities.js'
import { PROJ_SPEED } from '../../src/constants.js'

describe('updateWeapons', () => {
  it('ticks weapon timer down by dt', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0.5
    updateWeapons([player, ...initProjectilePool()], 0.1)
    expect(player.weapons[0].timer).toBeCloseTo(0.4, 5)
  })

  it('does not fire when timer > 0', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0.5
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.1)
    expect(pool.every(p => !p.active)).toBe(true)
  })

  it('fires when timer <= 0 and enemy is in range', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired).toBeDefined()
  })

  it('resets timer to cooldown after firing', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    expect(player.weapons[0].timer).toBe(player.weapons[0].cooldown)
  })

  it('resets timer to cooldown even when no enemy in range', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    player.weapons[0].range = 50
    const enemy = createEnemy('chaser', player.pos.x + 500, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    expect(player.weapons[0].timer).toBe(player.weapons[0].cooldown)
    expect(pool.every(p => !p.active)).toBe(true)
  })

  it('spawns projectile at player position', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.pos.x).toBe(player.pos.x)
    expect(fired.pos.y).toBe(player.pos.y)
  })

  it('projectile velocity points toward nearest enemy at PROJ_SPEED', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    // Enemy directly to the right
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.vel.x).toBeCloseTo(PROJ_SPEED, 0)
    expect(fired.vel.y).toBeCloseTo(0, 1)
  })

  it('targets nearest enemy when multiple enemies exist', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    const near = createEnemy('chaser', player.pos.x + 50, player.pos.y)
    const far  = createEnemy('chaser', player.pos.x + 300, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, near, far, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    // Velocity should point toward near enemy (positive x direction, y ≈ 0)
    expect(fired.vel.x).toBeGreaterThan(0)
    expect(fired.vel.y).toBeCloseTo(0, 1)
  })

  it('sets projectile damage from weapon', () => {
    const player = createPlayer()
    player.weapons[0].timer = 0
    player.weapons[0].damage = 35
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.damage).toBe(35)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test tests/systems/weapons.test.js
```

Expected: FAIL — `Cannot find module '../../src/systems/weapons.js'`

- [ ] **Step 3: Create `src/systems/weapons.js`**

```js
import { PROJ_SPEED } from '../constants.js'

export function updateWeapons(entities, dt) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile')

  for (const weapon of player.weapons) {
    weapon.timer -= dt
    if (weapon.timer > 0) continue
    weapon.timer = weapon.cooldown

    // Find nearest enemy within range
    let nearest = null
    let nearestDist = weapon.range
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
      if (dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    }
    if (!nearest) continue

    // Grab first inactive projectile from pool
    const proj = projectiles.find(p => !p.active)
    if (!proj) continue

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
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test tests/systems/weapons.test.js
```

Expected: PASS — all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/weapons.js tests/systems/weapons.test.js
git commit -m "feat: weapon system — wand auto-fire, cooldown, pool emit"
```

---

## Task 6: Collision Detection (TDD)

**Files:**
- Modify: `tests/systems/collision.test.js` (add hit detection tests)
- Modify: `src/systems/collision.js` (add updateCollision)

- [ ] **Step 1: Append hit detection tests to `tests/systems/collision.test.js`**

Add after the existing spatial hash tests:

```js
import { updateCollision } from '../../src/systems/collision.js'
import { createPlayer, createEnemy, initProjectilePool } from '../../src/entities.js'

describe('updateCollision — projectile vs enemy', () => {
  it('damages enemy when projectile overlaps', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 20; proj.radius = 4
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(10)    // 30 - 20
    expect(proj.active).toBe(false)
  })

  it('increments kill count and removes enemy when hp reaches 0', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.damage = 999; proj.radius = 4
    const entities = [player, enemy, ...pool]
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision(entities, gameState)
    expect(gameState.kills).toBe(1)
    expect(entities.find(e => e === enemy)).toBeUndefined()
  })

  it('does not damage enemy when projectile is out of range', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 500, y: 500 }; proj.damage = 999; proj.radius = 4
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(30)
  })
})

describe('updateCollision — enemy vs player', () => {
  it('damages player when enemy overlaps and iframes are 0', () => {
    const player = createPlayer()
    player.pos = { x: 200, y: 200 }; player.iframes = 0
    // chaser radius=8, player radius=12, overlap at dist 5 (< 20)
    const enemy = createEnemy('chaser', 205, 200)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.hp).toBe(90)
    expect(player.iframes).toBe(0.5)
  })

  it('does not damage player during iframes', () => {
    const player = createPlayer()
    player.pos = { x: 200, y: 200 }; player.iframes = 0.3
    const enemy = createEnemy('chaser', 205, 200)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.hp).toBe(100)
  })
})
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test tests/systems/collision.test.js
```

Expected: FAIL — `updateCollision is not a function`

- [ ] **Step 3: Add `updateCollision` to `src/systems/collision.js`**

Append to the existing file:

```js
// --- Hit Detection ---

export function updateCollision(entities, gameState) {
  const player = entities.find(e => e.type === 'player')
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile' && e.active)

  const hash = createSpatialHash()
  for (const enemy of enemies) shInsert(hash, enemy)

  // Projectile vs Enemy
  for (const proj of projectiles) {
    const candidates = shQuery(hash, proj.pos.x, proj.pos.y, proj.radius + 14)
    for (const enemy of candidates) {
      const dist = Math.hypot(proj.pos.x - enemy.pos.x, proj.pos.y - enemy.pos.y)
      if (dist < proj.radius + enemy.radius) {
        enemy.hp -= proj.damage
        proj.active = false
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
        }
        break // one enemy per projectile
      }
    }
  }

  // Enemy vs Player (skip if iframes active)
  if (player && player.iframes <= 0) {
    const nearby = shQuery(hash, player.pos.x, player.pos.y, 14 + 12)
    for (const enemy of nearby) {
      const dist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y)
      if (dist < enemy.radius + 12) {
        player.hp -= enemy.damage
        player.iframes = 0.5
        break // one hit per frame
      }
    }
  }

  // Remove dead enemies from array
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].dead) entities.splice(i, 1)
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test tests/systems/collision.test.js
```

Expected: PASS — all 9 tests (4 spatial hash + 5 hit detection).

- [ ] **Step 5: Commit**

```bash
git add src/systems/collision.js tests/systems/collision.test.js
git commit -m "feat: collision detection — projectile-enemy, enemy-player, spatial hash"
```

---

## Task 7: Spawner System (TDD)

**Files:**
- Create: `tests/systems/spawner.test.js`
- Create: `src/systems/spawner.js`

- [ ] **Step 1: Create `tests/systems/spawner.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { updateSpawner, createSpawnerState, WAVES } from '../../src/systems/spawner.js'
import { createPlayer, initProjectilePool } from '../../src/entities.js'
import { SPAWN_RADIUS, DIFFICULTY_INTERVAL } from '../../src/constants.js'

describe('updateSpawner', () => {
  it('spawns chaser enemies on first frame (startTime: 0)', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016)
    const enemies = entities.filter(e => e.type === 'enemy')
    expect(enemies.length).toBeGreaterThan(0)
    expect(enemies[0].enemyType).toBe('chaser')
  })

  it('does not spawn tank before startTime of 15s', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016)
    const tanks = entities.filter(e => e.type === 'enemy' && e.enemyType === 'tank')
    expect(tanks).toHaveLength(0)
  })

  it('spawns tank after startTime of 15s', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 15.016)
    const tanks = entities.filter(e => e.type === 'enemy' && e.enemyType === 'tank')
    expect(tanks.length).toBeGreaterThan(0)
  })

  it('spawns enemy at exactly SPAWN_RADIUS distance from player', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016)
    const enemy = entities.find(e => e.type === 'enemy')
    const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
    expect(dist).toBeCloseTo(SPAWN_RADIUS, 1)
  })

  it('respects spawn interval — does not spawn twice in a row', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016) // first spawn
    const countAfterFirst = entities.filter(e => e.type === 'enemy').length
    updateSpawner(entities, state, 0.016, 0.032) // second frame — timer not expired
    const countAfterSecond = entities.filter(e => e.type === 'enemy').length
    expect(countAfterSecond).toBe(countAfterFirst) // no new spawn
  })

  it('applies countMult after DIFFICULTY_INTERVAL seconds', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, DIFFICULTY_INTERVAL + 0.01, 0)
    expect(state.countMult).toBeCloseTo(1.2, 5)
    expect(state.intervalMult).toBeCloseTo(0.85, 5)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test tests/systems/spawner.test.js
```

Expected: FAIL — `Cannot find module '../../src/systems/spawner.js'`

- [ ] **Step 3: Create `src/systems/spawner.js`**

```js
import { SPAWN_RADIUS, DIFFICULTY_INTERVAL } from '../constants.js'
import { createEnemy } from '../entities.js'

export const WAVES = [
  { enemyType: 'chaser', count: 5, interval: 2.0, startTime: 0 },
  { enemyType: 'tank',   count: 2, interval: 6.0, startTime: 15 },
]

export function createSpawnerState() {
  return {
    timers: WAVES.map(() => 0),
    difficultyTimer: 0,
    countMult: 1.0,
    intervalMult: 1.0,
  }
}

export function updateSpawner(entities, state, dt, gameTime) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return

  // Difficulty ramp every DIFFICULTY_INTERVAL seconds
  state.difficultyTimer += dt
  if (state.difficultyTimer >= DIFFICULTY_INTERVAL) {
    state.difficultyTimer -= DIFFICULTY_INTERVAL
    state.countMult    *= 1.2
    state.intervalMult *= 0.85
  }

  for (let i = 0; i < WAVES.length; i++) {
    const wave = WAVES[i]
    if (gameTime < wave.startTime) continue

    state.timers[i] -= dt
    if (state.timers[i] > 0) continue

    const interval = wave.interval * state.intervalMult
    state.timers[i] = interval

    const count = Math.round(wave.count * state.countMult)
    for (let j = 0; j < count; j++) {
      const angle = Math.random() * Math.PI * 2
      const x = player.pos.x + Math.cos(angle) * SPAWN_RADIUS
      const y = player.pos.y + Math.sin(angle) * SPAWN_RADIUS
      entities.push(createEnemy(wave.enemyType, x, y))
    }
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test tests/systems/spawner.test.js
```

Expected: PASS — all 6 tests.

- [ ] **Step 5: Run all tests to confirm nothing broken**

```bash
npm test
```

Expected: PASS — all tests across all files.

- [ ] **Step 6: Commit**

```bash
git add src/systems/spawner.js tests/systems/spawner.test.js
git commit -m "feat: spawner system — wave config, timed spawn, difficulty ramp"
```

---

## Task 8: Neon Rendering

**Files:**
- Create: `src/render.js`

No unit tests — canvas drawing cannot be meaningfully unit tested without a headless canvas. Smoke-tested visually in Task 10.

- [ ] **Step 1: Create `src/render.js`**

```js
export function renderWorld(ctx, canvas, entities, camera) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  for (const e of entities) {
    if (e.type === 'enemy') _drawEnemy(ctx, e)
    else if (e.type === 'projectile' && e.active) _drawProjectile(ctx, e)
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
  // Flash transparent during iframes
  ctx.fillStyle = player.iframes > 0 ? 'rgba(0,255,200,0.3)' : '#00ffc8'
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()
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
  // HP bar above enemy (only when damaged)
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
  // Motion trail (3 fading dots behind)
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
```

- [ ] **Step 2: Commit**

```bash
git add src/render.js
git commit -m "feat: neon rendering — player, enemies, projectiles with glow and motion trail"
```

---

## Task 9: HUD

**Files:**
- Create: `src/ui/hud.js`

No unit tests — canvas drawing cannot be meaningfully unit tested without a headless canvas.

- [ ] **Step 1: Create `src/ui/hud.js`**

```js
export function drawHud(ctx, canvas, player, gameState) {
  if (!player) return

  // HP bar — top-left
  const barW = 160, barH = 14, barX = 16, barY = 16
  ctx.fillStyle = '#111'
  ctx.fillRect(barX, barY, barW, barH)
  const hpRatio = Math.max(0, player.hp / player.maxHp)
  ctx.save()
  ctx.shadowBlur = 8
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillRect(barX, barY, barW * hpRatio, barH)
  ctx.restore()
  ctx.strokeStyle = '#00ffc8'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barW, barH)

  // Timer — top-center
  const mm = String(Math.floor(gameState.time / 60)).padStart(2, '0')
  const ss = String(Math.floor(gameState.time % 60)).padStart(2, '0')
  ctx.save()
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText(`${mm}:${ss}`, canvas.width / 2, 30)
  ctx.restore()

  // Kill count — top-right
  ctx.save()
  ctx.font = '16px monospace'
  ctx.textAlign = 'right'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText(`KILLS: ${gameState.kills}`, canvas.width - 16, 30)
  ctx.restore()

  // Paused overlay
  if (gameState.state === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 15
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
    ctx.restore()
  }

  // Death overlay
  if (gameState.state === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#ff0080'
    ctx.fillStyle = '#ff0080'
    ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2 - 20)
    ctx.font = '20px monospace'
    ctx.shadowBlur = 10
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText('[R] to Restart', canvas.width / 2, canvas.height / 2 + 30)
    ctx.restore()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/hud.js
git commit -m "feat: HUD — HP bar, timer, kill count, pause and death overlays"
```

---

## Task 10: Main Game Loop

**Files:**
- Create: `src/main.js`

This wires all systems together. No unit tests — tested by opening `index.html` in a browser.

- [ ] **Step 1: Create `src/main.js`**

```js
import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { renderWorld } from './render.js'
import { drawHud } from './ui/hud.js'

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
  if (e.code === 'KeyP') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
  }
  if (e.code === 'KeyR' && gameState.state === 'dead') initGame()
})
document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false
})

// --- Game state ---
let entities = []
let gameState = {}
let spawnerState = {}
let camera = { x: 0, y: 0 }

function initGame() {
  const player = createPlayer()
  const pool   = initProjectilePool()
  entities     = [player, ...pool]
  gameState    = { state: 'playing', time: 0, kills: 0 }
  spawnerState = createSpawnerState()
}

initGame()

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

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    updateMovement(entities, dt, input)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState)
    updateSpawner(entities, spawnerState, dt, gameState.time)
    updateCamera(player)

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

- [ ] **Step 2: Run all tests one final time**

```bash
npm test
```

Expected: PASS — all tests across all 5 test files, 0 failures.

- [ ] **Step 3: Open the game in a browser**

Open `index.html` directly in Chrome (File → Open, or drag the file).

Smoke test checklist:
- [ ] Canvas fills the full window, black background with dot grid
- [ ] Player (cyan glowing circle) appears at center
- [ ] WASD/arrow keys move the player smoothly
- [ ] Chaser enemies (pink) appear within ~2s and chase the player
- [ ] Tank enemies (orange, bigger) appear after ~15s
- [ ] White projectiles fire toward nearest enemy automatically
- [ ] Enemies disappear when hit enough times; kill count increments
- [ ] Player flashes briefly when hit by an enemy
- [ ] HP bar decreases as player takes damage
- [ ] Timer counts up in MM:SS
- [ ] `P` key pauses/unpauses
- [ ] Death overlay shows when HP reaches 0; `R` restarts

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: main game loop — wires all systems, camera, game state machine"
```

---

## Final State

After Task 10, the repository looks like:

```
ClaudeGame/
  index.html
  package.json
  .gitignore
  src/
    constants.js
    entities.js
    render.js
    main.js
    systems/
      movement.js
      collision.js
      weapons.js
      spawner.js
    ui/
      hud.js
  tests/
    entities.test.js
    systems/
      movement.test.js
      collision.test.js
      weapons.test.js
      spawner.test.js
  docs/
    superpowers/
      specs/2026-04-05-vampire-survivor-clone-design.md
      plans/2026-04-05-phase3-implementation.md
```

All pure logic (entities, movement, collision, weapons, spawner) is covered by unit tests. Canvas rendering and the game loop are smoke-tested manually via the browser.
