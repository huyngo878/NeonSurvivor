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

  // Build sections: each section = { color, label, stats[], tags[] }
  const sections = []

  for (const w of player.weapons) {
    if (w.type === 'wand') {
      const tags = []
      if (w.pierceCount > 0)     tags.push(`Pierce x${w.pierceCount}`)
      if (w.bounce > 0)          tags.push(`Bounce x${w.bounce}`)
      if (w.forkCount > 0)       tags.push(`Fork x${w.forkCount}`)
      if (w.critChance > 0)      tags.push(`Crit ${Math.round(w.critChance * 100)}%`)
      if (w.slowOnHit)           tags.push('Slow')
      if (w.homing > 0)          tags.push('Homing')
      if (w.multicastChance > 0) tags.push('Multicast')
      if (w.explodeOnImpact)     tags.push('Explode')
      if (w.chainBeam > 0)       tags.push('Chain Beam')
      if (w.echo)                tags.push('Echo')
      if (w.splitReality)        tags.push('Split Reality')
      if (w.overloadActive)      tags.push('Overload')
      if (w.novaBurst)           tags.push('Nova Burst')
      if (w.evolving)            tags.push(`Adaptive +${w.evolutionBonus}`)
      sections.push({
        color: '#00ffc8',
        label: 'WAND',
        stats: [
          `Damage: ${w.damage}    Shots: ${w.shots}`,
          `Rate: ${(1 / w.cooldown).toFixed(2)}/s    Range: ${w.range}`,
        ],
        tags,
      })
    } else if (w.type === 'whip') {
      const tags = []
      if (w.critChance > 0)     tags.push(`Crit ${Math.round(w.critChance * 100)}%`)
      if (w.knockback > 18)     tags.push(`Knockback ${w.knockback}`)
      if (w.slowOnHit)          tags.push('Slow')
      if (w.bleedOnHit)         tags.push(`Bleed ${w.bleedDps}/s`)
      if (w.shockwaveOnHit)     tags.push('Shockwave')
      if (w.chainLightning > 0) tags.push('Chain Lightning')
      if (w.echo)               tags.push('Time Echo')
      if (w.phantom)            tags.push('Phantom Strikes')
      if (w.gravitySlamOnHit)   tags.push('Gravity Slam')
      if (w.boomerang)          tags.push('Boomerang')
      if (w.orbitBlades)        tags.push('Orbit Blades')
      sections.push({
        color: '#ffd700',
        label: 'WHIP',
        stats: [
          `Damage: ${w.damage}    Range: ${w.range}`,
          `Rate: ${(1 / w.cooldown).toFixed(2)}/s`,
        ],
        tags,
      })
    } else if (w.type === 'rocket') {
      const tags = []
      if (w.knockback > 0)          tags.push(`Knockback ${w.knockback}`)
      if (w.fragmentChance > 0)     tags.push(`Fragments ${Math.round(w.fragmentChance * 100)}%`)
      if (w.centerDamageBonus > 0)  tags.push(`Center +${Math.round(w.centerDamageBonus * 100)}%`)
      if (w.explosionCount > 1)     tags.push('Double Explosion')
      if (w.inferno)                tags.push('Inferno')
      if (w.clusterBarrage)         tags.push('Cluster Barrage')
      if (w.chainReaction)          tags.push('Chain Reaction')
      if (w.rocketRain)             tags.push('Rocket Rain')
      if (w.gravityWell)            tags.push('Gravity Well')
      sections.push({
        color: '#ff6600',
        label: 'ROCKET',
        stats: [
          `Damage: ${w.damage}    Shots: ${w.shots}`,
          `Rate: ${(1 / w.cooldown).toFixed(2)}/s    AoE: ${w.aoeRadius}`,
        ],
        tags,
      })
    }
  }

  // Player upgrades section
  const playerTags = []
  if (player.armor > 0)    playerTags.push(`Armor ${player.armor}`)
  if (player.maxHp > 100)  playerTags.push(`Max HP ${player.maxHp}`)
  if (player.speed > 200)  playerTags.push(`Speed ${Math.round(player.speed)}`)
  if (playerTags.length > 0) {
    sections.push({ color: '#aaaaaa', label: 'PLAYER', stats: [], tags: playerTags })
  }

  if (sections.length === 0) return

  const HEADER_SIZE = 13
  const STAT_SIZE = 12
  const TAG_SIZE = 11
  const padX = 10
  const padY = 8
  const sectionGap = 6
  const headerH = 18
  const statH = 16
  const tagH = 15
  const margin = 10

  ctx.save()

  // Measure max width needed
  let maxW = 0
  for (const sec of sections) {
    ctx.font = `bold ${HEADER_SIZE}px monospace`
    maxW = Math.max(maxW, ctx.measureText(sec.label).width)
    ctx.font = `${STAT_SIZE}px monospace`
    for (const s of sec.stats) maxW = Math.max(maxW, ctx.measureText(s).width)
    ctx.font = `${TAG_SIZE}px monospace`
    // Tags are rendered as a wrapping row — measure each tag with prefix
    for (const t of sec.tags) maxW = Math.max(maxW, ctx.measureText(`  ▸ ${t}`).width)
  }
  maxW = Math.max(maxW, 160) // minimum width

  // Compute total height
  let totalH = padY
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si]
    totalH += headerH
    totalH += sec.stats.length * statH
    totalH += sec.tags.length * tagH
    if (si < sections.length - 1) totalH += sectionGap
  }
  totalH += padY

  const boxW = maxW + padX * 2
  const boxH = totalH
  const bx = canvas.clientWidth - boxW - margin
  const by = canvas.clientHeight - boxH - 52

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.78)'
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.fillRect(bx, by, boxW, boxH)
  ctx.strokeRect(bx, by, boxW, boxH)

  let cy = by + padY

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si]

    // Colored left bar accent
    ctx.fillStyle = sec.color
    ctx.fillRect(bx, cy, 3, headerH + sec.stats.length * statH + sec.tags.length * tagH)

    // Weapon header
    ctx.font = `bold ${HEADER_SIZE}px monospace`
    ctx.fillStyle = sec.color
    ctx.shadowBlur = 8
    ctx.shadowColor = sec.color
    ctx.textAlign = 'left'
    ctx.fillText(sec.label, bx + padX + 5, cy + HEADER_SIZE)
    ctx.shadowBlur = 0
    cy += headerH

    // Stats rows
    ctx.font = `${STAT_SIZE}px monospace`
    ctx.fillStyle = 'rgba(220,220,220,0.9)'
    for (const stat of sec.stats) {
      ctx.fillText(stat, bx + padX + 5, cy + STAT_SIZE - 2)
      cy += statH
    }

    // Upgrade tags — each on its own line with a bullet
    ctx.font = `${TAG_SIZE}px monospace`
    for (const tag of sec.tags) {
      ctx.fillStyle = 'rgba(255,220,80,0.85)'
      ctx.fillText(`  ▸ ${tag}`, bx + padX + 5, cy + TAG_SIZE - 2)
      cy += tagH
    }

    if (si < sections.length - 1) {
      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bx + 4, cy + sectionGap / 2)
      ctx.lineTo(bx + boxW - 4, cy + sectionGap / 2)
      ctx.stroke()
      cy += sectionGap
    }
  }

  ctx.restore()
}
