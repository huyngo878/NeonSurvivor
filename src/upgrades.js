import { createWeapon } from './entities.js'

const WEIGHTS = { common: 50, uncommon: 30, rare: 15, epic: 5, legendary: 3 }

export const CARDS = [
  {
    id: 'heal_25',
    label: 'FIELD DRESSING',
    desc: 'Recover 25 HP instantly',
    rarity: 'common',
    icon: '+',
    apply: player => { player.hp = Math.min(player.maxHp, player.hp + 25) },
  },
  {
    id: 'armor_plating',
    label: 'ARMOR PLATING',
    desc: 'Reduce incoming damage by 2',
    rarity: 'rare',
    icon: '#',
    apply: player => { player.armor += 2 },
  },
  {
    id: 'max_hp',
    label: 'REINFORCED FRAME',
    desc: '+20 max HP and heal 20',
    rarity: 'common',
    icon: 'H',
    apply: player => {
      player.maxHp += 20
      player.hp = Math.min(player.maxHp, player.hp + 20)
    },
  },
  {
    id: 'speed_boost',
    label: 'OVERDRIVE',
    desc: '+10% move speed',
    rarity: 'common',
    icon: '>',
    apply: player => { player.speed *= 1.1 },
  },
  {
    id: 'wand_firerate',
    label: 'QUICKLOAD',
    desc: 'Wand fires 12% faster',
    rarity: 'common',
    requires: 'wand',
    icon: '↑',
    apply: player => {
      const w = _weapon(player, 'wand')
      w.cooldown = Math.max(0.15, w.cooldown * 0.88)
    },
  },
  {
    id: 'wand_range',
    label: 'LONG REACH',
    desc: 'Wand range +60',
    rarity: 'uncommon',
    requires: 'wand',
    icon: '→',
    apply: player => { _weapon(player, 'wand').range += 60 },
  },
  {
    id: 'whip_range',
    label: 'EXTENDED CHAIN',
    desc: 'Whip range +20',
    rarity: 'common',
    requires: 'whip',
    icon: '↔',
    apply: player => { _weapon(player, 'whip').range += 20 },
  },
  {
    id: 'unlock_wand',
    label: 'ARCANE CACHE',
    desc: 'Add the wand weapon to your loadout',
    rarity: 'epic',
    icon: 'W',
    excludes: 'wand',
    apply: player => { player.weapons.push(createWeapon('wand')) },
  },
  {
    id: 'unlock_whip',
    label: 'CHAIN CACHE',
    desc: 'Add the whip weapon to your loadout',
    rarity: 'epic',
    icon: 'H',
    excludes: 'whip',
    apply: player => { player.weapons.push(createWeapon('whip')) },
  },
  {
    id: 'unlock_rocket',
    label: 'ORDNANCE CACHE',
    desc: 'Add the rocket launcher to your loadout',
    rarity: 'epic',
    icon: 'R',
    excludes: 'rocket',
    apply: player => { player.weapons.push(createWeapon('rocket')) },
  },

  {
    id: 'wand_damage',
    label: 'ARCANE CHARGE',
    desc: 'Wand damage +10',
    rarity: 'common',
    requires: 'wand',
    icon: 'W',
    apply: player => { _weapon(player, 'wand').damage += 10 },
  },
  {
    id: 'wand_speed',
    label: 'QUICKSILVER ORBS',
    desc: 'Wand projectiles travel faster',
    rarity: 'common',
    requires: 'wand',
    icon: '>',
    apply: player => { _weapon(player, 'wand').projectileSpeed += 120 },
  },
  {
    id: 'wand_shots',
    label: 'TWIN CAST',
    desc: '+1 wand projectile per attack',
    rarity: 'rare',
    requires: 'wand',
    icon: '2',
    available: player => player.level >= 4,
    apply: player => { _weapon(player, 'wand').shots += 1 },
  },
  {
    id: 'wand_bounce',
    label: 'RICOCHET MATRIX',
    desc: '+1 bounce for wand projectiles, up to 5 total',
    rarity: 'epic',
    requires: 'wand',
    icon: 'B',
    available: player => player.level >= 6,
    apply: player => {
      const weapon = _weapon(player, 'wand')
      weapon.bounce = Math.min(5, weapon.bounce + 1)
    },
  },
  {
    id: 'wand_fork',
    label: 'SPLIT LATTICE',
    desc: '+1 fork generation for wand projectiles, up to 3 total',
    rarity: 'legendary',
    requires: 'wand',
    icon: 'Y',
    available: player => player.level >= 10 && _weapon(player, 'wand').forkCount < 3,
    apply: player => {
      const weapon = _weapon(player, 'wand')
      weapon.forkCount = Math.min(3, weapon.forkCount + 1)
    },
  },

  {
    id: 'whip_knockback',
    label: 'CHAIN SNAP',
    desc: 'Increase whip knockback',
    rarity: 'common',
    requires: 'whip',
    icon: 'K',
    apply: player => { _weapon(player, 'whip').knockback += 12 },
  },
  {
    id: 'whip_area',
    label: 'WIDE ARC',
    desc: 'Larger whip attack area',
    rarity: 'rare',
    requires: 'whip',
    icon: 'A',
    apply: player => {
      const weapon = _weapon(player, 'whip')
      weapon.sweepAngle = Math.min(2 * Math.PI, weapon.sweepAngle + Math.PI / 5)
      weapon.range += 18
    },
  },
  {
    id: 'whip_speed',
    label: 'BACKSWING',
    desc: 'Whip attacks faster',
    rarity: 'rare',
    requires: 'whip',
    icon: 'S',
    apply: player => {
      const weapon = _weapon(player, 'whip')
      weapon.cooldown = Math.max(0.25, weapon.cooldown * 0.82)
    },
  },
  {
    id: 'whip_damage',
    label: 'BARBED TIP',
    desc: 'Whip damage +8',
    rarity: 'common',
    requires: 'whip',
    icon: 'D',
    apply: player => { _weapon(player, 'whip').damage += 8 },
  },
  {
    id: 'whip_crit',
    label: 'BLOODLINE',
    desc: 'Small chance to deal double damage',
    rarity: 'epic',
    requires: 'whip',
    icon: '!',
    apply: player => { _weapon(player, 'whip').critChance += 0.12 },
  },

  {
    id: 'rocket_multi',
    label: 'SALVO BAY',
    desc: 'Fire 1 extra rocket each time the launcher shoots',
    rarity: 'rare',
    requires: 'rocket',
    icon: '2',
    apply: player => { _weapon(player, 'rocket').shots += 1 },
  },
  {
    id: 'rocket_radius',
    label: 'PRESSURE WAVE',
    desc: 'Increase blast radius',
    rarity: 'common',
    requires: 'rocket',
    icon: 'O',
    apply: player => { _weapon(player, 'rocket').aoeRadius += 20 },
  },
  {
    id: 'rocket_damage',
    label: 'HIGH EXPLOSIVE',
    desc: 'Rocket damage +20',
    rarity: 'common',
    requires: 'rocket',
    icon: 'X',
    apply: player => { _weapon(player, 'rocket').damage += 20 },
  },
  {
    id: 'rocket_double',
    label: 'AFTERSHOCK',
    desc: 'Double explosion on impact',
    rarity: 'epic',
    requires: 'rocket',
    icon: '*',
    apply: player => { _weapon(player, 'rocket').explosionCount = 2 },
  },
  {
    id: 'rocket_knockback',
    label: 'CONCUSSIVE PAYLOAD',
    desc: 'Explosion knocks enemies back',
    rarity: 'rare',
    requires: 'rocket',
    icon: '~',
    apply: player => { _weapon(player, 'rocket').knockback += 60 },
  },
  {
    id: 'rocket_fragments',
    label: 'CLUSTER CORE',
    desc: 'Chance to spawn explosive fragments on impact',
    rarity: 'legendary',
    requires: 'rocket',
    unique: true,
    icon: '%',
    apply: player => { _weapon(player, 'rocket').fragmentChance = 0.45 },
  },
  {
    id: 'rocket_firerate',
    label: 'RAPID RELOAD',
    desc: 'Rocket fires 15% faster',
    rarity: 'common',
    requires: 'rocket',
    icon: '↑',
    apply: player => {
      const w = _weapon(player, 'rocket')
      w.cooldown = Math.max(0.5, w.cooldown * 0.85)
    },
  },
  {
    id: 'rocket_speed',
    label: 'AFTERBURNER',
    desc: 'Rockets travel faster',
    rarity: 'common',
    requires: 'rocket',
    icon: '→',
    apply: player => { _weapon(player, 'rocket').projectileSpeed += 60 },
  },
  {
    id: 'rocket_center',
    label: 'SHAPED CHARGE',
    desc: 'Direct hits deal 50% bonus damage',
    rarity: 'uncommon',
    requires: 'rocket',
    icon: '◎',
    apply: player => { _weapon(player, 'rocket').centerDamageBonus += 0.5 },
  },
]

export function pickChestCards(player, n) {
  const eligible = CARDS.filter(card => {
    if (card.requires && !_weapon(player, card.requires)) return false
    if (card.excludes && _weapon(player, card.excludes)) return false
    if (card.unique && player.cardHistory?.includes(card.id)) return false
    if (card.available && !card.available(player)) return false
    return true
  })
  return _weightedSample(eligible, n)
}

function _weightedSample(pool, n) {
  const result = []
  const remaining = [...pool]
  while (result.length < n && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, card) => sum + WEIGHTS[card.rarity], 0)
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

function _weapon(player, type) {
  return player.weapons.find(weapon => weapon.type === type)
}
