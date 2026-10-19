import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextFire, waterLevel, formatCountdown, formatHM, DEFAULT_CONFIG } from '../utils/schedule.js'

// Local-time helper: 2026-10-19 is a Monday.
const at = (day, h, m = 0) => new Date(2026, 9, day, h, m).getTime()
const cfg = (over = {}) => ({ ...DEFAULT_CONFIG, ...over })

test('fires every interval from window start', () => {
  const f = nextFire(at(19, 9, 10), cfg())
  assert.equal(f.at, at(19, 10))
  assert.equal(f.cycleStart, at(19, 9))
})

test('before the window opens, waits for start + interval', () => {
  const f = nextFire(at(19, 6), cfg())
  assert.equal(f.at, at(19, 9))
  assert.equal(f.cycleStart, at(19, 8))
  assert.equal(waterLevel(at(19, 6), f), 1)
})

test('after the window closes, moves to the next day', () => {
  const f = nextFire(at(19, 22, 30), cfg())
  assert.equal(f.at, at(20, 9))
})

test('fire exactly at end of window is allowed', () => {
  const f = nextFire(at(19, 21, 0), cfg())
  assert.equal(f.at, at(19, 22))
})

test('skips disabled weekdays', () => {
  // Weekdays only; Saturday 24th 12:00 -> Monday 26th 09:00
  const days = [false, true, true, true, true, true, false]
  const f = nextFire(at(24, 12), cfg({ days }))
  assert.equal(f.at, at(26, 9))
})

test('anchor inside the window restarts the cycle', () => {
  const anchor = at(19, 10, 25)
  const f = nextFire(at(19, 10, 30), cfg({ anchor }))
  assert.equal(f.at, at(19, 11, 25))
  // The next day ignores the old anchor
  const g = nextFire(at(20, 7), cfg({ anchor }))
  assert.equal(g.at, at(20, 9))
})

test('strictly after now, so a service firing on time gets the next slot', () => {
  const f = nextFire(at(19, 10) + 1000, cfg())
  assert.equal(f.at, at(19, 11))
})

test('disabled, no days or invalid window returns null', () => {
  assert.equal(nextFire(at(19, 9), cfg({ enabled: false })), null)
  assert.equal(nextFire(at(19, 9), cfg({ days: Array(7).fill(false) })), null)
  assert.equal(nextFire(at(19, 9), cfg({ startMin: 600, endMin: 600 })), null)
})

test('interval longer than window never fires', () => {
  assert.equal(nextFire(at(19, 9), cfg({ startMin: 480, endMin: 500, intervalMin: 60 })), null)
})

test('water level drains linearly', () => {
  const f = nextFire(at(19, 9, 30), cfg())
  assert.equal(waterLevel(at(19, 9, 30), f), 0.5)
  assert.equal(waterLevel(at(19, 10), f), 0)
})

test('formatting', () => {
  assert.equal(formatCountdown(65_000), '01:05')
  assert.equal(formatCountdown(3_725_000), '1:02:05')
  assert.equal(formatHM(480), '08:00')
  assert.equal(formatHM(1440), '24:00')
})
