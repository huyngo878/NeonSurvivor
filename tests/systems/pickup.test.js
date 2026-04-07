import { describe, it, expect } from 'vitest'
import { updatePickup, updateChestNodes, chestCost } from '../../src/systems/pickup.js'
import { createPlayer, createChest, createPickup, createWeapon, createMagnet, createGem, createChestNode } from '../../src/entities.js'

describe('updatePickup', () => {
  it('adds weapon to player when pickup is within range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('wand', 105, 100)
    const entities = [player, pickup]
    updatePickup(entities, player, 0.016, { state: 'playing' })
    expect(player.weapons).toHaveLength(1)
    expect(player.weapons[0].type).toBe('wand')
  })

  it('upgrades an owned weapon when duplicate pickup is collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.weapons = [createWeapon('rocket')]
    const pickup = createPickup('rocket', 105, 100)
    const entities = [player, pickup]
    updatePickup(entities, player, 0.016, { state: 'playing' })
    expect(player.weapons).toHaveLength(1)
    expect(player.weapons[0].shots).toBe(2)
  })

  it('opens a chest and pauses into chest choice state', () => {
    const player = createPlayer()
    player.weapons = []
    player.pos = { x: 100, y: 100 }
    const chest = createChest(105, 100)
    const entities = [player, chest]
    const gameState = { state: 'playing' }
    updatePickup(entities, player, 0.016, gameState)
    expect(gameState.state).toBe('chest')
    expect(gameState.upgradeChoices.length).toBeGreaterThan(0)
    expect(entities.find(e => e === chest)).toBeUndefined()
  })

  it('does not open chest out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const chest = createChest(500, 500)
    const entities = [player, chest]
    const gameState = { state: 'playing' }
    updatePickup(entities, player, 0.016, gameState)
    expect(gameState.state).toBe('playing')
    expect(entities.find(e => e === chest)).toBeDefined()
  })

  it('advances bobTimer each frame', () => {
    const player = createPlayer()
    player.pos = { x: 1000, y: 1000 }
    const chest = createChest(100, 100)
    const entities = [player, chest]
    updatePickup(entities, player, 0.1, { state: 'playing' })
    expect(chest.bobTimer).toBeCloseTo(0.1, 5)
  })
})

describe('updatePickup - magnet', () => {
  it('removes magnet from entities when collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(105, 100)
    const entities = [player, magnet]
    updatePickup(entities, player, 0.016, { state: 'playing' })
    expect(entities.find(e => e === magnet)).toBeUndefined()
  })

  it('sets attracted=true on all gems when magnet is collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(105, 100)
    const gem1 = createGem(1, 6, '#00ff88', 500, 500)
    const gem2 = createGem(2, 8, '#ffd700', 800, 300)
    const entities = [player, magnet, gem1, gem2]
    updatePickup(entities, player, 0.016, { state: 'playing' })
    expect(gem1.attracted).toBe(true)
    expect(gem2.attracted).toBe(true)
  })
})

describe('chestCost', () => {
  it('returns 5 when 0 chests opened (first chest discount)', () => {
    expect(chestCost(0)).toBe(5)
  })

  it('returns 12 when 1 chest opened', () => {
    expect(chestCost(1)).toBe(12)
  })

  it('returns 14 when 2 chests opened', () => {
    expect(chestCost(2)).toBe(14)
  })

  it('increases monotonically after first chest', () => {
    for (let i = 1; i < 10; i++) {
      expect(chestCost(i + 1)).toBeGreaterThan(chestCost(i))
    }
  })
})

describe('updateChestNodes', () => {
  it('sets nearestChest when player is within 80px of an unopened node', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const node = createChestNode(160, 100)  // 60px away
    const entities = [player, node]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest).not.toBeNull()
    expect(gameState.nearestChest.node).toBe(node)
    expect(gameState.nearestChest.cost).toBe(5)
  })

  it('sets nearestChest to null when no node is in range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const node = createChestNode(500, 500)  // far away
    const entities = [player, node]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest).toBeNull()
  })

  it('ignores opened nodes', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const node = createChestNode(110, 100)
    node.opened = true
    const entities = [player, node]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest).toBeNull()
  })

  it('picks the nearest node when multiple are in range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const near = createChestNode(130, 100)   // 30px
    const farther = createChestNode(170, 100)  // 70px
    const entities = [player, near, farther]
    const gameState = { nearestChest: null, chestsOpened: 0 }
    updateChestNodes(entities, player, gameState)
    expect(gameState.nearestChest.node).toBe(near)
  })
})
