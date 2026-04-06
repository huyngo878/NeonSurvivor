import { META_UPGRADES } from '../metaUpgrades.js'
import { getPrestige, getMetaUpgrades, spendPrestige, setMetaUpgrade } from '../meta.js'

const TABS = [
  { label: 'PLAYER STATS', category: 'player', color: '#00ffc8' },
  { label: 'XP & PROG',    category: 'xp',     color: '#ffd700' },
  { label: 'MODIFIERS',    category: 'modifier', color: '#ff0080' },
]

const CARD_W = 180, CARD_H = 100, CARD_GAP = 12

export function drawMetaScreen(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

  const cx = canvas.clientWidth / 2

  // Header
  ctx.save()
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 16
  ctx.shadowColor = '#ffd700'
  ctx.fillStyle = '#ffd700'
  ctx.fillText('UPGRADES', cx, 44)
  ctx.restore()

  // Prestige balance
  const prestige = getPrestige()
  ctx.save()
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`⬡ ${prestige}`, canvas.clientWidth - 20, 44)
  ctx.restore()

  // Tabs
  const tabW = 160, tabH = 28, tabGap = 6
  const tabStartX = cx - (TABS.length * (tabW + tabGap) - tabGap) / 2
  const tabY = 60
  gameState.metaTabRects = []

  TABS.forEach((tab, i) => {
    const x = tabStartX + i * (tabW + tabGap)
    const active = (gameState.metaTab || 0) === i
    ctx.save()
    ctx.fillStyle = active ? `${tab.color}20` : 'rgba(0,0,0,0.5)'
    ctx.strokeStyle = active ? tab.color : '#333'
    ctx.lineWidth = active ? 1.5 : 1
    if (active) { ctx.shadowBlur = 10; ctx.shadowColor = tab.color }
    ctx.fillRect(x, tabY, tabW, tabH)
    ctx.strokeRect(x, tabY, tabW, tabH)
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = active ? tab.color : '#555'
    ctx.shadowBlur = 0
    ctx.fillText(tab.label, x + tabW / 2, tabY + tabH / 2 + 4)
    ctx.restore()
    gameState.metaTabRects.push({ x, y: tabY, w: tabW, h: tabH })
  })

  // Cards
  const activeTab = TABS[gameState.metaTab || 0]
  const upgrades = META_UPGRADES.filter(u => u.category === activeTab.category)
  const owned = getMetaUpgrades()
  const gridStartX = cx - (upgrades.length * (CARD_W + CARD_GAP) - CARD_GAP) / 2
  const gridY = tabY + tabH + 20

  gameState.metaCardRects = []

  upgrades.forEach((upgrade, i) => {
    const tier = owned[upgrade.id] || 0
    const maxTier = upgrade.tiers.length
    const maxed = tier >= maxTier
    const cost = maxed ? 0 : upgrade.tiers[tier]
    const canAfford = !maxed && prestige >= cost
    const x = gridStartX + i * (CARD_W + CARD_GAP)
    const color = activeTab.color

    gameState.metaCardRects.push({ x, y: gridY, w: CARD_W, h: CARD_H, upgrade, tier, maxed, canAfford, cost })

    ctx.save()
    ctx.fillStyle = canAfford ? `${color}10` : 'rgba(0,0,0,0.6)'
    ctx.strokeStyle = maxed ? '#00ff8860' : canAfford ? color : '#333'
    ctx.lineWidth = canAfford ? 1.5 : 1
    if (canAfford) { ctx.shadowBlur = 10; ctx.shadowColor = color }
    ctx.fillRect(x, gridY, CARD_W, CARD_H)
    ctx.strokeRect(x, gridY, CARD_W, CARD_H)

    // Label
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = maxed ? '#00ff88' : color
    ctx.shadowBlur = 0
    ctx.fillText(upgrade.label, x + CARD_W / 2, gridY + 20)

    // Tier pips
    const pipW = 14, pipH = 4, pipGap = 3
    const pipsW = maxTier * (pipW + pipGap) - pipGap
    const pipX = x + (CARD_W - pipsW) / 2
    for (let p = 0; p < maxTier; p++) {
      ctx.fillStyle = p < tier ? color : '#222'
      ctx.fillRect(pipX + p * (pipW + pipGap), gridY + 32, pipW, pipH)
    }
    ctx.font = '9px monospace'
    ctx.fillStyle = '#555'
    ctx.fillText(`${tier} / ${maxTier}`, x + CARD_W / 2, gridY + 48)

    // Desc
    ctx.font = '9px monospace'
    ctx.fillStyle = '#666'
    ctx.fillText(upgrade.desc, x + CARD_W / 2, gridY + 62)

    // Cost / maxed
    ctx.font = 'bold 11px monospace'
    if (maxed) {
      ctx.fillStyle = '#00ff88'
      ctx.fillText('MAXED', x + CARD_W / 2, gridY + 82)
    } else {
      ctx.fillStyle = canAfford ? '#ffd700' : '#333'
      ctx.fillText(`⬡ ${cost}`, x + CARD_W / 2, gridY + 82)
    }

    ctx.restore()
  })

  // ESC hint
  ctx.save()
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#333'
  ctx.fillText('[ESC] or [M] — Back to Menu', cx, canvas.clientHeight - 16)
  ctx.restore()
}

export function handleMetaClick(e, gameState) {
  // Tab clicks
  for (let i = 0; i < (gameState.metaTabRects || []).length; i++) {
    const r = gameState.metaTabRects[i]
    if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
      gameState.metaTab = i
      return
    }
  }
  // Card clicks — purchase
  for (const card of (gameState.metaCardRects || [])) {
    if (e.clientX >= card.x && e.clientX <= card.x + card.w &&
        e.clientY >= card.y && e.clientY <= card.y + card.h) {
      if (!card.maxed && card.canAfford) {
        spendPrestige(card.cost)
        setMetaUpgrade(card.upgrade.id, card.tier + 1)
      }
      return
    }
  }
}
