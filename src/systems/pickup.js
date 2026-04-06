import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { createWeapon } from '../entities.js'

export function updatePickup(entities, player, dt) {
  if (!player) return

  // Advance bob timers
  for (const e of entities) {
    if (e.type === 'pickup') e.bobTimer += dt
  }

  const pickups = entities.filter(e => e.type === 'pickup')
  if (pickups.length === 0) return

  const hash = createSpatialHash()
  for (const p of pickups) shInsert(hash, p)

  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10)

  for (const pickup of nearby) {
    const dist = Math.hypot(pickup.pos.x - player.pos.x, pickup.pos.y - player.pos.y)
    if (dist > player.radius + pickup.radius) continue
    // Remove pickup
    const idx = entities.indexOf(pickup)
    if (idx !== -1) entities.splice(idx, 1)
    // Upgrade existing or add new
    if (pickup.pickupType === 'weapon') {
      const existing = player.weapons.find(w => w.type === pickup.weaponType)
      if (existing) {
        _upgradeWeapon(existing)
      } else {
        player.weapons.push(createWeapon(pickup.weaponType))
      }
    }
  }
}

function _upgradeWeapon(weapon) {
  if (weapon.type === 'wand') {
    weapon.shots += 1
  } else if (weapon.type === 'whip') {
    weapon.cooldown = Math.max(0.2, weapon.cooldown * 0.85)
    weapon.damage += 5
    weapon.sweepAngle = Math.min(2 * Math.PI, weapon.sweepAngle + Math.PI / 6)
  }
}
