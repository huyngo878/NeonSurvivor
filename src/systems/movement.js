import { WORLD_W, WORLD_H } from '../constants.js'

export function updateMovement(entities, dt, input) {
  const player = entities.find(e => e.type === 'player')

  for (const e of entities) {
    if (e.type === 'player') {
      _movePlayer(e, dt, input)
    } else if (e.type === 'enemy') {
      if (player) _chasePlayer(e, dt, player)
    } else if (e.type === 'projectile' && e.active) {
      _moveProjectile(e, dt)
    } else if (e.type === 'enemyProjectile') {
      _moveEnemyProjectile(e, dt)
    } else if (e.type === 'shockwave') {
      _moveShockwave(e, dt)
    }
  }
}

function _movePlayer(player, dt, input) {
  let dx = 0, dy = 0
  if (input.up)    dy -= 1
  if (input.down)  dy += 1
  if (input.left)  dx -= 1
  if (input.right) dx += 1
  const len = Math.hypot(dx, dy)
  if (len > 0) {
    player.pos.x += (dx / len) * player.speed * dt
    player.pos.y += (dy / len) * player.speed * dt
    player.pos.x = Math.max(0, Math.min(WORLD_W, player.pos.x))
    player.pos.y = Math.max(0, Math.min(WORLD_H, player.pos.y))
    player.facing.x = dx / len
    player.facing.y = dy / len
  }
  if (player.iframes > 0) player.iframes = Math.max(0, player.iframes - dt)
}

function _chasePlayer(enemy, dt, player) {
  if (enemy.enemyType === 'boss' && enemy.bossTimer !== undefined) {
    enemy.bossTimer = Math.max(0, enemy.bossTimer - dt)
  }
  const dx = player.pos.x - enemy.pos.x
  const dy = player.pos.y - enemy.pos.y
  const dist = Math.hypot(dx, dy)
  if (dist > 0) {
    enemy.pos.x += (dx / dist) * enemy.speed * dt
    enemy.pos.y += (dy / dist) * enemy.speed * dt
  }
}

function _moveEnemyProjectile(proj, dt) {
  proj.pos.x += proj.vel.x * dt
  proj.pos.y += proj.vel.y * dt
  proj.age += dt
  if (
    proj.age >= proj.lifetime ||
    proj.pos.x < 0 || proj.pos.x > WORLD_W ||
    proj.pos.y < 0 || proj.pos.y > WORLD_H
  ) {
    proj.dead = true
  }
}

function _moveShockwave(shockwave, dt) {
  shockwave.age += dt
  const t = Math.min(1, shockwave.age / shockwave.lifetime)
  shockwave.radius = shockwave.maxRadius * t
  if (t >= 1) shockwave.dead = true
}

function _moveProjectile(proj, dt) {
  proj.pos.x += proj.vel.x * dt
  proj.pos.y += proj.vel.y * dt
  proj.age += dt
  const expired =
    proj.age >= proj.lifetime ||
    proj.pos.x < 0 || proj.pos.x > WORLD_W ||
    proj.pos.y < 0 || proj.pos.y > WORLD_H
  if (expired) {
    if (proj.aoe) {
      proj.explode = true  // AOE explosion handled in collision.js
    } else {
      proj.active = false
    }
  }
}
