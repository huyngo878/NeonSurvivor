import { META_UPGRADES } from '../metaUpgrades.js'
import { getPrestige, getMetaUpgrades, spendPrestige, setMetaUpgrade } from '../meta.js'

const TABS = [
  { label: 'PLAYER STATS', category: 'player',   color: '#00ffc8' },
  { label: 'XP & PROG',    category: 'xp',        color: '#ffd700' },
  { label: 'MODIFIERS',    category: 'modifier',  color: '#ff0080' },
]

const CARD_W = 270, CARD_H = 150, CARD_GAP = 18

const BACK_BTN = { x: 20, y: 16, w: 110, h: 38 }

export function drawMetaScreen(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

  const cx = canvas.clientWidth / 2
  const prestige = getPrestige()

  // --- Back button (top-left) ---
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 1
  ctx.fillRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h)
  ctx.strokeRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h)
  ctx.font = 'bold 16px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#aaa'
  ctx.fillText('◀ BACK', BACK_BTN.x + BACK_BTN.w / 2, BACK_BTN.y + BACK_BTN.h / 2 + 6)
  ctx.restore()

  // --- Header ---
  ctx.save()
  ctx.font = 'bold 42px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 20
  ctx.shadowColor = '#ffd700'
  ctx.fillStyle = '#ffd700'
  ctx.fillText('UPGRADES', cx, 48)
  ctx.restore()

  // --- Prestige balance (top-right) ---
  ctx.save()
  ctx.font = 'bold 22px monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`⬡ ${prestige}`, canvas.clientWidth - 24, 48)
  ctx.restore()

  // --- Tabs ---
  const tabW = 200, tabH = 42, tabGap = 8
  const tabsW = TABS.length * (tabW + tabGap) - tabGap
  const tabStartX = cx - tabsW / 2
  const tabY = 70
  gameState.metaTabRects = []

  TABS.forEach((tab, i) => {
    const x = tabStartX + i * (tabW + tabGap)
    const active = (gameState.metaTab || 0) === i
    ctx.save()
    ctx.fillStyle = active ? `${tab.color}20` : 'rgba(0,0,0,0.5)'
    ctx.strokeStyle = active ? tab.color : '#333'
    ctx.lineWidth = active ? 2 : 1
    if (active) { ctx.shadowBlur = 12; ctx.shadowColor = tab.color }
    ctx.fillRect(x, tabY, tabW, tabH)
    ctx.strokeRect(x, tabY, tabW, tabH)
    ctx.font = 'bold 15px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = active ? tab.color : '#555'
    ctx.shadowBlur = 0
    ctx.fillText(tab.label, x + tabW / 2, tabY + tabH / 2 + 6)
    ctx.restore()
    gameState.metaTabRects.push({ x, y: tabY, w: tabW, h: tabH })
  })

  // --- Cards (vertically centered in remaining space) ---
  const activeTab = TABS[gameState.metaTab || 0]
  const upgrades = META_UPGRADES.filter(u => u.category === activeTab.category)
  const owned = getMetaUpgrades()

  const gridW = upgrades.length * (CARD_W + CARD_GAP) - CARD_GAP
  const gridStartX = cx - gridW / 2
  const topOfCards = tabY + tabH + 24
  const bottomOfCards = canvas.clientHeight - 60
  const gridY = topOfCards + (bottomOfCards - topOfCards - CARD_H) / 2

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
    ctx.lineWidth = canAfford ? 2 : 1
    if (canAfford) { ctx.shadowBlur = 14; ctx.shadowColor = color }
    ctx.fillRect(x, gridY, CARD_W, CARD_H)
    ctx.strokeRect(x, gridY, CARD_W, CARD_H)

    // Label
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = maxed ? '#00ff88' : color
    ctx.shadowBlur = 0
    ctx.fillText(upgrade.label, x + CARD_W / 2, gridY + 28)

    // Tier pips
    const pipW = 20, pipH = 6, pipGap = 4
    const pipsW = maxTier * (pipW + pipGap) - pipGap
    const pipX = x + (CARD_W - pipsW) / 2
    for (let p = 0; p < maxTier; p++) {
      ctx.fillStyle = p < tier ? color : '#222'
      ctx.fillRect(pipX + p * (pipW + pipGap), gridY + 46, pipW, pipH)
    }
    ctx.font = '13px monospace'
    ctx.fillStyle = '#555'
    ctx.fillText(`${tier} / ${maxTier}`, x + CARD_W / 2, gridY + 72)

    // Desc
    ctx.font = '13px monospace'
    ctx.fillStyle = '#666'
    ctx.fillText(upgrade.desc, x + CARD_W / 2, gridY + 92)

    // Cost / maxed
    ctx.font = 'bold 17px monospace'
    if (maxed) {
      ctx.fillStyle = '#00ff88'
      ctx.fillText('MAXED', x + CARD_W / 2, gridY + 126)
    } else {
      ctx.fillStyle = canAfford ? '#ffd700' : '#444'
      ctx.fillText(`⬡ ${cost}`, x + CARD_W / 2, gridY + 126)
    }

    ctx.restore()
  })

  // --- ESC hint ---
  ctx.save()
  ctx.font = '14px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#333'
  ctx.fillText('[ESC] or [M] — Back to Menu', cx, canvas.clientHeight - 18)
  ctx.restore()
}

export function handleMetaClick(e, gameState) {
  const mx = e.clientX, my = e.clientY
  function hit(r) { return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h }

  // Back button
  if (hit(BACK_BTN)) {
    gameState.state = 'menu'
    return
  }

  // Tab clicks
  for (let i = 0; i < (gameState.metaTabRects || []).length; i++) {
    if (hit(gameState.metaTabRects[i])) {
      gameState.metaTab = i
      return
    }
  }

  // Card clicks — purchase
  for (const card of (gameState.metaCardRects || [])) {
    if (hit(card)) {
      if (!card.maxed && card.canAfford) {
        spendPrestige(card.cost)
        setMetaUpgrade(card.upgrade.id, card.tier + 1)
      }
      return
    }
  }
}
