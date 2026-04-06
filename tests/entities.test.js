import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, createWeapon, createPickup, createGem, initProjectilePool, ENEMY_TYPES } from '../src/entities.js'
import { POOL_SIZE, WORLD_W, WORLD_H } from '../src/constants.js'

describe('createPlayer', () => {
  it('spawns at world center with correct defaults', () => {
    const p = createPlayer()
    expect(p.type).toBe('player')
    expect(p.pos.x).toBe(WORLD_W / 2)
    expect(p.pos.y).toBe(WORLD_H / 2)
    expect(p.hp).toBe(100)
    expect(p.maxHp).toBe(100)
    expect(p.speed).toBe(200)
    expect(p.iframes).toBe(0)
  })

  it('starts with empty weapons array and default facing right', () => {
    const p = createPlayer()
    expect(p.weapons).toHaveLength(0)
    expect(p.facing).toEqual({ x: 1, y: 0 })
  })
})

describe('createEnemy', () => {
  it('creates chaser with correct stats', () => {
    const e = createEnemy('chaser', 100, 200)
    expect(e.type).toBe('enemy')
    expect(e.enemyType).toBe('chaser')
    expect(e.pos).toEqual({ x: 100, y: 200 })
    expect(e.hp).toBe(ENEMY_TYPES.chaser.hp)
    expect(e.maxHp).toBe(ENEMY_TYPES.chaser.maxHp)
    expect(e.radius).toBe(ENEMY_TYPES.chaser.radius)
    expect(e.speed).toBe(ENEMY_TYPES.chaser.speed)
    expect(e.color).toBe(ENEMY_TYPES.chaser.color)
    expect(e.damage).toBe(ENEMY_TYPES.chaser.damage)
  })

  it('creates tank with correct stats', () => {
    const e = createEnemy('tank', 0, 0)
    expect(e.hp).toBe(ENEMY_TYPES.tank.hp)
    expect(e.radius).toBe(ENEMY_TYPES.tank.radius)
    expect(e.speed).toBe(ENEMY_TYPES.tank.speed)
  })

  it('throws on unknown enemy type', () => {
    expect(() => createEnemy('dragon', 0, 0)).toThrow('Unknown enemy type: dragon')
  })
})

describe('initProjectilePool', () => {
  it(`returns exactly ${POOL_SIZE} projectiles`, () => {
    const pool = initProjectilePool()
    expect(pool).toHaveLength(POOL_SIZE)
  })

  it('all projectiles are inactive with correct shape', () => {
    const pool = initProjectilePool()
    for (const p of pool) {
      expect(p.type).toBe('projectile')
      expect(p.active).toBe(false)
      expect(p.radius).toBe(4)
      expect(p.lifetime).toBe(2.0)
      expect(p.age).toBe(0)
    }
  })
})

describe('createWeapon', () => {
  it('creates wand with correct shape', () => {
    const w = createWeapon('wand')
    expect(w.type).toBe('wand')
    expect(w.cooldown).toBe(0.53)
    expect(w.timer).toBe(0)
    expect(w.damage).toBe(22)
    expect(w.range).toBe(400)
    expect(w.shots).toBe(1)
  })

  it('creates whip with correct shape', () => {
    const w = createWeapon('whip')
    expect(w.type).toBe('whip')
    expect(w.cooldown).toBe(0.9)
    expect(w.timer).toBe(0)
    expect(w.damage).toBe(11)
    expect(w.range).toBe(120)
    expect(w.sweepAngle).toBe(Math.PI)
    expect(w.active).toBe(false)
    expect(w.activeTimer).toBe(0)
    expect(w.activeDuration).toBe(0.12)
    expect(w.aimAngle).toBe(0)
    expect(w.hitIds).toBeInstanceOf(Set)
  })

  it('throws on unknown weapon type', () => {
    expect(() => createWeapon('laser')).toThrow('Unknown weapon type: laser')
  })
})

describe('createPickup', () => {
  it('creates a weapon pickup with correct shape', () => {
    const p = createPickup('wand', 100, 200)
    expect(p.type).toBe('pickup')
    expect(p.pickupType).toBe('weapon')
    expect(p.weaponType).toBe('wand')
    expect(p.pos).toEqual({ x: 100, y: 200 })
    expect(p.radius).toBe(10)
    expect(p.bobTimer).toBe(0)
  })
})

describe('createGem', () => {
  it('creates a gem with correct shape', () => {
    const g = createGem(1, 6, '#00ff88', 100, 200)
    expect(g.type).toBe('gem')
    expect(g.value).toBe(1)
    expect(g.radius).toBe(6)
    expect(g.color).toBe('#00ff88')
    expect(g.pos).toEqual({ x: 100, y: 200 })
    expect(g.bobTimer).toBe(0)
    expect(typeof g.id).toBe('number')
  })
})

describe('createPlayer — XP fields', () => {
  it('starts with xp=0, level=1, xpToNext=50, regenRate=0', () => {
    const p = createPlayer()
    expect(p.xp).toBe(0)
    expect(p.level).toBe(1)
    expect(p.xpToNext).toBe(50)
    expect(p.regenRate).toBe(0)
  })
})

describe('ENEMY_TYPES — gem data', () => {
  it('chaser has gemValue=1, gemRadius=6, gemColor=#00ff88', () => {
    expect(ENEMY_TYPES.chaser.gemValue).toBe(1)
    expect(ENEMY_TYPES.chaser.gemRadius).toBe(6)
    expect(ENEMY_TYPES.chaser.gemColor).toBe('#00ff88')
  })

  it('tank has gemValue=3, gemRadius=8, gemColor=#ffd700', () => {
    expect(ENEMY_TYPES.tank.gemValue).toBe(3)
    expect(ENEMY_TYPES.tank.gemRadius).toBe(8)
    expect(ENEMY_TYPES.tank.gemColor).toBe('#ffd700')
  })
})
