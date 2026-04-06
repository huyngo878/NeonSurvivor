import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { pickChestCards } from '../upgrades.js'

export function updatePickup(entities, player, dt, gameState) {
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
    const idx = entities.indexOf(pickup)
    if (idx !== -1) entities.splice(idx, 1)

    if (pickup.pickupType === 'magnet') {
      // Attract all gems
      for (const e of entities) {
        if (e.type === 'gem') e.attracted = true
      }
    } else if (pickup.pickupType === 'chest') {
      gameState.upgradeChoices = pickChestCards(player, 3 + (player.extraChoices || 0))
      gameState.state = 'chest'
    }
  }
}
