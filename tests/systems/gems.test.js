import { describe, it, expect } from 'vitest'
import { updateGems } from '../../src/systems/gems.js'
import { createPlayer, createGem } from '../../src/entities.js'

describe('updateGems', () => {
  it('advances bobTimer on all gems each frame', () => {
    const player = createPlayer()
    player.pos = { x: 1000, y: 1000 }
    const gem = createGem(1, 6, '#00ff88', 100, 100)
    const entities = [player, gem]
    updateGems(entities, player, 0.1, { state: 'playing' })
    expect(gem.bobTimer).toBeCloseTo(0.1, 5)
  })

  it('collects gem within range and adds XP to player', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    updateGems(entities, player, 0.016, { state: 'playing' })
    expect(player.xp).toBe(1)
    expect(entities.find(entity => entity === gem)).toBeUndefined()
  })

  it('levels the player without opening a card screen', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 19
    player.xpToNext = 20
    const gem = createGem(3, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing' }
    updateGems(entities, player, 0.016, gameState)
    expect(player.level).toBe(2)
    expect(player.xp).toBe(2)
    expect(gameState.state).toBe('playing')
    expect(entities.some(entity => entity.type === 'pickup' && entity.pickupType === 'chest')).toBe(true)
  })

  it('moves attracted gem toward player each frame', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 500, 100)
    gem.attracted = true
    const entities = [player, gem]
    updateGems(entities, player, 0.1, { state: 'playing' })
    expect(gem.pos.x).toBeLessThan(500)
  })

  it('spawns one chest per level gained from a large XP burst', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 19
    player.xpToNext = 20
    const gem = createGem(80, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    updateGems(entities, player, 0.016, { state: 'playing' })
    const chests = entities.filter(entity => entity.type === 'pickup' && entity.pickupType === 'chest')
    expect(player.level).toBe(3)
    expect(chests.length).toBe(player.level - 1)
  })

  it('stops spawning a chest on every level after level 5', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.level = 5
    player.xp = 44
    player.xpToNext = 45
    const gem = createGem(80, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    updateGems(entities, player, 0.016, { state: 'playing' })
    const chests = entities.filter(entity => entity.type === 'pickup' && entity.pickupType === 'chest')
    expect(player.level).toBeGreaterThanOrEqual(6)
    expect(chests.length).toBe(1)
  })
})
