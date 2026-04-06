import { createWeapon } from './entities.js'

const WEIGHTS = { common: 60, rare: 30, epic: 10 }

export const UPGRADES = [
  // Player stats
  {
    id: 'speed_1', label: 'SPEED BOOST', desc: '+15% move speed',
    rarity: 'common', icon: '⚡',
    apply: (p) => { p.speed *= 1.15 },
  },
  {
    id: 'hp_up', label: 'HP BOOST', desc: '+25 max HP, heal +25',
    rarity: 'common', icon: '❤️',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp) },
  },
  {
    id: 'hp_regen', label: 'REGEN', desc: '+1 HP/sec regen',
    rarity: 'rare', icon: '💚',
    apply: (p) => { p.regenRate += 1 },
  },

  // Wand upgrades
  {
    id: 'wand_dmg', label: 'WAND POWER', desc: '+10 wand damage',
    rarity: 'common', icon: '🔮', requires: 'wand',
    apply: (p) => { p.weapons.find(w => w.type === 'wand').damage += 10 },
  },
  {
    id: 'wand_cd', label: 'RAPID FIRE', desc: 'Wand fires 20% faster',
    rarity: 'rare', icon: '💨', requires: 'wand',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'wand')
      w.cooldown = Math.max(0.2, w.cooldown * 0.8)
    },
  },
  {
    id: 'wand_shots', label: 'MULTISHOT', desc: '+1 wand projectile',
    rarity: 'rare', icon: '✦', requires: 'wand',
    apply: (p) => { p.weapons.find(w => w.type === 'wand').shots += 1 },
  },

  // Whip upgrades
  {
    id: 'whip_dmg', label: 'WHIP POWER', desc: '+8 whip damage',
    rarity: 'common', icon: '🌀', requires: 'whip',
    apply: (p) => { p.weapons.find(w => w.type === 'whip').damage += 8 },
  },
  {
    id: 'whip_cd', label: 'WHIP SPEED', desc: 'Whip swings 20% faster',
    rarity: 'rare', icon: '⚔️', requires: 'whip',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'whip')
      w.cooldown = Math.max(0.15, w.cooldown * 0.8)
    },
  },
  {
    id: 'whip_arc', label: 'WIDER ARC', desc: '+30° whip sweep',
    rarity: 'rare', icon: '🔱', requires: 'whip',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'whip')
      w.sweepAngle = Math.min(2 * Math.PI, w.sweepAngle + Math.PI / 6)
    },
  },

  // New weapons
  {
    id: 'get_wand', label: 'MAGIC WAND', desc: 'Add the wand weapon',
    rarity: 'epic', icon: '✨', excludes: 'wand',
    apply: (p) => { p.weapons.push(createWeapon('wand')) },
  },
  {
    id: 'get_whip', label: 'WHIP', desc: 'Add the whip weapon',
    rarity: 'epic', icon: '🔱', excludes: 'whip',
    apply: (p) => { p.weapons.push(createWeapon('whip')) },
  },

  // Rocket upgrades
  {
    id: 'rocket_dmg', label: 'ROCKET POWER', desc: '+15 rocket damage',
    rarity: 'common', icon: '💥', requires: 'rocket',
    apply: (p) => { p.weapons.find(w => w.type === 'rocket').damage += 15 },
  },
  {
    id: 'rocket_aoe', label: 'BIGGER BLAST', desc: '+20 explosion radius',
    rarity: 'rare', icon: '🔥', requires: 'rocket',
    apply: (p) => { p.weapons.find(w => w.type === 'rocket').aoeRadius += 20 },
  },
  {
    id: 'rocket_cd', label: 'RAPID ROCKETS', desc: 'Rocket fires 15% faster',
    rarity: 'rare', icon: '🚀', requires: 'rocket',
    apply: (p) => {
      const w = p.weapons.find(w => w.type === 'rocket')
      w.cooldown = Math.max(0.8, w.cooldown * 0.85)
    },
  },
  {
    id: 'get_rocket', label: 'ROCKET LAUNCHER', desc: 'Add the rocket weapon',
    rarity: 'epic', icon: '🚀', excludes: 'rocket',
    apply: (p) => { p.weapons.push(createWeapon('rocket')) },
  },
]

export function pickUpgrades(player, n) {
  const eligible = UPGRADES.filter(u => {
    if (u.requires && !player.weapons.some(w => w.type === u.requires)) return false
    if (u.excludes && player.weapons.some(w => w.type === u.excludes)) return false
    return true
  })
  return _weightedSample(eligible, n)
}

function _weightedSample(pool, n) {
  const result = []
  const remaining = [...pool]
  while (result.length < n && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, u) => sum + WEIGHTS[u.rarity], 0)
    let r = Math.random() * totalWeight
    for (let i = 0; i < remaining.length; i++) {
      r -= WEIGHTS[remaining[i].rarity]
      if (r <= 0) {
        result.push(remaining[i])
        remaining.splice(i, 1)
        break
      }
    }
  }
  return result
}
