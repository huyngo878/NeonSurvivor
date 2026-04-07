import { SPAWN_RADIUS, WAVE_DURATION } from '../constants.js'
import { createEnemy, ENEMY_TYPES } from '../entities.js'

const BASE_WAVES = [
  { enemyType: 'chaser',    count: 2, interval: 8.1,  minWave: 1  },
  { enemyType: 'tank',      count: 1, interval: 16.2, minWave: 2  },
  { enemyType: 'speedster', count: 1, interval: 12.6, minWave: 11 },
  { enemyType: 'brute',     count: 1, interval: 23.4, minWave: 7  },
  { enemyType: 'speedster', count: 1, interval: 22.0, minWave: 20 },
]

const BOSS_PATTERNS = ['spiral', 'ring', 'cross']

export const WAVES = BASE_WAVES

export function createSpawnerState(spawnDelayBonus = 0) {
  return {
    timers: BASE_WAVES.map(() => 0),
    intervalMult: 1.0 + spawnDelayBonus,
    currentWave: 1,
    bossWaveSpawned: 0,
    lastBurstWave: 0,
  }
}

export function updateSpawner(entities, state, dt, gameTime, gameState) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return

  const wave = Math.max(1, Math.floor(gameTime / WAVE_DURATION) + 1)
  state.currentWave = wave
  if (gameState) gameState.wave = wave

  const bossWave = wave % 10 === 0
  const activeBoss = entities.find(e => e.type === 'enemy' && e.enemyType === 'boss')

  if (bossWave) {
    if (!activeBoss && state.bossWaveSpawned !== wave) {
      state.bossWaveSpawned = wave
      entities.push(_spawnEnemy('boss', player, _bossOverrides(wave)))
    }
    return
  }

  // Odd-wave burst: extra chasers when a new odd wave begins
  if (wave % 2 === 1 && wave > 1 && state.lastBurstWave !== wave) {
    state.lastBurstWave = wave
    const burstCount = 2 + Math.floor(wave / 6)
    const overrides = _enemyOverrides(wave, 'chaser')
    for (let b = 0; b < burstCount; b++) {
      entities.push(_spawnEnemy('chaser', player, overrides))
    }
  }

  for (let i = 0; i < BASE_WAVES.length; i++) {
    const waveDef = BASE_WAVES[i]
    if (wave < waveDef.minWave) continue

    state.timers[i] -= dt
    if (state.timers[i] > 0) continue

    const densityScale = getDensityMultiplier(wave)
    let interval = Math.max(0.2, waveDef.interval * state.intervalMult / densityScale)
    state.timers[i] = interval

    let count = Math.max(1, Math.round(waveDef.count * densityScale))
    if (waveDef.enemyType === 'speedster') count = Math.max(1, Math.floor(count * 0.6))
    const enemyOverrides = _enemyOverrides(wave, waveDef.enemyType)

    for (let j = 0; j < count; j++) {
      entities.push(_spawnEnemy(waveDef.enemyType, player, enemyOverrides))
    }
  }
}

export function getDensityMultiplier(wave) {
  const base = _piecewiseScale(wave, 0.12, 1.25)
  if (wave < 20) return base
  return base * (1 + (wave - 20) * 0.04)
}

export function getHealthMultiplier(wave) {
  const base = _piecewiseScale(wave, 0.10, 1.25)
  if (wave < 20) return base
  return base * (1 + (wave - 20) * 0.04)
}

function _piecewiseScale(wave, linearStep, spikeMult) {
  const segment = Math.floor((wave - 1) / 10)
  const position = (wave - 1) % 10
  let value = 1
  for (let i = 0; i < segment; i++) {
    value += linearStep * 9
    value *= spikeMult
  }
  value += linearStep * position
  return value
}

function _spawnEnemy(enemyType, player, overrides) {
  const angle = Math.random() * Math.PI * 2
  const x = player.pos.x + Math.cos(angle) * SPAWN_RADIUS
  const y = player.pos.y + Math.sin(angle) * SPAWN_RADIUS
  return createEnemy(enemyType, x, y, overrides)
}

function _enemyOverrides(wave, enemyType) {
  const healthMult = getHealthMultiplier(wave)
  const cfg = ENEMY_TYPES[enemyType]
  return {
    hp: Math.round(cfg.hp * healthMult),
    maxHp: Math.round(cfg.maxHp * healthMult),
  }
}

function _bossOverrides(wave) {
  const tier = Math.floor(wave / 10)
  const healthMult = getHealthMultiplier(wave) * 4
  const damageMult = getDensityMultiplier(wave)
  return {
    hp: Math.round(450 * healthMult),
    maxHp: Math.round(450 * healthMult),
    damage: Math.round(40 * damageMult),
    speed: 70 + tier * 5,
    bossPattern: BOSS_PATTERNS[(tier - 1) % BOSS_PATTERNS.length],
    attackCooldown: Math.max(0.6, 1.6 - tier * 0.08),
    bossTimer: 1.5,
    bossAngle: 0,
    color: ['#ffcc00', '#ff6699', '#66ccff'][(tier - 1) % 3],
  }
}
