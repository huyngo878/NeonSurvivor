# VS-Clone Browser Game

## Stack
- Vanilla JS + HTML5 Canvas (no framework)
- Single `index.html` entry point
- No build step initially — add Vite when project grows

## Architecture
```
/src
  main.js          # game loop (requestAnimationFrame + delta time)
  entities.js      # ECS — plain objects, no classes
  systems/
    movement.js
    collision.js   # spatial hash grid
    weapons.js     # auto-fire, cooldown-based
    spawner.js     # wave config, difficulty curve
  ui/
    hud.js
    upgradeScreen.js
assets/
index.html
```

## Core Systems

**Game loop** — always use delta time (`dt` in seconds), never fixed frame assumptions

**ECS** — entities are plain objects `{ id, pos, vel, hp, ... }`, systems are functions that filter + mutate

**Collision** — spatial hash grid only; no brute-force O(n²) checks

**Weapons** — each weapon: `{ cooldown, damage, range, fire(player, enemies) }`; auto-fires on tick

**Spawner** — wave definitions as data `[{ enemy, count, interval, startTime }]`

**XP/Level** — gems drop on kill, pickup radius check, level-up pauses game and shows 3 upgrade cards

## Performance Rules
- Object pool projectiles and enemies — never `new` inside the game loop
- Dirty flag rendering — only redraw changed regions when possible
- Cap active projectiles (e.g. 500 max)
- Profile with Chrome DevTools before optimizing anything

## Monetization Path
1. Ship on itch.io (free, fast)
2. PWA manifest for mobile install
3. Add rewarded ads (Crazy Games SDK or AdSense) once traffic exists
4. Capacitor wrap → App Store / Play Store if traction

## CICD
- GitHub Actions: lint + run unit tests on push
- Auto-deploy to GitHub Pages or Vercel on merge to `main`
- Versioned releases tagged `v0.x.x`

## Build Phases
1. Loop + player movement
2. ECS + spatial grid
3. Enemy AI (chase player)
4. Weapon system (whip + wand)
5. XP gems + level-up UI
6. Wave config + difficulty scaling
7. Meta progression + localStorage save
8. PWA + monetization