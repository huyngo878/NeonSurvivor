// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveRun, loadRuns, loadBest, getPrestige, spendPrestige,
  getMetaUpgrades, calcPrestige, _reset
} from '../src/meta.js'

beforeEach(() => {
  _reset()  // clears in-memory state between tests
})

describe('calcPrestige', () => {
  it('calculates prestige linearly from kills', () => {
    expect(calcPrestige(87, 272, 6)).toBe(Math.floor(87 / 4))
  })

  it('returns 0 for zero kills', () => {
    expect(calcPrestige(0, 120, 3)).toBe(0)
  })
})

describe('saveRun', () => {
  it('saves a run and loadRuns returns it', () => {
    const run = { timeSecs: 272, kills: 87, level: 6, weapons: ['wand'], upgrades: [], prestige: 124 }
    saveRun(run)
    const runs = loadRuns()
    expect(runs).toHaveLength(1)
    expect(runs[0].kills).toBe(87)
    expect(typeof runs[0].timestamp).toBe('string')
  })

  it('caps stored runs at 50', () => {
    for (let i = 0; i < 55; i++) {
      saveRun({ timeSecs: i, kills: i, level: 1, weapons: [], upgrades: [], prestige: i })
    }
    expect(loadRuns()).toHaveLength(50)
  })

  it('stores newest run first', () => {
    saveRun({ timeSecs: 100, kills: 10, level: 1, weapons: [], upgrades: [], prestige: 10 })
    saveRun({ timeSecs: 200, kills: 20, level: 2, weapons: [], upgrades: [], prestige: 20 })
    expect(loadRuns()[0].kills).toBe(20)
  })

  it('adds prestige to balance on saveRun', () => {
    saveRun({ timeSecs: 100, kills: 10, level: 1, weapons: [], upgrades: [], prestige: 50 })
    expect(getPrestige()).toBe(50)
  })
})

describe('loadBest', () => {
  it('returns null when no runs saved', () => {
    expect(loadBest()).toBeNull()
  })

  it('tracks best time, kills, level independently', () => {
    saveRun({ timeSecs: 400, kills: 50, level: 3, weapons: [], upgrades: [], prestige: 0 })
    saveRun({ timeSecs: 200, kills: 100, level: 5, weapons: [], upgrades: [], prestige: 0 })
    const best = loadBest()
    expect(best.timeSecs).toBe(400)   // longer = better
    expect(best.kills).toBe(100)
    expect(best.level).toBe(5)
  })
})

describe('spendPrestige', () => {
  it('deducts prestige from balance', () => {
    saveRun({ timeSecs: 100, kills: 10, level: 1, weapons: [], upgrades: [], prestige: 100 })
    spendPrestige(40)
    expect(getPrestige()).toBe(60)
  })

  it('throws when insufficient balance', () => {
    expect(() => spendPrestige(100)).toThrow('Insufficient prestige')
  })
})

describe('getMetaUpgrades', () => {
  it('returns empty object when nothing purchased', () => {
    expect(getMetaUpgrades()).toEqual({})
  })
})
