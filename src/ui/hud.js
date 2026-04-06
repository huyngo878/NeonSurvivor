export function drawHud(ctx, canvas, player, gameState) {
  if (!player) return

  // HP bar — top-left
  const barW = 320, barH = 24, barX = 24, barY = 24
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
  // HP text below bar
  ctx.save()
  ctx.font = '18px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(0,255,200,0.5)'
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, barX, barY + barH + 18)
  ctx.restore()

  // Timer — top-center
  const mm = String(Math.floor(gameState.time / 60)).padStart(2, '0')
  const ss = String(Math.floor(gameState.time % 60)).padStart(2, '0')
  ctx.save()
  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 14
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText(`${mm}:${ss}`, canvas.clientWidth / 2, 48)
  ctx.restore()

  // Kill count — top-right
  ctx.save()
  ctx.font = '28px monospace'
  ctx.textAlign = 'right'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText(`KILLS: ${gameState.kills}`, canvas.clientWidth - 24, 48)
  ctx.restore()

  // XP bar — bottom (full width)
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

  // Weapon inventory — bottom-left, above XP bar
  if (player.weapons.length > 0) {
    ctx.save()
    ctx.font = '22px monospace'
    ctx.textAlign = 'left'
    player.weapons.forEach((weapon, i) => {
      const color = weapon.type === 'whip' ? '#ffd700' : '#00ffc8'
      const label = weapon.type === 'whip' ? 'WHIP' : 'WAND'
      ctx.shadowBlur = 10
      ctx.shadowColor = color
      ctx.fillStyle = color
      ctx.fillText(label, 24, canvas.clientHeight - 48 - i * 32)
    })
    ctx.restore()
  }

  // Paused overlay
  if (gameState.state === 'paused') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    ctx.font = 'bold 72px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText('PAUSED', canvas.clientWidth / 2, canvas.clientHeight / 2)
    ctx.restore()
  }
}
