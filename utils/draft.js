// Settings being edited on the main page's settings panel and the profile
// pages. It lives in globalData so every page sees the same copy; the main
// page saves it shortly after the last change.
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

// Call after any change so the draft gets saved and open pages refresh.
export function touchDraft() {
  const g = data()
  g.draftDirty = true
  g.draftTouchedAt = Date.now()
  g.draftVersion++
}

export function draftVersion() {
  return data().draftVersion
}

// Saves and re-arms the alarm. The schedule is a fixed grid from each day's
// start time, so this never restarts the running countdown.
// Returns the next fire ({ at, cycleStart }) or null.
export function commitDraft() {
  const g = data()
  g.draftDirty = false
  saveConfig(g.draft)
  g.configVersion++
  return rearm(g.draft)
}

// Commits once no change has happened for `idleMs`; returns true if it saved.
export function commitIfIdle(idleMs) {
  const g = data()
  if (!g.draftDirty || Date.now() - g.draftTouchedAt < idleMs) return false
  commitDraft()
  return true
}

// Saves pending changes (if any) and drops the draft.
export function closeDraft() {
  if (data().draftDirty) commitDraft()
  data().draft = null
}
