import { createWeapon } from './entities.js'

const WEIGHTS = { common: 32, uncommon: 28, rare: 22, epic: 12, legendary: 6 }

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
    id: 'wand_pierce',
    label: 'PHASE SHOT',
    desc: 'Wand projectiles pierce 1 additional enemy',
    rarity: 'uncommon',
    requires: 'wand',
    icon: '→',
    apply: player => { _weapon(player, 'wand').pierceCount += 1 },
  },
  {
    id: 'wand_slow',
    label: 'CRYO ORBS',
    desc: 'Wand projectiles slow enemies for 1.5s',
    rarity: 'uncommon',
    requires: 'wand',
    icon: '*',
    unique: true,
    apply: player => { _weapon(player, 'wand').slowOnHit = true },
  },
  {
    id: 'wand_shots',
    label: 'TWIN CAST',
    desc: '+1 wand projectile per attack',
    rarity: 'common',
    requires: 'wand',
    icon: '2',
    apply: player => { _weapon(player, 'wand').shots += 1 },
  },
  {
    id: 'wand_bounce',
    label: 'RICOCHET MATRIX',
    desc: '+1 bounce for wand projectiles, up to 5 total',
    rarity: 'epic',
    requires: 'wand',
    icon: 'B',
    available: player => _weapon(player, 'wand').bounce < 5,
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
    available: player => _weapon(player, 'wand').forkCount < 3,
    apply: player => {
      const weapon = _weapon(player, 'wand')
      weapon.forkCount = Math.min(3, weapon.forkCount + 1)
    },
  },
  {
    id: 'wand_homing',
    label: 'SEEKER CORE',
    desc: 'Wand projectiles home toward enemies',
    rarity: 'uncommon',
    requires: 'wand',
    icon: '⟳',
    unique: true,
    apply: player => { _weapon(player, 'wand').homing = 2 },
  },
  {
    id: 'wand_multicast',
    label: 'ECHO SHOT',
    desc: '30% chance each wand shot fires a bonus free projectile',
    rarity: 'rare',
    requires: 'wand',
    icon: '«',
    unique: true,
    apply: player => { _weapon(player, 'wand').multicastChance = 0.3 },
  },
  {
    id: 'wand_arcane_overload',
    label: 'ARCANE OVERLOAD',
    desc: 'Every 5th wand shot fires a devastating empowered blast',
    rarity: 'legendary',
    legendaryUnique: 'wand',
    requires: 'wand',
    icon: '★',
    apply: player => {
      const w = _weapon(player, 'wand')
      w.overloadActive = true
      w.overloadCounter = 0
    },
  },
  {
    id: 'wand_echo',
    label: 'ECHO WAND',
    desc: 'Each wand projectile fires a ghost copy 0.6s later on the same path',
    rarity: 'legendary',
    legendaryUnique: 'wand',
    requires: 'wand',
    icon: '↩',
    apply: player => { _weapon(player, 'wand').echo = true },
  },
  {
    id: 'wand_chain_beam',
    label: 'CHAIN BEAM',
    desc: 'Wand projectiles chain to 3 nearby enemies on hit, dealing 70% reduced damage per hop',
    rarity: 'legendary',
    legendaryUnique: 'wand',
    requires: 'wand',
    icon: '⚡',
    apply: player => { _weapon(player, 'wand').chainBeam = 3 },
  },
  {
    id: 'wand_crit',
    label: 'ARCANE FOCUS',
    desc: '+15% crit chance (crits deal 2× damage)',
    rarity: 'epic',
    requires: 'wand',
    icon: '!',
    apply: player => {
      const w = _weapon(player, 'wand')
      w.critChance = Math.min(0.6, (w.critChance || 0) + 0.15)
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
    id: 'whip_slow',
    label: 'WEIGHTED CHAIN',
    desc: 'Whip slows enemies for 1.5s on hit',
    rarity: 'uncommon',
    requires: 'whip',
    icon: '*',
    unique: true,
    apply: player => { _weapon(player, 'whip').slowOnHit = true },
  },
  {
    id: 'whip_shockwave',
    label: 'IMPACT PULSE',
    desc: 'Whip hits emit a shockwave that staggers nearby enemies',
    rarity: 'rare',
    requires: 'whip',
    icon: '◎',
    unique: true,
    apply: player => { _weapon(player, 'whip').shockwaveOnHit = true },
  },
  {
    id: 'whip_circular',
    label: 'DEATH SPIN',
    desc: 'Whip sweeps in a full 360° circle',
    rarity: 'epic',
    requires: 'whip',
    icon: '↺',
    unique: true,
    apply: player => {
      const w = _weapon(player, 'whip')
      w.sweepAngle = Math.PI * 2
      w.range = Math.max(w.range, 150)
    },
  },
  {
    id: 'whip_bleed',
    label: 'BARBED WIRE',
    desc: 'Whip applies 5 damage/sec bleed for 3s',
    rarity: 'uncommon',
    requires: 'whip',
    icon: '~',
    apply: player => {
      const w = _weapon(player, 'whip')
      w.bleedOnHit = true
      w.bleedDps = (w.bleedDps || 0) + 5
    },
  },
  {
    id: 'whip_time_echo',
    label: 'TIME ECHO',
    desc: 'Each whip swing repeats as a ghost strike 0.75s later for 80% damage',
    rarity: 'legendary',
    legendaryUnique: 'whip',
    requires: 'whip',
    icon: '⏳',
    apply: player => { _weapon(player, 'whip').echo = true },
  },
  {
    id: 'whip_chain_lightning',
    label: 'CHAIN LIGHTNING',
    desc: 'Whip hits arc chain lightning to 2 nearby enemies for 50% damage',
    rarity: 'legendary',
    legendaryUnique: 'whip',
    requires: 'whip',
    icon: '⚡',
    apply: player => { _weapon(player, 'whip').chainLightning = 2 },
  },
  {
    id: 'wand_explode',
    label: 'ARCANE BURST',
    desc: 'Wand projectiles explode on impact for bonus AoE damage',
    rarity: 'epic',
    requires: 'wand',
    icon: '*',
    unique: true,
    apply: player => {
      const w = _weapon(player, 'wand')
      w.explodeOnImpact = true
      w.explodeRadius = 70
    },
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

const SPARKLY_WEIGHTS = { epic: 70, legendary: 30 }

export function pickSparklyCards(player, n) {
  const eligible = CARDS.filter(card => {
    if (card.rarity !== 'epic' && card.rarity !== 'legendary') return false
    if (card.requires && !_weapon(player, card.requires)) return false
    if (card.excludes && _weapon(player, card.excludes)) return false
    if (card.unique && player.cardHistory?.includes(card.id)) return false
    if (card.available && !card.available(player)) return false
    if (card.legendaryUnique && player.uniqueWeapons?.[card.legendaryUnique]) return false
    return true
  })
  return _weightedSample(eligible, n, SPARKLY_WEIGHTS)
}

export function pickChestCards(player, n) {
  const eligible = CARDS.filter(card => {
    if (card.requires && !_weapon(player, card.requires)) return false
    if (card.excludes && _weapon(player, card.excludes)) return false
    if (card.unique && player.cardHistory?.includes(card.id)) return false
    if (card.available && !card.available(player)) return false
    if (card.legendaryUnique && player.uniqueWeapons?.[card.legendaryUnique]) return false
    return true
  })
  return _weightedSample(eligible, n)
}

function _weightedSample(pool, n, weights = WEIGHTS) {
  const result = []
  const remaining = [...pool]
  while (result.length < n && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, card) => sum + weights[card.rarity], 0)
    let r = Math.random() * totalWeight
    for (let i = 0; i < remaining.length; i++) {
      r -= weights[remaining[i].rarity]
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
