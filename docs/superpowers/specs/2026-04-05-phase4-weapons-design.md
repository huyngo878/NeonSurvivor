# Phase 4 — Weapons & Multi-Weapon System Design

**Date:** 2026-04-05
**Scope:** Phase 4 (whip weapon, start screen weapon select, weapon drops, multi-weapon support)
**Builds on:** Phase 3 (ECS, spatial hash, wand, spawner, HUD)

---

## Overview

Phase 4 adds the whip weapon (melee arc sweep), a start screen where the player selects their starting weapon, weapon drops from enemy deaths (5% chance), and full multi-weapon support (no cap — stack as many weapons as you find). The existing `player.weapons` array already supports multiple weapons; systems just need to dispatch by `weapon.type`.

---

## Game States

A new `'start'` state is added before `'playing'`:

```
'start' → (player presses Enter/Space) → 'playing' → 'paused' / 'dead' → (R) → 'start'
```

`gameState` gains `selectedWeapon: 'wand' | 'whip'` during the start state.

On restart (R key), game returns to `'start'` rather than immediately re-entering `'playing'`, so the player can switch weapon each run. The existing R key handler in `main.js` is changed from `initGame()` to `gameState.state = 'start'` — `initGame(weapon)` is only called when the player confirms weapon selection on the start screen.

---

## Start Screen

**File:** `src/ui/startScreen.js`

Drawn entirely on canvas (no HTML overlays). Shown when `gameState.state === 'start'`.

- Title: "NEON SURVIVE" in large neon cyan text, centered
- Two weapon cards drawn side-by-side:
  - Wand card: cyan (`#00ffc8`), stats label (Cooldown: 0.8s · Damage: 20 · Range: 400px)
  - Whip card: gold (`#ffd700`), stats label (Cooldown: 0.6s · Damage: 15 · Range: 120px)
- Selected card has a glowing border; unselected is dimmed
- `←`/`→` or `A`/`D` keys toggle selection; `Enter` or `Space` starts the run
- `drawStartScreen(ctx, canvas, gameState)` — exported function called from `main.js`

---

## Entity Shapes

### Weapon Objects (on `player.weapons` array)

**Wand** (unchanged from Phase 3):
```js
{ type: 'wand', cooldown: 0.8, timer: 0, damage: 20, range: 400 }
```

**Whip** (new):
```js
{ type: 'whip', cooldown: 0.6, timer: 0, damage: 15, range: 120,
  sweepAngle: Math.PI,       // 180° arc
  active: false,             // true during swing window
  activeTimer: 0,            // counts down from activeDuration
  activeDuration: 0.12,      // seconds the arc is "live"
  hitIds: new Set()          // enemy IDs hit this swing (reset on new swing)
}
```

### Player (additions)
```js
{ ...existing, facing: { x: 1, y: 0 } }  // unit vector, updated on movement
```

### Weapon Pickup
```js
{ id, type: 'pickup', pickupType: 'weapon',
  weaponType: 'wand' | 'whip',
  pos: { x, y }, radius: 10, bobTimer: 0 }
```

**Factory functions in `entities.js`:**
- `createWeapon(type)` — returns the correct weapon config object for `type`
- `createPickup(weaponType, x, y)` — returns a pickup entity

---

## Systems

### movement.js (modified)

When the player moves (direction vector length > 0), update `player.facing`:
```js
player.facing.x = dx / len
player.facing.y = dy / len
```
`facing` is NOT updated when the player is stationary — it retains the last movement direction.

### weapons.js (modified)

Dispatches by `weapon.type`:

**Wand** — unchanged logic from Phase 3.

**Whip:**
- Tick `weapon.timer -= dt`
- When `timer ≤ 0`: set `weapon.active = true`, `weapon.activeTimer = weapon.activeDuration`, `weapon.hitIds = new Set()`, reset `timer = weapon.cooldown`
- Each frame while `weapon.active`: tick `weapon.activeTimer -= dt`; if `activeTimer ≤ 0`, set `weapon.active = false`

### collision.js (modified)

**Whip arc hit detection** — added to `updateCollision`:
- For each whip weapon on player where `weapon.active === true`:
  - Query spatial hash: `shQuery(hash, player.pos.x, player.pos.y, weapon.range + MAX_ENEMY_RADIUS)`
  - For each candidate enemy not already in `weapon.hitIds`:
    - `dist = Math.hypot(...)` — skip if `dist > weapon.range + enemy.radius`
    - `angleToEnemy = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x)`
    - `facingAngle = Math.atan2(player.facing.y, player.facing.x)`
    - Compute angular difference (handle wrap-around): skip if `|angleDiff| > sweepAngle / 2`
    - Apply `weapon.damage` to enemy, add `enemy.id` to `weapon.hitIds`
    - If enemy hp ≤ 0: increment kills, mark dead, **roll weapon drop** (see below)

**Weapon drop on enemy death:**
```js
if (Math.random() < 0.05) {
  const dropType = Math.random() < 0.5 ? 'wand' : 'whip'
  entities.push(createPickup(dropType, enemy.pos.x, enemy.pos.y))
}
```

### pickup.js (new file: `src/systems/pickup.js`)

```js
export function updatePickup(entities, player) { ... }
```

- Build spatial hash of pickups
- Query around player position with radius `player.radius + 10`
- For each pickup in range:
  - If `pickupType === 'weapon'`: check if player already has a weapon of that `weaponType` — if not, push `createWeapon(pickup.weaponType)` onto `player.weapons`
  - Mark pickup as `dead = true` (removed same way as enemies)

### render.js (modified)

**Whip arc** — drawn inside `_drawPlayer` after the player circle:
```js
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
```

**Pickup orbs** — new `_drawPickup(ctx, pickup)`:
- Color: `#00ffc8` for wand, `#ffd700` for whip
- Filled circle + glow
- Bob: `yOffset = Math.sin(pickup.bobTimer * 3) * 4` (bobTimer updated each frame in pickup system)

**HUD** — `src/ui/hud.js` gets a small weapon inventory display bottom-left:
- One icon per weapon in `player.weapons` (W = wand, P = whip)
- Monospace font, neon colored

---

## main.js Changes

- Add `'start'` state routing: call `drawStartScreen` instead of game loop when `state === 'start'`
- Key handling: `←`/`→`/`A`/`D` cycle weapon selection in start state; `Enter`/`Space` begins run with selected weapon
- `initGame(selectedWeapon)` takes the chosen weapon and adds it via `createWeapon(selectedWeapon)`
- Add `updatePickup(entities, player)` to the per-frame system call order (after spawner)
- `bobTimer` updated inside `updatePickup` each frame

---

## System Call Order (main.js)

```
updateMovement → updateWeapons → updateCollision → updateSpawner → updatePickup
```

---

## New / Modified Files

| File | Change |
|------|--------|
| `src/ui/startScreen.js` | New — canvas weapon select screen |
| `src/systems/pickup.js` | New — pickup proximity + weapon grant |
| `src/entities.js` | Add `createWeapon(type)`, `createPickup(weaponType, x, y)`, `facing` on player |
| `src/systems/weapons.js` | Dispatch by type, whip active-window logic |
| `src/systems/collision.js` | Whip arc cone check, weapon drop on kill |
| `src/systems/movement.js` | Update `player.facing` on movement |
| `src/render.js` | Draw whip arc, pickup orbs with bob |
| `src/ui/hud.js` | Weapon inventory icons bottom-left |
| `src/main.js` | Start state routing, initGame(weapon), updatePickup call |
| `tests/entities.test.js` | createWeapon, createPickup tests |
| `tests/systems/weapons.test.js` | Whip fire/timer tests |
| `tests/systems/pickup.test.js` | New — proximity, weapon add, no-duplicate |

---

## Out of Scope (Phase 4)

- XP gems and level-up cards (Phase 5)
- More than 2 weapon types
- Weapon upgrades / stat scaling
- Mobile / touch controls
- Any backend or persistence
