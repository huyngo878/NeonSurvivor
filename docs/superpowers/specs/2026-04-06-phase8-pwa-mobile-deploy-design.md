# Phase 8 — PWA, Mobile Layout & GitHub Pages Deploy Design

**Date:** 2026-04-06  
**Status:** Approved

---

## Overview

Three deliverables in one phase:
1. **PWA manifest + service worker** — installable, offline-capable
2. **Virtual joystick** — mobile touch input, hidden on desktop
3. **GitHub Pages deploy** — auto-deploy on push via GitHub Actions

---

## 1. New Files

| File | Purpose |
|------|---------|
| `manifest.json` | PWA manifest — name, icons, display mode, start_url |
| `sw.js` | Service worker — cache-first offline support |
| `assets/icon-192.png` | PWA icon 192×192 |
| `assets/icon-512.png` | PWA icon 512×512 |
| `src/ui/joystick.js` | Virtual joystick — draw + state |
| `.github/workflows/deploy.yml` | GitHub Actions — test + deploy to Pages |

**Modified files:**
| File | Change |
|------|--------|
| `index.html` | Add manifest link, theme-color meta, apple PWA meta, SW registration |
| `src/main.js` | Add `isMobile` detection, touch listeners, merge joystick into input, call drawJoystick |

---

## 2. PWA Manifest (`manifest.json`)

```json
{
  "name": "Neon Survive",
  "short_name": "NeonSurvive",
  "description": "Survive the neon apocalypse",
  "start_url": "/NeonSurvivor/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 3. Service Worker (`sw.js`)

**Strategy:** Cache-first for all game assets, network fallback.

**Install event** — caches:
```
/NeonSurvivor/
/NeonSurvivor/index.html
/NeonSurvivor/manifest.json
/NeonSurvivor/assets/icon-192.png
/NeonSurvivor/assets/icon-512.png
/NeonSurvivor/src/main.js
/NeonSurvivor/src/entities.js
/NeonSurvivor/src/constants.js
/NeonSurvivor/src/meta.js
/NeonSurvivor/src/metaUpgrades.js
/NeonSurvivor/src/upgrades.js
/NeonSurvivor/src/render.js
/NeonSurvivor/src/systems/movement.js
/NeonSurvivor/src/systems/collision.js
/NeonSurvivor/src/systems/weapons.js
/NeonSurvivor/src/systems/spawner.js
/NeonSurvivor/src/systems/pickup.js
/NeonSurvivor/src/systems/gems.js
/NeonSurvivor/src/ui/hud.js
/NeonSurvivor/src/ui/levelUpScreen.js
/NeonSurvivor/src/ui/startScreen.js
/NeonSurvivor/src/ui/mainMenu.js
/NeonSurvivor/src/ui/runSummary.js
/NeonSurvivor/src/ui/metaScreen.js
/NeonSurvivor/src/ui/joystick.js
```

**Cache name:** `neonSurvive-v1` — bump version string to force cache refresh on redeploy.

**Fetch event:** Cache-first. If not in cache, fetch from network and cache the response.

**Activate event:** Delete old cache versions (any cache name not matching current version).

---

## 4. `index.html` Changes

Add inside `<head>`:
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="mobile-web-app-capable" content="yes">
```

Add before `</body>`:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/NeonSurvivor/sw.js')
  }
</script>
```

---

## 5. Icons (`assets/`)

Two PNG icons generated from an SVG: black background, cyan hexagon "⬡" glyph centered, neon glow effect.

- `assets/icon-192.png` — 192×192
- `assets/icon-512.png` — 512×512

Both created programmatically (Node script or inline canvas → PNG). No external tools required.

---

## 6. Virtual Joystick (`src/ui/joystick.js`)

### State

```js
export const joystickState = {
  active: false,
  baseX: 0, baseY: 0,   // center of outer ring (set on touchstart)
  knobX: 0, knobY: 0,   // current knob position
  dx: 0, dy: 0,          // normalized direction -1..1
}
```

### Constants

```js
const OUTER_RADIUS = 60   // px — outer ring radius
const KNOB_RADIUS  = 24   // px — inner knob radius
const DEAD_ZONE    = 0.2  // normalized threshold before movement registers
```

### `drawJoystick(ctx, canvas)`

- Only called when `isMobile === true` and game state is `'playing'` or `'paused'`
- Draws outer ring: `baseX/baseY` pinned to bottom-left (80px from left, 80px from bottom) when inactive; follows initial touch when active
- Outer ring: semi-transparent white stroke, low opacity fill
- Knob: solid cyan circle at `knobX/knobY`, glows when active
- When `!joystickState.active`: draws ghost ring at fixed position at half opacity

### `getJoystickInput()`

Returns `{ up, down, left, right }` derived from `dx`/`dy` with dead zone applied:

```js
export function getJoystickInput() {
  return {
    up:    joystickState.dy < -DEAD_ZONE,
    down:  joystickState.dy >  DEAD_ZONE,
    left:  joystickState.dx < -DEAD_ZONE,
    right: joystickState.dx >  DEAD_ZONE,
  }
}
```

---

## 7. Touch Integration in `main.js`

### Mobile detection

```js
const isMobile = 'ontouchstart' in window
```

Checked once at startup. When `true`:
- Adds `touchstart`, `touchmove`, `touchend` listeners
- Calls `drawJoystick` in the game loop during `'playing'`/`'levelup'`/`'paused'` states

### Touch event handling

**`touchstart`:**
- Check if touch is in bottom-left quadrant (x < canvas.clientWidth/2, y > canvas.clientHeight/2) → activate joystick, set `baseX/baseY` to touch position
- Otherwise → treat as a click (pass to existing click handler logic using `changedTouches[0].clientX/Y`)

**`touchmove`:**
- If joystick active: update `knobX/knobY` (clamped to outer radius), recalculate `dx/dy`
- Otherwise: ignored

**`touchend`:**
- Reset joystick state: `active = false, dx = 0, dy = 0`

### Input merge in game loop

```js
const effectiveInput = isMobile
  ? { ...input, ...getJoystickInput() }  // joystick overrides keyboard axes
  : input

updateMovement(entities, dt, effectiveInput)
```

`updateMovement` signature unchanged.

---

## 8. GitHub Actions (`deploy.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Manual step required (one-time):** In GitHub repo Settings → Pages → Source → set to "GitHub Actions".

Live URL: `https://huyngo878.github.io/NeonSurvivor/`

---

## 9. Self-Review

**Placeholder scan:** No TBDs. All paths, sizes, and logic are concrete.

**Consistency:**
- `start_url: /NeonSurvivor/` in manifest matches GitHub Pages URL
- SW cache paths all prefixed `/NeonSurvivor/` — consistent
- `joystickState.dx/dy` → `getJoystickInput()` → merged into `effectiveInput` → `updateMovement` — fully wired
- `isMobile` check is the single gate for all touch code — no scattered conditionals

**Scope:** Three independent deliverables in one phase — PWA, joystick, deploy. Each is self-contained. Reasonable scope.

**Ambiguity resolved:**
- Joystick only shown during `'playing'`/`'paused'` — not on menus (menus are touch-tappable via existing click logic)
- Touch outside joystick zone is treated as a tap → passes through to existing menu/card click handlers
- SW cache version bump = rename `neonSurvive-v1` → `neonSurvive-v2` etc. on each deploy with breaking changes
