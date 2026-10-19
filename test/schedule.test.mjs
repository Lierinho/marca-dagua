import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nextFire,
  waterLevel,
  formatCountdown,
  formatHM,
  normalizeConfig,
  setProfileDay,
  profileName,
  newProfile,
} from '../utils/schedule.js'

// Local-time helper: 2026-10-19 is a Monday.
const at = (day, h, m = 0) => new Date(2026, 9, day, h, m).getTime()
// Uses the 1.0 single-schedule shape, which normalizeConfig must still accept.
const cfg = (over = {}) => ({
  intervalMin: 60,
  enabled: true,
  anchor: 0,
  days: Array(7).fill(true),
  startMin: 480,
  endMin: 1320,
  ...over,
})

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

const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6
const daysOf = (...list) => [0, 1, 2, 3, 4, 5, 6].map((d) => list.includes(d))

test('each weekday uses its own profile window', () => {
  const c = {
    intervalMin: 60,
    enabled: true,
    anchor: 0,
    profiles: [
      { days: daysOf(MON, TUE, WED, THU, FRI), startMin: 480, endMin: 1320 },
      { days: daysOf(SAT, SUN), startMin: 600, endMin: 1200 },
    ],
  }
  // Friday 23rd 21:30 -> Friday 22:00 still fits
  assert.equal(nextFire(at(23, 21, 30), c).at, at(23, 22))
  // Friday 22:30 -> Saturday window opens 10:00, first reminder 11:00
  assert.equal(nextFire(at(23, 22, 30), c).at, at(24, 11))
  // Sunday 20:30 -> past the weekend window, Monday 09:00
  assert.equal(nextFire(at(25, 20, 30), c).at, at(26, 9))
})

test('days without a profile are skipped', () => {
  const c = normalizeConfig({ intervalMin: 60, enabled: true, profiles: [{ days: daysOf(WED), startMin: 480, endMin: 600 }] })
  assert.equal(nextFire(at(19, 12), c).at, at(21, 9))
})

test('setProfileDay keeps a weekday in a single profile', () => {
  const c = normalizeConfig({ profiles: [newProfile(Array(7).fill(true)), newProfile()] })
  setProfileDay(c, 1, SAT, true)
  assert.equal(c.profiles[0].days[SAT], false)
  assert.equal(c.profiles[1].days[SAT], true)
  setProfileDay(c, 1, SAT, false)
  assert.equal(c.profiles[0].days[SAT], false)
})

test('normalizeConfig migrates the 1.0 shape and copies arrays', () => {
  const old = { intervalMin: 30, days: daysOf(MON), startMin: 420, endMin: 1080, enabled: true }
  const c = normalizeConfig(old)
  assert.deepEqual(c.profiles, [{ days: daysOf(MON), startMin: 420, endMin: 1080 }])
  c.profiles[0].days[TUE] = true
  assert.equal(old.days[TUE], false)
})

test('profile names', () => {
  assert.equal(profileName(daysOf(MON, TUE, WED, THU, FRI)), 'Seg a Sex')
  assert.equal(profileName(daysOf(SAT, SUN)), 'Sáb e Dom')
  assert.equal(profileName(daysOf(MON, WED, FRI)), 'Seg, Qua e Sex')
  assert.equal(profileName(daysOf(TUE, THU)), 'Ter e Qui')
  assert.equal(profileName(daysOf(MON, TUE, WED, SAT)), 'Seg a Qua e Sáb')
  assert.equal(profileName(daysOf()), 'Sem dias')
  assert.equal(profileName(Array(7).fill(true)), 'Todos os dias')
})
