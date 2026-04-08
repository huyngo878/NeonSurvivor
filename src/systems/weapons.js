export function updateWeapons(entities, dt) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile')

  for (const weapon of player.weapons) {
    if (weapon.type === 'wand') {
      _tickWand(weapon, dt, player, enemies, projectiles)
    } else if (weapon.type === 'whip') {
      _tickWhip(weapon, dt, player, enemies)
    } else if (weapon.type === 'rocket') {
      _tickRocket(weapon, dt, player, enemies, projectiles)
    }
  }
}

function _tickWand(weapon, dt, player, enemies, projectiles) {
  // Echo Wand: tick queued echo shots (runs every frame, independent of cooldown)
  if (weapon.echo && weapon.echoQueue && weapon.echoQueue.length > 0) {
    for (let i = weapon.echoQueue.length - 1; i >= 0; i--) {
      const entry = weapon.echoQueue[i]
      entry.timer -= dt
      if (entry.timer <= 0) {
        const proj = projectiles.find(p => !p.active)
        if (proj) {
          proj.active = true
          proj.pos.x = entry.pos.x
          proj.pos.y = entry.pos.y
          proj.vel.x = entry.vel.x
          proj.vel.y = entry.vel.y
          proj.age = 0
          proj.damage = entry.damage
          proj.radius = 4
          proj.aoe = false
          proj.aoeRadius = 0
          proj.weaponType = 'wand'
          proj.explode = false
          proj.bouncesRemaining = weapon.bounce
          proj.forkCountRemaining = 0
          proj.forked = false
          proj.lastHitEnemyId = null
          proj.hitEnemyIds = new Set()
          proj.piercesRemaining = 0
          proj.slow = weapon.slowOnHit || false
          proj.homing = 0
          proj.explodeOnImpact = false
          proj.explodeRadius = 0
        }
        weapon.echoQueue.splice(i, 1)
      }
    }
  }

  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  const inRange = enemies
    .map(e => ({ e, dist: Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) }))
    .filter(({ dist }) => dist <= weapon.range)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, weapon.shots)

  for (const { e: target } of inRange) {
    const proj = projectiles.find(p => !p.active)
    if (!proj) break
    const dx = target.pos.x - player.pos.x
    const dy = target.pos.y - player.pos.y
    const dist = Math.hypot(dx, dy)
    proj.active = true
    proj.pos.x = player.pos.x
    proj.pos.y = player.pos.y
    proj.vel.x = (dx / dist) * weapon.projectileSpeed
    proj.vel.y = (dy / dist) * weapon.projectileSpeed
    proj.age = 0
    proj.damage = weapon.damage
    proj.radius = 4
    proj.aoe = false
    proj.aoeRadius = 0
    proj.weaponType = 'wand'
    proj.explode = false
    proj.bouncesRemaining = weapon.bounce
    proj.forkCountRemaining = weapon.forkCount
    proj.forked = false
    proj.lastHitEnemyId = null
    proj.hitEnemyIds = new Set()
    proj.piercesRemaining = weapon.pierceCount || 0
    proj.slow = weapon.slowOnHit || false
    proj.homing = weapon.homing || 0
    proj.explodeOnImpact = weapon.explodeOnImpact || false
    proj.explodeRadius = weapon.explodeRadius || 0
    proj.chainBeam = weapon.chainBeam || 0
    proj.critChance = weapon.critChance || 0
    if (weapon.echo) {
      weapon.echoQueue.push({
        pos: { x: proj.pos.x, y: proj.pos.y },
        vel: { x: proj.vel.x, y: proj.vel.y },
        damage: proj.damage,
        timer: 0.6,
      })
    }
  }

  // Multicast: chance to fire a bonus projectile at each target
  if (weapon.multicastChance > 0) {
    for (const { e: target } of inRange) {
      if (Math.random() >= weapon.multicastChance) continue
      const proj = projectiles.find(p => !p.active)
      if (!proj) break
      const dx = target.pos.x - player.pos.x
      const dy = target.pos.y - player.pos.y
      const dist = Math.hypot(dx, dy)
      // slight spread so it's visually distinct from the main shot
      const spread = (Math.random() - 0.5) * 0.3
      proj.active = true
      proj.pos.x = player.pos.x
      proj.pos.y = player.pos.y
      proj.vel.x = (Math.cos(Math.atan2(dy, dx) + spread)) * weapon.projectileSpeed
      proj.vel.y = (Math.sin(Math.atan2(dy, dx) + spread)) * weapon.projectileSpeed
      proj.age = 0
      proj.damage = weapon.damage
      proj.radius = 4
      proj.aoe = false
      proj.aoeRadius = 0
      proj.weaponType = 'wand'
      proj.explode = false
      proj.bouncesRemaining = weapon.bounce
      proj.forkCountRemaining = weapon.forkCount
      proj.forked = false
      proj.lastHitEnemyId = null
      proj.hitEnemyIds = new Set()
      proj.piercesRemaining = weapon.pierceCount || 0
      proj.slow = weapon.slowOnHit || false
      proj.homing = weapon.homing || 0
      proj.explodeOnImpact = weapon.explodeOnImpact || false
      proj.explodeRadius = weapon.explodeRadius || 0
      proj.chainBeam = weapon.chainBeam || 0
      proj.critChance = weapon.critChance || 0
    }
  }

  // Arcane Overload: every Nth shot fires an empowered projectile
  if (weapon.overloadActive) {
    weapon.overloadCounter += inRange.length
    if (weapon.overloadCounter >= weapon.overloadThreshold) {
      weapon.overloadCounter = 0
      const target = inRange[0]?.e
      if (target) {
        const proj = projectiles.find(p => !p.active)
        if (proj) {
          const dx = target.pos.x - player.pos.x
          const dy = target.pos.y - player.pos.y
          const dist = Math.hypot(dx, dy)
          proj.active = true
          proj.pos.x = player.pos.x
          proj.pos.y = player.pos.y
          proj.vel.x = (dx / dist) * weapon.projectileSpeed
          proj.vel.y = (dy / dist) * weapon.projectileSpeed
          proj.age = 0
          proj.damage = weapon.damage * 3
          proj.radius = 10
          proj.aoe = true
          proj.aoeRadius = 60
          proj.weaponType = 'wand'
          proj.explode = false
          proj.bouncesRemaining = 0
          proj.forkCountRemaining = 0
          proj.forked = false
          proj.lastHitEnemyId = null
          proj.hitEnemyIds = new Set()
          proj.piercesRemaining = 0
          proj.slow = weapon.slowOnHit || false
          proj.homing = 0
          proj.explodeOnImpact = false
          proj.explodeRadius = 0
        }
      }
    }
  }

}

function _tickWhip(weapon, dt, player, enemies) {
  if (weapon.active) {
    weapon.activeTimer -= dt
    if (weapon.activeTimer <= 0) weapon.active = false
    return
  }
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  let nearest = null
  let nearestDist = Infinity
  for (const enemy of enemies) {
    const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
    if (dist < nearestDist) { nearest = enemy; nearestDist = dist }
  }
  if (nearest) {
    weapon.aimAngle = Math.atan2(
      nearest.pos.y - player.pos.y,
      nearest.pos.x - player.pos.x,
    )
  } else {
    weapon.aimAngle = Math.atan2(player.facing.y, player.facing.x)
  }

  weapon.active = true
  weapon.activeTimer = weapon.activeDuration
  weapon.hitIds = new Set()
}

function _tickRocket(weapon, dt, player, enemies, projectiles) {
  weapon.timer -= dt
  if (weapon.timer > 0) return
  weapon.timer = weapon.cooldown

  const sorted = enemies
    .map(e => ({ e, dist: Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) }))
    .filter(({ dist }) => dist <= weapon.range)
    .sort((a, b) => a.dist - b.dist)

  if (sorted.length === 0) return

  for (let s = 0; s < weapon.shots; s++) {
    const { e: target } = sorted[s % sorted.length]
    const proj = projectiles.find(p => !p.active)
    if (!proj) break
    const dx = target.pos.x - player.pos.x
    const dy = target.pos.y - player.pos.y
    const dist = Math.hypot(dx, dy)
    // slight angle spread when hitting the same target multiple times
    const spread = sorted.length === 1 && weapon.shots > 1
      ? (s - (weapon.shots - 1) / 2) * 0.15
      : 0
    const angle = Math.atan2(dy, dx) + spread
    proj.active = true
    proj.pos.x = player.pos.x
    proj.pos.y = player.pos.y
    proj.vel.x = Math.cos(angle) * weapon.projectileSpeed
    proj.vel.y = Math.sin(angle) * weapon.projectileSpeed
    proj.age = 0
    proj.damage = weapon.damage
    proj.radius = 7
    proj.aoe = true
    proj.aoeRadius = weapon.aoeRadius
    proj.weaponType = 'rocket'
    proj.explode = false
    proj.explosionCount = weapon.explosionCount
    proj.knockback = weapon.knockback
    proj.fragmentChance = weapon.fragmentChance
    proj.centerDamageBonus = weapon.centerDamageBonus || 0
    proj.lastHitEnemyId = null
    proj.hitEnemyIds = new Set()
  }
}
