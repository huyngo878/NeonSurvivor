import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, createWeapon, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { updatePickup } from './systems/pickup.js'
import { updateGems } from './systems/gems.js'
import { renderWorld } from './render.js'
import { drawHud } from './ui/hud.js'
import { drawStartScreen } from './ui/startScreen.js'
import { drawLevelUpScreen } from './ui/levelUpScreen.js'
import { drawMainMenu, MENU_ITEMS } from './ui/mainMenu.js'
import { drawRunSummary } from './ui/runSummary.js'
import { drawMetaScreen, handleMetaClick } from './ui/metaScreen.js'
import { saveRun, loadBest, calcPrestige, applyMetaUpgrades } from './meta.js'
import { META_UPGRADES } from './metaUpgrades.js'

// --- Canvas ---
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

function resize() {
  const dpr = window.devicePixelRatio || 1
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width  = w * dpr
  canvas.height = h * dpr
  canvas.style.width  = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
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

  // Main menu navigation
  if (gameState.state === 'menu') {
    if (e.code === 'ArrowUp')   gameState.menuIndex = Math.max(0, (gameState.menuIndex || 0) - 1)
    if (e.code === 'ArrowDown') gameState.menuIndex = Math.min(MENU_ITEMS.length - 1, (gameState.menuIndex || 0) + 1)
    if (e.code === 'Enter' || e.code === 'Space') {
      const item = MENU_ITEMS[gameState.menuIndex || 0]
      if (item && !item.disabled) _navigateMenu(item.state)
    }
    return
  }

  // Weapon select screen
  if (gameState.state === 'start') {
    if (e.code === 'ArrowLeft'  || e.code === 'KeyA') gameState.selectedWeapon = gameState.selectedWeapon === 'whip' ? 'wand' : 'whip'
    if (e.code === 'ArrowRight' || e.code === 'KeyD') gameState.selectedWeapon = gameState.selectedWeapon === 'wand' ? 'whip' : 'wand'
    if (e.code === 'Enter' || e.code === 'Space') initGame(gameState.selectedWeapon)
    if (e.code === 'Escape') gameState.state = 'menu'
    return
  }

  // Level-up card selection
  if (gameState.state === 'levelup') {
    const choices = gameState.upgradeChoices || []
    let picked = null
    if (e.code === 'Digit1' && choices[0]) picked = choices[0]
    if (e.code === 'Digit2' && choices[1]) picked = choices[1]
    if (e.code === 'Digit3' && choices[2]) picked = choices[2]
    if (picked) _applyUpgrade(picked)
    return
  }

  // Run summary
  if (gameState.state === 'summary') {
    if (e.code === 'KeyR') initGame(gameState.selectedWeapon)
    if (e.code === 'KeyM') gameState.state = 'menu'
    return
  }

  // Meta screen
  if (gameState.state === 'upgrades') {
    if (e.code === 'Escape' || e.code === 'KeyM') gameState.state = 'menu'
    if (e.code === 'Digit1') gameState.metaTab = 0
    if (e.code === 'Digit2') gameState.metaTab = 1
    if (e.code === 'Digit3') gameState.metaTab = 2
    return
  }

  // Playing / paused
  if (e.code === 'KeyP') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
  }
})

document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false
})

canvas.addEventListener('click', e => {
  const mx = e.clientX, my = e.clientY
  function hit(r) { return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h }

  if (gameState.state === 'levelup') {
    const rects = gameState.cardRects || []
    const choices = gameState.upgradeChoices || []
    for (let i = 0; i < rects.length; i++) {
      if (hit(rects[i]) && choices[i]) { _applyUpgrade(choices[i]); break }
    }
    return
  }

  if (gameState.state === 'menu') {
    for (const rect of (gameState.menuRects || [])) {
      if (!rect.disabled && hit(rect)) { _navigateMenu(rect.state); break }
    }
    return
  }

  if (gameState.state === 'start') {
    for (const rect of (gameState.weaponRects || [])) {
      if (hit(rect)) {
        if (gameState.selectedWeapon === rect.type) {
          initGame(rect.type)  // double-click same card = start
        } else {
          gameState.selectedWeapon = rect.type  // first click = select
        }
        break
      }
    }
    return
  }

  if (gameState.state === 'summary') {
    for (const btn of (gameState.summaryBtnRects || [])) {
      if (hit(btn)) {
        if (btn.action === 'replay') initGame(gameState.selectedWeapon)
        else gameState.state = 'menu'
        break
      }
    }
    return
  }

  if (gameState.state === 'upgrades') {
    handleMetaClick(e, gameState)
    return
  }
})

function _navigateMenu(state) {
  if (state === 'start' || state === 'upgrades') {
    gameState.state = state
  }
  // 'leaderboard' and 'settings' are stubs — do nothing for now
}

function _applyUpgrade(upgrade) {
  const player = entities.find(e => e.type === 'player')
  if (player) upgrade.apply(player)
  gameState.upgradesTaken = [...(gameState.upgradesTaken || []), upgrade.id]
  gameState.upgradeChoices = null
  gameState.cardRects = null
  gameState.state = 'playing'
}

// --- Game state ---
let entities = []
let gameState = { state: 'menu', selectedWeapon: 'wand', menuIndex: 0, metaTab: 0, time: 0, kills: 0 }
let spawnerState = {}
let camera = { x: 0, y: 0 }

function initGame(selectedWeapon) {
  const player = createPlayer()
  applyMetaUpgrades(player, META_UPGRADES)
  player.weapons = [createWeapon(selectedWeapon)]
  const pool = initProjectilePool()
  entities     = [player, ...pool]
  gameState    = {
    state: 'playing', selectedWeapon,
    menuIndex: 0, metaTab: 0,
    time: 0, kills: 0, upgradesTaken: [],
  }
  spawnerState = createSpawnerState(player.spawnDelayBonus || 0)
  camera       = { x: 0, y: 0 }
}

// --- Camera ---
function updateCamera(player) {
  camera.x = Math.max(0, Math.min(player.pos.x - canvas.clientWidth  / 2, WORLD_W - canvas.clientWidth))
  camera.y = Math.max(0, Math.min(player.pos.y - canvas.clientHeight / 2, WORLD_H - canvas.clientHeight))
}

// --- Build run data on death ---
function _buildRunData(player) {
  const prestige = calcPrestige(gameState.kills, gameState.time, player.level)
  return {
    timeSecs:  Math.floor(gameState.time),
    kills:     gameState.kills,
    level:     player.level,
    weapons:   player.weapons.map(w => w.type),
    upgrades:  gameState.upgradesTaken || [],
    prestige,
  }
}

// --- Game Loop ---
let lastTime = null

function loop(timestamp) {
  requestAnimationFrame(loop)

  const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05)
  lastTime = timestamp

  if (gameState.state === 'menu') {
    drawMainMenu(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'start') {
    drawStartScreen(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'summary') {
    drawRunSummary(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'upgrades') {
    drawMetaScreen(ctx, canvas, gameState)
    return
  }

  if (gameState.state === 'levelup') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera)
    drawHud(ctx, canvas, player, gameState)
    drawLevelUpScreen(ctx, canvas, player, gameState)
    return
  }

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    updateMovement(entities, dt, input)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState)
    updateSpawner(entities, spawnerState, dt, gameState.time)
    if (player) {
      updatePickup(entities, player, dt)
      updateGems(entities, player, dt, gameState)
      if (player.regenRate > 0) {
        player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt)
      }
      updateCamera(player)
    }

    if (player && player.hp <= 0) {
      player.hp = 0
      const prevBest = loadBest()
      const runData  = _buildRunData(player)
      saveRun(runData)
      gameState.lastRun  = runData
      gameState.prevBest = prevBest
      gameState.state    = 'summary'
    }
  }

  if (gameState.state === 'paused' || gameState.state === 'playing') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera)
    drawHud(ctx, canvas, player, gameState)
  }
}

requestAnimationFrame(loop)
