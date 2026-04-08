import { WORLD_W, WORLD_H } from './constants.js'
import { createPlayer, createWeapon, initProjectilePool } from './entities.js'
import { updateMovement } from './systems/movement.js'
import { updateCollision } from './systems/collision.js'
import { updateWeapons } from './systems/weapons.js'
import { updateSpawner, createSpawnerState } from './systems/spawner.js'
import { updatePickup, updateChestNodes } from './systems/pickup.js'
import { spawnZoneChests } from './zones.js'
import { pickChestCards, pickSparklyCards } from './upgrades.js'
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
import { drawJoystick, getJoystickInput, joystickTouchStart, joystickTouchMove, joystickTouchEnd } from './ui/joystick.js'

// --- Canvas ---
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const isMobile = 'ontouchstart' in window
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const ZOOM_LEVELS = isIOS ? [1, 0.85, 0.72] : [1]
const storedZoom = Number(window.localStorage.getItem('ios_zoom') || '')
const initialZoom = ZOOM_LEVELS.includes(storedZoom) ? storedZoom : (isIOS ? 0.85 : 1)

function resize() {
  const dpr = window.devicePixelRatio || 1
  const viewport = window.visualViewport
  const w = Math.round(viewport?.width || window.innerWidth)
  const h = Math.round(viewport?.height || window.innerHeight)
  canvas.width  = w * dpr
  canvas.height = h * dpr
  canvas.style.width  = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
resize()
window.addEventListener('resize', resize)
window.visualViewport?.addEventListener('resize', resize)

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
    const weapons = ['wand', 'whip', 'rocket']
    const selectedIndex = weapons.indexOf(gameState.selectedWeapon)
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      gameState.selectedWeapon = weapons[(selectedIndex - 1 + weapons.length) % weapons.length]
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      gameState.selectedWeapon = weapons[(selectedIndex + 1) % weapons.length]
    }
    if (e.code === 'Enter' || e.code === 'Space') initGame(gameState.selectedWeapon)
    if (e.code === 'Escape') gameState.state = 'menu'
    return
  }

  // Level-up card selection
  if (gameState.state === 'chest') {
    const choices = gameState.upgradeChoices || []
    let picked = null
    if (e.code === 'Digit1' && choices[0]) picked = choices[0]
    if (e.code === 'Digit2' && choices[1]) picked = choices[1]
    if (e.code === 'Digit3' && choices[2]) picked = choices[2]
    if (e.code === 'Digit4' && choices[3]) picked = choices[3]
    if (picked) _applyUpgrade(picked)
    return
  }

  // Run summary
  if (gameState.state === 'summary') {
    if (e.code === 'KeyR') gameState.state = 'start'
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
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameState.state === 'playing') gameState.state = 'paused'
    else if (gameState.state === 'paused') gameState.state = 'playing'
    gameState.pauseIndex = 0
  }

  if (e.code === 'KeyE' && gameState.state === 'playing') {
    _openChest()
  }

  if (gameState.state === 'paused') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') gameState.pauseIndex = Math.max(0, (gameState.pauseIndex || 0) - 1)
    if (e.code === 'ArrowDown' || e.code === 'KeyS') gameState.pauseIndex = Math.min(1, (gameState.pauseIndex || 0) + 1)
    if (e.code === 'Enter' || e.code === 'Space') {
      if ((gameState.pauseIndex || 0) === 0) gameState.state = 'playing'
      else _finishRun('paused')
    }
  }
})

document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false
})

function _handlePointer(mx, my) {
  function hit(r) { return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h }

  if ((gameState.state === 'playing' || gameState.state === 'paused') && gameState.zoomRect && hit(gameState.zoomRect)) {
    _cycleZoom()
    return
  }

  if (gameState.state === 'chest') {
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
        if (btn.action === 'replay') gameState.state = 'start'
        else gameState.state = 'menu'
        break
      }
    }
    return
  }

  if (gameState.state === 'paused') {
    for (const btn of (gameState.pauseRects || [])) {
      if (!hit(btn)) continue
      if (btn.action === 'resume') gameState.state = 'playing'
      if (btn.action === 'finish') _finishRun('paused')
      break
    }
    return
  }

  if (gameState.state === 'upgrades') {
    handleMetaClick({ clientX: mx, clientY: my }, gameState)
    return
  }
}

canvas.addEventListener('click', e => {
  _handlePointer(e.clientX, e.clientY)
})

if (isMobile) {
  canvas.addEventListener('touchstart', e => {
    e.preventDefault()
    const t = e.changedTouches[0]
    const inJoystickZone = t.clientX < canvas.clientWidth / 2 && t.clientY > canvas.clientHeight / 2
    if (gameState.state === 'playing' && inJoystickZone) {
      joystickTouchStart(t)
    } else {
      if (gameState.state === 'playing' && !inJoystickZone && _openChest()) return
      _handlePointer(t.clientX, t.clientY)
    }
  }, { passive: false })

  canvas.addEventListener('touchmove', e => {
    e.preventDefault()
    joystickTouchMove(e.changedTouches[0])
  }, { passive: false })

  canvas.addEventListener('touchend', e => {
    e.preventDefault()
    joystickTouchEnd()
  }, { passive: false })
}

function _openChest() {
  const nc = gameState.nearestChest
  const player = entities.find(ent => ent.type === 'player')
  if (!nc || !player || player.money < nc.cost) return false
  player.money -= nc.cost
  gameState.chestsOpened += 1
  nc.node.opened = true
  gameState.nearestChest = null
  gameState.upgradeChoices = nc.node.sparkly
    ? pickSparklyCards(player, 3 + (player.extraChoices || 0))
    : pickChestCards(player, 3 + (player.extraChoices || 0))
  gameState.state = 'chest'
  return true
}

function _navigateMenu(state) {
  if (state === 'start' || state === 'upgrades') {
    gameState.state = state
  }
  // 'leaderboard' and 'settings' are stubs — do nothing for now
}

function _applyUpgrade(upgrade) {
  const player = entities.find(e => e.type === 'player')
  if (player) upgrade.apply(player)
  if (player && upgrade.legendaryUnique) {
    player.uniqueWeapons = player.uniqueWeapons || {}
    player.uniqueWeapons[upgrade.legendaryUnique] = upgrade.id
  }
  if (player) player.cardHistory = [...(player.cardHistory || []), upgrade.id]
  gameState.upgradesTaken = [...(gameState.upgradesTaken || []), upgrade.id]
  gameState.upgradeChoices = null
  gameState.cardRects = null
  gameState.state = 'playing'
}

// --- Game state ---
let entities = []
let gameState = {
  state: 'menu', selectedWeapon: 'wand', menuIndex: 0, metaTab: 0, time: 0, kills: 0, wave: 1, pauseIndex: 0,
  zoom: initialZoom, zoomLabel: `${initialZoom.toFixed(2)}x`, showZoomControl: isIOS,
}
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
    wave: 1, pauseIndex: 0,
    zoom: gameState.zoom, zoomLabel: gameState.zoomLabel, showZoomControl: isIOS,
    chestsOpened: 0,
    nearestChest: null,
  }
  spawnZoneChests(entities, 0)
  spawnerState = createSpawnerState(player.spawnDelayBonus || 0)
  camera       = { x: 0, y: 0 }
}

// --- Camera ---
function updateCamera(player) {
  const zoom = gameState.zoom || 1
  const viewW = canvas.clientWidth / zoom
  const viewH = canvas.clientHeight / zoom
  camera.x = Math.max(0, Math.min(player.pos.x - viewW / 2, WORLD_W - viewW))
  camera.y = Math.max(0, Math.min(player.pos.y - viewH / 2, WORLD_H - viewH))
}

function _cycleZoom() {
  const current = gameState.zoom || 1
  const index = ZOOM_LEVELS.indexOf(current)
  const next = ZOOM_LEVELS[(index + 1) % ZOOM_LEVELS.length]
  gameState.zoom = next
  gameState.zoomLabel = `${next.toFixed(2)}x`
  window.localStorage.setItem('ios_zoom', String(next))
  const player = entities.find(e => e.type === 'player')
  if (player) updateCamera(player)
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

function _finishRun(reason = 'ended') {
  const player = entities.find(e => e.type === 'player')
  if (!player) return
  const prevBest = loadBest()
  const runData = _buildRunData(player)
  runData.endReason = reason
  saveRun(runData)
  gameState.lastRun = runData
  gameState.prevBest = prevBest
  gameState.state = 'summary'
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

  if (gameState.state === 'chest') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera, gameState.zoom, gameState)
    drawHud(ctx, canvas, player, gameState)
    drawLevelUpScreen(ctx, canvas, player, gameState)
    return
  }

  if (gameState.state === 'playing') {
    gameState.time += dt
    const player = entities.find(e => e.type === 'player')

    const effectiveInput = isMobile ? { ...input, ...getJoystickInput() } : input
    updateMovement(entities, dt, effectiveInput)
    updateWeapons(entities, dt)
    updateCollision(entities, gameState, dt)
    updateSpawner(entities, spawnerState, dt, gameState.time, gameState)
    if (player) {
      updatePickup(entities, player, dt, gameState)
      updateChestNodes(entities, player, gameState, dt)
      updateGems(entities, player, dt, gameState)
      updateCamera(player)
      gameState.camera = camera
    }

    if (player && player.hp <= 0) {
      player.hp = 0
      _finishRun('death')
    }
  }

  if (gameState.state === 'paused' || gameState.state === 'playing') {
    const player = entities.find(e => e.type === 'player')
    renderWorld(ctx, canvas, entities, camera, gameState.zoom, gameState)
    drawHud(ctx, canvas, player, gameState)
    if (isMobile) drawJoystick(ctx, canvas)
  }
}

requestAnimationFrame(loop)
