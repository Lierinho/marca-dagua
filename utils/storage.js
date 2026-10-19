import { LocalStorage } from '@zos/storage'
import { DEFAULT_CONFIG } from './schedule'

const KEY = 'config'
const storage = new LocalStorage()

export function loadConfig() {
  const saved = storage.getItem(KEY)
  if (!saved) return { ...DEFAULT_CONFIG, days: DEFAULT_CONFIG.days.slice() }
  const cfg = typeof saved === 'string' ? JSON.parse(saved) : saved
  return { ...DEFAULT_CONFIG, ...cfg }
}

export function saveConfig(cfg) {
  storage.setItem(KEY, JSON.stringify(cfg))
}
