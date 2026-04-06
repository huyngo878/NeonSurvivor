# Phase 7 — Meta Progression, Main Menu & Run Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent meta progression between runs: main menu, run summary screen, prestige currency, and a permanent upgrade grid backed by localStorage.

**Architecture:** `src/meta.js` owns all localStorage access (single responsibility). `src/metaUpgrades.js` is a flat data registry (same pattern as `src/upgrades.js`). Three new canvas UI modules mirror existing UI file patterns. `src/main.js` gains `'menu'`, `'summary'`, and `'upgrades'` state routing. Meta upgrades are applied to the player once at `initGame()`.

**Tech Stack:** Vanilla JS ES modules, HTML5 Canvas, Vitest. No build step.

---

## File Map

| File | Change |
|------|--------|
| `src/meta.js` | **New** — localStorage API: saveRun, loadRuns, loadBest, getPrestige, spendPrestige, getMetaUpgrades, applyMetaUpgrades |
| `src/metaUpgrades.js` | **New** — permanent upgrade registry (8 upgrades, 3 categories) |
| `src/ui/mainMenu.js` | **New** — main menu canvas UI |
| `src/ui/runSummary.js` | **New** — run summary canvas UI (replaces death overlay) |
| `src/ui/metaScreen.js` | **New** — meta upgrade grid canvas UI |
| `src/systems/gems.js` | Modify — pass `extraChoices` from gameState to `pickUpgrades` |
| `src/ui/hud.js` | Modify — remove death overlay (moved to runSummary) |
| `src/main.js` | Modify — full replacement wiring all new states and systems |
| `tests/meta.test.js` | **New** — unit tests for meta.js |
| `tests/metaUpgrades.test.js` | **New** — unit tests for metaUpgrades.js |

---

## Task 1: localStorage API — `src/meta.js`

**Files:**
- Create: `src/meta.js`
- Create: `tests/meta.test.js`

- [ ] **Step 1: Create `tests/meta.test.js`**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveRun, loadRuns, loadBest, getPrestige, spendPrestige,
  getMetaUpgrades, calcPrestige, _reset
} from '../src/meta.js'

beforeEach(() => {
  _reset()  // clears in-memory state between tests
})

describe('calcPrestige', () => {
  it('calculates prestige from kills, time, and level', () => {
    expect(calcPrestige(87, 272, 6)).toBe(Math.floor(87 * (272 / 60) * 6 / 10))
  })

  it('returns 0 for zero kills', () => {
    expect(calcPrestige(0, 120, 3)).toBe(0)
  })
})

describe('saveRun', () => {
  it('saves a run and loadRuns returns it', () => {
    const run = { timeSecs: 272, kills: 87, level: 6, weapons: ['wand'], upgrades: [], prestige: 124 }
    saveRun(run)
    const runs = loadRuns()
    expect(runs).toHaveLength(1)
    expect(runs[0].kills).toBe(87)
    expect(typeof runs[0].timestamp).toBe('string')
  })

  it('caps stored runs at 50', () => {
    for (let i = 0; i < 55; i++) {
      saveRun({ timeSecs: i, kills: i, level: 1, weapons: [], upgrades: [], prestige: i })
    }
    expect(loadRuns()).toHaveLength(50)
  })

  it('stores newest run first', () => {
    saveRun({ timeSecs: 100, kills: 10, level: 1, weapons: [], upgrades: [], prestige: 10 })
    saveRun({ timeSecs: 200, kills: 20, level: 2, weapons: [], upgrades: [], prestige: 20 })
    expect(loadRuns()[0].kills).toBe(20)
  })

  it('adds prestige to balance on saveRun', () => {
    saveRun({ timeSecs: 100, kills: 10, level: 1, weapons: [], upgrades: [], prestige: 50 })
    expect(getPrestige()).toBe(50)
  })
})

describe('loadBest', () => {
  it('returns null when no runs saved', () => {
    expect(loadBest()).toBeNull()
  })

  it('tracks best time, kills, level independently', () => {
    saveRun({ timeSecs: 400, kills: 50, level: 3, weapons: [], upgrades: [], prestige: 0 })
    saveRun({ timeSecs: 200, kills: 100, level: 5, weapons: [], upgrades: [], prestige: 0 })
    const best = loadBest()
    expect(best.timeSecs).toBe(400)   // longer = better
    expect(best.kills).toBe(100)
    expect(best.level).toBe(5)
  })
})

describe('spendPrestige', () => {
  it('deducts prestige from balance', () => {
    saveRun({ timeSecs: 100, kills: 10, level: 1, weapons: [], upgrades: [], prestige: 100 })
    spendPrestige(40)
    expect(getPrestige()).toBe(60)
  })

  it('throws when insufficient balance', () => {
    expect(() => spendPrestige(100)).toThrow('Insufficient prestige')
  })
})

describe('getMetaUpgrades', () => {
  it('returns empty object when nothing purchased', () => {
    expect(getMetaUpgrades()).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/meta.test.js 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../src/meta.js'`

- [ ] **Step 3: Create `src/meta.js`**

```js
const RUNS_KEY     = 'neonSurvive_runs'
const BEST_KEY     = 'neonSurvive_best'
const PRESTIGE_KEY = 'neonSurvive_prestige'
const META_KEY     = 'neonSurvive_metaUpgrades'
const MAX_RUNS     = 50

// In-memory cache (populated lazily, reset in tests via _reset)
let _runs     = null
let _best     = null
let _prestige = null
let _meta     = null

function _load() {
  if (_runs === null) {
    try { _runs = JSON.parse(localStorage.getItem(RUNS_KEY)) || [] } catch { _runs = [] }
    try { _best = JSON.parse(localStorage.getItem(BEST_KEY)) || null } catch { _best = null }
    try { _prestige = parseInt(localStorage.getItem(PRESTIGE_KEY), 10) || 0 } catch { _prestige = 0 }
    try { _meta = JSON.parse(localStorage.getItem(META_KEY)) || {} } catch { _meta = {} }
  }
}

function _save() {
  localStorage.setItem(RUNS_KEY,     JSON.stringify(_runs))
  localStorage.setItem(BEST_KEY,     JSON.stringify(_best))
  localStorage.setItem(PRESTIGE_KEY, String(_prestige))
  localStorage.setItem(META_KEY,     JSON.stringify(_meta))
}

export function _reset() {
  _runs = []; _best = null; _prestige = 0; _meta = {}
}

export function calcPrestige(kills, timeSecs, level) {
  return Math.floor(kills * (timeSecs / 60) * level / 10)
}

export function saveRun(run) {
  _load()
  const entry = { ...run, timestamp: new Date().toISOString() }
  _runs = [entry, ..._runs].slice(0, MAX_RUNS)
  _prestige += run.prestige
  _updateBest(run)
  _save()
}

function _updateBest(run) {
  if (!_best) {
    _best = { timeSecs: run.timeSecs, kills: run.kills, level: run.level }
    return
  }
  if (run.timeSecs > _best.timeSecs) _best.timeSecs = run.timeSecs
  if (run.kills    > _best.kills)    _best.kills    = run.kills
  if (run.level    > _best.level)    _best.level    = run.level
}

export function loadRuns()    { _load(); return [..._runs] }
export function loadBest()    { _load(); return _best ? { ..._best } : null }
export function getPrestige() { _load(); return _prestige }

export function spendPrestige(amount) {
  _load()
  if (_prestige < amount) throw new Error('Insufficient prestige')
  _prestige -= amount
  _save()
}

export function getMetaUpgrades() { _load(); return { ..._meta } }

export function setMetaUpgrade(id, tier) {
  _load()
  _meta[id] = tier
  _save()
}

export function applyMetaUpgrades(player, META_UPGRADES) {
  _load()
  for (const upgrade of META_UPGRADES) {
    const tier = _meta[upgrade.id] || 0
    if (tier > 0) upgrade.apply(player, tier)
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/meta.test.js 2>&1 | tail -15
```

Expected: PASS — all tests. Note: `localStorage` is available in Vitest's jsdom environment.

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/meta.js tests/meta.test.js && git commit -m "feat: meta localStorage API — saveRun, loadBest, prestige, metaUpgrades"
```

---

## Task 2: Permanent Upgrade Registry — `src/metaUpgrades.js`

**Files:**
- Create: `src/metaUpgrades.js`
- Create: `tests/metaUpgrades.test.js`

- [ ] **Step 1: Create `tests/metaUpgrades.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { META_UPGRADES } from '../src/metaUpgrades.js'
import { createPlayer } from '../src/entities.js'

describe('META_UPGRADES', () => {
  it('every upgrade has required fields', () => {
    for (const u of META_UPGRADES) {
      expect(typeof u.id).toBe('string')
      expect(typeof u.label).toBe('string')
      expect(typeof u.desc).toBe('string')
      expect(['player', 'xp', 'modifier']).toContain(u.category)
      expect(Array.isArray(u.tiers)).toBe(true)
      expect(u.tiers.length).toBeGreaterThan(0)
      expect(typeof u.apply).toBe('function')
    }
  })

  it('all ids are unique', () => {
    const ids = META_UPGRADES.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('start_hp tier 1 adds 10 max HP', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'start_hp')
    upgrade.apply(player, 1)
    expect(player.maxHp).toBe(110)
    expect(player.hp).toBe(110)
  })

  it('start_hp tier 3 adds 30 max HP', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'start_hp')
    upgrade.apply(player, 3)
    expect(player.maxHp).toBe(130)
    expect(player.hp).toBe(130)
  })

  it('move_speed tier 1 adds 5% speed', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'move_speed')
    upgrade.apply(player, 1)
    expect(player.speed).toBeCloseTo(200 * 1.05, 5)
  })

  it('move_speed tier 3 adds 15% speed', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'move_speed')
    upgrade.apply(player, 3)
    expect(player.speed).toBeCloseTo(200 * 1.15, 5)
  })

  it('start_regen tier 2 adds 1 HP/sec regen', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'start_regen')
    upgrade.apply(player, 2)
    expect(player.regenRate).toBeCloseTo(1.0, 5)
  })

  it('xp_mult tier 1 sets xpMult to 1.15', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'xp_mult')
    upgrade.apply(player, 1)
    expect(player.xpMult).toBeCloseTo(1.15, 5)
  })

  it('extra_choice tier 1 sets extraChoices to 1', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'extra_choice')
    upgrade.apply(player, 1)
    expect(player.extraChoices).toBe(1)
  })

  it('magnet_range tier 2 sets magnetBonus to 50', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'magnet_range')
    upgrade.apply(player, 2)
    expect(player.magnetBonus).toBe(50)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/metaUpgrades.test.js 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../src/metaUpgrades.js'`

- [ ] **Step 3: Update `src/entities.js` — add new player fields**

In `createPlayer()`, add these fields after `regenRate: 0`:

```js
    xpMult: 1.0,        // multiplier for XP gained (meta upgrade)
    extraChoices: 0,    // extra level-up cards shown (meta upgrade)
    magnetBonus: 0,     // extra gem pickup radius in px (meta upgrade)
    dropRateBonus: 0,   // extra weapon drop % (meta upgrade)
    spawnDelayBonus: 0, // starting intervalMult bonus (meta upgrade)
```

- [ ] **Step 4: Create `src/metaUpgrades.js`**

```js
export const META_UPGRADES = [
  // --- Player Stats ---
  {
    id: 'start_hp', label: 'START HP', desc: '+10 max HP per tier',
    category: 'player',
    tiers: [50, 100, 150, 200, 300],
    apply: (player, tier) => {
      player.maxHp += tier * 10
      player.hp = player.maxHp
    },
  },
  {
    id: 'move_speed', label: 'MOVE SPEED', desc: '+5% speed per tier',
    category: 'player',
    tiers: [30, 60, 100, 150, 200],
    apply: (player, tier) => {
      player.speed *= (1 + tier * 0.05)
    },
  },
  {
    id: 'start_regen', label: 'REGEN', desc: '+0.5 HP/sec per tier',
    category: 'player',
    tiers: [80, 160, 300],
    apply: (player, tier) => {
      player.regenRate += tier * 0.5
    },
  },

  // --- XP & Progression ---
  {
    id: 'xp_mult', label: 'XP GAIN', desc: '+15% XP per tier',
    category: 'xp',
    tiers: [50, 100, 200, 350, 500],
    apply: (player, tier) => {
      player.xpMult = 1 + tier * 0.15
    },
  },
  {
    id: 'extra_choice', label: 'MORE CHOICES', desc: '+1 upgrade card per tier',
    category: 'xp',
    tiers: [200, 500],
    apply: (player, tier) => {
      player.extraChoices = tier
    },
  },

  // --- Game Modifiers ---
  {
    id: 'magnet_range', label: 'GEM MAGNET', desc: '+25px pickup radius per tier',
    category: 'modifier',
    tiers: [60, 120, 250],
    apply: (player, tier) => {
      player.magnetBonus = tier * 25
    },
  },
  {
    id: 'spawn_delay', label: 'BREATHE', desc: '+8% slower spawns per tier',
    category: 'modifier',
    tiers: [75, 150, 300],
    apply: (player, tier) => {
      player.spawnDelayBonus = tier * 0.08
    },
  },
  {
    id: 'drop_rate', label: 'LUCKY', desc: '+3% weapon drop chance per tier',
    category: 'modifier',
    tiers: [60, 120, 200],
    apply: (player, tier) => {
      player.dropRateBonus = tier * 0.03
    },
  },
]
```

- [ ] **Step 5: Run metaUpgrades tests — verify all pass**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test tests/metaUpgrades.test.js 2>&1 | tail -15
```

Expected: PASS — all tests.

- [ ] **Step 6: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/metaUpgrades.js src/entities.js tests/metaUpgrades.test.js && git commit -m "feat: permanent upgrade registry and player meta fields"
```

---

## Task 3: Main Menu UI — `src/ui/mainMenu.js`

**Files:**
- Create: `src/ui/mainMenu.js`

No unit tests — visually verified in browser.

- [ ] **Step 1: Create `src/ui/mainMenu.js`**

```js
import { loadBest, loadRuns } from '../meta.js'

const MENU_ITEMS = [
  { label: '▶  PLAY',        color: '#00ffc8', state: 'start' },
  { label: '⬡  UPGRADES',    color: '#ffd700', state: 'upgrades' },
  { label: '🏆  LEADERBOARD', color: '#ff0080', state: 'leaderboard', disabled: true },
  { label: '⚙  SETTINGS',    color: '#888',    state: 'settings',    disabled: true },
]

export function drawMainMenu(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const best = loadBest()
  const runs = loadRuns()

  // Title
  ctx.save()
  ctx.font = 'bold 52px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText('NEON SURVIVE', cx, cy - 140)
  ctx.font = '11px monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,255,200,0.3)'
  ctx.fillText('SURVIVE THE NEON APOCALYPSE', cx, cy - 115)
  ctx.restore()

  // Stats strip
  const stats = [
    { label: 'BEST TIME', value: best ? _fmtTime(best.timeSecs) : '--:--', color: '#ffd700' },
    { label: 'BEST KILLS', value: best ? String(best.kills) : '--', color: '#ff0080' },
    { label: 'BEST LEVEL', value: best ? String(best.level) : '--', color: '#00ffc8' },
    { label: 'RUNS', value: String(runs.length), color: '#888' },
  ]
  const stripW = 320, stripH = 48, stripX = cx - stripW / 2, stripY = cy - 90
  ctx.save()
  ctx.fillStyle = 'rgba(0,255,200,0.04)'
  ctx.strokeStyle = 'rgba(0,255,200,0.15)'
  ctx.lineWidth = 1
  ctx.fillRect(stripX, stripY, stripW, stripH)
  ctx.strokeRect(stripX, stripY, stripW, stripH)
  const colW = stripW / stats.length
  stats.forEach((s, i) => {
    const x = stripX + colW * i + colW / 2
    ctx.font = 'bold 15px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = s.color
    ctx.shadowBlur = 6
    ctx.shadowColor = s.color
    ctx.fillText(s.value, x, stripY + 20)
    ctx.font = '8px monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = '#444'
    ctx.fillText(s.label, x, stripY + 36)
  })
  ctx.restore()

  // Menu buttons
  const btnW = 240, btnH = 36, btnGap = 10
  const totalH = MENU_ITEMS.length * (btnH + btnGap) - btnGap
  const btnStartY = cy - totalH / 2 + 20
  gameState.menuRects = []

  MENU_ITEMS.forEach((item, i) => {
    const x = cx - btnW / 2
    const y = btnStartY + i * (btnH + btnGap)
    const selected = gameState.menuIndex === i
    const disabled = item.disabled

    gameState.menuRects.push({ x, y, w: btnW, h: btnH, state: item.state, disabled })

    ctx.save()
    ctx.globalAlpha = disabled ? 0.3 : 1
    ctx.fillStyle = selected
      ? `${item.color}22`
      : 'rgba(0,0,0,0.6)'
    ctx.strokeStyle = selected ? item.color : `${item.color}50`
    ctx.lineWidth = selected ? 1.5 : 1
    if (selected && !disabled) {
      ctx.shadowBlur = 14
      ctx.shadowColor = item.color
    }
    ctx.fillRect(x, y, btnW, btnH)
    ctx.strokeRect(x, y, btnW, btnH)
    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = item.color
    ctx.shadowBlur = selected ? 8 : 0
    ctx.shadowColor = item.color
    ctx.fillText(item.label, cx, y + btnH / 2 + 5)
    ctx.restore()
  })

  // Last run hint
  if (runs.length > 0) {
    const last = runs[0]
    ctx.save()
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#333'
    ctx.fillText(
      `Last run: ${_fmtTime(last.timeSecs)} · ${last.kills} kills · Level ${last.level}`,
      cx, cy + 180
    )
    ctx.restore()
  }

  // Version
  ctx.save()
  ctx.font = '9px monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#222'
  ctx.fillText('v0.1.0', canvas.width - 12, canvas.height - 10)
  ctx.restore()
}

function _fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export { MENU_ITEMS }
```

- [ ] **Step 2: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/mainMenu.js && git commit -m "feat: main menu UI with stats strip and extensible menu buttons"
```

---

## Task 4: Run Summary UI — `src/ui/runSummary.js`

**Files:**
- Create: `src/ui/runSummary.js`

No unit tests — visually verified in browser.

- [ ] **Step 1: Create `src/ui/runSummary.js`**

```js
export function drawRunSummary(ctx, canvas, gameState) {
  const run  = gameState.lastRun
  const best = gameState.prevBest   // best BEFORE this run (for "new best" detection)
  if (!run) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  // Background tint
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()

  // Header
  ctx.save()
  ctx.font = 'bold 42px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText('RUN OVER', cx, cy - 140)
  ctx.font = '10px monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,0,128,0.35)'
  ctx.fillText('BETTER LUCK NEXT TIME', cx, cy - 118)
  ctx.restore()

  // Stats grid
  const stats = [
    { label: 'TIME',   value: _fmtTime(run.timeSecs), color: '#ffd700' },
    { label: 'KILLS',  value: String(run.kills),       color: '#ff0080' },
    { label: 'LEVEL',  value: String(run.level),       color: '#00ffc8' },
  ]
  const gridW = 300, gridH = 52, gridX = cx - gridW / 2, gridY = cy - 100
  ctx.save()
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1
  ctx.strokeRect(gridX, gridY, gridW, gridH)
  const colW = gridW / stats.length
  stats.forEach((s, i) => {
    const x = gridX + colW * i + colW / 2
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(gridX + colW * i, gridY)
      ctx.lineTo(gridX + colW * i, gridY + gridH)
      ctx.stroke()
    }
    ctx.font = 'bold 17px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = s.color
    ctx.shadowBlur = 6
    ctx.shadowColor = s.color
    ctx.fillText(s.value, x, gridY + 22)
    ctx.font = '8px monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = '#444'
    ctx.fillText(s.label, x, gridY + 40)
  })
  ctx.restore()

  // Weapons + upgrades
  ctx.save()
  ctx.textAlign = 'center'
  if (run.weapons.length > 0) {
    ctx.font = '11px monospace'
    ctx.fillStyle = '#ffd700'
    ctx.fillText(run.weapons.map(w => w.toUpperCase()).join('  +  '), cx, cy - 28)
  }
  if (run.upgrades.length > 0) {
    ctx.font = '9px monospace'
    ctx.fillStyle = '#333'
    const label = run.upgrades.slice(0, 8).join(' · ') + (run.upgrades.length > 8 ? ' ...' : '')
    ctx.fillText(label, cx, cy - 12)
  }
  ctx.restore()

  // Prestige earned box
  ctx.save()
  const boxW = 280, boxH = 56, boxX = cx - boxW / 2, boxY = cy + 4
  ctx.fillStyle = 'rgba(255,215,0,0.05)'
  ctx.strokeStyle = 'rgba(255,215,0,0.3)'
  ctx.lineWidth = 1
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.strokeRect(boxX, boxY, boxW, boxH)
  ctx.font = '8px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#444'
  ctx.fillText('PRESTIGE EARNED', cx, boxY + 14)
  ctx.font = 'bold 24px monospace'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`⬡ +${run.prestige}`, cx, boxY + 40)
  ctx.restore()

  // New best badges
  const badges = []
  if (best) {
    if (run.timeSecs > best.timeSecs) badges.push('✦ NEW BEST TIME!')
    if (run.kills    > best.kills)    badges.push('✦ NEW BEST KILLS!')
    if (run.level    > best.level)    badges.push('✦ NEW BEST LEVEL!')
  } else {
    badges.push('✦ FIRST RUN COMPLETE!')
  }
  if (badges.length > 0) {
    ctx.save()
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00ffc8'
    ctx.shadowBlur = 8
    ctx.shadowColor = '#00ffc8'
    ctx.fillText(badges.join('  '), cx, cy + 76)
    ctx.restore()
  }

  // Buttons
  ctx.save()
  const btn = [
    { label: '▶ PLAY AGAIN  [R]', color: '#00ffc8' },
    { label: 'MENU  [M]',         color: '#ffd700' },
  ]
  const btnW = 160, btnH = 34, gap = 12
  const bx = cx - (btnW * 2 + gap) / 2
  const by = cy + 96
  btn.forEach((b, i) => {
    const x = bx + i * (btnW + gap)
    ctx.fillStyle = `${b.color}15`
    ctx.strokeStyle = b.color
    ctx.lineWidth = 1
    ctx.shadowBlur = 10
    ctx.shadowColor = b.color
    ctx.fillRect(x, by, btnW, btnH)
    ctx.strokeRect(x, by, btnW, btnH)
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = b.color
    ctx.fillText(b.label, x + btnW / 2, by + btnH / 2 + 4)
  })
  ctx.restore()
}

function _fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 2: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/runSummary.js && git commit -m "feat: run summary screen — stats, prestige earned, new best badges"
```

---

## Task 5: Meta Upgrade Screen UI — `src/ui/metaScreen.js`

**Files:**
- Create: `src/ui/metaScreen.js`

No unit tests — visually verified in browser.

- [ ] **Step 1: Create `src/ui/metaScreen.js`**

```js
import { META_UPGRADES } from '../metaUpgrades.js'
import { getPrestige, getMetaUpgrades, spendPrestige, setMetaUpgrade } from '../meta.js'

const TABS = [
  { label: 'PLAYER STATS', category: 'player', color: '#00ffc8' },
  { label: 'XP & PROG',    category: 'xp',     color: '#ffd700' },
  { label: 'MODIFIERS',    category: 'modifier', color: '#ff0080' },
]

const CARD_W = 180, CARD_H = 100, CARD_GAP = 12

export function drawMetaScreen(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2

  // Header
  ctx.save()
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 16
  ctx.shadowColor = '#ffd700'
  ctx.fillStyle = '#ffd700'
  ctx.fillText('UPGRADES', cx, 44)
  ctx.restore()

  // Prestige balance
  const prestige = getPrestige()
  ctx.save()
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`⬡ ${prestige}`, canvas.width - 20, 44)
  ctx.restore()

  // Tabs
  const tabW = 160, tabH = 28, tabGap = 6
  const tabStartX = cx - (TABS.length * (tabW + tabGap) - tabGap) / 2
  const tabY = 60
  gameState.metaTabRects = []

  TABS.forEach((tab, i) => {
    const x = tabStartX + i * (tabW + tabGap)
    const active = (gameState.metaTab || 0) === i
    ctx.save()
    ctx.fillStyle = active ? `${tab.color}20` : 'rgba(0,0,0,0.5)'
    ctx.strokeStyle = active ? tab.color : '#333'
    ctx.lineWidth = active ? 1.5 : 1
    if (active) { ctx.shadowBlur = 10; ctx.shadowColor = tab.color }
    ctx.fillRect(x, tabY, tabW, tabH)
    ctx.strokeRect(x, tabY, tabW, tabH)
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = active ? tab.color : '#555'
    ctx.shadowBlur = 0
    ctx.fillText(tab.label, x + tabW / 2, tabY + tabH / 2 + 4)
    ctx.restore()
    gameState.metaTabRects.push({ x, y: tabY, w: tabW, h: tabH })
  })

  // Cards
  const activeTab = TABS[gameState.metaTab || 0]
  const upgrades = META_UPGRADES.filter(u => u.category === activeTab.category)
  const owned = getMetaUpgrades()
  const gridStartX = cx - (upgrades.length * (CARD_W + CARD_GAP) - CARD_GAP) / 2
  const gridY = tabY + tabH + 20

  gameState.metaCardRects = []

  upgrades.forEach((upgrade, i) => {
    const tier = owned[upgrade.id] || 0
    const maxTier = upgrade.tiers.length
    const maxed = tier >= maxTier
    const cost = maxed ? 0 : upgrade.tiers[tier]
    const canAfford = !maxed && prestige >= cost
    const x = gridStartX + i * (CARD_W + CARD_GAP)
    const color = activeTab.color

    gameState.metaCardRects.push({ x, y: gridY, w: CARD_W, h: CARD_H, upgrade, tier, maxed, canAfford, cost })

    ctx.save()
    ctx.fillStyle = canAfford ? `${color}10` : 'rgba(0,0,0,0.6)'
    ctx.strokeStyle = maxed ? '#00ff8860' : canAfford ? color : '#333'
    ctx.lineWidth = canAfford ? 1.5 : 1
    if (canAfford) { ctx.shadowBlur = 10; ctx.shadowColor = color }
    ctx.fillRect(x, gridY, CARD_W, CARD_H)
    ctx.strokeRect(x, gridY, CARD_W, CARD_H)

    // Label
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = maxed ? '#00ff88' : color
    ctx.shadowBlur = 0
    ctx.fillText(upgrade.label, x + CARD_W / 2, gridY + 20)

    // Tier pips
    const pipW = 14, pipH = 4, pipGap = 3
    const pipsW = maxTier * (pipW + pipGap) - pipGap
    const pipX = x + (CARD_W - pipsW) / 2
    for (let p = 0; p < maxTier; p++) {
      ctx.fillStyle = p < tier ? color : '#222'
      ctx.fillRect(pipX + p * (pipW + pipGap), gridY + 32, pipW, pipH)
    }
    ctx.font = '9px monospace'
    ctx.fillStyle = '#555'
    ctx.fillText(`${tier} / ${maxTier}`, x + CARD_W / 2, gridY + 48)

    // Desc
    ctx.font = '9px monospace'
    ctx.fillStyle = '#666'
    ctx.fillText(upgrade.desc, x + CARD_W / 2, gridY + 62)

    // Cost / maxed
    ctx.font = 'bold 11px monospace'
    if (maxed) {
      ctx.fillStyle = '#00ff88'
      ctx.fillText('MAXED', x + CARD_W / 2, gridY + 82)
    } else {
      ctx.fillStyle = canAfford ? '#ffd700' : '#333'
      ctx.fillText(`⬡ ${cost}`, x + CARD_W / 2, gridY + 82)
    }

    ctx.restore()
  })

  // ESC hint
  ctx.save()
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#333'
  ctx.fillText('[ESC] or [M] — Back to Menu', cx, canvas.height - 16)
  ctx.restore()
}

export function handleMetaClick(e, gameState) {
  // Tab clicks
  for (let i = 0; i < (gameState.metaTabRects || []).length; i++) {
    const r = gameState.metaTabRects[i]
    if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
      gameState.metaTab = i
      return
    }
  }
  // Card clicks — purchase
  for (const card of (gameState.metaCardRects || [])) {
    if (e.clientX >= card.x && e.clientX <= card.x + card.w &&
        e.clientY >= card.y && e.clientY <= card.y + card.h) {
      if (!card.maxed && card.canAfford) {
        spendPrestige(card.cost)
        setMetaUpgrade(card.upgrade.id, card.tier + 1)
      }
      return
    }
  }
}
```

- [ ] **Step 2: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/metaScreen.js && git commit -m "feat: meta upgrade grid screen — tabs, pip bars, prestige purchase"
```

---

## Task 6: Integrate meta bonuses into game systems

**Files:**
- Modify: `src/systems/gems.js`
- Modify: `src/systems/collision.js`
- Modify: `src/systems/spawner.js`

- [ ] **Step 1: Update `src/systems/gems.js` — use `player.xpMult`, `player.magnetBonus`, `player.extraChoices`**

In `updateGems`, change the query radius to include `player.magnetBonus`:

```js
  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10 + (player.magnetBonus || 0))
```

In `updateGems`, apply `player.xpMult` when adding XP:

```js
    player.xp += Math.floor(gem.value * (player.xpMult || 1))
```

In `_levelUp`, use `player.extraChoices` for card count:

```js
function _levelUp(player, gameState) {
  player.xp -= player.xpToNext
  player.level++
  player.xpToNext = Math.floor(50 * Math.pow(player.level, 1.2))
  const cardCount = 3 + (player.extraChoices || 0)
  gameState.upgradeChoices = pickUpgrades(player, cardCount)
  gameState.state = 'levelup'
}
```

- [ ] **Step 2: Update `src/systems/collision.js` — use `player.dropRateBonus`**

In `_rollWeaponDrop`, pass the drop rate bonus. First read the player from entities:

Change the function signature and caller. In `updateCollision`, pass player to `_rollWeaponDrop`:

Find both kill blocks where `_rollWeaponDrop(enemy, entities)` is called and change them to:
```js
_rollWeaponDrop(enemy, entities, player)
```

Update `_rollWeaponDrop`:
```js
function _rollWeaponDrop(enemy, entities, player) {
  const baseRate = 0.05 + (player ? (player.dropRateBonus || 0) : 0)
  if (Math.random() >= baseRate) return
  const dropType = Math.random() < 0.5 ? 'wand' : 'whip'
  entities.push(createPickup(dropType, enemy.pos.x, enemy.pos.y))
}
```

- [ ] **Step 3: Update `src/systems/spawner.js` — use `player.spawnDelayBonus`**

In `createSpawnerState`, accept an optional bonus:

```js
export function createSpawnerState(spawnDelayBonus = 0) {
  return {
    timers: WAVES.map(() => 0),
    difficultyTimer: 0,
    countMult: 1.0,
    intervalMult: 1.0 + spawnDelayBonus,
  }
}
```

- [ ] **Step 4: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/systems/gems.js src/systems/collision.js src/systems/spawner.js && git commit -m "feat: wire meta upgrade bonuses into xpMult, magnetBonus, dropRate, spawnDelay"
```

---

## Task 7: Remove death overlay from HUD

**Files:**
- Modify: `src/ui/hud.js`

- [ ] **Step 1: Remove the death overlay block from `src/ui/hud.js`**

Find and delete the entire `// Death overlay` section:

```js
  // Death overlay
  if (gameState.state === 'dead') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
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
```

- [ ] **Step 2: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/ui/hud.js && git commit -m "refactor: remove death overlay from HUD (replaced by run summary screen)"
```

---

## Task 8: Wire everything in `src/main.js`

**Files:**
- Modify: `src/main.js`

No unit tests — integration verified in browser.

- [ ] **Step 1: Replace `src/main.js` with the complete wired version**

```js
import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, createWeapon, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { updatePickup } from './systems/pickup.js'
import { updateGems } from './systems/gems.js'
import { renderWorld } from './render.js'
import { drawHud } from './ui/hud.js'
import { drawStartScreen } from './ui/startScreen.js'
import { drawLevelUpScreen } from './ui/levelUpScreen.js'
import { drawMainMenu, MENU_ITEMS } from './ui/mainMenu.js'
import { drawRunSummary } from './ui/runSummary.js'
import { drawMetaScreen, handleMetaClick } from './ui/metaScreen.js'
import { saveRun, loadBest, calcPrestige, applyMetaUpgrades } from './meta.js'
import { META_UPGRADES } from './metaUpgrades.js'

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

  // Main menu navigation
  if (gameState.state === 'menu') {
    const items = MENU_ITEMS.filter(item => !item.disabled)
    if (e.code === 'ArrowUp')   gameState.menuIndex = Math.max(0, (gameState.menuIndex || 0) - 1)
    if (e.code === 'ArrowDown') gameState.menuIndex = Math.min(MENU_ITEMS.length - 1, (gameState.menuIndex || 0) + 1)
    if (e.code === 'Enter' || e.code === 'Space') {
      const item = MENU_ITEMS[gameState.menuIndex || 0]
      if (item && !item.disabled) _navigateMenu(item.state)
    }
    return
  }

  // Weapon select screen
  if (gameState.state === 'start') {
    if (e.code === 'ArrowLeft'  || e.code === 'KeyA') gameState.selectedWeapon = gameState.selectedWeapon === 'whip' ? 'wand' : 'whip'
    if (e.code === 'ArrowRight' || e.code === 'KeyD') gameState.selectedWeapon = gameState.selectedWeapon === 'wand' ? 'whip' : 'wand'
    if (e.code === 'Enter' || e.code === 'Space') initGame(gameState.selectedWeapon)
    if (e.code === 'Escape') gameState.state = 'menu'
    return
  }

  // Level-up card selection
  if (gameState.state === 'levelup') {
    const choices = gameState.upgradeChoices || []
    let picked = null
    if (e.code === 'Digit1' && choices[0]) picked = choices[0]
    if (e.code === 'Digit2' && choices[1]) picked = choices[1]
    if (e.code === 'Digit3' && choices[2]) picked = choices[2]
    if (picked) _applyUpgrade(picked)
    return
  }

  // Run summary
  if (gameState.state === 'summary') {
    if (e.code === 'KeyR') initGame(gameState.selectedWeapon)
    if (e.code === 'KeyM') gameState.state = 'menu'
    return
  }

  // Meta screen
  if (gameState.state === 'upgrades') {
    if (e.code === 'Escape' || e.code === 'KeyM') gameState.state = 'menu'
    if (e.code === 'Digit1') gameState.metaTab = 0
    if (e.code === 'Digit2') gameState.metaTab = 1
    if (e.code === 'Digit3') gameState.metaTab = 2
    return
  }

  // Playing / paused
  if (e.code === 'KeyP') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
  }
})

document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false
})

canvas.addEventListener('click', e => {
  if (gameState.state === 'levelup') {
    const rects = gameState.cardRects || []
    const choices = gameState.upgradeChoices || []
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
        if (choices[i]) _applyUpgrade(choices[i])
        break
      }
    }
    return
  }

  if (gameState.state === 'menu') {
    for (const rect of (gameState.menuRects || [])) {
      if (!rect.disabled &&
          e.clientX >= rect.x && e.clientX <= rect.x + rect.w &&
          e.clientY >= rect.y && e.clientY <= rect.y + rect.h) {
        _navigateMenu(rect.state)
        break
      }
    }
    return
  }

  if (gameState.state === 'upgrades') {
    handleMetaClick(e, gameState)
    return
  }
})

function _navigateMenu(state) {
  if (state === 'start' || state === 'upgrades') {
    gameState.state = state
  }
  // 'leaderboard' and 'settings' are stubs — do nothing for now
}

function _applyUpgrade(upgrade) {
  const player = entities.find(e => e.type === 'player')
  if (player) upgrade.apply(player)
  gameState.upgradeChoices = null
  gameState.cardRects = null
  gameState.state = 'playing'
}

// --- Game state ---
let entities = []
let gameState = { state: 'menu', selectedWeapon: 'wand', menuIndex: 0, metaTab: 0, time: 0, kills: 0 }
let spawnerState = {}
let camera = { x: 0, y: 0 }

function initGame(selectedWeapon) {
  const player = createPlayer()
  applyMetaUpgrades(player, META_UPGRADES)
  player.weapons = [createWeapon(selectedWeapon)]
  const pool = initProjectilePool()
  entities     = [player, ...pool]
  gameState    = {
    state: 'playing', selectedWeapon,
    menuIndex: 0, metaTab: 0,
    time: 0, kills: 0,
  }
  spawnerState = createSpawnerState(player.spawnDelayBonus || 0)
  camera       = { x: 0, y: 0 }
}

// --- Camera ---
function updateCamera(player) {
  camera.x = Math.max(0, Math.min(player.pos.x - canvas.width  / 2, WORLD_W - canvas.width))
  camera.y = Math.max(0, Math.min(player.pos.y - canvas.height / 2, WORLD_H - canvas.height))
}

// --- Build run data on death ---
function _buildRunData(player) {
  const prestige = calcPrestige(gameState.kills, gameState.time, player.level)
  return {
    timeSecs:  Math.floor(gameState.time),
    kills:     gameState.kills,
    level:     player.level,
    weapons:   player.weapons.map(w => w.type),
    upgrades:  gameState.upgradesTaken || [],
    prestige,
  }
}

// --- Game Loop ---
let lastTime = null

function loop(timestamp) {
  requestAnimationFrame(loop)

  const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05)
  lastTime = timestamp

  if (gameState.state === 'menu') {
    drawMainMenu(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'start') {
    drawStartScreen(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'summary') {
    drawRunSummary(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'upgrades') {
    drawMetaScreen(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'levelup') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera)
    drawHud(ctx, canvas, player, gameState)
    drawLevelUpScreen(ctx, canvas, player, gameState)
    return
  }

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    updateMovement(entities, dt, input)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState)
    updateSpawner(entities, spawnerState, dt, gameState.time)
    if (player) {
      updatePickup(entities, player, dt)
      updateGems(entities, player, dt, gameState)
      if (player.regenRate > 0) {
        player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt)
      }
      updateCamera(player)
    }

    if (player && player.hp <= 0) {
      player.hp = 0
      const prevBest = loadBest()
      const runData  = _buildRunData(player)
      saveRun(runData)
      gameState.lastRun  = runData
      gameState.prevBest = prevBest
      gameState.state    = 'summary'
    }
  }

  if (gameState.state === 'paused' || gameState.state === 'playing') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera)
    drawHud(ctx, canvas, player, gameState)
  }
}

requestAnimationFrame(loop)
```

- [ ] **Step 2: Run full suite — no regressions**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && npm test 2>&1 | tail -8
```

Expected: PASS — all tests.

- [ ] **Step 3: Browser smoke test**

Open the game and verify:
- [ ] App loads directly to main menu with NEON SURVIVE title
- [ ] Stats strip shows `--` on first load (no saved runs)
- [ ] Arrow keys navigate menu buttons, ENTER selects
- [ ] PLAY → weapon select → SPACE to start → game runs normally
- [ ] Killing enemies drops gems, collecting gems gives XP
- [ ] Level-up screen still works (1/2/3 to pick cards)
- [ ] Player death → run summary shows stats + prestige earned
- [ ] `R` from summary → weapon select, `M` from summary → main menu
- [ ] Stats strip updates after completing a run
- [ ] UPGRADES button → meta screen with 3 tabs
- [ ] Click an affordable upgrade → prestige deducted, pip fills
- [ ] Meta bonus visible next run (e.g. `start_hp` tier 1 → start with 110 HP)
- [ ] ESC from meta screen → back to menu

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/huyng/Desktop/ClaudeProjects/ClaudeGame" && git add src/main.js && git commit -m "feat: wire main menu, run summary, meta upgrades, prestige into main loop"
```

---

## Self-Review

**Spec coverage:**
- ✅ `'menu'` state → `drawMainMenu` (Task 3, Task 8)
- ✅ `'summary'` state → `drawRunSummary`, replaces death overlay (Task 4, Task 7, Task 8)
- ✅ `'upgrades'` state → `drawMetaScreen` (Task 5, Task 8)
- ✅ localStorage API in `src/meta.js` — saveRun, loadBest, getPrestige, spendPrestige, applyMetaUpgrades (Task 1)
- ✅ 50 run cap, newest first (Task 1)
- ✅ All run fields: timeSecs, kills, level, weapons, upgrades, timestamp, prestige (Task 1)
- ✅ Best tracked independently per stat (Task 1)
- ✅ Prestige formula: `floor(kills × (timeSecs/60) × level / 10)` (Task 1, Task 8)
- ✅ 8 permanent upgrades across 3 categories (Task 2)
- ✅ `applyMetaUpgrades(player)` called at `initGame()` (Task 8)
- ✅ `xpMult` applied in gems.js (Task 6)
- ✅ `magnetBonus` applied in gems.js (Task 6)
- ✅ `extraChoices` applied in `_levelUp` (Task 6)
- ✅ `dropRateBonus` applied in collision.js (Task 6)
- ✅ `spawnDelayBonus` applied via `createSpawnerState` (Task 6)
- ✅ New best badges on summary screen (Task 4)
- ✅ MENU_ITEMS data-driven array — adding buttons = one line (Task 3)
- ✅ `gameState.upgradesTaken` tracked for run record — set in `_applyUpgrade` in main.js… **GAP:** `upgradesTaken` is referenced in `_buildRunData` but never populated in `_applyUpgrade`. Fix: in `_applyUpgrade` in main.js, add `gameState.upgradesTaken = [...(gameState.upgradesTaken || []), upgrade.id]` before applying.

**Fix for upgradesTaken gap** — in Task 8's `_applyUpgrade` function, use:

```js
function _applyUpgrade(upgrade) {
  const player = entities.find(e => e.type === 'player')
  if (player) upgrade.apply(player)
  gameState.upgradesTaken = [...(gameState.upgradesTaken || []), upgrade.id]
  gameState.upgradeChoices = null
  gameState.cardRects = null
  gameState.state = 'playing'
}
```

And in `initGame`, add `upgradesTaken: []` to the gameState object:

```js
  gameState = {
    state: 'playing', selectedWeapon,
    menuIndex: 0, metaTab: 0,
    time: 0, kills: 0, upgradesTaken: [],
  }
```

**Placeholder scan:** No TBDs or incomplete steps. All code complete.

**Type consistency:** `applyMetaUpgrades(player, META_UPGRADES)` — signature matches Task 1 definition and Task 8 call. `createSpawnerState(spawnDelayBonus)` — matches Task 6 definition and Task 8 call. `calcPrestige(kills, timeSecs, level)` — matches Task 1 and Task 8. All consistent.
