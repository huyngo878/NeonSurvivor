import { WORLD_W, WORLD_H, POOL_SIZE } from './constants.js'

export const ENEMY_TYPES = {
  chaser: { speed: 120, hp: 30,  maxHp: 30,  radius: 8,  color: '#ff0080', damage: 10 },
  tank:   { speed: 55,  hp: 120, maxHp: 120, radius: 14, color: '#ff4400', damage: 20 },
}

const WEAPON_CONFIGS = {
  wand: { type: 'wand', cooldown: 0.8, damage: 20, range: 400, shots: 1 },
  whip: {
    type: 'whip', cooldown: 0.6, damage: 15, range: 120,
    sweepAngle: Math.PI, activeDuration: 0.12, aimAngle: 0,
  },
}

let nextId = 1

export function createWeapon(type) {
  const cfg = WEAPON_CONFIGS[type]
  if (!cfg) throw new Error(`Unknown weapon type: ${type}`)
  const base = { ...cfg, timer: 0 }
  if (type === 'whip') {
    base.active = false
    base.activeTimer = 0
    base.hitIds = new Set()
  }
  return base
}

export function createPickup(weaponType, x, y) {
  return {
    id: nextId++,
    type: 'pickup',
    pickupType: 'weapon',
    weaponType,
    pos: { x, y },
    radius: 10,
    bobTimer: 0,
  }
}

export function createPlayer() {
  return {
    id: nextId++,
    type: 'player',
    pos: { x: WORLD_W / 2, y: WORLD_H / 2 },
    vel: { x: 0, y: 0 },
    hp: 100,
    maxHp: 100,
    speed: 200,
    iframes: 0,
    radius: 12,
    facing: { x: 1, y: 0 },
    weapons: [],
  }
}

export function createEnemy(enemyType, x, y) {
  const cfg = ENEMY_TYPES[enemyType]
  if (!cfg) throw new Error(`Unknown enemy type: ${enemyType}`)
  return {
    id: nextId++,
    type: 'enemy',
    enemyType,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    hp: cfg.hp,
    maxHp: cfg.maxHp,
    radius: cfg.radius,
    color: cfg.color,
    damage: cfg.damage,
    speed: cfg.speed,
  }
}

export function initProjectilePool() {
  const pool = []
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      id: nextId++,
      type: 'projectile',
      active: false,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      damage: 0,
      radius: 4,
      lifetime: 2.0,
      age: 0,
    })
  }
  return pool
}
