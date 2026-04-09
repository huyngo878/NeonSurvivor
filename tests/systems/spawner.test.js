import { describe, it, expect } from 'vitest'
import { updateSpawner, createSpawnerState, getDensityMultiplier, getHealthMultiplier } from '../../src/systems/spawner.js'
import { createPlayer, initProjectilePool } from '../../src/entities.js'
import { SPAWN_RADIUS, WAVE_DURATION } from '../../src/constants.js'

describe('updateSpawner', () => {
  it('spawns chaser enemies on first frame of wave 1', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    const gameState = { wave: 0 }
    updateSpawner(entities, state, 0.016, 0.016, gameState)
    const enemies = entities.filter(entity => entity.type === 'enemy')
    expect(enemies.length).toBeGreaterThan(0)
    expect(enemies[0].enemyType).toBe('chaser')
    expect(gameState.wave).toBe(1)
  })

  it('does not spawn speedsters in the first few waves', () => {
    const player = createPlayer()
    const entities = [player, ...initProjectilePool()]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016, {})
    const speedsters = entities.filter(entity => entity.type === 'enemy' && entity.enemyType === 'speedster')
    expect(speedsters).toHaveLength(0)
  })

  it('spawns a boss on wave 10 and no regular enemies', () => {
    const player = createPlayer()
    const entities = [player, ...initProjectilePool()]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, (10 - 1) * WAVE_DURATION + 0.1, {})
    const enemies = entities.filter(entity => entity.type === 'enemy')
    expect(enemies).toHaveLength(1)
    expect(enemies[0].enemyType).toBe('boss')
  })

  it('spawns enemy at exactly SPAWN_RADIUS distance from player', () => {
    const player = createPlayer()
    const entities = [player, ...initProjectilePool()]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016, {})
    const enemy = entities.find(entity => entity.type === 'enemy')
    const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
    expect(dist).toBeCloseTo(SPAWN_RADIUS, 1)
  })

  it('uses linear scaling before a spike and spikes on wave 11', () => {
    expect(getDensityMultiplier(10)).toBeGreaterThan(getDensityMultiplier(9))
    expect(getDensityMultiplier(11)).toBeGreaterThan(getDensityMultiplier(10))
    expect(getHealthMultiplier(11)).toBeGreaterThan(getHealthMultiplier(10))
  })
})

describe('getDensityMultiplier — steeper scaling', () => {
  it('wave 10 density is at least 3.0x', () => {
    expect(getDensityMultiplier(10)).toBeGreaterThanOrEqual(3.0)
  })

  it('wave 20 density is at least 6.0x', () => {
    expect(getDensityMultiplier(20)).toBeGreaterThanOrEqual(6.0)
  })

  it('wave 30 density is at least 12.0x', () => {
    expect(getDensityMultiplier(30)).toBeGreaterThanOrEqual(12.0)
  })

  it('density still increases each wave', () => {
    for (let w = 1; w < 30; w++) {
      expect(getDensityMultiplier(w + 1)).toBeGreaterThan(getDensityMultiplier(w))
    }
  })
})
