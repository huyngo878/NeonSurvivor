import { describe, it, expect } from 'vitest'
import { pickUpgrades, UPGRADES } from '../src/upgrades.js'
import { createPlayer, createWeapon } from '../src/entities.js'

describe('UPGRADES', () => {
  it('every upgrade has required fields', () => {
    for (const u of UPGRADES) {
      expect(typeof u.id).toBe('string')
      expect(typeof u.label).toBe('string')
      expect(typeof u.desc).toBe('string')
      expect(['common', 'rare', 'epic']).toContain(u.rarity)
      expect(typeof u.icon).toBe('string')
      expect(typeof u.apply).toBe('function')
    }
  })

  it('all upgrade ids are unique', () => {
    const ids = UPGRADES.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('pickUpgrades', () => {
  it('returns at most n upgrades', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('whip')]
    const picks = pickUpgrades(player, 3)
    expect(picks.length).toBeLessThanOrEqual(3)
  })

  it('filters out requires-gated upgrades when weapon not owned', () => {
    const player = createPlayer()
    // player has no weapons — wand/whip specific upgrades should not appear
    const picks = pickUpgrades(player, 100)
    for (const p of picks) {
      expect(p.requires).toBeUndefined()
    }
  })

  it('filters out excludes-gated upgrades when weapon already owned', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('whip')]
    const picks = pickUpgrades(player, 100)
    for (const p of picks) {
      if (p.excludes === 'wand') throw new Error('get_wand should not appear when wand is owned')
      if (p.excludes === 'whip') throw new Error('get_whip should not appear when whip is owned')
    }
  })

  it('returns full eligible pool when pool is smaller than n', () => {
    const player = createPlayer()
    const picks = pickUpgrades(player, 100)
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.length).toBeLessThanOrEqual(UPGRADES.length)
  })

  it('does not return duplicate upgrades', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('whip')]
    const picks = pickUpgrades(player, 3)
    const ids = picks.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('applies speed upgrade correctly', () => {
    const player = createPlayer()
    const speedUpgrade = UPGRADES.find(u => u.id === 'speed_1')
    const before = player.speed
    speedUpgrade.apply(player)
    expect(player.speed).toBeCloseTo(before * 1.15, 5)
  })

  it('applies hp_up upgrade correctly', () => {
    const player = createPlayer()
    player.hp = 50
    const hpUpgrade = UPGRADES.find(u => u.id === 'hp_up')
    hpUpgrade.apply(player)
    expect(player.maxHp).toBe(125)
    expect(player.hp).toBe(75)
  })

  it('applies wand_dmg upgrade correctly', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const upgrade = UPGRADES.find(u => u.id === 'wand_dmg')
    upgrade.apply(player)
    expect(player.weapons[0].damage).toBe(30)
  })

  it('applies get_wand upgrade and adds wand weapon', () => {
    const player = createPlayer()
    const upgrade = UPGRADES.find(u => u.id === 'get_wand')
    upgrade.apply(player)
    expect(player.weapons.some(w => w.type === 'wand')).toBe(true)
  })
})
