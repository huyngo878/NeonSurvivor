import { describe, it, expect } from 'vitest'
import { pickChestCards, CARDS } from '../src/upgrades.js'
import { createPlayer, createWeapon } from '../src/entities.js'

describe('CARDS', () => {
  it('every card has required fields', () => {
    for (const card of CARDS) {
      expect(typeof card.id).toBe('string')
      expect(typeof card.label).toBe('string')
      expect(typeof card.desc).toBe('string')
      expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity)
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

  it('includes the wand +1 projectile card in wand chest rolls', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.level = 4
    const picks = pickChestCards(player, 100)
    expect(picks.some(card => card.id === 'wand_shots')).toBe(true)
  })

  it('gates wand spike cards behind later levels', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.level = 1
    const earlyPicks = pickChestCards(player, 100)
    expect(earlyPicks.some(card => card.id === 'wand_shots')).toBe(false)
    expect(earlyPicks.some(card => card.id === 'wand_bounce')).toBe(false)
    expect(earlyPicks.some(card => card.id === 'wand_fork')).toBe(false)

    player.level = 10
    const latePicks = pickChestCards(player, 100)
    expect(latePicks.some(card => card.id === 'wand_shots')).toBe(true)
    expect(latePicks.some(card => card.id === 'wand_bounce')).toBe(true)
    expect(latePicks.some(card => card.id === 'wand_fork')).toBe(true)
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
