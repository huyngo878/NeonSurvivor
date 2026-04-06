export function drawHud(ctx, canvas, player, gameState) {
  if (!player) return

  const barW = 320
  const barH = 24
  const barX = 24
  const barY = 24
  ctx.fillStyle = '#111'
  ctx.fillRect(barX, barY, barW, barH)
  const hpRatio = Math.max(0, player.hp / player.maxHp)
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillRect(barX, barY, barW * hpRatio, barH)
  ctx.restore()
  ctx.strokeStyle = '#00ffc8'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barW, barH)

  ctx.save()
  ctx.font = '18px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(0,255,200,0.5)'
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, barX, barY + barH + 18)
  ctx.restore()

  const mm = String(Math.floor(gameState.time / 60)).padStart(2, '0')
  const ss = String(Math.floor(gameState.time % 60)).padStart(2, '0')
  ctx.save()
  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 14
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText(`${mm}:${ss}`, canvas.clientWidth / 2, 48)
  ctx.font = 'bold 18px monospace'
  ctx.fillStyle = '#ffd700'
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`WAVE ${gameState.wave || 1}`, canvas.clientWidth / 2, 74)
  ctx.restore()

  ctx.save()
  ctx.font = '28px monospace'
  ctx.textAlign = 'right'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText(`KILLS: ${gameState.kills}`, canvas.clientWidth - 24, 48)
  ctx.restore()

  if (gameState.state === 'playing' || gameState.state === 'paused') {
    const xpBarH = 12
    const xpBarX = 24
    const xpBarW = canvas.clientWidth - 48
    const xpBarY = canvas.clientHeight - 16
    const xpRatio = Math.max(0, Math.min(1, player.xp / player.xpToNext))

    ctx.save()
    ctx.fillStyle = '#111'
    ctx.fillRect(xpBarX, xpBarY, xpBarW, xpBarH)
    ctx.shadowBlur = 10
    ctx.shadowColor = '#ffd700'
    ctx.fillStyle = '#ffd700'
    ctx.fillRect(xpBarX, xpBarY, xpBarW * xpRatio, xpBarH)
    ctx.shadowBlur = 0
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,215,0,0.85)'
    ctx.fillText(`LVL ${player.level}`, canvas.clientWidth / 2, xpBarY - 6)
    ctx.restore()
  }

  if (player.weapons.length > 0) {
    ctx.save()
    ctx.font = '22px monospace'
    ctx.textAlign = 'left'
    player.weapons.forEach((weapon, i) => {
      const color = weapon.type === 'whip' ? '#ffd700' : weapon.type === 'rocket' ? '#ff6600' : '#00ffc8'
      const label = weapon.type.toUpperCase()
      ctx.shadowBlur = 10
      ctx.shadowColor = color
      ctx.fillStyle = color
      ctx.fillText(label, 24, canvas.clientHeight - 48 - i * 32)
    })
    ctx.restore()
  }

  if (gameState.showZoomControl) {
    const x = canvas.clientWidth - 120
    const y = canvas.clientHeight - 124
    const w = 96
    const h = 36
    gameState.zoomRect = { x, y, w, h }
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.strokeStyle = '#00ffc8'
    ctx.lineWidth = 1
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 8
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText(`ZOOM ${gameState.zoomLabel || '1.0x'}`, x + w / 2, y + 24)
    ctx.restore()
  } else {
    gameState.zoomRect = null
  }

  if (gameState.state === 'paused') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    ctx.font = 'bold 72px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText('PAUSED', canvas.clientWidth / 2, canvas.clientHeight / 2 - 70)

    const options = ['Resume', 'Finish Run']
    gameState.pauseRects = []
    options.forEach((label, index) => {
      const x = canvas.clientWidth / 2 - 140
      const y = canvas.clientHeight / 2 - 10 + index * 58
      const selected = (gameState.pauseIndex || 0) === index
      gameState.pauseRects.push({ x, y, w: 280, h: 42, action: index === 0 ? 'resume' : 'finish' })
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.4)'
      ctx.strokeStyle = selected ? '#ffd700' : 'rgba(255,255,255,0.25)'
      ctx.lineWidth = selected ? 2 : 1
      ctx.fillRect(x, y, 280, 42)
      ctx.strokeRect(x, y, 280, 42)
      ctx.font = 'bold 24px monospace'
      ctx.fillStyle = selected ? '#ffd700' : '#ffffff'
      ctx.fillText(label.toUpperCase(), canvas.clientWidth / 2, y + 29)
    })
    ctx.restore()
  }
}
