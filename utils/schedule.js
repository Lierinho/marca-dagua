// Pure scheduling logic (no Zepp OS imports) so it can be unit-tested in Node.
//
// Config shape:
//   intervalMin: minutes between reminders (shared by all profiles)
//   profiles:    1 to MAX_PROFILES schedules, profiles[0] is the default:
//     days:      7 booleans indexed like Date.getDay() (0 = Sunday);
//                a weekday belongs to at most one profile
//     startMin:  minutes after midnight when the reminder window opens
//     endMin:    minutes after midnight when the window closes (max 1440)
//   enabled:     master switch
//
// Reminders sit on a fixed grid from each day's start time (start + k *
// interval), so saving settings never restarts the countdown.

const MINUTE = 60 * 1000
const MAX_DAYS_AHEAD = 8

export const MAX_PROFILES = 3

export function newProfile(days) {
  return { days: days || [false, false, false, false, false, false, false], startMin: 8 * 60, endMin: 22 * 60 }
}

export const DEFAULT_CONFIG = {
  intervalMin: 60,
  profiles: [newProfile([true, true, true, true, true, true, true])],
  enabled: true,
}

// Accepts the current shape or the 1.0 shape (days/startMin/endMin at the
// top level, which alarms scheduled by 1.0 still carry) and returns a fresh copy.
export function normalizeConfig(cfg) {
  const src = cfg || {}
  let profiles = src.profiles
  if (!profiles || !profiles.length) {
    const base = DEFAULT_CONFIG.profiles[0]
    profiles = [{
      days: src.days || base.days,
      startMin: src.startMin !== undefined ? src.startMin : base.startMin,
      endMin: src.endMin !== undefined ? src.endMin : base.endMin,
    }]
  }
  return {
    intervalMin: src.intervalMin || DEFAULT_CONFIG.intervalMin,
    enabled: src.enabled !== undefined ? src.enabled : true,
    profiles: profiles.slice(0, MAX_PROFILES).map((p) => ({
      days: p.days.slice(),
      startMin: p.startMin,
      endMin: p.endMin,
    })),
  }
}

// Turns `weekday` on in profile `index` and off in every other profile.
export function setProfileDay(cfg, index, weekday, on) {
  cfg.profiles.forEach((p, i) => {
    if (i === index) p.days[weekday] = on
    else if (on) p.days[weekday] = false
  })
}

export function profileForWeekday(cfg, weekday) {
  for (const p of cfg.profiles) if (p.days[weekday]) return p
  return null
}

function atMinutes(year, month, date, minutes) {
  return new Date(year, month, date, Math.floor(minutes / 60), minutes % 60, 0, 0).getTime()
}

// Calendar day that is `offset` days after `now`, with its profile's window.
function windowFor(now, offset, cfg) {
  const d = new Date(now)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset)
  const profile = profileForWeekday(cfg, day.getDay())
  if (!profile || profile.endMin <= profile.startMin) return null
  const y = day.getFullYear()
  const m = day.getMonth()
  const dt = day.getDate()
  return {
    start: atMinutes(y, m, dt, profile.startMin),
    end: atMinutes(y, m, dt, Math.min(profile.endMin, 1440)),
  }
}

// Next reminder strictly after `now`.
// Returns { at, cycleStart } in ms, or null when nothing is scheduled.
// `cycleStart` is when the current countdown began; if now < cycleStart we are
// outside the window and waiting for it to open.
export function nextFire(now, rawCfg) {
  if (!rawCfg || !rawCfg.enabled) return null
  const cfg = normalizeConfig(rawCfg)
  const interval = cfg.intervalMin * MINUTE
  if (!(interval > 0)) return null

  for (let offset = 0; offset < MAX_DAYS_AHEAD; offset++) {
    const w = windowFor(now, offset, cfg)
    if (!w) continue
    const k = now < w.start ? 1 : Math.floor((now - w.start) / interval) + 1
    const at = w.start + k * interval
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

// Monday-first order for display.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Auto name from the selected days, e.g. "Seg a Sex", "Sáb e Dom", "Seg, Qua e Sex".
export function profileName(days) {
  const positions = DISPLAY_ORDER.map((d, i) => (days[d] ? i : -1)).filter((i) => i >= 0)
  if (positions.length === 0) return 'Sem dias'
  if (positions.length === 7) return 'Todos os dias'

  const runs = []
  positions.forEach((pos) => {
    const last = runs[runs.length - 1]
    if (last && pos === last[last.length - 1] + 1) last.push(pos)
    else runs.push([pos])
  })

  const parts = []
  runs.forEach((run) => {
    const names = run.map((pos) => WEEKDAY_SHORT[DISPLAY_ORDER[pos]])
    if (run.length >= 3) parts.push(names[0] + ' a ' + names[names.length - 1])
    else parts.push(...names)
  })
  if (parts.length === 1) return parts[0]
  return parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1]
}

export function profileHours(profile) {
  return formatHM(profile.startMin) + ' - ' + formatHM(profile.endMin)
}
