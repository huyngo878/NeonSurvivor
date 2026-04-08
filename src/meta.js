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
  return Math.floor(kills / 4)
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
