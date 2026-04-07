export const META_UPGRADES = [
  // --- Player Stats ---
  {
    id: 'start_hp', label: 'START HP', desc: '+10 max HP per tier',
    category: 'player',
    tiers: [50, 100, 150, 200, 300],
    apply: (player, tier) => {
      player.maxHp += tier * 10
      player.hp = player.maxHp
    },
  },
  {
    id: 'move_speed', label: 'MOVE SPEED', desc: '+5% speed per tier',
    category: 'player',
    tiers: [30, 60, 100, 150, 200],
    apply: (player, tier) => {
      player.speed *= (1 + tier * 0.05)
    },
  },
  {
    id: 'start_armor', label: 'ARMOR', desc: '+1 armor per tier',
    category: 'player',
    tiers: [80, 160, 300],
    apply: (player, tier) => {
      player.armor += tier
    },
  },

  // --- XP & Progression ---
  {
    id: 'xp_mult', label: 'XP GAIN', desc: '+15% XP per tier',
    category: 'xp',
    tiers: [50, 100, 200, 350, 500],
    apply: (player, tier) => {
      player.xpMult = 1 + tier * 0.15
    },
  },
  {
    id: 'extra_choice', label: 'MORE CHOICES', desc: '+1 upgrade card per tier',
    category: 'xp',
    tiers: [200, 500],
    apply: (player, tier) => {
      player.extraChoices = tier
    },
  },

  // --- Game Modifiers ---
  {
    id: 'magnet_range', label: 'GEM MAGNET', desc: '+25px pickup radius per tier',
    category: 'modifier',
    tiers: [60, 120, 250],
    apply: (player, tier) => {
      player.magnetBonus = tier * 25
    },
  },
  {
    id: 'spawn_delay', label: 'BREATHE', desc: '+8% slower spawns per tier',
    category: 'modifier',
    tiers: [75, 150, 300],
    apply: (player, tier) => {
      player.spawnDelayBonus = tier * 0.08
    },
  },
  {
    id: 'drop_rate', label: 'HEADSTART', desc: '+10 starting gold per tier',
    category: 'modifier',
    tiers: [60, 120, 200],
    apply: (player, tier) => {
      player.money = (player.money || 0) + tier * 10
    },
  },
]
