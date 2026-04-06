import { describe, it, expect } from 'vitest'
import { META_UPGRADES } from '../src/metaUpgrades.js'
import { createPlayer } from '../src/entities.js'

describe('META_UPGRADES', () => {
  it('every upgrade has required fields', () => {
    for (const u of META_UPGRADES) {
      expect(typeof u.id).toBe('string')
      expect(typeof u.label).toBe('string')
      expect(typeof u.desc).toBe('string')
      expect(['player', 'xp', 'modifier']).toContain(u.category)
      expect(Array.isArray(u.tiers)).toBe(true)
      expect(u.tiers.length).toBeGreaterThan(0)
      expect(typeof u.apply).toBe('function')
    }
  })

  it('all ids are unique', () => {
    const ids = META_UPGRADES.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('start_hp tier 1 adds 10 max HP', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'start_hp')
    upgrade.apply(player, 1)
    expect(player.maxHp).toBe(110)
    expect(player.hp).toBe(110)
  })

  it('start_hp tier 3 adds 30 max HP', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'start_hp')
    upgrade.apply(player, 3)
    expect(player.maxHp).toBe(130)
    expect(player.hp).toBe(130)
  })

  it('move_speed tier 1 adds 5% speed', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'move_speed')
    upgrade.apply(player, 1)
    expect(player.speed).toBeCloseTo(200 * 1.05, 5)
  })

  it('move_speed tier 3 adds 15% speed', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'move_speed')
    upgrade.apply(player, 3)
    expect(player.speed).toBeCloseTo(200 * 1.15, 5)
  })

  it('start_armor tier 2 adds 2 armor', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'start_armor')
    upgrade.apply(player, 2)
    expect(player.armor).toBe(2)
  })

  it('xp_mult tier 1 sets xpMult to 1.15', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'xp_mult')
    upgrade.apply(player, 1)
    expect(player.xpMult).toBeCloseTo(1.15, 5)
  })

  it('extra_choice tier 1 sets extraChoices to 1', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'extra_choice')
    upgrade.apply(player, 1)
    expect(player.extraChoices).toBe(1)
  })

  it('magnet_range tier 2 sets magnetBonus to 50', () => {
    const player = createPlayer()
    const upgrade = META_UPGRADES.find(u => u.id === 'magnet_range')
    upgrade.apply(player, 2)
    expect(player.magnetBonus).toBe(50)
  })
})
