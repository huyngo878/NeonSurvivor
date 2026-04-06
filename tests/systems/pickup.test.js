import { describe, it, expect } from 'vitest'
import { updatePickup } from '../../src/systems/pickup.js'
import { createPlayer, createPickup, createWeapon, createMagnet, createGem, initProjectilePool } from '../../src/entities.js'

describe('updatePickup', () => {
  it('adds weapon to player when pickup is within range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('wand', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(1)
    expect(player.weapons[0].type).toBe('wand')
  })

  it('removes pickup from entities after collection', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('wand', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === pickup)).toBeUndefined()
  })

  it('upgrades wand shots when duplicate wand is picked up', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.weapons = [createWeapon('wand')]
    const pickup = createPickup('wand', 105, 100)
    const entities = [player, pickup, ...initProjectilePool()]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(1)
    expect(player.weapons[0].shots).toBe(2)
  })

  it('removes wand pickup even when upgrading', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.weapons = [createWeapon('wand')]
    const pickup = createPickup('wand', 105, 100)
    const entities = [player, pickup, ...initProjectilePool()]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === pickup)).toBeUndefined()
  })

  it('upgrades whip cooldown/damage/arc when duplicate whip is picked up', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    player.weapons = [createWeapon('whip')]
    const before = { cooldown: player.weapons[0].cooldown, damage: player.weapons[0].damage, sweepAngle: player.weapons[0].sweepAngle }
    const pickup = createPickup('whip', 105, 100)
    const entities = [player, pickup, ...initProjectilePool()]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(1)
    expect(player.weapons[0].cooldown).toBeLessThan(before.cooldown)
    expect(player.weapons[0].damage).toBeGreaterThan(before.damage)
    expect(player.weapons[0].sweepAngle).toBeGreaterThan(before.sweepAngle)
  })

  it('does not collect pickup out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('whip', 500, 500)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons).toHaveLength(0)
    expect(entities.find(e => e === pickup)).toBeDefined()
  })

  it('advances bobTimer each frame', () => {
    const player = createPlayer()
    player.pos = { x: 1000, y: 1000 }
    const pickup = createPickup('whip', 100, 100)
    const entities = [player, pickup]
    updatePickup(entities, player, 0.1)
    expect(pickup.bobTimer).toBeCloseTo(0.1, 5)
  })

  it('can collect whip pickup', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const pickup = createPickup('whip', 105, 100)
    const pool = initProjectilePool()
    const entities = [player, pickup, ...pool]
    updatePickup(entities, player, 0.016)
    expect(player.weapons[0].type).toBe('whip')
    expect(player.weapons[0].hitIds).toBeInstanceOf(Set)
  })
})

describe('updatePickup — magnet', () => {
  it('removes magnet from entities when collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(105, 100)
    const entities = [player, magnet]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === magnet)).toBeUndefined()
  })

  it('sets attracted=true on all gems when magnet is collected', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(105, 100)
    const gem1 = createGem(1, 6, '#00ff88', 500, 500)
    const gem2 = createGem(2, 8, '#ffd700', 800, 300)
    const entities = [player, magnet, gem1, gem2]
    updatePickup(entities, player, 0.016)
    expect(gem1.attracted).toBe(true)
    expect(gem2.attracted).toBe(true)
  })

  it('does not collect magnet out of range', () => {
    const player = createPlayer()
    player.pos = { x: 100, y: 100 }
    const magnet = createMagnet(500, 500)
    const gem = createGem(1, 6, '#00ff88', 600, 600)
    const entities = [player, magnet, gem]
    updatePickup(entities, player, 0.016)
    expect(entities.find(e => e === magnet)).toBeDefined()
    expect(gem.attracted).toBeFalsy()
  })
})
