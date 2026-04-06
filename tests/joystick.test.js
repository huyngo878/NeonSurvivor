import { describe, it, expect, beforeEach } from 'vitest'
import { joystickState, getJoystickInput } from '../src/ui/joystick.js'

beforeEach(() => {
  joystickState.active = false
  joystickState.dx = 0
  joystickState.dy = 0
})

describe('getJoystickInput', () => {
  it('returns all false when idle', () => {
    const input = getJoystickInput()
    expect(input).toEqual({ up: false, down: false, left: false, right: false })
  })

  it('returns up when dy < -DEAD_ZONE', () => {
    joystickState.dy = -0.5
    const input = getJoystickInput()
    expect(input.up).toBe(true)
    expect(input.down).toBe(false)
  })

  it('returns down when dy > DEAD_ZONE', () => {
    joystickState.dy = 0.5
    const input = getJoystickInput()
    expect(input.down).toBe(true)
    expect(input.up).toBe(false)
  })

  it('returns left when dx < -DEAD_ZONE', () => {
    joystickState.dx = -0.5
    const input = getJoystickInput()
    expect(input.left).toBe(true)
    expect(input.right).toBe(false)
  })

  it('returns right when dx > DEAD_ZONE', () => {
    joystickState.dx = 0.5
    const input = getJoystickInput()
    expect(input.right).toBe(true)
    expect(input.left).toBe(false)
  })

  it('dead zone: dx = 0.1 returns no movement', () => {
    joystickState.dx = 0.1
    joystickState.dy = 0.1
    const input = getJoystickInput()
    expect(input).toEqual({ up: false, down: false, left: false, right: false })
  })

  it('supports diagonal input', () => {
    joystickState.dx = 0.7
    joystickState.dy = -0.7
    const input = getJoystickInput()
    expect(input.right).toBe(true)
    expect(input.up).toBe(true)
    expect(input.left).toBe(false)
    expect(input.down).toBe(false)
  })
})
