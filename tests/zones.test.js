import { describe, it, expect } from 'vitest'
import { spawnZoneChests } from '../src/zones.js'
import { WORLD_W, WORLD_H } from '../src/constants.js'

describe('spawnZoneChests', () => {
  it('adds between 16 and 24 chestNode entities for zone 0 (13-19 regular + 3-5 sparkly)', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    const nodes = entities.filter(e => e.type === 'chestNode')
    expect(nodes.length).toBeGreaterThanOrEqual(16)
    expect(nodes.length).toBeLessThanOrEqual(24)
    const sparkly = nodes.filter(n => n.sparkly)
    expect(sparkly.length).toBeGreaterThanOrEqual(3)
    expect(sparkly.length).toBeLessThanOrEqual(5)
  })

  it('chest nodes are not opened by default', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    for (const node of entities.filter(e => e.type === 'chestNode')) {
      expect(node.opened).toBe(false)
    }
  })

  it('chest nodes are placed within map bounds', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    for (const node of entities.filter(e => e.type === 'chestNode')) {
      expect(node.pos.x).toBeGreaterThan(0)
      expect(node.pos.x).toBeLessThan(WORLD_W)
      expect(node.pos.y).toBeGreaterThan(0)
      expect(node.pos.y).toBeLessThan(WORLD_H)
    }
  })

  it('chest nodes are at least 600px from player start', () => {
    const entities = []
    const px = WORLD_W / 2
    const py = WORLD_H / 2
    spawnZoneChests(entities, 0, px, py)
    for (const node of entities.filter(e => e.type === 'chestNode')) {
      const dist = Math.hypot(node.pos.x - px, node.pos.y - py)
      expect(dist).toBeGreaterThanOrEqual(600)
    }
  })

  it('chest nodes are spaced at least 300px apart from each other', () => {
    const entities = []
    spawnZoneChests(entities, 0)
    const nodes = entities.filter(e => e.type === 'chestNode')
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].pos.x - nodes[j].pos.x, nodes[i].pos.y - nodes[j].pos.y)
        expect(dist).toBeGreaterThanOrEqual(300)
      }
    }
  })
})
