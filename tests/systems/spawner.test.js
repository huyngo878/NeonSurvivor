import { describe, it, expect } from 'vitest'
import { updateSpawner, createSpawnerState, WAVES } from '../../src/systems/spawner.js'
import { createPlayer, initProjectilePool } from '../../src/entities.js'
import { SPAWN_RADIUS, DIFFICULTY_INTERVAL } from '../../src/constants.js'

describe('updateSpawner', () => {
  it('spawns chaser enemies on first frame (startTime: 0)', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016)
    const enemies = entities.filter(e => e.type === 'enemy')
    expect(enemies.length).toBeGreaterThan(0)
    expect(enemies[0].enemyType).toBe('chaser')
  })

  it('does not spawn tank before startTime of 15s', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016)
    const tanks = entities.filter(e => e.type === 'enemy' && e.enemyType === 'tank')
    expect(tanks).toHaveLength(0)
  })

  it('spawns tank after startTime of 15s', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 15.016)
    const tanks = entities.filter(e => e.type === 'enemy' && e.enemyType === 'tank')
    expect(tanks.length).toBeGreaterThan(0)
  })

  it('spawns enemy at exactly SPAWN_RADIUS distance from player', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016)
    const enemy = entities.find(e => e.type === 'enemy')
    const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
    expect(dist).toBeCloseTo(SPAWN_RADIUS, 1)
  })

  it('respects spawn interval — does not spawn twice in a row', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, 0.016, 0.016) // first spawn
    const countAfterFirst = entities.filter(e => e.type === 'enemy').length
    updateSpawner(entities, state, 0.016, 0.032) // second frame — timer not expired
    const countAfterSecond = entities.filter(e => e.type === 'enemy').length
    expect(countAfterSecond).toBe(countAfterFirst) // no new spawn
  })

  it('applies countMult after DIFFICULTY_INTERVAL seconds', () => {
    const player = createPlayer()
    const pool = initProjectilePool()
    const entities = [player, ...pool]
    const state = createSpawnerState()
    updateSpawner(entities, state, DIFFICULTY_INTERVAL + 0.01, 0)
    expect(state.countMult).toBeCloseTo(1.2, 5)
    expect(state.intervalMult).toBeCloseTo(0.85, 5)
  })
})
