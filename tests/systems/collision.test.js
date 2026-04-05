import { describe, it, expect } from 'vitest'
import { createSpatialHash, shInsert, shQuery } from '../../src/systems/collision.js'

describe('spatial hash', () => {
  it('query returns entity inserted in same cell', () => {
    const hash = createSpatialHash()
    const entity = { pos: { x: 10, y: 10 } }
    shInsert(hash, entity)
    const results = shQuery(hash, 10, 10, 5)
    expect(results).toContain(entity)
  })

  it('query returns entity from a neighboring cell', () => {
    const hash = createSpatialHash()
    // entity at pos (63, 10) falls in cell (0, 0) with CELL_SIZE=64
    const entity = { pos: { x: 63, y: 10 } }
    shInsert(hash, entity)
    // query from (65, 10) — cell (1, 0) — with radius 5 should reach cell (0, 0)
    const results = shQuery(hash, 65, 10, 5)
    expect(results).toContain(entity)
  })

  it('returns empty array when hash is empty', () => {
    const hash = createSpatialHash()
    expect(shQuery(hash, 100, 100, 50)).toEqual([])
  })

  it('multiple entities in same cell are all returned', () => {
    const hash = createSpatialHash()
    const a = { pos: { x: 10, y: 10 } }
    const b = { pos: { x: 15, y: 15 } }
    shInsert(hash, a)
    shInsert(hash, b)
    const results = shQuery(hash, 10, 10, 5)
    expect(results).toContain(a)
    expect(results).toContain(b)
  })
})
