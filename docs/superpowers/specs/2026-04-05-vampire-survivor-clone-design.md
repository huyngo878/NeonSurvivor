# Vampire Survivor Clone — Phase 3 Design

**Date:** 2026-04-05
**Scope:** Phase 3 (playable core loop — no XP, no level-up)
**Stack:** Vanilla JS + HTML5 Canvas, no build step, single `index.html` entry point

---

## Overview

A browser-based Vampire Survivors-like game. Phase 3 delivers a playable survival loop: the player moves through a large world, a magic wand auto-fires at the nearest enemy, two enemy types chase the player, and difficulty increases over time. No XP, no upgrades — just survive.

---

## Visual Style

**Neon Minimal** — pure black background, neon outlines and glow effects, no sprites needed.

- Player: `#00ffc8` (cyan) filled circle with `shadowBlur` glow
- Enemies — chaser: `#ff0080` (pink), tank: `#ff4400` (orange)
- Projectiles: small white/cyan circle with 3-dot motion trail
- World background: black page background with subtle CSS dot-grid (zero canvas cost)
- HUD: neon-colored `ctx.fillText` + bars drawn in screen space

---

## File Structure

```
ClaudeGame/
  index.html
  src/
    main.js               # game loop (rAF + delta time), input state, game state machine
    entities.js           # createPlayer(), createEnemy(type), projectile pool init
    systems/
      movement.js         # player input, enemy chase, projectile travel + expiry
      collision.js        # spatial hash grid, projectile-enemy + enemy-player hits
      weapons.js          # wand auto-fire: tick cooldown, find nearest enemy, emit projectile
      spawner.js          # wave data config, timed spawn, difficulty multiplier
    ui/
      hud.js              # HP bar, timer, kill count, death overlay — all canvas screen-space
  assets/                 # empty (neon style requires no image assets)
  docs/
    superpowers/
      specs/
        2026-04-05-vampire-survivor-clone-design.md
```

`index.html` loads `src/main.js` as `type="module"`. Each system exports a single function called once per frame by `main.js`.

---

## ECS Architecture

Entities are plain objects. Systems filter by field presence. No classes.

### Player
```js
{
  id, type: 'player',
  pos: { x, y }, vel: { x, y },
  hp: 100, maxHp: 100, speed: 200,
  iframes: 0,   // invincibility timer in seconds
  weapons: [{ type: 'wand', cooldown: 0.8, timer: 0, damage: 20, range: 400 }]
}
```

### Enemy Types (data config — add new types here only)
```js
ENEMY_TYPES = {
  chaser: { speed: 120, hp: 30,  maxHp: 30,  radius: 8,  color: '#ff0080', damage: 10 },
  tank:   { speed: 55,  hp: 120, maxHp: 120, radius: 14, color: '#ff4400', damage: 20 },
}
```

### Enemy Instance
```js
{ id, type: 'enemy', enemyType: 'chaser', pos: { x, y }, vel: { x, y },
  hp, maxHp, radius, color, damage }
```

### Projectile (pooled — 500 pre-allocated, never `new` mid-loop)
```js
{ id, type: 'projectile', active: false,
  pos: { x, y }, vel: { x, y },
  damage: 20, radius: 4, lifetime: 2.0, age: 0 }
```

---

## Systems

### movement.js
- **Player:** read `input` map (WASD + arrows), normalize direction vector, `pos += dir * speed * dt`
- **Enemies:** steer toward `player.pos`, normalize, `pos += dir * speed * dt`
- **Projectiles:** `pos += vel * dt`, `age += dt`, deactivate if `age > lifetime` or outside world bounds

### collision.js — Spatial Hash
- Cell size: 64px. Rebuilt every frame.
- **Projectile vs Enemy:** query projectile cell + 8 neighbors → `dist < enemy.radius + proj.radius` → apply damage, deactivate projectile, increment kill count
- **Enemy vs Player:** same query → `dist < enemy.radius + 12` AND `player.iframes <= 0` → apply `enemy.damage` to player, set `player.iframes = 0.5`; tick `player.iframes -= dt` each frame (skip all hits while > 0)

### weapons.js
- Tick `weapon.timer -= dt` each frame
- When `timer ≤ 0`: find nearest enemy within `weapon.range` (linear scan over active enemies), grab first inactive projectile from pool, set `pos/vel/active`, reset `timer = weapon.cooldown`
- If no enemy in range: do nothing (timer still resets to avoid burst-fire on next in-range enemy)

### spawner.js
- Wave config (data array):
```js
waves = [
  { enemyType: 'chaser', count: 5, interval: 2.0, startTime: 0 },
  { enemyType: 'tank',   count: 2, interval: 6.0, startTime: 15 },
]
```
- Enemies spawn at a random point on a circle of radius 600px around the player (always off-screen)
- Difficulty multiplier: every 30s, `count *= 1.2`, `interval *= 0.85` (compounding)

### ui/hud.js
Drawn in screen space (after `ctx.restore()` — no world translate):
- **HP bar:** top-left, cyan fill, dark background, glow
- **Timer:** top-center, `MM:SS` format
- **Kill count:** top-right
- **Death overlay:** centered dark overlay + `YOU DIED` neon text + `[R] to Restart`

---

## World & Camera

- **World size:** 3000×3000px logical space
- **Canvas:** fills browser window (`100vw × 100vh`), resizes on window resize
- **Camera:**
```js
camera = {
  x: clamp(player.pos.x - canvas.width  / 2, 0, WORLD_W - canvas.width),
  y: clamp(player.pos.y - canvas.height / 2, 0, WORLD_H - canvas.height),
}
// Each frame:
ctx.save()
ctx.translate(-camera.x, -camera.y)
// draw world entities
ctx.restore()
// draw HUD
```

---

## Input

```js
const input = { up: false, down: false, left: false, right: false }
const keyMap = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
}
document.addEventListener('keydown', e => { if (keyMap[e.code]) input[keyMap[e.code]] = true })
document.addEventListener('keyup',   e => { if (keyMap[e.code]) input[keyMap[e.code]] = false })
```

---

## Game States

| State | Description |
|-------|-------------|
| `playing` | All systems run each frame |
| `dead` | Player HP ≤ 0, death overlay shown, `R` restarts |
| `paused` | `P` key toggles, `dt = 0`, screen dimmed |

No win condition in Phase 3 — score = time survived + kills.

---

## Performance Rules (from claude.md)

- Projectile pool: 500 pre-allocated, zero allocation in game loop
- Spatial hash: no O(n²) brute-force collision
- Cap active projectiles at 500 (pool size enforces this)
- No `new` inside `requestAnimationFrame` callback
- Profile with Chrome DevTools before any optimization

---

## Out of Scope (Phase 3)

- XP gems and pickup radius
- Level-up pause + upgrade cards
- Wave difficulty beyond the multiplier ramp
- Meta progression / localStorage
- Mobile / touch input
- PWA, monetization, CI/CD
