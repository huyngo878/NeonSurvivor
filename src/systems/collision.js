import { CELL_SIZE } from '../constants.js'
import { ENEMY_TYPES, createGem, createMagnet, createShockwave, createEnemyProjectile, createFireZone, createGravityWell } from '../entities.js'

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

export function updateCollision(entities, gameState, dt = 0) {
  const player = entities.find(e => e.type === 'player')
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile' && e.active)
  const enemyProjectiles = entities.filter(e => e.type === 'enemyProjectile')

  const hash = createSpatialHash()
  for (const enemy of enemies) shInsert(hash, enemy)

  // Tick bleed DoT
  for (const e of enemies) {
    if (e.dead) continue
    if (e.bleedTimer > 0) {
      const elapsed = Math.min(e.bleedTimer, dt)
      e.bleedTimer = Math.max(0, e.bleedTimer - dt)
      e.hp -= e.bleedDps * elapsed
      if (e.bleedTimer === 0) e.bleedDps = 0
      if (e.hp <= 0 && !e.dead) {
        _killEnemy(e, entities, player, gameState)
      }
    }
  }

  // Tick fire zones
  for (const zone of entities.filter(e => e.type === 'fireZone')) {
    zone.age += dt
    if (zone.age >= zone.lifetime) { zone.dead = true; continue }
    for (const enemy of enemies) {
      if (enemy.dead) continue
      const dx = zone.pos.x - enemy.pos.x
      const dy = zone.pos.y - enemy.pos.y
      const dist = Math.hypot(dx, dy)
      if (dist < zone.radius + enemy.radius) {
        if (zone.gravityPull && dist > 0) {
          enemy.pos.x += (dx / dist) * zone.pullStrength * dt
          enemy.pos.y += (dy / dist) * zone.pullStrength * dt
        } else if (!zone.gravityPull) {
          enemy.hp -= zone.dps * dt
          if (enemy.hp <= 0 && !enemy.dead) _killEnemy(enemy, entities, player, gameState)
        }
      }
    }
  }

  // Handle exploding rockets (expired aoe projectiles set proj.explode in movement.js)
  for (const proj of projectiles) {
    if (!proj.explode) continue
    _triggerRocketExplosions(proj, enemies, entities, player, gameState)
    proj.active = false
    proj.explode = false
  }

  // Projectile vs Enemy
  for (const proj of projectiles) {
    if (!proj.active) continue
    const candidates = shQuery(hash, proj.pos.x, proj.pos.y, proj.radius + MAX_ENEMY_RADIUS)
    for (const enemy of candidates) {
      if (proj.hitEnemyIds?.has(enemy.id) || proj.lastHitEnemyId === enemy.id) continue
      const dist = Math.hypot(proj.pos.x - enemy.pos.x, proj.pos.y - enemy.pos.y)
      if (dist < proj.radius + enemy.radius) {
        if (!proj.hitEnemyIds) proj.hitEnemyIds = new Set()
        proj.hitEnemyIds.add(enemy.id)
        const critDamage = Math.random() < (proj.critChance || 0) ? proj.damage * 2 : proj.damage
        enemy.hp -= critDamage
        _applyHitImpulse(enemy, proj)
        if (proj.chainBeam > 0) {
          _chainBeamJump(enemy, proj.hitEnemyIds, critDamage * 0.7, proj.chainBeam, enemies, entities, player, gameState)
        }
        if (enemy.hp <= 0) _killEnemy(enemy, entities, player, gameState)
        if (proj.weaponType === 'wand' && proj.forkCountRemaining > 0 && !proj.forked) {
          _forkProjectile(proj, enemy, enemies, entities)
        }
        if (proj.slow) enemy.slowTimer = 1.5
        if (proj.explodeOnImpact && proj.explodeRadius > 0) {
          _aoeExplosion(proj.pos.x, proj.pos.y, proj.explodeRadius, proj.damage * 0.6, enemies, entities, player, gameState, enemy)
        }
        if (proj.aoe) {
          _triggerRocketExplosions(proj, enemies, entities, player, gameState, enemy)
          proj.active = false
          break
        } else if (proj.bouncesRemaining > 0 && _retargetProjectile(proj, enemy, enemies)) {
          proj.bouncesRemaining -= 1
          break
        } else if (proj.piercesRemaining > 0) {
          proj.piercesRemaining -= 1
          // no break — continue through remaining candidates in this frame
        } else {
          proj.active = false
          break
        }
      }
    }
  }

  // Whip arc vs Enemy
  if (player) {
    for (const weapon of player.weapons) {
      if (weapon.type !== 'whip') continue

      // Build list of swings this frame
      const swings = []
      if (weapon.active) {
        swings.push({ aimAngle: weapon.aimAngle, hitIds: weapon.hitIds, damageMult: 1 })
        if (weapon.phantom) {
          swings.push({ aimAngle: weapon.aimAngle - 1.2, hitIds: weapon.phantomHitIds[0], damageMult: 0.7 })
          swings.push({ aimAngle: weapon.aimAngle + 1.2, hitIds: weapon.phantomHitIds[1], damageMult: 0.7 })
        }
      }
      if (weapon.echoActive) {
        swings.push({ aimAngle: weapon.aimAngle, hitIds: weapon.echoHitIds, damageMult: 0.8 })
      }
      if (weapon.boomerangActive) {
        swings.push({ aimAngle: weapon.aimAngle, hitIds: weapon.boomerangHitIds, damageMult: 0.75 })
      }

      for (const swing of swings) {
        const candidates = shQuery(hash, player.pos.x, player.pos.y, weapon.range + MAX_ENEMY_RADIUS)
        for (const enemy of candidates) {
          if (swing.hitIds.has(enemy.id)) continue
          const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
          if (dist > weapon.range + enemy.radius) continue
          const angleToEnemy = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x)
          let diff = angleToEnemy - swing.aimAngle
          while (diff > Math.PI)  diff -= 2 * Math.PI
          while (diff < -Math.PI) diff += 2 * Math.PI
          if (Math.abs(diff) > weapon.sweepAngle / 2) continue
          const baseDamage = Math.random() < (weapon.critChance || 0) ? weapon.damage * 2 : weapon.damage
          const gravityMult = weapon.gravitySlamOnHit ? 1.5 : 1
          const damage = baseDamage * swing.damageMult * gravityMult
          enemy.hp -= damage
          const knockbackStrength = weapon.gravitySlamOnHit ? -120 : (weapon.knockback || 0)
          _pushEnemy(enemy, player.pos.x, player.pos.y, knockbackStrength)
          swing.hitIds.add(enemy.id)
          if (weapon.slowOnHit) enemy.slowTimer = 1.5
          if (weapon.bleedOnHit) {
            enemy.bleedTimer = 3
            enemy.bleedDps = (enemy.bleedDps || 0) + weapon.bleedDps
          }
          if (weapon.shockwaveOnHit) {
            entities.push(createShockwave(enemy.pos.x, enemy.pos.y, weapon.range * 0.6, '#ffd700'))
          }
          if (enemy.hp <= 0) _killEnemy(enemy, entities, player, gameState)
          if (weapon.chainLightning > 0) {
            const chainHitIds = new Set([enemy.id])
            _chainLightning(enemy, weapon, enemies, entities, player, gameState, weapon.chainLightning, chainHitIds)
          }
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
        player.hp -= Math.max(1, enemy.damage - (player.armor || 0))
        player.iframes = 0.5
        break
      }
    }
  }

  if (player && player.iframes <= 0) {
    for (const proj of enemyProjectiles) {
      const dist = Math.hypot(player.pos.x - proj.pos.x, player.pos.y - proj.pos.y)
      if (dist < player.radius + proj.radius) {
        player.hp -= Math.max(1, proj.damage - (player.armor || 0))
        player.iframes = 0.4
        proj.dead = true
        break
      }
    }
  }

  for (const boss of enemies.filter(enemy => enemy.enemyType === 'boss')) {
    _updateBossAttacks(boss, player, entities, gameState)
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

function _rollPickupDrop(enemy, entities) {
  const magnetRate = 0.005

  if (Math.random() < magnetRate) {
    entities.push(createMagnet(enemy.pos.x, enemy.pos.y))
  }
}

function _aoeExplosion(cx, cy, radius, damage, enemies, entities, player, gameState, skipEnemy, centerBonus = 0, chainReaction = false) {
  entities.push(createShockwave(cx, cy, radius))
  for (const enemy of enemies) {
    if (enemy === skipEnemy || enemy.dead) continue
    const dist = Math.hypot(enemy.pos.x - cx, enemy.pos.y - cy)
    if (dist <= radius + enemy.radius) {
      const effectiveDamage = dist < radius * 0.3 ? damage * (1 + centerBonus) : damage
      enemy.hp -= effectiveDamage
      _pushEnemy(enemy, cx, cy, player?.weapons.find(w => w.type === 'rocket')?.knockback || 0)
      if (enemy.hp <= 0) {
        const deathPos = { x: enemy.pos.x, y: enemy.pos.y }
        _killEnemy(enemy, entities, player, gameState)
        if (chainReaction) {
          _aoeExplosion(deathPos.x, deathPos.y, radius * 0.5, damage * 0.4, enemies, entities, player, gameState, enemy, 0, false)
        }
      }
    }
  }
}

function _triggerRocketExplosions(proj, enemies, entities, player, gameState, skipEnemy = null) {
  const count = proj.explosionCount || 1
  for (let i = 0; i < count; i++) {
    const radius = proj.aoeRadius + i * 24
    const damage = proj.damage * (i === 0 ? 0.5 : 0.35)
    const centerBonus = i === 0 ? (proj.centerDamageBonus || 0) : 0
    _aoeExplosion(proj.pos.x, proj.pos.y, radius, damage, enemies, entities, player, gameState, skipEnemy, centerBonus, i === 0 ? (proj.chainReaction || false) : false)
  }
  if (proj.inferno) {
    entities.push(createFireZone(proj.pos.x, proj.pos.y, proj.aoeRadius * 0.8, proj.damage * 0.3, 3.0))
  }
  if (proj.gravityWell) {
    entities.push(createGravityWell(proj.pos.x, proj.pos.y, proj.aoeRadius * 1.5, 180, 3.0))
  }

  const _spawnFragments = (count, dmgMult) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const fragment = entities.find(e => e.type === 'projectile' && !e.active)
      if (!fragment) break
      fragment.active = true
      fragment.pos.x = proj.pos.x
      fragment.pos.y = proj.pos.y
      fragment.vel.x = Math.cos(angle) * 260
      fragment.vel.y = Math.sin(angle) * 260
      fragment.age = 0
      fragment.damage = proj.damage * dmgMult
      fragment.radius = 4
      fragment.aoe = true
      fragment.aoeRadius = Math.max(24, proj.aoeRadius * 0.35)
      fragment.weaponType = 'rocket'
      fragment.explode = false
      fragment.explosionCount = 1
      fragment.fragmentChance = 0
      fragment.clusterBarrage = false
      fragment.knockback = proj.knockback || 0
      fragment.inferno = false
      fragment.chainReaction = false
    }
  }

  if (proj.clusterBarrage) {
    _spawnFragments(8, 0.4)
  } else if (proj.fragmentChance && Math.random() < proj.fragmentChance) {
    _spawnFragments(6, 0.3)
  }
}

function _killEnemy(enemy, entities, player, gameState) {
  gameState.kills++
  enemy.dead = true
  _dropGem(enemy, entities)
  _rollPickupDrop(enemy, entities)
  if (player) {
    const cfg = ENEMY_TYPES[enemy.enemyType]
    if (cfg) player.money = (player.money || 0) + cfg.moneyValue
  }
  if (enemy.enemyType === 'boss') {
    gameState.kills += 9
  }
  // Adaptive Core: wand gains +1 damage per 10 kills
  if (player) {
    const evolvingWand = player.weapons?.find(w => w.type === 'wand' && w.evolving)
    if (evolvingWand) {
      evolvingWand.evolutionKills++
      if (evolvingWand.evolutionKills % 10 === 0 && evolvingWand.evolutionBonus < 50) {
        evolvingWand.evolutionBonus++
        evolvingWand.damage++
      }
    }
  }
}

function _retargetProjectile(proj, hitEnemy, enemies) {
  const target = enemies
    .filter(enemy => enemy !== hitEnemy && !enemy.dead && !proj.hitEnemyIds?.has(enemy.id))
    .map(enemy => ({ enemy, dist: Math.hypot(enemy.pos.x - hitEnemy.pos.x, enemy.pos.y - hitEnemy.pos.y) }))
    .sort((a, b) => a.dist - b.dist)[0]
  if (!target) return false
  const dx = target.enemy.pos.x - proj.pos.x
  const dy = target.enemy.pos.y - proj.pos.y
  const dist = Math.hypot(dx, dy) || 1
  const speed = Math.hypot(proj.vel.x, proj.vel.y) || 400
  proj.lastHitEnemyId = hitEnemy.id
  proj.pos.x = hitEnemy.pos.x + (dx / dist) * (hitEnemy.radius + proj.radius + 2)
  proj.pos.y = hitEnemy.pos.y + (dy / dist) * (hitEnemy.radius + proj.radius + 2)
  proj.vel.x = (dx / dist) * speed
  proj.vel.y = (dy / dist) * speed
  return true
}

function _forkProjectile(proj, hitEnemy, enemies, entities) {
  proj.forked = true
  const targets = enemies
    .filter(enemy => enemy !== hitEnemy && !enemy.dead)
    .map(enemy => ({ enemy, dist: Math.hypot(enemy.pos.x - hitEnemy.pos.x, enemy.pos.y - hitEnemy.pos.y) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2)
  for (const { enemy } of targets) {
    const fork = entities.find(e => e.type === 'projectile' && !e.active)
    if (!fork) break
    const dx = enemy.pos.x - proj.pos.x
    const dy = enemy.pos.y - proj.pos.y
    const dist = Math.hypot(dx, dy) || 1
    const speed = Math.hypot(proj.vel.x, proj.vel.y) || 400
    fork.active = true
    fork.pos.x = proj.pos.x
    fork.pos.y = proj.pos.y
    fork.vel.x = (dx / dist) * speed
    fork.vel.y = (dy / dist) * speed
    fork.age = 0
    fork.damage = proj.damage * 0.8
    fork.radius = proj.radius
    fork.aoe = false
    fork.aoeRadius = 0
    fork.weaponType = 'wand'
    fork.explode = false
    fork.bouncesRemaining = proj.bouncesRemaining
    fork.forkCountRemaining = proj.forkCountRemaining - 1
    fork.forked = false
    fork.lastHitEnemyId = hitEnemy.id
    fork.hitEnemyIds = new Set(proj.hitEnemyIds || [])
    fork.chainBeam = proj.chainBeam || 0
    fork.piercesRemaining = proj.piercesRemaining || 0
  }
}

function _chainBeamJump(fromEnemy, hitEnemyIds, damage, hopsLeft, enemies, entities, player, gameState) {
  const target = enemies
    .filter(e => !e.dead && !hitEnemyIds.has(e.id))
    .map(e => ({ e, dist: Math.hypot(e.pos.x - fromEnemy.pos.x, e.pos.y - fromEnemy.pos.y) }))
    .filter(({ dist }) => dist < 220)
    .sort((a, b) => a.dist - b.dist)[0]
  if (!target) return
  hitEnemyIds.add(target.e.id)
  target.e.hp -= damage
  entities.push(createShockwave(target.e.pos.x, target.e.pos.y, 35, '#00ccff'))
  if (target.e.hp <= 0) _killEnemy(target.e, entities, player, gameState)
  if (hopsLeft > 1) _chainBeamJump(target.e, hitEnemyIds, damage * 0.7, hopsLeft - 1, enemies, entities, player, gameState)
}

function _chainLightning(fromEnemy, weapon, enemies, entities, player, gameState, hopsLeft, hitIds) {
  const target = enemies
    .filter(e => !e.dead && !hitIds.has(e.id))
    .map(e => ({ e, dist: Math.hypot(e.pos.x - fromEnemy.pos.x, e.pos.y - fromEnemy.pos.y) }))
    .filter(({ dist }) => dist < 200)
    .sort((a, b) => a.dist - b.dist)[0]
  if (!target) return
  hitIds.add(target.e.id)
  const damage = weapon.damage * 0.5
  target.e.hp -= damage
  entities.push(createShockwave(target.e.pos.x, target.e.pos.y, 30, '#aaddff'))
  if (target.e.hp <= 0) _killEnemy(target.e, entities, player, gameState)
  if (hopsLeft > 1) _chainLightning(target.e, weapon, enemies, entities, player, gameState, hopsLeft - 1, hitIds)
}

function _applyHitImpulse(enemy, proj) {
  if (proj.weaponType !== 'rocket') return
  _pushEnemy(enemy, proj.pos.x, proj.pos.y, proj.knockback || 0)
}

function _pushEnemy(enemy, cx, cy, strength) {
  if (!strength) return
  const dx = enemy.pos.x - cx
  const dy = enemy.pos.y - cy
  const dist = Math.hypot(dx, dy) || 1
  enemy.pos.x += (dx / dist) * strength
  enemy.pos.y += (dy / dist) * strength
}

function _updateBossAttacks(boss, player, entities, gameState) {
  if (!player || boss.bossTimer > 0) return
  boss.bossTimer = boss.attackCooldown
  if (boss.bossPattern === 'spiral') {
    boss.bossAngle = (boss.bossAngle || 0) + Math.PI / 8
    for (let i = 0; i < 8; i++) {
      const angle = boss.bossAngle + (Math.PI * 2 * i) / 8
      entities.push(createEnemyProjectile(boss.pos.x, boss.pos.y, Math.cos(angle) * 160, Math.sin(angle) * 160, 'spiral'))
    }
  } else if (boss.bossPattern === 'ring') {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16
      entities.push(createEnemyProjectile(boss.pos.x, boss.pos.y, Math.cos(angle) * 120, Math.sin(angle) * 120, 'ring'))
    }
  } else {
    const dx = player.pos.x - boss.pos.x
    const dy = player.pos.y - boss.pos.y
    const baseAngle = Math.atan2(dy, dx)
    for (const offset of [-0.3, 0, 0.3, Math.PI]) {
      const angle = baseAngle + offset
      entities.push(createEnemyProjectile(boss.pos.x, boss.pos.y, Math.cos(angle) * 200, Math.sin(angle) * 200, 'cross'))
    }
  }
  gameState.bossPattern = boss.bossPattern
}
