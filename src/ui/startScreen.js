export function drawStartScreen(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  // Title
  ctx.save()
  ctx.font = 'bold 52px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText('NEON SURVIVE', cx, cy - 120)
  ctx.restore()

  // Subtitle
  ctx.save()
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,255,200,0.5)'
  ctx.fillText('Choose your starting weapon', cx, cy - 75)
  ctx.restore()

  const cardW = 200, cardH = 160, gap = 40
  const totalW = cardW * 2 + gap
  const startX = cx - totalW / 2

  const weapons = [
    {
      type: 'wand',
      label: 'MAGIC WAND',
      color: '#00ffc8',
      stats: 'Cooldown: 0.8s\nDamage: 20\nRange: 400px',
      desc: 'Ranged — fires at nearest enemy',
    },
    {
      type: 'whip',
      label: 'WHIP',
      color: '#ffd700',
      stats: 'Cooldown: 0.6s\nDamage: 15\nRange: 120px',
      desc: 'Melee — 180° arc sweep',
    },
  ]

  gameState.weaponRects = []
  weapons.forEach((w, i) => {
    const x = startX + i * (cardW + gap)
    const y = cy - 40
    const selected = gameState.selectedWeapon === w.type
    gameState.weaponRects.push({ x, y, w: cardW, h: cardH, type: w.type })

    ctx.save()
    ctx.fillStyle = selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'
    ctx.strokeStyle = w.color
    ctx.lineWidth = selected ? 2 : 1
    ctx.globalAlpha = selected ? 1 : 0.45
    if (selected) {
      ctx.shadowBlur = 20
      ctx.shadowColor = w.color
    }
    ctx.beginPath()
    ctx.roundRect(x, y, cardW, cardH, 6)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = selected ? 1 : 0.45
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = w.color
    ctx.shadowBlur = selected ? 10 : 0
    ctx.shadowColor = w.color
    ctx.fillText(w.label, x + cardW / 2, y + 30)

    ctx.font = '12px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.shadowBlur = 0
    w.stats.split('\n').forEach((line, li) => {
      ctx.fillText(line, x + cardW / 2, y + 60 + li * 18)
    })

    ctx.font = '11px monospace'
    ctx.fillStyle = w.color
    ctx.globalAlpha = (selected ? 1 : 0.45) * 0.7
    ctx.fillText(w.desc, x + cardW / 2, y + 135)

    ctx.restore()
  })

  // Controls hint
  ctx.save()
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,255,200,0.4)'
  ctx.fillText('Click to select   ·   ENTER or SPACE to start', cx, cy + 145)
  ctx.restore()
}
