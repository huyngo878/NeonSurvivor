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

  // Money display — below HP text
  ctx.save()
  ctx.font = '18px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffd700'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#ffd700'
  ctx.fillText(`💰 ${player.money ?? 0}$`, barX, barY + barH + 40)
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

  // Chest proximity label — drawn in screen space using camera offset from gameState
  if (gameState.nearestChest && gameState.camera) {
    const { node, cost } = gameState.nearestChest
    const zoom = gameState.zoom || 1
    const screenX = (node.pos.x - gameState.camera.x) * zoom
    const screenY = (node.pos.y - gameState.camera.y) * zoom - 28

    const canAfford = (player.money ?? 0) >= cost
    const labelColor = node.sparkly ? (canAfford ? '#dd00ff' : '#ff4444') : (canAfford ? '#00ff88' : '#ff4444')
    const text = node.sparkly ? `✨ ${cost}$  E to open` : `💰 ${cost}$  E to open`

    ctx.save()
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    const textW = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath()
    ctx.roundRect(screenX - textW / 2 - 8, screenY - 14, textW + 16, 20, 4)
    ctx.fill()
    ctx.fillStyle = labelColor
    ctx.shadowBlur = 6
    ctx.shadowColor = labelColor
    ctx.fillText(text, screenX, screenY)
    ctx.restore()
  }

  drawUpgradeHud(ctx, canvas, player, gameState)
}

function drawUpgradeHud(ctx, canvas, player, gameState) {
  if (!player || player.weapons.length === 0) return

  const lines = []

  for (const w of player.weapons) {
    if (w.type === 'wand') {
      const fr = (1 / w.cooldown).toFixed(2)
      lines.push(`WAND  DMG:${w.damage}  FR:${fr}/s  RNG:${w.range}  SHOTS:${w.shots}`)
      const mods = []
      if (w.pierceCount > 0)    mods.push(`PIERCE:${w.pierceCount}`)
      if (w.bounce > 0)         mods.push(`BOUNCE:${w.bounce}`)
      if (w.forkCount > 0)      mods.push(`FORK:${w.forkCount}`)
      if (w.critChance > 0)     mods.push(`CRIT:${Math.round(w.critChance * 100)}%`)
      if (w.slowOnHit)          mods.push('[SLOW]')
      if (w.homing > 0)         mods.push('[HOMING]')
      if (w.multicastChance > 0) mods.push('[MULTICAST]')
      if (w.explodeOnImpact)    mods.push('[EXPLODE]')
      if (w.chainBeam > 0)      mods.push('[CHAIN BEAM]')
      if (w.echo)               mods.push('[ECHO]')
      if (w.splitReality)       mods.push('[SPLIT]')
      if (w.overloadActive)     mods.push('[OVERLOAD]')
      if (w.novaBurst)          mods.push('[NOVA]')
      if (w.evolving)           mods.push(`[EVO:+${w.evolutionBonus}]`)
      if (mods.length > 0) lines.push('  ' + mods.join('  '))
    } else if (w.type === 'whip') {
      const fr = (1 / w.cooldown).toFixed(2)
      lines.push(`WHIP  DMG:${w.damage}  FR:${fr}/s  RNG:${w.range}`)
      const mods = []
      if (w.critChance > 0)    mods.push(`CRIT:${Math.round(w.critChance * 100)}%`)
      if (w.knockback > 18)    mods.push(`KB:${w.knockback}`)
      if (w.slowOnHit)         mods.push('[SLOW]')
      if (w.bleedOnHit)        mods.push(`[BLEED ${w.bleedDps}/s]`)
      if (w.shockwaveOnHit)    mods.push('[SHOCKWAVE]')
      if (w.chainLightning > 0) mods.push('[LIGHTNING]')
      if (w.echo)              mods.push('[ECHO]')
      if (w.phantom)           mods.push('[PHANTOM]')
      if (w.gravitySlamOnHit)  mods.push('[GSLAM]')
      if (w.boomerang)         mods.push('[BOOMERANG]')
      if (w.orbitBlades)       mods.push('[ORBIT]')
      if (mods.length > 0) lines.push('  ' + mods.join('  '))
    } else if (w.type === 'rocket') {
      const fr = (1 / w.cooldown).toFixed(2)
      lines.push(`RCKT  DMG:${w.damage}  FR:${fr}/s  AoE:${w.aoeRadius}  SHOTS:${w.shots}`)
      const mods = []
      if (w.knockback > 0)         mods.push(`KB:${w.knockback}`)
      if (w.fragmentChance > 0)    mods.push(`[FRAG ${Math.round(w.fragmentChance * 100)}%]`)
      if (w.centerDamageBonus > 0) mods.push(`[CTR+${Math.round(w.centerDamageBonus * 100)}%]`)
      if (w.explosionCount > 1)    mods.push('[DBL EXP]')
      if (w.inferno)               mods.push('[INFERNO]')
      if (w.clusterBarrage)        mods.push('[CLUSTER]')
      if (w.chainReaction)         mods.push('[CHAIN RXN]')
      if (w.rocketRain)            mods.push('[RAIN]')
      if (w.gravityWell)           mods.push('[GWELL]')
      if (mods.length > 0) lines.push('  ' + mods.join('  '))
    }
  }

  // Player stat upgrades (only show above base values)
  const playerMods = []
  if (player.armor > 0)     playerMods.push(`ARM:${player.armor}`)
  if (player.maxHp > 100)   playerMods.push(`HP:${player.maxHp}`)
  if (player.speed > 200)   playerMods.push(`SPD:${Math.round(player.speed)}`)
  if (playerMods.length > 0) {
    lines.push('── PLAYER ──')
    lines.push('  ' + playerMods.join('  '))
  }

  if (lines.length === 0) return

  const fontSize = 11
  const lineH = 15
  const padX = 8
  const padY = 6

  ctx.save()
  ctx.font = `${fontSize}px monospace`
  const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
  const boxW = maxW + padX * 2
  const boxH = lines.length * lineH + padY * 2

  // Position above XP bar (XP bar is at canvas.clientHeight - 16, height 12)
  // Leave 48px gap to clear XP bar + level text
  const margin = 8
  const bx = canvas.clientWidth - boxW - margin
  const by = canvas.clientHeight - boxH - 48

  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.strokeStyle = 'rgba(0,255,200,0.15)'
  ctx.lineWidth = 1
  ctx.fillRect(bx, by, boxW, boxH)
  ctx.strokeRect(bx, by, boxW, boxH)

  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    const ty = by + padY + (i + 1) * lineH - 3
    if (line.startsWith('WAND'))      ctx.fillStyle = '#00ffc8'
    else if (line.startsWith('WHIP')) ctx.fillStyle = '#ffd700'
    else if (line.startsWith('RCKT')) ctx.fillStyle = '#ff6600'
    else if (line.startsWith('──'))   ctx.fillStyle = 'rgba(0,255,200,0.45)'
    else                              ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText(line, bx + padX, ty)
  })

  ctx.restore()
}
