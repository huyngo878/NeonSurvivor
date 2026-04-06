# Phase 9 — Balance, Enemies, Magnet & Rocket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Balance whip/wand, add ESC pause + retry-to-reselect, add two enemy variants, a rare magnet pickup with gem flight animation, and a rocket weapon with AOE.

**Architecture:** All changes follow the existing ECS pattern — entities are plain objects in `entities.js`, systems are pure functions. Magnet pickup sets an `attracted` flag on gems; `updateGems` animates them toward the player. Rocket uses a `proj.explode` flag set by `movement.js` on expiry, consumed by `collision.js` for AOE. Everything else is data-only changes or small function additions.

**Tech Stack:** Vanilla JS ES modules, Vitest for tests.

---

## File Map

| File | Change |
|------|--------|
| `src/entities.js` | WEAPON_CONFIGS balance; add speedster/brute; add rocket config; add aoe/aoeRadius/weaponType to pool; add `createMagnet()` |
| `src/main.js` | ESC pause; retry → `state='start'`; keydown summary block |
| `src/systems/spawner.js` | Add speedster and brute wave entries |
| `src/systems/movement.js` | Set `proj.explode = true` instead of `active = false` when aoe rocket expires |
| `src/systems/collision.js` | Rename `_rollWeaponDrop` → `_rollPickupDrop`; add magnet + rocket to drops; `_aoeExplosion`; handle `proj.explode` |
| `src/systems/gems.js` | Animate attracted gems toward player |
| `src/systems/pickup.js` | Handle `pickupType === 'magnet'`; upgrade rocket on duplicate pickup |
| `src/systems/weapons.js` | Add `_tickRocket()`; reset aoe/weaponType on wand fire |
| `src/upgrades.js` | Add `get_rocket` epic + 3 rocket upgrade cards |
| `src/render.js` | Draw magnet pickup (purple); draw rocket projectile (orange glow) |
| `tests/entities.test.js` | Tests for speedster, brute, createMagnet, rocket config, pool aoe fields |
| `tests/systems/gems.test.js` | Tests for attracted gem movement and collection |
| `tests/systems/pickup.test.js` | Tests for magnet pickup and rocket upgrade |
| `tests/systems/weapons.test.js` | Tests for rocket firing and aoe flag |

---

## Task 1: Balance + ESC Pause + Retry Reselect

**Files:**
- Modify: `src/entities.js`
- Modify: `src/main.js`

- [ ] **Step 1: Update `WEAPON_CONFIGS` in `src/entities.js`**

Find the `WEAPON_CONFIGS` block and replace it with:

```js
const WEAPON_CONFIGS = {
  wand: { type: 'wand', cooldown: 0.53, damage: 22, range: 400, shots: 1 },
  whip: {
    type: 'whip', cooldown: 0.9, damage: 11, range: 120,
    sweepAngle: Math.PI, activeDuration: 0.12, aimAngle: 0,
  },
}
```

- [ ] **Step 2: Add ESC to the pause toggle in `src/main.js`**

Find the playing/paused block (currently `if (e.code === 'KeyP')`):

```js
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
  }
```

- [ ] **Step 3: Change retry to go to weapon-select in `src/main.js`**

In the `'summary'` keydown block, change:
```js
    if (e.code === 'KeyR') initGame(gameState.selectedWeapon)
```
to:
```js
    if (e.code === 'KeyR') gameState.state = 'start'
```

In `_handlePointer`, the summary button block:
```js
  if (gameState.state === 'summary') {
    for (const btn of (gameState.summaryBtnRects || [])) {
      if (hit(btn)) {
        if (btn.action === 'replay') gameState.state = 'start'
        else gameState.state = 'menu'
        break
      }
    }
    return
  }
```

- [ ] **Step 4: Run full test suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

Expected: 121 tests pass. (Existing weapon tests use relative checks like `timer === cooldown`, not hard-coded values, so they still pass.)

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js src/main.js && git commit -m "$(cat <<'EOF'
feat: nerf whip, boost wand, ESC pause, retry returns to weapon select

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Enemy Variants — Speedster & Brute

**Files:**
- Modify: `src/entities.js`
- Modify: `src/systems/spawner.js`
- Modify: `tests/entities.test.js`
- Modify: `tests/systems/spawner.test.js`

- [ ] **Step 1: Write failing tests for new enemy types**

Open `tests/entities.test.js` and add inside the `describe('createEnemy', ...)` block:

```js
  it('creates speedster with correct stats', () => {
    const e = createEnemy('speedster', 50, 50)
    expect(e.enemyType).toBe('speedster')
    expect(e.speed).toBe(220)
    expect(e.hp).toBe(18)
    expect(e.radius).toBe(6)
    expect(e.damage).toBe(8)
  })

  it('creates brute with correct stats', () => {
    const e = createEnemy('brute', 50, 50)
    expect(e.enemyType).toBe('brute')
    expect(e.speed).toBe(35)
    expect(e.hp).toBe(280)
    expect(e.radius).toBe(18)
    expect(e.damage).toBe(35)
  })
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

Expected: FAIL — "Unknown enemy type: speedster"

- [ ] **Step 3: Add speedster and brute to `ENEMY_TYPES` in `src/entities.js`**

```js
export const ENEMY_TYPES = {
  chaser:    { speed: 120, hp: 30,  maxHp: 30,  radius: 8,  color: '#ff0080', damage: 10, gemValue: 1, gemRadius: 6,  gemColor: '#00ff88' },
  tank:      { speed: 55,  hp: 120, maxHp: 120, radius: 14, color: '#ff4400', damage: 20, gemValue: 3, gemRadius: 8,  gemColor: '#ffd700' },
  speedster: { speed: 220, hp: 18,  maxHp: 18,  radius: 6,  color: '#ff44ff', damage: 8,  gemValue: 1, gemRadius: 6,  gemColor: '#00ffff' },
  brute:     { speed: 35,  hp: 280, maxHp: 280, radius: 18, color: '#aa00ff', damage: 35, gemValue: 6, gemRadius: 10, gemColor: '#cc88ff' },
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Step 5: Add wave entries to `src/systems/spawner.js`**

```js
export const WAVES = [
  { enemyType: 'chaser',    count: 5, interval: 2.0,  startTime: 0  },
  { enemyType: 'speedster', count: 3, interval: 1.5,  startTime: 0  },
  { enemyType: 'tank',      count: 2, interval: 6.0,  startTime: 15 },
  { enemyType: 'brute',     count: 1, interval: 15.0, startTime: 30 },
]
```

- [ ] **Step 6: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js src/systems/spawner.js tests/entities.test.js && git commit -m "$(cat <<'EOF'
feat: add speedster and brute enemy variants

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Magnet Pickup + Gem Flight Animation

**Files:**
- Modify: `src/entities.js` — add `createMagnet()`
- Modify: `src/systems/collision.js` — rename `_rollWeaponDrop` → `_rollPickupDrop`, add magnet drop
- Modify: `src/systems/pickup.js` — handle `pickupType === 'magnet'`
- Modify: `src/systems/gems.js` — animate attracted gems
- Modify: `src/render.js` — draw magnet pickup with purple glow

- [ ] **Step 1: Write failing tests for createMagnet**

Add to `tests/entities.test.js`:

```js
import { createPlayer, createEnemy, createWeapon, createPickup, createGem, createMagnet, initProjectilePool, ENEMY_TYPES } from '../src/entities.js'

// In a new describe block at the bottom:
describe('createMagnet', () => {
  it('returns a pickup entity with pickupType magnet', () => {
    const m = createMagnet(100, 200)
    expect(m.type).toBe('pickup')
    expect(m.pickupType).toBe('magnet')
    expect(m.pos).toEqual({ x: 100, y: 200 })
    expect(m.radius).toBe(10)
    expect(m.bobTimer).toBe(0)
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

Expected: FAIL — `createMagnet is not a function`

- [ ] **Step 3: Add `createMagnet` to `src/entities.js`**

After `createPickup`, add:

```js
export function createMagnet(x, y) {
  return {
    id: nextId++,
    type: 'pickup',
    pickupType: 'magnet',
    pos: { x, y },
    radius: 10,
    bobTimer: 0,
  }
}
```

- [ ] **Step 4: Run entities tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

- [ ] **Step 5: Write failing tests for magnet pickup behavior**

Add to `tests/systems/pickup.test.js`:

```js
import { createPlayer, createPickup, createWeapon, createMagnet, createGem, initProjectilePool } from '../../src/entities.js'

// New describe block:
describe('updatePickup — magnet', () => {
  it('removes magnet from entities when collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(105, 100)
    const entities = [player, magnet]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === magnet)).toBeUndefined()
  })

  it('sets attracted=true on all gems when magnet is collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(105, 100)
    const gem1 = createGem(1, 6, '#00ff88', 500, 500)
    const gem2 = createGem(2, 8, '#ffd700', 800, 300)
    const entities = [player, magnet, gem1, gem2]
    updatePickup(entities, player, 0.016)
    expect(gem1.attracted).toBe(true)
    expect(gem2.attracted).toBe(true)
  })

  it('does not collect magnet out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(500, 500)
    const gem = createGem(1, 6, '#00ff88', 600, 600)
    const entities = [player, magnet, gem]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === magnet)).toBeDefined()
    expect(gem.attracted).toBeFalsy()
  })
})
```

- [ ] **Step 6: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/pickup.test.js 2>&1 | tail -6
```

Expected: FAIL on the magnet tests.

- [ ] **Step 7: Update `src/systems/pickup.js` to import `createMagnet` and handle magnet pickup**

Replace the full file:

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

  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10)

  for (const pickup of nearby) {
    const dist = Math.hypot(pickup.pos.x - player.pos.x, pickup.pos.y - player.pos.y)
    if (dist > player.radius + pickup.radius) continue
    const idx = entities.indexOf(pickup)
    if (idx !== -1) entities.splice(idx, 1)

    if (pickup.pickupType === 'magnet') {
      // Attract all gems
      for (const e of entities) {
        if (e.type === 'gem') e.attracted = true
      }
    } else if (pickup.pickupType === 'weapon') {
      const existing = player.weapons.find(w => w.type === pickup.weaponType)
      if (existing) {
        _upgradeWeapon(existing)
      } else {
        player.weapons.push(createWeapon(pickup.weaponType))
      }
    }
  }
}

function _upgradeWeapon(weapon) {
  if (weapon.type === 'wand') {
    weapon.shots += 1
  } else if (weapon.type === 'whip') {
    weapon.cooldown = Math.max(0.2, weapon.cooldown * 0.85)
    weapon.damage += 5
    weapon.sweepAngle = Math.min(2 * Math.PI, weapon.sweepAngle + Math.PI / 6)
  } else if (weapon.type === 'rocket') {
    weapon.shots += 1
  }
}
```

- [ ] **Step 8: Run pickup tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/pickup.test.js 2>&1 | tail -6
```

- [ ] **Step 9: Write failing tests for attracted gem movement**

Add to `tests/systems/gems.test.js`:

```js
  it('moves attracted gem toward player each frame', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 500, 100)
    gem.attracted = true
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.1, gameState)
    // Gem should have moved toward player (x decreased)
    expect(gem.pos.x).toBeLessThan(500)
    expect(gem.pos.y).toBeCloseTo(100, 0)
    // Gem is still in entities (not yet collected)
    expect(entities.find(e => e === gem)).toBeDefined()
  })

  it('collects attracted gem when it reaches player', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(2, 6, '#00ff88', 110, 100)
    gem.attracted = true
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(2)
    expect(entities.find(e => e === gem)).toBeUndefined()
  })
```

- [ ] **Step 10: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/gems.test.js 2>&1 | tail -6
```

Expected: FAIL on attracted gem tests.

- [ ] **Step 11: Update `src/systems/gems.js` to animate attracted gems**

Replace the full file:

```js
import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { pickUpgrades } from '../upgrades.js'

const MAGNET_SPEED = 400  // px/s

export function updateGems(entities, player, dt, gameState) {
  if (!player) return

  // Advance bob timers
  for (const e of entities) {
    if (e.type === 'gem') e.bobTimer += dt
  }

  const gems = entities.filter(e => e.type === 'gem')
  if (gems.length === 0) return

  // Attracted gems — move toward player, collect on arrival
  const collectRadius = player.radius + 10 + (player.magnetBonus || 0)
  for (let i = entities.length - 1; i >= 0; i--) {
    const gem = entities[i]
    if (gem.type !== 'gem' || !gem.attracted) continue
    const dx = player.pos.x - gem.pos.x
    const dy = player.pos.y - gem.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist <= collectRadius) {
      entities.splice(i, 1)
      player.xp += Math.floor(gem.value * (player.xpMult || 1))
      if (player.xp >= player.xpToNext && gameState.state !== 'levelup') {
        _levelUp(player, gameState)
      }
    } else {
      gem.pos.x += (dx / dist) * MAGNET_SPEED * dt
      gem.pos.y += (dy / dist) * MAGNET_SPEED * dt
    }
  }

  // Normal gems — spatial hash pickup
  const normalGems = entities.filter(e => e.type === 'gem' && !e.attracted)
  if (normalGems.length === 0) return

  const hash = createSpatialHash()
  for (const g of normalGems) shInsert(hash, g)

  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10 + (player.magnetBonus || 0))

  for (const gem of nearby) {
    const dist = Math.hypot(gem.pos.x - player.pos.x, gem.pos.y - player.pos.y)
    if (dist > player.radius + gem.radius + (player.magnetBonus || 0)) continue
    const idx = entities.indexOf(gem)
    if (idx !== -1) entities.splice(idx, 1)
    player.xp += Math.floor(gem.value * (player.xpMult || 1))
    if (player.xp >= player.xpToNext && gameState.state !== 'levelup') {
      _levelUp(player, gameState)
    }
  }
}

function _levelUp(player, gameState) {
  player.xp -= player.xpToNext
  player.level++
  player.xpToNext = Math.floor(50 * Math.pow(player.level, 1.2))
  const cardCount = 3 + (player.extraChoices || 0)
  gameState.upgradeChoices = pickUpgrades(player, cardCount)
  gameState.state = 'levelup'
}
```

- [ ] **Step 12: Run gems tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/gems.test.js 2>&1 | tail -6
```

- [ ] **Step 13: Update `src/systems/collision.js` — rename to `_rollPickupDrop`, add magnet**

Replace `_rollWeaponDrop` with:

```js
function _rollPickupDrop(enemy, entities, player) {
  const baseRate = 0.05 + (player ? (player.dropRateBonus || 0) : 0)

  // Weapon drop
  if (Math.random() < baseRate) {
    const weapons = ['wand', 'whip', 'rocket']
    const dropType = weapons[Math.floor(Math.random() * weapons.length)]
    entities.push(createPickup(dropType, enemy.pos.x, enemy.pos.y))
  }

  // Magnet drop (rare, independent roll)
  if (Math.random() < baseRate) {
    entities.push(createMagnet(enemy.pos.x, enemy.pos.y))
  }
}
```

Update the import at the top of `src/systems/collision.js`:
```js
import { ENEMY_TYPES, createPickup, createGem, createMagnet } from '../entities.js'
```

Update all two call sites that say `_rollWeaponDrop(` to `_rollPickupDrop(`.

- [ ] **Step 14: Update `src/render.js` to draw magnet pickup and rocket pickup**

Replace `_drawPickup`:

```js
function _drawPickup(ctx, pickup) {
  let color
  if (pickup.pickupType === 'magnet') {
    color = '#cc00ff'
  } else if (pickup.weaponType === 'whip') {
    color = '#ffd700'
  } else if (pickup.weaponType === 'rocket') {
    color = '#ff6600'
  } else {
    color = '#00ffc8'
  }
  const yOff = Math.sin(pickup.bobTimer * 3) * 4
  const { x, y } = pickup.pos
  ctx.save()
  ctx.shadowBlur = 16
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y + yOff, pickup.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - 3, y + yOff - 3, pickup.radius * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
```

- [ ] **Step 15: Run full test suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 16: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js src/systems/collision.js src/systems/pickup.js src/systems/gems.js src/render.js tests/entities.test.js tests/systems/pickup.test.js tests/systems/gems.test.js && git commit -m "$(cat <<'EOF'
feat: magnet pickup — attracts all XP gems with flight animation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rocket Weapon

**Files:**
- Modify: `src/entities.js` — rocket WEAPON_CONFIG; aoe/aoeRadius/weaponType in pool
- Modify: `src/systems/weapons.js` — `_tickRocket()`; reset aoe fields on wand fire
- Modify: `src/systems/movement.js` — set `proj.explode = true` for expired aoe projectiles
- Modify: `src/systems/collision.js` — `_aoeExplosion()`; handle `proj.explode`
- Modify: `src/upgrades.js` — `get_rocket` + 3 rocket upgrade cards
- Modify: `src/render.js` — draw rocket projectiles orange

- [ ] **Step 1: Write failing tests for rocket weapon**

Add to `tests/systems/weapons.test.js`:

```js
describe('updateWeapons — rocket', () => {
  it('fires at nearest enemy when timer expires', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired).toBeDefined()
  })

  it('rocket projectile has aoe flag and aoeRadius', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.aoe).toBe(true)
    expect(fired.aoeRadius).toBe(80)
    expect(fired.weaponType).toBe('rocket')
  })

  it('rocket fires shots=2 projectiles after upgrade', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    player.weapons[0].timer = 0
    player.weapons[0].shots = 2
    const e1 = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const e2 = createEnemy('chaser', player.pos.x + 150, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, e1, e2, ...pool], 0.016)
    const fired = pool.filter(p => p.active)
    expect(fired.length).toBe(2)
  })

  it('wand projectile has aoe=false', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.aoe).toBe(false)
    expect(fired.weaponType).toBe('wand')
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/weapons.test.js 2>&1 | tail -8
```

Expected: FAIL — `createWeapon('rocket')` throws or `fired.aoe` is undefined.

- [ ] **Step 3: Add rocket to `WEAPON_CONFIGS` and aoe fields to pool in `src/entities.js`**

In `WEAPON_CONFIGS`, add:
```js
  rocket: { type: 'rocket', cooldown: 2.0, damage: 60, range: 500, shots: 1, aoeRadius: 80 },
```

In `initProjectilePool`, replace the pool entry object:
```js
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
      aoe: false,
      aoeRadius: 0,
      weaponType: '',
      explode: false,
    })
```

- [ ] **Step 4: Add `_tickRocket` and update `_tickWand` in `src/systems/weapons.js`**

Replace the full file:

```js
import { PROJ_SPEED } from '../constants.js'

const ROCKET_SPEED = 300

export function updateWeapons(entities, dt) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile')

  for (const weapon of player.weapons) {
    if (weapon.type === 'wand') {
      _tickWand(weapon, dt, player, enemies, projectiles)
    } else if (weapon.type === 'whip') {
      _tickWhip(weapon, dt, player, enemies)
    } else if (weapon.type === 'rocket') {
      _tickRocket(weapon, dt, player, enemies, projectiles)
    }
  }
}

function _tickWand(weapon, dt, player, enemies, projectiles) {
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  const inRange = enemies
    .map(e => ({ e, dist: Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) }))
    .filter(({ dist }) => dist <= weapon.range)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, weapon.shots)

  for (const { e: target } of inRange) {
    const proj = projectiles.find(p => !p.active)
    if (!proj) break
    const dx = target.pos.x - player.pos.x
    const dy = target.pos.y - player.pos.y
    const dist = Math.hypot(dx, dy)
    proj.active = true
    proj.pos.x = player.pos.x
    proj.pos.y = player.pos.y
    proj.vel.x = (dx / dist) * PROJ_SPEED
    proj.vel.y = (dy / dist) * PROJ_SPEED
    proj.age = 0
    proj.damage = weapon.damage
    proj.radius = 4
    proj.aoe = false
    proj.aoeRadius = 0
    proj.weaponType = 'wand'
    proj.explode = false
  }
}

function _tickWhip(weapon, dt, player, enemies) {
  if (weapon.active) {
    weapon.activeTimer -= dt
    if (weapon.activeTimer <= 0) weapon.active = false
    return
  }
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  let nearest = null
  let nearestDist = Infinity
  for (const enemy of enemies) {
    const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
    if (dist < nearestDist) { nearest = enemy; nearestDist = dist }
  }
  if (nearest) {
    weapon.aimAngle = Math.atan2(
      nearest.pos.y - player.pos.y,
      nearest.pos.x - player.pos.x,
    )
  } else {
    weapon.aimAngle = Math.atan2(player.facing.y, player.facing.x)
  }

  weapon.active = true
  weapon.activeTimer = weapon.activeDuration
  weapon.hitIds = new Set()
}

function _tickRocket(weapon, dt, player, enemies, projectiles) {
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  const inRange = enemies
    .map(e => ({ e, dist: Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) }))
    .filter(({ dist }) => dist <= weapon.range)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, weapon.shots)

  for (const { e: target } of inRange) {
    const proj = projectiles.find(p => !p.active)
    if (!proj) break
    const dx = target.pos.x - player.pos.x
    const dy = target.pos.y - player.pos.y
    const dist = Math.hypot(dx, dy)
    proj.active = true
    proj.pos.x = player.pos.x
    proj.pos.y = player.pos.y
    proj.vel.x = (dx / dist) * ROCKET_SPEED
    proj.vel.y = (dy / dist) * ROCKET_SPEED
    proj.age = 0
    proj.damage = weapon.damage
    proj.radius = 7
    proj.aoe = true
    proj.aoeRadius = weapon.aoeRadius
    proj.weaponType = 'rocket'
    proj.explode = false
  }
}
```

- [ ] **Step 5: Run weapons tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/weapons.test.js 2>&1 | tail -8
```

- [ ] **Step 6: Update `src/systems/movement.js` to set `proj.explode` for expired rockets**

Replace `_moveProjectile`:

```js
function _moveProjectile(proj, dt) {
  proj.pos.x += proj.vel.x * dt
  proj.pos.y += proj.vel.y * dt
  proj.age += dt
  const expired =
    proj.age >= proj.lifetime ||
    proj.pos.x < 0 || proj.pos.x > WORLD_W ||
    proj.pos.y < 0 || proj.pos.y > WORLD_H
  if (expired) {
    if (proj.aoe) {
      proj.explode = true  // AOE handled in collision.js before deactivating
    } else {
      proj.active = false
    }
  }
}
```

- [ ] **Step 7: Update `src/systems/collision.js` — add `_aoeExplosion`, handle `proj.explode`, rocket hit AOE**

Replace `updateCollision` and add helpers. The full updated relevant section:

```js
export function updateCollision(entities, gameState) {
  const player = entities.find(e => e.type === 'player')
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile' && e.active)

  const hash = createSpatialHash()
  for (const enemy of enemies) shInsert(hash, enemy)

  // Handle exploding rockets (expired aoe projectiles)
  for (const proj of projectiles) {
    if (!proj.explode) continue
    _aoeExplosion(proj, proj.pos.x, proj.pos.y, proj.aoeRadius, proj.damage * 0.5, enemies, entities, player, gameState)
    proj.active = false
    proj.explode = false
  }

  // Projectile vs Enemy
  const activeProj = projectiles.filter(p => p.active)
  for (const proj of activeProj) {
    const candidates = shQuery(hash, proj.pos.x, proj.pos.y, proj.radius + MAX_ENEMY_RADIUS)
    for (const enemy of candidates) {
      const dist = Math.hypot(proj.pos.x - enemy.pos.x, proj.pos.y - enemy.pos.y)
      if (dist < proj.radius + enemy.radius) {
        enemy.hp -= proj.damage
        proj.active = false
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _dropGem(enemy, entities)
          _rollPickupDrop(enemy, entities, player)
        }
        // AOE explosion on rocket hit
        if (proj.aoe) {
          _aoeExplosion(proj, proj.pos.x, proj.pos.y, proj.aoeRadius, proj.damage * 0.5, enemies, entities, player, gameState, enemy)
        }
        break
      }
    }
  }

  // Whip arc vs Enemy
  if (player) {
    for (const weapon of player.weapons) {
      if (weapon.type !== 'whip' || !weapon.active) continue
      const facingAngle = weapon.aimAngle
      const candidates = shQuery(hash, player.pos.x, player.pos.y, weapon.range + MAX_ENEMY_RADIUS)
      for (const enemy of candidates) {
        if (weapon.hitIds.has(enemy.id)) continue
        const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
        if (dist > weapon.range + enemy.radius) continue
        const angleToEnemy = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x)
        let diff = angleToEnemy - facingAngle
        while (diff > Math.PI)  diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        if (Math.abs(diff) > weapon.sweepAngle / 2) continue
        enemy.hp -= weapon.damage
        weapon.hitIds.add(enemy.id)
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _dropGem(enemy, entities)
          _rollPickupDrop(enemy, entities, player)
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

function _aoeExplosion(proj, cx, cy, radius, damage, enemies, entities, player, gameState, skipEnemy = null) {
  for (const enemy of enemies) {
    if (enemy === skipEnemy || enemy.dead) continue
    const dist = Math.hypot(enemy.pos.x - cx, enemy.pos.y - cy)
    if (dist <= radius + enemy.radius) {
      enemy.hp -= damage
      if (enemy.hp <= 0) {
        gameState.kills++
        enemy.dead = true
        _dropGem(enemy, entities)
        _rollPickupDrop(enemy, entities, player)
      }
    }
  }
}
```

- [ ] **Step 8: Add rocket upgrades to `src/upgrades.js`**

Add these entries to the `UPGRADES` array and update `pickUpgrades` filter:

```js
  // Rocket upgrades
  {
    id: 'rocket_dmg', label: 'ROCKET POWER', desc: '+15 rocket damage',
    rarity: 'common', icon: '💥', requires: 'rocket',
    apply: (p) => { p.weapons.find(w => w.type === 'rocket').damage += 15 },
  },
  {
    id: 'rocket_aoe', label: 'BIGGER BLAST', desc: '+20 explosion radius',
    rarity: 'rare', icon: '🔥', requires: 'rocket',
    apply: (p) => { p.weapons.find(w => w.type === 'rocket').aoeRadius += 20 },
  },
  {
    id: 'rocket_cd', label: 'RAPID ROCKETS', desc: 'Rocket fires 15% faster',
    rarity: 'rare', icon: '🚀', requires: 'rocket',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'rocket')
      w.cooldown = Math.max(0.8, w.cooldown * 0.85)
    },
  },
  {
    id: 'get_rocket', label: 'ROCKET LAUNCHER', desc: 'Add the rocket weapon',
    rarity: 'epic', icon: '🚀', excludes: 'rocket',
    apply: (p) => { p.weapons.push(createWeapon('rocket')) },
  },
```

At the top of `src/upgrades.js`, update import:
```js
import { createWeapon } from './entities.js'
```
(already present — no change needed)

- [ ] **Step 9: Update `src/render.js` to draw rocket projectiles with orange glow**

In `_drawProjectile`, update to handle rocket color:

```js
function _drawProjectile(ctx, proj) {
  const { x, y } = proj.pos
  const isRocket = proj.weaponType === 'rocket'
  const color = isRocket ? '#ff6600' : '#ffffff'
  ctx.save()
  ctx.shadowBlur = isRocket ? 16 : 12
  ctx.shadowColor = color
  ctx.fillStyle = color
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
```

- [ ] **Step 10: Run full test suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js src/systems/weapons.js src/systems/movement.js src/systems/collision.js src/upgrades.js src/render.js tests/systems/weapons.test.js && git commit -m "$(cat <<'EOF'
feat: rocket weapon — AOE on hit and expiry, upgrade cards, orange render

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Whip: cooldown 0.9 (+50%), damage 11 (−27% ≈ −25%) — Task 1
- ✅ Wand: cooldown 0.53 (−34% ≈ −50% faster), damage 22 (+10%) — Task 1
- ✅ ESC pause in playing/paused state — Task 1
- ✅ Retry → `state = 'start'` (weapon select) for both keyboard R and PLAY AGAIN button — Task 1
- ✅ speedster: speed 220, HP 18, radius 6 — Task 2
- ✅ brute: speed 35, HP 280, radius 18 — Task 2
- ✅ Both new enemies in WAVES with correct startTime — Task 2
- ✅ `createMagnet()` returns `pickupType: 'magnet'` entity — Task 3
- ✅ Magnet collected → all gems get `attracted = true` — Task 3
- ✅ Attracted gems fly toward player at 400px/s — Task 3
- ✅ Attracted gems collected on arrival (not instant) — Task 3
- ✅ Magnet rendered in purple — Task 3
- ✅ `_rollPickupDrop` drops magnets (5%) and weapons (5%) independently — Task 3
- ✅ Rocket config: cooldown 2.0, damage 60, shots 1, aoeRadius 80 — Task 4
- ✅ Rockets travel 300px/s, radius 7, orange — Task 4
- ✅ Rocket hits enemy: full damage to target + 50% AOE to nearby — Task 4
- ✅ Rocket expires: 50% AOE explosion at current position — Task 4
- ✅ `_upgradeWeapon('rocket')` → `shots += 1` — Task 4
- ✅ `get_rocket` epic + 3 upgrade cards — Task 4

**Placeholder scan:** None found. All code is complete.

**Type consistency:**
- `createMagnet()` → `pickupType: 'magnet'` in entities.js; checked with `pickup.pickupType === 'magnet'` in pickup.js ✓
- `proj.aoe`, `proj.aoeRadius`, `proj.weaponType`, `proj.explode` all initialized in pool (Task 4 Step 3), set in `_tickWand`/`_tickRocket` (Task 4 Step 4), consumed in collision.js (Task 4 Step 7) ✓
- `_rollPickupDrop` renamed consistently — called from 2 places in `updateCollision` + 1 place in `_aoeExplosion` ✓
- `MAGNET_SPEED = 400` in gems.js — matches spec ✓
