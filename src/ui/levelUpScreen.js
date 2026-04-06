const RARITY_COLORS = { common: '#888888', rare: '#00ffc8', epic: '#ffd700' }
const CARD_W = 180
const CARD_H = 220
const CARD_GAP = 24

export function drawLevelUpScreen(ctx, canvas, player, gameState) {
  const choices = gameState.upgradeChoices || []

  // Dark overlay
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  // Title
  ctx.save()
  ctx.font = 'bold 40px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#ffd700'
  ctx.fillStyle = '#ffd700'
  ctx.fillText('LEVEL UP!', cx, cy - 130)
  ctx.font = '16px monospace'
  ctx.shadowBlur = 10
  ctx.fillStyle = 'rgba(255,215,0,0.6)'
  ctx.fillText(`Level ${player.level}`, cx, cy - 100)
  ctx.restore()

  // Cards
  const totalW = choices.length * CARD_W + (choices.length - 1) * CARD_GAP
  const startX = cx - totalW / 2

  gameState.cardRects = []

  choices.forEach((upgrade, i) => {
    const x = startX + i * (CARD_W + CARD_GAP)
    const y = cy - 80
    const color = RARITY_COLORS[upgrade.rarity]
    const isEpic = upgrade.rarity === 'epic'
    const isRare = upgrade.rarity === 'rare'

    gameState.cardRects.push({ x, y, w: CARD_W, h: CARD_H })

    ctx.save()
    // Card background
    ctx.fillStyle = 'rgba(10,10,20,0.95)'
    ctx.strokeStyle = color
    ctx.lineWidth = isEpic ? 2 : 1
    if (isEpic || isRare) {
      ctx.shadowBlur = isEpic ? 24 : 12
      ctx.shadowColor = color
    }
    ctx.beginPath()
    ctx.roundRect(x, y, CARD_W, CARD_H, 6)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.save()
    // Icon
    ctx.font = '36px serif'
    ctx.textAlign = 'center'
    ctx.fillText(upgrade.icon, x + CARD_W / 2, y + 52)

    // Hotkey number
    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText(`[${i + 1}]`, x + CARD_W / 2, y + 20)

    // Label
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = color
    ctx.shadowBlur = isEpic || isRare ? 8 : 0
    ctx.shadowColor = color
    ctx.fillText(upgrade.label, x + CARD_W / 2, y + 90)

    // Description
    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.shadowBlur = 0
    // Word-wrap description to fit card width
    _wrapText(ctx, upgrade.desc, x + CARD_W / 2, y + 115, CARD_W - 20, 16)

    // Rarity badge
    ctx.font = 'bold 9px monospace'
    ctx.fillStyle = color
    ctx.shadowBlur = 0
    ctx.fillText(upgrade.rarity.toUpperCase(), x + CARD_W / 2, y + CARD_H - 14)

    ctx.restore()
  })

  // Hint
  ctx.save()
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillText('Press 1 · 2 · 3 or click a card', cx, cy + 160)
  ctx.restore()
}

function _wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, y)
      line = word
      y += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, cx, y)
}
