import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { pickUpgrades } from '../upgrades.js'

export function updateGems(entities, player, dt, gameState) {
  if (!player) return

  // Advance bob timers
  for (const e of entities) {
    if (e.type === 'gem') e.bobTimer += dt
  }

  const gems = entities.filter(e => e.type === 'gem')
  if (gems.length === 0) return

  const hash = createSpatialHash()
  for (const g of gems) shInsert(hash, g)

  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10)

  for (const gem of nearby) {
    const dist = Math.hypot(gem.pos.x - player.pos.x, gem.pos.y - player.pos.y)
    if (dist > player.radius + gem.radius) continue
    const idx = entities.indexOf(gem)
    if (idx !== -1) entities.splice(idx, 1)
    player.xp += gem.value
    if (player.xp >= player.xpToNext) {
      _levelUp(player, gameState)
    }
  }
}

function _levelUp(player, gameState) {
  player.xp -= player.xpToNext
  player.level++
  player.xpToNext = Math.floor(50 * Math.pow(player.level, 1.2))
  gameState.upgradeChoices = pickUpgrades(player, 3)
  gameState.state = 'levelup'
}
