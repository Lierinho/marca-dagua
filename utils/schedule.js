// Pure scheduling logic (no Zepp OS imports) so it can be unit-tested in Node.
//
// Config shape:
//   intervalMin: minutes between reminders
//   days:        7 booleans indexed like Date.getDay() (0 = Sunday)
//   startMin:    minutes after midnight when the reminder window opens
//   endMin:      minutes after midnight when the window closes (max 1440)
//   enabled:     master switch
//   anchor:      ms timestamp of the last settings save; if it falls inside
//                that day's window the cycle restarts from it

const MINUTE = 60 * 1000
const MAX_DAYS_AHEAD = 8

export const DEFAULT_CONFIG = {
  intervalMin: 60,
  days: [true, true, true, true, true, true, true],
  startMin: 8 * 60,
  endMin: 22 * 60,
  enabled: true,
  anchor: 0,
}

function atMinutes(year, month, date, minutes) {
  return new Date(year, month, date, Math.floor(minutes / 60), minutes % 60, 0, 0).getTime()
}

// Reminder window of the calendar day that is `offset` days after `now`.
function windowFor(now, offset, cfg) {
  const d = new Date(now)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset)
  const y = day.getFullYear()
  const m = day.getMonth()
  const dt = day.getDate()
  return {
    weekday: day.getDay(),
    start: atMinutes(y, m, dt, cfg.startMin),
    end: atMinutes(y, m, dt, Math.min(cfg.endMin, 1440)),
  }
}

// Next reminder strictly after `now`.
// Returns { at, cycleStart } in ms, or null when nothing is scheduled.
// `cycleStart` is when the current countdown began; if now < cycleStart we are
// outside the window and waiting for it to open.
export function nextFire(now, cfg) {
  if (!cfg || !cfg.enabled) return null
  const interval = cfg.intervalMin * MINUTE
  if (!(interval > 0) || cfg.endMin <= cfg.startMin) return null
  if (!cfg.days || !cfg.days.some(Boolean)) return null

  for (let offset = 0; offset < MAX_DAYS_AHEAD; offset++) {
    const w = windowFor(now, offset, cfg)
    if (!cfg.days[w.weekday]) continue
    const base = cfg.anchor >= w.start && cfg.anchor <= w.end ? cfg.anchor : w.start
    const k = now < base ? 1 : Math.floor((now - base) / interval) + 1
    const at = base + k * interval
    if (at <= w.end) return { at, cycleStart: at - interval }
  }
  return null
}

// Water level from 1 (full, cycle just started) to 0 (time to drink).
export function waterLevel(now, fire) {
  if (!fire) return 1
  if (now <= fire.cycleStart) return 1
  const total = fire.at - fire.cycleStart
  return Math.max(0, Math.min(1, 1 - (now - fire.cycleStart) / total))
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

export function formatHM(minutes) {
  return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60)
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s)
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function formatClock(ms) {
  const d = new Date(ms)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}
