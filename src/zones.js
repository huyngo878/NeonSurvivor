import { createChestNode } from './entities.js'
import { WORLD_W, WORLD_H } from './constants.js'

const CHEST_MIN = 13
const CHEST_MAX = 19
const MARGIN = 200          // keep away from map edges
const MIN_SPACING = 300     // minimum distance between chests
const PLAYER_CLEAR = 600    // minimum distance from player start

export function spawnZoneChests(entities, zoneIndex, playerStartX = WORLD_W / 2, playerStartY = WORLD_H / 2) {
  const chestCount = CHEST_MIN + Math.floor(Math.random() * (CHEST_MAX - CHEST_MIN + 1))
  const placed = []
  let attempts = 0

  while (placed.length < chestCount && attempts < 1000) {
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
