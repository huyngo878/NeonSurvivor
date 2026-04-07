import { createChestNode, createSparklyChestNode } from './entities.js'
import { WORLD_W, WORLD_H } from './constants.js'

const CHEST_MIN = 13
const CHEST_MAX = 19
const SPARKLY_MIN = 3
const SPARKLY_MAX = 5
const MARGIN = 200          // keep away from map edges
const MIN_SPACING = 300     // minimum distance between chests
const PLAYER_CLEAR = 600    // minimum distance from player start

export function spawnZoneChests(entities, zoneIndex, playerStartX = WORLD_W / 2, playerStartY = WORLD_H / 2) {
  const chestCount = CHEST_MIN + Math.floor(Math.random() * (CHEST_MAX - CHEST_MIN + 1))
  const sparklyCount = SPARKLY_MIN + Math.floor(Math.random() * (SPARKLY_MAX - SPARKLY_MIN + 1))
  const placed = []
  let attempts = 0

  const total = chestCount + sparklyCount
  while (placed.length < total && attempts < 1000) {
    attempts++
    const x = MARGIN + Math.random() * (WORLD_W - MARGIN * 2)
    const y = MARGIN + Math.random() * (WORLD_H - MARGIN * 2)

    if (Math.hypot(x - playerStartX, y - playerStartY) < PLAYER_CLEAR) continue
    if (placed.some(p => Math.hypot(x - p.x, y - p.y) < MIN_SPACING)) continue

    const isSparkly = placed.length >= chestCount
    placed.push({ x, y })
    entities.push(isSparkly ? createSparklyChestNode(x, y) : createChestNode(x, y))
  }
}
