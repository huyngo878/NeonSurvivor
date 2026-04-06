import { PROJ_SPEED } from '../constants.js'

const ROCKET_SPEED = 300

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
    proj.vel.x = (dx / dist) * PROJ_SPEED
    proj.vel.y = (dy / dist) * PROJ_SPEED
    proj.age = 0
    proj.damage = weapon.damage
    proj.radius = 4
    proj.aoe = false
    proj.aoeRadius = 0
    proj.weaponType = 'wand'
    proj.explode = false
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
    proj.vel.x = (dx / dist) * ROCKET_SPEED
    proj.vel.y = (dy / dist) * ROCKET_SPEED
    proj.age = 0
    proj.damage = weapon.damage
    proj.radius = 7
    proj.aoe = true
    proj.aoeRadius = weapon.aoeRadius
    proj.weaponType = 'rocket'
    proj.explode = false
  }
}
