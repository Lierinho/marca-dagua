import { notify } from '@zos/notification'
import { armNext } from '../utils/alarm'

// Single-execution service woken by the alarm (600 ms budget, no UI).
// It notifies, then chains the next alarm so the timer restarts on its own.
AppService({
  onInit(params) {
    let data = null
    try {
      data = typeof params === 'string' ? JSON.parse(params) : params
    } catch (e) {
      data = null
    }
    if (!data || !data.cfg) return

    notify({
      title: "Marca d'Água",
      content: 'Hora de beber água!',
      actions: [],
      vibrate: 5,
    })

    // Never before the slot that just fired, so a slightly early wake-up
    // can't schedule the same reminder twice.
    armNext(data.cfg, Math.max(Date.now(), data.at || 0) + 1000)
  },
})
