import { set, cancel, getAllAlarms, REPEAT_ONCE } from '@zos/alarm'
import { nextFire } from './schedule'

const SERVICE_URL = 'app-service/reminder'

// Schedules a one-shot alarm for the next reminder after `now`.
// The config travels in the alarm param so the service never touches storage
// (app-service file writes are restricted while the screen is on).
export function armNext(cfg, now) {
  const fire = nextFire(now, cfg)
  if (!fire) return null
  const id = set({
    url: SERVICE_URL,
    time: Math.floor(fire.at / 1000),
    param: JSON.stringify({ cfg, at: fire.at }),
    store: true,
    repeat_type: REPEAT_ONCE,
  })
  return id ? fire : null
}

export function cancelAll() {
  const ids = getAllAlarms() || []
  ids.forEach((id) => cancel(id))
}

// Drops any pending alarm and schedules a fresh one from the config.
export function rearm(cfg) {
  cancelAll()
  return armNext(cfg, Date.now())
}
