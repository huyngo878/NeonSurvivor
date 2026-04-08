import { WORLD_W, WORLD_H, POOL_SIZE } from './constants.js'

export const ENEMY_TYPES = {
  chaser:    { speed: 120, hp: 30,   maxHp: 30,   radius: 11, color: '#ff0080', damage: 10, gemValue: 2,  gemRadius: 6,  gemColor: '#00ff88', moneyValue: 1  },
  tank:      { speed: 55,  hp: 120,  maxHp: 120,  radius: 20, color: '#ff4400', damage: 20, gemValue: 3,  gemRadius: 8,  gemColor: '#ffd700', moneyValue: 3  },
  speedster: { speed: 220, hp: 18,   maxHp: 18,   radius: 8,  color: '#ff44ff', damage: 8,  gemValue: 1,  gemRadius: 6,  gemColor: '#00ffff', moneyValue: 2  },
  brute:     { speed: 35,  hp: 280,  maxHp: 280,  radius: 25, color: '#aa00ff', damage: 35, gemValue: 6,  gemRadius: 10, gemColor: '#cc88ff', moneyValue: 5  },
  boss:      { speed: 70,  hp: 2500, maxHp: 2500, radius: 42, color: '#ffcc00', damage: 40, gemValue: 20, gemRadius: 12, gemColor: '#ffffff', moneyValue: 25 },
}

const WEAPON_CONFIGS = {
  wand: {
    type: 'wand', cooldown: 0.53, damage: 22, range: 400, shots: 1, projectileSpeed: 400,
    bounce: 0, forkCount: 0, pierceCount: 0, slowOnHit: false, homing: 0,
    explodeOnImpact: false, explodeRadius: 0, multicastChance: 0,
    overloadActive: false,
    overloadCounter: 0,
    overloadThreshold: 5,
  },
  whip: {
    type: 'whip', cooldown: 0.9, damage: 11, range: 120,
    sweepAngle: Math.PI, activeDuration: 0.12, aimAngle: 0,
    knockback: 18, critChance: 0, slowOnHit: false,
    bleedOnHit: false, bleedDps: 0, shockwaveOnHit: false,
  },
  rocket: {
    type: 'rocket', cooldown: 2.0, damage: 60, range: 500, shots: 1, aoeRadius: 80,
    explosionCount: 1, knockback: 0, fragmentChance: 0,
    projectileSpeed: 300, centerDamageBonus: 0,
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

export function createChest(x, y) {
  return {
    id: nextId++,
    type: 'pickup',
    pickupType: 'chest',
    pos: { x, y },
    radius: 10,
    bobTimer: 0,
  }
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

export function createMagnet(x, y) {
  return {
    id: nextId++,
    type: 'pickup',
    pickupType: 'magnet',
    pos: { x, y },
    radius: 10,
    bobTimer: 0,
  }
}

export function createGem(value, radius, color, x, y) {
  return {
    id: nextId++,
    type: 'gem',
    value,
    radius,
    color,
    pos: { x, y },
    bobTimer: 0,
  }
}

export function createChestNode(x, y) {
  return {
    id: nextId++,
    type: 'chestNode',
    pos: { x, y },
    radius: 14,
    opened: false,
    bobTimer: 0,
  }
}

export function createSparklyChestNode(x, y) {
  return {
    id: nextId++,
    type: 'chestNode',
    pos: { x, y },
    radius: 14,
    opened: false,
    bobTimer: 0,
    sparkly: true,
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
    xp: 0,
    level: 1,
    xpToNext: 20,
    xpMult: 1.0,        // multiplier for XP gained (meta upgrade)
    extraChoices: 0,    // extra level-up cards shown (meta upgrade)
    magnetBonus: 0,     // extra gem pickup radius in px (meta upgrade)
    spawnDelayBonus: 0, // starting intervalMult bonus (meta upgrade)
    armor: 0,
    money: 0,
    uniqueWeapons: {},
  }
}

export function createEnemy(enemyType, x, y, overrides = {}) {
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
    slowTimer: 0,
    bleedTimer: 0,
    bleedDps: 0,
    ...overrides,
  }
}

export function createShockwave(x, y, radius, color = '#ffb347') {
  return {
    id: nextId++,
    type: 'shockwave',
    pos: { x, y },
    radius: 0,
    maxRadius: radius,
    color,
    age: 0,
    lifetime: 0.3,
  }
}

export function createEnemyProjectile(x, y, vx, vy, pattern = 'burst') {
  return {
    id: nextId++,
    type: 'enemyProjectile',
    pos: { x, y },
    vel: { x: vx, y: vy },
    radius: 6,
    damage: 12,
    age: 0,
    lifetime: 4,
    pattern,
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
      aoe: false,
      aoeRadius: 0,
      weaponType: '',
      explode: false,
      bouncesRemaining: 0,
      forkCountRemaining: 0,
      forked: false,
      explosionCount: 1,
      knockback: 0,
      fragmentChance: 0,
      centerDamageBonus: 0,
      lastHitEnemyId: null,
      hitEnemyIds: new Set(),
      piercesRemaining: 0,
      slow: false,
      homing: 0,
      explodeOnImpact: false,
      explodeRadius: 0,
    })
  }
  return pool
}
