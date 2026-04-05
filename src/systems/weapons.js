import { PROJ_SPEED } from '../constants.js'

export function updateWeapons(entities, dt) {
  const player = entities.find(e => e.type === 'player')
  if (!player) return
  const enemies = entities.filter(e => e.type === 'enemy')
  const projectiles = entities.filter(e => e.type === 'projectile')

  for (const weapon of player.weapons) {
    weapon.timer -= dt
    if (weapon.timer > 0) continue
    weapon.timer = weapon.cooldown

    // Find nearest enemy within range
    let nearest = null
    let nearestDist = weapon.range
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y)
      if (dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    }
    if (!nearest) continue

    // Grab first inactive projectile from pool
    const proj = projectiles.find(p => !p.active)
    if (!proj) continue

    const dx = nearest.pos.x - player.pos.x
    const dy = nearest.pos.y - player.pos.y
    const dist = Math.hypot(dx, dy)

    proj.active = true
    proj.pos.x = player.pos.x
    proj.pos.y = player.pos.y
    proj.vel.x = (dx / dist) * PROJ_SPEED
    proj.vel.y = (dy / dist) * PROJ_SPEED
    proj.age = 0
    proj.damage = weapon.damage
  }
}
