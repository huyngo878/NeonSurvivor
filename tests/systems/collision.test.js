import { describe, it, expect } from 'vitest'
import { createSpatialHash, shInsert, shQuery } from '../../src/systems/collision.js'

describe('spatial hash', () => {
  it('query returns entity inserted in same cell', () => {
    const hash = createSpatialHash()
    const entity = { pos: { x: 10, y: 10 } }
    shInsert(hash, entity)
    const results = shQuery(hash, 10, 10, 5)
    expect(results).toContain(entity)
  })

  it('query returns entity from a neighboring cell', () => {
    const hash = createSpatialHash()
    // entity at pos (63, 10) falls in cell (0, 0) with CELL_SIZE=64
    const entity = { pos: { x: 63, y: 10 } }
    shInsert(hash, entity)
    // query from (65, 10) — cell (1, 0) — with radius 5 should reach cell (0, 0)
    const results = shQuery(hash, 65, 10, 5)
    expect(results).toContain(entity)
  })

  it('returns empty array when hash is empty', () => {
    const hash = createSpatialHash()
    expect(shQuery(hash, 100, 100, 50)).toEqual([])
  })

  it('multiple entities in same cell are all returned', () => {
    const hash = createSpatialHash()
    const a = { pos: { x: 10, y: 10 } }
    const b = { pos: { x: 15, y: 15 } }
    shInsert(hash, a)
    shInsert(hash, b)
    const results = shQuery(hash, 10, 10, 5)
    expect(results).toContain(a)
    expect(results).toContain(b)
  })
})

import { updateCollision } from '../../src/systems/collision.js'
import { createPlayer, createEnemy, initProjectilePool, createWeapon } from '../../src/entities.js'

describe('updateCollision — projectile vs enemy', () => {
  it('damages enemy when projectile overlaps', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 20; proj.radius = 4
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(10)    // 30 - 20
    expect(proj.active).toBe(false)
  })

  it('increments kill count and removes enemy when hp reaches 0', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.damage = 999; proj.radius = 4
    const entities = [player, enemy, ...pool]
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision(entities, gameState)
    expect(gameState.kills).toBe(1)
    expect(entities.find(e => e === enemy)).toBeUndefined()
  })

  it('does not damage enemy when projectile is out of range', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 500, y: 500 }; proj.damage = 999; proj.radius = 4
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(30)
  })
})

describe('updateCollision — enemy vs player', () => {
  it('damages player when enemy overlaps and iframes are 0', () => {
    const player = createPlayer()
    player.pos = { x: 200, y: 200 }; player.iframes = 0
    // chaser radius=8, player radius=12, overlap at dist 5 (< 20)
    const enemy = createEnemy('chaser', 205, 200)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.hp).toBe(90)
    expect(player.iframes).toBe(0.5)
  })

  it('does not damage player during iframes', () => {
    const player = createPlayer()
    player.pos = { x: 200, y: 200 }; player.iframes = 0.3
    const enemy = createEnemy('chaser', 205, 200)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.hp).toBe(100)
  })
})

describe('updateCollision — whip arc', () => {
  it('damages enemy directly in front of player (within arc)', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    const enemy = createEnemy('chaser', 550, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBeLessThan(enemy.maxHp)
  })

  it('does not damage enemy behind player (outside arc)', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    const enemy = createEnemy('chaser', 450, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(enemy.maxHp)
  })

  it('does not damage same enemy twice in one swing', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    const enemy = createEnemy('chaser', 550, 500)
    enemy.hp = 100
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    const hpAfterFirst = enemy.hp
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(hpAfterFirst)
  })

  it('does not damage enemy when whip is inactive', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.facing = { x: 1, y: 0 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = false
    const enemy = createEnemy('chaser', 550, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.hp).toBe(enemy.maxHp)
  })
})

describe('updateCollision — money on kill', () => {
  it('awards chaser moneyValue to player on kill', () => {
    const player = createPlayer()
    player.money = 0
    const enemy = createEnemy('chaser', 200, 200)
    enemy.hp = 1
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.money).toBe(1)
  })

  it('awards boss moneyValue 25 on kill', () => {
    const player = createPlayer()
    player.money = 10
    const enemy = createEnemy('boss', 200, 200)
    enemy.hp = 1
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(player.money).toBe(35)
  })

  it('does not crash when player has no money field', () => {
    const player = createPlayer()
    // no player.money set
    const enemy = createEnemy('chaser', 200, 200)
    enemy.hp = 1
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    expect(() => updateCollision([player, enemy, ...pool], gameState)).not.toThrow()
  })
})

describe('updateCollision — pierce', () => {
  it('projectile with piercesRemaining > 0 stays active after hitting enemy', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false
    proj.weaponType = 'wand'; proj.bouncesRemaining = 0
    proj.piercesRemaining = 1
    proj.hitEnemyIds = new Set()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(proj.active).toBe(true)
    expect(proj.piercesRemaining).toBe(0)
  })

  it('projectile with piercesRemaining 0 deactivates after hit', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false
    proj.weaponType = 'wand'; proj.bouncesRemaining = 0
    proj.piercesRemaining = 0
    proj.hitEnemyIds = new Set()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(proj.active).toBe(false)
  })
})

describe('updateCollision — slow on hit', () => {
  it('projectile with slow=true sets enemy.slowTimer on hit', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    proj.slow = true; proj.piercesRemaining = 0; proj.bouncesRemaining = 0
    proj.hitEnemyIds = new Set()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.slowTimer).toBeGreaterThan(0)
  })

  it('projectile with slow=false does not set enemy.slowTimer', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    proj.slow = false; proj.piercesRemaining = 0; proj.bouncesRemaining = 0
    proj.hitEnemyIds = new Set()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState)
    expect(enemy.slowTimer || 0).toBe(0)
  })
})

describe('updateCollision — whip shockwave', () => {
  it('shockwave entity is added to entities when whip hits with shockwaveOnHit=true', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    player.weapons[0].aimAngle = 0
    player.weapons[0].shockwaveOnHit = true
    const enemy = createEnemy('chaser', 550, 500)
    const pool = initProjectilePool()
    const entities = [player, enemy, ...pool]
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision(entities, gameState)
    expect(entities.some(e => e.type === 'shockwave')).toBe(true)
  })
})

describe('updateCollision — wand explode on impact', () => {
  it('wand projectile with explodeOnImpact adds a shockwave when it hits', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true; proj.pos = { x: 200, y: 200 }; proj.vel = { x: 0, y: 0 }
    proj.damage = 5; proj.radius = 4; proj.aoe = false; proj.weaponType = 'wand'
    proj.bouncesRemaining = 0; proj.piercesRemaining = 0
    proj.hitEnemyIds = new Set()
    proj.explodeOnImpact = true; proj.explodeRadius = 70
    const entities = [player, enemy, ...pool]
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision(entities, gameState)
    expect(entities.some(e => e.type === 'shockwave')).toBe(true)
    expect(proj.active).toBe(false)
  })
})

describe('updateCollision — bleed DoT', () => {
  it('whip with bleedOnHit sets bleedTimer and bleedDps on enemy', () => {
    const player = createPlayer()
    player.pos = { x: 500, y: 500 }
    player.weapons = [createWeapon('whip')]
    player.weapons[0].active = true
    player.weapons[0].activeTimer = 0.1
    player.weapons[0].bleedOnHit = true
    player.weapons[0].bleedDps = 5
    player.weapons[0].aimAngle = 0  // facing right
    const enemy = createEnemy('chaser', 550, 500)
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState, 0)
    expect(enemy.bleedTimer).toBeGreaterThan(0)
    expect(enemy.bleedDps).toBeGreaterThan(0)
  })

  it('bleed deals damage each dt tick', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    enemy.bleedTimer = 3
    enemy.bleedDps = 10
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState, 0.5)
    // 10 dps * 0.5s = 5 damage; chaser maxHp is 30
    expect(enemy.hp).toBeCloseTo(25)
    expect(enemy.bleedTimer).toBeCloseTo(2.5)
  })

  it('bleed only deals damage proportional to remaining bleedTimer on final tick', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', 200, 200)
    enemy.bleedTimer = 0.1
    enemy.bleedDps = 100   // 100 dps × 0.1s remaining = 10 damage max
    const pool = initProjectilePool()
    const gameState = { kills: 0, state: 'playing', time: 0 }
    updateCollision([player, enemy, ...pool], gameState, 0.5)  // dt > bleedTimer
    // Should take at most 10 damage (0.1s * 100 dps), not 50 (0.5s * 100 dps)
    expect(enemy.hp).toBeGreaterThanOrEqual(20)   // 30 - 10 = 20
    expect(enemy.bleedTimer).toBe(0)
    expect(enemy.bleedDps).toBe(0)   // reset after expiry
  })
})

describe('wand chain beam', () => {
  it('chains damage to nearby enemies on hit when chainBeam > 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const e1 = createEnemy('chaser', player.pos.x + 100, player.pos.y)
    const e2 = createEnemy('chaser', player.pos.x + 140, player.pos.y)
    const e3 = createEnemy('chaser', player.pos.x + 180, player.pos.y)
    const pool = initProjectilePool()
    const proj = pool[0]
    proj.active = true
    proj.pos = { x: e1.pos.x, y: e1.pos.y }
    proj.vel = { x: 0, y: 0 }
    proj.damage = 20
    proj.radius = 4
    proj.aoe = false
    proj.weaponType = 'wand'
    proj.chainBeam = 2  // chain to 2 more enemies
    const gameState = { kills: 0, state: 'playing', time: 0, chestsOpened: 0 }
    updateCollision([player, e1, e2, e3, ...pool], gameState)
    // e1 hit by projectile, e2 and e3 chained
    expect(e1.hp).toBeLessThan(e1.maxHp)
    expect(e2.hp).toBeLessThan(e2.maxHp)
    expect(e3.hp).toBeLessThan(e3.maxHp)
  })
})
