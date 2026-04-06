export function renderWorld(ctx, canvas, entities, camera) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  for (const e of entities) {
    if (e.type === 'enemy') _drawEnemy(ctx, e)
    else if (e.type === 'projectile' && e.active) _drawProjectile(ctx, e)
  }

  const player = entities.find(e => e.type === 'player')
  if (player) _drawPlayer(ctx, player)

  ctx.restore()
}

function _drawPlayer(ctx, player) {
  const { x, y } = player.pos
  ctx.save()
  ctx.shadowBlur = 20
  ctx.shadowColor = '#00ffc8'
  // Flash transparent during iframes
  ctx.fillStyle = player.iframes > 0 ? 'rgba(0,255,200,0.3)' : '#00ffc8'
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function _drawEnemy(ctx, enemy) {
  const { x, y } = enemy.pos
  ctx.save()
  ctx.shadowBlur = 15
  ctx.shadowColor = enemy.color
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.arc(x, y, enemy.radius, 0, Math.PI * 2)
  ctx.fill()
  // HP bar above enemy (only when damaged)
  if (enemy.hp < enemy.maxHp) {
    const bw = enemy.radius * 2
    ctx.shadowBlur = 0
    ctx.fillStyle = '#222'
    ctx.fillRect(x - enemy.radius, y - enemy.radius - 8, bw, 4)
    ctx.fillStyle = enemy.color
    ctx.fillRect(x - enemy.radius, y - enemy.radius - 8, bw * (enemy.hp / enemy.maxHp), 4)
  }
  ctx.restore()
}

function _drawProjectile(ctx, proj) {
  const { x, y } = proj.pos
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, proj.radius, 0, Math.PI * 2)
  ctx.fill()
  // Motion trail (3 fading dots behind)
  const speed = Math.hypot(proj.vel.x, proj.vel.y)
  if (speed > 0) {
    const nx = proj.vel.x / speed
    const ny = proj.vel.y / speed
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(x - nx * 8, y - ny * 8, proj.radius * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.arc(x - nx * 16, y - ny * 16, proj.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
