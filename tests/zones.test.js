import { describe, it, expect } from 'vitest'
import { ZONE_LAYOUTS, spawnZoneChests } from '../src/zones.js'

describe('ZONE_LAYOUTS', () => {
  it('has at least one zone', () => {
    expect(ZONE_LAYOUTS.length).toBeGreaterThanOrEqual(1)
  })

  it('zone 1 has 6 chest positions', () => {
    expect(ZONE_LAYOUTS[0].chests).toHaveLength(6)
  })

  it('each chest position has x and y', () => {
    for (const chest of ZONE_LAYOUTS[0].chests) {
      expect(typeof chest.x).toBe('number')
      expect(typeof chest.y).toBe('number')
    }
  })
})

describe('spawnZoneChests', () => {
  it('adds 6 chestNode entities to entities array for zone 0', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    const nodes = entities.filter(e => e.type === 'chestNode')
    expect(nodes).toHaveLength(6)
  })

  it('chest nodes are not opened by default', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    for (const node of entities.filter(e => e.type === 'chestNode')) {
      expect(node.opened).toBe(false)
    }
  })

  it('chest node positions match zone layout', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    const nodes = entities.filter(e => e.type === 'chestNode')
    const layout = ZONE_LAYOUTS[0]
    for (let i = 0; i < layout.chests.length; i++) {
      expect(nodes[i].pos.x).toBe(layout.chests[i].x)
      expect(nodes[i].pos.y).toBe(layout.chests[i].y)
    }
  })
})
