export function drawHud(ctx, canvas, player, gameState) {
  if (!player) return

  // HP bar — top-left
  const barW = 160, barH = 14, barX = 16, barY = 16
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

  // Timer — top-center
  const mm = String(Math.floor(gameState.time / 60)).padStart(2, '0')
  const ss = String(Math.floor(gameState.time % 60)).padStart(2, '0')
  ctx.save()
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 10
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText(`${mm}:${ss}`, canvas.width / 2, 30)
  ctx.restore()

  // Kill count — top-right
  ctx.save()
  ctx.font = '16px monospace'
  ctx.textAlign = 'right'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText(`KILLS: ${gameState.kills}`, canvas.width - 16, 30)
  ctx.restore()

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

  // Death overlay
  if (gameState.state === 'dead') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#ff0080'
    ctx.fillStyle = '#ff0080'
    ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2 - 20)
    ctx.font = '20px monospace'
    ctx.shadowBlur = 10
    ctx.shadowColor = '#00ffc8'
    ctx.fillStyle = '#00ffc8'
    ctx.fillText('[R] to Restart', canvas.width / 2, canvas.height / 2 + 30)
    ctx.restore()
  }
}
