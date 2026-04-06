import { describe, it, expect } from 'vitest'
import { updateWeapons } from '../../src/systems/weapons.js'
import { createPlayer, createEnemy, initProjectilePool, createWeapon } from '../../src/entities.js'

describe('updateWeapons - wand', () => {
  it('ticks weapon timer down by dt', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0.5
    updateWeapons([player, ...initProjectilePool()], 0.1)
    expect(player.weapons[0].timer).toBeCloseTo(0.4, 5)
  })

  it('fires when timer <= 0 and enemy is in range', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(projectile => projectile.active)
    expect(fired).toBeDefined()
  })

  it('uses the weapon projectile speed', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    player.weapons[0].projectileSpeed = 520
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(projectile => projectile.active)
    expect(fired.vel.x).toBeCloseTo(520, 0)
  })

  it('copies bounce and fork properties to the projectile', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    player.weapons[0].bounce = 2
    player.weapons[0].forkOnHit = true
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(projectile => projectile.active)
    expect(fired.bouncesRemaining).toBe(2)
    expect(fired.forkOnHit).toBe(true)
  })
})

describe('updateWeapons - whip', () => {
  it('whip becomes active when timer <= 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].active).toBe(true)
  })

  it('whip clears hitIds on new swing', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].hitIds.add(99)
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].hitIds.size).toBe(0)
  })
})

describe('updateWeapons - rocket', () => {
  it('fires at nearest enemy when timer expires', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(projectile => projectile.active)
    expect(fired).toBeDefined()
  })

  it('rocket projectile has aoe flag and aoeRadius', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(projectile => projectile.active)
    expect(fired.aoe).toBe(true)
    expect(fired.aoeRadius).toBe(80)
    expect(fired.weaponType).toBe('rocket')
  })

  it('rocket projectile inherits explosion upgrades', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    player.weapons[0].timer = 0
    player.weapons[0].explosionCount = 2
    player.weapons[0].knockback = 40
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(projectile => projectile.active)
    expect(fired.explosionCount).toBe(2)
    expect(fired.knockback).toBe(40)
  })
})
