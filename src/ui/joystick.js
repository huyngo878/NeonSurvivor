const OUTER_RADIUS = 60   // px — outer ring radius
const KNOB_RADIUS  = 24   // px — inner knob radius
const DEAD_ZONE    = 0.2  // normalized threshold
const REST_X       = 80   // px from left edge when inactive
const REST_Y_OFFSET = 80  // px from bottom edge when inactive

export const joystickState = {
  active: false,
  baseX: 0, baseY: 0,
  knobX: 0, knobY: 0,
  dx: 0, dy: 0,
}

export function getJoystickInput() {
  return {
    up:    joystickState.dy < -DEAD_ZONE,
    down:  joystickState.dy >  DEAD_ZONE,
    left:  joystickState.dx < -DEAD_ZONE,
    right: joystickState.dx >  DEAD_ZONE,
  }
}

export function drawJoystick(ctx, canvas) {
  const restX = REST_X
  const restY = canvas.clientHeight - REST_Y_OFFSET

  const bx = joystickState.active ? joystickState.baseX : restX
  const by = joystickState.active ? joystickState.baseY : restY
  const kx = joystickState.active ? joystickState.knobX : restX
  const ky = joystickState.active ? joystickState.knobY : restY
  const alpha = joystickState.active ? 1 : 0.35

  ctx.save()
  ctx.globalAlpha = alpha

  // Outer ring
  ctx.beginPath()
  ctx.arc(bx, by, OUTER_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Knob
  ctx.beginPath()
  ctx.arc(kx, ky, KNOB_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = joystickState.active ? '#00ffc8' : 'rgba(0,255,200,0.5)'
  if (joystickState.active) {
    ctx.shadowBlur = 16
    ctx.shadowColor = '#00ffc8'
  }
  ctx.fill()

  ctx.restore()
}

export function joystickTouchStart(touch) {
  joystickState.active = true
  joystickState.baseX = touch.clientX
  joystickState.baseY = touch.clientY
  joystickState.knobX = touch.clientX
  joystickState.knobY = touch.clientY
  joystickState.dx = 0
  joystickState.dy = 0
}

export function joystickTouchMove(touch) {
  if (!joystickState.active) return
  const dx = touch.clientX - joystickState.baseX
  const dy = touch.clientY - joystickState.baseY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const clamped = Math.min(dist, OUTER_RADIUS)
  const angle = Math.atan2(dy, dx)
  joystickState.knobX = joystickState.baseX + Math.cos(angle) * clamped
  joystickState.knobY = joystickState.baseY + Math.sin(angle) * clamped
  joystickState.dx = Math.cos(angle) * (clamped / OUTER_RADIUS)
  joystickState.dy = Math.sin(angle) * (clamped / OUTER_RADIUS)
}

export function joystickTouchEnd() {
  joystickState.active = false
  joystickState.dx = 0
  joystickState.dy = 0
}
