import { CELL_SIZE } from '../constants.js'
import { ENEMY_TYPES, createPickup, createGem, createMagnet } from '../entities.js'

const MAX_ENEMY_RADIUS = Math.max(...Object.values(ENEMY_TYPES).map(e => e.radius))

// --- Spatial Hash ---

export function createSpatialHash() {
  return new Map()
}

export function shInsert(hash, entity) {
  const key = cellKey(Math.floor(entity.pos.x / CELL_SIZE), Math.floor(entity.pos.y / CELL_SIZE))
  if (!hash.has(key)) hash.set(key, [])
  hash.get(key).push(entity)
}

export function shQuery(hash, x, y, radius) {
  const results = []
  const minCx = Math.floor((x - radius) / CELL_SIZE)
  const maxCx = Math.floor((x + radius) / CELL_SIZE)
  const minCy = Math.floor((y - radius) / CELL_SIZE)
  const maxCy = Math.floor((y + radius) / CELL_SIZE)
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const bucket = hash.get(cellKey(cx, cy))
      if (bucket) results.push(...bucket)
    }
  }
  return results
}

function cellKey(cx, cy) { return `${cx},${cy}` }

// --- Hit Detection ---

export function updateCollision(entities, gameState) {
  const player = entities.find(e => e.type === 'player')
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile' && e.active)

  const hash = createSpatialHash()
  for (const enemy of enemies) shInsert(hash, enemy)

  // Handle exploding rockets (expired aoe projectiles set proj.explode in movement.js)
  for (const proj of projectiles) {
    if (!proj.explode) continue
    _aoeExplosion(proj.pos.x, proj.pos.y, proj.aoeRadius, proj.damage * 0.5, enemies, entities, player, gameState, null)
    proj.active = false
    proj.explode = false
  }

  // Projectile vs Enemy
  for (const proj of projectiles) {
    const candidates = shQuery(hash, proj.pos.x, proj.pos.y, proj.radius + MAX_ENEMY_RADIUS)
    for (const enemy of candidates) {
      const dist = Math.hypot(proj.pos.x - enemy.pos.x, proj.pos.y - enemy.pos.y)
      if (dist < proj.radius + enemy.radius) {
        enemy.hp -= proj.damage
        proj.active = false
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _dropGem(enemy, entities)
          _rollPickupDrop(enemy, entities, player)
        }
        if (proj.aoe) {
          _aoeExplosion(proj.pos.x, proj.pos.y, proj.aoeRadius, proj.damage * 0.5, enemies, entities, player, gameState, enemy)
        }
        break
      }
    }
  }

  // Whip arc vs Enemy
  if (player) {
    for (const weapon of player.weapons) {
      if (weapon.type !== 'whip' || !weapon.active) continue
      const facingAngle = weapon.aimAngle
      const candidates = shQuery(hash, player.pos.x, player.pos.y, weapon.range + MAX_ENEMY_RADIUS)
      for (const enemy of candidates) {
        if (weapon.hitIds.has(enemy.id)) continue
        const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
        if (dist > weapon.range + enemy.radius) continue
        const angleToEnemy = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x)
        let diff = angleToEnemy - facingAngle
        while (diff > Math.PI)  diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        if (Math.abs(diff) > weapon.sweepAngle / 2) continue
        enemy.hp -= weapon.damage
        weapon.hitIds.add(enemy.id)
        if (enemy.hp <= 0) {
          gameState.kills++
          enemy.dead = true
          _dropGem(enemy, entities)
          _rollPickupDrop(enemy, entities, player)
        }
      }
    }
  }

  // Enemy vs Player
  if (player && player.iframes <= 0) {
    const nearby = shQuery(hash, player.pos.x, player.pos.y, MAX_ENEMY_RADIUS + player.radius)
    for (const enemy of nearby) {
      const dist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y)
      if (dist < enemy.radius + player.radius) {
        player.hp -= enemy.damage
        player.iframes = 0.5
        break
      }
    }
  }

  // Remove dead entities
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].dead) entities.splice(i, 1)
  }
}

function _dropGem(enemy, entities) {
  const cfg = ENEMY_TYPES[enemy.enemyType]
  if (!cfg) return
  entities.push(createGem(cfg.gemValue, cfg.gemRadius, cfg.gemColor, enemy.pos.x, enemy.pos.y))
}

function _rollPickupDrop(enemy, entities, player) {
  const baseRate = 0.05 + (player ? (player.dropRateBonus || 0) : 0)

  // Weapon drop
  if (Math.random() < baseRate) {
    const weapons = ['wand', 'whip', 'rocket']
    const dropType = weapons[Math.floor(Math.random() * weapons.length)]
    entities.push(createPickup(dropType, enemy.pos.x, enemy.pos.y))
  }

  // Magnet drop (rare, independent roll)
  if (Math.random() < baseRate) {
    entities.push(createMagnet(enemy.pos.x, enemy.pos.y))
  }
}

function _aoeExplosion(cx, cy, radius, damage, enemies, entities, player, gameState, skipEnemy) {
  for (const enemy of enemies) {
    if (enemy === skipEnemy || enemy.dead) continue
    const dist = Math.hypot(enemy.pos.x - cx, enemy.pos.y - cy)
    if (dist <= radius + enemy.radius) {
      enemy.hp -= damage
      if (enemy.hp <= 0) {
        gameState.kills++
        enemy.dead = true
        _dropGem(enemy, entities)
        _rollPickupDrop(enemy, entities, player)
      }
    }
  }
}
