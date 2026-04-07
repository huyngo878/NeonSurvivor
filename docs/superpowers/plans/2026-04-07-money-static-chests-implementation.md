# Money Economy + Static Map Chests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace enemy chest drops with a money economy — enemies drop money on kill, 6 hand-placed chest nodes per zone require money to open, chest costs scale globally with an exponential formula.

**Architecture:** `moneyValue` per enemy type in `ENEMY_TYPES`; `player.money` and `gameState.chestsOpened` track the economy. A new `src/zones.js` holds hand-authored zone layouts. `createChestNode()` spawns persistent world entities. `updateChestNodes()` in `pickup.js` detects proximity and sets `gameState.nearestChest`; `KeyE` in `main.js` triggers the purchase. HUD displays money below HP bar. Chest nodes render in `render.js` with opened/unopened states and proximity glow.

**Tech Stack:** Vanilla JS ES modules, Vitest for tests.

---

## File Map

| File | Change |
|------|--------|
| `src/entities.js` | Add `moneyValue` to ENEMY_TYPES; add `createChestNode()` |
| `src/zones.js` | **New** — ZONE_LAYOUTS with Zone 1 chest positions; `spawnZoneChests()` |
| `src/systems/collision.js` | Award `player.money` on kill; remove chest from `_rollPickupDrop` |
| `src/systems/pickup.js` | Add `updateChestNodes()` and `chestCost()` |
| `src/ui/hud.js` | Add money display below HP bar |
| `src/render.js` | Draw `chestNode` entities (opened/unopened, proximity glow) |
| `src/main.js` | Call `spawnZoneChests()` in `initGame()`; `KeyE` purchase handler; call `updateChestNodes()` in game loop; add `player.money=0` and `gameState.chestsOpened=0` to init |

---

## Task 1: Money Per Kill + Remove Chest Drops

**Files:**
- Modify: `src/entities.js`
- Modify: `src/systems/collision.js`
- Test: `tests/systems/collision.test.js`
- Test: `tests/entities.test.js`

- [ ] **Step 1: Write failing test for moneyValue in ENEMY_TYPES**

Add to `tests/entities.test.js` inside the `describe('createEnemy', ...)` block:

```js
  it('all ENEMY_TYPES have a moneyValue', () => {
    for (const [type, cfg] of Object.entries(ENEMY_TYPES)) {
      expect(typeof cfg.moneyValue, `${type} missing moneyValue`).toBe('number')
      expect(cfg.moneyValue).toBeGreaterThan(0)
    }
  })
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

Expected: FAIL — moneyValue is undefined.

- [ ] **Step 3: Add `moneyValue` to ENEMY_TYPES in `src/entities.js`**

Replace the existing `ENEMY_TYPES` export:

```js
export const ENEMY_TYPES = {
  chaser:    { speed: 120, hp: 30,   maxHp: 30,   radius: 8,  color: '#ff0080', damage: 10, gemValue: 1,  gemRadius: 6,  gemColor: '#00ff88', moneyValue: 1  },
  tank:      { speed: 55,  hp: 120,  maxHp: 120,  radius: 14, color: '#ff4400', damage: 20, gemValue: 3,  gemRadius: 8,  gemColor: '#ffd700', moneyValue: 3  },
  speedster: { speed: 220, hp: 18,   maxHp: 18,   radius: 6,  color: '#ff44ff', damage: 8,  gemValue: 1,  gemRadius: 6,  gemColor: '#00ffff', moneyValue: 2  },
  brute:     { speed: 35,  hp: 280,  maxHp: 280,  radius: 18, color: '#aa00ff', damage: 35, gemValue: 6,  gemRadius: 10, gemColor: '#cc88ff', moneyValue: 5  },
  boss:      { speed: 70,  hp: 2500, maxHp: 2500, radius: 30, color: '#ffcc00', damage: 40, gemValue: 20, gemRadius: 12, gemColor: '#ffffff', moneyValue: 25 },
}
```

- [ ] **Step 4: Run entities tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

- [ ] **Step 5: Write failing tests for money awarded on kill**

Add to `tests/systems/collision.test.js`, at the bottom:

```js
describe('updateCollision — money on kill', () => {
  it('awards chaser moneyValue to player on kill', () => {
    const player = createPlayer()
    player.money = 0
    const enemy = createEnemy('chaser', 200, 200)
    enemy.hp = 1
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.money).toBe(1)
  })

  it('awards boss moneyValue 25 on kill', () => {
    const player = createPlayer()
    player.money = 10
    const enemy = createEnemy('boss', 200, 200)
    enemy.hp = 1
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.money).toBe(35)
  })

  it('does not crash when player has no money field', () => {
    const player = createPlayer()
    // no player.money set
    const enemy = createEnemy('chaser', 200, 200)
    enemy.hp = 1
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    expect(() => updateCollision([player, enemy, ...pool], gameState)).not.toThrow()
  })
})
```

- [ ] **Step 6: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/collision.test.js 2>&1 | tail -6
```

Expected: FAIL — player.money is not updated.

- [ ] **Step 7: Add `player.money` init to `createPlayer()` in `src/entities.js`**

Add `money: 0,` to the returned object in `createPlayer()`, after `armor: 0`:

```js
    armor: 0,
    money: 0,
```

- [ ] **Step 8: Award money in `_killEnemy` in `src/systems/collision.js`**

Find the `_killEnemy` function. It currently handles `gameState.kills++`, gem drops, and pickup drops. Add money award:

```js
function _killEnemy(enemy, entities, player, gameState) {
  gameState.kills++
  enemy.dead = true
  _dropGem(enemy, entities)
  _rollPickupDrop(enemy, entities, player)
  if (player) {
    const cfg = ENEMY_TYPES[enemy.enemyType]
    if (cfg) player.money = (player.money || 0) + cfg.moneyValue
  }
}
```

If `_killEnemy` does not exist as a named function (kills may be inline), find every place that does `gameState.kills++` and add the money award immediately after:

```js
gameState.kills++
if (player) {
  const cfg = ENEMY_TYPES[enemy.enemyType]
  if (cfg) player.money = (player.money || 0) + cfg.moneyValue
}
```

- [ ] **Step 9: Remove chest drops from `_rollPickupDrop` in `src/systems/collision.js`**

Find `_rollPickupDrop`. Remove the chest drop lines so only magnet and weapon drops remain:

```js
function _rollPickupDrop(enemy, entities, player) {
  const magnetRate = 0.005

  if (Math.random() < magnetRate) {
    entities.push(createMagnet(enemy.pos.x, enemy.pos.y))
  }
}
```

Also remove `createChest` from the import at the top of `collision.js` (it's no longer used here):

```js
import { ENEMY_TYPES, createGem, createMagnet, createShockwave, createEnemyProjectile } from '../entities.js'
```

- [ ] **Step 10: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

Expected: all tests pass (117 + 3 new = 120).

- [ ] **Step 11: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js src/systems/collision.js tests/entities.test.js tests/systems/collision.test.js && git commit -m "$(cat <<'EOF'
feat: money per kill — moneyValue on ENEMY_TYPES, award on kill, remove chest drops

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Zone Layouts + Chest Node Entity

**Files:**
- Create: `src/zones.js`
- Modify: `src/entities.js`
- Test: `tests/entities.test.js`
- Test: `tests/zones.test.js` (new)

- [ ] **Step 1: Write failing test for `createChestNode`**

Add to `tests/entities.test.js`:

```js
import { createPlayer, createEnemy, createWeapon, createPickup, createGem, createMagnet, createChestNode, initProjectilePool, ENEMY_TYPES } from '../src/entities.js'

describe('createChestNode', () => {
  it('returns a chestNode entity with correct shape', () => {
    const node = createChestNode(750, 400)
    expect(node.type).toBe('chestNode')
    expect(node.pos).toEqual({ x: 750, y: 400 })
    expect(node.radius).toBe(14)
    expect(node.opened).toBe(false)
    expect(node.bobTimer).toBe(0)
    expect(typeof node.id).toBe('number')
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

Expected: FAIL — `createChestNode is not a function`.

- [ ] **Step 3: Add `createChestNode` to `src/entities.js`**

After `createMagnet`, add:

```js
export function createChestNode(x, y) {
  return {
    id: nextId++,
    type: 'chestNode',
    pos: { x, y },
    radius: 14,
    opened: false,
    bobTimer: 0,
  }
}
```

- [ ] **Step 4: Run entities tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/entities.test.js 2>&1 | tail -6
```

- [ ] **Step 5: Write failing tests for zone layouts**

Create `tests/zones.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { ZONE_LAYOUTS, spawnZoneChests } from '../src/zones.js'
import { createChestNode } from '../src/entities.js'

describe('ZONE_LAYOUTS', () => {
  it('has at least one zone', () => {
    expect(ZONE_LAYOUTS.length).toBeGreaterThanOrEqual(1)
  })

  it('zone 1 has 6 chest positions', () => {
    expect(ZONE_LAYOUTS[0].chests).toHaveLength(6)
  })

  it('each chest position has x and y', () => {
    for (const chest of ZONE_LAYOUTS[0].chests) {
      expect(typeof chest.x).toBe('number')
      expect(typeof chest.y).toBe('number')
    }
  })
})

describe('spawnZoneChests', () => {
  it('adds 6 chestNode entities to entities array for zone 0', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    const nodes = entities.filter(e => e.type === 'chestNode')
    expect(nodes).toHaveLength(6)
  })

  it('chest nodes are not opened by default', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    for (const node of entities.filter(e => e.type === 'chestNode')) {
      expect(node.opened).toBe(false)
    }
  })

  it('chest node positions match zone layout', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    const nodes = entities.filter(e => e.type === 'chestNode')
    const layout = ZONE_LAYOUTS[0]
    for (let i = 0; i < layout.chests.length; i++) {
      expect(nodes[i].pos.x).toBe(layout.chests[i].x)
      expect(nodes[i].pos.y).toBe(layout.chests[i].y)
    }
  })
})
```

- [ ] **Step 6: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/zones.test.js 2>&1 | tail -6
```

Expected: FAIL — `Cannot find module '../src/zones.js'`.

- [ ] **Step 7: Create `src/zones.js`**

```js
import { createChestNode } from './entities.js'

export const ZONE_LAYOUTS = [
  // Zone 1 — open arena, player starts at (1500, 1500)
  {
    chests: [
      { x: 750,  y: 400  },
      { x: 2300, y: 550  },
      { x: 400,  y: 1600 },
      { x: 2600, y: 1400 },
      { x: 850,  y: 2500 },
      { x: 2200, y: 2400 },
    ],
  },
]

export function spawnZoneChests(entities, zoneIndex) {
  const layout = ZONE_LAYOUTS[zoneIndex]
  if (!layout) return
  for (const { x, y } of layout.chests) {
    entities.push(createChestNode(x, y))
  }
}
```

- [ ] **Step 8: Run zone tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/zones.test.js 2>&1 | tail -6
```

- [ ] **Step 9: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

- [ ] **Step 10: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/entities.js src/zones.js tests/entities.test.js tests/zones.test.js && git commit -m "$(cat <<'EOF'
feat: createChestNode entity + ZONE_LAYOUTS with Zone 1 chest positions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Chest Proximity Detection + Purchase

**Files:**
- Modify: `src/systems/pickup.js`
- Test: `tests/systems/pickup.test.js`

- [ ] **Step 1: Write failing tests for `chestCost` and `updateChestNodes`**

Add to `tests/systems/pickup.test.js`:

```js
import { updatePickup, updateChestNodes, chestCost } from '../../src/systems/pickup.js'
import { createPlayer, createPickup, createWeapon, createMagnet, createGem, createChestNode, initProjectilePool } from '../../src/entities.js'

describe('chestCost', () => {
  it('returns 10 when 0 chests opened', () => {
    expect(chestCost(0)).toBe(10)
  })

  it('returns 12 when 1 chest opened', () => {
    expect(chestCost(1)).toBe(12)
  })

  it('increases monotonically', () => {
    for (let i = 0; i < 10; i++) {
      expect(chestCost(i + 1)).toBeGreaterThan(chestCost(i))
    }
  })
})

describe('updateChestNodes', () => {
  it('sets nearestChest when player is within 80px of an unopened node', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const node = createChestNode(160, 100)  // 60px away
    const entities = [player, node]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest).not.toBeNull()
    expect(gameState.nearestChest.node).toBe(node)
    expect(gameState.nearestChest.cost).toBe(10)
  })

  it('sets nearestChest to null when no node is in range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const node = createChestNode(500, 500)  // far away
    const entities = [player, node]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest).toBeNull()
  })

  it('ignores opened nodes', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const node = createChestNode(110, 100)
    node.opened = true
    const entities = [player, node]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest).toBeNull()
  })

  it('picks the nearest node when multiple are in range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const near = createChestNode(130, 100)   // 30px
    const farther = createChestNode(170, 100)  // 70px
    const entities = [player, near, farther]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest.node).toBe(near)
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/pickup.test.js 2>&1 | tail -6
```

Expected: FAIL — `chestCost is not a function`, `updateChestNodes is not a function`.

- [ ] **Step 3: Add `chestCost` and `updateChestNodes` to `src/systems/pickup.js`**

Add these exports at the bottom of the file:

```js
export function chestCost(chestsOpened) {
  return Math.floor(10 * Math.pow(1.22, chestsOpened))
}

export function updateChestNodes(entities, player, gameState) {
  if (!player) return
  const PROXIMITY = 80
  let nearest = null
  let nearestDist = Infinity

  for (const e of entities) {
    if (e.type !== 'chestNode' || e.opened) continue
    const dist = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y)
    if (dist <= PROXIMITY && dist < nearestDist) {
      nearest = e
      nearestDist = dist
    }
  }

  gameState.nearestChest = nearest
    ? { node: nearest, cost: chestCost(gameState.chestsOpened || 0) }
    : null
}
```

- [ ] **Step 4: Run pickup tests — verify PASS**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/systems/pickup.test.js 2>&1 | tail -6
```

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/systems/pickup.js tests/systems/pickup.test.js && git commit -m "$(cat <<'EOF'
feat: chestCost formula + updateChestNodes proximity detection

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire Into main.js — initGame, Game Loop, KeyE Purchase

**Files:**
- Modify: `src/main.js`

No isolated unit tests for main.js wiring — verified by integration (game runs, chest opens).

- [ ] **Step 1: Import `spawnZoneChests` and `updateChestNodes` in `src/main.js`**

Add to the imports at the top:

```js
import { spawnZoneChests } from './zones.js'
import { updateChestNodes } from './systems/pickup.js'
```

The existing import of `updatePickup` stays.

- [ ] **Step 2: Add `chestsOpened: 0` and `nearestChest: null` to `gameState` in `initGame()`**

Find the `initGame` function. In the `gameState = { ... }` block, add:

```js
    chestsOpened: 0,
    nearestChest: null,
```

Also call `spawnZoneChests` right after `entities` is initialized:

```js
  entities = [player, ...pool]
  spawnZoneChests(entities, 0)
```

- [ ] **Step 3: Call `updateChestNodes` in the game loop**

In the `if (gameState.state === 'playing')` block, after the existing `updatePickup` call, add:

```js
      updateChestNodes(entities, player, gameState)
```

- [ ] **Step 4: Add `KeyE` purchase handler in the keydown listener**

In the keydown handler, in the playing/paused section (after the existing `KeyP`/`Escape` block), add:

```js
  if (e.code === 'KeyE' && gameState.state === 'playing') {
    const nc = gameState.nearestChest
    const player = entities.find(e => e.type === 'player')
    if (nc && player && player.money >= nc.cost) {
      player.money -= nc.cost
      gameState.chestsOpened = (gameState.chestsOpened || 0) + 1
      nc.node.opened = true
      gameState.nearestChest = null
      const { pickChestCards } = await import('./upgrades.js')
      gameState.upgradeChoices = pickChestCards(player, 3 + (player.extraChoices || 0))
      gameState.state = 'chest'
    }
  }
```

**Note:** `upgrades.js` is already imported at the top of `main.js` as a static import. Replace the dynamic `await import` with a direct call — just verify the existing import includes `pickChestCards`. If it does not, add it to the existing import line. The handler should be:

```js
  if (e.code === 'KeyE' && gameState.state === 'playing') {
    const nc = gameState.nearestChest
    const player = entities.find(ent => ent.type === 'player')
    if (nc && player && player.money >= nc.cost) {
      player.money -= nc.cost
      gameState.chestsOpened = (gameState.chestsOpened || 0) + 1
      nc.node.opened = true
      gameState.nearestChest = null
      gameState.upgradeChoices = pickChestCards(player, 3 + (player.extraChoices || 0))
      gameState.state = 'chest'
    }
  }
```

- [ ] **Step 5: Add mobile tap-to-buy**

In the `touchstart` handler (inside `if (isMobile)`), in the branch that falls through to `_handlePointer`, add a chest purchase path before `_handlePointer`:

```js
    if (gameState.state === 'playing' && !inJoystickZone) {
      const nc = gameState.nearestChest
      const player = entities.find(ent => ent.type === 'player')
      if (nc && player && player.money >= nc.cost) {
        player.money -= nc.cost
        gameState.chestsOpened = (gameState.chestsOpened || 0) + 1
        nc.node.opened = true
        gameState.nearestChest = null
        gameState.upgradeChoices = pickChestCards(player, 3 + (player.extraChoices || 0))
        gameState.state = 'chest'
        return
      }
    }
```

Place this before the existing `_handlePointer(t.clientX, t.clientY)` call.

- [ ] **Step 6: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/main.js && git commit -m "$(cat <<'EOF'
feat: wire chest nodes into game loop — spawnZoneChests, updateChestNodes, KeyE purchase

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: HUD Money Display + Chest Floating Label

**Files:**
- Modify: `src/ui/hud.js`

- [ ] **Step 1: Add money display below HP bar in `src/ui/hud.js`**

Find the section that draws the HP text (`fillText(\`${Math.ceil(player.hp)} / ${player.maxHp}\`...)`). After that block, add:

```js
  // Money display — below HP text
  ctx.save()
  ctx.font = '18px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`💰 ${player.money || 0}$`, barX, barY + barH + 40)
  ctx.restore()
```

(`barX = 24`, `barH = 24`, `barY = 24` — so this lands at y = 24 + 24 + 40 = 88, below the "100/100" HP text which is at y = 66.)

- [ ] **Step 2: Add floating chest label to `src/ui/hud.js`**

`drawHud` already receives `(ctx, canvas, player, gameState)`. At the end of `drawHud`, add the floating label section:

```js
  // Chest proximity label — drawn in screen space using camera offset from gameState
  if (gameState.nearestChest && gameState.camera) {
    const { node, cost } = gameState.nearestChest
    const zoom = gameState.zoom || 1
    const screenX = (node.pos.x - gameState.camera.x) * zoom
    const screenY = (node.pos.y - gameState.camera.y) * zoom - 28

    const canAfford = (player.money || 0) >= cost
    const labelColor = canAfford ? '#00ff88' : '#ff4444'
    const text = `💰 ${cost}$  E to open`

    ctx.save()
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    const textW = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath()
    ctx.roundRect(screenX - textW / 2 - 8, screenY - 16, textW + 16, 22, 4)
    ctx.fill()
    ctx.fillStyle = labelColor
    ctx.shadowBlur = 6
    ctx.shadowColor = labelColor
    ctx.fillText(text, screenX, screenY)
    ctx.restore()
  }
```

- [ ] **Step 3: Pass `camera` into `gameState` in `src/main.js`**

The `camera` object is local in `main.js`. `drawHud` needs access to it. The cleanest approach without refactoring: store camera on gameState after each `updateCamera` call.

In the game loop, after `updateCamera(player)`, add:

```js
      gameState.camera = camera
```

- [ ] **Step 4: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/hud.js src/main.js && git commit -m "$(cat <<'EOF'
feat: HUD money display + floating chest label (green/red based on affordability)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Render Chest Nodes

**Files:**
- Modify: `src/render.js`

- [ ] **Step 1: Add chest node rendering to `renderWorld` in `src/render.js`**

In `renderWorld`, in the first pass loop (where gems/pickups/shockwaves are drawn), add a chestNode case:

```js
  for (const e of entities) {
    if (e.type === 'pickup') _drawPickup(ctx, e)
    else if (e.type === 'gem') _drawGem(ctx, e)
    else if (e.type === 'shockwave') _drawShockwave(ctx, e)
    else if (e.type === 'chestNode') _drawChestNode(ctx, e, gameState)
  }
```

Update the `renderWorld` signature to accept `gameState`:

```js
export function renderWorld(ctx, canvas, entities, camera, zoom = 1, gameState = {}) {
```

- [ ] **Step 2: Add `_drawChestNode` function to `src/render.js`**

Add after `_drawPickup`:

```js
function _drawChestNode(ctx, node, gameState) {
  const { x, y } = node.pos
  const yOff = Math.sin(node.bobTimer * 2) * 3
  const isNear = gameState.nearestChest?.node === node

  ctx.save()

  if (node.opened) {
    // Opened — dark, no glow
    ctx.fillStyle = '#333'
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.fillRect(x - 10, y + yOff - 8, 20, 14)
    ctx.strokeRect(x - 10, y + yOff - 8, 20, 14)
  } else {
    // Unopened — gold with glow, brighter when nearby
    ctx.shadowBlur = isNear ? 28 : 14
    ctx.shadowColor = '#ffd700'
    // Lid
    ctx.fillStyle = '#ffaa00'
    ctx.fillRect(x - 10, y + yOff - 13, 20, 7)
    // Body
    ctx.fillStyle = '#ffd700'
    ctx.fillRect(x - 10, y + yOff - 7, 20, 14)
    // Latch
    ctx.fillStyle = '#ffaa00'
    ctx.fillRect(x - 3, y + yOff - 5, 6, 5)
  }

  ctx.restore()
  node.bobTimer += 0.016  // approximate dt — actual dt not passed here
}
```

- [ ] **Step 3: Update all `renderWorld` call sites in `src/main.js` to pass `gameState`**

Find every `renderWorld(ctx, canvas, entities, camera, gameState.zoom)` call and change to:

```js
renderWorld(ctx, canvas, entities, camera, gameState.zoom, gameState)
```

There are 2 call sites (playing/paused block and chest screen block).

- [ ] **Step 4: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/render.js src/main.js && git commit -m "$(cat <<'EOF'
feat: render chest nodes — gold with glow when nearby, dark when opened

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ `player.money` starts at 0 — Task 1 (createPlayer) + Task 4 (initGame)
- ✅ `moneyValue` per ENEMY_TYPE — Task 1
- ✅ Money awarded on kill — Task 1 (_killEnemy)
- ✅ Chest drops removed from _rollPickupDrop — Task 1
- ✅ `createChestNode()` — Task 2
- ✅ `ZONE_LAYOUTS` with Zone 1 six chest positions — Task 2
- ✅ `spawnZoneChests()` called in `initGame()` — Task 4
- ✅ `chestCost(chestsOpened)` formula — Task 3
- ✅ `updateChestNodes()` finds nearest within 80px — Task 3
- ✅ `gameState.nearestChest = { node, cost }` — Task 3
- ✅ `KeyE` purchase: deduct money, increment chestsOpened, mark opened, open chest screen — Task 4
- ✅ Mobile tap purchase — Task 4
- ✅ HUD money display below HP bar in gold — Task 5
- ✅ Floating label above chest, green/red based on affordability — Task 5
- ✅ `gameState.camera` set after updateCamera — Task 5
- ✅ Chest nodes rendered (opened/unopened, proximity glow) — Task 6
- ✅ `renderWorld` receives `gameState` — Task 6

**Placeholder scan:** None. All values, formulas, positions, and code are fully specified.

**Type consistency:**
- `createChestNode()` → `type: 'chestNode'` → checked with `e.type === 'chestNode'` in `updateChestNodes` and `renderWorld` ✓
- `gameState.nearestChest = { node, cost }` set by `updateChestNodes` → read by HUD and KeyE handler ✓
- `gameState.chestsOpened` initialized in `initGame()`, incremented in KeyE handler, passed to `chestCost()` ✓
- `pickChestCards` — already imported in `main.js` (used by existing chest flow), no new import needed ✓
- `spawnZoneChests(entities, 0)` — zoneIndex 0 = Zone 1 in ZONE_LAYOUTS[0] ✓
