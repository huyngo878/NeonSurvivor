import { createChestNode } from './entities.js'

export const ZONE_LAYOUTS = [
  // Zone 1 — open arena, player starts at (1500, 1500)
  {
    chests: [
      { x: 750,  y: 400  },
      { x: 2300, y: 550  },
      { x: 400,  y: 1600 },
      { x: 2600, y: 1400 },
      { x: 850,  y: 2500 },
      { x: 2200, y: 2400 },
    ],
  },
]

export function spawnZoneChests(entities, zoneIndex) {
  const layout = ZONE_LAYOUTS[zoneIndex]
  if (!layout) return
  for (const { x, y } of layout.chests) {
    entities.push(createChestNode(x, y))
  }
}
