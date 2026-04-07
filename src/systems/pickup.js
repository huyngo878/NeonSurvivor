import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { pickChestCards } from '../upgrades.js'
import { createWeapon } from '../entities.js'

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
    } else if (pickup.pickupType === 'weapon') {
      const existing = player.weapons.find(weapon => weapon.type === pickup.weaponType)
      if (existing) {
        _upgradeWeapon(existing)
      } else {
        player.weapons.push(createWeapon(pickup.weaponType))
      }
    } else if (pickup.pickupType === 'chest') {
      gameState.upgradeChoices = pickChestCards(player, 3 + (player.extraChoices || 0))
      gameState.state = 'chest'
    }
  }
}

export function chestCost(chestsOpened) {
  return chestsOpened === 0 ? 5 : Math.floor(10 * Math.pow(1.22, chestsOpened))
}

export function updateChestNodes(entities, player, gameState, dt = 0) {
  if (!player) return
  const PROXIMITY = 80
  let nearest = null
  let nearestDist = Infinity

  for (const e of entities) {
    if (e.type !== 'chestNode') continue
    if (dt > 0) e.bobTimer += dt
    if (e.opened) continue
    const dist = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y)
    if (dist <= PROXIMITY && dist < nearestDist) {
      nearest = e
      nearestDist = dist
    }
  }

  gameState.nearestChest = nearest
    ? { node: nearest, cost: chestCost(gameState.chestsOpened || 0) }
    : null
}

function _upgradeWeapon(weapon) {
  if (weapon.type === 'wand') {
    weapon.shots += 1
  } else if (weapon.type === 'whip') {
    weapon.cooldown = Math.max(0.2, weapon.cooldown * 0.85)
    weapon.damage += 5
    weapon.sweepAngle = Math.min(2 * Math.PI, weapon.sweepAngle + Math.PI / 6)
  } else if (weapon.type === 'rocket') {
    weapon.shots += 1
  }
}
