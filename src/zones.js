import { createChestNode } from './entities.js'
import { WORLD_W, WORLD_H } from './constants.js'

const CHEST_COUNT = 6
const MARGIN = 200          // keep away from map edges
const MIN_SPACING = 400     // minimum distance between chests
const PLAYER_CLEAR = 600    // minimum distance from player start

export function spawnZoneChests(entities, zoneIndex, playerStartX = WORLD_W / 2, playerStartY = WORLD_H / 2) {
  const placed = []
  let attempts = 0

  while (placed.length < CHEST_COUNT && attempts < 500) {
    attempts++
    const x = MARGIN + Math.random() * (WORLD_W - MARGIN * 2)
    const y = MARGIN + Math.random() * (WORLD_H - MARGIN * 2)

    // Too close to player start
    if (Math.hypot(x - playerStartX, y - playerStartY) < PLAYER_CLEAR) continue

    // Too close to another chest
    if (placed.some(p => Math.hypot(x - p.x, y - p.y) < MIN_SPACING)) continue

    placed.push({ x, y })
    entities.push(createChestNode(x, y))
  }
}
