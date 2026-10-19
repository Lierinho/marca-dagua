// Settings being edited across the settings, schedules and profile pages.
// It lives in globalData so every page sees the same copy; only the main
// settings page commits it (on "Salvar" or when leaving it).
import { loadConfig, saveConfig } from './storage'
import { rearm } from './alarm'

function data() {
  return getApp().globalData
}

export function getDraft() {
  const g = data()
  if (!g.draft) {
    g.draft = loadConfig()
    g.draftDirty = false
  }
  return g.draft
}

// Call after any change so the draft is saved and open pages refresh.
export function touchDraft() {
  const g = data()
  g.draftDirty = true
  g.draftVersion++
}

export function draftVersion() {
  return data().draftVersion
}

export function commitDraft() {
  const g = data()
  if (!g.draft) return
  g.draft.anchor = Date.now()
  saveConfig(g.draft)
  rearm(g.draft)
  g.configVersion++
  g.draftDirty = false
}

// Saves pending changes (if any) and drops the draft.
export function closeDraft() {
  if (data().draftDirty) commitDraft()
  data().draft = null
}
