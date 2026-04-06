export function drawStartScreen(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

  const cx = canvas.clientWidth / 2
  const cy = canvas.clientHeight / 2

  ctx.save()
  ctx.font = 'bold 52px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText('NEON SURVIVE', cx, cy - 150)
  ctx.restore()

  ctx.save()
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,255,200,0.5)'
  ctx.fillText('Choose your starting weapon', cx, cy - 110)
  ctx.restore()

  const cardW = 190
  const cardH = 175
  const gap = 30
  const weapons = [
    {
      type: 'wand',
      label: 'MAGIC WAND',
      color: '#00ffc8',
      stats: ['Cooldown: 0.53s', 'Damage: 22', 'Range: 400'],
      desc: 'Reliable homing bolts',
    },
    {
      type: 'whip',
      label: 'WHIP',
      color: '#ffd700',
      stats: ['Cooldown: 0.90s', 'Damage: 11', 'Range: 120'],
      desc: 'Short-range arc control',
    },
    {
      type: 'rocket',
      label: 'ROCKET',
      color: '#ff6600',
      stats: ['Cooldown: 2.00s', 'Damage: 60', 'Blast: 80'],
      desc: 'High burst area damage',
    },
  ]

  const totalW = weapons.length * cardW + (weapons.length - 1) * gap
  const startX = cx - totalW / 2
  gameState.weaponRects = []

  weapons.forEach((weapon, i) => {
    const x = startX + i * (cardW + gap)
    const y = cy - 40
    const selected = gameState.selectedWeapon === weapon.type
    gameState.weaponRects.push({ x, y, w: cardW, h: cardH, type: weapon.type })

    ctx.save()
    ctx.fillStyle = selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'
    ctx.strokeStyle = weapon.color
    ctx.lineWidth = selected ? 2 : 1
    ctx.globalAlpha = selected ? 1 : 0.45
    if (selected) {
      ctx.shadowBlur = 20
      ctx.shadowColor = weapon.color
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
    ctx.fillStyle = weapon.color
    ctx.shadowBlur = selected ? 10 : 0
    ctx.shadowColor = weapon.color
    ctx.fillText(weapon.label, x + cardW / 2, y + 30)

    ctx.font = '12px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.shadowBlur = 0
    weapon.stats.forEach((line, lineIndex) => {
      ctx.fillText(line, x + cardW / 2, y + 60 + lineIndex * 18)
    })

    ctx.font = '11px monospace'
    ctx.fillStyle = weapon.color
    ctx.globalAlpha = (selected ? 1 : 0.45) * 0.7
    ctx.fillText(weapon.desc, x + cardW / 2, y + 150)
    ctx.restore()
  })

  ctx.save()
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,255,200,0.4)'
  ctx.fillText('Click to select. Press Enter or Space to start.', cx, cy + 175)
  ctx.restore()
}
