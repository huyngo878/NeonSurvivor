import { SPAWN_RADIUS, DIFFICULTY_INTERVAL } from '../constants.js'
import { createEnemy } from '../entities.js'

export const WAVES = [
  { enemyType: 'chaser',    count: 5, interval: 2.0,  startTime: 0  },
  { enemyType: 'speedster', count: 3, interval: 3.5,  startTime: 20  },
  { enemyType: 'tank',      count: 2, interval: 6.0,  startTime: 15 },
  { enemyType: 'brute',     count: 1, interval: 15.0, startTime: 30 },
]

export function createSpawnerState(spawnDelayBonus = 0) {
  return {
    timers: WAVES.map(() => 0),
    difficultyTimer: 0,
    countMult: 1.0,
    intervalMult: 1.0 + spawnDelayBonus,
  }
}

export function updateSpawner(entities, state, dt, gameTime) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return

  // Difficulty ramp every DIFFICULTY_INTERVAL seconds
  state.difficultyTimer += dt
  if (state.difficultyTimer >= DIFFICULTY_INTERVAL) {
    state.difficultyTimer -= DIFFICULTY_INTERVAL
    state.countMult    = Math.min(state.countMult * 1.2, 10.0)
    state.intervalMult = Math.max(state.intervalMult * 0.85, 0.25)
  }

  for (let i = 0; i < WAVES.length; i++) {
    const wave = WAVES[i]
    if (gameTime < wave.startTime) continue

    state.timers[i] -= dt
    if (state.timers[i] > 0) continue

    const interval = wave.interval * state.intervalMult
    state.timers[i] = interval

    const count = Math.round(wave.count * state.countMult)
    for (let j = 0; j < count; j++) {
      const angle = Math.random() * Math.PI * 2
      const x = player.pos.x + Math.cos(angle) * SPAWN_RADIUS
      const y = player.pos.y + Math.sin(angle) * SPAWN_RADIUS
      entities.push(createEnemy(wave.enemyType, x, y))
    }
  }
}
