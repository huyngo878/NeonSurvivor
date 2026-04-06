# Phase 9 — Balance, Enemy Variants, Magnet Pickup & Rocket Weapon Design

**Date:** 2026-04-06
**Status:** Approved

---

## Overview

Six deliverables in one phase:
1. **Weapon balance** — nerf whip, boost wand
2. **ESC pause** — add ESC key as pause toggle
3. **Retry → reselect** — retry sends player back to weapon select screen
4. **Enemy variants** — two new enemy types (speedster, brute)
5. **Magnet pickup** — rare drop that animates all gems flying to the player
6. **Rocket weapon** — new AOE weapon, drops from enemies, upgrades add more projectiles

---

## 1. Weapon Balance

**Whip** (in `WEAPON_CONFIGS` in `entities.js`):
- `cooldown: 0.6 → 0.9` (50% slower attack)
- `damage: 15 → 11` (~25% less damage)

**Wand** (in `WEAPON_CONFIGS` in `entities.js`):
- `cooldown: 0.8 → 0.53` (50% faster attack)
- `damage: 20 → 22` (10% more damage)

---

## 2. ESC Pause

In `src/main.js`, the playing/paused keydown block currently checks `e.code === 'KeyP'`. Add `e.code === 'Escape'` as an additional trigger for the same toggle.

---

## 3. Retry → Weapon Reselect

In `src/main.js`, the run summary `KeyR` handler and the "PLAY AGAIN" button click handler currently call `initGame(gameState.selectedWeapon)` directly. Change both to set `gameState.state = 'start'` instead, so the player is returned to the weapon selection screen.

---

## 4. Enemy Variants

**New types** added to `ENEMY_TYPES` in `entities.js`:

| Type | Speed | HP | maxHp | Radius | Color | Damage | gemValue | gemRadius | gemColor |
|------|-------|----|-------|--------|-------|--------|----------|-----------|----------|
| `speedster` | 220 | 18 | 18 | 6 | `#ff44ff` | 8 | 1 | 6 | `#00ffff` |
| `brute` | 35 | 280 | 280 | 18 | `#aa00ff` | 35 | 6 | 10 | `#cc88ff` |

`speedster`: faster than chaser, glass cannon, small hitbox. Spawns from t=0.
`brute`: slower than tank, 2× HP, big gem reward. Spawns from t=30.

**New wave entries** added to `WAVES` in `spawner.js`:
```js
{ enemyType: 'speedster', count: 3, interval: 1.5, startTime: 0 },
{ enemyType: 'brute',     count: 1, interval: 15.0, startTime: 30 },
```

---

## 5. Magnet Pickup

### Drop Logic

`_rollPickupDrop` in `src/systems/collision.js` (renamed from `_rollWeaponDrop`) handles all pickup drops:
- 5% base chance for magnet drop (+ `player.dropRateBonus`)
- 5%+ for weapon drops (unchanged)
- Both checked independently per kill

### Entity

`createMagnet(x, y)` added to `entities.js`:
```js
{
  id, type: 'pickup', pickupType: 'magnet',
  pos: { x, y }, radius: 10, bobTimer: 0,
}
```

### On Collect

When `updatePickup` detects collision with a magnet pickup:
- Remove the magnet from entities
- Set `e.attracted = true` on every gem in entities

### Gem Flight Animation

`updateGems` in `src/systems/gems.js` handles attracted gems:
- Each frame, if `gem.attracted`, move gem toward player at 400px/s
- When gem reaches player's pickup radius, collect it (award XP, remove from entities)
- Non-attracted gems use the existing spatial hash collection as before

### Render

`render.js` draws magnets and attracted gems:
- Magnet pickup: circle with purple (`#cc00ff`) glow, `⊛` label
- Attracted gems: existing bob draw unchanged (motion is handled by position update)

---

## 6. Rocket Weapon

### Weapon Config

Added to `WEAPON_CONFIGS` in `entities.js`:
```js
rocket: { type: 'rocket', cooldown: 2.0, damage: 60, range: 500, shots: 1, aoeRadius: 80 }
```

### Projectile Pool

Pool entries gain two new fields:
- `aoe: false` — true for rocket projectiles
- `aoeRadius: 0` — explosion radius in px
- `weaponType: ''` — tracks which weapon fired this projectile

### Firing Behavior (`src/systems/weapons.js`)

- Fires at nearest enemy in range, one rocket per `shots`
- Rocket projectiles travel at 300px/s (vs 400px/s for wand)
- Projectile radius: 7, color: `#ff6600`
- Lifetime: 2.0s — explodes at current position on expiry

### AOE Explosion (`src/systems/collision.js`)

When a rocket projectile hits an enemy:
- Full `proj.damage` to the hit enemy
- 50% damage (`proj.damage * 0.5`) to all other enemies within `proj.aoeRadius`
- Projectile deactivated immediately after

When a rocket projectile expires (age >= lifetime, `proj.aoe === true`):
- Explodes at current position — 50% damage to all enemies within `proj.aoeRadius`

### Pickup / Upgrade

Drops from enemies same as weapon pickups (using `_rollPickupDrop`). First pickup adds the rocket weapon (`shots: 1`). Each additional pickup calls `_upgradeWeapon('rocket')` which does `weapon.shots += 1`.

In `upgrades.js`, rocket upgrades added:
```js
{ id: 'rocket_dmg',   requires: 'rocket', ... apply: w.damage += 15 }
{ id: 'rocket_aoe',   requires: 'rocket', ... apply: w.aoeRadius += 20 }
{ id: 'rocket_cd',    requires: 'rocket', ... apply: w.cooldown = max(0.8, w.cooldown * 0.85) }
{ id: 'get_rocket',   excludes: 'rocket', epic, apply: p.weapons.push(createWeapon('rocket')) }
```

### Render

`render.js` draws rocket projectiles:
- Radius 7, color `#ff6600`, orange glow (`shadowBlur: 12, shadowColor: '#ff6600'`)
- Larger than wand orbs (radius 4)

---

## File Map

| File | Change |
|------|--------|
| `src/entities.js` | Add speedster/brute to ENEMY_TYPES; add rocket to WEAPON_CONFIGS; add aoe/aoeRadius/weaponType to projectile pool; add createMagnet() |
| `src/systems/spawner.js` | Add speedster and brute wave entries |
| `src/systems/weapons.js` | Add _tickRocket() |
| `src/systems/collision.js` | Rename _rollWeaponDrop → _rollPickupDrop; add magnet drop; add rocket AOE on hit and on expiry |
| `src/systems/gems.js` | Handle attracted gems (fly toward player at 400px/s) |
| `src/systems/pickup.js` | Handle pickupType === 'magnet'; update _upgradeWeapon for rocket |
| `src/upgrades.js` | Add rocket upgrade cards and get_rocket epic |
| `src/render.js` | Draw rocket projectiles (orange glow); draw magnet pickup |
| `src/main.js` | ESC pause; retry → state='start' |

---

## Self-Review

**Placeholder scan:** No TBDs. All values are concrete.

**Consistency:**
- `createMagnet` returns `pickupType: 'magnet'` — `updatePickup` checks `pickupType === 'magnet'` ✓
- Rocket `aoeRadius` on weapon config → copied to `proj.aoeRadius` when firing ✓
- `_rollPickupDrop` renamed consistently in collision.js — no other callers ✓
- Retry path: `gameState.state = 'start'` (not `initGame`) — weapon select screen handles `state === 'start'` ✓
- Attracted gem velocity in `updateGems` — no spatial hash needed (move unconditionally) ✓
- `proj.weaponType` set when firing rocket — used in expiry check to trigger AOE ✓

**Scope:** Six independent deliverables but all touch the same core systems. Combined into one phase because they share the collision/pickup/entity pipeline.
