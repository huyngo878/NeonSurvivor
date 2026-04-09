import { describe, it, expect } from 'vitest'
import { pickChestCards, pickSparklyCards, CARDS } from '../src/upgrades.js'
import { createPlayer, createWeapon } from '../src/entities.js'

describe('CARDS', () => {
  it('every card has required fields', () => {
    for (const card of CARDS) {
      expect(typeof card.id).toBe('string')
      expect(typeof card.label).toBe('string')
      expect(typeof card.desc).toBe('string')
      expect(['common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(card.rarity)
      expect(typeof card.icon).toBe('string')
      expect(typeof card.apply).toBe('function')
    }
  })

  it('all card ids are unique', () => {
    const ids = CARDS.map(card => card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('pickChestCards', () => {
  it('returns at most n cards', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const picks = pickChestCards(player, 3)
    expect(picks.length).toBeLessThanOrEqual(3)
  })

  it('filters out weapon-specific cards when weapon not owned', () => {
    const player = createPlayer()
    const picks = pickChestCards(player, 100)
    for (const pick of picks) {
      expect(pick.requires).toBeUndefined()
    }
  })

  it('offers weapon unlock cards only when that weapon is not already owned', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const picks = pickChestCards(player, 100)
    expect(picks.some(card => card.id === 'unlock_wand')).toBe(false)
    expect(picks.some(card => card.id === 'unlock_whip')).toBe(true)
    expect(picks.some(card => card.id === 'unlock_rocket')).toBe(true)
  })

  it('includes wand_shots, wand_bounce, wand_fork at any level', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.level = 1
    const picks = pickChestCards(player, 100)
    expect(picks.some(card => card.id === 'wand_shots')).toBe(true)
    expect(picks.some(card => card.id === 'wand_bounce')).toBe(true)
    expect(picks.some(card => card.id === 'wand_fork')).toBe(true)
  })

  it('does not return duplicate cards in one roll', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('rocket')]
    const picks = pickChestCards(player, 4)
    const ids = picks.map(card => card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('applies heal card correctly', () => {
    const player = createPlayer()
    player.hp = 50
    const card = CARDS.find(entry => entry.id === 'heal_25')
    card.apply(player)
    expect(player.hp).toBe(75)
  })

  it('applies rocket multi card correctly', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    const card = CARDS.find(entry => entry.id === 'rocket_multi')
    card.apply(player)
    expect(player.weapons[0].shots).toBe(2)
  })

  it('applies wand +1 projectile card correctly', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const card = CARDS.find(entry => entry.id === 'wand_shots')
    card.apply(player)
    expect(player.weapons[0].shots).toBe(2)
  })

  it('wand bounce card adds 1 bounce but caps at 5', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const card = CARDS.find(entry => entry.id === 'wand_bounce')
    for (let i = 0; i < 7; i++) card.apply(player)
    expect(player.weapons[0].bounce).toBe(5)
  })

  it('wand fork card adds 1 fork generation but caps at 3', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const card = CARDS.find(entry => entry.id === 'wand_fork')
    for (let i = 0; i < 5; i++) card.apply(player)
    expect(player.weapons[0].forkCount).toBe(3)
  })

  it('applies unlock weapon cards correctly', () => {
    const player = createPlayer()
    const card = CARDS.find(entry => entry.id === 'unlock_rocket')
    card.apply(player)
    expect(player.weapons.some(weapon => weapon.type === 'rocket')).toBe(true)
  })

  it('legendary unique card is unavailable once taken', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.weapons[0].forkCount = 3
    const picks = pickChestCards(player, 100)
    expect(picks.some(card => card.id === 'wand_fork')).toBe(false)
  })
})

describe('rocket stat cards', () => {
  it('rocket_firerate reduces rocket cooldown', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    const before = player.weapons[0].cooldown
    CARDS.find(c => c.id === 'rocket_firerate').apply(player)
    expect(player.weapons[0].cooldown).toBeLessThan(before)
  })

  it('rocket_speed increases rocket projectileSpeed', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    const before = player.weapons[0].projectileSpeed
    CARDS.find(c => c.id === 'rocket_speed').apply(player)
    expect(player.weapons[0].projectileSpeed).toBeGreaterThan(before)
  })

  it('rocket_center increases centerDamageBonus', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('rocket')]
    expect(player.weapons[0].centerDamageBonus).toBe(0)
    CARDS.find(c => c.id === 'rocket_center').apply(player)
    expect(player.weapons[0].centerDamageBonus).toBeGreaterThan(0)
  })
})

describe('shockwave and circular cards', () => {
  it('whip_circular sets sweepAngle to 2*PI', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    CARDS.find(c => c.id === 'whip_circular').apply(player)
    expect(player.weapons[0].sweepAngle).toBeCloseTo(Math.PI * 2)
  })
})

describe('bleed card', () => {
  it('whip_bleed sets bleedOnHit=true and bleedDps > 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    CARDS.find(c => c.id === 'whip_bleed').apply(player)
    expect(player.weapons[0].bleedOnHit).toBe(true)
    expect(player.weapons[0].bleedDps).toBeGreaterThan(0)
  })
})

describe('homing cards', () => {
  it('wand_homing sets weapon.homing > 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    expect(player.weapons[0].homing).toBe(0)
    CARDS.find(c => c.id === 'wand_homing').apply(player)
    expect(player.weapons[0].homing).toBeGreaterThan(0)
  })

  it('wand_strong_homing not available without wand_homing', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.level = 10
    const picks = pickChestCards(player, 100)
    expect(picks.some(c => c.id === 'wand_strong_homing')).toBe(false)
  })
})

describe('wand explode card', () => {
  it('wand_explode sets explodeOnImpact=true and explodeRadius > 0', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    CARDS.find(c => c.id === 'wand_explode').apply(player)
    expect(player.weapons[0].explodeOnImpact).toBe(true)
    expect(player.weapons[0].explodeRadius).toBeGreaterThan(0)
  })
})

describe('new stat cards', () => {
  it('wand_slow sets weapon.slowOnHit to true', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    expect(player.weapons[0].slowOnHit).toBe(false)
    CARDS.find(c => c.id === 'wand_slow').apply(player)
    expect(player.weapons[0].slowOnHit).toBe(true)
  })

  it('whip_slow sets weapon.slowOnHit to true', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    CARDS.find(c => c.id === 'whip_slow').apply(player)
    expect(player.weapons[0].slowOnHit).toBe(true)
  })

  it('wand_firerate reduces wand cooldown', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const before = player.weapons[0].cooldown
    CARDS.find(c => c.id === 'wand_firerate').apply(player)
    expect(player.weapons[0].cooldown).toBeLessThan(before)
    expect(player.weapons[0].cooldown).toBeGreaterThan(0)
  })

  it('wand_range increases wand range', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    const before = player.weapons[0].range
    CARDS.find(c => c.id === 'wand_range').apply(player)
    expect(player.weapons[0].range).toBeGreaterThan(before)
  })

  it('whip_range increases whip range', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    const before = player.weapons[0].range
    CARDS.find(c => c.id === 'whip_range').apply(player)
    expect(player.weapons[0].range).toBeGreaterThan(before)
  })

  it('wand_pierce adds 1 to pierceCount', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    expect(player.weapons[0].pierceCount).toBe(0)
    CARDS.find(c => c.id === 'wand_pierce').apply(player)
    expect(player.weapons[0].pierceCount).toBe(1)
  })
})

describe('legendaryUnique lock (disabled)', () => {
  it('legendaryUnique wand cards still appear even when one is already taken', () => {
    // Filter is temporarily disabled — all legendaryUnique cards should be offered
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.uniqueWeapons = { wand: 'wand_arcane_overload' }
    const picks = pickChestCards(player, 100)
    const legendaryWandIds = ['wand_arcane_overload', 'wand_echo', 'wand_chain_beam']
    const anyPresent = legendaryWandIds.some(id => picks.some(c => c.id === id))
    expect(anyPresent).toBe(true)
  })

  it('legendaryUnique for one weapon does not block uniques for another weapon', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand'), createWeapon('rocket')]
    player.uniqueWeapons = { wand: 'wand_arcane_overload' }
    const picks = pickChestCards(player, 100)
    expect(picks.some(c => c.id === 'rocket_inferno')).toBe(true)
  })
})

describe('whip phantom strikes', () => {
  it('whip_phantom sets weapon.phantom to true', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    CARDS.find(c => c.id === 'whip_phantom').apply(player)
    expect(player.weapons[0].phantom).toBe(true)
  })

  it('whip_damage_pct increases whip damage by 20%', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('whip')]
    const before = player.weapons[0].damage
    CARDS.find(c => c.id === 'whip_damage_pct').apply(player)
    expect(player.weapons[0].damage).toBeCloseTo(before * 1.2, 0)
  })
})
