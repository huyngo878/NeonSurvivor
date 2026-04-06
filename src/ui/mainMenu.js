import { loadBest, loadRuns } from '../meta.js'

const MENU_ITEMS = [
  { label: '▶  PLAY',        color: '#00ffc8', state: 'start' },
  { label: '⬡  UPGRADES',    color: '#ffd700', state: 'upgrades' },
  { label: '🏆  LEADERBOARD', color: '#ff0080', state: 'leaderboard', disabled: true },
  { label: '⚙  SETTINGS',    color: '#888',    state: 'settings',    disabled: true },
]

export function drawMainMenu(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const best = loadBest()
  const runs = loadRuns()

  // Title
  ctx.save()
  ctx.font = 'bold 52px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 24
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText('NEON SURVIVE', cx, cy - 140)
  ctx.font = '11px monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,255,200,0.3)'
  ctx.fillText('SURVIVE THE NEON APOCALYPSE', cx, cy - 115)
  ctx.restore()

  // Stats strip
  const stats = [
    { label: 'BEST TIME', value: best ? _fmtTime(best.timeSecs) : '--:--', color: '#ffd700' },
    { label: 'BEST KILLS', value: best ? String(best.kills) : '--', color: '#ff0080' },
    { label: 'BEST LEVEL', value: best ? String(best.level) : '--', color: '#00ffc8' },
    { label: 'RUNS', value: String(runs.length), color: '#888' },
  ]
  const stripW = 320, stripH = 48, stripX = cx - stripW / 2, stripY = cy - 90
  ctx.save()
  ctx.fillStyle = 'rgba(0,255,200,0.04)'
  ctx.strokeStyle = 'rgba(0,255,200,0.15)'
  ctx.lineWidth = 1
  ctx.fillRect(stripX, stripY, stripW, stripH)
  ctx.strokeRect(stripX, stripY, stripW, stripH)
  const colW = stripW / stats.length
  stats.forEach((s, i) => {
    const x = stripX + colW * i + colW / 2
    ctx.font = 'bold 15px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = s.color
    ctx.shadowBlur = 6
    ctx.shadowColor = s.color
    ctx.fillText(s.value, x, stripY + 20)
    ctx.font = '8px monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = '#444'
    ctx.fillText(s.label, x, stripY + 36)
  })
  ctx.restore()

  // Menu buttons
  const btnW = 240, btnH = 36, btnGap = 10
  const totalH = MENU_ITEMS.length * (btnH + btnGap) - btnGap
  const btnStartY = cy - totalH / 2 + 20
  gameState.menuRects = []

  MENU_ITEMS.forEach((item, i) => {
    const x = cx - btnW / 2
    const y = btnStartY + i * (btnH + btnGap)
    const selected = gameState.menuIndex === i
    const disabled = item.disabled

    gameState.menuRects.push({ x, y, w: btnW, h: btnH, state: item.state, disabled })

    ctx.save()
    ctx.globalAlpha = disabled ? 0.3 : 1
    ctx.fillStyle = selected
      ? `${item.color}22`
      : 'rgba(0,0,0,0.6)'
    ctx.strokeStyle = selected ? item.color : `${item.color}50`
    ctx.lineWidth = selected ? 1.5 : 1
    if (selected && !disabled) {
      ctx.shadowBlur = 14
      ctx.shadowColor = item.color
    }
    ctx.fillRect(x, y, btnW, btnH)
    ctx.strokeRect(x, y, btnW, btnH)
    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = item.color
    ctx.shadowBlur = selected ? 8 : 0
    ctx.shadowColor = item.color
    ctx.fillText(item.label, cx, y + btnH / 2 + 5)
    ctx.restore()
  })

  // Last run hint
  if (runs.length > 0) {
    const last = runs[0]
    ctx.save()
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#333'
    ctx.fillText(
      `Last run: ${_fmtTime(last.timeSecs)} · ${last.kills} kills · Level ${last.level}`,
      cx, cy + 180
    )
    ctx.restore()
  }

  // Version
  ctx.save()
  ctx.font = '9px monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#222'
  ctx.fillText('v0.1.0', canvas.width - 12, canvas.height - 10)
  ctx.restore()
}

function _fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export { MENU_ITEMS }
