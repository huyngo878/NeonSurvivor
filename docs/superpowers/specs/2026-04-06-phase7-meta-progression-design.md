# Phase 7 — Meta Progression, Main Menu & Run Summary Design

**Date:** 2026-04-06  
**Status:** Approved

---

## Overview

Add persistent meta progression between runs: a proper main menu, a run summary/death screen, a prestige currency system, and a permanent upgrade grid. All persistence goes through `localStorage`. The leaderboard button is wired now but posts to a DB in a future phase.

---

## 1. Game State Machine Changes

New states added to `main.js`:

```
'menu'     → main menu (entry point, replaces initial 'start')
'start'    → weapon select screen (unchanged)
'playing'  → in-game (unchanged)
'paused'   → paused (unchanged)
'levelup'  → upgrade card screen (unchanged)
'summary'  → run summary / death screen (new)
'upgrades' → meta progression grid (new)
```

**Flow:**
- App loads → `'menu'`
- PLAY pressed → `'start'` (weapon select) → `'playing'`
- Player dies → `'summary'` (save run, award prestige) → PLAY AGAIN → `'start'` | MENU → `'menu'`
- UPGRADES pressed from menu → `'upgrades'` → ESC → `'menu'`

---

## 2. localStorage Data Model

All keys prefixed `neonSurvive_`. All reads/writes go through `src/meta.js` — nothing else touches localStorage directly.

### `neonSurvive_runs`
Array of run objects, newest first, capped at 50 entries:
```js
{
  timestamp: '2026-04-06T12:00:00Z',  // ISO string
  timeSecs: 272,                        // total seconds survived
  kills: 87,
  level: 6,
  weapons: ['whip', 'wand'],           // weapon types owned at death
  upgrades: ['speed_1', 'hp_up'],      // in-run upgrade ids applied
  prestige: 124                         // prestige awarded for this run
}
```

### `neonSurvive_best`
Single object updated after every run if a stat improves:
```js
{ timeSecs: 415, kills: 142, level: 9 }
```
Each stat tracked independently (best time may be from a different run than best kills).

### `neonSurvive_prestige`
Integer. Total prestige balance (earned minus spent). Never goes below 0.

### `neonSurvive_metaUpgrades`
Object mapping upgrade id → tier currently owned:
```js
{ start_hp: 2, move_speed: 1, xp_mult: 0, extra_choice: 0, ... }
```
Missing keys treated as tier 0.

---

## 3. Prestige Formula

```
prestige = Math.floor(kills × (timeSecs / 60) × level / 10)
```

Rewards both aggression (kills) and survival (time) scaled by progression (level).  
Example: 87 kills × 4.53 min × level 6 ÷ 10 = **⬡ 236**

---

## 4. New Files

| File | Purpose |
|------|---------|
| `src/meta.js` | localStorage API — saveRun, loadBest, getPrestige, spendPrestige, getMetaUpgrades, applyMetaUpgrades |
| `src/metaUpgrades.js` | Permanent upgrade registry — flat array, same pattern as `src/upgrades.js` |
| `src/ui/mainMenu.js` | Main menu canvas rendering |
| `src/ui/runSummary.js` | Run summary canvas rendering |
| `src/ui/metaScreen.js` | Meta upgrade grid canvas rendering |

---

## 5. `src/meta.js` API

```js
export function saveRun(runData)          // push to runs[], update best, award prestige
export function loadRuns()                // returns array (newest first)
export function loadBest()                // returns { timeSecs, kills, level } or null
export function getPrestige()             // returns integer balance
export function spendPrestige(amount)     // deducts, throws if insufficient
export function getMetaUpgrades()         // returns { id: tier } object
export function applyMetaUpgrades(player) // applies all owned tiers to player at run start
```

---

## 6. Permanent Upgrade Registry (`src/metaUpgrades.js`)

Flat array — adding a new upgrade = one object appended. Same shape as `src/upgrades.js` but with `tiers[]` (cost per tier) and `apply(player, tier)`.

### Player Stats

| ID | Label | Effect per tier | Max tiers | Costs |
|----|-------|----------------|-----------|-------|
| `start_hp` | START HP | +10 max HP | 5 | 50, 100, 150, 200, 300 |
| `move_speed` | MOVE SPEED | +5% speed | 5 | 30, 60, 100, 150, 200 |
| `start_regen` | REGEN | +0.5 HP/sec regen | 3 | 80, 160, 300 |

### XP & Progression

| ID | Label | Effect per tier | Max tiers | Costs |
|----|-------|----------------|-----------|-------|
| `xp_mult` | XP GAIN | +15% XP gained | 5 | 50, 100, 200, 350, 500 |
| `extra_choice` | MORE CHOICES | +1 upgrade card on level-up | 2 | 200, 500 |

### Game Modifiers

| ID | Label | Effect per tier | Max tiers | Costs |
|----|-------|----------------|-----------|-------|
| `magnet_range` | GEM MAGNET | +25px pickup radius | 3 | 60, 120, 250 |
| `spawn_delay` | BREATHE | +8% slower enemy spawns | 3 | 75, 150, 300 |
| `drop_rate` | LUCKY | +3% weapon drop chance | 3 | 60, 120, 200 |

`apply(player, tier)` is called once at `initGame()` for each upgrade where `tier > 0`.

---

## 7. UI — Main Menu (`src/ui/mainMenu.js`)

```
drawMainMenu(ctx, canvas, gameState)
```

**Layout (top to bottom):**
1. Title: `NEON SURVIVE` with cyan glow
2. Stats strip (best time | best kills | best level | total runs) — shows `--` when empty
3. Menu buttons — data-driven array, rendered as vertical stack:
   ```js
   const MENU_ITEMS = [
     { label: 'PLAY',        color: '#00ffc8', state: 'start' },
     { label: 'UPGRADES',    color: '#ffd700', state: 'upgrades' },
     { label: 'LEADERBOARD', color: '#ff0080', state: 'leaderboard' },
     { label: 'SETTINGS',    color: '#888',    state: 'settings', disabled: true },
   ]
   ```
4. Last run one-liner: `Last run: 04:32 · 87 kills · Level 6` (hidden when no runs yet)
5. Version badge bottom-right

**Input:** UP/DOWN arrows to navigate, ENTER to select. Mouse click on button also works. `gameState.menuIndex` tracks selected item.

---

## 8. UI — Run Summary (`src/ui/runSummary.js`)

```
drawRunSummary(ctx, canvas, gameState)
```

**Layout:**
1. `RUN OVER` header (pink glow)
2. Stats grid: time | kills | level
3. Weapons used + upgrade list (comma-separated labels)
4. Prestige earned box: `⬡ +124` with formula hint
5. Conditional `✦ NEW BEST [TIME/KILLS/LEVEL]!` badge in cyan (shown if any record broken)
6. Two buttons: `▶ PLAY AGAIN [R]` and `MENU [M]`

`gameState.lastRun` holds the run data object, set when transitioning to `'summary'`.

---

## 9. UI — Meta Screen (`src/ui/metaScreen.js`)

```
drawMetaScreen(ctx, canvas, gameState)
```

**Layout:**
1. Title: `UPGRADES` + prestige balance top-right: `⬡ 320`
2. Three tabs: `PLAYER STATS` | `XP & PROGRESSION` | `GAME MODIFIERS`
3. Grid of upgrade cards per active tab:
   - Name, tier pip bar (`██░░░` style), cost to next tier
   - Locked (max tier): shows `MAXED` in green
   - Unaffordable: cost shown in grey
   - Affordable: cost shown in gold, highlighted border
4. `ESC` or `M` to return to menu

`gameState.metaTab` tracks active tab (0/1/2). `gameState.metaIndex` tracks selected card for keyboard nav.

---

## 10. Integration Points in `src/main.js`

- On app load: initial state is `'menu'` instead of `'start'`
- On player death: set `gameState.lastRun = buildRunData(player, gameState)`, call `saveRun()`, set state `'summary'`
- At `initGame()`: call `applyMetaUpgrades(player)` after creating player
- `extra_choice` meta upgrade: `pickUpgrades(player, 3 + extraChoiceTiers)` in gems.js level-up
- `xp_mult` meta upgrade: multiply XP gained in `updateGems` by stored multiplier
- `spawn_delay` meta upgrade: multiply spawner `intervalMult` starting value

---

## 11. HUD Changes

- Remove death overlay from `src/ui/hud.js` (replaced by run summary screen)
- `drawHud` still renders during `'summary'` state? No — summary is full-screen, HUD not shown

---

## Self-Review

- **Placeholder scan:** No TBDs. All upgrade costs, formulas, and API shapes are concrete.
- **Consistency:** `applyMetaUpgrades` called at `initGame()` — before player enters game. `extra_choice` feeds into `pickUpgrades` call count. `xp_mult` feeds into `updateGems`. All wired.
- **Scope:** One focused phase — persistence + meta UI. No new enemy types, no new weapons.
- **Ambiguity:** `spawn_delay` applies as a starting multiplier bonus to `spawnerState.intervalMult`, not a flat reduction. Clarified.
