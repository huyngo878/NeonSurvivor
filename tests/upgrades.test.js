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

  it('legendary unique card is unavailable once taken', () => {
    const player = createPlayer()
    player.weapons = [createWeapon('wand')]
    player.cardHistory = ['wand_fork']
    const picks = pickChestCards(player, 100)
    expect(picks.some(card => card.id === 'wand_fork')).toBe(false)
  })
})
