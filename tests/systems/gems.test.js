import { describe, it, expect } from 'vitest'
import { updateGems } from '../../src/systems/gems.js'
import { createPlayer, createGem, createWeapon } from '../../src/entities.js'

describe('updateGems', () => {
  it('advances bobTimer on all gems each frame', () => {
    const player = createPlayer()
    player.pos = { x: 1000, y: 1000 }
    const gem = createGem(1, 6, '#00ff88', 100, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.1, gameState)
    expect(gem.bobTimer).toBeCloseTo(0.1, 5)
  })

  it('collects gem within range and adds XP to player', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(1)
  })

  it('removes collected gem from entities', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(entities.find(e => e === gem)).toBeUndefined()
  })

  it('does not collect gem out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(1, 6, '#00ff88', 500, 500)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(0)
    expect(entities.find(e => e === gem)).toBeDefined()
  })

  it('collects tank gem worth 3 XP', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const gem = createGem(3, 8, '#ffd700', 106, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(3)
  })

  it('triggers level-up when xp reaches xpToNext', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 49
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(gameState.state).toBe('levelup')
    expect(gameState.upgradeChoices).toBeDefined()
    expect(gameState.upgradeChoices.length).toBeGreaterThan(0)
  })

  it('increments player level on level-up', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 49
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem = createGem(1, 6, '#00ff88', 105, 100)
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.level).toBe(2)
  })

  it('carries over excess XP after level-up', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 48
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem = createGem(3, 6, '#00ff88', 105, 100)  // +3 XP, overshoots by 1
    const entities = [player, gem]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.xp).toBe(1)  // 48+3=51, 51-50=1 carries over
  })

  it('only triggers one level-up per frame when two gems are collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.xp = 49
    player.xpToNext = 50
    player.weapons = [createWeapon('wand')]
    const gem1 = createGem(1, 6, '#00ff88', 104, 100)
    const gem2 = createGem(1, 6, '#00ff88', 107, 100)
    const entities = [player, gem1, gem2]
    const gameState = { state: 'playing', kills: 0, time: 0 }
    updateGems(entities, player, 0.016, gameState)
    expect(player.level).toBe(2)
    expect(gameState.state).toBe('levelup')
  })
})
