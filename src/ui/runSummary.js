export function drawRunSummary(ctx, canvas, gameState) {
  const run  = gameState.lastRun
  const best = gameState.prevBest
  if (!run) return

  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

  const cx = canvas.clientWidth / 2

  // Background tint
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
  ctx.restore()

  // Layout — vertically centered
  const totalContentH = 63 + 12 + 18 + 28 + 78 + 22 + 27 + 22 + 16 + 84 + 22 + 30 + 16 + 51
  let y = Math.max(20, (canvas.clientHeight - totalContentH) / 2) + 54

  // Header
  ctx.save()
  ctx.font = 'bold 63px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 32
  ctx.shadowColor = '#ff0080'
  ctx.fillStyle = '#ff0080'
  ctx.fillText('RUN OVER', cx, y)
  y += 33
  ctx.font = '15px monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,0,128,0.35)'
  ctx.fillText('BETTER LUCK NEXT TIME', cx, y)
  ctx.restore()
  y += 36

  // Stats grid
  const stats = [
    { label: 'TIME',  value: _fmtTime(run.timeSecs), color: '#ffd700' },
    { label: 'KILLS', value: String(run.kills),       color: '#ff0080' },
    { label: 'LEVEL', value: String(run.level),       color: '#00ffc8' },
  ]
  const gridW = 450, gridH = 78, gridX = cx - gridW / 2
  ctx.save()
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1
  ctx.strokeRect(gridX, y, gridW, gridH)
  const colW = gridW / stats.length
  stats.forEach((s, i) => {
    const x = gridX + colW * i + colW / 2
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(gridX + colW * i, y)
      ctx.lineTo(gridX + colW * i, y + gridH)
      ctx.stroke()
    }
    ctx.font = 'bold 26px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = s.color
    ctx.shadowBlur = 8
    ctx.shadowColor = s.color
    ctx.fillText(s.value, x, y + 33)
    ctx.font = '12px monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = '#444'
    ctx.fillText(s.label, x, y + 60)
  })
  ctx.restore()
  y += gridH + 22

  // Weapons + upgrades
  ctx.save()
  ctx.textAlign = 'center'
  if (run.weapons.length > 0) {
    ctx.font = '17px monospace'
    ctx.fillStyle = '#ffd700'
    ctx.fillText(run.weapons.map(w => w.toUpperCase()).join('  +  '), cx, y)
    y += 27
  }
  if (run.upgrades.length > 0) {
    ctx.font = '14px monospace'
    ctx.fillStyle = '#555'
    const label = run.upgrades.slice(0, 8).join(' · ') + (run.upgrades.length > 8 ? ' ...' : '')
    ctx.fillText(label, cx, y)
    y += 22
  }
  ctx.restore()
  y += 16

  // Prestige earned box
  ctx.save()
  const boxW = 420, boxH = 84, boxX = cx - boxW / 2
  ctx.fillStyle = 'rgba(255,215,0,0.05)'
  ctx.strokeStyle = 'rgba(255,215,0,0.3)'
  ctx.lineWidth = 1
  ctx.fillRect(boxX, y, boxW, boxH)
  ctx.strokeRect(boxX, y, boxW, boxH)
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#444'
  ctx.fillText('PRESTIGE EARNED', cx, y + 21)
  ctx.font = 'bold 36px monospace'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 16
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`⬡ +${run.prestige}`, cx, y + 60)
  ctx.restore()
  y += boxH + 22

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
    ctx.font = '15px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00ffc8'
    ctx.shadowBlur = 10
    ctx.shadowColor = '#00ffc8'
    ctx.fillText(badges.join('  '), cx, y)
    ctx.restore()
    y += 30
  }
  y += 16

  // Buttons
  ctx.save()
  const btn = [
    { label: '▶ PLAY AGAIN  [R]', color: '#00ffc8', action: 'replay' },
    { label: 'MENU  [M]',         color: '#ffd700', action: 'menu' },
  ]
  const btnW = 240, btnH = 51, gap = 18
  const bx = cx - (btnW * 2 + gap) / 2
  gameState.summaryBtnRects = []
  btn.forEach((b, i) => {
    const x = bx + i * (btnW + gap)
    gameState.summaryBtnRects.push({ x, y, w: btnW, h: btnH, action: b.action })
    ctx.fillStyle = `${b.color}15`
    ctx.strokeStyle = b.color
    ctx.lineWidth = 1
    ctx.shadowBlur = 12
    ctx.shadowColor = b.color
    ctx.fillRect(x, y, btnW, btnH)
    ctx.strokeRect(x, y, btnW, btnH)
    ctx.font = 'bold 17px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = b.color
    ctx.fillText(b.label, x + btnW / 2, y + btnH / 2 + 6)
  })
  ctx.restore()
}

function _fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}
