import { describe, it, expect } from 'vitest'
import { updateWeapons } from '../../src/systems/weapons.js'
import { createPlayer, createEnemy, initProjectilePool, createWeapon } from '../../src/entities.js'
import { PROJ_SPEED } from '../../src/constants.js'

describe('updateWeapons — wand', () => {
  it('ticks weapon timer down by dt', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0.5
    updateWeapons([player, ...initProjectilePool()], 0.1)
    expect(player.weapons[0].timer).toBeCloseTo(0.4, 5)
  })

  it('does not fire when timer > 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0.5
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.1)
    expect(pool.every(p => !p.active)).toBe(true)
  })

  it('fires when timer <= 0 and enemy is in range', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired).toBeDefined()
  })

  it('resets timer to cooldown after firing', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    expect(player.weapons[0].timer).toBe(player.weapons[0].cooldown)
  })

  it('resets timer to cooldown even when no enemy in range', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    player.weapons[0].range = 50
    const enemy = createEnemy('chaser', player.pos.x + 500, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    expect(player.weapons[0].timer).toBe(player.weapons[0].cooldown)
    expect(pool.every(p => !p.active)).toBe(true)
  })

  it('spawns projectile at player position', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.pos.x).toBe(player.pos.x)
    expect(fired.pos.y).toBe(player.pos.y)
  })

  it('projectile velocity points toward nearest enemy at PROJ_SPEED', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.vel.x).toBeCloseTo(PROJ_SPEED, 0)
    expect(fired.vel.y).toBeCloseTo(0, 1)
  })

  it('targets nearest enemy when multiple enemies exist', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    const near = createEnemy('chaser', player.pos.x + 50, player.pos.y)
    const far  = createEnemy('chaser', player.pos.x + 300, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, near, far, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.vel.x).toBeGreaterThan(0)
    expect(fired.vel.y).toBeCloseTo(0, 1)
  })

  it('sets projectile damage from weapon', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].timer = 0
    player.weapons[0].damage = 35
    const enemy = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const pool = initProjectilePool()
    updateWeapons([player, enemy, ...pool], 0.016)
    const fired = pool.find(p => p.active)
    expect(fired.damage).toBe(35)
  })
})

describe('updateWeapons — whip', () => {
  it('whip timer ticks down by dt', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0.5
    updateWeapons([player], 0.1)
    expect(player.weapons[0].timer).toBeCloseTo(0.4, 5)
  })

  it('whip becomes active when timer <= 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].active).toBe(true)
  })

  it('whip resets timer to cooldown when it fires', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].timer = 0
    updateWeapons([player], 0.016)
    expect(player.weapons[0].timer).toBe(player.weapons[0].cooldown)
  })

  it('whip activeTimer counts down while active', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    updateWeapons([player], 0.05)
    expect(player.weapons[0].activeTimer).toBeCloseTo(0.05, 5)
  })

  it('whip becomes inactive when activeTimer reaches 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.01
    updateWeapons([player], 0.05)
    expect(player.weapons[0].active).toBe(false)
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
