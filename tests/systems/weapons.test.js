import { describe, it, expect } from 'vitest'
import { updateWeapons } from '../../src/systems/weapons.js'
import { createPlayer, createEnemy, initProjectilePool, createWeapon } from '../../src/entities.js'
import { updateCollision } from '../../src/systems/collision.js'

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
    expect(fired.hitEnemyIds).toBeInstanceOf(Set)
  })

  it('bounce retargets to a new enemy instead of the one just hit', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const weapon = player.weapons[0]
    weapon.timer = 0
    weapon.bounce = 1
    const near = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const next = createEnemy('chaser', player.pos.x + 160, player.pos.y + 20)
    const pool = initProjectilePool()
    const entities = [player, near, next, ...pool]
    updateWeapons(entities, 0.016)
    const projectile = pool.find(entry => entry.active)
    projectile.pos.x = near.pos.x
    projectile.pos.y = near.pos.y
    updateCollision(entities, { kills: 0, state: 'playing', time: 0 })
    expect(projectile.active).toBe(true)
    expect(projectile.lastHitEnemyId).toBe(near.id)
    expect(projectile.hitEnemyIds.has(near.id)).toBe(true)
    expect(Math.hypot(projectile.pos.x - near.pos.x, projectile.pos.y - near.pos.y)).toBeGreaterThan(near.radius)
  })

  it('bounce stops once every reachable target has already been hit', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const weapon = player.weapons[0]
    weapon.timer = 0
    weapon.bounce = 5
    const e1 = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const e2 = createEnemy('chaser', player.pos.x + 150, player.pos.y)
    const pool = initProjectilePool()
    const entities = [player, e1, e2, ...pool]
    updateWeapons(entities, 0.016)
    const projectile = pool.find(entry => entry.active)
    projectile.pos.x = e1.pos.x
    projectile.pos.y = e1.pos.y
    updateCollision(entities, { kills: 0, state: 'playing', time: 0 })
    projectile.pos.x = e2.pos.x
    projectile.pos.y = e2.pos.y
    updateCollision(entities, { kills: 0, state: 'playing', time: 0 })
    expect(projectile.active).toBe(false)
    expect(projectile.hitEnemyIds.has(e1.id)).toBe(true)
    expect(projectile.hitEnemyIds.has(e2.id)).toBe(true)
  })

  it('forked wand projectiles can fork again on their own first hit', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const weapon = player.weapons[0]
    weapon.timer = 0
    weapon.forkOnHit = true
    const e1 = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const e2 = createEnemy('chaser', player.pos.x + 150, player.pos.y + 20)
    const e3 = createEnemy('chaser', player.pos.x + 180, player.pos.y - 20)
    const e4 = createEnemy('chaser', player.pos.x + 220, player.pos.y + 10)
    const pool = initProjectilePool()
    const entities = [player, e1, e2, e3, e4, ...pool]
    updateWeapons(entities, 0.016)
    const root = pool.find(entry => entry.active)
    root.pos.x = e1.pos.x
    root.pos.y = e1.pos.y
    updateCollision(entities, { kills: 0, state: 'playing', time: 0 })
    const firstFork = pool.filter(entry => entry.active && entry !== root)
    expect(firstFork.length).toBeGreaterThanOrEqual(2)
    const branch = firstFork[0]
    branch.pos.x = e2.pos.x
    branch.pos.y = e2.pos.y
    updateCollision(entities, { kills: 0, state: 'playing', time: 0 })
    const activeForks = pool.filter(entry => entry.active)
    expect(activeForks.length).toBeGreaterThanOrEqual(3)
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
