export function drawRunSummary(ctx, canvas, gameState) {
  const run  = gameState.lastRun
  const best = gameState.prevBest   // best BEFORE this run (for "new best" detection)
  if (!run) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  // Background tint
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()

  // Header
  ctx.save()
  ctx.font = 'bold 42px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText('RUN OVER', cx, cy - 140)
  ctx.font = '10px monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,0,128,0.35)'
  ctx.fillText('BETTER LUCK NEXT TIME', cx, cy - 118)
  ctx.restore()

  // Stats grid
  const stats = [
    { label: 'TIME',   value: _fmtTime(run.timeSecs), color: '#ffd700' },
    { label: 'KILLS',  value: String(run.kills),       color: '#ff0080' },
    { label: 'LEVEL',  value: String(run.level),       color: '#00ffc8' },
  ]
  const gridW = 300, gridH = 52, gridX = cx - gridW / 2, gridY = cy - 100
  ctx.save()
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1
  ctx.strokeRect(gridX, gridY, gridW, gridH)
  const colW = gridW / stats.length
  stats.forEach((s, i) => {
    const x = gridX + colW * i + colW / 2
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(gridX + colW * i, gridY)
      ctx.lineTo(gridX + colW * i, gridY + gridH)
      ctx.stroke()
    }
    ctx.font = 'bold 17px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = s.color
    ctx.shadowBlur = 6
    ctx.shadowColor = s.color
    ctx.fillText(s.value, x, gridY + 22)
    ctx.font = '8px monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = '#444'
    ctx.fillText(s.label, x, gridY + 40)
  })
  ctx.restore()

  // Weapons + upgrades
  ctx.save()
  ctx.textAlign = 'center'
  if (run.weapons.length > 0) {
    ctx.font = '11px monospace'
    ctx.fillStyle = '#ffd700'
    ctx.fillText(run.weapons.map(w => w.toUpperCase()).join('  +  '), cx, cy - 28)
  }
  if (run.upgrades.length > 0) {
    ctx.font = '9px monospace'
    ctx.fillStyle = '#333'
    const label = run.upgrades.slice(0, 8).join(' · ') + (run.upgrades.length > 8 ? ' ...' : '')
    ctx.fillText(label, cx, cy - 12)
  }
  ctx.restore()

  // Prestige earned box
  ctx.save()
  const boxW = 280, boxH = 56, boxX = cx - boxW / 2, boxY = cy + 4
  ctx.fillStyle = 'rgba(255,215,0,0.05)'
  ctx.strokeStyle = 'rgba(255,215,0,0.3)'
  ctx.lineWidth = 1
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.strokeRect(boxX, boxY, boxW, boxH)
  ctx.font = '8px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#444'
  ctx.fillText('PRESTIGE EARNED', cx, boxY + 14)
  ctx.font = 'bold 24px monospace'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`⬡ +${run.prestige}`, cx, boxY + 40)
  ctx.restore()

  // New best badges
  const badges = []
  if (best) {
    if (run.timeSecs > best.timeSecs) badges.push('✦ NEW BEST TIME!')
    if (run.kills    > best.kills)    badges.push('✦ NEW BEST KILLS!')
    if (run.level    > best.level)    badges.push('✦ NEW BEST LEVEL!')
  } else {
    badges.push('✦ FIRST RUN COMPLETE!')
  }
  if (badges.length > 0) {
    ctx.save()
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00ffc8'
    ctx.shadowBlur = 8
    ctx.shadowColor = '#00ffc8'
    ctx.fillText(badges.join('  '), cx, cy + 76)
    ctx.restore()
  }

  // Buttons
  ctx.save()
  const btn = [
    { label: '▶ PLAY AGAIN  [R]', color: '#00ffc8' },
    { label: 'MENU  [M]',         color: '#ffd700' },
  ]
  const btnW = 160, btnH = 34, gap = 12
  const bx = cx - (btnW * 2 + gap) / 2
  const by = cy + 96
  btn.forEach((b, i) => {
    const x = bx + i * (btnW + gap)
    ctx.fillStyle = `${b.color}15`
    ctx.strokeStyle = b.color
    ctx.lineWidth = 1
    ctx.shadowBlur = 10
    ctx.shadowColor = b.color
    ctx.fillRect(x, by, btnW, btnH)
    ctx.strokeRect(x, by, btnW, btnH)
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = b.color
    ctx.fillText(b.label, x + btnW / 2, by + btnH / 2 + 4)
  })
  ctx.restore()
}

function _fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}
