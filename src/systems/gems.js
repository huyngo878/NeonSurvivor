import { createSpatialHash, shInsert, shQuery } from './collision.js'
import { createChest } from '../entities.js'

const MAGNET_SPEED = 400  // px/s

export function updateGems(entities, player, dt, gameState) {
  if (!player) return

  // Advance bob timers
  for (const e of entities) {
    if (e.type === 'gem') e.bobTimer += dt
  }

  const gems = entities.filter(e => e.type === 'gem')
  if (gems.length === 0) return

  // Attracted gems — move toward player, collect on arrival
  const collectRadius = player.radius + 10 + (player.magnetBonus || 0)
  for (let i = entities.length - 1; i >= 0; i--) {
    const gem = entities[i]
    if (gem.type !== 'gem' || !gem.attracted) continue
    const dx = player.pos.x - gem.pos.x
    const dy = player.pos.y - gem.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist <= collectRadius) {
      entities.splice(i, 1)
      player.xp += Math.floor(gem.value * (player.xpMult || 1))
      _levelUp(player, entities)
    } else {
      gem.pos.x += (dx / dist) * MAGNET_SPEED * dt
      gem.pos.y += (dy / dist) * MAGNET_SPEED * dt
    }
  }

  // Normal gems — spatial hash pickup
  const normalGems = entities.filter(e => e.type === 'gem' && !e.attracted)
  if (normalGems.length === 0) return

  const hash = createSpatialHash()
  for (const g of normalGems) shInsert(hash, g)

  const nearby = shQuery(hash, player.pos.x, player.pos.y, player.radius + 10 + (player.magnetBonus || 0))

  for (const gem of nearby) {
    const dist = Math.hypot(gem.pos.x - player.pos.x, gem.pos.y - player.pos.y)
    if (dist > player.radius + gem.radius + (player.magnetBonus || 0)) continue
    const idx = entities.indexOf(gem)
    if (idx !== -1) entities.splice(idx, 1)
    player.xp += Math.floor(gem.value * (player.xpMult || 1))
    _levelUp(player, entities)
  }
}

function _levelUp(player, entities) {
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext
    player.level++
    player.xpToNext = Math.floor(20 * Math.pow(player.level, 1.2))
    if (_shouldSpawnLevelChest(player.level)) {
      entities.push(createChest(player.pos.x, player.pos.y))
    }
  }
}

function _shouldSpawnLevelChest(level) {
  return level <= 5 || level % 2 === 0
}
