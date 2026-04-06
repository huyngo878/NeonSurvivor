export function renderWorld(ctx, canvas, entities, camera, zoom = 1) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(-camera.x, -camera.y)

  for (const e of entities) {
    if (e.type === 'pickup') _drawPickup(ctx, e)
    else if (e.type === 'gem') _drawGem(ctx, e)
    else if (e.type === 'shockwave') _drawShockwave(ctx, e)
  }

  for (const e of entities) {
    if (e.type === 'enemy') _drawEnemy(ctx, e)
  }

  for (const e of entities) {
    if (e.type === 'projectile' && e.active) _drawProjectile(ctx, e)
    else if (e.type === 'enemyProjectile') _drawEnemyProjectile(ctx, e)
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
  ctx.fillStyle = player.iframes > 0 ? 'rgba(0,255,200,0.3)' : '#00ffc8'
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()

  // Whip arc overlay
  for (const weapon of player.weapons) {
    if (weapon.type === 'whip' && weapon.active) {
      const angle = weapon.aimAngle
      ctx.save()
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.shadowBlur = 15
      ctx.shadowColor = '#ffd700'
      ctx.globalAlpha = weapon.activeTimer / weapon.activeDuration
      ctx.beginPath()
      ctx.arc(x, y, weapon.range, angle - Math.PI / 2, angle + Math.PI / 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  ctx.restore()
}

function _drawEnemy(ctx, enemy) {
  const { x, y } = enemy.pos
  ctx.save()
  ctx.shadowBlur = enemy.enemyType === 'boss' ? 24 : 15
  ctx.shadowColor = enemy.color
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.arc(x, y, enemy.radius, 0, Math.PI * 2)
  ctx.fill()
  if (enemy.enemyType === 'boss') {
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
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
  const isRocket = proj.weaponType === 'rocket'
  const color = isRocket ? '#ff6600' : '#ffffff'
  ctx.save()
  ctx.shadowBlur = isRocket ? 16 : 12
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, proj.radius, 0, Math.PI * 2)
  ctx.fill()
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

function _drawEnemyProjectile(ctx, proj) {
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ff3355'
  ctx.fillStyle = '#ff3355'
  ctx.beginPath()
  ctx.arc(proj.pos.x, proj.pos.y, proj.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function _drawPickup(ctx, pickup) {
  let color
  if (pickup.pickupType === 'magnet') {
    color = '#cc00ff'
  } else if (pickup.pickupType === 'chest') {
    color = '#ffb347'
  } else if (pickup.weaponType === 'whip') {
    color = '#ffd700'
  } else if (pickup.weaponType === 'rocket') {
    color = '#ff6600'
  } else {
    color = '#00ffc8'
  }
  const yOff = Math.sin(pickup.bobTimer * 3) * 4
  const { x, y } = pickup.pos
  ctx.save()
  ctx.shadowBlur = 16
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y + yOff, pickup.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - 3, y + yOff - 3, pickup.radius * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function _drawShockwave(ctx, shockwave) {
  const alpha = 1 - shockwave.age / shockwave.lifetime
  ctx.save()
  ctx.globalAlpha = Math.max(0, alpha)
  ctx.strokeStyle = shockwave.color
  ctx.lineWidth = 6
  ctx.shadowBlur = 18
  ctx.shadowColor = shockwave.color
  ctx.beginPath()
  ctx.arc(shockwave.pos.x, shockwave.pos.y, shockwave.radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function _drawGem(ctx, gem) {
  const yOff = Math.sin(gem.bobTimer * 4) * 3
  const { x, y } = gem.pos
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = gem.color
  ctx.fillStyle = gem.color
  ctx.beginPath()
  ctx.arc(x, y + yOff, gem.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - gem.radius * 0.3, y + yOff - gem.radius * 0.3, gem.radius * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
