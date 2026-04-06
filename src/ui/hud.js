export function drawHud(ctx, canvas, player, gameState) {
  if (!player) return

  // HP bar — top-left
  const barW = 160, barH = 12, barX = 16, barY = 16
  ctx.fillStyle = '#111'
  ctx.fillRect(barX, barY, barW, barH)
  const hpRatio = Math.max(0, player.hp / player.maxHp)
  ctx.save()
  ctx.shadowBlur = 8
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillRect(barX, barY, barW * hpRatio, barH)
  ctx.restore()
  ctx.strokeStyle = '#00ffc8'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barW, barH)
  // HP text below bar
  ctx.save()
  ctx.font = '9px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(0,255,200,0.5)'
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, barX, barY + barH + 11)
  ctx.restore()

  // Timer — top-center (below HP bar row)
  const mm = String(Math.floor(gameState.time / 60)).padStart(2, '0')
  const ss = String(Math.floor(gameState.time % 60)).padStart(2, '0')
  ctx.save()
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText(`${mm}:${ss}`, canvas.width / 2, 26)
  ctx.restore()

  // Kill count — top-right
  ctx.save()
  ctx.font = '16px monospace'
  ctx.textAlign = 'right'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText(`KILLS: ${gameState.kills}`, canvas.width - 16, 26)
  ctx.restore()

  // XP bar — bottom (full width, with LVL badge and weapon list above it)
  if (gameState.state === 'playing' || gameState.state === 'paused') {
    const xpBarH = 6
    const xpBarX = 16
    const xpBarW = canvas.width - 32
    const xpBarY = canvas.height - 10
    const xpRatio = Math.max(0, Math.min(1, player.xp / player.xpToNext))

    ctx.save()
    // Bar background
    ctx.fillStyle = '#111'
    ctx.fillRect(xpBarX, xpBarY, xpBarW, xpBarH)
    // Bar fill
    ctx.shadowBlur = 8
    ctx.shadowColor = '#ffd700'
    ctx.fillStyle = '#ffd700'
    ctx.fillRect(xpBarX, xpBarY, xpBarW * xpRatio, xpBarH)
    // Level label above the bar
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,215,0,0.8)'
    ctx.fillText(`LVL ${player.level}`, canvas.width / 2, xpBarY - 4)
    ctx.restore()
  }

  // Weapon inventory — bottom-left, above XP bar
  if (player.weapons.length > 0) {
    ctx.save()
    ctx.font = '13px monospace'
    ctx.textAlign = 'left'
    player.weapons.forEach((weapon, i) => {
      const color = weapon.type === 'whip' ? '#ffd700' : '#00ffc8'
      const label = weapon.type === 'whip' ? 'WHIP' : 'WAND'
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.fillStyle = color
      ctx.fillText(label, 16, canvas.height - 32 - i * 20)
    })
    ctx.restore()
  }

  // Paused overlay
  if (gameState.state === 'paused') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 15
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
    ctx.restore()
  }

}
