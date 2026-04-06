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

  const pickupRadius = player.radius + 10
  const nearby = shQuery(hash, player.pos.x, player.pos.y, pickupRadius)

  for (const pickup of nearby) {
    const dist = Math.hypot(pickup.pos.x - player.pos.x, pickup.pos.y - player.pos.y)
    if (dist > player.radius + pickup.radius) continue
    // Remove pickup from entities
    const idx = entities.indexOf(pickup)
    if (idx !== -1) entities.splice(idx, 1)
    // Add weapon if not already owned
    if (pickup.pickupType === 'weapon') {
      const alreadyOwned = player.weapons.some(w => w.type === pickup.weaponType)
      if (!alreadyOwned) player.weapons.push(createWeapon(pickup.weaponType))
    }
  }
}
