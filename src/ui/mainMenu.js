import { loadBest, loadRuns } from '../meta.js'

const MENU_ITEMS = [
  { label: '▶  PLAY',        color: '#00ffc8', state: 'start' },
  { label: '⬡  UPGRADES',    color: '#ffd700', state: 'upgrades' },
  { label: '🏆  LEADERBOARD', color: '#ff0080', state: 'leaderboard', disabled: true },
  { label: '⚙  SETTINGS',    color: '#888',    state: 'settings',    disabled: true },
]

export function drawMainMenu(ctx, canvas, gameState) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

  const cx = canvas.clientWidth / 2
  const best = loadBest()
  const runs = loadRuns()

  // Layout — vertically centered
  const btnH = 57, btnGap = 14
  const totalContentH = 72 + 12 + 18 + 28 + 75 + 28 + (MENU_ITEMS.length * btnH + (MENU_ITEMS.length - 1) * btnGap) + (runs.length > 0 ? 40 : 0)
  let y = Math.max(20, (canvas.clientHeight - totalContentH) / 2) + 54

  // Title
  ctx.save()
  ctx.font = 'bold 72px monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 32
  ctx.shadowColor = '#00ffc8'
  ctx.fillStyle = '#00ffc8'
  ctx.fillText('NEON SURVIVE', cx, y)
  y += 36
  ctx.font = '17px monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(0,255,200,0.3)'
  ctx.fillText('SURVIVE THE NEON APOCALYPSE', cx, y)
  ctx.restore()
  y += 28

  // Stats strip
  const stats = [
    { label: 'BEST TIME',  value: best ? _fmtTime(best.timeSecs) : '--:--', color: '#ffd700' },
    { label: 'BEST KILLS', value: best ? String(best.kills) : '--',          color: '#ff0080' },
    { label: 'BEST LEVEL', value: best ? String(best.level) : '--',          color: '#00ffc8' },
    { label: 'RUNS',       value: String(runs.length),                       color: '#888' },
  ]
  const stripW = 510, stripH = 75, stripX = cx - stripW / 2
  ctx.save()
  ctx.fillStyle = 'rgba(0,255,200,0.04)'
  ctx.strokeStyle = 'rgba(0,255,200,0.15)'
  ctx.lineWidth = 1
  ctx.fillRect(stripX, y, stripW, stripH)
  ctx.strokeRect(stripX, y, stripW, stripH)
  const colW = stripW / stats.length
  stats.forEach((s, i) => {
    const x = stripX + colW * i + colW / 2
    ctx.font = 'bold 23px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = s.color
    ctx.shadowBlur = 8
    ctx.shadowColor = s.color
    ctx.fillText(s.value, x, y + 33)
    ctx.font = '12px monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = '#444'
    ctx.fillText(s.label, x, y + 57)
  })
  ctx.restore()
  y += stripH + 28

  // Menu buttons
  const btnW = 360
  gameState.menuRects = []

  MENU_ITEMS.forEach((item, i) => {
    const x = cx - btnW / 2
    const selected = gameState.menuIndex === i
    const disabled = item.disabled

    gameState.menuRects.push({ x, y, w: btnW, h: btnH, state: item.state, disabled })

    ctx.save()
    ctx.globalAlpha = disabled ? 0.3 : 1
    ctx.fillStyle = selected ? `${item.color}22` : 'rgba(0,0,0,0.6)'
    ctx.strokeStyle = selected ? item.color : `${item.color}50`
    ctx.lineWidth = selected ? 2 : 1
    if (selected && !disabled) {
      ctx.shadowBlur = 18
      ctx.shadowColor = item.color
    }
    ctx.fillRect(x, y, btnW, btnH)
    ctx.strokeRect(x, y, btnW, btnH)
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = item.color
    ctx.shadowBlur = selected ? 10 : 0
    ctx.shadowColor = item.color
    ctx.fillText(item.label, cx, y + btnH / 2 + 7)
    ctx.restore()

    y += btnH + btnGap
  })

  // Last run hint
  if (runs.length > 0) {
    const last = runs[0]
    ctx.save()
    ctx.font = '15px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#444'
    ctx.fillText(
      `Last run: ${_fmtTime(last.timeSecs)} · ${last.kills} kills · Level ${last.level}`,
      cx, y + 22
    )
    ctx.restore()
  }

  // Version
  ctx.save()
  ctx.font = '13px monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#555'
  ctx.fillText('v0.1.0', canvas.clientWidth - 16, canvas.clientHeight - 14)
  ctx.restore()
}

function _fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export { MENU_ITEMS }
