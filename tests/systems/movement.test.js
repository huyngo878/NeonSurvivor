import { describe, it, expect } from 'vitest'
import { updateMovement } from '../../src/systems/movement.js'
import { createPlayer, createEnemy } from '../../src/entities.js'
import { WORLD_W } from '../../src/constants.js'

const noInput = { up: false, down: false, left: false, right: false }

describe('updateMovement — player', () => {
  it('moves up when input.up is true', () => {
    const player = createPlayer()
    const startY = player.pos.y
    updateMovement([player], 0.1, { ...noInput, up: true })
    expect(player.pos.y).toBeLessThan(startY)
  })

  it('moves down when input.down is true', () => {
    const player = createPlayer()
    const startY = player.pos.y
    updateMovement([player], 0.1, { ...noInput, down: true })
    expect(player.pos.y).toBeGreaterThan(startY)
  })

  it('does not move when no input', () => {
    const player = createPlayer()
    const { x, y } = player.pos
    updateMovement([player], 0.016, noInput)
    expect(player.pos.x).toBe(x)
    expect(player.pos.y).toBe(y)
  })

  it('normalizes diagonal movement to speed * dt distance', () => {
    const player = createPlayer()
    const startX = player.pos.x
    const startY = player.pos.y
    updateMovement([player], 1, { up: true, down: false, left: false, right: true })
    const dist = Math.hypot(player.pos.x - startX, player.pos.y - startY)
    expect(dist).toBeCloseTo(player.speed, 0)
  })

  it('ticks iframes down each frame', () => {
    const player = createPlayer()
    player.iframes = 0.5
    updateMovement([player], 0.1, noInput)
    expect(player.iframes).toBeCloseTo(0.4, 5)
  })

  it('clamps iframes to 0, not negative', () => {
    const player = createPlayer()
    player.iframes = 0.05
    updateMovement([player], 0.1, noInput)
    expect(player.iframes).toBe(0)
  })

  it('clamps player position to world boundary', () => {
    const player = createPlayer()
    player.pos.x = WORLD_W
    updateMovement([player], 1, { ...noInput, right: true })
    expect(player.pos.x).toBe(WORLD_W)
  })
})

describe('updateMovement — enemy', () => {
  it('moves enemy toward player', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', player.pos.x + 200, player.pos.y)
    const startX = enemy.pos.x
    updateMovement([player, enemy], 0.1, noInput)
    expect(enemy.pos.x).toBeLessThan(startX)
  })

  it('enemy moves at its own speed, not player speed', () => {
    const player = createPlayer()
    const enemy = createEnemy('chaser', player.pos.x + 200, player.pos.y)
    const startX = enemy.pos.x
    updateMovement([player, enemy], 1, noInput)
    const dist = Math.abs(enemy.pos.x - startX)
    expect(dist).toBeCloseTo(enemy.speed, 0)
  })
})

describe('updateMovement — projectile', () => {
  it('advances projectile position by vel * dt', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: true,
      pos: { x: 100, y: 100 }, vel: { x: 400, y: 0 },
      age: 0, lifetime: 2,
    }
    updateMovement([player, proj], 0.1, noInput)
    expect(proj.pos.x).toBeCloseTo(140, 5)
    expect(proj.pos.y).toBeCloseTo(100, 5)
  })

  it('deactivates projectile when age >= lifetime', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: true,
      pos: { x: 1500, y: 1500 }, vel: { x: 0, y: 0 },
      age: 1.99, lifetime: 2,
    }
    updateMovement([player, proj], 0.02, noInput)
    expect(proj.active).toBe(false)
  })

  it('deactivates projectile when it leaves world bounds', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: true,
      pos: { x: -1, y: 100 }, vel: { x: -100, y: 0 },
      age: 0, lifetime: 10,
    }
    updateMovement([player, proj], 0.016, noInput)
    expect(proj.active).toBe(false)
  })

  it('ignores inactive projectiles', () => {
    const player = createPlayer()
    const proj = {
      type: 'projectile', active: false,
      pos: { x: 100, y: 100 }, vel: { x: 400, y: 0 },
      age: 0, lifetime: 2,
    }
    updateMovement([player, proj], 0.1, noInput)
    expect(proj.pos.x).toBe(100) // unchanged
  })
})
