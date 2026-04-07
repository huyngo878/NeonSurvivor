# Money Economy + Static Map Chests — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Sub-project:** 1 of 4 (Money → Obstacles → Portal/Zones → Zone Enemy Variation)

---

## Overview

Replace enemy chest drops with a money economy. Enemies drop money on kill. Each zone has 6 hand-placed chest nodes on the map. Player walks up to a chest, sees a floating cost label (green if affordable, red if not), presses E / taps to purchase, and the chest card screen opens. Chest costs scale globally across zones using an exponential formula. Enemy drop chests are removed entirely.

---

## 1. Money Resource

### Player field
`player.money` — integer, starts at 0, never resets mid-run (persists across zone transitions).

### Game state field
`gameState.chestsOpened` — integer, starts at 0, increments each time any chest is purchased. Drives global cost scaling. Persists across zone transitions.

### Money per kill
Added as `moneyValue` to each entry in `ENEMY_TYPES` in `src/entities.js`:

| Enemy | moneyValue |
|-------|-----------|
| chaser | 1 |
| speedster | 2 |
| tank | 3 |
| brute | 5 |
| boss | 25 |

Awarded in `src/systems/collision.js` at kill-time (same place gem drops happen). `player.money += cfg.moneyValue`.

### Chest cost formula
```js
function chestCost(chestsOpened) {
  return Math.floor(10 * Math.pow(1.22, chestsOpened))
}
```
Produces: 10, 12, 15, 18, 22, 27, 33, 40... — natural slowdown. Global across zones so economy stays calibrated throughout the full run.

---

## 2. Static Chest Nodes

### New entity: `chestNode`
Added to `src/entities.js`:
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

Not a pickup — persists after interaction (turns visually "opened", no longer interactive).

### Zone layout data
New file: `src/zones.js`

```js
export const ZONE_LAYOUTS = [
  // Zone 1 — open arena (index 0)
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
```

Player starts at (1500, 1500). Chests are placed at mid-range distances (~700–1200px from center), distributed asymmetrically around the zone.

### Spawning chest nodes
In `src/main.js`, `initGame()` calls `spawnZoneChests(entities, 0)` which reads `ZONE_LAYOUTS[0].chests` and pushes `createChestNode(x, y)` for each. On zone transition (future sub-project), old chest nodes are removed and new zone's chests are spawned.

---

## 3. Chest Interaction

### Proximity detection
New function `updateChestNodes(entities, player, gameState)` in `src/systems/pickup.js`:
- Finds all `chestNode` entities where `!node.opened`
- Finds the nearest one within **80px** of player
- Sets `gameState.nearestChest = { node, cost: chestCost(gameState.chestsOpened) }` if found
- Sets `gameState.nearestChest = null` otherwise

Called every frame in the game loop alongside `updatePickup`.

### Floating label (world-space)
`drawHud` (or a helper called from the game loop) draws the label when `gameState.nearestChest` is set:
- Position: world-space above the chest node, translated by camera transform
- Text: `💰 [cost]$  E to open`
- Color: `#00ff88` (green) if `player.money >= cost`, else `#ff4444` (red)
- Font: `14px monospace`, centered above chest
- Background: semi-transparent dark pill

### Purchase
In `src/main.js` keydown handler, `state === 'playing'`, `e.code === 'KeyE'`:
```
if nearestChest exists AND player.money >= cost:
  player.money -= cost
  gameState.chestsOpened++
  nearestChest.node.opened = true
  gameState.upgradeChoices = pickChestCards(player, 3 + (player.extraChoices || 0))
  gameState.state = 'chest'
  gameState.nearestChest = null
```

Mobile (touch): if `gameState.state === 'playing'` and touch is NOT in the joystick zone AND `gameState.nearestChest` exists and player is in range → same purchase path.

---

## 4. HUD — Money Display

In `src/ui/hud.js`, below the HP bar (below the `100/100` text), add:
- Text: `💰 [player.money]$`
- Color: `#ffd700` (gold)
- Font: `18px monospace`
- Position: same left-align as HP bar (`barX = 24`), ~16px below the HP text line

---

## 5. Chest Node Rendering

In `src/render.js`, draw `chestNode` entities in the world pass:
- **Unopened:** Gold (`#ffd700`) filled rectangle (20×16px) with a rounded darker lid on top. Glow (`shadowBlur: 14, shadowColor: '#ffd700'`). When `gameState.nearestChest?.node === e`, increase `shadowBlur` to 28 (pulse effect).
- **Opened:** Dark grey (`#444`) rectangle, no glow, no lid. Still visible so player knows they've been there.

---

## 6. Remove Drop Chests

In `src/systems/collision.js`, `_rollPickupDrop`:
- Remove the chest drop logic entirely. Only weapon drops and magnet drops remain.
- The `pickupType === 'chest'` branch in `pickup.js` stays (it still handles the card screen state flow), but chests no longer spawn from kills.

---

## File Map

| File | Change |
|------|--------|
| `src/entities.js` | Add `moneyValue` to ENEMY_TYPES; add `createChestNode()` |
| `src/zones.js` | **New** — ZONE_LAYOUTS with Zone 1 chest positions |
| `src/systems/collision.js` | Award `player.money += cfg.moneyValue` on kill; remove chest from `_rollPickupDrop` |
| `src/systems/pickup.js` | Add `updateChestNodes()`; add `chestCost()` helper |
| `src/ui/hud.js` | Add money display below HP bar |
| `src/render.js` | Draw chestNode entities (opened/unopened states, proximity glow) |
| `src/main.js` | Call `spawnZoneChests()` in `initGame()`; add `KeyE` purchase handler; call `updateChestNodes()` in game loop |

---

## Self-Review

**Placeholder scan:** No TBDs. All values are concrete — moneyValue per enemy type, cost formula, chest positions, interaction radius (80px), HUD position.

**Internal consistency:**
- `gameState.nearestChest` set by `updateChestNodes` → read by HUD drawing code and `KeyE` handler ✓
- `gameState.chestsOpened` incremented on purchase → used by `chestCost()` ✓
- `createChestNode` returns `type: 'chestNode'` → render.js checks `e.type === 'chestNode'` ✓
- `player.money` added to `createPlayer()` defaults → HUD reads it safely ✓

**Scope:** Focused on economy + static chests only. Portal, zone transition, and obstacles are separate sub-projects.

**Ambiguity fixes:**
- Chest nodes do NOT auto-collect — player must press E (or tap). ✓
- Cost is computed at interaction time from `gameState.chestsOpened`, not stored on the node. ✓
- Mobile touch purchase only triggers if NOT in joystick zone (bottom-left quadrant). ✓
