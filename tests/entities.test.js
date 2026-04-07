import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, createWeapon, createChest, createPickup, createGem, createMagnet, createChestNode, initProjectilePool, ENEMY_TYPES } from '../src/entities.js'
import { POOL_SIZE, WORLD_W, WORLD_H } from '../src/constants.js'

describe('createPlayer', () => {
  it('spawns at world center with correct defaults', () => {
    const player = createPlayer()
    expect(player.type).toBe('player')
    expect(player.pos.x).toBe(WORLD_W / 2)
    expect(player.pos.y).toBe(WORLD_H / 2)
    expect(player.hp).toBe(100)
    expect(player.maxHp).toBe(100)
    expect(player.speed).toBe(200)
    expect(player.armor).toBe(0)
    expect(player.iframes).toBe(0)
  })

  it('starts with empty weapons array and default facing right', () => {
    const player = createPlayer()
    expect(player.weapons).toHaveLength(0)
    expect(player.facing).toEqual({ x: 1, y: 0 })
  })

  it('starts with xp=0 and level=1', () => {
    const player = createPlayer()
    expect(player.xp).toBe(0)
    expect(player.level).toBe(1)
    expect(player.xpToNext).toBe(20)
  })
})

describe('createEnemy', () => {
  it('creates chaser with correct stats', () => {
    const enemy = createEnemy('chaser', 100, 200)
    expect(enemy.type).toBe('enemy')
    expect(enemy.enemyType).toBe('chaser')
    expect(enemy.pos).toEqual({ x: 100, y: 200 })
    expect(enemy.hp).toBe(ENEMY_TYPES.chaser.hp)
    expect(enemy.maxHp).toBe(ENEMY_TYPES.chaser.maxHp)
  })

  it('throws on unknown enemy type', () => {
    expect(() => createEnemy('dragon', 0, 0)).toThrow('Unknown enemy type: dragon')
  })

  it('all ENEMY_TYPES have a moneyValue', () => {
    for (const [type, cfg] of Object.entries(ENEMY_TYPES)) {
      expect(typeof cfg.moneyValue, `${type} missing moneyValue`).toBe('number')
      expect(cfg.moneyValue).toBeGreaterThan(0)
    }
  })
})

describe('initProjectilePool', () => {
  it(`returns exactly ${POOL_SIZE} projectiles`, () => {
    expect(initProjectilePool()).toHaveLength(POOL_SIZE)
  })

  it('all projectiles are inactive with correct shape', () => {
    const pool = initProjectilePool()
    for (const projectile of pool) {
      expect(projectile.type).toBe('projectile')
      expect(projectile.active).toBe(false)
      expect(projectile.radius).toBe(4)
      expect(projectile.lifetime).toBe(2)
      expect(projectile.age).toBe(0)
    }
  })
})

describe('createWeapon', () => {
  it('creates wand with upgrade-ready fields', () => {
    const weapon = createWeapon('wand')
    expect(weapon.type).toBe('wand')
    expect(weapon.projectileSpeed).toBe(400)
    expect(weapon.bounce).toBe(0)
    expect(weapon.forkCount).toBe(0)
  })

  it('creates whip with swing state and crit defaults', () => {
    const weapon = createWeapon('whip')
    expect(weapon.hitIds).toBeInstanceOf(Set)
    expect(weapon.knockback).toBe(18)
    expect(weapon.critChance).toBe(0)
  })

  it('creates rocket with explosion upgrade defaults', () => {
    const weapon = createWeapon('rocket')
    expect(weapon.explosionCount).toBe(1)
    expect(weapon.knockback).toBe(0)
    expect(weapon.fragmentChance).toBe(0)
  })
})

describe('createChest', () => {
  it('creates a chest pickup with correct shape', () => {
    const chest = createChest(100, 200)
    expect(chest.type).toBe('pickup')
    expect(chest.pickupType).toBe('chest')
    expect(chest.pos).toEqual({ x: 100, y: 200 })
    expect(chest.radius).toBe(10)
  })
})

describe('createPickup', () => {
  it('creates a weapon pickup with the requested weapon type', () => {
    const pickup = createPickup('rocket', 100, 200)
    expect(pickup.type).toBe('pickup')
    expect(pickup.pickupType).toBe('weapon')
    expect(pickup.weaponType).toBe('rocket')
  })
})

describe('createGem', () => {
  it('creates a gem with correct shape', () => {
    const gem = createGem(1, 6, '#00ff88', 100, 200)
    expect(gem.type).toBe('gem')
    expect(gem.value).toBe(1)
    expect(gem.radius).toBe(6)
    expect(gem.color).toBe('#00ff88')
  })
})

describe('createMagnet', () => {
  it('returns a pickup entity with pickupType magnet', () => {
    const magnet = createMagnet(100, 200)
    expect(magnet.type).toBe('pickup')
    expect(magnet.pickupType).toBe('magnet')
    expect(magnet.pos).toEqual({ x: 100, y: 200 })
  })
})

describe('createChestNode', () => {
  it('returns a chestNode entity with correct shape', () => {
    const node = createChestNode(750, 400)
    expect(node.type).toBe('chestNode')
    expect(node.pos).toEqual({ x: 750, y: 400 })
    expect(node.radius).toBe(14)
    expect(node.opened).toBe(false)
    expect(node.bobTimer).toBe(0)
    expect(typeof node.id).toBe('number')
  })
})
