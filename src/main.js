import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, createWeapon, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { updatePickup } from './systems/pickup.js'
import { renderWorld } from './render.js'
import { drawHud } from './ui/hud.js'
import { drawStartScreen } from './ui/startScreen.js'

// --- Canvas ---
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

function resize() {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
}
resize()
window.addEventListener('resize', resize)

// --- Input ---
const input = { up: false, down: false, left: false, right: false }
const keyMap = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
}

document.addEventListener('keydown', e => {
  if (keyMap[e.code]) { input[keyMap[e.code]] = true; e.preventDefault() }

  // Start screen navigation
  if (gameState.state === 'start') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      gameState.selectedWeapon = gameState.selectedWeapon === 'whip' ? 'wand' : 'whip'
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      gameState.selectedWeapon = gameState.selectedWeapon === 'wand' ? 'whip' : 'wand'
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      initGame(gameState.selectedWeapon)
    }
    return
  }

  if (e.code === 'KeyP') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
  }
  if (e.code === 'KeyR' && gameState.state === 'dead') {
    gameState.state = 'start'
    gameState.selectedWeapon = 'wand'
  }
})
document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false
})

// --- Game state ---
let entities = []
let gameState = { state: 'start', selectedWeapon: 'wand', time: 0, kills: 0 }
let spawnerState = {}
let camera = { x: 0, y: 0 }

function initGame(selectedWeapon) {
  const player = createPlayer()
  player.weapons = [createWeapon(selectedWeapon)]
  const pool = initProjectilePool()
  entities     = [player, ...pool]
  gameState    = { state: 'playing', selectedWeapon, time: 0, kills: 0 }
  spawnerState = createSpawnerState()
  camera       = { x: 0, y: 0 }
}

// --- Camera ---
function updateCamera(player) {
  camera.x = Math.max(0, Math.min(player.pos.x - canvas.width  / 2, WORLD_W - canvas.width))
  camera.y = Math.max(0, Math.min(player.pos.y - canvas.height / 2, WORLD_H - canvas.height))
}

// --- Game Loop ---
let lastTime = null

function loop(timestamp) {
  requestAnimationFrame(loop)

  const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05)
  lastTime = timestamp

  if (gameState.state === 'start') {
    drawStartScreen(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    updateMovement(entities, dt, input)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState)
    updateSpawner(entities, spawnerState, dt, gameState.time)
    if (player) updatePickup(entities, player, dt)
    if (player) updateCamera(player)

    if (player && player.hp <= 0) {
      player.hp = 0
      gameState.state = 'dead'
    }
  }

  const player = entities.find(e => e.type === 'player')
  renderWorld(ctx, canvas, entities, camera)
  drawHud(ctx, canvas, player, gameState)
}

requestAnimationFrame(loop)
