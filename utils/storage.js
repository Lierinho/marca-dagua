import { LocalStorage } from '@zos/storage'
import { normalizeConfig } from './schedule'

const KEY = 'config'
const storage = new LocalStorage()

export function loadConfig() {
  const saved = storage.getItem(KEY)
  const cfg = typeof saved === 'string' ? JSON.parse(saved) : saved
  return normalizeConfig(cfg)
}

export function saveConfig(cfg) {
  storage.setItem(KEY, JSON.stringify(cfg))
}
